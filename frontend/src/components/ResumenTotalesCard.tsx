import { useState } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { DetraccionModal } from '@/components/DetraccionModal';

type ComprobanteFormValues = {
  tiene_detraccion?: boolean;
  detraccion_tipo?: string;
  detraccion_porcentaje?: number;
  detraccion_monto?: number;
  medio_pago_detraccion?: string;
};

interface Totales {
  total_gravada: number;
  total_exonerada: number;
  total_inafecta: number;
  total_gratuita: number;
  total_igv: number;
  total: number;
}

interface ResumenTotalesCardProps {
  form: UseFormReturn<ComprobanteFormValues>;
  totales: Totales;
  requiereDocumento: boolean;
}

export function ResumenTotalesCard({ form, totales, requiereDocumento }: ResumenTotalesCardProps) {
  const [modalDetraccionAbierto, setModalDetraccionAbierto] = useState(false);
  const tieneDetraccion = form.watch('tiene_detraccion');
  const detraccionMonto = form.watch('detraccion_monto');

  return (
    <>
      <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Resumen de totales</CardTitle>
        <CardDescription className="text-xs">
          Revisa los montos antes de emitir el comprobante.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1 text-xs sm:text-sm">
        <div className="flex justify-between">
          <span>Gravada S/</span>
          <span>{totales.total_gravada.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>IGV S/</span>
          <span>{totales.total_igv.toFixed(2)}</span>
        </div>
        {totales.total_exonerada > 0 && (
          <div className="flex justify-between">
            <span>Exonerada S/</span>
            <span>{totales.total_exonerada.toFixed(2)}</span>
          </div>
        )}
        {totales.total_inafecta > 0 && (
          <div className="flex justify-between">
            <span>Inafecta S/</span>
            <span>{totales.total_inafecta.toFixed(2)}</span>
          </div>
        )}
        {totales.total_gratuita > 0 && (
          <div className="flex justify-between">
            <span>Gratuita S/</span>
            <span>{totales.total_gratuita.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold border-t pt-2 mt-1 text-sm">
          <span>Total S/</span>
          <span>{totales.total.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between pt-2 mt-1 border-t">
          <span className="text-sm">¿Detracción?</span>
          <Switch
            checked={!!tieneDetraccion}
            onCheckedChange={(checked) => {
              if (checked) {
                setModalDetraccionAbierto(true);
              } else {
                form.setValue('tiene_detraccion', false);
                form.setValue('detraccion_tipo', undefined);
                form.setValue('detraccion_porcentaje', undefined);
                form.setValue('detraccion_monto', undefined);
                form.setValue('medio_pago_detraccion', undefined);
              }
            }}
          />
        </div>

        {tieneDetraccion && detraccionMonto && (
          <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
            <div className="flex justify-between">
              <span className="text-blue-700 font-medium">Monto detracción:</span>
              <span className="text-blue-900 font-bold">S/ {detraccionMonto.toFixed(2)}</span>
            </div>
          </div>
        )}
        {!requiereDocumento && totales.total >= 700 && (
          <p className="text-xs text-amber-600 pt-2">
            ⚠ Para montos ≥ S/ 700 se requiere documento del cliente
          </p>
        )}
      </CardContent>
    </Card>

      <DetraccionModal
        open={modalDetraccionAbierto}
        onClose={() => setModalDetraccionAbierto(false)}
        form={form}
        totalComprobante={totales.total}
      />
    </>
  );
}

