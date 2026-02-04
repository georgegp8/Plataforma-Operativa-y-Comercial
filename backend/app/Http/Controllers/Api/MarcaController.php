<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Marca;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MarcaController extends Controller
{
    public function index(Request $request)
    {
        $query = Marca::query();

        if ($request->has('activo')) {
            $query->where('activo', $request->activo);
        }

        if ($request->has('nombre')) {
            $query->where('nombre', 'like', '%'.$request->nombre.'%');
        }

        $marcas = $query->orderBy('created_at', 'desc')->get();

        return response()->json($marcas);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:100',
            'activo' => 'boolean',
            'created_by' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $marca = Marca::create([
            'nombre' => $request->nombre,
            'activo' => $request->activo ?? true,
            'created_by' => $request->created_by,
        ]);

        return response()->json([
            'success' => true,
            'data' => $marca,
        ], 201);
    }

    public function show($id)
    {
        $marca = Marca::find($id);

        if (! $marca) {
            return response()->json([
                'success' => false,
                'message' => 'Marca no encontrada',
            ], 404);
        }

        return response()->json($marca);
    }

    public function update(Request $request, $id)
    {
        $marca = Marca::find($id);

        if (! $marca) {
            return response()->json([
                'success' => false,
                'message' => 'Marca no encontrada',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:100',
            'activo' => 'boolean',
            'created_by' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $marca->update([
            'nombre' => $request->nombre,
            'activo' => $request->activo ?? $marca->activo,
            'created_by' => $request->created_by ?? $marca->created_by,
        ]);

        return response()->json([
            'success' => true,
            'data' => $marca,
        ]);
    }

    public function destroy($id)
    {
        $marca = Marca::find($id);

        if (! $marca) {
            return response()->json([
                'success' => false,
                'message' => 'Marca no encontrada',
            ], 404);
        }

        $marca->delete();

        return response()->json([
            'success' => true,
            'message' => 'Marca eliminada exitosamente',
        ]);
    }
}
