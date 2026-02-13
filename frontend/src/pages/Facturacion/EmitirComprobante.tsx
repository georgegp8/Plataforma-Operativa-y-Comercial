import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
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
  type EmitirComprobanteRequest,
} from '@/services/nubefact';
import { api, type Serie, type Entidad, type Producto } from '@/lib/api';
import { Receipt, FileText, CreditCard, FileX, Loader2 } from 'lucide-react';
import { ClienteCard } from '@/components/ClienteCard';
import { ResumenTotalesCard } from '@/components/ResumenTotalesCard';
import { ItemsSection } from '@/components/ItemsSection';
import { ItemModal } from '@/components/ItemModal';

// --- Tipos y Configuración ---

type TipoComprobante = 'factura' | 'boleta' | 'nota_credito' | 'nota_debito';

interface TipoConfig {
  codigo: string;
  titulo: string;
  descripcion: string;
  icono: typeof Receipt;
  seriePrefix: string;
  requiereDocumento: boolean;
}

// Tipos importados de API: Entidad y Producto

const TIPOS_CONFIG: Record<TipoComprobante, TipoConfig> = {
  factura: {
    codigo: String(TIPOS_COMPROBANTE.FACTURA),
    titulo: 'Factura Electrónica',
    descripcion: 'Emitir factura para ventas con RUC',
    icono: FileText,
    seriePrefix: 'F',
    requiereDocumento: true,
  },
  boleta: {
    codigo: String(TIPOS_COMPROBANTE.BOLETA),
    titulo: 'Boleta de Venta',
    descripcion: 'Emitir boleta para ventas al consumidor final',
    icono: Receipt,
    seriePrefix: 'B',
    requiereDocumento: false,
  },
  nota_credito: {
    codigo: String(TIPOS_COMPROBANTE.NOTA_CREDITO),
    titulo: 'Nota de Crédito',
    descripcion: 'Anular o modificar comprobantes emitidos',
    icono: CreditCard,
    seriePrefix: 'FC',
    requiereDocumento: true,
  },
  nota_debito: {
    codigo: String(TIPOS_COMPROBANTE.NOTA_DEBITO),
    titulo: 'Nota de Débito',
    descripcion: 'Aumentar el valor de un comprobante',
    icono: FileX,
    seriePrefix: 'FD',
    requiereDocumento: true,
  },
};

// --- Schemas de Validación ---

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
    orden_compra_servicio: z.string().optional(),
    placa_vehiculo: z.string().optional(),
    tiene_detraccion: z.boolean().optional(),
    detraccion_tipo: z.string().length(3).optional().nullable(),
    detraccion_porcentaje: z.number().min(0).max(100).optional().nullable(),
    detraccion_monto: z.number().min(0).optional().nullable(),
    medio_pago_detraccion: z.string().length(3).optional().nullable(),
    // --- NUEVOS CAMPOS AVANZADOS ---
    percepcion_tipo: z.string().optional().nullable(),
    percepcion_base_imponible: z.number().optional().nullable(),
    total_percepcion: z.number().optional().nullable(),
    total_incluido_percepcion: z.number().optional().nullable(),
    retencion_tipo: z.string().optional().nullable(),
    retencion_base_imponible: z.number().optional().nullable(),
    total_retencion: z.number().optional().nullable(),
    venta_al_credito: z.boolean().optional(),
    cuotas_credito: z.array(z.object({
      cuota: z.number().min(1),
      fecha_de_pago: z.string().min(1),
      importe: z.number().min(0.01)
    })).optional(),
    // ---
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

// --- Componente Principal ---

export default function EmitirComprobante() {
  const [tipoActivo, setTipoActivo] = useState<TipoComprobante>('factura');
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [series, setSeries] = useState<Serie[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  
  // Estados para búsquedas
  const [clientes, setClientes] = useState<Entidad[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [openClienteCombobox, setOpenClienteCombobox] = useState(false);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [openProductoCombobox, setOpenProductoCombobox] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  
  // Estados para modal de item
  const [modalItemAbierto, setModalItemAbierto] = useState(false);
  const [itemEditandoIndex, setItemEditandoIndex] = useState<number | null>(null);

  const tipoConfig = TIPOS_CONFIG[tipoActivo];
  const IconoTipo = tipoConfig.icono;

  const form = useForm<ComprobanteFormValues>({
    resolver: zodResolver(comprobanteSchema),
    defaultValues: {
      empresa_id: 1,
      tipo_comprobante: tipoConfig.codigo,
      serie: `${tipoConfig.seriePrefix}001`,
      numero: 1,
      cliente_tipo_de_documento: tipoConfig.requiereDocumento ? TIPOS_DOCUMENTO.RUC : TIPOS_DOCUMENTO.DNI,
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
      items: [
        {
          unidad_de_medida: UNIDADES_MEDIDA.NIU,
          codigo: 'PROD001',
          descripcion: '',
          cantidad: 1,
          valor_unitario: 0,
          precio_unitario: 0,
          descuento: 0,
          tipo_de_igv: TIPOS_IGV.GRAVADO_OPERACION_ONEROSA,
        },
      ],
    },
  });
  // Cast interno para poder reutilizar el mismo formulario en componentes desacoplados
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formAny = form as any;

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Cambiar tipo de comprobante
  const cambiarTipo = (nuevoTipo: TipoComprobante) => {
    setTipoActivo(nuevoTipo);
    const config = TIPOS_CONFIG[nuevoTipo];
    form.setValue('tipo_comprobante', config.codigo);
    form.setValue('serie', `${config.seriePrefix}001`);
    if (config.requiereDocumento) {
      form.setValue('cliente_tipo_de_documento', TIPOS_DOCUMENTO.RUC);
    } else {
      form.setValue('cliente_tipo_de_documento', TIPOS_DOCUMENTO.DNI);
    }
    setPdfUrl(null);
    cargarSeries(config.codigo);
  };

  // Cargar series
  const cargarSeries = async (tipoCodigoParam?: string) => {
    try {
      setLoadingSeries(true);
      const empresaId = form.getValues('empresa_id') || 1;
      const tipoCodigo = tipoCodigoParam || form.getValues('tipo_comprobante');
      const res = await api.series.listar({ empresa_id: empresaId, tipo_comprobante: tipoCodigo });
      const lista = res.data.data;
      setSeries(lista);

      if (lista.length > 0) {
        const serieDefecto = lista.find((s) => s.por_defecto) ?? lista[0];
        form.setValue('serie', serieDefecto.serie);
        form.setValue('numero', (serieDefecto.correlativo_actual ?? 0) + 1);
      }
    } catch {
      // Mantener modo manual
    } finally {
      setLoadingSeries(false);
    }
  };

  useEffect(() => {
    void cargarSeries();
    void cargarClientes();
    void cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Buscar clientes (simulado - integrar con API real)
  const cargarClientes = async () => {
    try {
      setLoadingClientes(true);
      const response = await api.entidades.listar({
        empresa_id: form.getValues('empresa_id'),
        activo: true,
      });
      setClientes(response.data);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      toast.error('Error al cargar clientes');
    } finally {
      setLoadingClientes(false);
    }
  };

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

  const cargarProductos = async () => {
    try {
      setLoadingProductos(true);
      const response = await api.productos.listar({
        empresa_id: form.getValues('empresa_id'),
        activo: true,
      });
      setProductos(response.data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoadingProductos(false);
    }
  };

  const abrirModalItem = (index?: number) => {
    if (index !== undefined) {
      setItemEditandoIndex(index);
    } else {
      setItemEditandoIndex(null);
      // Agregar nuevo item vacío temporalmente
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
      // Si es un item nuevo y no se guardó, eliminarlo
      remove(itemEditandoIndex);
    }
    setModalItemAbierto(false);
    setItemEditandoIndex(null);
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

  // Calcular item sin side effects (para lecturas en render y calculos)
  const calcularItemSolo = (index: number) => {
    const item = form.getValues(`items.${index}`);
    // Validación por si el item fue borrado mientras se calculaba
    if (!item) return { subtotal: 0, igv: 0, total: 0, precio_unitario: 0 };

    const { cantidad, valor_unitario, descuento = 0 } = item;

    const subtotal = cantidad * valor_unitario - descuento;
    const igvRate = (form.getValues('porcentaje_de_igv') || 18) / 100;
    const igv = subtotal * igvRate;
    const total = subtotal + igv;
    const precio_unitario = cantidad > 0 ? (subtotal + igv) / cantidad : 0;

    return { subtotal, igv, total, precio_unitario };
  };

  // Calcular y actualizar item (para onChange - SIDE EFFECTS PERMITIDOS)
  const calcularItem = (index: number) => {
    const calc = calcularItemSolo(index);
    form.setValue(`items.${index}.precio_unitario`, parseFloat(calc.precio_unitario.toFixed(2)));
    return calc;
  };

  const calcularTotales = () => {
    const items = form.getValues('items');
    let total_gravada = 0;
    let total_igv = 0;
    let total = 0;

    items.forEach((_, index) => {
      const calc = calcularItemSolo(index); // Usamos la versión segura
      total_gravada += calc.subtotal;
      total_igv += calc.igv;
      total += calc.total;
    });

    return {
      total_gravada: parseFloat(total_gravada.toFixed(2)),
      total_igv: parseFloat(total_igv.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    };
  };

  const onSubmit = async (data: ComprobanteFormValues) => {
    try {
      setLoading(true);
      const totales = calcularTotales();

      const items = data.items.map((item, index) => {
        const calc = calcularItemSolo(index); // Usamos la versión segura
        return {
          ...item,
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
        porcentaje_de_igv: Number(data.porcentaje_de_igv),
        total_gravada: totales.total_gravada,
        total_igv: totales.total_igv,
        total: totales.total,
        enviar_automaticamente_a_la_sunat: true,
        enviar_automaticamente_al_cliente: !!data.cliente_email,
        // Detracción completa
        tiene_detraccion: data.tiene_detraccion ?? false,
        detraccion_tipo: data.detraccion_tipo ?? undefined,
        detraccion_porcentaje: data.detraccion_porcentaje ?? undefined,
        detraccion_monto: data.detraccion_monto ?? undefined,
        medio_pago_detraccion: data.medio_pago_detraccion ?? undefined,
        // Percepción
        percepcion_tipo: data.percepcion_tipo ?? undefined,
        percepcion_base_imponible: data.percepcion_base_imponible ?? undefined,
        // Retención
        retencion_tipo: data.retencion_tipo ?? undefined,
        retencion_base_imponible: data.retencion_base_imponible ?? undefined,
        // Venta al crédito
        items,
      };

      const response = await emitirComprobante(payload);

      if (response.errors) {
        toast.error(`Error al emitir ${tipoConfig.titulo.toLowerCase()}`, {
          description: response.sunat_description || 'Error desconocido',
        });
        return;
      }

      if (response.aceptada_por_sunat) {
        toast.success(`¡${tipoConfig.titulo} emitida exitosamente!`, {
          description: `Código de respuesta SUNAT: ${response.sunat_responsecode}`,
        });

        if (response.pdf_url) {
          setPdfUrl(response.pdf_url);
        }

        form.reset();
      } else {
        toast.warning(`${tipoConfig.titulo} enviada pero no aceptada`, {
          description: response.sunat_description || response.sunat_soap_error,
        });
      }
    } catch (error) {
      console.error('Error:', error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(`Error al procesar ${tipoConfig.titulo.toLowerCase()}`, {
        description: err.response?.data?.message || err.message || 'Error desconocido',
      });
    } finally {
      setLoading(false);
    }
  };

  // Observar cambios en items y porcentaje IGV para recalcular totales generales
  const items = form.watch('items');
  const porcentajeIgv = form.watch('porcentaje_de_igv');
  
  const totales = useMemo(() => {
    return calcularTotales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, porcentajeIgv]);

  return (
    <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <IconoTipo className="w-7 h-7 sm:w-8 sm:h-8" />
            Emitir Comprobante
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">{tipoConfig.descripcion}</p>
        </div>
      </div>

      {/* Selector de Tipo de Comprobante */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={tipoActivo} onValueChange={(val) => cambiarTipo(val as TipoComprobante)}>
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              {(Object.keys(TIPOS_CONFIG) as TipoComprobante[]).map((tipo) => {
                const config = TIPOS_CONFIG[tipo];
                const Icono = config.icono;
                return (
                  <TabsTrigger key={tipo} value={tipo} className="flex items-center gap-2">
                    <Icono className="w-4 h-4" />
                    <span className="hidden sm:inline">{config.titulo}</span>
                    <span className="sm:hidden">{config.seriePrefix}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* Opciones avanzadas Nubefact */}
        <Card className="border border-dashed border-primary/40 bg-background/80 dark:bg-background/90">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-primary">Opciones Avanzadas</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Percepciones, retenciones y venta al crédito</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Percepción */}
            <div className="space-y-2">
              <label className="font-semibold text-primary">Percepción</label>
              <Select value={form.watch('percepcion_tipo') ?? ''} onValueChange={v => form.setValue('percepcion_tipo', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de percepción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin percepción</SelectItem>
                  <SelectItem value="1">Venta interna (2%)</SelectItem>
                  <SelectItem value="2">Adquisición de combustible (1%)</SelectItem>
                  <SelectItem value="3">Tasa especial (0.5%)</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" step="0.01" placeholder="Base imponible" {...form.register('percepcion_base_imponible', { valueAsNumber: true })} />
              <Input type="number" step="0.01" placeholder="Total percepción" {...form.register('total_percepcion', { valueAsNumber: true })} />
              <Input type="number" step="0.01" placeholder="Total incluido percepción" {...form.register('total_incluido_percepcion', { valueAsNumber: true })} />
            </div>
            {/* Retención */}
            <div className="space-y-2">
              <label className="font-semibold text-primary">Retención</label>
              <Select value={form.watch('retencion_tipo') ?? ''} onValueChange={v => form.setValue('retencion_tipo', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de retención" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin retención</SelectItem>
                  <SelectItem value="1">Tasa 3%</SelectItem>
                  <SelectItem value="2">Tasa 6%</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" step="0.01" placeholder="Base imponible" {...form.register('retencion_base_imponible', { valueAsNumber: true })} />
              <Input type="number" step="0.01" placeholder="Total retención" {...form.register('total_retencion', { valueAsNumber: true })} />
            </div>
            {/* Venta al crédito */}
            <div className="space-y-2">
              <label className="font-semibold text-primary flex items-center gap-2">Venta al crédito
                <Switch checked={!!form.watch('venta_al_credito')} onCheckedChange={v => form.setValue('venta_al_credito', v)} />
              </label>
              {form.watch('venta_al_credito') && (
                <div className="space-y-2">
                  {/* Cuotas dinámicas */}
                  <Input type="number" step="1" min="1" placeholder="N° de cuotas"
                    onChange={e => {
                      const n = Number(e.target.value);
                      if (n > 0) {
                        form.setValue('cuotas_credito', Array.from({ length: n }, (_, i) => ({ cuota: i + 1, fecha_de_pago: '', importe: 0 })));
                      } else {
                        form.setValue('cuotas_credito', []);
                      }
                    }}
                  />
                  {(Array.isArray(form.watch('cuotas_credito') ?? []) ? (form.watch('cuotas_credito') ?? []) : []).map((cuota, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Input type="number" step="1" min="1" className="w-16"
                        value={cuota.cuota}
                        onChange={e => {
                          const val = Number(e.target.value);
                          const arr = [...(form.watch('cuotas_credito') ?? [])];
                          arr[idx].cuota = val;
                          form.setValue('cuotas_credito', arr);
                        }}
                        placeholder="Cuota"
                      />
                      <Input type="date" className="w-36"
                        value={cuota.fecha_de_pago}
                        onChange={e => {
                          const arr = [...(form.watch('cuotas_credito') ?? [])];
                          arr[idx].fecha_de_pago = e.target.value;
                          form.setValue('cuotas_credito', arr);
                        }}
                        placeholder="Fecha de pago"
                      />
                      <Input type="number" step="0.01" min="0" className="w-28"
                        value={cuota.importe}
                        onChange={e => {
                          const arr = [...(form.watch('cuotas_credito') ?? [])];
                          arr[idx].importe = Number(e.target.value);
                          form.setValue('cuotas_credito', arr);
                        }}
                        placeholder="Importe"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        {/* Barra de Herramientas */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm">
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="text-primary font-medium flex items-center gap-1 hover:underline">
                <span>⚙</span>
                <span>General</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Datos generales</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-medium">Tipo documento</label>
                  <Input value={tipoConfig.titulo.toUpperCase()} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha emisión</label>
                  <Input type="date" {...form.register('fecha_de_emision')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de venc.</label>
                  <Input type="date" {...form.register('fecha_de_vencimiento')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Serie</label>
                  <Input {...form.register('serie')} maxLength={4} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número</label>
                  <Input type="number" {...form.register('numero', { valueAsNumber: true })} />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2 mt-2">
                  <span className="text-sm font-medium">¿Pagado?</span>
                  <Switch
                    checked={!!form.watch('pagado')}
                    onCheckedChange={(checked) => form.setValue('pagado', checked)}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="text-primary font-medium flex items-center gap-1 hover:underline">
                <span>➕</span>
                <span>Adicionales</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Adicionales</DialogTitle>
                <DialogDescription>Información adicional para el comprobante.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Órden de Compra/Servicio</label>
                  <Input {...form.register('orden_compra_servicio')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Placa de vehículo</label>
                  <Input {...form.register('placa_vehiculo')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observaciones</label>
                  <Input {...form.register('observaciones')} />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <button type="button" className="text-primary flex items-center gap-1 opacity-70 cursor-default text-xs sm:text-sm">
            <span>📄</span>
            <span className="hidden sm:inline">Guía de remisión Física</span>
            <span className="sm:hidden">Guía</span>
          </button>
          <button type="button" className="text-primary flex items-center gap-1 opacity-70 cursor-default text-xs sm:text-sm">
            <span>🧾</span>
            <span>PDF</span>
          </button>
        </div>

        {/* Datos del Comprobante */}
        <Card>
          <CardHeader>
            <CardTitle>Datos del Comprobante</CardTitle>
            <CardDescription>Información básica del comprobante</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  IGV %
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button type="button" variant="link" className="h-auto p-0 text-xs text-primary">
                        Más info
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Porcentaje de IGV</DialogTitle>
                        <DialogDescription>
                          Seleccione el porcentaje de IGV aplicable a la operación según la normativa vigente.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">18%:</span> IGV general para operaciones gravadas.</p>
                        <p><span className="font-semibold">10%:</span> Ley 31556 para restaurantes, hoteles y servicios afines.</p>
                        <p><span className="font-semibold">4%:</span> IVAP para productos afectos al impuesto a la venta de arroz pilado.</p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </label>
                <Select
                  value={String(form.watch('porcentaje_de_igv') ?? 18)}
                  onValueChange={(value) => form.setValue('porcentaje_de_igv', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IGV_PORCENTAJES_SELECT.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de operación</label>
                <Select
                  value={String(form.watch('sunat_transaction') ?? 1)}
                  onValueChange={(value) => form.setValue('sunat_transaction', Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_OPERACION_SELECT.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Moneda</label>
                <Select
                  value={form.watch('moneda')}
                  onValueChange={(value) => form.setValue('moneda', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONEDAS_SELECT.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de cambio</label>
                <Input
                  type="number"
                  step="0.0001"
                  placeholder="3.5000"
                  {...form.register('tipo_de_cambio', {
                    setValueAs: (value) => (value === '' || value === null ? undefined : Number(value)),
                  })}
                  disabled={form.watch('moneda') === MONEDAS.PEN}
                />
                <p className="text-xs text-muted-foreground">Obligatorio cuando la moneda es distinta a Soles.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Serie</label>
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
                    disabled={loadingSeries}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSeries ? 'Cargando series...' : 'Seleccione serie'} />
                    </SelectTrigger>
                    <SelectContent>
                      {series.map((s) => (
                        <SelectItem key={s.id} value={s.serie}>
                          {s.serie}{s.por_defecto ? ' (por defecto)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input {...form.register('serie')} placeholder={`${tipoConfig.seriePrefix}001`} maxLength={4} />
                )}
                {form.formState.errors.serie && (
                  <p className="text-sm text-destructive">{form.formState.errors.serie.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Número</label>
                <Input type="number" {...form.register('numero', { valueAsNumber: true })} placeholder="1" />
                {form.formState.errors.numero && (
                  <p className="text-sm text-destructive">{form.formState.errors.numero.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha de Emisión</label>
                <Input type="date" {...form.register('fecha_de_emision')} />
                {form.formState.errors.fecha_de_emision && (
                  <p className="text-sm text-destructive">{form.formState.errors.fecha_de_emision.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos del Cliente */}
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
          requiereDocumento={tipoConfig.requiereDocumento}
        />

        {/* Items y Resumen */}
        <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:gap-6">
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
              requiereDocumento={tipoConfig.requiereDocumento}
            />
          </div>
        </div>

        {/* Observaciones */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Observaciones</label>
              <Input {...form.register('observaciones')} placeholder="Notas adicionales (opcional)" />
            </div>
          </CardContent>
        </Card>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
          <Button type="button" variant="outline" onClick={() => form.reset()} className="w-full sm:w-auto">
            Limpiar
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Emitiendo...
              </>
            ) : (
              <>
                <IconoTipo className="w-4 h-4 mr-2" />
                Emitir {tipoConfig.titulo}
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Vista Previa PDF */}
      {pdfUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Comprobante Generado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="w-full sm:w-auto">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  Ver PDF
                </a>
              </Button>
              <Button variant="outline" onClick={() => setPdfUrl(null)} className="w-full sm:w-auto">
                Cerrar vista
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalle de Item */}
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
  );
}