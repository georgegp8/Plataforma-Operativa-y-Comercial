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
            // Campos requeridos por NubeFact (solo si no existen)
            if (!Schema::hasColumn('comprobantes', 'sunat_transaction')) $table->integer('sunat_transaction')->nullable();
            if (!Schema::hasColumn('comprobantes', 'cliente_denominacion')) $table->string('cliente_denominacion', 250)->nullable();
            if (!Schema::hasColumn('comprobantes', 'cliente_email_1')) $table->string('cliente_email_1', 100)->nullable();
            if (!Schema::hasColumn('comprobantes', 'cliente_email_2')) $table->string('cliente_email_2', 100)->nullable();
            if (!Schema::hasColumn('comprobantes', 'porcentaje_de_igv')) $table->decimal('porcentaje_de_igv', 5, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'descuento_global')) $table->decimal('descuento_global', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'total_anticipo')) $table->decimal('total_anticipo', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'total_gravada')) $table->decimal('total_gravada', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'total_inafecta')) $table->decimal('total_inafecta', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'total_exonerada')) $table->decimal('total_exonerada', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'total_igv')) $table->decimal('total_igv', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'total_gratuita')) $table->decimal('total_gratuita', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'total_otros_cargos')) $table->decimal('total_otros_cargos', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'total')) $table->decimal('total', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'percepcion_tipo')) $table->string('percepcion_tipo', 10)->nullable();
            if (!Schema::hasColumn('comprobantes', 'percepcion_base_imponible')) $table->decimal('percepcion_base_imponible', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'total_percepcion')) $table->decimal('total_percepcion', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'total_incluido_percepcion')) $table->decimal('total_incluido_percepcion', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'retencion_tipo')) $table->string('retencion_tipo', 10)->nullable();
            if (!Schema::hasColumn('comprobantes', 'retencion_base_imponible')) $table->decimal('retencion_base_imponible', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'total_retencion')) $table->decimal('total_retencion', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'total_impuestos_bolsas')) $table->decimal('total_impuestos_bolsas', 15, 2)->nullable();
            if (!Schema::hasColumn('comprobantes', 'detraccion')) $table->boolean('detraccion')->nullable();
            if (!Schema::hasColumn('comprobantes', 'documento_que_se_modifica_tipo')) $table->string('documento_que_se_modifica_tipo', 5)->nullable();
            if (!Schema::hasColumn('comprobantes', 'documento_que_se_modifica_serie')) $table->string('documento_que_se_modifica_serie', 10)->nullable();
            if (!Schema::hasColumn('comprobantes', 'documento_que_se_modifica_numero')) $table->string('documento_que_se_modifica_numero', 20)->nullable();
            if (!Schema::hasColumn('comprobantes', 'tipo_de_nota_de_credito')) $table->string('tipo_de_nota_de_credito', 5)->nullable();
            if (!Schema::hasColumn('comprobantes', 'tipo_de_nota_de_debito')) $table->string('tipo_de_nota_de_debito', 5)->nullable();
            if (!Schema::hasColumn('comprobantes', 'enviar_automaticamente_a_la_sunat')) $table->boolean('enviar_automaticamente_a_la_sunat')->nullable();
            if (!Schema::hasColumn('comprobantes', 'enviar_automaticamente_al_cliente')) $table->boolean('enviar_automaticamente_al_cliente')->nullable();
            if (!Schema::hasColumn('comprobantes', 'condiciones_de_pago')) $table->string('condiciones_de_pago', 100)->nullable();
            if (!Schema::hasColumn('comprobantes', 'medio_de_pago')) $table->string('medio_de_pago', 100)->nullable();
            if (!Schema::hasColumn('comprobantes', 'placa_vehiculo')) $table->string('placa_vehiculo', 20)->nullable();
            if (!Schema::hasColumn('comprobantes', 'orden_compra_servicio')) $table->string('orden_compra_servicio', 100)->nullable();
            if (!Schema::hasColumn('comprobantes', 'formato_de_pdf')) $table->string('formato_de_pdf', 20)->nullable();
            if (!Schema::hasColumn('comprobantes', 'generado_por_contingencia')) $table->boolean('generado_por_contingencia')->nullable();
            if (!Schema::hasColumn('comprobantes', 'bienes_region_selva')) $table->boolean('bienes_region_selva')->nullable();
            if (!Schema::hasColumn('comprobantes', 'servicios_region_selva')) $table->boolean('servicios_region_selva')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('comprobantes', function (Blueprint $table) {
            $drop = [];
            foreach ([
                'sunat_transaction', 'cliente_denominacion', 'cliente_email_1', 'cliente_email_2', 'porcentaje_de_igv',
                'descuento_global', 'total_anticipo', 'total_gravada', 'total_inafecta', 'total_exonerada', 'total_igv',
                'total_gratuita', 'total_otros_cargos', 'total', 'percepcion_tipo', 'percepcion_base_imponible',
                'total_percepcion', 'total_incluido_percepcion', 'retencion_tipo', 'retencion_base_imponible',
                'total_retencion', 'total_impuestos_bolsas', 'detraccion', 'documento_que_se_modifica_tipo',
                'documento_que_se_modifica_serie', 'documento_que_se_modifica_numero', 'tipo_de_nota_de_credito',
                'tipo_de_nota_de_debito', 'enviar_automaticamente_a_la_sunat', 'enviar_automaticamente_al_cliente',
                'condiciones_de_pago', 'medio_de_pago', 'placa_vehiculo', 'orden_compra_servicio', 'formato_de_pdf',
                'generado_por_contingencia', 'bienes_region_selva', 'servicios_region_selva',
            ] as $col) {
                if (Schema::hasColumn('comprobantes', $col)) $drop[] = $col;
            }
            if (count($drop)) $table->dropColumn($drop);
        });
    }
};
