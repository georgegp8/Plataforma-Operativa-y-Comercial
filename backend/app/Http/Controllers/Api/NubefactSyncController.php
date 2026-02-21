<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NubefactClient;
use App\Services\NubefactSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Controlador para sincronización directa con NubeFact API
 * Permite obtener información sin necesidad de cargar archivos Excel
 */
class NubefactSyncController extends Controller
{
    protected NubefactSyncService $syncService;

    protected NubefactClient $client;

    public function __construct(NubefactSyncService $syncService, NubefactClient $client)
    {
        $this->syncService = $syncService;
        $this->client = $client;
    }

    /**
     * Sincronizar un comprobante específico desde NubeFact
     *
     * POST /api/nubefact-sync/comprobante
     * Body: { "tipo_doc": "01", "serie": "F001", "numero": 123, "empresa_id": 1 }
     */
    public function sincronizarComprobante(Request $request): JsonResponse
    {
        $request->validate([
            'tipo_doc' => 'required|in:01,03,07,08',
            'serie' => 'required|string',
            'numero' => 'required|integer',
            'empresa_id' => 'nullable|exists:empresas,id',
        ]);

        $resultado = $this->syncService->sincronizarComprobante(
            $request->tipo_doc,
            $request->serie,
            $request->numero,
            $request->empresa_id
        );

        return response()->json($resultado, $resultado['success'] ? 200 : 400);
    }

    /**
     * Sincronizar un rango de comprobantes
     *
     * POST /api/nubefact-sync/rango
     * Body: { "tipo_doc": "01", "serie": "F001", "numero_inicio": 1, "numero_fin": 50 }
     */
    public function sincronizarRango(Request $request): JsonResponse
    {
        $request->validate([
            'tipo_doc' => 'required|in:01,03,07,08',
            'serie' => 'required|string',
            'numero_inicio' => 'required|integer|min:1',
            'numero_fin' => 'required|integer|gte:numero_inicio',
            'empresa_id' => 'nullable|exists:empresas,id',
        ]);

        // Limitar a máximo 100 comprobantes por request para no saturar
        $rango = $request->numero_fin - $request->numero_inicio + 1;
        if ($rango > 100) {
            return response()->json([
                'success' => false,
                'mensaje' => 'El rango máximo permitido es de 100 comprobantes',
            ], 400);
        }

        $resultados = $this->syncService->sincronizarRango(
            $request->tipo_doc,
            $request->serie,
            $request->numero_inicio,
            $request->numero_fin,
            $request->empresa_id
        );

        // Enriquecer automáticamente con datos del XML (clientes, items, productos)
        if ($resultados['exitosos'] > 0) {
            $xmlResult = $this->syncService->enriquecerDesdeXml($request->empresa_id);
            $resultados['enriquecidos'] = $xmlResult['exitosos'];
        }

        return response()->json($resultados);
    }

    /**
     * Sincronizar comprobantes pendientes
     *
     * POST /api/nubefact-sync/pendientes
     * Body: { "solo_pendientes": true, "limite": 50 }
     */
    public function sincronizarPendientes(Request $request): JsonResponse
    {
        $request->validate([
            'empresa_id' => 'nullable|exists:empresas,id',
            'tipo_doc' => 'nullable|in:01,03,07,08',
            'fecha_desde' => 'nullable|date',
            'fecha_hasta' => 'nullable|date',
            'solo_pendientes' => 'nullable|boolean',
            'limite' => 'nullable|integer|min:1|max:200',
        ]);

        $opciones = [
            'empresa_id' => $request->empresa_id,
            'tipo_doc' => $request->tipo_doc,
            'fecha_desde' => $request->fecha_desde,
            'fecha_hasta' => $request->fecha_hasta,
            'solo_pendientes' => $request->solo_pendientes ?? true,
            'limite' => $request->limite ?? 50,
        ];

        $resultados = $this->syncService->sincronizarPendientes($opciones);

        return response()->json($resultados);
    }

    /**
     * Enriquecer comprobantes sincronizados descargando datos del XML
     *
     * POST /api/nubefact-sync/enriquecer-xml
     */
    public function enriquecerDesdeXml(Request $request): JsonResponse
    {
        $request->validate([
            'empresa_id' => 'nullable|exists:empresas,id',
        ]);

        $resultados = $this->syncService->enriquecerDesdeXml($request->empresa_id);

        return response()->json($resultados);
    }

    /**
     * Consultar un comprobante directamente en NubeFact sin guardar
     * (solo para visualización)
     *
     * GET /api/nubefact-sync/consultar/{tipo_doc}/{serie}/{numero}
     */
    public function consultarEnNubefact(string $tipoDoc, string $serie, int $numero): JsonResponse
    {
        $resultado = $this->syncService->consultarComprobanteEnNubefact($tipoDoc, $serie, $numero);

        return response()->json($resultado, $resultado['success'] ? 200 : 404);
    }

    /**
     * Verificar estado de la conexión con NubeFact
     *
     * GET /api/nubefact-sync/estado
     */
    public function verificarEstado(): JsonResponse
    {
        try {
            // Validar que las credenciales estén configuradas
            $this->client->validarCredenciales();

            // Verificar si hay al menos un comprobante en BD para hacer prueba real
            $comprobantePrueba = DB::table('comprobantes')
                ->whereNotNull('serie')
                ->whereNotNull('correlativo')
                ->whereNotNull('tipo_doc')
                ->first();

            /** @var object{tipo_doc: string, serie: string, correlativo: string}|null $comprobantePrueba */

            $conexionVerificada = false;
            $mensajeAdicional = '';

            if ($comprobantePrueba) {
                try {
                    // Intentar consultar un comprobante real de la BD
                    $tipoMap = ['01' => 1, '03' => 2, '07' => 3, '08' => 4];
                    $tipoNubefact = $tipoMap[$comprobantePrueba->tipo_doc] ?? 1;

                    $this->client->consultarComprobante(
                        $tipoNubefact,
                        $comprobantePrueba->serie,
                        $comprobantePrueba->correlativo
                    );

                    $conexionVerificada = true;
                    $mensajeAdicional = ' (verificado con comprobante real)';
                }
                catch (\Exception $e) {
                    // Si falla la consulta pero las credenciales están OK, es aceptable
                    $mensajeAdicional = ' (credenciales válidas, comprobante no encontrado en NubeFact)';
                }
            }
            else {
                $mensajeAdicional = ' (sin comprobantes para verificar conexión real)';
            }

            return response()->json([
                'success' => true,
                'mensaje' => 'Credenciales de NubeFact configuradas correctamente' . $mensajeAdicional,
                'conexion_verificada' => $conexionVerificada,
                'configuracion' => [
                    'base_url' => config('nubefact.base_url'),
                    'modo' => config('nubefact.mode'),
                    'auto_sunat' => config('nubefact.enviar_automaticamente_sunat'),
                ],
            ]);

        }
        catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'mensaje' => 'Error en configuración de NubeFact: ' . $e->getMessage(),
            ], 503);
        }
    }

    /**
     * Obtener estadísticas de sincronización
     *
     * GET /api/nubefact-sync/estadisticas
     */
    public function estadisticas(): JsonResponse
    {
        $stats = DB::table('comprobantes')
            ->selectRaw('
                COUNT(*) as total,
                COUNT(CASE WHEN nubefact_enlace IS NOT NULL THEN 1 END) as con_enlace_nubefact,
                COUNT(CASE WHEN nubefact_aceptada_por_sunat = true THEN 1 END) as aceptados_sunat,
                COUNT(CASE WHEN nubefact_consultado_at IS NULL THEN 1 END) as nunca_consultados,
                COUNT(CASE WHEN nubefact_consultado_at < NOW() - INTERVAL \'24 hours\' THEN 1 END) as desactualizados,
                MAX(nubefact_consultado_at) as ultima_sincronizacion
            ')
            ->first();

        return response()->json([
            'success' => true,
            'estadisticas' => $stats,
        ]);
    }

    /**
     * Sincronizar un rango de guías de remisión desde NubeFact
     *
     * POST /api/nubefact-sync/rango-guias
     * Body: { "tipo": 7, "serie": "T001", "numero_inicio": 1, "numero_fin": 20, "empresa_id": 1 }
     */
    /**
     * Auto-descubrir y sincronizar guías al cargar el módulo.
     *
     * POST /api/nubefact/guias/auto-descubrir
     * Body: { "empresa_id": 1 }  — empresa_id es opcional
     */
    public function autoDescubrirGuias(Request $request): JsonResponse
    {
        $request->validate([
            'empresa_id' => 'nullable|exists:empresas,id',
        ]);

        $resultados = $this->syncService->autoDescubrirGuias($request->empresa_id);

        return response()->json([
            'success'    => true,
            'resultados' => $resultados,
        ]);
    }

    /**
     * Sincronizar un rango de guías de remisión desde NubeFact
     *
     * POST /api/nubefact-sync/rango-guias
     * Body: { "tipo": 7, "serie": "T001", "numero_inicio": 1, "numero_fin": 20, "empresa_id": 1 }
     */
    public function sincronizarRangoGuias(Request $request): JsonResponse
    {
        $request->validate([
            'tipo'          => 'required|integer|in:7,8',
            'serie'         => 'required|string|size:4',
            'numero_inicio' => 'required|integer|min:1',
            'numero_fin'    => 'required|integer|gte:numero_inicio',
            'empresa_id'    => 'nullable|exists:empresas,id',
        ]);

        $rango = $request->numero_fin - $request->numero_inicio + 1;
        if ($rango > 100) {
            return response()->json([
                'success' => false,
                'mensaje' => 'El rango máximo permitido es de 100 guías',
            ], 400);
        }

        $resultados = $this->syncService->sincronizarRangoGuias(
            $request->tipo,
            $request->serie,
            $request->numero_inicio,
            $request->numero_fin,
            $request->empresa_id
        );

        return response()->json([
            'success'    => true,
            'resultados' => $resultados,
        ]);
    }
}
