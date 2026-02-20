import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Pencil, Trash2, Plus, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Vendedor, VendedorFormData } from '@/types';

const initialFormData: VendedorFormData = {
  nombre: '',
  email: '',
  telefono: '',
  porcentaje_comision: 0,
  activo: true,
};

export default function Vendedores() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'nombre' | 'email' | 'creador'>('nombre');
  const [valorFiltro, setValorFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [mesFiltro, setMesFiltro] = useState('');
  const [diaFiltro, setDiaFiltro] = useState('');
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState('');
  const [fechaFinFiltro, setFechaFinFiltro] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState<Vendedor | null>(null);
  const [formData, setFormData] = useState<VendedorFormData>(initialFormData);

  const fetchVendedores = useCallback(async () => {
    try {
      const response = await api.vendedores.listar();

      const vendedoresMapped: Vendedor[] = response.data.map((vendedor: Vendedor) => ({
        id: vendedor.id,
        nombre: vendedor.nombre || '',
        email: vendedor.email || '',
        telefono: vendedor.telefono || '',
        porcentaje_comision: vendedor.porcentaje_comision || 0,
        activo: vendedor.activo ?? true,
        created_by: vendedor.created_by || 'ADMINISTRADOR - CAJA',
        created_at: vendedor.created_at || new Date().toISOString(),
        ventas_cpe: vendedor.ventas_cpe || 0,
        ventas_nv: vendedor.ventas_nv || 0,
        total_ventas: vendedor.total_ventas || 0,
        total_comision: vendedor.total_comision || 0,
      }));
      setVendedores(vendedoresMapped);
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo cargar la lista de vendedores',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendedores();
  }, [fetchVendedores]);

  // Filtrar vendedores
  const vendedoresFiltrados = vendedores.filter((vendedor) => {
    // Filtro por tipo
    if (valorFiltro) {
      const valor = valorFiltro.toLowerCase();
      const match = 
        (tipoFiltro === 'nombre' && vendedor.nombre.toLowerCase().includes(valor)) ||
        (tipoFiltro === 'email' && (vendedor.email || '').toLowerCase().includes(valor)) ||
        (tipoFiltro === 'creador' && (vendedor.created_by || '').toLowerCase().includes(valor));
      
      if (!match) return false;
    }

    // Filtro por estado
    if (estadoFiltro === 'activo' && !vendedor.activo) return false;
    if (estadoFiltro === 'inactivo' && vendedor.activo) return false;

    return true;
  });

  // Calcular totales
  const totales = vendedoresFiltrados.reduce(
    (acc, vendedor) => ({
      ventas_cpe: acc.ventas_cpe + (vendedor.ventas_cpe || 0),
      ventas_nv: acc.ventas_nv + (vendedor.ventas_nv || 0),
      total_ventas: acc.total_ventas + (vendedor.total_ventas || 0),
      total_comision: acc.total_comision + (vendedor.total_comision || 0),
    }),
    { ventas_cpe: 0, ventas_nv: 0, total_ventas: 0, total_comision: 0 }
  );

  // Paginación
  const totalPages = Math.ceil(vendedoresFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const vendedoresPaginados = vendedoresFiltrados.slice(startIndex, startIndex + itemsPerPage);

  const handleEdit = (vendedor: Vendedor) => {
    setSelectedVendedor(vendedor);
    setFormData({
      nombre: vendedor.nombre,
      email: vendedor.email || '',
      telefono: vendedor.telefono || '',
      porcentaje_comision: vendedor.porcentaje_comision,
      activo: vendedor.activo,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (vendedor: Vendedor) => {
    setSelectedVendedor(vendedor);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedVendedor) return;

    try {
      await api.vendedores.eliminar(selectedVendedor.id);
      toast.success('Éxito', {
        description: 'Vendedor eliminado correctamente',
      });
      setIsDeleteModalOpen(false);
      setSelectedVendedor(null);
      fetchVendedores();
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo eliminar el vendedor',
      });
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendedor) return;

    try {
      await api.vendedores.actualizar(selectedVendedor.id, formData);
      toast.success('Éxito', {
        description: 'Vendedor actualizado correctamente',
      });
      setIsEditModalOpen(false);
      setSelectedVendedor(null);
      setFormData(initialFormData);
      fetchVendedores();
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo actualizar el vendedor',
      });
    }
  };

  const handleNewVendedor = () => {
    setSelectedVendedor(null);
    setFormData(initialFormData);
    setIsEditModalOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.vendedores.crear(formData);
      toast.success('Éxito', {
        description: 'Vendedor creado correctamente',
      });
      setIsEditModalOpen(false);
      setFormData(initialFormData);
      fetchVendedores();
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo crear el vendedor',
      });
    }
  };

  const handleExportExcel = () => {
    toast.info('Funcionalidad de exportar a Excel en desarrollo');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-8 text-muted-foreground">Cargando vendedores...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header del módulo */}
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Módulo de Vendedores</h1>
          <Button
            onClick={handleNewVendedor}
            className="bg-background hover:bg-muted text-primary border border-border"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-muted/50 px-4 py-4 border-x border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Filtrar por:
              </label>
              <select
                value={tipoFiltro}
                onChange={(e) => {
                  setTipoFiltro(e.target.value as 'nombre' | 'email' | 'creador');
                  setValorFiltro('');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="nombre">Nombre</option>
                <option value="email">Email</option>
                <option value="creador">Creador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Buscar
              </label>
              <input
                type="text"
                value={valorFiltro}
                onChange={(e) => {
                  setValorFiltro(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder={`Buscar por ${tipoFiltro}...`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Estado
              </label>
              <select
                value={estadoFiltro}
                onChange={(e) => {
                  setEstadoFiltro(e.target.value as 'todos' | 'activo' | 'inactivo');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="todos">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Buscar por mes
              </label>
              <input
                type="text"
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="Mes..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Buscar por día
              </label>
              <input
                type="text"
                value={diaFiltro}
                onChange={(e) => setDiaFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="Día..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicioFiltro}
                onChange={(e) => setFechaInicioFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFinFiltro}
                onChange={(e) => setFechaFinFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button
              onClick={handleExportExcel}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <FileDown className="h-4 w-4 mr-1" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-card border border-border rounded-b-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-semibold">#</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Vendedor</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Creador</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Establecimiento</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold">Ventas CPE</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold">Ventas NV</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold">Total Ventas</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold">% de Comisión</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold">Total S/ Comisión</th>
                  <th className="px-3 py-3 text-center text-sm font-semibold">Productos</th>
                  <th className="px-3 py-3 text-center text-sm font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vendedoresPaginados.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                      {valorFiltro
                        ? 'No se encontraron vendedores con los filtros aplicados' 
                        : 'No hay vendedores registrados'}
                    </td>
                  </tr>
                ) : (
                  vendedoresPaginados.map((vendedor, index) => (
                    <tr 
                      key={vendedor.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-3 py-3 text-sm text-foreground">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-3 py-3 text-sm">
                        <div className="text-foreground font-semibold">{vendedor.nombre}</div>
                        <div className="text-xs text-muted-foreground">{vendedor.email || '-'}</div>
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground">
                        {vendedor.created_by || '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground">
                        -
                      </td>
                      <td className="px-3 py-3 text-sm text-right tabular-nums text-foreground">
                        {formatCurrency(vendedor.ventas_cpe || 0)}
                      </td>
                      <td className="px-3 py-3 text-sm text-right tabular-nums text-foreground">
                        {formatCurrency(vendedor.ventas_nv || 0)}
                      </td>
                      <td className="px-3 py-3 text-sm text-right tabular-nums text-foreground font-semibold">
                        {formatCurrency(vendedor.total_ventas || 0)}
                      </td>
                      <td className="px-3 py-3 text-sm text-right tabular-nums text-foreground">
                        {vendedor.porcentaje_comision}%
                      </td>
                      <td className="px-3 py-3 text-sm text-right tabular-nums text-foreground font-semibold">
                        {formatCurrency(vendedor.total_comision || 0)}
                      </td>
                      <td className="px-3 py-3 text-center text-sm text-foreground">
                        -
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(vendedor)}
                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(vendedor)}
                            className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {/* Fila de Totales */}
                <tr className="bg-muted/30 font-semibold border-t-2 border-border">
                  <td colSpan={4} className="px-3 py-3 text-sm text-foreground">
                    Totales:
                  </td>
                  <td className="px-3 py-3 text-sm text-right tabular-nums text-foreground">
                    {formatCurrency(totales.ventas_cpe)}
                  </td>
                  <td className="px-3 py-3 text-sm text-right tabular-nums text-foreground">
                    {formatCurrency(totales.ventas_nv)}
                  </td>
                  <td className="px-3 py-3 text-sm text-right tabular-nums text-foreground">
                    {formatCurrency(totales.total_ventas)}
                  </td>
                  <td className="px-3 py-3 text-sm text-right text-foreground">
                    -
                  </td>
                  <td className="px-3 py-3 text-sm text-right tabular-nums text-foreground">
                    {formatCurrency(totales.total_comision)}
                  </td>
                  <td colSpan={2} className="px-3 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="px-4 py-3 border-t border-border bg-muted/30">
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
                  registros | Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, vendedoresFiltrados.length)} de {vendedoresFiltrados.length}
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
                {Array.from({ length: Math.min(Math.max(totalPages, 0), 5) }, (_, i) => {
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
                          : 'bg-background hover:bg-muted'
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
      </div>

      {/* Modal de Edición/Nuevo Vendedor */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle>{selectedVendedor ? 'Editar Vendedor' : 'Nuevo Vendedor'}</DialogTitle>
            <DialogDescription>
              {selectedVendedor ? 'Modifica los datos del vendedor' : 'Completa los datos del nuevo vendedor'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={selectedVendedor ? handleSaveEdit : handleSaveNew} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="porcentaje_comision">% Comisión *</Label>
                <Input
                  id="porcentaje_comision"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.porcentaje_comision}
                  onChange={(e) => setFormData({ ...formData, porcentaje_comision: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activo">Estado</Label>
                <select
                  id="activo"
                  value={formData.activo ? 'activo' : 'inactivo'}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'activo' })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedVendedor(null);
                  setFormData(initialFormData);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {selectedVendedor ? 'Actualizar' : 'Crear'} Vendedor
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar el vendedor <strong>{selectedVendedor?.nombre}</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedVendedor(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={confirmDelete}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
