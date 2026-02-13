import { type UseFormReturn } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TIPOS_IGV } from '@/services/nubefact';

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
}

export function ItemModal({
  form,
  open,
  index,
  onClose,
  calcularItem,
  calcularItemSolo,
  onRemove,
}: ItemModalProps) {
  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      onClose(false);
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
              <label className="text-sm font-medium">Producto - Servicio (CATÁLOGO)</label>
              <Select
                value={form.watch(`items.${index}.codigo`)}
                onValueChange={(value) => {
                  form.setValue(`items.${index}.codigo`, value);
                  // Aquí se puede cargar info del producto
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Buscar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0001">0001 - CABLE USB</SelectItem>
                  <SelectItem value="0002">0002 - CABLES HDMI</SelectItem>
                  <SelectItem value="0003">0003 - BLISTER DE 5 PILAS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Detalle adicional</label>
              <Input
                {...form.register(`items.${index}.descripcion`)}
                placeholder="Descripción del producto/servicio"
              />
            </div>

            {/* Stock */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Stock actual disponible</label>
              <Input type="number" disabled placeholder="-" className="bg-muted" />
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

