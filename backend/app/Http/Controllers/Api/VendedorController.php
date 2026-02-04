<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vendedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class VendedorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Vendedor::query();

        // Filtros opcionales
        if ($request->has('activo')) {
            $query->where('activo', $request->activo);
        }

        if ($request->has('nombre')) {
            $query->where('nombre', 'like', '%'.$request->nombre.'%');
        }

        $vendedores = $query->orderBy('created_at', 'desc')->get();

        return response()->json($vendedores);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:20',
            'porcentaje_comision' => 'required|numeric|min:0|max:100',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $vendedor = Vendedor::create([
            'nombre' => $request->nombre,
            'email' => $request->email,
            'telefono' => $request->telefono,
            'porcentaje_comision' => $request->porcentaje_comision ?? 0,
            'activo' => $request->activo ?? true,
            'created_by' => 'ADMINISTRADOR - CAJA', // Aquí puedes usar auth()->user()->nombre cuando tengas autenticación
            'ventas_cpe' => 0,
            'ventas_nv' => 0,
            'total_ventas' => 0,
            'total_comision' => 0,
        ]);

        return response()->json([
            'success' => true,
            'data' => $vendedor,
            'message' => 'Vendedor creado exitosamente',
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $vendedor = Vendedor::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $vendedor,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $vendedor = Vendedor::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nombre' => 'string|max:255',
            'email' => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:20',
            'porcentaje_comision' => 'numeric|min:0|max:100',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $vendedor->update($request->only([
            'nombre',
            'email',
            'telefono',
            'porcentaje_comision',
            'activo',
        ]));

        return response()->json([
            'success' => true,
            'data' => $vendedor,
            'message' => 'Vendedor actualizado exitosamente',
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $vendedor = Vendedor::findOrFail($id);
        $vendedor->delete();

        return response()->json([
            'success' => true,
            'message' => 'Vendedor eliminado exitosamente',
        ]);
    }
}
