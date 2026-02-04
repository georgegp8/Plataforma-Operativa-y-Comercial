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
        Schema::create('sla_configuraciones', function (Blueprint $table) {
            $table->id();
            $table->string('tipo_oportunidad'); // Venta, Servicio, Proyecto
            $table->string('area'); // Comercial, Técnico, Administrativo
            $table->string('estado')->nullable(); // nuevo, en_proceso, etc.

            $table->integer('dias_sla');
            $table->integer('dias_alerta_amarilla')->default(3); // Días antes del vencimiento

            $table->boolean('activo')->default(true);
            $table->timestamps();

            // Índices
            $table->index(['tipo_oportunidad', 'area', 'estado']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sla_configuraciones');
    }
};
