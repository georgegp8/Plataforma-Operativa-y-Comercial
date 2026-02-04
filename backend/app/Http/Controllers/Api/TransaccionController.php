<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaccion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TransaccionController extends Controller
{
    public function index(Request $request)
    {
        $query = Transaccion::query();

        // Filtros
        if ($request->has('activo') && $request->activo !== '') {
            $query->where('activo', $request->activo === 'true' || $request->activo === '1');
        }

        if ($request->has('descripcion') && $request->descripcion !== '') {
            $query->where('descripcion', 'ILIKE', '%'.$request->descripcion.'%');
        }

        if ($request->has('tipo') && $request->tipo !== '') {
            $query->where('tipo', 'ILIKE', '%'.$request->tipo.'%');
        }

        $transacciones = $query->orderBy('created_at', 'desc')->get();

        return response()->json($transacciones);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'descripcion' => 'required|string',
            'tipo' => 'required|string|max:50',
            'activo' => 'boolean',
            'created_by' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $transaccion = Transaccion::create($request->all());

        return response()->json([
            'success' => true,
            'data' => $transaccion,
        ], 201);
    }

    public function show($id)
    {
        $transaccion = Transaccion::find($id);

        if (! $transaccion) {
            return response()->json([
                'success' => false,
                'message' => 'Transacción no encontrada',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $transaccion,
        ]);
    }

    public function update(Request $request, $id)
    {
        $transaccion = Transaccion::find($id);

        if (! $transaccion) {
            return response()->json([
                'success' => false,
                'message' => 'Transacción no encontrada',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'descripcion' => 'required|string',
            'tipo' => 'required|string|max:50',
            'activo' => 'boolean',
            'created_by' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $transaccion->update($request->all());

        return response()->json([
            'success' => true,
            'data' => $transaccion,
        ]);
    }

    public function destroy($id)
    {
        $transaccion = Transaccion::find($id);

        if (! $transaccion) {
            return response()->json([
                'success' => false,
                'message' => 'Transacción no encontrada',
            ], 404);
        }

        $transaccion->delete();

        return response()->json([
            'success' => true,
            'message' => 'Transacción eliminada correctamente',
        ]);
    }
}
