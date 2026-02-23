import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Categoria, CategoriaFormData } from '@/types';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initialFormData: CategoriaFormData = {
  nombre: '',
  identificador: '',
  activo: true,
};

export default function Categorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'nombre'>('nombre');
  const [valorFiltro, setValorFiltro] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState<CategoriaFormData>(initialFormData);
  const [categoriaToDelete, setCategoriaToDelete] = useState<Categoria | null>(null);

  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const response = await api.categorias.listar();
        setCategorias(response.data as Categoria[]);
      } catch {
        toast.error('Error al cargar las categorías', {
          duration: 4000,
          closeButton: true,
          style: {
            background: 'var(--destructive)',
            color: 'var(--destructive-foreground)',
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCategorias();
  }, []);

  const categoriasFiltradas = categorias.filter((categoria) => {
    return categoria.nombre.toLowerCase().includes(valorFiltro.toLowerCase());
  });

  const totalItems = categoriasFiltradas.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const categoriasPaginadas = categoriasFiltradas.slice(startIndex, endIndex);

  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setFormData({
      nombre: categoria.nombre,
      identificador: categoria.identificador || '',
      activo: categoria.activo,
    });
    setShowModal(true);
  };

  const handleDelete = (categoria: Categoria) => {
    setCategoriaToDelete(categoria);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!categoriaToDelete) return;

    try {
      await api.categorias.eliminar(categoriaToDelete.id);
      setCategorias(categorias.filter((c) => c.id !== categoriaToDelete.id));
      toast.success('Categoría eliminada exitosamente');
      setShowDeleteModal(false);
      setCategoriaToDelete(null);
    } catch {
      toast.error('Error al eliminar la categoría');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategoria) {
        const response = await api.categorias.actualizar(editingCategoria.id, formData as unknown as Record<string, unknown>);
        setCategorias(categorias.map((c) => (c.id === editingCategoria.id ? (response.data.data as Categoria) : c)));
        toast.success('Categoría actualizada exitosamente');
      } else {
        const response = await api.categorias.crear(formData as unknown as Record<string, unknown>);
        setCategorias([response.data.data as Categoria, ...categorias]);
        toast.success('Categoría creada exitosamente');
      }
      setShowModal(false);
      setFormData(initialFormData);
      setEditingCategoria(null);
    } catch {
      toast.error(editingCategoria ? 'Error al actualizar la categoría' : 'Error al crear la categoría');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(initialFormData);
    setEditingCategoria(null);
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
          <h1 className="text-xl font-semibold">Módulo de Categorías</h1>
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
                Categoría
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
                Ubicar
              </label>
              <Input
                id="valor-filtro"
                placeholder="Ubicar"
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
                <Download className="h-4 w-4 mr-1" />
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Identificador</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Creado por</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Fecha creación</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Estado</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categoriasPaginadas.map((categoria, index) => (
                  <tr key={categoria.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {categoria.nombre}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {categoria.identificador || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {categoria.created_by || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {categoria.created_at ? new Date(categoria.created_at).toLocaleDateString('es-PE') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          categoria.activo
                            ? 'bg-green-600 text-white dark:bg-green-600'
                            : 'bg-red-600 text-white dark:bg-red-600'
                        }`}
                      >
                        {categoria.activo ? 'Activo' : 'Inactivo'}
                      </span>
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
                            <DropdownMenuItem onClick={() => handleEdit(categoria)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(categoria)}
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
            <DialogTitle>{editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
            <DialogDescription>
              {editingCategoria 
                ? 'Modifica los datos de la categoría existente.' 
                : 'Completa los datos para crear una nueva categoría.'}
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
                  placeholder="Ingrese el nombre"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="identificador">Identificador</Label>
                <Input
                  id="identificador"
                  value={formData.identificador}
                  onChange={(e) => setFormData({ ...formData, identificador: e.target.value })}
                  placeholder="Ingrese el identificador (opcional)"
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
                {editingCategoria ? 'Actualizar' : 'Crear'}
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
              ¿Estás seguro de que deseas eliminar la categoría "{categoriaToDelete?.nombre}"? Esta acción no se puede deshacer.
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
