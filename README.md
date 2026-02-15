# Plataforma Operativa y Comercial con Facturación Electrónica

## 🎯 Descripción

Sistema integral de gestión comercial y facturación electrónica integrado con **NubeFact API** (proveedor SUNAT Perú). Permite la emisión de comprobantes electrónicos, guías de remisión, gestión de oportunidades, control de SLA y administración multiempresa.

## 🚀 Características Principales

- ✅ **Facturación Electrónica vía NubeFact**
  - Facturas (01), Boletas (03)
  - Notas de Crédito (07) y Débito (08)
  - Guías de Remisión Electrónica (07, 08)
  - Integración con API JSON V1 de NubeFact
  - Generación automática de XML, CDR y PDF por NubeFact
  - Sincronización automática de estados SUNAT
  - QR obligatorio y PDF417 incluidos

- 🏢 **Multiempresa (Multi-RUC)**
  - Gestión de múltiples empresas emisoras
  - Certificados y credenciales independientes por empresa
  - Aislamiento total de datos

- 📊 **Gestión Comercial**
  - Oportunidades de negocio
  - Control de SLA
  - Gestión documental
  - Seguimiento de pagos
  - Dashboards en tiempo real

- 🔄 **Sincronización NubeFact**
  - Comando artisan para sync batch
  - Actualización automática de estados SUNAT
  - Almacenamiento local de respuestas API

## 🛠 Stack Tecnológico

### Backend
- **PHP** >= 8.2
- **Laravel** 11.x
- **PostgreSQL** 15+ (via Docker)
- **NubeFact API** (JSON V1)
- **MinIO** (almacenamiento S3 compatible)

### Frontend
- **React** 18+
- **TypeScript**
- **shadcn/ui** + TailwindCSS
- **Vite**

### Infraestructura Docker
- **PostgreSQL** 15-alpine (puerto 5432)
- **MinIO** (puertos 9000 API, 9001 Console)
- **Docker Compose** para orquestación

### Storage
- **MinIO** (S3 compatible) para documentos adjuntos
- **NubeFact Cloud** para XML/PDF/CDR de comprobantes

## 📋 Requisitos Previos

- **Docker Desktop** (para PostgreSQL + MinIO + OCR Service)
- **PHP >= 8.2** con extensiones:
  - pgsql, pdo_pgsql
  - openssl, zip, curl
  - mbstring, xml
- **Composer** >= 2.0
- **Node.js** >= 18
- **Cuenta NubeFact** (obtener en [nubefact.com](https://nubefact.com))

### ✅ ¿Puedo hacer pruebas locales con Docker?

**SÍ** - Todos los servicios funcionan completamente en local:

- ✅ **PostgreSQL** - Base de datos completa
- ✅ **MinIO** - Almacenamiento de archivos (compatible con S3)
- ✅ **OCR Service** - Reconocimiento de documentos con Tesseract
  - Procesa PDFs/imágenes sin conexión a internet
  - Confianza 85-90% en facturas reales
  - Gratis e ilimitado
  - Ver [docs/ocr/](docs/ocr/) para más detalles

**Solo necesitas internet para:**
- NubeFact API (emisión de comprobantes a SUNAT)
- Descargar dependencias iniciales (composer, npm)

## ⚙️ Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/Plataforma_Op_Com_Facturacion_Elect.git
cd Plataforma_Op_Com_Facturacion_Elect
```

### 2. **Iniciar servicios Docker**

```bash
# Levantar PostgreSQL + MinIO
docker-compose up -d

# Verificar que estén corriendo
docker ps
```

**Servicios disponibles:**
- PostgreSQL: `localhost:5432`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001` (minio/minio123)

### 3. Instalar dependencias del backend

```bash
cd backend
composer install
```

### 4. Configurar variables de entorno

```bash
cp .env.example .env
php artisan key:generate
```

**Configurar NubeFact en `.env`:**
```env
NUBEFACT_BASE_URL=https://api.pse.pe/api/v1/{tu_ruc_key}
NUBEFACT_TOKEN=tu_token_jwt_aqui
NUBEFACT_AUTO_SUNAT=true
NUBEFACT_PDF_FORMAT=A4
```

Ver `backend/INTEGRACION_NUBEFACT.md` para documentación completa de NubeFact.

Editar `backend/.env` con las configuraciones Docker:

```env
# Base de datos PostgreSQL (Docker)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=plataforma_facturacion
DB_USERNAME=postgres
DB_PASSWORD=postgres123

# MinIO S3 Storage (Docker)
FILESYSTEM_DISK=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_KEY=minio
MINIO_SECRET=minio123
MINIO_BUCKET=facturacion
MINIO_USE_PATH_STYLE_ENDPOINT=true
```

### 5. Configurar base de datos

```bash
# Ejecutar migraciones
php artisan migrate

# Poblar catálogos SUNAT
php artisan db:seed --class=CatalogosSunatSeeder
```

### 6. Crear enlace simbólico para storage

```bash
php artisan storage:link
```

### 7. Verificar integración NubeFact

```bash
# Ejecutar tests de integración
vendor/bin/phpunit tests/Feature/NubefactIntegrationTest.php --filter test_mapear

# Test manual (opcional - requiere credenciales reales)
php artisan tinker
>>> app(\App\Services\NubefactClient::class)->validarCredenciales();
```

### 8. Iniciar servidor de desarrollo

```bash
# Backend Laravel
php artisan serve
# Disponible en: http://127.0.0.1:8000

# Verificar API
curl http://127.0.0.1:8000/api/facturacion/comprobantes
```

## 📡 Endpoints API Principales

### Facturación

```bash
# Listar comprobantes
GET /api/facturacion/comprobantes

# Emitir con NubeFact
POST /api/nubefact/comprobantes
Body: {"comprobante_id": 123}

# Consultar estado
GET /api/nubefact/comprobantes/{tipo}/{serie}/{numero}

# Anular comprobante
DELETE /api/nubefact/comprobantes/{tipo}/{serie}/{numero}
Body: {"motivo": "Error en datos"}
```

### Guías de Remisión

```bash
# Emitir guía
POST /api/nubefact/guias
Body: {"guia_id": 456}

# Consultar estado
GET /api/nubefact/guias/{tipo}/{serie}/{numero}
```

### Sincronización

```bash
# Sincronizar comprobantes pendientes
php artisan nubefact:sync --pendientes

# Sincronizar por fecha
php artisan nubefact:sync --desde=2026-01-01 --hasta=2026-01-31

# Sincronizar empresa específica
php artisan nubefact:sync --empresa=1
```

## 🐳 Gestión de Docker

### Comandos útiles

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar servicios
docker-compose down

# Reiniciar servicios
docker-compose restart

# Eliminar datos (CUIDADO: borra la BD)
docker-compose down -v
```

### Acceso a contenedores

```bash
# PostgreSQL
docker exec -it facturacion_postgres psql -U postgres -d plataforma_facturacion

# MinIO (navegador)
# http://localhost:9001
# Usuario: minio
# Contraseña: minio123
```

### 6. Instalar dependencias del frontend

```bash
cd resources/js
npm install
```

### 7. Iniciar servicios

#### Terminal 1 - Backend
```bash
php artisan serve
```

#### Terminal 2 - Frontend
```bash
npm run dev
```

#### Terminal 3 - MinIO (opcional, si es local)
```bash
minio server ./minio-data --console-address ":9001"
```

## 📁 Estructura del Proyecto

```
Plataforma_Op_Com_Facturacion_Elect/
├── backend/
│   ├── app/
│   │   ├── Console/Commands/
│   │   │   └── NubefactSyncCommand.php
│   │   ├── Http/Controllers/Api/
│   │   │   ├── FacturacionController.php
│   │   │   ├── NubefactController.php      ← Emisión NubeFact
│   │   │   ├── EmpresaController.php
│   │   │   └── OportunidadController.php
│   │   ├── Models/
│   │   │   ├── Empresa.php
│   │   │   ├── Comprobante.php             ← Con campos NubeFact
│   │   │   ├── GuiaRemision.php            ← Nuevo modelo GRE
│   │   │   └── Oportunidad.php
│   │   └── Services/
│   │       ├── NubefactClient.php          ← Cliente API
│   │       ├── NubefactMapper.php          ← Conversión datos
│   │       └── FacturacionService.php
│   ├── config/
│   │   ├── nubefact.php                    ← Config NubeFact
│   │   └── logging.php                     ← Canal nubefact
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── *_add_nubefact_fields_to_comprobantes_table.php
│   │   │   └── *_create_guia_remisions_table.php
│   │   └── seeders/
│   │       └── CatalogosSunatSeeder.php
│   ├── tests/Feature/
│   │   └── NubefactIntegrationTest.php
│   ├── INTEGRACION_NUBEFACT.md             ← Documentación completa
│   └── .env
├── frontend/
│   └── src/
│       ├── components/
│       └── pages/
├── examples/                                ← 60+ ejemplos JSON NubeFact
│   ├── EJEMPLO JSON GENERAR CPE FACTURA 1 GRAVADA.txt
│   └── NubeFact-json.php
├── docker-compose.yml
└── README.md
```

## 🔐 Seguridad

- ⚠️ **NUNCA** subir tokens NubeFact al repositorio
- ⚠️ **NUNCA** commitear archivos `.env` con credenciales reales
- ✅ Usar variables de entorno para credenciales
- ✅ Rotar tokens NubeFact periódicamente
- ✅ Implementar roles y permisos (próximo paso)
- ✅ Auditoría completa de emisiones (logs en `storage/logs/nubefact-*.log`)

## 📚 Documentación

- **[Integración NubeFact](./backend/INTEGRACION_NUBEFACT.md)** ← Documentación completa API
- [Requerimientos del MVP](./requerimientos-mvp.md)
- [Catálogos SUNAT](https://cpe.sunat.gob.pe/node/88)
- [NubeFact Docs](https://nubefact.com/soporte)
- Manuales PDF en raíz del proyecto

## 🧪 Testing

```bash
# Backend (Laravel)
cd backend
vendor/bin/phpunit

# Tests específicos de NubeFact
vendor/bin/phpunit tests/Feature/NubefactIntegrationTest.php

# Frontend (React)
cd frontend
npm run test
```

## 🚀 Deployment (Despliegue en Servidor)

### Requisitos del Servidor

**Servidor recomendado:**
- Ubuntu 22.04 LTS o superior
- 2 CPU cores mínimo (4 recomendado)
- 4GB RAM mínimo (8GB recomendado)
- 20GB disco SSD
- Nginx o Apache
- Certbot para SSL (Let's Encrypt)

**Software requerido:**
- PHP 8.2+ con extensiones: pgsql, mbstring, xml, curl, zip, gd
- PostgreSQL 15+
- Node.js 18+ y npm
- Composer 2.x
- Supervisor (para colas)
- Certbot (para SSL)

---

### 1. Preparar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar PHP 8.2 y extensiones
sudo apt install -y php8.2 php8.2-fpm php8.2-pgsql php8.2-mbstring \
  php8.2-xml php8.2-curl php8.2-zip php8.2-gd php8.2-cli

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Instalar Nginx
sudo apt install -y nginx

# Instalar Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Supervisor (para colas)
sudo apt install -y supervisor

# Instalar Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

---

### 2. Configurar Base de Datos PostgreSQL

```bash
# Conectar a PostgreSQL
sudo -u postgres psql

# Crear base de datos y usuario
CREATE DATABASE plataforma_facturacion;
CREATE USER facturacion_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE plataforma_facturacion TO facturacion_user;
\q
```

---

### 3. Clonar y Configurar el Proyecto

```bash
# Ir al directorio de aplicaciones
cd /var/www

# Clonar el repositorio
sudo git clone https://github.com/tu-usuario/Plataforma_Op_Com_Facturacion_Elect.git
sudo chown -R www-data:www-data Plataforma_Op_Com_Facturacion_Elect
cd Plataforma_Op_Com_Facturacion_Elect

# Backend
cd backend
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

**Configurar `.env` de producción:**

```env
# Aplicación
APP_NAME="Sistema de Facturación"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tudominio.com

# Base de datos
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=plataforma_facturacion
DB_USERNAME=facturacion_user
DB_PASSWORD=tu_password_seguro

# NubeFact API (PRODUCCIÓN)
NUBEFACT_BASE_URL=https://api.nubefact.com/api/v1/{tu_ruc_key}
NUBEFACT_TOKEN=tu_token_produccion_aqui
NUBEFACT_MODE=production
NUBEFACT_AUTO_SUNAT=true

# Email (Gmail) - Ver backend/CONFIGURACION_EMAIL.md
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=tu-email@gmail.com
MAIL_PASSWORD=tu_app_password_aqui
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=tu-email@gmail.com
MAIL_FROM_NAME="${APP_NAME}"

# Colas (opcional - usar database o redis)
QUEUE_CONNECTION=database

# Storage (MinIO o S3)
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=facturacion-prod
AWS_URL=https://tu-bucket.s3.amazonaws.com
```

**Ejecutar migraciones y optimizaciones:**

```bash
# Migraciones
php artisan migrate --force

# Seeders (catálogos SUNAT)
php artisan db:seed --class=CatalogosSunatSeeder

# Storage
php artisan storage:link

# Optimizaciones de producción
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

# Permisos
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

---

### 4. Configurar Email Automático

Consulta **[backend/CONFIGURACION_EMAIL.md](backend/CONFIGURACION_EMAIL.md)** para:
- Generar App Password de Gmail
- Configurar SMTP
- Probar envío de emails

---

### 5. Build del Frontend

```bash
cd frontend
npm ci --production
npm run build

# Los archivos se generan en frontend/dist/
# Nginx los servirá desde aquí
```

---

### 6. Configurar Nginx

Crear archivo `/etc/nginx/sites-available/facturacion`:

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    # Redirigir a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tudominio.com www.tudominio.com;

    # SSL (Certbot lo configurará automáticamente)
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

    # Root del frontend (React build)
    root /var/www/Plataforma_Op_Com_Facturacion_Elect/frontend/dist;
    index index.html;

    # Logs
    access_log /var/log/nginx/facturacion_access.log;
    error_log /var/log/nginx/facturacion_error.log;

    # Frontend (SPA React)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Laravel
    location /api {
        alias /var/www/Plataforma_Op_Com_Facturacion_Elect/backend/public;
        try_files $uri $uri/ @backend;

        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME /var/www/Plataforma_Op_Com_Facturacion_Elect/backend/public/index.php;
            include fastcgi_params;
        }
    }

    location @backend {
        rewrite /api/(.*)$ /index.php?/$1 last;
    }

    # Archivos estáticos
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Activar sitio y SSL:**

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/facturacion /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Configurar SSL con Certbot
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# Auto-renovación (certbot lo configura automáticamente)
sudo certbot renew --dry-run
```

---

### 7. Configurar Cron Jobs

Editar crontab del usuario www-data:

```bash
sudo crontab -e -u www-data
```

Agregar:

```cron
# Laravel Scheduler (ejecuta cada minuto)
* * * * * cd /var/www/Plataforma_Op_Com_Facturacion_Elect/backend && php artisan schedule:run >> /dev/null 2>&1

# Sincronización NubeFact (cada hora)
0 * * * * cd /var/www/Plataforma_Op_Com_Facturacion_Elect/backend && php artisan nubefact:sync --pendientes >> /var/log/nubefact-sync.log 2>&1

# Limpiar logs antiguos (cada semana)
0 0 * * 0 cd /var/www/Plataforma_Op_Com_Facturacion_Elect/backend && php artisan log:clear --days=30 >> /dev/null 2>&1
```

---

### 8. Configurar Supervisor (Colas)

Si usas colas de Laravel, crear archivo `/etc/supervisor/conf.d/facturacion-worker.conf`:

```ini
[program:facturacion-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/Plataforma_Op_Com_Facturacion_Elect/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/supervisor/facturacion-worker.log
stopwaitsecs=3600
```

**Iniciar Supervisor:**

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start facturacion-worker:*
```

---

### 9. Verificación Post-Deploy

```bash
# Verificar servicios
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status php8.2-fpm
sudo systemctl status supervisor

# Probar API
curl https://tudominio.com/api/facturacion/comprobantes

# Ver logs en tiempo real
tail -f /var/log/nginx/facturacion_error.log
tail -f /var/www/Plataforma_Op_Com_Facturacion_Elect/backend/storage/logs/laravel.log
```

---

### 10. Actualizaciones Futuras

```bash
# En el servidor
cd /var/www/Plataforma_Op_Com_Facturacion_Elect

# Pull cambios
sudo -u www-data git pull origin main

# Backend
cd backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Frontend
cd ../frontend
npm ci --production
npm run build

# Reiniciar servicios
sudo systemctl restart php8.2-fpm
sudo systemctl reload nginx
sudo supervisorctl restart facturacion-worker:*
```

---

### 📋 Checklist de Producción

- [ ] SSL/HTTPS configurado con Certbot
- [ ] `.env` con credenciales de producción
- [ ] `APP_DEBUG=false` en `.env`
- [ ] Base de datos PostgreSQL creada y migrada
- [ ] Permisos correctos (www-data) en storage/
- [ ] Email configurado y probado (ver `CONFIGURACION_EMAIL.md`)
- [ ] NubeFact API en modo producción
- [ ] Cron jobs configurados
- [ ] Supervisor corriendo (si usas colas)
- [ ] Nginx configurado y probado
- [ ] Backups automáticos de BD configurados
- [ ] Monitoreo de logs activo
- [ ] Firewall configurado (ufw)

---

### 🔒 Seguridad Adicional

```bash
# Configurar firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Deshabilitar listado de directorios en Nginx
# (ya está en la config de arriba con try_files)

# Cambiar permisos sensibles
chmod 600 /var/www/Plataforma_Op_Com_Facturacion_Elect/backend/.env

# Fail2ban (opcional - protección contra ataques)
sudo apt install fail2ban
```

---

### 📊 Monitoreo y Logs

```bash
# Logs de aplicación
tail -f backend/storage/logs/laravel.log
tail -f backend/storage/logs/nubefact-*.log

# Logs de Nginx
tail -f /var/log/nginx/facturacion_error.log

# Logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Monitoreo de recursos
htop
df -h
```

## 📚 Documentación

Para documentación detallada, consulta la carpeta [`docs/`](docs/):

### 📖 Documentación Principal
- **[docs/README.md](docs/README.md)** - Índice completo de documentación
- **[REQUERIMIENTOS.md](REQUERIMIENTOS.md)** - Requerimientos del MVP
- **[PENDIENTES.md](PENDIENTES.md)** - Estado actual y tareas pendientes

### 🧾 NubeFact (Facturación Electrónica)
- [Migración a NubeFact](docs/nubefact/MIGRACION_NUBEFACT_COMPLETADA.md)
- [API de Sincronización](docs/nubefact/API_SINCRONIZACION_NUBEFACT.md)
- [Sincronización Completa](docs/nubefact/SINCRONIZACION_COMPLETA_IMPLEMENTADA.md)

### 🔍 OCR (Reconocimiento de Documentos)
- **[Setup con Docker](docs/ocr/DOCKER_OCR_SETUP.md)** - Guía completa
- [Estado de Instalación](docs/ocr/COMPLETADO.md) - ✅ Funcionando
- [Opciones de Deployment](docs/ocr/DEPLOYMENT.md)

### 🎨 Desarrollo
- [Mejoras de Interface](docs/desarrollo/MEJORAS_INTERFACE_DESIGN.md)
- [Optimizaciones Aplicadas](docs/desarrollo/OPTIMIZACIONES_APLICADAS.md)
- [Diseño Figma](docs/desarrollo/APLICACION_DISENO_FIGMA.md)

## 🤝 Contribución

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: add some amazing feature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Convenciones de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bugs
- `docs:` Cambios en documentación
- `style:` Formato, punto y coma faltantes, etc
- `refactor:` Refactorización de código
- `test:` Añadir tests
- `chore:` Actualización de tareas de build, configs, etc
- `refactor:` Refactorización de código
- `test:` Añadir tests
- `chore:` Tareas de mantenimiento

## 📄 Licencia

Este proyecto es privado y propietario.

## 👥 Autor

**George Guerra Pacheco**  
📧 george.guerra@tecsup.edu.pe  
🎓 Tecsup

Desarrollado como parte del proyecto de Plataforma Operativa y Comercial con Facturación Electrónica integrada con SUNAT (Perú).

---

**⚡ Powered by Laravel + NubeFact + React + shadcn/ui**
