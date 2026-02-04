<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Compra;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CompraController extends Controller
{
    public function index(Request $request)
    {
        $query = Compra::query();

        // Filtro por activo
        if ($request->has('activo')) {
            $query->where('activo', $request->activo);
        }

        // Filtro por estado
        if ($request->filled('estado')) {
            $query->where('estado', 'ILIKE', '%'.$request->estado.'%');
        }

        // Filtro por proveedor
        if ($request->filled('proveedor')) {
            $query->where(function ($q) use ($request) {
                $q->where('proveedor_nombre', 'ILIKE', '%'.$request->proveedor.'%')
                    ->orWhere('proveedor_ruc', 'ILIKE', '%'.$request->proveedor.'%');
            });
        }

        // Filtro por número de comprobante
        if ($request->filled('numero')) {
            $query->where('comprobante_completo', 'ILIKE', '%'.$request->numero.'%');
        }

        $compras = $query->orderBy('fecha_actividad', 'desc')->get();

        return response()->json($compras);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'actividad' => 'required|max:100',
            'fecha_actividad' => 'required|date',
            'proveedor_id' => 'required|integer',
            'proveedor_nombre' => 'required|max:200',
            'proveedor_ruc' => 'required|max:20',
            'estado' => 'nullable|max:50',
            'tipo_comprobante' => 'required|max:10',
            'serie_comprobante' => 'required|max:10',
            'numero_comprobante' => 'required|max:20',
            'comprobante_completo' => 'required|max:50',
            'tipo_comprobante_desc' => 'nullable|max:50',
            'moneda' => 'required|max:10',
            'total' => 'required|numeric',
            'cantidad_productos' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $compra = Compra::create($request->all());

        return response()->json($compra, 201);
    }

    public function show($id)
    {
        $compra = Compra::find($id);

        if (! $compra) {
            return response()->json(['message' => 'Compra no encontrada'], 404);
        }

        return response()->json($compra);
    }

    public function update(Request $request, $id)
    {
        $compra = Compra::find($id);

        if (! $compra) {
            return response()->json(['message' => 'Compra no encontrada'], 404);
        }

        $validator = Validator::make($request->all(), [
            'actividad' => 'required|max:100',
            'fecha_actividad' => 'required|date',
            'proveedor_id' => 'required|integer',
            'proveedor_nombre' => 'required|max:200',
            'proveedor_ruc' => 'required|max:20',
            'estado' => 'nullable|max:50',
            'tipo_comprobante' => 'required|max:10',
            'serie_comprobante' => 'required|max:10',
            'numero_comprobante' => 'required|max:20',
            'comprobante_completo' => 'required|max:50',
            'tipo_comprobante_desc' => 'nullable|max:50',
            'moneda' => 'required|max:10',
            'total' => 'required|numeric',
            'cantidad_productos' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $compra->update($request->all());

        return response()->json($compra);
    }

    public function destroy($id)
    {
        $compra = Compra::find($id);

        if (! $compra) {
            return response()->json(['message' => 'Compra no encontrada'], 404);
        }

        $compra->delete();

        return response()->json(['message' => 'Compra eliminada correctamente']);
    }
}
