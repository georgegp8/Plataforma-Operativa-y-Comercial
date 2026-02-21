import { type Dispatch, type SetStateAction, useRef } from 'react';
import { type UseFormReturn, type FieldArrayWithId } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Plus, Trash2 } from 'lucide-react';
import { type Producto } from '@/lib/api';

type ItemsFormValues = {
  items: Array<{
    unidad_de_medida: string;
    codigo: string;
    descripcion: string;
    cantidad: number;
    valor_unitario: number;
    precio_unitario: number;
    descuento?: number;
    tipo_de_igv: string;
  }>;
};

interface ItemsSectionProps {
  form: UseFormReturn<ItemsFormValues>;
  fields: FieldArrayWithId<ItemsFormValues, 'items', 'id'>[];
  productos: Producto[];
  loadingProductos: boolean;
  openProductoCombobox: boolean;
  setOpenProductoCombobox: Dispatch<SetStateAction<boolean>>;
  busquedaProducto: string;
  setBusquedaProducto: Dispatch<SetStateAction<string>>;
  onAppendProducto: (producto: Producto) => void;
  onAgregarLinea: () => void;
  onClickItem: (index: number) => void;
  onRemoveItem: (index: number) => void;
  calcularItemSolo: (index: number) => { subtotal: number; igv: number; total: number; precio_unitario: number };
  productosDestacados?: Producto[];
}

export function ItemsSection({
  form,
  fields,
  productos,
  loadingProductos,
  openProductoCombobox,
  setOpenProductoCombobox,
  busquedaProducto,
  setBusquedaProducto,
  onAppendProducto,
  onAgregarLinea,
  onClickItem,
  onRemoveItem,
  calcularItemSolo,
  productosDestacados = [],
}: ItemsSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current) {
      e.stopPropagation();
      scrollContainerRef.current.scrollTop += e.deltaY;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Items del Comprobante</CardTitle>
              <CardDescription>Productos o servicios vendidos</CardDescription>
            </div>
          </div>

          {/* Buscador de Productos */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar Producto o Servicio</label>
            <Popover open={openProductoCombobox} onOpenChange={setOpenProductoCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openProductoCombobox}
                  className="w-full justify-between font-normal"
                >
                  <span className="text-muted-foreground">
                    {loadingProductos ? 'Cargando productos...' : 'Seleccionar producto o servicio...'}
                  </span>
                  <Plus className="w-4 h-4 ml-2" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) max-w-[min(90vw,600px)] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Buscar por código o descripción..."
                    value={busquedaProducto}
                    onValueChange={setBusquedaProducto}
                  />
                  <CommandEmpty>
                    {loadingProductos ? 'Cargando...' : 'No se encontraron productos'}
                  </CommandEmpty>
                  <CommandGroup
                    ref={scrollContainerRef}
                    onWheel={handleWheel}
                    className="max-h-[400px] overflow-y-scroll overscroll-contain"
                  >
                    {productos
                      .filter((producto) => {
                        const termino = busquedaProducto.toLowerCase();
                        return (
                          producto.codigo?.toLowerCase().includes(termino) ||
                          producto.descripcion?.toLowerCase().includes(termino)
                        );
                      })
                      .map((producto) => (
                        <CommandItem
                          key={producto.id}
                          value={producto.id.toString()}
                          onSelect={() => {
                            onAppendProducto(producto);
                            setBusquedaProducto('');
                            setOpenProductoCombobox(false);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full gap-2 min-w-0">
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-medium text-sm truncate" title={`${producto.codigo} - ${producto.descripcion}`}>
                                <span className="text-primary">{producto.codigo}</span> - {producto.descripcion}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {producto.unidad_medida || 'NIU'} · Stock:{' '}
                                {Number(producto.stock_actual || 0).toFixed(2)}
                              </span>
                            </div>
                            <span className="font-semibold text-green-600 text-sm shrink-0">
                              S/ {Number(producto.precio_venta_unitario || 0).toFixed(2)}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Botón Agregar Línea */}
          <Button
            type="button"
            variant="default"
            size="sm"
            className="w-full sm:w-auto bg-primary"
            onClick={onAgregarLinea}
          >
            <Plus className="w-4 h-4 mr-2" />
            AGREGAR LÍNEA O ITEM
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:gap-6">
          {/* Columna Izquierda: Items */}
          <div className="space-y-4">
            {fields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay items agregados.</p>
                <p className="text-sm">Usa el buscador o botón "Agregar línea" para añadir productos.</p>
              </div>
            ) : (
              fields.map((field, index) => {
                const item = form.watch(`items.${index}`);
                const calc = calcularItemSolo(index);

                return (
                  <div
                    key={field.id}
                    className="p-3 sm:p-4 border rounded-lg hover:border-primary cursor-pointer transition-colors"
                    onClick={() => onClickItem(index)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">Item {index + 1}</span>
                          <span className="text-xs text-muted-foreground">
                            {item?.codigo || 'Sin código'}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">
                          {item?.descripcion || 'Sin descripción'}
                        </p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Cant: {item?.cantidad}</span>
                          <span>×</span>
                          <span>
                            P. Unit: S/ {item?.precio_unitario?.toFixed(2) ?? '0.00'}
                          </span>
                          {item?.descuento && item.descuento > 0 && (
                            <span className="text-orange-600">
                              Desc: S/ {item.descuento.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold">S/ {calc.total.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          IGV: S/ {calc.igv.toFixed(2)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItem(index);
                        }}
                        className="shrink-0"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Columna Derecha — Productos Destacados */}
          {productosDestacados.length > 0 && (
            <div className="space-y-4">
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Productos destacados</CardTitle>
                  <CardDescription className="text-xs">
                    Clic para agregar al comprobante
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {productosDestacados.map((p) => (
                      <Button
                        key={p.id}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs h-auto py-1.5 px-3 text-left"
                        onClick={() => onAppendProducto(p)}
                        title={p.nombre}
                      >
                        <span className="font-mono mr-1 text-muted-foreground">{p.codigo}</span>
                        <span>· S/ {Number(p.precio_venta_unitario ?? 0).toFixed(2)}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

