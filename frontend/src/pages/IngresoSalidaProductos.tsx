import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Download, ChevronLeft, ChevronRight, Loader2, Printer, RotateCcw, Inbox, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import api from '@/lib/api';
import { format } from 'date-fns';
import type { Categoria } from '@/types';
import { useEmpresa } from '@/hooks/useEmpresa';

interface MovimientoInventario {
    id: number;
    fecha: string;
    codigo_producto: string;
    nombre_producto: string;
    almacen: string;
    categoria_id?: number;
    categoria?: { id: number; nombre: string };
    cantidad: number;
    tipo: 'INGRESO' | 'SALIDA' | 'DEVOLUCION';
    ticket_id?: string;
}

const ALMACENES = ['Oficina Principal', 'Almacén Central'];

export default function IngresoSalidaProductos() {
    const { empresaId } = useEmpresa();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState<MovimientoInventario[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'INGRESO' | 'SALIDA' | 'DEVOLUCION'>('INGRESO');

    // Filters
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [filtroCategoria, setFiltroCategoria] = useState('todos');
    const [filtroAlmacen, setFiltroAlmacen] = useState('todos');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    // Modal form state
    const [formData, setFormData] = useState({
        almacen: '',
        nombre_producto: '',
        codigo_producto: '',
        categoria_id: '',
        cantidad: '',
        ticket_id: '',
        fecha: new Date().toISOString().split('T')[0],
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: Record<string, unknown> = {};
            if (empresaId) params.empresa_id = empresaId;
            if (filtroTipo !== 'todos') params.tipo = filtroTipo;
            if (filtroAlmacen !== 'todos') params.almacen = filtroAlmacen;
            if (filtroCategoria !== 'todos') params.categoria_id = filtroCategoria;
            if (fechaDesde) params.fecha_desde = fechaDesde;
            if (fechaHasta) params.fecha_hasta = fechaHasta;

            const res = await api.movimientosInventario.listar(params);
            const data = res.data;
            setItems(Array.isArray(data) ? data : (data as { data: MovimientoInventario[] }).data ?? []);
        } catch {
            toast.error('Error al cargar movimientos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchCategorias = async () => {
            try {
                const response = await api.categorias.listar();
                if (Array.isArray(response.data)) {
                    setCategorias(response.data as Categoria[]);
                }
            } catch {
                // categorias no bloqueantes
            }
        };
        fetchCategorias();
    }, []);

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresaId, filtroTipo, filtroAlmacen, filtroCategoria, fechaDesde, fechaHasta]);

    // Pagination logic
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = items.slice(startIndex, startIndex + itemsPerPage);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 5; i++) pages.push(i);
            } else if (currentPage >= totalPages - 2) {
                for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
            } else {
                for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
            }
        }
        return pages;
    };

    const handleOpenModal = (type: 'INGRESO' | 'SALIDA' | 'DEVOLUCION') => {
        setModalType(type);
        setFormData({
            almacen: ALMACENES[0],
            nombre_producto: '',
            codigo_producto: '',
            categoria_id: '',
            cantidad: '',
            ticket_id: '',
            fecha: new Date().toISOString().split('T')[0],
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.nombre_producto.trim()) {
            toast.error('El nombre del producto es requerido');
            return;
        }
        if (!formData.cantidad || Number(formData.cantidad) <= 0) {
            toast.error('La cantidad debe ser mayor a 0');
            return;
        }
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                empresa_id: empresaId,
                fecha: formData.fecha,
                nombre_producto: formData.nombre_producto.trim(),
                codigo_producto: formData.codigo_producto || null,
                almacen: formData.almacen || null,
                categoria_id: formData.categoria_id || null,
                cantidad: Number(formData.cantidad),
                tipo: modalType,
                ticket_id: formData.ticket_id || null,
            };

            await api.movimientosInventario.registrar(payload);
            toast.success(`${modalType === 'DEVOLUCION' ? 'Devolución' : modalType === 'INGRESO' ? 'Ingreso' : 'Salida'} registrado correctamente`);
            setIsModalOpen(false);
            fetchData();
        } catch {
            toast.error('Error al registrar el movimiento');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este movimiento?')) return;
        try {
            await api.movimientosInventario.eliminar(id);
            toast.success('Movimiento eliminado correctamente');
            setItems(items.filter(i => i.id !== id));
        } catch {
            toast.error('Error al eliminar el movimiento');
        }
    };

    const handleAction = (action: string) => {
        toast.info(action);
    };

    const getBadgeVariant = (tipo: string) => {
        switch (tipo) {
            case 'INGRESO': return 'bg-green-600 hover:bg-green-700';
            case 'SALIDA': return 'bg-red-600 hover:bg-red-700';
            case 'DEVOLUCION': return 'bg-blue-600 hover:bg-blue-700';
            default: return 'bg-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <NubofactHeader />
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        <Inbox className="h-5 w-5" />
                        Ingreso y Salida de Productos
                    </h1>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground border border-primary-foreground/20"
                            onClick={() => handleOpenModal('DEVOLUCION')}
                        >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Devolución
                        </Button>
                        <Button
                            variant="ghost"
                            className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground border border-primary-foreground/20"
                            onClick={() => handleOpenModal('INGRESO')}
                        >
                            <ArrowDownCircle className="h-4 w-4 mr-1" />
                            Ingreso
                        </Button>
                        <Button
                            variant="ghost"
                            className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground border border-primary-foreground/20"
                            onClick={() => handleOpenModal('SALIDA')}
                        >
                            <ArrowUpCircle className="h-4 w-4 mr-1" />
                            Salida
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-muted/50 px-4 py-4 border-x border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div>
                            <select
                                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                                value={filtroAlmacen}
                                onChange={(e) => { setFiltroAlmacen(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="todos">Seleccione Almacén</option>
                                {ALMACENES.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <select
                                className="w-full px-3 py-2 border border-border rounded-md bg-white dark:bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                                value={filtroCategoria}
                                onChange={(e) => { setFiltroCategoria(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="todos">Seleccione Categoría</option>
                                {categorias.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Input
                                type="date"
                                value={fechaDesde}
                                onChange={(e) => { setFechaDesde(e.target.value); setCurrentPage(1); }}
                                className="bg-white dark:bg-background h-10"
                            />
                        </div>
                        <div>
                            <Input
                                type="date"
                                value={fechaHasta}
                                onChange={(e) => { setFechaHasta(e.target.value); setCurrentPage(1); }}
                                className="bg-white dark:bg-background h-10"
                            />
                        </div>
                        <div>{/* Spacer */}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end mt-2">
                        <div>
                            <select
                                value={filtroTipo}
                                onChange={(e) => { setFiltroTipo(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 border border-border rounded-md bg-white dark:bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                            >
                                <option value="todos">Tipo de Ingreso/Salida</option>
                                <option value="INGRESO">Ingreso</option>
                                <option value="SALIDA">Salida</option>
                                <option value="DEVOLUCION">Devolución</option>
                            </select>
                        </div>
                        <div>{/* Spacer */}</div>
                        <div>{/* Spacer */}</div>
                        <div>{/* Spacer */}</div>
                        <div>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white w-full"
                                size="sm"
                                onClick={() => handleAction('Exportar Excel')}
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Exportar Excel
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <Card className="rounded-t-none border-t-0">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : items.length === 0 ? (
                            <div className="p-8">
                                <EmptyState
                                    icon={Inbox}
                                    title="No hay movimientos"
                                    description="No se han registrado ingresos ni salidas."
                                    className="py-12"
                                />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-primary hover:bg-primary">
                                            <TableHead className="w-12 py-2 px-2 text-primary-foreground">#</TableHead>
                                            <TableHead className="min-w-32 py-2 px-2 text-primary-foreground">Fecha</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-primary-foreground">Código</TableHead>
                                            <TableHead className="min-w-32 py-2 px-2 text-primary-foreground">Categoría</TableHead>
                                            <TableHead className="w-full py-2 px-2 text-primary-foreground">Producto</TableHead>
                                            <TableHead className="min-w-32 py-2 px-2 text-primary-foreground">Almacén</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-primary-foreground">Cantidad</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-center text-primary-foreground">Tipo</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-center text-primary-foreground">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((item, index) => (
                                            <TableRow key={item.id} className="hover:bg-muted/50">
                                                <TableCell className="py-2 px-2 text-center text-xs text-muted-foreground font-medium">
                                                    {startIndex + index + 1}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 font-medium text-xs">
                                                    <div>{format(new Date(item.fecha), 'yyyy-MM-dd')}</div>
                                                    <div className="text-gray-500">{format(new Date(item.fecha), 'HH:mm:ss')}</div>
                                                </TableCell>
                                                <TableCell className="py-2 px-2 font-mono text-xs text-muted-foreground font-medium">
                                                    {item.codigo_producto || '-'}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-xs text-muted-foreground">
                                                    {item.categoria?.nombre || '-'}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 font-medium text-xs text-foreground">
                                                    {item.nombre_producto}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-xs text-muted-foreground">
                                                    {item.almacen || '-'}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-xs font-mono">
                                                    {Number(item.cantidad).toFixed(2)}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-center">
                                                    <Badge className={`${getBadgeVariant(item.tipo)} text-white`} variant="outline">
                                                        {item.tipo.charAt(0) + item.tipo.slice(1).toLowerCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="default"
                                                            size="icon"
                                                            className="h-7 w-7 bg-[#0f2c4c] hover:bg-[#0f2c4c]/90"
                                                            onClick={() => handleAction('Imprimir Ticket')}
                                                        >
                                                            <Printer className="h-3 w-3 text-white" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            className="h-7 w-7 bg-red-600 hover:bg-red-700"
                                                            onClick={() => handleDelete(item.id)}
                                                        >
                                                            <RotateCcw className="h-3 w-3 text-white" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Pagination */}
                        <div className="flex items-center justify-between border-t border-border px-4 py-4 sm:px-6">
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
                                    registros | Mostrando {items.length === 0 ? 0 : startIndex + 1} a {Math.min(startIndex + itemsPerPage, items.length)} de {items.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="h-8"
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" />
                                    Anterior
                                </Button>

                                {getPageNumbers().map((page) => (
                                    <Button
                                        key={page}
                                        variant={currentPage === page ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                        className={`h-8 min-w-8 ${currentPage === page
                                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            : ''
                                            }`}
                                    >
                                        {page}
                                    </Button>
                                ))}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="h-8"
                                >
                                    Siguiente
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CRUD Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {modalType === 'INGRESO' && 'Registrar Nuevo Ingreso'}
                                {modalType === 'SALIDA' && 'Registrar Nueva Salida'}
                                {modalType === 'DEVOLUCION' && 'Registrar Devolución'}
                            </DialogTitle>
                            <DialogDescription>
                                Ingrese los detalles de la operación.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Fecha</Label>
                                    <Input
                                        type="date"
                                        value={formData.fecha}
                                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label>Almacén</Label>
                                    <Select
                                        value={formData.almacen}
                                        onValueChange={(val) => setFormData({ ...formData, almacen: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccione Almacén" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ALMACENES.map(a => (
                                                <SelectItem key={a} value={a}>{a}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Código de Producto</Label>
                                    <Input
                                        value={formData.codigo_producto}
                                        onChange={(e) => setFormData({ ...formData, codigo_producto: e.target.value })}
                                        placeholder="Ej: 100032"
                                    />
                                </div>
                                <div>
                                    <Label>Categoría</Label>
                                    <Select
                                        value={formData.categoria_id}
                                        onValueChange={(val) => setFormData({ ...formData, categoria_id: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Sin categoría" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categorias.map((cat) => (
                                                <SelectItem key={cat.id} value={String(cat.id)}>{cat.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label>Nombre del Producto <span className="text-red-500">*</span></Label>
                                <Input
                                    value={formData.nombre_producto}
                                    onChange={(e) => setFormData({ ...formData, nombre_producto: e.target.value })}
                                    placeholder="Nombre del producto"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Cantidad <span className="text-red-500">*</span></Label>
                                    <Input
                                        type="number"
                                        value={formData.cantidad}
                                        onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                                        placeholder="0.00"
                                        min="0.001"
                                        step="0.001"
                                    />
                                </div>
                                <div>
                                    <Label>Ticket ID</Label>
                                    <Input
                                        value={formData.ticket_id}
                                        onChange={(e) => setFormData({ ...formData, ticket_id: e.target.value })}
                                        placeholder="Opcional"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Guardar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
