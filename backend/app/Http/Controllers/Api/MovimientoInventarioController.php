<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MovimientoInventario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MovimientoInventarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MovimientoInventario::with(['categoria', 'usuario']);

        $query->when($request->filled('empresa_id'), fn ($q) => $q->where('empresa_id', $request->empresa_id))
            ->when($request->filled('tipo'), fn ($q) => $q->where('tipo', $request->tipo))
            ->when($request->filled('almacen'), fn ($q) => $q->where('almacen', 'ilike', "%{$request->almacen}%"))
            ->when($request->filled('categoria_id'), fn ($q) => $q->where('categoria_id', $request->categoria_id))
            ->when($request->filled('buscar'), fn ($q) => $q->where(function ($sub) use ($request) {
                $sub->where('nombre_producto', 'ilike', "%{$request->buscar}%")
                    ->orWhere('codigo_producto', 'ilike', "%{$request->buscar}%");
            }))
            ->when($request->filled('fecha_desde'), fn ($q) => $q->whereDate('fecha', '>=', $request->fecha_desde))
            ->when($request->filled('fecha_hasta'), fn ($q) => $q->whereDate('fecha', '<=', $request->fecha_hasta));

        $query->orderBy('fecha', 'desc');

        if ($request->filled('per_page')) {
            $items = $query->paginate($request->per_page);
        } else {
            $items = $query->get();
        }

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'empresa_id' => 'required|exists:empresas,id',
            'fecha' => 'required|date',
            'codigo_producto' => 'nullable|string|max:100',
            'nombre_producto' => 'required|string|max:255',
            'almacen' => 'nullable|string|max:100',
            'categoria_id' => 'nullable|exists:categorias,id',
            'cantidad' => 'required|numeric|min:0.001',
            'tipo' => 'required|in:INGRESO,SALIDA,DEVOLUCION',
            'ticket_id' => 'nullable|string|max:100',
            'observaciones' => 'nullable|string',
        ]);

        $validated['usuario_id'] = Auth::id();

        $item = MovimientoInventario::create($validated);
        $item->load(['categoria', 'usuario']);

        return response()->json([
            'success' => true,
            'message' => 'Movimiento registrado exitosamente',
            'data' => $item,
        ], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $item = MovimientoInventario::findOrFail($id);
        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Movimiento eliminado exitosamente',
        ]);
    }
}
