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
        Schema::create('comprobante_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('comprobante_id')->constrained('comprobantes')->onDelete('cascade');

            $table->integer('item')->default(1);
            $table->string('codigo_producto', 50)->nullable();
            $table->string('descripcion');

            // Unidad y cantidad
            $table->string('unidad', 10)->default('NIU'); // Catálogo 03
            $table->decimal('cantidad', 12, 3);

            // Precios y valores
            $table->decimal('mto_valor_unitario', 12, 6);
            $table->decimal('mto_precio_unitario', 12, 6);
            $table->decimal('mto_valor_venta', 12, 2);

            // IGV
            $table->decimal('mto_base_igv', 12, 2)->default(0);
            $table->decimal('porcentaje_igv', 5, 2)->default(18.00);
            $table->decimal('igv', 12, 2)->default(0);
            $table->string('tip_afe_igv', 2)->default('10'); // 10: Gravado, 20: Exonerado, 30: Inafecto

            // ISC
            $table->decimal('isc', 12, 2)->default(0);
            $table->string('tip_sis_isc', 2)->nullable();

            // Otros impuestos
            $table->decimal('total_impuestos', 12, 2)->default(0);

            // Descuentos
            $table->decimal('descuento', 12, 2)->default(0);

            $table->timestamps();

            // Índices
            $table->index('comprobante_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comprobante_items');
    }
};
