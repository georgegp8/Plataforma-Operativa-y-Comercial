import { useEffect, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  emitirComprobante, 
  TIPOS_COMPROBANTE, 
  TIPOS_DOCUMENTO, 
  MONEDAS, 
  MONEDAS_SELECT, 
  TIPOS_OPERACION_SELECT, 
  IGV_PORCENTAJES_SELECT, 
  UNIDADES_MEDIDA, 
  TIPOS_IGV, 
  type EmitirComprobanteRequest 
} from '@/services/nubefact';
import { api, type Serie, obtenerCorrelativoSeguro } from '@/lib/api';
import { Plus, Trash2, FileText, Loader2 } from 'lucide-react';

// --- Esquemas de Validación ---

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

const facturaSchema = z.object({
  empresa_id: z.number().min(1, 'Seleccione una empresa'),
  serie: z.string().min(4, 'Serie debe tener 4 caracteres').max(4),
  numero: z.number().min(1, 'Número debe ser mayor a 0'),
  cliente_tipo_de_documento: z.string().min(1, 'Requerido'),
  cliente_numero_de_documento: z.string().min(8, 'Documento inválido'),
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
  orden_compra_servicio: z.string().optional(),
  placa_vehiculo: z.string().optional(),
  observaciones: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Debe agregar al menos un item'),
});

type FacturaFormValues = z.infer<typeof facturaSchema>;

// --- Componente Principal ---

export default function EmitirFactura() {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [series, setSeries] = useState<Serie[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);

  const form = useForm<FacturaFormValues>({
    resolver: zodResolver(facturaSchema),
    defaultValues: {
      empresa_id: 1,
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Watchers
  const serie = useWatch({ control: form.control, name: 'serie' });
  const empresaId = useWatch({ control: form.control, name: 'empresa_id' });

  // 1. Cargar Series al inicio
  useEffect(() => {
    const cargarSeries = async () => {
      try {
        setLoadingSeries(true);
        const empId = form.getValues('empresa_id') || 1;
        // Aseguramos conversión a string para la API
        const res = await api.series.listar({ empresa_id: empId, tipo_comprobante: String(TIPOS_COMPROBANTE.FACTURA) });
        const lista = res.data.data;
        setSeries(lista);

        if (lista.length > 0) {
          const serieDefecto = lista.find((s) => s.por_defecto) ?? lista[0];
          // Solo actualizamos la serie, el efecto 2 se encarga del número
          form.setValue('serie', serieDefecto.serie);
        }
      } catch (e) {
        console.error("Error cargando series", e);
      } finally {
        setLoadingSeries(false);
      }
    };
    void cargarSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Obtener correlativo al cambiar serie o empresa
  useEffect(() => {
    let isActive = true;
    const fetchCorrelativo = async () => {
      if (!serie || !empresaId) return;
      
      try {
        const res = await obtenerCorrelativoSeguro(empresaId, String(TIPOS_COMPROBANTE.FACTURA), serie);
        
        if (isActive && res && res.correlativo) {
          const numeroParsed = parseInt(String(res.correlativo), 10);
          
          // SOLUCIÓN CLAVE: Solo actualizamos si el valor es diferente.
          // Esto permite al usuario editar manualmente sin que el efecto lo sobreescriba
          // en cada renderizado o si la API responde lento.
          const valorActual = form.getValues('numero');
          if (valorActual !== numeroParsed) {
             form.setValue('numero', numeroParsed, { shouldValidate: true, shouldDirty: true });
          }
        }
      } catch (error) {
        console.error("Error obteniendo correlativo:", error);
      }
    };

    fetchCorrelativo();
    
    return () => { isActive = false; };
  }, [serie, empresaId, form]);

  // Cálculos de items (reutilizando la lógica de Comprobantes para consistencia)
  const calcularItem = (index: number) => {
    const item = form.getValues(`items.${index}`);
    const { cantidad, valor_unitario, descuento = 0 } = item;
    
    const subtotal = cantidad * valor_unitario - descuento;
    const igvRate = (form.getValues('porcentaje_de_igv') || 18) / 100;
    const igv = subtotal * igvRate;
    const total = subtotal + igv;
    const precio_unitario = cantidad > 0 ? (subtotal + igv) / cantidad : 0;

    form.setValue(`items.${index}.precio_unitario`, parseFloat(precio_unitario.toFixed(2)));
    return { subtotal, igv, total };
  };

  const calcularTotales = () => {
    const items = form.getValues('items');
    let total_gravada = 0, total_igv = 0, total = 0;

    items.forEach((_, index) => {
      const calc = calcularItem(index);
      // Simplificación para Factura (generalmente gravada)
      // Si necesitas lógica exacta de exonerado/inafecto, usa los helpers como en EmitirComprobante
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

  const onSubmit = async (data: FacturaFormValues) => {
    try {
      setLoading(true);
      
      // Validación final del correlativo (Evitar duplicados)
      try {
        const res = await obtenerCorrelativoSeguro(data.empresa_id, String(TIPOS_COMPROBANTE.FACTURA), data.serie);
        const serverNum = parseInt(String(res.correlativo), 10);
        
        // Si el usuario puso un número menor al que toca, avisamos y corregimos
        if (data.numero < serverNum) {
           data.numero = serverNum;
           form.setValue('numero', serverNum);
           toast.warning(`El número fue actualizado a ${serverNum} para evitar duplicados.`);
        }
      } catch (e) { 
        console.error("Validación final de correlativo falló", e); 
      }

      const totales = calcularTotales();
      const items = data.items.map((item, index) => {
        const calc = calcularItem(index);
        return { ...item, subtotal: calc.subtotal, igv: calc.igv, total: calc.total };
      });

      const payload: EmitirComprobanteRequest = {
        ...data,
        operacion: 'generar_comprobante',
        tipo_de_comprobante: TIPOS_COMPROBANTE.FACTURA,
        sunat_transaction: data.sunat_transaction,
        porcentaje_de_igv: data.porcentaje_de_igv,
        total_gravada: totales.total_gravada,
        total_igv: totales.total_igv,
        total: totales.total,
        tiene_detraccion: data.tiene_detraccion ?? false,
        detraccion_tipo: data.detraccion_tipo ?? undefined,
        detraccion_porcentaje: data.detraccion_porcentaje ?? undefined,
        detraccion_monto: data.detraccion_monto ?? undefined,
        medio_pago_detraccion: data.medio_pago_detraccion ?? undefined,
        enviar_automaticamente_a_la_sunat: true,
        enviar_automaticamente_al_cliente: !!data.cliente_email,
        items,
      };

      const response = await emitirComprobante(payload);

      if (!response.success) {
        toast.error(response.message || 'Error al emitir factura');
        return;
      }

      const sunatData = response.data;
      if (sunatData?.aceptada_por_sunat) {
        toast.success(`Factura emitida! Cod: ${sunatData.sunat_code || ''}`);
        if (sunatData.pdf_url) setPdfUrl(sunatData.pdf_url);
        // Avanzar al siguiente número localmente para UX inmediata
        form.setValue('numero', data.numero + 1);
      } else {
        toast.warning(sunatData?.sunat_description || 'Enviada, pendiente validación');
      }
    } catch (error: unknown) {
      console.error(error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(err.response?.data?.message || err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const totales = calcularTotales();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Emitir Factura</h1>
          <p className="text-muted-foreground">Complete los datos para generar una factura electrónica</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="text-primary font-medium flex items-center gap-1 hover:underline">
                <span>⚙</span><span>General</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Datos generales</DialogTitle>
                <DialogDescription>Configuración general del comprobante</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                 <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium">Tipo documento</label>
                    <Input value="FACTURA ELECTRÓNICA" disabled className="bg-muted" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha emisión</label>
                    <Input type="date" {...form.register('fecha_de_emision')} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium">Fecha venc.</label>
                    <Input type="date" {...form.register('fecha_de_vencimiento')} />
                 </div>
                 <div className="flex items-center gap-2 col-span-2 mt-2">
                    <span className="text-sm font-medium">¿Pagado?</span>
                    <Switch checked={!!form.watch('pagado')} onCheckedChange={(c) => form.setValue('pagado', c)} />
                 </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="text-primary font-medium flex items-center gap-1 hover:underline">
                <span>➕</span><span>Adicionales</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Adicionales</DialogTitle>
                <DialogDescription>Datos opcionales de la operación</DialogDescription>
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
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Datos Principales */}
        <Card>
          <CardHeader>
            <CardTitle>Datos del Comprobante</CardTitle>
            <CardDescription>Detalles de la emisión</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">IGV %</label>
                <Select value={String(form.watch('porcentaje_de_igv') ?? 18)} onValueChange={(v) => form.setValue('porcentaje_de_igv', Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {IGV_PORCENTAJES_SELECT.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Operación</label>
                <Select value={String(form.watch('sunat_transaction') ?? 1)} onValueChange={(v) => form.setValue('sunat_transaction', Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_OPERACION_SELECT.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Moneda</label>
                <Select value={form.watch('moneda')} onValueChange={(v) => form.setValue('moneda', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONEDAS_SELECT.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo Cambio</label>
                <Input type="number" step="0.0001" placeholder="3.5000" {...form.register('tipo_de_cambio', { valueAsNumber: true })} disabled={form.watch('moneda') === MONEDAS.PEN} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Serie</label>
                {series.length > 0 ? (
                  <Select value={form.watch('serie')} onValueChange={(v) => form.setValue('serie', v)} disabled={loadingSeries}>
                    <SelectTrigger><SelectValue placeholder="Serie" /></SelectTrigger>
                    <SelectContent>
                      {series.map((s) => <SelectItem key={s.id} value={s.serie}>{s.serie}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input {...form.register('serie')} placeholder="F001" maxLength={4} />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Número</label>
                <Input 
                  type="number" 
                  {...form.register('numero', { valueAsNumber: true })} 
                  placeholder="Correlativo" 
                  // Asegurar que el input no tenga props extrañas que bloqueen la edición
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Emisión</label>
                <Input type="date" {...form.register('fecha_de_emision')} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Datos del Cliente</CardTitle>
            <CardDescription>Receptor del comprobante</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo Doc</label>
                <Select value={form.watch('cliente_tipo_de_documento')} onValueChange={(v) => form.setValue('cliente_tipo_de_documento', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TIPOS_DOCUMENTO.RUC}>RUC</SelectItem>
                    <SelectItem value={TIPOS_DOCUMENTO.DNI}>DNI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Número Doc</label>
                <Input {...form.register('cliente_numero_de_documento')} placeholder="20100000001" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Razón Social</label>
              <Input {...form.register('cliente_denominacion')} placeholder="Nombre Cliente" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección</label>
              <Input {...form.register('cliente_direccion')} placeholder="Dirección" />
            </div>
            <div className="space-y-2">
               <label className="text-sm font-medium">Email</label>
               <Input {...form.register('cliente_email')} placeholder="email@cliente.com" />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <div>
                <CardTitle>Items</CardTitle>
                <CardDescription>Listado de productos</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ unidad_de_medida: UNIDADES_MEDIDA.NIU, codigo: 'NEW', descripcion: '', cantidad: 1, valor_unitario: 0, precio_unitario: 0, descuento: 0, tipo_de_igv: TIPOS_IGV.GRAVADO_OPERACION_ONEROSA })}>
                <Plus className="w-4 h-4 mr-2" /> Agregar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 lg:grid lg:grid-cols-[2fr_1fr] lg:gap-6">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between">
                        <h4>Item {index + 1}</h4>
                        <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2"><label className="text-sm">Código</label><Input {...form.register(`items.${index}.codigo`)} /></div>
                        <div className="col-span-3 space-y-2"><label className="text-sm">Descripción</label><Input {...form.register(`items.${index}.descripcion`)} /></div>
                    </div>
                    <div className="grid grid-cols-5 gap-4">
                        <div className="space-y-2">
                           <label className="text-sm">Unidad</label>
                           <Select value={form.watch(`items.${index}.unidad_de_medida`)} onValueChange={(v) => form.setValue(`items.${index}.unidad_de_medida`, v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                 <SelectItem value={UNIDADES_MEDIDA.NIU}>Unidad</SelectItem>
                                 <SelectItem value={UNIDADES_MEDIDA.ZZ}>Servicio</SelectItem>
                              </SelectContent>
                           </Select>
                        </div>
                        <div className="space-y-2"><label className="text-sm">Cant.</label><Input type="number" step="0.01" {...form.register(`items.${index}.cantidad`, { valueAsNumber: true, onChange: () => calcularItem(index) })} /></div>
                        <div className="space-y-2"><label className="text-sm">V. Unit</label><Input type="number" step="0.01" {...form.register(`items.${index}.valor_unitario`, { valueAsNumber: true, onChange: () => calcularItem(index) })} /></div>
                        <div className="space-y-2"><label className="text-sm">Desc.</label><Input type="number" step="0.01" {...form.register(`items.${index}.descuento`, { valueAsNumber: true, onChange: () => calcularItem(index) })} /></div>
                        <div className="space-y-2"><label className="text-sm">P. Unit</label><Input type="number" readOnly className="bg-muted" {...form.register(`items.${index}.precio_unitario`, { valueAsNumber: true })} /></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="space-y-4">
                 <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Totales</CardTitle>
                    <CardDescription>Resumen de montos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Gravada</span><span>{totales.total_gravada.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>IGV</span><span>{totales.total_igv.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>{totales.total.toFixed(2)}</span></div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Observaciones */}
        <Card>
          <CardContent className="pt-6">
            <Input {...form.register('observaciones')} placeholder="Observaciones" />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => form.reset()}>Limpiar</Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />} Emitir Factura
          </Button>
        </div>
      </form>

      {pdfUrl && (
        <Card>
          <CardContent className="pt-6">
            <Button asChild><a href={pdfUrl} target="_blank" rel="noopener noreferrer">Ver PDF Generado</a></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}