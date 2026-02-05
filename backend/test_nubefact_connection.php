<?php

/**
 * Script de prueba: Verificar conexión con NubeFact
 *
 * Ejecutar con: php test_nubefact_connection.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\NubefactClient;

echo "===============================================\n";
echo "PRUEBA DE CONEXIÓN NUBEFACT\n";
echo "===============================================\n\n";

// 1. Verificar configuración
echo "1. CONFIGURACIÓN:\n";
echo "   URL Base: " . config('nubefact.base_url') . "\n";
echo "   Token: " . substr(config('nubefact.token'), 0, 20) . "...\n";
echo "   Modo: " . config('nubefact.modo') . "\n";
echo "   Auto SUNAT: " . (config('nubefact.enviar_automaticamente_sunat') ? 'SI' : 'NO') . "\n";
echo "   Formato PDF: " . config('nubefact.formato_pdf') . "\n\n";

// 2. Validar credenciales
echo "2. VALIDACIÓN:\n";
try {
    $client = new NubefactClient();
    $client->validarCredenciales();
    echo "   ✓ Credenciales válidas\n\n";
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n\n";
    exit(1);
}

// 3. Verificar datos de prueba
echo "3. DATOS DE PRUEBA DISPONIBLES:\n";
$empresa = \App\Models\Empresa::where('ruc', '20600695771')->first();
if ($empresa) {
    echo "   ✓ Empresa: {$empresa->razon_social} (RUC: {$empresa->ruc})\n";
} else {
    echo "   ✗ No se encontró empresa de prueba\n";
}

$cliente = \App\Models\Entidad::where('num_doc', '20434906301')->first();
if ($cliente) {
    echo "   ✓ Cliente: {$cliente->denominacion} (RUC: {$cliente->num_doc})\n";
} else {
    echo "   ✗ No se encontró cliente de prueba\n";
    echo "      Total clientes: " . \App\Models\Entidad::count() . "\n";
}

$producto = \App\Models\Producto::where('codigo', 'PROD001')->first();
if ($producto) {
    echo "   ✓ Producto: {$producto->nombre} (Código: {$producto->codigo})\n";
} else {
    echo "   ✗ No se encontró producto de prueba\n";
}

$serie = \App\Models\Serie::where('serie', 'F001')->first();
if ($serie) {
    echo "   ✓ Serie: {$serie->serie} (Correlativo actual: {$serie->correlativo_actual})\n";
} else {
    echo "   ✗ No se encontró serie de prueba\n";
}

echo "\n";
echo "4. ESTADO:\n";
if ($empresa && $cliente && $producto && $serie) {
    echo "   ✓ Sistema listo para generar comprobantes de prueba\n";
    echo "\n";
    echo "   Siguiente paso: Crear comprobante de prueba\n";
    echo "   Ejemplo: php artisan tinker\n";
    echo "   >> \$service = new App\Services\ComprobanteService();\n";
    echo "   >> // Crear comprobante usando los datos de prueba\n";
} else {
    echo "   ⚠ Faltan datos de prueba. Ejecutar: php artisan db:seed\n";
}

echo "\n===============================================\n";
echo "FIN DE PRUEBA\n";
echo "===============================================\n";
