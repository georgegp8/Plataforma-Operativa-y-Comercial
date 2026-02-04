<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CategoriaController extends Controller
{
    public function index(Request $request)
    {
        $query = Categoria::query();

        if ($request->has('activo')) {
            $query->where('activo', $request->activo);
        }

        if ($request->has('nombre')) {
            $query->where('nombre', 'like', '%'.$request->nombre.'%');
        }

        if ($request->has('identificador')) {
            $query->where('identificador', 'like', '%'.$request->identificador.'%');
        }

        $categorias = $query->orderBy('created_at', 'desc')->get();

        return response()->json($categorias);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:100',
            'identificador' => 'nullable|string|max:50',
            'activo' => 'boolean',
            'created_by' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $categoria = Categoria::create([
            'nombre' => $request->nombre,
            'identificador' => $request->identificador,
            'activo' => $request->activo ?? true,
            'created_by' => $request->created_by,
        ]);

        return response()->json([
            'success' => true,
            'data' => $categoria,
        ], 201);
    }

    public function show($id)
    {
        $categoria = Categoria::find($id);

        if (! $categoria) {
            return response()->json([
                'success' => false,
                'message' => 'Categoría no encontrada',
            ], 404);
        }

        return response()->json($categoria);
    }

    public function update(Request $request, $id)
    {
        $categoria = Categoria::find($id);

        if (! $categoria) {
            return response()->json([
                'success' => false,
                'message' => 'Categoría no encontrada',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:100',
            'identificador' => 'nullable|string|max:50',
            'activo' => 'boolean',
            'created_by' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $categoria->update([
            'nombre' => $request->nombre,
            'identificador' => $request->identificador,
            'activo' => $request->activo ?? $categoria->activo,
            'created_by' => $request->created_by ?? $categoria->created_by,
        ]);

        return response()->json([
            'success' => true,
            'data' => $categoria,
        ]);
    }

    public function destroy($id)
    {
        $categoria = Categoria::find($id);

        if (! $categoria) {
            return response()->json([
                'success' => false,
                'message' => 'Categoría no encontrada',
            ], 404);
        }

        $categoria->delete();

        return response()->json([
            'success' => true,
            'message' => 'Categoría eliminada exitosamente',
        ]);
    }
}
