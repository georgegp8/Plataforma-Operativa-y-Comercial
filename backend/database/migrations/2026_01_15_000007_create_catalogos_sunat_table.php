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
        Schema::create('catalogos_sunat', function (Blueprint $table) {
            $table->id();
            $table->string('catalogo', 10); // 01, 02, 03, 05, 06, 07, etc.
            $table->string('codigo', 10);
            $table->string('descripcion');
            $table->text('descripcion_larga')->nullable();
            $table->boolean('activo')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();

            // Índices
            $table->unique(['catalogo', 'codigo']);
            $table->index('activo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalogos_sunat');
    }
};
