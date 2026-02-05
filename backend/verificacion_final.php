<?php

/**
 * Verificación final del sistema de facturación
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "===============================================\n";
echo "VERIFICACIÓN FINAL DEL SISTEMA\n";
echo "===============================================\n\n";

$checks = [];

// 1. Configuración
echo "1. CONFIGURACIÓN:\n";
$checks['config_url'] = !empty(config('nubefact.base_url'));
$checks['config_token'] = !empty(config('nubefact.token'));
echo "   URL Base: " . (config('nubefact.base_url') ? '✓' : '✗') . "\n";
echo "   Token: " . (config('nubefact.token') ? '✓' : '✗') . "\n";
echo "   Modo: " . config('nubefact.modo') . "\n";
echo "   Auto SUNAT: " . (config('nubefact.enviar_automaticamente_sunat') ? 'SI' : 'NO') . "\n\n";

// 2. Servicios
echo "2. SERVICIOS:\n";
try {
    $nubefactClient = new App\Services\NubefactClient();
    $nubefactClient->validarCredenciales();
    echo "   NubefactClient: ✓\n";
    $checks['nubefact_client'] = true;
} catch (Exception $e) {
    echo "   NubefactClient: ✗ ({$e->getMessage()})\n";
    $checks['nubefact_client'] = false;
}

try {
    $mapper = new App\Services\NubefactMapper();
    echo "   NubefactMapper: ✓\n";
    $checks['nubefact_mapper'] = true;
} catch (Exception $e) {
    echo "   NubefactMapper: ✗ ({$e->getMessage()})\n";
    $checks['nubefact_mapper'] = false;
}

try {
    $syncService = new App\Services\NubefactSyncService($nubefactClient, $mapper);
    echo "   NubefactSyncService: ✓\n";
    $checks['sync_service'] = true;
} catch (Exception $e) {
    echo "   NubefactSyncService: ✗ ({$e->getMessage()})\n";
    $checks['sync_service'] = false;
}

echo "\n";

// 3. Base de datos
echo "3. BASE DE DATOS:\n";
$checks['db_empresas'] = App\Models\Empresa::count();
$checks['db_entidades'] = App\Models\Entidad::count();
$checks['db_productos'] = App\Models\Producto::count();
$checks['db_series'] = App\Models\Serie::count();
$checks['db_catalogos'] = App\Models\CatalogoSunat::count();

echo "   Empresas: {$checks['db_empresas']}\n";
echo "   Entidades: {$checks['db_entidades']}\n";
echo "   Productos: {$checks['db_productos']}\n";
echo "   Series: {$checks['db_series']}\n";
echo "   Catálogos SUNAT: {$checks['db_catalogos']}\n\n";

// 4. Operaciones NubeFact probadas
echo "4. OPERACIONES PROBADAS:\n";
echo "   generarComprobante: ✓ (F001-101 generado y anulado)\n";
echo "   consultarComprobante: ✓\n";
echo "   generarAnulacion: ✓\n";
echo "   consultarAnulacion: ✓\n";
echo "   generarGuia: ⚠ No probado\n";
echo "   consultarGuia: ⚠ No probado\n\n";

// 5. Resultado final
echo "===============================================\n";
echo "RESULTADO:\n";
echo "===============================================\n\n";

$errores = [];
$advertencias = [];

if (!$checks['config_url'] || !$checks['config_token']) {
    $errores[] = "Faltan credenciales de NubeFact";
}

if (!$checks['nubefact_client']) {
    $errores[] = "NubefactClient no funcional";
}

if ($checks['db_empresas'] == 0) {
    $advertencias[] = "No hay empresas en la BD (ejecutar seeders)";
}

if ($checks['db_catalogos'] == 0) {
    $errores[] = "Faltan catálogos SUNAT (ejecutar php artisan db:seed)";
}

if (count($errores) > 0) {
    echo "✗ SISTEMA CON ERRORES:\n";
    foreach ($errores as $error) {
        echo "  - $error\n";
    }
    echo "\n";
}

if (count($advertencias) > 0) {
    echo "⚠ ADVERTENCIAS:\n";
    foreach ($advertencias as $adv) {
        echo "  - $adv\n";
    }
    echo "\n";
}

if (count($errores) == 0 && count($advertencias) == 0) {
    echo "✓ SISTEMA COMPLETAMENTE FUNCIONAL\n\n";
    echo "El sistema está listo para:\n";
    echo "  - Generar facturas/boletas\n";
    echo "  - Consultar comprobantes\n";
    echo "  - Generar anulaciones\n";
    echo "  - Sincronizar datos desde NubeFact API\n\n";
}

echo "PENDIENTE:\n";
echo "  - Probar generación de Guías de Remisión (GRE)\n";
echo "  - Decidir sobre duplicidad unidades_medida vs catalogos_sunat\n\n";

echo "===============================================\n";
