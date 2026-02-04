<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductoRequest;
use App\Http\Requests\UpdateProductoRequest;
use App\Models\Producto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductoController extends Controller
{
    /**
     * Listar productos con filtros
     */
    public function index(Request $request): JsonResponse
    {
        $query = Producto::with('empresa');

        $query->when($request->filled('empresa_id'), fn ($q) => $q->where('empresa_id', $request->empresa_id))
            ->when($request->filled('categoria'), fn ($q) => $q->where('categoria', $request->categoria))
            ->when($request->has('destacado'), fn ($q) => $q->where('destacado', $request->boolean('destacado')))
            ->when($request->filled('buscar'), fn ($q) => $q->buscar($request->buscar));

        // Por defecto solo activos; incluir_inactivos=true muestra todos
        if (! $request->boolean('incluir_inactivos', false)) {
            $query->where('activo', $request->boolean('activo', true));
        }

        // Ordenamiento
        $sortBy = $request->get('sort_by', 'codigo');
        $sortOrder = $request->get('sort_order', 'asc');

        // Ordenamiento especial para código: primero alfabéticos, luego numéricos
        if ($sortBy === 'codigo') {
            $query->orderByRaw("CASE WHEN codigo ~ '^[A-Za-z]' THEN 0 ELSE 1 END, LOWER(codigo) {$sortOrder}");
        } elseif ($sortBy === 'descripcion') {
            $query->orderByRaw("LOWER({$sortBy}) {$sortOrder}");
        } else {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Paginación o listado completo
        if ($request->has('per_page')) {
            $productos = $query->paginate($request->per_page);
        } else {
            $productos = $query->get();
        }

        return response()->json($productos);
    }

    /**
     * Obtener un producto específico
     */
    public function show(string $id): JsonResponse
    {
        $producto = Producto::with('empresa')->findOrFail($id);

        return response()->json($producto);
    }

    /**
     * Crear un nuevo producto
     */
    public function store(StoreProductoRequest $request): JsonResponse
    {
        $producto = Producto::create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Producto creado exitosamente',
            'data' => $producto->load('empresa'),
        ], 201);
    }

    /**
     * Actualizar un producto
     */
    public function update(UpdateProductoRequest $request, string $id): JsonResponse
    {
        $producto = Producto::findOrFail($id);

        $producto->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Producto actualizado exitosamente',
            'data' => $producto->load('empresa'),
        ]);
    }

    /**
     * Eliminar un producto (soft delete: marcar como inactivo)
     */
    public function destroy(string $id): JsonResponse
    {
        $producto = Producto::findOrFail($id);
        $producto->update(['activo' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Producto desactivado exitosamente',
        ]);
    }

    /**
     * Restaurar un producto
     */
    public function restore(string $id): JsonResponse
    {
        $producto = Producto::findOrFail($id);
        $producto->update(['activo' => true]);

        return response()->json([
            'success' => true,
            'message' => 'Producto activado exitosamente',
            'data' => $producto->load('empresa'),
        ]);
    }

    /**
     * Toggle destacado
     */
    public function toggleDestacado(string $id): JsonResponse
    {
        $producto = Producto::findOrFail($id);
        $producto->update(['destacado' => ! $producto->destacado]);

        return response()->json([
            'success' => true,
            'message' => $producto->destacado ? 'Producto marcado como destacado' : 'Producto desmarcado como destacado',
            'data' => $producto,
        ]);
    }

    /**
     * Obtener productos destacados
     */
    public function destacados(Request $request): JsonResponse
    {
        $empresaId = $request->get('empresa_id');

        $query = Producto::destacado()->activo();

        if ($empresaId) {
            $query->where('empresa_id', $empresaId);
        }

        $productos = $query->orderBy('descripcion', 'asc')->get();

        return response()->json($productos);
    }

    /**
     * Importar productos desde CSV
     */
    public function importar(Request $request): JsonResponse
    {
        $request->validate([
            'empresa_id' => 'required|exists:empresas,id',
            'archivo' => 'required|file|mimes:csv,txt',
        ]);

        // TODO: Implementar lógica de importación CSV

        return response()->json([
            'success' => false,
            'message' => 'Funcionalidad de importación en desarrollo',
        ], 501);
    }
}
