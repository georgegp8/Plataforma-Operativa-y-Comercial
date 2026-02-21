import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Download, ChevronLeft, ChevronRight, Loader2, Printer, Search, Plus, Eraser, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import api, { type GuiaRemision } from '@/lib/api';
import { useEmpresa } from '@/hooks/useEmpresa';


const AUTO_SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos entre auto-syncs
const AUTO_SYNC_KEY = 'guias_auto_sync_last';

// Tipos
type ItemGuia = { unidad_medida: string; codigo: string; descripcion: string; cantidad: string };

const MOTIVOS_TRASLADO = [
    { value: '01', label: '01 - Venta' },
    { value: '02', label: '02 - Compra' },
    { value: '04', label: '04 - Traslado entre establecimientos' },
    { value: '08', label: '08 - Importación' },
    { value: '09', label: '09 - Exportación' },
    { value: '13', label: '13 - Otros' },
    { value: '14', label: '14 - Venta sujeta a confirmación' },
    { value: '17', label: '17 - Traslado para transformación' },
    { value: '18', label: '18 - Consignación' },
    { value: '19', label: '19 - Devolución' },
    { value: '99', label: '99 - Otros (especificar)' },
];

const EMPTY_FORM = {
    tipo_comprobante: '7',
    serie: 'T001',
    numero: '',
    // Destinatario
    cliente_tipo_documento: '6',
    cliente_numero_documento: '',
    cliente_denominacion: '',
    cliente_direccion: '',
    cliente_email: '',
    // Fechas y traslado
    fecha_emision: new Date().toISOString().slice(0, 10),
    fecha_inicio_traslado: new Date().toISOString().slice(0, 10),
    motivo_traslado: '01',
    tipo_transporte: '02',
    observaciones: '',
    // Carga
    peso_bruto_total: '',
    peso_bruto_unidad: 'KGM',
    numero_bultos: '',
    // Puntos
    punto_partida_ubigeo: '',
    punto_partida_direccion: '',
    punto_llegada_ubigeo: '',
    punto_llegada_direccion: '',
    // Vehículo y conductor
    vehiculo_placa: '',
    conductor_tipo_documento: '1',
    conductor_numero_documento: '',
    conductor_nombre: '',
    conductor_apellidos: '',
    conductor_licencia: '',
    // Transportista (solo tipo=7 y transporte=01)
    transportista_tipo_documento: '6',
    transportista_numero_documento: '',
    transportista_denominacion: '',
};

export default function GuiasRemision() {
    const { empresaId } = useEmpresa();
    const [loading, setLoading] = useState(false);
    const [guias, setGuias] = useState<GuiaRemision[]>([]);
    const [autoSyncActivo, setAutoSyncActivo] = useState(false);

    // Sync modal state
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [sincronizando, setSincronizando] = useState(false);
    const [syncForm, setSyncForm] = useState({
        tipo: '7',
        serie: '',
        numero_inicio: '',
        numero_fin: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [emitiendo, setEmitiendo] = useState(false);
    const [loadingNumero, setLoadingNumero] = useState(false);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [items, setItems] = useState<ItemGuia[]>([{ unidad_medida: 'NIU', codigo: '', descripcion: '', cantidad: '1' }]);
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
            setGuias([]);
            setTotalItems(0);
            toast.error('Error al cargar las guías de remisión.');
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, filtroCliente, filtroSerie, filtroNumero, filtroFechaInicio, filtroFechaFin]);

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchGuias();
        }, 300);

        return () => clearTimeout(handler);
    }, [fetchGuias]);

    // Auto-sincronización al entrar al módulo (máx. una vez cada 5 min).
    // Se retrasa 2s para que fetchGuias complete primero y el servidor no quede bloqueado.
    useEffect(() => {
        const lastSync = parseInt(localStorage.getItem(AUTO_SYNC_KEY) || '0', 10);
        if (Date.now() - lastSync < AUTO_SYNC_COOLDOWN_MS) return;

        localStorage.setItem(AUTO_SYNC_KEY, String(Date.now()));

        const timer = setTimeout(() => {
            setAutoSyncActivo(true);
            api.guiasRemision.autoDescubrir()
                .then((res) => {
                    // Solo actualizar el timestamp si el sync terminó correctamente
                    localStorage.setItem(AUTO_SYNC_KEY, String(Date.now()));
                    const r = res.data.resultados;
                    if (r.creados > 0 || r.actualizados > 0) {
                        fetchGuias();
                    }
                })
                .catch(() => {
                    // Si falla, resetear el timestamp para que se reintente en la próxima visita
                    localStorage.removeItem(AUTO_SYNC_KEY);
                })
                .finally(() => setAutoSyncActivo(false));
        }, 2000); // Esperar a que la tabla cargue antes de hacer las llamadas a NubeFact

        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Solo al montar el componente

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

    const handleAbrirNuevo = async () => {
        const base = { ...EMPTY_FORM };
        setForm(base);
        setItems([{ unidad_medida: 'NIU', codigo: '', descripcion: '', cantidad: '1' }]);
        setIsModalOpen(true);
        // Auto-cargar correlativo
        setLoadingNumero(true);
        try {
            const res = await api.guiasRemision.correlativo({ empresa_id: empresaId ?? undefined, serie: base.serie });
            setForm(prev => ({ ...prev, numero: String(res.data.numero) }));
        } catch {
            // Si falla, se deja vacío y el backend lo calcula
        } finally {
            setLoadingNumero(false);
        }
    };

    const handleCrearYEmitir = async () => {
        // Validaciones mínimas
        if (!form.cliente_denominacion.trim()) { toast.error('El destinatario es requerido'); return; }
        if (!form.vehiculo_placa.trim()) { toast.error('La placa del vehículo es requerida'); return; }
        if (!form.punto_llegada_ubigeo.trim()) { toast.error('El ubigeo de llegada es requerido'); return; }
        if (!form.punto_llegada_direccion.trim()) { toast.error('La dirección de llegada es requerida'); return; }
        if (items.some(i => !i.descripcion.trim())) { toast.error('Todos los ítems deben tener descripción'); return; }

        setEmitiendo(true);
        const toastId = toast.loading('Guardando guía...');
        try {
            // Calcular siguiente número si está vacío
            let numero = parseInt(form.numero) || 0;
            if (!numero) {
                // Buscar el máximo en BD consultando el listado con la misma serie
                const resMax = await api.guiasRemision.listar({ serie: form.serie, per_page: 1 });
                numero = (resMax.data.total ?? 0) + 1;
            }

            const payload: Record<string, unknown> = {
                empresa_id: empresaId,
                tipo_comprobante: parseInt(form.tipo_comprobante),
                serie: form.serie,
                numero,
                cliente_tipo_documento: form.cliente_tipo_documento,
                cliente_numero_documento: form.cliente_numero_documento,
                cliente_denominacion: form.cliente_denominacion,
                cliente_direccion: form.cliente_direccion || '',
                cliente_email: form.cliente_email || null,
                fecha_emision: form.fecha_emision,
                fecha_inicio_traslado: form.fecha_inicio_traslado,
                motivo_traslado: form.motivo_traslado,
                tipo_transporte: form.tipo_transporte,
                observaciones: form.observaciones || null,
                peso_bruto_total: parseFloat(form.peso_bruto_total) || 0,
                peso_bruto_unidad: form.peso_bruto_unidad,
                numero_bultos: form.numero_bultos ? parseInt(form.numero_bultos) : null,
                punto_partida_ubigeo: form.punto_partida_ubigeo || '',
                punto_partida_direccion: form.punto_partida_direccion || '',
                punto_llegada_ubigeo: form.punto_llegada_ubigeo,
                punto_llegada_direccion: form.punto_llegada_direccion,
                vehiculo_placa: form.vehiculo_placa.toUpperCase(),
                conductor_tipo_documento: form.conductor_tipo_documento || null,
                conductor_numero_documento: form.conductor_numero_documento || null,
                conductor_nombre: form.conductor_nombre || null,
                conductor_apellidos: form.conductor_apellidos || null,
                conductor_licencia: form.conductor_licencia || null,
                // Items de la guía
                items: items.map((it, idx) => ({
                    item: idx + 1,
                    unidad_medida: it.unidad_medida,
                    codigo: it.codigo || null,
                    descripcion: it.descripcion,
                    cantidad: parseFloat(it.cantidad) || 1,
                })),
            };

            // Transportista solo si tipo=7 y transporte público
            if (form.tipo_comprobante === '7' && form.tipo_transporte === '01') {
                payload.transportista_tipo_documento = form.transportista_tipo_documento;
                payload.transportista_numero_documento = form.transportista_numero_documento;
                payload.transportista_denominacion = form.transportista_denominacion;
            }

            // Paso 1: Crear en BD
            toast.loading('Creando guía en sistema...', { id: toastId });
            const resCrear = await api.guiasRemision.crear(payload);
            const guiaId = (resCrear.data as { data?: { id?: number }; id?: number }).data?.id
                ?? (resCrear.data as { id?: number }).id;

            if (!guiaId) throw new Error('No se recibió ID de la guía creada');

            // Paso 2: Emitir a NubeFact
            toast.loading('Enviando a NubeFact / SUNAT...', { id: toastId });
            const resEmitir = await api.guiasRemision.emitir(guiaId);

            const data = resEmitir.data.data;
            if (data?.aceptada_por_sunat) {
                toast.success(`Guía ${form.serie}-${numero} aceptada por SUNAT`, { id: toastId });
            } else {
                toast.success(`Guía ${form.serie}-${numero} enviada, pendiente de SUNAT`, { id: toastId });
            }

            setIsModalOpen(false);
            fetchGuias();
            // Mostrar PDF si disponible
            if (data?.pdf_url) {
                setTimeout(() => window.open(data.pdf_url!, '_blank'), 800);
            }
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
                ?.response?.data?.message ?? (err instanceof Error ? err.message : 'Error al emitir');
            toast.error(msg, { id: toastId });
        } finally {
            setEmitiendo(false);
        }
    };

    const setF = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

    const handleSerieChange = async (serie: string) => {
        const upper = serie.toUpperCase();
        setForm(prev => ({ ...prev, serie: upper, numero: '' }));
        if (upper.length === 4) {
            setLoadingNumero(true);
            try {
                const res = await api.guiasRemision.correlativo({ empresa_id: empresaId ?? undefined, serie: upper });
                setForm(prev => ({ ...prev, numero: String(res.data.numero) }));
            } catch {
                // silenciar
            } finally {
                setLoadingNumero(false);
            }
        }
    };

    const addItem = () => setItems(prev => [...prev, { unidad_medida: 'NIU', codigo: '', descripcion: '', cantidad: '1' }]);
    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
    const updateItem = (idx: number, field: keyof ItemGuia, value: string) =>
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

    const handleSincronizar = async () => {
        if (!syncForm.serie || syncForm.serie.length !== 4) {
            toast.error('La serie debe tener exactamente 4 caracteres');
            return;
        }
        if (!syncForm.numero_inicio || !syncForm.numero_fin) {
            toast.error('Ingrese el rango de números');
            return;
        }
        const inicio = parseInt(syncForm.numero_inicio);
        const fin = parseInt(syncForm.numero_fin);
        if (fin < inicio) {
            toast.error('El número final debe ser mayor o igual al inicial');
            return;
        }
        if (fin - inicio + 1 > 100) {
            toast.error('El rango máximo es de 100 guías');
            return;
        }
        setSincronizando(true);
        try {
            const res = await api.guiasRemision.sincronizarRango({
                tipo: parseInt(syncForm.tipo),
                serie: syncForm.serie,
                numero_inicio: inicio,
                numero_fin: fin,
            });
            const r = res.data.resultados;
            toast.success(
                `Sincronización completada: ${r.exitosos}/${r.total} exitosas (${r.creados} creadas, ${r.actualizados} actualizadas, ${r.no_encontrados} no encontradas)`
            );
            setIsSyncModalOpen(false);
            fetchGuias();
        } catch {
            toast.error('Error al sincronizar guías');
        } finally {
            setSincronizando(false);
        }
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
                        <Printer className="h-5 w-5 dark:text-white" />
                        <span className="dark:text-white">Guías de Remisión</span>
                        {autoSyncActivo && (
                            <span className="flex items-center gap-1 text-xs font-normal opacity-75">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Actualizando...
                            </span>
                        )}
                    </h1>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="text-primary-foreground hover:bg-primary-foreground/10 border border-primary-foreground/20"
                            onClick={() => setIsSyncModalOpen(true)}
                            disabled={sincronizando}
                        >
                            {sincronizando
                                ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                : <RefreshCw className="h-4 w-4 mr-1" />
                            }
                            Sincronizar
                        </Button>
                        <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white dark:bg-green-400 dark:hover:bg-green-500 dark:text-gray-900 border-0"
                            onClick={handleAbrirNuevo}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Nuevo
                        </Button>
                    </div>
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
                                                            className="h-7 w-7 text-red-500 hover:bg-red-50"
                                                            onClick={() => guia.nubefact_pdf_url ? window.open(guia.nubefact_pdf_url, '_blank') : toast.error('PDF no disponible')}
                                                            title="Descargar PDF"
                                                        >
                                                            <Download className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-[#a4e102] hover:bg-[#256080]"
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
                                                            className="text-blue-600 hover:text-blue-800 dark:text-[#f38644] dark:hover:bg-[#f38644]/80 h-7 px-2 text-xs font-medium"
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

                {/* ── Create / Emit Modal ─────────────────────────────────── */}
                <Dialog open={isModalOpen} onOpenChange={(open) => { if (!emitiendo) setIsModalOpen(open); }}>
                    <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Nueva Guía de Remisión</DialogTitle>
                            <DialogDescription>Complete los datos y haga clic en "Guardar y Emitir" para enviar a SUNAT vía NubeFact.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-5 py-2">

                            {/* ── Encabezado ───────────────────────────────── */}
                            <section>
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 border-b pb-1">Encabezado</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Tipo</Label>
                                        <Select value={form.tipo_comprobante} onValueChange={v => setF('tipo_comprobante', v)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="7">7 — GRE Remitente</SelectItem>
                                                <SelectItem value="8">8 — GRE Transportista</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Serie</Label>
                                        <Input className="h-8 text-xs" value={form.serie}
                                            onChange={e => handleSerieChange(e.target.value)} maxLength={4} placeholder="T001" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Número</Label>
                                        <div className="relative">
                                            <Input
                                                className="h-8 text-xs bg-muted/50 cursor-not-allowed"
                                                value={loadingNumero ? '' : (form.numero || '')}
                                                readOnly
                                                placeholder={loadingNumero ? 'Cargando...' : 'Auto'}
                                            />
                                            {loadingNumero && (
                                                <Loader2 className="h-3 w-3 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Fecha Emisión</Label>
                                        <Input className="h-8 text-xs" type="date" value={form.fecha_emision}
                                            onChange={e => setF('fecha_emision', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Fecha Inicio Traslado</Label>
                                        <Input className="h-8 text-xs" type="date" value={form.fecha_inicio_traslado}
                                            onChange={e => setF('fecha_inicio_traslado', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Motivo Traslado</Label>
                                        <Select value={form.motivo_traslado} onValueChange={v => setF('motivo_traslado', v)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {MOTIVOS_TRASLADO.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Tipo Transporte</Label>
                                        <Select value={form.tipo_transporte} onValueChange={v => setF('tipo_transporte', v)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="01">01 — Público</SelectItem>
                                                <SelectItem value="02">02 — Privado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </section>

                            {/* ── Destinatario ─────────────────────────────── */}
                            <section>
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 border-b pb-1">Destinatario</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Tipo Doc.</Label>
                                        <Select value={form.cliente_tipo_documento} onValueChange={v => setF('cliente_tipo_documento', v)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="6">RUC</SelectItem>
                                                <SelectItem value="1">DNI</SelectItem>
                                                <SelectItem value="4">Carnet Extranjería</SelectItem>
                                                <SelectItem value="-">Varios / Sin doc.</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">N° Documento</Label>
                                        <Input className="h-8 text-xs" value={form.cliente_numero_documento}
                                            onChange={e => setF('cliente_numero_documento', e.target.value)} placeholder="20XXXXXXXXX" />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-xs">Denominación / Razón Social *</Label>
                                        <Input className="h-8 text-xs" value={form.cliente_denominacion}
                                            onChange={e => setF('cliente_denominacion', e.target.value)} placeholder="EMPRESA S.A.C." />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-xs">Dirección</Label>
                                        <Input className="h-8 text-xs" value={form.cliente_direccion}
                                            onChange={e => setF('cliente_direccion', e.target.value)} placeholder="Av. ..." />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-xs">Email (opcional)</Label>
                                        <Input className="h-8 text-xs" type="email" value={form.cliente_email}
                                            onChange={e => setF('cliente_email', e.target.value)} placeholder="correo@empresa.com" />
                                    </div>
                                </div>
                            </section>

                            {/* ── Carga ────────────────────────────────────── */}
                            <section>
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 border-b pb-1">Carga</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Peso Bruto Total</Label>
                                        <Input className="h-8 text-xs" type="number" step="0.001" min="0" value={form.peso_bruto_total}
                                            onChange={e => setF('peso_bruto_total', e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Unidad</Label>
                                        <Select value={form.peso_bruto_unidad} onValueChange={v => setF('peso_bruto_unidad', v)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="KGM">KGM — Kilogramos</SelectItem>
                                                <SelectItem value="TNE">TNE — Toneladas</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">N° Bultos</Label>
                                        <Input className="h-8 text-xs" type="number" min="1" value={form.numero_bultos}
                                            onChange={e => setF('numero_bultos', e.target.value)} placeholder="1" />
                                    </div>
                                </div>
                            </section>

                            {/* ── Puntos ───────────────────────────────────── */}
                            <section>
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 border-b pb-1">Puntos de Traslado</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Ubigeo Partida (6 dígitos)</Label>
                                        <Input className="h-8 text-xs" value={form.punto_partida_ubigeo} maxLength={6}
                                            onChange={e => setF('punto_partida_ubigeo', e.target.value)} placeholder="040101" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Dirección Partida</Label>
                                        <Input className="h-8 text-xs" value={form.punto_partida_direccion}
                                            onChange={e => setF('punto_partida_direccion', e.target.value)} placeholder="Av. ..." />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Ubigeo Llegada * (6 dígitos)</Label>
                                        <Input className="h-8 text-xs" value={form.punto_llegada_ubigeo} maxLength={6}
                                            onChange={e => setF('punto_llegada_ubigeo', e.target.value)} placeholder="040501" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Dirección Llegada *</Label>
                                        <Input className="h-8 text-xs" value={form.punto_llegada_direccion}
                                            onChange={e => setF('punto_llegada_direccion', e.target.value)} placeholder="Av. ..." />
                                    </div>
                                </div>
                            </section>

                            {/* ── Vehículo y Conductor ─────────────────────── */}
                            <section>
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 border-b pb-1">Vehículo y Conductor</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Placa Vehículo *</Label>
                                        <Input className="h-8 text-xs uppercase" value={form.vehiculo_placa}
                                            onChange={e => setF('vehiculo_placa', e.target.value.toUpperCase())} placeholder="ABC123" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Tipo Doc. Conductor</Label>
                                        <Select value={form.conductor_tipo_documento} onValueChange={v => setF('conductor_tipo_documento', v)}>
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">DNI</SelectItem>
                                                <SelectItem value="4">Carnet Extranjería</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">N° Doc. Conductor</Label>
                                        <Input className="h-8 text-xs" value={form.conductor_numero_documento}
                                            onChange={e => setF('conductor_numero_documento', e.target.value)} placeholder="12345678" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Licencia</Label>
                                        <Input className="h-8 text-xs" value={form.conductor_licencia}
                                            onChange={e => setF('conductor_licencia', e.target.value)} placeholder="Q12345678" />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-xs">Nombre Conductor</Label>
                                        <Input className="h-8 text-xs" value={form.conductor_nombre}
                                            onChange={e => setF('conductor_nombre', e.target.value)} placeholder="Juan" />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <Label className="text-xs">Apellidos Conductor</Label>
                                        <Input className="h-8 text-xs" value={form.conductor_apellidos}
                                            onChange={e => setF('conductor_apellidos', e.target.value)} placeholder="Pérez García" />
                                    </div>
                                </div>
                            </section>

                            {/* ── Transportista (condicional) ───────────────── */}
                            {form.tipo_comprobante === '7' && form.tipo_transporte === '01' && (
                                <section>
                                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 border-b pb-1">Transportista (Transporte Público)</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Tipo Doc.</Label>
                                            <Select value={form.transportista_tipo_documento} onValueChange={v => setF('transportista_tipo_documento', v)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="6">RUC</SelectItem>
                                                    <SelectItem value="1">DNI</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">N° Documento</Label>
                                            <Input className="h-8 text-xs" value={form.transportista_numero_documento}
                                                onChange={e => setF('transportista_numero_documento', e.target.value)} placeholder="20XXXXXXXXX" />
                                        </div>
                                        <div className="space-y-1 col-span-2">
                                            <Label className="text-xs">Denominación</Label>
                                            <Input className="h-8 text-xs" value={form.transportista_denominacion}
                                                onChange={e => setF('transportista_denominacion', e.target.value)} placeholder="TRANSPORTES S.A.C." />
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* ── Observaciones ────────────────────────────── */}
                            <section>
                                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2 border-b pb-1">Observaciones</p>
                                <Textarea className="text-xs min-h-15" value={form.observaciones}
                                    onChange={e => setF('observaciones', e.target.value)}
                                    placeholder="Observaciones opcionales..." />
                            </section>

                            {/* ── Ítems ────────────────────────────────────── */}
                            <section>
                                <div className="flex items-center justify-between mb-2 border-b pb-1">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground">Ítems / Bienes Transportados</p>
                                    <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={addItem}>
                                        <Plus className="h-3 w-3 mr-1" />Agregar
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {items.map((it, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-2">
                                                <Select value={it.unidad_medida} onValueChange={v => updateItem(idx, 'unidad_medida', v)}>
                                                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="NIU">NIU - Unidad</SelectItem>
                                                        <SelectItem value="KGM">KGM - Kilo</SelectItem>
                                                        <SelectItem value="TNE">TNE - Tonelada</SelectItem>
                                                        <SelectItem value="BX">BX - Caja</SelectItem>
                                                        <SelectItem value="BG">BG - Bolsa</SelectItem>
                                                        <SelectItem value="ZZ">ZZ - Otro</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-2">
                                                <Input className="h-7 text-xs" value={it.codigo}
                                                    onChange={e => updateItem(idx, 'codigo', e.target.value)} placeholder="Código" />
                                            </div>
                                            <div className="col-span-6">
                                                <Input className="h-7 text-xs" value={it.descripcion}
                                                    onChange={e => updateItem(idx, 'descripcion', e.target.value)} placeholder="Descripción del bien *" />
                                            </div>
                                            <div className="col-span-1">
                                                <Input className="h-7 text-xs" type="number" min="0.001" step="any" value={it.cantidad}
                                                    onChange={e => updateItem(idx, 'cantidad', e.target.value)} placeholder="Cant." />
                                            </div>
                                            <div className="col-span-1 flex justify-center">
                                                {items.length > 1 && (
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removeItem(idx)}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={emitiendo}>
                                Cancelar
                            </Button>
                            <Button onClick={handleCrearYEmitir} disabled={emitiendo} className="bg-[#0f2c4c] hover:bg-[#1a3d6b] text-white">
                                {emitiendo
                                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Procesando...</>
                                    : <><Plus className="h-4 w-4 mr-2" />Guardar y Emitir</>
                                }
                            </Button>
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

                {/* Sync Modal — admin only */}
                <Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Sincronizar Guías desde NubeFact</DialogTitle>
                            <DialogDescription>
                                Consulta un rango de guías en NubeFact y las importa o actualiza en el sistema. Máximo 100 por vez.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div>
                                <Label>Tipo de Guía</Label>
                                <Select
                                    value={syncForm.tipo}
                                    onValueChange={(val) => setSyncForm({ ...syncForm, tipo: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">7 — GRE Remitente</SelectItem>
                                        <SelectItem value="8">8 — GRE Transportista</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Serie (4 caracteres, ej: T001)</Label>
                                <Input
                                    value={syncForm.serie}
                                    onChange={(e) => setSyncForm({ ...syncForm, serie: e.target.value.toUpperCase() })}
                                    maxLength={4}
                                    placeholder="T001"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Número inicial</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={syncForm.numero_inicio}
                                        onChange={(e) => setSyncForm({ ...syncForm, numero_inicio: e.target.value })}
                                        placeholder="1"
                                    />
                                </div>
                                <div>
                                    <Label>Número final</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={syncForm.numero_fin}
                                        onChange={(e) => setSyncForm({ ...syncForm, numero_fin: e.target.value })}
                                        placeholder="20"
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsSyncModalOpen(false)} disabled={sincronizando}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSincronizar} disabled={sincronizando}>
                                {sincronizando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Sincronizar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
