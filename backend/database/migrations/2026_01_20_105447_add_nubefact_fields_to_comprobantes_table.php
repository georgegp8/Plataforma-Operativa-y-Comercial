<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agregar campos específicos de NubeFact al modelo Comprobante
     *
     * Basado en la respuesta de NubeFact según documentación oficial:
     * - nubefact_id: Identificador único de NubeFact (enlace)
     * - Flags de estado SUNAT
     * - Enlaces a archivos (PDF, XML, CDR)
     * - Datos para código QR y hash
     * - Campos opcionales de archivos en base64
     */
    public function up(): void
    {
        Schema::table('comprobantes', function (Blueprint $table) {
            // Identificación y estado en NubeFact
            $table->string('nubefact_enlace', 500)->nullable()->after('pdf_path')
                ->comment('Enlace único asignado por NubeFact para consultar el comprobante');

            $table->boolean('nubefact_aceptada_por_sunat')->default(false)->after('nubefact_enlace')
                ->comment('Flag: si SUNAT aceptó el comprobante');

            $table->string('nubefact_sunat_ticket', 100)->nullable()->after('nubefact_aceptada_por_sunat')
                ->comment('Ticket asignado por SUNAT (para comunicaciones de baja)');

            // Enlaces a archivos generados por NubeFact
            $table->string('nubefact_pdf_url', 500)->nullable()->after('nubefact_sunat_ticket')
                ->comment('URL del PDF generado por NubeFact');

            $table->string('nubefact_xml_url', 500)->nullable()->after('nubefact_pdf_url')
                ->comment('URL del XML generado por NubeFact');

            $table->string('nubefact_cdr_url', 500)->nullable()->after('nubefact_xml_url')
                ->comment('URL del CDR (Constancia de Recepción) de SUNAT');

            // Datos para representación impresa propia
            $table->text('nubefact_cadena_qr')->nullable()->after('nubefact_cdr_url')
                ->comment('Cadena para generar código QR (obligatorio desde 01/01/2019)');

            $table->string('nubefact_codigo_hash', 100)->nullable()->after('nubefact_cadena_qr')
                ->comment('Código hash del comprobante');

            $table->string('nubefact_codigo_barras', 500)->nullable()->after('nubefact_codigo_hash')
                ->comment('Código de barras en formato PDF417 (opcional)');

            // Archivos en base64 (opcional, se activa en config NubeFact)
            $table->longText('nubefact_pdf_base64')->nullable()->after('nubefact_codigo_barras')
                ->comment('Contenido del PDF en base64 (zip) - opcional');

            $table->longText('nubefact_xml_base64')->nullable()->after('nubefact_pdf_base64')
                ->comment('Contenido del XML en base64 (zip) - opcional');

            $table->longText('nubefact_cdr_base64')->nullable()->after('nubefact_xml_base64')
                ->comment('Contenido del CDR en base64 (zip) - opcional');

            // Datos adicionales de la respuesta NubeFact
            $table->text('nubefact_response_json')->nullable()->after('nubefact_cdr_base64')
                ->comment('Respuesta completa de NubeFact en JSON para auditoría');

            $table->timestamp('nubefact_enviado_at')->nullable()->after('nubefact_response_json')
                ->comment('Fecha y hora de envío a NubeFact');

            $table->timestamp('nubefact_consultado_at')->nullable()->after('nubefact_enviado_at')
                ->comment('Última consulta a NubeFact');

            // Flag de anulación
            $table->boolean('anulado')->default(false)->after('nubefact_consultado_at')
                ->comment('Flag: si el comprobante fue anulado (comunicación de baja)');

            $table->timestamp('anulado_at')->nullable()->after('anulado')
                ->comment('Fecha y hora de anulación');

            $table->string('motivo_anulacion', 250)->nullable()->after('anulado_at')
                ->comment('Motivo de anulación del comprobante');

            // Índices para búsquedas comunes
            $table->index('nubefact_aceptada_por_sunat', 'idx_nubefact_aceptada');
            $table->index('anulado', 'idx_anulado');
            $table->index(['empresa_id', 'nubefact_aceptada_por_sunat'], 'idx_empresa_aceptada');
        });
    }

    /**
     * Revertir la migración
     */
    public function down(): void
    {
        Schema::table('comprobantes', function (Blueprint $table) {
            $table->dropIndex('idx_nubefact_aceptada');
            $table->dropIndex('idx_anulado');
            $table->dropIndex('idx_empresa_aceptada');

            $table->dropColumn([
                'nubefact_enlace',
                'nubefact_aceptada_por_sunat',
                'nubefact_sunat_ticket',
                'nubefact_pdf_url',
                'nubefact_xml_url',
                'nubefact_cdr_url',
                'nubefact_cadena_qr',
                'nubefact_codigo_hash',
                'nubefact_codigo_barras',
                'nubefact_pdf_base64',
                'nubefact_xml_base64',
                'nubefact_cdr_base64',
                'nubefact_response_json',
                'nubefact_enviado_at',
                'nubefact_consultado_at',
                'anulado',
                'anulado_at',
                'motivo_anulacion',
            ]);
        });
    }
};
