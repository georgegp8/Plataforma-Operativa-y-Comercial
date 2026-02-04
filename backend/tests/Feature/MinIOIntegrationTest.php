<?php

namespace Tests\Feature;

use App\Models\DocumentoDigitalizado;
use App\Services\StorageService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MinIOIntegrationTest extends TestCase
{
    protected StorageService $storage;

    protected function setUp(): void
    {
        parent::setUp();
        $this->storage = app(StorageService::class);
    }

    /**
     * Test básico de conexión a MinIO
     */
    public function test_minio_connection()
    {
        // Crear archivo de prueba
        Storage::disk('minio')->put('test/connection.txt', 'Hello MinIO!');

        // Verificar existencia
        $this->assertTrue(Storage::disk('minio')->exists('test/connection.txt'));

        // Leer contenido
        $content = Storage::disk('minio')->get('test/connection.txt');
        $this->assertEquals('Hello MinIO!', $content);

        // Limpiar
        Storage::disk('minio')->delete('test/connection.txt');
        $this->assertFalse(Storage::disk('minio')->exists('test/connection.txt'));
    }

    /**
     * Test de upload de archivo con StorageService
     */
    public function test_storage_service_upload()
    {
        // Crear archivo fake
        $file = UploadedFile::fake()->create('test-factura.pdf', 100, 'application/pdf');

        // Subir a MinIO
        $result = $this->storage->store($file, 'documentos', 'compra/test');

        // Verificar resultado
        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('path', $result);
        $this->assertArrayHasKey('url', $result);
        $this->assertArrayHasKey('size', $result);

        // Verificar existencia
        $exists = $this->storage->exists('documentos', $result['path']);
        $this->assertTrue($exists);

        // Limpiar
        $this->storage->delete('documentos', $result['path']);
    }

    /**
     * Test de storeContent (para PDFs generados, XML, etc)
     */
    public function test_storage_service_store_content()
    {
        $content = '<?xml version="1.0"?><Invoice><Total>100.00</Total></Invoice>';

        $result = $this->storage->storeContent(
            $content,
            'F001-00000001.xml',
            'comprobantes',
            '2026/02'
        );

        $this->assertTrue($result['success']);
        $this->assertStringContainsString('2026/02/F001-00000001.xml', $result['path']);

        // Leer y verificar contenido
        $stored = $this->storage->get('comprobantes', $result['path']);
        $this->assertEquals($content, $stored);

        // Limpiar
        $this->storage->delete('comprobantes', $result['path']);
    }

    /**
     * Test de URLs temporales firmadas
     */
    public function test_temporary_url_generation()
    {
        // Crear archivo de prueba
        $content = 'Contenido privado del documento';
        $result = $this->storage->storeContent(
            $content,
            'documento-privado.pdf',
            'documentos',
            'privado'
        );

        // Generar URL temporal (60 minutos)
        $url = $this->storage->getTemporaryUrl('documentos', $result['path'], 60);

        // Verificar que la URL contiene firma
        $this->assertStringContainsString('X-Amz-Signature', $url);
        $this->assertStringContainsString('X-Amz-Expires', $url);

        // Limpiar
        $this->storage->delete('documentos', $result['path']);
    }

    /**
     * Test de almacenamiento de comprobante completo (PDF + XML + CDR)
     */
    public function test_store_comprobante_completo()
    {
        $pdfContent = '%PDF-1.4 fake pdf content';
        $xmlContent = '<?xml version="1.0"?><Invoice></Invoice>';
        $cdrContent = 'CDR-ZIP-CONTENT';

        $result = $this->storage->storeComprobante(
            'F001',
            '00000123',
            $pdfContent,
            $xmlContent,
            $cdrContent
        );

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('pdf', $result['files']);
        $this->assertArrayHasKey('xml', $result['files']);
        $this->assertArrayHasKey('cdr', $result['files']);

        // Verificar que los archivos existen
        $this->assertTrue($this->storage->exists('comprobantes', $result['files']['pdf']['path']));
        $this->assertTrue($this->storage->exists('comprobantes', $result['files']['xml']['path']));
        $this->assertTrue($this->storage->exists('comprobantes', $result['files']['cdr']['path']));

        // Limpiar
        $this->storage->delete('comprobantes', $result['files']['pdf']['path']);
        $this->storage->delete('comprobantes', $result['files']['xml']['path']);
        $this->storage->delete('comprobantes', $result['files']['cdr']['path']);
    }

    /**
     * Test de upload de documento digitalizado (API endpoint)
     * NOTA: Requiere configuración de autenticación - Skip por ahora
     */
    public function skip_test_documento_digitalizado_upload_endpoint()
    {
        $this->markTestSkipped('Requiere configuración de autenticación');

        // Crear archivo fake PDF (no requiere GD)
        $file = UploadedFile::fake()->create('factura.pdf', 100, 'application/pdf');

        // Llamar al endpoint
        $response = $this->postJson('/api/documentos-digitalizados/upload', [
            'archivo' => $file,
            'tipo_operacion' => 'compra',
        ]);

        // Verificar respuesta
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'message',
            'data' => [
                'id',
                'nombre_archivo',
                'ruta_archivo',
                'tipo_archivo',
                'tamano_archivo',
                'estado_procesamiento',
            ],
        ]);

        // Verificar que el archivo se guardó en MinIO
        $data = $response->json('data');
        $exists = $this->storage->exists('documentos', $data['ruta_archivo']);
        $this->assertTrue($exists);

        // Limpiar
        $documento = DocumentoDigitalizado::find($data['id']);
        $this->storage->delete('documentos', $documento->ruta_archivo);
        $documento->delete();
    }

    /**
     * Test de descarga de documento digitalizado
     * NOTA: Requiere configuración de autenticación - Skip por ahora
     */
    public function skip_test_documento_digitalizado_download()
    {
        $this->markTestSkipped('Requiere configuración de autenticación');

        // Crear documento de prueba
        $file = UploadedFile::fake()->create('test.pdf', 50, 'application/pdf');
        $uploadResponse = $this->postJson('/api/documentos-digitalizados/upload', [
            'archivo' => $file,
            'tipo_operacion' => 'compra',
        ]);

        $documentoId = $uploadResponse->json('data.id');

        // Descargar
        $downloadResponse = $this->getJson("/api/documentos-digitalizados/{$documentoId}/descargar");

        // Verificar que retorna URL temporal
        $downloadResponse->assertStatus(200);
        $downloadResponse->assertJsonStructure([
            'success',
            'url',
            'nombre_archivo',
        ]);

        $url = $downloadResponse->json('url');
        $this->assertStringContainsString('X-Amz-Signature', $url);

        // Limpiar
        $documento = DocumentoDigitalizado::find($documentoId);
        $this->storage->delete('documentos', $documento->ruta_archivo);
        $documento->delete();
    }

    /**
     * Test de metadata de archivo
     */
    public function test_file_metadata()
    {
        $content = 'Test content for metadata';
        $result = $this->storage->storeContent(
            $content,
            'metadata-test.txt',
            'documentos',
            'test'
        );

        $metadata = $this->storage->metadata('documentos', $result['path']);

        $this->assertArrayHasKey('size', $metadata);
        $this->assertArrayHasKey('last_modified', $metadata);
        $this->assertArrayHasKey('type', $metadata);
        $this->assertEquals(strlen($content), $metadata['size']);

        // Limpiar
        $this->storage->delete('documentos', $result['path']);
    }

    /**
     * Test de copy entre rutas
     */
    public function test_file_copy()
    {
        $content = 'Original content';
        $result = $this->storage->storeContent(
            $content,
            'original.txt',
            'documentos',
            'test'
        );

        $source = $result['path'];
        $destination = 'test/copia.txt';

        // Copiar
        $copied = $this->storage->copy('documentos', $source, 'documentos', $destination);
        $this->assertTrue($copied);

        // Verificar que ambos existen
        $this->assertTrue($this->storage->exists('documentos', $source));
        $this->assertTrue($this->storage->exists('documentos', $destination));

        // Verificar contenido
        $copiedContent = $this->storage->get('documentos', $destination);
        $this->assertEquals($content, $copiedContent);

        // Limpiar
        $this->storage->delete('documentos', $source);
        $this->storage->delete('documentos', $destination);
    }

    /**
     * Test de discos especializados
     */
    public function test_specialized_disks()
    {
        $disks = ['documentos', 'comprobantes', 'adjuntos'];

        foreach ($disks as $disk) {
            $result = $this->storage->storeContent(
                "Test content for {$disk}",
                "test-{$disk}.txt",
                $disk,
                'test'
            );

            $this->assertTrue($result['success']);
            $this->assertTrue($this->storage->exists($disk, $result['path']));

            // Limpiar
            $this->storage->delete($disk, $result['path']);
        }
    }
}
