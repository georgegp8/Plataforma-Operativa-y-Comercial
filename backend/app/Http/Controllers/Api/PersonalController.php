<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Personal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PersonalController extends Controller
{
    public function index(Request $request)
    {
        $query = Personal::query();

        if ($request->has('activo')) {
            $query->where('activo', $request->activo);
        }

        if ($request->has('nombre')) {
            $query->where('nombre', 'like', '%'.$request->nombre.'%');
        }

        if ($request->has('puesto')) {
            $query->where('puesto_asignado', 'like', '%'.$request->puesto.'%');
        }

        $personal = $query->orderBy('created_at', 'desc')->get();

        return response()->json($personal);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nombre' => 'required|string|max:255',
            'numero' => 'nullable|string|max:50',
            'puesto_asignado' => 'nullable|string|max:255',
            'salario_base' => 'nullable|numeric|min:0',
            'email' => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:20',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $personal = Personal::create([
            'nombre' => $request->nombre,
            'numero' => $request->numero,
            'puesto_asignado' => $request->puesto_asignado,
            'salario_base' => $request->salario_base ?? 0,
            'email' => $request->email,
            'telefono' => $request->telefono,
            'activo' => $request->activo ?? true,
            'created_by' => 'ADMINISTRADOR - CAJA',
        ]);

        return response()->json([
            'success' => true,
            'data' => $personal,
            'message' => 'Personal creado exitosamente',
        ], 201);
    }

    public function show(string $id)
    {
        $personal = Personal::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $personal,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $personal = Personal::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nombre' => 'string|max:255',
            'numero' => 'nullable|string|max:50',
            'puesto_asignado' => 'nullable|string|max:255',
            'salario_base' => 'nullable|numeric|min:0',
            'email' => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:20',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $personal->update($request->only([
            'nombre',
            'numero',
            'puesto_asignado',
            'salario_base',
            'email',
            'telefono',
            'activo',
        ]));

        return response()->json([
            'success' => true,
            'data' => $personal,
            'message' => 'Personal actualizado exitosamente',
        ]);
    }

    public function destroy(string $id)
    {
        $personal = Personal::findOrFail($id);
        $personal->delete();

        return response()->json([
            'success' => true,
            'message' => 'Personal eliminado exitosamente',
        ]);
    }
}
