import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Pencil, Trash2, Plus, Download, RefreshCw, ChevronLeft, ChevronRight, Receipt, FileText, X, Save } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
  estado_sunat: string;
  nubefact_aceptada_por_sunat: boolean;
  nubefact_pdf_url?: string;
  nubefact_xml_url?: string;
  nubefact_cdr_url?: string;
  anulado: boolean;
  pagado: boolean;
  forma_pago: string;
}

interface DetalleItem {
  id: string;
  codigo_producto: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  afecto_stock: boolean;
}

interface FormDataCPE {
  tipo_doc: string;
  serie: string;
  establecimiento: string;
  tipo_operacion: string;
  moneda: string;
  cliente_num_doc: string;
  cliente_razon_social: string;
  cliente_direccion: string;
  es_contingencia: boolean;
  es_pago_anticipado: boolean;
  fecha_emision: string;
  fecha_vencimiento: string;
  tipo_cambio: string;
  condicion_pago: string;
  vendedor: string;
  modalidad_pago: string;
  banco_destino: string;
  monto_pago: string;
  observaciones: string;
}

export default function BoletasFacturas() {
  const [comprobantes, setComprobantes] = useState<Comprobante[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'cliente' | 'numero' | 'fecha' | 'tipo'>('cliente');
  const [valorFiltro, setValorFiltro] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedComprobante, setSelectedComprobante] = useState<Comprobante | null>(null);
  const [detalleItems, setDetalleItems] = useState<DetalleItem[]>([]);
  const [formData, setFormData] = useState<FormDataCPE>({
    tipo_doc: '01',
    serie: 'F001',
    establecimiento: 'principal',
    tipo_operacion: '01',
    moneda: 'PEN',
    cliente_num_doc: '',
    cliente_razon_social: '',
    cliente_direccion: '',
    es_contingencia: false,
    es_pago_anticipado: false,
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: new Date().toISOString().split('T')[0],
    tipo_cambio: '1.00',
    condicion_pago: 'Contado',
    vendedor: '',
    modalidad_pago: 'Efectivo',
    banco_destino: 'CAJA GENERAL - MARURI',
    monto_pago: '',
    observaciones: '',
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [empresaData, setEmpresaData] = useState({
    razon_social: 'SPACEDEVPR S.A.C.',
    ruc: '20434906301',
    direccion: 'Av. Los Pinos 456 - Miraflores - Lima',
    email: 'ventas@spacedev.com.pe',
    telefono: '01-4567890',
    direccion_completa: 'Av. Los Pinos 456, Miraflores, Lima - PerÃº'
  });
  const [filtroTipoDoc, setFiltroTipoDoc] = useState<'todos' | '01' | '03'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'aceptado' | 'pendiente' | 'rechazado'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchComprobantes = useCallback(async () => {
    try {
      const response = await api.comprobantes.listar();
      const data = response.data;
      const comprobantesData = (Array.isArray(data) ? data : (data as { data?: unknown[] }).data) || [];
      
      // Mapear datos a la interfaz Comprobante
      const mappedComprobantes: Comprobante[] = comprobantesData.map((item: unknown) => {
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
          estado_sunat: comp.estado_sunat as string || '',
          nubefact_aceptada_por_sunat: comp.nubefact_aceptada_por_sunat as boolean || false,
          nubefact_pdf_url: comp.nubefact_pdf_url as string,
          nubefact_xml_url: comp.nubefact_xml_url as string,
          nubefact_cdr_url: comp.nubefact_cdr_url as string,
          anulado: comp.anulado as boolean || false,
          pagado: comp.pagado as boolean || false,
          forma_pago: comp.forma_pago as string || 'Contado',
        };
      });
      
      setComprobantes(mappedComprobantes);
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo cargar la lista de comprobantes',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComprobantes();
  }, [fetchComprobantes]);

  // Filtrar comprobantes
  const comprobantesFiltrados = comprobantes.filter((comp) => {
    // Filtro por tipo de documento
    if (filtroTipoDoc !== 'todos' && comp.tipo_doc !== filtroTipoDoc) {
      return false;
    }

    // Filtro por estado
    if (filtroEstado !== 'todos') {
      if (filtroEstado === 'aceptado' && !comp.nubefact_aceptada_por_sunat) return false;
      if (filtroEstado === 'pendiente' && comp.nubefact_aceptada_por_sunat) return false;
      if (filtroEstado === 'rechazado' && (comp.nubefact_aceptada_por_sunat || comp.estado_sunat === 'pendiente')) return false;
    }

    // Filtro por bÃºsqueda
    if (!valorFiltro) return true;

    const valorBusqueda = valorFiltro.toLowerCase();
    switch (tipoFiltro) {
      case 'cliente':
        return comp.cliente_razon_social.toLowerCase().includes(valorBusqueda);
      case 'numero':
        return comp.numero_completo.toLowerCase().includes(valorBusqueda);
      case 'fecha':
        return comp.fecha_emision.includes(valorFiltro);
      case 'tipo':
        return comp.tipo_doc.includes(valorFiltro);
      default:
        return true;
    }
  });

  // PaginaciÃ³n
  const totalPages = Math.ceil(comprobantesFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const comprobantesPaginados = comprobantesFiltrados.slice(startIndex, startIndex + itemsPerPage);

  const handleVerDetalles = (comprobante: Comprobante) => {
    setSelectedComprobante(comprobante);
    setIsDetailModalOpen(true);
  };

  const handleNuevoComprobante = () => {
    setIsCreateModalOpen(true);
  };

  const handleAgregarItem = () => {
    const nuevoItem: DetalleItem = {
      id: Date.now().toString(),
      codigo_producto: '',
      descripcion: '',
      unidad: 'NIU',
      cantidad: 1,
      precio_unitario: 0,
      subtotal: 0,
      afecto_stock: true,
    };
    setDetalleItems([...detalleItems, nuevoItem]);
  };

  const handleEliminarItem = (id: string) => {
    setDetalleItems(detalleItems.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof DetalleItem, value: string | number | boolean) => {
    setDetalleItems(detalleItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'cantidad' || field === 'precio_unitario') {
          updated.subtotal = updated.cantidad * updated.precio_unitario;
        }
        return updated;
      }
      return item;
    }));
  };

  const calcularTotal = () => {
    return detalleItems.reduce((total, item) => total + item.subtotal, 0);
  };

  const handleGuardarCPE = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info('PrÃ³ximamente', {
      description: 'La funcionalidad de guardar comprobantes estarÃ¡ disponible pronto',
    });
  };

  const handleVerificarSunat = (comprobante: Comprobante) => {
    toast.info('Verificando', {
      description: `Verificando estado de ${comprobante.numero_completo} en SUNAT`,
    });
  };

  const getEstadoBadge = (comprobante: Comprobante) => {
    if (comprobante.anulado) {
      return <Badge className="bg-red-500 text-white dark:bg-red-400 dark:text-gray-900 border-0">Anulado</Badge>;
    }
    if (comprobante.nubefact_aceptada_por_sunat) {
      return <Badge className="bg-green-500 text-white dark:bg-green-400 dark:text-gray-900 border-0">Aceptado</Badge>;
    }
    if (comprobante.estado_sunat === 'pendiente') {
      return <Badge className="bg-yellow-500 text-white dark:bg-yellow-400 dark:text-gray-900 border-0">Pendiente</Badge>;
    }
    return <Badge className="bg-gray-500 text-white dark:bg-gray-400 dark:text-gray-900 border-0">Desconocido</Badge>;
  };

  const getTipoDocLabel = (tipo: string) => {
    switch (tipo) {
      case '01': return 'Factura';
      case '03': return 'Boleta';
      case '07': return 'N. CrÃ©dito';
      case '08': return 'N. DÃ©bito';
      default: return tipo;
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('es-PE');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleLimpiarFiltros = () => {
    setValorFiltro('');
    setFiltroTipoDoc('todos');
    setFiltroEstado('todos');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-100">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Cargando comprobantes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 dark:text-white" />
            <span className="dark:text-white">Boletas y Facturas</span>
          </h1>
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white dark:bg-green-400 dark:hover:bg-green-500 dark:text-gray-900 border-0"
            onClick={handleNuevoComprobante}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo CPE
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-muted/50 px-4 py-4 border-x border-border">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
              <select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value as 'cliente' | 'numero' | 'fecha' | 'tipo')}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-white dark:bg-background"
              >
                <option value="cliente">Por Cliente</option>
                <option value="numero">Por NÃºmero</option>
                <option value="fecha">Por Fecha</option>
                <option value="tipo">Por Tipo</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Input
                type={tipoFiltro === 'fecha' ? 'date' : 'text'}
                placeholder={`Buscar por ${tipoFiltro}...`}
                className="bg-white dark:bg-background"
                value={valorFiltro}
                onChange={(e) => setValorFiltro(e.target.value)}
              />
            </div>
            <div>
              <select
                value={filtroTipoDoc}
                onChange={(e) => setFiltroTipoDoc(e.target.value as 'todos' | '01' | '03')}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-white dark:bg-background"
              >
                <option value="todos">Todos los tipos</option>
                <option value="01">Facturas</option>
                <option value="03">Boletas</option>
              </select>
            </div>
            <div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'aceptado' | 'pendiente' | 'rechazado')}
                className="w-full px-3 py-2 text-sm border border-border rounded bg-white dark:bg-background"
              >
                <option value="todos">Todos los estados</option>
                <option value="aceptado">Aceptado</option>
                <option value="pendiente">Pendiente</option>
                <option value="rechazado">Rechazado</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => setCurrentPage(1)}
              >
                Buscar
              </Button>
              <Button
                variant="outline"
                onClick={handleLimpiarFiltros}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-card rounded-b-lg border border-t-0 border-border shadow-sm">
          {comprobantesPaginados.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No se encontraron comprobantes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-primary hover:bg-primary">
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary-foreground">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary-foreground">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary-foreground">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary-foreground">NÃºmero</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary-foreground">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary-foreground">Moneda</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-primary-foreground">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-primary-foreground">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-primary-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {comprobantesPaginados.map((comp, index) => (
                    <tr key={comp.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        {formatDate(comp.fecha_emision)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <Badge variant="outline" className="font-normal">
                          {getTipoDocLabel(comp.tipo_doc)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        {comp.numero_completo}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{comp.cliente_razon_social}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {comp.cliente_num_doc}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {comp.moneda}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-right">
                        {formatCurrency(comp.mto_imp_venta)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {getEstadoBadge(comp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:text-white dark:hover:bg-blue-900/20"
                            onClick={() => handleVerDetalles(comp)}
                            title="Ver detalles"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {comp.nubefact_pdf_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              onClick={() => window.open(comp.nubefact_pdf_url, '_blank')}
                              title="Descargar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/20"
                            onClick={() => handleVerificarSunat(comp)}
                            title="Verificar SUNAT"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          {!comp.anulado && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              onClick={() => {
                                toast.info('PrÃ³ximamente', {
                                  description: 'La funcionalidad de anular comprobantes estarÃ¡ disponible pronto',
                                });
                              }}
                              title="Anular"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PaginaciÃ³n - Estilo Clientes */}
          <div className="px-4 py-3 border-t border-border bg-white dark:bg-card">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Mostrar</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-sm border border-border rounded bg-background text-foreground"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
                <span className="text-sm text-muted-foreground">
                  registros | Mostrando {comprobantesFiltrados.length > 0 ? startIndex + 1 : 0} a {Math.min(startIndex + itemsPerPage, comprobantesFiltrados.length)} de {comprobantesFiltrados.length}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || totalPages === 0}
                  className="px-3 py-1 text-sm border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                {totalPages > 0 && Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-sm border border-border rounded transition-colors ${
                        currentPage === page
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1 text-sm border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Detalles */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles del Comprobante</DialogTitle>
              <DialogDescription>
                {selectedComprobante ? selectedComprobante.numero_completo : ''}
              </DialogDescription>
            </DialogHeader>
            {selectedComprobante && (
              <div className="space-y-6 py-4">
                {/* InformaciÃ³n General */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <p className="text-sm font-medium">{getTipoDocLabel(selectedComprobante.tipo_doc)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">NÃºmero</Label>
                    <p className="text-sm font-medium">{selectedComprobante.numero_completo}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha EmisiÃ³n</Label>
                    <p className="text-sm font-medium">{formatDate(selectedComprobante.fecha_emision)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Moneda</Label>
                    <p className="text-sm font-medium">{selectedComprobante.moneda}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Forma de Pago</Label>
                    <p className="text-sm font-medium">{selectedComprobante.forma_pago}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estado</Label>
                    <div className="mt-1">{getEstadoBadge(selectedComprobante)}</div>
                  </div>
                </div>

                {/* Cliente */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Cliente</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">RazÃ³n Social</Label>
                      <p className="text-sm font-medium">{selectedComprobante.cliente_razon_social}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Documento</Label>
                      <p className="text-sm font-medium">{selectedComprobante.cliente_num_doc}</p>
                    </div>
                  </div>
                </div>

                {/* Montos */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Montos</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Total</Label>
                      <p className="text-lg font-bold text-primary">{formatCurrency(selectedComprobante.mto_imp_venta)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Estado de Pago</Label>
                      <p className="text-sm font-medium">
                        {selectedComprobante.pagado ? (
                          <Badge className="bg-green-500 text-white border-0">Pagado</Badge>
                        ) : (
                          <Badge className="bg-orange-500 text-white border-0">Pendiente</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Archivos */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Archivos</h3>
                  <div className="flex gap-2">
                    {selectedComprobante.nubefact_pdf_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(selectedComprobante.nubefact_pdf_url, '_blank')}
                        className="text-red-600 border-red-200"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar PDF
                      </Button>
                    )}
                    {selectedComprobante.nubefact_xml_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(selectedComprobante.nubefact_xml_url, '_blank')}
                        className="text-blue-600 border-blue-200"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar XML
                      </Button>
                    )}
                    {selectedComprobante.nubefact_cdr_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(selectedComprobante.nubefact_cdr_url, '_blank')}
                        className="text-green-600 border-green-200"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar CDR
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Crear CPE */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Comprobante de Pago</DialogTitle>
              <DialogDescription>
                Complete los datos del comprobante electrÃ³nico. Los campos marcados son obligatorios.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleGuardarCPE} className="space-y-6">
              {/* InformaciÃ³n de la Empresa */}
              <div className="bg-muted/50 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 text-primary">ðŸ“‹ InformaciÃ³n de la Empresa</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Logo */}
                  <div className="space-y-3">
                    <Label htmlFor="logo" className="text-sm font-medium">Logo de la Empresa</Label>
                    <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 text-center">
                      {logoPreview ? (
                        <div className="space-y-2">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="w-24 h-24 object-contain mx-auto rounded"
                          />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setLogoPreview(null);
                              const input = document.getElementById('logo') as HTMLInputElement;
                              if (input) input.value = '';
                            }}
                          >
                            Cambiar logo
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            id="logo"
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            className="cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  toast.error('Archivo muy grande', {
                                    description: 'El logo no debe superar los 2MB'
                                  });
                                  e.target.value = '';
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  setLogoPreview(e.target?.result as string);
                                };
                                reader.readAsDataURL(file);
                                toast.success('Logo cargado correctamente');
                              }
                            }}
                          />
                          <p className="text-xs text-muted-foreground">PNG/JPG â€¢ MÃ¡x 2MB</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Datos principales */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="empresa_razon_social" className="text-sm font-medium">RazÃ³n Social *</Label>
                        <Input
                          id="empresa_razon_social"
                          value={empresaData.razon_social}
                          onChange={(e) => setEmpresaData(prev => ({ ...prev, razon_social: e.target.value }))}
                          className="font-semibold"
                        />
                      </div>
                      <div>
                        <Label htmlFor="empresa_ruc" className="text-sm font-medium">RUC *</Label>
                        <Input
                          id="empresa_ruc"
                          value={empresaData.ruc}
                          onChange={(e) => setEmpresaData(prev => ({ ...prev, ruc: e.target.value }))}
                          placeholder="20123456789"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="empresa_direccion" className="text-sm font-medium">DirecciÃ³n Fiscal *</Label>
                      <Input
                        id="empresa_direccion"
                        value={empresaData.direccion_completa}
                        onChange={(e) => setEmpresaData(prev => ({ ...prev, direccion_completa: e.target.value }))}
                        placeholder="Av. Ejemplo 123, Distrito, Provincia - Departamento"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="empresa_email" className="text-sm font-medium">Email</Label>
                        <Input
                          id="empresa_email"
                          type="email"
                          value={empresaData.email}
                          onChange={(e) => setEmpresaData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="ventas@empresa.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="empresa_telefono" className="text-sm font-medium">TelÃ©fono</Label>
                        <Input
                          id="empresa_telefono"
                          value={empresaData.telefono}
                          onChange={(e) => setEmpresaData(prev => ({ ...prev, telefono: e.target.value }))}
                          placeholder="01-1234567"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    ðŸ’¡ <strong>Tip:</strong> Esta informaciÃ³n aparecerÃ¡ en todos los comprobantes. 
                    PrÃ³ximamente podrÃ¡s guardar esta configuraciÃ³n en las preferencias.
                  </p>
                </div>
              </div>

              {/* ConfiguraciÃ³n del Comprobante */}
              <div className="bg-muted/50 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 text-primary">âš™ï¸ ConfiguraciÃ³n del Comprobante</h3>
                {/* Checkboxes especiales */}
                <div className="flex flex-wrap gap-6 mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="contingencia"
                      checked={formData.es_contingencia}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, es_contingencia: checked as boolean }))
                      }
                    />
                    <label htmlFor="contingencia" className="text-sm font-medium">
                      ðŸš¨ Comprobante de contingencia
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pago-anticipado"
                      checked={formData.es_pago_anticipado}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, es_pago_anticipado: checked as boolean }))
                      }
                    />
                    <label htmlFor="pago-anticipado" className="text-sm font-medium">
                      ðŸ’° Pago anticipado
                    </label>
                  </div>
                </div>
              </div>

              {/* Datos del Comprobante */}
              <div className="bg-muted/50 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 text-primary">ðŸ“œ Datos del Comprobante</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-medium">Tipo de Comprobante *</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={formData.tipo_doc}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo_doc: e.target.value }))}
                    >
                      <option value="01">ðŸ§¾ Factura ElectrÃ³nica</option>
                      <option value="03">ðŸŽ« Boleta ElectrÃ³nica</option>
                      <option value="07">âš ï¸ Nota de CrÃ©dito</option>
                      <option value="08">âš¡ Nota de DÃ©bito</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Serie *</Label>
                    <Input
                      value={formData.serie}
                      onChange={(e) => setFormData(prev => ({ ...prev, serie: e.target.value }))}
                      placeholder="F001"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Establecimiento *</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={formData.establecimiento}
                      onChange={(e) => setFormData(prev => ({ ...prev, establecimiento: e.target.value }))}
                      >
                      <option value="principal">ðŸ¢ Oficina Principal</option>
                      <option value="sucursal1">ðŸ¢ Sucursal 1</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Tipo OperaciÃ³n *</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={formData.tipo_operacion}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo_operacion: e.target.value }))}
                    >
                      <option value="0101">ðŸ‡µðŸ‡ª Venta Interna</option>
                      <option value="0200">ðŸŒ ExportaciÃ³n</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Moneda *</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={formData.moneda}
                      onChange={(e) => setFormData(prev => ({ ...prev, moneda: e.target.value }))}
                    >
                      <option value="PEN">ðŸ’µ Soles (PEN)</option>
                      <option value="USD">ðŸ’µ DÃ³lares (USD)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* InformaciÃ³n del Cliente */}
              <div className="bg-muted/50 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 text-primary">ðŸ‘¥ InformaciÃ³n del Cliente</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label className="text-sm font-medium">NÃºmero de Documento *</Label>
                    <Input
                      value={formData.cliente_num_doc}
                      onChange={(e) => setFormData(prev => ({ ...prev, cliente_num_doc: e.target.value }))}
                      placeholder="RUC o DNI"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium">RazÃ³n Social / Nombre *</Label>
                    <Input
                      value={formData.cliente_razon_social}
                      onChange={(e) => setFormData(prev => ({ ...prev, cliente_razon_social: e.target.value }))}
                      placeholder="Nombre del cliente"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">DirecciÃ³n *</Label>
                  <Input
                    value={formData.cliente_direccion}
                    onChange={(e) => setFormData(prev => ({ ...prev, cliente_direccion: e.target.value }))}
                    placeholder="DirecciÃ³n del cliente"
                  />
                </div>
              </div>

              {/* Fechas y Condiciones */}
              <div className="bg-muted/50 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 text-primary">ðŸ—º Fechas y Condiciones de Pago</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Fecha EmisiÃ³n *</Label>
                    <Input
                      type="date"
                      value={formData.fecha_emision}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha_emision: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Fecha Vencimiento</Label>
                    <Input
                      type="date"
                      value={formData.fecha_vencimiento}
                      onChange={(e) => setFormData(prev => ({ ...prev, fecha_vencimiento: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Tipo de Cambio</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={formData.tipo_cambio}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo_cambio: e.target.value }))}
                      placeholder="3.750"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">CondiciÃ³n de Pago *</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={formData.condicion_pago}
                      onChange={(e) => setFormData(prev => ({ ...prev, condicion_pago: e.target.value }))}
                    >
                      <option value="Contado">ðŸ’µ Contado</option>
                      <option value="Credito">ðŸ“… CrÃ©dito</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Vendedor</Label>
                    <Input
                      value={formData.vendedor}
                      onChange={(e) => setFormData(prev => ({ ...prev, vendedor: e.target.value }))}
                      placeholder="Nombre del vendedor"
                    />
                  </div>
                </div>
              </div>

              {/* Modalidad de Pago */}
              <div className="bg-muted/50 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 text-primary">ðŸ’³ Modalidad de Pago</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Modalidad de Pago</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={formData.modalidad_pago}
                      onChange={(e) => setFormData(prev => ({ ...prev, modalidad_pago: e.target.value }))}
                    >
                      <option value="Efectivo">ðŸ’µ Efectivo</option>
                      <option value="Transferencia">ðŸ¦ Transferencia</option>
                      <option value="Tarjeta">ðŸ’³ Tarjeta</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Banco Destino</Label>
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                      value={formData.banco_destino}
                      onChange={(e) => setFormData(prev => ({ ...prev, banco_destino: e.target.value }))}
                    >
                      <option value="CAJA GENERAL - MARURI">ðŸ¦ Caja General - Maruri</option>
                      <option value="BCP">ðŸ¦ BCP</option>
                      <option value="BBVA">ðŸ¦ BBVA</option>
                      <option value="Interbank">ðŸ¦ Interbank</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Monto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.monto_pago}
                      onChange={(e) => setFormData(prev => ({ ...prev, monto_pago: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Detalle de Productos/Servicios */}
              <div className="bg-muted/50 p-6 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-primary">ðŸ“¦ Detalle de Productos/Servicios</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAgregarItem}
                    className="bg-green-500 hover:bg-green-600 text-white border-green-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </Button>
                </div>
                
                <div className="border rounded-lg overflow-hidden bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead className="w-20 text-center">Stock</TableHead>
                        <TableHead className="w-32">CÃ³digo</TableHead>
                        <TableHead className="min-w-50">DescripciÃ³n</TableHead>
                        <TableHead className="w-24">Unidad</TableHead>
                        <TableHead className="w-24 text-right">Cantidad</TableHead>
                        <TableHead className="w-28 text-right">P. Unitario</TableHead>
                        <TableHead className="w-28 text-right">Subtotal</TableHead>
                        <TableHead className="w-16 text-center">AcciÃ³n</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detalleItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            ðŸ“¦ No hay productos agregados
                            <br />
                            <span className="text-sm">Haz clic en "Agregar Producto" para comenzar</span>
                          </TableCell>
                        </TableRow>
                      ) : (
                        detalleItems.map((item, index) => (
                          <TableRow key={item.id} className="hover:bg-muted/30">
                            <TableCell className="text-center font-medium">{index + 1}</TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={item.afecto_stock}
                                onCheckedChange={(checked) =>
                                  handleItemChange(item.id, 'afecto_stock', checked)
                                }
                                title="Afecto a stock"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.codigo_producto}
                                onChange={(e) =>
                                  handleItemChange(item.id, 'codigo_producto', e.target.value)
                                }
                                placeholder="COD001"
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.descripcion}
                                onChange={(e) =>
                                  handleItemChange(item.id, 'descripcion', e.target.value)
                                }
                                placeholder="DescripciÃ³n del producto"
                                className="h-8 text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <select
                                className="w-full border rounded-md px-2 py-1 text-sm h-8 bg-background"
                                value={item.unidad}
                                onChange={(e) =>
                                  handleItemChange(item.id, 'unidad', e.target.value)
                                }
                              >
                                <option value="NIU">Unidad</option>
                                <option value="ZZ">Servicio</option>
                                <option value="KGM">Kilogramo</option>
                                <option value="MTR">Metro</option>
                              </select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.cantidad}
                                onChange={(e) =>
                                  handleItemChange(item.id, 'cantidad', parseFloat(e.target.value) || 0)
                                }
                                className="h-8 text-right text-sm"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.precio_unitario}
                                onChange={(e) =>
                                  handleItemChange(item.id, 'precio_unitario', parseFloat(e.target.value) || 0)
                                }
                                className="h-8 text-right text-sm"
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-right">
                              <span className="text-primary">
                                {formatCurrency(item.subtotal)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEliminarItem(item.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Eliminar producto"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Observaciones */}
              <div className="bg-muted/50 p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4 text-primary">ðŸ“ Observaciones</h3>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-20 bg-background"
                  value={formData.observaciones}
                  onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Observaciones adicionales del comprobante..."
                />
              </div>

              {/* Total */}
              <div className="flex justify-end">
                <div className="bg-primary/10 dark:bg-primary/20 px-8 py-6 rounded-lg border-2 border-primary/20">
                  <p className="text-sm text-muted-foreground mb-2 text-center">TOTAL {formData.moneda === 'PEN' ? 'SOLES' : 'DÃ“LARES'}</p>
                  <p className="text-4xl font-bold text-primary text-center">
                    {formatCurrency(calcularTotal())}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 text-center">
                    {detalleItems.length} {detalleItems.length === 1 ? 'producto' : 'productos'}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Comprobante
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
