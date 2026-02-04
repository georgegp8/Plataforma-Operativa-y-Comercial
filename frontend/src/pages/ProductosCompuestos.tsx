import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Plus, Package, Download, ChevronLeft, ChevronRight, Search, Loader2, Pencil, Trash2, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';

// Mock data type since we don't have a backend table yet
interface ProductoCompuesto {
    id: number;
    codigo_interno: string;
    unidad: string;
    nombre: string;
    precio_unitario_venta: number;
    tiene_igv: boolean;
}

export default function ProductosCompuestos() {
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('nombre');
    const [items, setItems] = useState<ProductoCompuesto[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductoCompuesto | null>(null);
    const [formData, setFormData] = useState({
        codigo_interno: '',
        unidad: 'NIU',
        nombre: '',
        precio_unitario_venta: '',
        tiene_igv: true
    });

    // Seed data generator
    const generateSeedData = () => {
        const baseData = [
            { id: 1, codigo_interno: 'K001', unidad: 'NIU', nombre: 'KIT ESCOLAR BÁSICO (PRIMARIA)', precio_unitario_venta: 45.00, tiene_igv: true },
            { id: 2, codigo_interno: 'OFE-2024-001', unidad: 'ZZ', nombre: 'PACK LIMPIEZA TOTAL 3x2', precio_unitario_venta: 25.90, tiene_igv: true },
            { id: 3, codigo_interno: 'GIFT-BOX-05', unidad: 'NIU', nombre: 'CANASTA NAVIDEÑA PREMIUM', precio_unitario_venta: 120.50, tiene_igv: true },
            { id: 4, codigo_interno: 'K002', unidad: 'NIU', nombre: 'KIT ESCOLAR SECUNDARIA', precio_unitario_venta: 65.00, tiene_igv: true },
            { id: 5, codigo_interno: 'OFE-2024-002', unidad: 'ZZ', nombre: 'PACK VERANO 2024', precio_unitario_venta: 35.50, tiene_igv: true },
            { id: 6, codigo_interno: 'K003', unidad: 'NIU', nombre: 'KIT OFICINA HOME OFFICE', precio_unitario_venta: 150.00, tiene_igv: true },
            { id: 7, codigo_interno: 'OFE-2024-003', unidad: 'ZZ', nombre: 'OFERTA 2x1 DETERGENTE', precio_unitario_venta: 18.90, tiene_igv: true },
            { id: 8, codigo_interno: 'K004', unidad: 'NIU', nombre: 'KIT LIMPIEZA AUTO', precio_unitario_venta: 40.00, tiene_igv: true },
            { id: 9, codigo_interno: 'OFE-2024-004', unidad: 'ZZ', nombre: 'PACK DESAYUNO FAMILIAR', precio_unitario_venta: 28.50, tiene_igv: false },
            { id: 10, codigo_interno: 'K005', unidad: 'NIU', nombre: 'KIT PRIMEROS AUXILIOS', precio_unitario_venta: 55.00, tiene_igv: true },
            { id: 11, codigo_interno: 'OFE-2024-005', unidad: 'ZZ', nombre: 'PACK ASEO PERSONAL', precio_unitario_venta: 22.00, tiene_igv: true },
            { id: 12, codigo_interno: 'K006', unidad: 'NIU', nombre: 'KIT JARDINERÍA BÁSICO', precio_unitario_venta: 75.00, tiene_igv: true },
            { id: 13, codigo_interno: 'OFE-2024-006', unidad: 'ZZ', nombre: 'PACK MERIENDA ESCOLAR', precio_unitario_venta: 15.50, tiene_igv: false },
            { id: 14, codigo_interno: 'K007', unidad: 'NIU', nombre: 'KIT PINTURA INFANTIL', precio_unitario_venta: 32.00, tiene_igv: true },
            { id: 15, codigo_interno: 'OFE-2024-007', unidad: 'ZZ', nombre: 'OFERTA FRUTAS FRESCAS', precio_unitario_venta: 20.00, tiene_igv: false },
        ];
        return baseData;
    };

    // Mock loading effect
    useEffect(() => {
        setLoading(true);
        // Simulate API call with mock data
        setTimeout(() => {
            setItems(generateSeedData());
            setLoading(false);
        }, 500);
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBusqueda(e.target.value);
        setCurrentPage(1);
    };

    // Filter items logic
    const filteredItems = items.filter(item => {
        const term = busqueda.toLowerCase();
        if (!term) return true;

        switch (filtroTipo) {
            case 'codigo':
                return item.codigo_interno.toLowerCase().includes(term);
            case 'unidad':
                return item.unidad.toLowerCase().includes(term);
            case 'nombre':
            default:
                return item.nombre.toLowerCase().includes(term);
        }
    });

    // Pagination logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    // Generate page numbers for pagination
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 5; i++) {
                    pages.push(i);
                }
            } else if (currentPage >= totalPages - 2) {
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                for (let i = currentPage - 2; i <= currentPage + 2; i++) {
                    pages.push(i);
                }
            }
        }
        return pages;
    };

    const handleOpenModal = (product: ProductoCompuesto | null = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                codigo_interno: product.codigo_interno,
                unidad: product.unidad,
                nombre: product.nombre,
                precio_unitario_venta: product.precio_unitario_venta.toString(),
                tiene_igv: product.tiene_igv
            });
        } else {
            setEditingProduct(null);
            setFormData({
                codigo_interno: '',
                unidad: 'NIU',
                nombre: '',
                precio_unitario_venta: '',
                tiene_igv: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        const newProduct: ProductoCompuesto = {
            id: editingProduct ? editingProduct.id : Math.max(...items.map(i => i.id), 0) + 1,
            codigo_interno: formData.codigo_interno,
            unidad: formData.unidad,
            nombre: formData.nombre,
            precio_unitario_venta: parseFloat(formData.precio_unitario_venta) || 0,
            tiene_igv: formData.tiene_igv
        };

        if (editingProduct) {
            setItems(items.map(i => i.id === editingProduct.id ? newProduct : i));
            toast.success('Producto actualizado correctamente');
        } else {
            setItems([newProduct, ...items]);
            toast.success('Producto creado correctamente');
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: number) => {
        if (confirm('¿Estás seguro de eliminar este producto?')) {
            setItems(items.filter(i => i.id !== id));
            toast.success('Producto eliminado correctamente');
        }
    };

    const handleAction = (action: string) => {
        toast.info(`Funcionalidad de ${action} no implementada aún`);
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <NubofactHeader />
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        <Gift className="h-5 w-5" />
                        Productos Compuestos (Ofertas)
                    </h1>
                    <Button
                        onClick={() => handleOpenModal()}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Nuevo
                    </Button>
                </div>

                {/* Filters */}
                <div className="bg-muted/50 px-4 py-4 border-x border-border">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full md:w-1/4">
                            <label className="block text-sm font-medium mb-1 text-foreground">Filtrar por</label>
                            <select
                                value={filtroTipo}
                                onChange={(e) => {
                                    setFiltroTipo(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="nombre">Nombre</option>
                                <option value="codigo">Código</option>
                                <option value="unidad">Unidad</option>
                            </select>
                        </div>
                        <div className="w-full md:w-1/2 relative">
                            <label className="block text-sm font-medium mb-1 text-foreground">Buscar</label>
                            <div className="relative">
                                <Input
                                    value={busqueda}
                                    onChange={handleSearch}
                                    placeholder="Buscar..."
                                    className="w-full pl-10"
                                />
                                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="w-full md:w-auto">
                            <Button
                                onClick={() => handleAction('Exportar')}
                                className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
                                size="sm"
                            >
                                <Download className="h-4 w-4 mr-1" />
                                Exportar
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
                                    icon={Package}
                                    title="No hay productos compuestos"
                                    description="Comienza creando tu primer producto compuesto u oferta."
                                    action={
                                        <Button onClick={() => handleOpenModal()}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Crear nuevo
                                        </Button>
                                    }
                                    className="py-12"
                                />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-primary hover:bg-primary">
                                            <TableHead className="w-12 py-2 px-2 text-white">#</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-white">Cód. Interno</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-white">Unidad</TableHead>
                                            <TableHead className="w-full py-2 px-2 text-white">Nombre</TableHead>
                                            <TableHead className="min-w-32 py-2 px-2 text-right text-white">P.Unitario (Venta)</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-center text-white">Tiene Igv</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-right text-white">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedItems.map((item, index) => (
                                            <TableRow key={item.id} className="hover:bg-muted/50">
                                                <TableCell className="py-2 px-2 text-center">{startIndex + index + 1}</TableCell>
                                                <TableCell className="py-2 px-2 font-mono text-sm">{item.codigo_interno}</TableCell>
                                                <TableCell className="py-2 px-2">
                                                    <Badge variant="secondary" className="font-mono text-xs">{item.unidad}</Badge>
                                                </TableCell>
                                                <TableCell className="py-2 px-2 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <Gift className="h-4 w-4 text-purple-500" />
                                                        {item.nombre}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-right font-mono text-sm">
                                                    S/ {item.precio_unitario_venta.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-center">
                                                    <Badge variant={item.tiene_igv ? "default" : "secondary"} className={item.tiene_igv ? "bg-blue-600 hover:bg-blue-700" : ""}>
                                                        {item.tiene_igv ? "Si" : "No"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-2 px-2 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleOpenModal(item)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                                                            <Trash2 className="h-4 w-4" />
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

                {/* Create/Edit Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingProduct ? 'Editar Producto Compuesto' : 'Nuevo Producto Compuesto'}</DialogTitle>
                            <DialogDescription>
                                {editingProduct ? 'Modifica los datos del producto compuesto.' : 'Ingresa los datos para el nuevo producto compuesto u oferta.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="codigo">Código Interno</Label>
                                    <Input
                                        id="codigo"
                                        value={formData.codigo_interno}
                                        onChange={(e) => setFormData({ ...formData, codigo_interno: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="unidad">Unidad</Label>
                                    <Select
                                        value={formData.unidad}
                                        onValueChange={(val) => setFormData({ ...formData, unidad: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Unidad" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NIU">NIU (Unidades)</SelectItem>
                                            <SelectItem value="ZZ">ZZ (Servicios/Otros)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="nombre">Nombre</Label>
                                <Input
                                    id="nombre"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="precio">Precio Unitario (Venta)</Label>
                                    <Input
                                        id="precio"
                                        type="number"
                                        value={formData.precio_unitario_venta}
                                        onChange={(e) => setFormData({ ...formData, precio_unitario_venta: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-8">
                                    <input
                                        type="checkbox"
                                        id="igv"
                                        checked={formData.tiene_igv}
                                        onChange={(e) => setFormData({ ...formData, tiene_igv: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor="igv" className="mb-0 cursor-pointer">Tiene IGV</Label>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave}>{editingProduct ? 'Actualizar' : 'Guardar'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
