/**
 * Tipos centralizados para la aplicación.
 * Reexporta entidades de lib/api y define interfaces para vistas y componentes compartidos.
 */

// Reexportar tipos de API
export type {
  PaginatedResponse,
  ApiResponse,
  Empresa,
  EmpresaFormData,
  ComprobanteItem,
  ComprobanteEmitido,
  ClientePayload,
  Producto,
  ProductoFormData,
  Entidad,
  Oportunidad,
  Documento,
  Pago,
  EstadoOportunidad,
} from '@/lib/api';

// --- Entidades de vista (listados / formularios) ---

/** Cliente tal como se muestra en listados y formularios CRUD */
export interface Cliente {
  id: number;
  tipo_doc: string;
  num_doc?: string;
  denominacion: string;
  razon_comercial?: string | null;
  direccion?: string | null;
  email?: string | null;
  telefono?: string | null;
  a_cuenta?: boolean;
  created_by?: string;
  created_at?: string;
}

/** Datos del formulario de cliente (crear/editar) */
export interface ClienteFormData {
  empresa_id?: number;
  tipo_doc: string;
  num_doc: string;
  denominacion: string;
  razon_comercial: string;
  direccion: string;
  email: string;
  telefono: string;
}

/** Proveedor tal como se muestra en listados y formularios CRUD */
export interface Proveedor {
  id: number;
  tipo_doc: string;
  num_doc?: string;
  denominacion: string;
  razon_comercial?: string | null;
  direccion?: string | null;
  email?: string | null;
  telefono?: string | null;
  created_by?: string;
  created_at?: string;
}

/** Datos del formulario de proveedor (crear/editar) */
export interface ProveedorFormData {
  tipo_doc: string;
  num_doc: string;
  denominacion: string;
  razon_comercial: string;
  direccion: string;
  email: string;
  telefono: string;
}

/** Vendedor tal como se muestra en listados y formularios CRUD */
export interface Vendedor {
  id: number;
  nombre: string;
  email?: string;
  telefono?: string;
  porcentaje_comision: number;
  activo: boolean;
  created_by?: string;
  created_at?: string;
  ventas_cpe?: number;
  ventas_nv?: number;
  total_ventas?: number;
  total_comision?: number;
}

/** Datos del formulario de vendedor (crear/editar) */
export interface VendedorFormData {
  nombre: string;
  email: string;
  telefono: string;
  porcentaje_comision: number;
  activo: boolean;
}

/** Personal tal como se muestra en listados y formularios CRUD */
export interface Personal {
  id: number;
  nombre: string;
  numero?: string;
  puesto_asignado?: string;
  salario_base: number;
  email?: string;
  telefono?: string;
  activo: boolean;
  created_by?: string;
  created_at?: string;
}

/** Datos del formulario de personal (crear/editar) */
export interface PersonalFormData {
  nombre: string;
  numero: string;
  puesto_asignado: string;
  salario_base: number;
  email: string;
  telefono: string;
  activo: boolean;
}

export interface CuentaBancaria {
  id: number;
  descripcion: string;
  numero: string;
  balance: number;
  abreviatura?: string;
  banco?: string;
  moneda: string;
  activo: boolean;
  created_by?: string;
  created_at?: string;
}

export interface CuentaBancariaFormData {
  descripcion: string;
  numero: string;
  balance: number;
  abreviatura: string;
  banco: string;
  moneda: string;
  activo: boolean;
}

export interface Banco {
  id: number;
  abreviatura?: string;
  descripcion: string;
  imagen?: string;
  activo: boolean;
  created_by?: string;
  created_at?: string;
}

export interface BancoFormData {
  abreviatura: string;
  descripcion: string;
  imagen?: string;
  activo: boolean;
}

export interface Categoria {
  id: number;
  nombre: string;
  identificador?: string;
  activo: boolean;
  created_by?: string;
  created_at?: string;
}

export interface CategoriaFormData {
  nombre: string;
  identificador?: string;
  activo: boolean;
}

export interface Marca {
  id: number;
  nombre: string;
  activo: boolean;
  created_by?: string;
  created_at?: string;
}

export interface MarcaFormData {
  nombre: string;
  activo: boolean;
}

export interface Atributo {
  id: number;
  codigo?: string;
  descripcion: string;
  activo: boolean;
  created_by?: string;
  created_at?: string;
}

export interface AtributoFormData {
  codigo?: string;
  descripcion: string;
  activo: boolean;
}

export interface UnidadMedida {
  id: number;
  codigo: string;
  descripcion: string;
  simbolo: string;
  activo: boolean;
  created_by?: string;
  created_at?: string;
}

export interface UnidadMedidaFormData {
  codigo: string;
  descripcion: string;
  simbolo: string;
  activo: boolean;
}

export interface Transaccion {
  id: number;
  descripcion: string;
  tipo: string;
  activo: boolean;
  created_by?: string;
  created_at?: string;
}

export interface TransaccionFormData {
  descripcion: string;
  tipo: string;
  activo: boolean;
}

export interface Vehiculo {
  id: number;
  placa: string;
  modelo: string;
  marca: string;
  activo: boolean;
  created_by?: string;
  created_at?: string;
}

export interface VehiculoFormData {
  placa: string;
  modelo: string;
  marca: string;
  activo: boolean;
}

export interface Conductor {
  id: number;
  tipo_documento: string;
  numero_documento: string;
  nombre: string;
  licencia_conducir?: string;
  telefono?: string;
  activo: boolean;
  created_by?: string;
  created_at?: string;
}

export interface ConductorFormData {
  tipo_documento: string;
  numero_documento: string;
  nombre: string;
  licencia_conducir?: string;
  telefono?: string;
  activo: boolean;
}

export interface Compra {
  id: number;
  actividad: string;
  fecha_actividad: string;
  proveedor_id: number;
  proveedor_nombre: string;
  proveedor_ruc: string;
  estado: string;
  tipo_comprobante: string;
  serie_comprobante: string;
  numero_comprobante: string;
  comprobante_completo: string;
  tipo_comprobante_desc: string;
  moneda: string;
  total: number;
  cantidad_productos: number;
  activo: boolean;
  created_by?: string;
  created_at?: string;
}

export interface CompraFormData {
  actividad: string;
  fecha_actividad: string;
  proveedor_id: number;
  proveedor_nombre: string;
  proveedor_ruc: string;
  estado: string;
  tipo_comprobante: string;
  serie_comprobante: string;
  numero_comprobante: string;
  comprobante_completo: string;
  tipo_comprobante_desc: string;
  moneda: string;
  total: number;
  cantidad_productos: number;
  activo: boolean;
}

// Estructura de datos extraídos por OCR
export interface DatosExtraidos {
  forma_pago?: string;
  items?: Array<{
    numero?: number;
    codigo?: string;
    descripcion: string;
    unidad_medida?: string;
    cantidad: number;
    precio_unitario: number;
    valor_unitario?: number;
    importe: number;
  }>;
  [key: string]: unknown;
}

// Documentos Digitalizados (OCR de facturas)
export interface DocumentoDigitalizado {
  readonly id: number;
  nombre_archivo: string;
  ruta_archivo: string;
  tipo_archivo: string;
  tamano_archivo: number;
  tipo_operacion: 'compra' | 'venta';
  estado_procesamiento: 'pendiente' | 'procesando' | 'completado' | 'error';
  error_mensaje: string | null;
  datos_extraidos: DatosExtraidos;
  tipo_comprobante: string | null;
  serie: string | null;
  numero: string | null;
  comprobante_completo: string | null;
  fecha_emision: string | null;
  entidad_tipo_doc: string | null;
  entidad_num_doc: string | null;
  entidad_razon_social: string | null;
  entidad_direccion: string | null;
  moneda: string | null;
  subtotal: number | null;
  igv: number | null;
  total: number | null;
  items_extraidos: ItemExtraido[] | null;
  confianza_ocr: number | null;
  requiere_validacion: boolean;
  validado: boolean;
  fecha_validacion: string | null;
  validado_por: string | null;
  compra_id: number | null;
  venta_id: number | null;
  activo: boolean;
  // Nuevos campos de NubeFact API (34 campos adicionales)
  sunat_transaction: string | null;
  tipo_documento_cliente: '1' | '4' | '6' | '7' | '0' | null; // DNI, CE, RUC, Pasaporte, Sin Doc
  fecha_vencimiento: string | null;
  tipo_cambio: number | null;
  porcentaje_igv: number | null;
  total_gravada: number | null;
  total_exonerada: number | null;
  total_inafecta: number | null;
  total_gratuita: number | null;
  total_otros_cargos: number | null;
  total_descuentos: number | null;
  suma_igv: number | null;
  suma_isc: number | null;
  suma_otros_tributos: number | null;
  mto_operaciones_gravadas: number | null;
  mto_operaciones_exoneradas: number | null;
  mto_operaciones_inafectas: number | null;
  mto_operaciones_gratuitas: number | null;
  detraccion: boolean | null;
  detraccion_codigo: string | null;
  detraccion_porcentaje: number | null;
  detraccion_monto: number | null;
  percepcion_tipo: string | null;
  percepcion_monto: number | null;
  condiciones_pago: string | null;
  orden_compra_servicio: string | null;
  observaciones: string | null;
  // Notas de crédito/débito
  documento_modifica_tipo: string | null;
  documento_modifica_serie: string | null;
  documento_modifica_numero: string | null;
  tipo_nota: '1' | '2' | null; // 1=Crédito, 2=Débito
  motivo_nota: string | null;
  // Venta a crédito
  venta_al_credito: boolean;
  venta_credito_cuotas: CuotaCredito[] | null;
  // Guías relacionadas
  guias_relacionadas: GuiaRelacionada[] | null;
  readonly created_at?: string;
  readonly created_by?: string;
}

export interface CuotaCredito {
  cuota: number;
  fecha_pago: string;
  importe: number;
}

export interface GuiaRelacionada {
  tipo: string; // '09' para guía de remisión
  serie: string;
  numero: string;
}

export interface ItemExtraido {
  codigo?: string;
  descripcion: string;
  cantidad: number;
  unidad_medida?: string; // NIU, ZZ, KGM, etc.
  valor_unitario?: number;
  precio_unitario: number;
  tipo_igv?: string; // 10=Gravado, 20=Exonerado, 30=Inafecto, 40=Gratuito
  subtotal: number;
  igv?: number;
  total?: number;
}

export interface DocumentoDigitalizadoFormData {
  tipo_comprobante: string;
  serie: string;
  numero: string;
  fecha_emision: string;
  entidad_tipo_doc: string;
  entidad_num_doc: string;
  entidad_razon_social: string;
  entidad_direccion: string;
  moneda: string;
  subtotal: number;
  igv: number;
  total: number;
  items_extraidos: ItemExtraido[];
}

// --- Props de componentes compartidos ---

export interface PageHeaderProps {
  /** Título principal (h1) */
  title: string;
  /** Descripción opcional debajo del título */
  description?: string;
  /** Contenido a la derecha (botones Nuevo, Exportar, etc.) */
  actions?: React.ReactNode;
}

export interface MetricCardProps {
  /** Título del KPI */
  title: string;
  /** Valor principal (número o texto) */
  value: string | number;
  /** Icono (componente Lucide) */
  icon: React.ComponentType<{ className?: string }>;
  /** Texto secundario debajo del valor */
  description?: string;
  /** Desglose opcional (lista de líneas) */
  details?: Array<{ label: string; value: string | number }>;
  /** Clases adicionales para la card */
  className?: string;
  /** Variante del estilo (default: card normal, navy: fondo azul marino con icono grande, nubofact: diseño Nubofact original) */
  variant?: 'default' | 'navy' | 'nubofact';
  /** Ruta interna (react-router) a la que navegar al hacer clic */
  href?: string;
}

export interface EmptyStateProps {
  /** Icono (componente Lucide) */
  icon: React.ComponentType<{ className?: string }>;
  /** Mensaje principal */
  title: string;
  /** Mensaje secundario opcional */
  description?: string;
  /** Botón o enlace de acción opcional */
  action?: React.ReactNode;
}

export interface FilterBarProps {
  /** Contenido de los filtros (inputs, selects) */
  children: React.ReactNode;
  /** Botón "Limpiar" o similar; opcional */
  onClear?: () => void;
  /** Etiqueta del botón de limpiar */
  clearLabel?: string;
  /** Clases adicionales */
  className?: string;
}

// --- Dashboard Section 1 Types ---

export interface DashboardFiltros {
  /** ID del establecimiento seleccionado */
  establecimiento: string;
  /** Tipo de período para el dashboard */
  periodo: 'COMPLETO' | 'POR_FECHA' | 'HOY' | 'ESTA_SEMANA' | 'ESTE_MES' | 'ESTE_AÑO';
  /** Fecha inicial (formato YYYY-MM-DD) */
  fechaDel: string;
  /** Fecha final (formato YYYY-MM-DD) - solo para POR_FECHA */
  fechaHasta?: string;
}

export interface CPERankingItem {
  /** Nombre del tipo de comprobante (Facturas, Boletas, etc.) */
  name: string;
  /** Cantidad de comprobantes de este tipo */
  value: number;
  /** Porcentaje del total */
  percentage: number;
}

export interface ProductoTopItem {
  /** ID del producto en el ranking */
  id: number;
  /** Nombre del producto */
  producto: string;
  /** Unidad de medida */
  unidad: string;
  /** Precio unitario de venta con IGV */
  precio_unitario: number;
  /** Cantidad total vendida */
  cantidad: number;
  /** Monto total de ventas */
  total: number;
}

export interface ClienteTopItem {
  /** ID del cliente en el ranking */
  id: number;
  /** Nombre del cliente */
  cliente: string;
  /** Cantidad de transacciones */
  transacciones: number;
  /** Monto total de compras */
  total: number;
}

export interface StockMinimoProduct {
  /** ID del producto */
  id: number;
  /** Nombre del producto */
  producto: string;
  /** Stock actual */
  stock: string | number;
  /** Estado del stock */
  estado: 'AGOTADO' | 'BAJO' | 'CRITICO';
  /** Almacén donde se encuentra */
  almacen: string;
}

export interface StockMinimoResponse {
  /** Array de productos */
  data: StockMinimoProduct[];
  /** Total de productos con stock mínimo */
  total: number;
  /** Página actual */
  current_page: number;
  /** Items por página */
  per_page: number;
  /** Total de páginas */
  total_pages: number;
}

export interface DashboardStats {
  /** Cantidad total de CPE emitidos (todos los tipos) */
  cpeEmitidos: number;
  /** Monto total de CPE (Facturas + NC + ND) */
  totalCPE: number;
  /** Monto pagado de CPE */
  cpePagado: number;
  /** Monto por pagar de CPE */
  cpePorPagar: number;
  /** Monto total de CPE */
  cpeTotal: number;
  /** Monto total de Boletas de Venta (tipo_doc 03) */
  totalBoletas: number;
  /** Monto pagado de Boletas */
  boletasPagado: number;
  /** Monto por pagar de Boletas */
  boletasPorPagar: number;
  /** Monto total de Boletas */
  boletasTotal: number;
  /** Monto total general (CPE + Boletas) */
  montoTotalGeneral: number;
  /** Utilidad neta calculada (Ingresos - Egresos) */
  utilidadNeta: number;
  /** Datos de ventas por hora para el gráfico */
  ventasPorHora: Array<{ hora: string; total: number }>;
}

export interface DashboardFilterPanelProps {
  /** Establecimiento seleccionado */
  establecimiento: string;
  /** Período seleccionado */
  periodo: DashboardFiltros['periodo'];
  /** Fecha inicial */
  fechaDel: string;
  /** Callback cuando cambian los filtros */
  onFiltrosChange: (filtros: DashboardFiltros) => void;
}

export interface DesgloseSummaryPanelProps {
  /** Título del panel */
  title: string;
  /** Items a mostrar en el desglose */
  items: Array<{
    /** Etiqueta del item */
    label: string;
    /** Valor del item */
    value: string;
    /** Si debe resaltarse en azul */
    highlight?: boolean;
  }>;
}

export interface MonthlyComparisonData {
  /** Mes del año */
  mes: string;
  /** Total de facturas */
  facturas: number;
  /** Total de boletas */
  boletas: number;
  /** Total de notas de crédito */
  notasCredito: number;
  /** Total de notas de débito */
  notasDebito: number;
  /** Total de compras */
  compras: number;
}

export interface MonthlyTableRow {
  /** Mes del año */
  mes: string;
  /** Total de facturas formateado */
  facturas: string;
  /** Total de boletas formateado */
  boletas: string;
  /** Total de notas de crédito formateado */
  notasCredito: string;
  /** Total de notas de débito formateado */
  notasDebito: string;
  /** Total de compras formateado */
  compras: string;
  /** Si es la fila de totales */
  isTotal?: boolean;
}
