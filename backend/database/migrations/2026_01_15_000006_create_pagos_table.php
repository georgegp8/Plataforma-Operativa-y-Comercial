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
        Schema::create('pagos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('oportunidad_id')->nullable()->constrained('oportunidades')->onDelete('set null');
            $table->foreignId('comprobante_id')->nullable()->constrained('comprobantes')->onDelete('set null');
            $table->foreignId('usuario_id')->constrained('users')->onDelete('restrict');

            $table->date('fecha_pago');
            $table->decimal('monto', 12, 2);
            $table->string('moneda', 3)->default('PEN');

            // Medio de pago
            $table->string('medio_pago'); // Transferencia, Efectivo, Cheque, Tarjeta, Otros
            $table->string('nro_operacion')->nullable();
            $table->string('banco')->nullable();

            // Comprobante del pago
            $table->string('comprobante_path')->nullable();

            // Estado
            $table->string('estado')->default('registrado'); // registrado, verificado, conciliado
            $table->text('observaciones')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->index('fecha_pago');
            $table->index('estado');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pagos');
    }
};
