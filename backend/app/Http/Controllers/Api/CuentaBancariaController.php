<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CuentaBancaria;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CuentaBancariaController extends Controller
{
    public function index(Request $request)
    {
        $query = CuentaBancaria::query();

        if ($request->has('activo')) {
            $query->where('activo', $request->activo);
        }

        if ($request->has('descripcion')) {
            $query->where('descripcion', 'like', '%'.$request->descripcion.'%');
        }

        if ($request->has('banco')) {
            $query->where('banco', 'like', '%'.$request->banco.'%');
        }

        $cuentas = $query->orderBy('created_at', 'desc')->get();

        return response()->json($cuentas);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'descripcion' => 'required|string|max:255',
            'numero' => 'required|string|max:100',
            'balance' => 'nullable|numeric',
            'abreviatura' => 'nullable|string|max:50',
            'banco' => 'nullable|string|max:255',
            'moneda' => 'nullable|string|max:10',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $cuenta = CuentaBancaria::create([
            'descripcion' => $request->descripcion,
            'numero' => $request->numero,
            'balance' => $request->balance ?? 0,
            'abreviatura' => $request->abreviatura,
            'banco' => $request->banco,
            'moneda' => $request->moneda ?? 'PEN',
            'activo' => $request->activo ?? true,
            'created_by' => 'ADMINISTRADOR - CAJA',
        ]);

        return response()->json([
            'success' => true,
            'data' => $cuenta,
            'message' => 'Cuenta bancaria creada exitosamente',
        ], 201);
    }

    public function show(string $id)
    {
        $cuenta = CuentaBancaria::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $cuenta,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $cuenta = CuentaBancaria::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'descripcion' => 'string|max:255',
            'numero' => 'string|max:100',
            'balance' => 'nullable|numeric',
            'abreviatura' => 'nullable|string|max:50',
            'banco' => 'nullable|string|max:255',
            'moneda' => 'nullable|string|max:10',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $cuenta->update($request->only([
            'descripcion',
            'numero',
            'balance',
            'abreviatura',
            'banco',
            'moneda',
            'activo',
        ]));

        return response()->json([
            'success' => true,
            'data' => $cuenta,
            'message' => 'Cuenta bancaria actualizada exitosamente',
        ]);
    }

    public function destroy(string $id)
    {
        $cuenta = CuentaBancaria::findOrFail($id);
        $cuenta->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cuenta bancaria eliminada exitosamente',
        ]);
    }
}
