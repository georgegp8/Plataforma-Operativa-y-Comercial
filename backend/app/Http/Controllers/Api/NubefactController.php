<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AnularComprobanteRequest;
use App\Http\Requests\EmitirComprobanteRequest;
use App\Http\Requests\EmitirGuiaRequest;
use App\Models\Comprobante;
use App\Models\GuiaRemision;
use App\Services\NubefactClient;
use App\Services\NubefactMapper;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NubefactController extends Controller
{
    protected $nubefactClient;

    public function __construct(NubefactClient $nubefactClient)
    {
        $this->nubefactClient = $nubefactClient;
    }

    /**
     * Emitir un comprobante (factura/boleta/nota) mediante NubeFact
     * POST /api/nubefact/comprobantes
     *
     * Acepta dos modos:
     * 1. Con comprobante_id: Emite un comprobante ya existente en BD
     * 2. Con datos completos: Crea el comprobante en BD y luego lo emite
     */
    public function emitirComprobante(EmitirComprobanteRequest $request)
    {
        DB::beginTransaction();

        try {
            // Modo 1: Comprobante existente
            if ($request->has('comprobante_id')) {
                $comprobante = Comprobante::with(['items', 'empresa', 'cuotas'])
                    ->findOrFail($request->comprobante_id);

                // Verificar si ya fue emitido
                if ($comprobante->nubefact_enlace) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => 'Este comprobante ya fue emitido mediante NubeFact',
                        'enlace' => $comprobante->nubefact_enlace,
                    ], 400);
                }
            }
            // Modo 2: Crear comprobante desde datos
            else {
                $validatedData = $request->validated();

                // Mapear tipo de comprobante NubeFact a SUNAT
                $tipoDocMap = [
                    1 => '01', // Factura
                    2 => '03', // Boleta
                    3 => '07', // Nota de Crédito
                    4 => '08', // Nota de Débito
                ];

                // Crear el comprobante en la BD
                $comprobante = new Comprobante;
                $comprobante->empresa_id = $request->empresa_id;
                // Asignar usuario_id (autenticado o 1 por defecto si no hay usuario)
                $comprobante->usuario_id = auth()->id() ?? 1;
                $comprobante->tipo_doc = $tipoDocMap[$request->tipo_de_comprobante];
                $comprobante->serie = $request->serie;
                $comprobante->correlativo = $request->numero;
                $comprobante->fecha_emision = $request->fecha_de_emision;
                $comprobante->fecha_vencimiento = $request->fecha_de_vencimiento ?? $request->fecha_de_emision;
                $comprobante->hora_emision = now()->format('H:i:s');
                $comprobante->codigo_tipo_operacion = $request->sunat_transaction ?? '0101';

                // Cliente
                $comprobante->cliente_tipo_doc = $request->cliente_tipo_de_documento ?? '1';
                $comprobante->cliente_num_doc = $request->cliente_numero_de_documento;
                $comprobante->cliente_razon_social = $request->cliente_denominacion;
                $comprobante->cliente_direccion = $request->cliente_direccion;
                $comprobante->cliente_email = $request->cliente_email;

                // Moneda y tipo de cambio
                $comprobante->codigo_tipo_moneda = $request->moneda == 1 ? 'PEN' : 'USD';
                $comprobante->tipo_de_cambio = $request->tipo_de_cambio;

                // Totales
                $comprobante->mto_igv = $request->total_igv ?? 0;
                $comprobante->mto_oper_gravadas = $request->total_gravada ?? 0;
                $comprobante->mto_oper_inafectas = $request->total_inafecta ?? 0;
                $comprobante->mto_oper_exoneradas = $request->total_exonerada ?? 0;
                $comprobante->mto_oper_gratuitas = $request->total_gratuita ?? 0;
                $comprobante->mto_imp_venta = $request->total;
                $comprobante->total_descuentos = $request->total_descuento ?? 0;
                $comprobante->mto_otros_cargos = $request->total_otros_cargos ?? 0;

                // Campos opcionales
                $comprobante->observaciones = $request->observaciones;
                $comprobante->orden_compra = $request->orden_compra_servicio;
                $comprobante->forma_pago = $request->forma_pago ?? 'Contado';

                // Detracción completa
                if ($request->has('tiene_detraccion') && $request->tiene_detraccion) {
                    $comprobante->tiene_detraccion = true;
                    $comprobante->detraccion_tipo = $request->detraccion_tipo;
                    $comprobante->detraccion_porcentaje = $request->detraccion_porcentaje;
                    // Si no viene monto, calcularlo automáticamente
                    $comprobante->detraccion_monto = $request->detraccion_monto
                        ?? ($request->total * ($request->detraccion_porcentaje / 100));
                    $comprobante->medio_pago_detraccion = $request->medio_pago_detraccion;
                } else {
                    $comprobante->tiene_detraccion = false;
                    $comprobante->detraccion_tipo = null;
                    $comprobante->detraccion_porcentaje = null;
                    $comprobante->detraccion_monto = null;
                    $comprobante->medio_pago_detraccion = null;
                }

                // Estados
                $comprobante->estado = 'PENDIENTE';
                $comprobante->estado_sunat = 'PENDIENTE';

                $comprobante->save();

                // Guardar items y descontar stock
                foreach ($request->items as $index => $itemData) {
                    $item = new \App\Models\ComprobanteItem;
                    $item->comprobante_id = $comprobante->id;
                    $item->item = $index + 1;
                    $item->codigo_producto = $itemData['codigo'] ?? '';
                    $item->descripcion = $itemData['descripcion'];
                    $item->unidad = $itemData['unidad_de_medida'] ?? 'NIU';
                    $item->cantidad = $itemData['cantidad'];
                    $item->mto_valor_unitario = $itemData['valor_unitario'] ?? 0;
                    $item->mto_precio_unitario = $itemData['precio_unitario'];
                    $item->tip_afe_igv = $itemData['tipo_de_igv'] ?? 1;
                    $item->igv = $itemData['igv'] ?? 0;
                    $item->mto_valor_venta = $itemData['subtotal'] ?? 0;
                    $item->total_impuestos = $itemData['igv'] ?? 0;
                    $item->descuento = $itemData['descuento'] ?? 0;
                    $item->save();

                    // Descontar stock del producto si existe
                    if (!empty($itemData['codigo'])) {
                        $producto = \App\Models\Producto::where('empresa_id', $request->empresa_id)
                            ->where('codigo', $itemData['codigo'])
                            ->first();

                        if ($producto) {
                            $producto->stock_actual = max(0, $producto->stock_actual - $itemData['cantidad']);
                            $producto->save();

                            Log::info("Stock actualizado para producto {$producto->codigo}: {$producto->stock_actual}");
                        }
                    }
                }

                // Recargar con relaciones
                $comprobante->load(['items', 'empresa']);
            }

            // Convertir a formato NubeFact
            $nubefactData = NubefactMapper::comprobanteToNubefact($comprobante);

            // Enviar a NubeFact
            $response = $this->nubefactClient->generarComprobante($nubefactData);

            // Actualizar comprobante con respuesta
            NubefactMapper::updateComprobanteFromNubefact($comprobante, $response);

            // Enviar email automáticamente si el comprobante fue aceptado por SUNAT
            if (($response['aceptada_por_sunat'] ?? false) && !empty($comprobante->cliente_email)) {
                try {
                    \Mail::to($comprobante->cliente_email)->send(new \App\Mail\ComprobanteEmitido($comprobante));
                    Log::info("Email enviado automáticamente a {$comprobante->cliente_email} para comprobante {$comprobante->serie}-{$comprobante->correlativo}");
                } catch (\Exception $e) {
                    Log::error("Error al enviar email automático: " . $e->getMessage());
                    // No fallar la emisión si el email falla
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Comprobante emitido exitosamente',
                'data' => [
                    'comprobante_id' => $comprobante->id,
                    'serie' => $comprobante->serie,
                    'numero' => $comprobante->correlativo,
                    'enlace' => $response['enlace'] ?? null,
                    'aceptada_por_sunat' => $response['aceptada_por_sunat'] ?? false,
                    'pdf_url' => $response['enlace_del_pdf'] ?? null,
                    'xml_url' => $response['enlace_del_xml'] ?? null,
                    'cdr_url' => $response['enlace_del_cdr'] ?? null,
                    'cadena_qr' => $response['cadena_para_codigo_qr'] ?? null,
                    'sunat_code' => $response['sunat_responsecode'] ?? null,
                    'sunat_description' => $response['sunat_description'] ?? null,
                ],
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::channel('nubefact')->error('Error al emitir comprobante', [
                'request_data' => $request->all(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al emitir comprobante: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Consultar estado de un comprobante en NubeFact
     * GET /api/nubefact/comprobantes/{tipo}/{serie}/{numero}
     */
    public function consultarComprobante($tipo, $serie, $numero)
    {
        try {
            $tipoInt = NubefactClient::mapearTipoComprobante($tipo);
            $response = $this->nubefactClient->consultarComprobante($tipoInt, $serie, (int) $numero);

            // Buscar comprobante local
            $comprobante = Comprobante::where('tipo_doc', $tipo)
                ->where('serie', $serie)
                ->where('correlativo', $numero)
                ->first();

            // Actualizar si existe
            if ($comprobante) {
                NubefactMapper::updateComprobanteFromNubefact($comprobante, $response);
                $comprobante->nubefact_consultado_at = now();
                $comprobante->save();
            }

            return response()->json([
                'success' => true,
                'data' => $response,
            ], 200);

        } catch (\Exception $e) {
            Log::channel('nubefact')->error('Error al consultar comprobante', [
                'tipo' => $tipo,
                'serie' => $serie,
                'numero' => $numero,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al consultar: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Anular un comprobante mediante NubeFact
     * DELETE /api/nubefact/comprobantes/{tipo}/{serie}/{numero}
     */
    public function anularComprobante(AnularComprobanteRequest $request, $tipo, $serie, $numero)
    {

        try {

            $tipoInt = NubefactClient::mapearTipoComprobante($tipo);
            $validated = $request->validated();
            $response = $this->nubefactClient->generarAnulacion(
                $tipoInt,
                $serie,
                (int) $numero,
                $validated['motivo']
            );

            // Actualizar comprobante local
            $comprobante = Comprobante::where('tipo_doc', $tipo)
                ->where('serie', $serie)
                ->where('correlativo', $numero)
                ->first();

            if ($comprobante) {
                $comprobante->update([
                    'anulado' => true,
                    'anulado_at' => now(),
                    'motivo_anulacion' => $validated['motivo'],
                    'nubefact_sunat_ticket' => $response['sunat_ticket_numero'] ?? null,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Comprobante anulado exitosamente',
                'data' => $response,
            ], 200);

        } catch (\Exception $e) {
            Log::channel('nubefact')->error('Error al anular comprobante', [
                'tipo' => $tipo,
                'serie' => $serie,
                'numero' => $numero,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al anular: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Emitir una guía de remisión mediante NubeFact
     * POST /api/nubefact/guias
     */
    public function emitirGuia(EmitirGuiaRequest $request)
    {

        try {

            $validated = $request->validated();
            $guia = GuiaRemision::with(['items', 'empresa'])->findOrFail($validated['guia_id']);

            // Verificar si ya fue emitida
            if ($guia->nubefact_enlace) {
                return response()->json([
                    'success' => false,
                    'message' => 'Esta guía ya fue emitida mediante NubeFact',
                    'enlace' => $guia->nubefact_enlace,
                ], 400);
            }

            // Convertir a formato NubeFact
            $nubefactData = NubefactMapper::guiaToNubefact($guia);

            // Paso 1: Enviar a NubeFact (genera XML pero sin PDF)
            $response = $this->nubefactClient->generarGuia($nubefactData);
            NubefactMapper::updateGuiaFromNubefact($guia, $response);

            // Paso 2: Consultar hasta obtener aceptación de SUNAT
            $maxReintentos = config('nubefact.gre.max_reintentos_consulta', 10);
            $segundosEspera = config('nubefact.gre.segundos_entre_reintentos', 3);
            $aceptada = false;
            $intentos = 0;

            while (! $aceptada && $intentos < $maxReintentos) {
                sleep($segundosEspera);

                $consultaResponse = $this->nubefactClient->consultarGuia(
                    $guia->tipo_comprobante,
                    $guia->serie,
                    $guia->numero
                );

                if ($consultaResponse['aceptada_por_sunat']) {
                    $aceptada = true;
                    NubefactMapper::updateGuiaFromNubefact($guia, $consultaResponse);
                    $response = $consultaResponse;
                }

                $intentos++;
            }

            return response()->json([
                'success' => true,
                'message' => $aceptada ? 'Guía emitida y aceptada por SUNAT' : 'Guía emitida, pendiente de aceptación',
                'data' => [
                    'guia_id' => $guia->id,
                    'enlace' => $response['enlace'] ?? null,
                    'aceptada_por_sunat' => $aceptada,
                    'pdf_url' => $response['enlace_del_pdf'] ?? null,
                    'xml_url' => $response['enlace_del_xml'] ?? null,
                    'intentos_consulta' => $intentos,
                ],
            ], 200);

        } catch (\Exception $e) {

            Log::channel('nubefact')->error('Error al emitir guía de remisión', [
                'guia_id' => $request->guia_id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al emitir guía: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Consultar estado de una guía en NubeFact
     * GET /api/nubefact/guias/{tipo}/{serie}/{numero}
     */
    public function consultarGuia($tipo, $serie, $numero)
    {
        try {
            $response = $this->nubefactClient->consultarGuia((int) $tipo, $serie, (int) $numero);

            // Buscar guía local y actualizar
            $guia = GuiaRemision::where('tipo_comprobante', $tipo)
                ->where('serie', $serie)
                ->where('numero', $numero)
                ->first();

            if ($guia) {
                NubefactMapper::updateGuiaFromNubefact($guia, $response);
                $guia->nubefact_consultado_at = now();
                $guia->save();
            }

            return response()->json([
                'success' => true,
                'data' => $response,
            ], 200);

        } catch (\Exception $e) {
            Log::channel('nubefact')->error('Error al consultar guía', [
                'tipo' => $tipo,
                'serie' => $serie,
                'numero' => $numero,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error al consultar: '.$e->getMessage(),
            ], 500);
        }
    }
}
