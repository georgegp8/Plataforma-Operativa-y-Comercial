import { useState, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Transaccion, TransaccionFormData } from '@/types';
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

const initialFormData: TransaccionFormData = {
  descripcion: '',
  tipo: 'Entrada',
  activo: true,
};

export default function Transacciones() {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'descripcion'>('descripcion');
  const [valorFiltro, setValorFiltro] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTransaccion, setEditingTransaccion] = useState<Transaccion | null>(null);
  const [formData, setFormData] = useState<TransaccionFormData>(initialFormData);
  const [transaccionToDelete, setTransaccionToDelete] = useState<Transaccion | null>(null);

  useEffect(() => {
    const fetchTransacciones = async () => {
      try {
        const response = await api.transacciones.listar();
        setTransacciones(response.data as Transaccion[]);
      } catch {
        toast.error('Error al cargar las transacciones', {
          duration: 4000,
          closeButton: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTransacciones();
  }, []);

  const transaccionesFiltradas = transacciones.filter((transaccion) => {
    return transaccion.descripcion.toLowerCase().includes(valorFiltro.toLowerCase());
  });

  const totalItems = transaccionesFiltradas.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const transaccionesPaginadas = transaccionesFiltradas.slice(startIndex, endIndex);

  const handleEdit = (transaccion: Transaccion) => {
    setEditingTransaccion(transaccion);
    setFormData({
      descripcion: transaccion.descripcion,
      tipo: transaccion.tipo,
      activo: transaccion.activo,
    });
    setShowModal(true);
  };

  const handleDelete = (transaccion: Transaccion) => {
    setTransaccionToDelete(transaccion);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!transaccionToDelete) return;

    try {
      await api.transacciones.eliminar(transaccionToDelete.id);
      setTransacciones(transacciones.filter((t) => t.id !== transaccionToDelete.id));
      toast.success('Transacción eliminada exitosamente');
      setShowDeleteModal(false);
      setTransaccionToDelete(null);
    } catch {
      toast.error('Error al eliminar la transacción');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTransaccion(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTransaccion) {
        await api.transacciones.actualizar(editingTransaccion.id, formData as unknown as Record<string, unknown>);
        const response = await api.transacciones.listar();
        setTransacciones(response.data as Transaccion[]);
        toast.success('Transacción actualizada exitosamente');
      } else {
        await api.transacciones.crear(formData as unknown as Record<string, unknown>);
        const response = await api.transacciones.listar();
        setTransacciones(response.data as Transaccion[]);
        toast.success('Transacción creada exitosamente');
      }
      handleCloseModal();
    } catch {
      toast.error('Error al guardar la transacción');
    }
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
          <h1 className="text-xl font-semibold">Listado de Transacciones</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Filtrar por:</Label>
              <Select value={tipoFiltro} onValueChange={(value: 'descripcion') => setTipoFiltro(value)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="descripcion">Descripción</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Buscar:</Label>
              <Input
                type="text"
                value={valorFiltro}
                onChange={(e) => setValorFiltro(e.target.value)}
                placeholder="Ingrese descripción..."
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
                <th className="px-4 py-3 text-left text-sm font-semibold">Descripción</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Tipo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transaccionesPaginadas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No se encontraron transacciones
                  </td>
                </tr>
              ) : (
                transaccionesPaginadas.map((transaccion, index) => (
                  <tr key={transaccion.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 text-sm">{transaccion.descripcion}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        transaccion.tipo === 'Entrada'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {transaccion.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-1">
                            Acciones
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleEdit(transaccion)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(transaccion)}>
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
            <DialogTitle>{editingTransaccion ? 'Editar Transacción' : 'Nueva Transacción'}</DialogTitle>
            <DialogDescription>
              {editingTransaccion 
                ? 'Modifica los datos de la transacción existente.' 
                : 'Completa los datos para crear una nueva transacción.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="descripcion">Descripción *</Label>
                <Input
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  required
                  placeholder="Ingrese la descripción"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entrada">Entrada</SelectItem>
                    <SelectItem value="Salida">Salida</SelectItem>
                  </SelectContent>
                </Select>
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
                {editingTransaccion ? 'Actualizar' : 'Crear'}
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
              ¿Está seguro de que desea eliminar la transacción "{transaccionToDelete?.descripcion}"?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
