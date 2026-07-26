<?php

namespace App\Services\VoiceIA;

use App\Models\Entidad;
use App\Models\Producto;
use App\Models\Serie;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Servicio de extracción de intenciones para comandos de voz de facturación.
 * Procesa comandos estrictamente con IA o datos reales de la BD. Sin datos ficticios.
 */
class VoiceIntentService
{
    /**
     * Analizar el texto transcrito y extraer los datos estructurados.
     */
    public function analizarIntencion(string $texto, ?int $empresaId = 1): array
    {
        $textoTrim = trim($texto);
        $textoLower = mb_strtolower($textoTrim, 'UTF-8');

        if (empty($textoTrim)) {
            return $this->generarEstructuraVacia($texto, $empresaId);
        }

        // 1. Intentar análisis estructurado vía LLM (Gemini / OpenAI)
        $llmResult = $this->analizarConLLM($textoTrim);

        if ($llmResult && !empty($llmResult['items'])) {
            $tipoComprobante = $llmResult['tipo_comprobante'] ?? '01';
            $clienteNombreBusqueda = $llmResult['cliente'] ?? '';
            $itemsRaw = $llmResult['items'];
        } else {
            // Análisis heurístico basado en palabras clave reales
            $tipoComprobante = '01'; // Default: Factura
            if (str_contains($textoLower, 'boleta')) {
                $tipoComprobante = '03';
            } elseif (str_contains($textoLower, 'nota de crédito') || str_contains($textoLower, 'nota de credito')) {
                $tipoComprobante = '07';
            } elseif (str_contains($textoLower, 'nota de débito') || str_contains($textoLower, 'nota de debito')) {
                $tipoComprobante = '08';
            }

            $clienteNombreBusqueda = $textoLower;
            $itemsRaw = null;
        }

        // Mapear nombres de tipo de comprobante para SUNAT/NubeFact
        $mapaNombres = [
            '01' => ['nombre' => 'Factura', 'codigo_nubefact' => 1],
            '03' => ['nombre' => 'Boleta de Venta', 'codigo_nubefact' => 2],
            '07' => ['nombre' => 'Nota de Crédito', 'codigo_nubefact' => 3],
            '08' => ['nombre' => 'Nota de Débito', 'codigo_nubefact' => 4],
        ];

        $infoTipo = $mapaNombres[$tipoComprobante] ?? $mapaNombres['01'];
        $tipoNombre = $infoTipo['nombre'];
        $tipoCodigoNubefact = $infoTipo['codigo_nubefact'];

        // 2. Resolver Cliente ÚNICAMENTE si existe en la BD local o se extrajo
        $cliente = $this->resolverCliente($clienteNombreBusqueda, $textoLower);

        // 3. Resolver Productos ÚNICAMENTE si existen en la BD local o en la orden dictada
        $items = $this->resolverProductos($itemsRaw, $textoLower, $empresaId);

        // 4. Obtener Serie activa y correlativo de la BD
        $serieObj = Serie::where('tipo_comprobante', $tipoComprobante)
            ->where('activo', true)
            ->first();

        $serie = $serieObj ? $serieObj->serie : ($tipoComprobante === '01' ? 'F001' : 'B001');
        $correlativoSugerido = $serieObj ? ($serieObj->correlativo_actual + 1) : 1;

        // 5. Cálculos financieros (IGV 18% incluido)
        $totalGravada = 0;
        $totalIgv = 0;
        $totalVenta = 0;

        foreach ($items as &$item) {
            $precioUnitario = (float) $item['precio_unitario'];
            $cantidad = (float) $item['cantidad'];
            
            $totalItem = $precioUnitario * $cantidad;
            $valorUnitario = $precioUnitario / 1.18;
            $subtotalItem = $valorUnitario * $cantidad;
            $igvItem = $totalItem - $subtotalItem;

            $item['valor_unitario'] = round($valorUnitario, 4);
            $item['subtotal'] = round($subtotalItem, 2);
            $item['igv'] = round($igvItem, 2);
            $item['total'] = round($totalItem, 2);

            $totalGravada += $subtotalItem;
            $totalIgv += $igvItem;
            $totalVenta += $totalItem;
        }

        return [
            'empresa_id' => $empresaId,
            'tipo_de_comprobante' => $tipoCodigoNubefact,
            'tipo_comprobante_sunat' => $tipoComprobante,
            'tipo_comprobante_nombre' => $tipoNombre,
            'serie' => $serie,
            'numero' => $correlativoSugerido,
            'fecha_de_emision' => now()->format('Y-m-d'),
            'fecha_de_vencimiento' => now()->format('Y-m-d'),
            'moneda' => 1, // PEN
            'cliente' => $cliente,
            'cliente_tipo_de_documento' => $cliente['tipo_doc'] ?? null,
            'cliente_numero_de_documento' => $cliente['num_doc'] ?? null,
            'cliente_denominacion' => $cliente['razon_social'] ?? null,
            'cliente_direccion' => $cliente['direccion'] ?? null,
            'cliente_email' => $cliente['email'] ?? null,
            'items' => $items,
            'total_gravada' => round($totalGravada, 2),
            'total_igv' => round($totalIgv, 2),
            'total' => round($totalVenta, 2),
            'texto_original' => $texto,
        ];
    }

    /**
     * Extracción estructurada vía Gemini / OpenAI.
     */
    protected function analizarConLLM(string $texto): ?array
    {
        $geminiKey = config('services.gemini.key') ?? env('GEMINI_API_KEY');
        if (!$geminiKey) return null;

        try {
            $prompt = "Analiza este comando de voz de facturación peruana y responde ÚNICAMENTE un objeto JSON válido sin markdown:\n" .
                "Texto: \"{$texto}\"\n\n" .
                "JSON Schema:\n" .
                "{\n" .
                "  \"tipo_comprobante\": \"01\" (01 para factura, 03 para boleta, 07 para nota de crédito),\n" .
                "  \"cliente\": \"Nombre, RUC o DNI exacto mencionado (o null si no hay)\",\n" .
                "  \"items\": [\n" .
                "    { \"producto\": \"nombre del producto o servicio\", \"cantidad\": 1, \"precio\": 0.00 }\n" .
                "  ]\n" .
                "}";

            $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" . $geminiKey;
            
            $response = Http::timeout(5)->post($url, [
                'contents' => [
                    ['parts' => [['text' => $prompt]]]
                ]
            ]);

            if ($response->successful()) {
                $rawText = $response->json('candidates.0.content.parts.0.text') ?? '';
                $cleanJson = trim(preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($rawText)));
                $data = json_decode($cleanJson, true);
                if (is_array($data)) {
                    return $data;
                }
            }
        } catch (Exception $e) {
            Log::warning('Error en consulta LLM VoiceIntentService: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Resolver cliente buscando ÚNICAMENTE coincidencias reales en la BD.
     */
    protected function resolverCliente(string $busqueda, string $textoCompleto): ?array
    {
        // 1. Coincidencia por RUC / DNI
        preg_match('/\b(10\d{9}|20\d{9}|\d{8})\b/', $textoCompleto, $docMatches);
        if (!empty($docMatches[1]) && Schema::hasColumn('entidades', 'numero_documento')) {
            $entidadPorDoc = Entidad::where('numero_documento', $docMatches[1])->first();
            if ($entidadPorDoc) {
                return $this->formatEntidad($entidadPorDoc);
            }
        }

        // 2. Coincidencia por nombre en la base de datos
        $columnaNombre = $this->obtenerColumnaNombreEntidad();
        $busquedaLimpia = trim($busqueda);

        if (!empty($busquedaLimpia) && strlen($busquedaLimpia) >= 3 && $columnaNombre) {
            $entidad = Entidad::where($columnaNombre, 'ILIKE', '%' . $busquedaLimpia . '%')
                ->orWhere($columnaNombre, 'LIKE', '%' . $busquedaLimpia . '%')
                ->first();

            if ($entidad) {
                return $this->formatEntidad($entidad);
            }
        }

        // ❌ SIN SIMULACIONES: Si no se encuentra cliente real en BD, retorna NULL
        return null;
    }

    /**
     * Resolver productos de la BD o extraer precios reales indicados en el dictado.
     */
    protected function resolverProductos(?array $itemsLLM, string $textoCompleto, int $empresaId): array
    {
        $itemsEncontrados = [];
        $columnaNombreProd = Schema::hasColumn('productos', 'nombre') ? 'nombre' : (Schema::hasColumn('productos', 'descripcion') ? 'descripcion' : null);
        $columnaCodigoProd = Schema::hasColumn('productos', 'codigo') ? 'codigo' : null;

        // CASO A: Los ítems fueron identificados por el LLM
        if (!empty($itemsLLM) && is_array($itemsLLM)) {
            foreach ($itemsLLM as $itemLLM) {
                $nombreBuscado = mb_strtolower((string) ($itemLLM['producto'] ?? ''), 'UTF-8');
                $cantidad = max(1, (int) ($itemLLM['cantidad'] ?? 1));
                $precioSugerido = (float) ($itemLLM['precio'] ?? 0);

                $prodCoincidente = null;
                if (!empty($nombreBuscado) && $columnaNombreProd) {
                    $prodCoincidente = Producto::whereNotNull($columnaNombreProd)
                        ->where(function ($query) use ($nombreBuscado, $columnaNombreProd, $columnaCodigoProd) {
                            $query->where($columnaNombreProd, 'ILIKE', '%' . $nombreBuscado . '%');
                            if ($columnaCodigoProd) {
                                $query->orWhere($columnaCodigoProd, 'ILIKE', '%' . $nombreBuscado . '%');
                            }
                        })->first();
                }

                if ($prodCoincidente) {
                    $precioBase = (float) ($prodCoincidente->precio_unitario ?? $prodCoincidente->precio ?? 0);

                    $itemsEncontrados[] = [
                        'codigo' => $columnaCodigoProd ? ($prodCoincidente->{$columnaCodigoProd} ?? 'PROD-001') : 'PROD-001',
                        'descripcion' => $prodCoincidente->{$columnaNombreProd},
                        'unidad_de_medida' => $prodCoincidente->unidad_medida ?? 'NIU',
                        'cantidad' => $cantidad,
                        'precio_unitario' => $precioSugerido > 0 ? $precioSugerido : $precioBase,
                        'tipo_de_igv' => 1,
                    ];
                } elseif (!empty($nombreBuscado) && $precioSugerido > 0) {
                    // Si el usuario dictó un precio real en la voz (ej. "servicio de transporte 200 soles")
                    $itemsEncontrados[] = [
                        'codigo' => 'SERV-001',
                        'descripcion' => ucfirst($nombreBuscado),
                        'unidad_de_medida' => 'ZZ',
                        'cantidad' => $cantidad,
                        'precio_unitario' => $precioSugerido,
                        'tipo_de_igv' => 1,
                    ];
                }
            }
        }

        // CASO B: Intentar extraer explícitamente el precio si fue dictado en la frase (Ej: "por 50 soles", "a 80 soles")
        if (empty($itemsEncontrados)) {
            if (preg_match('/(\d+(?:\.\d{1,2})?)\s*(?:soles|pen|so)/i', $textoCompleto, $pm)) {
                $precioExtraido = (float) $pm[1];

                preg_match('/(\d+)\s+([a-zA-Z\s]+)/i', $textoCompleto, $m);
                $cantidad = isset($m[1]) ? (int) $m[1] : 1;

                $itemsEncontrados[] = [
                    'codigo' => 'SERV-VOICE',
                    'descripcion' => 'Venta por Comando de Voz',
                    'unidad_de_medida' => 'NIU',
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioExtraido,
                    'tipo_de_igv' => 1,
                ];
            }
        }

        // ❌ SIN SIMULACIONES: Si no hay coincidencias ni montos válidos en la voz, devuelve lista vacía.
        return $itemsEncontrados;
    }

    protected function obtenerColumnaNombreEntidad(): ?string
    {
        $columnasPosibles = ['razon_social', 'nombre_razon_social', 'nombre', 'denominacion', 'alias', 'nombres'];
        
        foreach ($columnasPosibles as $columna) {
            if (Schema::hasColumn('entidades', $columna)) {
                return $columna;
            }
        }

        return null;
    }

    protected function formatEntidad(Entidad $entidad): array
    {
        $razonSocial = $entidad->razon_social 
            ?? $entidad->nombre_razon_social 
            ?? $entidad->nombre 
            ?? $entidad->denominacion 
            ?? $entidad->alias;

        $numDoc = $entidad->numero_documento 
            ?? $entidad->num_doc 
            ?? $entidad->documento;

        $tipoDocAttr = $entidad->tipo_documento ?? $entidad->tipo_doc ?? '6';
        $tipoDoc = ($tipoDocAttr === 'RUC' || strlen((string)$numDoc) === 11) ? '6' : '1';

        return [
            'id' => $entidad->id,
            'tipo_doc' => $tipoDoc,
            'num_doc' => (string) $numDoc,
            'razon_social' => (string) $razonSocial,
            'direccion' => $entidad->direccion ?? 'Sin dirección registrada',
            'email' => $entidad->email ?? null,
        ];
    }

    protected function generarEstructuraVacia(string $texto, int $empresaId): array
    {
        return [
            'empresa_id' => $empresaId,
            'tipo_de_comprobante' => 1,
            'tipo_comprobante_sunat' => '01',
            'tipo_comprobante_nombre' => 'Factura',
            'serie' => 'F001',
            'numero' => 1,
            'fecha_de_emision' => now()->format('Y-m-d'),
            'fecha_de_vencimiento' => now()->format('Y-m-d'),
            'moneda' => 1,
            'cliente' => null,
            'cliente_tipo_de_documento' => null,
            'cliente_numero_de_documento' => null,
            'cliente_denominacion' => null,
            'cliente_direccion' => null,
            'cliente_email' => null,
            'items' => [],
            'total_gravada' => 0.00,
            'total_igv' => 0.00,
            'total' => 0.00,
            'texto_original' => $texto,
        ];
    }
}