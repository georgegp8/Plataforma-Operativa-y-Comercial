# Plataforma Operativa y Comercial con Facturación Electrónica

**Desarrollador:** George Guerra Pacheco — george.guerra@tecsup.edu.pe
**Institución:** Tecsup
**Estado:** MVP — Producción (modo demo)
**Versión:** v1.0

Sistema web fullstack para gestión comercial y emisión de comprobantes electrónicos certificados por SUNAT (Perú), integrado con **NubeFact API** como Proveedor de Servicios Electrónicos (PSE). Permite emitir Facturas, Boletas, Notas de Crédito/Débito y Guías de Remisión Electrónicas con generación automática de XML, CDR y PDF.

---

## Stack Tecnológico

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

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Facturación electrónica | Emisión de Facturas (01), Boletas (03), NC (07), ND (08) vía NubeFact + SUNAT |
| Guías de Remisión | GRE Remitente (tipo 7) y Transportista (tipo 8) |
| Clientes / Proveedores | CRUD de entidades con búsqueda por RUC/DNI |
| Productos e Inventario | Catálogo, stock, movimientos ingreso/salida, alertas mínimo |
| Productos Compuestos | Paquetes y ofertas combinadas |
| Gestión Comercial | Oportunidades, pagos, SLA, alertas |
| Compras | Órdenes de compra, digitalización OCR de facturas |
| Finanzas | Bancos, cuentas bancarias, transacciones |
| Dashboard | Métricas en tiempo real, rankings, comparativas mensuales |
| Configuración | Empresa (multi-RUC), series, vendedores, vehículos, conductores |
| Sincronización NubeFact | Importación masiva de comprobantes históricos desde NubeFact |
| Digitalización OCR | Extracción de datos de facturas escaneadas (Tesseract + Gemini AI) |

---

## Requisitos Previos

- **Docker** + **Docker Compose** (para PostgreSQL, MinIO y servicio OCR)
- **PHP 8.2+** con extensiones: `pgsql`, `mbstring`, `xml`, `curl`, `zip`, `gd`, `fileinfo`
- **Composer 2.x**
- **Node.js 18 LTS** + npm
- **Cuenta NubeFact** con credenciales API ([nubefact.com](https://nubefact.com))
- **Gmail con App Password** para envío de emails ([myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords))
- **Google AI Studio API Key** (opcional, para OCR inteligente) ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

---

## Inicio Rápido (Local)

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
cp .env.example .env
# Editar .env con tus credenciales (ver .env.example para instrucciones)
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

## Estructura del Proyecto

```
Plataforma_Op_Com_Facturacion_Elect/
├── backend/                   # Laravel 11 — API REST
│   ├── app/
│   │   ├── Http/Controllers/Api/  # 31 controladores REST
│   │   ├── Models/                # 32 modelos Eloquent
│   │   ├── Services/              # NubefactClient, NubefactMapper, etc.
│   │   └── Mail/                  # ComprobanteEmitido (email automático)
│   ├── database/migrations/       # 40+ migraciones
│   ├── python_ocr/                # Servicio OCR (Dockerfile + Python)
│   ├── routes/api.php             # 100+ endpoints REST
│   └── .env.example               # Variables de entorno documentadas
│
├── frontend/                  # React 19 + TypeScript + Vite
│   └── src/
│       ├── pages/             # 33 páginas
│       ├── components/        # 50+ componentes (shadcn/ui)
│       └── lib/api.ts         # Cliente API centralizado
│
├── docs/                      # Documentación técnica completa
│   ├── README.md              # Índice de documentación
│   ├── ARQUITECTURA.md        # Estructura, modelos, endpoints
│   ├── DESPLIEGUE.md          # Instalación local y producción (Debian 12)
│   ├── OPERACION.md           # Logs, backups, troubleshooting
│   ├── CONTINUIDAD.md         # Patrones, deuda técnica, bugs conocidos
│   └── NUBEFACT_API.md        # Documentación completa NubeFact JSON V1
│
├── examples/                  # 60+ ejemplos JSON de NubeFact
├── docker-compose.yml         # PostgreSQL + MinIO + OCR
└── README.md                  # Este archivo
```

---

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Estructura directorios, 32 modelos BD, 100+ endpoints, flujo emisión CPE |
| [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) | Instalación en Debian 12 paso a paso, configuración SSL, Nginx, backups |
| [docs/OPERACION.md](docs/OPERACION.md) | Logs, reinicio servicios, backups PostgreSQL/MinIO, troubleshooting |
| [docs/CONTINUIDAD.md](docs/CONTINUIDAD.md) | Cómo agregar features, patrones del proyecto, deuda técnica, bugs |
| [docs/NUBEFACT_API.md](docs/NUBEFACT_API.md) | JSON completo de Factura, Boleta, NC, ND, GRE, sync masivo |

---

## Seguridad

- El archivo `.env` está en `.gitignore` — **nunca** subir credenciales reales al repositorio
- El `.env.example` contiene instrucciones pero **sin valores reales**
- El token NubeFact y la API key de Gemini solo van en variables de entorno del servidor
- Rotar el token NubeFact periódicamente desde el panel de nubefact.com
