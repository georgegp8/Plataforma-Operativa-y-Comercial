<?php

/**
 * Script de prueba: Consultar documentos en NubeFact (SOLO LECTURA)
 *
 * Ejecutar con: php test_nubefact_consultas.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\NubefactClient;

echo "===============================================\n";
echo "PRUEBA DE CONSULTAS NUBEFACT (SOLO LECTURA)\n";
echo "===============================================\n\n";

$client = new NubefactClient();

// Ejemplo de documentos a consultar (estos son ejemplos del manual)
// Ajusta estos valores según documentos reales que existan en tu cuenta
$documentosParaConsultar = [
    [
        'tipo' => 'Factura',
        'tipo_comprobante' => 1, // 1=Factura
        'serie' => 'F001',
        'numero' => 1,
    ],
    [
        'tipo' => 'Boleta',
        'tipo_comprobante' => 2, // 2=Boleta
        'serie' => 'B001',
        'numero' => 1,
    ],
];

echo "MODO: Solo consultas (no se generarán documentos nuevos)\n";
echo "URL: " . config('nubefact.base_url') . "\n";
echo "Auto SUNAT: " . (config('nubefact.enviar_automaticamente_sunat') ? 'Habilitado' : 'Deshabilitado') . "\n\n";

echo "===============================================\n";
echo "1. CONSULTAS DE COMPROBANTES\n";
echo "===============================================\n\n";

foreach ($documentosParaConsultar as $doc) {
    echo "Consultando {$doc['tipo']} {$doc['serie']}-{$doc['numero']}...\n";
    
    try {
        $resultado = $client->consultarComprobante(
            $doc['tipo_comprobante'],
            $doc['serie'],
            $doc['numero']
        );
        
        echo "  ✓ Respuesta recibida:\n";
        echo "    - Aceptada por SUNAT: " . ($resultado['aceptada_por_sunat'] ?? 'N/A') . "\n";
        echo "    - Descripción SUNAT: " . ($resultado['sunat_description'] ?? 'N/A') . "\n";
        echo "    - Nota SUNAT: " . ($resultado['sunat_note'] ?? 'N/A') . "\n";
        
        if (isset($resultado['enlace_del_pdf'])) {
            echo "    - PDF disponible: " . $resultado['enlace_del_pdf'] . "\n";
        }
        
        if (isset($resultado['enlace_del_xml'])) {
            echo "    - XML disponible: " . $resultado['enlace_del_xml'] . "\n";
        }
        
        if (isset($resultado['enlace_del_cdr'])) {
            echo "    - CDR disponible: " . $resultado['enlace_del_cdr'] . "\n";
        }
        
        echo "\n";
        
    } catch (Exception $e) {
        echo "  ⚠ Error: " . $e->getMessage() . "\n";
        echo "  (Es normal si este documento no existe en la cuenta)\n\n";
    }
}

echo "===============================================\n";
echo "2. INSTRUCCIONES PARA GENERAR COMPROBANTES\n";
echo "===============================================\n\n";

echo "Cuando estés listo para generar comprobantes de prueba:\n\n";

echo "1. Verificar que tienes datos de prueba:\n";
echo "   php artisan db:seed --class=DatosPruebaCompletos\n\n";

echo "2. Generar un comprobante de prueba (con auto envío a SUNAT):\n";
echo "   Usar ComprobanteService o llamar directamente a NubefactClient:\n\n";

echo "   Ejemplo en tinker:\n";
echo "   \$client = new App\\Services\\NubefactClient();\n";
echo "   \$data = [\n";
echo "       'operacion' => 'generar_comprobante',\n";
echo "       'tipo_de_comprobante' => 1, // Factura\n";
echo "       'serie' => 'F001',\n";
echo "       'numero' => 1,\n";
echo "       // ... resto de campos según manual\n";
echo "   ];\n";
echo "   \$resultado = \$client->generarComprobante(\$data);\n\n";

echo "3. Si no quieres enviar a SUNAT automáticamente:\n";
echo "   Cambiar en .env: NUBEFACT_AUTO_SUNAT=false\n\n";

echo "IMPORTANTE:\n";
echo "- Modo actual: " . config('nubefact.modo') . "\n";
echo "- Auto SUNAT: " . (config('nubefact.enviar_automaticamente_sunat') ? 'ACTIVADO (enviará a SUNAT)' : 'DESACTIVADO') . "\n";
echo "- Si generas documentos con AUTO_SUNAT=true, se enviarán a SUNAT\n";
echo "- Para pruebas seguras, usa AUTO_SUNAT=false o cuenta demo\n\n";

echo "===============================================\n";
echo "FIN DE CONSULTAS\n";
echo "===============================================\n";
