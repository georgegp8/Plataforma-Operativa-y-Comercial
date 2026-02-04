<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vehiculo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class VehiculoController extends Controller
{
    public function index(Request $request)
    {
        $query = Vehiculo::query();

        if ($request->has('activo')) {
            $query->where('activo', $request->activo);
        }

        if ($request->filled('placa')) {
            $query->where('placa', 'ILIKE', '%'.$request->placa.'%');
        }

        if ($request->filled('modelo')) {
            $query->where('modelo', 'ILIKE', '%'.$request->modelo.'%');
        }

        if ($request->filled('marca')) {
            $query->where('marca', 'ILIKE', '%'.$request->marca.'%');
        }

        $vehiculos = $query->orderBy('created_at', 'desc')->get();

        return response()->json($vehiculos);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'placa' => 'required|string|max:20',
            'modelo' => 'required|string|max:100',
            'marca' => 'required|string|max:100',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $vehiculo = Vehiculo::create($request->all());

        return response()->json($vehiculo, 201);
    }

    public function show($id)
    {
        $vehiculo = Vehiculo::find($id);

        if (! $vehiculo) {
            return response()->json([
                'success' => false,
                'message' => 'Vehículo no encontrado',
            ], 404);
        }

        return response()->json($vehiculo);
    }

    public function update(Request $request, $id)
    {
        $vehiculo = Vehiculo::find($id);

        if (! $vehiculo) {
            return response()->json([
                'success' => false,
                'message' => 'Vehículo no encontrado',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'placa' => 'required|string|max:20',
            'modelo' => 'required|string|max:100',
            'marca' => 'required|string|max:100',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $vehiculo->update($request->all());

        return response()->json($vehiculo);
    }

    public function destroy($id)
    {
        $vehiculo = Vehiculo::find($id);

        if (! $vehiculo) {
            return response()->json([
                'success' => false,
                'message' => 'Vehículo no encontrado',
            ], 404);
        }

        $vehiculo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Vehículo eliminado correctamente',
        ]);
    }
}
