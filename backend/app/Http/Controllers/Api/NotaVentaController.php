<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotaVenta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotaVentaController extends Controller
{
    /**
     * Listar notas de venta con filtros opcionales.
     */
    public function index(Request $request): JsonResponse
    {
        $query = NotaVenta::query();

        // Filtros
        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->empresa_id);
        }

        if ($request->filled('cliente')) {
            $q = '%' . $request->cliente . '%';
            $query->where(function ($sub) use ($q) {
                $sub->where('cliente_razon_social', 'like', $q)
                    ->orWhere('cliente_num_doc', 'like', $q);
            });
        }

        if ($request->filled('numero')) {
            $query->where('numero', 'like', '%' . $request->numero . '%');
        }

        if ($request->filled('fecha_desde')) {
            $query->where('fecha_emision', '>=', $request->fecha_desde);
        }

        if ($request->filled('fecha_hasta')) {
            $query->where('fecha_emision', '<=', $request->fecha_hasta);
        }

        if ($request->filled('pagado')) {
            $query->where('pagado', filter_var($request->pagado, FILTER_VALIDATE_BOOLEAN));
        }

        // Ordenamiento
        $sortBy = $request->get('sort_by', 'id');
        $sortOrder = $request->get('sort_order', 'desc');
        $allowedSorts = ['id', 'fecha_emision', 'total', 'cliente_razon_social'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderBy('id', 'desc');
        }

        // Paginación o todos
        $perPage = (int) $request->get('per_page', 50);
        if ($perPage > 1000) {
            $perPage = 1000;
        }

        $notas = $query->paginate($perPage);

        // Agregar campos calculados
        $notas->getCollection()->transform(function (NotaVenta $nota) {
            $nota->estado_pago = $nota->estado_pago;
            $nota->numero_completo = $nota->numero_completo;
            return $nota;
        });

        return response()->json($notas);
    }

    /**
     * Crear una nueva nota de venta.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'empresa_id' => 'nullable|exists:empresas,id',
            'serie' => 'required|string|max:10',
            'numero' => 'required|string|max:20',
            'fecha_emision' => 'required|date',
            'moneda' => 'nullable|string|max:3',
            'cliente_tipo_doc' => 'nullable|string|max:2',
            'cliente_num_doc' => 'nullable|string|max:20',
            'cliente_razon_social' => 'nullable|string|max:255',
            'cliente_email' => 'nullable|email|max:255',
            'cliente_telefono' => 'nullable|string|max:50',
            'cliente_direccion' => 'nullable|string',
            'subtotal' => 'nullable|numeric|min:0',
            'igv' => 'nullable|numeric|min:0',
            'total' => 'required|numeric|min:0',
            'metodo_pago' => 'nullable|string|max:50',
            'pagado' => 'nullable|boolean',
            'fecha_vencimiento' => 'nullable|date',
            'cpe_relacionado' => 'nullable|string|max:50',
            'motivo' => 'nullable|string',
            'observaciones' => 'nullable|string',
            'actividad' => 'nullable|string|max:255',
        ]);

        $nota = NotaVenta::create($validated);

        return response()->json([
            'success' => true,
            'data' => $nota,
            'message' => 'Nota de venta creada correctamente',
        ], 201);
    }

    /**
     * Ver una nota de venta específica.
     */
    public function show(int $id): JsonResponse
    {
        $nota = NotaVenta::findOrFail($id);
        $nota->estado_pago = $nota->estado_pago;
        $nota->numero_completo = $nota->numero_completo;

        return response()->json(['data' => $nota]);
    }

    /**
     * Resumen de totales para el panel de Nota de Venta.
     */
    public function totales(Request $request): JsonResponse
    {
        $query = NotaVenta::query();

        if ($request->filled('empresa_id')) {
            $query->where('empresa_id', $request->empresa_id);
        }

        $total_documentos = (clone $query)->count();
        $total_busqueda = (clone $query)->sum('total');
        $total_por_cobrar = (clone $query)->where('pagado', false)->sum('total');

        return response()->json([
            'data' => [
                'total_documentos' => $total_documentos,
                'total_busqueda' => (float) $total_busqueda,
                'total_por_cobrar' => (float) $total_por_cobrar,
            ],
        ]);
    }

    /**
     * Generar CPE masivo desde notas de venta (placeholder - pendiente implementación).
     */
    public function generarCpeMasivo(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:nota_ventas,id',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Funcionalidad en desarrollo',
            'ids' => $request->ids,
        ]);
    }
}
