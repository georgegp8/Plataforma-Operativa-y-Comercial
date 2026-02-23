# Guía de Despliegue en Producción: Plataforma Facturación Electrónica

**Objetivo:** Permitir al equipo de infraestructura y redes desplegar el sistema completo (Frontend React + Backend Laravel + Servicios Docker) en un entorno de producción basado en Debian 12, de forma autónoma.

---

## A) Requisitos Previos (Obtención de Credenciales Externas)

Antes de tocar el servidor, el encargado del despliegue debe recopilar las siguientes 4 credenciales:

1. **Credenciales NubeFact (PSE SUNAT)**
   - Ingresar a https://nubofact.pse.pe/tokens con la cuenta de la empresa.
   - Ubicar la fila "PRINCIPAL / LOCAL PRINCIPAL".
   - Copiar la **RUTA** → se usará en `NUBEFACT_BASE_URL`.
   - Copiar el **TOKEN** (empieza con `eyJ...`) → se usará en `NUBEFACT_TOKEN`.

2. **App Password de Gmail (Para envío de correos)**
   - Ir a https://myaccount.google.com/apppasswords.
   - Activar Verificación en 2 pasos si no está activa.
   - Crear un App Password con el nombre `Plataforma Facturacion`.
   - Copiar la contraseña de 16 caracteres (solo se muestra una vez) → se usará en `MAIL_PASSWORD`.

3. **Google AI Studio — API Key (Para módulo OCR Gemini)**
   - Ir a https://aistudio.google.com/apikey.
   - Clic en **Create API Key** → copiar la clave (empieza con `AIza...`) → se usará en `GEMINI_API_KEY`.

4. **Token de Acceso GitHub (Para descargar el código)**
   - En GitHub ir a Settings → Developer settings → Personal access tokens → Tokens (classic).
   - Generate new token → Marcar el permiso: ✅ repo.
   - Copiar el token generado.

---

## B) Requisitos del Entorno

- **Hardware Recomendado:** CPU: 2 a 4 Cores | RAM: 4 a 8 GB | Disco: 50 GB SSD.
- **Sistema Operativo:** Debian 12 (Bookworm).
- **Stack Tecnológico:** Nginx, PostgreSQL 15, PHP 8.2 (FPM), Node.js 22, Docker.

### Puertos Necesarios (Firewall):

- 22/TCP: SSH
- 80/TCP: HTTP Web/API
- 443/TCP: HTTPS (Si aplica SSL)
- 9000/TCP y 9001/TCP: MinIO (Storage)
- 5000/TCP: OCR Docker

---

## C) Preparación del Servidor (Instalación Base)

### 1. Acceso y Permisos (Sudo)
Si tu usuario no tiene permisos, entra como root para corregirlo:

```bash
su -
# Ingresa contraseña de root
apt update && apt install sudo -y
usermod -aG sudo tu_usuario
exit
# Cierra sesión y vuelve a entrar
```

### 2. Limpieza e Instalación de Repositorios (PHP, Node, Postgres, Docker oficial)
Ejecuta este bloque para asegurar que instalas las versiones más recientes y evitas el error de "Docker antiguo":

```bash
# Limpieza de repositorios previos conflictivos
sudo rm -f /etc/apt/sources.list.d/php.list /etc/apt/sources.list.d/pgdg.list /etc/apt/sources.list.d/docker.list

# Herramientas base
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget gnupg ca-certificates lsb-release apt-transport-https software-properties-common unzip git ufw

# 1. Repositorio PHP 8.2
sudo curl -sSlo /usr/share/keyrings/deb.sury.org-php.gpg https://packages.sury.org/php/apt.gpg
echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/php.list

# 2. Repositorio PostgreSQL 15
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg

# 3. Repositorio Oficial Docker (Actualizado para Debian 12)
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Repositorio Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
```

### 3. Instalación de Software

```bash
sudo apt update
sudo apt install -y php8.2 php8.2-fpm php8.2-pgsql php8.2-mbstring php8.2-xml php8.2-curl php8.2-zip php8.2-gd php8.2-cli php8.2-fileinfo php8.2-bcmath php8.2-intl postgresql-15 postgresql-client-15 nginx nodejs docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Instalar Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# Configurar Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Permisos de Docker
sudo usermod -aG docker $USER
newgrp docker
```

---

## D) Base de Datos PostgreSQL

Preparar el entorno de datos limpio:

```bash
sudo -u postgres psql -c "CREATE DATABASE plataforma_facturacion;"
sudo -u postgres psql -c "CREATE USER facturacion_user WITH PASSWORD 'password_seguro';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE plataforma_facturacion TO facturacion_user;"
sudo -u postgres psql -d plataforma_facturacion -c "GRANT ALL ON SCHEMA public TO facturacion_user; ALTER SCHEMA public OWNER TO facturacion_user;"
```

---

## E) Obtención del Proyecto (Git Clone)

Descargar el código usando el Token generado en el paso A.4:

```bash
sudo mkdir -p /var/www
sudo chown root:sudo /var/www
sudo chmod 775 /var/www
cd /var/www

# REEMPLAZA <TOKEN> CON TU TOKEN REAL DE GITHUB
sudo git clone https://<TOKEN>@[github.com/diegomejiam/Nubofact-Web-y-Facturador.git](https://github.com/diegomejiam/Nubofact-Web-y-Facturador.git) Nubofact-Web-y-Facturador

# Permisos para el servidor web
sudo chown -R www-data:www-data /var/www/Nubofact-Web-y-Facturador
sudo chmod -R 755 /var/www/Nubofact-Web-y-Facturador
```

---

## F) Configuración del Backend (Laravel)

### 1. Variables de Entorno (.env)

```bash
cd /var/www/Nubofact-Web-y-Facturador/backend
sudo -u www-data cp .env.example .env
sudo nano .env
```

Pega exactamente este contenido, reemplazando los campos `< >` con las credenciales del paso A:

```env
APP_NAME="Plataforma Facturación"
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=http://localhost
APP_TIMEZONE=America/Lima

LOG_CHANNEL=stack
LOG_LEVEL=warning

# Base de datos — PostgreSQL nativo
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=plataforma_facturacion
DB_USERNAME=facturacion_user
DB_PASSWORD=password_seguro

# NubeFact 
NUBEFACT_BASE_URL=<URL de NubeFact>
NUBEFACT_TOKEN=<token JWT>
NUBEFACT_MODE=production
NUBEFACT_AUTO_SUNAT=true
NUBEFACT_PDF_FORMAT=A4
NUBEFACT_TIMEOUT=30
NUBEFACT_GRE_MAX_RETRIES=10
NUBEFACT_GRE_RETRY_DELAY=5

# Email Gmail con App Password
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
MINIO_SECRET=password_minio_seguro
MINIO_BUCKET=facturacion
MINIO_USE_PATH_STYLE_ENDPOINT=true
MINIO_REGION=us-east-1

# OCR
OCR_USE_DOCKER=true
GEMINI_API_KEY=<api key de Google AI Studio>

QUEUE_CONNECTION=database
SESSION_DRIVER=database
CACHE_STORE=database
```

### 2. Inicialización de PHP y BD (Elige una opción)

**Opción 1: Instalación desde Cero (Sin datos previos)**
```bash
cd /var/www/Nubofact-Web-y-Facturador/backend
sudo -u www-data composer install --no-dev --optimize-autoloader
sudo -u www-data php artisan key:generate
sudo -u www-data php artisan migrate --force
sudo -u www-data php artisan db:seed --class=CatalogosSunatSeeder
sudo -u www-data php artisan storage:link
sudo chmod 600 .env
```

**Opción 2: Restauración de Backup Existente**
Si existe un archivo de volcado SQL (.sql) de un servidor anterior, usa este script para inicializar y restaurar:
```bash
cd /var/www/Nubofact-Web-y-Facturador/backend
sudo -u www-data composer install --no-dev --optimize-autoloader
sudo -u www-data php artisan key:generate
sudo -u www-data php artisan storage:link
sudo chmod 600 .env

# Localizar el backup más reciente en /home
BACKUP=$(find /home -name "dump-plataforma_facturacion-*.sql" 2>/dev/null | head -1)
echo "Restaurando backup: $BACKUP"

# Restaurar datos sin solicitar contraseña interactiva
PGPASSWORD="password_seguro" psql -h 127.0.0.1 -U facturacion_user -d plataforma_facturacion < "$BACKUP"

# Limpiar cachés
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan cache:clear
```

---

## G) Construcción del Frontend (Generación de dist)

Este paso es **obligatorio** para que Nginx tenga archivos visuales que mostrar y no arroje Error 500:

```bash
cd /var/www/Nubofact-Web-y-Facturador/frontend

# 1. Configurar ruta relativa de la API
sudo bash -c 'echo "VITE_API_URL=/api" > .env'

# 2. Instalar librerías de Node
sudo npm install --legacy-peer-deps

# 3. Construir la carpeta 'dist'
sudo -u www-data npm run build

# 4. Otorgar permisos a la carpeta generada (Crucial para Nginx)
sudo chown -R www-data:www-data /var/www/Nubofact-Web-y-Facturador/frontend/dist
sudo chmod -R 755 /var/www/Nubofact-Web-y-Facturador/frontend/dist
```

---

## H) Servicios Satélite (Docker Compose)

Levantar la base de datos de documentos (MinIO) y el servicio de IA local (OCR).

```bash
cd /var/www/Nubofact-Web-y-Facturador
docker compose up -d
```

---

## I) Servidor Web Nginx (Reverse Proxy)

Configurar Nginx para que sirva los archivos visuales en el puerto 80 y mande las peticiones de datos al Backend sin errores de CORS.

```bash
sudo nano /etc/nginx/sites-available/facturacion
```

Pegar el siguiente bloque:

```nginx
server {
  listen 80;
  server_name _;

  # 1. RUTA DEL FRONTEND (React)
  root /var/www/Nubofact-Web-y-Facturador/frontend/dist;
  index index.html;

  # 2. LOGS PARA VER ERRORES
  access_log /var/log/nginx/facturacion_access.log;
  error_log  /var/log/nginx/facturacion_error.log;

  # 3. BLOQUE PARA EL FRONTEND
  location / {
    try_files $uri $uri/ /index.html;
  }

  # 4. BLOQUE PARA EL BACKEND (Laravel API)
  location /api {
    fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
    fastcgi_param SCRIPT_FILENAME /var/www/Nubofact-Web-y-Facturador/backend/public/index.php;
    fastcgi_param DOCUMENT_ROOT /var/www/Nubofact-Web-y-Facturador/backend/public;
    include fastcgi_params;
  }

  # 5. SEGURIDAD OCULTA
  location ~ /\.(?!well-known).* {
    deny all;
  }
}
```

Activar el sitio y reiniciar Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/facturacion /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Probar que no haya errores de sintaxis y reiniciar
sudo nginx -t && sudo systemctl restart nginx
```

---

## J) Verificación Final y Troubleshooting

### 1. Pruebas Obligatorias

- **Frontend:** Ingrese a http://localhost (o la IP de su servidor). Debe cargar la pantalla de login.
- **Backend:** Abra la consola del navegador (F12) en la pestaña Red / Network, intente hacer login y confirme que la petición a http://localhost/api/auth/login devuelve un Status 200 o 401 (NO error 500 ni CORS).
- **Contenedores:** Ejecute `docker ps` y confirme que MinIO y OCR estén Up.

### 2. Problemas Comunes

- **Error 500 persistente en Nginx:**
  - *Razón:* Nginx no encuentra la carpeta /dist.
  - *Solución:* Volver al paso G y asegurar que `npm run build` termine sin errores (mensaje verde al final) y tenga permisos www-data.

- **Error 500 en las peticiones /api (Pantalla Blanca en Backend):**
  - *Razón:* Problema de permisos en Laravel o variable nula en .env.
  - *Solución:* Revisar el archivo de texto en `/var/www/Nubofact-Web-y-Facturador/backend/storage/logs/laravel.log`. Asegurar que los permisos del storage estén en orden: `sudo chown -R www-data:www-data backend/storage`.

- **CORS (Solicitud de Origen Cruzado Bloqueada):**
  - *Razón:* El frontend se compiló con una IP quemada en lugar de una ruta relativa.
  - *Solución:* Verificar que en `/frontend/.env` la variable sea estrictamente `VITE_API_URL=/api` y ejecutar `npm run build` nuevamente. Borrar caché del navegador (Ctrl + F5).