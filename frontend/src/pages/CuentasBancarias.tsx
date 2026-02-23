import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { CuentaBancaria, CuentaBancariaFormData } from '@/types';
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

const initialFormData: CuentaBancariaFormData = {
  descripcion: '',
  numero: '',
  balance: 0,
  abreviatura: '',
  banco: '',
  moneda: 'PEN',
  activo: true,
};

export default function CuentasBancarias() {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState<'descripcion' | 'numero' | 'banco'>('descripcion');
  const [valorFiltro, setValorFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCuenta, setEditingCuenta] = useState<CuentaBancaria | null>(null);
  const [formData, setFormData] = useState<CuentaBancariaFormData>(initialFormData);
  const [cuentaToDelete, setCuentaToDelete] = useState<CuentaBancaria | null>(null);

  useEffect(() => {
    const fetchCuentas = async () => {
      try {
        const response = await api.cuentasBancarias.listar();
        setCuentas(response.data as CuentaBancaria[]);
      } catch {
        toast.error('Error al cargar las cuentas bancarias', {
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

    fetchCuentas();
  }, []);

  const cuentasFiltradas = cuentas.filter((cuenta) => {
    let cumpleFiltroGeneral = true;

    switch (tipoFiltro) {
      case 'descripcion':
        cumpleFiltroGeneral = cuenta.descripcion.toLowerCase().includes(valorFiltro.toLowerCase());
        break;
      case 'numero':
        cumpleFiltroGeneral = cuenta.numero.toLowerCase().includes(valorFiltro.toLowerCase());
        break;
      case 'banco':
        cumpleFiltroGeneral = cuenta.banco?.toLowerCase().includes(valorFiltro.toLowerCase()) || false;
        break;
      default:
        cumpleFiltroGeneral = true;
    }

    const cumpleEstado = estadoFiltro ? (estadoFiltro === 'activo' ? cuenta.activo : !cuenta.activo) : true;

    return cumpleFiltroGeneral && cumpleEstado;
  });

  const totalItems = cuentasFiltradas.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const cuentasPaginadas = cuentasFiltradas.slice(startIndex, endIndex);

  const handleEdit = (cuenta: CuentaBancaria) => {
    setEditingCuenta(cuenta);
    setFormData({
      descripcion: cuenta.descripcion,
      numero: cuenta.numero,
      balance: cuenta.balance,
      abreviatura: cuenta.abreviatura || '',
      banco: cuenta.banco || '',
      moneda: cuenta.moneda,
      activo: cuenta.activo,
    });
    setShowModal(true);
  };

  const handleDelete = (cuenta: CuentaBancaria) => {
    setCuentaToDelete(cuenta);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!cuentaToDelete) return;

    try {
      await api.cuentasBancarias.eliminar(cuentaToDelete.id);
      toast.success('Cuenta bancaria eliminada exitosamente', {
        duration: 4000,
        closeButton: true,
        richColors: true,
      });
      
      // Recargar cuentas
      const response = await api.cuentasBancarias.listar();
      setCuentas(response.data as CuentaBancaria[]);
      
      setShowDeleteModal(false);
      setCuentaToDelete(null);
    } catch {
      toast.error('Error al eliminar la cuenta bancaria', {
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
      if (editingCuenta) {
        await api.cuentasBancarias.actualizar(editingCuenta.id, formData as unknown as Record<string, unknown>);
        toast.success('Cuenta bancaria actualizada exitosamente', {
          duration: 4000,
          closeButton: true,
          richColors: true,
        });
      } else {
        await api.cuentasBancarias.crear(formData as unknown as Record<string, unknown>);
        toast.success('Cuenta bancaria creada exitosamente', {
          duration: 4000,
          closeButton: true,
          richColors: true,
        });
      }
      // Recargar cuentas
      const response = await api.cuentasBancarias.listar();
      setCuentas(response.data as CuentaBancaria[]);
      
      setShowModal(false);
      setEditingCuenta(null);
      setFormData(initialFormData);
    } catch {
      toast.error('Error al guardar la cuenta bancaria', {
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
    setEditingCuenta(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const formatCurrency = (value: number | string | null | undefined, currency: string = 'PEN') => {
    const symbol = currency === 'PEN' ? 'S/' : currency === 'USD' ? '$' : currency;
    const numValue = typeof value === 'number' ? value : parseFloat(String(value || 0));
    return `${symbol} ${numValue.toFixed(2)}`;
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
          <div className="text-center py-8 text-muted-foreground">Cargando cuentas bancarias...</div>
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
          <h1 className="text-xl font-semibold">Módulo de Cuentas Bancarias</h1>
          <Button
            onClick={handleNew}
            className="bg-background hover:bg-muted text-primary border border-border"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Nueva cuenta
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-muted/50 px-4 py-4 border-x border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">
                Filtrar por:
              </label>
              <select
                value={tipoFiltro}
                onChange={(e) => {
                  setTipoFiltro(e.target.value as 'descripcion' | 'numero' | 'banco');
                  setValorFiltro('');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="descripcion">Descripción</option>
                <option value="numero">Número</option>
                <option value="banco">Banco</option>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Descripción</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Creado por</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-foreground uppercase tracking-wider">Abreviatura</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cuentasPaginadas.map((cuenta, index) => (
                  <tr key={cuenta.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-foreground">{startIndex + index + 1}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{cuenta.descripcion}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{cuenta.created_by || '-'}</td>
                    <td className="px-4 py-3 text-sm text-foreground font-mono">{cuenta.numero}</td>
                    <td className="px-4 py-3 text-sm text-foreground font-semibold">{formatCurrency(cuenta.balance, cuenta.moneda)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{cuenta.abreviatura || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          onClick={() => handleEdit(cuenta)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(cuenta)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
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
            <DialogTitle>{editingCuenta ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}</DialogTitle>
            <DialogDescription>
              {editingCuenta ? 'Modifica los datos de la cuenta bancaria.' : 'Completa los datos para crear una nueva cuenta bancaria.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripción *</Label>
              <Input
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Ingrese descripción"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="numero">Número de Cuenta *</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                placeholder="Ingrese número de cuenta"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="balance">Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="moneda">Moneda</Label>
                <select
                  id="moneda"
                  value={formData.moneda}
                  onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="PEN">PEN (Soles)</option>
                  <option value="USD">USD (Dólares)</option>
                  <option value="EUR">EUR (Euros)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="banco">Banco</Label>
              <Input
                id="banco"
                value={formData.banco}
                onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
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
              {editingCuenta ? 'Actualizar' : 'Crear'}
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
              ¿Está seguro que desea eliminar la cuenta bancaria <strong>"{cuentaToDelete?.descripcion}"</strong>?
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
