# Operación en Producción

## 1. Logs del Sistema

### Ubicaciones

| Log | Ruta | Contenido |
|-----|------|-----------|
| Laravel general | `backend/storage/logs/laravel.log` | Errores PHP, queries, exceptions |
| NubeFact | `backend/storage/logs/nubefact-YYYY-MM-DD.log` | Peticiones y respuestas NubeFact API |
| Nginx acceso | `/var/log/nginx/facturacion_access.log` | Peticiones HTTP |
| Nginx error | `/var/log/nginx/facturacion_error.log` | Errores Nginx / PHP-FPM |
| PostgreSQL | `/var/log/postgresql/postgresql-15-main.log` | Queries lentos, errores BD |
| Supervisor | `/var/log/supervisor/facturacion-worker.log` | Workers de colas |
| Sync NubeFact | `/var/log/nubefact-sync.log` | Cron de sincronización |

### Ver logs en tiempo real

```bash
# Laravel
tail -f /var/www/Nubofact-Web-y-Facturador/backend/storage/logs/laravel.log

# NubeFact (log del día)
tail -f /var/www/Nubofact-Web-y-Facturador/backend/storage/logs/nubefact-$(date +%Y-%m-%d).log

# Nginx
tail -f /var/log/nginx/facturacion_error.log

# Todos a la vez
multitail /var/www/.../laravel.log /var/log/nginx/facturacion_error.log
```

### Buscar errores en logs

```bash
# Errores PHP en el último log Laravel
grep -i "error\|exception\|fatal" backend/storage/logs/laravel.log | tail -50

# Fallos de emisión NubeFact
grep -i "error\|failed\|exception" backend/storage/logs/nubefact-*.log

# Peticiones 500 en Nginx
grep " 500 " /var/log/nginx/facturacion_access.log | tail -20
```

---

## 2. Gestión de Servicios

### Reiniciar servicios

```bash
# Nginx
sudo systemctl restart nginx
sudo systemctl reload nginx    # Recarga sin cortar conexiones

# PHP-FPM
sudo systemctl restart php8.2-fpm

# PostgreSQL
sudo systemctl restart postgresql

# Workers de colas
sudo supervisorctl restart facturacion-worker:*

# Reinicio completo de todo
sudo systemctl restart php8.2-fpm nginx postgresql
sudo supervisorctl restart all
```

### Verificar estado de servicios

```bash
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status php8.2-fpm
sudo supervisorctl status
docker ps    # Para OCR y MinIO si usan Docker
```

### Reiniciar servicios Docker (OCR + MinIO)

```bash
# En directorio del proyecto
docker-compose restart
docker-compose restart facturacion_ocr
docker-compose restart facturacion_minio
```

---

## 3. Backups

### Base de Datos PostgreSQL

**Backup manual:**
```bash
# Dump completo
pg_dump -U facturacion_user -h 127.0.0.1 plataforma_facturacion \
  > /backups/facturacion_$(date +%Y%m%d_%H%M%S).sql

# Comprimido
pg_dump -U facturacion_user -h 127.0.0.1 plataforma_facturacion | \
  gzip > /backups/facturacion_$(date +%Y%m%d).sql.gz
```

**Backup automático con cron:**

```bash
# Editar crontab de root
sudo crontab -e
```

```cron
# Backup diario a las 2:00 AM
0 2 * * * pg_dump -U facturacion_user -h 127.0.0.1 plataforma_facturacion | gzip > /backups/facturacion_$(date +\%Y\%m\%d).sql.gz

# Eliminar backups de más de 30 días
0 3 * * * find /backups -name "facturacion_*.sql.gz" -mtime +30 -delete
```

### Restaurar un Backup

```bash
# Restaurar desde dump
gunzip < /backups/facturacion_20260221.sql.gz | \
  psql -U facturacion_user -h 127.0.0.1 plataforma_facturacion

# O desde SQL sin comprimir
psql -U facturacion_user -h 127.0.0.1 plataforma_facturacion < /backups/facturacion.sql
```

### Storage (MinIO)

Los archivos en MinIO son los documentos OCR digitalizados. Los XML/PDF/CDR de comprobantes viven en NubeFact Cloud (no en MinIO local).

```bash
# Backup de bucket MinIO con mc (MinIO client)
mc alias set local http://localhost:9000 minio minio123
mc mirror local/facturacion /backups/minio/

# Restaurar
mc mirror /backups/minio/ local/facturacion
```

---

## 4. Actualización del Sistema

```bash
cd /var/www/Nubofact-Web-y-Facturador

# 1. Hacer backup antes de actualizar
pg_dump -U facturacion_user plataforma_facturacion | gzip > /backups/pre-update-$(date +%Y%m%d).sql.gz

# 2. Pull cambios
sudo -u www-data git pull origin main

# 3. Backend
cd backend
sudo -u www-data composer install --no-dev --optimize-autoloader
sudo -u www-data php artisan migrate --force
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan route:cache
sudo -u www-data php artisan view:cache

# 4. Frontend
cd ../frontend
sudo -u www-data npm ci --production
sudo -u www-data npm run build

# 5. Reiniciar
sudo systemctl restart php8.2-fpm
sudo systemctl reload nginx
sudo supervisorctl restart facturacion-worker:*
```

---

## 5. Rollback

```bash
# Ver tags/versiones disponibles
git tag --list
git log --oneline -10

# Volver a una versión anterior
sudo -u www-data git checkout v1.0-entrega

# Re-ejecutar pasos de despliegue (composer, npm build, artisan cache)
```

---

## 6. Troubleshooting — Problemas Comunes

### Error 500 en la API

```bash
# 1. Verificar logs Laravel
tail -100 backend/storage/logs/laravel.log | grep -i "exception\|error"

# 2. Verificar permisos
ls -la backend/storage/
sudo chown -R www-data:www-data backend/storage backend/bootstrap/cache
sudo chmod -R 775 backend/storage backend/bootstrap/cache

# 3. Limpiar caché
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

### Email no se envía

```bash
# Probar SMTP directamente
cd backend
php artisan tinker --execute="Mail::raw('Prueba', fn(\$m) => \$m->to('destino@gmail.com')->subject('Test'));"

# Verificar .env
grep MAIL_ .env

# Ver log de errores de mail
grep -i "mail\|smtp\|email" storage/logs/laravel.log | tail -20
```

### NubeFact no responde o devuelve error

```bash
# Verificar conexión
curl http://localhost:8000/api/nubefact-sync/estado \
  -H "Authorization: Bearer {token}"

# Ver log NubeFact del día
cat backend/storage/logs/nubefact-$(date +%Y-%m-%d).log

# Verificar configuración
grep NUBEFACT backend/.env
```

### Base de datos no conecta

```bash
# Ver estado PostgreSQL
sudo systemctl status postgresql

# Probar conexión directa
psql -U facturacion_user -h 127.0.0.1 -d plataforma_facturacion -c "SELECT 1;"

# Ver errores PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

### Frontend muestra pantalla en blanco

```bash
# Verificar que el build existe
ls -la frontend/dist/

# Verificar Nginx apunta al dist correcto
nginx -T | grep root

# Reconstruir frontend
cd frontend && npm run build
```

### Servicio OCR no responde

```bash
# Ver estado del contenedor
docker ps | grep facturacion_ocr

# Ver logs del contenedor
docker logs facturacion_ocr --tail 50

# Reiniciar contenedor
docker-compose restart facturacion_ocr

# Probar OCR manualmente
docker exec facturacion_ocr python -c "import pytesseract; print('OK')"
```

---

## 7. Monitoreo de Recursos

```bash
# CPU y memoria
htop

# Disco
df -h
du -sh backend/storage/

# Conexiones PostgreSQL activas
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Ver procesos PHP lentos
ps aux | grep php | sort -k3 -rn | head -10
```

---

## 8. Sincronización NubeFact Manual

Cuando se necesita forzar sync de comprobantes:

```bash
cd backend

# Sincronizar pendientes (los no consultados en 24h)
php artisan nubefact:sync --pendientes

# Sincronizar rango específico
php artisan nubefact:sync --tipo=01 --serie=F010 --inicio=1 --fin=50

# Verificar estadísticas de sync
curl /api/nubefact-sync/estadisticas -H "Authorization: Bearer {token}"
```

---

## 9. Gestión de Colas

```bash
# Ver estado de workers
sudo supervisorctl status

# Ver trabajos en cola en BD
cd backend
php artisan queue:monitor

# Limpiar trabajos fallidos
php artisan queue:flush

# Re-intentar trabajos fallidos
php artisan queue:retry all
```
