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
        Schema::create('categorias', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 100); // Nombre de la categoría
            $table->string('identificador', 50)->nullable(); // Identificador/código
            $table->boolean('activo')->default(true);
            $table->string('created_by', 100)->nullable(); // Usuario que creó
            $table->timestamps();

            // Índices
            $table->index('activo');
            $table->index('nombre');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categorias');
    }
};
