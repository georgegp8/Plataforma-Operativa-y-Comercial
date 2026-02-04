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
        Schema::create('alertas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('oportunidad_id')->nullable()->constrained('oportunidades')->onDelete('cascade');
            $table->foreignId('usuario_id')->constrained('users')->onDelete('cascade');

            $table->string('tipo'); // sla_vencido, sla_proximo_vencer, documento_pendiente, pago_pendiente
            $table->string('prioridad')->default('media'); // baja, media, alta, critica
            $table->string('titulo');
            $table->text('mensaje');

            $table->boolean('leido')->default(false);
            $table->timestamp('leido_en')->nullable();

            $table->json('metadata')->nullable();

            $table->timestamps();

            // Índices
            $table->index(['usuario_id', 'leido']);
            $table->index('tipo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alertas');
    }
};
