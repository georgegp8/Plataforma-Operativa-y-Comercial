import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Trash2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface Pago {
  id: number;
  fecha_pago: string;
  monto: number;
  medio_pago: string;
  numero_operacion?: string;
  comprobante_id?: number;
  descripcion?: string;
  created_at: string;
  comprobante?: {
    tipo_doc: string;
    serie: string;
    numero: string;
    total?: number;
  };
}

interface GestionPagosProps {
  oportunidadId: number;
  pagos: Pago[];
  onPagosChange: () => void;
}

const MEDIOS_PAGO = [
  { value: 'TRANSFERENCIA', label: 'Transferencia Bancaria' },
  { value: 'DEPOSITO', label: 'Depósito Bancario' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'TARJETA', label: 'Tarjeta de Crédito/Débito' },
  { value: 'OTRO', label: 'Otro' },
];

export default function GestionPagos({ 
  oportunidadId, 
  pagos, 
  onPagosChange 
}: GestionPagosProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fecha_pago: new Date().toISOString().split('T')[0],
    monto: '',
    medio_pago: 'TRANSFERENCIA',
    numero_operacion: '',
    descripcion: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      fecha_pago: new Date().toISOString().split('T')[0],
      monto: '',
      medio_pago: 'TRANSFERENCIA',
      numero_operacion: '',
      descripcion: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.monto || Number(form.monto) <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    setLoading(true);

    try {
      await api.post('/v1/pagos', {
        oportunidad_id: oportunidadId,
        fecha_pago: form.fecha_pago,
        monto: Number(form.monto),
        medio_pago: form.medio_pago,
        numero_operacion: form.numero_operacion || null,
        descripcion: form.descripcion || null,
      });

      toast.success('Pago registrado exitosamente');
      resetForm();
      setDialogOpen(false);
      onPagosChange();
    } catch (error) {
      console.error('Error al registrar pago:', error);
      toast.error('Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar este pago?')) return;

    try {
      await api.delete(`/v1/pagos/${id}`);
      toast.success('Pago eliminado');
      onPagosChange();
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar el pago');
    }
  };

  const totalPagado = pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);

  return (
    <div className="space-y-4">
      {/* Resumen de pagos */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Resumen de Pagos</h3>
              <p className="text-sm text-muted-foreground">
                {pagos.length} pago{pagos.length !== 1 ? 's' : ''} registrado{pagos.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Pagado</div>
              <div className="text-2xl font-bold text-green-600">
                S/ {totalPagado.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <Button onClick={() => setDialogOpen(true)} className="w-full">
            <DollarSign className="h-4 w-4 mr-2" />
            Registrar Nuevo Pago
          </Button>
        </CardContent>
      </Card>

      {/* Lista de pagos */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Historial de Pagos</h3>

          {pagos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay pagos registrados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pagos.map((pago) => (
                <div
                  key={pago.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <DollarSign className="h-5 w-5 text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-success">
                          S/ {Number(pago.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant="secondary" className="rounded-full">
                          {MEDIOS_PAGO.find((m) => m.value === pago.medio_pago)?.label || pago.medio_pago}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{new Date(pago.fecha_pago).toLocaleDateString('es-PE', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
                        {pago.numero_operacion && (
                          <>
                            <span>•</span>
                            <span className="font-mono">Op. {pago.numero_operacion}</span>
                          </>
                        )}
                      </div>
                      {pago.descripcion && (
                        <p className="text-xs text-muted-foreground mt-1">{pago.descripcion}</p>
                      )}
                      {pago.comprobante && (
                        <div className="flex items-center gap-1 text-xs text-primary mt-1">
                          <LinkIcon className="h-3 w-3" />
                          <span>
                            Vinculado a {pago.comprobante.tipo_doc} {pago.comprobante.serie}-{pago.comprobante.numero}
                            {' '}(S/ {Number(pago.comprobante.total).toFixed(2)})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminar(pago.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para nuevo pago */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Pago</DialogTitle>
            <DialogDescription>Ingresa los datos del pago a registrar</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Fecha de Pago *</Label>
                <Input
                  type="date"
                  value={form.fecha_pago}
                  onChange={(e) => handleChange('fecha_pago', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Monto (S/) *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.monto}
                  onChange={(e) => handleChange('monto', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Medio de Pago *</Label>
              <Select value={form.medio_pago} onValueChange={(v) => handleChange('medio_pago', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEDIOS_PAGO.map((medio) => (
                    <SelectItem key={medio.value} value={medio.value}>
                      {medio.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Número de Operación (opcional)</Label>
              <Input
                value={form.numero_operacion}
                onChange={(e) => handleChange('numero_operacion', e.target.value)}
                placeholder="Ej: 001234567890"
              />
            </div>

            <div>
              <Label>Descripción (opcional)</Label>
              <Input
                value={form.descripcion}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                placeholder="Notas adicionales sobre el pago"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Registrar Pago'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
