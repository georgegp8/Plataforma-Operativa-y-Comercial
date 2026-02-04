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

            // Buscar o crear comprobante en BD
            $comprobante = Comprobante::where([
                'tipo_doc' => $tipoDoc,
                'serie' => $serie,
                'correlativo' => $numero,
            ])->first();

            if (! $comprobante) {
                // Si no existe, crear desde datos de NubeFact
                $comprobante = $this->crearComprobanteDesdeNubefact($response, $tipoDoc, $serie, $numero, $empresaId);
                $accion = 'creado';
            } else {
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
            Log::error("Error al sincronizar comprobante {$serie}-{$numero}: ".$e->getMessage());

            return [
                'success' => false,
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

            // Crear comprobante básico
            $comprobante = new Comprobante;
            $comprobante->empresa_id = $empresaId;
            $comprobante->tipo_doc = $tipoDoc;
            $comprobante->serie = $serie;
            $comprobante->correlativo = $numero;

            // Extraer datos del cliente desde la respuesta
            $comprobante->cliente_tipo_doc = $response['cliente_tipo_de_documento'] ?? '6';
            $comprobante->cliente_num_doc = $response['cliente_numero_de_documento'] ?? '';
            $comprobante->cliente_razon_social = $response['cliente_denominacion'] ?? '';
            $comprobante->cliente_direccion = $response['cliente_direccion'] ?? null;
            $comprobante->cliente_email = $response['cliente_email'] ?? null;

            // Fechas
            $comprobante->fecha_emision = $this->convertirFechaNubefact($response['fecha_de_emision'] ?? null);
            $comprobante->fecha_vencimiento = $this->convertirFechaNubefact($response['fecha_de_vencimiento'] ?? null);

            // Montos
            $comprobante->moneda = $this->mapearMoneda($response['codigo_tipo_moneda'] ?? '1');
            $comprobante->tipo_cambio = $response['tipo_de_cambio'] ?? null;
            $comprobante->mto_oper_gravadas = $response['total_gravada'] ?? 0;
            $comprobante->mto_oper_exoneradas = $response['total_exonerada'] ?? 0;
            $comprobante->mto_oper_inafectas = $response['total_inafecta'] ?? 0;
            $comprobante->mto_igv = $response['total_igv'] ?? 0;
            $comprobante->mto_imp_venta = $response['total'] ?? 0;

            // Estado
            $comprobante->estado_sunat = $response['sunat_description'] ?? 'pendiente';
            $comprobante->pagado = ($response['pagado'] ?? 'NO') === 'SI';

            // Campos NubeFact
            $this->actualizarCamposNubefact($comprobante, $response);

            $comprobante->save();

            // Sincronizar entidad/cliente si hay datos
            if (! empty($response['cliente_numero_de_documento'])) {
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
     */
    protected function actualizarCamposNubefact(Comprobante $comprobante, array $response): void
    {
        $comprobante->nubefact_enlace = $response['enlace'] ?? $comprobante->nubefact_enlace;
        $comprobante->nubefact_aceptada_por_sunat = $response['aceptada_por_sunat'] ?? false;
        $comprobante->nubefact_sunat_ticket = $response['sunat_ticket'] ?? null;
        $comprobante->nubefact_pdf_url = $response['pdf_url'] ?? null;
        $comprobante->nubefact_xml_url = $response['xml_url'] ?? null;
        $comprobante->nubefact_cdr_url = $response['cdr_url'] ?? null;
        $comprobante->nubefact_cadena_qr = $response['cadena_para_codigo_qr'] ?? null;
        $comprobante->nubefact_codigo_hash = $response['codigo_hash'] ?? null;
        $comprobante->nubefact_codigo_barras = $response['codigo_de_barras'] ?? null;
        $comprobante->nubefact_response_json = json_encode($response);
        $comprobante->nubefact_consultado_at = now();

        // Actualizar estado
        if (! empty($response['sunat_description'])) {
            $comprobante->estado_sunat = $response['sunat_description'];
        }

        $comprobante->save();
    }

    /**
     * Sincronizar entidad/cliente desde datos de NubeFact
     * Crea o actualiza la entidad en la tabla entidades
     */
    protected function sincronizarEntidadDesdeNubefact(Comprobante $comprobante, array $response, int $empresaId): void
    {
        $numDoc = $response['cliente_numero_de_documento'] ?? null;

        if (! $numDoc) {
            return;
        }

        $tipoDoc = $response['cliente_tipo_de_documento'] ?? '6';
        $denominacion = $response['cliente_denominacion'] ?? '';
        $direccion = $response['cliente_direccion'] ?? null;
        $email = $response['cliente_email'] ?? null;

        // Buscar o crear entidad
        $entidad = Entidad::updateOrCreate(
            [
                'empresa_id' => $empresaId,
                'num_doc' => $numDoc,
            ],
            [
                'tipo_doc' => $tipoDoc,
                'denominacion' => $denominacion,
                'direccion' => $direccion ?: null,
                'email' => $email ?: null,
                'es_cliente' => true,
            ]
        );

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
        foreach ($items as $itemData) {
            // Crear item del comprobante
            $item = new ComprobanteItem;
            $item->comprobante_id = $comprobante->id;
            $item->unidad_medida = $itemData['unidad_de_medida'] ?? 'NIU';
            $item->codigo = $itemData['codigo'] ?? null;
            $item->descripcion = $itemData['descripcion'] ?? '';
            $item->cantidad = $itemData['cantidad'] ?? 1;
            $item->mto_valor_unitario = $itemData['valor_unitario'] ?? 0;
            $item->mto_precio_unitario = $itemData['precio_unitario'] ?? 0;
            $item->descuento = $itemData['descuento'] ?? 0;
            $item->subtotal = $itemData['subtotal'] ?? 0;
            $item->tipo_igv = $itemData['tipo_de_igv'] ?? '10';
            $item->igv = $itemData['igv'] ?? 0;
            $item->total = $itemData['total'] ?? 0;
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
}
