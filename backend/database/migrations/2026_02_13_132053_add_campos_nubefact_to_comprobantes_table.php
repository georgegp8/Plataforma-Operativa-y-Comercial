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
            // Solo agregar columnas que no existen
            $table->string('codigo_tipo_operacion', 10)->nullable();
            $table->string('orden_compra', 100)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('comprobantes', function (Blueprint $table) {
            $table->dropColumn([
                'codigo_tipo_operacion',
                'orden_compra',
            ]);
        });
    }
};
