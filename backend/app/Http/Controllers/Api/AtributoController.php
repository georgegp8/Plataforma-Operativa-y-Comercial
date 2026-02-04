<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Atributo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AtributoController extends Controller
{
    public function index(Request $request)
    {
        $query = Atributo::query();

        if ($request->has('activo')) {
            $query->where('activo', $request->activo);
        }

        if ($request->has('descripcion')) {
            $query->where('descripcion', 'like', '%'.$request->descripcion.'%');
        }

        if ($request->has('codigo')) {
            $query->where('codigo', 'like', '%'.$request->codigo.'%');
        }

        $atributos = $query->orderBy('created_at', 'desc')->get();

        return response()->json($atributos);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'codigo' => 'nullable|string|max:50',
            'descripcion' => 'required|string',
            'activo' => 'boolean',
            'created_by' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $atributo = Atributo::create([
            'codigo' => $request->codigo,
            'descripcion' => $request->descripcion,
            'activo' => $request->activo ?? true,
            'created_by' => $request->created_by,
        ]);

        return response()->json([
            'success' => true,
            'data' => $atributo,
        ], 201);
    }

    public function show($id)
    {
        $atributo = Atributo::find($id);

        if (! $atributo) {
            return response()->json([
                'success' => false,
                'message' => 'Atributo no encontrado',
            ], 404);
        }

        return response()->json($atributo);
    }

    public function update(Request $request, $id)
    {
        $atributo = Atributo::find($id);

        if (! $atributo) {
            return response()->json([
                'success' => false,
                'message' => 'Atributo no encontrado',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'codigo' => 'nullable|string|max:50',
            'descripcion' => 'required|string',
            'activo' => 'boolean',
            'created_by' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $atributo->update([
            'codigo' => $request->codigo,
            'descripcion' => $request->descripcion,
            'activo' => $request->activo ?? $atributo->activo,
            'created_by' => $request->created_by ?? $atributo->created_by,
        ]);

        return response()->json([
            'success' => true,
            'data' => $atributo,
        ]);
    }

    public function destroy($id)
    {
        $atributo = Atributo::find($id);

        if (! $atributo) {
            return response()->json([
                'success' => false,
                'message' => 'Atributo no encontrado',
            ], 404);
        }

        $atributo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Atributo eliminado exitosamente',
        ]);
    }
}
