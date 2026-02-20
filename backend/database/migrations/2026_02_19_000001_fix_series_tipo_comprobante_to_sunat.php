<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Convierte tipo_comprobante de códigos NubeFact a códigos SUNAT
     *
     * NubeFact → SUNAT:
     * 1 (Factura)       → 01
     * 2 (Boleta)        → 03
     * 3 (Nota Crédito)  → 07
     * 4 (Nota Débito)   → 08
     */
    public function up(): void
    {
        // Mapeo de códigos NubeFact a SUNAT
        $mapping = [
            '1' => '01',
            '2' => '03',
            '3' => '07',
            '4' => '08',
        ];

        foreach ($mapping as $nubefact => $sunat) {
            DB::table('series')
                ->where('tipo_comprobante', $nubefact)
                ->update(['tipo_comprobante' => $sunat]);
        }
    }

    /**
     * Revertir: SUNAT → NubeFact
     */
    public function down(): void
    {
        $mapping = [
            '01' => '1',
            '03' => '2',
            '07' => '3',
            '08' => '4',
        ];

        foreach ($mapping as $sunat => $nubefact) {
            DB::table('series')
                ->where('tipo_comprobante', $sunat)
                ->update(['tipo_comprobante' => $nubefact]);
        }
    }
};
