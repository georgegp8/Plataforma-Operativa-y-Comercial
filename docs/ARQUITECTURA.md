# Arquitectura del Sistema

## Descripción General

Aplicación web de dos capas (backend API + frontend SPA) con servicios auxiliares de almacenamiento y OCR. El backend expone una API REST bajo Laravel; el frontend consume esa API con React. La comunicación con SUNAT se realiza exclusivamente a través de NubeFact como PSE intermediario.

```
[Usuario]
    │
    ▼
[React SPA — Puerto 5173/80]
    │  HTTP + Bearer Token
    ▼
[Laravel API — Puerto 8000/8080]
    ├── PostgreSQL 15 (Puerto 5432)
    ├── MinIO Storage (Puerto 9000)
    ├── OCR Service Python/Docker
    └── NubeFact API (Internet)
              │
              ▼
          [SUNAT — Perú]
```

---

## Estructura de Directorios

```
Plataforma_Op_Com_Facturacion_Elect/
├── backend/                          # Laravel 11 — API REST
│   ├── app/
│   │   ├── Console/Commands/
│   │   │   └── NubefactSyncCommand.php   # php artisan nubefact:sync
│   │   ├── Http/Controllers/Api/     # 31 controladores REST
│   │   ├── Mail/
│   │   │   └── ComprobanteEmitido.php    # Email automático al cliente + CC empresa
│   │   ├── Models/                   # 32 modelos Eloquent
│   │   └── Services/
│   │       ├── NubefactClient.php    # HTTP client NubeFact API
│   │       ├── NubefactMapper.php    # Datos internos ↔ JSON NubeFact
│   │       ├── NubefactSyncService.php   # Sincronización masiva
│   │       ├── FacturacionService.php    # Cálculos IGV, correlativos
│   │       ├── StorageService.php    # MinIO/S3 abstraction
│   │       └── SlaService.php        # Monitoreo SLA y alertas
│   ├── config/
│   │   ├── nubefact.php             # Configuración NubeFact centralizada
│   │   └── logging.php              # Canal de log 'nubefact'
│   ├── database/
│   │   ├── migrations/              # 40+ migraciones
│   │   └── seeders/CatalogosSunatSeeder.php
│   ├── python_ocr/                  # Servicio OCR (contenedor Docker)
│   │   ├── Dockerfile
│   │   ├── ocr_service.py
│   │   └── requirements.txt
│   └── routes/api.php               # Todas las rutas de la API
│
├── frontend/                         # React 19 + TypeScript + Vite 7
│   └── src/
│       ├── pages/                   # 33 páginas (vistas)
│       ├── components/              # 50+ componentes
│       │   ├── ui/                  # shadcn/ui (Radix primitives)
│       │   ├── dashboard/           # Componentes del dashboard
│       │   ├── ClienteCard.tsx      # Formulario cliente en CPE
│       │   ├── ItemModal.tsx        # Modal de línea/ítem en CPE
│       │   └── ItemsSection.tsx     # Sección de ítems del CPE
│       ├── lib/api.ts               # Cliente API central (axios + tipos TS)
│       ├── services/nubefact.ts     # Constantes de tipos/catálogos NubeFact
│       ├── context/                 # React context (auth, empresa activa)
│       ├── hooks/                   # Custom hooks
│       └── stores/                  # Zustand state management
│
├── docs/                            # Documentación técnica
├── examples/                        # 60+ ejemplos JSON NubeFact
├── docker-compose.yml               # PostgreSQL + MinIO + OCR
└── README.md
```

---

## Modelos de Base de Datos

### Facturación

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `Comprobante` | `comprobantes` | Facturas, boletas, NC, ND. Incluye 19 campos NubeFact (URLs, estado SUNAT, QR, etc.) |
| `ComprobanteItem` | `comprobante_items` | Líneas de cada comprobante |
| `GuiaRemision` | `guia_remisions` | GRE con 40+ columnas (datos remitente, destinatario, ruta, vehículo) |
| `GuiaRemisionItem` | `guia_remision_items` | Líneas de cada guía |
| `Serie` | `series` | Control de numeración por tipo de documento |

### Comercial

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `Empresa` | `empresas` | RUC, credenciales NubeFact, logo, email, modo (demo/production) |
| `Entidad` | `entidades` | Clientes y proveedores (RUC, DNI, razón social, email) |
| `Oportunidad` | `oportunidades` | Pipeline de ventas con estado y SLA |
| `Pago` | `pagos` | Pagos asociados a oportunidades |
| `NotaVenta` | `nota_ventas` | Notas de venta previas a emisión de CPE |
| `Compra` | `compras` | Órdenes de compra |

### Inventario y Catálogo

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `Producto` | `productos` | stock_actual, stock_minimo, precio_venta_unitario, valor_venta_unitario, tipo_afectacion_igv |
| `Categoria` | `categorias` | Categorías de productos |
| `Marca` | `marcas` | Marcas |
| `Atributo` | `atributos` | Atributos variables |
| `UnidadMedida` | `unidades_medida` | Catálogo SUNAT de unidades |
| `ProductoCompuesto` | `productos_compuestos` | Paquetes u ofertas combinadas |
| `MovimientoInventario` | `movimientos_inventario` | INGRESO, SALIDA, DEVOLUCION con fecha, cantidad y usuario |

### Logística y Operaciones

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `Vehiculo` | `vehiculos` | Placa, marca, para GRE |
| `Conductor` | `conductores` | DNI, licencia, para GRE |
| `Vendedor` | `vendedores` | Vendedores/comerciales |
| `Personal` | `personals` | Personal interno |
| `Banco` | `bancos` | Catálogo de bancos |
| `CuentaBancaria` | `cuenta_bancarias` | Cuentas bancarias empresa |
| `Transaccion` | `transaccions` | Tipos de movimiento financiero |

### Sistema

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| `User` | `users` | Usuarios (roles: admin, operador) |
| `Alerta` | `alertas` | Notificaciones del sistema |
| `Auditoria` | `auditorias` | Trazabilidad de acciones |
| `SlaConfiguracion` | `sla_configuraciones` | Umbrales de SLA |
| `CatalogoSunat` | `catalogo_sunats` | Cache catálogos SUNAT |
| `Documento` | `documentos` | Adjuntos en MinIO |
| `DocumentoDigitalizado` | `documentos_digitalizados` | Facturas OCR procesadas |

---

## Endpoints API — Resumen

Autenticación: `Authorization: Bearer {token}` en todos los endpoints protegidos.

### Autenticación

```
POST /api/auth/login          → { token, user }
POST /api/auth/register
POST /api/auth/logout
GET  /api/auth/me
```

### NubeFact — Emisión

```
POST   /api/nubefact/comprobantes                           # Emitir factura/boleta/NC/ND
GET    /api/nubefact/comprobantes/{tipo}/{serie}/{numero}   # Consultar estado SUNAT
DELETE /api/nubefact/comprobantes/{tipo}/{serie}/{numero}   # Anular [admin]

POST   /api/nubefact/guias                                  # Emitir GRE
GET    /api/nubefact/guias/{tipo}/{serie}/{numero}          # Consultar GRE
POST   /api/nubefact/guias/sincronizar-rango                # Sync rango GRE
POST   /api/nubefact/guias/auto-descubrir                   # Auto-descubrir GREs
```

### NubeFact — Sincronización [admin]

```
GET  /api/nubefact-sync/estado                              # Verificar conexión
GET  /api/nubefact-sync/estadisticas                        # Estadísticas BD vs NubeFact
GET  /api/nubefact-sync/consultar/{tipo}/{serie}/{numero}   # Consultar sin guardar en BD
POST /api/nubefact-sync/comprobante                         # Sync individual
POST /api/nubefact-sync/rango                               # Sync rango (max 100)
POST /api/nubefact-sync/pendientes                          # Sync pendientes masivo
POST /api/nubefact-sync/rango-guias                         # Sync rango GREs
```

### Facturación Interna

```
GET  /api/facturacion/comprobantes                          # Listar con filtros
GET  /api/facturacion/comprobantes/{id}                     # Detalle
GET  /api/facturacion/comprobantes/export                   # Excel
GET  /api/facturacion/descargar/pdf|xml|cdr/{id}           # Descargar archivos
POST /api/facturacion/enviar-email/{id}                     # Reenviar email
GET  /api/facturacion/estadisticas                           # Stats generales
```

### CRUD V1 — Recursos completos (GET/POST/PUT/DELETE)

```
/api/v1/empresas              /api/v1/entidades
/api/v1/productos             /api/v1/categorias
/api/v1/marcas                /api/v1/atributos
/api/v1/unidades-medida       /api/v1/series
/api/v1/vendedores            /api/v1/personal
/api/v1/vehiculos             /api/v1/conductores
/api/v1/bancos                /api/v1/cuentas-bancarias
/api/v1/transacciones         /api/v1/oportunidades
/api/v1/pagos                 /api/v1/compras
/api/v1/documentos            /api/v1/documentos-digitalizados
/api/v1/guias-remision        /api/v1/notas-venta
/api/v1/productos-compuestos  /api/v1/movimientos-inventario
/api/v1/alertas               /api/v1/dashboard
/api/v1/catalogos
```

---

## Flujo de Emisión de un CPE

```
1. Usuario llena BoletasFacturas.tsx
   → Selecciona cliente, agrega ítems con precios e IGV, define serie

2. POST /api/nubefact/comprobantes { comprobante_id }

3. NubefactController::emitir()
   → Carga Comprobante + items + empresa
   → NubefactMapper transforma al JSON NubeFact
   → NubefactClient llama a api.pse.pe (demo) o api.nubefact.com (prod)

4. NubeFact → SUNAT → respuesta con:
   enlace, pdf_url, xml_url, cdr_url, aceptada_por_sunat, cadena_qr

5. Backend guarda URLs en BD
   → Si aceptada=true y cliente.email no vacío → envía ComprobanteEmitido mail
   → CC automático a email de la empresa (si configurado)

6. Frontend muestra botones PDF / XML / CDR con links autenticados
```

---

## Servicios Backend Clave

| Servicio | Responsabilidad |
|----------|-----------------|
| `NubefactClient` | HTTP client — auth Bearer, reintentos, timeout 30s, log dedicado |
| `NubefactMapper` | Transforma `Comprobante` → JSON NubeFact y viceversa |
| `NubefactSyncService` | Sync masiva: consulta NubeFact → crea o actualiza en BD, delay 200ms |
| `FacturacionService` | Cálculo IGV, validación series, correlativo seguro anti-duplicado |
| `StorageService` | Upload/download MinIO compatible S3 |
| `SlaService` | Monitoreo umbrales SLA → genera alertas automáticas |

---

## Roles y Permisos

| Rol | Capacidades |
|-----|-------------|
| `admin` | Todo: anular CPE, sync masivo, gestión series, configurar empresa, ver auditorías |
| `operador` | Emitir CPE/GRE, gestionar clientes/productos, compras, dashboard |

Control: middleware Laravel en backend + `isAdmin()` en contexto React en frontend.
