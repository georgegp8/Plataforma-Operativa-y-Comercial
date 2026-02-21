<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductoCompuesto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductoCompuestoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ProductoCompuesto::query();

        $query->when($request->filled('empresa_id'), fn ($q) => $q->where('empresa_id', $request->empresa_id))
            ->when($request->filled('nombre'), fn ($q) => $q->where('nombre', 'ilike', "%{$request->nombre}%"))
            ->when($request->filled('codigo_interno'), fn ($q) => $q->where('codigo_interno', 'ilike', "%{$request->codigo_interno}%"))
            ->when($request->filled('buscar'), fn ($q) => $q->where(function ($sub) use ($request) {
                $sub->where('nombre', 'ilike', "%{$request->buscar}%")
                    ->orWhere('codigo_interno', 'ilike', "%{$request->buscar}%");
            }));

        if (! $request->boolean('incluir_inactivos', false)) {
            $query->where('activo', true);
        }

        $query->orderBy('nombre', 'asc');

        if ($request->filled('per_page')) {
            $items = $query->paginate($request->per_page);
        } else {
            $items = $query->get();
        }

        return response()->json($items);
    }

    public function show(string $id): JsonResponse
    {
        $item = ProductoCompuesto::findOrFail($id);

        return response()->json($item);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'empresa_id' => 'required|exists:empresas,id',
            'codigo_interno' => 'nullable|string|max:50',
            'nombre' => 'required|string|max:255',
            'unidad' => 'nullable|string|max:10',
            'precio_unitario_venta' => 'nullable|numeric|min:0',
            'tiene_igv' => 'boolean',
        ]);

        $item = ProductoCompuesto::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Producto compuesto creado exitosamente',
            'data' => $item,
        ], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $item = ProductoCompuesto::findOrFail($id);

        $validated = $request->validate([
            'empresa_id' => 'sometimes|exists:empresas,id',
            'codigo_interno' => 'nullable|string|max:50',
            'nombre' => 'sometimes|required|string|max:255',
            'unidad' => 'nullable|string|max:10',
            'precio_unitario_venta' => 'nullable|numeric|min:0',
            'tiene_igv' => 'boolean',
            'activo' => 'boolean',
        ]);

        $item->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Producto compuesto actualizado exitosamente',
            'data' => $item,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $item = ProductoCompuesto::findOrFail($id);
        $item->update(['activo' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Producto compuesto desactivado exitosamente',
        ]);
    }
}
