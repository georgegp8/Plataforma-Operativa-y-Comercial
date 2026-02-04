<?php

/**
 * Script de prueba para los endpoints de sincronización NubeFact
 */
$baseUrl = 'http://127.0.0.1:8000/api/nubefact-sync';

echo "=== PRUEBA DE ENDPOINTS DE SINCRONIZACIÓN NUBEFACT ===\n\n";

// Test 1: Verificar estado
echo "1. Verificando estado de conexión...\n";
$response = file_get_contents("$baseUrl/estado");
$data = json_decode($response, true);
echo 'Respuesta: '.json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)."\n\n";

// Test 2: Obtener estadísticas
echo "2. Obteniendo estadísticas...\n";
$response = file_get_contents("$baseUrl/estadisticas");
$data = json_decode($response, true);
echo 'Respuesta: '.json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)."\n\n";

// Test 3: Consultar un comprobante específico (sin guardar)
echo "3. Consultando comprobante 01-F010-21...\n";
$response = @file_get_contents("$baseUrl/consultar/01/F010/21");
if ($response === false) {
    echo "Error al consultar comprobante\n\n";
} else {
    $data = json_decode($response, true);
    echo 'Respuesta: '.json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)."\n\n";
}

// Test 4: Sincronizar un comprobante individual
echo "4. Sincronizando comprobante 01-F010-21...\n";
$postData = json_encode([
    'tipo_doc' => '01',
    'serie' => 'F010',
    'numero' => 21,
    'empresa_id' => 1,
]);

$options = [
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => $postData,
    ],
];

$context = stream_context_create($options);
$response = @file_get_contents("$baseUrl/comprobante", false, $context);
if ($response === false) {
    echo "Error al sincronizar comprobante\n";
    echo 'Error: '.error_get_last()['message']."\n\n";
} else {
    $data = json_decode($response, true);
    echo 'Respuesta: '.json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)."\n\n";
}

echo "=== PRUEBAS COMPLETADAS ===\n";
