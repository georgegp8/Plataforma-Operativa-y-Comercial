<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Serie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SerieController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Serie::with('empresa');

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->integer('empresa_id'));
        }

        if ($request->filled('tipo_comprobante')) {
            $query->where('tipo_comprobante', $request->get('tipo_comprobante'));
        }

        $series = $query->orderBy('empresa_id')->orderBy('tipo_comprobante')->orderBy('serie')->get();

        return response()->json([
            'success' => true,
            'data' => $series,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'empresa_id' => 'required|exists:empresas,id',
            'tipo_comprobante' => 'required|string|size:2',
            'serie' => 'required|string|max:10',
            'correlativo_actual' => 'nullable|integer|min:0',
            'activo' => 'boolean',
            'por_defecto' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        // Si se marca como por_defecto, desmarcar otras de la misma empresa/tipo
        if (! empty($data['por_defecto'])) {
            Serie::where('empresa_id', $data['empresa_id'])
                ->where('tipo_comprobante', $data['tipo_comprobante'])
                ->update(['por_defecto' => false]);
        }

        $serie = Serie::create($data);

        return response()->json([
            'success' => true,
            'data' => $serie,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $serie = Serie::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'tipo_comprobante' => 'sometimes|required|string|size:2',
            'serie' => 'sometimes|required|string|max:10',
            'correlativo_actual' => 'nullable|integer|min:0',
            'activo' => 'boolean',
            'por_defecto' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        if (array_key_exists('por_defecto', $data) && $data['por_defecto']) {
            Serie::where('empresa_id', $serie->empresa_id)
                ->where('tipo_comprobante', $data['tipo_comprobante'] ?? $serie->tipo_comprobante)
                ->update(['por_defecto' => false]);
        }

        $serie->update($data);

        return response()->json([
            'success' => true,
            'data' => $serie->fresh('empresa'),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $serie = Serie::findOrFail($id);
        $serie->delete();

        return response()->json([
            'success' => true,
        ]);
    }
}
