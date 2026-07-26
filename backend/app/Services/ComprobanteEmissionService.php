<?php

namespace App\Services;

use App\Models\Comprobante;
use App\Models\ComprobanteItem;
use App\Models\Producto;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Servicio centralizado para la emisión de comprobantes de pago (Facturas, Boletas, NC, ND).
 * Reutilizado tanto por la web tradicional (NubefactController) como por la Voice IA.
 */
class ComprobanteEmissionService
{
    protected NubefactClient $nubefactClient;

    public function __construct(NubefactClient $nubefactClient)
    {
        $this->nubefactClient = $nubefactClient;
    }

    /**
     * Procesar la emisión de un comprobante.
     *
     * @param array $data Datos estructurados del comprobante
     * @param int|null $comprobanteId Si ya existe en BD
     * @param int|null $usuarioId Usuario que emite
     * @return array Resultado de la emisión
     * @throws Exception
     */
    public function emitir(array $data, ?int $comprobanteId = null, ?int $usuarioId = null): array
    {
        DB::beginTransaction();

        try {
            if ($comprobanteId) {
                $comprobante = Comprobante::with(['items', 'empresa', 'cuotas'])
                    ->findOrFail($comprobanteId);

                if ($comprobante->nubefact_enlace) {
                    DB::rollBack();
                    throw new Exception('Este comprobante ya fue emitido previamente mediante NubeFact.');
                }
            } else {
                $tipoDocMap = [
                    1 => '01', // Factura
                    2 => '03', // Boleta
                    3 => '07', // Nota de Crédito
                    4 => '08', // Nota de Débito
                    '01' => '01',
                    '03' => '03',
                    '07' => '07',
                    '08' => '08',
                ];

                $tipoComprobante = $data['tipo_de_comprobante'] ?? 1;
                $tipoDoc = $tipoDocMap[$tipoComprobante] ?? '01';

                $comprobante = new Comprobante();
                $comprobante->empresa_id = $data['empresa_id'] ?? 1;
                $comprobante->usuario_id = $usuarioId ?? auth()->id() ?? 1;
                $comprobante->tipo_doc = $tipoDoc;
                $comprobante->serie = $data['serie'];
                $comprobante->correlativo = $data['numero'];
                $comprobante->fecha_emision = $data['fecha_de_emision'] ?? now()->format('Y-m-d');
                $comprobante->fecha_vencimiento = $data['fecha_de_vencimiento'] ?? $data['fecha_de_emision'] ?? now()->format('Y-m-d');
                $comprobante->hora_emision = now()->format('H:i:s');
                $comprobante->codigo_tipo_operacion = $data['sunat_transaction'] ?? '0101';

                // Cliente
                $comprobante->cliente_tipo_doc = (string) ($data['cliente_tipo_de_documento'] ?? '1');
                $comprobante->cliente_num_doc = $data['cliente_numero_de_documento'] ?? '';
                $comprobante->cliente_razon_social = $data['cliente_denominacion'] ?? '';
                $comprobante->cliente_direccion = $data['cliente_direccion'] ?? null;
                $comprobante->cliente_email = $data['cliente_email'] ?? null;

                // Moneda y totales
                $monedaVal = $data['moneda'] ?? 1;
                $comprobante->codigo_tipo_moneda = ($monedaVal == 1 || $monedaVal === 'PEN') ? 'PEN' : 'USD';
                $comprobante->tipo_de_cambio = $data['tipo_de_cambio'] ?? null;

                $comprobante->mto_igv = $data['total_igv'] ?? 0;
                $comprobante->mto_oper_gravadas = $data['total_gravada'] ?? 0;
                $comprobante->mto_oper_inafectas = $data['total_inafecta'] ?? 0;
                $comprobante->mto_oper_exoneradas = $data['total_exonerada'] ?? 0;
                $comprobante->mto_oper_gratuitas = $data['total_gratuita'] ?? 0;
                $comprobante->mto_imp_venta = $data['total'] ?? 0;
                $comprobante->total_descuentos = $data['total_descuento'] ?? 0;
                $comprobante->mto_otros_cargos = $data['total_otros_cargos'] ?? 0;

                $comprobante->observaciones = $data['observaciones'] ?? null;
                $comprobante->orden_compra = $data['orden_compra_servicio'] ?? null;
                $comprobante->forma_pago = $data['forma_pago'] ?? 'Contado';

                // Detracción
                if (!empty($data['tiene_detraccion'])) {
                    $comprobante->tiene_detraccion = true;
                    $comprobante->detraccion_tipo = $data['detraccion_tipo'] ?? null;
                    $comprobante->detraccion_porcentaje = $data['detraccion_porcentaje'] ?? null;
                    $comprobante->detraccion_monto = $data['detraccion_monto'] ?? ($data['total'] * (($data['detraccion_porcentaje'] ?? 0) / 100));
                    $comprobante->medio_pago_detraccion = $data['medio_pago_detraccion'] ?? null;
                } else {
                    $comprobante->tiene_detraccion = false;
                }

                $comprobante->estado = 'PENDIENTE';
                $comprobante->estado_sunat = 'PENDIENTE';
                $comprobante->save();

                // Items
                $items = $data['items'] ?? [];
                foreach ($items as $index => $itemData) {
                    $item = new ComprobanteItem();
                    $item->comprobante_id = $comprobante->id;
                    $item->item = $index + 1;
                    $item->codigo_producto = $itemData['codigo'] ?? '';
                    $item->descripcion = $itemData['descripcion'] ?? 'Producto / Servicio';
                    $item->unidad = $itemData['unidad_de_medida'] ?? 'NIU';
                    $item->cantidad = $itemData['cantidad'] ?? 1;
                    $item->mto_valor_unitario = $itemData['valor_unitario'] ?? 0;
                    $item->mto_precio_unitario = $itemData['precio_unitario'] ?? 0;
                    $item->tip_afe_igv = $itemData['tipo_de_igv'] ?? 1;
                    $item->igv = $itemData['igv'] ?? 0;
                    $item->mto_valor_venta = $itemData['subtotal'] ?? 0;
                    $item->total_impuestos = $itemData['igv'] ?? 0;
                    $item->descuento = $itemData['descuento'] ?? 0;
                    $item->save();

                    // Descuento de Stock
                    if (!empty($itemData['codigo'])) {
                        $producto = Producto::where('empresa_id', $comprobante->empresa_id)
                            ->where('codigo', $itemData['codigo'])
                            ->first();

                        if ($producto) {
                            $producto->stock_actual = max(0, $producto->stock_actual - $itemData['cantidad']);
                            $producto->save();
                            Log::info("Stock actualizado para producto {$producto->codigo}: {$producto->stock_actual}");
                        }
                    }
                }

                $comprobante->load(['items', 'empresa']);
            }

            // Mapeo y emisión a NubeFact
            $nubefactData = NubefactMapper::comprobanteToNubefact($comprobante);
            $response = $this->nubefactClient->generarComprobante($nubefactData);

            NubefactMapper::updateComprobanteFromNubefact($comprobante, $response);

            // Email automático
            $aceptadoPorSunat = $response['aceptada_por_sunat'] ?? false;
            if ($aceptadoPorSunat && !empty($comprobante->cliente_email)) {
                try {
                    Mail::to($comprobante->cliente_email)->send(new \App\Mail\ComprobanteEmitido($comprobante));
                } catch (Exception $e) {
                    Log::error("Error al enviar email automático: " . $e->getMessage());
                }
            }

            DB::commit();

            return [
                'comprobante_id' => $comprobante->id,
                'serie' => $comprobante->serie,
                'numero' => $comprobante->correlativo,
                'numero_completo' => "{$comprobante->serie}-{$comprobante->correlativo}",
                'cliente' => $comprobante->cliente_razon_social,
                'total' => (float) $comprobante->mto_imp_venta,
                'enlace' => $response['enlace'] ?? null,
                'aceptada_por_sunat' => $aceptadoPorSunat,
                'pdf_url' => $response['enlace_del_pdf'] ?? null,
                'xml_url' => $response['enlace_del_xml'] ?? null,
                'cdr_url' => $response['enlace_del_cdr'] ?? null,
                'cadena_qr' => $response['cadena_para_codigo_qr'] ?? null,
                'sunat_code' => $response['sunat_responsecode'] ?? null,
                'sunat_description' => $response['sunat_description'] ?? null,
            ];

        } catch (Exception $e) {
            DB::rollBack();
            Log::channel('nubefact')->error('Error en ComprobanteEmissionService', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}
