<?php

namespace App\Services\VoiceIA;

use App\Models\VoiceConversacion;
use App\Models\VoiceMensaje;
use App\Services\ComprobanteEmissionService;
use Exception;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

/**
 * Orquestador principal del flujo Voice IA sin simulaciones.
 * Conecta STT -> Intención (IA) -> Confirmación -> ComprobanteEmissionService.
 */
class VoiceIAOrchestratorService
{
    protected SpeechToTextService $sttService;
    protected VoiceIntentService $intentService;
    protected TextToSpeechService $ttsService;
    protected ComprobanteEmissionService $emissionService;

    public function __construct(
        SpeechToTextService $sttService,
        VoiceIntentService $intentService,
        TextToSpeechService $ttsService,
        ComprobanteEmissionService $emissionService
    ) {
        $this->sttService = $sttService;
        $this->intentService = $intentService;
        $this->ttsService = $ttsService;
        $this->emissionService = $emissionService;
    }

    /**
     * Transcribir un archivo de audio directamente sin analizar intenciones ni guardar en BD.
     *
     * @param UploadedFile $audioFile
     * @return string
     */
    public function transcribirAudio(UploadedFile $audioFile): string
    {
        $transcripcionData = $this->sttService->transcribir($audioFile);
        
        return trim($transcripcionData['texto'] ?? '');
    }

    /**
     * Procesar audio o texto de comando por voz y preparar la vista previa de confirmación o ejecutarla.
     */
    public function procesarComando(UploadedFile|string $input, ?int $conversacionIdPendiente = null, ?int $usuarioId = null): array
    {
        $startTime = microtime(true);

        // 1. Transcripción real si es archivo de audio
        if ($input instanceof UploadedFile) {
            $transcripcionData = $this->sttService->transcribir($input);
            $textoComando = trim($transcripcionData['texto'] ?? '');
            $tiempoSTT = $transcripcionData['duracion_ms'] ?? 0;
        } else {
            $textoComando = trim((string) $input);
            $tiempoSTT = 0;
        }

        // ❌ VALIDACIÓN REAL: Si no hay texto detectado en la voz, NO SIMULAR. Notificar al usuario.
        if (empty($textoComando) || $textoComando === '(Audio procesado pero no se detectó texto claro)') {
            $mensajeErrorVoz = "No logré escuchar lo que dijiste. Por favor, mantén presionado el botón y habla claramente.";
            
            return [
                'conversacion_id' => $conversacionIdPendiente,
                'estado' => 'audio_no_entendido',
                'transcripcion' => '',
                'asistente_respuesta' => $mensajeErrorVoz,
                'tts' => $this->ttsService->sintetizarVoz($mensajeErrorVoz),
                'intencion' => null,
                'tiempo_procesamiento_ms' => round((microtime(true) - $startTime) * 1000),
            ];
        }

        $textoLower = mb_strtolower($textoComando, 'UTF-8');

        // 2. Detectar si el usuario está confirmando una conversación previa abierta
        $esComandoConfirmacion = in_array($textoLower, ['si', 'sí', 'confirmar', 'emitir', 'sí emitir', 'si emitir', 'sí confirmar', 'si confirmar', 'aceptar', 'proceder']) ||
            (str_contains($textoLower, 'confirmar') || str_contains($textoLower, 'emitir')) && $conversacionIdPendiente;

        if ($conversacionIdPendiente && $esComandoConfirmacion) {
            return $this->confirmarEmision($conversacionIdPendiente, null, $usuarioId);
        }

        // 3. Extraer la intención real con el servicio de IA (Gemini / OpenAI)
        $intencion = $this->intentService->analizarIntencion($textoComando);
        $tiempoProcesamiento = round((microtime(true) - $startTime) * 1000);

        // Si la IA no logró extraer un cliente o monto válido del texto dictado
        if (empty($intencion['cliente_denominacion']) || empty($intencion['total'])) {
            $mensajeIncompleto = "Escuché: \"{$textoComando}\", pero no pude identificar un cliente o un monto claro para generar el comprobante.";
            
            return [
                'conversacion_id' => null,
                'estado' => 'intencion_incompleta',
                'transcripcion' => $textoComando,
                'asistente_respuesta' => $mensajeIncompleto,
                'tts' => $this->ttsService->sintetizarVoz($mensajeIncompleto),
                'intencion' => $intencion,
                'tiempo_procesamiento_ms' => $tiempoProcesamiento,
            ];
        }

        // 4. Crear registro real de la sesión conversacional en BD
        $conversacion = VoiceConversacion::create([
            'usuario_id' => $usuarioId ?? auth()->id() ?? 1,
            'entidad_id' => $intencion['cliente']['id'] ?? null,
            'estado' => 'esperando_confirmacion',
            'tipo_comprobante_sugerido' => $intencion['tipo_comprobante_sunat'] ?? '01',
            'payload_intencion' => $intencion,
            'tiempo_transcripcion_ms' => $tiempoSTT,
            'tiempo_procesamiento_ms' => $tiempoProcesamiento,
        ]);

        // Guardar mensaje del usuario en la BD
        VoiceMensaje::create([
            'conversacion_id' => $conversacion->id,
            'rol' => 'user',
            'tipo' => $input instanceof UploadedFile ? 'audio' : 'text',
            'texto' => $textoComando,
            'payload_intencion' => $intencion,
        ]);

        // 5. Construir respuesta contextual según lo extraído REALMENTE por la IA
        $clienteNombre = $intencion['cliente_denominacion'];
        $tipoNombre = $intencion['tipo_comprobante_nombre'] ?? 'Factura';
        $totalFormatted = number_format((float) $intencion['total'], 2);

        $respuestaAsistente = "Entendido. He preparado la {$tipoNombre} para {$clienteNombre} por S/ {$totalFormatted}. Di 'confirmar' o presiona el botón para emitir.";
        $ttsData = $this->ttsService->sintetizarVoz($respuestaAsistente);

        // Guardar respuesta del asistente
        VoiceMensaje::create([
            'conversacion_id' => $conversacion->id,
            'rol' => 'assistant',
            'tipo' => 'text',
            'texto' => $respuestaAsistente,
        ]);

        return [
            'conversacion_id' => $conversacion->id,
            'estado' => 'esperando_confirmacion',
            'transcripcion' => $textoComando,
            'asistente_respuesta' => $respuestaAsistente,
            'tts' => $ttsData,
            'intencion' => $intencion,
            'tiempo_procesamiento_ms' => $tiempoProcesamiento,
        ];
    }

    /**
     * Confirmar la emisión real del comprobante previa revisión.
     */
    public function confirmarEmision(int $conversacionId, ?array $overrideData = null, ?int $usuarioId = null): array
    {
        $conversacion = VoiceConversacion::findOrFail($conversacionId);

        if ($conversacion->estado === 'completada') {
            throw new Exception('Esta conversación ya fue completada y el comprobante ya está emitido.');
        }

        $payload = $overrideData ?? $conversacion->payload_intencion;
        $conversacion->update(['estado' => 'procesando']);

        try {
            // Emisión real ante NubeFact / SUNAT
            $resultado = $this->emissionService->emitir($payload, null, $usuarioId ?? auth()->id());

            // Actualizar la conversación
            $conversacion->update([
                'comprobante_id' => $resultado['comprobante_id'] ?? null,
                'estado' => 'completada',
            ]);

            $numCompleto = $resultado['numero_completo'] ?? '';
            $mensajeExito = "Comprobante {$numCompleto} emitido exitosamente.";
            $ttsExito = $this->ttsService->sintetizarVoz($mensajeExito);

            VoiceMensaje::create([
                'conversacion_id' => $conversacion->id,
                'rol' => 'assistant',
                'tipo' => 'text',
                'texto' => $mensajeExito,
                'payload_intencion' => $resultado,
            ]);

            return [
                'success' => true,
                'conversacion_id' => $conversacion->id,
                'estado' => 'completada',
                'mensaje' => $mensajeExito,
                'asistente_respuesta' => $mensajeExito,
                'tts' => $ttsExito,
                'data' => $resultado,
            ];

        } catch (Exception $e) {
            $conversacion->update([
                'estado' => 'error',
                'error_mensaje' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    /**
     * Cancelar la conversación activa.
     */
    public function cancelarConversacion(int $conversacionId): bool
    {
        $conversacion = VoiceConversacion::findOrFail($conversacionId);
        $conversacion->update(['estado' => 'cancelada']);
        return true;
    }
}