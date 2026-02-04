<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entidad;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class EntidadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Entidad::query();

        // Por defecto solo mostrar entidades activas (a menos que se especifique lo contrario)
        if (! $request->has('incluir_inactivos') || ! $request->boolean('incluir_inactivos')) {
            $query->where('activo', true);
        }

        // Filtro por empresa_id
        if ($request->has('empresa_id')) {
            $query->where('empresa_id', $request->empresa_id);
        }

        // Filtro por es_cliente (por defecto true cuando se usa la ruta /clientes)
        if ($request->has('es_cliente') || $request->path() === 'api/v1/clientes') {
            $esCliente = $request->get('es_cliente', true);
            if (is_string($esCliente)) {
                $esCliente = $esCliente === 'true' || $esCliente === '1';
            }
            $query->where('es_cliente', $esCliente);
        }

        // Filtro por es_proveedor
        if ($request->has('es_proveedor')) {
            $esProveedor = $request->get('es_proveedor');
            if (is_string($esProveedor)) {
                $esProveedor = $esProveedor === 'true' || $esProveedor === '1';
            }
            $query->where('es_proveedor', $esProveedor);
        }

        // Búsqueda por texto
        if ($search = $request->get('search') ?? $request->get('buscar')) {
            $query->where(function ($q) use ($search) {
                $q->where('denominacion', 'ilike', "%{$search}%")
                    ->orWhere('num_doc', 'ilike', "%{$search}%")
                    ->orWhere('razon_comercial', 'ilike', "%{$search}%");
            });
        }

        // Ordenamiento
        $sortBy = $request->get('sort_by', 'denominacion');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // Retornar lista completa (sin paginación) para combobox
        $entidades = $query->get();

        return response()->json($entidades);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'tipo_doc' => 'required|string|max:2',
            'num_doc' => 'required|string|max:20',
            'denominacion' => 'required|string|max:255',
            'razon_comercial' => 'nullable|string|max:255',
            'direccion' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        $empresaId = Auth::user()->empresa_id ?? null;

        $entidad = Entidad::updateOrCreate(
            [
                'empresa_id' => $empresaId,
                'tipo_doc' => $data['tipo_doc'],
                'num_doc' => $data['num_doc'],
            ],
            [
                'denominacion' => $data['denominacion'],
                'razon_comercial' => $data['razon_comercial'] ?? null,
                'direccion' => $data['direccion'] ?? null,
                'email' => $data['email'] ?? null,
                'telefono' => $data['telefono'] ?? null,
                'es_cliente' => true,
                'es_proveedor' => false,
            ]
        );

        return response()->json([
            'success' => true,
            'data' => $entidad,
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        $entidad = Entidad::where('es_cliente', true)->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $entidad,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $entidad = Entidad::where('es_cliente', true)->findOrFail($id);

        $validator = Validator::make($request->all(), [
            'tipo_doc' => 'sometimes|string|max:2',
            'num_doc' => 'sometimes|string|max:20',
            'denominacion' => 'sometimes|string|max:255',
            'razon_comercial' => 'nullable|string|max:255',
            'direccion' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:50',
            'es_cliente' => 'boolean',
            'es_proveedor' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        $entidad->update($data);

        return response()->json([
            'success' => true,
            'data' => $entidad,
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            // Buscar entidad sin filtro de es_cliente
            $entidad = Entidad::findOrFail($id);

            // Verificar si tiene compras asociadas
            $tieneCompras = \App\Models\Compra::where('proveedor_id', $id)->exists();

            if ($tieneCompras) {
                // Soft delete: marcar como inactivo en lugar de eliminar
                $entidad->activo = false;
                $entidad->save();

                return response()->json([
                    'success' => true,
                    'message' => 'Entidad desactivada (tiene registros asociados)',
                    'soft_delete' => true,
                ]);
            }

            // Si no tiene registros asociados, eliminar permanentemente
            $entidad->delete();

            return response()->json([
                'success' => true,
                'message' => 'Entidad eliminada correctamente',
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar: '.$e->getMessage(),
            ], 400);
        }
    }
}
