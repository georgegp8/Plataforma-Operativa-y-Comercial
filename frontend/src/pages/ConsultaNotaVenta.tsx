import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, ShoppingBag, RefreshCw,
  Eye, FileCheck, MoreVertical, FileText,
} from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { api, type NotaVenta } from '@/lib/api';
import { formatCurrency } from '@/lib/format';

export default function ConsultaNotaVenta() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NotaVenta[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [totales, setTotales] = useState({
    total_busqueda: 0,
    total_documentos: 0,
    total_por_cobrar: 0,
  });

  // Filtros
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'cliente' | 'numero' | 'fecha'>('cliente');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pagado' | 'pendiente'>('todos');

  // Modal detalle
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedNota, setSelectedNota] = useState<NotaVenta | null>(null);

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [resLista, resTotales] = await Promise.allSettled([
        api.notasVenta.listar({ per_page: 500, sort_by: 'id', sort_order: 'desc' }),
        api.notasVenta.resumenTotales(),
      ]);

      if (resLista.status === 'fulfilled') {
        const raw = resLista.value.data;
        const lista = (Array.isArray(raw) ? raw : (raw as { data?: NotaVenta[] }).data) ?? [];
        setData(lista);
      }

      if (resTotales.status === 'fulfilled') {
        const t = (resTotales.value.data as unknown as { data?: typeof totales }).data
          ?? resTotales.value.data as unknown as typeof totales;
        setTotales({
          total_busqueda: t?.total_busqueda ?? 0,
          total_documentos: t?.total_documentos ?? 0,
          total_por_cobrar: t?.total_por_cobrar ?? 0,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar notas de venta');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  // ─── Filtrado ─────────────────────────────────────────────────────────────
  const datosFiltrados = data.filter(item => {
    if (filtroEstado !== 'todos') {
      if (filtroEstado === 'pagado' && !item.pagado) return false;
      if (filtroEstado === 'pendiente' && item.pagado) return false;
    }
    if (!filtroBusqueda) return true;
    const v = filtroBusqueda.toLowerCase();
    if (filtroTipo === 'cliente') return item.cliente_razon_social.toLowerCase().includes(v);
    if (filtroTipo === 'numero') return `${item.serie}-${item.numero}`.toLowerCase().includes(v);
    if (filtroTipo === 'fecha') return item.fecha_emision.includes(filtroBusqueda);
    return true;
  });

  const totalPages = Math.ceil(datosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const dataPaginada = datosFiltrados.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-sm text-muted-foreground">Cargando notas de venta...</p>
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
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Notas de Venta
          </h1>
          <Button onClick={() => void loadData()} variant="secondary" size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-0">
            <RefreshCw className="h-4 w-4 mr-2" />Actualizar
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div>
              <Label className="text-xs mb-1 block">Buscar por</Label>
              <Select value={filtroTipo} onValueChange={v => setFiltroTipo(v as typeof filtroTipo)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="numero">Número N.V.</SelectItem>
                  <SelectItem value="fecha">Fecha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Valor de búsqueda</Label>
              <Input placeholder="Buscar..." value={filtroBusqueda}
                onChange={e => { setFiltroBusqueda(e.target.value); setCurrentPage(1); }}
                className="h-9" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Estado de pago</Label>
              <Select value={filtroEstado} onValueChange={v => { setFiltroEstado(v as typeof filtroEstado); setCurrentPage(1); }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Total por cobrar</Label>
              <div className="bg-primary/10 text-primary px-3 h-9 rounded border border-primary/25 font-bold text-sm flex items-center justify-center">
                {formatCurrency(totales.total_por_cobrar)}
              </div>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-card border border-t-0 border-border rounded-b-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-center font-medium">N.V.</th>
                  <th className="px-4 py-3 text-left font-medium">Método Pago</th>
                  <th className="px-4 py-3 text-center font-medium">Pagado</th>
                  <th className="px-4 py-3 text-center font-medium">CPE</th>
                  <th className="px-4 py-3 text-left font-medium">Motivo</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-center font-medium">Estado</th>
                  <th className="px-4 py-3 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {dataPaginada.length === 0 ? (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                    No se encontraron notas de venta
                  </td></tr>
                ) : (
                  dataPaginada.map((item, index) => (
                    <tr key={item.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors text-xs">
                      <td className="px-4 py-3 text-muted-foreground">{startIndex + index + 1}</td>
                      <td className="px-4 py-3">{item.fecha_emision}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.cliente_razon_social}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{item.cliente_num_doc}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-semibold">
                        {item.serie}-{item.numero}
                      </td>
                      <td className="px-4 py-3">{item.metodo_pago}</td>
                      <td className="px-4 py-3 text-center">
                        {item.pagado
                          ? <FileCheck className="h-4 w-4 text-green-600 mx-auto" />
                          : <span className="text-destructive font-bold">–</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.cpe_relacionado
                          ? <span className="text-blue-600 dark:text-blue-400 font-semibold font-mono">
                              {item.cpe_relacionado}
                            </span>
                          : <span className="text-muted-foreground">–</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{item.motivo || '–'}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={item.pagado
                          ? 'bg-green-500 text-white border-0 text-[10px]'
                          : 'bg-yellow-500 text-white border-0 text-[10px]'}>
                          {item.estado_pago || (item.pagado ? 'Pagado' : 'Pendiente')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                            onClick={() => { setSelectedNota(item); setIsDetailModalOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={!!item.cpe_relacionado}
                                onClick={() => toast.info('Función disponible próximamente')}>
                                <FileText className="h-4 w-4 mr-2" />
                                Generar CPE
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

          {/* Totales búsqueda */}
          {datosFiltrados.length > 0 && (
            <div className="px-4 py-3 border-t border-border flex flex-col items-end gap-1 text-sm">
              <div className="flex items-center gap-8 font-semibold">
                <span className="text-muted-foreground">Total búsqueda:</span>
                <span>{formatCurrency(totales.total_busqueda)}</span>
              </div>
              <div className="flex items-center gap-8 font-bold">
                <span className="text-muted-foreground">Total documentos:</span>
                <span>{formatCurrency(totales.total_documentos)}</span>
              </div>
            </div>
          )}

          {/* Paginación */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Mostrar:</Label>
              <Select value={String(itemsPerPage)} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {datosFiltrados.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + itemsPerPage, datosFiltrados.length)} de {datosFiltrados.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Página {currentPage} de {totalPages || 1}</span>
              <Button variant="outline" size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Detalle */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Detalle Nota de Venta</DialogTitle>
              <DialogDescription>Información completa del documento</DialogDescription>
            </DialogHeader>
            {selectedNota && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><Label className="text-xs text-muted-foreground">Número</Label>
                  <p className="font-mono font-semibold">{selectedNota.serie}-{selectedNota.numero}</p>
                </div>
                <div><Label className="text-xs text-muted-foreground">Fecha</Label>
                  <p>{selectedNota.fecha_emision}</p>
                </div>
                <div className="col-span-2"><Label className="text-xs text-muted-foreground">Cliente</Label>
                  <p className="font-medium">{selectedNota.cliente_razon_social}</p>
                  <p className="font-mono text-xs text-muted-foreground">{selectedNota.cliente_num_doc}</p>
                </div>
                <div><Label className="text-xs text-muted-foreground">Método de Pago</Label>
                  <p>{selectedNota.metodo_pago}</p>
                </div>
                <div><Label className="text-xs text-muted-foreground">Estado</Label>
                  <Badge className={selectedNota.pagado
                    ? 'bg-green-500 text-white border-0'
                    : 'bg-yellow-500 text-white border-0'}>
                    {selectedNota.estado_pago || (selectedNota.pagado ? 'Pagado' : 'Pendiente')}
                  </Badge>
                </div>
                {selectedNota.cpe_relacionado && (
                  <div className="col-span-2"><Label className="text-xs text-muted-foreground">CPE Relacionado</Label>
                    <p className="font-mono text-blue-600">{selectedNota.cpe_relacionado}</p>
                  </div>
                )}
                {selectedNota.motivo && (
                  <div className="col-span-2"><Label className="text-xs text-muted-foreground">Motivo</Label>
                    <p>{selectedNota.motivo}</p>
                  </div>
                )}
                <div className="col-span-2 pt-2 border-t">
                  <Label className="text-xs text-muted-foreground">Total</Label>
                  <p className="text-xl font-bold text-primary">{formatCurrency(selectedNota.total)}</p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
