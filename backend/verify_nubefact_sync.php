<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\NubefactClient;

echo "=== VERIFICACIÓN CON API NUBEFACT ===" . PHP_EOL . PHP_EOL;

$client = app(NubefactClient::class);

// Obtener comprobantes locales
echo "Paso 1: Obteniendo comprobantes de la base de datos local..." . PHP_EOL;

$locales = DB::table('comprobantes')
    ->whereNull('deleted_at')
    ->where('tipo_doc', '01') // Solo facturas
    ->orderBy('serie')
    ->orderBy('correlativo')
    ->get(['id', 'serie', 'correlativo', 'cliente_razon_social', 'mto_imp_venta', 'nubefact_aceptada_por_sunat']);

echo "Total local: " . $locales->count() . " facturas" . PHP_EOL . PHP_EOL;

// Consultar cada comprobante en NubeFact
echo "Paso 2: Consultando cada comprobante en NubeFact API..." . PHP_EOL;
echo str_repeat("-", 100) . PHP_EOL;
printf(
    "%-15s | %-8s | %-30s | %-12s | %-12s | %s%s",
    "COMPROBANTE",
    "LOCAL",
    "CLIENTE",
    "TOTAL LOCAL",
    "TOTAL API",
    "ESTADO API",
    PHP_EOL
);
echo str_repeat("-", 100) . PHP_EOL;

$estadisticas = [
    'total' => 0,
    'encontrados_api' => 0,
    'no_encontrados_api' => 0,
    'diferencias_monto' => 0,
    'diferencias_cliente' => 0,
];

foreach ($locales as $local) {
    $estadisticas['total']++;

    try {
        // Tipo de comprobante: 01 = 1 (Factura en NubeFact)
        $response = $client->consultarComprobante(1, $local->serie, $local->correlativo);

        $estadisticas['encontrados_api']++;

        // Comparar datos
        $totalApi = $response['total'] ?? 0;
        $clienteApi = $response['cliente_denominacion'] ?? '';
        $estadoSunat = $response['aceptada_por_sunat'] ? 'ACEPTADO' : 'PENDIENTE';

        $difMonto = abs($local->mto_imp_venta - $totalApi) > 0.01;
        $difCliente = strtoupper(trim($local->cliente_razon_social)) !== strtoupper(trim($clienteApi));

        if ($difMonto) $estadisticas['diferencias_monto']++;
        if ($difCliente) $estadisticas['diferencias_cliente']++;

        $marca = '';
        if ($difMonto || $difCliente) {
            $marca = ' ⚠️';
        }

        printf(
            "%-15s | %-8s | %-30s | %12.2f | %12.2f | %-12s%s%s",
            "{$local->serie}-{$local->correlativo}",
            "ID:{$local->id}",
            substr($local->cliente_razon_social, 0, 30),
            $local->mto_imp_venta,
            $totalApi,
            $estadoSunat,
            $marca,
            PHP_EOL
        );

    } catch (Exception $e) {
        $estadisticas['no_encontrados_api']++;

        printf(
            "%-15s | %-8s | %-30s | %12.2f | %12s | %-12s ❌%s",
            "{$local->serie}-{$local->correlativo}",
            "ID:{$local->id}",
            substr($local->cliente_razon_social, 0, 30),
            $local->mto_imp_venta,
            "NO EXISTE",
            "ERROR",
            PHP_EOL
        );

        // Mostrar detalles del error si es diferente a "no existe"
        if (!str_contains($e->getMessage(), 'Documento no existe') && !str_contains($e->getMessage(), '"codigo":24')) {
            echo "    ERROR: " . $e->getMessage() . PHP_EOL;
        }
    }

    // Pequeña pausa para no saturar la API
    usleep(300000); // 0.3 segundos
}

echo str_repeat("-", 100) . PHP_EOL;
echo PHP_EOL;

// Mostrar estadísticas
echo "=== ESTADÍSTICAS ===" . PHP_EOL . PHP_EOL;
echo "Total de comprobantes locales: {$estadisticas['total']}" . PHP_EOL;
echo "Encontrados en NubeFact API: {$estadisticas['encontrados_api']}" . PHP_EOL;
echo "NO encontrados en NubeFact API: {$estadisticas['no_encontrados_api']}" . PHP_EOL;
echo PHP_EOL;

if ($estadisticas['diferencias_monto'] > 0) {
    echo "⚠️  Comprobantes con diferencias en monto: {$estadisticas['diferencias_monto']}" . PHP_EOL;
}

if ($estadisticas['diferencias_cliente'] > 0) {
    echo "⚠️  Comprobantes con diferencias en cliente: {$estadisticas['diferencias_cliente']}" . PHP_EOL;
}

if ($estadisticas['encontrados_api'] === $estadisticas['total'] &&
    $estadisticas['diferencias_monto'] === 0 &&
    $estadisticas['diferencias_cliente'] === 0) {
    echo PHP_EOL;
    echo "✅ Todos los comprobantes locales están correctamente sincronizados con NubeFact" . PHP_EOL;
}

echo PHP_EOL;

// Ahora verificar si NubeFact tiene comprobantes que NO están en local
echo "=== VERIFICACIÓN INVERSA: Comprobantes en NubeFact que NO están en local ===" . PHP_EOL . PHP_EOL;

echo "Consultando serie F010 del 1 al 30 en NubeFact..." . PHP_EOL;
echo str_repeat("-", 80) . PHP_EOL;

$faltantesEnLocal = [];

for ($num = 1; $num <= 30; $num++) {
    try {
        $response = $client->consultarComprobante(1, 'F010', $num);

        // Verificar si existe en local
        $existeLocal = $locales->first(function($c) use ($num) {
            return $c->serie === 'F010' && $c->correlativo == $num;
        });

        if (!$existeLocal) {
            $faltantesEnLocal[] = [
                'numero' => $num,
                'cliente' => $response['cliente_denominacion'] ?? '',
                'total' => $response['total'] ?? 0,
                'fecha' => $response['fecha_de_emision'] ?? '',
            ];

            printf(
                "  F010-%03d | Total: S/ %8.2f | Cliente: %s | Fecha: %s | ❌ NO ESTÁ EN LOCAL%s",
                $num,
                $response['total'] ?? 0,
                substr($response['cliente_denominacion'] ?? '', 0, 30),
                $response['fecha_de_emision'] ?? '',
                PHP_EOL
            );
        }

    } catch (Exception $e) {
        // Documento no existe en NubeFact, está bien
        if (str_contains($e->getMessage(), 'Documento no existe') || str_contains($e->getMessage(), '"codigo":24')) {
            continue;
        }

        // Otro error
        echo "  F010-$num | ERROR: " . $e->getMessage() . PHP_EOL;
    }

    usleep(300000); // 0.3 segundos
}

echo str_repeat("-", 80) . PHP_EOL;

if (empty($faltantesEnLocal)) {
    echo "✅ No hay comprobantes en NubeFact que falten en tu base de datos local" . PHP_EOL;
} else {
    echo "⚠️  Se encontraron " . count($faltantesEnLocal) . " comprobantes en NubeFact que NO están en local" . PHP_EOL;
    echo "    Debes sincronizar estos comprobantes para tener tu base de datos completa." . PHP_EOL;
}
