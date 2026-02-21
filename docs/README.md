# Plataforma Operativa y Comercial con Facturación Electrónica

**Desarrollador:** George Guerra Pacheco — george.guerra@tecsup.edu.pe
**Institución:** Tecsup
**Estado:** MVP en producción (modo demo)
**Última actualización:** Febrero 2026

---

## Descripción

Sistema web fullstack para gestión comercial y emisión de comprobantes electrónicos certificados por SUNAT (Perú), integrado con **NubeFact API** como Proveedor de Servicios Electrónicos (PSE).

Permite a una empresa emitir Facturas, Boletas, Notas de Crédito/Débito y Guías de Remisión Electrónicas directamente a SUNAT, con almacenamiento automático de XML, CDR y PDF. Incluye gestión de clientes, inventario, comercial, compras, finanzas y digitalización OCR de documentos.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Backend | Laravel 11 (PHP >= 8.2) |
| Frontend | React 19 + TypeScript + Vite 7 |
| Base de datos | PostgreSQL 15 |
| UI | shadcn/ui + TailwindCSS 4 |
| Storage | MinIO (S3 compatible) |
| OCR | Python 3.12 + Tesseract (Docker) |
| Facturación electrónica | NubeFact API JSON V1 |
| Autenticación | Laravel Sanctum (tokens Bearer) |

---

## Módulos del Sistema

| Módulo | Descripción |
|--------|-------------|
| Facturación electrónica | Facturas (01), Boletas (03), NC (07), ND (08) vía NubeFact |
| Guías de Remisión | GRE Remitente (tipo 7) y Transportista (tipo 8) |
| Clientes / Proveedores | CRUD de entidades con búsqueda por RUC/DNI |
| Productos | Catálogo con stock, categorías, marcas, atributos, destacados |
| Inventario | Movimientos ingreso/salida, alertas stock mínimo |
| Productos Compuestos | Paquetes y ofertas combinadas |
| Gestión Comercial | Oportunidades, seguimiento de pagos, SLA, alertas |
| Compras | Órdenes de compra, digitalización OCR de facturas |
| Finanzas | Bancos, cuentas bancarias, transacciones |
| Dashboard | Métricas, rankings top productos/clientes, comparativas mensuales |
| Configuración | Empresa (multi-RUC), series, vendedores, vehículos, conductores |
| Sincronización NubeFact | Importación masiva de comprobantes históricos desde NubeFact |
| Digitalización OCR | Extracción de datos de facturas escaneadas con Tesseract |

---

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [ARQUITECTURA.md](ARQUITECTURA.md) | Estructura del proyecto, modelos, endpoints, base de datos |
| [DESPLIEGUE.md](DESPLIEGUE.md) | Instalación local y en servidor de producción (Debian 12) |
| [OPERACION.md](OPERACION.md) | Logs, backups, reinicio de servicios, troubleshooting |
| [CONTINUIDAD.md](CONTINUIDAD.md) | Cómo seguir desarrollando, deuda técnica, bugs conocidos |
| [NUBEFACT_API.md](NUBEFACT_API.md) | Integración completa con NubeFact API JSON V1 |

### Documentación Oficial NubeFact (PDFs de referencia)

> Estos PDFs son los manuales oficiales proporcionados por NubeFact. Son la fuente de verdad para el formato JSON de los comprobantes y guías de remisión.

| Documento | Contenido |
|-----------|-----------|
| [NUBEFACT DOC API JSON V1.pdf](NUBEFACT%20DOC%20API%20JSON%20V1.pdf) | Manual oficial de la API JSON V1 de NubeFact — estructura completa de todos los tipos de comprobante (Factura, Boleta, NC, ND), campos obligatorios, catálogos SUNAT, ejemplos de request/response |
| [API NUBEFACT - GUIA DE REMISIÓN.pdf](API%20NUBEFACT%20-%20GUIA%20DE%20REMISI%C3%93N.pdf) | Manual oficial de Guías de Remisión Electrónica (GRE) — tipos 7 (Remitente) y 8 (Transportista), campos de traslado, vehículos, conductores, ubigeos y modalidades de transporte |

---

## Inicio Rápido (Local)

```bash
# 1. Clonar repositorio
git clone <url-repo>
cd Plataforma_Op_Com_Facturacion_Elect

# 2. Levantar servicios Docker (PostgreSQL + MinIO + OCR)
docker-compose up -d

# 3. Backend
cd backend
composer install
cp .env.example .env
# Editar .env con credenciales (ver DESPLIEGUE.md)
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

**Accesos locales:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- MinIO Console: http://localhost:9001 (usuario: `minio` / contraseña: `minio123`)

---

## Variables de Entorno Esenciales

```env
# Base de datos PostgreSQL (Docker local)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=plataforma_facturacion
DB_USERNAME=postgres
DB_PASSWORD=postgres123

# NubeFact (obtener credenciales en nubefact.com)
NUBEFACT_BASE_URL=https://api.pse.pe/api/v1/{ruc_key}
NUBEFACT_TOKEN=eyJhbGciOiJIUzI1NiJ9...
NUBEFACT_MODE=demo        # cambiar a 'production' en producción
NUBEFACT_AUTO_SUNAT=true

# Email automático (Gmail con App Password de 16 caracteres)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=correo@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_ENCRYPTION=tls

# Storage MinIO (Docker local)
FILESYSTEM_DISK=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_KEY=minio
MINIO_SECRET=minio123
MINIO_BUCKET=facturacion
```

Ver [DESPLIEGUE.md](DESPLIEGUE.md) para lista completa y configuración de producción.

---

## Autor

**George Guerra Pacheco**
george.guerra@tecsup.edu.pe — Tecsup, 2026
