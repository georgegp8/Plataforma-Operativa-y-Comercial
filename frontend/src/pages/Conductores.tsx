import { useState, useEffect } from 'react';
import { Plus, Download, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Conductor, ConductorFormData } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initialFormData: ConductorFormData = {
  tipo_documento: 'DNI',
  numero_documento: '',
  nombre: '',
  licencia_conducir: '',
  telefono: '',
  activo: true,
};

export default function Conductores() {
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'tipo_documento' | 'numero_documento' | 'nombre'>('numero_documento');
  const [valorFiltro, setValorFiltro] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingConductor, setEditingConductor] = useState<Conductor | null>(null);
  const [formData, setFormData] = useState<ConductorFormData>(initialFormData);
  const [conductorToDelete, setConductorToDelete] = useState<Conductor | null>(null);

  useEffect(() => {
    const fetchConductores = async () => {
      try {
        const response = await api.conductores.listar();
        setConductores(response.data as Conductor[]);
      } catch {
        toast.error('Error al cargar los conductores', {
          duration: 4000,
          closeButton: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConductores();
  }, []);

  const conductoresFiltrados = conductores.filter((conductor) => {
    const valorBusqueda = valorFiltro.toLowerCase();
    if (tipoFiltro === 'tipo_documento') {
      return conductor.tipo_documento.toLowerCase().includes(valorBusqueda);
    } else if (tipoFiltro === 'numero_documento') {
      return conductor.numero_documento.toLowerCase().includes(valorBusqueda);
    } else if (tipoFiltro === 'nombre') {
      return conductor.nombre.toLowerCase().includes(valorBusqueda);
    }
    return true;
  });

  const totalItems = conductoresFiltrados.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const conductoresPaginados = conductoresFiltrados.slice(startIndex, endIndex);

  const handleNew = () => {
    setEditingConductor(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleEdit = (conductor: Conductor) => {
    setEditingConductor(conductor);
    setFormData({
      tipo_documento: conductor.tipo_documento,
      numero_documento: conductor.numero_documento,
      nombre: conductor.nombre,
      licencia_conducir: conductor.licencia_conducir || '',
      telefono: conductor.telefono || '',
      activo: conductor.activo,
    });
    setShowModal(true);
  };

  const handleDelete = (conductor: Conductor) => {
    setConductorToDelete(conductor);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!conductorToDelete) return;

    try {
      await api.conductores.eliminar(conductorToDelete.id);
      setConductores(conductores.filter((c) => c.id !== conductorToDelete.id));
      toast.success('Conductor eliminado exitosamente');
      setShowDeleteModal(false);
      setConductorToDelete(null);
    } catch {
      toast.error('Error al eliminar el conductor');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingConductor(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tipo_documento.trim() || !formData.numero_documento.trim() || !formData.nombre.trim()) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      if (editingConductor) {
        await api.conductores.actualizar(editingConductor.id, formData as unknown as Record<string, unknown>);
        const response = await api.conductores.listar();
        setConductores(response.data as Conductor[]);
        toast.success('Conductor actualizado exitosamente');
      } else {
        await api.conductores.crear(formData as unknown as Record<string, unknown>);
        const response = await api.conductores.listar();
        setConductores(response.data as Conductor[]);
        toast.success('Conductor creado exitosamente');
      }
      handleCloseModal();
    } catch {
      toast.error('Error al guardar el conductor');
    }
  };

  const handleExport = () => {
    toast.info('Funcionalidad de exportación en desarrollo');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Conductores</h1>
          <Button
            onClick={handleNew}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-muted/50 px-4 py-4 border-x border-border space-y-3">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Filtrar por</Label>
              <Select value={tipoFiltro} onValueChange={(value: 'tipo_documento' | 'numero_documento' | 'nombre') => setTipoFiltro(value)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tipo_documento">Documento</SelectItem>
                  <SelectItem value="numero_documento">Número de Documento</SelectItem>
                  <SelectItem value="nombre">Nombre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Buscar</Label>
              <Input
                type="text"
                value={valorFiltro}
                onChange={(e) => setValorFiltro(e.target.value)}
                placeholder="Ingrese valor..."
                className="bg-background"
              />
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-card border border-border rounded-b-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-primary text-primary-foreground">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Documento</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Número de Documento</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Licencia de Conducir</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Teléfono</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {conductoresPaginados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No se encontraron conductores
                  </td>
                </tr>
              ) : (
                conductoresPaginados.map((conductor, index) => (
                  <tr key={conductor.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 text-sm">{conductor.tipo_documento}</td>
                    <td className="px-4 py-3 text-sm">{conductor.numero_documento}</td>
                    <td className="px-4 py-3 text-sm">{conductor.nombre}</td>
                    <td className="px-4 py-3 text-sm">{conductor.licencia_conducir || '-'}</td>
                    <td className="px-4 py-3 text-sm">{conductor.telefono || '-'}</td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Acciones
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(conductor)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(conductor)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Paginación */}
          {totalItems > 0 && (
            <div className="px-4 py-3 border-t border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Total: {totalItems}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm border border-border rounded ${
                            currentPage === pageNum
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background hover:bg-muted'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear/Editar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>
              {editingConductor ? 'Editar Conductor' : 'Nuevo Conductor'}
            </DialogTitle>
            <DialogDescription>
              {editingConductor
                ? 'Modifica los datos del conductor'
                : 'Ingresa los datos del nuevo conductor'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_documento">
                    Tipo de Documento <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.tipo_documento}
                    onValueChange={(value) => setFormData({ ...formData, tipo_documento: value })}
                  >
                    <SelectTrigger id="tipo_documento" className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DNI">DNI</SelectItem>
                      <SelectItem value="CE">Carnet de Extranjería</SelectItem>
                      <SelectItem value="PAS">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_documento">
                    Número de Documento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="numero_documento"
                    value={formData.numero_documento}
                    onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                    placeholder="Ej: 12345678"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nombre">
                  Nombre Completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Juan Pérez García"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licencia_conducir">
                    Licencia de Conducir
                  </Label>
                  <Input
                    id="licencia_conducir"
                    value={formData.licencia_conducir}
                    onChange={(e) => setFormData({ ...formData, licencia_conducir: e.target.value })}
                    placeholder="Ej: A-IIIb"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefono">
                    Teléfono
                  </Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="Ej: 987654321"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90"
              >
                {editingConductor ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar al conductor{' '}
              <strong>{conductorToDelete?.nombre}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
