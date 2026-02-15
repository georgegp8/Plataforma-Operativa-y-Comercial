<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== CORRECCIÓN DE SERIES DUPLICADAS ===" . PHP_EOL . PHP_EOL;

// Paso 1: Identificar duplicados
echo "Paso 1: Identificando comprobantes duplicados..." . PHP_EOL;

$duplicados = DB::select("
    SELECT
        c1.id as id_f001,
        c1.serie as serie_f001,
        c1.correlativo,
        c2.id as id_f010,
        c2.serie as serie_f010,
        c1.cliente_razon_social
    FROM comprobantes c1
    INNER JOIN comprobantes c2 ON
        c1.correlativo = c2.correlativo AND
        c1.empresa_id = c2.empresa_id AND
        c1.tipo_doc = c2.tipo_doc
    WHERE
        c1.serie = 'F001' AND
        c2.serie = 'F010' AND
        c1.deleted_at IS NULL AND
        c2.deleted_at IS NULL
    ORDER BY CAST(c1.correlativo AS INTEGER)
");

echo "Se encontraron " . count($duplicados) . " comprobantes duplicados." . PHP_EOL . PHP_EOL;

if (empty($duplicados)) {
    echo "✅ No hay duplicados que corregir." . PHP_EOL;
    exit(0);
}

// Mostrar duplicados
echo "Comprobantes que serán eliminados (F001):" . PHP_EOL;
echo str_repeat("-", 80) . PHP_EOL;

foreach ($duplicados as $dup) {
    echo sprintf(
        "  %s-%s (ID: %d) → Eliminar (existe en F010 como ID: %d)%s",
        $dup->serie_f001,
        str_pad($dup->correlativo, 8, '0', STR_PAD_LEFT),
        $dup->id_f001,
        $dup->id_f010,
        PHP_EOL
    );
}

echo PHP_EOL;

// Paso 2: Buscar F001 que NO tienen equivalente en F010 (estos deberían actualizarse a F010)
echo "Paso 2: Identificando F001 sin equivalente en F010..." . PHP_EOL;

$sinEquivalente = DB::select("
    SELECT
        c1.id,
        c1.serie,
        c1.correlativo,
        c1.cliente_razon_social
    FROM comprobantes c1
    WHERE
        c1.serie = 'F001' AND
        c1.deleted_at IS NULL AND
        NOT EXISTS (
            SELECT 1
            FROM comprobantes c2
            WHERE
                c2.serie = 'F010' AND
                c2.correlativo = c1.correlativo AND
                c2.empresa_id = c1.empresa_id AND
                c2.tipo_doc = c1.tipo_doc AND
                c2.deleted_at IS NULL
        )
    ORDER BY CAST(c1.correlativo AS INTEGER)
");

if (!empty($sinEquivalente)) {
    echo "Se encontraron " . count($sinEquivalente) . " comprobantes F001 que deben cambiar a F010:" . PHP_EOL;
    echo str_repeat("-", 80) . PHP_EOL;

    foreach ($sinEquivalente as $comp) {
        echo sprintf(
            "  %s-%s (ID: %d) → Cambiar a F010%s",
            $comp->serie,
            str_pad($comp->correlativo, 8, '0', STR_PAD_LEFT),
            $comp->id,
            PHP_EOL
        );
    }
    echo PHP_EOL;
}

// ADVERTENCIA - No ejecutar automáticamente
echo PHP_EOL;
echo str_repeat("=", 80) . PHP_EOL;
echo "⚠️  ADVERTENCIA: Este script solo muestra qué se debe hacer." . PHP_EOL;
echo "⚠️  NO se han realizado cambios en la base de datos." . PHP_EOL;
echo str_repeat("=", 80) . PHP_EOL;
echo PHP_EOL;

echo "Para aplicar los cambios, ejecuta:" . PHP_EOL;
echo "  php fix_duplicate_series.php --apply" . PHP_EOL;
echo PHP_EOL;

// Si se pasa --apply, ejecutar los cambios
if (in_array('--apply', $argv)) {
    echo PHP_EOL;
    echo "🔧 APLICANDO CAMBIOS..." . PHP_EOL . PHP_EOL;

    DB::beginTransaction();

    try {
        // Eliminar duplicados de F001
        $idsAEliminar = array_column($duplicados, 'id_f001');

        if (!empty($idsAEliminar)) {
            $deleted = DB::table('comprobantes')
                ->whereIn('id', $idsAEliminar)
                ->delete();

            echo "✅ Eliminados $deleted comprobantes duplicados de F001" . PHP_EOL;
        }

        // Actualizar F001 sin equivalente a F010
        if (!empty($sinEquivalente)) {
            $idsAActualizar = array_column($sinEquivalente, 'id');

            $updated = DB::table('comprobantes')
                ->whereIn('id', $idsAActualizar)
                ->update(['serie' => 'F010']);

            echo "✅ Actualizados $updated comprobantes de F001 a F010" . PHP_EOL;
        }

        DB::commit();

        echo PHP_EOL;
        echo "✅ ¡Cambios aplicados exitosamente!" . PHP_EOL;

        // Mostrar estadísticas finales
        echo PHP_EOL;
        echo "Estadísticas finales:" . PHP_EOL;

        $final = DB::table('comprobantes')
            ->whereNull('deleted_at')
            ->selectRaw('serie, COUNT(*) as total')
            ->groupBy('serie')
            ->get();

        foreach ($final as $s) {
            echo "  Serie {$s->serie}: {$s->total} comprobantes" . PHP_EOL;
        }

    } catch (Exception $e) {
        DB::rollBack();
        echo PHP_EOL;
        echo "❌ ERROR: " . $e->getMessage() . PHP_EOL;
        echo "Los cambios NO se aplicaron." . PHP_EOL;
        exit(1);
    }
}
