<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GuiaRemision;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class GuiaRemisionController extends Controller
{
    public function index(Request $request)
    {
        $query = GuiaRemision::query();

        // Filtros (similar a Clientes y otros modulos)
        if ($request->has('cliente')) {
            $query->where('destinatario_denominacion', 'ilike', '%' . $request->cliente . '%');
        }

        if ($request->has('serie')) {
            $query->where('serie', 'ilike', '%' . $request->serie . '%');
        }

        if ($request->has('numero')) {
            $query->where('numero', 'ilike', '%' . $request->numero . '%');
        }

        if ($request->has('fecha_inicio')) {
            $query->whereDate('fecha_emision', '>=', $request->fecha_inicio);
        }

        if ($request->has('fecha_fin')) {
            $query->whereDate('fecha_emision', '<=', $request->fecha_fin);
        }

        $guias = $query->orderBy('created_at', 'desc')->paginate($request->per_page ?? 10);

        return response()->json($guias);
    }

    public function correlativo(Request $request)
    {
        $empresaId = $request->query('empresa_id');
        $serie     = $request->query('serie', 'T001');

        $query = GuiaRemision::query();
        if ($empresaId) {
            $query->where('empresa_id', $empresaId);
        }
        $query->where('serie', $serie);

        // Obtener el máximo número numérico registrado
        $maxNumero = $query->max('numero');
        $siguiente = $maxNumero ? ((int) $maxNumero + 1) : 1;

        return response()->json([
            'serie'    => $serie,
            'numero'   => $siguiente,
            'correlativo' => str_pad($siguiente, 8, '0', STR_PAD_LEFT),
        ]);
    }

    public function store(Request $request)
    {
        // Validación básica
        $validator = Validator::make($request->all(), [
            'serie' => 'required|string',
            'numero' => 'required|string',
            'fecha_emision' => 'required|date',
            'destinatario_denominacion' => 'required|string',
            // Agrega más validaciones según sea necesario
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $guia = GuiaRemision::create($request->all());

        return response()->json([
            'success' => true,
            'data' => $guia,
            'message' => 'Guía de remisión creada exitosamente'
        ], 201);
    }

    public function show($id)
    {
        $guia = GuiaRemision::find($id);

        if (!$guia) {
            return response()->json(['message' => 'Guía no encontrada'], 404);
        }

        return response()->json($guia);
    }

    public function update(Request $request, $id)
    {
        $guia = GuiaRemision::find($id);

        if (!$guia) {
            return response()->json(['message' => 'Guía no encontrada'], 404);
        }

        $guia->update($request->all());

        return response()->json([
            'success' => true,
            'data' => $guia,
            'message' => 'Guía actualizada exitosamente'
        ]);
    }

    public function destroy($id)
    {
        $guia = GuiaRemision::find($id);

        if (!$guia) {
            return response()->json(['message' => 'Guía no encontrada'], 404);
        }

        $guia->delete();

        return response()->json([
            'success' => true,
            'message' => 'Guía eliminada exitosamente'
        ]);
    }
}
