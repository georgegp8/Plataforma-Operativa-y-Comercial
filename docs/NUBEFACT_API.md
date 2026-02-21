# NubeFact API — Documentación de Integración

NubeFact es el Proveedor de Servicios Electrónicos (PSE) que intermedia entre esta plataforma y SUNAT para la emisión de comprobantes electrónicos (CPE) y guías de remisión electrónica (GRE) en Perú.

**API versión:** JSON V1
**URL Demo:** `https://api.pse.pe/api/v1/{ruc_key}`
**URL Producción:** `https://api.nubefact.com/api/v1/{ruc_key}`
**Autenticación:** Bearer Token JWT

---

## 1. Configuración

### Variables de entorno

```env
NUBEFACT_BASE_URL=https://api.pse.pe/api/v1/{ruc_key}    # demo
# o en producción:
# NUBEFACT_BASE_URL=https://api.nubefact.com/api/v1/{ruc_key}

NUBEFACT_TOKEN=eyJhbGciOiJIUzI1NiJ9...    # JWT obtenido en nubefact.com
NUBEFACT_MODE=demo          # demo | production
NUBEFACT_AUTO_SUNAT=true    # Enviar automáticamente a SUNAT al emitir
NUBEFACT_PDF_FORMAT=A4      # A4 | TICKET
NUBEFACT_TIMEOUT=30         # Segundos
```

### Configuración centralizada

```php
// backend/config/nubefact.php
return [
    'base_url'    => env('NUBEFACT_BASE_URL'),
    'token'       => env('NUBEFACT_TOKEN'),
    'mode'        => env('NUBEFACT_MODE', 'demo'),
    'auto_sunat'  => env('NUBEFACT_AUTO_SUNAT', true),
    'pdf_format'  => env('NUBEFACT_PDF_FORMAT', 'A4'),
    'timeout'     => env('NUBEFACT_TIMEOUT', 30),
];
```

### Logging dedicado

Todas las peticiones y respuestas se registran en:
```
backend/storage/logs/nubefact-YYYY-MM-DD.log
```

---

## 2. Tipos de Comprobante (tipo_de_comprobante)

| Código | Tipo |
|--------|------|
| `1` | Factura |
| `2` | Boleta de Venta |
| `3` | Liquidación de Compra |
| `4` | Ticket POS |
| `7` | Nota de Crédito |
| `8` | Nota de Débito |

---

## 3. Emitir Comprobante (Factura / Boleta)

**Endpoint NubeFact:** `POST {base_url}`

**Endpoint interno:** `POST /api/nubefact/comprobantes`
Body: `{ "comprobante_id": 123 }`

El backend carga el `Comprobante` de la BD, lo transforma con `NubefactMapper` y llama a NubeFact.

### Estructura JSON — Factura Gravada

```json
{
  "operacion": "generar_comprobante",
  "tipo_de_comprobante": 1,
  "serie": "F010",
  "numero": 21,
  "sunat_transaction": 1,
  "cliente_tipo_de_documento": 6,
  "cliente_numero_de_documento": "20123456789",
  "cliente_denominacion": "EMPRESA CLIENTE SAC",
  "cliente_direccion": "Av. Principal 123, Lima",
  "cliente_email": "cliente@empresa.com",
  "fecha_de_emision": "25-01-2026",
  "fecha_de_vencimiento": "25-01-2026",
  "moneda": 1,
  "tipo_de_cambio": "",
  "porcentaje_de_igv": 18,
  "total_gravada": 1000.00,
  "total_exonerada": 0,
  "total_inafecta": 0,
  "total_igv": 180.00,
  "total": 1180.00,
  "total_descuentos": 0,
  "total_otros_cargos": 0,
  "enviar_automaticamente_al_cliente": true,
  "enviar_automaticamente_a_la_sunat": true,
  "formato_de_pdf": "A4",
  "items": [
    {
      "unidad_de_medida": "NIU",
      "codigo": "PROD-001",
      "descripcion": "Producto de Ejemplo",
      "cantidad": 10,
      "valor_unitario": 100.00,
      "precio_unitario": 118.00,
      "descuento": 0,
      "subtotal": 1000.00,
      "tipo_de_igv": 1,
      "igv": 180.00,
      "total": 1180.00,
      "anticipo_regularizacion": false,
      "anticipo_documento_serie": "",
      "anticipo_documento_numero": ""
    }
  ]
}
```

### Tipos de Documento del Cliente (cliente_tipo_de_documento)

| Código | Tipo |
|--------|------|
| `0` | Sin documento |
| `1` | DNI |
| `4` | Carnet de Extranjería |
| `6` | RUC |
| `7` | Pasaporte |

### Tipo de IGV por ítem (tipo_de_igv)

| Código | Descripción | Uso |
|--------|-------------|-----|
| `1` | Gravado — Operación Onerosa | Venta normal con IGV 18% |
| `2` | Gravado — Retiro por Premio | |
| `9` | Exonerado — Operación Onerosa | Sin IGV |
| `30` | Inafecto — Operación Onerosa | Sin IGV |

### Moneda (moneda)

| Código | Moneda |
|--------|--------|
| `1` | Soles (PEN) |
| `2` | Dólares (USD) |

### Respuesta de NubeFact

```json
{
  "aceptada_por_sunat": true,
  "sunat_description": "La Factura numero F010-21, ha sido aceptada por SUNAT.",
  "sunat_note": "",
  "cadena_para_codigo_qr": "20123456789|01|F010|21|180.00|1180.00|25/01/2026|6|20987654321",
  "codigo_hash": "hash_del_xml",
  "enlace": "https://nubofact.pse.pe/cpe/...",
  "enlace_del_pdf": "https://api.pse.pe/api/v1/.../pdf",
  "enlace_del_xml": "https://api.pse.pe/api/v1/.../xml",
  "enlace_del_cdr": "https://api.pse.pe/api/v1/.../cdr",
  "tipo": 1,
  "serie": "F010",
  "numero": 21,
  "cliente_tipo_de_documento": 6,
  "cliente_numero_de_documento": "20123456789",
  "cliente_denominacion": "EMPRESA CLIENTE SAC",
  "total": 1180.00
}
```

**Campos guardados en BD (`comprobantes`):**
- `nubefact_enlace` ← `enlace`
- `nubefact_pdf_url` ← `enlace_del_pdf`
- `nubefact_xml_url` ← `enlace_del_xml`
- `nubefact_cdr_url` ← `enlace_del_cdr`
- `nubefact_qr` ← `cadena_para_codigo_qr`
- `nubefact_hash` ← `codigo_hash`
- `aceptada_por_sunat` ← `aceptada_por_sunat`
- `sunat_description` ← `sunat_description`

---

## 4. Emitir Boleta de Venta

Igual que Factura pero:
```json
{
  "tipo_de_comprobante": 2,
  "serie": "B010",
  "cliente_tipo_de_documento": 1,    // DNI
  "cliente_numero_de_documento": "12345678"
}
```

Para boletas sin documento (monto < S/ 700):
```json
{
  "cliente_tipo_de_documento": 0,
  "cliente_numero_de_documento": "-"
}
```

---

## 5. Nota de Crédito / Débito

```json
{
  "operacion": "generar_comprobante",
  "tipo_de_comprobante": 7,              // 7=NC, 8=ND
  "serie": "FC01",
  "numero": 1,
  "tipo_de_nota_de_credito": 13,         // Ver tabla abajo
  "documento_que_se_modifica_tipo": 1,   // Tipo del CPE que modifica (1=Factura)
  "documento_que_se_modifica_serie": "F010",
  "documento_que_se_modifica_numero": 21,
  ...
}
```

### Tipos de Nota de Crédito (tipo_de_nota_de_credito)

| Código | Motivo |
|--------|--------|
| `1` | Anulación de la operación |
| `2` | Anulación por error en el RUC |
| `3` | Corrección por error en la descripción |
| `4` | Descuento global |
| `5` | Descuento por ítem |
| `6` | Devolución total |
| `7` | Devolución por ítem |
| `13` | Ajuste en operaciones de exportación |

### Tipos de Nota de Débito (tipo_de_nota_de_debito)

| Código | Motivo |
|--------|--------|
| `1` | Intereses por mora |
| `2` | Aumento en el valor |
| `3` | Penalidades |

---

## 6. Consultar Comprobante

**Endpoint NubeFact:** `GET {base_url}?operacion=consultar_comprobante&tipo_de_comprobante=1&serie=F010&numero=21`

**Endpoint interno:** `GET /api/nubefact/comprobantes/{tipo}/{serie}/{numero}`

```json
{
  "aceptada_por_sunat": true,
  "enlace": "https://...",
  "enlace_del_pdf": "https://...",
  "enlace_del_xml": "https://...",
  "enlace_del_cdr": "https://..."
}
```

---

## 7. Anular Comprobante

**Endpoint NubeFact:** `POST {base_url}` con `operacion: "generar_anulacion"`

**Endpoint interno:** `DELETE /api/nubefact/comprobantes/{tipo}/{serie}/{numero}` [admin]

Body:
```json
{
  "motivo": "Error en los datos del receptor"
}
```

Internamente envía a NubeFact:
```json
{
  "operacion": "generar_anulacion",
  "tipo_de_comprobante": 1,
  "serie": "F010",
  "numero": 21,
  "fecha": "26-01-2026",
  "motivo": "Error en los datos del receptor"
}
```

---

## 8. Guías de Remisión Electrónica (GRE)

### Tipos de Guía

| Código | Tipo |
|--------|------|
| `7` | GRE Remitente (la empresa envía bienes) |
| `8` | GRE Transportista (empresa de transporte) |

**Endpoint interno:** `POST /api/nubefact/guias` con `{ "guia_id": 456 }`

### Estructura JSON — GRE Remitente

```json
{
  "operacion": "generar_guia",
  "tipo_de_comprobante": 31,
  "serie": "T001",
  "numero": 1,
  "fecha_de_emision": "25-01-2026",
  "fecha_de_traslado": "26-01-2026",
  "codigo_motivo_de_traslado": "01",
  "descripcion_motivo_de_traslado": "Venta",
  "peso_total": 10.5,
  "unidad_peso_total": "KGM",
  "numero_de_bultos": 2,
  "numero_contenedor": "",
  "seal_number": "",
  "modalidad_de_traslado": "01",
  "direccion_partida": "Av. Industrial 456",
  "ubigeo_partida": "150101",
  "direccion_llegada": "Av. Lima 789",
  "ubigeo_llegada": "150102",
  "vehiculo_placa": "ABC-123",
  "vehiculo_numero_de_licencia": "Q12345678",
  "conductor_numero_de_documento": "87654321",
  "conductor_tipo_de_documento": 1,
  "conductor_denominacion": "Juan Pérez López",
  "destinatario_tipo_de_documento": 6,
  "destinatario_numero_de_documento": "20123456789",
  "destinatario_denominacion": "EMPRESA DESTINATARIA SAC",
  "destinatario_direccion": "Av. Lima 789",
  "enviar_automaticamente_a_la_sunat": true,
  "items": [
    {
      "unidad_de_medida": "NIU",
      "codigo": "PROD-001",
      "descripcion": "Producto de Ejemplo",
      "cantidad": 10
    }
  ]
}
```

### Códigos de Motivo de Traslado

| Código | Motivo |
|--------|--------|
| `01` | Venta |
| `02` | Compra |
| `03` | Traslado entre establecimientos de la misma empresa |
| `04` | Consignación |
| `05` | Devolución |
| `06` | Traslado por emisor itinerante de CPE |
| `07` | Traslado zona primaria |
| `13` | Otros |

### Modalidad de Traslado

| Código | Modalidad |
|--------|-----------|
| `01` | Transporte público |
| `02` | Transporte privado |

### Respuesta GRE

```json
{
  "aceptada_por_sunat": true,
  "enlace": "https://...",
  "enlace_del_pdf": "https://...",
  "enlace_del_xml": "https://...",
  "enlace_del_cdr": "https://...",
  "cadena_para_codigo_qr": "..."
}
```

---

## 9. Sincronización Masiva desde NubeFact

### Verificar conexión

```http
GET /api/nubefact-sync/estado
Authorization: Bearer {token}
```

```json
{
  "success": true,
  "mensaje": "Conexión con NubeFact establecida correctamente",
  "configuracion": {
    "base_url": "https://api.pse.pe/api/v1/...",
    "modo": "demo",
    "auto_sunat": true
  }
}
```

### Estadísticas de sincronización

```http
GET /api/nubefact-sync/estadisticas
```

```json
{
  "success": true,
  "estadisticas": {
    "total": 55,
    "con_enlace_nubefact": 55,
    "aceptados_sunat": 54,
    "nunca_consultados": 0,
    "desactualizados": 5,
    "ultima_sincronizacion": "2026-02-21 10:30:00"
  }
}
```

### Sincronizar comprobante individual

```http
POST /api/nubefact-sync/comprobante
Content-Type: application/json

{
  "tipo_doc": "01",
  "serie": "F010",
  "numero": 21,
  "empresa_id": 1
}
```

```json
{
  "success": true,
  "accion": "actualizado",    // "creado" | "actualizado" | "no_encontrado"
  "mensaje": "Comprobante F010-21 actualizado exitosamente desde NubeFact"
}
```

### Sincronizar rango de comprobantes (máx 100)

```http
POST /api/nubefact-sync/rango
Content-Type: application/json

{
  "tipo_doc": "01",
  "serie": "F010",
  "numero_inicio": 1,
  "numero_fin": 50,
  "empresa_id": 1
}
```

```json
{
  "total": 50,
  "exitosos": 48,
  "errores": 2,
  "creados": 5,
  "actualizados": 43,
  "no_encontrados": 0
}
```

### Sincronizar pendientes masivo

```http
POST /api/nubefact-sync/pendientes
Content-Type: application/json

{
  "solo_pendientes": true,
  "empresa_id": 1,
  "tipo_doc": "01",
  "fecha_desde": "2026-01-01",
  "fecha_hasta": "2026-01-31",
  "limite": 50
}
```

### Sincronizar rango de Guías de Remisión

```http
POST /api/nubefact-sync/rango-guias
Content-Type: application/json

{
  "tipo": 7,
  "serie": "T001",
  "numero_inicio": 1,
  "numero_fin": 20,
  "empresa_id": 1
}
```

### Sincronización vía Artisan

```bash
# Sincronizar pendientes
php artisan nubefact:sync --pendientes

# Sincronizar rango específico
php artisan nubefact:sync --tipo=01 --serie=F010 --inicio=1 --fin=50

# Por empresa
php artisan nubefact:sync --empresa=1 --limite=100

# Por fecha
php artisan nubefact:sync --fecha-desde=2026-01-01 --fecha-hasta=2026-01-31
```

---

## 10. Catálogos SUNAT Usados

### Unidades de Medida (Catálogo 3)

| Código | Descripción |
|--------|-------------|
| `NIU` | Unidad (producto) |
| `ZZ` | Unidad (servicio) |
| `KGM` | Kilogramo |
| `LTR` | Litro |
| `MTR` | Metro |
| `MTQ` | Metro cúbico |
| `BX` | Caja |
| `DZN` | Docena |

### Ubigeos

Los ubigeos son códigos de 6 dígitos del INEI: `departamento(2) + provincia(2) + distrito(2)`.

Ejemplo: `150101` = Lima / Lima / Lima

---

## 11. Descarga de Archivos (PDF/XML/CDR)

Los archivos de los comprobantes requieren autenticación para descargarse. El backend actúa como proxy autenticado con NubeFact:

```http
GET /api/facturacion/descargar/pdf/{comprobante_id}
GET /api/facturacion/descargar/xml/{comprobante_id}
GET /api/facturacion/descargar/cdr/{comprobante_id}
Authorization: Bearer {token}
```

El backend:
1. Busca el comprobante en BD y obtiene `nubefact_pdf_url`
2. Hace petición autenticada a NubeFact con token
3. Retorna el archivo al frontend con `Content-Disposition: attachment`

---

## 12. Email Automático al Emitir

Cuando `aceptada_por_sunat = true` y `cliente_email` no está vacío, el sistema envía automáticamente el comprobante al cliente:

- **To:** `cliente_email` del comprobante
- **CC:** Email de la empresa emisora (si configurado en `empresas.email`)
- **Asunto:** `"Factura Electrónica F010-21"` (o Boleta según tipo)
- **Adjunto:** PDF del comprobante (descargado de NubeFact)
- **Adjunto:** XML del comprobante

Para que el CC a la empresa funcione, configurar el email en **Configuración de Empresa** en la plataforma.

---

## 13. Seguridad y Límites

- **Rate limiting:** Delay de 200ms entre consultas consecutivas en sync masivo
- **Máximo por request:** 100 comprobantes en sincronización de rango
- **Token rotation:** Rotar token NubeFact periódicamente
- **Nunca en código:** Los tokens no deben estar en el repositorio — solo en `.env`
- **Modo demo vs prod:** URL distinta. Nunca emitir con token de producción en dev.

---

## 14. Troubleshooting NubeFact

| Error | Causa probable | Solución |
|-------|---------------|----------|
| `401 Unauthorized` | Token inválido o expirado | Actualizar `NUBEFACT_TOKEN` en `.env` |
| `Connection refused` | URL incorrecta o red | Verificar `NUBEFACT_BASE_URL` |
| `aceptada_por_sunat: false` | Datos inválidos (RUC, serie, etc.) | Ver `sunat_description` en respuesta |
| Email no enviado | `cliente_email` vacío | Agregar email al cliente en la plataforma |
| PDF no descarga | Token NubeFact expirado | El backend hace request autenticado; refrescar token |

Ver logs en: `backend/storage/logs/nubefact-YYYY-MM-DD.log`
