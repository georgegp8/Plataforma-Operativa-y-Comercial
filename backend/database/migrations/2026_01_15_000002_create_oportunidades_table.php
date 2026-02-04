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
        Schema::create('oportunidades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('responsable_id')->nullable()->constrained('users')->onDelete('set null');

            $table->string('codigo')->unique(); // Auto-generated: OPO-2026-0001
            $table->string('titulo');
            $table->text('descripcion')->nullable();

            // Clasificación
            $table->string('area'); // Comercial, Técnico, Administrativo
            $table->string('tipo_operacion'); // Venta, Servicio, Proyecto

            // Estado y seguimiento
            $table->string('estado')->default('nuevo'); // nuevo, en_proceso, enviado, observado, ganado, perdido
            $table->decimal('monto_estimado', 12, 2)->nullable();
            $table->string('moneda', 3)->default('PEN');
            $table->integer('probabilidad')->default(0); // 0-100%

            // Fechas
            $table->date('fecha_inicio');
            $table->date('fecha_vencimiento')->nullable();
            $table->date('fecha_cierre')->nullable();

            // SLA
            $table->integer('sla_dias')->nullable();
            $table->dateTime('sla_fecha_limite')->nullable();
            $table->string('sla_estado')->nullable(); // en_plazo, proximo_vencer, vencido

            // Metadata
            $table->json('metadata')->nullable();
            $table->text('notas')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->index('estado');
            $table->index('fecha_vencimiento');
            $table->index('sla_estado');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('oportunidades');
    }
};
