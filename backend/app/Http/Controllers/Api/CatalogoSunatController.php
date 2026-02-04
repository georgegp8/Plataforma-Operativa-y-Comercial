<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatalogoSunat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogoSunatController extends Controller
{
    /**
     * Listar catálogos SUNAT
     */
    public function index(Request $request): JsonResponse
    {
        $query = CatalogoSunat::query();

        if ($request->has('catalogo')) {
            $query->where('catalogo', $request->catalogo);
        }

        if ($request->has('activo')) {
            $query->where('activo', $request->activo);
        }

        $query->orderBy('catalogo')->orderBy('codigo');

        $catalogos = $query->get();

        return response()->json([
            'success' => true,
            'data' => $catalogos,
        ]);
    }

    /**
     * Obtener un catálogo específico
     */
    public function show(string $catalogo): JsonResponse
    {
        $items = CatalogoSunat::where('catalogo', $catalogo)
            ->where('activo', true)
            ->orderBy('codigo')
            ->get();

        return response()->json([
            'success' => true,
            'catalogo' => $catalogo,
            'data' => $items,
        ]);
    }

    /**
     * Listar todos los catálogos disponibles
     */
    public function catalogos(): JsonResponse
    {
        $catalogos = [
            '01' => 'Tipo de Documento',
            '02' => 'Tipo de Moneda',
            '03' => 'Tipo de Unidad de Medida',
            '05' => 'Tipo de Tributo',
            '06' => 'Tipo de Documento de Identidad',
            '07' => 'Tipo de Afectación del IGV',
            '09' => 'Tipo de Nota de Crédito',
            '10' => 'Tipo de Nota de Débito',
            '51' => 'Tipo de Operación',
            '53' => 'Tipo de Cargo/Descuento',
        ];

        return response()->json([
            'success' => true,
            'data' => $catalogos,
        ]);
    }
}
