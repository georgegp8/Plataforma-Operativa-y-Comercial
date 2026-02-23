import { useState, useEffect } from 'react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Pencil, Trash2, ChevronDown, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Marca, MarcaFormData } from '@/types';

const initialFormData: MarcaFormData = {
  nombre: '',
  activo: true,
};

export default function Marcas() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'nombre'>('nombre');
  const [valorFiltro, setValorFiltro] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null);
  const [formData, setFormData] = useState<MarcaFormData>(initialFormData);
  const [marcaToDelete, setMarcaToDelete] = useState<Marca | null>(null);

  useEffect(() => {
    const fetchMarcas = async () => {
      try {
        setLoading(true);
        const response = await api.marcas.listar();
        setMarcas(response.data as Marca[]);
      } catch (error) {
        console.error('Error al cargar marcas:', error);
        toast.error('Error al cargar las marcas');
      } finally {
        setLoading(false);
      }
    };

    fetchMarcas();
  }, []);

  const marcasFiltradas = marcas.filter((marca) => {
    return marca.nombre.toLowerCase().includes(valorFiltro.toLowerCase());
  });

  const totalItems = marcasFiltradas.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const marcasPaginadas = marcasFiltradas.slice(startIndex, endIndex);

  const handleEdit = (marca: Marca) => {
    setEditingMarca(marca);
    setFormData({
      nombre: marca.nombre,
      activo: marca.activo,
    });
    setShowModal(true);
  };

  const handleDelete = (marca: Marca) => {
    setMarcaToDelete(marca);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!marcaToDelete) return;

    try {
      await api.marcas.eliminar(marcaToDelete.id);
      setMarcas(marcas.filter((m) => m.id !== marcaToDelete.id));
      toast.success('Marca eliminada exitosamente');
      setShowDeleteModal(false);
      setMarcaToDelete(null);
    } catch {
      toast.error('Error al eliminar la marca');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingMarca) {
        const response = await api.marcas.actualizar(editingMarca.id, formData as unknown as Record<string, unknown>);
        setMarcas(marcas.map((m) => (m.id === editingMarca.id ? (response.data.data as Marca) : m)));
        toast.success('Marca actualizada exitosamente');
      } else {
        const response = await api.marcas.crear(formData as unknown as Record<string, unknown>);
        setMarcas([response.data.data as Marca, ...marcas]);
        toast.success('Marca creada exitosamente');
      }

      setShowModal(false);
      setFormData(initialFormData);
      setEditingMarca(null);
    } catch {
      toast.error(editingMarca ? 'Error al actualizar la marca' : 'Error al crear la marca');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialFormData);
    setEditingMarca(null);
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
          <h1 className="text-xl font-semibold">Módulo de Marcas</h1>
          <Button
            onClick={() => setShowModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-muted/50 px-4 py-4 border-x border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Filtrar por
              </label>
              <select
                id="tipo-filtro"
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value as 'nombre')}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="nombre">Nombre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Buscar
              </label>
              <Input
                id="valor-filtro"
                placeholder="Buscar"
                value={valorFiltro}
                onChange={(e) => setValorFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => toast.info('Funcionalidad de exportación en desarrollo')}
                className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
                size="sm"
              >
                <FileDown className="h-4 w-4 mr-1" />
                Excel
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Marca</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Creado Por Usuario</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Fecha creación</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {marcasPaginadas.map((marca, index) => (
                  <tr key={marca.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {marca.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {marca.created_by || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {marca.created_at ? new Date(marca.created_at).toLocaleDateString('es-PE', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      }) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                            >
                              Acciones
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(marca)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(marca)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="bg-muted/30 px-4 py-3 border-t border-border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">Mostrar:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-background border border-border rounded text-sm text-foreground"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
                <span className="text-sm text-foreground">
                  | Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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

      {/* Modal Crear/Editar */}
      <Dialog open={showModal} onOpenChange={handleCloseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMarca ? 'Editar Marca' : 'Nueva Marca'}</DialogTitle>
            <DialogDescription>
              {editingMarca 
                ? 'Modifica los datos de la marca existente.' 
                : 'Completa los datos para crear una nueva marca.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                  placeholder="Ingrese el nombre de la marca"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="activo" className="cursor-pointer">Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingMarca ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la marca "{marcaToDelete?.nombre}"? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
