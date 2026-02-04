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
        Schema::create('documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('oportunidad_id')->constrained('oportunidades')->onDelete('cascade');
            $table->foreignId('usuario_id')->constrained('users')->onDelete('restrict');

            $table->string('tipo'); // TDR, OC, SIAF, Contrato, Conformidad, Entregable, Pago, Otros
            $table->string('nombre_archivo');
            $table->string('storage_path');
            $table->string('mime_type')->nullable();
            $table->bigInteger('size')->nullable(); // bytes

            // Metadata
            $table->json('metadata')->nullable();
            $table->text('descripcion')->nullable();
            $table->integer('version')->default(1);

            // Control de versiones básico
            $table->foreignId('documento_padre_id')->nullable()->constrained('documentos')->onDelete('set null');

            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->index('oportunidad_id');
            $table->index('tipo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documentos');
    }
};
