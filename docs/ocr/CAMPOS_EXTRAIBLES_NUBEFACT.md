# Campos Extraíbles de Comprobantes - Integración NubeFact API

**Fecha**: 3 de febrero de 2026  
**Referencia**: Manual de Integración NubeFact API JSON v2.9  
**Estado**: 📋 Planificación de Mejoras OCR

---

## 📊 Comparación: Campos Actuales vs. Campos NubeFact

### ✅ Campos Actualmente Extraídos (OCR Básico)

| Campo | Ejemplo | Estado |
|-------|---------|--------|
| `tipo_comprobante` | FACTURA ELECTRONICA | ✅ Extraído |
| `serie` | F001 | ✅ Extraído |
| `numero` | 00123456 | ✅ Extraído |
| `comprobante_completo` | F001-00123456 | ✅ Generado |
| `fecha_emision` | 2026-02-03 | ✅ Extraído |
| `entidad_tipo_doc` | RUC | ✅ Asumido |
| `entidad_num_doc` | 20600695771 | ✅ Extraído |
| `entidad_razon_social` | NUBEFACT SA | ✅ Extraído |
| `entidad_direccion` | CALLE LIBERTAD 116 | ✅ Extraído |
| `moneda` | PEN / USD | ✅ Extraído |
| `subtotal` | 600.00 | ✅ Extraído |
| `igv` | 108.00 | ✅ Extraído |
| `total` | 708.00 | ✅ Extraído |
| `items_extraidos` | Array de items | ✅ Extraído (básico) |

---

## 🚀 Campos Adicionales que Deberíamos Extraer

### **1. Información del Documento**

| Campo NubeFact | Tipo | Ejemplo | Prioridad | Descripción |
|----------------|------|---------|-----------|-------------|
| `sunat_transaction` | Integer | 1, 2, 4, 30 | 🔴 ALTA | Tipo de operación SUNAT (Venta interna=1, Exportación=2, Detracción=30, etc.) |
| `fecha_de_vencimiento` | Date | 2026-03-03 | 🟡 MEDIA | Fecha de vencimiento del comprobante |
| `tipo_de_cambio` | Numeric | 3.750 | 🟡 MEDIA | Tipo de cambio del día (para USD) |
| `porcentaje_de_igv` | Numeric | 18.00 | 🟢 BAJA | Porcentaje de IGV aplicado |

### **2. Totales y Descuentos**

| Campo NubeFact | Tipo | Ejemplo | Prioridad | Descripción |
|----------------|------|---------|-----------|-------------|
| `descuento_global` | Numeric | 50.00 | 🟡 MEDIA | Descuento global del comprobante |
| `total_descuento` | Numeric | 100.00 | 🟡 MEDIA | Total de descuentos aplicados |
| `total_gravada` | Numeric | 600.00 | 🔴 ALTA | Base imponible gravada (subtotal afecto) |
| `total_inafecta` | Numeric | 200.00 | 🟡 MEDIA | Total de operaciones inafectas |
| `total_exonerada` | Numeric | 150.00 | 🟡 MEDIA | Total de operaciones exoneradas |
| `total_gratuita` | Numeric | 50.00 | 🟢 BAJA | Total de operaciones gratuitas |
| `total_otros_cargos` | Numeric | 25.00 | 🟢 BAJA | Otros cargos adicionales |
| `total_anticipos` | Numeric | 300.00 | 🟢 BAJA | Total de anticipos aplicados |
| `total_isc` | Numeric | 45.00 | 🟢 BAJA | Total de ISC (Impuesto Selectivo al Consumo) |

### **3. Percepciones y Retenciones**

| Campo NubeFact | Tipo | Ejemplo | Prioridad | Descripción |
|----------------|------|---------|-----------|-------------|
| `percepcion_tipo` | Integer | 1, 2, 3 | 🟡 MEDIA | Tipo de percepción (1=Venta 2%, 2=Combustible 1%, 3=Especial 0.5%) |
| `percepcion_base_imponible` | Numeric | 708.00 | 🟡 MEDIA | Base imponible para percepción |
| `total_percepcion` | Numeric | 14.16 | 🟡 MEDIA | Monto de percepción |
| `total_incluido_percepcion` | Numeric | 722.16 | 🟡 MEDIA | Total incluyendo percepción |
| `retencion_tipo` | Integer | 1, 2 | 🟡 MEDIA | Tipo de retención (1=3%, 2=6%) |
| `retencion_base_imponible` | Numeric | 708.00 | 🟡 MEDIA | Base imponible para retención |
| `total_retencion` | Numeric | 21.24 | 🟡 MEDIA | Monto de retención |

### **4. Detracciones**

| Campo NubeFact | Tipo | Ejemplo | Prioridad | Descripción |
|----------------|------|---------|-----------|-------------|
| `detraccion` | Boolean | true/false | 🟡 MEDIA | Operación sujeta a detracción |
| `detraccion_tipo` | Integer | 1-44 | 🟡 MEDIA | Código de detracción SUNAT (ej: 25=Transporte carga) |
| `detraccion_total` | Numeric | 84.96 | 🟡 MEDIA | Monto de detracción |
| `detraccion_porcentaje` | Numeric | 12.00 | 🟡 MEDIA | Porcentaje de detracción aplicado |
| `medio_de_pago_detraccion` | Integer | 1-22 | 🟢 BAJA | Medio de pago para detracción |

### **5. Información Adicional del Cliente**

| Campo NubeFact | Tipo | Ejemplo | Prioridad | Descripción |
|----------------|------|---------|-----------|-------------|
| `cliente_email` | String | cliente@empresa.com | 🟡 MEDIA | Email principal del cliente |
| `cliente_email_1` | String | contador@empresa.com | 🟢 BAJA | Email adicional 1 |
| `cliente_email_2` | String | gerencia@empresa.com | 🟢 BAJA | Email adicional 2 |

### **6. Información Comercial**

| Campo NubeFact | Tipo | Ejemplo | Prioridad | Descripción |
|----------------|------|---------|-----------|-------------|
| `condiciones_de_pago` | String | CRÉDITO 30 DÍAS | 🟡 MEDIA | Condiciones de pago acordadas |
| `medio_de_pago` | String | TARJETA VISA OP: 232231 | 🟢 BAJA | Medio de pago utilizado |
| `orden_compra_servicio` | String | OC-2026-001 | 🟡 MEDIA | Número de orden de compra/servicio |
| `observaciones` | Text | Incluye garantía 1 año | 🟡 MEDIA | Observaciones adicionales |
| `placa_vehiculo` | String | ALF-321 | 🟢 BAJA | Placa del vehículo (transporte) |

### **7. Notas de Crédito/Débito**

| Campo NubeFact | Tipo | Ejemplo | Prioridad | Descripción |
|----------------|------|---------|-----------|-------------|
| `documento_que_se_modifica_tipo` | Integer | 1, 2 | 🔴 ALTA | Tipo de doc modificado (1=Factura, 2=Boleta) |
| `documento_que_se_modifica_serie` | String | F001 | 🔴 ALTA | Serie del documento modificado |
| `documento_que_se_modifica_numero` | Integer | 123 | 🔴 ALTA | Número del documento modificado |
| `tipo_de_nota_de_credito` | Integer | 1-13 | 🔴 ALTA | Motivo (1=Anulación, 7=Devolución, etc.) |
| `tipo_de_nota_de_debito` | Integer | 1-5 | 🔴 ALTA | Motivo (1=Intereses mora, 2=Aumento valor, etc.) |

### **8. Venta al Crédito**

| Campo NubeFact | Tipo | Ejemplo | Prioridad | Descripción |
|----------------|------|---------|-----------|-------------|
| `venta_al_credito` | Array | Ver estructura | 🟡 MEDIA | Cuotas de pago programadas |
| `venta_al_credito[].cuota` | Integer | 1, 2, 3 | 🟡 MEDIA | Número de cuota |
| `venta_al_credito[].fecha_de_pago` | Date | 2026-03-03 | 🟡 MEDIA | Fecha de vencimiento de la cuota |
| `venta_al_credito[].importe` | Numeric | 236.00 | 🟡 MEDIA | Monto de la cuota |

### **9. Guías de Remisión Relacionadas**

| Campo NubeFact | Tipo | Ejemplo | Prioridad | Descripción |
|----------------|------|---------|-----------|-------------|
| `guias` | Array | Ver estructura | 🟡 MEDIA | Guías de remisión asociadas |
| `guias[].guia_tipo` | Integer | 1, 2 | 🟡 MEDIA | Tipo (1=Remitente, 2=Transportista) |
| `guias[].guia_serie_numero` | String | T001-123 | 🟡 MEDIA | Serie y número de la guía |

---

## 📦 Mejoras en Items Extraídos

### Campos Actuales (Básico)
```typescript
{
  codigo: "",
  descripcion: "PRODUCTO ABC",
  cantidad: 2.00,
  precio_unitario: 150.00,
  subtotal: 300.00
}
```

### Campos Adicionales Recomendados

| Campo NubeFact | Tipo | Ejemplo | Prioridad | Descripción |
|----------------|------|---------|-----------|-------------|
| `unidad_de_medida` | String | NIU, ZZ, KGM | 🔴 ALTA | Unidad de medida SUNAT |
| `codigo_producto_sunat` | String | 10000000 | 🟡 MEDIA | Código de producto SUNAT |
| `descuento` | Numeric | 10.00 | 🟡 MEDIA | Descuento aplicado al item |
| `tipo_de_igv` | Integer | 1-20 | 🔴 ALTA | Tipo de IGV (1=Gravado, 8=Exonerado, 9=Inafecto) |
| `igv` | Numeric | 27.00 | 🔴 ALTA | IGV del item |
| `total` | Numeric | 177.00 | 🔴 ALTA | Total del item con IGV |
| `valor_unitario` | Numeric | 125.42 | 🟡 MEDIA | Valor sin IGV |
| `precio_unitario` | Numeric | 148.00 | 🟡 MEDIA | Precio con IGV |
| `tipo_de_isc` | Integer | 1, 2, 3 | 🟢 BAJA | Tipo de ISC aplicado |
| `isc` | Numeric | 5.00 | 🟢 BAJA | Monto de ISC |
| `anticipo_regularizacion` | Boolean | true/false | 🟢 BAJA | Item es regularización de anticipo |
| `impuesto_bolsas` | Numeric | 0.10 | 🟢 BAJA | Impuesto a las bolsas plásticas |

---

## 🎯 Plan de Implementación Recomendado

### **Fase 1: Campos Críticos (ALTA Prioridad)** 🔴

**Documento:**
- ✅ Ya extraídos: tipo_comprobante, serie, numero, fecha_emision, RUC, razón social, totales básicos
- ➕ **Agregar**: 
  - `sunat_transaction` (tipo de operación)
  - `total_gravada` (base imponible)
  - `documento_que_se_modifica_*` (para notas crédito/débito)
  - `tipo_de_nota_de_credito` / `tipo_de_nota_de_debito`

**Items:**
- ➕ **Agregar**:
  - `unidad_de_medida` (NIU/ZZ)
  - `tipo_de_igv` (gravado/exonerado/inafecto)
  - `igv` (monto IGV por item)
  - `total` (total con IGV por item)

### **Fase 2: Campos Importantes (MEDIA Prioridad)** 🟡

**Documento:**
- `fecha_de_vencimiento`
- `tipo_de_cambio`
- `descuento_global` / `total_descuento`
- `total_inafecta` / `total_exonerada`
- `percepcion_*` / `retencion_*` (si aplica)
- `detraccion` / `detraccion_*` (si aplica)
- `condiciones_de_pago`
- `orden_compra_servicio`
- `observaciones`
- `cliente_email`
- `venta_al_credito[]` (cuotas)
- `guias[]` (guías relacionadas)

**Items:**
- `codigo_producto_sunat`
- `descuento`
- `valor_unitario` vs `precio_unitario`

### **Fase 3: Campos Opcionales (BAJA Prioridad)** 🟢

- `cliente_email_1`, `cliente_email_2`
- `total_gratuita`, `total_otros_cargos`, `total_anticipos`
- `medio_de_pago`, `placa_vehiculo`
- `total_isc`, ISC por item
- `anticipo_regularizacion`
- `impuesto_bolsas`
- Campos específicos de detracción (ubigeos, embarcaciones, etc.)

---

## 🔍 Patrones de Extracción OCR Recomendados

### Tipo de Operación (sunat_transaction)
```python
# Buscar palabras clave en el documento
if "EXPORTACIÓN" in texto: return 2
if "DETRACCIÓN" in texto: return 30
if "PERCEPCIÓN" in texto: return 34
# Default: Venta interna
return 1
```

### Tipo de IGV por Item
```python
# Buscar cerca del item
if "GRAVADO" or monto_igv > 0: return 1
if "EXONERADO": return 8
if "INAFECTO": return 9
if "GRATUITO": return 10
```

### Fecha de Vencimiento
```python
# Buscar después de fecha de emisión
match = re.search(r'VENCIMIENTO\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})')
```

### Orden de Compra
```python
match = re.search(r'O\s?/?\s?C\s*:?\s*([A-Z0-9-]+)', texto, re.IGNORECASE)
match = re.search(r'ORDEN\s+(?:DE\s+)?COMPRA\s*:?\s*([A-Z0-9-]+)', texto, re.IGNORECASE)
```

### Condiciones de Pago
```python
match = re.search(r'CONDICIONES?\s+(?:DE\s+)?PAGO\s*:?\s*(.+)', texto, re.IGNORECASE)
# Ejemplos: "CONTADO", "CRÉDITO 30 DÍAS", "CRÉDITO 15 DÍAS"
```

---

## 📋 Estructura de Base de Datos Actualizada

### Nuevas Columnas para `documentos_digitalizados`

```sql
-- Información adicional del documento
ALTER TABLE documentos_digitalizados
ADD COLUMN sunat_transaction INTEGER,
ADD COLUMN fecha_vencimiento DATE,
ADD COLUMN tipo_cambio DECIMAL(10,4),
ADD COLUMN porcentaje_igv DECIMAL(5,2) DEFAULT 18.00,

-- Totales y descuentos
ADD COLUMN descuento_global DECIMAL(12,2),
ADD COLUMN total_descuento DECIMAL(12,2),
ADD COLUMN total_gravada DECIMAL(12,2),
ADD COLUMN total_inafecta DECIMAL(12,2),
ADD COLUMN total_exonerada DECIMAL(12,2),
ADD COLUMN total_gratuita DECIMAL(12,2),
ADD COLUMN total_otros_cargos DECIMAL(12,2),
ADD COLUMN total_isc DECIMAL(12,2),

-- Percepciones y retenciones
ADD COLUMN percepcion_tipo INTEGER,
ADD COLUMN percepcion_base_imponible DECIMAL(12,2),
ADD COLUMN total_percepcion DECIMAL(12,2),
ADD COLUMN total_incluido_percepcion DECIMAL(12,2),
ADD COLUMN retencion_tipo INTEGER,
ADD COLUMN retencion_base_imponible DECIMAL(12,2),
ADD COLUMN total_retencion DECIMAL(12,2),

-- Detracciones
ADD COLUMN detraccion BOOLEAN DEFAULT false,
ADD COLUMN detraccion_tipo INTEGER,
ADD COLUMN detraccion_total DECIMAL(12,2),
ADD COLUMN detraccion_porcentaje DECIMAL(5,2),

-- Información comercial
ADD COLUMN condiciones_pago VARCHAR(250),
ADD COLUMN medio_pago VARCHAR(250),
ADD COLUMN orden_compra_servicio VARCHAR(50),
ADD COLUMN observaciones TEXT,
ADD COLUMN placa_vehiculo VARCHAR(10),
ADD COLUMN cliente_email VARCHAR(250),

-- Notas de crédito/débito
ADD COLUMN documento_modifica_tipo INTEGER,
ADD COLUMN documento_modifica_serie VARCHAR(10),
ADD COLUMN documento_modifica_numero VARCHAR(20),
ADD COLUMN tipo_nota_credito INTEGER,
ADD COLUMN tipo_nota_debito INTEGER,

-- Venta al crédito (JSON)
ADD COLUMN venta_credito_cuotas JSONB,

-- Guías relacionadas (JSON)
ADD COLUMN guias_relacionadas JSONB;
```

### Nuevas Columnas para Items (JSON mejorado)

```typescript
interface ItemExtraidoMejorado {
  // Actuales
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  
  // Nuevos
  unidad_medida: string;           // NIU, ZZ, KGM
  codigo_producto_sunat: string;   // 10000000
  valor_unitario: number;          // Sin IGV
  descuento: number;               // Descuento aplicado
  tipo_igv: number;                // 1-20
  igv: number;                     // Monto IGV
  total: number;                   // Total con IGV
  tipo_isc?: number;               // 1, 2, 3
  isc?: number;                    // Monto ISC
  impuesto_bolsas?: number;        // 0.10
  anticipo_regularizacion?: boolean;
}
```

---

## 🎨 Mejoras Sugeridas en la Interfaz

### 1. **Vista de Detalle del Documento**
- Mostrar todos los campos extraídos organizados por secciones
- Permitir edición inline de campos con confianza baja
- Resaltar campos con confianza < 70% para validación manual

### 2. **Tabla de Items Mejorada**
- Columnas adicionales: Unidad, Tipo IGV, IGV, Total
- Permitir agregar/editar/eliminar items
- Validación automática: cantidad × precio = subtotal

### 3. **Sección de Totales**
- Mostrar desglose completo: Gravada, Exonerada, Inafecta
- Calcular automáticamente IGV según porcentaje
- Validar: Subtotal + IGV = Total

### 4. **Alertas Inteligentes**
- ⚠️ "Documento con detracción detectada (12%)"
- ⚠️ "Percepción aplicada: S/ 14.16"
- ⚠️ "Fecha de vencimiento: 30 días"
- ⚠️ "Nota de crédito modifica: F001-123"

### 5. **Exportación a NubeFact**
- Botón "Enviar a SUNAT vía NubeFact"
- Mapeo automático de campos extraídos → JSON NubeFact
- Validación pre-envío según estructura NubeFact

---

## 📚 Referencias

- **Manual NubeFact API JSON v2.9**: Estructura completa de campos
- **Catálogo SUNAT**: Códigos de productos, unidades de medida, tipos de documentos
- **UBL 2.1 (ISO/IEC 19845)**: Estándar internacional de facturación electrónica

---

**Estado**: 📋 Documento de Planificación  
**Próximos Pasos**:
1. Implementar extracción de campos Fase 1 (ALTA prioridad)
2. Actualizar modelos y tipos TypeScript
3. Mejorar interfaz de edición/visualización
4. Crear migración de base de datos
