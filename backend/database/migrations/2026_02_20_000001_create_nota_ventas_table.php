<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nota_ventas', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('empresa_id')->nullable();
            $table->string('serie', 10);
            $table->string('numero', 20);
            $table->date('fecha_emision');
            $table->string('moneda', 3)->default('PEN');

            // Cliente
            $table->string('cliente_tipo_doc', 2)->nullable();
            $table->string('cliente_num_doc', 20)->nullable();
            $table->string('cliente_razon_social', 255)->nullable();
            $table->string('cliente_email', 255)->nullable();
            $table->string('cliente_telefono', 50)->nullable();
            $table->text('cliente_direccion')->nullable();

            // Totales
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('igv', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);

            // Pago
            $table->string('metodo_pago', 50)->default('Contado');
            $table->boolean('pagado')->default(false);
            $table->date('fecha_vencimiento')->nullable();

            // Relaciones y notas
            $table->string('cpe_relacionado', 50)->nullable();
            $table->text('motivo')->nullable();
            $table->text('observaciones')->nullable();
            $table->string('actividad', 255)->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->foreign('empresa_id')->references('id')->on('empresas')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nota_ventas');
    }
};
