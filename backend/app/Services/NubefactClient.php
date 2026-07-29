<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cliente para integración con API de NubeFact
 * Basado en la documentación oficial:
 * - NUBEFACT DOC API JSON V1
 * - API NUBEFACT - GUIA DE REMISIÓN
 */
class NubefactClient
{
    protected string $baseUrl;

    protected string $token;

    protected int $timeout;

    public function __construct()
    {
        $this->baseUrl = config('nubefact.base_url');
        $this->token = config('nubefact.token');
        $this->timeout = config('nubefact.timeout', 30);
    }

    /**
     * OPERACIÓN 1: GENERAR COMPROBANTES (Facturas, Boletas, Notas)
     *
     * @param  array  $data  Estructura JSON según documentación NubeFact
     * @return array Respuesta de NubeFact con enlaces PDF/XML/CDR
     *
     * @throws Exception
     */
    public function generarComprobante(array $data): array
    {
        $data['operacion'] = 'generar_comprobante';

        return $this->request($data);
    }

    /**
     * OPERACIÓN 2: CONSULTAR COMPROBANTES
     *
     * @param  int  $tipoComprobante  1=Factura, 2=Boleta, 3=NC, 4=ND
     * @param  string  $serie  Serie del comprobante (F001, B001, etc.)
     * @param  int  $numero  Número correlativo
     * @return array Estado del comprobante, enlaces y flags de SUNAT
     *
     * @throws Exception
     */
    public function consultarComprobante(int $tipoComprobante, string $serie, int $numero): array
    {
        $data = [
            'operacion' => 'consultar_comprobante',
            'tipo_de_comprobante' => $tipoComprobante,
            'serie' => $serie,
            'numero' => $numero,
        ];

        return $this->request($data);
    }

    /**
     * OPERACIÓN 3: GENERAR ANULACIÓN (Comunicación de Baja)
     *
     * @param  string  $motivo  Motivo de anulación (ej: "ERROR DEL SISTEMA")
     * @param  string|null  $codigoUnico  Código único opcional para control
     * @return array Respuesta con ticket SUNAT y enlaces
     *
     * @throws Exception
     */
    public function generarAnulacion(
        int $tipoComprobante,
        string $serie,
        int $numero,
        string $motivo,
        ?string $codigoUnico = null
    ): array {
        $data = [
            'operacion' => 'generar_anulacion',
            'tipo_de_comprobante' => $tipoComprobante,
            'serie' => $serie,
            'numero' => $numero,
            'motivo' => $motivo,
        ];

        if ($codigoUnico) {
            $data['codigo_unico'] = $codigoUnico;
        }

        return $this->request($data);
    }

    /**
     * OPERACIÓN 4: CONSULTAR ANULACIÓN
     *
     * @return array Estado de la anulación en SUNAT
     *
     * @throws Exception
     */
    public function consultarAnulacion(int $tipoComprobante, string $serie, int $numero): array
    {
        $data = [
            'operacion' => 'consultar_anulacion',
            'tipo_de_comprobante' => $tipoComprobante,
            'serie' => $serie,
            'numero' => $numero,
        ];

        return $this->request($data);
    }

    /**
     * OPERACIÓN: GENERAR GUÍA DE REMISIÓN
     *
     * Importante: Proceso de 2 pasos según documentación:
     * 1. Enviar guía (no genera PDF/XML inmediatamente)
     * 2. Consultar con consultarGuia() hasta que SUNAT acepte
     *
     * @param  array  $data  Estructura JSON para GRE Remitente (tipo 7) o Transportista (tipo 8)
     * @return array Respuesta inicial (PDF/XML/CDR estarán vacíos hasta aprobación SUNAT)
     *
     * @throws Exception
     */
    public function generarGuia(array $data): array
    {
        $data['operacion'] = 'generar_guia';

        return $this->request($data);
    }

    /**
     * OPERACIÓN: CONSULTAR GUÍA DE REMISIÓN
     *
     * Usar después de generarGuia() para obtener PDF/XML/CDR
     * una vez que SUNAT haya aceptado la guía.
     *
     * @param  int  $tipoComprobante  7=GRE Remitente, 8=GRE Transportista
     * @param  string  $serie  Serie de la guía (T001, V001, etc.)
     * @param  int  $numero  Número correlativo
     * @return array Estado y enlaces (PDF disponible solo si aceptada_por_sunat=true)
     *
     * @throws Exception
     */
    public function consultarGuia(int $tipoComprobante, string $serie, int $numero): array
    {
        $data = [
            'operacion' => 'consultar_guia',
            'tipo_de_comprobante' => $tipoComprobante,
            'serie' => $serie,
            'numero' => $numero,
        ];

        return $this->request($data);
    }

    /**
     * Ejecutar petición HTTP a NubeFact con headers correctos
     *
     * @param  array  $data  Payload JSON
     * @return array Respuesta decodificada
     *
     * @throws Exception Si hay error de autenticación, formato o servidor
     */
    protected function request(array $data): array
    {
        $this->validarCredenciales();

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => $this->token,
                    'Content-Type' => 'application/json',
                ])
                ->post($this->baseUrl, $data);

            // Log de request/response para debugging
            Log::channel('nubefact')->info('NubeFact Request', [
                'operation' => $data['operacion'] ?? 'unknown',
                'payload' => $data,
            ]);

            if ($response->failed()) {
                Log::channel('nubefact')->error('NubeFact HTTP Error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                if ($response->status() === 404) {
                    throw new Exception(
                        "Error HTTP 404: La URL NUBEFACT_BASE_URL ('{$this->baseUrl}') no existe o es incorrecta. Asegúrate de incluir la clave/ruta asignada por NubeFact a tu empresa (ej: https://api.nubefact.com/api/v1/TU_RUTA_KEY) en el archivo backend/.env."
                    );
                }

                throw new Exception(
                    "Error HTTP {$response->status()} de NubeFact: {$response->body()}"
                );
            }

            $result = $response->json();

            // Manejo de errores según documentación NubeFact
            if (isset($result['errors'])) {
                $codigo = $result['codigo'] ?? 'unknown';
                $mensaje = $result['errors'];

                Log::channel('nubefact')->error('NubeFact API Error', [
                    'codigo' => $codigo,
                    'mensaje' => $mensaje,
                    'payload' => $data,
                ]);

                throw new Exception("NubeFact Error [{$codigo}]: {$mensaje}");
            }

            Log::channel('nubefact')->info('NubeFact Response', [
                'operation' => $data['operacion'] ?? 'unknown',
                'response' => $result,
            ]);

            return $result;

        } catch (Exception $e) {
            Log::channel('nubefact')->error('NubeFact Exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Helper: Mapear tipo de documento de cliente/proveedor a código SUNAT
     *
     * @param  string  $tipo  'RUC', 'DNI', 'CE', etc.
     * @return string Código numérico para NubeFact
     */
    public static function mapearTipoDocumento(string $tipo): string
    {
        $mapa = [
            'RUC' => '6',
            'DNI' => '1',
            'CE' => '4',      // Carnet de Extranjería
            'PASAPORTE' => '7',
            'VARIOS' => '-',  // Ventas menores a 700 soles
        ];

        return $mapa[strtoupper($tipo)] ?? '6';
    }

    /**
     * Helper: Mapear tipo de comprobante interno a código NubeFact
     *
     * @param  string  $tipo  'FACTURA', 'BOLETA', 'NC', 'ND' O códigos SUNAT ('01', '03', '07', '08')
     * @return int Código para NubeFact (1, 2, 3, 4)
     */
    public static function mapearTipoComprobante(string $tipo): int
    {
        // Mapeo desde códigos SUNAT
        $mapaSunat = [
            '01' => 1,  // Factura
            '03' => 2,  // Boleta
            '07' => 3,  // Nota de Crédito
            '08' => 4,  // Nota de Débito
        ];

        // Mapeo desde nombres
        $mapaNombres = [
            'FACTURA' => 1,
            'BOLETA' => 2,
            'NC' => 3,
            'ND' => 4,
            'GRE_REMITENTE' => 7,
            'GRE_TRANSPORTISTA' => 8,
        ];

        // Intentar primero con código SUNAT
        if (isset($mapaSunat[$tipo])) {
            return $mapaSunat[$tipo];
        }

        // Si no, intentar con nombre
        return $mapaNombres[strtoupper($tipo)] ?? 1;
    }

    /**
     * Helper: Validar que URL base y token estén configurados
     *
     * @throws Exception Si faltan credenciales
     */
    public function validarCredenciales(): void
    {
        if (empty($this->baseUrl)) {
            throw new Exception('URL base de NubeFact no configurada. Por favor define NUBEFACT_BASE_URL en backend/.env');
        }

        $trimmedUrl = rtrim($this->baseUrl, '/');
        if (str_ends_with($trimmedUrl, '/api/v1')) {
            throw new Exception("La URL NUBEFACT_BASE_URL ('{$this->baseUrl}') está incompleta. Le falta la clave o RUTA única asignada a tu empresa por NubeFact (ejemplo: https://api.nubefact.com/api/v1/TU_RUTA_KEY).");
        }

        if (empty($this->token) || $this->token === 'dummy_token') {
            throw new Exception('Token de NubeFact no configurado o es un valor genérico (dummy_token). Configura NUBEFACT_TOKEN en backend/.env con tu token JWT real de NubeFact.');
        }
    }
}
