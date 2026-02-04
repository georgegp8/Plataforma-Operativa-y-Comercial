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
            // Campos adicionales para mostrar en el panel tipo NubeFact
            $table->decimal('mto_base_imp', 10, 2)->nullable()->after('mto_imp_venta')
                ->comment('Monto total gravado (operaciones onerosas)');

            $table->boolean('pagado')->default(false)->after('mto_base_imp')
                ->comment('Indica si el comprobante está pagado');

            $table->boolean('enviado_cliente')->default(false)->after('pagado')
                ->comment('Indica si se envió por email al cliente');

            $table->timestamp('enviado_cliente_at')->nullable()->after('enviado_cliente')
                ->comment('Fecha de envío al cliente');

            // Índices para filtros
            $table->index('pagado', 'idx_pagado');
            $table->index('enviado_cliente', 'idx_enviado_cliente');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('comprobantes', function (Blueprint $table) {
            $table->dropIndex('idx_pagado');
            $table->dropIndex('idx_enviado_cliente');

            $table->dropColumn([
                'mto_base_imp',
                'pagado',
                'enviado_cliente',
                'enviado_cliente_at',
            ]);
        });
    }
};
