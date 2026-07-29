<?php

namespace App\Http\Controllers\Api\VoiceIA;

use App\Http\Controllers\Controller;
use App\Services\VoiceIA\VoiceIAOrchestratorService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class VoiceIAController extends Controller
{
    protected VoiceIAOrchestratorService $orchestrator;

    public function __construct(VoiceIAOrchestratorService $orchestrator)
    {
        $this->orchestrator = $orchestrator;
    }

    /**
     * Transcribir un archivo de audio a texto sin procesar comandos
     * POST /api/v1/voice/transcribir
     */
    public function transcribir(Request $request)
    {
        $request->validate([
            'audio' => 'required|file|max:10240', // Máximo 10MB
        ]);

        try {
            $audioFile = $request->file('audio');

            Log::info('Audio recibido para transcripción directa:', [
                'original_name' => $audioFile->getClientOriginalName(),
                'mime_type' => $audioFile->getClientMimeType(),
                'size' => $audioFile->getSize(),
            ]);

            // Si tu orquestador/servicio expone un método para transcribir directo
            $transcripcion = $this->orchestrator->transcribirAudio($audioFile);

            return response()->json([
                'success' => true,
                'data' => [
                    'transcripcion' => $transcripcion,
                ],
            ]);

        } catch (Exception $e) {
            Log::error('Error en VoiceIAController@transcribir: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al transcribir el audio: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Procesar audio o texto enviado desde la interfaz de voz
     * POST /api/v1/voice/procesar-audio
     */
    public function procesarAudio(Request $request)
    {
        // 1. Validaciones flexibilizadas para Blob de micrófono WebM
        $request->validate([
            'audio' => 'nullable|file|max:10240', // Se remueve mimes estricto para evitar bloqueos con Blobs webm
            'texto' => 'nullable|string',
            'conversacion_id' => 'nullable|integer',
        ]);

        try {
            $input = $request->file('audio') ?? $request->input('texto');
            $conversacionId = $request->input('conversacion_id');

            if (!$input) {
                return response()->json([
                    'success' => false,
                    'message' => 'Debes enviar un archivo de audio o una cadena de texto.',
                ], 400);
            }

            // Log de depuración
            if ($request->hasFile('audio')) {
                Log::info('Audio recibido en Controller:', [
                    'original_name' => $request->file('audio')->getClientOriginalName(),
                    'mime_type' => $request->file('audio')->getClientMimeType(),
                    'size' => $request->file('audio')->getSize(),
                ]);
            }

            // 2. Procesamiento a través del Orquestador
            $resultado = $this->orchestrator->procesarComando($input, $conversacionId, auth()->id());

            // 3. Garantizar que la respuesta siempre contenga la transcripción
            if (!isset($resultado['transcripcion'])) {
                $resultado['transcripcion'] = '';
            }

            return response()->json([
                'success' => true,
                'data' => $resultado,
            ]);

        } catch (Exception $e) {
            Log::error('Error en VoiceIAController@procesarAudio: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al procesar comando de voz: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Confirmar emisión por voz
     * POST /api/v1/voice/confirmar-emision
     */
    public function confirmarEmision(Request $request)
    {
        $request->validate([
            'conversacion_id' => 'required|integer|exists:voice_conversaciones,id',
            'override_data' => 'nullable|array',
        ]);

        try {
            $resultado = $this->orchestrator->confirmarEmision(
                $request->conversacion_id,
                $request->override_data,
                auth()->id()
            );

            return response()->json([
                'success' => true,
                'message' => 'Comprobante emitido exitosamente por voz.',
                'data' => $resultado,
            ]);

        } catch (Exception $e) {
            Log::error('Error en VoiceIAController@confirmarEmision: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Error al confirmar emisión: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cancelar sesión de voz
     * POST /api/v1/voice/cancelar
     */
    public function cancelar(Request $request)
    {
        $request->validate([
            'conversacion_id' => 'required|integer|exists:voice_conversaciones,id',
        ]);

        $this->orchestrator->cancelarConversacion($request->conversacion_id);

        return response()->json([
            'success' => true,
            'message' => 'Conversación de voz cancelada.',
        ]);
    }
}