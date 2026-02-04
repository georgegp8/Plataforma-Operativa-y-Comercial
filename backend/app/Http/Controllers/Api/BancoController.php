<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banco;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class BancoController extends Controller
{
    public function index(Request $request)
    {
        $query = Banco::query();

        if ($request->has('activo')) {
            $query->where('activo', $request->activo);
        }

        if ($request->has('descripcion')) {
            $query->where('descripcion', 'like', '%'.$request->descripcion.'%');
        }

        if ($request->has('abreviatura')) {
            $query->where('abreviatura', 'like', '%'.$request->abreviatura.'%');
        }

        $bancos = $query->orderBy('created_at', 'desc')->get();

        return response()->json($bancos);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'descripcion' => 'required|string|max:255',
            'abreviatura' => 'nullable|string|max:50',
            'imagen' => 'nullable|string',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $banco = Banco::create([
            'descripcion' => $request->descripcion,
            'abreviatura' => $request->abreviatura,
            'imagen' => $request->imagen,
            'activo' => $request->activo ?? true,
            'created_by' => 'ADMINISTRADOR - CAJA',
        ]);

        return response()->json([
            'success' => true,
            'data' => $banco,
            'message' => 'Banco creado exitosamente',
        ], 201);
    }

    public function show(string $id)
    {
        $banco = Banco::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $banco,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $banco = Banco::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'descripcion' => 'string|max:255',
            'abreviatura' => 'nullable|string|max:50',
            'imagen' => 'nullable|string',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $banco->update($request->only([
            'descripcion',
            'abreviatura',
            'imagen',
            'activo',
        ]));

        return response()->json([
            'success' => true,
            'data' => $banco,
            'message' => 'Banco actualizado exitosamente',
        ]);
    }

    public function destroy(string $id)
    {
        $banco = Banco::findOrFail($id);
        $banco->delete();

        return response()->json([
            'success' => true,
            'message' => 'Banco eliminado exitosamente',
        ]);
    }

    public function uploadImage(Request $request, string $id)
    {
        $banco = Banco::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        // Delete old image if exists
        if ($banco->imagen) {
            Storage::disk('public')->delete($banco->imagen);
        }

        // Store new image
        $path = $request->file('image')->store('bancos', 'public');

        $banco->update(['imagen' => $path]);

        return response()->json([
            'success' => true,
            'data' => $banco,
            'message' => 'Imagen subida exitosamente',
        ]);
    }
}
