<?php

namespace App\Http\Controllers\Api\VoiceIA;

use App\Http\Controllers\Controller;
use App\Models\VoiceConversacion;
use Illuminate\Http\Request;

class VoiceIAHistorialController extends Controller
{
    /**
     * Listado paginado de historial de sesiones de voz
     * GET /api/v1/voice/conversaciones
     */
    public function index(Request $request)
    {
        $query = VoiceConversacion::with(['usuario', 'entidad', 'comprobante', 'mensajes'])
            ->orderBy('created_at', 'desc');

        if ($request->has('estado')) {
            $query->where('estado', $request->estado);
        }

        $conversaciones = $query->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $conversaciones,
        ]);
    }

    /**
     * Detalle de una conversación
     * GET /api/v1/voice/conversaciones/{id}
     */
    public function show($id)
    {
        $conversacion = VoiceConversacion::with(['usuario', 'entidad', 'comprobante', 'mensajes'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $conversacion,
        ]);
    }
}
