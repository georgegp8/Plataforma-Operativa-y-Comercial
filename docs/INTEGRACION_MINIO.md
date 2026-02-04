# 🗄️ Integración MinIO - Almacenamiento S3 Compatible

**Fecha**: 3 de febrero de 2026  
**Estado**: ✅ Implementado

---

## 📋 Resumen

MinIO ahora es el **almacenamiento principal** del sistema, reemplazando `storage/app/public` local. Todos los archivos (documentos digitalizados, comprobantes electrónicos, adjuntos) se almacenan en MinIO.

---

## 🎯 Beneficios

| Característica | Storage Local | MinIO |
|----------------|---------------|-------|
| **Escalabilidad** | Limitado por disco | ✅ Ilimitado |
| **Redundancia** | No | ✅ Configurable |
| **Velocidad** | Disco local | ✅ Optimizado |
| **URLs Directas** | Requiere symlinks | ✅ Nativas |
| **Portabilidad** | Depende de servidor | ✅ Independiente |
| **Compatible S3** | No | ✅ Sí |

---

## 🏗️ Estructura de Almacenamiento

### Buckets y Rutas

```
minio://facturacion/
├── documentos-digitalizados/
│   ├── compra/
│   │   └── 2026/02/03/
│   │       ├── uuid-1.pdf
│   │       └── uuid-2.jpg
│   └── venta/
│       └── 2026/02/03/
│           └── uuid-3.pdf
│
├── comprobantes/
│   └── 2026/02/
│       ├── F001-00000001.pdf
│       ├── F001-00000001.xml
│       ├── R-F001-00000001.zip (CDR)
│       └── B001-00000123.pdf
│
└── adjuntos/
    └── contratos/
        └── 2026/02/03/
            └── contrato-123.pdf
```

---

## ⚙️ Configuración

### 1. Variables de Entorno

Actualiza tu `.env`:

```env
# Cambiar de 'local' a 'minio'
FILESYSTEM_DISK=minio

# Configuración MinIO (ya configurado en docker-compose.yml)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
MINIO_BUCKET=facturacion
MINIO_REGION=us-east-1
MINIO_USE_PATH_STYLE_ENDPOINT=true
```

### 2. Instalar Dependencia AWS SDK

MinIO usa el driver S3 de Laravel que requiere AWS SDK:

```bash
cd backend
composer require league/flysystem-aws-s3-v3 "^3.0"
```

### 3. Inicializar Bucket

El contenedor `minio-init` en docker-compose.yml ya crea el bucket automáticamente al iniciar.

Verifica en: http://localhost:9001
- **Usuario**: minio
- **Contraseña**: minio123

---

## 💻 Uso del Servicio

### StorageService - API Unificada

```php
use App\Services\StorageService;

class MiControlador extends Controller
{
    protected $storage;

    public function __construct(StorageService $storage)
    {
        $this->storage = $storage;
    }

    public function upload(Request $request)
    {
        $archivo = $request->file('archivo');
        
        // Subir a MinIO
        $resultado = $this->storage->store(
            file: $archivo,
            disk: 'documentos',  // documentos, comprobantes, adjuntos
            path: 'compra/2026/02/03',
            filename: null  // Auto-generado con UUID
        );

        if ($resultado['success']) {
            // Guardar en BD
            $registro = MiModelo::create([
                'ruta_archivo' => $resultado['path'],
                'url' => $resultado['url'],
                'tamano' => $resultado['size'],
            ]);
        }
    }
}
```

### Métodos Disponibles

#### 1. **Subir Archivo**
```php
$resultado = $storage->store($uploadedFile, 'documentos', 'compra/2026/02/03');
// Retorna: ['success' => true, 'path' => '...', 'url' => '...', 'size' => ...]
```

#### 2. **Subir Contenido Directo** (PDF generado, XML)
```php
$resultado = $storage->storeContent(
    content: $pdfBinario,
    filename: 'F001-00000001.pdf',
    disk: 'comprobantes',
    path: '2026/02'
);
```

#### 3. **Obtener URL Pública**
```php
$url = $storage->getUrl('documentos', 'compra/2026/02/03/archivo.pdf');
// http://localhost:9000/facturacion/documentos-digitalizados/compra/2026/02/03/archivo.pdf
```

#### 4. **Obtener URL Temporal Firmada** (Segura, expira)
```php
$url = $storage->getTemporaryUrl('documentos', 'archivo.pdf', 60); // 60 minutos
// http://localhost:9000/facturacion/...?X-Amz-Signature=...
```

#### 5. **Descargar Contenido**
```php
$contenido = $storage->get('documentos', 'archivo.pdf');
// Retorna string binario
```

#### 6. **Verificar Existencia**
```php
$existe = $storage->exists('documentos', 'archivo.pdf');
// true o false
```

#### 7. **Eliminar**
```php
$eliminado = $storage->delete('documentos', 'archivo.pdf');
```

#### 8. **Guardar Comprobante Completo** (PDF + XML + CDR)
```php
$resultado = $storage->storeComprobante(
    serie: 'F001',
    numero: '00000001',
    pdfContent: $pdfBinario,
    xmlContent: $xmlBinario,
    cdrContent: $cdrZip
);

// Retorna:
// [
//   'success' => true,
//   'files' => [
//     'pdf' => ['path' => '...', 'url' => '...'],
//     'xml' => ['path' => '...', 'url' => '...'],
//     'cdr' => ['path' => '...', 'url' => '...']
//   ]
// ]
```

---

## 🔍 Ejemplo: DocumentoDigitalizado

### Antes (Storage Local)
```php
// Upload
$ruta = $archivo->storeAs('documentos_digitalizados', $nombreUnico, 'public');

// Descargar
return Storage::disk('public')->download($documento->ruta_archivo);

// URL
$url = Storage::disk('public')->url($ruta);
```

### Ahora (MinIO)
```php
// Upload
$resultado = $this->storageService->store($archivo, 'documentos', 'compra/2026/02/03');
$documento->ruta_archivo = $resultado['path'];

// Descargar (URL firmada)
$url = $this->storageService->getTemporaryUrl('documentos', $documento->ruta_archivo, 60);

// URL pública (si el archivo es público)
$url = $this->storageService->getUrl('documentos', $documento->ruta_archivo);
```

---

## 🚀 Migración de Archivos Existentes

Si tienes archivos en `backend/storage/app/public/`, migrarlos a MinIO:

### Opción 1: Script Manual
```bash
cd backend

php artisan tinker

# Migrar documentos
use App\Models\DocumentoDigitalizado;
use App\Services\StorageService;
use Illuminate\Support\Facades\Storage;

$storage = app(StorageService::class);

DocumentoDigitalizado::chunk(100, function ($documentos) use ($storage) {
    foreach ($documentos as $doc) {
        $rutaLocal = $doc->ruta_archivo;
        
        if (Storage::disk('public')->exists($rutaLocal)) {
            $contenido = Storage::disk('public')->get($rutaLocal);
            
            $resultado = $storage->storeContent(
                $contenido,
                basename($rutaLocal),
                'documentos',
                dirname($rutaLocal)
            );
            
            if ($resultado['success']) {
                $doc->ruta_archivo = $resultado['path'];
                $doc->save();
                echo "Migrado: {$doc->id}\n";
            }
        }
    }
});
```

### Opción 2: Comando Artisan (Recomendado)

Crear comando de migración:

```bash
php artisan make:command MigrarArchivosMinIO
```

```php
<?php
namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\DocumentoDigitalizado;
use App\Services\StorageService;
use Illuminate\Support\Facades\Storage;

class MigrarArchivosMinIO extends Command
{
    protected $signature = 'storage:migrate-minio';
    protected $description = 'Migrar archivos de storage local a MinIO';

    public function handle(StorageService $storage)
    {
        $this->info('Iniciando migración a MinIO...');
        
        $count = 0;
        
        DocumentoDigitalizado::chunk(50, function ($docs) use ($storage, &$count) {
            foreach ($docs as $doc) {
                if (Storage::disk('public')->exists($doc->ruta_archivo)) {
                    $contenido = Storage::disk('public')->get($doc->ruta_archivo);
                    
                    $resultado = $storage->storeContent(
                        $contenido,
                        basename($doc->ruta_archivo),
                        'documentos',
                        $doc->tipo_operacion . '/' . date('Y/m/d', strtotime($doc->created_at))
                    );
                    
                    if ($resultado['success']) {
                        $doc->ruta_archivo = $resultado['path'];
                        $doc->save();
                        $count++;
                        $this->info("✓ Migrado: {$doc->nombre_archivo}");
                    }
                }
            }
        });
        
        $this->info("✅ Migración completada: {$count} archivos");
    }
}
```

Ejecutar:
```bash
php artisan storage:migrate-minio
```

---

## 🧪 Testing

### Verificar Conexión MinIO

```bash
# Desde Laravel Tinker
php artisan tinker

use Illuminate\Support\Facades\Storage;

// Test de conexión
Storage::disk('minio')->put('test.txt', 'Hello MinIO!');
$contenido = Storage::disk('minio')->get('test.txt');
echo $contenido; // "Hello MinIO!"

// Limpiar
Storage::disk('minio')->delete('test.txt');
```

### Subir Archivo de Prueba

```php
use App\Services\StorageService;

$storage = app(StorageService::class);

// Crear archivo de prueba
file_put_contents('/tmp/test.pdf', 'Contenido de prueba');

$resultado = $storage->storeContent(
    file_get_contents('/tmp/test.pdf'),
    'test.pdf',
    'documentos',
    'test/2026/02/03'
);

dd($resultado);
```

---

## 🔒 Seguridad

### URLs Temporales Firmadas

Para archivos privados, **siempre usar URLs temporales**:

```php
// ✅ CORRECTO - URL expira en 60 minutos
$url = $storage->getTemporaryUrl('documentos', $path, 60);

// ❌ INCORRECTO - URL pública permanente
$url = $storage->getUrl('documentos', $path);
```

### Visibility

```php
// Archivos privados (default)
'visibility' => 'private'

// Archivos públicos (solo logos, assets)
'visibility' => 'public'
```

---

## 📊 Monitoreo

### Acceder a MinIO Console

http://localhost:9001

- **Usuario**: minio
- **Contraseña**: minio123

Desde aquí puedes:
- Ver todos los archivos
- Descargar/eliminar manualmente
- Ver estadísticas de almacenamiento
- Configurar políticas de acceso

---

## 🐛 Troubleshooting

### Error: "Connection refused"
```
✅ Solución: Verificar que MinIO esté corriendo
docker ps | grep minio
docker-compose up -d minio
```

### Error: "Credentials not found"
```
✅ Solución: Verificar variables en .env
MINIO_ACCESS_KEY=minio
MINIO_SECRET_KEY=minio123
```

### Error: "Bucket does not exist"
```
✅ Solución: Crear bucket manualmente
docker exec -it facturacion_minio mc mb /data/facturacion
```

### URL no accesible desde frontend
```
✅ Solución: Para desarrollo, usar URLs temporales o configurar CORS en MinIO
```

---

## 🎯 Próximos Pasos

1. ✅ Configurar MinIO - **COMPLETADO**
2. ✅ Crear StorageService - **COMPLETADO**
3. ✅ Actualizar DocumentoDigitalizadoController - **COMPLETADO**
4. ⏳ Instalar AWS SDK: `composer require league/flysystem-aws-s3-v3`
5. ⏳ Actualizar .env con `FILESYSTEM_DISK=minio`
6. ⏳ Migrar archivos existentes (si aplica)
7. ⏳ Testing end-to-end

---

## 📚 Referencias

- **MinIO Docs**: https://min.io/docs/minio/container/index.html
- **Laravel Filesystem**: https://laravel.com/docs/filesystem
- **AWS S3 SDK**: https://github.com/thephpleague/flysystem-aws-s3-v3

---

**Estado**: ✅ **LISTO PARA USAR**

Solo falta:
1. Instalar dependencia: `composer require league/flysystem-aws-s3-v3`
2. Cambiar `.env`: `FILESYSTEM_DISK=minio`
3. ¡Listo!
