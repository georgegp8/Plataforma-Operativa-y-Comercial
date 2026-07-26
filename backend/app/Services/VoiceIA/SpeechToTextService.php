<?php

namespace App\Services\VoiceIA;

use Exception;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Servicio de Transcripción de Audio a Texto (Speech-to-Text).
 * Soporta Whisper (OpenAI) y Gemini Flash con sanitización dinámica de MIME.
 */
class SpeechToTextService
{
    /**
     * Transcribir un archivo de audio subido o una ruta local.
     */
    public function transcribir(UploadedFile|string $audio): array
    {
        $startTime = microtime(true);

        try {
            $openaiKey = config('services.openai.key') ?? env('OPENAI_API_KEY');
            $geminiKey = config('services.gemini.key') ?? env('GEMINI_API_KEY');

            // 1. Normalización de rutas y nombres de archivo
            $filePath = is_string($audio) ? $audio : $audio->getRealPath();
            $originalName = is_string($audio) ? basename($audio) : $audio->getClientOriginalName();

            // Validación de existencia y tamaño de archivo
            if (!file_exists($filePath) || filesize($filePath) === 0) {
                Log::warning('SpeechToTextService: El archivo de audio recibido está vacío o no existe.', [
                    'path' => $filePath,
                    'originalName' => $originalName,
                ]);

                return [
                    'success' => false,
                    'error' => 'El archivo de audio recibido está vacío o corrompido.',
                    'texto' => '',
                    'duracion_ms' => 0,
                    'motor' => 'Ninguno',
                ];
            }

            // 2. Detección Dinámica de MimeType y Extensión Real
            $detectedMime = is_string($audio) ? mime_content_type($filePath) : $audio->getClientMimeType();
            $detectedMime = explode(';', $detectedMime)[0]; // Limpiar ;codecs=...

            $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

            // Mapeo automático según MimeType o Extensión
            if (str_contains($detectedMime, 'wav') || $extension === 'wav') {
                $mimeType = 'audio/wav';
                $extToUse = 'wav';
            } elseif (str_contains($detectedMime, 'mp3') || $extension === 'mp3') {
                $mimeType = 'audio/mp3';
                $extToUse = 'mp3';
            } elseif (str_contains($detectedMime, 'mp4') || str_contains($detectedMime, 'm4a') || $extension === 'mp4' || $extension === 'm4a') {
                $mimeType = 'audio/mp4';
                $extToUse = 'mp4';
            } elseif (str_contains($detectedMime, 'ogg') || $extension === 'ogg') {
                $mimeType = 'audio/ogg';
                $extToUse = 'ogg';
            } else {
                $mimeType = 'audio/webm';
                $extToUse = 'webm';
            }

            $filename = "comando_voz.{$extToUse}";
            $audioContent = file_get_contents($filePath);

            // ----------------------------------------------------
            // 1. INTENTO CON OPENAI WHISPER
            // ----------------------------------------------------
            if (!empty($openaiKey)) {
                $response = Http::timeout(15)
                    ->withHeaders([
                        'Authorization' => 'Bearer ' . $openaiKey,
                    ])
                    ->attach('file', $audioContent, $filename)
                    ->post('https://api.openai.com/v1/audio/transcriptions', [
                        'model' => 'whisper-1',
                        'language' => 'es',
                    ]);

                if ($response->successful()) {
                    $text = trim((string) $response->json('text'));
                    $duration = round((microtime(true) - $startTime) * 1000);

                    Log::info('Transcripción OpenAI Whisper exitosa: "' . $text . '"');

                    return [
                        'success' => true,
                        'texto' => $text,
                        'duracion_ms' => $duration,
                        'motor' => 'OpenAI Whisper',
                    ];
                }

                Log::error('Error API Whisper OpenAI (' . $response->status() . '): ' . $response->body());
            }

            // ----------------------------------------------------
            // 2. INTENTO CON GEMINI (Audio Multimodal)
            // ----------------------------------------------------
            if (!empty($geminiKey)) {
                $audioBase64 = base64_encode($audioContent);

                $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$geminiKey}";

                $response = Http::timeout(15)->post($url, [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => 'Transcribe exactamente lo que se habla en este audio en español. Devuelve ÚNICAMENTE el texto transcrito sin explicaciones, sin comillas y sin marcas de formato.'],
                                [
                                    'inline_data' => [
                                        'mime_type' => $mimeType,
                                        'data' => $audioBase64,
                                    ],
                                ],
                            ],
                        ],
                    ],
                ]);

                if ($response->successful()) {
                    $text = trim((string) ($response->json('candidates.0.content.parts.0.text') ?? ''));
                    $duration = round((microtime(true) - $startTime) * 1000);

                    Log::info('Transcripción Gemini exitosa: "' . $text . '"');

                    return [
                        'success' => true,
                        'texto' => $text,
                        'duracion_ms' => $duration,
                        'motor' => 'Google Gemini Flash',
                    ];
                }

                Log::error('Error API Gemini Audio (' . $response->status() . '): ' . $response->body());
            }

            throw new Exception("No se pudo transcribir el audio. Revisa que OPENAI_API_KEY o GEMINI_API_KEY estén configuradas en config/services.php o .env");

        } catch (Exception $e) {
            Log::error('Error en SpeechToTextService: ' . $e->getMessage());

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'texto' => '',
                'duracion_ms' => 0,
                'motor' => 'Error',
            ];
        }
    }
}