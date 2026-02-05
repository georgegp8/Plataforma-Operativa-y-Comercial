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
        // Renombrar tabla para seguir convención Laravel (plural)
        Schema::rename('auditoria', 'auditorias');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::rename('auditorias', 'auditoria');
    }
};
