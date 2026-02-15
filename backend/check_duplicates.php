<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Buscar duplicados
$duplicados = DB::select("
    SELECT
        empresa_id,
        tipo_doc,
        serie,
        correlativo,
        COUNT(*) as cantidad,
        STRING_AGG(CAST(id AS TEXT), ', ') as ids
    FROM comprobantes
    WHERE deleted_at IS NULL
    GROUP BY empresa_id, tipo_doc, serie, correlativo
    HAVING COUNT(*) > 1
    ORDER BY cantidad DESC, serie, correlativo
");

echo "=== BÚSQUEDA DE DUPLICADOS ===" . PHP_EOL . PHP_EOL;

if (empty($duplicados)) {
    echo "✅ NO hay duplicados en la base de datos" . PHP_EOL . PHP_EOL;
} else {
    echo "❌ Se encontraron " . count($duplicados) . " grupos de comprobantes duplicados:" . PHP_EOL . PHP_EOL;
    foreach ($duplicados as $dup) {
        echo sprintf(
            "  Empresa %d | %s-%s-%s | %d copias | IDs: %s%s",
            $dup->empresa_id,
            $dup->tipo_doc,
            $dup->serie,
            $dup->correlativo,
            $dup->cantidad,
            $dup->ids,
            PHP_EOL
        );
    }
    echo PHP_EOL;
}

// Estadísticas generales
echo "=== ESTADÍSTICAS GENERALES ===" . PHP_EOL . PHP_EOL;

$total = DB::table('comprobantes')->whereNull('deleted_at')->count();
echo "Total de comprobantes: $total" . PHP_EOL . PHP_EOL;

$stats = DB::table('comprobantes')
    ->whereNull('deleted_at')
    ->selectRaw('empresa_id, tipo_doc, serie, MIN(correlativo) as desde, MAX(correlativo) as hasta, COUNT(*) as total')
    ->groupBy('empresa_id', 'tipo_doc', 'serie')
    ->orderBy('empresa_id')
    ->orderBy('serie')
    ->get();

echo "Comprobantes por serie:" . PHP_EOL;
foreach ($stats as $s) {
    echo sprintf(
        "  Empresa %d | %s-%s | Rango: %s-%s | Total: %d%s",
        $s->empresa_id,
        $s->tipo_doc,
        $s->serie,
        $s->desde,
        $s->hasta,
        $s->total,
        PHP_EOL
    );
}
