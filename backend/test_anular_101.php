<?php

/**
 * Script: Anular comprobante F001-101
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\NubefactClient;

echo "===============================================\n";
echo "ANULACIÓN DE COMPROBANTE F001-101\n";
echo "===============================================\n\n";

$client = new NubefactClient();

$data = [
    'tipo_de_comprobante' => 1, // 1=Factura
    'serie' => 'F001',
    'numero' => 101,
    'motivo' => 'Anulación por comprobante de prueba generado por error',
    'fecha_de_emision' => '04-02-2026', // Fecha del documento original
];

echo "Datos de anulación:\n";
echo "  - Comprobante: Factura F001-101\n";
echo "  - Motivo: {$data['motivo']}\n";
echo "  - Fecha emisión original: {$data['fecha_de_emision']}\n\n";

echo "Enviando solicitud de anulación a NubeFact...\n\n";

try {
    $resultado = $client->generarAnulacion(
        $data['tipo_de_comprobante'],
        $data['serie'],
        $data['numero'],
        $data['motivo'],
        $data['fecha_de_emision']
    );
    
    echo "✓ Anulación generada\n\n";
    
    echo "RESPUESTA:\n";
    echo "  - Aceptada por SUNAT: " . ($resultado['aceptada_por_sunat'] ?? 'N/A') . "\n";
    echo "  - Descripción: " . ($resultado['sunat_description'] ?? 'N/A') . "\n";
    echo "  - Nota: " . ($resultado['sunat_note'] ?? 'N/A') . "\n";
    echo "  - Código respuesta: " . ($resultado['sunat_responsecode'] ?? 'N/A') . "\n";
    
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
    echo "===============================================\n";
    echo "RESPUESTA COMPLETA:\n";
    echo "===============================================\n";
    print_r($resultado);
    
    if (isset($resultado['aceptada_por_sunat']) && $resultado['aceptada_por_sunat'] == 1) {
        echo "\n✓ ANULACIÓN ACEPTADA POR SUNAT\n";
        echo "El comprobante F001-101 ha sido anulado exitosamente.\n";
    } else {
        echo "\n⚠ VERIFICAR ESTADO DE ANULACIÓN\n";
        echo "Consultar más tarde con consultarAnulacion()\n";
    }
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

echo "\n===============================================\n";
