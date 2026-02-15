<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== ANÁLISIS DETALLADO DE SERIES ===" . PHP_EOL . PHP_EOL;

// Ver todos los comprobantes agrupados por serie
$porSerie = DB::table('comprobantes')
    ->whereNull('deleted_at')
    ->select('serie', 'correlativo', 'id', 'cliente_razon_social')
    ->orderBy('serie')
    ->orderBy('correlativo')
    ->get();

$series = $porSerie->groupBy('serie');

foreach ($series as $serie => $comprobantes) {
    echo "Serie: $serie (Total: " . $comprobantes->count() . " comprobantes)" . PHP_EOL;
    echo str_repeat("-", 80) . PHP_EOL;

    foreach ($comprobantes as $comp) {
        echo sprintf(
            "  %s-%s | ID: %d | %s%s",
            $serie,
            str_pad($comp->correlativo, 8, '0', STR_PAD_LEFT),
            $comp->id,
            substr($comp->cliente_razon_social, 0, 40),
            PHP_EOL
        );
    }
    echo PHP_EOL;
}

// Ver distribución de correlativos
echo "=== DISTRIBUCIÓN DE CORRELATIVOS ===" . PHP_EOL . PHP_EOL;

$distribucion = DB::table('comprobantes')
    ->whereNull('deleted_at')
    ->selectRaw('serie, MIN(CAST(correlativo AS INTEGER)) as min_corr, MAX(CAST(correlativo AS INTEGER)) as max_corr, COUNT(*) as total')
    ->groupBy('serie')
    ->get();

foreach ($distribucion as $d) {
    echo sprintf(
        "Serie %s: correlativos del %d al %d (%d comprobantes)%s",
        $d->serie,
        $d->min_corr,
        $d->max_corr,
        $d->total,
        PHP_EOL
    );

    // Verificar si hay huecos en la secuencia
    $expected = $d->max_corr - $d->min_corr + 1;
    if ($expected != $d->total) {
        echo "  ⚠️  ADVERTENCIA: Faltan " . ($expected - $d->total) . " correlativos en la secuencia" . PHP_EOL;
    }
}

echo PHP_EOL;

// Verificar si hay correlativos repetidos en diferentes series
echo "=== CORRELATIVOS COMPARTIDOS ENTRE SERIES ===" . PHP_EOL . PHP_EOL;

$compartidos = DB::select("
    SELECT
        correlativo,
        COUNT(DISTINCT serie) as series_diferentes,
        STRING_AGG(DISTINCT serie, ', ') as series
    FROM comprobantes
    WHERE deleted_at IS NULL
    GROUP BY correlativo
    HAVING COUNT(DISTINCT serie) > 1
    ORDER BY CAST(correlativo AS INTEGER)
");

if (empty($compartidos)) {
    echo "✅ No hay correlativos compartidos entre series diferentes" . PHP_EOL;
} else {
    echo "⚠️  Correlativos usados en múltiples series:" . PHP_EOL;
    foreach ($compartidos as $c) {
        echo sprintf(
            "  Correlativo %s: usado en %d series (%s)%s",
            $c->correlativo,
            $c->series_diferentes,
            $c->series,
            PHP_EOL
        );
    }
}
