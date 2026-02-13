<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class EmpresaController extends Controller
{
    /**
     * Listar empresas
     */
    public function index(Request $request): JsonResponse
    {
        $query = Empresa::query();

        // Filtros
        if ($request->has('ruc')) {
            $query->where('ruc', 'like', "%{$request->ruc}%");
        }

        if ($request->has('activo')) {
            $query->where('activo', $request->activo);
        }

        if ($request->has('modo')) {
            $query->where('modo', $request->modo);
        }

        // Ordenamiento
        $query->orderBy('razon_social');

        $empresas = $query->paginate($request->input('per_page', 15));

        return response()->json($empresas);
    }

    /**
     * Crear nueva empresa
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'ruc' => 'required|string|size:11|unique:empresas,ruc',
            'razon_social' => 'required|string|max:255',
            'nombre_comercial' => 'nullable|string|max:255',
            'ubigeo' => 'required|string|size:6',
            'departamento' => 'required|string|max:100',
            'provincia' => 'required|string|max:100',
            'distrito' => 'required|string|max:100',
            'direccion' => 'required|string|max:255',
            'telefono' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'sol_user' => 'required|string|max:50',
            'sol_password' => 'required|string|max:255',
            'certificado' => 'nullable|file|mimes:pem,pfx,p12',
            'modo' => 'required|in:beta,prod',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        // Subir certificado si existe
        if ($request->hasFile('certificado')) {
            $certificado = $request->file('certificado');
            $filename = $data['ruc'].'_'.time().'.'.$certificado->getClientOriginalExtension();
            $path = $certificado->storeAs('certs', $filename, 'local');
            $data['certificado_path'] = $path;
        }

        $empresa = Empresa::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Empresa creada exitosamente',
            'data' => $empresa,
        ], 201);
    }

    /**
     * Mostrar empresa específica
     */
    public function show(int $id): JsonResponse
    {
        $empresa = Empresa::with(['comprobantes', 'oportunidades'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $empresa,
        ]);
    }

    /**
     * Actualizar empresa
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $empresa = Empresa::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'ruc' => 'nullable|string|size:11|unique:empresas,ruc,'.$id,
            'razon_social' => 'nullable|string|max:255',
            'nombre_comercial' => 'nullable|string|max:255',
            'ubigeo' => 'nullable|string|max:6',
            'departamento' => 'nullable|string|max:100',
            'provincia' => 'nullable|string|max:100',
            'distrito' => 'nullable|string|max:100',
            'direccion' => 'nullable|string|max:255',
            'telefono' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'sol_user' => 'nullable|string|max:50',
            'sol_password' => 'nullable|string|max:255',
            'certificado' => 'nullable|file|mimes:pem,pfx,p12',
            'modo' => 'nullable|in:beta,prod',
            'activo' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = collect($validator->validated())
            ->reject(fn ($value) => $value === null || $value === '')
            ->toArray();

        // Subir nuevo certificado si existe
        if ($request->hasFile('certificado')) {
            // Eliminar certificado anterior
            if ($empresa->certificado_path) {
                Storage::disk('local')->delete($empresa->certificado_path);
            }

            $certificado = $request->file('certificado');
            $filename = ($data['ruc'] ?? $empresa->ruc).'_'.time().'.'.$certificado->getClientOriginalExtension();
            $path = $certificado->storeAs('certs', $filename, 'local');
            $data['certificado_path'] = $path;
        }

        $empresa->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Empresa actualizada exitosamente',
            'data' => $empresa,
        ]);
    }

    /**
     * Eliminar empresa
     */
    public function destroy(int $id): JsonResponse
    {
        $empresa = Empresa::findOrFail($id);

        // Verificar si tiene comprobantes
        if ($empresa->comprobantes()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar la empresa porque tiene comprobantes asociados',
            ], 409);
        }

        // Eliminar certificado
        if ($empresa->certificado_path) {
            Storage::disk('local')->delete($empresa->certificado_path);
        }

        $empresa->delete();

        return response()->json([
            'success' => true,
            'message' => 'Empresa eliminada exitosamente',
        ]);
    }

    /**
     * Cambiar estado activo/inactivo
     */
    public function toggleActivo(int $id): JsonResponse
    {
        $empresa = Empresa::findOrFail($id);
        $empresa->activo = ! $empresa->activo;
        $empresa->save();

        return response()->json([
            'success' => true,
            'message' => $empresa->activo ? 'Empresa activada' : 'Empresa desactivada',
            'data' => $empresa,
        ]);
    }

    /**
     * Cambiar modo beta/producción
     */
    public function cambiarModo(int $id): JsonResponse
    {
        $empresa = Empresa::findOrFail($id);
        $empresa->modo = $empresa->modo === 'beta' ? 'prod' : 'beta';
        $empresa->save();

        return response()->json([
            'success' => true,
            'message' => 'Modo cambiado a '.$empresa->modo,
            'data' => $empresa,
        ]);
    }

    /**
     * Subir logo de empresa
     */
    public function uploadLogo(Request $request, int $id): JsonResponse
    {
        $empresa = Empresa::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'logo' => 'required|image|mimes:jpg,jpeg,png|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $file = $request->file('logo');
        $filename = 'empresa_' . $empresa->id . '_logo_' . time() . '.' . $file->getClientOriginalExtension();

        $path = $file->storeAs('empresas/logos', $filename, 'public');

        // Eliminar logo anterior si existe
        if ($empresa->logo_path) {
            Storage::disk('public')->delete($empresa->logo_path);
        }

        // Guardar ruta relativa dentro del disco public
        $empresa->logo_path = $path;
        $empresa->save();

        return response()->json([
            'success' => true,
            'message' => 'Logo subido correctamente',
            'logo_path' => $empresa->logo_path,
        ]);
    }

    /**
     * Obtener logo de empresa
     */
    public function getLogo(int $id)
    {
        $empresa = Empresa::findOrFail($id);

        if (! $empresa->logo_path || ! Storage::disk('public')->exists($empresa->logo_path)) {
            abort(404, 'Logo no encontrado');
        }

        $file = Storage::disk('public')->get($empresa->logo_path);
        $mime = Storage::disk('public')->mimeType($empresa->logo_path);

        return response($file, 200)->header('Content-Type', $mime);
    }
}
