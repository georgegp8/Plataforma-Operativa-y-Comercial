<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conductor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ConductorController extends Controller
{
    public function index(Request $request)
    {
        $query = Conductor::query();

        if ($request->has('activo')) {
            $query->where('activo', $request->activo);
        }

        if ($request->filled('tipo_documento')) {
            $query->where('tipo_documento', 'ILIKE', '%'.$request->tipo_documento.'%');
        }

        if ($request->filled('numero_documento')) {
            $query->where('numero_documento', 'ILIKE', '%'.$request->numero_documento.'%');
        }

        if ($request->filled('nombre')) {
            $query->where('nombre', 'ILIKE', '%'.$request->nombre.'%');
        }

        if ($request->filled('licencia_conducir')) {
            $query->where('licencia_conducir', 'ILIKE', '%'.$request->licencia_conducir.'%');
        }

        $conductores = $query->orderBy('created_at', 'desc')->get();

        return response()->json($conductores);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'tipo_documento' => 'required|string|max:20',
            'numero_documento' => 'required|string|max:20',
            'nombre' => 'required|string|max:200',
            'licencia_conducir' => 'nullable|string|max:50',
            'telefono' => 'nullable|string|max:20',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $conductor = Conductor::create($request->all());

        return response()->json($conductor, 201);
    }

    public function show($id)
    {
        $conductor = Conductor::find($id);

        if (! $conductor) {
            return response()->json([
                'success' => false,
                'message' => 'Conductor no encontrado',
            ], 404);
        }

        return response()->json($conductor);
    }

    public function update(Request $request, $id)
    {
        $conductor = Conductor::find($id);

        if (! $conductor) {
            return response()->json([
                'success' => false,
                'message' => 'Conductor no encontrado',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'tipo_documento' => 'required|string|max:20',
            'numero_documento' => 'required|string|max:20',
            'nombre' => 'required|string|max:200',
            'licencia_conducir' => 'nullable|string|max:50',
            'telefono' => 'nullable|string|max:20',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $conductor->update($request->all());

        return response()->json($conductor);
    }

    public function destroy($id)
    {
        $conductor = Conductor::find($id);

        if (! $conductor) {
            return response()->json([
                'success' => false,
                'message' => 'Conductor no encontrado',
            ], 404);
        }

        $conductor->delete();

        return response()->json([
            'success' => true,
            'message' => 'Conductor eliminado correctamente',
        ]);
    }
}
