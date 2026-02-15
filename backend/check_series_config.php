<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== CONFIGURACIÓN DE SERIES ===" . PHP_EOL . PHP_EOL;

$series = DB::table('series')
    ->where('empresa_id', 2)
    ->orderBy('tipo_comprobante')
    ->orderBy('serie')
    ->get();

if ($series->isEmpty()) {
    echo "❌ NO hay series configuradas para la empresa 2" . PHP_EOL;
    exit(1);
}

echo "Series configuradas para Empresa 2:" . PHP_EOL;
echo str_repeat("-", 80) . PHP_EOL;
printf("%-10s | %-15s | %-15s | %-10s%s", "SERIE", "TIPO", "CORRELATIVO", "DEFECTO", PHP_EOL);
echo str_repeat("-", 80) . PHP_EOL;

foreach ($series as $s) {
    $tipoDesc = match($s->tipo_comprobante) {
        '1' => 'Factura',
        '2' => 'Boleta',
        '3' => 'N. Crédito',
        '4' => 'N. Débito',
        default => 'Desconocido'
    };

    printf(
        "%-10s | %-15s | %-15d | %-10s%s",
        $s->serie,
        $tipoDesc,
        $s->correlativo_actual,
        $s->por_defecto ? 'SÍ ✓' : 'NO',
        PHP_EOL
    );
}

echo str_repeat("-", 80) . PHP_EOL;
echo PHP_EOL;

// Verificar si hay F001 configurada
$f001 = DB::table('series')
    ->where('empresa_id', 2)
    ->where('serie', 'F001')
    ->first();

if ($f001) {
    echo "⚠️  ADVERTENCIA: Existe una serie F001 configurada" . PHP_EOL;
    echo "   Esta serie NO debe usarse. Solo F010 es válida en NubeFact." . PHP_EOL;
    echo PHP_EOL;
    echo "   ¿Deseas eliminar F001? Ejecuta:" . PHP_EOL;
    echo "   php check_series_config.php --delete-f001" . PHP_EOL;
}

if (in_array('--delete-f001', $argv)) {
    echo PHP_EOL;
    echo "🗑️  Eliminando serie F001..." . PHP_EOL;

    $deleted = DB::table('series')
        ->where('empresa_id', 2)
        ->where('serie', 'F001')
        ->delete();

    if ($deleted > 0) {
        echo "✅ Serie F001 eliminada exitosamente" . PHP_EOL;

        // Asegurar que F010 sea la serie por defecto
        DB::table('series')
            ->where('empresa_id', 2)
            ->where('serie', 'F010')
            ->where('tipo_comprobante', '1')
            ->update(['por_defecto' => true]);

        echo "✅ F010 configurada como serie por defecto" . PHP_EOL;
    }
}
