<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('comprobantes', function (Blueprint $table) {
            // Código del catálogo 54 SUNAT (001-037)
            $table->string('detraccion_tipo', 3)->nullable()->after('detraccion_porcentaje')
                ->comment('Código bien/servicio detracción - Catálogo 54 SUNAT');

            // Medio de pago del catálogo 59 SUNAT
            $table->string('medio_pago_detraccion', 3)->nullable()->after('detraccion_tipo')
                ->comment('Medio pago detracción - Catálogo 59 SUNAT (001=Depósito, 003=Transferencia)');

            // Índice para consultas de detracciones
            $table->index(['empresa_id', 'tiene_detraccion', 'fecha_emision'], 'idx_empresa_detraccion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('comprobantes', function (Blueprint $table) {
            $table->dropIndex('idx_empresa_detraccion');
            $table->dropColumn(['detraccion_tipo', 'medio_pago_detraccion']);
        });
    }
};
