<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comprobante;
use App\Models\Oportunidad;
use App\Models\Pago;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class PagoController extends Controller
{
    /**
     * Listar pagos
     */
    public function index(Request $request): JsonResponse
    {
        $query = Pago::with(['oportunidad', 'comprobante']);

        // Filtros
        if ($request->has('oportunidad_id')) {
            $query->where('oportunidad_id', $request->oportunidad_id);
        }

        if ($request->has('comprobante_id')) {
            $query->where('comprobante_id', $request->comprobante_id);
        }

        if ($request->has('medio_pago')) {
            $query->where('medio_pago', $request->medio_pago);
        }

        // Filtro por fechas
        if ($request->has('fecha_desde')) {
            $query->whereDate('fecha_pago', '>=', $request->fecha_desde);
        }

        if ($request->has('fecha_hasta')) {
            $query->whereDate('fecha_pago', '<=', $request->fecha_hasta);
        }

        // Ordenamiento
        $query->orderBy('fecha_pago', 'desc');

        $pagos = $query->paginate(15);

        return response()->json($pagos);
    }

    /**
     * Registrar nuevo pago
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'oportunidad_id' => 'nullable|exists:oportunidades,id',
            'comprobante_id' => 'nullable|exists:comprobantes,id',
            'fecha_pago' => 'required|date',
            'monto' => 'required|numeric|min:0',
            'medio_pago' => 'required|in:efectivo,transferencia,cheque,deposito,tarjeta,otro',
            'numero_operacion' => 'nullable|string|max:100',
            'banco' => 'nullable|string|max:100',
            'observaciones' => 'nullable|string',
            'comprobante_pago' => 'nullable|file|max:5120', // 5MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Validar que tenga al menos oportunidad o comprobante
        if (! $request->oportunidad_id && ! $request->comprobante_id) {
            return response()->json([
                'success' => false,
                'message' => 'Debe proporcionar al menos una oportunidad o un comprobante',
            ], 422);
        }

        $data = $validator->validated();

        // Subir comprobante de pago si existe
        if ($request->hasFile('comprobante_pago')) {
            $archivo = $request->file('comprobante_pago');

            $filename = 'pago_'.time().'_'.$archivo->getClientOriginalName();
            $path = 'pagos/'.$filename;

            Storage::disk('minio')->put($path, file_get_contents($archivo));

            $data['comprobante_path'] = $path;
        }

        $pago = Pago::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Pago registrado exitosamente',
            'data' => $pago->load(['oportunidad', 'comprobante']),
        ], 201);
    }

    /**
     * Mostrar pago específico
     */
    public function show(int $id): JsonResponse
    {
        $pago = Pago::with(['oportunidad', 'comprobante'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $pago,
        ]);
    }

    /**
     * Actualizar pago
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $pago = Pago::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'oportunidad_id' => 'nullable|exists:oportunidades,id',
            'comprobante_id' => 'nullable|exists:comprobantes,id',
            'fecha_pago' => 'sometimes|date',
            'monto' => 'sometimes|numeric|min:0',
            'medio_pago' => 'sometimes|in:efectivo,transferencia,cheque,deposito,tarjeta,otro',
            'numero_operacion' => 'nullable|string|max:100',
            'banco' => 'nullable|string|max:100',
            'observaciones' => 'nullable|string',
            'comprobante_pago' => 'nullable|file|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        // Subir nuevo comprobante de pago si existe
        if ($request->hasFile('comprobante_pago')) {
            // Eliminar anterior
            if ($pago->comprobante_path) {
                Storage::disk('minio')->delete($pago->comprobante_path);
            }

            $archivo = $request->file('comprobante_pago');

            $filename = 'pago_'.time().'_'.$archivo->getClientOriginalName();
            $path = 'pagos/'.$filename;

            Storage::disk('minio')->put($path, file_get_contents($archivo));

            $data['comprobante_path'] = $path;
        }

        $pago->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Pago actualizado exitosamente',
            'data' => $pago->load(['oportunidad', 'comprobante']),
        ]);
    }

    /**
     * Eliminar pago
     */
    public function destroy(int $id): JsonResponse
    {
        $pago = Pago::findOrFail($id);

        // Eliminar comprobante de pago si existe
        if ($pago->comprobante_path) {
            Storage::disk('minio')->delete($pago->comprobante_path);
        }

        $pago->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pago eliminado exitosamente',
        ]);
    }

    /**
     * Descargar comprobante de pago
     */
    public function descargarComprobante(int $id): mixed
    {
        $pago = Pago::findOrFail($id);

        if (! $pago->comprobante_path) {
            return response()->json([
                'success' => false,
                'message' => 'No hay comprobante de pago adjunto',
            ], 404);
        }

        if (! Storage::disk('minio')->exists($pago->comprobante_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Archivo no encontrado',
            ], 404);
        }

        $file = Storage::disk('minio')->get($pago->comprobante_path);
        $filename = basename($pago->comprobante_path);

        return response($file, 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }

    /**
     * Listar pagos por oportunidad
     */
    public function porOportunidad(int $oportunidadId): JsonResponse
    {
        $pagos = Pago::where('oportunidad_id', $oportunidadId)
            ->orderBy('fecha_pago', 'desc')
            ->get();

        $total = $pagos->sum('monto');

        return response()->json([
            'success' => true,
            'data' => $pagos,
            'total' => $total,
        ]);
    }

    /**
     * Estadísticas de pagos
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $query = Pago::query();

        if ($request->has('fecha_desde')) {
            $query->whereDate('fecha_pago', '>=', $request->fecha_desde);
        }

        if ($request->has('fecha_hasta')) {
            $query->whereDate('fecha_pago', '<=', $request->fecha_hasta);
        }

        $stats = [
            'total_pagos' => $query->count(),
            'monto_total' => $query->sum('monto'),
            'por_medio_pago' => Pago::selectRaw('medio_pago, count(*) as cantidad, sum(monto) as total')
                ->groupBy('medio_pago')
                ->get()
                ->mapWithKeys(function ($item) {
                    return [$item->medio_pago => [
                        'cantidad' => $item->cantidad,
                        'total' => $item->total,
                    ]];
                }),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
