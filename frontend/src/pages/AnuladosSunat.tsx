import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Eye, RefreshCw, ChevronLeft, ChevronRight, FileText, MoreVertical, FileDown, Printer, AlertCircle } from 'lucide-react';
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
  mto_oper_gratuitas?: number;
  mto_igv?: number;
  estado_sunat: string;
  nubefact_aceptada_por_sunat: boolean;
  nubefact_pdf_url?: string;
  nubefact_xml_url?: string;
  nubefact_cdr_url?: string;
  anulado: boolean;
  pagado: boolean;
  forma_pago: string;
}

export default function AnuladosSunat() {
  // --- Estado de la lista ---
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'cliente' | 'numero' | 'fecha' | 'tipo'>('cliente');
  const [valorFiltro, setValorFiltro] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedComprobante, setSelectedComprobante] = useState<Comprobante | null>(null);
  const [filtroTipoDoc, setFiltroTipoDoc] = useState<'todos' | '01' | '03' | '07' | '08'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- Carga de lista de comprobantes ---

  const fetchComprobantes = useCallback(async () => {
    try {
      const response = await api.comprobantes.listar({ per_page: 500, sort_by: 'id', sort_order: 'desc' });
      const data = response.data;
      const comprobantesData = (Array.isArray(data) ? data : (data as { data?: unknown[] }).data) || [];

      const mappedComprobantes: Comprobante[] = comprobantesData
        .map((item: unknown) => {
          const comp = item as Record<string, unknown>;
          return {
            id: comp.id as number,
            tipo_doc: comp.tipo_doc as string || '',
            serie: comp.serie as string || '',
            correlativo: comp.correlativo as string || '',
            numero_completo: comp.numero_completo as string || `${comp.serie}-${comp.correlativo}`,
            cliente_razon_social: comp.cliente_razon_social as string || '',
            cliente_num_doc: comp.cliente_num_doc as string || '',
            fecha_emision: comp.fecha_emision as string || '',
            moneda: comp.moneda as string || 'PEN',
            mto_imp_venta: typeof comp.mto_imp_venta === 'number' ? comp.mto_imp_venta : parseFloat(String(comp.mto_imp_venta || 0)),
            mto_oper_gravadas: typeof comp.mto_oper_gravadas === 'number' ? comp.mto_oper_gravadas : parseFloat(String(comp.mto_oper_gravadas || 0)),
            mto_oper_gratuitas: typeof comp.mto_oper_gratuitas === 'number' ? comp.mto_oper_gratuitas : parseFloat(String(comp.mto_oper_gratuitas || 0)),
            mto_igv: typeof comp.mto_igv === 'number' ? comp.mto_igv : parseFloat(String(comp.mto_igv || 0)),
            estado_sunat: comp.estado_sunat as string || '',
            nubefact_aceptada_por_sunat: comp.nubefact_aceptada_por_sunat as boolean || false,
            nubefact_pdf_url: comp.nubefact_pdf_url as string,
            nubefact_xml_url: comp.nubefact_xml_url as string,
            nubefact_cdr_url: comp.nubefact_cdr_url as string,
            anulado: comp.anulado as boolean || false,
            pagado: comp.pagado as boolean || false,
            forma_pago: comp.forma_pago as string || 'Contado',
          };
        })
        // Filtrar solo comprobantes anulados
        .filter(comp => comp.anulado === true);

      setComprobantes(mappedComprobantes);
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo cargar la lista de comprobantes anulados',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComprobantes();
  }, [fetchComprobantes]);

  // --- Funciones de la lista ---

  const comprobantesFiltrados = comprobantes.filter((comp) => {
    if (filtroTipoDoc !== 'todos' && comp.tipo_doc !== filtroTipoDoc) return false;
    if (!valorFiltro) return true;
    const valorBusqueda = valorFiltro.toLowerCase();
    switch (tipoFiltro) {
      case 'cliente': return comp.cliente_razon_social.toLowerCase().includes(valorBusqueda);
      case 'numero': return comp.numero_completo.toLowerCase().includes(valorBusqueda);
      case 'fecha': return comp.fecha_emision.includes(valorFiltro);
      case 'tipo': return comp.tipo_doc.includes(valorFiltro);
      default: return true;
    }
  });

  const totalPages = Math.ceil(comprobantesFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const comprobantesPaginados = comprobantesFiltrados.slice(startIndex, startIndex + itemsPerPage);

  const handleVerDetalles = (comprobante: Comprobante) => {
    setSelectedComprobante(comprobante);
    setIsDetailModalOpen(true);
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

  const descargarArchivo = async (url: string | undefined) => {
    if (!url) {
      toast.error('URL no disponible');
      return;
    }
    try {
      window.open(url, '_blank');
    } catch {
      toast.error('Error al abrir el archivo');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Cargando comprobantes anulados...</p>
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
        <div className="bg-red-600 text-white rounded-t-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Comprobantes Anulados SUNAT</h1>
          </div>
          <Button
            onClick={() => void fetchComprobantes()}
            variant="secondary"
            size="sm"
            className="bg-white/10 hover:bg-white/20 text-white border-0"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-card border border-t-0 border-border p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Buscar por</Label>
              <Select value={tipoFiltro} onValueChange={(value) => setTipoFiltro(value as typeof tipoFiltro)}>
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
                onChange={(e) => setValorFiltro(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Tipo de documento</Label>
              <Select value={filtroTipoDoc} onValueChange={(value) => setFiltroTipoDoc(value as typeof filtroTipoDoc)}>
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

        {/* Tabla */}
        <div className="bg-white dark:bg-card border border-t-0 border-border rounded-b-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Número</th>
                  <th className="px-4 py-3 text-left font-medium">Cliente</th>
                  <th className="px-4 py-3 text-left font-medium">RUC/DNI</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha Emisión</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-center font-medium">Estado</th>
                  <th className="px-4 py-3 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {comprobantesPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No hay comprobantes anulados
                    </td>
                  </tr>
                ) : (
                  comprobantesPaginados.map((comp) => (
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
                        <Badge className="bg-red-500 text-white dark:bg-red-400 dark:text-gray-900 border-0">
                          Anulado
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerDetalles(comp)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => descargarArchivo(comp.nubefact_pdf_url)}>
                                <FileDown className="h-4 w-4 mr-2" />
                                Descargar PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => descargarArchivo(comp.nubefact_xml_url)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Descargar XML
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.print()}>
                                <Printer className="h-4 w-4 mr-2" />
                                Imprimir
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
              <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, comprobantesFiltrados.length)} de {comprobantesFiltrados.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Página {currentPage} de {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Ver Detalles */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalles del Comprobante Anulado</DialogTitle>
              <DialogDescription>
                Información del comprobante que fue anulado en SUNAT
              </DialogDescription>
            </DialogHeader>
            {selectedComprobante && (
              <div className="space-y-4">
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-3">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Este comprobante ha sido anulado en SUNAT
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
                    <p className="text-lg font-bold text-red-600">{formatCurrency(selectedComprobante.mto_imp_venta)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Forma de Pago</Label>
                    <p>{selectedComprobante.forma_pago}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estado</Label>
                    <Badge className="bg-red-500 text-white dark:bg-red-400 dark:text-gray-900 border-0">
                      Anulado
                    </Badge>
                  </div>
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
