<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comprobante;
use App\Services\FacturacionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

use App\Services\NubefactClient;

class FacturacionController extends Controller
{
    protected $facturacionService;
    protected $nubefactClient;

    public function __construct(FacturacionService $facturacionService, NubefactClient $nubefactClient)
    {
        $this->facturacionService = $facturacionService;
        $this->nubefactClient = $nubefactClient;
    }
    /**
     * Obtener correlativo seguro (sin colisión en NubeFact)
     * GET /api/facturacion/correlativo-seguro
     * Params: empresa_id, tipo_doc (SUNAT), serie
     */
    public function correlativoSeguro(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'empresa_id' => 'required|exists:empresas,id',
            'tipo_doc' => 'required|in:01,03,07,08',
            'serie' => 'required|string|max:4',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $ultimo = \App\Models\Comprobante::where('empresa_id', $request->empresa_id)
            ->where('tipo_doc', $request->tipo_doc)
            ->where('serie', $request->serie)
            ->orderByRaw('CAST(correlativo AS INTEGER) DESC')
            ->first();

        $siguiente = $ultimo ? (int) $ultimo->correlativo + 1 : 1;
        $tipoNubeFact = \App\Services\NubefactClient::mapearTipoComprobante($request->tipo_doc);
        $maxIntentos = 10;
        $intentos = 0;
        $correlativoSeguro = $siguiente;

        while ($intentos < $maxIntentos) {
            try {
                $resp = $this->nubefactClient->consultarComprobante($tipoNubeFact, $request->serie, $correlativoSeguro);
                // Si existe en NubeFact, incrementar
                if (isset($resp['numero']) || isset($resp['serie'])) {
                    $correlativoSeguro++;
                    $intentos++;
                    continue;
                }
            } catch (\Exception $e) {
                // Si NubeFact responde error, asumimos que no existe
                break;
            }
            break;
        }

        return response()->json([
            'serie' => $request->serie,
            'correlativo' => str_pad($correlativoSeguro, 8, '0', STR_PAD_LEFT),
            'numero_completo' => $request->serie.'-'.str_pad($correlativoSeguro, 8, '0', STR_PAD_LEFT),
        ]);
    }

    /**
     * Listar comprobantes con filtros
     */
    public function index(Request $request): JsonResponse
    {
        $query = Comprobante::with(['empresa', 'usuario', 'items']);

        // Filtros dinámicos usando when()
        $query->when($request->filled('empresa_id'), function ($q) use ($request) {
            return $q->where('empresa_id', $request->empresa_id);
        })->when($request->filled('tipo_doc'), function ($q) use ($request) {
            return $q->where('tipo_doc', $request->tipo_doc);
        })->when($request->filled('estado_sunat'), function ($q) use ($request) {
            return $q->where('estado_sunat', $request->estado_sunat);
        })->when($request->filled('cliente_num_doc'), function ($q) use ($request) {
            return $q->where('cliente_num_doc', 'like', "%{$request->cliente_num_doc}%");
        })->when($request->filled('fecha_desde'), function ($q) use ($request) {
            return $q->whereDate('fecha_emision', '>=', $request->fecha_desde);
        })->when($request->filled('fecha_hasta'), function ($q) use ($request) {
            return $q->whereDate('fecha_emision', '<=', $request->fecha_hasta);
        })->when($request->filled('numero'), function ($q) use ($request) {
            // Búsqueda por serie-correlativo
            return $q->whereRaw("CONCAT(serie, '-', correlativo) LIKE ?", ["%{$request->numero}%"]);
        });

        // Ordenamiento
        $sortBy = $request->input('sort_by', 'fecha_emision');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Paginación
        $comprobantes = $query->paginate($request->per_page ?? 15);

        return response()->json($comprobantes);
    }

    /**
     * Obtener un comprobante específico
     */
    public function show(string $id): JsonResponse
    {
        $comprobante = Comprobante::with(['empresa', 'usuario', 'items', 'oportunidad'])
            ->findOrFail($id);

        return response()->json([
            'comprobante' => $comprobante,
            'urls' => [
                'xml' => $comprobante->xml_path ? asset('storage/'.$comprobante->xml_path) : null,
                'cdr' => $comprobante->cdr_path ? asset('storage/'.$comprobante->cdr_path) : null,
                'pdf' => $comprobante->pdf_path ? asset('storage/'.$comprobante->pdf_path) : null,
            ],
        ]);
    }

    /**
     * @deprecated Usar NubefactController::emitirComprobante() en su lugar
     * Este método está deshabilitado porque FacturacionService no está implementado.
     * La emisión de comprobantes se realiza mediante /api/nubefact/comprobantes
     */
    public function emitirFactura(Request $request): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Este endpoint está deshabilitado. Use /api/nubefact/comprobantes para emitir comprobantes.',
            'endpoint_recomendado' => '/api/nubefact/comprobantes',
        ], 410); // 410 Gone - recurso que ya no está disponible
    }

    /**
     * @deprecated Usar NubefactController::emitirComprobante() en su lugar
     * Este método está deshabilitado porque FacturacionService no está implementado.
     */
    public function emitirBoleta(Request $request): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'Este endpoint está deshabilitado. Use /api/nubefact/comprobantes para emitir comprobantes.',
            'endpoint_recomendado' => '/api/nubefact/comprobantes',
        ], 410);
    }

    /**
     * Emitir una nota de crédito
     */
    public function emitirNotaCredito(Request $request): JsonResponse
    {
        $validator = $this->validarNotaCredito($request);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $data = $request->all();
            $data['tipoDoc'] = '07'; // Nota de Crédito

            $resultado = $this->facturacionService->emitirComprobante($data, 'note');

            return response()->json($resultado, 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
            ], 500);
        }
    }

    /**
     * Emitir una nota de débito
     */
    public function emitirNotaDebito(Request $request): JsonResponse
    {
        $validator = $this->validarNotaDebito($request);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $data = $request->all();
            $data['tipoDoc'] = '08'; // Nota de Débito

            $resultado = $this->facturacionService->emitirComprobante($data, 'note');

            return response()->json($resultado, 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'code' => $e->getCode(),
            ], 500);
        }
    }

    /**
     * Enviar resumen diario (RC)
     */
    public function emitirResumen(Request $request): JsonResponse
    {
        $validator = $this->validarResumen($request);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        return response()->json([
            'success' => false,
            'message' => 'La funcionalidad de resumen diario debe realizarse mediante NubeFact. Use el endpoint /api/nubefact/comprobantes para emisión.',
        ], 501);
    }

    /**
     * Enviar comunicación de baja (RA)
     */
    public function emitirComunicacionBaja(Request $request): JsonResponse
    {
        $validator = $this->validarComunicacionBaja($request);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        return response()->json([
            'success' => false,
            'message' => 'La anulación de comprobantes debe realizarse mediante NubeFact. Use DELETE /api/nubefact/comprobantes/{tipo}/{serie}/{numero}',
        ], 501);
    }

    /**
     * Emitir comprobante de retención
     */
    public function emitirRetencion(Request $request): JsonResponse
    {
        $validator = $this->validarRetencion($request);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        return response()->json([
            'success' => false,
            'message' => 'La emisión de retenciones debe realizarse mediante NubeFact API. Funcionalidad en desarrollo.',
        ], 501);
    }

    /**
     * Emitir comprobante de percepción
     */
    public function emitirPercepcion(Request $request): JsonResponse
    {
        $validator = $this->validarPercepcion($request);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        return response()->json([
            'success' => false,
            'message' => 'La emisión de percepciones debe realizarse mediante NubeFact API. Funcionalidad en desarrollo.',
        ], 501);
    }

    /**
     * Obtener siguiente correlativo
     */
    public function siguienteCorrelativo(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'empresa_id' => 'required|exists:empresas,id',
            'tipo_doc' => 'required|in:01,03,07,08',
            'serie' => 'required|string|max:4',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $ultimo = Comprobante::where('empresa_id', $request->empresa_id)
            ->where('tipo_doc', $request->tipo_doc)
            ->where('serie', $request->serie)
            ->orderBy('correlativo', 'desc')
            ->first();

        $siguiente = $ultimo ? (int) $ultimo->correlativo + 1 : 1;

        return response()->json([
            'serie' => $request->serie,
            'correlativo' => str_pad($siguiente, 8, '0', STR_PAD_LEFT),
            'numero_completo' => $request->serie.'-'.str_pad($siguiente, 8, '0', STR_PAD_LEFT),
        ]);
    }

    /**
     * Descargar XML de un comprobante
     */
    public function descargarXml(string $id)
    {
        $comprobante = Comprobante::findOrFail($id);

        // Primero intentamos servir el archivo local si existe
        if ($comprobante->xml_path && Storage::disk('public')->exists($comprobante->xml_path)) {
            $fileName = ($comprobante->serie.'-'.$comprobante->correlativo).'.xml';
            $path = Storage::disk('public')->path($comprobante->xml_path);

            return response()->download($path, $fileName);
        }

        // Si no hay archivo local, usamos el enlace de NubeFact si está disponible
        if ($comprobante->nubefact_xml_url) {
            $response = Http::get($comprobante->nubefact_xml_url);

            if ($response->successful()) {
                $fileName = ($comprobante->serie.'-'.$comprobante->correlativo).'.xml';

                return response($response->body(), 200)
                    ->header('Content-Type', $response->header('Content-Type') ?: 'application/xml')
                    ->header('Content-Disposition', 'attachment; filename="'.$fileName.'"');
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Archivo XML no disponible.',
        ], 404);
    }

    /**
     * Descargar CDR de un comprobante
     */
    public function descargarCdr(string $id)
    {
        $comprobante = Comprobante::findOrFail($id);

        // Primero intentamos servir el archivo local si existe
        if ($comprobante->cdr_path && Storage::disk('public')->exists($comprobante->cdr_path)) {
            $fileName = ($comprobante->serie.'-'.$comprobante->correlativo).'.zip';
            $path = Storage::disk('public')->path($comprobante->cdr_path);

            return response()->download($path, $fileName);
        }

        // Si no hay archivo local, usamos el enlace de NubeFact si está disponible
        if ($comprobante->nubefact_cdr_url) {
            $response = Http::get($comprobante->nubefact_cdr_url);

            if ($response->successful()) {
                $fileName = ($comprobante->serie.'-'.$comprobante->correlativo).'.zip';

                return response($response->body(), 200)
                    ->header('Content-Type', $response->header('Content-Type') ?: 'application/zip')
                    ->header('Content-Disposition', 'attachment; filename="'.$fileName.'"');
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Archivo CDR no disponible.',
        ], 404);
    }

    /**
     * Descargar PDF de un comprobante
     */
    public function descargarPdf(string $id)
    {
        $comprobante = Comprobante::findOrFail($id);

        // Primero intentamos servir el archivo local si existe, en modo inline para permitir vista previa
        if ($comprobante->pdf_path && Storage::disk('public')->exists($comprobante->pdf_path)) {
            $path = Storage::disk('public')->path($comprobante->pdf_path);

            return response()->file($path, [
                'Content-Type' => 'application/pdf',
            ]);
        }

        // Si no hay archivo local, usamos el enlace de NubeFact si está disponible
        if ($comprobante->nubefact_pdf_url) {
            $response = Http::get($comprobante->nubefact_pdf_url);

            if ($response->successful()) {
                return response($response->body(), 200)
                    ->header('Content-Type', $response->header('Content-Type') ?: 'application/pdf')
                    ->header('Content-Disposition', 'inline');
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Archivo PDF no disponible.',
        ], 404);
    }

    /**
     * Validación para factura
     */
    private function validarFactura(Request $request)
    {
        return Validator::make($request->all(), [
            'empresa_id' => 'required|exists:empresas,id',
            'client.tipoDoc' => 'required|in:6',
            'client.numDoc' => 'required|digits:11',
            'client.rznSocial' => 'required|string|max:255',
            'tipoMoneda' => 'required|in:PEN,USD,EUR',
            'details' => 'required|array|min:1',
            'details.*.descripcion' => 'required|string',
            'details.*.cantidad' => 'required|numeric|min:0',
            'details.*.mtoValorUnitario' => 'required|numeric|min:0',
            'mtoImpVenta' => 'required|numeric|min:0',
        ]);
    }

    /**
     * Validación para boleta
     */
    private function validarBoleta(Request $request)
    {
        return Validator::make($request->all(), [
            'empresa_id' => 'required|exists:empresas,id',
            'client.tipoDoc' => 'required|in:1,4,6,7',
            'client.numDoc' => 'required|string',
            'client.rznSocial' => 'required|string|max:255',
            'tipoMoneda' => 'required|in:PEN,USD,EUR',
            'details' => 'required|array|min:1',
            'details.*.descripcion' => 'required|string',
            'details.*.cantidad' => 'required|numeric|min:0',
            'details.*.mtoValorUnitario' => 'required|numeric|min:0',
            'mtoImpVenta' => 'required|numeric|min:0',
        ]);
    }

    /**
     * Validación para nota de crédito
     */
    private function validarNotaCredito(Request $request)
    {
        return Validator::make($request->all(), [
            'empresa_id' => 'required|exists:empresas,id',
            'tipDocAfectado' => 'required|in:01,03',
            'numDocfectado' => 'required|string',
            'codMotivo' => 'required|string',
            'desMotivo' => 'required|string|max:255',
            'client.tipoDoc' => 'required|string',
            'client.numDoc' => 'required|string',
            'client.rznSocial' => 'required|string|max:255',
            'details' => 'required|array|min:1',
            'mtoImpVenta' => 'required|numeric',
        ]);
    }

    /**
     * Validación para nota de débito
     */
    private function validarNotaDebito(Request $request)
    {
        return Validator::make($request->all(), [
            'empresa_id' => 'required|exists:empresas,id',
            'tipDocAfectado' => 'required|in:01,03',
            'numDocfectado' => 'required|string',
            'codMotivo' => 'required|string',
            'desMotivo' => 'required|string|max:255',
            'client.tipoDoc' => 'required|string',
            'client.numDoc' => 'required|string',
            'client.rznSocial' => 'required|string|max:255',
            'details' => 'required|array|min:1',
            'mtoImpVenta' => 'required|numeric',
        ]);
    }

    /**
     * Validación para resumen diario (RC)
     */
    private function validarResumen(Request $request)
    {
        return Validator::make($request->all(), [
            'empresa_id' => 'required|exists:empresas,id',
            'fecGeneracion' => 'required|date',
            'fecResumen' => 'required|date',
            'correlativo' => 'required|string',
            'details' => 'required|array|min:1',
        ]);
    }

    /**
     * Validación para comunicación de baja (RA)
     */
    private function validarComunicacionBaja(Request $request)
    {
        return Validator::make($request->all(), [
            'empresa_id' => 'required|exists:empresas,id',
            'fecGeneracion' => 'required|date',
            'fecComunicacion' => 'required|date',
            'correlativo' => 'required|string',
            'details' => 'required|array|min:1',
        ]);
    }

    /**
     * Validación para comprobante de retención
     */
    private function validarRetencion(Request $request)
    {
        return Validator::make($request->all(), [
            'empresa_id' => 'required|exists:empresas,id',
            'serie' => 'required|string',
            'correlativo' => 'required|string',
            'fechaEmision' => 'required|date',
            'regimen' => 'required|string',
            'tasa' => 'required|numeric',
            'details' => 'required|array|min:1',
        ]);
    }

    /**
     * Validación para comprobante de percepción
     */
    private function validarPercepcion(Request $request)
    {
        return Validator::make($request->all(), [
            'empresa_id' => 'required|exists:empresas,id',
            'serie' => 'required|string',
            'correlativo' => 'required|string',
            'fechaEmision' => 'required|date',
            'regimen' => 'required|string',
            'tasa' => 'required|numeric',
            'details' => 'required|array|min:1',
        ]);
    }

    /**
     * Estadísticas de facturación
     * Optimización: Single aggregated query (PostgreSQL Best Practice)
     */
    public function estadisticas(Request $request): JsonResponse
    {
        $empresaId = $request->empresa_id;
        $fechaDesde = $request->fecha_desde ?? now()->startOfMonth();
        $fechaHasta = $request->fecha_hasta ?? now();

        // PostgreSQL: Use conditional aggregations instead of cloning queries
        $stats = Comprobante::selectRaw("
            COUNT(*) as total_emitidos,
            COUNT(CASE WHEN estado_sunat = 'aceptado' THEN 1 END) as total_aceptados,
            COUNT(CASE WHEN estado_sunat = 'rechazado' THEN 1 END) as total_rechazados,
            COUNT(CASE WHEN estado_sunat = 'pendiente' THEN 1 END) as total_pendientes,
            COALESCE(SUM(CASE WHEN estado_sunat = 'aceptado' THEN mto_imp_venta ELSE 0 END), 0) as monto_total,
            COUNT(CASE WHEN tipo_doc = '01' THEN 1 END) as facturas,
            COUNT(CASE WHEN tipo_doc = '03' THEN 1 END) as boletas,
            COUNT(CASE WHEN tipo_doc = '07' THEN 1 END) as notas_credito,
            COUNT(CASE WHEN tipo_doc = '08' THEN 1 END) as notas_debito
        ")
            ->whereBetween('fecha_emision', [$fechaDesde, $fechaHasta])
            ->when($empresaId, fn ($q) => $q->where('empresa_id', $empresaId))
            ->first();

        return response()->json([
            'total_emitidos' => $stats->total_emitidos,
            'total_aceptados' => $stats->total_aceptados,
            'total_rechazados' => $stats->total_rechazados,
            'total_pendientes' => $stats->total_pendientes,
            'monto_total' => $stats->monto_total,
            'facturas' => $stats->facturas,
            'boletas' => $stats->boletas,
            'notas_credito' => $stats->notas_credito,
            'notas_debito' => $stats->notas_debito,
        ]);
    }

    /**
     * Exportar comprobantes a Excel
     */
    public function exportarExcel(Request $request)
    {
        try {
            $query = Comprobante::with(['empresa']);

            // Aplicar los mismos filtros que en index()
            if ($request->has('empresa_id')) {
                $query->where('empresa_id', $request->empresa_id);
            }

            if ($request->has('tipo_doc')) {
                $query->where('tipo_doc', $request->tipo_doc);
            }

            if ($request->has('estado_sunat')) {
                $query->where('estado_sunat', $request->estado_sunat);
            }

            if ($request->has('numero')) {
                $numero = $request->numero;
                $query->where(function ($q) use ($numero) {
                    $q->where('serie', 'like', "%{$numero}%")
                        ->orWhere('correlativo', 'like', "%{$numero}%")
                        ->orWhere('cliente_razon_social', 'like', "%{$numero}%");
                });
            }

            if ($request->has('fecha_desde')) {
                $query->whereDate('fecha_emision', '>=', $request->fecha_desde);
            }

            if ($request->has('fecha_hasta')) {
                $query->whereDate('fecha_emision', '<=', $request->fecha_hasta);
            }
            $comprobantes = $query->orderBy('fecha_emision', 'desc')->get();

            // Crear contenido CSV compatible con formato NubeFact (separador ;)
            $csvContent = "FECHA EMISION;FECHA VENCIMIENTO;TIPO;SERIE;NUMERO;DOC ENTIDAD;RUC;DENOMINACION;MONEDA;GRAVADA;EXONERADA;INAFECTA;IGV;TOTAL;TOTAL GRATUITA;PAGADO;ENVIADO AL CLIENTE;ANULADO;ESTADO SUNAT\n";

            foreach ($comprobantes as $c) {
                $tipoDesc = match ($c->tipo_doc) {
                    '01' => 'FACTURA',
                    '03' => 'BOLETA',
                    '07' => 'NOTA CREDITO',
                    '08' => 'NOTA DEBITO',
                    default => $c->tipo_doc
                };

                $csvContent .= sprintf(
                    "%s;%s;%s;%s;%s;%s;%s;\"%s\";%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s\n",
                    $c->fecha_emision ? date('d/m/Y', strtotime($c->fecha_emision)) : '',
                    $c->fecha_vencimiento ? date('d/m/Y', strtotime($c->fecha_vencimiento)) : '',
                    $tipoDesc,
                    $c->serie,
                    $c->correlativo,
                    $c->cliente_tipo_doc === '6' ? 'RUC' : 'DNI',
                    $c->cliente_num_doc,
                    str_replace('"', '""', $c->cliente_razon_social ?? ''), // Escapar comillas dobles
                    $c->moneda,
                    number_format($c->mto_oper_gravadas ?? 0, 2, '.', ''),
                    number_format($c->mto_oper_exoneradas ?? 0, 2, '.', ''),
                    number_format($c->mto_oper_inafectas ?? 0, 2, '.', ''),
                    number_format($c->mto_igv ?? 0, 2, '.', ''),
                    number_format($c->mto_imp_venta ?? 0, 2, '.', ''),
                    number_format($c->mto_oper_gratuitas ?? 0, 2, '.', ''),
                    $c->pagado ? 'SI' : 'NO',
                    $c->enviado_cliente ? 'SI' : 'NO',
                    $c->anulado ? 'SI' : 'NO',
                    strtoupper($c->estado_sunat ?? 'PENDIENTE')
                );
            }

            // Generar nombre de archivo
            $filename = 'comprobantes_'.date('Y-m-d_H-i-s').'.csv';

            return response($csvContent, 200)
                ->header('Content-Type', 'text/csv; charset=UTF-8')
                ->header('Content-Disposition', "attachment; filename=\"{$filename}\"")
                ->header('Pragma', 'no-cache')
                ->header('Cache-Control', 'must-revalidate, post-check=0, pre-check=0')
                ->header('Expires', '0');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al exportar: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Exportar items de comprobantes a CSV
     */
    public function exportarItems(Request $request)
    {
        try {
            $query = Comprobante::with(['items']);

            // Aplicar los mismos filtros que en index()
            if ($request->has('empresa_id')) {
                $query->where('empresa_id', $request->empresa_id);
            }

            if ($request->has('tipo_doc')) {
                $query->where('tipo_doc', $request->tipo_doc);
            }

            if ($request->has('estado_sunat')) {
                $query->where('estado_sunat', $request->estado_sunat);
            }

            if ($request->has('numero')) {
                $numero = $request->numero;
                $query->where(function ($q) use ($numero) {
                    $q->where('serie', 'like', "%{$numero}%")
                        ->orWhere('correlativo', 'like', "%{$numero}%")
                        ->orWhere('cliente_razon_social', 'like', "%{$numero}%");
                });
            }

            if ($request->has('fecha_desde')) {
                $query->whereDate('fecha_emision', '>=', $request->fecha_desde);
            }

            if ($request->has('fecha_hasta')) {
                $query->whereDate('fecha_emision', '<=', $request->fecha_hasta);
            }

            $comprobantes = $query
                ->orderBy('fecha_emision', 'desc')
                ->get();

            // Cabeceras CSV para items
            $csvContent = "FECHA EMISION;TIPO;SERIE;NUMERO;ITEM;CODIGO;DESCRIPCION;UNIDAD;CANTIDAD;VALOR UNITARIO;PRECIO UNITARIO;SUBTOTAL;IGV;TOTAL;DOC CLIENTE;DENOMINACION CLIENTE\n";

            foreach ($comprobantes as $c) {
                if (! $c->items || $c->items->isEmpty()) {
                    continue;
                }

                $tipoDesc = match ($c->tipo_doc) {
                    '01' => 'FACTURA',
                    '03' => 'BOLETA',
                    '07' => 'NOTA CREDITO',
                    '08' => 'NOTA DEBITO',
                    default => $c->tipo_doc,
                };

                foreach ($c->items as $item) {
                    $descripcion = $item->descripcion ?? '';
                    // Normalizar saltos de línea y comillas en la descripción
                    $descripcion = str_replace(["\r", "\n"], ' ', $descripcion);
                    $descripcion = str_replace('"', '""', $descripcion);

                    $totalItem = (float) ($item->mto_valor_venta ?? 0) + (float) ($item->total_impuestos ?? 0);

                    $csvContent .= sprintf(
                        "%s;%s;%s;%s;%s;%s;\"%s\";%s;%s;%s;%s;%s;%s;%s;%s;\"%s\"\n",
                        optional($c->fecha_emision)?->format('d/m/Y'),
                        $tipoDesc,
                        $c->serie,
                        $c->correlativo,
                        $item->item,
                        $item->codigo_producto,
                        $descripcion,
                        $item->unidad,
                        number_format((float) $item->cantidad, 3, '.', ''),
                        number_format((float) $item->mto_valor_unitario, 6, '.', ''),
                        number_format((float) $item->mto_precio_unitario, 6, '.', ''),
                        number_format((float) $item->mto_valor_venta, 2, '.', ''),
                        number_format((float) $item->igv, 2, '.', ''),
                        number_format($totalItem, 2, '.', ''),
                        $c->cliente_num_doc,
                        $c->cliente_razon_social,
                    );
                }
            }

            return response($csvContent)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', 'attachment; filename="items_comprobantes.csv"');
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generar HTML de un comprobante (NUEVO - Según tutorial)
     */
    public function descargarHtml(string $id)
    {
        try {
            $html = $this->facturacionService->generarHtml($id);

            return response($html, 200)
                ->header('Content-Type', 'text/html');

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
