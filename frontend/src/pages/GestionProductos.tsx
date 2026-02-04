import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { NubofactHeader } from '@/components/layout/NubofactHeader';

const DEBOUNCE_DELAY = 300; // ms
import { Edit, Plus, Trash2, Eye, Package, Upload, Download, MapPin, ChevronLeft, ChevronRight, Loader2, Pencil, Check, X } from 'lucide-react';
import api, { type Producto } from '@/lib/api';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';

type FiltroProducto = 'nombre' | 'codigo' | 'nombre_sec';

const UNIDADES_MEDIDA = [
  { value: 'NIU', label: 'NIU - UNIDADES' },
  { value: 'ZZ', label: 'ZZ - OTROS' },
  { value: 'KGM', label: 'KGM - KILOGRAMO' },
  { value: 'BX', label: 'BX - CAJA' },
  { value: 'BG', label: 'BG - BOLSA' },
  { value: 'DZN', label: 'DZN - DOCENA' },
  { value: 'GLI', label: 'GLI - GALÓN' },
  { value: 'LTR', label: 'LTR - LITRO' },
  { value: 'MTR', label: 'MTR - METRO' },
  { value: 'WG', label: 'WG - PESO' },
];

const TIPOS_IGV = [
  { value: '10', label: 'Gravado - Operación Onerosa [10]' },
  { value: '11', label: '[Gratuita] Gravado - Retiro por premio [11]' },
  { value: '12', label: '[Gratuita] Gravado - Retiro por donación [12]' },
  { value: '13', label: '[Gratuita] Gravado - Retiro [13]' },
  { value: '14', label: '[Gratuita] Gravado - Retiro por publicidad [14]' },
  { value: '15', label: '[Gratuita] Gravado - Bonificaciones [15]' },
  { value: '16', label: '[Gratuita] Gravado - Retiro por entrega a trabajadores [16]' },
  { value: '20', label: 'Exonerado - Operación Onerosa [20]' },
  { value: '21', label: '[Gratuita] Exonerada - Transferencia Gratuita [21]' },
  { value: '30', label: 'Inafecto - Operación Onerosa [30]' },
  { value: '31', label: '[Gratuita] Inafecto - Retiro por Bonificación [31]' },
  { value: '32', label: '[Gratuita] Inafecto [32]' },
  { value: '33', label: '[Gratuita] Inafecto - Retiro por Muestras Médicas [33]' },
  { value: '34', label: '[Gratuita] Inafecto - Retiro por Convenio Colectivo [34]' },
  { value: '35', label: '[Gratuita] Inafecto - Retiro por premio [35]' },
  { value: '36', label: '[Gratuita] Inafecto - Retiro por publicidad [36]' },
  { value: '37', label: '[Gratuita] Inafecto - Transferencia gratuita [37]' },
  { value: '40', label: 'Exportación [40]' },
  { value: '17', label: 'Gravado - IVAP [17]' },
];

export default function GestionProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [editingStockId, setEditingStockId] = useState<number | null>(null);
  const [tempStockValue, setTempStockValue] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<FiltroProducto>('nombre');
  const [filtroEstado, setFiltroEstado] = useState<'habilitados' | 'deshabilitados' | 'todos'>('habilitados');
  const [empresaId] = useState(1); // TODO: Obtener de contexto
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder,] = useState<'asc' | 'desc'>('asc');
  const [isChangingPage, setIsChangingPage] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    codigo: '',
    descripcion: '',
    categoria: '',
    unidad_medida: 'NIU',
    codigo_producto_sunat: '',
    moneda: 'PEN',
    valor_venta_unitario: '',
    precio_venta_unitario: '',
    costo_compra_unitario: '',
    precio_compra_unitario: '',
    tipo_afectacion_igv: '10',
    stock_actual: '',
    destacado: false,
  });

  const cargarProductos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.productos.listar({
        empresa_id: empresaId,
        buscar: busqueda || undefined,
        sort_by: 'codigo',
        sort_order: sortOrder,
        incluir_inactivos: filtroEstado !== 'habilitados',
      });
      setProductos(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
      setIsFirstLoad(false);
    }
  }, [empresaId, busqueda, sortOrder, filtroEstado]);

  // Cargar productos al montar el componente
  useEffect(() => {
    void cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Búsqueda dinámica con debounce
  // React Best Practice: Use cleanup function to prevent stale closures
  useEffect(() => {
    if (busqueda === '') {
      void cargarProductos();
      return;
    }

    const timer = setTimeout(() => {
      void cargarProductos();
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [busqueda, sortOrder, filtroEstado, cargarProductos]);

  const abrirModal = (producto?: Producto) => {
    if (producto) {
      setProductoEditando(producto);
      setFormData({
        codigo: producto.codigo || '',
        descripcion: producto.descripcion,
        categoria: producto.categoria || '',
        unidad_medida: producto.unidad_medida,
        codigo_producto_sunat: producto.codigo_producto_sunat || '',
        moneda: producto.moneda,
        valor_venta_unitario: producto.valor_venta_unitario?.toString() || '',
        precio_venta_unitario: producto.precio_venta_unitario?.toString() || '',
        costo_compra_unitario: producto.costo_compra_unitario?.toString() || '',
        precio_compra_unitario: producto.precio_compra_unitario?.toString() || '',
        tipo_afectacion_igv: producto.tipo_afectacion_igv,
        destacado: producto.destacado,
        stock_actual: Math.floor(Number(producto.stock_actual || 0)).toString(),
      });
    } else {
      setProductoEditando(null);
      setFormData({
        codigo: '',
        descripcion: '',
        categoria: '',
        unidad_medida: 'NIU',
        codigo_producto_sunat: '',
        moneda: 'PEN',
        valor_venta_unitario: '',
        precio_venta_unitario: '',
        costo_compra_unitario: '',
        precio_compra_unitario: '',
        tipo_afectacion_igv: '10',
        stock_actual: '',
        destacado: false,
      });
    }
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setProductoEditando(null);
  };

  const guardarProducto = async () => {
    try {
      const data = {
        empresa_id: empresaId,
        ...formData,
      };

      if (productoEditando) {
        await api.productos.actualizar(productoEditando.id, data);
        toast.success('Producto actualizado exitosamente');
      } else {
        await api.productos.crear(data);
        toast.success('Producto creado exitosamente');
      }

      cerrarModal();
      void cargarProductos();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Error al guardar producto');
    }
  };

  const eliminarProducto = async (id: number) => {
    if (!confirm('¿Estás seguro de desactivar este producto?')) return;

    try {
      await api.productos.eliminar(id);
      toast.success('Producto desactivado');
      void cargarProductos();
    } catch {
      toast.error('Error al desactivar producto');
    }
  };

  const iniciarEdicionStock = (producto: Producto) => {
    setEditingStockId(producto.id);
    setTempStockValue(producto.stock_actual?.toString() || '0');
  };

  const cancelarEdicionStock = () => {
    setEditingStockId(null);
    setTempStockValue('');
  };

  const guardarStockRapido = async (id: number) => {
    const nuevoStock = parseInt(tempStockValue);
    if (isNaN(nuevoStock)) {
      toast.error('El stock debe ser un número válido');
      return;
    }

    try {
      // Optimistic update logic could be here, but for simplicity relying on reload
      // We use the same update endpoint but only sending stock
      await api.productos.actualizar(id, { stock_actual: nuevoStock.toString() });
      toast.success('Stock actualizado');
      setEditingStockId(null);
      void cargarProductos();
    } catch (error) {
      console.error('Error al actualizar stock:', error);
      toast.error('Error al actualizar stock');
    }
  };

  const cambiarPagina = (nuevaPagina: number) => {
    setIsChangingPage(true);
    // Pequeña pausa visual suave para el cambio de página
    setTimeout(() => {
      setCurrentPage(nuevaPagina);
      setTimeout(() => setIsChangingPage(false), 300);
    }, 100);
  };

  const productosFiltrados = productos.filter((producto) => {
    if (filtroEstado === 'deshabilitados') return !producto.activo;
    return true;
  });

  // Paginación
  const totalPages = Math.ceil(productosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const productosPaginados = productosFiltrados.slice(startIndex, endIndex);

  if (loading && productos.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-8 text-muted-foreground">Cargando productos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />
      <div className="container mx-auto px-4 py-6">
        {/* Header del módulo - Listado de Productos */}
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Listado de Productos
          </h1>
          <div className="flex gap-2">
            <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => abrirModal()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{productoEditando ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
                  <DialogDescription>
                    {productoEditando ? 'Modifique los datos del producto existente.' : 'Complete la información para registrar un nuevo producto.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Código interno</Label>
                    <Input
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                      placeholder="Código del producto"
                    />
                  </div>

                  <div>
                    <Label>Categoría</Label>
                    <Input
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      placeholder="Ej: S-001 Servicios"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Nombre del producto o servicio *</Label>
                    <Textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Descripción completa"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Unidad de medida SUNAT *</Label>
                    <Select value={formData.unidad_medida} onValueChange={(value) => setFormData({ ...formData, unidad_medida: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIDADES_MEDIDA.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Código Producto SUNAT</Label>
                    <Input
                      value={formData.codigo_producto_sunat}
                      onChange={(e) => setFormData({ ...formData, codigo_producto_sunat: e.target.value })}
                      placeholder="Catálogo 25 SUNAT"
                    />
                  </div>



                  <div>
                    <Label>Stock Actual (Inventario)</Label>
                    <Input type="number"
                      step="1"
                      min="0"
                      pattern="\d*"
                      value={formData.stock_actual}
                      onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                      placeholder="Cantidad en stock"
                    />
                  </div>

                  <div className="md:col-span-2 border-t pt-4">
                    <h3 className="font-semibold mb-3">Para la VENTA (Opcional)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>VALOR VENTA unitario SIN IGV</Label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={formData.valor_venta_unitario}
                          onChange={(e) => setFormData({ ...formData, valor_venta_unitario: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Precio VENTA unitario CON IGV</Label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={formData.precio_venta_unitario}
                          onChange={(e) => setFormData({ ...formData, precio_venta_unitario: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 border-t pt-4">
                    <h3 className="font-semibold mb-3">Para la COMPRA (Opcional)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>COSTO unitario SIN IGV</Label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={formData.costo_compra_unitario}
                          onChange={(e) => setFormData({ ...formData, costo_compra_unitario: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Precio COMPRA unitario CON IGV</Label>
                        <Input
                          type="number"
                          step="0.000001"
                          value={formData.precio_compra_unitario}
                          onChange={(e) => setFormData({ ...formData, precio_compra_unitario: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Tipo de afectación (Opcional)</Label>
                    <Select value={formData.tipo_afectacion_igv} onValueChange={(value) => setFormData({ ...formData, tipo_afectacion_igv: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {TIPOS_IGV.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 flex items-center gap-3">
                    <Switch
                      checked={formData.destacado}
                      onCheckedChange={(checked) => setFormData({ ...formData, destacado: checked })}
                    />
                    <Label className="cursor-pointer">Producto destacado</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setModalAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={guardarProducto}>
                    {productoEditando ? 'Actualizar' : 'Crear'} Producto
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button
              onClick={() => toast.info('Funcionalidad de Importar en desarrollo')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Upload className="h-4 w-4 mr-1" />
              Importar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-muted/50 px-4 py-4 border-x border-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Filtrar por</label>
              <select
                value={filtroTipo}
                onChange={(e) => {
                  setFiltroTipo(e.target.value as FiltroProducto);
                  setBusqueda('');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="nombre">Nombre</option>
                <option value="nombre_sec">Nombre Sec.</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Buscar</label>
              <div className="relative">
                <Input
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder={
                    filtroTipo === 'nombre' ? 'Buscar por nombre...' :
                      filtroTipo === 'codigo' ? 'Buscar por código...' :
                        'Buscar por nombre secundario...'
                  }
                  className="w-full pr-10"
                />
                {loading && !isFirstLoad && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Almacén</label>
              <Button
                variant="outline"
                className="w-full justify-start text-foreground"
                onClick={() => toast.info('Funcionalidad de Almacén en desarrollo')}
              >
                Almacén - Oficina Principal
              </Button>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-foreground">Estados</label>
              <select
                value={filtroEstado}
                onChange={(e) => {
                  setFiltroEstado(e.target.value as 'habilitados' | 'deshabilitados' | 'todos');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="habilitados">Habilitados</option>
                <option value="deshabilitados">Deshabilitados</option>
                <option value="todos">Todos</option>
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <Button
                onClick={() => toast.info('Funcionalidad de Exportar en desarrollo')}
                className="bg-green-600 hover:bg-green-700 text-white w-full"
                size="sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <Card className="rounded-t-none border-t-0">
          <CardContent className="p-0">
            {/* Paginación superior */}
            {/* Tabla con Paginación Superior Eliminada */}

            {loading && isFirstLoad ? (
              <div className="rounded-md border overflow-hidden">
                <TableSkeleton columns={12} rows={8} />
              </div>
            ) : (
              <div className="relative">
                {(isChangingPage) && (
                  <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                )}
                <div className={`rounded-md border overflow-hidden shadow-sm transition-opacity duration-200 ${loading && !isFirstLoad ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-primary hover:bg-primary">
                          <TableHead className="w-12 py-2 px-2 text-white">#</TableHead>
                          <TableHead className="min-w-24 py-2 px-2 text-white">Acciones</TableHead>
                          <TableHead className="w-40 py-2 px-2 text-white">Registro Actividad</TableHead>
                          <TableHead className="min-w-24 py-2 px-2 text-white">Cód. Interno</TableHead>
                          <TableHead className="min-w-16 py-2 px-2 text-white">Unidad</TableHead>
                          <TableHead className="min-w-64 py-2 px-2 text-white">Producto o Servicio</TableHead>
                          <TableHead className="min-w-12 py-2 px-2 text-center text-white">Ubicación</TableHead>
                          <TableHead className="min-w-20 py-2 px-2 text-right text-white">Stock</TableHead>
                          <TableHead className="min-w-24 py-2 px-2 text-right text-white">P.Venta</TableHead>
                          <TableHead className="min-w-24 py-2 px-2 text-right text-white">P.Compra</TableHead>
                          <TableHead className="min-w-24 py-2 px-2 text-center text-white">Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productosPaginados.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={11} className="p-0">
                              <EmptyState
                                icon={Package}
                                title={busqueda ? `No se encontraron productos con "${busqueda}"` : 'No hay productos registrados'}
                                description={busqueda ? 'Intenta con otro término de búsqueda o verifica la ortografía.' : 'Comienza agregando productos a tu catálogo.'}
                                action={busqueda ? (
                                  <Button variant="outline" size="sm" onClick={() => setBusqueda('')}>
                                    Ver todos los productos
                                  </Button>
                                ) : (
                                  <Button variant="default" size="sm" onClick={() => abrirModal()}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Crear primer producto
                                  </Button>
                                )}
                                className="py-12"
                              />
                            </TableCell>
                          </TableRow>
                        ) : (
                          productosPaginados.map((producto, idx) => (
                            <TableRow
                              key={producto.id}
                              className="hover:bg-muted/50 transition-colors"
                            >
                              <TableCell className="py-2 px-2 font-mono text-sm">
                                {startIndex + idx + 1}
                              </TableCell>
                              <TableCell className="py-2 px-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="default" size="sm" className="h-7 text-xs">
                                      Acciones
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={() => toast.info('Ver movimientos en desarrollo')} className="text-xs py-1.5">
                                      <Eye className="w-4 h-4 mr-2" />
                                      Ver movimientos
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => abrirModal(producto)} className="text-xs py-1.5">
                                      <Edit className="w-4 h-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => eliminarProducto(producto.id)}
                                      className="text-red-600 text-xs py-1.5"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Borrar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                              <TableCell className="py-2 px-2">
                                <div className="text-xs text-muted-foreground w-40 break-words whitespace-normal leading-tight" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                  {(() => {
                                    const updatedAt = (producto as Producto & { updated_at?: string }).updated_at;
                                    return updatedAt
                                      ? `Administrador: Producto actualizado ${new Date(updatedAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'medium' }).replace(',', '')}`
                                      : '-';
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm py-2 px-2">
                                {producto.codigo || '-'}
                              </TableCell>
                              <TableCell className="py-2 px-2">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {producto.unidad_medida}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2 px-2">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="truncate text-sm max-w-xs cursor-help">
                                        {producto.descripcion}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm">
                                      <p>{producto.descripcion}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                              <TableCell className="text-center py-2 px-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => toast.info('Funcionalidad de Ubicación en desarrollo')}
                                >
                                  <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </Button>
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm py-2 px-2">
                                {editingStockId === producto.id ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <Input
                                      type="number"
                                      value={tempStockValue}
                                      onChange={(e) => setTempStockValue(e.target.value)}
                                      className="h-7 w-20 text-right px-2 py-1 text-xs"
                                      step="1"
                                      min="0"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') void guardarStockRapido(producto.id);
                                        if (e.key === 'Escape') cancelarEdicionStock();
                                      }}
                                    />
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => void guardarStockRapido(producto.id)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={cancelarEdicionStock}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-2 group">
                                    <span className={
                                      Number(producto.stock_actual || 0) < 0
                                        ? 'text-red-600 dark:text-red-400 font-semibold'
                                        : Number(producto.stock_actual || 0) === 0
                                          ? 'text-yellow-600 dark:text-yellow-400 font-semibold'
                                          : 'text-foreground'
                                    }>
                                      {Number(producto.stock_actual || 0).toFixed(0)}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                      onClick={() => iniciarEdicionStock(producto)}
                                      title="Editar stock rápido"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm py-2 px-2">
                                S/ {Number(producto.precio_venta_unitario ?? 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm py-2 px-2">
                                S/ {Number(producto.precio_compra_unitario ?? 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-center py-2 px-2">
                                <Badge
                                  variant={producto.activo ? 'default' : 'secondary'}
                                  className={producto.activo ? 'bg-green-600 hover:bg-green-700' : ''}
                                >
                                  {producto.activo ? 'Habilitado' : 'Deshabilitado'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}

            {/* Paginación inferior */}
            {/* Paginación */}
            {!loading && productosFiltrados.length > itemsPerPage && (
              <div className="flex items-center justify-between border-t border-border px-4 py-4 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <Button
                    variant="outline"
                    onClick={() => cambiarPagina(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => cambiarPagina(Math.min(totalPages, currentPage + 1))}
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
                        {Math.min(endIndex, productosFiltrados.length)}
                      </span>{' '}
                      de <span className="font-medium">{productosFiltrados.length}</span> resultados
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => cambiarPagina(Math.max(1, currentPage - 1))}
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
                            onClick={() => cambiarPagina(page)}
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
                        onClick={() => cambiarPagina(Math.min(totalPages, currentPage + 1))}
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
          </CardContent>
        </Card>
      </div>
    </div >
  );
}
