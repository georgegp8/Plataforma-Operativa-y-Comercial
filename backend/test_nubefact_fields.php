<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Services\NubefactClient;

echo "=== PRUEBA DE CAMPOS DE NUBEFACT API ===". PHP_EOL . PHP_EOL;

$client = app(NubefactClient::class);

// Obtener un comprobante de ejemplo de la BD
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

echo "Consultando comprobante: {$comprobante->serie}-{$comprobante->correlativo}" . PHP_EOL;
echo str_repeat("-", 80) . PHP_EOL . PHP_EOL;

try {
    $response = $client->consultarComprobante(1, $comprobante->serie, $comprobante->correlativo);

    echo "✅ RESPUESTA DE NUBEFACT API:" . PHP_EOL . PHP_EOL;
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL . PHP_EOL;

    echo str_repeat("=", 80) . PHP_EOL;
    echo "CAMPOS DISPONIBLES:" . PHP_EOL;
    echo str_repeat("=", 80) . PHP_EOL;

    foreach ($response as $key => $value) {
        $tipo = gettype($value);
        $valorMostrar = is_array($value) ? '[array con ' . count($value) . ' elementos]' :
                       (is_bool($value) ? ($value ? 'true' : 'false') :
                       (is_null($value) ? 'null' : $value));

        echo sprintf("%-35s | %-10s | %s%s",
            $key,
            $tipo,
            $valorMostrar,
            PHP_EOL
        );
    }

    echo PHP_EOL;

    // Si hay XML, descargarlo y parsear los montos reales
    if (!empty($response['enlace_del_xml'])) {
        echo str_repeat("=", 80) . PHP_EOL;
        echo "PARSEANDO XML PARA OBTENER MONTOS REALES:" . PHP_EOL;
        echo str_repeat("=", 80) . PHP_EOL . PHP_EOL;

        $xmlUrl = $response['enlace_del_xml'];
        echo "URL XML: $xmlUrl" . PHP_EOL . PHP_EOL;

        $xmlContent = @file_get_contents($xmlUrl);
        if ($xmlContent) {
            $doc = new DOMDocument();
            @$doc->loadXML($xmlContent);
            $xpath = new DOMXPath($doc);
            $xpath->registerNamespace('cac', 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2');
            $xpath->registerNamespace('cbc', 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2');

            // Extraer montos del XML
            $totales = [
                'Total Gravada' => $xpath->evaluate('string(//cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:ID="1000"]/cbc:TaxableAmount)'),
                'Total Exonerada' => $xpath->evaluate('string(//cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:ID="9997"]/cbc:TaxableAmount)'),
                'Total Inafecta' => $xpath->evaluate('string(//cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:ID="9998"]/cbc:TaxableAmount)'),
                'Total Gratuita' => $xpath->evaluate('string(//cac:AllowanceCharge[cbc:ChargeIndicator="false"]/cbc:Amount)'),
                'Total IGV' => $xpath->evaluate('string(//cac:TaxTotal[cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:ID="1000"]/cbc:TaxAmount)'),
                'Total Venta' => $xpath->evaluate('string(//cac:LegalMonetaryTotal/cbc:PayableAmount)'),
                'Cliente RUC/DNI' => $xpath->evaluate('string(//cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID)'),
                'Cliente Razón Social' => $xpath->evaluate('string(//cac:AccountingCustomerParty/cac:Party/cac:PartyLegalEntity/cbc:RegistrationName)'),
                'Forma de Pago' => $xpath->evaluate('string(//cac:PaymentTerms/cbc:PaymentMeansID)'),
            ];

            foreach ($totales as $label => $valor) {
                echo sprintf("%-25s: %s%s", $label, $valor ?: '(vacío)', PHP_EOL);
            }

            echo PHP_EOL;
        } else {
            echo "❌ No se pudo descargar el XML" . PHP_EOL;
        }
    }

} catch (Exception $e) {
    echo "❌ ERROR: " . $e->getMessage() . PHP_EOL;
}
