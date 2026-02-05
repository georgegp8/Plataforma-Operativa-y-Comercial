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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGuia, setSelectedGuia] = useState<GuiaRemision | null>(null);
  
  // Formulario de creación
  const [formData, setFormData] = useState({
    empresa_id: 1,
    serie: 'T001',
    numero: '',
    tipo_comprobante: 9,
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_inicio_traslado: new Date().toISOString().split('T')[0],
    cliente_tipo_documento: '6',
    cliente_numero_documento: '',
    cliente_denominacion: '',
    cliente_direccion: '',
    destinatario_tipo_documento: '6',
    destinatario_numero_documento: '',
    destinatario_denominacion: '',
    motivo_traslado: '01',
    tipo_transporte: '02',
    peso_bruto_total: '',
    peso_bruto_unidad: 'KGM',
    vehiculo_placa: '',
    conductor_tipo_documento: '1',
    conductor_numero_documento: '',
    conductor_nombre: '',
    conductor_apellidos: '',
    conductor_licencia: '',
    punto_partida_ubigeo: '',
    punto_partida_direccion: '',
    punto_llegada_ubigeo: '',
    punto_llegada_direccion: '',
    observaciones: '',
  });
  
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
    setFormData({
      empresa_id: 1,
      serie: 'T001',
      numero: '',
      tipo_comprobante: 9,
      fecha_emision: new Date().toISOString().split('T')[0],
      fecha_inicio_traslado: new Date().toISOString().split('T')[0],
      cliente_tipo_documento: '6',
      cliente_numero_documento: '',
      cliente_denominacion: '',
      cliente_direccion: '',
      destinatario_tipo_documento: '6',
      destinatario_numero_documento: '',
      destinatario_denominacion: '',
      motivo_traslado: '01',
      tipo_transporte: '02',
      peso_bruto_total: '',
      peso_bruto_unidad: 'KGM',
      vehiculo_placa: '',
      conductor_tipo_documento: '1',
      conductor_numero_documento: '',
      conductor_nombre: '',
      conductor_apellidos: '',
      conductor_licencia: '',
      punto_partida_ubigeo: '',
      punto_partida_direccion: '',
      punto_llegada_ubigeo: '',
      punto_llegada_direccion: '',
      observaciones: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        numero: parseInt(formData.numero) || 1,
        peso_bruto_total: parseFloat(formData.peso_bruto_total) || 0,
      };
      
      await api.guiasRemision.crear(payload);
      toast.success('Éxito', {
        description: 'Traslado creado correctamente',
      });
      setIsCreateModalOpen(false);
      fetchGuias();
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo crear el traslado',
      });
    }
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
        <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-100">
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

        {/* Modal de Creación de Traslado */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Traslado (Guía de Remisión)</DialogTitle>
              <DialogDescription>
                Complete los datos del traslado. Los campos marcados con * son obligatorios.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveNew} className="space-y-6 py-4">
              {/* Datos Generales */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3 text-sm">Datos Generales</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="serie" className="text-xs">Serie *</Label>
                    <Input
                      id="serie"
                      value={formData.serie}
                      onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                      placeholder="T001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero" className="text-xs">Número *</Label>
                    <Input
                      id="numero"
                      type="number"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                      placeholder="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fecha_emision" className="text-xs">Fecha Emisión *</Label>
                    <Input
                      id="fecha_emision"
                      type="date"
                      value={formData.fecha_emision}
                      onChange={(e) => setFormData({ ...formData, fecha_emision: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fecha_inicio_traslado" className="text-xs">Fecha Traslado *</Label>
                    <Input
                      id="fecha_inicio_traslado"
                      type="date"
                      value={formData.fecha_inicio_traslado}
                      onChange={(e) => setFormData({ ...formData, fecha_inicio_traslado: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Datos del Cliente/Remitente */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3 text-sm">Cliente / Remitente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="cliente_tipo_documento" className="text-xs">Tipo Doc *</Label>
                    <select
                      id="cliente_tipo_documento"
                      value={formData.cliente_tipo_documento}
                      onChange={(e) => setFormData({ ...formData, cliente_tipo_documento: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                      required
                    >
                      <option value="1">DNI</option>
                      <option value="6">RUC</option>
                      <option value="4">CE</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cliente_numero_documento" className="text-xs">Número Doc *</Label>
                    <Input
                      id="cliente_numero_documento"
                      value={formData.cliente_numero_documento}
                      onChange={(e) => setFormData({ ...formData, cliente_numero_documento: e.target.value })}
                      placeholder="20123456789"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="cliente_denominacion" className="text-xs">Razón Social / Nombre *</Label>
                    <Input
                      id="cliente_denominacion"
                      value={formData.cliente_denominacion}
                      onChange={(e) => setFormData({ ...formData, cliente_denominacion: e.target.value })}
                      placeholder="Nombre o razón social del remitente"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="cliente_direccion" className="text-xs">Dirección *</Label>
                    <Input
                      id="cliente_direccion"
                      value={formData.cliente_direccion}
                      onChange={(e) => setFormData({ ...formData, cliente_direccion: e.target.value })}
                      placeholder="Dirección completa"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Datos del Destinatario */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3 text-sm">Destinatario</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="destinatario_tipo_documento" className="text-xs">Tipo Doc</Label>
                    <select
                      id="destinatario_tipo_documento"
                      value={formData.destinatario_tipo_documento}
                      onChange={(e) => setFormData({ ...formData, destinatario_tipo_documento: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                    >
                      <option value="1">DNI</option>
                      <option value="6">RUC</option>
                      <option value="4">CE</option>
                      <option value="-">Sin documento</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destinatario_numero_documento" className="text-xs">Número Doc</Label>
                    <Input
                      id="destinatario_numero_documento"
                      value={formData.destinatario_numero_documento}
                      onChange={(e) => setFormData({ ...formData, destinatario_numero_documento: e.target.value })}
                      placeholder="20987654321"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="destinatario_denominacion" className="text-xs">Razón Social / Nombre</Label>
                    <Input
                      id="destinatario_denominacion"
                      value={formData.destinatario_denominacion}
                      onChange={(e) => setFormData({ ...formData, destinatario_denominacion: e.target.value })}
                      placeholder="Nombre del destinatario"
                    />
                  </div>
                </div>
              </div>

              {/* Datos del Traslado */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3 text-sm">Detalles del Traslado</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="motivo_traslado" className="text-xs">Motivo *</Label>
                    <select
                      id="motivo_traslado"
                      value={formData.motivo_traslado}
                      onChange={(e) => setFormData({ ...formData, motivo_traslado: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                      required
                    >
                      <option value="01">Venta</option>
                      <option value="02">Compra</option>
                      <option value="03">Traslado entre establecimientos</option>
                      <option value="04">Traslado emisor itinerante</option>
                      <option value="08">Importación</option>
                      <option value="09">Exportación</option>
                      <option value="13">Otros</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo_transporte" className="text-xs">Tipo Transporte *</Label>
                    <select
                      id="tipo_transporte"
                      value={formData.tipo_transporte}
                      onChange={(e) => setFormData({ ...formData, tipo_transporte: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-border rounded bg-background"
                      required
                    >
                      <option value="01">Transporte público</option>
                      <option value="02">Transporte privado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="peso_bruto_total" className="text-xs">Peso Total (KG) *</Label>
                    <Input
                      id="peso_bruto_total"
                      type="number"
                      step="0.01"
                      value={formData.peso_bruto_total}
                      onChange={(e) => setFormData({ ...formData, peso_bruto_total: e.target.value })}
                      placeholder="10.5"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Datos del Vehículo y Conductor */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3 text-sm">Vehículo y Conductor</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="vehiculo_placa" className="text-xs">Placa Vehículo *</Label>
                    <Input
                      id="vehiculo_placa"
                      value={formData.vehiculo_placa}
                      onChange={(e) => setFormData({ ...formData, vehiculo_placa: e.target.value.toUpperCase() })}
                      placeholder="ABC-123"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conductor_numero_documento" className="text-xs">DNI Conductor</Label>
                    <Input
                      id="conductor_numero_documento"
                      value={formData.conductor_numero_documento}
                      onChange={(e) => setFormData({ ...formData, conductor_numero_documento: e.target.value })}
                      placeholder="12345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conductor_licencia" className="text-xs">Licencia</Label>
                    <Input
                      id="conductor_licencia"
                      value={formData.conductor_licencia}
                      onChange={(e) => setFormData({ ...formData, conductor_licencia: e.target.value.toUpperCase() })}
                      placeholder="Q12345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="conductor_nombre" className="text-xs">Nombre Conductor</Label>
                    <Input
                      id="conductor_nombre"
                      value={formData.conductor_nombre}
                      onChange={(e) => setFormData({ ...formData, conductor_nombre: e.target.value })}
                      placeholder="Juan"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="conductor_apellidos" className="text-xs">Apellidos Conductor</Label>
                    <Input
                      id="conductor_apellidos"
                      value={formData.conductor_apellidos}
                      onChange={(e) => setFormData({ ...formData, conductor_apellidos: e.target.value })}
                      placeholder="Pérez García"
                    />
                  </div>
                </div>
              </div>

              {/* Puntos de Traslado */}
              <div className="border-b pb-4">
                <h3 className="font-semibold mb-3 text-sm">Puntos de Traslado</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="punto_partida_ubigeo" className="text-xs">Ubigeo Partida *</Label>
                    <Input
                      id="punto_partida_ubigeo"
                      value={formData.punto_partida_ubigeo}
                      onChange={(e) => setFormData({ ...formData, punto_partida_ubigeo: e.target.value })}
                      placeholder="150101"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="punto_partida_direccion" className="text-xs">Dirección Partida *</Label>
                    <Input
                      id="punto_partida_direccion"
                      value={formData.punto_partida_direccion}
                      onChange={(e) => setFormData({ ...formData, punto_partida_direccion: e.target.value })}
                      placeholder="Av. Principal 123"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="punto_llegada_ubigeo" className="text-xs">Ubigeo Llegada *</Label>
                    <Input
                      id="punto_llegada_ubigeo"
                      value={formData.punto_llegada_ubigeo}
                      onChange={(e) => setFormData({ ...formData, punto_llegada_ubigeo: e.target.value })}
                      placeholder="150102"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="punto_llegada_direccion" className="text-xs">Dirección Llegada *</Label>
                    <Input
                      id="punto_llegada_direccion"
                      value={formData.punto_llegada_direccion}
                      onChange={(e) => setFormData({ ...formData, punto_llegada_direccion: e.target.value })}
                      placeholder="Av. Destino 456"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <Label htmlFor="observaciones" className="text-xs">Observaciones</Label>
                <textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-border rounded bg-background min-h-[80px]"
                  placeholder="Información adicional sobre el traslado..."
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-[#0f2c4c] hover:bg-[#0f2c4c]/90">
                  Crear Traslado
                </Button>
              </DialogFooter>
            </form>
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
