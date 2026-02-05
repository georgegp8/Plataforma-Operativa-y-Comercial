import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Pencil, Trash2, Plus, Download, RefreshCw, ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { GuiaRemision } from '@/lib/api';

export default function Traslados() {
  const [guias, setGuias] = useState<GuiaRemision[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGuia, setSelectedGuia] = useState<GuiaRemision | null>(null);
  
  // Filtros
  const [filtroDestinatario, setFiltroDestinatario] = useState('');
  const [filtroSerie, setFiltroSerie] = useState('');
  const [filtroNumero, setFiltroNumero] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const fetchGuias = useCallback(async () => {
    try {
      const response = await api.guiasRemision.listar({});
      const guiasData = response.data.data || response.data;
      setGuias(Array.isArray(guiasData) ? guiasData : []);
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo cargar la lista de traslados',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuias();
  }, [fetchGuias]);

  // Filtrar guías
  const guiasFiltradas = guias.filter((guia) => {
    if (filtroDestinatario && !guia.destinatario_denominacion?.toLowerCase().includes(filtroDestinatario.toLowerCase())) {
      return false;
    }
    if (filtroSerie && !guia.serie?.toLowerCase().includes(filtroSerie.toLowerCase())) {
      return false;
    }
    if (filtroNumero && !guia.numero?.toString().includes(filtroNumero)) {
      return false;
    }
    if (filtroFecha && guia.fecha_emision !== filtroFecha) {
      return false;
    }
    return true;
  });

  // Paginación
  const totalPages = Math.ceil(guiasFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const guiasPaginadas = guiasFiltradas.slice(startIndex, startIndex + itemsPerPage);

  const handleVerDetalles = (guia: GuiaRemision) => {
    setSelectedGuia(guia);
    setIsDetailModalOpen(true);
  };

  const handleDelete = (guia: GuiaRemision) => {
    setSelectedGuia(guia);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedGuia?.id) return;

    try {
      await api.guiasRemision.eliminar(selectedGuia.id);
      toast.success('Éxito', {
        description: 'Traslado eliminado correctamente',
      });
      setIsDeleteModalOpen(false);
      setSelectedGuia(null);
      fetchGuias();
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo eliminar el traslado',
      });
    }
  };

  const handleNuevoTraslado = () => {
    toast.info('Próximamente', {
      description: 'La creación de traslados estará disponible próximamente',
    });
  };

  const handleVerificarEstado = (guia: GuiaRemision) => {
    toast.info('Verificando', {
      description: `Verificando estado de guía ${guia.serie}-${guia.numero} en SUNAT`,
    });
  };

  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'aceptado': { variant: 'default', label: 'Aceptado' },
      'enviado': { variant: 'secondary', label: 'Enviado' },
      'pendiente': { variant: 'outline', label: 'Pendiente' },
    };
    const config = estados[estado] || { variant: 'outline' as const, label: estado };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleLimpiarFiltros = () => {
    setFiltroDestinatario('');
    setFiltroSerie('');
    setFiltroNumero('');
    setFiltroFecha('');
    setCurrentPage(1);
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleDateString('es-PE');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Cargando traslados...</p>
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
        <div className="bg-[#0f2c4c] text-white rounded-t-lg px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Listado de Traslados
          </h1>
          <Button
            size="sm"
            variant="secondary"
            className="bg-white text-[#0f2c4c] hover:bg-gray-100"
            onClick={handleNuevoTraslado}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-[#e5ddd5] dark:bg-muted/20 px-4 py-4 border-x border-b border-border">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Input
                placeholder="Destinatario"
                className="bg-white dark:bg-background"
                value={filtroDestinatario}
                onChange={(e) => setFiltroDestinatario(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Serie"
                className="bg-white dark:bg-background"
                value={filtroSerie}
                onChange={(e) => setFiltroSerie(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Número"
                className="bg-white dark:bg-background"
                value={filtroNumero}
                onChange={(e) => setFiltroNumero(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="date"
                placeholder="Fecha"
                className="bg-white dark:bg-background"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-[#0f2c4c] hover:bg-[#0f2c4c]/90 text-white"
                onClick={() => {
                  setCurrentPage(1);
                  fetchGuias();
                }}
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
          {guiasPaginadas.length === 0 ? (
            <div className="p-12 text-center">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No se encontraron traslados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#0f2c4c] text-white">
                    <th className="px-4 py-3 text-left text-xs font-medium">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Fecha</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Número</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Destinatario</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Almacén Origen</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Almacén Destino</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Motivo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-medium">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {guiasPaginadas.map((guia, index) => (
                    <tr key={guia.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        {formatDate(guia.fecha_emision)}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium">
                        {guia.serie}-{guia.numero}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{guia.destinatario_denominacion}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {guia.destinatario_numero_documento}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {guia.punto_partida_direccion || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {guia.punto_llegada_direccion || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {guia.motivo_traslado || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {guia.vehiculo_placa || '-'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {getEstadoBadge(guia.estado)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleVerDetalles(guia)}
                            title="Ver detalles"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-600 hover:bg-orange-50"
                            onClick={() => handleVerificarEstado(guia)}
                            title="Verificar estado"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(guia)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
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
                  registros | Mostrando {guiasFiltradas.length > 0 ? startIndex + 1 : 0} a {Math.min(startIndex + itemsPerPage, guiasFiltradas.length)} de {guiasFiltradas.length}
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
                          ? 'bg-[#0f2c4c] text-white'
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
              <DialogTitle>Detalles del Traslado</DialogTitle>
              <DialogDescription>
                {selectedGuia ? `${selectedGuia.serie}-${selectedGuia.numero}` : ''}
              </DialogDescription>
            </DialogHeader>
            {selectedGuia && (
              <div className="space-y-6 py-4">
                {/* Información General */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Serie-Número</Label>
                    <p className="text-sm font-medium">{selectedGuia.serie}-{selectedGuia.numero}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha Emisión</Label>
                    <p className="text-sm font-medium">{formatDate(selectedGuia.fecha_emision)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Fecha Traslado</Label>
                    <p className="text-sm font-medium">{formatDate(selectedGuia.fecha_inicio_traslado)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Motivo</Label>
                    <p className="text-sm font-medium">{selectedGuia.motivo_traslado || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tipo Transporte</Label>
                    <p className="text-sm font-medium">{selectedGuia.tipo_transporte || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estado</Label>
                    <div className="mt-1">{getEstadoBadge(selectedGuia.estado)}</div>
                  </div>
                </div>

                {/* Destinatario */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Destinatario</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Denominación</Label>
                      <p className="text-sm font-medium">{selectedGuia.destinatario_denominacion}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Documento</Label>
                      <p className="text-sm font-medium">
                        {selectedGuia.destinatario_tipo_documento} - {selectedGuia.destinatario_numero_documento}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Transporte */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Datos de Transporte</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Vehículo (Placa)</Label>
                      <p className="text-sm font-medium">{selectedGuia.vehiculo_placa || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">TUC</Label>
                      <p className="text-sm font-medium">{selectedGuia.vehiculo_tuc || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Peso Total</Label>
                      <p className="text-sm font-medium">
                        {selectedGuia.peso_bruto_total ? `${selectedGuia.peso_bruto_total} ${selectedGuia.peso_bruto_unidad || 'KG'}` : '-'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Conductor</Label>
                      <p className="text-sm font-medium">
                        {selectedGuia.conductor_nombre || selectedGuia.conductor_apellidos 
                          ? `${selectedGuia.conductor_nombre || ''} ${selectedGuia.conductor_apellidos || ''}`.trim() 
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Licencia</Label>
                      <p className="text-sm font-medium">{selectedGuia.conductor_licencia || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Ubicaciones */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Puntos de Traslado</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Punto de Partida</Label>
                      <p className="text-sm font-medium">{selectedGuia.punto_partida_direccion || '-'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Ubigeo: {selectedGuia.punto_partida_ubigeo || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Punto de Llegada</Label>
                      <p className="text-sm font-medium">{selectedGuia.punto_llegada_direccion || '-'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Ubigeo: {selectedGuia.punto_llegada_ubigeo || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Archivos */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Archivos</h3>
                  <div className="flex gap-2">
                    {selectedGuia.nubefact_pdf_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(selectedGuia.nubefact_pdf_url, '_blank')}
                        className="text-red-600 border-red-200"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar PDF
                      </Button>
                    )}
                    {selectedGuia.nubefact_xml_url && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open(selectedGuia.nubefact_xml_url, '_blank')}
                        className="text-blue-600 border-blue-200"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Descargar XML
                      </Button>
                    )}
                  </div>
                </div>

                {/* Observaciones */}
                {selectedGuia.observaciones && (
                  <div className="border-t pt-4">
                    <Label className="text-xs text-muted-foreground">Observaciones</Label>
                    <p className="text-sm mt-1">{selectedGuia.observaciones}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Cerrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmación de Eliminación */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Eliminación</DialogTitle>
              <DialogDescription>
                ¿Está seguro de que desea eliminar el traslado {selectedGuia?.serie}-{selectedGuia?.numero}?
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
