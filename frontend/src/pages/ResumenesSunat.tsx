import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  RefreshCw, ChevronLeft, ChevronRight, FileCheck,
  ChevronDown, ChevronRight as ChevronRightIcon, CheckCircle2, XCircle, Clock, Eye,
} from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';

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
  nubefact_aceptada_por_sunat: boolean;
  nubefact_pdf_url?: string;
  anulado: boolean;
}

interface ResumenDiario {
  fecha: string;
  total_comprobantes: number;
  total_aceptados: number;
  total_pendientes: number;
  total_anulados: number;
  monto_total: number;
  comprobantes: Comprobante[];
}

export default function ResumenesSunat() {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'aceptado' | 'pendiente' | 'anulado'>('todos');
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedComprobante, setSelectedComprobante] = useState<Comprobante | null>(null);

  const fetchComprobantes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.comprobantes.listar({ per_page: 1000, sort_by: 'fecha_emision', sort_order: 'desc' });
      const data = response.data;
      const raw = (Array.isArray(data) ? data : (data as { data?: unknown[] }).data) || [];

      const mapped: Comprobante[] = raw.map((item: unknown) => {
        const comp = item as Record<string, unknown>;
        return {
          id: comp.id as number,
          tipo_doc: (comp.tipo_doc as string) || '',
          serie: (comp.serie as string) || '',
          correlativo: (comp.correlativo as string) || '',
          numero_completo: (comp.numero_completo as string) || `${comp.serie}-${comp.correlativo}`,
          cliente_razon_social: (comp.cliente_razon_social as string) || '',
          cliente_num_doc: (comp.cliente_num_doc as string) || '',
          fecha_emision: (comp.fecha_emision as string) || '',
          moneda: (comp.moneda as string) || 'PEN',
          mto_imp_venta: typeof comp.mto_imp_venta === 'number' ? comp.mto_imp_venta : parseFloat(String(comp.mto_imp_venta || 0)),
          mto_oper_gravadas: typeof comp.mto_oper_gravadas === 'number' ? comp.mto_oper_gravadas : parseFloat(String(comp.mto_oper_gravadas || 0)),
          mto_igv: typeof comp.mto_igv === 'number' ? comp.mto_igv : parseFloat(String(comp.mto_igv || 0)),
          nubefact_aceptada_por_sunat: (comp.nubefact_aceptada_por_sunat as boolean) || false,
          nubefact_pdf_url: comp.nubefact_pdf_url as string,
          anulado: (comp.anulado as boolean) || false,
        };
      });

      setComprobantes(mapped);
    } catch (error) {
      console.error(error);
      toast.error('Error', { description: 'No se pudo cargar los comprobantes' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComprobantes();
  }, [fetchComprobantes]);

  // Agrupar comprobantes por fecha
  const resumenesPorFecha = comprobantes.reduce<Record<string, ResumenDiario>>((acc, comp) => {
    const fecha = comp.fecha_emision?.split('T')[0] || comp.fecha_emision || 'Sin fecha';
    if (!acc[fecha]) {
      acc[fecha] = {
        fecha,
        total_comprobantes: 0,
        total_aceptados: 0,
        total_pendientes: 0,
        total_anulados: 0,
        monto_total: 0,
        comprobantes: [],
      };
    }
    acc[fecha].total_comprobantes++;
    acc[fecha].monto_total += comp.mto_imp_venta;
    if (comp.anulado) {
      acc[fecha].total_anulados++;
    } else if (comp.nubefact_aceptada_por_sunat) {
      acc[fecha].total_aceptados++;
    } else {
      acc[fecha].total_pendientes++;
    }
    acc[fecha].comprobantes.push(comp);
    return acc;
  }, {});

  // Convertir a array y ordenar por fecha descendente
  let resumenes = Object.values(resumenesPorFecha).sort((a, b) => b.fecha.localeCompare(a.fecha));

  // Filtros
  if (filtroFecha) {
    resumenes = resumenes.filter(r => r.fecha.includes(filtroFecha));
  }
  if (filtroEstado !== 'todos') {
    resumenes = resumenes.filter(r => {
      if (filtroEstado === 'aceptado') return r.total_aceptados === r.total_comprobantes - r.total_anulados;
      if (filtroEstado === 'pendiente') return r.total_pendientes > 0;
      if (filtroEstado === 'anulado') return r.total_anulados > 0;
      return true;
    });
  }

  const totalPages = Math.ceil(resumenes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const resumenesPage = resumenes.slice(startIndex, startIndex + itemsPerPage);

  const toggleFecha = (fecha: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev);
      if (next.has(fecha)) {
        next.delete(fecha);
      } else {
        next.add(fecha);
      }
      return next;
    });
  };

  const getEstadoResumen = (resumen: ResumenDiario) => {
    if (resumen.total_pendientes > 0) {
      return { label: 'Con pendientes', color: 'bg-warning/10 text-warning border border-warning/30' };
    }
    if (resumen.total_aceptados === resumen.total_comprobantes - resumen.total_anulados && resumen.total_aceptados > 0) {
      return { label: 'Completo', color: 'bg-success/10 text-success border border-success/30' };
    }
    if (resumen.total_anulados === resumen.total_comprobantes) {
      return { label: 'Todo anulado', color: 'bg-destructive/10 text-destructive border border-destructive/30' };
    }
    return { label: 'Parcial', color: 'bg-muted text-muted-foreground border border-border' };
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case '01': return 'Factura';
      case '03': return 'Boleta';
      case '07': return 'N. Crédito';
      case '08': return 'N. Débito';
      default: return tipo;
    }
  };

  const formatFecha = (fecha: string) => {
    if (!fecha || fecha === 'Sin fecha') return fecha;
    try {
      const date = new Date(fecha + 'T00:00:00');
      return date.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return fecha;
    }
  };

  // Totales globales
  const totalesGlobales = {
    totalDias: resumenes.length,
    totalComprobantes: resumenes.reduce((s, r) => s + r.total_comprobantes, 0),
    totalAceptados: resumenes.reduce((s, r) => s + r.total_aceptados, 0),
    totalPendientes: resumenes.reduce((s, r) => s + r.total_pendientes, 0),
    montoTotal: resumenes.reduce((s, r) => s + r.monto_total, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Cargando resúmenes...</p>
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
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Resúmenes SUNAT</h1>
          </div>
          <Button
            onClick={() => void fetchComprobantes()}
            variant="secondary"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-primary-foreground border-0"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Tarjetas de resumen */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">{totalesGlobales.totalDias}</p>
              <p className="text-xs text-muted-foreground">Días con emisiones</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold">{totalesGlobales.totalComprobantes}</p>
              <p className="text-xs text-muted-foreground">Total comprobantes</p>
            </div>
            <div className="text-center p-3 bg-success/10 rounded-lg border border-success/20">
              <p className="text-2xl font-bold text-success">{totalesGlobales.totalAceptados}</p>
              <p className="text-xs text-muted-foreground">Aceptados SUNAT</p>
            </div>
            <div className="text-center p-3 bg-warning/10 rounded-lg border border-warning/20">
              <p className="text-2xl font-bold text-warning">{totalesGlobales.totalPendientes}</p>
              <p className="text-xs text-muted-foreground">Pendientes</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Filtrar por fecha (YYYY-MM-DD)</Label>
              <Input
                placeholder="Ej: 2026-02"
                value={filtroFecha}
                onChange={e => { setFiltroFecha(e.target.value); setCurrentPage(1); }}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Estado del día</Label>
              <Select value={filtroEstado} onValueChange={(v) => { setFiltroEstado(v as typeof filtroEstado); setCurrentPage(1); }}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los días</SelectItem>
                  <SelectItem value="aceptado">Días completos</SelectItem>
                  <SelectItem value="pendiente">Con pendientes</SelectItem>
                  <SelectItem value="anulado">Con anulados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Lista de resúmenes agrupados por fecha */}
        <div className="bg-white dark:bg-card border border-t-0 border-border rounded-b-lg overflow-hidden">
          {resumenesPage.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay resúmenes para el período seleccionado
            </div>
          ) : (
            <div className="divide-y divide-border">
              {resumenesPage.map(resumen => {
                const isExpanded = expandedDates.has(resumen.fecha);
                const estado = getEstadoResumen(resumen);
                return (
                  <div key={resumen.fecha}>
                    {/* Fila del día (cabecera de grupo) */}
                    <button
                      type="button"
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                      onClick={() => toggleFecha(resumen.fecha)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-sm capitalize">{formatFecha(resumen.fecha)}</p>
                          <p className="text-xs text-muted-foreground">{resumen.fecha}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                            {resumen.total_aceptados}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                            {resumen.total_pendientes}
                          </span>
                          <span className="flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5 text-red-500" />
                            {resumen.total_anulados}
                          </span>
                        </div>
                        <span className="font-semibold">{formatCurrency(resumen.monto_total)}</span>
                        <Badge className={`text-xs ${estado.color}`}>{estado.label}</Badge>
                      </div>
                    </button>

                    {/* Detalle del día expandido */}
                    {isExpanded && (
                      <div className="bg-muted/20 border-t border-border">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/40">
                            <tr>
                              <th className="px-6 py-2 text-left font-medium">Tipo</th>
                              <th className="px-4 py-2 text-left font-medium">Número</th>
                              <th className="px-4 py-2 text-left font-medium">Cliente</th>
                              <th className="px-4 py-2 text-right font-medium">Total</th>
                              <th className="px-4 py-2 text-center font-medium">Estado</th>
                              <th className="px-4 py-2 text-center font-medium">PDF</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumen.comprobantes.map(comp => (
                              <tr key={comp.id} className="border-t border-border/50 hover:bg-muted/30">
                                <td className="px-6 py-2">
                                  <Badge variant="outline" className="text-xs">
                                    {getTipoLabel(comp.tipo_doc)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-2 font-mono">{comp.numero_completo}</td>
                                <td className="px-4 py-2 max-w-50 truncate" title={comp.cliente_razon_social}>
                                  {comp.cliente_razon_social}
                                </td>
                                <td className="px-4 py-2 text-right font-semibold">
                                  {formatCurrency(comp.mto_imp_venta)}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {comp.anulado ? (
                                    <Badge className="bg-destructive/10 text-destructive border border-destructive/30 text-xs">
                                      Anulado
                                    </Badge>
                                  ) : comp.nubefact_aceptada_por_sunat ? (
                                    <Badge className="bg-success/10 text-success border border-success/30 text-xs">
                                      Aceptado
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-warning/10 text-warning border border-warning/30 text-xs">
                                      Pendiente
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => { setSelectedComprobante(comp); setIsDetailModalOpen(true); }}
                                      title="Ver detalles"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                    {comp.nubefact_pdf_url && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-primary"
                                        onClick={() => window.open(comp.nubefact_pdf_url, '_blank')}
                                        title="Ver PDF"
                                      >
                                        <FileCheck className="h-3.5 w-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t border-border bg-muted/30">
                            <tr>
                              <td colSpan={3} className="px-6 py-2 text-xs text-muted-foreground">
                                {resumen.total_comprobantes} comprobantes
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-sm">
                                {formatCurrency(resumen.monto_total)}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginación */}
          {resumenes.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, resumenes.length)} de {resumenes.length} días
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">Página {currentPage} de {totalPages || 1}</span>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal detalles */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle del Comprobante</DialogTitle>
              <DialogDescription>Información del comprobante en el resumen diario</DialogDescription>
            </DialogHeader>
            {selectedComprobante && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <p className="font-medium">{getTipoLabel(selectedComprobante.tipo_doc)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Número</Label>
                    <p className="font-mono font-medium">{selectedComprobante.numero_completo}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Cliente</Label>
                    <p className="font-medium">{selectedComprobante.cliente_razon_social}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">RUC/DNI</Label>
                    <p className="font-mono">{selectedComprobante.cliente_num_doc}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha</Label>
                    <p>{selectedComprobante.fecha_emision}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <p className="text-lg font-bold">{formatCurrency(selectedComprobante.mto_imp_venta)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estado SUNAT</Label>
                    <div className="mt-1">
                      {selectedComprobante.anulado ? (
                        <Badge className="bg-destructive/10 text-destructive border border-destructive/30">Anulado</Badge>
                      ) : selectedComprobante.nubefact_aceptada_por_sunat ? (
                        <Badge className="bg-success/10 text-success border border-success/30">Aceptado</Badge>
                      ) : (
                        <Badge className="bg-warning/10 text-warning border border-warning/30">Pendiente</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Cerrar</Button>
              {selectedComprobante?.nubefact_pdf_url && (
                <Button onClick={() => window.open(selectedComprobante.nubefact_pdf_url, '_blank')}>
                  Ver PDF
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
