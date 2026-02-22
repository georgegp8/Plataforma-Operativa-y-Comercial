<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documentos_digitalizados', function (Blueprint $table) {
            // Datos del comprobante extendidos
            $table->date('fecha_vencimiento')->nullable()->after('fecha_emision');
            $table->integer('sunat_transaction')->nullable()->after('fecha_vencimiento');

            // Datos monetarios extendidos
            $table->decimal('tipo_cambio', 10, 4)->nullable()->after('moneda');
            $table->decimal('porcentaje_igv', 5, 2)->default(18.00)->after('tipo_cambio');

            // Totales desagregados
            $table->decimal('total_gravada', 12, 2)->nullable()->after('subtotal');
            $table->decimal('total_exonerada', 12, 2)->nullable()->after('total_gravada');
            $table->decimal('total_inafecta', 12, 2)->nullable()->after('total_exonerada');
            $table->decimal('total_gratuita', 12, 2)->nullable()->after('total_inafecta');
            $table->decimal('descuento_global', 12, 2)->nullable()->after('total_gratuita');
            $table->decimal('total_descuento', 12, 2)->nullable()->after('descuento_global');
            $table->decimal('total_otros_cargos', 12, 2)->nullable()->after('total_descuento');
            $table->decimal('total_isc', 12, 2)->nullable()->after('total_otros_cargos');

            // Percepciones
            $table->integer('percepcion_tipo')->nullable()->after('total_isc');
            $table->decimal('percepcion_base_imponible', 12, 2)->nullable()->after('percepcion_tipo');
            $table->decimal('total_percepcion', 12, 2)->nullable()->after('percepcion_base_imponible');
            $table->decimal('total_incluido_percepcion', 12, 2)->nullable()->after('total_percepcion');

            // Retenciones
            $table->integer('retencion_tipo')->nullable()->after('total_incluido_percepcion');
            $table->decimal('retencion_base_imponible', 12, 2)->nullable()->after('retencion_tipo');
            $table->decimal('total_retencion', 12, 2)->nullable()->after('retencion_base_imponible');

            // Detracciones
            $table->boolean('detraccion')->default(false)->after('total_retencion');
            $table->integer('detraccion_tipo')->nullable()->after('detraccion');
            $table->decimal('detraccion_total', 12, 2)->nullable()->after('detraccion_tipo');
            $table->decimal('detraccion_porcentaje', 5, 2)->nullable()->after('detraccion_total');

            // Información comercial
            $table->string('condiciones_pago', 250)->nullable()->after('detraccion_porcentaje');
            $table->string('medio_pago', 250)->nullable()->after('condiciones_pago');
            $table->string('orden_compra_servicio', 50)->nullable()->after('medio_pago');
            $table->text('observaciones')->nullable()->after('orden_compra_servicio');
            $table->string('placa_vehiculo', 10)->nullable()->after('observaciones');
            $table->string('cliente_email', 250)->nullable()->after('placa_vehiculo');

            // Notas de crédito/débito
            $table->integer('documento_modifica_tipo')->nullable()->after('cliente_email');
            $table->string('documento_modifica_serie', 10)->nullable()->after('documento_modifica_tipo');
            $table->string('documento_modifica_numero', 20)->nullable()->after('documento_modifica_serie');
            $table->integer('tipo_nota_credito')->nullable()->after('documento_modifica_numero');
            $table->integer('tipo_nota_debito')->nullable()->after('tipo_nota_credito');

            // JSON extendidos
            $table->jsonb('venta_credito_cuotas')->nullable()->after('tipo_nota_debito');
            $table->jsonb('guias_relacionadas')->nullable()->after('venta_credito_cuotas');
        });
    }

    public function down(): void
    {
        Schema::table('documentos_digitalizados', function (Blueprint $table) {
            $table->dropColumn([
                'fecha_vencimiento', 'sunat_transaction',
                'tipo_cambio', 'porcentaje_igv',
                'total_gravada', 'total_exonerada', 'total_inafecta', 'total_gratuita',
                'descuento_global', 'total_descuento', 'total_otros_cargos', 'total_isc',
                'percepcion_tipo', 'percepcion_base_imponible', 'total_percepcion', 'total_incluido_percepcion',
                'retencion_tipo', 'retencion_base_imponible', 'total_retencion',
                'detraccion', 'detraccion_tipo', 'detraccion_total', 'detraccion_porcentaje',
                'condiciones_pago', 'medio_pago', 'orden_compra_servicio', 'observaciones',
                'placa_vehiculo', 'cliente_email',
                'documento_modifica_tipo', 'documento_modifica_serie', 'documento_modifica_numero',
                'tipo_nota_credito', 'tipo_nota_debito',
                'venta_credito_cuotas', 'guias_relacionadas',
            ]);
        });
    }
};
