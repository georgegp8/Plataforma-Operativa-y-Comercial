# 🧪 Guía de Pruebas - Integración MinIO

**Fecha**: 3 de febrero de 2026  
**Versión**: 1.0

---

## 📋 Checklist de Verificación

### 1. ✅ Verificar Servicios Docker

```bash
docker ps | findstr minio
```

**Esperado:**
```
facturacion_minio    Running    9000-9001/tcp
facturacion_minio_init    Exited(0)
```

---

### 2. ✅ Verificar Bucket en MinIO Console

1. Abrir navegador: http://localhost:9001
2. Login:
   - **Usuario**: minio
   - **Contraseña**: minio123
3. Verificar bucket `facturacion` existe
4. Verificar carpetas:
   - `documentos-digitalizados/`
   - `comprobantes/`
   - `adjuntos/`

---

### 3. ✅ Test de Conexión Laravel → MinIO

```bash
cd c:\Plataforma_Op_Com_Facturacion_Elect\backend

php artisan tinker
```

**Ejecutar en Tinker:**
```php
use Illuminate\Support\Facades\Storage;

// Test 1: Write
Storage::disk('minio')->put('test/hello.txt', 'Hello MinIO!');

// Test 2: Read
$content = Storage::disk('minio')->get('test/hello.txt');
echo $content; // Debe mostrar: Hello MinIO!

// Test 3: Exists
Storage::disk('minio')->exists('test/hello.txt'); // true

// Test 4: Delete
Storage::disk('minio')->delete('test/hello.txt');
Storage::disk('minio')->exists('test/hello.txt'); // false

echo "✅ MinIO funcionando correctamente";
```

---

### 4. ✅ Test de StorageService

```php
use App\Services\StorageService;

$storage = app(StorageService::class);

// Test 1: Store content
$result = $storage->storeContent(
    'Contenido de prueba',
    'test.txt',
    'documentos',
    'test/2026/02/03'
);

dd($result);
// Esperado: ['success' => true, 'path' => '...', 'url' => '...']

// Test 2: Get URL
$url = $storage->getUrl('documentos', $result['path']);
echo $url;

// Test 3: Temporary URL
$tempUrl = $storage->getTemporaryUrl('documentos', $result['path'], 60);
echo $tempUrl; // Debe contener X-Amz-Signature

// Test 4: Exists
$storage->exists('documentos', $result['path']); // true

// Test 5: Delete
$storage->delete('documentos', $result['path']);
```

---

### 5. ✅ Test de Upload de Documento (API)

#### Opción A: Postman / Thunder Client

**Endpoint:** `POST http://localhost:8000/api/documentos-digitalizados/upload`

**Headers:**
```
Accept: application/json
```

**Body (form-data):**
```
archivo: [Seleccionar archivo PDF/JPG]
tipo_operacion: compra
```

**Respuesta Esperada:**
```json
{
  "success": true,
  "message": "Documento subido exitosamente",
  "data": {
    "id": 123,
    "nombre_archivo": "factura.pdf",
    "ruta_archivo": "compra/2026/02/03/uuid-xxx.pdf",
    "tipo_archivo": "application/pdf",
    "tamano_archivo": 123456,
    "estado_procesamiento": "pendiente",
    "created_at": "2026-02-03T10:00:00.000000Z"
  }
}
```

#### Opción B: cURL

```bash
curl -X POST http://localhost:8000/api/documentos-digitalizados/upload `
  -F "archivo=@C:\ruta\a\factura.pdf" `
  -F "tipo_operacion=compra" `
  -H "Accept: application/json"
```

---

### 6. ✅ Verificar Archivo en MinIO Console

1. Ir a http://localhost:9001
2. Navegar a: `facturacion > documentos-digitalizados > compra > 2026 > 02 > 03`
3. Debe aparecer el archivo subido con nombre UUID
4. Click en el archivo → Download → Verificar que se descarga correctamente

---

### 7. ✅ Test de Descarga de Documento (API)

**Endpoint:** `GET http://localhost:8000/api/documentos-digitalizados/{id}/descargar`

**Ejemplo:**
```bash
curl http://localhost:8000/api/documentos-digitalizados/123/descargar
```

**Respuesta Esperada:**
```json
{
  "success": true,
  "data": {
    "download_url": "http://localhost:9000/facturacion/documentos-digitalizados/...?X-Amz-Signature=...",
    "expires_in": "60 minutos",
    "nombre_archivo": "factura.pdf"
  }
}
```

**Verificar:**
1. Copiar la URL de `download_url`
2. Pegarla en el navegador
3. El archivo debe descargarse automáticamente

---

### 8. ✅ Test de OCR Integration

**Endpoint:** `POST http://localhost:8000/api/documentos-digitalizados/{id}/procesar-ocr`

```bash
curl -X POST http://localhost:8000/api/documentos-digitalizados/123/procesar-ocr
```

**Respuesta Esperada:**
```json
{
  "success": true,
  "message": "OCR procesado exitosamente",
  "data": {
    "tipo_comprobante": "01",
    "serie": "F001",
    "numero": "00000123",
    "fecha_emision": "2026-02-03",
    "entidad_razon_social": "EMPRESA EJEMPLO SAC",
    "entidad_num_doc": "20123456789",
    "total": "118.00",
    "confianza_ocr": 85.5,
    "requiere_validacion": false
  }
}
```

---

### 9. ✅ Test de Comprobante Completo (PDF + XML + CDR)

```php
use App\Services\StorageService;

$storage = app(StorageService::class);

$result = $storage->storeComprobante(
    serie: 'F001',
    numero: '00000001',
    pdfContent: file_get_contents('factura.pdf'),
    xmlContent: '<?xml version="1.0"?><Invoice></Invoice>',
    cdrContent: file_get_contents('cdr.zip')
);

dd($result);
```

**Verificar en MinIO Console:**
- `comprobantes/2026/02/F001-00000001.pdf`
- `comprobantes/2026/02/F001-00000001.xml`
- `comprobantes/2026/02/R-F001-00000001.zip`

---

### 10. ✅ Test Suite Completo (PHPUnit)

```bash
cd backend

# Ejecutar todos los tests de MinIO
php artisan test --filter=MinIOIntegrationTest

# Ejecutar un test específico
php artisan test --filter=test_minio_connection

# Con detalles
php artisan test --filter=MinIOIntegrationTest --verbose
```

**Salida Esperada:**
```
PASS  Tests\Feature\MinIOIntegrationTest
✓ minio connection                 0.15s
✓ storage service upload           0.22s
✓ storage service store content    0.18s
✓ temporary url generation         0.20s
✓ store comprobante completo       0.35s
✓ documento digitalizado upload    0.45s
✓ documento digitalizado download  0.38s
✓ file metadata                    0.12s
✓ file copy                        0.25s
✓ specialized disks                0.30s

Tests:  10 passed (55 assertions)
Duration: 2.60s
```

---

## 🔧 Troubleshooting

### Error: "Connection refused" al conectar a MinIO

**Causa:** MinIO no está corriendo

**Solución:**
```bash
docker-compose up -d minio
docker ps | findstr minio
```

---

### Error: "Credentials not found"

**Causa:** Variables de entorno incorrectas

**Solución:** Verificar `.env`:
```env
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
MINIO_ENDPOINT=http://localhost:9000
```

Luego:
```bash
php artisan config:clear
php artisan cache:clear
```

---

### Error: "Bucket does not exist"

**Causa:** Bucket no fue creado automáticamente

**Solución:**
```bash
# Opción 1: Via MinIO Console (http://localhost:9001)
# Click en "Buckets" → "Create Bucket" → Nombre: facturacion

# Opción 2: Via Docker CLI
docker exec facturacion_minio mc mb /data/facturacion
```

---

### Error: "Class 'League\Flysystem\AwsS3V3\AwsS3V3Adapter' not found"

**Causa:** Falta instalar AWS SDK

**Solución:**
```bash
cd backend
composer require league/flysystem-aws-s3-v3 "^3.0"
```

---

### Archivos no se muestran en MinIO Console

**Causa:** Permisos o bucket incorrecto

**Solución:**
1. Verificar en `.env`: `MINIO_BUCKET=facturacion`
2. Refrescar cache: `php artisan config:clear`
3. Verificar en MinIO Console que estás viendo el bucket correcto

---

### URL temporal no funciona / da 403

**Causa:** Firma expirada o credenciales incorrectas

**Solución:**
1. Verificar que `MINIO_ACCESS_KEY` y `MINIO_SECRET_KEY` coincidan con docker-compose.yml
2. Regenerar URL temporal:
   ```php
   $url = $storage->getTemporaryUrl('documentos', $path, 60);
   ```

---

## 📊 Métricas de Éxito

### ✅ Criterios de Aceptación

- [ ] MinIO corre sin errores en Docker
- [ ] Bucket `facturacion` existe y es accesible
- [ ] Storage::disk('minio')->put() funciona
- [ ] StorageService->store() sube archivos correctamente
- [ ] URLs temporales se generan con firma válida
- [ ] API de upload retorna 200 con datos correctos
- [ ] API de download genera URL temporal válida
- [ ] OCR procesa documentos desde MinIO
- [ ] Comprobantes se almacenan en estructura correcta (PDF+XML+CDR)
- [ ] Todos los tests PHPUnit pasan (10/10)

---

## 🎯 Próximos Pasos

### Completado ✅
1. ✅ Configurar MinIO en docker-compose.yml
2. ✅ Crear StorageService
3. ✅ Actualizar DocumentoDigitalizadoController
4. ✅ Instalar AWS SDK
5. ✅ Configurar .env
6. ✅ Ejecutar migración de base de datos
7. ✅ Actualizar modelo DocumentoDigitalizado

### Pendiente ⏳
1. ⏳ Migrar archivos existentes de local a MinIO (si aplica)
2. ⏳ Actualizar frontend para manejar URLs de MinIO
3. ⏳ Configurar CORS en MinIO para desarrollo local
4. ⏳ Implementar limpieza automática de archivos temporales
5. ⏳ Configurar backup automático de MinIO (opcional)

---

## 📚 Comandos Útiles

```bash
# Ver logs de MinIO
docker logs facturacion_minio -f

# Reiniciar MinIO
docker-compose restart minio

# Limpiar cache de Laravel
php artisan config:clear
php artisan cache:clear

# Ejecutar tests
php artisan test --filter=MinIOIntegrationTest

# Acceder a CLI de MinIO
docker exec -it facturacion_minio sh

# Listar archivos en bucket
docker exec facturacion_minio mc ls /data/facturacion

# Ver estadísticas de MinIO
docker exec facturacion_minio mc admin info /data
```

---

**Estado:** ✅ **LISTO PARA PRUEBAS**

Última actualización: 3 de febrero de 2026
