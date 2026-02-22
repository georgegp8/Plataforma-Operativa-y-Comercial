import apiClient from '../services/api';

// --- UTILIDADES ---

export const apiBaseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');

/**
 * Obtiene el correlativo actual desde el backend para evitar colisiones.
 * Se debe llamar justo antes de mostrar el formulario o al cambiar la serie.
 */
export const obtenerCorrelativoSeguro = async (empresa_id: number, tipo_doc: string, serie: string) => {
  const response = await apiClient.get<{ serie: string; correlativo: string; numero_completo: string }>(
    '/facturacion/correlativo-seguro',
    { 
      params: { 
        empresa_id, 
        tipo_doc, 
        serie 
      } 
    }
  );
  return response.data;
};

// --- TIPOS Y POSIBLES RESPUESTAS ---

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// --- INTERFACES DE MODELOS ---

export interface Empresa {
  id: number;
  ruc: string;
  razon_social: string;
  nombre_comercial: string;
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  telefono?: string;
  email?: string;
  certificado_path?: string;
  sol_user: string;
  client_id?: string;
  logo_path?: string;
  activo: boolean;
  modo: 'beta' | 'prod';
  created_at: string;
  updated_at: string;
}

export interface EmpresaFormData {
  ruc: string;
  razon_social: string;
  nombre_comercial: string;
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
  telefono?: string;
  email?: string;
  sol_user: string;
  sol_password: string;
  client_id?: string;
  client_secret?: string;
  modo: 'beta' | 'prod';
  activo: boolean;
}

export interface ComprobanteItem {
  id: number;
  comprobante_id: number;
  item: number;
  codigo_producto: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  mto_valor_unitario: number;
  mto_precio_unitario: number;
  mto_valor_venta: number;
  mto_base_igv: number;
  porcentaje_igv: number;
  igv: number;
  tip_afe_igv: string;
  isc: number;
  total_impuestos: number;
  descuento: number;
}

export interface ComprobanteEmitido {
  id: number;
  empresa_id: number;
  tipo_doc: string;
  serie: string;
  correlativo: string;
  cliente_tipo_doc: string;
  cliente_num_doc: string;
  cliente_razon_social: string;
  moneda: string;
  mto_imp_venta: number;
  mto_base_imp?: number;
  mto_oper_gratuitas?: number;
  estado_sunat: string;
  mensaje_sunat?: string;
  xml_path?: string;
  cdr_path?: string;
  pdf_path?: string;
  nubefact_enlace?: string;
  nubefact_pdf_url?: string;
  nubefact_xml_url?: string;
  nubefact_cdr_url?: string;
  fecha_emision: string;
  pagado?: boolean;
  anulado?: boolean;
  enviado_cliente?: boolean;
  empresa?: Empresa;
  items?: ComprobanteItem[];
}

export interface ClientePayload {
  tipoDoc: string;
  numDoc: string;
  rznSocial: string;
  address?: {
    direccion?: string;
  };
  email?: string;
}

export interface DetalleItemPayload {
  descripcion: string;
  cantidad: number;
  mtoValorUnitario: number;
}

export interface EmisionFacturaPayload {
  empresa_id: number;
  tipoMoneda: 'PEN' | 'USD' | 'EUR';
  client: ClientePayload;
  details: DetalleItemPayload[];
  mtoImpVenta: number;
}

export interface EmisionResponse {
  success: boolean;
  comprobante: ComprobanteEmitido;
  cdr_response: {
    code: string;
    description: string;
  };
  xml_url?: string;
  cdr_url?: string;
  pdf_url?: string;
}

export type EstadoOportunidad = 'nuevo' | 'en_proceso' | 'enviado' | 'observado' | 'ganado' | 'perdido' | 'cancelado';

export interface Oportunidad {
  id: number;
  empresa_id: number;
  area: string;
  tipo_operacion: string;
  estado: EstadoOportunidad;
  responsable_id: number | null;
  cliente_nombre: string;
  cliente_ruc?: string | null;
  descripcion?: string | null;
  monto_estimado?: number | null;
  fecha_inicio: string;
  fecha_vencimiento?: string | null;
  probabilidad?: number | null;
  notas?: string | null;
  empresa?: { id: number; razon_social: string };
  responsable?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

export interface Documento {
  id: number;
  oportunidad_id: number | null;
  usuario_id?: number | null;
  tipo: string;
  nombre_archivo: string;
  storage_path: string;
  mime_type: string;
  size: number;
  metadata?: Record<string, unknown> | null;
  descripcion?: string | null;
  version?: number | null;
  documento_padre_id?: number | null;
  created_at: string;
  updated_at: string;
  oportunidad?: { id: number; cliente_nombre?: string | null; descripcion?: string | null } | null;
  usuario?: { id: number; name: string } | null;
}

export interface Pago {
  id: number;
  oportunidad_id: number | null;
  comprobante_id: number | null;
  usuario_id: number | null;
  fecha_pago: string;
  monto: number;
  moneda: string;
  medio_pago: string;
  nro_operacion?: string | null;
  banco?: string | null;
  comprobante_path?: string | null;
  estado?: string | null;
  observaciones?: string | null;
  created_at: string;
  updated_at: string;
  oportunidad?: { id: number; cliente_nombre?: string | null; descripcion?: string | null } | null;
  comprobante?: { id: number; tipo_doc: string; serie: string; numero: string; mto_imp_venta?: number } | null;
  usuario?: { id: number; name: string } | null;
}

export interface Serie {
  id: number;
  empresa_id: number;
  tipo_comprobante: string;
  serie: string;
  correlativo_actual: number;
  activo: boolean;
  por_defecto: boolean;
  empresa?: { id: number; ruc: string; razon_social: string };
  created_at: string;
  updated_at: string;
}

export interface SerieFormData {
  empresa_id: number;
  tipo_comprobante: string;
  serie: string;
  correlativo_actual: number;
  activo: boolean;
  por_defecto: boolean;
}

export interface Producto {
  id: number;
  empresa_id: number;
  codigo: string;
  descripcion: string;
  categoria: string | null;
  unidad_medida: string;
  codigo_producto_sunat: string | null;
  moneda: string;
  valor_venta_unitario: number | null;
  precio_venta_unitario: number | null;
  costo_compra_unitario: number | null;
  precio_compra_unitario: number | null;
  tipo_afectacion_igv: string;
  destacado: boolean;
  activo: boolean;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  stock?: number;
}

export interface ProductoFormData {
  empresa_id: number;
  codigo: string;
  descripcion: string;
  categoria?: string;
  unidad_medida: string;
  codigo_producto_sunat?: string;
  moneda: string;
  valor_venta_unitario?: string | number;
  precio_venta_unitario?: string | number;
  costo_compra_unitario?: string | number;
  precio_compra_unitario?: string | number;
  tipo_afectacion_igv: string;
  stock_actual?: string | number;
  destacado: boolean;
}

export interface Entidad {
  id: number;
  empresa_id: number;
  tipo_doc: string;
  num_doc?: string;
  numero_documento?: string;
  denominacion?: string;
  razon_social?: string;
  razon_comercial?: string;
  nombre_comercial?: string;
  direccion?: string;
  email?: string;
  email_2?: string;
  email_3?: string;
  telefono?: string;
  codigo_cliente?: string;
  licencia_conducir?: string;
  placa_vehiculo?: string;
  es_cliente: boolean;
  es_proveedor: boolean;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EntidadFormData {
  tipo_doc: string;
  num_doc?: string;
  denominacion: string;
  razon_comercial?: string;
  direccion?: string;
  email?: string;
  email_2?: string;
  email_3?: string;
  telefono?: string;
  codigo_cliente?: string;
  es_cliente?: boolean;
  es_proveedor?: boolean;
}

export interface GuiaRemision {
  id: number;
  serie: string;
  numero: string;
  tipo_comprobante?: string;
  fecha_emision: string;
  cliente_denominacion: string;
  destinatario_denominacion: string;
  destinatario_tipo_documento?: string;
  destinatario_numero_documento?: string;
  estado: string;
  fecha_inicio_traslado: string;
  motivo_traslado?: string;
  tipo_transporte?: string;
  vehiculo_placa?: string;
  vehiculo_tuc?: string;
  conductor_nombre?: string;
  conductor_apellidos?: string;
  conductor_licencia?: string;
  peso_bruto_total?: number;
  peso_bruto_unidad?: string;
  numero_bultos?: number;
  transportista_tipo_documento?: string;
  transportista_numero_documento?: string;
  transportista_denominacion?: string;
  punto_partida_direccion?: string;
  punto_partida_ubigeo?: string;
  punto_llegada_direccion?: string;
  punto_llegada_ubigeo?: string;
  observaciones?: string;
  nubefact_pdf_url?: string;
  nubefact_xml_url?: string;
  nubefact_cdr_url?: string;
  nubefact_cadena_qr?: string;
  nubefact_aceptada_por_sunat?: boolean;
  nubefact_enviado_at?: string;
}

export interface NotaVenta {
  id: number;
  fecha_emision: string;
  cliente_razon_social: string;
  cliente_num_doc: string;
  serie: string;
  numero: string; 
  metodo_pago: string;
  pagado: boolean; 
  cpe_relacionado?: string; 
  motivo?: string;
  estado_pago: string;
  moneda: string;
  total: number;
  actividad?: string;
}

// --- API OBJECT ---

export const api = {
  // Empresas
  empresas: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<PaginatedResponse<Empresa>>('/v1/empresas', { params }),
    obtener: (id: number) => apiClient.get<ApiResponse<Empresa>>(`/v1/empresas/${id}`),
    crear: (data: EmpresaFormData) => apiClient.post<ApiResponse<Empresa>>('/v1/empresas', data),
    actualizar: (id: number, data: Partial<EmpresaFormData>) =>
      apiClient.put<ApiResponse<Empresa>>(`/v1/empresas/${id}`, data),
    eliminar: (id: number) => apiClient.delete<ApiResponse<unknown>>(`/v1/empresas/${id}`),
    toggleActivo: (id: number) =>
      apiClient.patch<ApiResponse<Empresa>>(`/v1/empresas/${id}/toggle-activo`),
    cambiarModo: (id: number) =>
      apiClient.patch<ApiResponse<Empresa>>(`/v1/empresas/${id}/cambiar-modo`),
    uploadLogo: (id: number, file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      return apiClient.post<ApiResponse<Empresa>>(`/v1/empresas/${id}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    getLogo: (id: number) =>
      apiClient.get(`/v1/empresas/${id}/logo`, { responseType: 'blob' }),
  },

  // Facturación
  facturacion: {
    emitirFactura: (data: EmisionFacturaPayload) =>
      apiClient.post<EmisionResponse>('/facturacion/emitir/factura', data),
    emitirBoleta: (data: EmisionFacturaPayload) =>
      apiClient.post<EmisionResponse>('/facturacion/emitir/boleta', data),
    listarComprobantes: (params?: Record<string, unknown>) =>
      apiClient.get<PaginatedResponse<ComprobanteEmitido>>('/facturacion/comprobantes', { params }),
    exportarExcel: (params?: Record<string, unknown>) =>
      window.open(`${apiBaseUrl}/facturacion/comprobantes/export?${new URLSearchParams(params as Record<string, string>).toString()}`, '_blank'),
    descargarPdf: (id: number) =>
      apiClient.get(`/facturacion/descargar/pdf/${id}`, { responseType: 'blob' }),
    descargarXml: (id: number) =>
      apiClient.get(`/facturacion/descargar/xml/${id}`, { responseType: 'blob' }),
    descargarCdr: (id: number) =>
      apiClient.get(`/facturacion/descargar/cdr/${id}`, { responseType: 'blob' }),
    descargarHtml: (id: number) =>
      apiClient.get(`/facturacion/descargar/html/${id}`, { responseType: 'text' }),
  },

  // Oportunidades
  oportunidades: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<PaginatedResponse<Oportunidad>>('/v1/oportunidades', { params }),
    obtener: (id: number) => apiClient.get<ApiResponse<Oportunidad>>(`/v1/oportunidades/${id}`),
    crear: (data: Partial<Oportunidad>) =>
      apiClient.post<ApiResponse<Oportunidad>>('/v1/oportunidades', data),
    actualizar: (id: number, data: Partial<Oportunidad>) =>
      apiClient.put<ApiResponse<Oportunidad>>(`/v1/oportunidades/${id}`, data),
    eliminar: (id: number) => apiClient.delete<ApiResponse<unknown>>(`/v1/oportunidades/${id}`),
    cambiarEstado: (id: number, data: { estado: EstadoOportunidad; notas?: string }) =>
      apiClient.patch<ApiResponse<Oportunidad>>(`/v1/oportunidades/${id}/estado`, data),
    estadisticas: (params?: Record<string, unknown>) =>
      apiClient.get<ApiResponse<{ total: number; por_estado: Record<string, number>; monto_total: number; monto_ganado: number; vencidas: number }>>(
        '/v1/oportunidades/estadisticas/general',
        { params },
      ),
  },

  // Documentos
  documentos: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<PaginatedResponse<Documento>>('/v1/documentos', { params }),
    obtener: (id: number) => apiClient.get<ApiResponse<Documento>>(`/v1/documentos/${id}`),
    subir: (formData: FormData) =>
      apiClient.post<ApiResponse<Documento>>('/v1/documentos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    actualizar: (id: number, formData: FormData) =>
      apiClient.post<ApiResponse<Documento>>(`/v1/documentos/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    eliminar: (id: number) => apiClient.delete<ApiResponse<unknown>>(`/v1/documentos/${id}`),
    descargar: (id: number) => apiClient.get(`/v1/documentos/${id}/descargar`, { responseType: 'blob' }),
  },

  // Pagos
  pagos: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<PaginatedResponse<Pago>>('/v1/pagos', { params }),
    obtener: (id: number) => apiClient.get<ApiResponse<Pago>>(`/v1/pagos/${id}`),
    crear: (data: Partial<Pago>) => apiClient.post<ApiResponse<Pago>>('/v1/pagos', data),
    actualizar: (id: number, data: Partial<Pago>) =>
      apiClient.put<ApiResponse<Pago>>(`/v1/pagos/${id}`, data),
    eliminar: (id: number) => apiClient.delete<ApiResponse<unknown>>(`/v1/pagos/${id}`),
    descargarComprobante: (id: number) =>
      apiClient.get(`/v1/pagos/${id}/comprobante`, { responseType: 'blob' }),
    estadisticas: (params?: Record<string, unknown>) =>
      apiClient.get<ApiResponse<{ total_pagos: number; monto_total: number; por_medio_pago: Record<string, { cantidad: number; total: number }> }>>(
        '/v1/pagos/estadisticas/general',
        { params },
      ),
  },

  // Entidades
  entidades: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<Entidad[]>('/v1/entidades', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<Entidad>>(`/v1/entidades/${id}`),
    crear: (data: EntidadFormData) =>
      apiClient.post<ApiResponse<Entidad>>('/v1/entidades', data),
    actualizar: (id: number, data: Partial<EntidadFormData>) =>
      apiClient.put<ApiResponse<Entidad>>(`/v1/entidades/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/entidades/${id}`),
  },

  // Clientes
  clientes: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<Entidad[]>('/v1/entidades', { params: { ...params, es_cliente: true } }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<Entidad>>(`/v1/entidades/${id}`),
    crear: (data: EntidadFormData) =>
      apiClient.post<ApiResponse<Entidad>>('/v1/entidades', { ...data, es_cliente: true }),
    actualizar: (id: number, data: Partial<EntidadFormData>) =>
      apiClient.put<ApiResponse<Entidad>>(`/v1/entidades/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/entidades/${id}`),
  },

  // Proveedores
  proveedores: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<Entidad[]>('/v1/entidades', { params: { ...params, es_proveedor: true } }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<Entidad>>(`/v1/entidades/${id}`),
    crear: (data: EntidadFormData) =>
      apiClient.post<ApiResponse<Entidad>>('/v1/entidades', { ...data, es_proveedor: true }),
    actualizar: (id: number, data: Partial<EntidadFormData>) =>
      apiClient.put<ApiResponse<Entidad>>(`/v1/entidades/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/entidades/${id}`),
  },

  // Vendedores
  vendedores: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/vendedores', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/vendedores/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>('/v1/vendedores', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/vendedores/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/vendedores/${id}`),
  },

  // Personal
  personal: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/personal', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/personal/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>('/v1/personal', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/personal/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/personal/${id}`),
  },

  // Cuentas Bancarias
  cuentasBancarias: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/cuentas-bancarias', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/cuentas-bancarias/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>('/v1/cuentas-bancarias', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/cuentas-bancarias/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/cuentas-bancarias/${id}`),
  },

  // Bancos
  bancos: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/bancos', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/bancos/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>('/v1/bancos', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/bancos/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/bancos/${id}`),
    subirImagen: (id: number, formData: FormData) =>
      apiClient.post<ApiResponse<unknown>>(`/v1/bancos/${id}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
  },

  // Categorías
  categorias: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/categorias', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/categorias/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>('/v1/categorias', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/categorias/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/categorias/${id}`),
  },

  // Marcas
  marcas: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/marcas', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/marcas/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>('/v1/marcas', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/marcas/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/marcas/${id}`),
  },

  // Atributos
  atributos: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/atributos', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/atributos/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>('/v1/atributos', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/atributos/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/atributos/${id}`),
  },

  // Unidades de Medida
  unidadesMedida: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/unidades-medida', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/unidades-medida/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>('/v1/unidades-medida', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/unidades-medida/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/unidades-medida/${id}`),
  },

  // Transacciones
  transacciones: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/transacciones', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/transacciones/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>('/v1/transacciones', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/transacciones/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/transacciones/${id}`),
  },

  // Vehículos
  vehiculos: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/vehiculos', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/vehiculos/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>('/v1/vehiculos', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/vehiculos/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/vehiculos/${id}`),
  },

  // Conductores
  conductores: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/conductores', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/conductores/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>('/v1/conductores', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/conductores/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/conductores/${id}`),
  },

  compras: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/compras', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/compras/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<unknown>>('/v1/compras', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/compras/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/compras/${id}`),
  },

  documentosDigitalizados: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<unknown[]>('/v1/documentos-digitalizados', { params }),
    subir: (formData: FormData) =>
      apiClient.post<ApiResponse<unknown>>('/v1/documentos-digitalizados/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<unknown>>(`/v1/documentos-digitalizados/${id}`),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<unknown>>(`/v1/documentos-digitalizados/${id}`, data),
    validar: (id: number) =>
      apiClient.post<ApiResponse<unknown>>(`/v1/documentos-digitalizados/${id}/validar`),
    convertirACompra: (id: number) =>
      apiClient.post<ApiResponse<unknown>>(`/v1/documentos-digitalizados/${id}/convertir-compra`),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/documentos-digitalizados/${id}`),
  },

  // Series
  series: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<ApiResponse<Serie[]>>('/v1/series', { params }),
    crear: (data: Partial<SerieFormData>) =>
      apiClient.post<ApiResponse<Serie>>('/v1/series', data),
    actualizar: (id: number, data: Partial<SerieFormData>) =>
      apiClient.put<ApiResponse<Serie>>(`/v1/series/${id}`, data),
    eliminar: (id: number) => apiClient.delete<ApiResponse<unknown>>(`/v1/series/${id}`),
  },

  // Productos
  productos: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<Producto[]>('/v1/productos', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<Producto>>(`/v1/productos/${id}`),
    crear: (data: ProductoFormData) =>
      apiClient.post<ApiResponse<Producto>>('/v1/productos', data),
    actualizar: (id: number, data: Partial<ProductoFormData>) =>
      apiClient.put<ApiResponse<Producto>>(`/v1/productos/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/productos/${id}`),
    restaurar: (id: number) =>
      apiClient.patch<ApiResponse<Producto>>(`/v1/productos/${id}/restaurar`),
    toggleDestacado: (id: number) =>
      apiClient.patch<ApiResponse<Producto>>(`/v1/productos/${id}/toggle-destacado`),
    destacados: (params?: Record<string, unknown>) =>
      apiClient.get<Producto[]>('/v1/productos/destacados', { params }),
    importar: (formData: FormData) =>
      apiClient.post<ApiResponse<unknown>>('/v1/productos/importar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
  },

  // Guías
  guiasRemision: {
    correlativo: (params: { empresa_id?: number; serie: string }) =>
      apiClient.get<{ serie: string; numero: number; correlativo: string }>('/v1/guias-remision/correlativo', { params }),
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<PaginatedResponse<GuiaRemision>>('/v1/guias-remision', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<GuiaRemision>>(`/v1/guias-remision/${id}`),
    crear: (data: Record<string, unknown>) =>
      apiClient.post<ApiResponse<GuiaRemision>>('/v1/guias-remision', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put<ApiResponse<GuiaRemision>>(`/v1/guias-remision/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete<ApiResponse<unknown>>(`/v1/guias-remision/${id}`),
    verificar: (tipo: string, serie: string, numero: string) =>
      apiClient.get<ApiResponse<unknown>>(`/nubefact/guias/${tipo}/${serie}/${numero}`),
    sincronizarRango: (data: { tipo: number; serie: string; numero_inicio: number; numero_fin: number; empresa_id?: number }) =>
      apiClient.post<{ success: boolean; resultados: { total: number; exitosos: number; creados: number; actualizados: number; no_encontrados: number; errores: number } }>('/nubefact/guias/sincronizar-rango', data),
    autoDescubrir: (data?: { empresa_id?: number }) =>
      apiClient.post<{ success: boolean; resultados: { total: number; exitosos: number; creados: number; actualizados: number; no_encontrados: number; errores: number } }>('/nubefact/guias/auto-descubrir', data ?? {}),
    emitir: (guia_id: number) =>
      apiClient.post<{ success: boolean; message: string; data: { guia_id: number; enlace: string | null; aceptada_por_sunat: boolean; pdf_url: string | null; xml_url: string | null } }>('/nubefact/guias', { guia_id }),
  },

  // Productos Compuestos (Ofertas)
  productosCompuestos: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get('/v1/productos-compuestos', { params }),
    crear: (data: Record<string, unknown>) =>
      apiClient.post('/v1/productos-compuestos', data),
    actualizar: (id: number, data: Record<string, unknown>) =>
      apiClient.put(`/v1/productos-compuestos/${id}`, data),
    eliminar: (id: number) =>
      apiClient.delete(`/v1/productos-compuestos/${id}`),
  },

  // Movimientos de Inventario
  movimientosInventario: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get('/v1/movimientos-inventario', { params }),
    registrar: (data: Record<string, unknown>) =>
      apiClient.post('/v1/movimientos-inventario', data),
    eliminar: (id: number) =>
      apiClient.delete(`/v1/movimientos-inventario/${id}`),
  },

  // Comprobantes
  comprobantes: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<PaginatedResponse<ComprobanteEmitido>>('/facturacion/comprobantes', { params }),
    obtener: (id: number) =>
      apiClient.get<ApiResponse<ComprobanteEmitido>>(`/facturacion/comprobantes/${id}`),
    exportar: (params?: Record<string, unknown>) =>
      window.open(`${apiBaseUrl}/facturacion/comprobantes/export?${new URLSearchParams(params as Record<string, string>).toString()}`, '_blank'),
    enviarEmail: (id: number, email: string) =>
      apiClient.post<ApiResponse<{ mensaje: string }>>(`/facturacion/enviar-email/${id}`, { email }),
  },

  // Notas Venta
  notasVenta: {
    listar: (params?: Record<string, unknown>) =>
      apiClient.get<PaginatedResponse<NotaVenta>>('/v1/notas-venta', { params }),
    resumenTotales: (params?: Record<string, unknown>) =>
      apiClient.get<ApiResponse<{ total_busqueda: number; total_documentos: number; total_por_cobrar: number }>>('/v1/notas-venta/totales', { params }),
    generarCpeMasivo: (ids: number[]) =>
      apiClient.post('/v1/notas-venta/generar-cpe-masivo', { ids }),
  },

  // Autenticación
  auth: {
    login: (username: string, password: string) =>
      apiClient.post<{ success: boolean; token: string; user: { id: number; name: string; username: string; email: string; rol: string } }>(
        '/auth/login',
        { username, password },
      ),
    register: (name: string, username: string, password: string, passwordConfirmation: string) =>
      apiClient.post<{ success: boolean; token: string; user: { id: number; name: string; username: string; email: string; rol: string } }>(
        '/auth/register',
        { name, username, password, password_confirmation: passwordConfirmation },
      ),
    logout: () => apiClient.post<{ success: boolean }>('/auth/logout'),
    me: () =>
      apiClient.get<{ success: boolean; user: { id: number; name: string; username: string; email: string; rol: string } }>('/auth/me'),
  },

  // NubeFact Sync
  nubefactSync: {
    sincronizarComprobante: (data: { tipo_doc: string; serie: string; numero: number; empresa_id?: number }) =>
      apiClient.post<ApiResponse<{ success: boolean; mensaje: string }>>('/nubefact-sync/comprobante', data),
    sincronizarPendientes: (data?: { empresa_id?: number; tipo_doc?: string; fecha_desde?: string; fecha_hasta?: string; limite?: number }) =>
      apiClient.post<ApiResponse<{ success: boolean; exitosos: number; fallidos: number; mensaje: string }>>('/nubefact-sync/pendientes', data),
    verificarEstado: () =>
      apiClient.get<ApiResponse<{ conectado: boolean; modo: string; empresa: string }>>('/nubefact-sync/estado'),
  },
};

export default api;