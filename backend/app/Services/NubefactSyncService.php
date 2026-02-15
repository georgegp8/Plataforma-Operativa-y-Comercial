<?php

namespace App\Services;

use App\Models\Comprobante;
use App\Models\ComprobanteItem;
use App\Models\Empresa;
use App\Models\Entidad;
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

            // Estado basado en aceptación SUNAT
            $comprobante->estado_sunat = ($response['aceptada_por_sunat'] ?? false) ? 'aceptado' : 'pendiente';
            $comprobante->anulado = $response['anulado'] ?? false;
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

        // Estado basado en aceptación SUNAT
        $comprobante->estado_sunat = ($response['aceptada_por_sunat'] ?? false) ? 'aceptado' : 'pendiente';
        $comprobante->codigo_sunat = $response['sunat_responsecode'] ?? null;
        $comprobante->mensaje_sunat = $response['sunat_description'] ?? null;

        // IMPORTANTE: Actualizar campo anulado desde la API
        if (isset($response['anulado'])) {
            $comprobante->anulado = $response['anulado'];
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
}
