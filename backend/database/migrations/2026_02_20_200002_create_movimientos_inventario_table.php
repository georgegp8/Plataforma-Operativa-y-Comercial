<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimientos_inventario', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas');
            $table->timestamp('fecha');
            $table->string('codigo_producto', 100)->nullable();
            $table->string('nombre_producto', 255);
            $table->string('almacen', 100)->nullable();
            $table->foreignId('categoria_id')->nullable()->constrained('categorias');
            $table->decimal('cantidad', 12, 3);
            $table->enum('tipo', ['INGRESO', 'SALIDA', 'DEVOLUCION']);
            $table->string('ticket_id', 100)->nullable();
            $table->foreignId('usuario_id')->nullable()->constrained('users');
            $table->text('observaciones')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_inventario');
    }
};
