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
| Node.js | 22 LTS (v22.x) | Requiere repo nodesource |
| PostgreSQL | 15+ | Requiere repo oficial PGDG |
| Nginx | Última estable | Disponible en repo Debian base |
| Docker + Docker Compose | 24+ | Requiere repo oficial Docker |
| unzip | — | Para descomprimir el proyecto |

### Extensiones PHP requeridas
`pgsql`, `pdo_pgsql`, `openssl`, `zip`, `curl`, `mbstring`, `xml`, `gd`, `fileinfo`

### Puertos que deben estar abiertos

| Puerto | Servicio |
|--------|----------|
| 22 | SSH |
| 80 | HTTP |
| 443 | HTTPS (si se configura SSL) |
| 5432 | PostgreSQL (solo acceso local) |
| 9000 | MinIO API |
| 9001 | MinIO Console |

---

## B. Credenciales y Accesos Externos (Obtener Antes de Desplegar)

### 1. Credenciales NubeFact (PSE SUNAT)

1. Ingresar a [https://nubofact.pse.pe/tokens](https://nubofact.pse.pe/tokens) con la cuenta de la empresa
2. Ubicar la fila **"PRINCIPAL / LOCAL PRINCIPAL"**
3. Copiar:
   - **RUTA** → va en `NUBEFACT_BASE_URL`
   - **TOKEN** (empieza con `eyJ...`) → va en `NUBEFACT_TOKEN`

### 2. App Password de Gmail

1. Ir a [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Activar **Verificación en 2 pasos** si no está activa
3. Crear app password con nombre `Plataforma Facturacion`
4. Copiar la contraseña de 16 caracteres — **solo se muestra una vez**

### 3. Google AI Studio — API Key Gemini

1. Ir a [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Clic en **Create API Key** → copiar la clave (empieza con `AIza...`)

### 4. Token de Acceso GitHub (solo para git clone — omitir si se usa ZIP)

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token** → scope: ✅ **repo** → copiar el token
3. Se usa como: `git clone https://<TOKEN>@github.com/usuario/repo.git`

---

## C. Archivos `.env` de Referencia

### C.1 — `.env` para Desarrollo Local (Docker)

```env
APP_NAME="Plataforma Facturación"
APP_ENV=local
APP_KEY=                          # Se genera con: php artisan key:generate
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_TIMEZONE=America/Lima

LOG_CHANNEL=stack
LOG_LEVEL=debug

# Base de datos — PostgreSQL en Docker
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=plataforma_facturacion
DB_USERNAME=postgres
DB_PASSWORD=postgres123

# NubeFact — modo DEMO (no envía a SUNAT real)
NUBEFACT_BASE_URL=https://api.pse.pe/api/v1/{ruc_key}
NUBEFACT_TOKEN=eyJhbGciOiJIUzI1NiJ9...
NUBEFACT_MODE=demo
NUBEFACT_AUTO_SUNAT=true
NUBEFACT_PDF_FORMAT=A4
NUBEFACT_TIMEOUT=30
NUBEFACT_GRE_MAX_RETRIES=10
NUBEFACT_GRE_RETRY_DELAY=5

# Email — modo log (guarda en storage/logs/laravel.log, no envía emails reales)
MAIL_MAILER=log

# Storage MinIO — Docker local
FILESYSTEM_DISK=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_KEY=minio
MINIO_SECRET=minio123
MINIO_BUCKET=facturacion
MINIO_USE_PATH_STYLE_ENDPOINT=true
MINIO_REGION=us-east-1

# OCR
OCR_USE_DOCKER=true
GEMINI_API_KEY=AIzaSy...

QUEUE_CONNECTION=database
SESSION_DRIVER=database
CACHE_STORE=database
```

---

### C.2 — `.env` para Producción en Servidor Debian 12

**Bifurcación A — PSE (cuenta de demostración/testing con SUNAT):**

```env
# NubeFact PSE — para pruebas con validación real de SUNAT via PSE
NUBEFACT_BASE_URL=https://api.pse.pe/api/v1/{ruc_key}
NUBEFACT_TOKEN=eyJhbGciOiJIUzI1NiJ9...
NUBEFACT_MODE=production
```

**Bifurcación B — NubeFact directo (cuenta producción real):**

```env
# NubeFact directo — cuenta de producción real
NUBEFACT_BASE_URL=https://api.nubefact.com/api/v1/{ruc_key}
NUBEFACT_TOKEN=eyJhbGciOiJIUzI1NiJ9...
NUBEFACT_MODE=production
```

**`.env` completo de producción** (usar la bifurcación NubeFact que corresponda):

```env
APP_NAME="Plataforma Facturación"
APP_ENV=production
APP_KEY=                          # Se genera con: php artisan key:generate
APP_DEBUG=false
APP_URL=http://<IP-del-servidor>  # Reemplazar con IP real o dominio
APP_TIMEZONE=America/Lima

LOG_CHANNEL=stack
LOG_LEVEL=warning

# Base de datos — PostgreSQL nativo
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=plataforma_facturacion
DB_USERNAME=facturacion_user
DB_PASSWORD=password_seguro       # Cambiar por contraseña fuerte

# NubeFact — elegir bifurcación A o B según sección C.2
NUBEFACT_BASE_URL=<URL de NubeFact — ver bifurcación>
NUBEFACT_TOKEN=<token JWT — ver sección B.1>
NUBEFACT_MODE=production
NUBEFACT_AUTO_SUNAT=true
NUBEFACT_PDF_FORMAT=A4
NUBEFACT_TIMEOUT=30
NUBEFACT_GRE_MAX_RETRIES=10
NUBEFACT_GRE_RETRY_DELAY=5

# Email Gmail con App Password — ver sección B.2
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<correo@gmail.com>
MAIL_PASSWORD=<app password de 16 caracteres>
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=<correo@gmail.com>
MAIL_FROM_NAME="${APP_NAME}"

# Storage MinIO — Docker en mismo servidor
FILESYSTEM_DISK=minio
MINIO_ENDPOINT=http://localhost:9000
MINIO_KEY=minio
MINIO_SECRET=password_minio_seguro  # Cambiar por contraseña fuerte
MINIO_BUCKET=facturacion
MINIO_USE_PATH_STYLE_ENDPOINT=true
MINIO_REGION=us-east-1

# OCR — ver sección B.3
OCR_USE_DOCKER=true
GEMINI_API_KEY=<api key de Google AI Studio>

QUEUE_CONNECTION=database
SESSION_DRIVER=database
CACHE_STORE=database
```

---

## D. Despliegue Local (Desarrollo)

### 1. Obtener el proyecto

**Opción A — ZIP** (recomendado para repos privados):
1. GitHub → repositorio → **Code** → **Download ZIP**
2. Descomprimir en la carpeta de trabajo

**Opción B — Git clone con token** (ver sección B.4):
```bash
git clone https://<TOKEN>@github.com/usuario/Nubofact-Web-y-Facturador.git
cd Nubofact-Web-y-Facturador
```

### 2. Levantar servicios Docker

```bash
cd Nubofact-Web-y-Facturador
docker compose up -d
docker ps   # Verificar: facturacion_postgres, facturacion_minio, facturacion_ocr
```

### 3. Configurar backend

```bash
cd backend
composer install
cp .env.example .env
# Editar .env con los valores de la sección C.1
php artisan key:generate
php artisan migrate
php artisan db:seed --class=CatalogosSunatSeeder
php artisan storage:link
```

### 4. Iniciar servidores

```bash
# Terminal 1 — Backend
php artisan serve      # http://localhost:8000

# Terminal 2 — Frontend
cd ../frontend
npm install
npm run dev            # http://localhost:5173
```

---

## E. Despliegue en Servidor de Producción (Debian 12)

> Todos los comandos van en el orden exacto indicado. Se pueden copiar y pegar directamente.

---

### Paso 1 — Actualizar sistema e instalar herramientas base

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget gnupg ca-certificates lsb-release \
  apt-transport-https software-properties-common unzip git
```

---

### Paso 2 — Instalar PHP 8.2

```bash
wget -O /etc/apt/trusted.gpg.d/php.gpg https://packages.sury.org/php/apt.gpg

echo "deb https://packages.sury.org/php/ $(lsb_release -sc) main" \
  | sudo tee /etc/apt/sources.list.d/php.list

sudo apt update
sudo apt install -y php8.2 php8.2-fpm php8.2-pgsql php8.2-mbstring \
  php8.2-xml php8.2-curl php8.2-zip php8.2-gd php8.2-cli php8.2-fileinfo \
  php8.2-bcmath php8.2-intl

php --version   # Debe mostrar: PHP 8.2.x
```

---

### Paso 3 — Instalar PostgreSQL 15

```bash
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list'

wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg

sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15

sudo systemctl enable postgresql
sudo systemctl start postgresql

psql --version
```

---

### Paso 4 — Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
nginx -v
```

---

### Paso 5 — Instalar Composer

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer
composer --version
```

---

### Paso 6 — Instalar Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs
node --version   # v22.x.x
npm --version
```

---

### Paso 7 — Instalar Docker y Docker Compose

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker

docker --version
docker compose version
```

---

### Paso 8 — Obtener el proyecto

El repositorio es **privado**. Elegir una opción:

**Opción A — Desde ZIP** (recomendado, sin autenticación):

Transferir el ZIP al servidor desde la máquina local:
```bash
# Localizar el ZIP en la máquina de origen
find / -name "Nubofact-Web-y-Facturador*.zip" 2>/dev/null

# Transferir al servidor (ejecutar desde la máquina local, ajustar puerto SSH si es necesario)
scp -P <puerto-ssh> /ruta/al/Nubofact-Web-y-Facturador-main.zip usuario@<IP-servidor>:/home/usuario/
```

En el servidor:
```bash
# Localizar el ZIP recibido
find /home -name "Nubofact-Web-y-Facturador*.zip" 2>/dev/null

sudo mkdir -p /var/www

# Mover y descomprimir (ajustar la ruta según el resultado del find)
sudo mv /home/<usuario>/Nubofact-Web-y-Facturador-main.zip /var/www/
cd /var/www
sudo unzip Nubofact-Web-y-Facturador-main.zip
sudo mv Nubofact-Web-y-Facturador-main Nubofact-Web-y-Facturador
```

**Opción B — Git clone con token** (ver sección B.4):

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://<TOKEN>@github.com/usuario/Nubofact-Web-y-Facturador.git Nubofact-Web-y-Facturador
```

> **Nota:** Con la Opción A (ZIP) no hay carpeta `.git` — los comandos `git pull` no funcionarán. Las actualizaciones requieren descargar un nuevo ZIP (ver sección F).

**Permisos (obligatorio en ambas opciones):**

```bash
sudo chown -R www-data:www-data /var/www/Nubofact-Web-y-Facturador
sudo chmod -R 755 /var/www/Nubofact-Web-y-Facturador
```

---

### Paso 9 — Configurar la Base de Datos PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE plataforma_facturacion;
CREATE USER facturacion_user WITH PASSWORD 'password_seguro';
GRANT ALL PRIVILEGES ON DATABASE plataforma_facturacion TO facturacion_user;
\q
```

```bash
sudo -u postgres psql -d plataforma_facturacion
```

```sql
GRANT ALL ON SCHEMA public TO facturacion_user;
ALTER SCHEMA public OWNER TO facturacion_user;
\q
```

---

### Paso 10 — Configurar el Backend

```bash
cd /var/www/Nubofact-Web-y-Facturador/backend

# 1. Instalar dependencias PHP
sudo -u www-data composer install --no-dev --optimize-autoloader

# 2. Copiar .env (como www-data para que pueda escribir APP_KEY)
sudo -u www-data cp .env.example .env

# 3. Editar .env con los valores de la sección C.2
sudo nano /var/www/Nubofact-Web-y-Facturador/backend/.env

# 4. Generar APP_KEY (rellena la línea APP_KEY= en el .env)
sudo -u www-data php artisan key:generate

# 5. Limpiar caché
sudo -u www-data php artisan config:clear

# 6. Permisos de escritura
sudo chown -R www-data:www-data /var/www/Nubofact-Web-y-Facturador/backend/storage
sudo chown -R www-data:www-data /var/www/Nubofact-Web-y-Facturador/backend/bootstrap/cache
sudo chmod -R 775 /var/www/Nubofact-Web-y-Facturador/backend/storage
sudo chmod -R 775 /var/www/Nubofact-Web-y-Facturador/backend/bootstrap/cache

# 7. Proteger .env (después de que key:generate ya escribió APP_KEY)
sudo chmod 600 /var/www/Nubofact-Web-y-Facturador/backend/.env

# 8. Directorio psysh para www-data (evita error de permisos en artisan)
sudo mkdir -p /var/www/.config/psysh
sudo chown -R www-data:www-data /var/www/.config
```

---

### Paso 11 — Inicializar la Base de Datos

```bash
cd /var/www/Nubofact-Web-y-Facturador/backend

sudo -u www-data php artisan migrate --force
sudo -u www-data php artisan db:seed --class=CatalogosSunatSeeder
sudo -u www-data php artisan storage:link
```

---

### Paso 12 — Levantar servicios Docker (MinIO + OCR)

```bash
cd /var/www/Nubofact-Web-y-Facturador
docker compose up -d
docker ps   # Deben aparecer: facturacion_minio, facturacion_ocr
```

---

### Paso 13 — Configurar el Frontend

```bash
cd /var/www/Nubofact-Web-y-Facturador/frontend

# Crear .env del frontend
# VITE_API_URL vacío = rutas relativas (/api/...) → evita CORS ya que frontend
# y API comparten el mismo servidor Nginx
sudo bash -c 'echo "VITE_API_URL=" > /var/www/Nubofact-Web-y-Facturador/frontend/.env'

# Permisos
sudo chown -R www-data:www-data /var/www/Nubofact-Web-y-Facturador/frontend

# Instalar dependencias (warnings de npm audit son informativos, no bloquean el build)
sudo npm install --legacy-peer-deps

# Compilar para producción
sudo -u www-data npm run build

# Verificar
ls -la /var/www/Nubofact-Web-y-Facturador/frontend/dist/
# Debe contener: index.html, assets/
```

---

### Paso 14 — Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/facturacion
```

Pegar este contenido exacto:

```nginx
server {
    listen 80;
    server_name _;

    root /var/www/Nubofact-Web-y-Facturador/frontend/dist;
    index index.html;

    access_log /var/log/nginx/facturacion_access.log;
    error_log  /var/log/nginx/facturacion_error.log;

    # Frontend — SPA React
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Laravel — PHP-FPM directo
    location /api {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME /var/www/Nubofact-Web-y-Facturador/backend/public/index.php;
        fastcgi_param DOCUMENT_ROOT /var/www/Nubofact-Web-y-Facturador/backend/public;
        include fastcgi_params;
        fastcgi_read_timeout 120;
    }

    client_max_body_size 20M;

    location ~ /\.(?!well-known) {
        deny all;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/facturacion /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t            # Debe mostrar: test is successful
sudo systemctl reload nginx
```

---

### Paso 15 — Verificación Final

```bash
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status php8.2-fpm
docker ps

# Probar API
curl -s http://localhost/api/v1/empresas -H "Accept: application/json" | head -c 200

# Logs
tail -f /var/www/Nubofact-Web-y-Facturador/backend/storage/logs/laravel.log
```

La plataforma queda accesible en `http://<IP-del-servidor>/`.

> **Para VirtualBox con NAT:** Configurar port forwarding:
> - Puerto host `8080` → puerto VM `80` (HTTP)
> - Puerto host `2222` → puerto VM `22` (SSH)
>
> Acceder desde el host en: `http://127.0.0.1:8080`

---

### Paso 16 — Importar Base de Datos Existente (Opcional)

Los backups se encuentran en **Hyscloud → 04_Release** con nombre `dump-plataforma_facturacion-YYYYMMDDHHMI.sql` (ej: `dump-plataforma_facturacion-202602221706.sql`).

**Exportar desde DBeaver** (en el equipo origen):
1. Click derecho en la BD → **Backup**
2. Configurar:
   - ✅ **Use SQL INSERT instead of COPY for rows**
   - ✅ **Do not backup privileges (GRANT/REVOKE)**
   - ✅ **Discard objects owner**
   - **Format:** Plain
3. **Siguiente** → **Start**

**Transferir al servidor** (desde la máquina local):

```bash
# Localizar el archivo de backup en la máquina local
find / -name "dump-plataforma_facturacion-*.sql" 2>/dev/null

# Transferir al servidor (ajustar puerto SSH y usuario)
scp -P <puerto-ssh> /ruta/al/dump-plataforma_facturacion-*.sql usuario@<IP-servidor>:/home/usuario/
```

**Importar en el servidor:**

```bash
# Localizar el backup recibido
find /home -name "dump-plataforma_facturacion-*.sql" 2>/dev/null

# Asignar la ruta encontrada a una variable para facilitar los comandos siguientes
BACKUP=$(find /home -name "dump-plataforma_facturacion-*.sql" 2>/dev/null | head -1)
echo "Backup encontrado: $BACKUP"

# Recrear schema limpio
cd /var/www/Nubofact-Web-y-Facturador/backend
sudo -u www-data php artisan migrate:fresh --force
sudo -u www-data php artisan db:seed --class=CatalogosSunatSeeder

# Extraer solo INSERT (evita conflictos de schema)
grep "^INSERT INTO" "$BACKUP" > /tmp/data_only.sql

# Importar datos
psql -h 127.0.0.1 -U facturacion_user -d plataforma_facturacion < /tmp/data_only.sql

# Limpiar caché
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan cache:clear
```

---

## F. Proceso de Actualización

### Si se desplegó con Git (Opción B del Paso 8):

```bash
cd /var/www/Nubofact-Web-y-Facturador
sudo git pull origin main

cd backend
sudo -u www-data composer install --no-dev --optimize-autoloader
sudo -u www-data php artisan migrate --force
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan route:cache

cd ../frontend
sudo npm install --legacy-peer-deps
sudo -u www-data npm run build

sudo systemctl restart php8.2-fpm
sudo systemctl reload nginx
```

### Si se desplegó con ZIP (Opción A del Paso 8):

```bash
# Localizar el nuevo ZIP recibido
find /home -name "Nubofact-Web-y-Facturador*.zip" 2>/dev/null
NEW_ZIP=$(find /home -name "Nubofact-Web-y-Facturador*.zip" 2>/dev/null | head -1)

# Hacer backup del proyecto actual
cd /var/www
sudo mv Nubofact-Web-y-Facturador Nubofact-Web-y-Facturador.bak

# Descomprimir nuevo ZIP
sudo unzip "$NEW_ZIP" -d /var/www
sudo mv /var/www/Nubofact-Web-y-Facturador-main /var/www/Nubofact-Web-y-Facturador

# Restaurar .env (no está en el ZIP)
sudo cp Nubofact-Web-y-Facturador.bak/backend/.env Nubofact-Web-y-Facturador/backend/.env
sudo bash -c 'echo "VITE_API_URL=" > /var/www/Nubofact-Web-y-Facturador/frontend/.env'

# Restaurar permisos
sudo chown -R www-data:www-data /var/www/Nubofact-Web-y-Facturador

# Actualizar dependencias
cd /var/www/Nubofact-Web-y-Facturador/backend
sudo -u www-data composer install --no-dev --optimize-autoloader
sudo -u www-data php artisan migrate --force
sudo -u www-data php artisan config:clear

cd /var/www/Nubofact-Web-y-Facturador/frontend
sudo npm install --legacy-peer-deps
sudo -u www-data npm run build

sudo systemctl restart php8.2-fpm
sudo systemctl reload nginx

# Eliminar backup cuando todo funcione correctamente
sudo rm -rf /var/www/Nubofact-Web-y-Facturador.bak
```

---

## G. Rollback

**Con Git:**
```bash
cd /var/www/Nubofact-Web-y-Facturador
sudo git log --oneline -10
sudo git checkout <commit-hash>
# Re-ejecutar pasos 10 al 14
```

**Con ZIP** (restaurar el backup creado en la actualización):
```bash
sudo rm -rf /var/www/Nubofact-Web-y-Facturador
sudo mv /var/www/Nubofact-Web-y-Facturador.bak /var/www/Nubofact-Web-y-Facturador
sudo systemctl restart php8.2-fpm
sudo systemctl reload nginx
```

---

## H. Checklist Pre-Producción

- [ ] `APP_DEBUG=false` y `APP_ENV=production` en `backend/.env`
- [ ] `APP_KEY` generado (`php artisan key:generate`)
- [ ] `APP_URL` con la IP o dominio real del servidor
- [ ] Credenciales NubeFact configuradas — bifurcación elegida (PSE o directo)
- [ ] Email Gmail configurado con App Password
- [ ] `GEMINI_API_KEY` configurado
- [ ] Base de datos migrada y seeder ejecutado
- [ ] Permisos correctos en `storage/` y `bootstrap/cache/` (propietario: `www-data`)
- [ ] `php artisan storage:link` ejecutado
- [ ] `frontend/.env` con `VITE_API_URL=` (vacío)
- [ ] Frontend compilado — existe `frontend/dist/index.html`
- [ ] Nginx activo y sin errores (`nginx -t`)
- [ ] PHP-FPM activo (`/var/run/php/php8.2-fpm.sock` existe)
- [ ] Docker corriendo — MinIO y OCR activos (`docker ps`)
- [ ] `backend/.env` con permisos 600
- [ ] Plataforma accesible y API responde en `/api/`
