# Guía de Despliegue

> **Sistema operativo del servidor:** Debian 12 (Bookworm)

---

## A. Requisitos del Entorno

### Hardware mínimo (servidor)
- CPU: 2 cores (4 recomendado)
- RAM: 4 GB (8 GB recomendado)
- Disco: 20 GB SSD

### Sistema operativo
**Debian 12 "Bookworm"** (la distribución que usa la empresa)

### Software necesario

| Software | Versión | Notas |
|----------|---------|-------|
| PHP | 8.2+ | Requiere repo externo sury.org en Debian 12 |
| Composer | 2.x | Gestor de paquetes PHP |
| Node.js | 18 LTS | Requiere repo nodesource |
| PostgreSQL | 15+ | Requiere repo oficial PGDG |
| Nginx | Última estable | Disponible en repo Debian base |
| Docker + Docker Compose | 24+ | Requiere repo oficial Docker |
| Certbot + plugin Nginx | Última estable | Disponible en repo Debian base |
| ufw | — | Firewall (no viene por defecto en Debian) |

### Extensiones PHP requeridas
`pgsql`, `pdo_pgsql`, `openssl`, `zip`, `curl`, `mbstring`, `xml`, `gd`, `fileinfo`

### Puertos que deben estar abiertos

| Puerto | Servicio |
|--------|----------|
| 22 | SSH |
| 80 | HTTP → redirige a HTTPS |
| 443 | HTTPS (frontend + API) |
| 5432 | PostgreSQL (solo acceso local) |
| 9000 | MinIO API (opcional si externo) |
| 9001 | MinIO Console (opcional si externo) |

---

## B. Credenciales y Accesos Externos (Obtener Antes de Desplegar)

Antes de iniciar, se deben tener listos:

### 1. Credenciales NubeFact (PSE SUNAT)

1. Ingresar a [https://nubofact.pse.pe/tokens](https://nubofact.pse.pe/tokens) con la cuenta de la empresa
2. En la tabla de Tokens, ubicar la fila **"PRINCIPAL / LOCAL PRINCIPAL"**
3. Copiar:
   - Campo **RUTA** (URL completa con RUC key): `https://api.pse.pe/api/v1/{ruc_key}` → va en `NUBEFACT_BASE_URL`
   - Campo **TOKEN** (cadena larga que empieza con `eyJ...`) → va en `NUBEFACT_TOKEN`
4. Para producción real: la RUTA cambia a `https://api.nubefact.com/api/v1/{ruc_key}`

Estos valores van en `.env`:
```env
NUBEFACT_BASE_URL=https://api.pse.pe/api/v1/{ruc_key}
NUBEFACT_TOKEN=eyJhbGciOiJIUzI1NiJ9...
NUBEFACT_MODE=demo
```

### 2. App Password de Gmail (para envío de emails automáticos)

> Documentación oficial: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

Pasos detallados:
1. Ingresar a [https://myaccount.google.com](https://myaccount.google.com) con la cuenta de Gmail de la empresa
2. Ir a **Seguridad** (panel izquierdo)
3. En la sección "¿Cómo inicias sesión en Google?", activar **Verificación en 2 pasos** (si no está activa)
   - Es obligatorio tener 2FA para poder crear App Passwords
4. Una vez activa la verificación en 2 pasos, ir directamente a: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
5. En "Nombre de la app" escribir: `Plataforma Facturacion`
6. Clic en **Crear**
7. Se mostrará una contraseña de **16 caracteres** (formato: `xxxx xxxx xxxx xxxx`)
8. **Copiar inmediatamente** — solo se muestra una vez

Este valor va en `.env`:
```env
MAIL_USERNAME=correo-empresa@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

> **Nota:** Si la cuenta Google es institucional (Google Workspace), el administrador debe habilitar el acceso SMTP en la consola de Admin.

### 3. Google AI Studio — API Key Gemini (para OCR inteligente)

> Documentación oficial: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

Pasos detallados:
1. Ingresar a [https://aistudio.google.com](https://aistudio.google.com) con una cuenta Google
2. En el panel izquierdo, clic en **Get API Key** o ir a [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
3. Clic en **Create API Key**
4. Seleccionar un proyecto de Google Cloud (o crear uno nuevo)
5. Copiar la API key generada (empieza con `AIza...`)

Este valor va en `backend/python_ocr/.env` o como variable de entorno del contenedor Docker:
```env
GEMINI_API_KEY=AIzaSy...tu_clave_aqui
```

> **Costo:** Google AI Studio tiene capa gratuita generosa. Para volúmenes altos de OCR, revisar pricing en [https://ai.google.dev/pricing](https://ai.google.dev/pricing)

---

## C. Despliegue Local (Desarrollo)

### 1. Clonar el repositorio

```bash
git clone https://github.com/diegomejiam/Nubofact-Web-y-Facturador.git
cd Nubofact-Web-y-Facturador
```

### 2. Levantar servicios Docker

```bash
docker compose up -d
```

Servicios iniciados:
- `facturacion_postgres` — PostgreSQL 15 en puerto 5432
- `facturacion_minio` — MinIO API en 9000, Console en 9001
- `facturacion_ocr` — Servicio OCR Python/Tesseract

Verificar:
```bash
docker ps
# Deben aparecer los 3 contenedores con status "Up"
```

### 3. Configurar backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

Editar `backend/.env` (ver sección B para obtener los valores):

```env
APP_NAME="Plataforma Facturación"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=plataforma_facturacion
DB_USERNAME=postgres
DB_PASSWORD=postgres123

FILESYSTEM_DISK=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_KEY=minio
MINIO_SECRET=minio123
MINIO_BUCKET=facturacion
MINIO_USE_PATH_STYLE_ENDPOINT=true
MINIO_REGION=us-east-1

OCR_USE_DOCKER=true
GEMINI_API_KEY=AIzaSy...

NUBEFACT_BASE_URL=https://api.pse.pe/api/v1/{ruc_key}
NUBEFACT_TOKEN=eyJhbGciOiJIUzI1NiJ9...
NUBEFACT_MODE=demo
NUBEFACT_AUTO_SUNAT=true
NUBEFACT_PDF_FORMAT=A4
NUBEFACT_TIMEOUT=30

MAIL_MAILER=log    # En desarrollo: guarda emails en storage/logs/laravel.log
```

### 4. Inicializar base de datos

```bash
php artisan migrate
php artisan db:seed --class=CatalogosSunatSeeder
php artisan storage:link
```

### 5. Servidores de desarrollo

```bash
# Terminal 1 — Backend
php artisan serve
# http://localhost:8000

# Terminal 2 — Frontend
cd ../frontend
npm install
npm run dev
# http://localhost:5173
```

---

## D. Despliegue en Servidor de Producción (Debian 12)

### Paso 1 — Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget gnupg ca-certificates lsb-release \
  apt-transport-https software-properties-common
```

---

### Paso 2 — Instalar PHP 8.2

> En Debian 12, PHP 8.2 no está en los repositorios base. Se usa el repositorio oficial de Ondřej Surý (https://packages.sury.org).

```bash
# 1. Agregar clave GPG del repositorio PHP
wget -O /etc/apt/trusted.gpg.d/php.gpg https://packages.sury.org/php/apt.gpg

# 2. Agregar repositorio PHP para Debian 12 (bookworm)
echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" \
  | sudo tee /etc/apt/sources.list.d/php.list

# 3. Actualizar e instalar PHP 8.2 con todas las extensiones
sudo apt update
sudo apt install -y php8.2 php8.2-fpm php8.2-pgsql php8.2-mbstring \
  php8.2-xml php8.2-curl php8.2-zip php8.2-gd php8.2-cli php8.2-fileinfo \
  php8.2-bcmath php8.2-intl

# 4. Verificar instalación
php --version
# Debe mostrar: PHP 8.2.x
```

---

### Paso 3 — Instalar PostgreSQL 15

> En Debian 12 el repo base tiene PostgreSQL 15 disponible, pero para asegurar la versión más reciente se usa el repositorio oficial PGDG.

```bash
# 1. Agregar repositorio oficial PostgreSQL
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'

# 2. Agregar clave GPG
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg

# 3. Instalar PostgreSQL 15
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15

# 4. Verificar que el servicio esté corriendo
sudo systemctl status postgresql
sudo systemctl enable postgresql

# 5. Verificar versión
psql --version
```

---

### Paso 4 — Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Verificar
nginx -v
curl http://localhost
# Debe mostrar la página por defecto de Nginx
```

---

### Paso 5 — Instalar Composer

```bash
# Descargar e instalar Composer globalmente
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# Verificar
composer --version
# Debe mostrar: Composer version 2.x.x
```

---

### Paso 6 — Instalar Node.js 18

```bash
# 1. Agregar repositorio NodeSource para Node 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 2. Instalar Node.js y npm
sudo apt install -y nodejs

# 3. Verificar
node --version   # v18.x.x
npm --version    # 9.x.x o superior
```

---

### Paso 7 — Instalar Docker y Docker Compose

> El sistema usa Docker para los servicios PostgreSQL (en producción puede ser nativo), MinIO y el servicio OCR.

```bash
# 1. Agregar clave GPG de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 2. Agregar repositorio Docker para Debian
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Instalar Docker Engine y Compose v2
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# 4. Agregar usuario al grupo docker (para no necesitar sudo)
sudo usermod -aG docker $USER
newgrp docker

# 5. Verificar
docker --version          # Docker version 24.x o superior
docker compose version    # Docker Compose version v2.x.x

# 6. Habilitar Docker al inicio
sudo systemctl enable docker
sudo systemctl start docker
```

---

### Paso 8 — Instalar Certbot (SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx

# Verificar
certbot --version
```

---

### Paso 9 — Instalar Supervisor y UFW

```bash
# Supervisor (para mantener workers de colas activos)
sudo apt install -y supervisor
sudo systemctl enable supervisor
sudo systemctl start supervisor

# UFW (Firewall — no viene por defecto en Debian)
sudo apt install -y ufw
```

---

### Paso 10 — Crear directorio y clonar código

```bash
# Crear directorio de aplicaciones
sudo mkdir -p /var/www
cd /var/www

# Clonar repositorio
sudo git clone https://github.com/diegomejiam/Nubofact-Web-y-Facturador.git Nubofact-Web-y-Facturador

# Asignar propiedad al usuario www-data (Nginx/PHP-FPM)
sudo chown -R www-data:www-data Nubofact-Web-y-Facturador

# Ingresar al directorio
cd Nubofact-Web-y-Facturador
```

---

### Paso 11 — Configurar la Base de Datos PostgreSQL

```bash
# Ingresar a consola PostgreSQL como superusuario
sudo -u postgres psql
```

Ejecutar estos comandos SQL:
```sql
-- Crear base de datos
CREATE DATABASE plataforma_facturacion;

-- Crear usuario dedicado (reemplazar 'password_seguro' con una contraseña fuerte)
CREATE USER facturacion_user WITH PASSWORD 'password_seguro';

-- Dar permisos completos
GRANT ALL PRIVILEGES ON DATABASE plataforma_facturacion TO facturacion_user;

-- Salir
\q
```

Verificar conexión:
```bash
psql -U facturacion_user -h 127.0.0.1 -d plataforma_facturacion -c "SELECT version();"
# Debe mostrar la versión de PostgreSQL
```

---

### Paso 12 — Configurar el Backend

```bash
cd /var/www/Nubofact-Web-y-Facturador/backend

# Instalar dependencias PHP (sin dev)
sudo -u www-data composer install --no-dev --optimize-autoloader

# Copiar y editar .env
sudo -u www-data cp .env.example .env
sudo -u www-data php artisan key:generate
```

Editar el archivo `.env` de producción:
```bash
sudo nano /var/www/Nubofact-Web-y-Facturador/backend/.env
```

Contenido del `.env` de producción (ver sección B para obtener los valores de NubeFact, Gmail y Gemini):

```env
APP_NAME="Plataforma Facturación"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tudominio.com
APP_TIMEZONE=America/Lima

LOG_CHANNEL=stack
LOG_LEVEL=warning

# Base de datos PostgreSQL (instalación nativa)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=plataforma_facturacion
DB_USERNAME=facturacion_user
DB_PASSWORD=password_seguro

# NubeFact — PRODUCCIÓN (obtener RUTA y TOKEN en https://nubofact.pse.pe/tokens)
NUBEFACT_BASE_URL=https://api.nubefact.com/api/v1/{ruc_key}
NUBEFACT_TOKEN=eyJhbGciOiJIUzI1NiJ9...
NUBEFACT_MODE=production
NUBEFACT_AUTO_SUNAT=true
NUBEFACT_PDF_FORMAT=A4
NUBEFACT_TIMEOUT=30
NUBEFACT_GRE_MAX_RETRIES=10
NUBEFACT_GRE_RETRY_DELAY=5

# Email Gmail (ver sección B.2)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=correo-empresa@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=correo-empresa@gmail.com
MAIL_FROM_NAME="${APP_NAME}"

# Storage MinIO (Docker o servidor externo)
FILESYSTEM_DISK=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_KEY=minio
MINIO_SECRET=password_minio_seguro
MINIO_BUCKET=facturacion
MINIO_USE_PATH_STYLE_ENDPOINT=true
MINIO_REGION=us-east-1

# OCR Gemini (ver sección B.3)
OCR_USE_DOCKER=true
GEMINI_API_KEY=AIzaSy...tu_clave_aqui

QUEUE_CONNECTION=database
SESSION_DRIVER=database
CACHE_STORE=database
```

---

### Paso 13 — Levantar servicios Docker (MinIO + OCR)

```bash
cd /var/www/Nubofact-Web-y-Facturador

# Levantar MinIO y servicio OCR
docker compose up -d

# Verificar que estén corriendo
docker ps
# Deben aparecer: facturacion_minio, facturacion_ocr
```

> **Nota:** PostgreSQL se puede correr también en Docker (`facturacion_postgres`) o usar la instalación nativa del Paso 11. En producción se recomienda la instalación nativa para mayor control y backups.

---

### Paso 14 — Inicializar Base de Datos

```bash
cd /var/www/Nubofact-Web-y-Facturador/backend

# Ejecutar migraciones
sudo -u www-data php artisan migrate --force

# Poblar catálogos SUNAT (obligatorio para funcionamiento)
sudo -u www-data php artisan db:seed --class=CatalogosSunatSeeder

# Crear enlace simbólico para storage
sudo -u www-data php artisan storage:link

# Optimizaciones de producción
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan route:cache
sudo -u www-data php artisan view:cache
sudo -u www-data php artisan optimize

# Permisos correctos
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
sudo chmod 600 .env
```

---

### Paso 15 — Build del Frontend

```bash
cd /var/www/Nubofact-Web-y-Facturador/frontend

# Instalar dependencias y construir
sudo -u www-data npm ci --production
sudo -u www-data npm run build

# Verificar que se generaron los archivos
ls -la dist/
# Debe contener: index.html, assets/
```

---

### Paso 16 — Configurar Nginx

Crear el archivo de configuración del sitio:

```bash
sudo nano /etc/nginx/sites-available/facturacion
```

Pegar este contenido (reemplazar `tudominio.com` con el dominio real):

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tudominio.com www.tudominio.com;

    # Certificados SSL (Certbot los genera en el siguiente paso)
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Raíz del frontend (build de React/Vite)
    root /var/www/Nubofact-Web-y-Facturador/frontend/dist;
    index index.html;

    # Logs
    access_log /var/log/nginx/facturacion_access.log;
    error_log  /var/log/nginx/facturacion_error.log;

    # Frontend — SPA React (todas las rutas van a index.html)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Laravel — pasar a PHP-FPM
    location ~ ^/api {
        root /var/www/Nubofact-Web-y-Facturador/backend/public;
        try_files $uri $uri/ /index.php?$query_string;

        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME /var/www/Nubofact-Web-y-Facturador/backend/public/index.php;
            include fastcgi_params;
            fastcgi_read_timeout 120;
        }
    }

    # Archivos estáticos (cache 1 año)
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Seguridad — no exponer archivos sensibles
    location ~ /\.(?!well-known) {
        deny all;
    }

    # Headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Tamaño máximo de upload (para OCR de PDFs)
    client_max_body_size 20M;
}
```

Activar el sitio y verificar:

```bash
# Habilitar el sitio
sudo ln -s /etc/nginx/sites-available/facturacion /etc/nginx/sites-enabled/

# Deshabilitar el sitio por defecto
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar sintaxis de configuración
sudo nginx -t
# Debe mostrar: configuration file /etc/nginx/nginx.conf test is successful

# Recargar Nginx
sudo systemctl reload nginx
```

---

### Paso 17 — Configurar SSL con Certbot

> Certbot generará automáticamente el certificado SSL y modificará la configuración Nginx.

```bash
# Obtener certificado SSL (reemplazar con el dominio real)
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# Seguir el asistente interactivo:
# - Ingresar email para notificaciones de renovación
# - Aceptar los términos de servicio
# - Elegir si redirigir HTTP → HTTPS (elegir: 2 - Redirect)

# Verificar renovación automática
sudo certbot renew --dry-run
# Debe mostrar: "Congratulations, all simulated renewals succeeded"
```

---

### Paso 18 — Configurar Supervisor (Workers de Colas)

```bash
sudo nano /etc/supervisor/conf.d/facturacion-worker.conf
```

```ini
[program:facturacion-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/Nubofact-Web-y-Facturador/backend/artisan queue:work --sleep=3 --tries=3 --max-time=3600
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

```bash
# Aplicar configuración
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start facturacion-worker:*

# Verificar estado
sudo supervisorctl status
```

---

### Paso 19 — Configurar Firewall (UFW)

```bash
# Reglas básicas
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH (importante: antes de activar)
sudo ufw allow OpenSSH

# Permitir HTTP y HTTPS (tráfico web)
sudo ufw allow 'Nginx Full'

# Activar firewall
sudo ufw enable
# Confirmar con: y

# Verificar reglas
sudo ufw status verbose
```

---

### Paso 20 — Configurar Cron Jobs

```bash
# Editar crontab de www-data
sudo crontab -e -u www-data
```

Agregar estas líneas:

```cron
# Laravel Scheduler (ejecuta cada minuto — requerido por Laravel)
* * * * * cd /var/www/Nubofact-Web-y-Facturador/backend && php artisan schedule:run >> /dev/null 2>&1

# Sincronización NubeFact automática (cada hora)
0 * * * * cd /var/www/Nubofact-Web-y-Facturador/backend && php artisan nubefact:sync --pendientes >> /var/log/nubefact-sync.log 2>&1

# Backup de base de datos (diario a las 2:00 AM)
0 2 * * * pg_dump -U facturacion_user -h 127.0.0.1 plataforma_facturacion | gzip > /backups/facturacion_$(date +\%Y\%m\%d).sql.gz

# Limpiar backups de más de 30 días
0 3 * * * find /backups -name "facturacion_*.sql.gz" -mtime +30 -delete
```

Crear directorio de backups:
```bash
sudo mkdir -p /backups
sudo chown www-data:www-data /backups
```

---

### Paso 21 — Verificación Final

```bash
# Estado de todos los servicios
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status php8.2-fpm
sudo systemctl status supervisor
sudo supervisorctl status
docker ps

# Probar frontend
curl -I https://tudominio.com
# Debe retornar: HTTP/2 200

# Probar API
curl https://tudominio.com/api/nubefact-sync/estado \
  -H "Authorization: Bearer {token_aqui}"
# Debe retornar: { "success": true, ... }

# Ver logs en tiempo real
tail -f /var/www/Nubofact-Web-y-Facturador/backend/storage/logs/laravel.log
```

---

## E. Proceso de Actualización

```bash
cd /var/www/Nubofact-Web-y-Facturador

# 1. Backup preventivo
pg_dump -U facturacion_user -h 127.0.0.1 plataforma_facturacion | \
  gzip > /backups/pre-update-$(date +%Y%m%d).sql.gz

# 2. Obtener cambios del repositorio
sudo -u www-data git pull origin main

# 3. Actualizar backend
cd backend
sudo -u www-data composer install --no-dev --optimize-autoloader
sudo -u www-data php artisan migrate --force
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan route:cache
sudo -u www-data php artisan view:cache

# 4. Actualizar frontend
cd ../frontend
sudo -u www-data npm ci --production
sudo -u www-data npm run build

# 5. Reiniciar servicios
sudo systemctl restart php8.2-fpm
sudo systemctl reload nginx
sudo supervisorctl restart facturacion-worker:*

echo "Actualización completada."
```

---

## F. Rollback a Versión Anterior

```bash
# Listar versiones disponibles
git tag --list
git log --oneline -10

# Volver a un tag/versión anterior
sudo -u www-data git checkout v1.0-entrega

# Restaurar base de datos si fue necesario
gunzip < /backups/pre-update-YYYYMMDD.sql.gz | \
  psql -U facturacion_user -h 127.0.0.1 plataforma_facturacion

# Re-ejecutar pasos 13–15 (composer, npm build, artisan cache)
```

---

## G. Checklist Pre-Producción

- [ ] `APP_DEBUG=false` y `APP_ENV=production` en .env
- [ ] `APP_URL` con el dominio real (https)
- [ ] `APP_TIMEZONE=America/Lima` configurado
- [ ] SSL/HTTPS configurado con Certbot y auto-renovación verificada
- [ ] `NUBEFACT_MODE=production` y token de producción (no demo)
- [ ] Email Gmail configurado y probado (`php artisan tinker → Mail::raw(...)`)
- [ ] `GEMINI_API_KEY` configurado en .env
- [ ] Base de datos migrada (`php artisan migrate`) y seeder ejecutado
- [ ] Permisos correctos en storage/ (propietario: www-data)
- [ ] Enlace simbólico storage creado (`php artisan storage:link`)
- [ ] Build del frontend generado (existe `frontend/dist/index.html`)
- [ ] Nginx configurado y probado (`nginx -t`)
- [ ] PHP-FPM socket corriendo en `/var/run/php/php8.2-fpm.sock`
- [ ] Supervisor corriendo con workers activos
- [ ] Cron jobs configurados (verificar con `sudo crontab -l -u www-data`)
- [ ] Firewall UFW activo con puertos 22, 80, 443 habilitados
- [ ] `.env` con permisos 600
- [ ] Directorio `/backups` creado y cron de backup activo
- [ ] Docker corriendo (MinIO + OCR)
- [ ] Verificación final: frontend accesible + API responde
