<?php

/**
 * Script: Consultar el comprobante recién generado
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\NubefactClient;

echo "===============================================\n";
echo "CONSULTA DE COMPROBANTE F001-101\n";
echo "===============================================\n\n";

$client = new NubefactClient();

try {
    $resultado = $client->consultarComprobante(1, 'F001', 101);
    
    echo "INFORMACIÓN DEL COMPROBANTE:\n\n";
    
    echo "Datos básicos:\n";
    echo "  - Tipo: " . ($resultado['tipo'] ?? 'N/A') . "\n";
    echo "  - Serie: " . ($resultado['serie'] ?? 'N/A') . "\n";
    echo "  - Número: " . ($resultado['numero'] ?? 'N/A') . "\n";
    echo "  - Fecha emisión: " . ($resultado['fecha_de_emision'] ?? 'N/A') . "\n";
    echo "  - Total: S/ " . ($resultado['total'] ?? 'N/A') . "\n\n";
    
    echo "Cliente:\n";
    echo "  - Documento: " . ($resultado['cliente_numero_de_documento'] ?? 'N/A') . "\n";
    echo "  - Nombre: " . ($resultado['cliente_denominacion'] ?? 'N/A') . "\n\n";
    
    echo "Estado SUNAT:\n";
    echo "  - Aceptada: " . ($resultado['aceptada_por_sunat'] ? 'SÍ' : 'NO') . "\n";
    echo "  - Descripción: " . ($resultado['sunat_description'] ?? 'N/A') . "\n";
    echo "  - Nota: " . ($resultado['sunat_note'] ?? 'N/A') . "\n";
    echo "  - Código respuesta: " . ($resultado['sunat_responsecode'] ?? 'N/A') . "\n";
    echo "  - SOAP Error: " . ($resultado['sunat_soap_error'] ?? 'N/A') . "\n\n";
    
    echo "Archivos generados:\n";
    if (isset($resultado['enlace_del_pdf'])) {
        echo "  - PDF: " . $resultado['enlace_del_pdf'] . "\n";
    }
    if (isset($resultado['enlace_del_xml'])) {
        echo "  - XML: " . $resultado['enlace_del_xml'] . "\n";
    }
    if (isset($resultado['enlace_del_cdr'])) {
        echo "  - CDR: " . $resultado['enlace_del_cdr'] . "\n";
    }
    
    echo "\n";
    echo "Códigos:\n";
    echo "  - Hash: " . ($resultado['codigo_hash'] ?? 'N/A') . "\n";
    echo "  - QR: " . (isset($resultado['codigo_qr']) ? 'Generado' : 'No disponible') . "\n\n";
    
    echo "===============================================\n";
    echo "RESPUESTA COMPLETA:\n";
    echo "===============================================\n";
    print_r($resultado);
    
} catch (Exception $e) {
    echo "Error al consultar: " . $e->getMessage() . "\n";
}
