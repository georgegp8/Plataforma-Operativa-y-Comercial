import { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api, apiBaseUrl, type Serie, type Entidad, type Producto } from '@/lib/api';
import { Pencil, Trash2, Plus, Download, RefreshCw, ChevronLeft, ChevronRight, Receipt, FileText, Loader2 } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  emitirComprobante,
  TIPOS_COMPROBANTE,
  TIPOS_DOCUMENTO,
  TIPOS_IGV,
  MONEDAS,
  MONEDAS_SELECT,
  TIPOS_OPERACION_SELECT,
  IGV_PORCENTAJES_SELECT,
  UNIDADES_MEDIDA,
  esGravado,
  esExonerado,
  esInafecto,
  esGratuita,
  type EmitirComprobanteRequest,
} from '@/services/nubefact';
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
    cliente_email: z.string().email('Email inválido').optional().or(z.literal('')),
    fecha_de_emision: z.string().min(1, 'Requerido'),
    moneda: z.string().min(1, 'Requerido'),
    sunat_transaction: z.number().min(1, 'Seleccione un tipo de operación'),
    porcentaje_de_igv: z.number().min(1, 'Seleccione un porcentaje de IGV'),
    tipo_de_cambio: z.number().optional(),
    pagado: z.boolean().optional(),
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
  const [series, setSeries] = useState<Serie[]>([]);

  const [clientes, setClientes] = useState<Entidad[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [openClienteCombobox, setOpenClienteCombobox] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [openProductoCombobox, setOpenProductoCombobox] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');

  const [modalItemAbierto, setModalItemAbierto] = useState(false);
  const [itemEditandoIndex, setItemEditandoIndex] = useState<number | null>(null);

  const isFactura = tipoActivo === 'factura';
  const requiereDocumento = isFactura;

  // React Hook Form
  const form = useForm<ComprobanteFormValues>({
    resolver: zodResolver(comprobanteSchema),
    defaultValues: {
      empresa_id: empresaId || 1,
      tipo_comprobante: String(TIPOS_COMPROBANTE.FACTURA),
      serie: 'F001',
      numero: 1,
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
      const response = await api.comprobantes.listar();
      const data = response.data;
      const comprobantesData = (Array.isArray(data) ? data : (data as { data?: unknown[] }).data) || [];

      const mappedComprobantes: Comprobante[] = comprobantesData.map((item: unknown) => {
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
          estado_sunat: comp.estado_sunat as string || '',
          nubefact_aceptada_por_sunat: comp.nubefact_aceptada_por_sunat as boolean || false,
          nubefact_pdf_url: comp.nubefact_pdf_url as string,
          nubefact_xml_url: comp.nubefact_xml_url as string,
          nubefact_cdr_url: comp.nubefact_cdr_url as string,
          anulado: comp.anulado as boolean || false,
          pagado: comp.pagado as boolean || false,
          forma_pago: comp.forma_pago as string || 'Contado',
        };
      });

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

  const cargarSeries = async (tipoCodigoParam?: string) => {
    try {
      const eid = empresaId || 1;
      const tipoCodigo = tipoCodigoParam || form.getValues('tipo_comprobante');
      const res = await api.series.listar({ empresa_id: eid, tipo_comprobante: tipoCodigo });
      const lista = res.data.data;
      setSeries(lista);
      if (lista.length > 0) {
        const serieDefecto = lista.find((s: Serie) => s.por_defecto) ?? lista[0];
        form.setValue('serie', serieDefecto.serie);
        form.setValue('numero', (serieDefecto.correlativo_actual ?? 0) + 1);
      }
    } catch {
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
    if (isCreateModalOpen) {
      void cargarSeries();
      void cargarClientes();
      void cargarProductos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateModalOpen]);

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
    const prefix = esFactura ? 'F' : 'B';
    form.setValue('tipo_comprobante', codigo);
    form.setValue('serie', `${prefix}001`);
    form.setValue('cliente_tipo_de_documento', esFactura ? TIPOS_DOCUMENTO.RUC : TIPOS_DOCUMENTO.DNI);
    void cargarSeries(codigo);
  };

  const appendItemFromProducto = (producto: Producto) => {
    const valor_unitario = Number(producto.valor_venta_unitario || 0);
    const precio_unitario = Number(producto.precio_venta_unitario || 0);
    const unidad_medida = producto.unidad_medida || UNIDADES_MEDIDA.NIU;
    const tipo_igv = producto.tipo_afectacion_igv || TIPOS_IGV.GRAVADO_OPERACION_ONEROSA;
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
    // Redondear a 2 decimales para consistencia con SUNAT
    const valUnit = Math.round(valor_unitario * 100) / 100;
    const desc = Math.round(descuento * 100) / 100;
    const subtotal = Math.round((cantidad * valUnit - desc) * 100) / 100;
    const aplicaIgv = esGravado(tipo_de_igv);
    const igvRate = aplicaIgv ? (form.getValues('porcentaje_de_igv') || 18) / 100 : 0;
    const igv = Math.round(subtotal * igvRate * 100) / 100;
    const total = Math.round((subtotal + igv) * 100) / 100;
    const precio_unitario = aplicaIgv
      ? Math.round(valUnit * (1 + igvRate) * 100) / 100
      : valUnit;
    return { subtotal, igv, total, precio_unitario, valor_unitario: valUnit };
  };

  const calcularItem = (index: number) => {
    const calc = calcularItemSolo(index);
    form.setValue(`items.${index}.precio_unitario`, parseFloat(calc.precio_unitario.toFixed(2)));
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
        void fetchComprobantes();
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

  const handleNuevoComprobante = () => {
    setTipoActivo('factura');
    form.reset({
      empresa_id: empresaId || 1,
      tipo_comprobante: String(TIPOS_COMPROBANTE.FACTURA),
      serie: 'F001',
      numero: 1,
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
    });
    setIsCreateModalOpen(true);
  };

  const handleVerificarSunat = (comprobante: Comprobante) => {
    toast.info('Verificando', {
      description: `Verificando estado de ${comprobante.numero_completo} en SUNAT`,
    });
  };

  const getEstadoBadge = (comprobante: Comprobante) => {
    if (comprobante.anulado) {
      return <Badge className="bg-red-500 text-white dark:bg-red-400 dark:text-gray-900 border-0">Anulado</Badge>;
    }
    if (comprobante.nubefact_aceptada_por_sunat) {
      return <Badge className="bg-green-500 text-white dark:bg-green-400 dark:text-gray-900 border-0">Aceptado</Badge>;
    }
    if (comprobante.estado_sunat === 'pendiente') {
      return <Badge className="bg-yellow-500 text-white dark:bg-yellow-400 dark:text-gray-900 border-0">Pendiente</Badge>;
    }
    return <Badge className="bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900 border-0">Desconocido</Badge>;
  };

  const getTipoDocLabel = (tipo: string) => {
    switch (tipo) {
      case '01': return 'Factura';
      case '03': return 'Boleta';
      case '07': return 'N. Crédito';
      case '08': return 'N. Débito';
      default: return tipo;
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
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white dark:bg-green-400 dark:hover:bg-green-500 dark:text-gray-900 border-0"
            onClick={handleNuevoComprobante}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo CPE
          </Button>
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
              <table className="w-full min-w-175">
                <thead>
                  <tr className="bg-primary hover:bg-primary">
                    <th className="w-[4%] px-2 py-3 text-left text-xs font-medium text-primary-foreground">#</th>
                    <th className="w-[11%] px-2 py-3 text-left text-xs font-medium text-primary-foreground">Fecha</th>
                    <th className="w-[9%] px-2 py-3 text-left text-xs font-medium text-primary-foreground">Tipo</th>
                    <th className="w-[11%] px-2 py-3 text-left text-xs font-medium text-primary-foreground">Número</th>
                    <th className="w-[22%] px-2 py-3 text-left text-xs font-medium text-primary-foreground">Cliente</th>
                    <th className="w-[7%] px-2 py-3 text-left text-xs font-medium text-primary-foreground">Moneda</th>
                    <th className="w-[12%] px-2 py-3 text-right text-xs font-medium text-primary-foreground">Total</th>
                    <th className="w-[10%] px-2 py-3 text-left text-xs font-medium text-primary-foreground">Estado</th>
                    <th className="w-[14%] px-2 py-3 text-center text-xs font-medium text-primary-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {comprobantesPaginados.map((comp, index) => (
                    <tr key={comp.id} className="hover:bg-muted/50">
                      <td className="px-2 py-3 text-xs text-muted-foreground">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-2 py-3 text-xs font-medium whitespace-nowrap">
                        {formatDate(comp.fecha_emision)}
                      </td>
                      <td className="px-2 py-3 text-xs">
                        <Badge variant="outline" className="font-normal">
                          {getTipoDocLabel(comp.tipo_doc)}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-xs font-medium whitespace-nowrap">
                        {comp.numero_completo}
                      </td>
                      <td className="px-2 py-3 text-xs overflow-hidden">
                        <div className="truncate" title={comp.cliente_razon_social}>{comp.cliente_razon_social}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {comp.cliente_num_doc}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground">
                        {comp.moneda}
                      </td>
                      <td className="px-2 py-3 text-xs font-medium text-right whitespace-nowrap">
                        {formatCurrency(comp.mto_imp_venta)}
                      </td>
                      <td className="px-2 py-3 text-xs">
                        {getEstadoBadge(comp)}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:text-white dark:hover:bg-blue-900/20"
                            onClick={() => handleVerDetalles(comp)}
                            title="Ver detalles"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {comp.nubefact_pdf_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              onClick={() => window.open(comp.nubefact_pdf_url, '_blank')}
                              title="Descargar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                            onClick={() => handleVerificarSunat(comp)}
                            title="Verificar SUNAT"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          {!comp.anulado && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              onClick={() => {
                                toast.info('Próximamente', {
                                  description: 'La funcionalidad de anular comprobantes estará disponible pronto',
                                });
                              }}
                              title="Anular"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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
                    {series.length > 0 ? (
                      <Select
                        value={form.watch('serie')}
                        onValueChange={(value) => {
                          form.setValue('serie', value);
                          const encontrada = series.find((s) => s.serie === value);
                          if (encontrada) {
                            form.setValue('numero', (encontrada.correlativo_actual ?? 0) + 1);
                          }
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Serie" />
                        </SelectTrigger>
                        <SelectContent>
                          {series.map((s) => (
                            <SelectItem key={s.id} value={s.serie}>
                              {s.serie}{s.por_defecto ? ' (defecto)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input {...form.register('serie')} className="h-9" maxLength={4} />
                    )}
                    {form.formState.errors.serie && (
                      <p className="text-xs text-destructive">{form.formState.errors.serie.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Número *</Label>
                    <Input
                      type="number"
                      className="h-9 bg-muted"
                      readOnly
                      {...form.register('numero', { valueAsNumber: true })}
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
        />
      </div>
    </div>
  );
}
