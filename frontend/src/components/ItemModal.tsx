import { useState, useEffect } from 'react';
import { type UseFormReturn, useWatch } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TIPOS_IGV } from '@/services/nubefact';
import { api, type Producto } from '@/lib/api';
import { AlertTriangle, Package, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type ItemValues = {
  unidad_de_medida: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  valor_unitario: number;
  precio_unitario: number;
  descuento?: number;
  tipo_de_igv: string;
};

type ItemFormValues = {
  porcentaje_de_igv: number;
  items: ItemValues[];
};

interface ItemModalProps {
  form: UseFormReturn<ItemFormValues>;
  open: boolean;
  index: number | null;
  onClose: (guardar: boolean) => void;
  calcularItem: (index: number) => void;
  calcularItemSolo: (index: number) => { subtotal: number; igv: number; total: number; precio_unitario: number };
  onRemove: (index: number) => void;
  empresaId?: number;
}

export function ItemModal({
  form,
  open,
  index,
  onClose,
  calcularItem,
  calcularItemSolo,
  onRemove,
  empresaId = 1,
}: ItemModalProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [refreshingStock, setRefreshingStock] = useState(false);

  // Suscribirse a cambios de items para forzar re-render y recalcular automáticamente
  useWatch({ control: form.control, name: 'items' });

  const fetchProductos = async () => {
    setLoadingProductos(true);
    try {
      const response = await api.productos.listar({ empresa_id: empresaId, activo: true });
      setProductos(response.data);
      return response.data as Producto[];
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast.error('Error al cargar productos');
      return [] as Producto[];
    } finally {
      setLoadingProductos(false);
    }
  };

  // Cargar productos cuando se abre el modal
  useEffect(() => {
    if (!open) return;
    fetchProductos().then((lista) => {
      // Identificar producto actual al abrir
      if (index !== null) {
        const codigoActual = form.getValues(`items.${index}.codigo`);
        if (codigoActual) {
          const encontrado = lista.find(p => p.codigo === codigoActual);
          setProductoSeleccionado(encontrado || null);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, empresaId]);

  // Actualizar productoSeleccionado cuando cambia el índice
  useEffect(() => {
    if (index !== null && open && productos.length > 0) {
      const codigoActual = form.getValues(`items.${index}.codigo`);
      if (codigoActual) {
        const encontrado = productos.find(p => p.codigo === codigoActual);
        setProductoSeleccionado(encontrado || null);
      } else {
        setProductoSeleccionado(null);
      }
    }
  }, [index, open, productos, form]);

  const handleRefreshStock = async () => {
    if (!productoSeleccionado) return;
    setRefreshingStock(true);
    try {
      const lista = await fetchProductos();
      const actualizado = lista.find(p => p.codigo === productoSeleccionado.codigo);
      if (actualizado) {
        setProductoSeleccionado(actualizado);
        toast.success(`Stock actualizado: ${actualizado.stock_actual} unidades`);
      }
    } finally {
      setRefreshingStock(false);
    }
  };

  const handleProductoSelect = (codigo: string) => {
    const producto = productos.find(p => p.codigo === codigo);
    if (!producto || index === null) return;

    setProductoSeleccionado(producto);

    form.setValue(`items.${index}.codigo`, producto.codigo);
    form.setValue(`items.${index}.descripcion`, producto.descripcion);
    form.setValue(`items.${index}.unidad_de_medida`, producto.unidad_medida || 'NIU');
    form.setValue(`items.${index}.precio_unitario`, parseFloat((producto.precio_venta_unitario ?? 0).toString()));
    form.setValue(`items.${index}.valor_unitario`, parseFloat((producto.valor_venta_unitario ?? 0).toString()));
    form.setValue(`items.${index}.tipo_de_igv`, producto.tipo_afectacion_igv || '10');

    calcularItem(index);

    if (producto.stock_actual <= 0) {
      toast.warning(`⚠️ Producto sin stock disponible`);
    } else if (producto.stock_actual <= producto.stock_minimo) {
      toast.warning(`⚠️ Stock bajo: solo ${producto.stock_actual} unidades`);
    }
  };

  const productosFiltrados = productos.filter(p =>
    p.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose(false);
      setProductoSeleccionado(null);
      setBusqueda('');
    }
  };

  // Calcular valores actuales (reactivo gracias a useWatch)
  const calc = index !== null ? calcularItemSolo(index) : { subtotal: 0, igv: 0, total: 0, precio_unitario: 0 };

  const stockActual = productoSeleccionado?.stock_actual ?? null;
  const stockMinimo = productoSeleccionado?.stock_minimo ?? 0;
  const stockCritico = stockActual !== null && stockActual <= 0;
  const stockBajo = stockActual !== null && stockActual > 0 && stockActual <= stockMinimo;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalle de la LÍNEA o ITEM</DialogTitle>
          <DialogDescription>Edita los datos del producto o servicio</DialogDescription>
        </DialogHeader>
        {index !== null && (
          <div className="space-y-4 py-4">
            {/* Producto - Servicio */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Producto - Servicio (CATÁLOGO)
              </label>
              <div className="space-y-2">
                <Input
                  placeholder="Buscar por código o descripción..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="mb-2"
                />
                <Select
                  value={form.watch(`items.${index}.codigo`)}
                  onValueChange={handleProductoSelect}
                  disabled={loadingProductos}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingProductos ? "Cargando..." : "Seleccionar producto"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-75">
                    {productosFiltrados.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No se encontraron productos
                      </div>
                    ) : (
                      productosFiltrados.map((producto) => (
                        <SelectItem key={producto.id} value={producto.codigo}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{producto.codigo} - {producto.descripcion}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              producto.stock_actual <= 0
                                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                : producto.stock_actual <= producto.stock_minimo
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            }`}>
                              Stock: {producto.stock_actual}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Detalle adicional</label>
              <Input
                {...form.register(`items.${index}.descripcion`)}
                placeholder="Descripción del producto/servicio"
              />
            </div>

            {/* Stock con advertencia visual */}
            {productoSeleccionado && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Stock actual disponible</label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground"
                    onClick={handleRefreshStock}
                    disabled={refreshingStock}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${refreshingStock ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    disabled
                    value={stockActual !== null ? String(stockActual) : ''}
                    className={`bg-muted ${
                      stockCritico ? 'border-red-500 border-2' :
                      stockBajo    ? 'border-yellow-500 border-2' : ''
                    }`}
                  />
                  {stockCritico && (
                    <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                  )}
                </div>
                {stockCritico && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Sin stock disponible — puedes continuar igual
                  </p>
                )}
                {stockBajo && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Stock bajo (mínimo: {stockMinimo})
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Cantidad */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cantidad</label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  {...form.register(`items.${index}.cantidad`, {
                    valueAsNumber: true,
                    onChange: () => calcularItem(index),
                  })}
                />
              </div>

              {/* Precio Unit con IGV */}
              <div className="space-y-2">
                <label className="text-sm font-medium">PRECIO Unit. (Con IGV)</label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register(`items.${index}.precio_unitario`, {
                    valueAsNumber: true,
                    onChange: () => {
                      const precioConIgv = form.getValues(`items.${index}.precio_unitario`) || 0;
                      const igvRate = (form.getValues('porcentaje_de_igv') || 18) / 100;
                      const valorSinIgv = precioConIgv / (1 + igvRate);
                      form.setValue(
                        `items.${index}.valor_unitario`,
                        parseFloat(valorSinIgv.toFixed(6))
                      );
                      calcularItem(index);
                    },
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Tipo IGV */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo IGV</label>
                <Select
                  value={form.watch(`items.${index}.tipo_de_igv`)}
                  onValueChange={(value) => {
                    form.setValue(`items.${index}.tipo_de_igv`, value);
                    calcularItem(index);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TIPOS_IGV.GRAVADO_OPERACION_ONEROSA}>
                      Gravado - Operación Onerosa
                    </SelectItem>
                    <SelectItem value={TIPOS_IGV.EXONERADO}>Exonerado</SelectItem>
                    <SelectItem value={TIPOS_IGV.INAFECTO}>Inafecto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* IGV de la línea */}
              <div className="space-y-2">
                <label className="text-sm font-medium">IGV de la línea</label>
                <Input
                  type="text"
                  disabled
                  value={calc.igv.toFixed(2)}
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Subtotal */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Subtotal</label>
                <Input
                  type="text"
                  disabled
                  value={calc.subtotal.toFixed(2)}
                  className="bg-muted"
                />
              </div>

              {/* Total */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Total</label>
                <Input
                  type="text"
                  disabled
                  value={calc.total.toFixed(2)}
                  className="bg-muted font-semibold"
                />
              </div>
            </div>

            {/* Descuento */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Descuento por Item o Línea (aplica al Subtotal)
              </label>
              <Input
                type="number"
                step="0.01"
                {...form.register(`items.${index}.descuento`, {
                  valueAsNumber: true,
                  onChange: () => calcularItem(index),
                })}
              />
            </div>

            {/* Impuesto Bolsa Plástica */}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="bolsa-plastica" className="rounded" />
              <label htmlFor="bolsa-plastica" className="text-sm font-medium">
                Impuesto a la Bolsa Plástica
              </label>
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                className="flex-1"
                onClick={() => onClose(true)}
              >
                ACEPTAR
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (index !== null) {
                    onRemove(index);
                  }
                }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
