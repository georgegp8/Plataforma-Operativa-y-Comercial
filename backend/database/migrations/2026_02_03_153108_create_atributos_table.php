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
        Schema::create('atributos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 50)->nullable(); // Código del atributo
            $table->text('descripcion'); // Descripción del atributo
            $table->boolean('activo')->default(true);
            $table->string('created_by', 100)->nullable(); // Usuario que creó
            $table->timestamps();

            // Índices
            $table->index('activo');
            $table->index('codigo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('atributos');
    }
};
