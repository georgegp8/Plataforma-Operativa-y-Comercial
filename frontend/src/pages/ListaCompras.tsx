import { useState, useEffect } from 'react';
import { Plus, Download, ChevronLeft, ChevronRight, Pencil, Trash2, Eye } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Compra, CompraFormData } from '@/types';
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

export default function ListaCompras() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState('numero');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<CompraFormData>({
    actividad: '',
    fecha_actividad: '',
    proveedor_id: 0,
    proveedor_nombre: '',
    proveedor_ruc: '',
    estado: 'Pendiente de pago',
    tipo_comprobante: 'F',
    serie_comprobante: '',
    numero_comprobante: '',
    comprobante_completo: '',
    tipo_comprobante_desc: 'FACTURA ELECTRONICA',
    moneda: 'PEN',
    total: 0,
    cantidad_productos: 0,
    activo: true,
  });

  useEffect(() => {
    fetchCompras();
  }, []);

  const fetchCompras = async () => {
    try {
      setLoading(true);
      const response = await api.compras.listar();
      setCompras((response.data as Compra[]) || []);
    } catch (error) {
      console.error('Error al cargar compras:', error);
      toast.error('Error al cargar la lista de compras');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (compra: Compra) => {
    setSelectedCompra(compra);
    setFormData({
      actividad: compra.actividad,
      fecha_actividad: compra.fecha_actividad,
      proveedor_id: compra.proveedor_id,
      proveedor_nombre: compra.proveedor_nombre,
      proveedor_ruc: compra.proveedor_ruc,
      estado: compra.estado,
      tipo_comprobante: compra.tipo_comprobante,
      serie_comprobante: compra.serie_comprobante,
      numero_comprobante: compra.numero_comprobante,
      comprobante_completo: compra.comprobante_completo,
      tipo_comprobante_desc: compra.tipo_comprobante_desc,
      moneda: compra.moneda,
      total: compra.total,
      cantidad_productos: compra.cantidad_productos,
      activo: compra.activo,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (compra: Compra) => {
    setSelectedCompra(compra);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCompra) return;

    try {
      await api.compras.eliminar(selectedCompra.id);
      toast.success('Compra eliminada correctamente');
      setIsDeleteModalOpen(false);
      setSelectedCompra(null);
      fetchCompras();
    } catch (error) {
      console.error('Error al eliminar compra:', error);
      toast.error('Error al eliminar la compra');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (selectedCompra) {
        await api.compras.actualizar(selectedCompra.id, formData as unknown as Record<string, unknown>);
        toast.success('Compra actualizada correctamente');
      } else {
        await api.compras.crear(formData as unknown as Record<string, unknown>);
        toast.success('Compra creada correctamente');
      }

      setIsModalOpen(false);
      setSelectedCompra(null);
      resetForm();
      fetchCompras();
    } catch (error) {
      console.error('Error al guardar compra:', error);
      toast.error('Error al guardar la compra');
    }
  };

  const resetForm = () => {
    setFormData({
      actividad: '',
      fecha_actividad: '',
      proveedor_id: 0,
      proveedor_nombre: '',
      proveedor_ruc: '',
      estado: 'Pendiente de pago',
      tipo_comprobante: 'F',
      serie_comprobante: '',
      numero_comprobante: '',
      comprobante_completo: '',
      tipo_comprobante_desc: 'FACTURA ELECTRONICA',
      moneda: 'PEN',
      total: 0,
      cantidad_productos: 0,
      activo: true,
    });
  };

  const handleNewCompra = () => {
    setSelectedCompra(null);
    resetForm();
    setIsModalOpen(true);
  };

  // Filtrar compras
  const filteredCompras = compras.filter((compra) => {
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();

    switch (filterType) {
      case 'numero':
        return compra.comprobante_completo.toLowerCase().includes(term);
      case 'proveedor':
        return compra.proveedor_nombre.toLowerCase().includes(term) ||
          compra.proveedor_ruc.includes(term);
      case 'estado':
        return compra.estado.toLowerCase().includes(term);
      default:
        return true;
    }
  });

  // Paginación
  const totalPages = Math.ceil(filteredCompras.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCompras = filteredCompras.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            Módulo de Compras
          </h1>
          <button
            onClick={handleNewCompra}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo
          </button>
        </div>

        {/* Filters */}
        <div className="bg-muted/50 px-4 py-4 border-x border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="filterType" className="text-sm">Filtrar por:</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filterType" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numero">Número</SelectItem>
                  <SelectItem value="proveedor">Proveedor</SelectItem>
                  <SelectItem value="estado">Estado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm">Buscar</Label>
              <Input
                id="search"
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-b-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">#</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Actividad</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Proveedor</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Estado</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Comprobante</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-foreground">Productos</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-foreground">Moneda</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-foreground">Total</th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      Cargando...
                    </td>
                  </tr>
                ) : currentCompras.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      No hay compras registradas
                    </td>
                  </tr>
                ) : (
                  currentCompras.map((compra, index) => (
                    <tr key={compra.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground">{startIndex + index + 1}</td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <div className="flex flex-col">
                          <span className="font-medium">{compra.actividad}:</span>
                          <span className="text-xs text-muted-foreground">{formatDate(compra.fecha_actividad)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <div className="flex flex-col">
                          <span className="font-medium">{compra.proveedor_nombre}</span>
                          <span className="text-xs text-muted-foreground">{compra.proveedor_ruc}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{compra.estado}</td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        <div className="flex flex-col">
                          <span className="font-medium">{compra.comprobante_completo}</span>
                          <span className="text-xs text-muted-foreground">{compra.tipo_comprobante_desc}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toast.info('Funcionalidad de visualización de productos en desarrollo')}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 mx-auto"
                        >
                          <Eye className="h-3 w-3" />
                          Ver
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{compra.moneda}</td>
                      <td className="px-4 py-3 text-sm text-foreground text-right font-medium">{Number(compra.total).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">
                              Acciones
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(compra)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(compra)}
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
          </div>

          {/* Pagination */}
          {!loading && (
            <div className="flex items-center justify-between border-t border-border px-4 py-4 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => goToPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                    <span className="font-medium">
                      {Math.min(endIndex, filteredCompras.length)}
                    </span>{' '}
                    de <span className="font-medium">{filteredCompras.length}</span> resultados
                  </p>
                </div>
                <div className="flex items-center gap-4">
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
                    <span className="text-sm text-muted-foreground">registros</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => goToPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
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
                          onClick={() => goToPage(page)}
                          className={`px-3 py-1 text-sm border border-border rounded transition-colors ${currentPage === page
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background hover:bg-muted'
                            }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
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
          )}
        </div>

        {/* Modal Crear/Editar */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-150">
            <DialogHeader>
              <DialogTitle>{selectedCompra ? 'Editar Compra' : 'Nueva Compra'}</DialogTitle>
              <DialogDescription>
                {selectedCompra
                  ? 'Modifica los datos de la compra'
                  : 'Ingresa los datos de la nueva compra'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="proveedor_nombre">Proveedor *</Label>
                    <Input
                      id="proveedor_nombre"
                      value={formData.proveedor_nombre}
                      onChange={(e) => setFormData({ ...formData, proveedor_nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proveedor_ruc">RUC *</Label>
                    <Input
                      id="proveedor_ruc"
                      value={formData.proveedor_ruc}
                      onChange={(e) => setFormData({ ...formData, proveedor_ruc: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_comprobante">Tipo Comprobante *</Label>
                    <Select
                      value={formData.tipo_comprobante}
                      onValueChange={(value) => setFormData({ ...formData, tipo_comprobante: value })}
                    >
                      <SelectTrigger id="tipo_comprobante">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="F">Factura</SelectItem>
                        <SelectItem value="B">Boleta</SelectItem>
                        <SelectItem value="E">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Input
                      id="estado"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serie_comprobante">Serie *</Label>
                    <Input
                      id="serie_comprobante"
                      value={formData.serie_comprobante}
                      onChange={(e) => setFormData({ ...formData, serie_comprobante: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numero_comprobante">Número *</Label>
                    <Input
                      id="numero_comprobante"
                      value={formData.numero_comprobante}
                      onChange={(e) => setFormData({ ...formData, numero_comprobante: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="moneda">Moneda *</Label>
                    <Select
                      value={formData.moneda}
                      onValueChange={(value) => setFormData({ ...formData, moneda: value })}
                    >
                      <SelectTrigger id="moneda">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PEN">PEN - Soles</SelectItem>
                        <SelectItem value="USD">USD - Dólares</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total">Total *</Label>
                    <Input
                      id="total"
                      type="number"
                      step="0.01"
                      value={formData.total}
                      onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedCompra(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {selectedCompra ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Eliminar */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar Compra</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas eliminar esta compra? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedCompra(null);
                }}
              >
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
