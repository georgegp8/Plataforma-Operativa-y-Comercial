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
        Schema::create('empresas', function (Blueprint $table) {
            $table->id();
            $table->string('ruc', 11)->unique();
            $table->string('razon_social');
            $table->string('nombre_comercial')->nullable();

            // Dirección
            $table->string('ubigeo', 6);
            $table->string('departamento');
            $table->string('provincia');
            $table->string('distrito');
            $table->string('direccion');

            // Certificado digital
            $table->string('certificado_path')->nullable();

            // Credenciales SUNAT
            $table->string('sol_user')->nullable();
            $table->text('sol_password')->nullable(); // Encrypted
            $table->text('client_id')->nullable();
            $table->text('client_secret')->nullable();

            // Metadata
            $table->string('logo_path')->nullable();
            $table->boolean('activo')->default(true);
            $table->string('modo', 10)->default('beta'); // beta | prod

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('empresas');
    }
};
