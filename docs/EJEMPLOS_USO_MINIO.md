# 💡 MinIO - Ejemplos de Uso Práctico

**Última actualización:** 3 de febrero de 2026

---

## 📤 1. Upload de Documento Digitalizado

### Desde Postman / Thunder Client

```http
POST http://localhost:8000/api/documentos-digitalizados/upload
Content-Type: multipart/form-data

archivo: [file] factura-proveedor.pdf
tipo_operacion: compra
```

### Desde cURL (Windows PowerShell)

```powershell
curl.exe -X POST http://localhost:8000/api/documentos-digitalizados/upload `
  -F "archivo=@C:\facturas\factura-123.pdf" `
  -F "tipo_operacion=compra" `
  -H "Accept: application/json"
```

### Desde JavaScript (Frontend)

```javascript
const uploadDocumento = async (file, tipoOperacion) => {
  const formData = new FormData();
  formData.append('archivo', file);
  formData.append('tipo_operacion', tipoOperacion);

  const response = await fetch('/api/documentos-digitalizados/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
    }
  });

  return await response.json();
}

// Uso
const file = document.getElementById('fileInput').files[0];
const result = await uploadDocumento(file, 'compra');

console.log('Documento ID:', result.data.id);
console.log('Ruta MinIO:', result.data.ruta_archivo);
```

**Respuesta Esperada:**

```json
{
  "success": true,
  "message": "Documento subido exitosamente",
  "data": {
    "id": 456,
    "nombre_archivo": "factura-123.pdf",
    "ruta_archivo": "compra/2026/02/03/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf",
    "tipo_archivo": "application/pdf",
    "tamano_archivo": 245678,
    "estado_procesamiento": "pendiente",
    "created_at": "2026-02-03T15:30:00.000000Z"
  }
}
```

---

## 🔍 2. Procesar Documento con OCR

### Request

```http
POST http://localhost:8000/api/documentos-digitalizados/456/procesar-ocr
Accept: application/json
```

### cURL

```powershell
curl.exe -X POST http://localhost:8000/api/documentos-digitalizados/456/procesar-ocr `
  -H "Accept: application/json"
```

### JavaScript

```javascript
const procesarOCR = async (documentoId) => {
  const response = await fetch(`/api/documentos-digitalizados/${documentoId}/procesar-ocr`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
    }
  });

  return await response.json();
}

// Uso
const resultado = await procesarOCR(456);

if (resultado.success) {
  console.log('Tipo:', resultado.data.tipo_comprobante); // "01" (Factura)
  console.log('Serie-Número:', resultado.data.comprobante_completo); // "F001-00000123"
  console.log('Proveedor:', resultado.data.entidad_razon_social);
  console.log('Total:', resultado.data.total); // 118.00
  console.log('Confianza:', resultado.data.confianza_ocr); // 85.5%
  
  if (resultado.data.requiere_validacion) {
    alert('⚠️ Documento requiere validación manual (confianza < 80%)');
  }
}
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
    "comprobante_completo": "F001-00000123",
    "fecha_emision": "2026-02-03",
    "entidad_tipo_doc": "6",
    "entidad_num_doc": "20123456789",
    "entidad_razon_social": "PROVEEDOR EJEMPLO S.A.C.",
    "moneda": "PEN",
    "tipo_cambio": null,
    "total_gravada": "100.00",
    "igv": "18.00",
    "total": "118.00",
    "porcentaje_igv": "18.00",
    "orden_compra_servicio": "OC-2026-001",
    "condiciones_pago": "PAGO A 30 DÍAS",
    "fecha_vencimiento": "2026-03-05",
    "venta_al_credito": true,
    "items_extraidos": [
      {
        "descripcion": "LAPTOP HP PAVILION 15",
        "cantidad": "1",
        "unidad_medida": "NIU",
        "valor_unitario": "100.00",
        "tipo_igv": "10",
        "igv": "18.00",
        "total": "118.00"
      }
    ],
    "confianza_ocr": 92.5,
    "requiere_validacion": false
  }
}
```

---

## 📥 3. Descargar Documento (URL Temporal)

### Request

```http
GET http://localhost:8000/api/documentos-digitalizados/456/descargar
Accept: application/json
```

### cURL

```powershell
curl.exe http://localhost:8000/api/documentos-digitalizados/456/descargar
```

### JavaScript

```javascript
const descargarDocumento = async (documentoId) => {
  const response = await fetch(`/api/documentos-digitalizados/${documentoId}/descargar`);
  const data = await response.json();

  if (data.success) {
    // Opción 1: Abrir en nueva pestaña
    window.open(data.data.download_url, '_blank');

    // Opción 2: Descargar directamente
    const link = document.createElement('a');
    link.href = data.data.download_url;
    link.download = data.data.nombre_archivo;
    link.click();
  }
}

// Uso
await descargarDocumento(456);
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "download_url": "http://localhost:9000/facturacion/documentos-digitalizados/compra/2026/02/03/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=minio%2F20260203%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260203T153000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=abc123...",
    "expires_in": "60 minutos",
    "nombre_archivo": "factura-123.pdf"
  }
}
```

> ⚠️ **Importante:** La URL expira en 60 minutos. Si intentas usarla después, obtendrás error 403 Forbidden.

---

## 💾 4. Uso Directo de StorageService (Backend)

### Subir Archivo Uploaded

```php
use App\Services\StorageService;

class MiControlador extends Controller
{
    protected $storage;

    public function __construct(StorageService $storage)
    {
        $this->storage = $storage;
    }

    public function subirFactura(Request $request)
    {
        $archivo = $request->file('factura');
        
        // Upload a MinIO
        $resultado = $this->storage->store(
            file: $archivo,
            disk: 'documentos',
            path: 'compra/' . date('Y/m/d'),
            filename: null  // Auto-genera UUID
        );

        if ($resultado['success']) {
            // Guardar en BD
            $documento = DocumentoDigitalizado::create([
                'nombre_archivo' => $archivo->getClientOriginalName(),
                'ruta_archivo' => $resultado['path'],
                'tipo_archivo' => $archivo->getMimeType(),
                'tamano_archivo' => $resultado['size'],
                'tipo_operacion' => 'compra',
            ]);

            return response()->json([
                'success' => true,
                'documento_id' => $documento->id,
                'url' => $resultado['url'],
            ]);
        }
    }
}
```

---

### Guardar Contenido Generado (PDF/XML)

```php
use Barryvdh\DomPDF\Facade\Pdf;

public function generarFacturaPDF($ventaId)
{
    $venta = Venta::with('items')->findOrFail($ventaId);
    
    // Generar PDF
    $pdf = Pdf::loadView('comprobantes.factura', compact('venta'));
    $pdfContent = $pdf->output();
    
    // Subir a MinIO
    $resultado = $this->storage->storeContent(
        content: $pdfContent,
        filename: "{$venta->serie}-{$venta->numero}.pdf",
        disk: 'comprobantes',
        path: date('Y/m')
    );

    if ($resultado['success']) {
        $venta->update([
            'pdf_path' => $resultado['path'],
            'pdf_url' => $resultado['url'],
        ]);
    }

    return $resultado;
}
```

---

### Guardar Comprobante Completo (PDF + XML + CDR)

```php
public function enviarSunat($ventaId)
{
    $venta = Venta::findOrFail($ventaId);
    
    // 1. Generar PDF
    $pdf = Pdf::loadView('comprobantes.factura', compact('venta'));
    $pdfContent = $pdf->output();
    
    // 2. Generar XML
    $xml = $this->generarXMLSunat($venta);
    
    // 3. Enviar a SUNAT (NubeFact)
    $response = $this->nubefactService->enviarComprobante($xml);
    $cdrContent = $response->getCDR(); // ZIP con respuesta SUNAT
    
    // 4. Guardar todo en MinIO
    $resultado = $this->storage->storeComprobante(
        serie: $venta->serie,
        numero: $venta->numero,
        pdfContent: $pdfContent,
        xmlContent: $xml,
        cdrContent: $cdrContent
    );

    if ($resultado['success']) {
        $venta->update([
            'pdf_path' => $resultado['files']['pdf']['path'],
            'xml_path' => $resultado['files']['xml']['path'],
            'cdr_path' => $resultado['files']['cdr']['path'],
            'sunat_estado' => 'aceptado',
        ]);
    }

    return $resultado;
}
```

---

### Obtener URL Temporal para Descarga

```php
public function descargarComprobante($ventaId)
{
    $venta = Venta::findOrFail($ventaId);
    
    // Generar URL temporal (60 minutos)
    $url = $this->storage->getTemporaryUrl(
        disk: 'comprobantes',
        path: $venta->pdf_path,
        minutes: 60
    );

    return response()->json([
        'success' => true,
        'download_url' => $url,
        'expires_in' => '60 minutos',
    ]);
}
```

---

### Verificar si Archivo Existe

```php
public function verificarComprobante($ventaId)
{
    $venta = Venta::findOrFail($ventaId);
    
    $pdfExists = $this->storage->exists('comprobantes', $venta->pdf_path);
    $xmlExists = $this->storage->exists('comprobantes', $venta->xml_path);
    $cdrExists = $this->storage->exists('comprobantes', $venta->cdr_path);

    return response()->json([
        'pdf' => $pdfExists,
        'xml' => $xmlExists,
        'cdr' => $cdrExists,
    ]);
}
```

---

### Eliminar Archivo

```php
public function eliminarDocumento($documentoId)
{
    $documento = DocumentoDigitalizado::findOrFail($documentoId);
    
    // Eliminar de MinIO
    $eliminado = $this->storage->delete('documentos', $documento->ruta_archivo);

    if ($eliminado) {
        // Eliminar de BD
        $documento->delete();

        return response()->json([
            'success' => true,
            'message' => 'Documento eliminado',
        ]);
    }
}
```

---

### Copiar Archivo

```php
public function duplicarFactura($ventaId)
{
    $venta = Venta::findOrFail($ventaId);
    
    $source = $venta->pdf_path;
    $destination = date('Y/m') . '/' . $venta->serie . '-' . $venta->numero . '-COPIA.pdf';
    
    $copiado = $this->storage->copy('comprobantes', $source, $destination);

    if ($copiado) {
        return response()->json([
            'success' => true,
            'nueva_ruta' => $destination,
        ]);
    }
}
```

---

### Obtener Metadata de Archivo

```php
public function infoArchivo($documentoId)
{
    $documento = DocumentoDigitalizado::findOrFail($documentoId);
    
    $metadata = $this->storage->metadata('documentos', $documento->ruta_archivo);

    return response()->json([
        'nombre' => $documento->nombre_archivo,
        'tamano' => $metadata['size'] . ' bytes',
        'tipo' => $metadata['type'],
        'ultima_modificacion' => $metadata['last_modified'],
    ]);
}
```

---

## 🔄 5. Integración con OCR Docker

### Flujo Completo: Upload → OCR → Validación

```php
public function procesarFacturaCompleto(Request $request)
{
    // 1. Upload a MinIO
    $archivo = $request->file('factura');
    
    $resultadoUpload = $this->storage->store(
        $archivo,
        'documentos',
        'compra/' . date('Y/m/d')
    );

    // 2. Crear registro en BD
    $documento = DocumentoDigitalizado::create([
        'nombre_archivo' => $archivo->getClientOriginalName(),
        'ruta_archivo' => $resultadoUpload['path'],
        'tipo_archivo' => $archivo->getMimeType(),
        'tamano_archivo' => $resultadoUpload['size'],
        'tipo_operacion' => 'compra',
        'estado_procesamiento' => 'procesando',
    ]);

    // 3. Procesar con OCR
    try {
        // Descargar archivo temporal para OCR
        $contenidoArchivo = $this->storage->get('documentos', $documento->ruta_archivo);
        $tempPath = tempnam(sys_get_temp_dir(), 'ocr_');
        file_put_contents($tempPath, $contenidoArchivo);

        // Llamar a servicio OCR (Docker)
        $response = Http::attach(
            'file', 
            fopen($tempPath, 'r'), 
            basename($documento->nombre_archivo)
        )->post('http://localhost:5000/ocr/extract');

        $datosOCR = $response->json();

        // 4. Actualizar documento con datos extraídos
        $documento->update([
            'estado_procesamiento' => 'completado',
            'tipo_comprobante' => $datosOCR['tipo_comprobante'],
            'serie' => $datosOCR['serie'],
            'numero' => $datosOCR['numero'],
            'comprobante_completo' => $datosOCR['serie'] . '-' . $datosOCR['numero'],
            'fecha_emision' => $datosOCR['fecha_emision'],
            'entidad_tipo_doc' => $datosOCR['entidad_tipo_doc'],
            'entidad_num_doc' => $datosOCR['entidad_num_doc'],
            'entidad_razon_social' => $datosOCR['entidad_razon_social'],
            'moneda' => $datosOCR['moneda'],
            'total' => $datosOCR['total'],
            'igv' => $datosOCR['igv'],
            'total_gravada' => $datosOCR['total_gravada'],
            'items_extraidos' => $datosOCR['items'],
            'confianza_ocr' => $datosOCR['confianza'],
            'requiere_validacion' => $datosOCR['confianza'] < 80,
            // Campos nuevos de NubeFact
            'tipo_documento_cliente' => $datosOCR['tipo_documento_cliente'],
            'fecha_vencimiento' => $datosOCR['fecha_vencimiento'],
            'orden_compra_servicio' => $datosOCR['orden_compra'],
            'condiciones_pago' => $datosOCR['condiciones_pago'],
            'venta_al_credito' => !empty($datosOCR['fecha_vencimiento']),
        ]);

        // Limpiar archivo temporal
        unlink($tempPath);

        // 5. Retornar resultado
        return response()->json([
            'success' => true,
            'message' => 'Factura procesada exitosamente',
            'documento' => $documento,
        ]);

    } catch (\Exception $e) {
        $documento->update([
            'estado_procesamiento' => 'error',
            'error_mensaje' => $e->getMessage(),
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Error al procesar OCR: ' . $e->getMessage(),
        ], 500);
    }
}
```

---

## 📊 6. Consultas Útiles

### Listar Documentos con URLs de Descarga

```php
public function listarDocumentosConDescarga(Request $request)
{
    $documentos = DocumentoDigitalizado::where('tipo_operacion', 'compra')
        ->where('validado', false)
        ->get()
        ->map(function ($doc) {
            return [
                'id' => $doc->id,
                'nombre' => $doc->nombre_archivo,
                'comprobante' => $doc->comprobante_completo,
                'proveedor' => $doc->entidad_razon_social,
                'total' => $doc->total,
                'fecha' => $doc->fecha_emision,
                'download_url' => $this->storage->getTemporaryUrl(
                    'documentos',
                    $doc->ruta_archivo,
                    30  // 30 minutos
                ),
            ];
        });

    return response()->json($documentos);
}
```

---

## 🌐 7. Configuración CORS (Para desarrollo local)

Si necesitas acceder a MinIO desde el frontend (CORS):

```bash
docker exec facturacion_minio mc anonymous set download facturacion/documentos-digitalizados
```

O configurar CORS en MinIO:

```bash
docker exec facturacion_minio mc admin config set facturacion cors \
  enabled=true \
  allowed_origins=http://localhost:5173 \
  allowed_methods=GET,PUT,POST,DELETE \
  allowed_headers=*
```

---

## 📦 8. Backup y Migración

### Exportar archivos de MinIO a local

```bash
docker exec facturacion_minio mc mirror /data/facturacion C:/backup/facturacion
```

### Migrar archivos de local a MinIO

```php
use Illuminate\Support\Facades\Storage;

DocumentoDigitalizado::chunk(100, function ($documentos) {
    foreach ($documentos as $doc) {
        // Leer de storage local
        if (Storage::disk('public')->exists($doc->ruta_archivo)) {
            $contenido = Storage::disk('public')->get($doc->ruta_archivo);
            
            // Subir a MinIO
            $resultado = $this->storage->storeContent(
                $contenido,
                basename($doc->ruta_archivo),
                'documentos',
                dirname($doc->ruta_archivo)
            );

            // Actualizar ruta
            $doc->update([
                'ruta_archivo' => $resultado['path'],
            ]);
        }
    }
});
```

---

**Última actualización:** 3 de febrero de 2026  
**Documentación completa:** `/docs/INTEGRACION_MINIO.md`
