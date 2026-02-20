import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Upload, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Banco, BancoFormData } from '@/types';
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

const initialFormData: BancoFormData = {
  abreviatura: '',
  descripcion: '',
  imagen: '',
  activo: true,
};

export default function Bancos() {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'descripcion' | 'abreviatura'>('descripcion');
  const [valorFiltro, setValorFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingBanco, setEditingBanco] = useState<Banco | null>(null);
  const [formData, setFormData] = useState<BancoFormData>(initialFormData);
  const [bancoToDelete, setBancoToDelete] = useState<Banco | null>(null);
  const [uploadingImageId, setUploadingImageId] = useState<number | null>(null);

  useEffect(() => {
    const fetchBancos = async () => {
      try {
        const response = await api.bancos.listar();
        setBancos(response.data);
      } catch {
        toast.error('Error al cargar los bancos', {
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

    fetchBancos();
  }, []);

  const bancosFiltrados = bancos.filter((banco) => {
    let cumpleFiltroGeneral = true;

    switch (tipoFiltro) {
      case 'descripcion':
        cumpleFiltroGeneral = banco.descripcion.toLowerCase().includes(valorFiltro.toLowerCase());
        break;
      case 'abreviatura':
        cumpleFiltroGeneral = banco.abreviatura?.toLowerCase().includes(valorFiltro.toLowerCase()) || false;
        break;
      default:
        cumpleFiltroGeneral = true;
    }

    const cumpleEstado = estadoFiltro ? (estadoFiltro === 'activo' ? banco.activo : !banco.activo) : true;

    return cumpleFiltroGeneral && cumpleEstado;
  });

  const totalItems = bancosFiltrados.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const bancosPaginados = bancosFiltrados.slice(startIndex, endIndex);

  const handleEdit = (banco: Banco) => {
    setEditingBanco(banco);
    setFormData({
      abreviatura: banco.abreviatura || '',
      descripcion: banco.descripcion,
      imagen: banco.imagen || '',
      activo: banco.activo,
    });
    setShowModal(true);
  };

  const handleDelete = (banco: Banco) => {
    setBancoToDelete(banco);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!bancoToDelete) return;

    try {
      await api.bancos.eliminar(bancoToDelete.id);
      toast.success('Banco eliminado exitosamente', {
        duration: 4000,
        closeButton: true,
        richColors: true,
      });
      
      // Recargar bancos
      const response = await api.bancos.listar();
      setBancos(response.data);
      
      setShowDeleteModal(false);
      setBancoToDelete(null);
    } catch {
      toast.error('Error al eliminar el banco', {
        duration: 4000,
        closeButton: true,
        style: {
          background: 'var(--destructive)',
          color: 'var(--destructive-foreground)',
        },
      });
    }
  };

  const handleSave = async () => {
    try {
      if (editingBanco) {
        await api.bancos.actualizar(editingBanco.id, formData);
        toast.success('Banco actualizado exitosamente', {
          duration: 4000,
          closeButton: true,
          richColors: true,
        });
      } else {
        await api.bancos.crear(formData);
        toast.success('Banco creado exitosamente', {
          duration: 4000,
          closeButton: true,
          richColors: true,
        });
      }
      
      // Recargar bancos
      const response = await api.bancos.listar();
      setBancos(response.data);
      
      setShowModal(false);
      setEditingBanco(null);
      setFormData(initialFormData);
    } catch {
      toast.error('Error al guardar el banco', {
        duration: 4000,
        closeButton: true,
        style: {
          background: 'var(--destructive)',
          color: 'var(--destructive-foreground)',
        },
      });
    }
  };

  const handleNew = () => {
    setEditingBanco(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleUploadImage = async (bancoId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImageId(bancoId);

    try {
      const formData = new FormData();
      formData.append('image', file);

      await api.bancos.subirImagen(bancoId, formData);
      
      toast.success('Imagen subida exitosamente', {
        duration: 4000,
        closeButton: true,
        richColors: true,
      });
      
      // Recargar bancos
      const response = await api.bancos.listar();
      setBancos(response.data);
    } catch {
      toast.error('Error al subir la imagen', {
        duration: 4000,
        closeButton: true,
        style: {
          background: 'var(--destructive)',
          color: 'var(--destructive-foreground)',
        },
      });
    } finally {
      setUploadingImageId(null);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const maxVisiblePages = 5;
    const pages = [];
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-8 text-muted-foreground">Cargando bancos...</div>
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
          <h1 className="text-xl font-semibold">Módulo de Bancos</h1>
          <Button
            onClick={handleNew}
            className="bg-background hover:bg-muted text-primary border border-border"
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
                Filtrar por:
              </label>
              <select
                value={tipoFiltro}
                onChange={(e) => {
                  setTipoFiltro(e.target.value as 'descripcion' | 'abreviatura');
                  setValorFiltro('');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="descripcion">Descripción</option>
                <option value="abreviatura">Abreviatura</option>
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
                placeholder={`Buscar por ${tipoFiltro}...`}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Estado
              </label>
              <select
                value={estadoFiltro}
                onChange={(e) => {
                  setEstadoFiltro(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-background border-x border-b border-border rounded-b-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Abreviatura</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Descripción</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Imagen</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bancosPaginados.map((banco, index) => (
                  <tr key={banco.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{banco.abreviatura || '-'}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{banco.descripcion}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center items-center gap-2">
                        {banco.imagen && (
                          <div className="w-20 h-20 border border-border rounded overflow-hidden bg-white">
                            <img 
                              src={`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/storage/${banco.imagen}`}
                              alt={banco.descripcion}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadImage(banco.id, e)}
                            disabled={uploadingImageId === banco.id}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white"
                            disabled={uploadingImageId === banco.id}
                            asChild
                          >
                            <span>
                              <Upload className="h-4 w-4 mr-1" />
                              {uploadingImageId === banco.id ? 'Subiendo...' : banco.imagen ? 'Cambiar' : 'Subir Imagen'}
                            </span>
                          </Button>
                        </label>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-blue-600 text-white hover:bg-blue-700 hover:text-white dark:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white"
                            >
                              Acciones
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(banco)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(banco)}
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
          <div className="bg-muted/30 px-4 py-3 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} registros
              </span>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Mostrar:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-2 py-1 border border-border rounded bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-muted-foreground">por página</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1 || totalPages === 0}
                variant="outline"
                size="sm"
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              {Array.from({ length: Math.min(Math.max(totalPages, 0), 5) }, (_, i) => {
                const pageNumbers = getPageNumbers();
                const pageNumber = pageNumbers[i];
                
                if (!pageNumber) return null;
                
                return (
                  <Button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    variant={currentPage === pageNumber ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    {pageNumber}
                  </Button>
                );
              })}

              <Button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                variant="outline"
                size="sm"
                className="h-8"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Crear/Editar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>{editingBanco ? 'Editar Banco' : 'Nuevo Banco'}</DialogTitle>
            <DialogDescription>
              {editingBanco ? 'Modifica los datos del banco.' : 'Completa los datos para crear un nuevo banco.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Input
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Ingrese nombre del banco"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="abreviatura">Abreviatura</Label>
              <Input
                id="abreviatura"
                value={formData.abreviatura}
                onChange={(e) => setFormData({ ...formData, abreviatura: e.target.value })}
                placeholder="Ingrese abreviatura"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="activo"
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="activo" className="cursor-pointer">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingBanco ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Eliminar */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar el banco <strong>"{bancoToDelete?.descripcion}"</strong>?
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
