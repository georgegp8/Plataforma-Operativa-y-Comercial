<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alerta;
use App\Services\SlaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertaController extends Controller
{
    protected $slaService;

    public function __construct(SlaService $slaService)
    {
        $this->slaService = $slaService;
    }

    /**
     * Listar alertas
     */
    public function index(Request $request): JsonResponse
    {
        $query = Alerta::with('oportunidad');

        if ($request->has('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        if ($request->has('prioridad')) {
            $query->where('prioridad', $request->prioridad);
        }

        if ($request->has('leida')) {
            $query->where('leido', $request->leida);
        }

        $query->orderBy('created_at', 'desc');

        $alertas = $query->paginate(20);

        return response()->json($alertas);
    }

    /**
     * Marcar alerta como leída
     */
    public function marcarLeida(int $id): JsonResponse
    {
        $alerta = Alerta::findOrFail($id);
        $alerta->leido = true;
        $alerta->save();

        return response()->json([
            'success' => true,
            'message' => 'Alerta marcada como leída',
        ]);
    }

    /**
     * Marcar todas como leídas
     */
    public function marcarTodasLeidas(): JsonResponse
    {
        Alerta::where('leido', false)->update(['leido' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Todas las alertas marcadas como leídas',
        ]);
    }

    /**
     * Eliminar alerta
     */
    public function destroy(int $id): JsonResponse
    {
        $alerta = Alerta::findOrFail($id);
        $alerta->delete();

        return response()->json([
            'success' => true,
            'message' => 'Alerta eliminada',
        ]);
    }

    /**
     * Verificar y generar alertas SLA
     */
    public function verificarSla(): JsonResponse
    {
        $alertasCreadas = $this->slaService->verificarAlertas();

        return response()->json([
            'success' => true,
            'message' => "Se crearon {$alertasCreadas} alertas",
            'alertas_creadas' => $alertasCreadas,
        ]);
    }

    /**
     * Contador de alertas no leídas
     */
    public function noLeidas(): JsonResponse
    {
        $count = Alerta::where('leido', false)->count();

        return response()->json([
            'success' => true,
            'count' => $count,
        ]);
    }
}
