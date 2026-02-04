<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Oportunidad;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OportunidadController extends Controller
{
    /**
     * Listar oportunidades
     */
    public function index(Request $request): JsonResponse
    {
        $query = Oportunidad::with(['empresa', 'responsable']);

        // Filtros
        if ($request->has('empresa_id')) {
            $query->where('empresa_id', $request->empresa_id);
        }

        if ($request->has('area')) {
            $query->where('area', $request->area);
        }

        if ($request->has('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->has('responsable_id')) {
            $query->where('responsable_id', $request->responsable_id);
        }

        // Filtro por fechas
        if ($request->has('fecha_desde')) {
            $query->whereDate('fecha_inicio', '>=', $request->fecha_desde);
        }

        if ($request->has('fecha_hasta')) {
            $query->whereDate('fecha_inicio', '<=', $request->fecha_hasta);
        }

        // Filtro por vencimiento
        if ($request->has('vencidas')) {
            $query->where('fecha_vencimiento', '<', now())
                ->whereNotIn('estado', ['ganado', 'perdido', 'cancelado']);
        }

        // Ordenamiento
        $orderBy = $request->get('order_by', 'fecha_inicio');
        $orderDir = $request->get('order_dir', 'desc');
        $query->orderBy($orderBy, $orderDir);

        $oportunidades = $query->paginate(15);

        return response()->json($oportunidades);
    }

    /**
     * Crear nueva oportunidad
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'empresa_id' => 'required|exists:empresas,id',
            'area' => 'required|string|max:100',
            'tipo_operacion' => 'required|string|max:100',
            'estado' => 'required|in:nuevo,en_proceso,enviado,observado,ganado,perdido,cancelado',
            'responsable_id' => 'nullable|exists:users,id',
            'cliente_nombre' => 'required|string|max:255',
            'cliente_ruc' => 'nullable|string|max:11',
            'descripcion' => 'nullable|string',
            'monto_estimado' => 'nullable|numeric|min:0',
            'fecha_inicio' => 'required|date',
            'fecha_vencimiento' => 'nullable|date|after:fecha_inicio',
            'probabilidad' => 'nullable|integer|min:0|max:100',
            'notas' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        // Mapear cliente_nombre al campo obligatorio "titulo"
        $data['titulo'] = $data['cliente_nombre'];

        $oportunidad = Oportunidad::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Oportunidad creada exitosamente',
            'data' => $oportunidad->load(['empresa', 'responsable']),
        ], 201);
    }

    /**
     * Mostrar oportunidad específica
     */
    public function show(int $id): JsonResponse
    {
        $oportunidad = Oportunidad::with([
            'empresa',
            'responsable',
            'comprobantes',
            'documentos',
            'pagos',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $oportunidad,
        ]);
    }

    /**
     * Actualizar oportunidad
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $oportunidad = Oportunidad::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'empresa_id' => 'sometimes|exists:empresas,id',
            'area' => 'sometimes|string|max:100',
            'tipo_operacion' => 'sometimes|string|max:100',
            'estado' => 'sometimes|in:nuevo,en_proceso,enviado,observado,ganado,perdido,cancelado',
            'responsable_id' => 'sometimes|nullable|exists:users,id',
            'cliente_nombre' => 'sometimes|string|max:255',
            'cliente_ruc' => 'nullable|string|max:11',
            'descripcion' => 'nullable|string',
            'monto_estimado' => 'nullable|numeric|min:0',
            'fecha_inicio' => 'sometimes|date',
            'fecha_vencimiento' => 'nullable|date|after:fecha_inicio',
            'probabilidad' => 'nullable|integer|min:0|max:100',
            'notas' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        // Si se envía cliente_nombre en la actualización, sincronizarlo con "titulo"
        if (array_key_exists('cliente_nombre', $data)) {
            $data['titulo'] = $data['cliente_nombre'];
        }

        $oportunidad->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Oportunidad actualizada exitosamente',
            'data' => $oportunidad->load(['empresa', 'responsable']),
        ]);
    }

    /**
     * Eliminar oportunidad
     */
    public function destroy(int $id): JsonResponse
    {
        $oportunidad = Oportunidad::findOrFail($id);

        // Verificar si tiene comprobantes
        if ($oportunidad->comprobantes()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar la oportunidad porque tiene comprobantes asociados',
            ], 409);
        }

        $oportunidad->delete();

        return response()->json([
            'success' => true,
            'message' => 'Oportunidad eliminada exitosamente',
        ]);
    }

    /**
     * Cambiar estado de la oportunidad
     */
    public function cambiarEstado(Request $request, int $id): JsonResponse
    {
        $oportunidad = Oportunidad::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'estado' => 'required|in:nuevo,en_proceso,enviado,observado,ganado,perdido,cancelado',
            'notas' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $oportunidad->estado = $request->estado;

        if ($request->has('notas')) {
            $oportunidad->notas = $request->notas;
        }

        $oportunidad->save();

        return response()->json([
            'success' => true,
            'message' => 'Estado actualizado a: '.$request->estado,
            'data' => $oportunidad,
        ]);
    }

    /**
     * Estadísticas por estado
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $query = Oportunidad::query();

        if ($request->has('empresa_id')) {
            $query->where('empresa_id', $request->empresa_id);
        }

        $stats = [
            'total' => $query->count(),
            'por_estado' => $query->selectRaw('estado, count(*) as total')
                ->groupBy('estado')
                ->get()
                ->pluck('total', 'estado'),
            'monto_total' => $query->sum('monto_estimado'),
            'monto_ganado' => $query->where('estado', 'ganado')->sum('monto_estimado'),
            'vencidas' => Oportunidad::where('fecha_vencimiento', '<', now())
                ->whereNotIn('estado', ['ganado', 'perdido', 'cancelado'])
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
