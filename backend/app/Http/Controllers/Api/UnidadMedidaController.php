<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UnidadMedida;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UnidadMedidaController extends Controller
{
    public function index(Request $request)
    {
        $query = UnidadMedida::query();

        // Filtros
        if ($request->has('activo') && $request->activo !== '') {
            $query->where('activo', $request->activo === 'true' || $request->activo === '1');
        }

        if ($request->has('descripcion') && $request->descripcion !== '') {
            $query->where('descripcion', 'ILIKE', '%'.$request->descripcion.'%');
        }

        if ($request->has('codigo') && $request->codigo !== '') {
            $query->where('codigo', 'ILIKE', '%'.$request->codigo.'%');
        }

        if ($request->has('simbolo') && $request->simbolo !== '') {
            $query->where('simbolo', 'ILIKE', '%'.$request->simbolo.'%');
        }

        $unidades = $query->orderBy('created_at', 'desc')->get();

        return response()->json($unidades);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'codigo' => 'required|string|max:50',
            'descripcion' => 'required|string',
            'simbolo' => 'required|string|max:20',
            'activo' => 'boolean',
            'created_by' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $unidad = UnidadMedida::create($request->all());

        return response()->json([
            'success' => true,
            'data' => $unidad,
        ], 201);
    }

    public function show($id)
    {
        $unidad = UnidadMedida::find($id);

        if (! $unidad) {
            return response()->json([
                'success' => false,
                'message' => 'Unidad de medida no encontrada',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $unidad,
        ]);
    }

    public function update(Request $request, $id)
    {
        $unidad = UnidadMedida::find($id);

        if (! $unidad) {
            return response()->json([
                'success' => false,
                'message' => 'Unidad de medida no encontrada',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'codigo' => 'required|string|max:50',
            'descripcion' => 'required|string',
            'simbolo' => 'required|string|max:20',
            'activo' => 'boolean',
            'created_by' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $unidad->update($request->all());

        return response()->json([
            'success' => true,
            'data' => $unidad,
        ]);
    }

    public function destroy($id)
    {
        $unidad = UnidadMedida::find($id);

        if (! $unidad) {
            return response()->json([
                'success' => false,
                'message' => 'Unidad de medida no encontrada',
            ], 404);
        }

        $unidad->delete();

        return response()->json([
            'success' => true,
            'message' => 'Unidad de medida eliminada correctamente',
        ]);
    }
}
