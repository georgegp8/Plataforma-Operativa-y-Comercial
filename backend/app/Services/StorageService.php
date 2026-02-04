<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StorageService
{
    /**
     * Almacena un archivo en MinIO
     *
     * @param  UploadedFile  $file  Archivo a subir
     * @param  string  $disk  Disk de almacenamiento (documentos, comprobantes, adjuntos)
     * @param  string|null  $path  Ruta dentro del bucket (ej: 2026/02/03)
     * @param  string|null  $filename  Nombre personalizado del archivo
     * @return array ['success' => bool, 'path' => string, 'url' => string, 'error' => string]
     */
    public function store(UploadedFile $file, string $disk = 'documentos', ?string $path = null, ?string $filename = null): array
    {
        try {
            // Generar path automático basado en fecha si no se proporciona
            if (! $path) {
                $path = date('Y/m/d');
            }

            // Generar nombre único si no se proporciona
            if (! $filename) {
                $filename = Str::uuid().'.'.$file->getClientOriginalExtension();
            }

            // Ruta completa
            $fullPath = $path.'/'.$filename;

            // Almacenar archivo
            $stored = Storage::disk($disk)->put($fullPath, file_get_contents($file->getRealPath()));

            if (! $stored) {
                return [
                    'success' => false,
                    'error' => 'Error al almacenar el archivo',
                ];
            }

            return [
                'success' => true,
                'path' => $fullPath,
                'url' => $this->getUrl($disk, $fullPath),
                'size' => $file->getSize(),
                'mime_type' => $file->getMimeType(),
                'original_name' => $file->getClientOriginalName(),
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error al subir archivo: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Almacena contenido directo (ej: PDF generado, XML)
     *
     * @param  string  $content  Contenido del archivo
     * @param  string  $filename  Nombre del archivo
     * @param  string  $disk  Disk de almacenamiento
     * @param  string|null  $path  Ruta dentro del bucket
     */
    public function storeContent(string $content, string $filename, string $disk = 'comprobantes', ?string $path = null): array
    {
        try {
            if (! $path) {
                $path = date('Y/m/d');
            }

            $fullPath = $path.'/'.$filename;

            $stored = Storage::disk($disk)->put($fullPath, $content);

            if (! $stored) {
                return [
                    'success' => false,
                    'error' => 'Error al almacenar el contenido',
                ];
            }

            return [
                'success' => true,
                'path' => $fullPath,
                'url' => $this->getUrl($disk, $fullPath),
                'size' => strlen($content),
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error al guardar contenido: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Obtiene URL del archivo en MinIO
     *
     * @phpstan-ignore-next-line
     */
    public function getUrl(string $disk, string $path): string
    {
        // @phpstan-ignore-next-line
        return Storage::disk($disk)->url($path);
    }

    /**
     * Genera URL temporal firmada (válida por tiempo limitado)
     *
     * @param  int  $minutes  Minutos de validez (default: 60)
     *
     * @phpstan-ignore-next-line
     */
    public function getTemporaryUrl(string $disk, string $path, int $minutes = 60): string
    {
        // @phpstan-ignore-next-line
        return Storage::disk($disk)->temporaryUrl($path, now()->addMinutes($minutes));
    }

    /**
     * Descarga archivo desde MinIO
     *
     * @return string|null Contenido del archivo
     */
    public function get(string $disk, string $path): ?string
    {
        try {
            return Storage::disk($disk)->get($path);
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Verifica si un archivo existe
     */
    public function exists(string $disk, string $path): bool
    {
        return Storage::disk($disk)->exists($path);
    }

    /**
     * Elimina un archivo
     */
    public function delete(string $disk, string $path): bool
    {
        try {
            return Storage::disk($disk)->delete($path);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Copia archivo a otro disco/ruta
     */
    public function copy(string $fromDisk, string $fromPath, string $toDisk, string $toPath): bool
    {
        try {
            $content = Storage::disk($fromDisk)->get($fromPath);

            return Storage::disk($toDisk)->put($toPath, $content);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Lista archivos en una ruta
     */
    public function listFiles(string $disk, string $path = ''): array
    {
        try {
            return Storage::disk($disk)->files($path);
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Obtiene tamaño del archivo en bytes
     */
    public function size(string $disk, string $path): int
    {
        try {
            return Storage::disk($disk)->size($path);
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Obtiene metadatos del archivo
     */
    public function metadata(string $disk, string $path): array
    {
        try {
            return [
                'exists' => $this->exists($disk, $path),
                'size' => $this->size($disk, $path),
                'last_modified' => Storage::disk($disk)->lastModified($path),
                // @phpstan-ignore-next-line
                'type' => Storage::disk($disk)->mimeType($path),
                'url' => $this->getUrl($disk, $path),
            ];
        } catch (\Exception $e) {
            return [];
        }
    }

    /**
     * Almacena comprobante electrónico (PDF + XML + CDR)
     *
     * @param  string  $serie  Serie del comprobante (ej: F001)
     * @param  string  $numero  Número del comprobante (ej: 00000123)
     * @param  string|null  $pdfContent  Contenido PDF
     * @param  string|null  $xmlContent  Contenido XML
     * @param  string|null  $cdrContent  Contenido CDR
     */
    public function storeComprobante(string $serie, string $numero, ?string $pdfContent = null, ?string $xmlContent = null, ?string $cdrContent = null): array
    {
        $results = [
            'success' => true,
            'files' => [],
        ];

        $path = 'comprobantes/'.date('Y/m');
        $baseFilename = $serie.'-'.$numero;

        try {
            // Guardar PDF
            if ($pdfContent) {
                $pdfResult = $this->storeContent($pdfContent, $baseFilename.'.pdf', 'comprobantes', $path);
                if ($pdfResult['success']) {
                    $results['files']['pdf'] = $pdfResult;
                } else {
                    $results['success'] = false;
                    $results['error'] = 'Error al guardar PDF: '.$pdfResult['error'];
                }
            }

            // Guardar XML
            if ($xmlContent) {
                $xmlResult = $this->storeContent($xmlContent, $baseFilename.'.xml', 'comprobantes', $path);
                if ($xmlResult['success']) {
                    $results['files']['xml'] = $xmlResult;
                } else {
                    $results['success'] = false;
                    $results['error'] = 'Error al guardar XML: '.$xmlResult['error'];
                }
            }

            // Guardar CDR
            if ($cdrContent) {
                $cdrResult = $this->storeContent($cdrContent, 'R-'.$baseFilename.'.zip', 'comprobantes', $path);
                if ($cdrResult['success']) {
                    $results['files']['cdr'] = $cdrResult;
                } else {
                    $results['success'] = false;
                    $results['error'] = 'Error al guardar CDR: '.$cdrResult['error'];
                }
            }

        } catch (\Exception $e) {
            $results['success'] = false;
            $results['error'] = 'Error general al guardar comprobante: '.$e->getMessage();
        }

        return $results;
    }
}
