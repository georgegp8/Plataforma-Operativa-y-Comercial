# RESUMEN DE SEEDERS Y DATOS DE PRUEBA

**Fecha:** 2026-02-04  
**Proyecto:** Plataforma Operativa Comercial de Facturación Electrónica  
**Compatible con:** Manuales NubeFact v2.9 (Facturas/Boletas) y v1.6 (GRE)

## 📋 SEEDERS DISPONIBLES

### 1. DatabaseSeeder.php (Principal)
**Estado:** ✅ Actualizado y optimizado  
**Responsabilidad:** Orquesta la carga de todos los seeders

**Orden de ejecución:**
1. CatalogosSunatSeeder (obligatorio)
2. Usuarios del sistema (admin, operador, vendedor)
3. DatosPruebaCompletos (solo en dev/local/testing)

**Uso:**
```bash
php artisan db:seed
# o específicamente
php artisan db:seed --class=DatabaseSeeder
```

---

### 2. CatalogosSunatSeeder.php ⭐
**Estado:** ✅ Completo y actualizado  
**Responsabilidad:** Carga todos los catálogos oficiales de SUNAT

**Catálogos incluidos:**
- **01:** Tipo de Documento (Factura, Boleta, NC, ND, Guías)
- **02:** Tipo de Moneda (PEN, USD, EUR, GBP, etc.)
- **03:** Unidades de Medida (NIU, ZZ, KGM, LTR, MTR, etc.)
- **05:** Tipo de Tributo (IGV, IVAP, ISC, ICBPER, etc.)
- **06:** Tipo de Documento de Identidad (DNI, RUC, CE, Pasaporte)
- **07:** Tipo de Afectación del IGV (Gravado, Exonerado, Inafecto, etc.)
- **09:** Tipo de Nota de Crédito (12 tipos)
- **10:** Tipo de Nota de Débito (5 tipos)
- **51:** Tipo de Operación (Venta, Exportación, etc.)
- **53:** Tipo de Descuento

**Tabla:** `catalogos_sunat`

---

### 3. DatosPruebaCompletos.php ⭐ NUEVO
**Estado:** ✅ Recién creado  
**Responsabilidad:** Datos de prueba completos según manuales NubeFact

**Datos generados:**

#### 🏢 Empresa Emisora
- RUC: 20600695771
- Razón Social: NUBEFACT SA
- Dirección: Miraflores, Lima
- Modo: BETA/DEMO

#### 👥 Clientes (6 entidades)
1. **GRUPO MOSS S.R.L.** (RUC: 20434906301)
2. **JUAN PEREZ GARCIA** (DNI: 12345678)
3. **MARIA RODRIGUEZ** (CE: 001234567)
4. **JOHN SMITH** (Pasaporte: AB123456)
5. **SUPERMERCADOS PERUANOS** (Proveedor)
6. **TRANSPORTES DEL NORTE** (Transportista)

#### 📦 Productos (8 ítems)
- **PROD001:** Laptop Lenovo (Gravado) - S/ 3,500
- **PROD002:** Monitor LG 27" (Gravado) - S/ 1,200
- **SERV001:** Consultoría TI (Servicio) - S/ 500
- **SERV002:** Mantenimiento (Servicio) - S/ 150
- **PROD003:** Libro Contabilidad (Exonerado) - S/ 80
- **PROD004:** Artesanía Alpaca (Exportación) - S/ 250
- **PROD005:** Lapicero Promocional (Gratuito) - S/ 2
- **PROD006:** Cable UTP (por Metro) - S/ 2.50
- **PROD007:** Tinta Impresora (por Litro) - S/ 45

#### 📄 Series de Comprobantes
- **F001:** Facturas Ventas
- **F002:** Facturas Exportación
- **B001:** Boletas Ventas
- **FC01:** Notas Crédito Facturas
- **BC01:** Notas Crédito Boletas
- **FD01:** Notas Débito Facturas
- **T001:** Guías Remisión Remitente
- **V001:** Guías Remisión Transportista
- **0001:** Facturas Contingencia (desactivada)

#### 🚗 Vehículos (3 unidades)
- **ABC123:** Toyota Hilux 4x4 (TUC: ABC321981R)
- **XYZ789:** Mitsubishi Canter FB
- **DEF456:** Hyundai HD78

#### 👨‍✈️ Conductores (3 personas)
- **JORGE LOPEZ** (DNI: 12345678, Lic: Q12345678)
- **CARLOS RAMIREZ** (DNI: 87654321, Lic: Q87654321)
- **JUAN GONZALEZ** (CE: 001234567, Lic: Q98765432)

#### 🏦 Cuentas Bancarias
- Cuenta de Detracciones: 00000012345

---

### 4. Seeders Específicos (Opcionales)

#### BancoSeeder.php
**Tablas:** `bancos`  
**Datos:** Scotiabank, BCP, Comercio, Pichincha, BBVA, Interbank

#### UnidadMedidaSeeder.php
**Tablas:** `unidades_medida`  
**Nota:** ⚠️ Tiene duplicidad con CatalogosSunatSeeder (Catálogo 03)  
**Recomendación:** Usar solo `catalogos_sunat` o mantener sincronizados

#### MarcaSeeder.php, CategoriaSeeder.php
**Estado:** Disponibles pero no usados por defecto

---

## 🗑️ SEEDERS ELIMINADOS

### ❌ GuiaRemisionSeeder.php
**Razón:** Duplicaba funcionalidad, ahora integrado en DatosPruebaCompletos  
**Fecha eliminación:** 2026-02-04

### ❌ EmpresaPruebaSeeder.php
**Razón:** Reemplazado por DatosPruebaCompletos  
**Fecha eliminación:** 2026-02-04 (pendiente)

---

## ⚠️ DUPLICIDADES DETECTADAS

### 1. Unidades de Medida
**Problema:** Existen en 2 lugares:
- `catalogos_sunat` (catálogo = '03') ← **Oficial SUNAT**
- `unidades_medida` ← **Tabla específica del sistema**

**Solución recomendada:**
- Opción A: Usar solo `catalogos_sunat` y deprecar `unidades_medida`
- Opción B: Mantener ambas sincronizadas con trigger o evento

### 2. Tipo de Comprobante
**Problema:** Similar al anterior
- `catalogos_sunat` (catálogo = '01')
- `comprobantes.tipo_comprobante` (campo directo)

**Estado:** Actualmente manejado correctamente

---

## 🚀 CÓMO USAR LOS DATOS DE PRUEBA

### Resetear base de datos completa
```bash
php artisan migrate:fresh --seed
```

### Solo ejecutar seeders
```bash
php artisan db:seed
```

### Ejecutar seeder específico
```bash
php artisan db:seed --class=CatalogosSunatSeeder
php artisan db:seed --class=DatosPruebaCompletos
```

### Solo en producción (sin datos de prueba)
```bash
APP_ENV=production php artisan db:seed
# Esto ejecutará solo CatalogosSunatSeeder y usuarios
```

---

## 📊 DATOS PARA PRUEBAS CON NUBEFACT API

### Configuración .env
```env
# MODO DEMO/BETA (para pruebas)
NUBEFACT_RUTA_DEMO=https://api.nubefact.com/api/v1/tu-ruta-aqui
NUBEFACT_TOKEN_DEMO=tu-token-demo-aqui

# MODO PRODUCCIÓN
NUBEFACT_RUTA_PROD=https://api.nubefact.com/api/v1/tu-ruta-produccion
NUBEFACT_TOKEN_PROD=tu-token-produccion-aqui
```

### Credenciales de usuarios
```
Admin:
- Email: admin@facturacion.pe
- Password: password

Operador:
- Email: operador@facturacion.pe
- Password: password

Vendedor:
- Email: vendedor@facturacion.pe
- Password: password
```

---

## 🧪 EJEMPLOS DE JSON PARA NUBEFACT

### Factura Simple (según PROD001)
```json
{
  "operacion": "generar_comprobante",
  "tipo_de_comprobante": 1,
  "serie": "F001",
  "numero": 1,
  "cliente_tipo_de_documento": 6,
  "cliente_numero_de_documento": "20434906301",
  "cliente_denominacion": "GRUPO MOSS S.R.L.",
  "cliente_direccion": "LT. 2 MZ. G - ASC.VILLA CORPAC",
  "fecha_de_emision": "04-02-2026",
  "moneda": 1,
  "tipo_de_cambio": "",
  "porcentaje_de_igv": 18.00,
  "total_gravada": 3500.00,
  "total_igv": 630.00,
  "total": 4130.00,
  "enviar_automaticamente_a_la_sunat": true,
  "enviar_automaticamente_al_cliente": false,
  "items": [
    {
      "unidad_de_medida": "NIU",
      "codigo": "PROD001",
      "descripcion": "LAPTOP LENOVO THINKPAD X1 CARBON",
      "cantidad": 1,
      "valor_unitario": 3500.00,
      "precio_unitario": 4130.00,
      "subtotal": 3500.00,
      "tipo_de_igv": 1,
      "igv": 630.00,
      "total": 4130.00
    }
  ]
}
```

### Guía de Remisión Remitente
```json
{
  "operacion": "generar_guia",
  "tipo_de_comprobante": 7,
  "serie": "T001",
  "numero": 1,
  "cliente_tipo_de_documento": 6,
  "cliente_numero_documento": "20434906301",
  "cliente_denominacion": "GRUPO MOSS S.R.L.",
  "motivo_de_traslado": "01",
  "peso_bruto_total": 5,
  "peso_bruto_unidad_de_medida": "KGM",
  "tipo_de_transporte": "02",
  "fecha_de_inicio_de_traslado": "05-02-2026",
  "transportista_placa_numero": "ABC123",
  "conductor_documento_tipo": "1",
  "conductor_documento_numero": "12345678",
  "conductor_nombre": "JORGE",
  "conductor_apellidos": "LOPEZ",
  "conductor_numero_licencia": "Q12345678",
  "punto_de_partida_ubigeo": "150140",
  "punto_de_partida_direccion": "CALLE LIBERTAD 116, MIRAFLORES",
  "punto_de_llegada_ubigeo": "040122",
  "punto_de_llegada_direccion": "LT. 2 MZ. G, CERRO COLORADO",
  "items": [
    {
      "unidad_de_medida": "NIU",
      "codigo": "PROD001",
      "descripcion": "LAPTOP LENOVO THINKPAD X1 CARBON",
      "cantidad": 1
    }
  ]
}
```

---

## 📖 REFERENCIAS

- **Manual Facturas/Boletas JSON:** v2.9 (31/05/2023)
- **Manual Guías de Remisión:** v1.6 (01/12/2023)
- **Catálogos SUNAT:** [https://cpe.sunat.gob.pe/node](https://cpe.sunat.gob.pe/node)
- **Código de productos:** Catálogo 65 SUNAT
- **Ubigeos:** [Tabla oficial SUNAT](https://drive.google.com/open?id=1-aHRVG5c5-IUkTC_jOJ4ktna6MCR86rK8Bc7AwW2whA)

---

## ✅ PRÓXIMOS PASOS

1. ⚠️ **Resolver duplicidad** de unidades de medida
2. ✅ Ejecutar `php artisan migrate:fresh --seed` para probar
3. ✅ Configurar credenciales NubeFact DEMO en `.env`
4. ✅ Probar generación de comprobante con datos de prueba
5. ⚠️ Eliminar `EmpresaPruebaSeeder.php` (ya no se usa)
6. ✅ Documentar endpoints API compatibles con estos datos

---

**Última actualización:** 2026-02-04 por GitHub Copilot
