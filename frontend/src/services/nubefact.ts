import api from './api';

export interface ComprobanteItem {
  unidad_de_medida: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  valor_unitario: number;
  precio_unitario: number;
  descuento?: number;
  subtotal: number;
  tipo_de_igv: string;
  igv: number;
  total: number;
  anticipo_regularizacion?: boolean;
  anticipo_documento_serie?: string;
  anticipo_documento_numero?: string;
}

export interface EmitirComprobanteRequest {
  empresa_id: number;
  operacion: 'generar_comprobante';
  tipo_de_comprobante: number; // 1=Factura, 2=Boleta, 3=NC, 4=ND
  serie: string;
  numero: number;
  sunat_transaction: number; // 1=Venta interna
  cliente_tipo_de_documento: string; // 1=DNI, 6=RUC
  cliente_numero_de_documento: string;
  cliente_denominacion: string;
  cliente_direccion?: string;
  cliente_email?: string;
  cliente_email_1?: string;
  cliente_email_2?: string;
  fecha_de_emision: string; // YYYY-MM-DD
  moneda: string; // 1=PEN, 2=USD
  tipo_de_cambio?: number;
  porcentaje_de_igv: number; // 18.00
  descuento_global?: number;
  total_descuento?: number;
  total_anticipo?: number;
  total_gravada: number;
  total_inafecta?: number;
  total_exonerada?: number;
  total_igv: number;
  total_gratuita?: number;
  total_otros_cargos?: number;
  total: number;
  percepcion_tipo?: string;
  percepcion_base_imponible?: number;
  percepcion_total?: number;
  retencion_tipo?: string;
  retencion_base_imponible?: number;
  retencion_total?: number;
  // Detracción completa según API NubeFact
  tiene_detraccion?: boolean;
  detraccion_tipo?: string;        // Catálogo 54 SUNAT (ej: "037")
  detraccion_porcentaje?: number;  // Ej: 12.00
  detraccion_monto?: number;       // Calculado: total * porcentaje / 100
  medio_pago_detraccion?: string;  // Catálogo 59 SUNAT (ej: "001")
  observaciones?: string;
  documento_que_se_modifica_tipo?: string;
  documento_que_se_modifica_serie?: string;
  documento_que_se_modifica_numero?: string;
  tipo_de_nota_de_credito?: string;
  tipo_de_nota_de_debito?: string;
  enviar_automaticamente_a_la_sunat?: boolean;
  enviar_automaticamente_al_cliente?: boolean;
  codigo_unico?: string;
  condiciones_de_pago?: string;
  medio_de_pago?: string;
  placa_vehiculo?: string;
  orden_compra_servicio?: string;
  tabla_personalizada_codigo?: string;
  formato_de_pdf?: string;
  items: ComprobanteItem[];
}

export interface EmitirComprobanteResponse {
  success: boolean;
  message: string;
  data?: {
    comprobante_id: number;
    serie: string;
    numero: number;
    enlace?: string;
    aceptada_por_sunat: boolean;
    pdf_url?: string;
    xml_url?: string;
    cdr_url?: string;
    cadena_qr?: string;
    sunat_code?: string;
    sunat_description?: string;
  };
}

export interface ComprobanteResponse {
  errors?: string | boolean;
  serie?: string;
  numero?: number;
  sunat_status?: string;
  enlace?: string;
  enlace_del_pdf?: string;
  aceptada_por_sunat?: boolean;
  sunat_description?: string;
  sunat_note?: string;
  sunat_responsecode?: string;
  sunat_soap_error?: string;
  pdf_zip_base64?: string;
  xml_zip_base64?: string;
  cdr_zip_base64?: string;
  hash?: string;
  qr?: string;
  pdf_url?: string;
  xml_url?: string;
  cdr_url?: string;
}

export interface ConsultarComprobanteResponse {
  errors?: string | boolean;
  enlace?: string;
  aceptada_por_sunat?: boolean;
  sunat_description?: string;
  sunat_note?: string;
  sunat_responsecode?: string;
  sunat_soap_error?: string;
  pdf_zip_base64?: string;
  xml_zip_base64?: string;
  cdr_zip_base64?: string;
  hash?: string;
  qr?: string;
  pdf_url?: string;
  xml_url?: string;
  cdr_url?: string;
  cliente_tipo_de_documento?: number;
  cliente_numero_de_documento?: string;
  cliente_denominacion?: string;
  cliente_direccion?: string;
  cliente_email?: string;
  items?: Array<{
    codigo?: string;
    descripcion?: string;
    unidad_de_medida?: string;
    cantidad?: number;
    valor_unitario?: number;
    tipo_de_igv?: number;
    codigo_producto_sunat?: string;
  }>;
}

export interface AnularComprobanteRequest {
  empresa_id: number;
  tipo_de_comprobante: number;
  serie: string;
  numero: number;
  motivo: string;
  fecha_de_baja: string; // YYYY-MM-DD
}

// Emitir comprobante (Factura, Boleta, NC, ND)
export const emitirComprobante = async (data: EmitirComprobanteRequest): Promise<EmitirComprobanteResponse> => {
  const response = await api.post('/nubefact/comprobantes', data);
  return response.data;
};

// Consultar comprobante
export const consultarComprobante = async (
  tipo: number,
  serie: string,
  numero: number
): Promise<ConsultarComprobanteResponse> => {
  const response = await api.get(`/nubefact/comprobantes/${tipo}/${serie}/${numero}`);
  return response.data;
};

export interface AnularComprobanteResponse {
  success: boolean;
  message?: string;
  errors?: boolean;
  sunat_description?: string;
}

// Anular comprobante
export const anularComprobante = async (
  tipo: number,
  serie: string,
  numero: number,
  data: AnularComprobanteRequest
): Promise<AnularComprobanteResponse> => {
  const response = await api.delete(`/nubefact/comprobantes/${tipo}/${serie}/${numero}`, {
    data,
  });
  return response.data;
};

// Obtener lista de comprobantes
export const listarComprobantes = async (filtros?: {
  empresa_id?: number;
  tipo_doc?: string;
  estado_sunat?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
}) => {
  const response = await api.get('/facturacion/comprobantes', { params: filtros });
  return response.data;
};

// Descargar PDF
export const descargarPDF = async (comprobanteId: number) => {
  const response = await api.get(`/facturacion/descargar/pdf/${comprobanteId}`, {
    responseType: 'blob',
  });
  return response.data;
};

// Descargar XML
export const descargarXML = async (comprobanteId: number) => {
  const response = await api.get(`/facturacion/descargar/xml/${comprobanteId}`, {
    responseType: 'blob',
  });
  return response.data;
};

// Descargar CDR
export const descargarCDR = async (comprobanteId: number) => {
  const response = await api.get(`/facturacion/descargar/cdr/${comprobanteId}`, {
    responseType: 'blob',
  });
  return response.data;
};

// Tipos de mapeo
export const TIPOS_COMPROBANTE = {
  FACTURA: 1,
  BOLETA: 2,
  NOTA_CREDITO: 3,
  NOTA_DEBITO: 4,
} as const;

export const TIPOS_DOCUMENTO = {
  DNI: '1',
  RUC: '6',
  CARNET_EXTRANJERIA: '4',
  PASAPORTE: '7',
  SIN_DOCUMENTO: '-',
} as const;

export const TIPOS_IGV = {
  GRAVADO_OPERACION_ONEROSA: '1',
  GRAVADO_RETIRO_PREMIO: '2',
  GRAVADO_RETIRO_DONACION: '3',
  GRAVADO_RETIRO: '4',
  GRAVADO_RETIRO_PUBLICIDAD: '5',
  GRAVADO_BONIFICACIONES: '6',
  GRAVADO_RETIRO_TRABAJADORES: '7',
  EXONERADO: '8',
  INAFECTO: '9',
  INAFECTO_RETIRO_BONIFICACION: '10',
  INAFECTO_RETIRO: '11',
  INAFECTO_RETIRO_MUESTRAS: '12',
  INAFECTO_CONVENIO: '13',
  INAFECTO_RETIRO_PREMIO: '14',
  INAFECTO_RETIRO_PUBLICIDAD: '15',
  EXPORTACION: '16',
  EXONERADO_TRANSFERENCIA_GRATUITA: '17',
  INAFECTO_TRANSFERENCIA_GRATUITA: '20',
} as const;

// Helpers para categorizar tipo de IGV según NubeFact API
export const esGravado = (tipo: string | number): boolean => Number(tipo) === 10;
export const esExonerado = (tipo: string | number): boolean => Number(tipo) === 8;
export const esInafecto = (tipo: string | number): boolean => [9, 16].includes(Number(tipo));
export const esGratuita = (tipo: string | number): boolean =>
  [2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 17, 20].includes(Number(tipo));

export const MONEDAS = {
  PEN: '1',
  USD: '2',
  EUR: '3',
  GBP: '4',
} as const;

export const UNIDADES_MEDIDA = {
  NIU: 'NIU', // Unidad (bienes)
  ZZ: 'ZZ',   // Unidad (servicios)
  KGM: 'KGM', // Kilogramo
  LTR: 'LTR', // Litro
  MTR: 'MTR', // Metro
  MTK: 'MTK', // Metro cuadrado
  MTQ: 'MTQ', // Metro cúbico
  SET: 'SET', // Juego
  DZN: 'DZN', // Docena
  GRM: 'GRM', // Gramo
  DAY: 'DAY', // Día
  HUR: 'HUR', // Hora
} as const;

// Arrays para selects
export const TIPOS_DOCUMENTO_SELECT = [
  { value: '1', label: '1 - DNI' },
  { value: '6', label: '6 - RUC' },
  { value: '4', label: '4 - Carnet de Extranjería' },
  { value: '7', label: '7 - Pasaporte' },
  { value: '-', label: 'Sin Documento' },
];

export const TIPOS_IGV_SELECT = [
  { value: '1', label: '1 - Gravado - Operación Onerosa' },
  { value: '8', label: '8 - Exonerado - Operación Onerosa' },
  { value: '9', label: '9 - Inafecto - Operación Onerosa' },
  { value: '16', label: '16 - Exportación' },
  { value: '2', label: '2 - Gravado – Retiro por premio (Gratuita)' },
  { value: '4', label: '4 - Gravado – Retiro (Gratuita)' },
  { value: '6', label: '6 - Gravado – Bonificaciones (Gratuita)' },
  { value: '17', label: '17 - Exonerado - Transferencia Gratuita' },
  { value: '20', label: '20 - Inafecto - Transferencia Gratuita' },
];

export const MONEDAS_SELECT = [
  { value: '1', label: 'S/ PEN - Soles' },
  { value: '2', label: 'US$ USD - Dólares Americanos' },
  { value: '3', label: '€ EUR - Euros' },
  { value: '4', label: '£ GBP - Libra Esterlina' },
];

export const UNIDADES_MEDIDA_SELECT = [
  { value: 'NIU', label: 'NIU - Unidad (bienes)' },
  { value: 'ZZ', label: 'ZZ - Unidad (servicios)' },
  { value: 'KGM', label: 'KGM - Kilogramo' },
  { value: 'LTR', label: 'LTR - Litro' },
  { value: 'MTR', label: 'MTR - Metro' },
  { value: 'MTK', label: 'MTK - Metro cuadrado' },
  { value: 'MTQ', label: 'MTQ - Metro cúbico' },
  { value: 'SET', label: 'SET - Juego' },
  { value: 'DZN', label: 'DZN - Docena' },
  { value: 'GRM', label: 'GRM - Gramo' },
  { value: 'DAY', label: 'DAY - Día' },
  { value: 'HUR', label: 'HUR - Hora' },
];

// Tipos de operación (sunat_transaction) según manual NubeFact
export const TIPOS_OPERACION_SELECT = [
  { value: '1', label: '01 - Venta interna' },
  { value: '2', label: '02 - Exportación' },
  { value: '4', label: '04 - Venta interna – anticipos' },
  { value: '29', label: '29 - Ventas no domiciliados que no califican como exportación' },
  { value: '30', label: '30 - Operación sujeta a detracción' },
  { value: '33', label: '33 - Detracción - servicios de transporte carga' },
  { value: '32', label: '32 - Detracción - servicios de transporte de pasajeros' },
  { value: '31', label: '31 - Detracción - recursos hidrobiológicos' },
  { value: '34', label: '34 - Operación sujeta a percepción' },
  { value: '35', label: '35 - Venta nacional a turistas - Tax Free' },
];

// Porcentajes de IGV soportados en cabecera
export const IGV_PORCENTAJES_SELECT = [
  { value: 18, label: '18%' },
  { value: 10, label: '10% (Ley 31556)' },
  { value: 4, label: '4% (IVAP)' },
];

// Catálogo 54 SUNAT - Tipos de detracción más comunes
export const TIPOS_DETRACCION_SELECT = [
  { value: '001', label: '001 - Azúcar', porcentaje: 10 },
  { value: '003', label: '003 - Alcohol etílico', porcentaje: 10 },
  { value: '004', label: '004 - Recursos hidrobiológicos', porcentaje: 4 },
  { value: '012', label: '012 - Intermediación laboral y tercerización', porcentaje: 12 },
  { value: '019', label: '019 - Arrendamiento de bienes', porcentaje: 12 },
  { value: '027', label: '027 - Transporte de carga', porcentaje: 4 },
  { value: '030', label: '030 - Contratos de construcción', porcentaje: 4 },
  { value: '037', label: '037 - Demás servicios gravados con el IGV', porcentaje: 12 },
] as const;

// Catálogo 59 SUNAT - Medios de pago detracción
export const MEDIOS_PAGO_DETRACCION_SELECT = [
  { value: '001', label: '001 - Depósito en cuenta' },
  { value: '003', label: '003 - Transferencia de fondos' },
  { value: '999', label: '999 - Otros' },
] as const;

// Helper para obtener porcentaje por código
export const obtenerPorcentajeDetraccion = (codigo: string): number => {
  const tipo = TIPOS_DETRACCION_SELECT.find(t => t.value === codigo);
  return tipo?.porcentaje ?? 0;
};
