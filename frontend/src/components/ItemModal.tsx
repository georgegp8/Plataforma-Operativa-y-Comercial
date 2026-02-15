import { useState, useEffect } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TIPOS_IGV } from '@/services/nubefact';
import { api, type Producto } from '@/lib/api';
import { AlertTriangle, Package } from 'lucide-react';
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
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

  // Cargar productos cuando se abre el modal
  useEffect(() => {
    const fetchProductos = async () => {
      if (!open) return;

      setLoadingProductos(true);
      try {
        const response = await api.productos.listar({ empresa_id: empresaId, activo: true });
        setProductos(response.data);
      } catch (error) {
        console.error('Error al cargar productos:', error);
        toast.error('Error al cargar productos');
      } finally {
        setLoadingProductos(false);
      }
    };

    fetchProductos();
  }, [open, empresaId]);

  // Cargar producto seleccionado cuando cambia el código
  useEffect(() => {
    if (index !== null && open) {
      const codigoActual = form.watch(`items.${index}.codigo`);
      if (codigoActual && productos.length > 0) {
        const producto = productos.find(p => p.codigo === codigoActual);
        setProductoSeleccionado(producto || null);
      }
    }
  }, [index, open, productos, form]);

  const handleProductoSelect = (codigo: string) => {
    const producto = productos.find(p => p.codigo === codigo);
    if (!producto || index === null) return;

    setProductoSeleccionado(producto);

    // Auto-rellenar datos del producto
    form.setValue(`items.${index}.codigo`, producto.codigo);
    form.setValue(`items.${index}.descripcion`, producto.descripcion);
    form.setValue(`items.${index}.unidad_de_medida`, producto.unidad_medida || 'NIU');
    form.setValue(`items.${index}.precio_unitario`, parseFloat((producto.precio_venta_unitario ?? 0).toString()));
    form.setValue(`items.${index}.valor_unitario`, parseFloat((producto.valor_venta_unitario ?? 0).toString()));
    form.setValue(`items.${index}.tipo_de_igv`, producto.tipo_afectacion_igv || '10');

    // Recalcular totales
    calcularItem(index);

    // Advertencia si stock es 0 o bajo
    if (producto.stock_actual <= 0) {
      toast.warning(`⚠️ Producto sin stock disponible`);
    } else if (producto.stock_actual <= producto.stock_minimo) {
      toast.warning(`⚠️ Stock bajo: solo ${producto.stock_actual} unidades disponibles`);
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Stock actual disponible</label>
              <div className="relative">
                <Input
                  type="number"
                  disabled
                  value={productoSeleccionado?.stock_actual ?? '-'}
                  className={`bg-muted ${
                    productoSeleccionado && productoSeleccionado.stock_actual <= 0
                      ? 'border-red-500 border-2'
                      : productoSeleccionado && productoSeleccionado.stock_actual <= productoSeleccionado.stock_minimo
                      ? 'border-yellow-500 border-2'
                      : ''
                  }`}
                />
                {productoSeleccionado && productoSeleccionado.stock_actual <= 0 && (
                  <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                )}
              </div>
              {productoSeleccionado && productoSeleccionado.stock_actual <= 0 && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Sin stock disponible
                </p>
              )}
              {productoSeleccionado && productoSeleccionado.stock_actual > 0 && productoSeleccionado.stock_actual <= productoSeleccionado.stock_minimo && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Stock bajo (mínimo: {productoSeleccionado.stock_minimo})
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Cantidad */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cantidad</label>
                <Input
                  type="number"
                  step="0.01"
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
                      const precioConIgv = form.watch(`items.${index}.precio_unitario`) || 0;
                      const igvRate = (form.getValues('porcentaje_de_igv') || 18) / 100;
                      const valorSinIgv = precioConIgv / (1 + igvRate);
                      form.setValue(
                        `items.${index}.valor_unitario`,
                        parseFloat(valorSinIgv.toFixed(2))
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
                  type="number"
                  disabled
                  value={calcularItemSolo(index).igv.toFixed(2)}
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Subtotal */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Subtotal</label>
                <Input
                  type="number"
                  disabled
                  value={calcularItemSolo(index).subtotal.toFixed(2)}
                  className="bg-muted"
                />
              </div>

              {/* Total */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Total</label>
                <Input
                  type="number"
                  disabled
                  value={calcularItemSolo(index).total.toFixed(2)}
                  className="bg-muted"
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

