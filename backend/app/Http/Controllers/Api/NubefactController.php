<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AnularComprobanteRequest;
use App\Http\Requests\EmitirComprobanteRequest;
use App\Http\Requests\EmitirGuiaRequest;
use App\Models\Comprobante;
use App\Models\GuiaRemision;
use App\Services\NubefactClient;
use App\Services\NubefactMapper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

use App\Services\ComprobanteEmissionService;

class NubefactController extends Controller
{
    protected $nubefactClient;
    protected ComprobanteEmissionService $emissionService;

    public function __construct(NubefactClient $nubefactClient, ComprobanteEmissionService $emissionService)
    {
        $this->nubefactClient = $nubefactClient;
        $this->emissionService = $emissionService;
    }

    /**
     * Emitir un comprobante (factura/boleta/nota) mediante NubeFact
     * POST /api/nubefact/comprobantes
     */
    public function emitirComprobante(EmitirComprobanteRequest $request)
    {
        try {
            $data = $request->validated();
            $result = $this->emissionService->emitir(
                $data,
                $request->comprobante_id ?? null,
                auth()->id()
            );

            return response()->json([
                'success' => true,
                'message' => 'Comprobante emitido exitosamente',
                'data' => $result,
            ], 200);

        } catch (\Exception $e) {
            Log::channel('nubefact')->error('Error al emitir comprobante', [
                'request_data' => $request->all(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al emitir comprobante: ' . $e->getMessage(),
            ], 500);
        }
    }  }
    }

    /**
     * Consultar estado de un comprobante en NubeFact
     * GET /api/nubefact/comprobantes/{tipo}/{serie}/{numero}
     */
    public function consultarComprobante($tipo, $serie, $numero)
    {
        try {
            $tipoInt = NubefactClient::mapearTipoComprobante($tipo);
            $response = $this->nubefactClient->consultarComprobante($tipoInt, $serie, (int) $numero);

            // Buscar comprobante local
            $comprobante = Comprobante::where('tipo_doc', $tipo)
                ->where('serie', $serie)
                ->where('correlativo', $numero)
                ->first();

            // Actualizar si existe
            if ($comprobante) {
                NubefactMapper::updateComprobanteFromNubefact($comprobante, $response);
                $comprobante->nubefact_consultado_at = now();
                $comprobante->save();
            }

            return response()->json([
                'success' => true,
                'data' => $response,
            ], 200);

        } catch (\Exception $e) {
            Log::channel('nubefact')->error('Error al consultar comprobante', [
                'tipo' => $tipo,
                'serie' => $serie,
                'numero' => $numero,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al consultar: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Anular un comprobante mediante NubeFact
     * DELETE /api/nubefact/comprobantes/{tipo}/{serie}/{numero}
     */
    public function anularComprobante(AnularComprobanteRequest $request, $tipo, $serie, $numero)
    {

        try {

            $tipoInt = NubefactClient::mapearTipoComprobante($tipo);
            $validated = $request->validated();
            $response = $this->nubefactClient->generarAnulacion(
                $tipoInt,
                $serie,
                (int) $numero,
                $validated['motivo']
            );

            // Actualizar comprobante local
            $comprobante = Comprobante::where('tipo_doc', $tipo)
                ->where('serie', $serie)
                ->where('correlativo', $numero)
                ->first();

            if ($comprobante) {
                $comprobante->update([
                    'anulado' => true,
                    'anulado_at' => now(),
                    'estado_sunat' => 'baja',
                    'motivo_anulacion' => $validated['motivo'],
                    'nubefact_sunat_ticket' => $response['sunat_ticket_numero'] ?? null,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Comprobante anulado exitosamente',
                'data' => $response,
            ], 200);

        } catch (\Exception $e) {
            Log::channel('nubefact')->error('Error al anular comprobante', [
                'tipo' => $tipo,
                'serie' => $serie,
                'numero' => $numero,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al anular: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Emitir una guía de remisión mediante NubeFact
     * POST /api/nubefact/guias
     */
    public function emitirGuia(EmitirGuiaRequest $request)
    {

        try {

            $validated = $request->validated();
            $guia = GuiaRemision::with(['items', 'empresa'])->findOrFail($validated['guia_id']);

            // Verificar si ya fue emitida
            if ($guia->nubefact_enlace) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta guía ya fue emitida mediante NubeFact',
                    'enlace' => $guia->nubefact_enlace,
                ], 400);
            }

            // Convertir a formato NubeFact
            $nubefactData = NubefactMapper::guiaToNubefact($guia);

            // Paso 1: Enviar a NubeFact (genera XML pero sin PDF)
            $response = $this->nubefactClient->generarGuia($nubefactData);
            NubefactMapper::updateGuiaFromNubefact($guia, $response);

            // Paso 2: Consultar hasta obtener aceptación de SUNAT
            $maxReintentos = config('nubefact.gre.max_reintentos_consulta', 10);
            $segundosEspera = config('nubefact.gre.segundos_entre_reintentos', 3);
            $aceptada = false;
            $intentos = 0;

            while (! $aceptada && $intentos < $maxReintentos) {
                sleep($segundosEspera);

                $consultaResponse = $this->nubefactClient->consultarGuia(
                    $guia->tipo_comprobante,
                    $guia->serie,
                    $guia->numero
                );

                if ($consultaResponse['aceptada_por_sunat']) {
                    $aceptada = true;
                    NubefactMapper::updateGuiaFromNubefact($guia, $consultaResponse);
                    $response = $consultaResponse;
                }

                $intentos++;
            }

            return response()->json([
                'success' => true,
                'message' => $aceptada ? 'Guía emitida y aceptada por SUNAT' : 'Guía emitida, pendiente de aceptación',
                'data' => [
                    'guia_id' => $guia->id,
                    'enlace' => $response['enlace'] ?? null,
                    'aceptada_por_sunat' => $aceptada,
                    'pdf_url' => $response['enlace_del_pdf'] ?? null,
                    'xml_url' => $response['enlace_del_xml'] ?? null,
                    'intentos_consulta' => $intentos,
                ],
            ], 200);

        } catch (\Exception $e) {

            Log::channel('nubefact')->error('Error al emitir guía de remisión', [
                'guia_id' => $request->guia_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al emitir guía: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Consultar estado de una guía en NubeFact
     * GET /api/nubefact/guias/{tipo}/{serie}/{numero}
     */
    public function consultarGuia($tipo, $serie, $numero)
    {
        try {
            $response = $this->nubefactClient->consultarGuia((int) $tipo, $serie, (int) $numero);

            // Buscar guía local y actualizar
            $guia = GuiaRemision::where('tipo_comprobante', $tipo)
                ->where('serie', $serie)
                ->where('numero', $numero)
                ->first();

            if ($guia) {
                NubefactMapper::updateGuiaFromNubefact($guia, $response);
                $guia->nubefact_consultado_at = now();
                $guia->save();
            }

            return response()->json([
                'success' => true,
                'data' => $response,
            ], 200);

        } catch (\Exception $e) {
            Log::channel('nubefact')->error('Error al consultar guía', [
                'tipo' => $tipo,
                'serie' => $serie,
                'numero' => $numero,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al consultar: '.$e->getMessage(),
            ], 500);
        }
    }
}
