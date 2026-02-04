<?php

namespace App\Services;

use App\Models\Comprobante;
use App\Models\GuiaRemision;
use Carbon\Carbon;

/**
 * Mapper para convertir modelos internos a estructura JSON de NubeFact
 * Basado en documentación oficial NUBEFACT DOC API JSON V1
 */
class NubefactMapper
{
    /**
     * Convertir Comprobante interno a JSON de NubeFact para emisión
     *
     * @param  Comprobante  $comprobante  Con items cargados
     * @return array Estructura JSON lista para NubeFact
     */
    public static function comprobanteToNubefact(Comprobante $comprobante): array
    {
        $empresa = $comprobante->empresa;

        $data = [
            'operacion' => 'generar_comprobante',
            'tipo_de_comprobante' => (string) self::mapTipoComprobante($comprobante->tipo_doc),
            'serie' => $comprobante->serie,
            'numero' => (string) $comprobante->correlativo,
            'sunat_transaction' => 1, // Por defecto venta interna

            // Cliente
            'cliente_tipo_de_documento' => (int) $comprobante->cliente_tipo_doc,
            'cliente_numero_de_documento' => $comprobante->cliente_num_doc,
            'cliente_denominacion' => $comprobante->cliente_razon_social,
            'cliente_direccion' => $comprobante->cliente_direccion ?? '-',
            'cliente_email' => $comprobante->cliente_email ?? '',
            'cliente_email_1' => '',
            'cliente_email_2' => '',

            // Fechas
            'fecha_de_emision' => $comprobante->fecha_emision->format('d-m-Y'),
            'fecha_de_vencimiento' => $comprobante->fecha_vencimiento?->format('d-m-Y') ?? '',

            // Moneda e IGV
            'moneda' => (string) self::mapMoneda($comprobante->codigo_tipo_moneda ?? 'PEN'),
            'tipo_de_cambio' => $comprobante->tipo_de_cambio ?? '',
            'porcentaje_de_igv' => '18.00',

            // Totales
            'descuento_global' => '',
            'total_descuento' => '',
            'total_anticipo' => '',
            'total_gravada' => number_format($comprobante->mto_oper_gravadas ?? 0, 2, '.', ''),
            'total_inafecta' => number_format($comprobante->mto_oper_inafectas ?? 0, 2, '.', ''),
            'total_exonerada' => number_format($comprobante->mto_oper_exoneradas ?? 0, 2, '.', ''),
            'total_igv' => number_format($comprobante->mto_igv ?? 0, 2, '.', ''),
            'total_gratuita' => number_format($comprobante->mto_oper_gratuitas ?? 0, 2, '.', ''),
            'total_otros_cargos' => '',
            'total' => number_format($comprobante->mto_imp_venta, 2, '.', ''),

            // Percepción/Retención
            'percepcion_tipo' => '',
            'percepcion_base_imponible' => '',
            'total_percepcion' => '',
            'total_incluido_percepcion' => '',
            'retencion_tipo' => '',
            'retencion_base_imponible' => '',
            'total_retencion' => '',
            'total_impuestos_bolsas' => '',

            // Detracción
            'detraccion' => $comprobante->tiene_detraccion ? 'true' : 'false',

            // Observaciones
            'observaciones' => $comprobante->observaciones ?? '',

            // Nota de crédito/débito
            'documento_que_se_modifica_tipo' => $comprobante->tipo_doc_relacionado ?? '',
            'documento_que_se_modifica_serie' => $comprobante->serie_relacionado ?? '',
            'documento_que_se_modifica_numero' => $comprobante->correlativo_relacionado ?? '',
            'tipo_de_nota_de_credito' => '',
            'tipo_de_nota_de_debito' => '',

            // Configuración de envío
            'enviar_automaticamente_a_la_sunat' => config('nubefact.enviar_automaticamente_sunat', true) ? 'true' : 'false',
            'enviar_automaticamente_al_cliente' => config('nubefact.enviar_automaticamente_cliente', false) ? 'true' : 'false',

            // Opcionales
            'codigo_unico' => '',
            'condiciones_de_pago' => $comprobante->forma_pago ?? '',
            'medio_de_pago' => '',
            'placa_vehiculo' => '',
            'orden_compra_servicio' => '',
            'tabla_personalizada_codigo' => '',
            'formato_de_pdf' => config('nubefact.formato_pdf', 'A4'),
            'generado_por_contingencia' => '',
            'bienes_region_selva' => '',
            'servicios_region_selva' => '',

            // Items
            'items' => self::itemsToNubefact($comprobante->items),

            // Guías relacionadas
            'guias' => [],

            // Venta al crédito
            'venta_al_credito' => self::cuotasToNubefact($comprobante->cuotas),
        ];

        return $data;
    }

    /**
     * Convertir items de comprobante a formato NubeFact
     */
    protected static function itemsToNubefact($items): array
    {
        $result = [];

        foreach ($items as $item) {
            $result[] = [
                'unidad_de_medida' => $item->unidad ?? 'NIU',
                'codigo' => $item->codigo_producto ?? '',
                'codigo_producto_sunat' => $item->codigo_producto_sunat ?? '',
                'descripcion' => $item->descripcion,
                'cantidad' => number_format($item->cantidad, 2, '.', ''),
                'valor_unitario' => number_format($item->mto_valor_unitario, 10, '.', ''),
                'precio_unitario' => number_format($item->mto_precio_unitario, 10, '.', ''),
                'descuento' => number_format($item->descuento ?? 0, 2, '.', ''),
                'subtotal' => number_format($item->mto_valor_venta, 2, '.', ''),
                'tipo_de_igv' => (int) ($item->tip_afe_igv ?? 10),
                'igv' => number_format($item->igv, 2, '.', ''),
                'total' => number_format($item->mto_valor_venta + $item->igv, 2, '.', ''),
                'anticipo_regularizacion' => 'false',
                'anticipo_documento_serie' => '',
                'anticipo_documento_numero' => '',
            ];
        }

        return $result;
    }

    /**
     * Convertir cuotas a formato venta_al_credito de NubeFact
     */
    protected static function cuotasToNubefact($cuotas): array
    {
        if (empty($cuotas) || ! is_array($cuotas)) {
            return [];
        }

        $result = [];
        foreach ($cuotas as $index => $cuota) {
            $result[] = [
                'cuota' => $index + 1,
                'fecha_de_pago' => Carbon::parse($cuota['fecha'])->format('d-m-Y'),
                'importe' => number_format($cuota['monto'], 2, '.', ''),
            ];
        }

        return $result;
    }

    /**
     * Mapear tipo de documento interno a código NubeFact
     */
    protected static function mapTipoComprobante(string $tipo): int
    {
        $map = [
            '01' => 1, // Factura
            '03' => 2, // Boleta
            '07' => 3, // Nota de Crédito
            '08' => 4, // Nota de Débito
        ];

        return $map[$tipo] ?? 1;
    }

    /**
     * Mapear código de moneda
     */
    protected static function mapMoneda(string $moneda): int
    {
        $map = [
            'PEN' => 1,
            'USD' => 2,
            'EUR' => 3,
        ];

        return $map[$moneda] ?? 1;
    }

    /**
     * Actualizar modelo Comprobante con respuesta de NubeFact
     */
    public static function updateComprobanteFromNubefact(Comprobante $comprobante, array $response): void
    {
        $comprobante->update([
            'nubefact_enlace' => $response['enlace'] ?? null,
            'nubefact_aceptada_por_sunat' => $response['aceptada_por_sunat'] ?? false,
            'nubefact_sunat_ticket' => $response['sunat_ticket_numero'] ?? null,
            'nubefact_pdf_url' => $response['enlace_del_pdf'] ?? null,
            'nubefact_xml_url' => $response['enlace_del_xml'] ?? null,
            'nubefact_cdr_url' => $response['enlace_del_cdr'] ?? null,
            'nubefact_cadena_qr' => $response['cadena_para_codigo_qr'] ?? null,
            'nubefact_codigo_hash' => $response['codigo_hash'] ?? null,
            'nubefact_codigo_barras' => $response['codigo_de_barras'] ?? null,
            'nubefact_pdf_base64' => $response['pdf_zip_base64'] ?? null,
            'nubefact_xml_base64' => $response['xml_zip_base64'] ?? null,
            'nubefact_cdr_base64' => $response['cdr_zip_base64'] ?? null,
            'nubefact_response_json' => json_encode($response),
            'nubefact_enviado_at' => now(),
            'estado_sunat' => $response['aceptada_por_sunat'] ? 'aceptado' : 'rechazado',
            'codigo_sunat' => $response['sunat_responsecode'] ?? null,
            'mensaje_sunat' => $response['sunat_description'] ?? null,
        ]);
    }

    /**
     * Convertir GuiaRemision a JSON de NubeFact
     */
    public static function guiaToNubefact(GuiaRemision $guia): array
    {
        $data = [
            'operacion' => 'generar_guia',
            'tipo_de_comprobante' => (int) $guia->tipo_comprobante, // 7 o 8
            'serie' => $guia->serie,
            'numero' => (string) $guia->numero,

            // Cliente/Destinatario
            'cliente_tipo_de_documento' => (int) $guia->cliente_tipo_documento,
            'cliente_numero_de_documento' => $guia->cliente_numero_documento,
            'cliente_denominacion' => $guia->cliente_denominacion,
            'cliente_direccion' => $guia->cliente_direccion,
            'cliente_email' => $guia->cliente_email ?? '',
            'cliente_email_1' => '',
            'cliente_email_2' => '',

            // Fechas
            'fecha_de_emision' => $guia->fecha_emision->format('d-m-Y'),
            'fecha_de_inicio_de_traslado' => $guia->fecha_inicio_traslado->format('d-m-Y'),

            // Observaciones
            'observaciones' => $guia->observaciones ?? '',

            // Pesos
            'peso_bruto_total' => number_format($guia->peso_bruto_total, 2, '.', ''),
            'peso_bruto_unidad_de_medida' => $guia->peso_bruto_unidad,

            // Puntos de traslado
            'punto_de_partida_ubigeo' => $guia->punto_partida_ubigeo,
            'punto_de_partida_direccion' => $guia->punto_partida_direccion,
            'punto_de_partida_codigo_establecimiento_sunat' => $guia->punto_partida_establecimiento ?? '0000',
            'punto_de_llegada_ubigeo' => $guia->punto_llegada_ubigeo,
            'punto_de_llegada_direccion' => $guia->punto_llegada_direccion,
            'punto_de_llegada_codigo_establecimiento_sunat' => $guia->punto_llegada_establecimiento ?? '0000',

            // Vehículo
            'transportista_placa_numero' => $guia->vehiculo_placa,

            // Conductor
            'conductor_documento_tipo' => $guia->conductor_tipo_documento,
            'conductor_documento_numero' => $guia->conductor_numero_documento,
            'conductor_nombre' => $guia->conductor_nombre ?? '',
            'conductor_apellidos' => $guia->conductor_apellidos ?? '',
            'conductor_numero_licencia' => $guia->conductor_licencia ?? '',

            // Config
            'enviar_automaticamente_al_cliente' => config('nubefact.enviar_automaticamente_cliente', false) ? 'true' : 'false',
            'formato_de_pdf' => config('nubefact.formato_pdf', 'A4'),

            // Items
            'items' => self::itemsGuiaToNubefact($guia->items),
        ];

        // Campos específicos GRE Remitente
        if ($guia->tipo_comprobante == 7) {
            $data['motivo_de_traslado'] = $guia->motivo_traslado;
            $data['numero_de_bultos'] = (string) $guia->numero_bultos;
            $data['tipo_de_transporte'] = $guia->tipo_transporte;

            if ($guia->tipo_transporte == '01') {
                $data['transportista_documento_tipo'] = (string) $guia->transportista_tipo_documento;
                $data['transportista_documento_numero'] = $guia->transportista_numero_documento;
                $data['transportista_denominacion'] = $guia->transportista_denominacion;
            }
        }

        // Campos específicos GRE Transportista
        if ($guia->tipo_comprobante == 8) {
            $data['tuc_vehiculo_principal'] = $guia->vehiculo_tuc ?? '';
            $data['destinatario_documento_tipo'] = (string) $guia->destinatario_tipo_documento;
            $data['destinatario_documento_numero'] = $guia->destinatario_numero_documento;
            $data['destinatario_denominacion'] = $guia->destinatario_denominacion;
        }

        return $data;
    }

    /**
     * Convertir items de guía a formato NubeFact
     */
    protected static function itemsGuiaToNubefact($items): array
    {
        $result = [];

        foreach ($items as $item) {
            $result[] = [
                'unidad_de_medida' => $item->unidad_medida,
                'codigo' => $item->codigo ?? '',
                'descripcion' => $item->descripcion,
                'cantidad' => number_format($item->cantidad, 3, '.', ''),
            ];
        }

        return $result;
    }

    /**
     * Actualizar GuiaRemision con respuesta de NubeFact
     */
    public static function updateGuiaFromNubefact(GuiaRemision $guia, array $response): void
    {
        $guia->update([
            'nubefact_enlace' => $response['enlace'] ?? null,
            'nubefact_aceptada_por_sunat' => $response['aceptada_por_sunat'] ?? false,
            'nubefact_pdf_url' => $response['enlace_del_pdf'] ?? null,
            'nubefact_xml_url' => $response['enlace_del_xml'] ?? null,
            'nubefact_cdr_url' => $response['enlace_del_cdr'] ?? null,
            'nubefact_cadena_qr' => $response['cadena_para_codigo_qr'] ?? null,
            'nubefact_response_json' => json_encode($response),
            'nubefact_enviado_at' => now(),
        ]);
    }
}
