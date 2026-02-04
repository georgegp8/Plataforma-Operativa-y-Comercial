<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tabla para Guías de Remisión Electrónica (GRE)
     * Según manual API NUBEFACT - GUIA DE REMISIÓN
     * Tipos: 7=GRE Remitente, 8=GRE Transportista
     */
    public function up(): void
    {
        Schema::create('guia_remisions', function (Blueprint $table) {
            $table->id();

            // Relaciones
            $table->foreignId('empresa_id')->constrained('empresas')->onDelete('cascade');
            $table->foreignId('oportunidad_id')->nullable()->constrained('oportunidades')->onDelete('set null');
            $table->foreignId('usuario_id')->nullable()->constrained('users')->onDelete('set null');

            // Identificación del documento
            $table->tinyInteger('tipo_comprobante')->comment('7=GRE Remitente, 8=GRE Transportista');
            $table->string('serie', 4)->comment('Serie: T001 (Remitente) o V001 (Transportista)');
            $table->integer('numero')->comment('Número correlativo');

            // Cliente/Destinatario
            $table->string('cliente_tipo_documento', 1);
            $table->string('cliente_numero_documento', 15);
            $table->string('cliente_denominacion', 100);
            $table->string('cliente_direccion', 100);
            $table->string('cliente_email', 250)->nullable();

            // Datos generales
            $table->date('fecha_emision');
            $table->date('fecha_inicio_traslado');
            $table->text('observaciones')->nullable();

            // Motivo y tipo (solo GRE Remitente)
            $table->string('motivo_traslado', 2)->nullable()->comment('01=Venta, 02=Compra, etc.');
            $table->string('motivo_traslado_otros', 70)->nullable();
            $table->string('tipo_transporte', 2)->nullable()->comment('01=Público, 02=Privado');

            // Pesos y bultos
            $table->decimal('peso_bruto_total', 12, 3);
            $table->string('peso_bruto_unidad', 3)->default('KGM');
            $table->integer('numero_bultos')->nullable();

            // Transportista (GRE Remitente con transporte público)
            $table->string('transportista_tipo_documento', 1)->nullable();
            $table->string('transportista_numero_documento', 11)->nullable();
            $table->string('transportista_denominacion', 100)->nullable();

            // Vehículo y conductor
            $table->string('vehiculo_placa', 8);
            $table->string('vehiculo_tuc', 15)->nullable()->comment('Tarjeta Única Circulación (solo Transportista)');
            $table->string('conductor_tipo_documento', 1)->nullable();
            $table->string('conductor_numero_documento', 15)->nullable();
            $table->string('conductor_nombre', 250)->nullable();
            $table->string('conductor_apellidos', 250)->nullable();
            $table->string('conductor_licencia', 10)->nullable();

            // Destinatario (solo GRE Transportista)
            $table->string('destinatario_tipo_documento', 1)->nullable();
            $table->string('destinatario_numero_documento', 15)->nullable();
            $table->string('destinatario_denominacion', 100)->nullable();

            // Puntos de partida y llegada
            $table->string('punto_partida_ubigeo', 6);
            $table->string('punto_partida_direccion', 150);
            $table->string('punto_partida_establecimiento', 4)->nullable();
            $table->string('punto_llegada_ubigeo', 6);
            $table->string('punto_llegada_direccion', 150);
            $table->string('punto_llegada_establecimiento', 4)->nullable();

            // Campos NubeFact (similar a comprobantes)
            $table->string('nubefact_enlace', 500)->nullable();
            $table->boolean('nubefact_aceptada_por_sunat')->default(false);
            $table->string('nubefact_pdf_url', 500)->nullable();
            $table->string('nubefact_xml_url', 500)->nullable();
            $table->string('nubefact_cdr_url', 500)->nullable();
            $table->text('nubefact_cadena_qr')->nullable();
            $table->text('nubefact_response_json')->nullable();
            $table->timestamp('nubefact_enviado_at')->nullable();
            $table->timestamp('nubefact_consultado_at')->nullable();

            $table->timestamps();

            // Índices
            $table->unique(['empresa_id', 'serie', 'numero'], 'idx_guia_unique');
            $table->index('nubefact_aceptada_por_sunat');
            $table->index('fecha_emision');
        });

        // Tabla para ítems de la guía
        Schema::create('guia_remision_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guia_remision_id')->constrained('guia_remisions')->onDelete('cascade');

            $table->integer('item')->comment('Número de línea');
            $table->string('unidad_medida', 5)->default('NIU');
            $table->string('codigo', 250)->nullable();
            $table->string('descripcion', 250);
            $table->decimal('cantidad', 12, 3);
            $table->string('codigo_dam', 23)->nullable()->comment('Para importación/exportación');

            $table->timestamps();

            $table->index('guia_remision_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guia_remision_items');
        Schema::dropIfExists('guia_remisions');
    }
};
