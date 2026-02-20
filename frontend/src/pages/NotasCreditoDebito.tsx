import { useEffect, useState, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api, apiBaseUrl, obtenerCorrelativoSeguro, type Serie, type Entidad, type Producto } from '@/lib/api';
import {
  Eye, Ban, Plus, RefreshCw, ChevronLeft, ChevronRight, FileText,
  Loader2, MoreVertical, FileDown, Printer, CheckCircle2, MessageCircle,
  FileEdit,
} from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  emitirComprobante, anularComprobante,
  TIPOS_COMPROBANTE, TIPOS_DOCUMENTO, TIPOS_IGV, MONEDAS, MONEDAS_SELECT,
  IGV_PORCENTAJES_SELECT, UNIDADES_MEDIDA, FORMAS_PAGO_SELECT,
  esGravado, esExonerado, esInafecto, esGratuita, sunatIgvToNubefact,
  type EmitirComprobanteRequest,
} from '@/services/nubefact';
import { Textarea } from '@/components/ui/textarea';
import { useEmpresa } from '@/hooks/useEmpresa';
import { ClienteCard } from '@/components/ClienteCard';
import { ResumenTotalesCard } from '@/components/ResumenTotalesCard';
import { ItemsSection } from '@/components/ItemsSection';
import { ItemModal } from '@/components/ItemModal';
import { formatCurrency } from '@/lib/format';

// ─── Motivos SUNAT ────────────────────────────────────────────────────────────
const MOTIVOS_NC = [
  { value: '01', label: '01 - Anulación de la operación' },
  { value: '02', label: '02 - Anulación por error en el RUC' },
  { value: '03', label: '03 - Corrección en la descripción' },
  { value: '04', label: '04 - Descuento global' },
  { value: '05', label: '05 - Descuento por ítem' },
  { value: '06', label: '06 - Devolución total' },
  { value: '07', label: '07 - Devolución por ítem' },
  { value: '08', label: '08 - Bonificación' },
  { value: '09', label: '09 - Disminución en el valor' },
  { value: '10', label: '10 - Otros conceptos' },
  { value: '11', label: '11 - Ajustes operaciones exportación' },
  { value: '12', label: '12 - Ajustes afectos al IVAP' },
  { value: '13', label: '13 - Corrección descripción (sin efecto SUNAT)' },
];

const MOTIVOS_ND = [
  { value: '01', label: '01 - Intereses por mora' },
  { value: '02', label: '02 - Aumento en el valor' },
  { value: '03', label: '03 - Penalidades / otras deudas' },
  { value: '10', label: '10 - Otros conceptos' },
  { value: '11', label: '11 - Ajustes operaciones exportación' },
  { value: '12', label: '12 - Ajustes afectos al IVAP' },
];

// ─── Interfaces ───────────────────────────────────────────────────────────────
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

// ─── Schema ───────────────────────────────────────────────────────────────────
const itemSchema = z.object({
  unidad_de_medida: z.string().min(1),
  codigo: z.string().min(1),
  descripcion: z.string().min(1),
  cantidad: z.number().min(0.01),
  valor_unitario: z.number().min(0),
  precio_unitario: z.number().min(0),
  descuento: z.number().optional(),
  tipo_de_igv: z.string().min(1),
});

const notaSchema = z.object({
  empresa_id: z.number().min(1),
  tipo_comprobante: z.string().min(1),
  serie: z.string().min(4).max(4),
  numero: z.number().min(1),
  doc_original_tipo: z.string().min(2, 'Requerido'),
  doc_original_serie: z.string().min(4, 'Requerido'),
  doc_original_numero: z.string().min(1, 'Requerido'),
  motivo: z.string().min(2, 'Seleccione un motivo'),
  cliente_tipo_de_documento: z.string().min(1),
  cliente_numero_de_documento: z.string().optional(),
  cliente_denominacion: z.string().min(1, 'Requerido'),
  cliente_direccion: z.string().optional(),
  cliente_email: z.union([z.email({ message: 'Email inválido' }), z.literal('')]).optional(),
  fecha_de_emision: z.string().min(1),
  moneda: z.string().min(1),
  porcentaje_de_igv: z.number().min(1),
  tipo_de_cambio: z.number().optional(),
  forma_pago: z.string().min(1),
  observaciones: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Debe agregar al menos un ítem'),
});

type NotaFormValues = z.infer<typeof notaSchema>;

// ─── Componente ───────────────────────────────────────────────────────────────
export default function NotasCreditoDebito() {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'cliente' | 'numero' | 'fecha'>('cliente');
  const [valorFiltro, setValorFiltro] = useState('');
  const [filtroTipoDoc, setFiltroTipoDoc] = useState<'todos' | '07' | '08'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'aceptado' | 'pendiente'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedComprobante, setSelectedComprobante] = useState<Comprobante | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAnularModalOpen, setIsAnularModalOpen] = useState(false);
  const [comprobanteAnular, setComprobanteAnular] = useState<Comprobante | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [comprobanteWhatsApp, setComprobanteWhatsApp] = useState<Comprobante | null>(null);
  const [numeroWhatsApp, setNumeroWhatsApp] = useState('');

  const { empresaId, empresa } = useEmpresa();
  const [tipoNota, setTipoNota] = useState<'credito' | 'debito'>('credito');
  const [emitiendo, setEmitiendo] = useState(false);
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

  const form = useForm<NotaFormValues>({
    resolver: zodResolver(notaSchema),
    defaultValues: {
      empresa_id: empresaId || 1,
      tipo_comprobante: String(TIPOS_COMPROBANTE.NOTA_CREDITO),
      serie: '', numero: 0,
      doc_original_tipo: '01',
      doc_original_serie: '', doc_original_numero: '',
      motivo: '',
      cliente_tipo_de_documento: TIPOS_DOCUMENTO.RUC,
      cliente_numero_de_documento: '', cliente_denominacion: '',
      cliente_direccion: '', cliente_email: '',
      fecha_de_emision: new Date().toISOString().split('T')[0],
      moneda: MONEDAS.PEN, porcentaje_de_igv: 18,
      forma_pago: 'Contado', observaciones: '', items: [],
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formAny = form as any;
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  // ─── Fetch lista ──────────────────────────────────────────────────────────
  const fetchComprobantes = useCallback(async () => {
    try {
      const response = await api.comprobantes.listar({ per_page: 500, sort_by: 'id', sort_order: 'desc' });
      const data = response.data;
      const raw = (Array.isArray(data) ? data : (data as { data?: unknown[] }).data) || [];
      const mapped: Comprobante[] = raw
        .map((item: unknown) => {
          const c = item as Record<string, unknown>;
          return {
            id: c.id as number,
            tipo_doc: (c.tipo_doc as string) || '',
            serie: (c.serie as string) || '',
            correlativo: (c.correlativo as string) || '',
            numero_completo: (c.numero_completo as string) || `${c.serie}-${c.correlativo}`,
            cliente_razon_social: (c.cliente_razon_social as string) || '',
            cliente_num_doc: (c.cliente_num_doc as string) || '',
            fecha_emision: (c.fecha_emision as string) || '',
            moneda: (c.moneda as string) || 'PEN',
            mto_imp_venta: typeof c.mto_imp_venta === 'number' ? c.mto_imp_venta : parseFloat(String(c.mto_imp_venta || 0)),
            mto_oper_gravadas: typeof c.mto_oper_gravadas === 'number' ? c.mto_oper_gravadas : parseFloat(String(c.mto_oper_gravadas || 0)),
            mto_igv: typeof c.mto_igv === 'number' ? c.mto_igv : parseFloat(String(c.mto_igv || 0)),
            estado_sunat: (c.estado_sunat as string) || '',
            nubefact_aceptada_por_sunat: (c.nubefact_aceptada_por_sunat as boolean) || false,
            nubefact_pdf_url: c.nubefact_pdf_url as string,
            nubefact_xml_url: c.nubefact_xml_url as string,
            nubefact_cdr_url: c.nubefact_cdr_url as string,
            anulado: (c.anulado as boolean) || false,
            pagado: (c.pagado as boolean) || false,
            forma_pago: (c.forma_pago as string) || 'Contado',
          };
        })
        .filter(c => c.tipo_doc === '07' || c.tipo_doc === '08');
      setComprobantes(mapped);
    } catch {
      toast.error('Error al cargar notas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComprobantes(); }, [fetchComprobantes]);

  // ─── Carga datos formulario ───────────────────────────────────────────────
  const mapTipoSunat: Record<string, string> = { '3': '07', '4': '08' };

  const cargarSeries = async (tipoCodigoParam?: string) => {
    try {
      const eid = empresaId || 1;
      const tipoCodigo = tipoCodigoParam || form.getValues('tipo_comprobante');
      const tipoSunat = mapTipoSunat[tipoCodigo] || tipoCodigo;
      const res = await api.series.listar({ empresa_id: eid, tipo_comprobante: tipoSunat });
      const lista = res.data.data;
      if (lista.length > 0) {
        const serieDefecto = lista.find((s: Serie) => s.por_defecto) ?? lista[0];
        form.setValue('serie', serieDefecto.serie);
        try {
          const corr = await obtenerCorrelativoSeguro(eid, tipoSunat, serieDefecto.serie);
          form.setValue('numero', parseInt(String(corr.correlativo), 10));
        } catch {
          form.setValue('numero', (serieDefecto.correlativo_actual ?? 0) + 1);
        }
      }
    } catch { /* mantener manual */ }
  };

  const cargarClientes = async () => {
    try {
      setLoadingClientes(true);
      const response = await api.entidades.listar({ empresa_id: empresaId || 1, activo: true });
      setClientes(response.data);
    } catch { /* silencioso */ } finally { setLoadingClientes(false); }
  };

  const cargarProductos = async () => {
    try {
      setLoadingProductos(true);
      const response = await api.productos.listar({ empresa_id: empresaId || 1, activo: true });
      setProductos(response.data);
    } catch { /* silencioso */ } finally { setLoadingProductos(false); }
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

  // ─── Funciones formulario ──────────────────────────────────────────────────
  const seleccionarCliente = (cliente: Entidad) => {
    const numeroDoc = cliente.num_doc || cliente.numero_documento || '';
    const tipoDoc = numeroDoc.length === 11 ? TIPOS_DOCUMENTO.RUC : TIPOS_DOCUMENTO.DNI;
    form.setValue('cliente_numero_de_documento', numeroDoc);
    form.setValue('cliente_denominacion', cliente.denominacion || cliente.razon_social || '');
    form.setValue('cliente_tipo_de_documento', tipoDoc);
    form.setValue('cliente_direccion', cliente.direccion || '');
    form.setValue('cliente_email', cliente.email || '');
    setOpenClienteCombobox(false);
  };

  const cambiarTipoNota = (tipo: 'credito' | 'debito') => {
    setTipoNota(tipo);
    const codigo = tipo === 'credito'
      ? String(TIPOS_COMPROBANTE.NOTA_CREDITO)
      : String(TIPOS_COMPROBANTE.NOTA_DEBITO);
    form.setValue('tipo_comprobante', codigo);
    form.setValue('motivo', '');
    void cargarSeries(codigo);
  };

  const appendItemFromProducto = (producto: Producto) => {
    const tipo_igv = sunatIgvToNubefact(producto.tipo_afectacion_igv || '10');
    append({
      unidad_de_medida: producto.unidad_medida || UNIDADES_MEDIDA.NIU,
      codigo: producto.codigo || producto.id.toString(),
      descripcion: producto.descripcion,
      cantidad: 1,
      valor_unitario: parseFloat(Number(producto.valor_venta_unitario || 0).toFixed(6)),
      precio_unitario: parseFloat(Number(producto.precio_venta_unitario || 0).toFixed(6)),
      descuento: 0,
      tipo_de_igv: tipo_igv,
    });
  };

  const abrirModalItem = (index?: number) => {
    if (index !== undefined) {
      setItemEditandoIndex(index);
    } else {
      append({
        unidad_de_medida: UNIDADES_MEDIDA.NIU, codigo: '', descripcion: '',
        cantidad: 1, valor_unitario: 0, precio_unitario: 0,
        descuento: 0, tipo_de_igv: TIPOS_IGV.GRAVADO_OPERACION_ONEROSA,
      });
      setItemEditandoIndex(fields.length);
    }
    setModalItemAbierto(true);
  };

  const cerrarModalItem = (guardar: boolean) => {
    if (!guardar && itemEditandoIndex === fields.length - 1) remove(itemEditandoIndex);
    setModalItemAbierto(false);
    setItemEditandoIndex(null);
  };

  // ─── Cálculos ─────────────────────────────────────────────────────────────
  const calcularItemSolo = (index: number) => {
    const item = form.getValues(`items.${index}`);
    if (!item) return { subtotal: 0, igv: 0, total: 0, precio_unitario: 0, valor_unitario: 0 };
    const { cantidad, valor_unitario, descuento = 0, tipo_de_igv } = item;
    const subtotal = Math.round((cantidad * valor_unitario - descuento) * 100) / 100;
    const igvRate = esGravado(tipo_de_igv) ? (form.getValues('porcentaje_de_igv') || 18) / 100 : 0;
    const igv = Math.round(subtotal * igvRate * 100) / 100;
    const total = Math.round((subtotal + igv) * 100) / 100;
    const precio_unitario = igvRate > 0
      ? Math.round(valor_unitario * (1 + igvRate) * 1000000) / 1000000
      : valor_unitario;
    return { subtotal, igv, total, precio_unitario, valor_unitario };
  };

  const calcularItem = (index: number) => {
    const calc = calcularItemSolo(index);
    form.setValue(`items.${index}.precio_unitario`, parseFloat(calc.precio_unitario.toFixed(6)));
    return calc;
  };

  const calcularTotales = () => {
    const items = form.getValues('items');
    let total_gravada = 0, total_exonerada = 0, total_inafecta = 0;
    let total_gratuita = 0, total_igv = 0, total = 0;
    items.forEach((item, i) => {
      const calc = calcularItemSolo(i);
      const tipo = item.tipo_de_igv;
      if (esGravado(tipo)) { total_gravada += calc.subtotal; total_igv += calc.igv; total += calc.total; }
      else if (esExonerado(tipo)) { total_exonerada += calc.subtotal; total += calc.subtotal; }
      else if (esInafecto(tipo)) { total_inafecta += calc.subtotal; total += calc.subtotal; }
      else if (esGratuita(tipo)) { total_gratuita += calc.subtotal; }
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

  // ─── Emisión ──────────────────────────────────────────────────────────────
  const handleEmitirNota = async (data: NotaFormValues) => {
    try {
      setEmitiendo(true);
      const tot = calcularTotales();
      const items = data.items.map((item, i) => {
        const calc = calcularItemSolo(i);
        return { ...item, ...calc };
      });
      const esNC = data.tipo_comprobante === String(TIPOS_COMPROBANTE.NOTA_CREDITO);
      const payload: EmitirComprobanteRequest = {
        empresa_id: data.empresa_id,
        operacion: 'generar_comprobante',
        tipo_de_comprobante: Number(data.tipo_comprobante),
        serie: data.serie,
        numero: data.numero,
        sunat_transaction: 1,
        cliente_tipo_de_documento: data.cliente_tipo_de_documento,
        cliente_numero_de_documento: data.cliente_numero_de_documento || '',
        cliente_denominacion: data.cliente_denominacion,
        cliente_direccion: data.cliente_direccion,
        cliente_email: data.cliente_email,
        fecha_de_emision: data.fecha_de_emision,
        moneda: data.moneda,
        tipo_de_cambio: data.tipo_de_cambio,
        porcentaje_de_igv: data.porcentaje_de_igv,
        total_gravada: tot.total_gravada,
        total_exonerada: tot.total_exonerada,
        total_inafecta: tot.total_inafecta,
        total_gratuita: tot.total_gratuita,
        total_igv: tot.total_igv,
        total: tot.total,
        documento_que_se_modifica_tipo: data.doc_original_tipo,
        documento_que_se_modifica_serie: data.doc_original_serie,
        documento_que_se_modifica_numero: data.doc_original_numero,
        ...(esNC
          ? { tipo_de_nota_de_credito: data.motivo }
          : { tipo_de_nota_de_debito: data.motivo }),
        forma_pago: data.forma_pago,
        observaciones: data.observaciones,
        enviar_automaticamente_a_la_sunat: true,
        enviar_automaticamente_al_cliente: !!data.cliente_email,
        items,
      };
      const response = await emitirComprobante(payload);
      if (response.success === false) {
        toast.error('Error al emitir', { description: response.message || 'Error desconocido' });
        return;
      }
      if (response.data?.aceptada_por_sunat) {
        toast.success(`${esNC ? 'Nota de Crédito' : 'Nota de Débito'} emitida`, {
          description: `${data.serie}-${data.numero} aceptada por SUNAT`,
        });
        setIsCreateModalOpen(false);
        form.reset();
        await fetchComprobantes();
      } else {
        toast.warning('Nota enviada, pendiente de aceptación', {
          description: response.data?.sunat_description || 'Pendiente de validación SUNAT',
        });
        setIsCreateModalOpen(false);
        void fetchComprobantes();
      }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error('Error al procesar nota', {
        description: err.response?.data?.message || err.message || 'Error desconocido',
      });
    } finally {
      setEmitiendo(false);
    }
  };

  const handleNuevaNotaCPE = () => {
    setTipoNota('credito');
    form.reset({
      empresa_id: empresaId || 1,
      tipo_comprobante: String(TIPOS_COMPROBANTE.NOTA_CREDITO),
      serie: '', numero: 0,
      doc_original_tipo: '01', doc_original_serie: '', doc_original_numero: '',
      motivo: '',
      cliente_tipo_de_documento: TIPOS_DOCUMENTO.RUC,
      cliente_numero_de_documento: '', cliente_denominacion: '',
      cliente_direccion: '', cliente_email: '',
      fecha_de_emision: new Date().toISOString().split('T')[0],
      moneda: MONEDAS.PEN, porcentaje_de_igv: 18,
      forma_pago: 'Contado', observaciones: '', items: [],
    });
    setIsCreateModalOpen(true);
  };

  // ─── Filtrado + paginación ────────────────────────────────────────────────
  const comprobantesFiltrados = comprobantes.filter(comp => {
    if (filtroTipoDoc !== 'todos' && comp.tipo_doc !== filtroTipoDoc) return false;
    if (filtroEstado !== 'todos') {
      if (filtroEstado === 'aceptado' && !comp.nubefact_aceptada_por_sunat) return false;
      if (filtroEstado === 'pendiente' && comp.nubefact_aceptada_por_sunat) return false;
    }
    if (!valorFiltro) return true;
    const v = valorFiltro.toLowerCase();
    if (tipoFiltro === 'cliente') return comp.cliente_razon_social.toLowerCase().includes(v);
    if (tipoFiltro === 'numero') return comp.numero_completo.toLowerCase().includes(v);
    if (tipoFiltro === 'fecha') return comp.fecha_emision.includes(valorFiltro);
    return true;
  });

  const totalPages = Math.ceil(comprobantesFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const comprobantesPaginados = comprobantesFiltrados.slice(startIndex, startIndex + itemsPerPage);

  const getEstadoBadge = (comp: Comprobante) => {
    if (comp.anulado) return <Badge className="bg-red-500 text-white border-0">Anulado</Badge>;
    if (comp.nubefact_aceptada_por_sunat) return <Badge className="bg-green-500 text-white border-0">Aceptado</Badge>;
    return <Badge className="bg-yellow-500 text-white border-0">Pendiente</Badge>;
  };

  const mapSunatToNubefact: Record<string, number> = { '07': 3, '08': 4 };

  const handleAnularComprobante = async () => {
    if (!comprobanteAnular || !motivoAnulacion.trim()) {
      toast.error('Debe ingresar un motivo de anulación'); return;
    }
    try {
      setAnulando(true);
      const correlativo = parseInt(comprobanteAnular.correlativo, 10);
      const response = await anularComprobante(
        comprobanteAnular.tipo_doc, comprobanteAnular.serie, correlativo,
        {
          empresa_id: empresaId || 1,
          tipo_de_comprobante: mapSunatToNubefact[comprobanteAnular.tipo_doc] || 3,
          serie: comprobanteAnular.serie, numero: correlativo,
          motivo: motivoAnulacion.trim(), fecha_de_baja: new Date().toISOString().split('T')[0],
        }
      );
      if (response.success === false) {
        toast.error('Error al anular', { description: response.message }); return;
      }
      toast.success('Anulado', { description: `${comprobanteAnular.numero_completo} anulado` });
      setIsAnularModalOpen(false);
      setComprobanteAnular(null);
      void fetchComprobantes();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error('Error', { description: err.response?.data?.message || err.message });
    } finally {
      setAnulando(false); }
  };

  const enviarMensajeWhatsApp = () => {
    if (!comprobanteWhatsApp) return;
    const tipo = comprobanteWhatsApp.tipo_doc === '07' ? 'Nota de Crédito' : 'Nota de Débito';
    const moneda = comprobanteWhatsApp.moneda === '1' ? 'S/' : 'USD';
    let msg = `Hola ${comprobanteWhatsApp.cliente_razon_social},%0A%0A`;
    msg += `Le enviamos su ${tipo}:%0A📄 *${comprobanteWhatsApp.numero_completo}*%0A`;
    msg += `💰 Total: *${moneda} ${comprobanteWhatsApp.mto_imp_venta.toFixed(2)}*%0A%0A`;
    if (comprobanteWhatsApp.nubefact_pdf_url) msg += `${comprobanteWhatsApp.nubefact_pdf_url}%0A%0A`;
    msg += `Gracias por su preferencia.`;
    window.open(`https://wa.me/${numeroWhatsApp.replace(/[\s\-()]/g, '')}?text=${msg}`, '_blank');
    setIsWhatsAppModalOpen(false);
    setComprobanteWhatsApp(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Cargando notas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />
      <div className="container mx-auto px-4 py-6 max-w-7xl">

        {/* Header */}
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Notas de Crédito y Débito
          </h1>
          <div className="flex items-center gap-2">
            <Button onClick={handleNuevaNotaCPE} size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-0">
              <Plus className="h-4 w-4 mr-2" />Nueva Nota CPE
            </Button>
            <Button onClick={() => void fetchComprobantes()} variant="secondary" size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-0">
              <RefreshCw className="h-4 w-4 mr-2" />Actualizar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Buscar por</Label>
              <Select value={tipoFiltro} onValueChange={v => setTipoFiltro(v as typeof tipoFiltro)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="numero">Número</SelectItem>
                  <SelectItem value="fecha">Fecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Valor de búsqueda</Label>
              <Input placeholder="Buscar..." value={valorFiltro}
                onChange={e => setValorFiltro(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Tipo</Label>
              <Select value={filtroTipoDoc} onValueChange={v => setFiltroTipoDoc(v as typeof filtroTipoDoc)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="07">Nota de Crédito</SelectItem>
                  <SelectItem value="08">Nota de Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Estado</Label>
              <Select value={filtroEstado} onValueChange={v => setFiltroEstado(v as typeof filtroEstado)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aceptado">Aceptado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-card border border-t-0 border-border rounded-b-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Número</th>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">RUC/DNI</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-center font-medium">Estado</th>
                  <th className="px-4 py-3 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {comprobantesPaginados.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No se encontraron notas
                  </td></tr>
                ) : (
                  comprobantesPaginados.map(comp => (
                    <tr key={comp.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {comp.tipo_doc === '07' ? 'N. Crédito' : 'N. Débito'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{comp.numero_completo}</td>
                      <td className="px-4 py-3">{comp.cliente_razon_social}</td>
                      <td className="px-4 py-3 font-mono text-xs">{comp.cliente_num_doc}</td>
                      <td className="px-4 py-3 text-xs">{comp.fecha_emision}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(comp.mto_imp_venta)}
                      </td>
                      <td className="px-4 py-3 text-center">{getEstadoBadge(comp)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => { setSelectedComprobante(comp); setIsDetailModalOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => comp.nubefact_pdf_url && window.open(comp.nubefact_pdf_url, '_blank')}>
                                <FileDown className="h-4 w-4 mr-2" />Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => comp.nubefact_xml_url && window.open(comp.nubefact_xml_url, '_blank')}>
                                <FileText className="h-4 w-4 mr-2" />Descargar XML
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.print()}>
                                <Printer className="h-4 w-4 mr-2" />Imprimir
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => toast.info('Verificando en SUNAT...')}>
                                <CheckCircle2 className="h-4 w-4 mr-2" />Verificar en SUNAT
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setComprobanteWhatsApp(comp); setNumeroWhatsApp(''); setIsWhatsAppModalOpen(true); }}>
                                <MessageCircle className="h-4 w-4 mr-2" />Enviar por WhatsApp
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {!comp.anulado && (
                                <DropdownMenuItem
                                  onClick={() => { setComprobanteAnular(comp); setMotivoAnulacion(''); setIsAnularModalOpen(true); }}
                                  className="text-red-600 dark:text-red-400">
                                  <Ban className="h-4 w-4 mr-2" />Anular
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Mostrar:</Label>
              <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {startIndex + 1}–{Math.min(startIndex + itemsPerPage, comprobantesFiltrados.length)} de {comprobantesFiltrados.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Página {currentPage} de {totalPages || 1}</span>
              <Button variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Modal Emitir Nota ──────────────────────────────────────────────── */}
        <Dialog open={isCreateModalOpen} onOpenChange={open => { if (!open) form.reset(); setIsCreateModalOpen(open); }}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Emitir Nota de Crédito / Débito</DialogTitle>
              <DialogDescription>
                La nota debe referenciar un comprobante original (Factura o Boleta).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleEmitirNota)} className="space-y-4">

              {/* Empresa */}
              {empresa && (
                <div className="bg-muted/50 p-4 rounded-lg border flex items-center gap-4">
                  {empresa.logo_path && (
                    <img src={`${apiBaseUrl}/v1/empresas/${empresa.id}/logo`} alt="Logo"
                      className="h-14 w-14 object-contain rounded border bg-white"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                  <div>
                    <p className="font-semibold text-sm">{empresa.razon_social}</p>
                    <p className="text-xs text-muted-foreground">RUC: {empresa.ruc}</p>
                    {empresa.direccion && <p className="text-xs text-muted-foreground">{empresa.direccion}</p>}
                  </div>
                </div>
              )}

              {/* Selector tipo nota */}
              <div className="flex gap-2">
                <Button type="button" className="flex-1"
                  variant={tipoNota === 'credito' ? 'default' : 'outline'}
                  onClick={() => cambiarTipoNota('credito')}>
                  <FileText className="h-4 w-4 mr-2" />Nota de Crédito
                </Button>
                <Button type="button" className="flex-1"
                  variant={tipoNota === 'debito' ? 'default' : 'outline'}
                  onClick={() => cambiarTipoNota('debito')}>
                  <FileEdit className="h-4 w-4 mr-2" />Nota de Débito
                </Button>
              </div>

              {/* Referencia al comprobante original */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg space-y-3">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Referencia al Comprobante Original
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo Doc. Original *</Label>
                    <Select value={form.watch('doc_original_tipo')}
                      onValueChange={v => form.setValue('doc_original_tipo', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">01 - Factura</SelectItem>
                        <SelectItem value="03">03 - Boleta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Serie Original *</Label>
                    <Input placeholder="F001 / B001" className="h-9 font-mono uppercase"
                      {...form.register('doc_original_serie')} />
                    {form.formState.errors.doc_original_serie && (
                      <p className="text-xs text-destructive">{form.formState.errors.doc_original_serie.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Número Original *</Label>
                    <Input placeholder="00000001" className="h-9 font-mono"
                      {...form.register('doc_original_numero')} />
                    {form.formState.errors.doc_original_numero && (
                      <p className="text-xs text-destructive">{form.formState.errors.doc_original_numero.message}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Motivo *</Label>
                    <Select value={form.watch('motivo')}
                      onValueChange={v => form.setValue('motivo', v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(tipoNota === 'credito' ? MOTIVOS_NC : MOTIVOS_ND).map(m => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.motivo && (
                      <p className="text-xs text-destructive">{form.formState.errors.motivo.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Datos de la nota */}
              <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                <h3 className="text-sm font-semibold">Datos de la Nota</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Serie *</Label>
                    <Input readOnly className="h-9 bg-muted font-mono" value={form.watch('serie') || ''} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Número *</Label>
                    <Input readOnly className="h-9 bg-muted font-mono"
                      value={String(form.watch('numero') || 0).padStart(8, '0')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha Emisión *</Label>
                    <Input type="date" className="h-9" {...form.register('fecha_de_emision')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">IGV %</Label>
                    <Select value={String(form.watch('porcentaje_de_igv') ?? 18)}
                      onValueChange={v => form.setValue('porcentaje_de_igv', Number(v))}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {IGV_PORCENTAJES_SELECT.map(opt => (
                          <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Moneda</Label>
                    <Select value={form.watch('moneda')} onValueChange={v => form.setValue('moneda', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MONEDAS_SELECT.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Forma de Pago</Label>
                    <Select value={form.watch('forma_pago') || 'Contado'}
                      onValueChange={v => form.setValue('forma_pago', v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FORMAS_PAGO_SELECT.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Cliente */}
              <ClienteCard form={formAny} clientes={clientes} loadingClientes={loadingClientes}
                openClienteCombobox={openClienteCombobox} setOpenClienteCombobox={setOpenClienteCombobox}
                busquedaCliente={busquedaCliente} setBusquedaCliente={setBusquedaCliente}
                seleccionarCliente={seleccionarCliente} total={totales.total} requiereDocumento={false} />

              {/* Items y resumen */}
              <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:gap-4">
                <ItemsSection form={formAny} fields={fields} productos={productos}
                  loadingProductos={loadingProductos} openProductoCombobox={openProductoCombobox}
                  setOpenProductoCombobox={setOpenProductoCombobox} busquedaProducto={busquedaProducto}
                  setBusquedaProducto={setBusquedaProducto} onAppendProducto={appendItemFromProducto}
                  onAgregarLinea={() => abrirModalItem()} onClickItem={i => abrirModalItem(i)}
                  onRemoveItem={i => remove(i)} calcularItemSolo={calcularItemSolo} />
                <div>
                  <ResumenTotalesCard form={formAny} totales={totales} requiereDocumento={false} />
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
                  {emitiendo
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Emitiendo...</>
                    : <><FileText className="h-4 w-4 mr-2" />
                        Emitir {tipoNota === 'credito' ? 'Nota de Crédito' : 'Nota de Débito'}
                      </>}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Detalle */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle del Comprobante</DialogTitle>
              <DialogDescription>Información del documento electrónico</DialogDescription>
            </DialogHeader>
            {selectedComprobante && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="font-medium">
                    {selectedComprobante.tipo_doc === '07' ? 'Nota de Crédito' : 'Nota de Débito'}
                  </p>
                </div>
                <div><Label className="text-xs text-muted-foreground">Número</Label>
                  <p className="font-mono font-medium">{selectedComprobante.numero_completo}</p>
                </div>
                <div><Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{selectedComprobante.cliente_razon_social}</p>
                </div>
                <div><Label className="text-xs text-muted-foreground">RUC/DNI</Label>
                  <p className="font-mono">{selectedComprobante.cliente_num_doc}</p>
                </div>
                <div><Label className="text-xs text-muted-foreground">Fecha</Label>
                  <p>{selectedComprobante.fecha_emision}</p>
                </div>
                <div><Label className="text-xs text-muted-foreground">Estado</Label>
                  <div className="mt-1">{getEstadoBadge(selectedComprobante)}</div>
                </div>
                <div><Label className="text-xs text-muted-foreground">Op. Gravadas</Label>
                  <p className="font-semibold">{formatCurrency(selectedComprobante.mto_oper_gravadas || 0)}</p>
                </div>
                <div><Label className="text-xs text-muted-foreground">IGV</Label>
                  <p className="font-semibold">{formatCurrency(selectedComprobante.mto_igv || 0)}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">Total</Label>
                  <p className="text-lg font-bold text-primary">{formatCurrency(selectedComprobante.mto_imp_venta)}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Anular */}
        <Dialog open={isAnularModalOpen} onOpenChange={open => { if (!anulando) setIsAnularModalOpen(open); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Ban className="h-5 w-5" />Anular Comprobante
              </DialogTitle>
              <DialogDescription>
                Esta acción enviará una comunicación de baja a SUNAT permanentemente.
              </DialogDescription>
            </DialogHeader>
            {comprobanteAnular && (
              <div className="space-y-4 py-2">
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-3 space-y-1">
                  <p className="text-sm font-medium">
                    {comprobanteAnular.tipo_doc === '07' ? 'N. Crédito' : 'N. Débito'}:{' '}
                    <span className="font-mono">{comprobanteAnular.numero_completo}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">Cliente: {comprobanteAnular.cliente_razon_social}</p>
                  <p className="text-xs text-muted-foreground">Total: {formatCurrency(comprobanteAnular.mto_imp_venta)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Motivo <span className="text-red-500">*</span></Label>
                  <Textarea value={motivoAnulacion} onChange={e => setMotivoAnulacion(e.target.value)}
                    placeholder="Ej: ERROR EN EL DOCUMENTO..." className="resize-none"
                    rows={3} maxLength={100} disabled={anulando} />
                  <p className="text-xs text-muted-foreground text-right">{motivoAnulacion.length}/100</p>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsAnularModalOpen(false)} disabled={anulando}>Cancelar</Button>
              <Button variant="destructive" onClick={handleAnularComprobante}
                disabled={anulando || !motivoAnulacion.trim()}>
                {anulando
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Anulando...</>
                  : <><Ban className="h-4 w-4 mr-2" />Confirmar Anulación</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ItemModal */}
        <ItemModal form={formAny} open={modalItemAbierto} index={itemEditandoIndex}
          onClose={cerrarModalItem} calcularItem={calcularItem} calcularItemSolo={calcularItemSolo}
          onRemove={i => { remove(i); cerrarModalItem(false); }}
          empresaId={empresaId || 1} />

        {/* Modal WhatsApp */}
        <Dialog open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <MessageCircle className="h-5 w-5" />Enviar por WhatsApp
              </DialogTitle>
              <DialogDescription>Envía el comprobante al celular del cliente.</DialogDescription>
            </DialogHeader>
            {comprobanteWhatsApp && (
              <div className="space-y-4 py-2">
                <div className="rounded-lg border bg-muted p-3">
                  <p className="text-sm font-medium">
                    {comprobanteWhatsApp.tipo_doc === '07' ? 'N. Crédito' : 'N. Débito'}: {comprobanteWhatsApp.numero_completo}
                  </p>
                  <p className="text-xs text-muted-foreground">Cliente: {comprobanteWhatsApp.cliente_razon_social}</p>
                </div>
                <div className="space-y-2">
                  <Label>Número de WhatsApp *</Label>
                  <Input value={numeroWhatsApp} onChange={e => setNumeroWhatsApp(e.target.value)}
                    placeholder="+51 999 999 999" type="tel" />
                  <p className="text-xs text-muted-foreground">Incluye el código de país (ej: +51)</p>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsWhatsAppModalOpen(false)}>Cancelar</Button>
              <Button className="bg-green-500 hover:bg-green-600 text-white"
                onClick={enviarMensajeWhatsApp} disabled={!numeroWhatsApp.trim()}>
                <MessageCircle className="h-4 w-4 mr-2" />Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
