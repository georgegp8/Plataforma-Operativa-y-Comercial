<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentoDigitalizado;
use App\Models\Compra;
use App\Services\StorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class DocumentoDigitalizadoController extends Controller
{
    protected $storageService;

    public function __construct(StorageService $storageService)
    {
        $this->storageService = $storageService;
    }

    /**
     * Listar documentos digitalizados con filtros
     */
    public function index(Request $request)
    {
        $query = DocumentoDigitalizado::where('activo', true);

        // Filtrar por tipo de operación
        if ($request->has('tipo_operacion') && $request->tipo_operacion !== '') {
            $query->where('tipo_operacion', $request->tipo_operacion);
        }

        // Filtrar por estado de procesamiento
        if ($request->has('estado_procesamiento') && $request->estado_procesamiento !== '') {
            $query->where('estado_procesamiento', $request->estado_procesamiento);
        }

        // Filtrar por validación pendiente
        if ($request->has('requiere_validacion') && $request->requiere_validacion !== '') {
            $query->where('requiere_validacion', $request->requiere_validacion === 'true');
        }

        // Filtrar por número de documento
        if ($request->has('numero_documento') && $request->numero_documento !== '') {
            $query->where(function($q) use ($request) {
                $q->where('comprobante_completo', 'ILIKE', '%' . $request->numero_documento . '%')
                  ->orWhere('serie', 'ILIKE', '%' . $request->numero_documento . '%')
                  ->orWhere('numero', 'ILIKE', '%' . $request->numero_documento . '%');
            });
        }

        // Filtrar por entidad (RUC/DNI o razón social)
        if ($request->has('entidad') && $request->entidad !== '') {
            $query->where(function($q) use ($request) {
                $q->where('entidad_num_doc', 'ILIKE', '%' . $request->entidad . '%')
                  ->orWhere('entidad_razon_social', 'ILIKE', '%' . $request->entidad . '%');
            });
        }

        $documentos = $query->orderBy('created_at', 'desc')->get();
        
        return response()->json($documentos);
    }

    /**
     * Subir y procesar documento (PDF o imagen)
     */
    public function upload(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'archivo' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240', // Max 10MB
            'tipo_operacion' => 'required|in:compra,venta',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $archivo = $request->file('archivo');
            $tipoOperacion = $request->tipo_operacion;
            
            // Generar path organizado por fecha
            $path = $tipoOperacion . '/' . date('Y/m/d');
            
            // Subir archivo a MinIO usando StorageService
            $uploadResult = $this->storageService->store($archivo, 'documentos', $path);
            
            if (!$uploadResult['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $uploadResult['error']
                ], 500);
            }
            
            // Crear registro en BD
            $documento = DocumentoDigitalizado::create([
                'nombre_archivo' => $uploadResult['original_name'],
                'ruta_archivo' => $uploadResult['path'],
                'tipo_archivo' => pathinfo($uploadResult['original_name'], PATHINFO_EXTENSION),
                'tamano_archivo' => $uploadResult['size'],
                'tipo_operacion' => $tipoOperacion,
                'estado_procesamiento' => 'pendiente',
                'created_by' => $request->user()->email ?? 'sistema',
            ]);

            // Procesar con OCR (si está habilitado)
            $this->procesarConOCR($documento);

            return response()->json([
                'success' => true,
                'data' => $documento,
                'message' => 'Documento subido exitosamente a MinIO. Procesamiento OCR iniciado.',
                'minio_url' => $uploadResult['url']
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al subir el documento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener un documento por ID
     */
    public function show($id)
    {
        $documento = DocumentoDigitalizado::find($id);
        
        if (!$documento) {
            return response()->json([
                'success' => false,
                'message' => 'Documento no encontrado'
            ], 404);
        }

        return response()->json($documento);
    }

    /**
     * Actualizar datos extraídos manualmente
     */
    public function update(Request $request, $id)
    {
        $documento = DocumentoDigitalizado::find($id);
        
        if (!$documento) {
            return response()->json([
                'success' => false,
                'message' => 'Documento no encontrado'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'tipo_comprobante' => 'nullable|string|max:50',
            'serie' => 'nullable|string|max:20',
            'numero' => 'nullable|string|max:20',
            'fecha_emision' => 'nullable|date',
            'entidad_tipo_doc' => 'nullable|string|max:10',
            'entidad_num_doc' => 'nullable|string|max:20',
            'entidad_razon_social' => 'nullable|string|max:255',
            'entidad_direccion' => 'nullable|string|max:500',
            'moneda' => 'nullable|string|max:10',
            'subtotal' => 'nullable|numeric',
            'igv' => 'nullable|numeric',
            'total' => 'nullable|numeric',
            'items_extraidos' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $documento->update($request->all());
            
            // Si se actualiza, generar comprobante_completo
            if ($request->has('serie') && $request->has('numero')) {
                $documento->comprobante_completo = $request->serie . '-' . $request->numero;
                $documento->save();
            }

            return response()->json([
                'success' => true,
                'data' => $documento,
                'message' => 'Documento actualizado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validar y confirmar datos extraídos
     */
    public function validar(Request $request, $id)
    {
        $documento = DocumentoDigitalizado::find($id);
        
        if (!$documento) {
            return response()->json([
                'success' => false,
                'message' => 'Documento no encontrado'
            ], 404);
        }

        try {
            $documento->update([
                'validado' => true,
                'requiere_validacion' => false,
                'fecha_validacion' => now(),
                'validado_por' => $request->user()->email ?? 'sistema',
                'estado_procesamiento' => 'completado',
            ]);

            return response()->json([
                'success' => true,
                'data' => $documento,
                'message' => 'Documento validado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al validar: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Convertir documento validado a compra
     */
    public function convertirACompra(Request $request, $id)
    {
        $documento = DocumentoDigitalizado::find($id);
        
        if (!$documento) {
            return response()->json([
                'success' => false,
                'message' => 'Documento no encontrado'
            ], 404);
        }

        if ($documento->tipo_operacion !== 'compra') {
            return response()->json([
                'success' => false,
                'message' => 'El documento no es de tipo compra'
            ], 400);
        }

        if (!$documento->validado) {
            return response()->json([
                'success' => false,
                'message' => 'El documento debe estar validado antes de convertirlo'
            ], 400);
        }

        try {
            // Buscar o crear proveedor en la tabla entidades
            $tipoDoc = strlen($documento->entidad_num_doc ?? '') === 11 ? '6' : '1'; // 6=RUC, 1=DNI
            $proveedor = \App\Models\Entidad::where('num_doc', $documento->entidad_num_doc)
                ->where('tipo_doc', $tipoDoc)
                ->first();

            if (!$proveedor) {
                // Crear nuevo proveedor si no existe
                $proveedor = \App\Models\Entidad::create([
                    'empresa_id' => 1, // TODO: usar empresa del usuario autenticado
                    'tipo_doc' => $tipoDoc,
                    'num_doc' => $documento->entidad_num_doc,
                    'denominacion' => $documento->entidad_razon_social ?? 'Proveedor sin nombre',
                    'direccion' => $documento->entidad_direccion,
                    'es_cliente' => false,
                    'es_proveedor' => true,
                ]);
            } else if (!$proveedor->es_proveedor) {
                // Marcar como proveedor si solo era cliente
                $proveedor->update(['es_proveedor' => true]);
            }

            // Crear compra desde los datos extraídos
            $compra = Compra::create([
                'actividad' => 'Compra desde documento digitalizado',
                'fecha_actividad' => $documento->fecha_emision ?? now(),
                'proveedor_id' => $proveedor->id,
                'proveedor_nombre' => $documento->entidad_razon_social,
                'proveedor_ruc' => $documento->entidad_num_doc,
                'estado' => 'Pendiente de pago',
                'tipo_comprobante' => $documento->serie ? substr($documento->serie, 0, 1) : 'F',
                'serie_comprobante' => $documento->serie,
                'numero_comprobante' => $documento->numero,
                'comprobante_completo' => $documento->comprobante_completo,
                'tipo_comprobante_desc' => $documento->tipo_comprobante ?? 'FACTURA ELECTRONICA',
                'moneda' => $documento->moneda ?? 'PEN',
                'total' => $documento->total ?? 0,
                'cantidad_productos' => is_array($documento->items_extraidos) ? count($documento->items_extraidos) : 0,
                'activo' => true,
                'created_by' => $request->user()->email ?? 'sistema',
            ]);

            // Vincular documento con compra
            $documento->update([
                'compra_id' => $compra->id,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'compra' => $compra,
                    'documento' => $documento,
                ],
                'message' => 'Compra creada exitosamente desde el documento'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al crear compra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Eliminar documento
     */
    public function destroy($id)
    {
        $documento = DocumentoDigitalizado::find($id);
        
        if (!$documento) {
            return response()->json([
                'success' => false,
                'message' => 'Documento no encontrado'
            ], 404);
        }

        try {
            // Eliminar archivo físico
            if (Storage::disk('public')->exists($documento->ruta_archivo)) {
                Storage::disk('public')->delete($documento->ruta_archivo);
            }

            // Soft delete (marcar como inactivo)
            $documento->update(['activo' => false]);

            return response()->json([
                'success' => true,
                'message' => 'Documento eliminado exitosamente'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Procesar documento con Python OCR (Tesseract)
     * Alternativa 1: Usando servicio Python local
     */
    private function procesarDocumentoMock($documento)
    {
        try {
            // Ruta completa al archivo
            $rutaArchivo = storage_path('app/public/' . $documento->ruta_archivo);
            
            // Verificar que existe
            if (!file_exists($rutaArchivo)) {
                throw new \Exception("Archivo no encontrado: {$rutaArchivo}");
            }

            // Opción 1: Llamar script Python local
            $resultado = $this->procesarConPython($rutaArchivo);
            
            // Opción 2 (comentada): Usar API OCR.space (ver método más abajo)
            // $resultado = $this->procesarConOCRSpace($rutaArchivo);

            if ($resultado['success']) {
                $datos = $resultado['datos'];
                
                $documento->update([
                    'estado_procesamiento' => 'completado',
                    'datos_extraidos' => [
                        'raw_text' => $resultado['texto_completo'] ?? '',
                        'confidence' => $resultado['confianza_ocr'] ?? 0,
                        'processed_at' => now()->toISOString(),
                    ],
                    'tipo_comprobante' => $datos['tipo_comprobante'] ?? null,
                    'serie' => $datos['serie'] ?? null,
                    'numero' => $datos['numero'] ?? null,
                    'comprobante_completo' => $datos['comprobante_completo'] ?? null,
                    'fecha_emision' => $datos['fecha_emision'] ?? null,
                    'entidad_tipo_doc' => $datos['entidad_tipo_doc'] ?? null,
                    'entidad_num_doc' => $datos['entidad_num_doc'] ?? null,
                    'entidad_razon_social' => $datos['entidad_razon_social'] ?? null,
                    'entidad_direccion' => $datos['entidad_direccion'] ?? null,
                    'moneda' => $datos['moneda'] ?? 'PEN',
                    'subtotal' => $datos['subtotal'] ?? null,
                    'igv' => $datos['igv'] ?? null,
                    'total' => $datos['total'] ?? null,
                    'items_extraidos' => $datos['items_extraidos'] ?? null,
                    'confianza_ocr' => $resultado['confianza_ocr'] ?? 0,
                    'requiere_validacion' => ($resultado['confianza_ocr'] ?? 0) < 90,
                ]);
            } else {
                throw new \Exception($resultado['error'] ?? 'Error desconocido en OCR');
            }

        } catch (\Exception $e) {
            $documento->update([
                'estado_procesamiento' => 'error',
                'error_mensaje' => $e->getMessage(),
            ]);
            
            Log::error('Error procesando documento OCR: ' . $e->getMessage());
        }
    }

    /**
     * Opción 1: Procesar con Python + Gemini (sin dependencias de Tesseract/Poppler)
     */
    private function procesarConPython($rutaArchivo)
    {
        // Detectar si estamos en Docker
        $useDocker = env('OCR_USE_DOCKER', false);
        
        if ($useDocker) {
            return $this->procesarConDockerOCR($rutaArchivo);
        }
        
        // Usar script optimizado que solo requiere Gemini (sin Tesseract ni Poppler)
        $scriptPath = base_path('python_ocr/ocr_gemini_only.py');
        
        // Fallback al script completo si el optimizado no existe
        if (!file_exists($scriptPath)) {
            $scriptPath = base_path('python_ocr/ocr_service.py');
        }
        
        if (!file_exists($scriptPath)) {
            return [
                'success' => false,
                'error' => 'Script Python no encontrado.'
            ];
        }

        $pythonCmd = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' ? 'python' : 'python3';
        $command = sprintf('%s "%s" "%s"', $pythonCmd, $scriptPath, $rutaArchivo);
        
        $output = [];
        $returnCode = 0;
        exec($command . ' 2>&1', $output, $returnCode);
        
        $jsonOutput = implode("\n", $output);
        
        // Decodificar JSON
        $resultado = json_decode($jsonOutput, true);
        
        if (json_last_error() !== JSON_ERROR_NONE || !$resultado) {
            return [
                'success' => false,
                'error' => 'Error decodificando respuesta Python: ' . json_last_error_msg() . "\nOutput: " . $jsonOutput
            ];
        }
        
        return $resultado;
    }

    /**
     * Opción 1B: Procesar con Docker OCR (PRODUCCIÓN)
     */
    private function procesarConDockerOCR($rutaArchivo)
    {
        // Copiar archivo temporal al volumen compartido de Docker
        $publicPath = storage_path('app/public');
        $fileName = 'ocr_temp_' . uniqid() . '.' . pathinfo($rutaArchivo, PATHINFO_EXTENSION);
        $sharedPath = $publicPath . '/' . $fileName;
        
        copy($rutaArchivo, $sharedPath);
        
        // Ruta dentro del contenedor
        $containerPath = '/app/storage/' . $fileName;
        
        // Ejecutar en contenedor Docker
        $command = sprintf(
            'docker exec facturacion_ocr python ocr_service.py "%s"',
            $containerPath
        );
        
        $output = [];
        $returnCode = 0;
        exec($command . ' 2>&1', $output, $returnCode);
        
        // Limpiar archivo temporal
        @unlink($sharedPath);
        
        $jsonOutput = implode("\n", $output);
        
        $resultado = json_decode($jsonOutput, true);
        
        if (json_last_error() !== JSON_ERROR_NONE || !$resultado) {
            return [
                'success' => false,
                'error' => 'Error ejecutando OCR en Docker: ' . json_last_error_msg()
            ];
        }
        
        return $resultado;
    }

    /**
     * Opción 2: Procesar con OCR.space API (REMOTO - GRATIS hasta 25k requests/mes)
     * Registrarse en: https://ocr.space/ocrapi
     */
    private function procesarConOCRSpace($rutaArchivo)
    {
        $apiKey = env('OCR_SPACE_API_KEY', 'K87899142388957'); // API key pública de prueba
        
        try {
            $client = new \GuzzleHttp\Client();
            
            $response = $client->post('https://api.ocr.space/parse/image', [
                'multipart' => [
                    [
                        'name' => 'apikey',
                        'contents' => $apiKey
                    ],
                    [
                        'name' => 'language',
                        'contents' => 'spa' // Español
                    ],
                    [
                        'name' => 'isOverlayRequired',
                        'contents' => 'false'
                    ],
                    [
                        'name' => 'file',
                        'contents' => fopen($rutaArchivo, 'r'),
                        'filename' => basename($rutaArchivo)
                    ]
                ]
            ]);
            
            $result = json_decode($response->getBody(), true);
            
            if ($result['IsErroredOnProcessing'] ?? true) {
                return [
                    'success' => false,
                    'error' => $result['ErrorMessage'][0] ?? 'Error en OCR.space'
                ];
            }
            
            $textoCompleto = $result['ParsedResults'][0]['ParsedText'] ?? '';
            
            // Extraer datos básicos del texto
            return [
                'success' => true,
                'datos' => $this->extraerDatosDeTexto($textoCompleto),
                'confianza_ocr' => 75.0, // OCR.space no devuelve confianza
                'texto_completo' => $textoCompleto
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error con OCR.space: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Extraer datos estructurados de texto plano (fallback simple)
     */
    private function extraerDatosDeTexto($texto)
    {
        // Implementación básica de extracción
        // El script Python hace esto mejor
        $datos = [];
        
        // Buscar RUC
        if (preg_match('/RUC\s*:?\s*(\d{11})/i', $texto, $matches)) {
            $datos['entidad_num_doc'] = $matches[1];
            $datos['entidad_tipo_doc'] = 'RUC';
        }
        
        // Buscar serie-número
        if (preg_match('/([A-Z]\d{3})-(\d{4,8})/', $texto, $matches)) {
            $datos['serie'] = $matches[1];
            $datos['numero'] = $matches[2];
            $datos['comprobante_completo'] = $matches[0];
        }
        
        // Buscar total
        if (preg_match('/TOTAL\s*:?\s*S?\/?\.?\s*([\d,]+\.?\d*)/i', $texto, $matches)) {
            $datos['total'] = (float) str_replace(',', '', $matches[1]);
        }
        
        return $datos;
    }

    /**
     * Endpoint para procesar documento con OCR
     * 
     * @param int $id ID del documento
     * @return \Illuminate\Http\JsonResponse
     */
    public function procesarConOCRManual($id)
    {
        $documento = DocumentoDigitalizado::find($id);
        
        if (!$documento) {
            return response()->json([
                'success' => false,
                'message' => 'Documento no encontrado'
            ], 404);
        }

        try {
            $this->procesarConOCR($documento);
            
            return response()->json([
                'success' => true,
                'data' => $documento->fresh(),
                'message' => 'Documento procesado con OCR exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar documento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Procesar documento con OCR usando Python + Gemini AI
     */
    private function procesarConOCR($documento)
    {
        try {
            $documento->estado_procesamiento = 'procesando';
            $documento->save();

            // Procesar con Python + Gemini AI
            $resultado = $this->procesarConOCRService($documento);

            if ($resultado['success']) {
                // Actualizar documento con datos extraídos
                $datosExtraidos = $resultado['datos'] ?? [];
                
                // Mapear campos del OCR a la base de datos
                $documento->tipo_comprobante = $datosExtraidos['tipo_comprobante'] ?? null;
                $documento->serie = $datosExtraidos['serie'] ?? null;
                $documento->numero = $datosExtraidos['numero'] ?? null;
                $documento->comprobante_completo = $datosExtraidos['comprobante_completo'] ?? null;
                $documento->fecha_emision = $datosExtraidos['fecha_emision'] ?? null;
                $documento->fecha_vencimiento = $datosExtraidos['fecha_vencimiento'] ?? null;
                
                // Datos de la entidad (cliente)
                $documento->entidad_num_doc = $datosExtraidos['entidad_num_doc'] ?? null;
                $documento->entidad_razon_social = $datosExtraidos['entidad_razon_social'] ?? null;
                $documento->entidad_direccion = $datosExtraidos['entidad_direccion'] ?? null;
                
                // Datos monetarios
                $documento->moneda = $datosExtraidos['moneda'] ?? 'PEN';
                $documento->tipo_cambio = $datosExtraidos['tipo_cambio'] ?? null;
                $documento->porcentaje_igv = $datosExtraidos['porcentaje_igv'] ?? 18;
                
                // Totales
                $documento->subtotal = $datosExtraidos['subtotal'] ?? $datosExtraidos['total_gravada'] ?? null;
                $documento->total_gravada = $datosExtraidos['total_gravada'] ?? null;
                $documento->total_exonerada = $datosExtraidos['total_exonerada'] ?? null;
                $documento->total_inafecta = $datosExtraidos['total_inafecta'] ?? null;
                $documento->total_gratuita = $datosExtraidos['total_gratuita'] ?? null;
                $documento->igv = $datosExtraidos['igv'] ?? null;
                $documento->total = $datosExtraidos['total'] ?? null;
                
                // Guardar todos los datos extraídos como JSON (incluye importe_letras, forma_pago, etc.)
                $documento->datos_extraidos = $datosExtraidos;
                $documento->confianza_ocr = $resultado['confianza_ocr'] ?? null;
                $documento->estado_procesamiento = 'completado';
                
                // Marcar para validación si confianza es baja
                if (($resultado['confianza_ocr'] ?? 100) < 80) {
                    $documento->requiere_validacion = true;
                }
            } else {
                $documento->estado_procesamiento = 'error';
                $documento->error_mensaje = $resultado['error'] ?? 'Error desconocido';
            }

            $documento->save();

        } catch (\Exception $e) {
            Log::error('Error en procesamiento OCR: ' . $e->getMessage());
            $documento->estado_procesamiento = 'error';
            $documento->error_mensaje = $e->getMessage();
            $documento->save();
        }
    }

    /**
     * Descargar archivo desde MinIO
     */
    public function descargar($id)
    {
        $documento = DocumentoDigitalizado::find($id);
        
        if (!$documento) {
            return response()->json([
                'success' => false,
                'message' => 'Documento no encontrado'
            ], 404);
        }

        try {
            // Generar URL temporal firmada (válida por 1 hora)
            $url = $this->storageService->getTemporaryUrl('documentos', $documento->ruta_archivo, 60);
            
            return response()->json([
                'success' => true,
                'url' => $url,
                'nombre_archivo' => $documento->nombre_archivo
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al generar enlace de descarga: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Procesar documento con servicio OCR (Docker o Python local)
     * 
     * @param DocumentoDigitalizado $documento
     * @return array
     */
    private function procesarConOCRService(DocumentoDigitalizado $documento): array
    {
        try {
            // Descargar archivo desde MinIO
            Log::info("Descargando archivo desde MinIO: documentos / {$documento->ruta_archivo}");
            $contenidoArchivo = $this->storageService->get('documentos', $documento->ruta_archivo);
            
            if (!$contenidoArchivo) {
                return [
                    'success' => false,
                    'error' => "No se pudo descargar el archivo desde MinIO: {$documento->ruta_archivo}"
                ];
            }
            
            // Guardar en archivo temporal
            $tempPath = tempnam(sys_get_temp_dir(), 'ocr_');
            $tempFile = $tempPath . '.' . $documento->tipo_archivo;
            @unlink($tempPath); // Eliminar archivo temporal vacío
            file_put_contents($tempFile, $contenidoArchivo);
            
            Log::info("Archivo temporal creado: {$tempFile}, tamaño: " . filesize($tempFile) . " bytes");

            // Procesar con Python + Gemini AI
            $resultado = $this->procesarConPython($tempFile);
            
            // Limpiar archivo temporal
            @unlink($tempFile);

            return $resultado;

        } catch (\Exception $e) {
            Log::error('Error en procesarConOCRService: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
