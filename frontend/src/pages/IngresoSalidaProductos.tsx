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
import { format } from 'date-fns';


// Mock data types
interface MovimientoInventario {
    id: number;
    fecha: string; // ISO string
    codigo_producto: string;
    nombre_producto: string;
    almacen: string;
    cantidad: number;
    tipo: 'INGRESO' | 'SALIDA' | 'DEVOLUCION';
    ticket_id?: string;
}

export default function IngresoSalidaProductos() {
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<MovimientoInventario[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'INGRESO' | 'SALIDA' | 'DEVOLUCION'>('INGRESO');

    // Filters
    const [filtroTipo, setFiltroTipo] = useState('todos');
    // const [fechaInicio, setFechaInicio] = useState('');
    // const [fechaFin, setFechaFin] = useState('');

    // Seed data generator
    const generateSeedData = () => {
        const baseData: MovimientoInventario[] = [
            { id: 1, fecha: '2025-07-04T06:14:11', codigo_producto: '100032', nombre_producto: 'EPI-DERM EDG-499 (3X3X0.9)', almacen: 'Oficina Principal', cantidad: 0.00, tipo: 'SALIDA' },
            { id: 2, fecha: '2025-07-04T06:14:11', codigo_producto: '100033', nombre_producto: 'SVR XERIAL 10 LAIT 400ML', almacen: 'Oficina Principal', cantidad: 6.00, tipo: 'SALIDA' },
            { id: 3, fecha: '2025-07-04T06:13:01', codigo_producto: '100032', nombre_producto: 'EPI-DERM EDG-499 (3X3X0.9)', almacen: 'Oficina Principal', cantidad: 20.00, tipo: 'SALIDA' },
            { id: 4, fecha: '2025-07-04T05:47:27', codigo_producto: '100389', nombre_producto: 'XERIAL 50 EXTREME CREME PIEDS X50ML SVR', almacen: 'Oficina Principal', cantidad: 1.00, tipo: 'SALIDA' },
            { id: 5, fecha: '2025-07-04T05:47:27', codigo_producto: '100391', nombre_producto: 'MINI CAPITAL SOLEIL UV AGE DAILY', almacen: 'Oficina Principal', cantidad: 14.00, tipo: 'SALIDA' },
            { id: 6, fecha: '2025-07-03T18:30:00', codigo_producto: '100101', nombre_producto: 'CETAPHIL LOCION LIMPIADORA 237ML', almacen: 'Almacén Central', cantidad: 50.00, tipo: 'INGRESO' },
            { id: 7, fecha: '2025-07-03T15:20:15', codigo_producto: '100205', nombre_producto: 'LA ROCHE POSAY ANTHELIOS 50+', almacen: 'Oficina Principal', cantidad: 2.00, tipo: 'DEVOLUCION' },
            { id: 8, fecha: '2025-07-02T09:10:00', codigo_producto: '100389', nombre_producto: 'XERIAL 50 EXTREME CREME PIEDS X50ML SVR', almacen: 'Almacén Central', cantidad: 100.00, tipo: 'INGRESO' },
            { id: 9, fecha: '2025-07-01T14:45:30', codigo_producto: '100033', nombre_producto: 'SVR XERIAL 10 LAIT 400ML', almacen: 'Oficina Principal', cantidad: 5.00, tipo: 'SALIDA' },
            { id: 10, fecha: '2025-07-01T11:00:00', codigo_producto: '100032', nombre_producto: 'EPI-DERM EDG-499 (3X3X0.9)', almacen: 'Almacén Central', cantidad: 10.00, tipo: 'SALIDA' },
            { id: 11, fecha: '2025-06-30T16:20:00', codigo_producto: '100101', nombre_producto: 'CETAPHIL LOCION LIMPIADORA 237ML', almacen: 'Oficina Principal', cantidad: 1.00, tipo: 'DEVOLUCION' },
            { id: 12, fecha: '2025-06-29T10:00:00', codigo_producto: '100391', nombre_producto: 'MINI CAPITAL SOLEIL UV AGE DAILY', almacen: 'Almacén Central', cantidad: 25.00, tipo: 'INGRESO' },
        ];
        return baseData;
    };

    // Load data
    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setItems(generateSeedData());
            setLoading(false);
        }, 500);
    }, []);

    // Filter logic
    const filteredItems = items.filter(item => {
        if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) return false;
        // Basic implementation for other filters which are mostly visual in mock
        return true;
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // ... (Simple logic for brevity, can duplicate full logic if needed)
            for (let i = 1; i <= Math.min(totalPages, 5); i++) pages.push(i);
        }
        return pages;
    };

    const handleOpenModal = (type: 'INGRESO' | 'SALIDA' | 'DEVOLUCION') => {
        setModalType(type);
        setIsModalOpen(true);
    };

    const handleAction = (action: string) => {
        toast.info(action);
    };

    const getBadgeVariant = (tipo: string) => {
        switch (tipo) {
            case 'INGRESO': return 'bg-green-600 hover:bg-green-700';
            case 'SALIDA': return 'bg-red-600 hover:bg-red-700'; // Screenshot has dark red for Salida
            case 'DEVOLUCION': return 'bg-blue-600 hover:bg-blue-700';
            default: return 'bg-gray-600';
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <NubofactHeader />
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
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
                            <select className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm">
                                <option value="todos">Seleccione Almacén</option>
                                <option value="principal">Oficina Principal</option>
                                <option value="central">Almacén Central</option>
                            </select>
                        </div>
                        <div>
                            <select className="w-full px-3 py-2 border border-border rounded-md bg-white dark:bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm">
                                <option value="todos">Seleccione Categoría</option>
                            </select>
                        </div>
                        <div>
                            <Input type="date" placeholder="Fecha inicial" className="bg-white dark:bg-background h-10" />
                        </div>
                        <div>
                            <Input type="date" placeholder="Fecha final" className="bg-white dark:bg-background h-10" />
                        </div>
                        <div className="flex gap-2">
                            {/* Need "Exportar Excel" green button */}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end mt-2">
                        <div>
                            <select className="w-full px-3 py-2 border border-border rounded-md bg-white dark:bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-sm">
                                <option value="todos">Seleccione Producto</option>
                            </select>
                        </div>
                        <div>
                            <select
                                value={filtroTipo}
                                onChange={(e) => setFiltroTipo(e.target.value)}
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
                                            <TableHead className="w-full py-2 px-2 text-primary-foreground">Producto</TableHead>
                                            <TableHead className="min-w-32 py-2 px-2 text-primary-foreground">Almacén</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-primary-foreground">Cantidad</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-center text-primary-foreground">Tipo</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-center text-primary-foreground">Ticket</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((item, index) => (
                                            <TableRow key={item.id} className="hover:bg-muted/50">
                                                <TableCell className="py-2 px-2 text-center text-xs text-muted-foreground font-medium">
                                                    {startIndex + index + 1}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-white-500 font-medium text-xs">
                                                    <div>{format(new Date(item.fecha), 'yyyy-MM-dd')}</div>
                                                    <div className="text-gray-500">{format(new Date(item.fecha), 'HH:mm:ss')}</div>
                                                </TableCell>
                                                <TableCell className="py-2 px-2 font-mono text-xs text-muted-foreground font-medium">
                                                    {item.codigo_producto}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 font-medium text-xs text-foreground">
                                                    {item.nombre_producto}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-xs text-muted-foreground">
                                                    {item.almacen}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-xs font-mono">
                                                    {item.cantidad.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-center">
                                                    <Badge className={`${getBadgeVariant(item.tipo)} text-white hover:{getBadgeVariant(item.tipo)}`} variant="outline">
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
                                                            onClick={() => handleAction('Revertir Operación')}
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

                        {/* Pagination Standard */}
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
                                    registros | Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredItems.length)} de {filteredItems.length}
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
                                        className={`h-8 min-w-[2rem] ${currentPage === page
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
                                    disabled={currentPage === totalPages}
                                    className="h-8"
                                >
                                    Siguiente
                                    <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Mock CRUD Modal */}
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
                            <div>
                                <Label>Almacén</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione Almacén" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="principal">Oficina Principal</SelectItem>
                                        <SelectItem value="central">Almacén Central</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Producto</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione Producto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="p1">EPI-DERM EDG-499</SelectItem>
                                        <SelectItem value="p2">SVR XERIAL 10</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Cantidad</Label>
                                <Input type="number" placeholder="0.00" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button onClick={() => {
                                toast.success(`${modalType} registrado correctamente (Mock)`);
                                setIsModalOpen(false);
                            }}>
                                Guardar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
