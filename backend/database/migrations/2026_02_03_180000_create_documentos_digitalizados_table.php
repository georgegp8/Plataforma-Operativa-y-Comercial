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
        Schema::create('documentos_digitalizados', function (Blueprint $table) {
            $table->id();

            // Información del archivo
            $table->string('nombre_archivo', 255);
            $table->string('ruta_archivo', 500);
            $table->string('tipo_archivo', 50); // pdf, jpg, png
            $table->bigInteger('tamano_archivo'); // bytes

            // Tipo de documento (compra o venta)
            $table->enum('tipo_operacion', ['compra', 'venta']);

            // Estado del procesamiento
            $table->enum('estado_procesamiento', ['pendiente', 'procesando', 'completado', 'error'])->default('pendiente');
            $table->text('error_mensaje')->nullable();

            // Datos extraídos del documento
            $table->json('datos_extraidos')->nullable(); // JSON con todos los datos del OCR

            // Información del comprobante extraída
            $table->string('tipo_comprobante', 50)->nullable(); // FACTURA, BOLETA, etc
            $table->string('serie', 20)->nullable();
            $table->string('numero', 20)->nullable();
            $table->string('comprobante_completo', 50)->nullable(); // F001-123
            $table->date('fecha_emision')->nullable();

            // Cliente/Proveedor extraído
            $table->string('entidad_tipo_doc', 10)->nullable(); // RUC, DNI
            $table->string('entidad_num_doc', 20)->nullable();
            $table->string('entidad_razon_social', 255)->nullable();
            $table->string('entidad_direccion', 500)->nullable();

            // Totales extraídos
            $table->string('moneda', 10)->nullable(); // PEN, USD
            $table->decimal('subtotal', 10, 2)->nullable();
            $table->decimal('igv', 10, 2)->nullable();
            $table->decimal('total', 10, 2)->nullable();

            // Items extraídos
            $table->json('items_extraidos')->nullable(); // Array de productos/servicios

            // Nivel de confianza del OCR
            $table->decimal('confianza_ocr', 5, 2)->nullable(); // 0-100%

            // Validación manual
            $table->boolean('requiere_validacion')->default(true);
            $table->boolean('validado')->default(false);
            $table->timestamp('fecha_validacion')->nullable();
            $table->string('validado_por', 100)->nullable();

            // Relación con compras o ventas (una vez confirmado)
            $table->bigInteger('compra_id')->nullable();
            $table->bigInteger('venta_id')->nullable();

            // Auditoría
            $table->boolean('activo')->default(true);
            $table->string('created_by', 100)->nullable();
            $table->timestamps();

            // Índices
            $table->index('tipo_operacion');
            $table->index('estado_procesamiento');
            $table->index('fecha_emision');
            $table->index('comprobante_completo');
            $table->index('entidad_num_doc');
            $table->index('activo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documentos_digitalizados');
    }
};
