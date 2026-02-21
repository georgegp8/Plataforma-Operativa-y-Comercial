<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alerta;
use App\Models\Compra;
use App\Models\Comprobante;
use App\Models\Empresa;
use App\Models\Entidad;
use App\Models\Oportunidad;
use App\Models\Producto;
use App\Services\SlaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    protected $slaService;

    public function __construct(SlaService $slaService)
    {
        $this->slaService = $slaService;
    }

    /**
     * Dashboard principal
     */
    public function index(Request $request): JsonResponse
    {
        $empresaId = $request->get('empresa_id');
        $fechaDesde = $request->get('fecha_desde');
        $fechaHasta = $request->get('fecha_hasta');
        $clienteNumDoc = $request->get('cliente_num_doc');

        // Estadísticas de facturación
        $facturacion = $this->estadisticasFacturacion($empresaId, $fechaDesde, $fechaHasta, $clienteNumDoc);

        // Estadísticas de oportunidades
        $oportunidades = $this->estadisticasOportunidades($empresaId);

        // SLA
        $sla = $this->slaService->resumenSlas();

        // Alertas
        $alertas = $this->estadisticasAlertas();

        // Clientes (a partir de comprobantes reales)
        $clientes = $this->estadisticasClientes($empresaId, $fechaDesde, $fechaHasta, $clienteNumDoc);

        return response()->json([
            'success' => true,
            'data' => [
                'facturacion' => $facturacion,
                'oportunidades' => $oportunidades,
                'sla' => $sla,
                'alertas' => $alertas,
                'clientes' => $clientes,
            ],
        ]);
    }

    /**
     * Estadísticas de facturación
     * Optimización: Una sola query con agregaciones condicionales (reduce N+1)
     */
    private function estadisticasFacturacion($empresaId = null, $fechaDesde = null, $fechaHasta = null, $clienteNumDoc = null): array
    {
        // PostgreSQL Best Practice: Single aggregated query instead of multiple clones
        $stats = Comprobante::selectRaw("
            COALESCE(SUM(mto_imp_venta), 0) as total_mes,
            COUNT(CASE WHEN estado_sunat = 'aceptado' THEN 1 END) as total_aceptados,
            COUNT(CASE WHEN estado_sunat = 'rechazado' THEN 1 END) as total_rechazados,
            COUNT(CASE WHEN estado_sunat = 'pendiente' THEN 1 END) as total_pendientes
        ")
            ->when($empresaId, fn ($q) => $q->where('empresa_id', $empresaId))
            ->when($clienteNumDoc, fn ($q) => $q->where('cliente_num_doc', 'like', "%{$clienteNumDoc}%"))
            ->when($fechaDesde, fn ($q) => $q->whereDate('fecha_emision', '>=', $fechaDesde))
            ->when($fechaHasta, fn ($q) => $q->whereDate('fecha_emision', '<=', $fechaHasta))
            ->first();

        $totalMes = $stats->total_mes ?? 0;
        $totalAceptados = $stats->total_aceptados ?? 0;
        $totalRechazados = $stats->total_rechazados ?? 0;
        $totalPendientes = $stats->total_pendientes ?? 0;

        $porTipo = Comprobante::selectRaw('tipo_doc, count(*) as cantidad, sum(mto_imp_venta) as total')
            ->when($empresaId, fn ($q) => $q->where('empresa_id', $empresaId))
            ->when($clienteNumDoc, fn ($q) => $q->where('cliente_num_doc', 'like', "%{$clienteNumDoc}%"))
            ->when($fechaDesde, fn ($q) => $q->whereDate('fecha_emision', '>=', $fechaDesde))
            ->when($fechaHasta, fn ($q) => $q->whereDate('fecha_emision', '<=', $fechaHasta))
            ->groupBy('tipo_doc')
            ->get()
            ->mapWithKeys(fn ($item) => [$item->tipo_doc => [
                'cantidad' => $item->cantidad,
                'total' => $item->total,
            ]]);

        return [
            'total_mes' => $totalMes,
            'total_aceptados' => $totalAceptados,
            'total_rechazados' => $totalRechazados,
            'total_pendientes' => $totalPendientes,
            'por_tipo' => $porTipo,
        ];
    }

    /**
     * Estadísticas de oportunidades
     */
    private function estadisticasOportunidades($empresaId = null): array
    {
        $query = Oportunidad::query();

        if ($empresaId) {
            $query->where('empresa_id', $empresaId);
        }

        return [
            'total' => $query->count(),
            'activas' => $query->whereNotIn('estado', ['ganado', 'perdido', 'cancelado'])->count(),
            'ganadas' => $query->where('estado', 'ganado')->count(),
            'perdidas' => $query->where('estado', 'perdido')->count(),
            'monto_total' => $query->sum('monto_estimado'),
            'monto_ganado' => $query->where('estado', 'ganado')->sum('monto_estimado'),
            'por_estado' => Oportunidad::selectRaw('estado, count(*) as cantidad')
                ->when($empresaId, fn ($q) => $q->where('empresa_id', $empresaId))
                ->groupBy('estado')
                ->get()
                ->pluck('cantidad', 'estado'),
        ];
    }

    /**
     * Estadísticas de alertas
     */
    private function estadisticasAlertas(): array
    {
        return [
            'total_no_leidas' => Alerta::where('leido', false)->count(),
            'por_prioridad' => Alerta::selectRaw('prioridad, count(*) as cantidad')
                ->where('leido', false)
                ->groupBy('prioridad')
                ->get()
                ->pluck('cantidad', 'prioridad'),
        ];
    }

    /**
     * Estadísticas de clientes basadas en comprobantes y entidades
     */
    private function estadisticasClientes($empresaId = null, $fechaDesde = null, $fechaHasta = null, $clienteNumDoc = null): array
    {
        $query = Comprobante::query();

        if ($empresaId) {
            $query->where('empresa_id', $empresaId);
        }

        if ($clienteNumDoc) {
            $query->where('cliente_num_doc', 'like', "%{$clienteNumDoc}%");
        }

        if ($fechaDesde) {
            $query->whereDate('fecha_emision', '>=', $fechaDesde);
        }

        if ($fechaHasta) {
            $query->whereDate('fecha_emision', '<=', $fechaHasta);
        }

        // Top clientes según facturación real (a partir de comprobantes)
        $clientes = $query
            ->selectRaw('cliente_tipo_doc, cliente_num_doc, cliente_razon_social, COUNT(*) as cantidad, SUM(mto_imp_venta) as total')
            ->groupBy('cliente_tipo_doc', 'cliente_num_doc', 'cliente_razon_social')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        // Total de clientes/proveedores registrados en la tabla entidades
        $entidadesQuery = Entidad::query();

        if ($empresaId) {
            $entidadesQuery->where('empresa_id', $empresaId);
        }

        $totalRegistros = $entidadesQuery
            ->where(function ($q) {
                $q->where('es_cliente', true)
                    ->orWhere('es_proveedor', true);
            })
            ->count();

        return [
            'total_clientes' => $totalRegistros,
            'top_clientes' => $clientes,
        ];
    }

    /**
     * Dashboard para TV (modo lectura)
     */
    public function tv(): JsonResponse
    {
        $facturacion = $this->estadisticasFacturacion();
        $oportunidades = $this->estadisticasOportunidades();
        $sla = $this->slaService->resumenSlas();

        // Últimas facturas emitidas
        // Best Practice: Select only needed columns, use index on created_at
        $ultimasFacturas = Comprobante::with('empresa:id,razon_social') // Specify empresa columns
            ->select('id', 'empresa_id', 'tipo_doc', 'serie', 'correlativo', 'cliente_razon_social', 'mto_imp_venta', 'estado_sunat', 'created_at')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Oportunidades próximas a vencer
        // No existe columna cliente_nombre en la tabla; usamos titulo como identificador visible
        $proximasVencer = Oportunidad::where('fecha_vencimiento', '>', now())
            ->where('fecha_vencimiento', '<=', now()->addDays(7))
            ->whereNotIn('estado', ['ganado', 'perdido', 'cancelado'])
            ->orderBy('fecha_vencimiento')
            ->limit(5)
            ->get(['id', 'titulo', 'estado', 'fecha_vencimiento', 'monto_estimado']);

        return response()->json([
            'success' => true,
            'data' => [
                'facturacion' => $facturacion,
                'oportunidades' => $oportunidades,
                'sla' => $sla,
                'ultimas_facturas' => $ultimasFacturas,
                'proximas_vencer' => $proximasVencer,
            ],
        ]);
    }

    /**
     * Ventas por mes (últimos 12 meses)
     */
    public function ventasPorMes(Request $request): JsonResponse
    {
        $empresaId = $request->get('empresa_id');
        $fechaDesde = $request->get('fecha_desde');
        $fechaHasta = $request->get('fecha_hasta');
        $clienteNumDoc = $request->get('cliente_num_doc');

        // PostgreSQL: usamos TO_CHAR para agrupar por año-mes
        $ventas = Comprobante::selectRaw("
            TO_CHAR(fecha_emision, 'YYYY-MM') as mes,
            SUM(mto_imp_venta) as total,
            COUNT(*) as cantidad
            ")
            ->when($empresaId, fn ($q) => $q->where('empresa_id', $empresaId))
            ->when($clienteNumDoc, fn ($q) => $q->where('cliente_num_doc', 'like', "%{$clienteNumDoc}%"))
            ->when($fechaDesde, fn ($q) => $q->whereDate('fecha_emision', '>=', $fechaDesde))
            ->when($fechaHasta, fn ($q) => $q->whereDate('fecha_emision', '<=', $fechaHasta))
            ->when(! $fechaDesde && ! $fechaHasta, fn ($q) => $q->where('fecha_emision', '>=', now()->subMonths(12)))
            ->where('estado_sunat', 'aceptado')
            ->groupBy('mes')
            ->orderBy('mes')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $ventas,
        ]);
    }

    /**
     * Dashboard Section 1: Stats con filtros
     * GET /api/dashboard/stats?establecimiento=1&periodo=POR_FECHA&fecha_del=2026-01-15&fecha_hasta=2026-02-15
     */
    public function getStats(Request $request): JsonResponse
    {
        $establecimiento = $request->get('establecimiento', '1');
        $periodo = $request->get('periodo', 'ESTE_MES');
        $fechaDel = $request->get('fecha_del', now()->format('Y-m-d'));
        $fechaHasta = $request->get('fecha_hasta', null);

        // Calcular fecha_hasta según período o usar la proporcionada
        if (! $fechaHasta) {
            $fechaHasta = $this->calcularFechaHasta($periodo, $fechaDel);
        }

        // PostgreSQL Best Practice: Single aggregated query with conditional sums
        // Avoid loading all records into memory then filtering in PHP
        $stats = Comprobante::selectRaw("
            COUNT(*) as cpe_emitidos,
            COALESCE(SUM(CASE WHEN tipo_doc IN ('01', '07', '08') THEN mto_imp_venta ELSE 0 END), 0) as total_cpe,
            COALESCE(SUM(CASE WHEN tipo_doc IN ('01', '07', '08') AND pagado = true THEN mto_imp_venta ELSE 0 END), 0) as cpe_pagado,
            COALESCE(SUM(CASE WHEN tipo_doc IN ('01', '07', '08') AND (pagado = false OR pagado IS NULL) THEN mto_imp_venta ELSE 0 END), 0) as cpe_por_pagar,
            COALESCE(SUM(CASE WHEN tipo_doc = '03' THEN mto_imp_venta ELSE 0 END), 0) as total_boletas,
            COALESCE(SUM(CASE WHEN tipo_doc = '03' AND pagado = true THEN mto_imp_venta ELSE 0 END), 0) as boletas_pagado,
            COALESCE(SUM(CASE WHEN tipo_doc = '03' AND (pagado = false OR pagado IS NULL) THEN mto_imp_venta ELSE 0 END), 0) as boletas_por_pagar,
            COALESCE(SUM(mto_imp_venta), 0) as ingresos
        ")
            ->whereIn('tipo_doc', ['01', '03', '07', '08'])
            ->whereDate('fecha_emision', '>=', $fechaDel)
            ->whereDate('fecha_emision', '<=', $fechaHasta)
            ->where('estado_sunat', 'aceptado')
            ->where(function ($q) {
                $q->whereNull('anulado')
                    ->orWhere('anulado', false);
            })
            ->first();

        $cpeEmitidos = $stats->cpe_emitidos;
        $totalCPE = $stats->total_cpe;
        $cpePagado = $stats->cpe_pagado;
        $cpePorPagar = $stats->cpe_por_pagar;
        $totalBoletas = $stats->total_boletas;
        $boletasPagado = $stats->boletas_pagado;
        $boletasPorPagar = $stats->boletas_por_pagar;
        $ingresos = $stats->ingresos;
        $egresos = 0; // TODO: implementar cuando exista módulo de compras
        $utilidadNeta = $ingresos - $egresos;

        // Ventas por hora (para gráfico)
        $ventasPorHora = $this->getVentasPorHora($fechaDel, $fechaHasta);

        return response()->json([
            'cpeEmitidos' => $cpeEmitidos,
            'totalCPE' => round($totalCPE, 2),
            'cpePagado' => round($cpePagado, 2),
            'cpePorPagar' => round($cpePorPagar, 2),
            'cpeTotal' => round($totalCPE, 2),
            'totalBoletas' => round($totalBoletas, 2),
            'boletasPagado' => round($boletasPagado, 2),
            'boletasPorPagar' => round($boletasPorPagar, 2),
            'boletasTotal' => round($totalBoletas, 2),
            'montoTotalGeneral' => round($ingresos, 2),
            'utilidadNeta' => round($utilidadNeta, 2),
            'ventasPorHora' => $ventasPorHora,
        ]);
    }

    /**
     * Calcular fecha_hasta según el período seleccionado
     */
    private function calcularFechaHasta(string $periodo, string $fechaDel): string
    {
        $fecha = \Carbon\Carbon::parse($fechaDel);

        switch ($periodo) {
            case 'HOY':
                return $fecha->format('Y-m-d');
            case 'ESTA_SEMANA':
                return $fecha->copy()->endOfWeek()->format('Y-m-d');
            case 'ESTE_MES':
                return $fecha->copy()->endOfMonth()->format('Y-m-d');
            case 'ESTE_AÑO':
                return $fecha->copy()->endOfYear()->format('Y-m-d');
            case 'COMPLETO':
                // Para "COMPLETO", usar fecha actual como límite superior
                return now()->format('Y-m-d');
            case 'POR_FECHA':
            default:
                // Por defecto, si es POR_FECHA, usar 30 días desde fecha_del
                return $fecha->copy()->addDays(30)->format('Y-m-d');
        }
    }

    /**
     * Obtener ventas por hora del período
     */
    private function getVentasPorHora(string $fechaDel, string $fechaHasta): array
    {
        // Generar array de 24 horas con total = 0
        $ventasPorHora = [];
        for ($hora = 0; $hora < 24; $hora++) {
            $ventasPorHora[] = [
                'hora' => str_pad($hora, 2, '0', STR_PAD_LEFT).'h',
                'total' => 0,
            ];
        }

        // Consultar ventas agrupadas por hora
        $ventas = Comprobante::selectRaw('
            EXTRACT(HOUR FROM fecha_emision) as hora,
            SUM(mto_imp_venta) as total
            ')
            ->whereDate('fecha_emision', '>=', $fechaDel)
            ->whereDate('fecha_emision', '<=', $fechaHasta)
            ->where('estado_sunat', 'aceptado')
            ->where(function ($q) {
                $q->whereNull('anulado')
                    ->orWhere('anulado', false);
            })
            ->groupBy('hora')
            ->orderBy('hora')
            ->get();

        // Actualizar valores reales
        foreach ($ventas as $venta) {
            $horaIndex = (int) $venta->hora;
            if ($horaIndex >= 0 && $horaIndex < 24) {
                $ventasPorHora[$horaIndex]['total'] = round($venta->total, 2);
            }
        }

        return $ventasPorHora;
    }

    /**
     * Dashboard Section 2: Ranking de CPE por establecimiento
     * GET /api/dashboard/cpe-ranking?establecimiento=1&periodo=ESTE_AÑO&fecha_del=2026-01-01&fecha_hasta=2026-12-31
     */
    public function getCPERanking(Request $request): JsonResponse
    {
        $establecimiento = $request->get('establecimiento', '1');
        $periodo = $request->get('periodo', 'ESTE_MES');
        $fechaDel = $request->get('fecha_del', now()->format('Y-m-d'));
        $fechaHasta = $request->get('fecha_hasta', null);

        // Calcular fecha_hasta según período o usar la proporcionada
        if (! $fechaHasta) {
            $fechaHasta = $this->calcularFechaHasta($periodo, $fechaDel);
        }

        // Obtener ranking de CPE por tipo de comprobante
        $rankingData = Comprobante::selectRaw('
            tipo_doc,
            COUNT(*) as value
        ')
            ->whereIn('tipo_doc', ['01', '03', '07', '08'])
            ->whereDate('fecha_emision', '>=', $fechaDel)
            ->whereDate('fecha_emision', '<=', $fechaHasta)
            ->where('estado_sunat', 'aceptado')
            ->where(function ($q) {
                $q->whereNull('anulado')
                    ->orWhere('anulado', false);
            })
            ->groupBy('tipo_doc')
            ->pluck('value', 'tipo_doc');

        // Calcular total para porcentajes
        $total = $rankingData->sum();

        // Definir todas las categorías de CPE con valores por defecto
        $allCategories = [
            '01' => 'Facturas',
            '03' => 'Boletas',
            '07' => 'Notas de Crédito',
            '08' => 'Notas de Débito',
        ];

        // Construir ranking con todas las categorías
        $ranking = collect($allCategories)->map(function ($name, $tipo_doc) use ($rankingData, $total) {
            $value = $rankingData->get($tipo_doc, 0);
            $percentage = $total > 0 ? round(($value / $total) * 100, 0) : 0;

            return [
                'name' => $name,
                'value' => (int) $value,
                'percentage' => (int) $percentage,
            ];
        })->values();

        return response()->json($ranking);
    }

    /**
     * Obtiene el ranking de productos top por ventas
     */
    public function getProductosTop(Request $request): JsonResponse
    {
        $establecimiento = $request->get('establecimiento', '1');
        $periodo = $request->get('periodo', 'ESTE_MES');
        $fechaDel = $request->get('fecha_del', now()->format('Y-m-d'));
        $fechaHasta = $request->get('fecha_hasta', null);
        $limit = $request->get('limit', 5);

        // Calcular fecha_hasta según período o usar la proporcionada
        if (! $fechaHasta) {
            $fechaHasta = $this->calcularFechaHasta($periodo, $fechaDel);
        }

        $productosTop = DB::table('comprobante_items as ci')
            ->join('comprobantes as c', 'ci.comprobante_id', '=', 'c.id')
            ->leftJoin('productos as p', 'ci.codigo_producto', '=', 'p.codigo')
            ->select([
                'ci.codigo_producto',
                'ci.descripcion as producto',
                'ci.unidad',
                DB::raw('COALESCE(p.precio_venta_unitario, ci.mto_precio_unitario) as precio_unitario'),
                DB::raw('SUM(ci.cantidad) as cantidad'),
                DB::raw('SUM(ci.mto_valor_venta + COALESCE(ci.igv, 0)) as total'),
            ])
            ->whereDate('c.fecha_emision', '>=', $fechaDel)
            ->whereDate('c.fecha_emision', '<=', $fechaHasta)
            ->where('c.estado_sunat', 'aceptado')
            ->where(function ($q) {
                $q->whereNull('c.anulado')->orWhere('c.anulado', false);
            })
            ->groupBy('ci.codigo_producto', 'ci.descripcion', 'ci.unidad', 'p.precio_venta_unitario', 'ci.mto_precio_unitario')
            ->orderByRaw('SUM(ci.mto_valor_venta + COALESCE(ci.igv, 0)) DESC')
            ->limit($limit)
            ->get()
            ->values()
            ->map(function ($item, $index) {
                return [
                    'id' => $index + 1,
                    'producto' => $item->producto,
                    'unidad' => $item->unidad ?? 'NIU',
                    'precio_unitario' => (float) $item->precio_unitario,
                    'cantidad' => (float) $item->cantidad,
                    'total' => (float) $item->total,
                ];
            });

        return response()->json($productosTop);
    }

    /**
     * Obtiene el ranking de clientes top por ventas
     */
    public function getClientesTop(Request $request): JsonResponse
    {
        $establecimiento = $request->get('establecimiento', '1');
        $periodo = $request->get('periodo', 'ESTE_MES');
        $fechaDel = $request->get('fecha_del', now()->format('Y-m-d'));
        $fechaHasta = $request->get('fecha_hasta', null);
        $limit = $request->get('limit', 5);

        // Calcular fecha_hasta según período o usar la proporcionada
        if (! $fechaHasta) {
            $fechaHasta = $this->calcularFechaHasta($periodo, $fechaDel);
        }

        $clientesTop = Comprobante::select([
            'cliente_razon_social as cliente',
            DB::raw('COUNT(*) as transacciones'),
            DB::raw('SUM(mto_imp_venta) as total'),
        ])
            ->whereDate('fecha_emision', '>=', $fechaDel)
            ->whereDate('fecha_emision', '<=', $fechaHasta)
            ->where('estado_sunat', 'aceptado')
            ->where(function ($q) {
                $q->whereNull('anulado')->orWhere('anulado', false);
            })
            ->whereNotNull('cliente_razon_social')
            ->where('cliente_razon_social', '!=', '')
            ->groupBy('cliente_razon_social')
            ->orderByRaw('SUM(mto_imp_venta) DESC')
            ->limit($limit)
            ->get()
            ->values()
            ->map(function ($item, $index) {
                return [
                    'id' => $index + 1,
                    'cliente' => $item->cliente,
                    'transacciones' => (int) $item->transacciones,
                    'total' => (float) $item->total,
                ];
            });

        return response()->json($clientesTop);
    }

    /**
     * Obtiene productos con stock mínimo
     */
    public function getStockMinimo(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 5);

        $productos = Producto::select([
            'id',
            'descripcion as producto',
            'stock_actual as stock',
            DB::raw("CASE 
                    WHEN stock_actual = 0 THEN 'AGOTADO'
                    WHEN stock_actual <= stock_minimo * 0.3 THEN 'CRITICO'
                    WHEN stock_actual <= stock_minimo THEN 'BAJO'
                    ELSE 'NORMAL'
                END as estado"),
            DB::raw("'Oficina Principal' as almacen"),
        ])
            ->where(function ($q) {
                $q->where('stock_actual', '<=', DB::raw('stock_minimo'))
                    ->orWhere('stock_actual', '=', 0);
            })
            ->where('activo', true)
            ->orderByRaw('CASE 
                WHEN stock_actual = 0 THEN 1
                WHEN stock_actual <= stock_minimo * 0.3 THEN 2
                WHEN stock_actual <= stock_minimo THEN 3
                ELSE 4
            END')
            ->orderBy('stock_actual', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'producto' => $item->producto,
                    'stock' => number_format((float) $item->stock, 2),
                    'estado' => $item->estado,
                    'almacen' => $item->almacen,
                ];
            });

        return response()->json([
            'data' => $productos->forPage($page, $perPage)->values(),
            'total' => $productos->count(),
            'current_page' => (int) $page,
            'per_page' => (int) $perPage,
            'total_pages' => ceil($productos->count() / $perPage),
        ]);
    }

    /**
     * Obtener datos mensuales comparativos para gráfico y tabla
     * Retorna totales por mes de Facturas, Boletas, Notas de Venta y Compras
     */
    public function getMonthlyComparison(Request $request)
    {
        $establecimiento = $request->query('establecimiento', '');
        $periodo = $request->query('periodo', 'ESTE_AÑO');
        $fechaDel = $request->query('fecha_del', '');
        $fechaHasta = $request->query('fecha_hasta', null);
        $incluirAnuladas = $request->boolean('incluir_anuladas', false);

        // Determinar rango de fechas según el período
        $fechaInicio = null;
        $fechaFin = null;

        // Usar fecha_del como referencia si está presente, sino usar hoy
        $fechaReferencia = $fechaDel ? \Carbon\Carbon::parse($fechaDel) : now();

        // Si se proporciona fecha_hasta explícitamente, usarla
        if ($fechaHasta) {
            $fechaInicio = $fechaDel;
            $fechaFin = $fechaHasta;
        } else {
            switch ($periodo) {
                case 'HOY':
                    $fechaInicio = $fechaFin = $fechaReferencia->toDateString();
                    break;
                case 'ESTA_SEMANA':
                    $fechaInicio = $fechaReferencia->copy()->startOfWeek()->toDateString();
                    $fechaFin = $fechaReferencia->copy()->endOfWeek()->toDateString();
                    break;
                case 'ESTE_MES':
                    $fechaInicio = $fechaReferencia->copy()->startOfMonth()->toDateString();
                    $fechaFin = $fechaReferencia->copy()->endOfMonth()->toDateString();
                    break;
                case 'ESTE_AÑO':
                    $fechaInicio = $fechaReferencia->copy()->startOfYear()->toDateString();
                    $fechaFin = $fechaReferencia->copy()->endOfYear()->toDateString();
                    break;
                case 'POR_FECHA':
                    if ($fechaDel) {
                        $fechaInicio = $fechaDel;
                        $fechaFin = $fechaReferencia->copy()->addDays(30)->toDateString();
                    }
                    break;
            }
        }

        // Query base con filtros
        $query = Comprobante::query()
            ->where('estado_sunat', 'aceptado');

        if (! $incluirAnuladas) {
            $query->where(function ($q) {
                $q->whereNull('anulado')->orWhere('anulado', false);
            });
        }

        if ($fechaInicio && $fechaFin) {
            $query->whereBetween('fecha_emision', [$fechaInicio, $fechaFin]);
        }

        // Nota: El parámetro establecimiento se recibe pero no se usa actualmente
        // porque la tabla comprobantes no tiene columna establecimiento.
        // Todos los comprobantes están filtrados por empresa_id de forma automática
        // a través de los middleware de autenticación

        // Obtener datos agrupados por mes y tipo de documento
        $datos = $query->selectRaw("
                TO_CHAR(fecha_emision, 'YYYY-MM') as mes,
                tipo_doc,
                SUM(mto_imp_venta) as total
            ")
            ->groupBy('mes', 'tipo_doc')
            ->orderBy('mes')
            ->get();

        // Organizar datos por mes
        $mesesData = [];
        $meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        foreach ($datos as $dato) {
            $mesNumero = (int) date('n', strtotime($dato->mes.'-01'));
            $mesNombre = $meses[$mesNumero - 1];

            if (! isset($mesesData[$mesNombre])) {
                $mesesData[$mesNombre] = [
                    'mes' => $mesNombre,
                    'facturas' => 0,
                    'boletas' => 0,
                    'notasCredito' => 0,
                    'notasDebito' => 0,
                    'compras' => 0,
                ];
            }

            // Mapear tipo_doc a categoría
            switch ($dato->tipo_doc) {
                case '01':
                    $mesesData[$mesNombre]['facturas'] += (float) $dato->total;
                    break;
                case '03':
                    $mesesData[$mesNombre]['boletas'] += (float) $dato->total;
                    break;
                case '07':
                    $mesesData[$mesNombre]['notasCredito'] += (float) $dato->total;
                    break;
                case '08':
                    $mesesData[$mesNombre]['notasDebito'] += (float) $dato->total;
                    break;
            }
        }

        // Obtener compras y agregarlas a los datos mensuales
        $queryCompras = \App\Models\Compra::query()->where('activo', true);

        if ($fechaInicio && $fechaFin) {
            $queryCompras->whereBetween('fecha_actividad', [$fechaInicio, $fechaFin]);
        }

        $compras = $queryCompras->selectRaw("
                TO_CHAR(fecha_actividad, 'YYYY-MM') as mes,
                SUM(total) as total
            ")
            ->groupBy('mes')
            ->orderBy('mes')
            ->get();

        foreach ($compras as $compra) {
            $mesNumero = (int) date('n', strtotime($compra->mes.'-01'));
            $mesNombre = $meses[$mesNumero - 1];

            if (! isset($mesesData[$mesNombre])) {
                $mesesData[$mesNombre] = [
                    'mes' => $mesNombre,
                    'facturas' => 0,
                    'boletas' => 0,
                    'notasCredito' => 0,
                    'notasDebito' => 0,
                    'compras' => 0,
                ];
            }

            $mesesData[$mesNombre]['compras'] += (float) $compra->total;
        }

        // Calcular totales
        $totales = [
            'mes' => 'Totales',
            'facturas' => 0,
            'boletas' => 0,
            'notasCredito' => 0,
            'notasDebito' => 0,
            'compras' => 0,
            'isTotal' => true,
        ];

        foreach ($mesesData as $mes) {
            $totales['facturas'] += $mes['facturas'];
            $totales['boletas'] += $mes['boletas'];
            $totales['notasCredito'] += $mes['notasCredito'];
            $totales['notasDebito'] += $mes['notasDebito'];
            $totales['compras'] += $mes['compras'];
        }

        // Formatear para tabla
        $dataTabla = array_map(function ($mes) {
            return [
                'mes' => $mes['mes'],
                'facturas' => number_format($mes['facturas'], 2),
                'boletas' => number_format($mes['boletas'], 2),
                'notasCredito' => number_format($mes['notasCredito'], 2),
                'notasDebito' => number_format($mes['notasDebito'], 2),
                'compras' => number_format($mes['compras'], 2),
            ];
        }, array_values($mesesData));

        // Agregar totales a la tabla
        $dataTabla[] = [
            'mes' => 'Totales',
            'facturas' => number_format($totales['facturas'], 2),
            'boletas' => number_format($totales['boletas'], 2),
            'notasCredito' => number_format($totales['notasCredito'], 2),
            'notasDebito' => number_format($totales['notasDebito'], 2),
            'compras' => number_format($totales['compras'], 2),
            'isTotal' => true,
        ];

        return response()->json([
            'chart' => array_values($mesesData), // Para el gráfico (sin formatear)
            'table' => $dataTabla, // Para la tabla (formateado)
        ]);
    }
}
