import { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api, apiBaseUrl, obtenerCorrelativoSeguro, type Serie, type Entidad, type Producto } from '@/lib/api';
import { Eye, Ban, Plus, Download, RefreshCw, ChevronLeft, ChevronRight, Receipt, FileText, Loader2, MoreVertical, FileDown, Printer, CheckCircle2, MessageCircle } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  emitirComprobante,
  anularComprobante,
  sincronizarRango,
  TIPOS_COMPROBANTE,
  TIPOS_DOCUMENTO,
  TIPOS_IGV,
  MONEDAS,
  MONEDAS_SELECT,
  TIPOS_OPERACION_SELECT,
  IGV_PORCENTAJES_SELECT,
  UNIDADES_MEDIDA,
  FORMAS_PAGO_SELECT,
  esGravado,
  esExonerado,
  esInafecto,
  esGratuita,
  sunatIgvToNubefact,
  type EmitirComprobanteRequest,
} from '@/services/nubefact';
import { Textarea } from '@/components/ui/textarea';
import { useEmpresa } from '@/hooks/useEmpresa';
import { ClienteCard } from '@/components/ClienteCard';
import { ResumenTotalesCard } from '@/components/ResumenTotalesCard';
import { ItemsSection } from '@/components/ItemsSection';
import { ItemModal } from '@/components/ItemModal';

interface Comprobante {
  id: number;
  tipo_doc: string;
  serie: string;
  correlativo: string;
  numero_completo: string;
  cliente_razon_social: string;
  cliente_num_doc: string;
  fecha_emision: string;
  moneda: string;
  mto_imp_venta: number;
  mto_oper_gravadas?: number;
  mto_oper_gratuitas?: number;
  mto_igv?: number;
  estado_sunat: string;
  nubefact_aceptada_por_sunat: boolean;
  nubefact_pdf_url?: string;
  nubefact_xml_url?: string;
  nubefact_cdr_url?: string;
  anulado: boolean;
  pagado: boolean;
  forma_pago: string;
}

// --- Schema de Validación ---

const itemSchema = z.object({
  unidad_de_medida: z.string().min(1, 'Requerido'),
  codigo: z.string().min(1, 'Requerido'),
  descripcion: z.string().min(1, 'Requerido'),
  cantidad: z.number().min(0.01, 'Debe ser mayor a 0'),
  valor_unitario: z.number().min(0, 'Debe ser mayor o igual a 0'),
  precio_unitario: z.number().min(0, 'Debe ser mayor o igual a 0'),
  descuento: z.number().optional(),
  tipo_de_igv: z.string().min(1, 'Requerido'),
});

const comprobanteSchema = z
  .object({
    empresa_id: z.number().min(1, 'Seleccione una empresa'),
    tipo_comprobante: z.string().min(1, 'Seleccione tipo'),
    serie: z.string().min(4, 'Serie debe tener 4 caracteres').max(4),
    numero: z.number().min(1, 'Número debe ser mayor a 0'),
    cliente_tipo_de_documento: z.string().min(1, 'Requerido'),
    cliente_numero_de_documento: z.string().optional(),
    cliente_denominacion: z.string().min(1, 'Requerido'),
    cliente_direccion: z.string().optional(),
    cliente_email: z.union([z.email({ message: 'Email inválido' }), z.literal('')]).optional(),
    fecha_de_emision: z.string().min(1, 'Requerido'),
    moneda: z.string().min(1, 'Requerido'),
    sunat_transaction: z.number().min(1, 'Seleccione un tipo de operación'),
    porcentaje_de_igv: z.number().min(1, 'Seleccione un porcentaje de IGV'),
    tipo_de_cambio: z.number().optional(),
    pagado: z.boolean().optional(),
    forma_pago: z.string().min(1, 'Seleccione forma de pago'),
    fecha_de_vencimiento: z.string().optional(),
    tiene_detraccion: z.boolean().optional(),
    detraccion_tipo: z.string().length(3).optional().nullable(),
    detraccion_porcentaje: z.number().min(0).max(100).optional().nullable(),
    detraccion_monto: z.number().min(0).optional().nullable(),
    medio_pago_detraccion: z.string().length(3).optional().nullable(),
    observaciones: z.string().optional(),
    items: z.array(itemSchema).min(1, 'Debe agregar al menos un item'),
  })
  .refine(
    (data) => {
      if (["1", "4", "6"].includes(data.cliente_tipo_de_documento)) {
        return !!data.cliente_numero_de_documento && data.cliente_numero_de_documento.length > 0;
      }
      return true;
    },
    {
      message: "Número de documento es requerido",
      path: ["cliente_numero_de_documento"],
    }
  );

type ComprobanteFormValues = z.infer<typeof comprobanteSchema>;

export default function BoletasFacturas() {
  // --- Estado de la lista ---
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'cliente' | 'numero' | 'fecha' | 'tipo'>('cliente');
  const [valorFiltro, setValorFiltro] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedComprobante, setSelectedComprobante] = useState<Comprobante | null>(null);
  const [filtroTipoDoc, setFiltroTipoDoc] = useState<'todos' | '01' | '03'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'aceptado' | 'pendiente' | 'rechazado'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- Estado del formulario CPE ---
  const { empresaId, empresa } = useEmpresa();
  const [tipoActivo, setTipoActivo] = useState<'factura' | 'boleta'>('factura');
  const [emitiendo, setEmitiendo] = useState(false);

  const [clientes, setClientes] = useState<Entidad[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [openClienteCombobox, setOpenClienteCombobox] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [openProductoCombobox, setOpenProductoCombobox] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');

  // --- Estado sync NubeFact ---
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncSerie, setSyncSerie] = useState('F001');
  const [syncTipoDoc, setSyncTipoDoc] = useState('01');
  const [syncInicio, setSyncInicio] = useState(1);
  const [syncFin, setSyncFin] = useState(30);
  const [syncing, setSyncing] = useState(false);

  const [modalItemAbierto, setModalItemAbierto] = useState(false);
  const [itemEditandoIndex, setItemEditandoIndex] = useState<number | null>(null);

  // --- Estado anulación ---
  const [isAnularModalOpen, setIsAnularModalOpen] = useState(false);
  const [comprobanteAnular, setComprobanteAnular] = useState<Comprobante | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);

  // --- Estado del modal de WhatsApp ---
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [comprobanteWhatsApp, setComprobanteWhatsApp] = useState<Comprobante | null>(null);
  const [numeroWhatsApp, setNumeroWhatsApp] = useState('');

  const isFactura = tipoActivo === 'factura';
  const requiereDocumento = isFactura;

  // React Hook Form
  const form = useForm<ComprobanteFormValues>({
    resolver: zodResolver(comprobanteSchema),
    defaultValues: {
      empresa_id: empresaId || 1,
      tipo_comprobante: String(TIPOS_COMPROBANTE.FACTURA),
      serie: '', // Se cargará desde la API al abrir el modal
      numero: 0, // Se cargará desde la API al abrir el modal
      cliente_tipo_de_documento: TIPOS_DOCUMENTO.RUC,
      cliente_numero_de_documento: '',
      cliente_denominacion: '',
      cliente_direccion: '',
      cliente_email: '',
      fecha_de_emision: new Date().toISOString().split('T')[0],
      moneda: MONEDAS.PEN,
      sunat_transaction: 1,
      porcentaje_de_igv: 18,
      pagado: false,
      fecha_de_vencimiento: new Date().toISOString().split('T')[0],
      tiene_detraccion: false,
      detraccion_tipo: null,
      detraccion_porcentaje: null,
      detraccion_monto: null,
      medio_pago_detraccion: null,
      observaciones: '',
      items: [],
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formAny = form as any;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // --- Carga de lista de comprobantes ---

  const fetchComprobantes = useCallback(async () => {
    try {
      const response = await api.comprobantes.listar({ per_page: 500, sort_by: 'id', sort_order: 'desc' });
      const data = response.data;
      const comprobantesData = (Array.isArray(data) ? data : (data as { data?: unknown[] }).data) || [];

      const mappedComprobantes: Comprobante[] = comprobantesData
        .map((item: unknown) => {
          const comp = item as Record<string, unknown>;
          return {
            id: comp.id as number,
            tipo_doc: comp.tipo_doc as string || '',
            serie: comp.serie as string || '',
            correlativo: comp.correlativo as string || '',
            numero_completo: comp.numero_completo as string || `${comp.serie}-${comp.correlativo}`,
            cliente_razon_social: comp.cliente_razon_social as string || '',
            cliente_num_doc: comp.cliente_num_doc as string || '',
            fecha_emision: comp.fecha_emision as string || '',
            moneda: comp.moneda as string || 'PEN',
            mto_imp_venta: typeof comp.mto_imp_venta === 'number' ? comp.mto_imp_venta : parseFloat(String(comp.mto_imp_venta || 0)),
            mto_oper_gravadas: typeof comp.mto_oper_gravadas === 'number' ? comp.mto_oper_gravadas : parseFloat(String(comp.mto_oper_gravadas || 0)),
            mto_oper_gratuitas: typeof comp.mto_oper_gratuitas === 'number' ? comp.mto_oper_gratuitas : parseFloat(String(comp.mto_oper_gratuitas || 0)),
            mto_igv: typeof comp.mto_igv === 'number' ? comp.mto_igv : parseFloat(String(comp.mto_igv || 0)),
            estado_sunat: comp.estado_sunat as string || '',
            nubefact_aceptada_por_sunat: comp.nubefact_aceptada_por_sunat as boolean || false,
            nubefact_pdf_url: comp.nubefact_pdf_url as string,
            nubefact_xml_url: comp.nubefact_xml_url as string,
            nubefact_cdr_url: comp.nubefact_cdr_url as string,
            anulado: comp.anulado as boolean || false,
            pagado: comp.pagado as boolean || false,
            forma_pago: comp.forma_pago as string || 'Contado',
          };
        })
        // Filtrar solo Facturas (01) y Boletas (03)
        .filter(comp => comp.tipo_doc === '01' || comp.tipo_doc === '03');

      setComprobantes(mappedComprobantes);
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo cargar la lista de comprobantes',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComprobantes();
  }, [fetchComprobantes]);

  // --- Carga de datos para el formulario ---

  // Mapear tipo NubeFact (1,2,3,4) a tipo SUNAT (01,03,07,08)
  const mapTipoSunat: Record<string, string> = { '1': '01', '2': '03', '3': '07', '4': '08' };

  const cargarSeries = async (tipoCodigoParam?: string) => {
    try {
      const eid = empresaId || 1;
      const tipoCodigo = tipoCodigoParam || form.getValues('tipo_comprobante');
      const tipoSunat = mapTipoSunat[tipoCodigo] || tipoCodigo;

      console.log('[cargarSeries] Consultando series:', { empresaId: eid, tipoCodigo, tipoSunat });

      const res = await api.series.listar({ empresa_id: eid, tipo_comprobante: tipoSunat });
      const lista = res.data.data;

      if (lista.length > 0) {
        const serieDefecto = lista.find((s: Serie) => s.por_defecto) ?? lista[0];
        form.setValue('serie', serieDefecto.serie);

        // Obtener correlativo real consultando la API de NubeFact
        try {
          console.log('[cargarSeries] Consultando correlativo:', { empresaId: eid, tipoSunat, serie: serieDefecto.serie });
          const corr = await obtenerCorrelativoSeguro(eid, tipoSunat, serieDefecto.serie);
          const num = parseInt(String(corr.correlativo), 10);
          console.log('[cargarSeries] Correlativo obtenido:', { correlativo: corr.correlativo, numeroParseado: num });
          form.setValue('numero', num);
        } catch (err) {
          console.error('[cargarSeries] Error al obtener correlativo:', err);
          // Fallback: usar correlativo_actual de la serie
          const fallbackNum = (serieDefecto.correlativo_actual ?? 0) + 1;
          console.log('[cargarSeries] Usando fallback:', fallbackNum);
          form.setValue('numero', fallbackNum);
        }
      }
    } catch (err) {
      console.error('[cargarSeries] Error general:', err);
      // Mantener modo manual
    }
  };

  const cargarClientes = async () => {
    try {
      setLoadingClientes(true);
      const response = await api.entidades.listar({
        empresa_id: empresaId || 1,
        activo: true,
      });
      setClientes(response.data);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
    } finally {
      setLoadingClientes(false);
    }
  };

  const cargarProductos = async () => {
    try {
      setLoadingProductos(true);
      const response = await api.productos.listar({
        empresa_id: empresaId || 1,
        activo: true,
      });
      setProductos(response.data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    } finally {
      setLoadingProductos(false);
    }
  };

  useEffect(() => {
    if (isCreateModalOpen && empresaId) {
      form.setValue('empresa_id', empresaId);
      void cargarSeries();
      void cargarClientes();
      void cargarProductos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateModalOpen, empresaId]);

  // --- Funciones del formulario ---

  const seleccionarCliente = (cliente: Entidad) => {
    const numeroDoc = cliente.num_doc || cliente.numero_documento || '';
    const tipoDoc = numeroDoc.length === 11 ? TIPOS_DOCUMENTO.RUC : TIPOS_DOCUMENTO.DNI;
    const nombre = cliente.denominacion || cliente.razon_social || cliente.nombre_comercial || cliente.razon_comercial || '';
    form.setValue('cliente_numero_de_documento', numeroDoc);
    form.setValue('cliente_denominacion', nombre);
    form.setValue('cliente_tipo_de_documento', tipoDoc);
    form.setValue('cliente_direccion', cliente.direccion || '');
    form.setValue('cliente_email', cliente.email || '');
    setOpenClienteCombobox(false);
  };

  const cambiarTipo = (tipo: 'factura' | 'boleta') => {
    setTipoActivo(tipo);
    const esFactura = tipo === 'factura';
    const codigo = esFactura ? String(TIPOS_COMPROBANTE.FACTURA) : String(TIPOS_COMPROBANTE.BOLETA);

    console.log('[cambiarTipo] Cambiando tipo:', { tipo, codigo, tipoSunat: mapTipoSunat[codigo] });

    form.setValue('tipo_comprobante', codigo);
    form.setValue('cliente_tipo_de_documento', esFactura ? TIPOS_DOCUMENTO.RUC : TIPOS_DOCUMENTO.DNI);

    // cargarSeries se encargará de establecer la serie y correlativo correctos
    void cargarSeries(codigo);
  };

  const appendItemFromProducto = (producto: Producto) => {
    const valor_unitario = Number(producto.valor_venta_unitario || 0);
    const precio_unitario = Number(producto.precio_venta_unitario || 0);
    const unidad_medida = producto.unidad_medida || UNIDADES_MEDIDA.NIU;
    // Convertir código SUNAT Catálogo 07 (10,20,30...) a NubeFact (1,8,9...)
    const tipo_igv = sunatIgvToNubefact(producto.tipo_afectacion_igv || '10');
    append({
      unidad_de_medida: unidad_medida,
      codigo: producto.codigo || producto.id.toString(),
      descripcion: producto.descripcion,
      cantidad: 1,
      valor_unitario: parseFloat(valor_unitario.toFixed(6)),
      precio_unitario: parseFloat(precio_unitario.toFixed(6)),
      descuento: 0,
      tipo_de_igv: tipo_igv,
    });
  };

  const abrirModalItem = (index?: number) => {
    if (index !== undefined) {
      setItemEditandoIndex(index);
    } else {
      append({
        unidad_de_medida: UNIDADES_MEDIDA.NIU,
        codigo: '',
        descripcion: '',
        cantidad: 1,
        valor_unitario: 0,
        precio_unitario: 0,
        descuento: 0,
        tipo_de_igv: TIPOS_IGV.GRAVADO_OPERACION_ONEROSA,
      });
      setItemEditandoIndex(fields.length);
    }
    setModalItemAbierto(true);
  };

  const cerrarModalItem = (guardar: boolean) => {
    if (!guardar && itemEditandoIndex === fields.length - 1) {
      remove(itemEditandoIndex);
    }
    setModalItemAbierto(false);
    setItemEditandoIndex(null);
  };

  // --- Cálculos ---

  const calcularItemSolo = (index: number) => {
    const item = form.getValues(`items.${index}`);
    if (!item) return { subtotal: 0, igv: 0, total: 0, precio_unitario: 0, valor_unitario: 0 };
    const { cantidad, valor_unitario, descuento = 0, tipo_de_igv } = item;
    // NubeFact permite hasta 10 decimales en valor_unitario/precio_unitario
    const valUnit = valor_unitario;
    const desc = descuento;
    const subtotal = Math.round((cantidad * valUnit - desc) * 100) / 100;
    const aplicaIgv = esGravado(tipo_de_igv);
    const igvRate = aplicaIgv ? (form.getValues('porcentaje_de_igv') || 18) / 100 : 0;
    const igv = Math.round(subtotal * igvRate * 100) / 100;
    const total = Math.round((subtotal + igv) * 100) / 100;
    const precio_unitario = aplicaIgv
      ? Math.round(valUnit * (1 + igvRate) * 1000000) / 1000000
      : valUnit;
    return { subtotal, igv, total, precio_unitario, valor_unitario: valUnit };
  };

  const calcularItem = (index: number) => {
    const calc = calcularItemSolo(index);
    form.setValue(`items.${index}.precio_unitario`, parseFloat(calc.precio_unitario.toFixed(6)));
    return calc;
  };

  const calcularTotales = () => {
    const items = form.getValues('items');
    let total_gravada = 0;
    let total_exonerada = 0;
    let total_inafecta = 0;
    let total_gratuita = 0;
    let total_igv = 0;
    let total = 0;
    items.forEach((item, index) => {
      const calc = calcularItemSolo(index);
      const tipo = item.tipo_de_igv;
      if (esGravado(tipo)) {
        total_gravada += calc.subtotal;
        total_igv += calc.igv;
        total += calc.total;
      } else if (esExonerado(tipo)) {
        total_exonerada += calc.subtotal;
        total += calc.subtotal;
      } else if (esInafecto(tipo)) {
        total_inafecta += calc.subtotal;
        total += calc.subtotal;
      } else if (esGratuita(tipo)) {
        total_gratuita += calc.subtotal;
        // Gratuitas no suman al total a pagar
      }
    });
    return {
      total_gravada: parseFloat(total_gravada.toFixed(2)),
      total_exonerada: parseFloat(total_exonerada.toFixed(2)),
      total_inafecta: parseFloat(total_inafecta.toFixed(2)),
      total_gratuita: parseFloat(total_gratuita.toFixed(2)),
      total_igv: parseFloat(total_igv.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    };
  };

  // --- Sincronización NubeFact ---
  const handleSync = async () => {
    if (syncFin - syncInicio + 1 > 100) {
      toast.error('El rango máximo es de 100 comprobantes');
      return;
    }
    try {
      setSyncing(true);
      const result = await sincronizarRango({
        tipo_doc: syncTipoDoc,
        serie: syncSerie,
        numero_inicio: syncInicio,
        numero_fin: syncFin,
        empresa_id: empresaId || undefined,
      });
      const partes = [];
      if (result.creados > 0) partes.push(`${result.creados} creados`);
      if (result.actualizados > 0) partes.push(`${result.actualizados} actualizados`);
      if ((result as unknown as Record<string, number>).enriquecidos > 0) partes.push(`${(result as unknown as Record<string, number>).enriquecidos} enriquecidos con XML`);
      if (result.no_encontrados > 0) partes.push(`${result.no_encontrados} no encontrados`);
      if (result.errores > 0) partes.push(`${result.errores} errores`);
      const desc = partes.length > 0 ? partes.join(', ') : 'No se encontraron comprobantes en el rango';
      if (result.exitosos > 0) {
        toast.success(`Sincronización completada`, { description: desc });
      } else {
        toast.info(`Sincronización completada`, { description: desc });
      }
      setIsSyncModalOpen(false);
      void fetchComprobantes();
    } catch (error) {
      const err = error as { response?: { data?: { mensaje?: string; message?: string } }; message?: string };
      toast.error('Error al sincronizar', {
        description: err.response?.data?.mensaje || err.response?.data?.message || err.message || 'Error desconocido',
      });
    } finally {
      setSyncing(false);
    }
  };

  const watchedItems = form.watch('items');
  const porcentajeIgv = form.watch('porcentaje_de_igv');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const totales = useMemo(() => calcularTotales(), [watchedItems, porcentajeIgv]);

  // --- Emisión de comprobante ---

  const handleEmitirCPE = async (data: ComprobanteFormValues) => {
    try {
      setEmitiendo(true);
      const tot = calcularTotales();
      const items = data.items.map((item, index) => {
        const calc = calcularItemSolo(index);
        return {
          ...item,
          valor_unitario: calc.valor_unitario,
          precio_unitario: calc.precio_unitario,
          subtotal: calc.subtotal,
          igv: calc.igv,
          total: calc.total,
        };
      });

      const payload: EmitirComprobanteRequest = {
        ...data,
        cliente_numero_de_documento: data.cliente_numero_de_documento || '',
        operacion: 'generar_comprobante',
        tipo_de_comprobante: Number(data.tipo_comprobante),
        sunat_transaction: Number(data.sunat_transaction),
        moneda: data.moneda,
        porcentaje_de_igv: Number(data.porcentaje_de_igv),
        total_gravada: tot.total_gravada,
        total_exonerada: tot.total_exonerada,
        total_inafecta: tot.total_inafecta,
        total_gratuita: tot.total_gratuita,
        total_igv: tot.total_igv,
        total: tot.total,
        enviar_automaticamente_a_la_sunat: true,
        enviar_automaticamente_al_cliente: !!data.cliente_email,
        tiene_detraccion: data.tiene_detraccion ?? false,
        detraccion_tipo: data.detraccion_tipo ?? undefined,
        detraccion_porcentaje: data.detraccion_porcentaje ?? undefined,
        detraccion_monto: data.detraccion_monto ?? undefined,
        medio_pago_detraccion: data.medio_pago_detraccion ?? undefined,
        items,
      };

      const response = await emitirComprobante(payload);

      // La respuesta del backend: { success, message, data: { aceptada_por_sunat, ... } }
      if (response.success === false) {
        toast.error('Error al emitir comprobante', {
          description: response.message || 'Error desconocido',
        });
        return;
      }

      const respData = response.data;
      if (respData?.aceptada_por_sunat) {
        toast.success('Comprobante emitido exitosamente', {
          description: `${data.serie}-${data.numero} aceptado por SUNAT`,
        });
        setIsCreateModalOpen(false);
        form.reset();
        await fetchComprobantes();

        // Enviar automáticamente por WhatsApp al número configurado
        // Esperar un momento para que se cargue el comprobante
        setTimeout(() => {
          const comprobanteEmitido = comprobantes.find(
            (c) => c.serie === data.serie && c.correlativo === String(data.numero)
          );
          if (comprobanteEmitido && comprobanteEmitido.nubefact_pdf_url) {
            enviarWhatsAppAutomatico(comprobanteEmitido);
            toast.success('Mensaje de WhatsApp enviado', {
              description: 'Se abrió WhatsApp con el comprobante',
            });
          }
        }, 1000);
      } else {
        toast.warning('Comprobante enviado pero pendiente de aceptación', {
          description: respData?.sunat_description || 'Pendiente de validación SUNAT',
        });
        setIsCreateModalOpen(false);
        void fetchComprobantes();
      }
    } catch (error) {
      console.error('Error:', error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error('Error al procesar comprobante', {
        description: err.response?.data?.message || err.message || 'Error desconocido',
      });
    } finally {
      setEmitiendo(false);
    }
  };

  // --- Funciones de la lista ---

  const comprobantesFiltrados = comprobantes.filter((comp) => {
    if (filtroTipoDoc !== 'todos' && comp.tipo_doc !== filtroTipoDoc) return false;
    if (filtroEstado !== 'todos') {
      if (filtroEstado === 'aceptado' && !comp.nubefact_aceptada_por_sunat) return false;
      if (filtroEstado === 'pendiente' && comp.nubefact_aceptada_por_sunat) return false;
      if (filtroEstado === 'rechazado' && (comp.nubefact_aceptada_por_sunat || comp.estado_sunat === 'pendiente')) return false;
    }
    if (!valorFiltro) return true;
    const valorBusqueda = valorFiltro.toLowerCase();
    switch (tipoFiltro) {
      case 'cliente': return comp.cliente_razon_social.toLowerCase().includes(valorBusqueda);
      case 'numero': return comp.numero_completo.toLowerCase().includes(valorBusqueda);
      case 'fecha': return comp.fecha_emision.includes(valorFiltro);
      case 'tipo': return comp.tipo_doc.includes(valorFiltro);
      default: return true;
    }
  });

  const totalPages = Math.ceil(comprobantesFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const comprobantesPaginados = comprobantesFiltrados.slice(startIndex, startIndex + itemsPerPage);

  const handleVerDetalles = (comprobante: Comprobante) => {
    setSelectedComprobante(comprobante);
    setIsDetailModalOpen(true);
  };

  // Enviar automáticamente al número configurado (después de emitir)
  const enviarWhatsAppAutomatico = (comprobante: Comprobante) => {
    const numeroConfigurdo = '+51907275278'; // Número configurado
    enviarMensajeWhatsAppA(comprobante, numeroConfigurdo);
  };

  // Abrir modal para enviar al cliente manualmente
  const handleEnviarWhatsApp = (comprobante: Comprobante) => {
    setComprobanteWhatsApp(comprobante);
    // Dejar vacío para que el usuario ingrese el número del cliente
    setNumeroWhatsApp('');
    setIsWhatsAppModalOpen(true);
  };

  // Enviar mensaje desde el modal
  const enviarMensajeWhatsApp = () => {
    if (!comprobanteWhatsApp) return;
    enviarMensajeWhatsAppA(comprobanteWhatsApp, numeroWhatsApp);
    // Cerrar modal
    setIsWhatsAppModalOpen(false);
    setComprobanteWhatsApp(null);
  };

  // Función auxiliar para enviar mensaje de WhatsApp
  const enviarMensajeWhatsAppA = (comprobante: Comprobante, numeroTelefono: string) => {
    const tipoDoc = comprobante.tipo_doc === '01' ? 'Factura' : 'Boleta';
    const numero = comprobante.numero_completo;
    const cliente = comprobante.cliente_razon_social;
    const total = comprobante.mto_imp_venta.toFixed(2);
    const moneda = comprobante.moneda === 'PEN' ? 'S/' : 'USD';

    let mensaje = `Hola ${cliente},%0A%0A`;
    mensaje += `Le enviamos su ${tipoDoc} Electrónica:%0A`;
    mensaje += `📄 *${numero}*%0A`;
    mensaje += `💰 Total: *${moneda} ${total}*%0A%0A`;

    if (comprobante.nubefact_pdf_url) {
      mensaje += `Puede descargar su comprobante aquí:%0A`;
      mensaje += `${comprobante.nubefact_pdf_url}%0A%0A`;
    }

    mensaje += `Gracias por su preferencia.`;

    // Limpiar el número de teléfono (quitar espacios, guiones, paréntesis)
    const numeroLimpio = numeroTelefono.replace(/[\s\-()]/g, '');

    // Abrir WhatsApp Web con el número y mensaje
    window.open(`https://wa.me/${numeroLimpio}?text=${mensaje}`, '_blank');
  };

  const handleNuevoComprobante = () => {
    setTipoActivo('factura');
    form.reset({
      empresa_id: empresaId || 1,
      tipo_comprobante: String(TIPOS_COMPROBANTE.FACTURA),
      serie: '', // Se cargará desde la API
      numero: 0, // Se cargará desde la API
      cliente_tipo_de_documento: TIPOS_DOCUMENTO.RUC,
      cliente_numero_de_documento: '',
      cliente_denominacion: '',
      cliente_direccion: '',
      cliente_email: '',
      fecha_de_emision: new Date().toISOString().split('T')[0],
      moneda: MONEDAS.PEN,
      sunat_transaction: 1,
      porcentaje_de_igv: 18,
      pagado: false,
      forma_pago: 'Contado',
      fecha_de_vencimiento: new Date().toISOString().split('T')[0],
      tiene_detraccion: false,
      detraccion_tipo: null,
      detraccion_porcentaje: null,
      detraccion_monto: null,
      medio_pago_detraccion: null,
      observaciones: '',
      items: [],
    });
    setIsCreateModalOpen(true);
  };

  const handleVerificarSunat = (comprobante: Comprobante) => {
    toast.info('Verificando', {
      description: `Verificando estado de ${comprobante.numero_completo} en SUNAT`,
    });
  };

  // Mapeo inverso: SUNAT tipo_doc → NubeFact tipo_de_comprobante
  const mapSunatToNubefact: Record<string, number> = { '01': 1, '03': 2, '07': 3, '08': 4 };

  const abrirModalAnular = (comprobante: Comprobante) => {
    setComprobanteAnular(comprobante);
    setMotivoAnulacion('');
    setIsAnularModalOpen(true);
  };

  const handleAnularComprobante = async () => {
    if (!comprobanteAnular || !motivoAnulacion.trim()) {
      toast.error('Debe ingresar un motivo de anulación');
      return;
    }
    try {
      setAnulando(true);
      const tipoSunat = comprobanteAnular.tipo_doc; // '01','03','07','08'
      const tipoNubefact = mapSunatToNubefact[tipoSunat] || 1;
      const correlativo = parseInt(comprobanteAnular.correlativo, 10);

      const response = await anularComprobante(
        tipoSunat,
        comprobanteAnular.serie,
        correlativo,
        {
          empresa_id: empresaId || 1,
          tipo_de_comprobante: tipoNubefact,
          serie: comprobanteAnular.serie,
          numero: correlativo,
          motivo: motivoAnulacion.trim(),
          fecha_de_baja: new Date().toISOString().split('T')[0],
        }
      );

      if (response.success === false) {
        toast.error('Error al anular', {
          description: response.message || 'No se pudo anular el comprobante',
        });
        return;
      }

      toast.success('Comprobante anulado', {
        description: `${comprobanteAnular.numero_completo} ha sido anulado exitosamente`,
      });
      setIsAnularModalOpen(false);
      setComprobanteAnular(null);
      void fetchComprobantes();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error('Error al anular comprobante', {
        description: err.response?.data?.message || err.message || 'Error desconocido',
      });
    } finally {
      setAnulando(false);
    }
  };

  const getEstadoBadge = (comprobante: Comprobante) => {
    if (comprobante.anulado) {
      return <Badge className="bg-red-500 text-white dark:bg-red-400 dark:text-gray-900 border-0">Anulado</Badge>;
    }
    if (comprobante.nubefact_aceptada_por_sunat) {
      return <Badge className="bg-green-500 text-white dark:bg-green-400 dark:text-gray-900 border-0">Aceptado</Badge>;
    }
    const estadoLower = (comprobante.estado_sunat ?? '').toLowerCase();
    if (estadoLower === 'pendiente') {
      return <Badge className="bg-yellow-500 text-white dark:bg-yellow-400 dark:text-gray-900 border-0">Pendiente</Badge>;
    }
    if (estadoLower === 'rechazado') {
      return <Badge className="bg-orange-500 text-white dark:bg-orange-400 dark:text-gray-900 border-0">Rechazado</Badge>;
    }
    return <Badge className="bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900 border-0">{comprobante.estado_sunat || 'Sin estado'}</Badge>;
  };

  const getTipoDocLabel = (tipo: string) => {
    switch (tipo) {
      case '01': return 'FAC';
      case '03': return 'BOL';
      case '07': return 'NC';
      case '08': return 'ND';
      default: return tipo;
    }
  };

  const getTipoDocColor = (tipo: string) => {
    switch (tipo) {
      case '01': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case '03': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case '07': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case '08': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('es-PE');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleLimpiarFiltros = () => {
    setValorFiltro('');
    setFiltroTipoDoc('todos');
    setFiltroEstado('todos');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-100">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Cargando comprobantes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 dark:text-white" />
            <span className="dark:text-white">Boletas y Facturas</span>
          </h1>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsSyncModalOpen(true)}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Sincronizar
            </Button>
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white dark:bg-green-400 dark:hover:bg-green-500 dark:text-gray-900 border-0"
              onClick={handleNuevoComprobante}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuevo CPE
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-muted/50 px-4 py-4 border-x border-border">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value as 'cliente' | 'numero' | 'fecha' | 'tipo')}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-white dark:bg-background"
              >
                <option value="cliente">Por Cliente</option>
                <option value="numero">Por Número</option>
                <option value="fecha">Por Fecha</option>
                <option value="tipo">Por Tipo</option>
              </select>
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-2">
              <Input
                type={tipoFiltro === 'fecha' ? 'date' : 'text'}
                placeholder={`Buscar por ${tipoFiltro}...`}
                className="bg-white dark:bg-background"
                value={valorFiltro}
                onChange={(e) => setValorFiltro(e.target.value)}
              />
            </div>
            <div>
              <select
                value={filtroTipoDoc}
                onChange={(e) => setFiltroTipoDoc(e.target.value as 'todos' | '01' | '03')}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-white dark:bg-background"
              >
                <option value="todos">Todos los tipos</option>
                <option value="01">Facturas</option>
                <option value="03">Boletas</option>
              </select>
            </div>
            <div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'aceptado' | 'pendiente' | 'rechazado')}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-white dark:bg-background"
              >
                <option value="todos">Todos los estados</option>
                <option value="aceptado">Aceptado</option>
                <option value="pendiente">Pendiente</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-1 flex gap-2">
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setCurrentPage(1)}
              >
                Buscar
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleLimpiarFiltros}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-card rounded-b-lg border border-t-0 border-border shadow-sm">
          {comprobantesPaginados.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No se encontraron comprobantes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-300">
                <thead>
                  <tr className="bg-primary hover:bg-primary">
                    <th className="px-2 py-1.5 text-left text-[10px] font-medium text-primary-foreground uppercase">Fecha</th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-medium text-primary-foreground uppercase">Tipo</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-medium text-primary-foreground uppercase">Serie</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-medium text-primary-foreground uppercase">Núm.</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-medium text-primary-foreground uppercase">Cliente</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-medium text-primary-foreground uppercase">T. Onerosa</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-medium text-primary-foreground uppercase">T. Gratuita</th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-medium text-primary-foreground uppercase">Estado</th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-medium text-primary-foreground uppercase">Docs</th>
                    <th className="px-2 py-1.5 text-center text-[10px] font-medium text-primary-foreground uppercase">Opciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {comprobantesPaginados.map((comp) => (
                    <tr key={comp.id} className="hover:bg-muted/50">
                      <td className="px-2 py-1.5 text-[11px] whitespace-nowrap">
                        {formatDate(comp.fecha_emision)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <Badge className={`text-[10px] px-1.5 py-0.5 font-medium ${getTipoDocColor(comp.tipo_doc)}`}>
                          {getTipoDocLabel(comp.tipo_doc)}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5 text-[11px] font-medium">
                        {comp.serie}
                      </td>
                      <td className="px-2 py-1.5 text-[11px] font-medium">
                        {comp.correlativo}
                      </td>
                      <td className="px-2 py-1.5 text-[11px] max-w-62.5">
                        <div className="truncate font-medium" title={comp.cliente_razon_social}>
                          {comp.cliente_razon_social}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{comp.cliente_num_doc}</div>
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-right whitespace-nowrap font-medium">
                        {formatCurrency((comp.mto_oper_gravadas || 0) + (comp.mto_igv || 0))}
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-right whitespace-nowrap">
                        {formatCurrency(comp.mto_oper_gratuitas || 0)}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex flex-col items-center gap-0.5">
                          {getEstadoBadge(comp)}
                          <div className="flex gap-1 mt-0.5">
                            {comp.pagado && (
                              <span title="Pagado">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <FileDown className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {comp.nubefact_pdf_url ? (
                              <DropdownMenuItem onClick={() => {
                                const width = 900;
                                const height = 700;
                                const left = (window.screen.width / 2) - (width / 2);
                                const top = (window.screen.height / 2) - (height / 2);
                                window.open(
                                  `${apiBaseUrl}/facturacion/descargar/pdf/${comp.id}`,
                                  'Imprimir PDF',
                                  `width=${width},height=${height},left=${left},top=${top},toolbar=yes,menubar=yes`
                                );
                              }}>
                                <Printer className="h-3.5 w-3.5 mr-2" />
                                Imprimir
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem disabled>
                                <Printer className="h-3.5 w-3.5 mr-2 opacity-50" />
                                PDF no disponible
                              </DropdownMenuItem>
                            )}
                            {comp.nubefact_pdf_url && (
                              <DropdownMenuItem onClick={() => window.open(`${apiBaseUrl}/facturacion/descargar/pdf/${comp.id}`, '_blank')}>
                                <FileText className="h-3.5 w-3.5 mr-2 text-red-600" />
                                PDF
                              </DropdownMenuItem>
                            )}
                            {comp.nubefact_xml_url && (
                              <DropdownMenuItem onClick={() => window.open(`${apiBaseUrl}/facturacion/descargar/xml/${comp.id}`, '_blank')}>
                                <FileText className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                XML
                              </DropdownMenuItem>
                            )}
                            {comp.nubefact_cdr_url && (
                              <DropdownMenuItem onClick={() => window.open(`${apiBaseUrl}/facturacion/descargar/cdr/${comp.id}`, '_blank')}>
                                <FileText className="h-3.5 w-3.5 mr-2 text-green-600" />
                                CDR
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEnviarWhatsApp(comp)}>
                              <MessageCircle className="h-3.5 w-3.5 mr-2 text-green-600" />
                              Enviar por WhatsApp
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleVerDetalles(comp)}>
                              <Eye className="h-3.5 w-3.5 mr-2" />
                              Ver detalles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleVerificarSunat(comp)}>
                              <RefreshCw className="h-3.5 w-3.5 mr-2" />
                              Verificar SUNAT
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              // Construir URL de SUNAT Portal
                              const empresaRuc = empresa?.ruc || '20434906301';
                              const tipoDoc = comp.tipo_doc;
                              const clienteRuc = comp.cliente_num_doc || '';
                              const serie = comp.serie;
                              const numero = comp.correlativo;
                              const fecha = new Date(comp.fecha_emision).toLocaleDateString('es-PE');
                              const total = comp.mto_imp_venta.toFixed(1);

                              const url = `https://ww1.sunat.gob.pe/ol-ti-itconsultaunificadalibre/consultaUnificadaLibre/consulta?E=${empresaRuc}&T=${tipoDoc}&R=${clienteRuc}&S=${serie}&N=${numero}&F=${fecha}&T=${total}`;
                              window.open(url, '_blank');
                            }}>
                              <FileText className="h-3.5 w-3.5 mr-2" />
                              Verificar SUNAT (Portal)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => !comp.anulado && abrirModalAnular(comp)}
                              disabled={comp.anulado}
                              className={comp.anulado ? "opacity-50 cursor-not-allowed" : "text-red-600 focus:text-red-600 cursor-pointer"}
                            >
                              <Ban className="h-3.5 w-3.5 mr-2" />
                              {comp.anulado ? 'Ya anulado' : 'Anular comprobante'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          <div className="px-4 py-3 border-t border-border bg-white dark:bg-card">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Mostrar</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-sm border border-border rounded bg-background text-foreground"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-sm text-muted-foreground">
                  registros | Mostrando {comprobantesFiltrados.length > 0 ? startIndex + 1 : 0} a {Math.min(startIndex + itemsPerPage, comprobantesFiltrados.length)} de {comprobantesFiltrados.length}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || totalPages === 0}
                  className="px-3 py-1 text-sm border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                {totalPages > 0 && Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-sm border border-border rounded transition-colors ${
                        currentPage === page
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1 text-sm border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Detalles */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles del Comprobante</DialogTitle>
              <DialogDescription>
                {selectedComprobante ? selectedComprobante.numero_completo : ''}
              </DialogDescription>
            </DialogHeader>
            {selectedComprobante && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <p className="text-sm font-medium">{getTipoDocLabel(selectedComprobante.tipo_doc)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Número</Label>
                    <p className="text-sm font-medium">{selectedComprobante.numero_completo}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha Emisión</Label>
                    <p className="text-sm font-medium">{formatDate(selectedComprobante.fecha_emision)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Moneda</Label>
                    <p className="text-sm font-medium">{selectedComprobante.moneda}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Forma de Pago</Label>
                    <p className="text-sm font-medium">{selectedComprobante.forma_pago}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estado</Label>
                    <div className="mt-1">{getEstadoBadge(selectedComprobante)}</div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Cliente</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Razón Social</Label>
                      <p className="text-sm font-medium">{selectedComprobante.cliente_razon_social}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Documento</Label>
                      <p className="text-sm font-medium">{selectedComprobante.cliente_num_doc}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Montos</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Total</Label>
                      <p className="text-lg font-bold text-primary">{formatCurrency(selectedComprobante.mto_imp_venta)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Estado de Pago</Label>
                      <p className="text-sm font-medium">
                        {selectedComprobante.pagado ? (
                          <Badge className="bg-green-500 text-white border-0">Pagado</Badge>
                        ) : (
                          <Badge className="bg-orange-500 text-white border-0">Pendiente</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Archivos</h3>
                  <div className="flex gap-2">
                    {selectedComprobante.nubefact_pdf_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedComprobante.nubefact_pdf_url, '_blank')}
                        className="text-red-600 border-red-200"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar PDF
                      </Button>
                    )}
                    {selectedComprobante.nubefact_xml_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedComprobante.nubefact_xml_url, '_blank')}
                        className="text-blue-600 border-blue-200"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar XML
                      </Button>
                    )}
                    {selectedComprobante.nubefact_cdr_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedComprobante.nubefact_cdr_url, '_blank')}
                        className="text-green-600 border-green-200"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar CDR
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Crear CPE */}
        <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
          if (!open) form.reset();
          setIsCreateModalOpen(open);
        }}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Emitir Comprobante de Pago Electrónico</DialogTitle>
              <DialogDescription>
                Complete los datos del comprobante. Los campos marcados con * son obligatorios.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={form.handleSubmit(handleEmitirCPE)} className="space-y-4">
              {/* Información de la Empresa */}
              {empresa && (
                <div className="bg-muted/50 p-4 rounded-lg border flex items-center gap-4">
                  {empresa.logo_path && (
                    <img
                      src={`${apiBaseUrl}/v1/empresas/${empresa.id}/logo`}
                      alt="Logo"
                      className="h-14 w-14 object-contain rounded border bg-white"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{empresa.razon_social}</p>
                    <p className="text-xs text-muted-foreground">RUC: {empresa.ruc}</p>
                    {empresa.direccion && (
                      <p className="text-xs text-muted-foreground">{empresa.direccion}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Selector de tipo */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={tipoActivo === 'factura' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => cambiarTipo('factura')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Factura Electrónica
                </Button>
                <Button
                  type="button"
                  variant={tipoActivo === 'boleta' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => cambiarTipo('boleta')}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Boleta de Venta
                </Button>
              </div>

              {/* Datos del Comprobante */}
              <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                <h3 className="text-sm font-semibold">Datos del Comprobante</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Serie *</Label>
                    <Input
                      type="text"
                      className="h-9 bg-muted font-mono"
                      readOnly
                      value={form.watch('serie') || ''}
                    />
                    {form.formState.errors.serie && (
                      <p className="text-xs text-destructive">{form.formState.errors.serie.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Número *</Label>
                    <Input
                      type="text"
                      className="h-9 bg-muted font-mono"
                      readOnly
                      value={String(form.watch('numero') || 0).padStart(8, '0')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha Emisión *</Label>
                    <Input type="date" className="h-9" {...form.register('fecha_de_emision')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha Vencimiento</Label>
                    <Input type="date" className="h-9" {...form.register('fecha_de_vencimiento')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">IGV %</Label>
                    <Select
                      value={String(form.watch('porcentaje_de_igv') ?? 18)}
                      onValueChange={(value) => form.setValue('porcentaje_de_igv', Number(value))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IGV_PORCENTAJES_SELECT.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo Operación</Label>
                    <Select
                      value={String(form.watch('sunat_transaction') ?? 1)}
                      onValueChange={(value) => form.setValue('sunat_transaction', Number(value))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_OPERACION_SELECT.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Moneda</Label>
                    <Select
                      value={form.watch('moneda')}
                      onValueChange={(value) => form.setValue('moneda', value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONEDAS_SELECT.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo Cambio</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      className="h-9"
                      placeholder="3.5000"
                      {...form.register('tipo_de_cambio', {
                        setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                      })}
                      disabled={form.watch('moneda') === MONEDAS.PEN}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Forma de Pago *</Label>
                    <Select
                      value={form.watch('forma_pago') || 'Contado'}
                      onValueChange={(value) => form.setValue('forma_pago', value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAS_PAGO_SELECT.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Cliente */}
              <ClienteCard
                form={formAny}
                clientes={clientes}
                loadingClientes={loadingClientes}
                openClienteCombobox={openClienteCombobox}
                setOpenClienteCombobox={setOpenClienteCombobox}
                busquedaCliente={busquedaCliente}
                setBusquedaCliente={setBusquedaCliente}
                seleccionarCliente={seleccionarCliente}
                total={totales.total}
                requiereDocumento={requiereDocumento}
              />

              {/* Items y Resumen */}
              <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:gap-4">
                <ItemsSection
                  form={formAny}
                  fields={fields}
                  productos={productos}
                  loadingProductos={loadingProductos}
                  openProductoCombobox={openProductoCombobox}
                  setOpenProductoCombobox={setOpenProductoCombobox}
                  busquedaProducto={busquedaProducto}
                  setBusquedaProducto={setBusquedaProducto}
                  onAppendProducto={appendItemFromProducto}
                  onAgregarLinea={() => abrirModalItem()}
                  onClickItem={(index) => abrirModalItem(index)}
                  onRemoveItem={(index) => remove(index)}
                  calcularItemSolo={calcularItemSolo}
                />

                <div className="space-y-4">
                  <ResumenTotalesCard
                    form={formAny}
                    totales={totales}
                    requiereDocumento={requiereDocumento}
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-1">
                <Label className="text-xs">Observaciones</Label>
                <Input {...form.register('observaciones')} placeholder="Notas adicionales (opcional)" />
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={emitiendo} className="bg-green-500 hover:bg-green-600 text-white">
                  {emitiendo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Emitiendo...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Emitir Comprobante
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal de Item */}
        <ItemModal
          form={formAny}
          open={modalItemAbierto}
          index={itemEditandoIndex}
          onClose={cerrarModalItem}
          calcularItem={calcularItem}
          calcularItemSolo={calcularItemSolo}
          onRemove={(index) => {
            remove(index);
            cerrarModalItem(false);
          }}
          empresaId={empresaId || 1}
        />

        {/* Modal de Sincronización NubeFact */}
        {/* Modal Anular Comprobante */}
        <Dialog open={isAnularModalOpen} onOpenChange={(open) => { if (!anulando) setIsAnularModalOpen(open); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Ban className="h-5 w-5" />
                Anular Comprobante
              </DialogTitle>
              <DialogDescription>
                Esta acción enviará una comunicación de baja a SUNAT. El comprobante quedará anulado permanentemente.
              </DialogDescription>
            </DialogHeader>
            {comprobanteAnular && (
              <div className="space-y-4 py-2">
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-3 space-y-1">
                  <p className="text-sm font-medium">
                    {comprobanteAnular.tipo_doc === '01' ? 'Factura' : comprobanteAnular.tipo_doc === '03' ? 'Boleta' : 'Comprobante'}: <span className="font-mono">{comprobanteAnular.numero_completo}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cliente: {comprobanteAnular.cliente_razon_social}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: {formatCurrency(comprobanteAnular.mto_imp_venta)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motivo-anulacion">Motivo de anulación <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="motivo-anulacion"
                    value={motivoAnulacion}
                    onChange={(e) => setMotivoAnulacion(e.target.value)}
                    placeholder="Ej: ERROR EN EL DOCUMENTO, ERROR DE SISTEMA..."
                    className="resize-none"
                    rows={3}
                    maxLength={100}
                    disabled={anulando}
                  />
                  <p className="text-xs text-muted-foreground text-right">{motivoAnulacion.length}/100</p>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsAnularModalOpen(false)} disabled={anulando}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleAnularComprobante}
                disabled={anulando || !motivoAnulacion.trim()}
              >
                {anulando ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Anulando...
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4 mr-2" />
                    Confirmar Anulación
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Enviar por WhatsApp */}
        <Dialog open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <MessageCircle className="h-5 w-5" />
                Enviar al Cliente por WhatsApp
              </DialogTitle>
              <DialogDescription>
                Envía el comprobante electrónico al celular del cliente.
              </DialogDescription>
            </DialogHeader>
            {comprobanteWhatsApp && (
              <div className="space-y-4 py-2">
                <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-3 space-y-1">
                  <p className="text-sm font-medium">
                    {comprobanteWhatsApp.tipo_doc === '01' ? 'Factura' : comprobanteWhatsApp.tipo_doc === '03' ? 'Boleta' : 'Comprobante'}: <span className="font-mono">{comprobanteWhatsApp.numero_completo}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cliente: {comprobanteWhatsApp.cliente_razon_social}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total: {formatCurrency(comprobanteWhatsApp.mto_imp_venta)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero-whatsapp">Número de WhatsApp del Cliente <span className="text-red-500">*</span></Label>
                  <Input
                    id="numero-whatsapp"
                    value={numeroWhatsApp}
                    onChange={(e) => setNumeroWhatsApp(e.target.value)}
                    placeholder="Ej: +51 987 654 321"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ingrese el número del cliente con código de país (ej: +51 para Perú)
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs font-medium mb-2">Vista previa del mensaje:</p>
                  <div className="text-xs text-muted-foreground space-y-1 font-mono">
                    <p>Hola {comprobanteWhatsApp.cliente_razon_social},</p>
                    <p></p>
                    <p>Le enviamos su {comprobanteWhatsApp.tipo_doc === '01' ? 'Factura' : 'Boleta'} Electrónica:</p>
                    <p>📄 <strong>{comprobanteWhatsApp.numero_completo}</strong></p>
                    <p>💰 Total: <strong>{comprobanteWhatsApp.moneda === 'PEN' ? 'S/' : 'USD'} {comprobanteWhatsApp.mto_imp_venta.toFixed(2)}</strong></p>
                    <p></p>
                    {comprobanteWhatsApp.nubefact_pdf_url && (
                      <>
                        <p>Puede descargar su comprobante aquí:</p>
                        <p className="text-blue-600 dark:text-blue-400 truncate">{comprobanteWhatsApp.nubefact_pdf_url}</p>
                        <p></p>
                      </>
                    )}
                    <p>Gracias por su preferencia.</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsWhatsAppModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={enviarMensajeWhatsApp}
                disabled={!numeroWhatsApp.trim()}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Enviar por WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Sincronizar desde NubeFact
              </DialogTitle>
              <DialogDescription>
                Importa comprobantes emitidos en NubeFact a tu base de datos local.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo documento</Label>
                  <select
                    value={syncTipoDoc}
                    onChange={(e) => {
                      setSyncTipoDoc(e.target.value);
                      // Asignar serie correcta según tipo de documento
                      const serieMap: Record<string, string> = {
                        '01': 'F010', // Factura
                        '03': 'B001', // Boleta
                        '07': 'FC01', // Nota de Crédito
                        '08': 'FD01', // Nota de Débito
                      };
                      setSyncSerie(serieMap[e.target.value] || 'F010');
                    }}
                    className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                  >
                    <option value="01">Factura</option>
                    <option value="03">Boleta</option>
                    <option value="07">Nota de Crédito</option>
                    <option value="08">Nota de Débito</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Serie</Label>
                  <Input
                    value={syncSerie}
                    onChange={(e) => setSyncSerie(e.target.value.toUpperCase())}
                    placeholder="Ej: F010, F001, B001"
                    maxLength={4}
                    className="font-mono uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    Puede editar la serie si necesita sincronizar series antiguas (ej: F001)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Desde N°</Label>
                  <Input
                    type="number"
                    min={1}
                    value={syncInicio}
                    onChange={(e) => setSyncInicio(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hasta N°</Label>
                  <Input
                    type="number"
                    min={1}
                    value={syncFin}
                    onChange={(e) => setSyncFin(Number(e.target.value))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Se consultarán {Math.max(0, syncFin - syncInicio + 1)} comprobantes en NubeFact (máx. 100).
                Los que no existan se omitirán automáticamente.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSyncModalOpen(false)} disabled={syncing}>
                Cancelar
              </Button>
              <Button onClick={handleSync} disabled={syncing || syncInicio > syncFin}>
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
