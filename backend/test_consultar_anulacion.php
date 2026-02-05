<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\NubefactClient;

echo "Consultando estado de anulación de F001-101...\n\n";

$client = new NubefactClient();

try {
    $resultado = $client->consultarAnulacion(1, 'F001', 101);
    
    echo "ESTADO DE ANULACIÓN:\n";
    echo "  - Aceptada por SUNAT: " . ($resultado['aceptada_por_sunat'] ? 'SÍ' : 'NO') . "\n";
    echo "  - Descripción: " . ($resultado['sunat_description'] ?? 'N/A') . "\n";
    echo "  - Nota: " . ($resultado['sunat_note'] ?? 'N/A') . "\n";
    echo "  - Ticket SUNAT: " . ($resultado['sunat_ticket_numero'] ?? 'N/A') . "\n\n";
    
    if (isset($resultado['aceptada_por_sunat']) && $resultado['aceptada_por_sunat'] == 1) {
        echo "✓ ANULACIÓN CONFIRMADA\n";
        echo "El comprobante F001-101 está oficialmente anulado en SUNAT.\n";
    } else {
        echo "⏳ PENDIENTE\n";
        echo "La anulación está en proceso. Consultar nuevamente más tarde.\n";
    }
    
    echo "\nRespuesta completa:\n";
    print_r($resultado);
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
