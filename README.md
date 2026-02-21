# Plataforma Operativa y Comercial con Facturación Electrónica

- **Desarrollador:** George Guerra Pacheco — [george.guerra@tecsup.edu.pe](mailto:george.guerra@tecsup.edu.pe)
- **Empresa:** Fibertel Networks S.A.C.
- **Proyecto:** Nubofact Web y Facturador
- **Equipo:** Diseño de Base de Datos
- **Repositorio oficial (URL):** [github.com/diegomejiam/Nubofact-Web-y-Facturador](https://github.com/diegomejiam/Nubofact-Web-y-Facturador.git)
- **Hyscloud (Nextcloud):** [Ruta del proyecto](https://hyscloud.mcsyra.com/index.php/apps/files/files/1819?dir=/Nubofact%20Web%20App)
- **Versión de entrega:** `v1.0-entrega`
- **Fecha de entrega:** 21 / 02 / 2026
---

## 1. Introducción

### Nombre del Proyecto

Plataforma Operativa y Comercial con Facturación Electrónica

### Objetivo del Sistema

Sistema web fullstack para la gestión integral de una empresa peruana: comercial, operativa y financiera, con emisión de comprobantes electrónicos (CPE) certificados por SUNAT a través del PSE NubeFact. Centraliza en una sola plataforma la facturación electrónica, el control de inventario, la gestión de clientes, compras, finanzas y la digitalización de documentos mediante OCR.

### Problema que Resuelve

Las pequeñas y medianas empresas en Perú están obligadas a emitir comprobantes electrónicos ante SUNAT. Al mismo tiempo, necesitan gestionar su operación diaria: clientes, productos, inventario, compras y finanzas. Esta plataforma unifica ambas necesidades en un solo sistema web, eliminando el uso de herramientas dispersas y reduciendo errores manuales.

### Perfil del Usuario Final

| Rol | Descripción |
|-----|-------------|
| **Administrador** | Acceso total. Configura empresa, series, usuarios, vendedores, vehículos. Visualiza todas las métricas del dashboard. Accede a sincronización NubeFact y configuraciones críticas. |
| **Usuario / Operador** | Emite facturas y boletas, gestiona clientes y productos, registra movimientos de inventario, gestiona compras y finanzas. No accede a configuración de empresa ni sincronización masiva. |

---

## 2. Arquitectura a Nivel Usuario

```
┌──────────────────────────────────────┐
│           FRONTEND                   │
│   React 19 + TypeScript (SPA)        │
│   Vite 7 · shadcn/ui · TailwindCSS   │
└──────────────┬───────────────────────┘
               │  HTTP/JSON + Bearer Token
               ▼
┌──────────────────────────────────────┐         ┌─────────────────────┐
│           BACKEND                    │         │   NubeFact API      │
│   Laravel 11 · PHP 8.2               │────────►│   (PSE / SUNAT)     │
│   API REST · Laravel Sanctum         │         │   JSON V1           │
│   Nginx + PHP-FPM · Debian 12        │         └─────────────────────┘
└───┬──────────────┬───────────────────┘
    │              │
    ▼              ▼
┌───────────────────────────────────────────┐
│           Docker Compose                  │
│  ┌─────────────────────────────────────┐  │
│  │  PostgreSQL 15      (puerto 5432)   │  │
│  ├─────────────────────────────────────┤  │
│  │  MinIO S3 Storage   (puerto 9000)   │  │
│  ├─────────────────────────────────────┤  │
│  │  Python OCR Service (puerto 8001)   │  │
│  │  Tesseract · Google Gemini AI       │  │
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

| Capa | Tecnología | Rol |
|------|-----------|-----|
| Frontend | React 19 + TypeScript + Vite 7 | Interfaz web SPA accesible desde cualquier navegador |
| Backend | Laravel 11 (PHP 8.2) | API REST, lógica de negocio, integración NubeFact |
| Infraestructura | **Docker + Docker Compose** | Orquesta PostgreSQL, MinIO y el servicio OCR en contenedores |
| Base de datos | PostgreSQL 15 (contenedor Docker) | Almacenamiento persistente |
| Storage | MinIO S3 (contenedor Docker) | Archivos digitalizados por OCR |
| OCR | Python 3.12 + Tesseract / Gemini AI (contenedor Docker) | Digitalización de facturas en papel |
| Facturación electrónica | NubeFact API JSON V1 | Emisión y certificación de CPE ante SUNAT |
| Autenticación | Laravel Sanctum | Tokens Bearer por sesión |
| Servidor | Nginx + PHP-FPM en Debian 12 | Producción |

---

## 3. Módulos y Funcionalidades

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Métricas en tiempo real: ventas del mes, top clientes, top productos, comparativa mensual, alertas de stock mínimo |
| **Facturación Electrónica** | Emisión de Facturas (01), Boletas (03), Notas de Crédito (07), Notas de Débito (08) vía NubeFact + SUNAT. Descarga PDF, XML, CDR. Email automático al cliente. |
| **Guías de Remisión** | Emisión de GRE Remitente (tipo 7) y Transportista (tipo 8). Datos de vehículo, conductor, puntos de partida/llegada, motivo de traslado. Sync masivo desde NubeFact. |
| **Clientes / Proveedores** | CRUD de entidades. Búsqueda por RUC (consulta SUNAT) o DNI. Historial de comprobantes por cliente. |
| **Productos** | Catálogo con código, nombre, unidad, precios, stock actual y mínimo, categoría, marca, atributos y estado destacado. Alertas de stock bajo. |
| **Inventario** | Movimientos de Ingreso, Salida y Devolución. Filtros por almacén, categoría, fecha y tipo. |
| **Productos Compuestos** | Paquetes y ofertas combinadas con precio de venta y manejo de IGV. |
| **Gestión Comercial** | Oportunidades de venta, seguimiento de pagos, SLA y alertas de vencimiento. |
| **Compras** | Órdenes de compra a proveedores. Digitalización OCR de facturas físicas escaneadas. |
| **Finanzas** | Gestión de bancos, cuentas bancarias y registro de transacciones. |
| **Configuración** | Empresa (datos SUNAT, logo, credenciales NubeFact), series de comprobantes, vendedores, vehículos, conductores. |
| **Comprobantes Anulados SUNAT** | Vista de comprobantes anulados sincronizados con SUNAT. |
| **Sincronización NubeFact** | Importación masiva de comprobantes históricos (CPE y GRE) desde NubeFact. |
| **Digitalización OCR** | Extracción de datos de facturas escaneadas usando Tesseract (local) o Google Gemini AI. |

---

## 4. Flujo Completo del Sistema

### 4.1 Login

1. El usuario accede a la URL del sistema (ej: `http://localhost:5173`).
2. Ingresa su **email y contraseña** en la pantalla de login.
3. El sistema valida contra la API y entrega un **Bearer token** (Laravel Sanctum).
4. El token se guarda en `localStorage` y se incluye en todas las solicitudes posteriores.
5. Si el token expira, el sistema redirige automáticamente al login.

### 4.2 Navegación por Módulos

El menú principal (sidebar/header) presenta todos los módulos agrupados:

- **Facturación**: Boletas/Facturas, Guías de Remisión, Anulados SUNAT
- **Gestión**: Clientes, Productos, Inventario, Productos Compuestos, Comercial, Compras
- **Finanzas**: Cuentas y transacciones bancarias
- **Configuración** *(solo admin)*: Empresa, Series, Vendedores, Vehículos, Conductores

Los ítems marcados como `adminOnly` solo son visibles si el usuario tiene rol `admin`.

### 4.3 Emitir un Comprobante (Flujo Principal)

1. Ir a **Boletas / Facturas** → botón **Nueva Factura** o **Nueva Boleta**.
2. Seleccionar tipo de documento: Factura (RUC) o Boleta (DNI/sin documento).
3. Buscar o ingresar los datos del **cliente** (RUC/DNI autocompleta desde SUNAT).
4. Seleccionar **serie y número** (autocompletado desde la BD).
5. Agregar **ítems**: producto, cantidad, precio, tipo de IGV (gravado/exonerado/inafecto).
6. Seleccionar **productos destacados** si aplica.
7. Revisar totales (subtotal, IGV, total).
8. Clic en **Emitir** → el sistema envía el JSON a NubeFact → NubeFact lo remite a SUNAT.
9. Si SUNAT acepta: el comprobante queda registrado, se genera PDF/XML/CDR.
10. Se envía **email automático** al cliente con el PDF adjunto (si tiene email registrado).

### 4.4 Crear / Editar / Eliminar (CRUD general)

Todos los módulos siguen el mismo patrón:
- **Listado** con tabla paginada y filtros en la parte superior.
- **Nuevo** → abre modal o formulario → completar campos → Guardar → aparece en la lista.
- **Editar** → ícono lápiz en la fila → modifica datos → Actualizar.
- **Eliminar** → ícono basura / botón → confirmación → eliminado.

### 4.5 Listados y Reportes

- Cada módulo tiene su propia vista de listado con paginación (10/25/50/100 registros).
- Filtros por fecha, categoría, tipo, almacén, etc., según el módulo.
- Botón **Exportar Excel** disponible en módulos de comprobantes, inventario y clientes.
- El **Dashboard** muestra métricas agregadas con gráficos y tablas de ranking.

### 4.6 Configuración de Empresa

*(Solo administrador)*

1. Ir a **Configuración → Configuración Empresa**.
2. Completar RUC, razón social, dirección, logo, datos NubeFact (token, URL API).
3. Configurar email de la empresa para recibir copia de comprobantes emitidos.
4. Guardar — los cambios aplican inmediatamente a la emisión de comprobantes.

---

## 5. Roles y Permisos

### Roles del Sistema

| Rol | Valor en BD | Descripción |
|-----|------------|-------------|
| **Administrador** | `admin` | Acceso total al sistema |
| **Usuario** | `user` | Acceso operativo (sin configuración crítica) |

### Permisos por Rol

| Funcionalidad | Admin | Usuario |
|---------------|-------|---------|
| Dashboard | ✓ | ✓ |
| Emitir Facturas / Boletas | ✓ | ✓ |
| Guías de Remisión | ✓ | ✓ |
| Gestión de Clientes | ✓ | ✓ |
| Gestión de Productos | ✓ | ✓ |
| Inventario | ✓ | ✓ |
| Compras / OCR | ✓ | ✓ |
| Finanzas | ✓ | ✓ |
| **Configuración Empresa** | ✓ | ✗ |
| **Series de comprobantes** | ✓ | ✗ |
| **Vendedores / Vehículos** | ✓ | ✗ |
| **Sincronización masiva NubeFact** | ✓ | ✗ |

### Validación de Acceso

- El backend valida el rol en cada endpoint con middleware `role:admin`.
- El frontend oculta elementos `adminOnly` si `user.rol !== 'admin'`.
- Si un usuario sin permisos intenta acceder a una ruta protegida, es redirigido al Dashboard.

---

## 6. Casos de Uso

### Caso 1 — Emitir una Factura Electrónica

**Actor:** Operador de ventas
**Flujo:**
1. Menú → **Boletas / Facturas** → **Nueva Factura**.
2. Buscar cliente por RUC (ej: `20100130308` — SUNAT) → datos autocompletan.
3. Seleccionar serie `F001`, número autoincremental.
4. Agregar ítem: "Servicio de consultoría", cantidad 1, precio S/ 500.00, tipo IGV: Gravado (18%).
5. Totales: Subtotal S/ 423.73 | IGV S/ 76.27 | **Total S/ 500.00**.
6. Clic **Emitir** → respuesta NubeFact: `aceptada_por_sunat: true`.
7. El cliente recibe el PDF por email. Se puede descargar XML y CDR desde la lista.

### Caso 2 — Registrar Ingreso de Inventario

**Actor:** Operador de almacén
**Flujo:**
1. Menú → **Inventario** → botón **Ingreso**.
2. Completar: Fecha, Almacén "Almacén Central", Producto "Cable HDMI 2m", Cantidad 50.
3. Guardar → movimiento registrado, visible en el listado con badge verde **Ingreso**.
4. El stock del producto se actualiza manualmente vía este movimiento.

### Caso 3 — Sincronizar Comprobantes Históricos desde NubeFact

**Actor:** Administrador
**Flujo:**
1. Menú → **Sincronización NubeFact** *(visible solo para admin)*.
2. Seleccionar tipo `01` (Factura), serie `F001`, rango del 1 al 100.
3. Clic **Sincronizar** → el sistema consulta cada comprobante en NubeFact API.
4. Resultado: "85 actualizados, 10 creados, 5 no encontrados".
5. Los comprobantes ahora aparecen en el listado de Boletas/Facturas con sus PDFs.

---

## 7. Errores y Validaciones

### Validación de datos inválidos

**Ejemplo:** Intentar emitir una factura sin RUC del cliente.

- El sistema bloquea el envío y muestra: `"El RUC del cliente es requerido para facturas"`.
- El campo RUC se resalta en rojo.
- No se realiza ninguna llamada a NubeFact hasta que se corrija.

### Sin permisos

**Ejemplo:** Un usuario con rol `user` intenta acceder a `/configuracion/empresa`.

- El frontend redirige automáticamente al Dashboard.
- Si accede directamente por URL, el componente `PrivateRoute` intercepta y redirige.
- En el backend, el middleware `role:admin` devuelve `HTTP 403 Forbidden`.

### Error controlado — NubeFact rechaza el comprobante

**Ejemplo:** SUNAT detecta que el número de serie ya fue usado.

- NubeFact responde con código de error y descripción.
- El sistema muestra el toast: `"Error NubeFact: El correlativo ya existe para esta serie"`.
- El comprobante no se guarda como emitido. El operador puede corregir la serie/número y reintentar.

### Error controlado — RUC no encontrado en SUNAT

**Ejemplo:** El operador ingresa un RUC inexistente al crear un cliente.

- La API de consulta RUC retorna vacío.
- El formulario muestra: `"RUC no encontrado. Verifica el número ingresado"`.
- Los campos de razón social y dirección no se autocompletan.

---

## 8. Variables de Entorno (.env.example)

El archivo `.env.example` en la raíz del proyecto contiene todas las variables necesarias para el backend. Las más importantes:

| Variable | Descripción |
|----------|-------------|
| `DB_CONNECTION=pgsql` | Motor de base de datos PostgreSQL |
| `DB_HOST / DB_PORT / DB_DATABASE` | Conexión a PostgreSQL |
| `NUBEFACT_BASE_URL` | Campo **RUTA** desde [nubofact.pse.pe/tokens](https://nubofact.pse.pe/tokens) |
| `NUBEFACT_TOKEN` | Campo **TOKEN** desde [nubofact.pse.pe/tokens](https://nubofact.pse.pe/tokens) |
| `NUBEFACT_MODE` | `demo` (pruebas) o `production` (SUNAT real) |
| `MAIL_USERNAME / MAIL_PASSWORD` | Cuenta Gmail + App Password (16 caracteres) |
| `GEMINI_API_KEY` | API Key de Google AI Studio para OCR inteligente |
| `MINIO_ENDPOINT / MINIO_KEY` | Conexión al storage MinIO |

Ver `.env.example` en la raíz para la lista completa con instrucciones por sección.
Ver [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) para configuración en producción (Debian 12).

---

## 9. Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Backend | Laravel 11 (PHP 8.2+) |
| Frontend | React 19 + TypeScript + Vite 7 |
| Base de datos | PostgreSQL 15 |
| UI | shadcn/ui + TailwindCSS 4 |
| Storage | MinIO (S3 compatible) |
| OCR | Python 3.12 + Tesseract / Google Gemini AI |
| Facturación electrónica | NubeFact API JSON V1 |
| Autenticación | Laravel Sanctum (Bearer tokens) |
| Servidor | Nginx + PHP-FPM en Debian 12 |

---

## 10. Requisitos Previos

- **Docker** + **Docker Compose** (para PostgreSQL, MinIO y servicio OCR)
- **PHP 8.2+** con extensiones: `pgsql`, `mbstring`, `xml`, `curl`, `zip`, `gd`, `fileinfo`
- **Composer 2.x**
- **Node.js 18 LTS** + npm
- **Cuenta NubeFact** con credenciales API ([nubefact.com](https://nubefact.com))
- **Gmail con App Password** para envío de emails ([myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords))
- **Google AI Studio API Key** (opcional, para OCR inteligente) ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

---

## 11. Inicio Rápido (Local)

```bash
# 1. Clonar repositorio
git clone https://github.com/diegomejiam/Nubofact-Web-y-Facturador.git
cd Nubofact-Web-y-Facturador

# 2. Levantar servicios Docker
docker compose up -d
# Inicia: PostgreSQL (5432), MinIO (9000/9001), OCR Service

# 3. Backend
cd backend
composer install
cp ../.env.example .env
# Editar .env con tus credenciales (ver sección 8 — Variables de Entorno)
php artisan key:generate
php artisan migrate
php artisan db:seed --class=CatalogosSunatSeeder
php artisan storage:link
php artisan serve

# 4. Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

**Accesos:**

| Servicio | URL | Credenciales |
|----------|-----|-------------|
| Frontend | http://localhost:5173 | — |
| API Backend | http://localhost:8000/api | Bearer token |
| MinIO Console | http://localhost:9001 | minio / minio123 |

---

## 12. Estructura del Proyecto

```
Nubofact-Web-y-Facturador/
├── .env.example               # Variables de entorno (backend) — sin credenciales reales
├── backend/                   # Laravel 11 — API REST
│   ├── app/
│   │   ├── Http/Controllers/Api/  # 31+ controladores REST
│   │   ├── Models/                # 32+ modelos Eloquent
│   │   ├── Services/              # NubefactClient, NubefactMapper, etc.
│   │   └── Mail/                  # ComprobanteEmitido (email automático)
│   ├── database/migrations/       # 40+ migraciones
│   ├── python_ocr/                # Servicio OCR (Dockerfile + Python)
│   ├── routes/api.php             # 100+ endpoints REST
│   └── .env.example               # Variables de entorno (copia de la raíz)
│
├── frontend/                  # React 19 + TypeScript + Vite
│   └── src/
│       ├── pages/             # 33+ páginas
│       ├── components/        # 50+ componentes (shadcn/ui)
│       └── lib/api.ts         # Cliente API centralizado
│
├── docs/                      # Documentación técnica completa
│   ├── README.md              # Índice de documentación
│   ├── ARQUITECTURA.md        # Estructura, modelos, endpoints
│   ├── DESPLIEGUE.md          # Instalación local y producción (Debian 12)
│   ├── OPERACION.md           # Logs, backups, troubleshooting
│   ├── CONTINUIDAD.md         # Patrones, deuda técnica, bugs conocidos
│   ├── NUBEFACT_API.md        # Documentación completa NubeFact JSON V1
│   ├── NUBEFACT DOC API JSON V1.pdf       # Manual oficial NubeFact API
│   └── API NUBEFACT - GUIA DE REMISIÓN.pdf  # Manual oficial GRE
│
├── examples/                  # 60+ ejemplos JSON de NubeFact
├── docker-compose.yml         # PostgreSQL + MinIO + OCR
└── README.md                  # Este archivo
```

---

## 13. Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Estructura directorios, 32 modelos BD, 100+ endpoints, flujo emisión CPE |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | Instalación en Debian 12 paso a paso, configuración SSL, Nginx, backups |
| [docs/OPERACION.md](docs/OPERACION.md) | Logs, reinicio servicios, backups PostgreSQL/MinIO, troubleshooting |
| [docs/CONTINUIDAD.md](docs/CONTINUIDAD.md) | Cómo agregar features, patrones del proyecto, deuda técnica, bugs |
| [docs/NUBEFACT_API.md](docs/NUBEFACT_API.md) | JSON completo de Factura, Boleta, NC, ND, GRE, sync masivo |
| [docs/NUBEFACT DOC API JSON V1.pdf](docs/NUBEFACT%20DOC%20API%20JSON%20V1.pdf) | Manual oficial NubeFact — API JSON V1 (fuente de verdad) |
| [docs/API NUBEFACT - GUIA DE REMISIÓN.pdf](docs/API%20NUBEFACT%20-%20GUIA%20DE%20REMISI%C3%93N.pdf) | Manual oficial NubeFact — Guías de Remisión Electrónica (GRE) |

---

## 14. Seguridad

- El archivo `.env` está en `.gitignore` — **nunca** subir credenciales reales al repositorio
- El `.env.example` contiene instrucciones pero **sin valores reales**
- El token NubeFact y la API key de Gemini solo van en variables de entorno del servidor
- Rotar el token NubeFact periódicamente desde el panel de nubefact.com
- Los endpoints de administración están protegidos con middleware `role:admin` en el backend
