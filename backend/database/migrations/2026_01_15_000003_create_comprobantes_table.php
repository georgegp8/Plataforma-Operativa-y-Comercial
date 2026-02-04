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
        Schema::create('comprobantes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('oportunidad_id')->nullable()->constrained('oportunidades')->onDelete('set null');
            $table->foreignId('usuario_id')->nullable()->constrained('users')->onDelete('set null');

            // Tipo de comprobante
            $table->string('tipo_doc', 2); // 01: Factura, 03: Boleta, 07: NC, 08: ND
            $table->string('serie', 4);
            $table->string('correlativo', 8);
            $table->string('numero_completo', 15)->nullable()->storedAs("serie || '-' || correlativo");

            // Cliente
            $table->string('cliente_tipo_doc', 1); // 6: RUC, 1: DNI, 0: Otros
            $table->string('cliente_num_doc', 15);
            $table->string('cliente_razon_social');
            $table->string('cliente_direccion')->nullable();
            $table->string('cliente_email')->nullable();

            // Montos
            $table->string('moneda', 3)->default('PEN');
            $table->decimal('mto_oper_gravadas', 12, 2)->default(0);
            $table->decimal('mto_oper_exoneradas', 12, 2)->default(0);
            $table->decimal('mto_oper_inafectas', 12, 2)->default(0);
            $table->decimal('mto_oper_exportacion', 12, 2)->default(0);
            $table->decimal('mto_oper_gratuitas', 12, 2)->default(0);
            $table->decimal('mto_igv', 12, 2)->default(0);
            $table->decimal('mto_isc', 12, 2)->default(0);
            $table->decimal('total_impuestos', 12, 2)->default(0);
            $table->decimal('valor_venta', 12, 2)->default(0);
            $table->decimal('sub_total', 12, 2)->default(0);
            $table->decimal('redondeo', 12, 2)->default(0);
            $table->decimal('mto_imp_venta', 12, 2)->default(0);

            // Detracción/Percepción/Retención
            $table->boolean('tiene_detraccion')->default(false);
            $table->decimal('detraccion_monto', 12, 2)->nullable();
            $table->decimal('detraccion_porcentaje', 5, 2)->nullable();

            // Fechas
            $table->dateTime('fecha_emision');
            $table->date('fecha_vencimiento')->nullable();

            // SUNAT
            $table->string('estado_sunat')->default('pendiente'); // pendiente, aceptado, rechazado, baja
            $table->string('codigo_sunat')->nullable();
            $table->text('mensaje_sunat')->nullable();
            $table->string('hash_cpe')->nullable();

            // Almacenamiento
            $table->string('xml_path')->nullable();
            $table->string('cdr_path')->nullable();
            $table->string('pdf_path')->nullable();

            // Request/Response completo
            $table->json('raw_request')->nullable();
            $table->json('raw_response')->nullable();

            // Documentos relacionados (para NC/ND)
            $table->string('tipo_doc_relacionado', 2)->nullable();
            $table->string('serie_relacionado', 4)->nullable();
            $table->string('correlativo_relacionado', 8)->nullable();
            $table->string('motivo')->nullable();

            // Forma de pago
            $table->string('forma_pago', 20)->default('Contado'); // Contado, Credito
            $table->json('cuotas')->nullable();

            // Metadata
            $table->json('metadata')->nullable();
            $table->text('observaciones')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Índices
            $table->unique(['empresa_id', 'tipo_doc', 'serie', 'correlativo']);
            $table->index('estado_sunat');
            $table->index('fecha_emision');
            $table->index('cliente_num_doc');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comprobantes');
    }
};
