import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Pencil, Trash2, Plus, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Personal, PersonalFormData } from '@/types';

const initialFormData: PersonalFormData = {
  nombre: '',
  numero: '',
  puesto_asignado: '',
  salario_base: 0,
  email: '',
  telefono: '',
  activo: true,
};

export default function PersonalEmpresa() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'nombre' | 'numero' | 'puesto'>('nombre');
  const [valorFiltro, setValorFiltro] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPersonal, setSelectedPersonal] = useState<Personal | null>(null);
  const [formData, setFormData] = useState<PersonalFormData>(initialFormData);

  const fetchPersonal = useCallback(async () => {
    try {
      const response = await api.personal.listar();

      const personalMapped: Personal[] = (response.data as Personal[]).map((empleado: Personal) => ({
        id: empleado.id,
        nombre: empleado.nombre || '',
        numero: empleado.numero || '',
        puesto_asignado: empleado.puesto_asignado || '',
        salario_base: empleado.salario_base || 0,
        email: empleado.email || '',
        telefono: empleado.telefono || '',
        activo: empleado.activo ?? true,
        created_by: empleado.created_by || 'ADMINISTRADOR - CAJA',
        created_at: empleado.created_at || new Date().toISOString(),
      }));
      setPersonal(personalMapped);
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo cargar la lista de personal',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPersonal();
  }, [fetchPersonal]);

  // Filtrar personal
  const personalFiltrado = personal.filter((empleado) => {
    if (!valorFiltro) return true;
    const valor = valorFiltro.toLowerCase();
    
    switch (tipoFiltro) {
      case 'nombre':
        return empleado.nombre.toLowerCase().includes(valor);
      case 'numero':
        return (empleado.numero || '').toLowerCase().includes(valor);
      case 'puesto':
        return (empleado.puesto_asignado || '').toLowerCase().includes(valor);
      default:
        return true;
    }
  });

  // Paginación
  const totalPages = Math.ceil(personalFiltrado.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const personalPaginado = personalFiltrado.slice(startIndex, startIndex + itemsPerPage);

  const handleEdit = (empleado: Personal) => {
    setSelectedPersonal(empleado);
    setFormData({
      nombre: empleado.nombre,
      numero: empleado.numero || '',
      puesto_asignado: empleado.puesto_asignado || '',
      salario_base: empleado.salario_base,
      email: empleado.email || '',
      telefono: empleado.telefono || '',
      activo: empleado.activo,
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (empleado: Personal) => {
    setSelectedPersonal(empleado);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedPersonal) return;

    try {
      await api.personal.eliminar(selectedPersonal.id);
      toast.success('Éxito', {
        description: 'Personal eliminado correctamente',
      });
      setIsDeleteModalOpen(false);
      setSelectedPersonal(null);
      fetchPersonal();
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo eliminar el personal',
      });
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPersonal) return;

    try {
      await api.personal.actualizar(selectedPersonal.id, formData as unknown as Record<string, unknown>);
      toast.success('Éxito', {
        description: 'Personal actualizado correctamente',
      });
      setIsEditModalOpen(false);
      setSelectedPersonal(null);
      setFormData(initialFormData);
      fetchPersonal();
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo actualizar el personal',
      });
    }
  };

  const handleNewPersonal = () => {
    setSelectedPersonal(null);
    setFormData(initialFormData);
    setIsEditModalOpen(true);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.personal.crear(formData as unknown as Record<string, unknown>);
      toast.success('Éxito', {
        description: 'Personal creado correctamente',
      });
      setIsEditModalOpen(false);
      setFormData(initialFormData);
      fetchPersonal();
    } catch (error) {
      console.error(error);
      toast.error('Error', {
        description: 'No se pudo crear el personal',
      });
    }
  };

  const handleExportar = () => {
    toast.info('Funcionalidad de exportar en desarrollo');
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
          <div className="text-center py-8 text-muted-foreground">Cargando personal...</div>
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
          <h1 className="text-xl font-semibold">Listado de personal de la empresa</h1>
          <Button
            onClick={handleNewPersonal}
            className="bg-background hover:bg-muted text-primary border border-border"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo personal
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-muted/50 px-4 py-4 border-x border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Filtrar por:
              </label>
              <select
                value={tipoFiltro}
                onChange={(e) => {
                  setTipoFiltro(e.target.value as 'nombre' | 'numero' | 'puesto');
                  setValorFiltro('');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="nombre">Nombre</option>
                <option value="numero">Número</option>
                <option value="puesto">Puesto</option>
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
            <div className="flex items-end">
              <Button
                onClick={handleExportar}
                className="bg-green-600 hover:bg-green-700 text-white w-full"
                size="sm"
              >
                <FileDown className="h-4 w-4 mr-1" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-card border border-border rounded-b-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary text-primary-foreground">
                <tr>
                  <th className="px-3 py-3 text-left text-sm font-semibold">#</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Nombre</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Número</th>
                  <th className="px-3 py-3 text-left text-sm font-semibold">Puesto Asignado</th>
                  <th className="px-3 py-3 text-right text-sm font-semibold">Salario/Base</th>
                  <th className="px-3 py-3 text-center text-sm font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {personalPaginado.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {valorFiltro
                        ? 'No se encontró personal con los filtros aplicados' 
                        : 'No hay personal registrado'}
                    </td>
                  </tr>
                ) : (
                  personalPaginado.map((empleado, index) => (
                    <tr 
                      key={empleado.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-3 py-3 text-sm text-foreground">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground font-medium">
                        {empleado.nombre}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground">
                        {empleado.numero || '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-foreground">
                        {empleado.puesto_asignado || '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-right tabular-nums text-foreground">
                        S/ {formatCurrency(empleado.salario_base)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(empleado)}
                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(empleado)}
                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
                  registros | Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, personalFiltrado.length)} de {personalFiltrado.length}
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

      {/* Modal de Edición/Nuevo Personal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle>{selectedPersonal ? 'Editar Personal' : 'Nuevo Personal'}</DialogTitle>
            <DialogDescription>
              {selectedPersonal ? 'Modifica los datos del personal' : 'Completa los datos del nuevo personal'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={selectedPersonal ? handleSaveEdit : handleSaveNew} className="space-y-4">
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
                <Label htmlFor="numero">Número</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  placeholder="DNI, Código, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="puesto_asignado">Puesto Asignado</Label>
                <Input
                  id="puesto_asignado"
                  value={formData.puesto_asignado}
                  onChange={(e) => setFormData({ ...formData, puesto_asignado: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salario_base">Salario Base *</Label>
                <Input
                  id="salario_base"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salario_base}
                  onChange={(e) => setFormData({ ...formData, salario_base: parseFloat(e.target.value) || 0 })}
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
                  setSelectedPersonal(null);
                  setFormData(initialFormData);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {selectedPersonal ? 'Actualizar' : 'Crear'} Personal
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
              ¿Está seguro que desea eliminar a <strong>{selectedPersonal?.nombre}</strong>?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedPersonal(null);
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
