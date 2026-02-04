-- Migración: Agregar campos adicionales a documentos_digitalizados
-- Fecha: 2026-02-03
-- Referencia: CAMPOS_EXTRAIBLES_NUBEFACT.md

-- Agregar columnas para información adicional del documento
ALTER TABLE documentos_digitalizados
ADD COLUMN IF NOT EXISTS sunat_transaction INTEGER,
ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE,
ADD COLUMN IF NOT EXISTS tipo_cambio DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS porcentaje_igv DECIMAL(5,2) DEFAULT 18.00;

-- Agregar columnas para totales y descuentos
ALTER TABLE documentos_digitalizados
ADD COLUMN IF NOT EXISTS descuento_global DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS total_descuento DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS total_gravada DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS total_inafecta DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS total_exonerada DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS total_gratuita DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS total_otros_cargos DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS total_isc DECIMAL(12,2);

-- Agregar columnas para percepciones y retenciones
ALTER TABLE documentos_digitalizados
ADD COLUMN IF NOT EXISTS percepcion_tipo INTEGER,
ADD COLUMN IF NOT EXISTS percepcion_base_imponible DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS total_percepcion DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS total_incluido_percepcion DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS retencion_tipo INTEGER,
ADD COLUMN IF NOT EXISTS retencion_base_imponible DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS total_retencion DECIMAL(12,2);

-- Agregar columnas para detracciones
ALTER TABLE documentos_digitalizados
ADD COLUMN IF NOT EXISTS detraccion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS detraccion_tipo INTEGER,
ADD COLUMN IF NOT EXISTS detraccion_total DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS detraccion_porcentaje DECIMAL(5,2);

-- Agregar columnas para información comercial
ALTER TABLE documentos_digitalizados
ADD COLUMN IF NOT EXISTS condiciones_pago VARCHAR(250),
ADD COLUMN IF NOT EXISTS medio_pago VARCHAR(250),
ADD COLUMN IF NOT EXISTS orden_compra_servicio VARCHAR(50),
ADD COLUMN IF NOT EXISTS observaciones TEXT,
ADD COLUMN IF NOT EXISTS placa_vehiculo VARCHAR(10),
ADD COLUMN IF NOT EXISTS cliente_email VARCHAR(250);

-- Agregar columnas para notas de crédito/débito
ALTER TABLE documentos_digitalizados
ADD COLUMN IF NOT EXISTS documento_modifica_tipo INTEGER,
ADD COLUMN IF NOT EXISTS documento_modifica_serie VARCHAR(10),
ADD COLUMN IF NOT EXISTS documento_modifica_numero VARCHAR(20),
ADD COLUMN IF NOT EXISTS tipo_nota_credito INTEGER,
ADD COLUMN IF NOT EXISTS tipo_nota_debito INTEGER;

-- Agregar columnas para venta al crédito y guías (JSON)
ALTER TABLE documentos_digitalizados
ADD COLUMN IF NOT EXISTS venta_credito_cuotas JSONB,
ADD COLUMN IF NOT EXISTS guias_relacionadas JSONB;

-- Agregar comentarios para documentación
COMMENT ON COLUMN documentos_digitalizados.sunat_transaction IS '1=Venta interna, 2=Exportación, 4=Anticipos, 30=Detracción, 34=Percepción';
COMMENT ON COLUMN documentos_digitalizados.percepcion_tipo IS '1=Venta 2%, 2=Combustible 1%, 3=Especial 0.5%';
COMMENT ON COLUMN documentos_digitalizados.retencion_tipo IS '1=Tasa 3%, 2=Tasa 6%';
COMMENT ON COLUMN documentos_digitalizados.detraccion_tipo IS 'Código de detracción SUNAT (1-44)';
COMMENT ON COLUMN documentos_digitalizados.documento_modifica_tipo IS '1=Factura, 2=Boleta (para notas de crédito/débito)';
COMMENT ON COLUMN documentos_digitalizados.tipo_nota_credito IS '1=Anulación, 7=Devolución, etc.';
COMMENT ON COLUMN documentos_digitalizados.tipo_nota_debito IS '1=Intereses, 2=Aumento, etc.';
COMMENT ON COLUMN documentos_digitalizados.venta_credito_cuotas IS 'Array JSON con cuotas [{cuota, fecha_pago, importe}]';
COMMENT ON COLUMN documentos_digitalizados.guias_relacionadas IS 'Array JSON con guías [{guia_tipo, guia_serie_numero}]';

-- Crear índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_doc_dig_fecha_vencimiento ON documentos_digitalizados(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_doc_dig_orden_compra ON documentos_digitalizados(orden_compra_servicio);
CREATE INDEX IF NOT EXISTS idx_doc_dig_detraccion ON documentos_digitalizados(detraccion) WHERE detraccion = true;
CREATE INDEX IF NOT EXISTS idx_doc_dig_doc_modifica ON documentos_digitalizados(documento_modifica_tipo, documento_modifica_serie, documento_modifica_numero);
