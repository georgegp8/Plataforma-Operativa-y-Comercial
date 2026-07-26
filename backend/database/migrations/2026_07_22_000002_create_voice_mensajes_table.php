<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('voice_mensajes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversacion_id')->constrained('voice_conversaciones')->onDelete('cascade');
            $table->string('rol', 20)->default('user'); // user, assistant, system
            $table->string('tipo', 20)->default('text'); // text, audio
            $table->text('texto')->nullable();
            $table->string('audio_path')->nullable();
            $table->json('payload_intencion')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voice_mensajes');
    }
};
