<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voice_conversaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->foreignId('entidad_id')->nullable()->constrained('entidades')->onDelete('set null');
            $table->foreignId('comprobante_id')->nullable()->constrained('comprobantes')->onDelete('set null');
            
            $table->string('estado', 50)->default('iniciada'); // iniciada, procesando, esperando_confirmacion, confirmada, completada, cancelada, error
            $table->string('tipo_comprobante_sugerido', 10)->nullable(); // 01 (Factura), 03 (Boleta)
            
            $table->json('payload_intencion')->nullable();
            $table->integer('tiempo_transcripcion_ms')->nullable();
            $table->integer('tiempo_procesamiento_ms')->nullable();
            $table->text('error_mensaje')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voice_conversaciones');
    }
};
