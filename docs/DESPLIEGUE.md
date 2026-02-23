# Guía de Despliegue en Producción: Plataforma Facturación Electrónica

> Este documento detalla el procedimiento exacto para desplegar el sistema (Frontend React + Backend Laravel + Servicios Docker) en un entorno de producción basado en Debian 12.

**Objetivo:** Permitir al equipo de infraestructura desplegar el sistema completo sin depender del equipo de desarrollo.

---

## A) Requisitos del Entorno

### Hardware Recomendado

- **CPU:** 2 Cores (mínimo) / 4 Cores (recomendado para OCR y PDF).
- **RAM:** 4 GB (mínimo) / 8 GB (recomendado).
- **Disco:** 50 GB SSD.

### Software y Stack Tecnológico

- **Sistema Operativo:** Debian 12 (Bookworm) o Ubuntu 22.04 LTS.
- **Servidor Web:** Nginx.
- **Base de Datos:** PostgreSQL 15.
- **Backend:** PHP 8.2 (FPM) y Composer.
- **Frontend:** Node.js 22 y NPM.
- **Servicios Adicionales:** Docker y Docker Compose (para MinIO y módulo OCR).

### Puertos Necesarios (Firewall)

- **22/TCP:** SSH (Acceso administrativo).
- **80/TCP:** HTTP (Tráfico web frontend y API).
- **443/TCP:** HTTPS (Tráfico web seguro).
- **9000/9001:** Consola y API MinIO (Docker).
- **5000:** Servicio OCR (Docker).

---

## B) Preparación del Servidor

### 1. Acceso y Permisos (Sudo)

Si el usuario actual no tiene privilegios de sudo, configúralo primero:

```bash
su -
# Ingresa contraseña de root
apt update && apt install sudo -y
usermod -aG sudo tu_usuario
exit
# Cierra sesión y vuelve a entrar para aplicar los cambios
```

### 2. Configuración de Repositorios Oficiales

```bash
# Limpieza de repositorios conflictivos
sudo rm -f /etc/apt/sources.list.d/php.list /etc/apt/sources.list.d/pgdg.list /etc/apt/sources.list.d/docker.list
sudo rm -f /usr/share/keyrings/deb.sury.org-php.gpg

# Herramientas base
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget gnupg ca-certificates lsb-release apt-transport-https software-properties-common unzip git ufw

# Repositorio PHP 8.2 (Ondřej Surý)
sudo curl -sSlo /usr/share/keyrings/deb.sury.org-php.gpg https://packages.sury.org/php/apt.gpg
echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" | sudo tee /etc/apt/sources.list.d/php.list

# Repositorio PostgreSQL 15
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg

# Repositorio Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Repositorio Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
```

### 3. Instalación de Dependencias del Stack

```bash
sudo apt update
sudo apt install -y php8.2 php8.2-fpm php8.2-pgsql php8.2-mbstring php8.2-xml php8.2-curl php8.2-zip php8.2-gd php8.2-cli php8.2-fileinfo php8.2-bcmath php8.2-intl postgresql-15 postgresql-client-15 nginx nodejs docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Instalación Global de Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
sudo chmod +x /usr/local/bin/composer

# Configuración del Firewall (UFW)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Permisos para Docker
sudo usermod -aG docker $USER
newgrp docker
```

---

## C) Creación de Base de Datos

Preparación del motor PostgreSQL y el esquema inicial para el sistema.

```bash
# Crear base de datos y usuario
sudo -u postgres psql -c "CREATE DATABASE plataforma_facturacion;"
sudo -u postgres psql -c "CREATE USER facturacion_user WITH PASSWORD 'password_seguro';"

# Asignar privilegios
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE plataforma_facturacion TO facturacion_user;"
sudo -u postgres psql -d plataforma_facturacion -c "GRANT ALL ON SCHEMA public TO facturacion_user; ALTER SCHEMA public OWNER TO facturacion_user;"
```

---

## D) Obtención de Código y Directorios

El código fuente principal se alojará en `/var/www/`.

```bash
# Preparar directorio raíz
sudo mkdir -p /var/www
sudo chown root:sudo /var/www
sudo chmod 775 /var/www
cd /var/www

# Clonar el repositorio (Reemplazar con el PAT token válido de GitHub)
sudo git clone https://ghp_TU_TOKEN_AQUI@github.com/diegomejiam/Nubofact-Web-y-Facturador.git Nubofact-Web-y-Facturador

# Configurar propietario web para Nginx/PHP
sudo chown -R www-data:www-data /var/www/Nubofact-Web-y-Facturador
sudo chmod -R 755 /var/www/Nubofact-Web-y-Facturador
```

---

## E) Variables de Entorno (Backend)

```bash
cd /var/www/Nubofact-Web-y-Facturador/backend
sudo -u www-data composer install --no-dev --optimize-autoloader
sudo -u www-data cp .env.example .env
sudo nano .env
```

Pega el siguiente contenido y reemplaza los valores entre `< >` con los datos reales de producción:

```env
APP_NAME="Plataforma Facturación"
APP_ENV=production
APP_KEY=                          # Se generará en el siguiente paso
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
DB_PASSWORD=password_seguro       # Debe coincidir con el paso C

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
MINIO_SECRET=password_minio_seguro  # Cambiar por contraseña fuerte
MINIO_BUCKET=facturacion
MINIO_USE_PATH_STYLE_ENDPOINT=true
MINIO_REGION=us-east-1

# OCR
OCR_USE_DOCKER=true
GEMINI_API_KEY=<api key de Google AI Studio>

QUEUE_CONNECTION=database
SESSION_DRIVER=database
CACHE_STORE=database
VITE_APP_NAME="${APP_NAME}"
```

---

## F) Inicialización del Backend y Restauración de Backup

### Opción 1: Instalación desde Cero (Sin datos previos)

```bash
cd /var/www/Nubofact-Web-y-Facturador/backend
sudo -u www-data php artisan key:generate
sudo -u www-data php artisan migrate --force
sudo -u www-data php artisan db:seed --class=CatalogosSunatSeeder
sudo -u www-data php artisan storage:link
sudo chmod 600 .env
```

### Opción 2: Restauración de Backup Existente

```bash
cd /var/www/Nubofact-Web-y-Facturador/backend
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

## G) Construcción del Frontend y Servicios Docker

```bash
cd /var/www/Nubofact-Web-y-Facturador/frontend

# Forzar ruta relativa para Nginx
sudo bash -c 'echo "VITE_API_URL=/api" > .env'

# Compilación Frontend (Vite)
sudo rm -rf dist
sudo npm install --legacy-peer-deps
sudo -u www-data npm run build

# Levantar Servicios Satélite (MinIO/OCR)
cd /var/www/Nubofact-Web-y-Facturador
docker compose up -d
```

---

## H) Configuración de Reverse Proxy (Nginx)

```bash
sudo nano /etc/nginx/sites-available/facturacion
```

Copiar exactamente el siguiente bloque:

```nginx
server {
	listen 80;
	server_name _; # Reemplazar con el dominio o dejar '_' para IP

	# 1. RUTA DEL FRONTEND (React)
	root /var/www/Nubofact-Web-y-Facturador/frontend/dist;
	index index.html;

	# 2. LOGS PARA VER ERRORES
	access_log /var/log/nginx/facturacion_access.log;
	error_log  /var/log/nginx/facturacion_error.log;

	# 3. BLOQUE PARA EL FRONTEND (SPA)
	location / {
		try_files $uri $uri/ /index.html;
	}

	# 4. BLOQUE PARA EL BACKEND (Laravel API)
	location /api {
		fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
		fastcgi_param SCRIPT_FILENAME /var/www/Nubofact-Web-y-Facturador/backend/public/index.php;
		fastcgi_param DOCUMENT_ROOT /var/www/Nubofact-Web-y-Facturador/backend/public;
		include fastcgi_params;
        
		# Extender timeout para facturación OCR
		fastcgi_read_timeout 120;
	}

	# 5. SEGURIDAD OCULTA
	location ~ /\.(?!well-known).* {
		deny all;
	}
}
```

Activar el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/facturacion /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Validar sintaxis y aplicar
sudo nginx -t && sudo systemctl restart nginx
```

---

## I) Verificación Final y Troubleshooting Básico

### Verificaciones (Obligatorio)

- **Frontend:** Acceder a `http://<IP_SERVIDOR>`. Debe cargar la pantalla de inicio de sesión de React.
- **Backend (Health Check):** Al intentar iniciar sesión, verificar mediante las herramientas de red del navegador (F12 -> Network) que la petición viaje a `http://<IP_SERVIDOR>/api/auth/login` sin errores de CORS.
- **Servicios Adicionales:** Ejecutar `docker ps` y confirmar que minio y ocr estén en estado "Up".

### Troubleshooting (Problemas Comunes)

1. **Error "Solicitud de origen cruzado (CORS) bloqueada"**
   - **Causa:** El frontend se compiló con una variable .env incorrecta.
   - **Solución:** Asegurar que `VITE_API_URL=/api` en el .env del frontend y ejecutar `npm run build` nuevamente. Borrar la caché del navegador.

2. **Pantalla en blanco o Error 500 al navegar por la API**
   - **Causa:** Permisos insuficientes en las carpetas temporales de Laravel.
   - **Solución:** Ejecutar `sudo chown -R www-data:www-data /var/www/Nubofact-Web-y-Facturador/backend/storage` y limpiar caché con `php artisan cache:clear`.

3. **Error 404/502 en las rutas /api**
   - **Causa:** Nginx no está redirigiendo a PHP-FPM correctamente.
   - **Solución:** Verificar que el servicio esté corriendo con `sudo systemctl status php8.2-fpm`. Revisar la ruta de `fastcgi_pass` en el bloque `location /api` de Nginx.

---
