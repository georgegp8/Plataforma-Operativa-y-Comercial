<?php

namespace App\Services;

use App\Models\Comprobante;
use App\Models\ComprobanteItem;
use App\Models\Empresa;
use App\Models\Entidad;
use App\Models\GuiaRemision;
use App\Models\Producto;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Servicio para sincronizar datos desde NubeFact API
 * Permite obtener información directamente sin necesidad de cargar archivos Excel
 */
class NubefactSyncService
{
    protected NubefactClient $client;

    protected NubefactMapper $mapper;

    public function __construct(NubefactClient $client, NubefactMapper $mapper)
    {
        $this->client = $client;
        $this->mapper = $mapper;
    }

    /**
     * Sincronizar un comprobante específico desde NubeFact
     *
     * @param  string  $tipoDoc  Código SUNAT: '01', '03', '07', '08'
     * @param  string  $serie  Serie del comprobante
     * @param  int  $numero  Número correlativo
     * @param  int|null  $empresaId  ID de la empresa emisora
     * @return array Resultado de la sincronización
     */
    public function sincronizarComprobante(
        string $tipoDoc,
        string $serie,
        int $numero,
        ?int $empresaId = null
    ): array {
        try {
            // Mapear tipo de documento SUNAT a código NubeFact
            $tipoMap = ['01' => 1, '03' => 2, '07' => 3, '08' => 4];
            $tipoNubefact = $tipoMap[$tipoDoc] ?? 1;

            // Consultar comprobante en NubeFact
            $response = $this->client->consultarComprobante($tipoNubefact, $serie, $numero);

            // Si no se especifica empresa_id, usar la primera empresa disponible
            if (!$empresaId) {
                $empresaId = Empresa::first()?->id;
                if (!$empresaId) {
                    throw new Exception('No hay empresas registradas en el sistema');
                }
            }

            // Buscar comprobante en BD (incluyendo soft-deleted para evitar unique constraint)
            // IMPORTANTE: Buscar por empresa_id también para evitar duplicados
            $comprobante = Comprobante::withTrashed()->where([
                'empresa_id' => $empresaId,
                'tipo_doc' => $tipoDoc,
                'serie' => $serie,
                'correlativo' => $numero,
            ])->first();

            if (! $comprobante) {
                // Si no existe, crear desde datos de NubeFact
                $comprobante = $this->crearComprobanteDesdeNubefact($response, $tipoDoc, $serie, $numero, $empresaId);
                $accion = 'creado';
            } else {
                // Si estaba soft-deleted, restaurarlo
                if ($comprobante->trashed()) {
                    $comprobante->restore();
                }
                // Si existe, actualizar solo campos NubeFact
                $empresaIdActual = $empresaId ?? $comprobante->empresa_id;

                DB::beginTransaction();
                try {
                    $this->actualizarCamposNubefact($comprobante, $response);

                    // También sincronizar entidad y productos en actualizaciones
                    if (! empty($response['cliente_numero_de_documento'])) {
                        $this->sincronizarEntidadDesdeNubefact($comprobante, $response, $empresaIdActual);
                    }

                    if (! empty($response['items']) && is_array($response['items'])) {
                        // Solo sincronizar productos, no duplicar items
                        foreach ($response['items'] as $itemData) {
                            if (! empty($itemData['codigo'])) {
                                $this->sincronizarProductoDesdeItem($itemData, $empresaIdActual);
                            }
                        }
                    }

                    DB::commit();
                } catch (Exception $e) {
                    DB::rollBack();
                    throw $e;
                }

                $accion = 'actualizado';
            }

            return [
                'success' => true,
                'accion' => $accion,
                'comprobante' => $comprobante,
                'mensaje' => "Comprobante {$serie}-{$numero} {$accion} exitosamente desde NubeFact",
            ];

        } catch (Exception $e) {
            // Detectar si el documento simplemente no existe en NubeFact (código 24)
            if (str_contains($e->getMessage(), 'Documento no existe') || str_contains($e->getMessage(), '"codigo":24')) {
                return [
                    'success' => false,
                    'no_encontrado' => true,
                    'mensaje' => "Comprobante {$serie}-{$numero} no existe en NubeFact",
                ];
            }

            Log::error("Error al sincronizar comprobante {$serie}-{$numero}: ".$e->getMessage());

            return [
                'success' => false,
                'no_encontrado' => false,
                'mensaje' => 'Error: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Sincronizar múltiples comprobantes de un rango
     *
     * @param  string  $tipoDoc  Tipo de comprobante
     * @param  string  $serie  Serie
     * @param  int  $numeroInicio  Número inicial
     * @param  int  $numeroFin  Número final
     * @param  int|null  $empresaId  ID de empresa
     * @return array Estadísticas de sincronización
     */
    public function sincronizarRango(
        string $tipoDoc,
        string $serie,
        int $numeroInicio,
        int $numeroFin,
        ?int $empresaId = null
    ): array {
        $resultados = [
            'total' => 0,
            'exitosos' => 0,
            'errores' => 0,
            'creados' => 0,
            'actualizados' => 0,
            'no_encontrados' => 0,
            'detalles' => [],
        ];

        for ($numero = $numeroInicio; $numero <= $numeroFin; $numero++) {
            $resultados['total']++;

            try {
                $resultado = $this->sincronizarComprobante($tipoDoc, $serie, $numero, $empresaId);

                if ($resultado['success']) {
                    $resultados['exitosos']++;

                    if ($resultado['accion'] === 'creado') {
                        $resultados['creados']++;
                    } else {
                        $resultados['actualizados']++;
                    }
                } elseif (!empty($resultado['no_encontrado'])) {
                    $resultados['no_encontrados']++;
                } else {
                    $resultados['errores']++;
                }

                $resultados['detalles'][] = [
                    'numero' => $numero,
                    'resultado' => $resultado,
                ];

                // Pequeña pausa para no saturar la API
                usleep(200000); // 0.2 segundos

            } catch (Exception $e) {
                $resultados['errores']++;
                $resultados['detalles'][] = [
                    'numero' => $numero,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $resultados;
    }

    /**
     * Sincronizar todos los comprobantes pendientes o desactualizados
     *
     * @param  array  $opciones  Opciones de filtrado
     * @return array Estadísticas
     */
    public function sincronizarPendientes(array $opciones = []): array
    {
        $query = Comprobante::query();

        // Filtrar comprobantes que necesitan sincronización
        if ($opciones['solo_pendientes'] ?? false) {
            // Solo los que tienen enlace NubeFact pero no están consultados recientemente
            $query->whereNotNull('nubefact_enlace')
                ->where(function ($q) {
                    $q->whereNull('nubefact_consultado_at')
                        ->orWhere('nubefact_consultado_at', '<', now()->subHours(24));
                });
        }

        // Filtros adicionales
        if (! empty($opciones['empresa_id'])) {
            $query->where('empresa_id', $opciones['empresa_id']);
        }

        if (! empty($opciones['tipo_doc'])) {
            $query->where('tipo_doc', $opciones['tipo_doc']);
        }

        if (! empty($opciones['fecha_desde'])) {
            $query->whereDate('fecha_emision', '>=', $opciones['fecha_desde']);
        }

        if (! empty($opciones['fecha_hasta'])) {
            $query->whereDate('fecha_emision', '<=', $opciones['fecha_hasta']);
        }

        $comprobantes = $query->limit($opciones['limite'] ?? 100)->get();

        $resultados = [
            'total' => $comprobantes->count(),
            'exitosos' => 0,
            'errores' => 0,
            'detalles' => [],
        ];

        foreach ($comprobantes as $comprobante) {
            try {
                $resultado = $this->sincronizarComprobante(
                    $comprobante->tipo_doc,
                    $comprobante->serie,
                    $comprobante->correlativo,
                    $comprobante->empresa_id
                );

                if ($resultado['success']) {
                    $resultados['exitosos']++;
                } else {
                    $resultados['errores']++;
                }

                $resultados['detalles'][] = $resultado;

                usleep(200000); // 0.2 segundos

            } catch (Exception $e) {
                $resultados['errores']++;
                $resultados['detalles'][] = [
                    'comprobante' => "{$comprobante->serie}-{$comprobante->correlativo}",
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $resultados;
    }

    /**
     * Enriquecer comprobantes sincronizados descargando y parseando sus XMLs
     * Extrae datos completos de clientes e items del XML UBL 2.1
     */
    public function enriquecerDesdeXml(?int $empresaId = null): array
    {
        $query = Comprobante::whereNotNull('nubefact_xml_url')
            ->where('cliente_razon_social', 'CLIENTE SINCRONIZADO');

        if ($empresaId) {
            $query->where('empresa_id', $empresaId);
        }

        $comprobantes = $query->get();

        $resultados = [
            'total' => $comprobantes->count(),
            'exitosos' => 0,
            'errores' => 0,
            'detalles' => [],
        ];

        foreach ($comprobantes as $comprobante) {
            try {
                $this->enriquecerComprobanteDesdeXml($comprobante);
                $resultados['exitosos']++;
                $resultados['detalles'][] = [
                    'comprobante' => "{$comprobante->serie}-{$comprobante->correlativo}",
                    'success' => true,
                ];
                usleep(200000);
            } catch (Exception $e) {
                $resultados['errores']++;
                $resultados['detalles'][] = [
                    'comprobante' => "{$comprobante->serie}-{$comprobante->correlativo}",
                    'success' => false,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $resultados;
    }

    /**
     * Enriquecer un comprobante individual desde su XML
     */
    protected function enriquecerComprobanteDesdeXml(Comprobante $comprobante): void
    {
        $xmlContent = @file_get_contents($comprobante->nubefact_xml_url);
        if (! $xmlContent) {
            throw new Exception("No se pudo descargar el XML de {$comprobante->serie}-{$comprobante->correlativo}");
        }

        $doc = new \DOMDocument();
        $doc->loadXML($xmlContent);
        $xpath = new \DOMXPath($doc);
        $xpath->registerNamespace('cac', 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2');
        $xpath->registerNamespace('cbc', 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2');

        DB::beginTransaction();
        try {
            // --- Actualizar datos del cliente en el comprobante ---
            $razonSocial = $xpath->evaluate('string(//cac:AccountingCustomerParty//cbc:RegistrationName)');
            $direccion = $xpath->evaluate('string(//cac:AccountingCustomerParty//cac:RegistrationAddress//cbc:Line)');
            $numDoc = $xpath->evaluate('string(//cac:AccountingCustomerParty//cbc:ID)');
            $tipoDoc = $xpath->evaluate('string(//cac:AccountingCustomerParty//cbc:ID/@schemeID)');

            if ($razonSocial) {
                $comprobante->cliente_razon_social = $razonSocial;
            }
            if ($direccion) {
                $comprobante->cliente_direccion = $direccion;
            }
            if ($numDoc) {
                $comprobante->cliente_num_doc = $numDoc;
            }
            if ($tipoDoc) {
                $comprobante->cliente_tipo_doc = $tipoDoc;
            }

            // Fecha y hora del XML (más precisa que del QR)
            $fechaXml = $xpath->evaluate('string(//cbc:IssueDate)');
            $horaXml = $xpath->evaluate('string(//cbc:IssueTime)');
            if ($fechaXml) {
                $fechaCompleta = $horaXml ? "{$fechaXml} {$horaXml}" : $fechaXml;
                $comprobante->fecha_emision = $fechaCompleta;
            }

            // Fecha vencimiento
            $fechaVenc = $xpath->evaluate('string(//cbc:DueDate)');
            if ($fechaVenc) {
                $comprobante->fecha_vencimiento = $fechaVenc;
            }

            $comprobante->save();

            // --- Crear o actualizar entidad ---
            if ($numDoc) {
                // Buscar entidad existente
                $entidad = Entidad::firstOrNew([
                    'empresa_id' => $comprobante->empresa_id,
                    'num_doc' => $numDoc,
                ]);

                // Actualizar campos básicos
                $entidad->tipo_doc = $tipoDoc ?: '6';
                $entidad->denominacion = $razonSocial ?: $entidad->denominacion;
                $entidad->es_cliente = true;

                // Solo actualizar si hay nuevos valores (no sobrescribir con vacíos)
                if (!empty($razonSocial)) {
                    $entidad->razon_comercial = $razonSocial;
                }
                if (!empty($direccion)) {
                    $entidad->direccion = $direccion;
                }
                if (!empty($comprobante->cliente_email)) {
                    $entidad->email = $comprobante->cliente_email;
                }

                $entidad->save();
            }

            // --- Crear items si no existen ---
            $existingItems = ComprobanteItem::where('comprobante_id', $comprobante->id)->count();
            if ($existingItems === 0) {
                // Determinar el tag de línea según tipo de doc
                $lineTag = '//cac:InvoiceLine';
                if (in_array($comprobante->tipo_doc, ['07', '08'])) {
                    // Notas de crédito/débito usan DebitNoteLine / CreditNoteLine
                    $testCredit = $xpath->query('//cac:CreditNoteLine');
                    $testDebit = $xpath->query('//cac:DebitNoteLine');
                    if ($testCredit->length > 0) {
                        $lineTag = '//cac:CreditNoteLine';
                    } elseif ($testDebit->length > 0) {
                        $lineTag = '//cac:DebitNoteLine';
                    }
                }

                $xmlItems = $xpath->query($lineTag);
                foreach ($xmlItems as $i => $xmlItem) {
                    $desc = $xpath->evaluate('string(cac:Item/cbc:Description)', $xmlItem);
                    $qtyNode = $xpath->evaluate('string(cbc:InvoicedQuantity)', $xmlItem)
                        ?: $xpath->evaluate('string(cbc:CreditedQuantity)', $xmlItem)
                        ?: $xpath->evaluate('string(cbc:DebitedQuantity)', $xmlItem);
                    $unit = $xpath->evaluate('string(cbc:InvoicedQuantity/@unitCode)', $xmlItem)
                        ?: $xpath->evaluate('string(cbc:CreditedQuantity/@unitCode)', $xmlItem)
                        ?: $xpath->evaluate('string(cbc:DebitedQuantity/@unitCode)', $xmlItem)
                        ?: 'NIU';
                    $valorUnitario = (float) $xpath->evaluate('string(cac:Price/cbc:PriceAmount)', $xmlItem);
                    $codigo = $xpath->evaluate('string(cac:Item/cac:SellersItemIdentification/cbc:ID)', $xmlItem);
                    $subtotal = (float) $xpath->evaluate('string(cbc:LineExtensionAmount)', $xmlItem);

                    // IGV del item
                    $igvAmount = (float) $xpath->evaluate('string(cac:TaxTotal/cbc:TaxAmount)', $xmlItem);
                    $tipoIgv = $xpath->evaluate('string(cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReasonCode)', $xmlItem);

                    $cantidad = (float) ($qtyNode ?: 1);
                    $precioUnitario = $igvAmount > 0
                        ? round($valorUnitario * 1.18, 2)
                        : $valorUnitario;

                    $item = new ComprobanteItem();
                    $item->comprobante_id = $comprobante->id;
                    $item->item = $i + 1;
                    $item->codigo_producto = $codigo ?: '';
                    $item->descripcion = $desc ?: '';
                    $item->unidad = $unit;
                    $item->cantidad = $cantidad;
                    $item->mto_valor_unitario = $valorUnitario;
                    $item->mto_precio_unitario = $precioUnitario;
                    $item->mto_valor_venta = $subtotal;
                    $item->tip_afe_igv = $tipoIgv ?: '10';
                    $item->igv = $igvAmount;
                    $item->total_impuestos = $igvAmount;
                    $item->descuento = 0;
                    $item->save();

                    // Sincronizar producto
                    if ($codigo) {
                        Producto::updateOrCreate(
                            [
                                'empresa_id' => $comprobante->empresa_id,
                                'codigo' => $codigo,
                            ],
                            [
                                'descripcion' => $desc ?: '',
                                'unidad_medida' => $unit,
                                'precio_venta_unitario' => round($valorUnitario * 1.18, 2),
                                'valor_venta_unitario' => $valorUnitario,
                            ]
                        );
                    }
                }
            }

            DB::commit();
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Obtener información de un comprobante directamente desde NubeFact
     * sin guardarlo en la BD (solo consulta)
     *
     * @return array Datos del comprobante desde NubeFact
     */
    public function consultarComprobanteEnNubefact(
        string $tipoDoc,
        string $serie,
        int $numero
    ): array {
        try {
            $tipoMap = ['01' => 1, '03' => 2, '07' => 3, '08' => 4];
            $tipoNubefact = $tipoMap[$tipoDoc] ?? 1;
            $response = $this->client->consultarComprobante($tipoNubefact, $serie, $numero);

            return [
                'success' => true,
                'data' => $response,
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'mensaje' => $e->getMessage(),
            ];
        }
    }

    /**
     * Extraer datos del código QR de NubeFact
     * Formato: RUC|tipo_doc|serie|numero|IGV|total|fecha_dd/mm/yyyy|tipo_doc_cliente|num_doc_cliente|hash
     */
    protected function extraerDatosQR(?string $cadenaQR): array
    {
        if (! $cadenaQR) {
            return [];
        }

        $partes = explode('|', $cadenaQR);

        if (count($partes) < 9) {
            return [];
        }

        return [
            'ruc_emisor' => $partes[0] ?? null,
            'tipo_doc' => $partes[1] ?? null,
            'serie' => $partes[2] ?? null,
            'numero' => $partes[3] ?? null,
            'igv' => (float) str_replace(',', '', $partes[4] ?? '0'),
            'total' => (float) str_replace(',', '', $partes[5] ?? '0'),
            'fecha' => $partes[6] ?? null, // DD/MM/YYYY
            'cliente_tipo_doc' => $partes[7] ?? null,
            'cliente_num_doc' => $partes[8] ?? null,
        ];
    }

    /**
     * Crear comprobante en BD desde respuesta de NubeFact
     */
    protected function crearComprobanteDesdeNubefact(
        array $response,
        string $tipoDoc,
        string $serie,
        int $numero,
        ?int $empresaId
    ): Comprobante {
        DB::beginTransaction();

        try {
            // Determinar empresa
            if (! $empresaId) {
                $empresaId = Empresa::first()?->id;
                if (! $empresaId) {
                    throw new Exception('No hay empresas registradas en el sistema');
                }
            }

            // Extraer datos del QR (disponible en consultar_comprobante)
            $qr = $this->extraerDatosQR($response['cadena_para_codigo_qr'] ?? null);

            // Crear comprobante básico
            $comprobante = new Comprobante;
            $comprobante->empresa_id = $empresaId;
            $comprobante->tipo_doc = $tipoDoc;
            $comprobante->serie = $serie;
            $comprobante->correlativo = $numero;

            // Cliente - primero del response directo, luego del QR
            $comprobante->cliente_tipo_doc = $response['cliente_tipo_de_documento']
                ?? $qr['cliente_tipo_doc'] ?? '6';
            $comprobante->cliente_num_doc = $response['cliente_numero_de_documento']
                ?? $qr['cliente_num_doc'] ?? '';
            $comprobante->cliente_razon_social = $response['cliente_denominacion'] ?? 'CLIENTE SINCRONIZADO';
            $comprobante->cliente_direccion = $response['cliente_direccion'] ?? null;
            $comprobante->cliente_email = $response['cliente_email'] ?? null;

            // Fecha - del response directo, del QR, o fecha actual como último recurso
            $fechaEmision = $response['fecha_de_emision'] ?? $qr['fecha'] ?? null;
            $comprobante->fecha_emision = $this->convertirFechaNubefact($fechaEmision)
                ?? now()->format('Y-m-d H:i:s');
            $comprobante->fecha_vencimiento = $this->convertirFechaNubefact($response['fecha_de_vencimiento'] ?? null);

            // Montos - del response directo o calculados desde el QR
            $comprobante->codigo_tipo_moneda = $this->mapearMoneda((string) ($response['moneda'] ?? '1'));
            $totalIgv = ! empty($response['total_igv']) ? $response['total_igv'] : ($qr['igv'] ?? 0);
            $totalImporte = ! empty($response['total']) ? $response['total'] : ($qr['total'] ?? 0);
            $totalGravada = $totalImporte - $totalIgv;

            $comprobante->mto_oper_gravadas = ! empty($response['total_gravada']) ? $response['total_gravada'] : max($totalGravada, 0);
            $comprobante->mto_oper_exoneradas = ! empty($response['total_exonerada']) ? $response['total_exonerada'] : 0;
            $comprobante->mto_oper_inafectas = ! empty($response['total_inafecta']) ? $response['total_inafecta'] : 0;
            $comprobante->mto_oper_gratuitas = ! empty($response['total_gratuita']) ? $response['total_gratuita'] : 0;
            $comprobante->mto_igv = $totalIgv;
            $comprobante->mto_imp_venta = $totalImporte;
            $comprobante->observaciones = $response['observaciones'] ?? null;

            // Estado basado en aceptación SUNAT y anulación
            $comprobante->anulado = $response['anulado'] ?? false;
            if ($comprobante->anulado) {
                $comprobante->estado_sunat = 'baja';
            } else {
                $comprobante->estado_sunat = ($response['aceptada_por_sunat'] ?? false) ? 'aceptado' : 'pendiente';
            }
            $comprobante->codigo_sunat = $response['sunat_responsecode'] ?? null;
            $comprobante->mensaje_sunat = $response['sunat_description'] ?? null;
            $comprobante->hash_cpe = $response['codigo_hash'] ?? null;
            $comprobante->pagado = false;

            // Campos NubeFact (enlaces PDF, XML, CDR) + parseo de QR y XML para montos
            $this->actualizarCamposNubefact($comprobante, $response);

            $comprobante->save();

            // Sincronizar entidad/cliente si hay datos de documento
            $numDocCliente = $response['cliente_numero_de_documento'] ?? $qr['cliente_num_doc'] ?? null;
            if (! empty($numDocCliente)) {
                $this->sincronizarEntidadDesdeNubefact($comprobante, $response, $empresaId);
            }

            // Si hay items en la respuesta, crearlos y sincronizar productos
            if (! empty($response['items']) && is_array($response['items'])) {
                $this->crearItemsDesdeNubefact($comprobante, $response['items'], $empresaId);
            }

            DB::commit();

            return $comprobante;

        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Actualizar solo campos NubeFact en un comprobante existente
     * ADEMÁS parsea el QR y XML para obtener montos reales
     */
    protected function actualizarCamposNubefact(Comprobante $comprobante, array $response): void
    {
        $comprobante->nubefact_enlace = $response['enlace'] ?? $comprobante->nubefact_enlace;
        $comprobante->nubefact_aceptada_por_sunat = $response['aceptada_por_sunat'] ?? false;
        $comprobante->nubefact_sunat_ticket = $response['sunat_ticket_numero'] ?? null;
        $comprobante->nubefact_pdf_url = $response['enlace_del_pdf'] ?? null;
        $comprobante->nubefact_xml_url = $response['enlace_del_xml'] ?? null;
        $comprobante->nubefact_cdr_url = $response['enlace_del_cdr'] ?? null;
        $comprobante->nubefact_cadena_qr = $response['cadena_para_codigo_qr'] ?? null;
        $comprobante->nubefact_codigo_hash = $response['codigo_hash'] ?? null;
        $comprobante->nubefact_codigo_barras = $response['codigo_de_barras'] ?? null;
        $comprobante->nubefact_response_json = json_encode($response);
        $comprobante->nubefact_consultado_at = now();

        $comprobante->codigo_sunat = $response['sunat_responsecode'] ?? null;
        $comprobante->mensaje_sunat = $response['sunat_description'] ?? null;

        // IMPORTANTE: Actualizar campo anulado desde la API y ajustar estado_sunat
        if (isset($response['anulado'])) {
            $comprobante->anulado = $response['anulado'];
        }
        if ($comprobante->anulado) {
            $comprobante->estado_sunat = 'baja';
        } else {
            $comprobante->estado_sunat = ($response['aceptada_por_sunat'] ?? false) ? 'aceptado' : 'pendiente';
        }

        // EXTRAER MONTOS DEL CÓDIGO QR (básicos: IGV y Total)
        $qr = $this->extraerDatosQR($response['cadena_para_codigo_qr'] ?? null);
        if (!empty($qr)) {
            // Cliente desde QR si no se había actualizado
            if (empty($comprobante->cliente_num_doc) && !empty($qr['cliente_num_doc'])) {
                $comprobante->cliente_num_doc = $qr['cliente_num_doc'];
                $comprobante->cliente_tipo_doc = $qr['cliente_tipo_doc'] ?? '6';
            }

            // Montos básicos desde QR
            if (!empty($qr['igv']) && $comprobante->mto_igv == 0) {
                $comprobante->mto_igv = $qr['igv'];
            }
            if (!empty($qr['total']) && $comprobante->mto_imp_venta == 0) {
                $comprobante->mto_imp_venta = $qr['total'];
                // Calcular gravada estimada
                if ($comprobante->mto_oper_gravadas == 0) {
                    $comprobante->mto_oper_gravadas = $qr['total'] - $qr['igv'];
                }
            }
        }

        // DESCARGAR Y PARSEAR XML PARA OBTENER TODOS LOS MONTOS DETALLADOS
        if (!empty($response['enlace_del_xml'])) {
            try {
                $this->actualizarMontosDesdeXml($comprobante, $response['enlace_del_xml']);
            } catch (\Exception $e) {
                // Si falla el XML, continuar con los datos del QR
                Log::warning("No se pudo parsear XML para {$comprobante->serie}-{$comprobante->correlativo}: {$e->getMessage()}");
            }
        }

        $comprobante->save();
    }

    /**
     * Sincronizar entidad/cliente desde datos de NubeFact
     * Crea o actualiza la entidad en la tabla entidades
     */
    protected function sincronizarEntidadDesdeNubefact(Comprobante $comprobante, array $response, int $empresaId): void
    {
        // Usar datos del comprobante ya mapeado (pueden venir del QR o del response directo)
        $numDoc = $response['cliente_numero_de_documento'] ?? $comprobante->cliente_num_doc ?? null;

        if (! $numDoc) {
            return;
        }

        $tipoDoc = $response['cliente_tipo_de_documento'] ?? $comprobante->cliente_tipo_doc ?? '6';
        $denominacion = $response['cliente_denominacion'] ?? $comprobante->cliente_razon_social ?? '';
        $direccion = $response['cliente_direccion'] ?? $comprobante->cliente_direccion ?? null;
        $email = $response['cliente_email'] ?? $comprobante->cliente_email ?? null;

        // Buscar o crear entidad
        $entidad = Entidad::firstOrNew([
            'empresa_id' => $empresaId,
            'num_doc' => $numDoc,
        ]);

        // Actualizar campos básicos siempre
        $entidad->tipo_doc = $tipoDoc;
        $entidad->denominacion = $denominacion;
        $entidad->es_cliente = true;

        // Solo actualizar opcionales si tienen valor (no sobrescribir con null)
        if (!empty($denominacion)) {
            $entidad->razon_comercial = $denominacion;
        }
        if (!empty($direccion)) {
            $entidad->direccion = $direccion;
        }
        if (!empty($email)) {
            $entidad->email = $email;
        }

        $entidad->save();

        // Actualizar email_2 y email_3 si vienen en la respuesta
        if (! empty($response['cliente_email_1']) && $entidad->email_2 === null) {
            $entidad->email_2 = $response['cliente_email_1'];
            $entidad->save();
        }

        if (! empty($response['cliente_email_2']) && $entidad->email_3 === null) {
            $entidad->email_3 = $response['cliente_email_2'];
            $entidad->save();
        }
    }

    /**
     * Crear items desde datos de NubeFact y sincronizar productos
     */
    protected function crearItemsDesdeNubefact(Comprobante $comprobante, array $items, int $empresaId): void
    {
        foreach ($items as $index => $itemData) {
            $igv = ! empty($itemData['igv']) ? (float) $itemData['igv'] : 0;

            $item = new ComprobanteItem;
            $item->comprobante_id = $comprobante->id;
            $item->item = $index + 1;
            $item->unidad = $itemData['unidad_de_medida'] ?? 'NIU';
            $item->codigo_producto = $itemData['codigo'] ?? '';
            $item->descripcion = $itemData['descripcion'] ?? '';
            $item->cantidad = $itemData['cantidad'] ?? 1;
            $item->mto_valor_unitario = $itemData['valor_unitario'] ?? 0;
            $item->mto_precio_unitario = $itemData['precio_unitario'] ?? 0;
            $item->mto_valor_venta = $itemData['subtotal'] ?? 0;
            $item->tip_afe_igv = $itemData['tipo_de_igv'] ?? 1;
            $item->igv = $igv;
            $item->total_impuestos = $igv;
            $item->descuento = ! empty($itemData['descuento']) ? $itemData['descuento'] : 0;
            $item->save();

            // Sincronizar producto si tiene código
            if (! empty($itemData['codigo'])) {
                $this->sincronizarProductoDesdeItem($itemData, $empresaId);
            }
        }
    }

    /**
     * Sincronizar producto desde datos del item
     * Crea o actualiza el producto en la tabla productos
     */
    protected function sincronizarProductoDesdeItem(array $itemData, int $empresaId): void
    {
        $codigo = $itemData['codigo'] ?? null;

        if (! $codigo) {
            return;
        }

        $descripcion = $itemData['descripcion'] ?? '';
        $unidadMedida = $itemData['unidad_de_medida'] ?? 'NIU';
        $valorUnitario = $itemData['valor_unitario'] ?? 0;
        $precioUnitario = $itemData['precio_unitario'] ?? 0;
        $tipoIgv = $itemData['tipo_de_igv'] ?? '10';
        $codigoSunat = $itemData['codigo_producto_sunat'] ?? null;

        // Buscar o crear producto
        Producto::updateOrCreate(
            [
                'empresa_id' => $empresaId,
                'codigo' => $codigo,
            ],
            [
                'descripcion' => $descripcion,
                'unidad_medida' => $unidadMedida,
                'valor_venta_unitario' => $valorUnitario,
                'precio_venta_unitario' => $precioUnitario,
                'tipo_afectacion_igv' => $tipoIgv,
                'codigo_producto_sunat' => $codigoSunat,
                'activo' => true,
            ]
        );
    }

    /**
     * Convertir fecha formato NubeFact (DD-MM-YYYY) a formato BD (YYYY-MM-DD)
     */
    protected function convertirFechaNubefact(?string $fecha): ?string
    {
        if (! $fecha) {
            return null;
        }

        // Formato: DD-MM-YYYY o DD/MM/YYYY
        $fecha = str_replace('/', '-', $fecha);
        $partes = explode('-', $fecha);

        if (count($partes) === 3) {
            return "{$partes[2]}-{$partes[1]}-{$partes[0]}";
        }

        return $fecha;
    }

    /**
     * Mapear código de moneda NubeFact a ISO
     */
    protected function mapearMoneda(string $codigo): string
    {
        return match ($codigo) {
            '1' => 'PEN',
            '2' => 'USD',
            '3' => 'EUR',
            default => 'PEN',
        };
    }

    /**
     * Actualizar montos del comprobante parseando el XML
     * Obtiene los montos REALES desde el XML UBL 2.1
     */
    protected function actualizarMontosDesdeXml(Comprobante $comprobante, string $xmlUrl): void
    {
        $xmlContent = @file_get_contents($xmlUrl);
        if (!$xmlContent) {
            throw new \Exception("No se pudo descargar el XML desde: {$xmlUrl}");
        }

        $doc = new \DOMDocument();
        @$doc->loadXML($xmlContent);
        $xpath = new \DOMXPath($doc);
        $xpath->registerNamespace('cac', 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2');
        $xpath->registerNamespace('cbc', 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2');

        // Total Gravada (operaciones afectas a IGV - código 1000)
        $totalGravada = (float) $xpath->evaluate('string(//cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:ID="1000"]/cbc:TaxableAmount)');

        // Total Exonerada (código 9997)
        $totalExonerada = (float) $xpath->evaluate('string(//cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:ID="9997"]/cbc:TaxableAmount)');

        // Total Inafecta (código 9998)
        $totalInafecta = (float) $xpath->evaluate('string(//cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:ID="9998"]/cbc:TaxableAmount)');

        // Total Gratuita (en AllowanceCharge con ChargeIndicator=false)
        $totalGratuita = (float) $xpath->evaluate('string(//cac:AllowanceCharge[cbc:ChargeIndicator="false"]/cbc:Amount)');

        // Total IGV
        $totalIgv = (float) $xpath->evaluate('string(//cac:TaxTotal[cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:ID="1000"]/cbc:TaxAmount)');

        // Total Venta (PayableAmount)
        $totalVenta = (float) $xpath->evaluate('string(//cac:LegalMonetaryTotal/cbc:PayableAmount)');

        // Cliente (si no estaba en el comprobante)
        $clienteNumDoc = $xpath->evaluate('string(//cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID)');
        $clienteRazonSocial = $xpath->evaluate('string(//cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName)');
        $clienteTipoDoc = $xpath->evaluate('string(//cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID/@schemeID)');
        $clienteDireccion = $xpath->evaluate('string(//cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationAddress/cac:AddressLine/cbc:Line)');

        // Fecha de emisión del XML (más precisa)
        $fechaEmision = $xpath->evaluate('string(//cbc:IssueDate)');
        $horaEmision = $xpath->evaluate('string(//cbc:IssueTime)');

        // Moneda
        $moneda = $xpath->evaluate('string(//cbc:DocumentCurrencyCode)');

        // Forma de pago
        $formaPago = $xpath->evaluate('string(//cac:PaymentTerms/cbc:PaymentMeansID)');

        // Fecha de vencimiento
        $fechaVencimiento = $xpath->evaluate('string(//cbc:DueDate)');

        // ACTUALIZAR CAMPOS DEL COMPROBANTE
        if ($totalGravada > 0) {
            $comprobante->mto_oper_gravadas = $totalGravada;
        }
        if ($totalExonerada > 0) {
            $comprobante->mto_oper_exoneradas = $totalExonerada;
        }
        if ($totalInafecta > 0) {
            $comprobante->mto_oper_inafectas = $totalInafecta;
        }
        if ($totalGratuita > 0) {
            $comprobante->mto_oper_gratuitas = $totalGratuita;
        }
        if ($totalIgv > 0) {
            $comprobante->mto_igv = $totalIgv;
        }
        if ($totalVenta > 0) {
            $comprobante->mto_imp_venta = $totalVenta;
        }

        // Actualizar cliente si no está completo
        if ($clienteNumDoc && empty($comprobante->cliente_num_doc)) {
            $comprobante->cliente_num_doc = $clienteNumDoc;
        }
        if ($clienteRazonSocial && ($comprobante->cliente_razon_social === 'CLIENTE SINCRONIZADO' || empty($comprobante->cliente_razon_social))) {
            $comprobante->cliente_razon_social = $clienteRazonSocial;
        }
        if ($clienteTipoDoc && empty($comprobante->cliente_tipo_doc)) {
            $comprobante->cliente_tipo_doc = $clienteTipoDoc;
        }
        if ($clienteDireccion && empty($comprobante->cliente_direccion)) {
            $comprobante->cliente_direccion = $clienteDireccion;
        }

        // Actualizar fecha de emisión (más precisa del XML)
        if ($fechaEmision) {
            $fechaCompleta = $horaEmision ? "{$fechaEmision} {$horaEmision}" : $fechaEmision;
            $comprobante->fecha_emision = $fechaCompleta;
        }

        // Actualizar moneda
        if ($moneda) {
            $comprobante->codigo_tipo_moneda = $moneda;
        }

        // Actualizar forma de pago
        if ($formaPago) {
            $comprobante->forma_pago = $formaPago === 'Credito' || $formaPago === 'Crédito' ? 'Credito' : 'Contado';
        }

        // Actualizar fecha de vencimiento
        if ($fechaVencimiento) {
            $comprobante->fecha_vencimiento = $fechaVencimiento;
        }

        Log::info("Montos actualizados desde XML para {$comprobante->serie}-{$comprobante->correlativo}", [
            'gravada' => $totalGravada,
            'exonerada' => $totalExonerada,
            'inafecta' => $totalInafecta,
            'gratuita' => $totalGratuita,
            'igv' => $totalIgv,
            'total' => $totalVenta,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────
    // GUÍAS DE REMISIÓN
    // ─────────────────────────────────────────────────────────────────

    /**
     * Descubrir y sincronizar guías automáticamente al cargar el módulo.
     *
     * Lee las series de tipo '09' registradas en la empresa, determina el
     * número máximo ya en BD y sincroniza hacia adelante hasta 5 fallos
     * consecutivos. Si no hay series registradas, usa T001 / tipo 7 como
     * fallback. Ideal para llamarse en segundo plano al entrar al módulo.
     *
     * @param  int|null  $empresaId
     * @return array Estadísticas de la operación
     */
    public function autoDescubrirGuias(?int $empresaId = null): array
    {
        // Aumentar el tiempo máximo de ejecución para permitir múltiples llamadas a NubeFact
        set_time_limit(180);

        if (! $empresaId) {
            $empresaId = Empresa::first()?->id;
            if (! $empresaId) {
                return ['success' => false, 'mensaje' => 'No hay empresas registradas'];
            }
        }

        // Obtener series de GRE registradas para la empresa
        $series = DB::table('series')
            ->where('empresa_id', $empresaId)
            ->where('tipo_comprobante', '09')
            ->where('activo', true)
            ->pluck('serie')
            ->toArray();

        // Si no hay series registradas, usar las existentes en guia_remisions
        if (empty($series)) {
            $series = GuiaRemision::where('empresa_id', $empresaId)
                ->distinct()
                ->pluck('serie')
                ->toArray();
        }

        // Fallback definitivo: T001
        if (empty($series)) {
            $series = ['T001'];
        }

        $totales = [
            'total'          => 0,
            'exitosos'       => 0,
            'creados'        => 0,
            'actualizados'   => 0,
            'no_encontrados' => 0,
            'errores'        => 0,
        ];

        foreach ($series as $serie) {
            // T* = Remitente (tipo 7), V* = Transportista (tipo 8)
            $tipo = str_starts_with(strtoupper($serie), 'V') ? 8 : 7;

            // Número máximo ya almacenado en BD para esta (tipo, serie)
            $maxEnBD = (int) GuiaRemision::where('tipo_comprobante', $tipo)
                ->where('serie', $serie)
                ->max('numero');

            // Si no hay nada, empezar desde 1; si hay datos, continuar desde max+1
            $inicio = $maxEnBD === 0 ? 1 : $maxEnBD + 1;
            $limiteSuperior = $inicio + 99; // Máx 100 por rango

            $consecutivosFallidos = 0;
            $maxConsecutivos      = 5;

            for ($numero = $inicio; $numero <= $limiteSuperior; $numero++) {
                $totales['total']++;

                $resultado = $this->sincronizarGuia($tipo, $serie, $numero, $empresaId);

                if ($resultado['success']) {
                    $consecutivosFallidos = 0;
                    $totales['exitosos']++;
                    if ($resultado['accion'] === 'creado') {
                        $totales['creados']++;
                    } else {
                        $totales['actualizados']++;
                    }
                } elseif (! empty($resultado['no_encontrado'])) {
                    $consecutivosFallidos++;
                    $totales['no_encontrados']++;
                    if ($consecutivosFallidos >= $maxConsecutivos) {
                        break; // Parar al encontrar 5 seguidos sin resultado
                    }
                } else {
                    // Error inesperado: también contar como fallo para evitar loops infinitos
                    $consecutivosFallidos++;
                    $totales['errores']++;
                    if ($consecutivosFallidos >= $maxConsecutivos) {
                        break;
                    }
                }

                usleep(200000); // 0.2 s — respetar límites de la API
            }
        }

        return $totales;
    }

    /**
     * Enriquecer una guía descargando y parseando su XML GRE (DespatchAdvice UBL 2.1).
     * Extrae destinatario, transportista, conductor, vehículo, puntos de traslado, etc.
     */
    public function enriquecerGuiaDesdeXml(GuiaRemision $guia): void
    {
        if (! $guia->nubefact_xml_url) {
            throw new Exception("La guía {$guia->serie}-{$guia->numero} no tiene URL de XML");
        }

        $xmlContent = @file_get_contents($guia->nubefact_xml_url);
        if (! $xmlContent) {
            throw new Exception("No se pudo descargar el XML de la guía {$guia->serie}-{$guia->numero}");
        }

        $doc = new \DOMDocument();
        @$doc->loadXML($xmlContent);
        $xpath = new \DOMXPath($doc);

        // Namespaces del DespatchAdvice UBL 2.1
        $xpath->registerNamespace('cac', 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2');
        $xpath->registerNamespace('cbc', 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2');
        $xpath->registerNamespace('da',  'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2');

        DB::beginTransaction();
        try {
            // ── Fecha inicio traslado ──────────────────────────────────────────
            $fechaTraslado = $xpath->evaluate('string(//cbc:IssueDate)');
            if ($fechaTraslado && $guia->fecha_inicio_traslado == $guia->fecha_emision) {
                // solo sobreescribir si era el placeholder igual a fecha_emision
                $guia->fecha_inicio_traslado = $fechaTraslado;
            }

            // ── Destinatario ───────────────────────────────────────────────────
            $destTipoDoc = $xpath->evaluate('string(//cac:DeliveryCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID/@schemeID)');
            $destNumDoc  = $xpath->evaluate('string(//cac:DeliveryCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID)');
            $destNombre  = $xpath->evaluate('string(//cac:DeliveryCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName)');
            if (! $destNombre) {
                $destNombre = $xpath->evaluate('string(//cac:DeliveryCustomerParty/cac:Party/cac:PartyName/cbc:Name)');
            }

            if ($destNumDoc) {
                $guia->destinatario_tipo_documento  = $destTipoDoc ?: '6';
                $guia->destinatario_numero_documento = $destNumDoc;
            }
            if ($destNombre && $guia->cliente_denominacion === 'SINCRONIZADO DESDE NUBEFACT') {
                $guia->destinatario_denominacion = $destNombre;
                $guia->cliente_denominacion      = $destNombre;
            } elseif ($destNombre && empty($guia->destinatario_denominacion)) {
                $guia->destinatario_denominacion = $destNombre;
            }

            // ── Transportista ──────────────────────────────────────────────────
            $transTipoDoc = $xpath->evaluate('string(//cac:CarrierParty/cac:PartyIdentification/cbc:ID/@schemeID)');
            $transNumDoc  = $xpath->evaluate('string(//cac:CarrierParty/cac:PartyIdentification/cbc:ID)');
            $transNombre  = $xpath->evaluate('string(//cac:CarrierParty/cac:PartyLegalEntity/cbc:RegistrationName)');
            if (! $transNombre) {
                $transNombre = $xpath->evaluate('string(//cac:CarrierParty/cac:PartyName/cbc:Name)');
            }

            if ($transNumDoc) {
                $guia->transportista_tipo_documento  = $transTipoDoc ?: '6';
                $guia->transportista_numero_documento = $transNumDoc;
            }
            if ($transNombre) {
                $guia->transportista_denominacion = $transNombre;
            }

            // ── Motivo de traslado y tipo de transporte ────────────────────────
            $motivoCodigo = $xpath->evaluate('string(//cac:Shipment/cbc:HandlingCode)');
            if ($motivoCodigo && $guia->motivo_traslado === '01') {
                $guia->motivo_traslado = $motivoCodigo;
            }

            // Tipo transporte: 01=Público, 02=Privado
            $tipoTransp = $xpath->evaluate('string(//cac:Shipment/cac:ShipmentStage/cac:TransportMeans/cac:RoadTransport/cbc:LicensePlateID)');
            if ($tipoTransp) {
                $guia->tipo_transporte = '02'; // privado si hay vehículo propio
            }

            // ── Peso bruto y bultos ────────────────────────────────────────────
            $peso = $xpath->evaluate('string(//cac:Shipment/cac:GrossWeightMeasure)');
            $pesoUnidad = $xpath->evaluate('string(//cac:Shipment/cac:GrossWeightMeasure/@unitCode)');
            if ($peso && $guia->peso_bruto_total == 0) {
                $guia->peso_bruto_total  = (float) $peso;
                $guia->peso_bruto_unidad = $pesoUnidad ?: 'KGM';
            }

            $bultos = $xpath->evaluate('string(//cac:Shipment/cac:TotalTransportHandlingUnitQuantity)');
            if ($bultos && ! $guia->numero_bultos) {
                $guia->numero_bultos = (int) $bultos;
            }

            // ── Vehículo ───────────────────────────────────────────────────────
            $placa = $xpath->evaluate('string(//cac:Shipment/cac:ShipmentStage/cac:TransportMeans/cac:RoadTransport/cbc:LicensePlateID)');
            if ($placa && ! $guia->vehiculo_placa) {
                $guia->vehiculo_placa = strtoupper(trim($placa));
            }

            // ── Conductor ──────────────────────────────────────────────────────
            $condNombre    = $xpath->evaluate('string(//cac:Shipment/cac:ShipmentStage/cac:DriverPerson/cbc:FirstName)');
            $condApellidos = $xpath->evaluate('string(//cac:Shipment/cac:ShipmentStage/cac:DriverPerson/cbc:FamilyName)');
            $condDni       = $xpath->evaluate('string(//cac:Shipment/cac:ShipmentStage/cac:DriverPerson/cac:IdentityDocumentReference/cbc:ID)');
            $condLicencia  = $xpath->evaluate('string(//cac:Shipment/cac:ShipmentStage/cac:DriverPerson/cbc:JobTitle)');

            if ($condNombre && ! $guia->conductor_nombre) {
                $guia->conductor_nombre    = $condNombre;
                $guia->conductor_apellidos = $condApellidos ?: null;
            }
            if ($condDni && ! $guia->conductor_numero_documento) {
                $guia->conductor_tipo_documento  = '1'; // DNI
                $guia->conductor_numero_documento = $condDni;
            }
            if ($condLicencia && ! $guia->conductor_licencia) {
                $guia->conductor_licencia = $condLicencia;
            }

            // ── Punto de partida ───────────────────────────────────────────────
            $ubigeoPartida = $xpath->evaluate(
                'string(//cac:Shipment/cac:TransportHandlingUnit/cac:TransshipmentLocation/cbc:ID)'
            );
            $dirPartida = $xpath->evaluate(
                'string(//cac:Shipment/cac:TransportHandlingUnit/cac:TransshipmentLocation/cac:Address/cac:AddressLine/cbc:Line)'
            );

            if ($ubigeoPartida && ! $guia->punto_partida_ubigeo) {
                $guia->punto_partida_ubigeo = $ubigeoPartida;
            }
            if ($dirPartida && ! $guia->punto_partida_direccion) {
                $guia->punto_partida_direccion = $dirPartida;
            }

            // ── Punto de llegada ───────────────────────────────────────────────
            $ubigeoLlegada = $xpath->evaluate(
                'string(//cac:Shipment/cac:Delivery/cac:DeliveryAddress/cbc:ID)'
            );
            $dirLlegada = $xpath->evaluate(
                'string(//cac:Shipment/cac:Delivery/cac:DeliveryAddress/cac:AddressLine/cbc:Line)'
            );
            // Fallback: FirstArrivalPortLocation
            if (! $ubigeoLlegada) {
                $ubigeoLlegada = $xpath->evaluate('string(//cac:Shipment/cac:FirstArrivalPortLocation/cbc:ID)');
            }

            if ($ubigeoLlegada && ! $guia->punto_llegada_ubigeo) {
                $guia->punto_llegada_ubigeo = $ubigeoLlegada;
            }
            if ($dirLlegada && ! $guia->punto_llegada_direccion) {
                $guia->punto_llegada_direccion = $dirLlegada;
            }

            $guia->save();
            DB::commit();

        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Sincronizar una guía de remisión específica desde NubeFact.
     *
     * @param  int  $tipo  7=GRE Remitente, 8=GRE Transportista
     * @param  string  $serie  Serie de la guía (T001, V001, etc.)
     * @param  int  $numero  Número correlativo
     * @param  int|null  $empresaId  ID de empresa
     * @return array Resultado de la sincronización
     */
    public function sincronizarGuia(int $tipo, string $serie, int $numero, ?int $empresaId = null): array
    {
        try {
            $response = $this->client->consultarGuia($tipo, $serie, $numero);

            if (!$empresaId) {
                $empresaId = Empresa::first()?->id;
                if (!$empresaId) {
                    throw new Exception('No hay empresas registradas en el sistema');
                }
            }

            // Buscar registro local
            $guia = GuiaRemision::where('tipo_comprobante', $tipo)
                ->where('serie', $serie)
                ->where('numero', $numero)
                ->first();

            $aceptada = $response['aceptada_por_sunat'] ?? false;

            if ($guia) {
                // Actualizar campos NubeFact en la guía existente
                $guia->update([
                    'nubefact_aceptada_por_sunat' => $aceptada,
                    'nubefact_enlace'              => $response['enlace'] ?? $guia->nubefact_enlace,
                    'nubefact_pdf_url'             => $response['enlace_del_pdf'] ?? $guia->nubefact_pdf_url,
                    'nubefact_xml_url'             => $response['enlace_del_xml'] ?? $guia->nubefact_xml_url,
                    'nubefact_cdr_url'             => $response['enlace_del_cdr'] ?? $guia->nubefact_cdr_url,
                    'nubefact_cadena_qr'           => $response['cadena_para_codigo_qr'] ?? $guia->nubefact_cadena_qr,
                    'nubefact_consultado_at'       => now(),
                ]);

                // Enriquecer con datos del XML si la guía fue aceptada y tiene XML
                if ($aceptada && $guia->nubefact_xml_url) {
                    try {
                        $this->enriquecerGuiaDesdeXml($guia->fresh());
                    } catch (Exception $e) {
                        Log::warning("No se pudo enriquecer XML guía {$serie}-{$numero}: {$e->getMessage()}");
                    }
                }

                return [
                    'success' => true,
                    'accion'  => 'actualizado',
                    'guia'    => $guia->fresh(),
                ];
            }

            // No existe localmente: crear registro mínimo con datos de NubeFact
            $hoy = now()->toDateString();
            $xmlUrl = $response['enlace_del_xml'] ?? null;
            $guia = GuiaRemision::create([
                'empresa_id'                   => $empresaId,
                'tipo_comprobante'             => $tipo,
                'serie'                        => $serie,
                'numero'                       => $numero,
                'cliente_tipo_documento'       => '6',
                'cliente_numero_documento'     => '',
                'cliente_denominacion'         => 'SINCRONIZADO DESDE NUBEFACT',
                'cliente_direccion'            => '',
                'fecha_emision'                => $hoy,
                'fecha_inicio_traslado'        => $hoy,
                'motivo_traslado'              => '01',
                'tipo_transporte'              => '02',
                'peso_bruto_total'             => 0,
                'peso_bruto_unidad'            => 'KGM',
                'vehiculo_placa'               => '',
                'punto_partida_ubigeo'         => '',
                'punto_partida_direccion'      => '',
                'punto_llegada_ubigeo'         => '',
                'punto_llegada_direccion'      => '',
                'nubefact_aceptada_por_sunat'  => $aceptada,
                'nubefact_enlace'              => $response['enlace'] ?? null,
                'nubefact_pdf_url'             => $response['enlace_del_pdf'] ?? null,
                'nubefact_xml_url'             => $xmlUrl,
                'nubefact_cdr_url'             => $response['enlace_del_cdr'] ?? null,
                'nubefact_cadena_qr'           => $response['cadena_para_codigo_qr'] ?? null,
                'nubefact_enviado_at'          => now(),
                'nubefact_consultado_at'       => now(),
            ]);

            // Enriquecer inmediatamente con datos del XML si está disponible
            if ($xmlUrl) {
                try {
                    $this->enriquecerGuiaDesdeXml($guia);
                } catch (Exception $e) {
                    Log::warning("No se pudo enriquecer XML guía nueva {$serie}-{$numero}: {$e->getMessage()}");
                }
            }

            return [
                'success' => true,
                'accion'  => 'creado',
                'guia'    => $guia->fresh(),
            ];

        } catch (Exception $e) {
            // NubeFact devuelve código 24 / "Documento no existe" para guías inexistentes
            $noEncontrado = str_contains($e->getMessage(), '404')
                || str_contains($e->getMessage(), 'no encontrado')
                || str_contains($e->getMessage(), 'No se encontró')
                || str_contains($e->getMessage(), 'Documento no existe')
                || str_contains($e->getMessage(), '"codigo":24');

            Log::warning("Error al sincronizar guía {$tipo}/{$serie}/{$numero}: {$e->getMessage()}");

            return [
                'success'       => false,
                'no_encontrado' => $noEncontrado,
                'error'         => $e->getMessage(),
            ];
        }
    }

    /**
     * Sincronizar un rango de guías de remisión desde NubeFact.
     *
     * @param  int  $tipo  7=GRE Remitente, 8=GRE Transportista
     * @param  string  $serie  Serie de la guía
     * @param  int  $inicio  Número inicial
     * @param  int  $fin  Número final
     * @param  int|null  $empresaId  ID de empresa
     * @return array Estadísticas de sincronización
     */
    public function sincronizarRangoGuias(int $tipo, string $serie, int $inicio, int $fin, ?int $empresaId = null): array
    {
        $resultados = [
            'total'          => 0,
            'exitosos'       => 0,
            'errores'        => 0,
            'creados'        => 0,
            'actualizados'   => 0,
            'no_encontrados' => 0,
            'detalles'       => [],
        ];

        for ($numero = $inicio; $numero <= $fin; $numero++) {
            $resultados['total']++;

            try {
                $resultado = $this->sincronizarGuia($tipo, $serie, $numero, $empresaId);

                if ($resultado['success']) {
                    $resultados['exitosos']++;
                    if ($resultado['accion'] === 'creado') {
                        $resultados['creados']++;
                    } else {
                        $resultados['actualizados']++;
                    }
                } elseif (!empty($resultado['no_encontrado'])) {
                    $resultados['no_encontrados']++;
                } else {
                    $resultados['errores']++;
                }

                $resultados['detalles'][] = [
                    'numero'    => $numero,
                    'resultado' => $resultado,
                ];

                usleep(200000); // 0.2 segundos para no saturar la API

            } catch (Exception $e) {
                $resultados['errores']++;
                $resultados['detalles'][] = [
                    'numero' => $numero,
                    'error'  => $e->getMessage(),
                ];
            }
        }

        return $resultados;
    }
}
