import { useState, useEffect } from 'react';
import type { UseFormReturn, FieldValues } from 'react-hook-form';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { TIPOS_DETRACCION_SELECT, MEDIOS_PAGO_DETRACCION_SELECT, obtenerPorcentajeDetraccion } from '@/services/nubefact';

type DetraccionModalProps = { 
  open: boolean;
  onClose: () => void;
  form: UseFormReturn<FieldValues>;
  totalComprobante: number;
};

const DetraccionModal = ({ open, onClose, form, totalComprobante }: DetraccionModalProps) => { 
  const [tipoDetraccion, setTipoDetraccion] = useState<string>('');
  const [porcentaje, setPorcentaje] = useState<number>(0);
  const [montoCalculado, setMontoCalculado] = useState<number>(0);
  const [medioPago, setMedioPago] = useState<string>('001');

  useEffect(() => {
    if (tipoDetraccion) {
      const porcentajeAuto = obtenerPorcentajeDetraccion(tipoDetraccion);
      const monto = totalComprobante * (porcentajeAuto / 100);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPorcentaje((prev) => (prev !== porcentajeAuto ? porcentajeAuto : prev));
      setMontoCalculado(Number(monto.toFixed(2)));
    }
  }, [tipoDetraccion, totalComprobante]);

  const handleGuardar = () => {
    form.setValue('tiene_detraccion', true);
    form.setValue('detraccion_tipo', tipoDetraccion);
    form.setValue('detraccion_porcentaje', porcentaje);
    form.setValue('detraccion_monto', montoCalculado);
    form.setValue('medio_pago_detraccion', medioPago);
    onClose();
  };

  const handleCancelar = () => {
    form.setValue('tiene_detraccion', false);
    form.setValue('detraccion_tipo', null);
    form.setValue('detraccion_porcentaje', null);
    form.setValue('detraccion_monto', null);
    form.setValue('medio_pago_detraccion', null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>Configurar Detracción</DialogTitle>
          <DialogDescription>
            Completa los datos de detracción según catálogos SUNAT
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              Total del comprobante: S/ {totalComprobante.toFixed(2)}
              {totalComprobante >= 700 && (
                <span className="block text-amber-600 font-medium mt-1">
                  ⚠ Operaciones ≥ S/ 700 requieren detracción obligatoriamente
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="tipo-detraccion">
              Tipo de Bien/Servicio <span className="text-red-500">*</span>
            </Label>
            <Select value={tipoDetraccion} onValueChange={setTipoDetraccion}>
              <SelectTrigger id="tipo-detraccion">
                <SelectValue placeholder="Seleccione el tipo..." />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_DETRACCION_SELECT.map((tipo) => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label} ({tipo.porcentaje}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="porcentaje">Porcentaje (%)</Label>
              <Input
                id="porcentaje"
                type="number"
                value={porcentaje}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPorcentaje(val);
                  setMontoCalculado(Number((totalComprobante * (val / 100)).toFixed(2)));
                }}
                step="0.01"
                min="0"
                max="100"
                disabled={!tipoDetraccion}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monto">Monto (S/)</Label>
              <Input
                id="monto"
                type="number"
                value={montoCalculado}
                onChange={(e) => setMontoCalculado(Number(e.target.value))}
                step="0.01"
                min="0"
                disabled={!tipoDetraccion}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="medio-pago">
              Medio de Pago <span className="text-red-500">*</span>
            </Label>
            <Select value={medioPago} onValueChange={setMedioPago}>
              <SelectTrigger id="medio-pago">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDIOS_PAGO_DETRACCION_SELECT.map((medio) => (
                  <SelectItem key={medio.value} value={medio.value}>
                    {medio.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancelar}>
            Cancelar
          </Button>
          <Button
            onClick={handleGuardar}
            disabled={!tipoDetraccion || porcentaje <= 0}
          >
            Aplicar Detracción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { DetraccionModal };
