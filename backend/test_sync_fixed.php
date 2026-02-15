<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\NubefactSyncService;

echo "=== PRUEBA DE SINCRONIZACIÓN CORREGIDA ===". PHP_EOL . PHP_EOL;

$syncService = app(NubefactSyncService::class);

// Obtener un comprobante existente para re-sincronizar
$comprobante = DB::table('comprobantes')
    ->whereNotNull('serie')
    ->whereNotNull('correlativo')
    ->where('tipo_doc', '01')
    ->whereNull('deleted_at')
    ->first();

if (!$comprobante) {
    echo "❌ No hay comprobantes en la base de datos para probar" . PHP_EOL;
    exit(1);
}

echo "Comprobante a sincronizar: {$comprobante->serie}-{$comprobante->correlativo}" . PHP_EOL;
echo str_repeat("-", 100) . PHP_EOL . PHP_EOL;

// Mostrar datos ANTES de sincronizar
echo "📋 DATOS ANTES DE SINCRONIZAR:" . PHP_EOL;
echo sprintf("  Cliente: %s%s", $comprobante->cliente_razon_social ?? 'N/A', PHP_EOL);
echo sprintf("  Total Gravada: S/ %.2f%s", $comprobante->mto_oper_gravadas ?? 0, PHP_EOL);
echo sprintf("  Total Exonerada: S/ %.2f%s", $comprobante->mto_oper_exoneradas ?? 0, PHP_EOL);
echo sprintf("  Total Inafecta: S/ %.2f%s", $comprobante->mto_oper_inafectas ?? 0, PHP_EOL);
echo sprintf("  Total Gratuita: S/ %.2f%s", $comprobante->mto_oper_gratuitas ?? 0, PHP_EOL);
echo sprintf("  Total IGV: S/ %.2f%s", $comprobante->mto_igv ?? 0, PHP_EOL);
echo sprintf("  Total Venta: S/ %.2f%s", $comprobante->mto_imp_venta ?? 0, PHP_EOL);
echo sprintf("  Estado SUNAT: %s%s", $comprobante->estado_sunat ?? 'N/A', PHP_EOL);
echo sprintf("  Anulado: %s%s", $comprobante->anulado ? 'SÍ' : 'NO', PHP_EOL);
echo sprintf("  Forma de Pago: %s%s", $comprobante->forma_pago ?? 'N/A', PHP_EOL);
echo PHP_EOL;

// SINCRONIZAR
echo "🔄 SINCRONIZANDO..." . PHP_EOL . PHP_EOL;

$resultado = $syncService->sincronizarComprobante(
    $comprobante->tipo_doc,
    $comprobante->serie,
    $comprobante->correlativo,
    $comprobante->empresa_id
);

if (!$resultado['success']) {
    echo "❌ ERROR: " . $resultado['mensaje'] . PHP_EOL;
    exit(1);
}

echo "✅ " . $resultado['mensaje'] . PHP_EOL . PHP_EOL;

// Recargar comprobante desde BD
$comprobanteActualizado = DB::table('comprobantes')
    ->where('id', $comprobante->id)
    ->first();

// Mostrar datos DESPUÉS de sincronizar
echo str_repeat("=", 100) . PHP_EOL;
echo "📋 DATOS DESPUÉS DE SINCRONIZAR:" . PHP_EOL;
echo str_repeat("=", 100) . PHP_EOL;
echo sprintf("  Cliente: %s%s", $comprobanteActualizado->cliente_razon_social ?? 'N/A', PHP_EOL);
echo sprintf("  Total Gravada: S/ %.2f%s", $comprobanteActualizado->mto_oper_gravadas ?? 0, PHP_EOL);
echo sprintf("  Total Exonerada: S/ %.2f%s", $comprobanteActualizado->mto_oper_exoneradas ?? 0, PHP_EOL);
echo sprintf("  Total Inafecta: S/ %.2f%s", $comprobanteActualizado->mto_oper_inafectas ?? 0, PHP_EOL);
echo sprintf("  Total Gratuita: S/ %.2f%s", $comprobanteActualizado->mto_oper_gratuitas ?? 0, PHP_EOL);
echo sprintf("  Total IGV: S/ %.2f%s", $comprobanteActualizado->mto_igv ?? 0, PHP_EOL);
echo sprintf("  Total Venta: S/ %.2f%s", $comprobanteActualizado->mto_imp_venta ?? 0, PHP_EOL);
echo sprintf("  Estado SUNAT: %s%s", $comprobanteActualizado->estado_sunat ?? 'N/A', PHP_EOL);
echo sprintf("  Anulado: %s%s", $comprobanteActualizado->anulado ? 'SÍ' : 'NO', PHP_EOL);
echo sprintf("  Forma de Pago: %s%s", $comprobanteActualizado->forma_pago ?? 'N/A', PHP_EOL);
echo sprintf("  Moneda: %s%s", $comprobanteActualizado->codigo_tipo_moneda ?? 'N/A', PHP_EOL);
echo sprintf("  PDF URL: %s%s", $comprobanteActualizado->nubefact_pdf_url ? '✓ Disponible' : '✗ No disponible', PHP_EOL);
echo sprintf("  XML URL: %s%s", $comprobanteActualizado->nubefact_xml_url ? '✓ Disponible' : '✗ No disponible', PHP_EOL);
echo sprintf("  CDR URL: %s%s", $comprobanteActualizado->nubefact_cdr_url ? '✓ Disponible' : '✗ No disponible', PHP_EOL);
echo PHP_EOL;

// Verificar items
$itemsCount = DB::table('comprobante_items')
    ->where('comprobante_id', $comprobante->id)
    ->count();

echo str_repeat("=", 100) . PHP_EOL;
echo sprintf("📦 ITEMS: %d items encontrados%s", $itemsCount, PHP_EOL);
echo str_repeat("=", 100) . PHP_EOL;

if ($itemsCount > 0) {
    $items = DB::table('comprobante_items')
        ->where('comprobante_id', $comprobante->id)
        ->get();

    foreach ($items as $item) {
        echo sprintf("  %d. %s - Cant: %.2f - P.Unit: S/ %.2f - Total: S/ %.2f%s",
            $item->item,
            $item->descripcion,
            $item->cantidad,
            $item->mto_precio_unitario,
            $item->mto_valor_venta + $item->igv,
            PHP_EOL
        );
    }
} else {
    echo "  ℹ️  No hay items sincronizados. Ejecuta el enriquecimiento desde XML si necesitas items." . PHP_EOL;
}

echo PHP_EOL;
echo "✅ Sincronización completada exitosamente" . PHP_EOL;
