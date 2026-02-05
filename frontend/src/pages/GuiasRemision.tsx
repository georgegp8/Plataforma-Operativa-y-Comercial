import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Download, ChevronLeft, ChevronRight, Loader2, Printer, Search, Plus, Eraser, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import api, { type GuiaRemision } from '@/lib/api';



export default function GuiasRemision() {
    const [loading, setLoading] = useState(false);
    const [guias, setGuias] = useState<GuiaRemision[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedGuia, setSelectedGuia] = useState<GuiaRemision | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Filtros
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroSerie, setFiltroSerie] = useState('todos');
    const [filtroNumero, setFiltroNumero] = useState('');
    const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
    const [filtroFechaFin, setFiltroFechaFin] = useState('');

    // Cargar datos
    const fetchGuias = useCallback(async () => {
        setLoading(true);
        try {
            // Construir query params
            const params: Record<string, string | number> = {
                page: currentPage,
                per_page: itemsPerPage,
            };
            if (filtroCliente) params.cliente = filtroCliente;
            if (filtroSerie !== 'todos') params.serie = filtroSerie;
            if (filtroNumero) params.numero = filtroNumero;
            if (filtroFechaInicio) params.fecha_inicio = filtroFechaInicio;
            if (filtroFechaFin) params.fecha_fin = filtroFechaFin;

            // Llamada a la API (Asumiendo que has creado el endpoint, si no, usa mock)
            // Llamada a la API
            const response = await api.guiasRemision.listar(params);

            // Si el backend devuelve paginado estándar de Laravel:
            if (response.data && response.data.data) {
                setGuias(response.data.data);
                setTotalItems(response.data.total);
            } else {
                // Fallback si la respuesta es directa array
                setGuias(Array.isArray(response.data) ? response.data : []);
                setTotalItems(Array.isArray(response.data) ? response.data.length : 0);
            }

        } catch (error) {
            console.error('Error al cargar guías:', error);
            // Fallback a datos mock si falla el backend (para demostración)
            const seedData = generateSeedData();
            setGuias(seedData);
            setTotalItems(seedData.length);
            toast.error('No se pudo conectar con el backend, mostrando datos de prueba.');
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, filtroCliente, filtroSerie, filtroNumero, filtroFechaInicio, filtroFechaFin]);

    // Datos Mock (Fallback)
    const generateSeedData = (): GuiaRemision[] => {
        return [
            { id: 1, serie: 'T001', numero: '00000001', fecha_emision: '2023-10-25', cliente_denominacion: 'CLIENTE BETA SAC', destinatario_denominacion: 'CLIENTE BETA SAC', estado: 'aceptado', fecha_inicio_traslado: '2023-10-25' },
            { id: 2, serie: 'T001', numero: '00000002', fecha_emision: '2023-10-26', cliente_denominacion: 'TRANSPORTES FAST', destinatario_denominacion: 'TRANSPORTES FAST', estado: 'enviado', fecha_inicio_traslado: '2023-10-26' },
            { id: 3, serie: 'T001', numero: '00000003', fecha_emision: '2023-10-27', cliente_denominacion: 'COMERCIAL SUR', destinatario_denominacion: 'COMERCIAL SUR', estado: 'pendiente', fecha_inicio_traslado: '2023-10-27' },
        ];
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchGuias();
        }, 300); // Debounce de 300ms para búsqueda más dinámica

        return () => clearTimeout(handler);
    }, [fetchGuias]);

    const handleSearch = () => {
        if (currentPage === 1) {
            fetchGuias(); // Forzar recarga si ya estamos en pág 1
        } else {
            setCurrentPage(1); // Esto disparará el useEffect
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleLimpiar = () => {
        setFiltroCliente('');
        setFiltroSerie('todos');
        setFiltroNumero('');
        setFiltroFechaInicio('');
        setFiltroFechaFin('');
        if (currentPage === 1) {
            fetchGuias();
        } else {
            setCurrentPage(1);
        }
    };

    const handleSave = () => {
        toast.info('Funcionalidad de Guardar aún no implementada en backend completo.');
        setIsModalOpen(false);
    };

    const handleVerificar = async (guia: GuiaRemision) => {
        const tipo = guia.tipo_comprobante || '09';
        const toastId = toast.loading('Verificando estado en SUNAT/NubeFact...');
        try {
            // GET /api/nubefact/guias/{tipo}/{serie}/{numero}
            // Asumiendo que api.ts tiene interceptor base URL completo o relativo correcto
            // Si el backend es Laravel API routes en /api/nubefact...
            // Ajustar endpoint si es necesario. Basado en api.php es prefix 'nubefact'
            await api.guiasRemision.verificar(tipo, guia.serie, guia.numero);
            toast.success('Estado verificado y actualizado.', { id: toastId });
            fetchGuias(); // Recargar tabla
        } catch (error) {
            console.error('Error al verificar:', error);
            toast.error('Error al verificar el estado.', { id: toastId });
        }
    };

    const getEstadoBadge = (estado: string) => {
        switch (estado.toLowerCase()) {
            case 'aceptado': return <Badge className="bg-green-600">Aceptado</Badge>;
            case 'enviado': return <Badge className="bg-blue-600">Enviado</Badge>;
            case 'pendiente': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendiente</Badge>;
            case 'anulado': return <Badge variant="destructive">Anulado</Badge>;
            default: return <Badge variant="secondary">{estado}</Badge>;
        }
    };

    // Pagination Calculation
    const totalPages = Math.ceil(totalItems / itemsPerPage);


    return (
        <div className="min-h-screen bg-background text-foreground">
            <NubofactHeader />
            <div className="container mx-auto px-4 py-6">
                {/* Header */}
                <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        <Printer className="h-5 w-5" />
                        Listado de Guias de Remisión
                    </h1>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground border border-primary-foreground/20"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Nuevo
                    </Button>
                </div>

                {/* Filters */}
                <div className="bg-muted/50 px-4 py-4 border-x border-border">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                        <div className="md:col-span-2">
                            <Input
                                placeholder="Ingrese Cliente"
                                className="bg-white dark:bg-background"
                                value={filtroCliente}
                                onChange={(e) => { setFiltroCliente(e.target.value); setCurrentPage(1); }}
                                onKeyDown={handleKeyPress}
                            />
                        </div>
                        <div>
                            <Select value={filtroSerie} onValueChange={(val) => { setFiltroSerie(val); setCurrentPage(1); }}>
                                <SelectTrigger className="bg-white dark:bg-background">
                                    <SelectValue placeholder="Serie" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todas</SelectItem>
                                    <SelectItem value="T001">T001</SelectItem>
                                    <SelectItem value="T002">T002</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Input
                                placeholder="Número"
                                className="bg-white dark:bg-background"
                                value={filtroNumero}
                                onChange={(e) => { setFiltroNumero(e.target.value); setCurrentPage(1); }}
                                onKeyDown={handleKeyPress}
                            />
                        </div>
                        <div>
                            <Input
                                type="date"
                                placeholder="Fecha Inicio"
                                className="bg-white dark:bg-background"
                                value={filtroFechaInicio}
                                onChange={(e) => { setFiltroFechaInicio(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                        <div>
                            <Input
                                type="date"
                                placeholder="Fecha Término"
                                className="bg-white dark:bg-background"
                                value={filtroFechaFin}
                                onChange={(e) => { setFiltroFechaFin(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                        <Button
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={handleSearch}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
                            Buscar
                        </Button>
                        <Button
                            variant="secondary"
                            className="bg-gray-600 hover:bg-gray-700 text-white"
                            onClick={handleLimpiar}
                        >
                            <Eraser className="h-4 w-4 mr-1" />
                            Limpiar
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <Card className="rounded-t-none border-t-0">
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : guias.length === 0 ? (
                            <div className="p-8">
                                <EmptyState
                                    icon={Printer}
                                    title="No hay guías"
                                    description="No se encontraron guías de remisión con los filtros seleccionados."
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
                                            <TableHead className="min-w-32 py-2 px-2 text-primary-foreground">Número</TableHead>
                                            <TableHead className="w-full py-2 px-2 text-primary-foreground">Destinatario</TableHead>
                                            <TableHead className="min-w-32 py-2 px-2 text-primary-foreground">Vehículo</TableHead>
                                            <TableHead className="min-w-20 py-2 px-2 text-primary-foreground">Peso</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-primary-foreground">Estado</TableHead>
                                            <TableHead className="min-w-24 py-2 px-2 text-center text-primary-foreground">Archivos</TableHead>
                                            <TableHead className="min-w-32 py-2 px-2 text-center text-primary-foreground">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {guias.map((guia, index) => (
                                            <TableRow key={guia.id} className="hover:bg-muted/50 border-b border-gray-200 dark:border-gray-800">
                                                <TableCell className="py-3 px-4 text-center text-xs text-muted-foreground font-medium">
                                                    {(currentPage - 1) * itemsPerPage + index + 1}
                                                </TableCell>
                                                <TableCell className="py-3 px-4 text-xs font-medium">
                                                    {new Date(guia.fecha_emision).toLocaleDateString('es-PE')}
                                                </TableCell>
                                                <TableCell className="py-3 px-4 text-xs font-medium">
                                                    {guia.serie}-{guia.numero}
                                                </TableCell>
                                                <TableCell className="py-3 px-4 font-medium text-xs text-foreground">
                                                    <div>{guia.destinatario_denominacion}</div>
                                                    <div className="text-[10px] text-muted-foreground">{guia.destinatario_numero_documento}</div>
                                                </TableCell>
                                                <TableCell className="py-3 px-4 text-xs">
                                                    {guia.vehiculo_placa || '-'}
                                                </TableCell>
                                                <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                                                    {guia.peso_bruto_total ? `${guia.peso_bruto_total} ${guia.peso_bruto_unidad || 'KG'}` : '-'}
                                                </TableCell>
                                                <TableCell className="py-3 px-4 text-xs">
                                                    {getEstadoBadge(guia.estado)}
                                                </TableCell>
                                                <TableCell className="py-3 px-4 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-red-600 hover:bg-red-50" 
                                                            onClick={() => guia.nubefact_pdf_url ? window.open(guia.nubefact_pdf_url, '_blank') : toast.error('PDF no disponible')}
                                                            title="Descargar PDF"
                                                        >
                                                            <Download className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-blue-600 hover:bg-blue-50" 
                                                            onClick={() => guia.nubefact_xml_url ? window.open(guia.nubefact_xml_url, '_blank') : toast.error('XML no disponible')}
                                                            title="Descargar XML"
                                                        >
                                                            <code className="text-[10px] font-bold">XML</code>
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3 px-4 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="text-primary hover:text-primary/80 h-7 px-2 text-xs" 
                                                            onClick={() => {
                                                                setSelectedGuia(guia);
                                                                setIsDetailModalOpen(true);
                                                            }}
                                                        >
                                                            Ver Detalles
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-orange-600 hover:bg-orange-50" 
                                                            onClick={() => handleVerificar(guia)} 
                                                            title="Verificar estado SUNAT"
                                                        >
                                                            <RefreshCw className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Paginación - Estilo Avanzado Clientes */}
                        <div className="px-4 py-3 border-t border-border bg-white dark:bg-card">
                            <div className="flex items-center justify-between flex-wrap gap-4">
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
                                        registros | Mostrando {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} a {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems}
                                    </span>
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage === 1 || totalPages === 0}
                                        className="px-3 py-1 text-sm border border-border rounded bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Anterior
                                    </button>
                                    {totalPages > 0 && Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                                                className={`px-3 py-1 text-sm border border-border rounded transition-colors ${currentPage === page
                                                    ? 'bg-[#0f2c4c] text-white'
                                                    : 'bg-background hover:bg-muted text-foreground'
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
                    </CardContent>
                </Card>

                {/* Create Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Nueva Guía de Remisión</DialogTitle>
                            <DialogDescription>
                                Complete los datos para generar una nueva guía.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Serie</Label>
                                <Select defaultValue="T001">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="T001">T001</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Fecha de Emisión</Label>
                                <Input type="date" />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Cliente (Destinatario)</Label>
                                <Select>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione Cliente" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="c1">CLIENTE DE PRUEBA</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Más campos según PDF de Nubefact podrían ir aquí */}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} className="bg-[#0f2c4c] text-white">Guardar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Detail Modal */}
                <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Detalles de Guía de Remisión</DialogTitle>
                            <DialogDescription>
                                {selectedGuia ? `${selectedGuia.serie}-${selectedGuia.numero}` : ''}
                            </DialogDescription>
                        </DialogHeader>
                        {selectedGuia && (
                            <div className="space-y-6 py-4">
                                {/* Información General */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Serie-Número</Label>
                                        <p className="text-sm font-medium">{selectedGuia.serie}-{selectedGuia.numero}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Fecha Emisión</Label>
                                        <p className="text-sm font-medium">{new Date(selectedGuia.fecha_emision).toLocaleDateString('es-PE')}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Fecha Inicio Traslado</Label>
                                        <p className="text-sm font-medium">{selectedGuia.fecha_inicio_traslado ? new Date(selectedGuia.fecha_inicio_traslado).toLocaleDateString('es-PE') : '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Motivo Traslado</Label>
                                        <p className="text-sm font-medium">{selectedGuia.motivo_traslado}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Tipo Transporte</Label>
                                        <p className="text-sm font-medium">{selectedGuia.tipo_transporte || '-'}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Estado</Label>
                                        <div className="mt-1">{getEstadoBadge(selectedGuia.estado)}</div>
                                    </div>
                                </div>

                                {/* Destinatario */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Destinatario</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Denominación</Label>
                                            <p className="text-sm font-medium">{selectedGuia.destinatario_denominacion}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Documento</Label>
                                            <p className="text-sm font-medium">{selectedGuia.destinatario_tipo_documento} - {selectedGuia.destinatario_numero_documento}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Transporte */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Datos de Transporte</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Vehículo (Placa)</Label>
                                            <p className="text-sm font-medium">{selectedGuia.vehiculo_placa || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">TUC/Habilitación</Label>
                                            <p className="text-sm font-medium">{selectedGuia.vehiculo_tuc || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Peso Total</Label>
                                            <p className="text-sm font-medium">{selectedGuia.peso_bruto_total ? `${selectedGuia.peso_bruto_total} ${selectedGuia.peso_bruto_unidad || 'KG'}` : '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">N° Bultos</Label>
                                            <p className="text-sm font-medium">{selectedGuia.numero_bultos || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="text-xs text-muted-foreground">Conductor</Label>
                                            <p className="text-sm font-medium">
                                                {selectedGuia.conductor_nombre || selectedGuia.conductor_apellidos 
                                                    ? `${selectedGuia.conductor_nombre || ''} ${selectedGuia.conductor_apellidos || ''}`.trim() 
                                                    : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Licencia</Label>
                                            <p className="text-sm font-medium">{selectedGuia.conductor_licencia || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Ubicaciones */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Puntos de Traslado</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Punto de Partida</Label>
                                            <p className="text-sm font-medium">{selectedGuia.punto_partida_direccion || '-'}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Ubigeo: {selectedGuia.punto_partida_ubigeo || '-'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Punto de Llegada</Label>
                                            <p className="text-sm font-medium">{selectedGuia.punto_llegada_direccion || '-'}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Ubigeo: {selectedGuia.punto_llegada_ubigeo || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Transportista */}
                                {selectedGuia.transportista_denominacion && (
                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold mb-3">Transportista</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Denominación</Label>
                                                <p className="text-sm font-medium">{selectedGuia.transportista_denominacion}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-muted-foreground">Documento</Label>
                                                <p className="text-sm font-medium">{selectedGuia.transportista_tipo_documento} - {selectedGuia.transportista_numero_documento}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* NubeFact */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Información SUNAT / NubeFact</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Aceptada por SUNAT</Label>
                                            <p className="text-sm font-medium">{selectedGuia.nubefact_aceptada_por_sunat ? '✓ Sí' : '✗ No'}</p>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Fecha de Envío</Label>
                                            <p className="text-sm font-medium">{selectedGuia.nubefact_enviado_at || '-'}</p>
                                        </div>
                                        {selectedGuia.nubefact_cadena_qr && (
                                            <div className="col-span-2">
                                                <Label className="text-xs text-muted-foreground">Código QR</Label>
                                                <p className="text-xs font-mono bg-muted p-2 rounded mt-1 break-all">{selectedGuia.nubefact_cadena_qr}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Observaciones */}
                                {selectedGuia.observaciones && (
                                    <div className="border-t pt-4">
                                        <Label className="text-xs text-muted-foreground">Observaciones</Label>
                                        <p className="text-sm mt-1">{selectedGuia.observaciones}</p>
                                    </div>
                                )}

                                {/* Archivos */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Archivos</h3>
                                    <div className="flex gap-2">
                                        {selectedGuia.nubefact_pdf_url && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => window.open(selectedGuia.nubefact_pdf_url, '_blank')}
                                                className="text-red-600 border-red-200"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Descargar PDF
                                            </Button>
                                        )}
                                        {selectedGuia.nubefact_xml_url && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => window.open(selectedGuia.nubefact_xml_url, '_blank')}
                                                className="text-blue-600 border-blue-200"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Descargar XML
                                            </Button>
                                        )}
                                        {selectedGuia.nubefact_cdr_url && (
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => window.open(selectedGuia.nubefact_cdr_url, '_blank')}
                                                className="text-green-600 border-green-200"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Descargar CDR
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Cerrar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
