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
            // Campos faltantes y requeridos por NubeFact y el formulario
            if (!Schema::hasColumn('comprobantes', 'tipo_de_cambio')) {
                $table->decimal('tipo_de_cambio', 10, 4)->nullable();
            }
            if (!Schema::hasColumn('comprobantes', 'total_descuentos')) {
                $table->decimal('total_descuentos', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('comprobantes', 'mto_otros_cargos')) {
                $table->decimal('mto_otros_cargos', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('comprobantes', 'mto_oper_exportacion')) {
                $table->decimal('mto_oper_exportacion', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('comprobantes', 'mto_isc')) {
                $table->decimal('mto_isc', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('comprobantes', 'total_impuestos')) {
                $table->decimal('total_impuestos', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('comprobantes', 'valor_venta')) {
                $table->decimal('valor_venta', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('comprobantes', 'sub_total')) {
                $table->decimal('sub_total', 15, 2)->nullable();
            }
            if (!Schema::hasColumn('comprobantes', 'redondeo')) {
                $table->decimal('redondeo', 15, 2)->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('comprobantes', function (Blueprint $table) {
            $drop = [];
            if (Schema::hasColumn('comprobantes', 'tipo_de_cambio')) $drop[] = 'tipo_de_cambio';
            if (Schema::hasColumn('comprobantes', 'total_descuentos')) $drop[] = 'total_descuentos';
            if (Schema::hasColumn('comprobantes', 'mto_otros_cargos')) $drop[] = 'mto_otros_cargos';
            if (Schema::hasColumn('comprobantes', 'mto_oper_exportacion')) $drop[] = 'mto_oper_exportacion';
            if (Schema::hasColumn('comprobantes', 'mto_isc')) $drop[] = 'mto_isc';
            if (Schema::hasColumn('comprobantes', 'total_impuestos')) $drop[] = 'total_impuestos';
            if (Schema::hasColumn('comprobantes', 'valor_venta')) $drop[] = 'valor_venta';
            if (Schema::hasColumn('comprobantes', 'sub_total')) $drop[] = 'sub_total';
            if (Schema::hasColumn('comprobantes', 'redondeo')) $drop[] = 'redondeo';
            if (count($drop)) $table->dropColumn($drop);
        });
    }
};
