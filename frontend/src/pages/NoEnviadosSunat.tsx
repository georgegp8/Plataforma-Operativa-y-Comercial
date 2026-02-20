import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Eye, RefreshCw, ChevronLeft, ChevronRight, FileText,
  MoreVertical, FileDown, Send, AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  estado_sunat: string;
  nubefact_aceptada_por_sunat: boolean;
  nubefact_pdf_url?: string;
  nubefact_xml_url?: string;
  nubefact_enviado_at?: string;
  anulado: boolean;
  forma_pago: string;
}

export default function NoEnviadosSunat() {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'cliente' | 'numero' | 'fecha'>('cliente');
  const [valorFiltro, setValorFiltro] = useState('');
  const [filtroTipoDoc, setFiltroTipoDoc] = useState<'todos' | '01' | '03' | '07' | '08'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedComprobante, setSelectedComprobante] = useState<Comprobante | null>(null);
  const [reenvioLoading, setReenvioLoading] = useState<number | null>(null);
  const [sincronizandoPendientes, setSincronizandoPendientes] = useState(false);

  const fetchComprobantes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.comprobantes.listar({ per_page: 500, sort_by: 'id', sort_order: 'desc' });
      const data = response.data;
      const raw = (Array.isArray(data) ? data : (data as { data?: unknown[] }).data) || [];

      const mapped: Comprobante[] = raw
        .map((item: unknown) => {
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
            estado_sunat: (comp.estado_sunat as string) || '',
            nubefact_aceptada_por_sunat: (comp.nubefact_aceptada_por_sunat as boolean) || false,
            nubefact_pdf_url: comp.nubefact_pdf_url as string,
            nubefact_xml_url: comp.nubefact_xml_url as string,
            nubefact_enviado_at: comp.nubefact_enviado_at as string,
            anulado: (comp.anulado as boolean) || false,
            forma_pago: (comp.forma_pago as string) || 'Contado',
          };
        })
        // Solo los que NO han sido aceptados por SUNAT y NO están anulados
        .filter(comp => !comp.nubefact_aceptada_por_sunat && !comp.anulado);

      setComprobantes(mapped);
    } catch (error) {
      console.error(error);
      toast.error('Error', { description: 'No se pudo cargar los comprobantes pendientes' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComprobantes();
  }, [fetchComprobantes]);

  const handleReenviar = async (comp: Comprobante) => {
    setReenvioLoading(comp.id);
    try {
      const numero = parseInt(comp.correlativo, 10);
      await api.nubefactSync.sincronizarComprobante({
        tipo_doc: comp.tipo_doc,
        serie: comp.serie,
        numero,
      });
      toast.success('Reenviado', { description: `${comp.numero_completo} sincronizado con SUNAT` });
      await fetchComprobantes();
    } catch {
      toast.error('Error al reenviar', { description: `No se pudo sincronizar ${comp.numero_completo}` });
    } finally {
      setReenvioLoading(null);
    }
  };

  const handleSincronizarTodos = async () => {
    setSincronizandoPendientes(true);
    try {
      const res = await api.nubefactSync.sincronizarPendientes({ limite: 100 });
      const result = res.data as unknown as { exitosos?: number; fallidos?: number; mensaje?: string };
      toast.success('Sincronización completada', {
        description: `Exitosos: ${result.exitosos ?? 0}, Fallidos: ${result.fallidos ?? 0}`,
      });
      await fetchComprobantes();
    } catch {
      toast.error('Error al sincronizar pendientes');
    } finally {
      setSincronizandoPendientes(false);
    }
  };

  const comprobantesFiltrados = comprobantes.filter(comp => {
    if (filtroTipoDoc !== 'todos' && comp.tipo_doc !== filtroTipoDoc) return false;
    if (!valorFiltro) return true;
    const q = valorFiltro.toLowerCase();
    switch (tipoFiltro) {
      case 'cliente': return comp.cliente_razon_social.toLowerCase().includes(q);
      case 'numero': return comp.numero_completo.toLowerCase().includes(q);
      case 'fecha': return comp.fecha_emision.includes(valorFiltro);
      default: return true;
    }
  });

  const totalPages = Math.ceil(comprobantesFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginados = comprobantesFiltrados.slice(startIndex, startIndex + itemsPerPage);

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case '01': return 'Factura';
      case '03': return 'Boleta';
      case '07': return 'N. Crédito';
      case '08': return 'N. Débito';
      default: return tipo;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            <p className="text-sm text-muted-foreground">Cargando comprobantes pendientes...</p>
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
        <div className="bg-amber-500 text-white rounded-t-lg px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <h1 className="text-xl font-semibold">No Enviados a SUNAT</h1>
            {comprobantes.length > 0 && (
              <Badge className="bg-white/20 text-white border-0 ml-1">
                {comprobantes.length} pendiente{comprobantes.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => void fetchComprobantes()}
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-0"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Button
              onClick={() => void handleSincronizarTodos()}
              disabled={sincronizandoPendientes || comprobantes.length === 0}
              variant="secondary"
              size="sm"
              className="bg-white text-amber-700 hover:bg-white/90 border-0"
            >
              {sincronizandoPendientes ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {sincronizandoPendientes ? 'Sincronizando...' : 'Sincronizar Todos'}
            </Button>
          </div>
        </div>

        {/* Aviso informativo */}
        {comprobantes.length === 0 && !loading && (
          <div className="bg-white dark:bg-card border border-t-0 border-border p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">¡Todo sincronizado!</h3>
            <p className="text-sm text-muted-foreground mt-1">No hay comprobantes pendientes de envío a SUNAT.</p>
          </div>
        )}

        {/* Filtros */}
        {comprobantes.length > 0 && (
          <div className="bg-white dark:bg-card border border-t-0 border-border p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Buscar por</Label>
                <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as typeof tipoFiltro)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="numero">Número</SelectItem>
                    <SelectItem value="fecha">Fecha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Valor de búsqueda</Label>
                <Input
                  placeholder="Buscar..."
                  value={valorFiltro}
                  onChange={e => { setValorFiltro(e.target.value); setCurrentPage(1); }}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Tipo de documento</Label>
                <Select value={filtroTipoDoc} onValueChange={(v) => { setFiltroTipoDoc(v as typeof filtroTipoDoc); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="01">Facturas</SelectItem>
                    <SelectItem value="03">Boletas</SelectItem>
                    <SelectItem value="07">Notas de Crédito</SelectItem>
                    <SelectItem value="08">Notas de Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Tabla */}
        {comprobantes.length > 0 && (
          <div className="bg-white dark:bg-card border border-t-0 border-border rounded-b-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium">Número</th>
                    <th className="px-4 py-3 text-left font-medium">Cliente</th>
                    <th className="px-4 py-3 text-left font-medium">RUC/DNI</th>
                    <th className="px-4 py-3 text-left font-medium">Fecha</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-center font-medium">Estado SUNAT</th>
                    <th className="px-4 py-3 text-center font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        No se encontraron comprobantes con ese criterio
                      </td>
                    </tr>
                  ) : (
                    paginados.map(comp => (
                      <tr key={comp.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {getTipoLabel(comp.tipo_doc)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{comp.numero_completo}</td>
                        <td className="px-4 py-3">{comp.cliente_razon_social}</td>
                        <td className="px-4 py-3 font-mono text-xs">{comp.cliente_num_doc}</td>
                        <td className="px-4 py-3 text-xs">{comp.fecha_emision}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatCurrency(comp.mto_imp_venta)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                            Pendiente
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedComprobante(comp); setIsDetailModalOpen(true); }}
                              className="h-8 w-8 p-0"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleReenviar(comp)}
                              disabled={reenvioLoading === comp.id}
                              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              title="Reenviar a SUNAT"
                            >
                              {reenvioLoading === comp.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {comp.nubefact_pdf_url && (
                                  <DropdownMenuItem onClick={() => window.open(comp.nubefact_pdf_url, '_blank')}>
                                    <FileDown className="h-4 w-4 mr-2" />
                                    Descargar PDF
                                  </DropdownMenuItem>
                                )}
                                {comp.nubefact_xml_url && (
                                  <DropdownMenuItem onClick={() => window.open(comp.nubefact_xml_url, '_blank')}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Descargar XML
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => void handleReenviar(comp)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Reenviar a SUNAT
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Mostrar:</Label>
                <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">
                  Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, comprobantesFiltrados.length)} de {comprobantesFiltrados.length}
                </span>
              </div>
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
          </div>
        )}

        {/* Modal Ver Detalles */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles del Comprobante</DialogTitle>
              <DialogDescription>
                Comprobante pendiente de sincronización con SUNAT
              </DialogDescription>
            </DialogHeader>
            {selectedComprobante && (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Este comprobante aún no ha sido aceptado por SUNAT
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <p className="font-medium">{getTipoLabel(selectedComprobante.tipo_doc)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Número</Label>
                    <p className="font-mono font-medium">{selectedComprobante.numero_completo}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cliente</Label>
                    <p className="font-medium">{selectedComprobante.cliente_razon_social}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">RUC/DNI</Label>
                    <p className="font-mono">{selectedComprobante.cliente_num_doc}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha de Emisión</Label>
                    <p>{selectedComprobante.fecha_emision}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Moneda</Label>
                    <p>{selectedComprobante.moneda === 'PEN' ? 'Soles (PEN)' : 'Dólares (USD)'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Op. Gravadas</Label>
                    <p className="font-semibold">{formatCurrency(selectedComprobante.mto_oper_gravadas || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">IGV</Label>
                    <p className="font-semibold">{formatCurrency(selectedComprobante.mto_igv || 0)}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <p className="text-lg font-bold">{formatCurrency(selectedComprobante.mto_imp_venta)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Forma de Pago</Label>
                    <p>{selectedComprobante.forma_pago}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estado SUNAT</Label>
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300">
                      Pendiente
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Cerrar</Button>
              {selectedComprobante && (
                <Button
                  onClick={() => { void handleReenviar(selectedComprobante); setIsDetailModalOpen(false); }}
                  disabled={reenvioLoading === selectedComprobante.id}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Reenviar a SUNAT
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
