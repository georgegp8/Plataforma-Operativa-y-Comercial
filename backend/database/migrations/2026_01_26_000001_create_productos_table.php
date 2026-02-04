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
        Schema::create('productos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');

            // Código y descripción
            $table->string('codigo', 50)->nullable(); // Código interno
            $table->text('descripcion'); // Nombre del producto o servicio
            $table->string('categoria', 100)->nullable(); // Categoría del producto

            // Unidad de medida SUNAT (Catálogo 03)
            $table->string('unidad_medida', 10)->default('NIU'); // NIU, ZZ, KGM, etc.

            // Código producto SUNAT (Catálogo 25)
            $table->string('codigo_producto_sunat', 20)->nullable();

            // Moneda
            $table->string('moneda', 3)->default('PEN'); // PEN, USD, EUR

            // Precios de VENTA (sin IGV y con IGV)
            $table->decimal('valor_venta_unitario', 12, 6)->nullable(); // Precio sin IGV
            $table->decimal('precio_venta_unitario', 12, 6)->nullable(); // Precio con IGV

            // Precios de COMPRA (sin IGV y con IGV)
            $table->decimal('costo_compra_unitario', 12, 6)->nullable(); // Costo sin IGV
            $table->decimal('precio_compra_unitario', 12, 6)->nullable(); // Costo con IGV

            // Tipo de afectación IGV (Catálogo 07)
            $table->string('tipo_afectacion_igv', 2)->default('10'); // 10=Gravado, 20=Exonerado, 30=Inafecto

            // Control
            $table->boolean('destacado')->default(false); // Producto destacado para acceso rápido
            $table->boolean('activo')->default(true);

            // Stock (opcional)
            $table->decimal('stock_actual', 12, 3)->default(0);
            $table->decimal('stock_minimo', 12, 3)->nullable();
            $table->decimal('stock_maximo', 12, 3)->nullable();

            $table->timestamps();

            // Índices
            $table->index('empresa_id');
            $table->index('codigo');
            $table->index('destacado');
            $table->index('activo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('productos');
    }
};
