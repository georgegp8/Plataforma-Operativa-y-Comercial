import { useState, useEffect } from 'react';
import { Plus, Upload, RotateCcw, X, Trash2 } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Entidad } from '@/types';
import type { Producto as ProductoType } from '@/lib/api';
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ProductoCompra {
  id: string;
  codigo: string;
  descripcion: string;
  unidad_medida: string;
  cantidad: number;
  precio_unitario: number;
  valor_unitario: number;
  igv_item: number;
  total: number;
}

interface Pago {
  id: string;
  formaPago: string;
  destino: string;
  referencia: string;
  monto: number;
}

export default function NuevaCompra() {
  const [tipoComprobante, setTipoComprobante] = useState('FACTURA ELECTRONICA');
  const [serie, setSerie] = useState('');
  const [numero, setNumero] = useState('');
  const [fechaEmision, setFechaEmision] = useState('2026-04-15');
  const [fechaVencimiento, setFechaVencimiento] = useState('2026-04-15');
  const [tipoCambio, setTipoCambio] = useState('3.37');
  const [moneda, setMoneda] = useState('Soles');
  const [incluyeIgv, setIncluyeIgv] = useState(true);
  const [agregarPagos, setAgregarPagos] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Entidad | null>(null);
  
  // Estados para modales
  const [isProveedorModalOpen, setIsProveedorModalOpen] = useState(false);
  const [isProductoModalOpen, setIsProductoModalOpen] = useState(false);
  const [proveedores, setProveedores] = useState<Entidad[]>([]);
  const [productos, setProductos] = useState<ProductoType[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  const [loadingProductos, setLoadingProductos] = useState(false);
  
  // Estados para productos y pagos en la compra
  const [productosCompra, setProductosCompra] = useState<ProductoCompra[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  useEffect(() => {
    if (isProveedorModalOpen) {
      fetchProveedores();
    }
  }, [isProveedorModalOpen]);

  useEffect(() => {
    if (isProductoModalOpen) {
      fetchProductos();
    }
  }, [isProductoModalOpen]);

  const fetchProveedores = async () => {
    try {
      setLoadingProveedores(true);
      const response = await api.proveedores.listar();
      setProveedores(response.data || []);
    } catch (error) {
      console.error('Error al cargar proveedores:', error);
      toast.error('Error al cargar la lista de proveedores');
    } finally {
      setLoadingProveedores(false);
    }
  };

  const fetchProductos = async () => {
    try {
      setLoadingProductos(true);
      const response = await api.productos.listar();
      setProductos(response.data || []);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast.error('Error al cargar la lista de productos');
    } finally {
      setLoadingProductos(false);
    }
  };

  const handleSelectProveedor = (proveedor: Entidad) => {
    setProveedorSeleccionado(proveedor);
    setIsProveedorModalOpen(false);
    toast.success(`Proveedor seleccionado: ${proveedor.denominacion}`);
  };

  const handleSelectProducto = (producto: ProductoType) => {
    const precioUnitario = producto.precio_compra_unitario || 0;
    const valorUnitario = incluyeIgv ? precioUnitario / 1.18 : precioUnitario;
    const igvItem = incluyeIgv ? precioUnitario - valorUnitario : valorUnitario * 0.18;
    
    const nuevoProducto: ProductoCompra = {
      id: `${Date.now()}-${Math.random()}`,
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      unidad_medida: producto.unidad_medida || 'NIU',
      cantidad: 1,
      precio_unitario: precioUnitario,
      valor_unitario: valorUnitario,
      igv_item: igvItem,
      total: precioUnitario,
    };
    setProductosCompra([...productosCompra, nuevoProducto]);
    setIsProductoModalOpen(false);
    toast.success(`Producto agregado: ${producto.descripcion}`);
  };

  const handleRemoveProducto = (id: string) => {
    setProductosCompra(productosCompra.filter(p => p.id !== id));
    toast.success('Producto eliminado');
  };

  const handleProductoChange = (id: string, field: 'cantidad' | 'precio_unitario', value: number) => {
    setProductosCompra(productosCompra.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: value };
        // Recalcular valores según incluye IGV
        if (field === 'precio_unitario') {
          updated.valor_unitario = incluyeIgv ? value / 1.18 : value;
          updated.igv_item = incluyeIgv ? value - updated.valor_unitario : updated.valor_unitario * 0.18;
        }
        updated.total = updated.cantidad * updated.precio_unitario;
        return updated;
      }
      return p;
    }));
  };

  const handleAddPago = () => {
    const nuevoPago: Pago = {
      id: `${Date.now()}-${Math.random()}`,
      formaPago: 'Efectivo',
      destino: 'CAJA GENERAL - MN',
      referencia: '',
      monto: 0,
    };
    setPagos([...pagos, nuevoPago]);
  };

  const handleRemovePago = (id: string) => {
    setPagos(pagos.filter(p => p.id !== id));
  };

  const handlePagoChange = (id: string, field: keyof Pago, value: string | number) => {
    setPagos(pagos.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleResetForm = () => {
    setTipoComprobante('FACTURA ELECTRONICA');
    setSerie('');
    setNumero('');
    setFechaEmision('2026-04-15');
    setFechaVencimiento('2026-04-15');
    setTipoCambio('3.37');
    setMoneda('Soles');
    setIncluyeIgv(true);
    setAgregarPagos(false);
    setProveedorSeleccionado(null);
    setProductosCompra([]);
    setPagos([]);
    toast.success('Formulario reiniciado');
  };

  const handleCancel = () => {
    toast.info('Operación cancelada');
    handleResetForm();
  };

  const calcularTotales = () => {
    const subtotal = productosCompra.reduce((sum, p) => sum + (p.valor_unitario * p.cantidad), 0);
    const totalIgv = productosCompra.reduce((sum, p) => sum + (p.igv_item * p.cantidad), 0);
    const total = subtotal + totalIgv;
    return { subtotal, totalIgv, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!proveedorSeleccionado) {
      toast.error('Debe seleccionar un proveedor');
      return;
    }
    if (!serie || !numero) {
      toast.error('Debe ingresar serie y número de comprobante');
      return;
    }
    if (productosCompra.length === 0) {
      toast.error('Debe agregar al menos un producto');
      return;
    }

    try {
      const totales = calcularTotales();
      const compraData = {
        proveedor_id: proveedorSeleccionado.id,
        proveedor_nombre: proveedorSeleccionado.denominacion,
        proveedor_ruc: proveedorSeleccionado.num_doc,
        actividad: 'Compra manual',
        fecha_actividad: fechaEmision,
        estado: agregarPagos && pagos.length > 0 ? 'Pagado' : 'Pendiente de pago',
        tipo_comprobante: serie.substring(0, 1), // F, B, etc.
        serie_comprobante: serie,
        numero_comprobante: numero,
        comprobante_completo: `${serie}-${numero}`,
        tipo_comprobante_desc: tipoComprobante,
        moneda: moneda === 'Soles' ? 'PEN' : 'USD',
        total: totales.total,
        cantidad_productos: productosCompra.length,
        activo: true,
      };

      const response = await api.compras.crear(compraData);
      if (response.data.success) {
        toast.success('Compra registrada exitosamente');
        handleResetForm();
      }
    } catch (error: unknown) {
      console.error('Error al guardar compra:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as {response?: {data?: {message?: string}}}).response?.data?.message
        : undefined;
      toast.error(errorMessage || 'Error al guardar la compra');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3">
          <h1 className="text-lg font-semibold">Nueva Compra</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-b-lg">
          <div className="p-6 space-y-6">
            {/* Comprobante de Compra Section */}
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <h2 className="text-sm font-semibold mb-4 text-foreground">Comprobante de Compra</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_comprobante">Tipo de Comprobante</Label>
                  <Select value={tipoComprobante} onValueChange={setTipoComprobante}>
                    <SelectTrigger id="tipo_comprobante" className="bg-background">
                      <SelectValue placeholder="Seleccione tipo de comprobante" />
                    </SelectTrigger>
                    <SelectContent className="max-w-md">
                      <SelectItem value="FACTURA ELECTRONICA">Factura Electrónica</SelectItem>
                      <SelectItem value="BOLETA DE VENTA ELECTRONICA">Boleta de Venta Electrónica</SelectItem>
                      <SelectItem value="NOTA DE CREDITO ELECTRONICA">Nota de Crédito Electrónica</SelectItem>
                      <SelectItem value="NOTA DE DEBITO ELECTRONICA">Nota de Débito Electrónica</SelectItem>
                      <SelectItem value="RECIBO POR HONORARIOS ELECTRONICO">Recibo por Honorarios Electrónico</SelectItem>
                      <SelectItem value="GUIA DE REMISION ELECTRONICA">Guía de Remisión Electrónica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serie">Serie</Label>
                  <Input
                    id="serie"
                    value={serie}
                    onChange={(e) => setSerie(e.target.value)}
                    className="bg-background"
                    placeholder="Ingrese serie"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="bg-background"
                    placeholder="Ingrese número"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="fecha_emision">F. Emisión</Label>
                  <Input
                    id="fecha_emision"
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha_vencimiento">F. Venc</Label>
                  <Input
                    id="fecha_vencimiento"
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="tipo_cambio" className="cursor-help inline-flex items-center gap-1">
                        T.C. <span className="text-xs text-muted-foreground">ⓘ</span>
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Tipo de Cambio</p>
                    </TooltipContent>
                  </Tooltip>
                  <Input
                    id="tipo_cambio"
                    type="number"
                    step="0.001"
                    value={tipoCambio}
                    onChange={(e) => setTipoCambio(e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="moneda">Moneda</Label>
                  <Select value={moneda} onValueChange={setMoneda}>
                    <SelectTrigger id="moneda" className="bg-background w-full">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="w-auto min-w-full">
                      <SelectItem value="PEN">PEN - Nuevos Soles</SelectItem>
                      <SelectItem value="USD">USD - Dólares Americanos</SelectItem>
                      <SelectItem value="EUR">EUR - Euros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incluye_igv">Incluye IGV</Label>
                  <div className="flex items-center h-10">
                    <button
                      type="button"
                      onClick={() => setIncluyeIgv(!incluyeIgv)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        incluyeIgv ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          incluyeIgv ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="agregar_pagos"
                  checked={agregarPagos}
                  onChange={(e) => setAgregarPagos(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="agregar_pagos" className="cursor-pointer">
                  ¿Desea agregar pagos a esta compra?
                </Label>
              </div>
            </div>

            {/* Proveedor Section */}
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">Proveedor</h2>
                <Button
                  type="button"
                  onClick={() => toast.info('Funcionalidad de agregar proveedor en desarrollo')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo
                </Button>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={() => setIsProveedorModalOpen(true)}
                  variant="outline"
                  className="w-full justify-start"
                >
                  {proveedorSeleccionado 
                    ? `${proveedorSeleccionado.denominacion} (${proveedorSeleccionado.num_doc})`
                    : 'Seleccionar proveedor...'}
                </Button>
              </div>
            </div>

            {/* Productos Section */}
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  type="button"
                  onClick={() => setIsProductoModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Producto
                </Button>
                <Button
                  type="button"
                  onClick={() => toast.info('Funcionalidad de importar items en desarrollo')}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  size="sm"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Importar Items
                </Button>
              </div>
              
              {productosCompra.length === 0 ? (
                <div className="bg-muted/50 rounded-lg p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay productos agregados. Haga clic en "Agregar Producto" para comenzar.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr className="border-b border-border">
                        <th className="text-left px-2 py-2 text-xs font-semibold">Código</th>
                        <th className="text-left px-2 py-2 text-xs font-semibold">Descripción</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold">UM</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold">Cant.</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold">P. Unit.</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold">Valor</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold">IGV</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold">Total</th>
                        <th className="text-center px-2 py-2 text-xs font-semibold">-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosCompra.map((producto) => (
                        <tr key={producto.id} className="border-b border-border hover:bg-muted/30">
                          <td className="px-2 py-2 text-xs">{producto.codigo}</td>
                          <td className="px-2 py-2 text-xs max-w-xs truncate" title={producto.descripcion}>
                            {producto.descripcion}
                          </td>
                          <td className="px-2 py-2 text-xs text-center">{producto.unidad_medida}</td>
                          <td className="px-2 py-2 text-center">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={producto.cantidad}
                              onChange={(e) => handleProductoChange(producto.id, 'cantidad', Number(e.target.value))}
                              className="w-16 text-center text-xs h-8"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={producto.precio_unitario}
                              onChange={(e) => handleProductoChange(producto.id, 'precio_unitario', Number(e.target.value))}
                              className="w-20 text-right text-xs h-8"
                            />
                          </td>
                          <td className="px-2 py-2 text-xs text-right text-muted-foreground">
                            {(producto.valor_unitario * producto.cantidad).toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-xs text-right text-muted-foreground">
                            {(producto.igv_item * producto.cantidad).toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-xs text-right font-semibold">
                            {producto.total.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveProducto(producto.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/50">
                      <tr className="border-t-2 border-border">
                        <td colSpan={5} className="px-2 py-2 text-sm font-semibold text-right">Subtotal:</td>
                        <td className="px-2 py-2 text-sm text-right font-semibold">
                          {calcularTotales().subtotal.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-sm text-right font-semibold">
                          {calcularTotales().totalIgv.toFixed(2)}
                        </td>
                        <td className="px-2 py-2 text-sm text-right font-bold text-primary">
                          {calcularTotales().total.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Pagos Section */}
            {agregarPagos && (
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-foreground">Pagos</h2>
                  <Button
                    type="button"
                    onClick={handleAddPago}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>
                
                {pagos.length === 0 ? (
                  <div className="bg-muted/50 rounded-lg p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No hay pagos registrados. Haga clic en "Agregar" para agregar un pago.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-primary text-primary-foreground">
                        <tr className="border-b border-border">
                          <th className="text-left px-4 py-2 text-sm font-semibold">Forma de pago</th>
                          <th className="text-left px-4 py-2 text-sm font-semibold">Destino</th>
                          <th className="text-left px-4 py-2 text-sm font-semibold">Referencia</th>
                          <th className="text-right px-4 py-2 text-sm font-semibold">Monto</th>
                          <th className="text-center px-4 py-2 text-sm font-semibold">
                            <Plus className="h-4 w-4 mx-auto" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagos.map((pago) => (
                          <tr key={pago.id} className="border-b border-border">
                            <td className="px-4 py-2">
                              <Input
                                value={pago.formaPago}
                                onChange={(e) => handlePagoChange(pago.id, 'formaPago', e.target.value)}
                                className="bg-background"
                                placeholder="Efectivo"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                value={pago.destino}
                                onChange={(e) => handlePagoChange(pago.id, 'destino', e.target.value)}
                                className="bg-background"
                                placeholder="CAJA GENERAL - MN"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                value={pago.referencia}
                                onChange={(e) => handlePagoChange(pago.id, 'referencia', e.target.value)}
                                className="bg-background"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={pago.monto}
                                onChange={(e) => handlePagoChange(pago.id, 'monto', Number(e.target.value))}
                                className="bg-background text-right"
                              />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemovePago(pago.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                {productosCompra.length > 0 && (
                  <span>
                    <strong>{productosCompra.length}</strong> producto(s) | Total: <strong className="text-primary">{moneda === 'Soles' ? 'S/' : '$'} {calcularTotales().total.toFixed(2)}</strong>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleResetForm}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={!proveedorSeleccionado || productosCompra.length === 0}
                >
                  💾 Guardar Compra
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Seleccionar Proveedor */}
        <Dialog open={isProveedorModalOpen} onOpenChange={setIsProveedorModalOpen}>
          <DialogContent className="sm:max-w-150">
            <DialogHeader>
              <DialogTitle>Seleccionar Proveedor</DialogTitle>
              <DialogDescription>
                Seleccione un proveedor de la lista
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {loadingProveedores ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Cargando proveedores...</p>
                </div>
              ) : proveedores.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No hay proveedores registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {proveedores.map((proveedor) => (
                    <button
                      key={proveedor.id}
                      type="button"
                      onClick={() => handleSelectProveedor(proveedor)}
                      className="w-full text-left p-3 rounded border border-border hover:bg-muted transition-colors"
                    >
                      <div className="font-medium">{proveedor.denominacion}</div>
                      <div className="text-sm text-muted-foreground">
                        {proveedor.tipo_doc}: {proveedor.num_doc}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProveedorModalOpen(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Seleccionar Producto */}
        <Dialog open={isProductoModalOpen} onOpenChange={setIsProductoModalOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Seleccionar Producto</DialogTitle>
              <DialogDescription>
                Seleccione un producto de la lista para agregarlo a la compra
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {loadingProductos ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Cargando productos...</p>
                </div>
              ) : productos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No hay productos registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {productos.map((producto) => (
                    <button
                      key={producto.id}
                      type="button"
                      onClick={() => handleSelectProducto(producto)}
                      className="w-full text-left p-3 rounded border border-border hover:bg-accent hover:border-primary transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{producto.descripcion}</div>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-xs text-muted-foreground">Código: <strong>{producto.codigo}</strong></span>
                            {producto.unidad_medida && (
                              <span className="text-xs text-muted-foreground">UM: <strong>{producto.unidad_medida}</strong></span>
                            )}
                            {producto.stock_actual > 0 && (
                              <span className="text-xs text-muted-foreground">Stock: <strong>{producto.stock_actual}</strong></span>
                            )}
                          </div>
                        </div>
                        {producto.precio_compra_unitario && (
                          <div className="text-right">
                            <div className="text-sm font-semibold text-primary">
                              S/ {producto.precio_compra_unitario.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Precio compra</div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProductoModalOpen(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
