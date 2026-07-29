<?php

namespace App\Services\VoiceIA;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Servicio de Síntesis de Texto a Voz (Text-to-Speech).
 * Genera o formatea la respuesta hablada por voz para el asistente de facturación.
 */
class TextToSpeechService
{
    /**
     * Generar respuesta hablada (TTS) a partir de texto.
     * Retorna metadatos de voz y URL/Data de audio si hay servicio externo configurado.
     */
    public function sintetizarVoz(string $texto): array
    {
        try {
            // Si existe API Key de OpenAI para TTS
            if (env('OPENAI_API_KEY')) {
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . env('OPENAI_API_KEY'),
                    'Content-Type' => 'application/json',
                ])->post('https://api.openai.com/v1/audio/speech', [
                    'model' => 'tts-1',
                    'input' => $texto,
                    'voice' => 'alloy', // Voz natural en español
                    'response_format' => 'mp3',
                ]);

                if ($response->successful()) {
                    $audioBase64 = base64_encode($response->body());
                    return [
                        'success' => true,
                        'texto' => $texto,
                        'audio_base64' => 'data:audio/mp3;base64,' . $audioBase64,
                        'proveedor' => 'OpenAI TTS-1',
                    ];
                }
            }

            // Fallback nativo: Indica al Frontend que utilice Web Speech API nativa del navegador
            return [
                'success' => true,
                'texto' => $texto,
                'audio_base64' => null,
                'usar_web_speech_api' => true,
                'lenguaje' => 'es-PE',
                'proveedor' => 'Web Speech API (Nativo Browser)',
            ];

        } catch (Exception $e) {
            Log::error('Error en TextToSpeechService: ' . $e->getMessage());
            return [
                'success' => false,
                'texto' => $texto,
                'error' => $e->getMessage(),
                'usar_web_speech_api' => true,
            ];
        }
    }
}
