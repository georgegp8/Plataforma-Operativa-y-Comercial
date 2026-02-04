<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Documento;
use App\Models\Oportunidad;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class DocumentoController extends Controller
{
    /**
     * Listar documentos
     */
    public function index(Request $request): JsonResponse
    {
        $query = Documento::with(['oportunidad']);

        // Filtros
        if ($request->has('oportunidad_id')) {
            $query->where('oportunidad_id', $request->oportunidad_id);
        }

        if ($request->has('tipo')) {
            $query->where('tipo', $request->tipo);
        }

        // Ordenamiento
        $query->orderBy('created_at', 'desc');

        $documentos = $query->paginate(15);

        return response()->json($documentos);
    }

    /**
     * Subir nuevo documento
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'oportunidad_id' => 'required|exists:oportunidades,id',
            'tipo' => 'required|in:tdr,oc,siaf,contrato,conformidad,entregable,pago,otro',
            'descripcion' => 'nullable|string|max:255',
            'archivo' => 'required|file|max:10240', // 10MB max
            'metadata' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        // Subir archivo a MinIO
        if ($request->hasFile('archivo')) {
            $archivo = $request->file('archivo');
            $oportunidad = Oportunidad::findOrFail($data['oportunidad_id']);

            $filename = time().'_'.$archivo->getClientOriginalName();
            $path = "documentos/oportunidad_{$oportunidad->id}/".$filename;

            Storage::disk('minio')->put($path, file_get_contents($archivo));

            $data['nombre_archivo'] = $archivo->getClientOriginalName();
            $data['storage_path'] = $path;
            $data['mime_type'] = $archivo->getMimeType();
            $data['tamano'] = $archivo->getSize();
        }

        if (isset($data['metadata'])) {
            $data['metadata'] = json_encode($data['metadata']);
        }

        $documento = Documento::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Documento subido exitosamente',
            'data' => $documento->load('oportunidad'),
        ], 201);
    }

    /**
     * Mostrar documento específico
     */
    public function show(int $id): JsonResponse
    {
        $documento = Documento::with('oportunidad')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $documento,
        ]);
    }

    /**
     * Actualizar documento (solo metadata y descripción)
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $documento = Documento::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'tipo' => 'sometimes|in:tdr,oc,siaf,contrato,conformidad,entregable,pago,otro',
            'descripcion' => 'nullable|string|max:255',
            'metadata' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        if (isset($data['metadata'])) {
            $data['metadata'] = json_encode($data['metadata']);
        }

        $documento->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Documento actualizado exitosamente',
            'data' => $documento,
        ]);
    }

    /**
     * Eliminar documento
     */
    public function destroy(int $id): JsonResponse
    {
        $documento = Documento::findOrFail($id);

        // Eliminar archivo de MinIO
        if ($documento->storage_path) {
            Storage::disk('minio')->delete($documento->storage_path);
        }

        $documento->delete();

        return response()->json([
            'success' => true,
            'message' => 'Documento eliminado exitosamente',
        ]);
    }

    /**
     * Descargar documento
     */
    public function descargar(int $id): mixed
    {
        $documento = Documento::findOrFail($id);

        if (! $documento->storage_path) {
            return response()->json([
                'success' => false,
                'message' => 'Archivo no encontrado',
            ], 404);
        }

        if (! Storage::disk('minio')->exists($documento->storage_path)) {
            return response()->json([
                'success' => false,
                'message' => 'Archivo no existe en el storage',
            ], 404);
        }

        $file = Storage::disk('minio')->get($documento->storage_path);

        return response($file, 200)
            ->header('Content-Type', $documento->mime_type)
            ->header('Content-Disposition', 'attachment; filename="'.$documento->nombre_archivo.'"');
    }

    /**
     * Obtener URL de descarga
     */
    public function getUrl(int $id): JsonResponse
    {
        $documento = Documento::findOrFail($id);

        if (! $documento->storage_path) {
            return response()->json([
                'success' => false,
                'message' => 'Archivo no encontrado',
            ], 404);
        }

        // Generar URL del endpoint de descarga
        $url = route('documentos.descargar', ['id' => $id]);

        return response()->json([
            'success' => true,
            'url' => $url,
        ]);
    }

    /**
     * Listar documentos por oportunidad
     */
    public function porOportunidad(int $oportunidadId): JsonResponse
    {
        $documentos = Documento::where('oportunidad_id', $oportunidadId)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $documentos,
        ]);
    }
}
