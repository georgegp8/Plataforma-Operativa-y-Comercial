# Backend — Plataforma Operativa y Comercial con Facturación Electrónica

API REST construida con **Laravel 11 + PHP 8.2** para la gestión de comprobantes electrónicos (SUNAT/NubeFact), inventario, clientes, compras, finanzas y digitalización OCR.

---

## Requisitos

- PHP 8.2+ con extensiones: `pgsql`, `pdo_pgsql`, `mbstring`, `xml`, `curl`, `zip`, `gd`, `fileinfo`, `bcmath`, `intl`
- Composer 2.x
- PostgreSQL 15+
- Docker + Docker Compose (para MinIO y servicio OCR)

---

## Configuración rápida (local)

```bash
# Desde la raíz del proyecto — levantar servicios Docker primero
docker compose up -d

cd backend
composer install
cp .env.example .env
# Editar .env con tus credenciales (DB, NubeFact, Gmail, Gemini, MinIO)
php artisan key:generate
php artisan migrate
php artisan db:seed --class=CatalogosSunatSeeder
php artisan storage:link
php artisan serve   # http://localhost:8000
```

> Ver [docs/DESPLIEGUE.md](../docs/DESPLIEGUE.md) para el despliegue completo en Debian 12.

---

## Variables de entorno clave

| Variable | Descripción |
|----------|-------------|
| `DB_CONNECTION=pgsql` | Motor PostgreSQL |
| `DB_HOST / DB_PORT / DB_DATABASE` | Conexión a la BD |
| `NUBEFACT_BASE_URL` | URL de la API NubeFact (campo RUTA en el panel) |
| `NUBEFACT_TOKEN` | JWT de autenticación NubeFact (campo TOKEN en el panel) |
| `NUBEFACT_MODE` | `demo` (pruebas) o `production` (SUNAT real) |
| `MAIL_MAILER` | `log` en local / `smtp` en producción con Gmail App Password |
| `GEMINI_API_KEY` | API Key de Google AI Studio (OCR inteligente) |
| `MINIO_ENDPOINT / MINIO_KEY / MINIO_SECRET` | Conexión al storage MinIO |

---

## Estructura principal

```
backend/
├── app/
│   ├── Http/Controllers/Api/   # 31+ controladores REST
│   ├── Models/                 # 32+ modelos Eloquent
│   ├── Services/               # NubefactClient, NubefactSyncService, NubefactMapper, OCR
│   └── Mail/                   # ComprobanteEmitido (email automático al cliente)
├── database/
│   ├── migrations/             # 40+ migraciones
│   └── seeders/                # CatalogosSunatSeeder (catálogos SUNAT obligatorios)
├── python_ocr/                 # Servicio OCR (Dockerfile + Python 3.12 + Tesseract/Gemini)
├── routes/api.php              # 100+ endpoints REST
└── .env.example                # Variables de entorno de referencia
```

---

## Endpoints principales

| Prefijo | Descripción |
|---------|-------------|
| `POST /api/auth/login` | Login — devuelve Bearer token |
| `GET /api/v1/empresas` | Listado de empresas |
| `GET /api/facturacion/comprobantes` | Listado de CPE emitidos |
| `POST /api/nubefact/comprobantes` | Emitir comprobante (Factura/Boleta/NC/ND) |
| `POST /api/nubefact/guias` | Emitir Guía de Remisión |
| `POST /api/nubefact/guias/sincronizar-rango` | Sincronizar GRE desde NubeFact |
| `POST /api/nubefact-sync/rango` | Sincronizar CPE históricos desde NubeFact |
| `GET /api/v1/productos` | Catálogo de productos |
| `GET /api/v1/movimientos-inventario` | Movimientos de inventario |
| `GET /api/v1/productos-compuestos` | Productos compuestos (ofertas) |
| `GET /api/v1/entidades` | Clientes y proveedores |
| `GET /api/v1/compras` | Compras a proveedores |
| `POST /api/v1/documentos-digitalizados/upload` | Subir documento para OCR |

> Ver [docs/ARQUITECTURA.md](../docs/ARQUITECTURA.md) para la lista completa de endpoints.

---

## Autenticación

Todos los endpoints (excepto `/auth/login` y `/auth/register`) requieren:

```
Authorization: Bearer <token>
```

El token se obtiene del login y se guarda en el frontend. Los endpoints de administración usan además el middleware `role:admin`.

---

## Importar base de datos existente

```bash
# Backup desde DBeaver: Format=Plain, Use SQL INSERT, No owner, No privileges
# Transferir el .sql al servidor y ejecutar:

BACKUP=$(find /home -name "dump-plataforma_facturacion-*.sql" 2>/dev/null | head -1)
php artisan migrate:fresh --force
php artisan db:seed --class=CatalogosSunatSeeder
grep "^INSERT INTO" "$BACKUP" > /tmp/data_only.sql
psql -h 127.0.0.1 -U facturacion_user -d plataforma_facturacion < /tmp/data_only.sql
php artisan config:clear
```
