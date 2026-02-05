<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\GuiaRemision;

echo "===============================================\n";
echo "GUÍAS DE REMISIÓN - DATOS DE PRUEBA\n";
echo "===============================================\n\n";

$guias = GuiaRemision::with(['empresa', 'items'])->get();

if ($guias->isEmpty()) {
    echo "No hay guías de remisión en la base de datos.\n";
    exit;
}

foreach ($guias as $i => $guia) {
    echo "GUÍA #" . ($i + 1) . ":\n";
    echo "  Serie-Número: {$guia->serie}-{$guia->numero}\n";
    echo "  Empresa: " . ($guia->empresa->razon_social ?? 'N/A') . "\n";
    echo "  Destinatario: {$guia->destinatario_denominacion}\n";
    echo "  Destinatario doc: {$guia->destinatario_numero_documento}\n";
    echo "  Motivo traslado: {$guia->motivo_traslado}\n";
    echo "  Fecha emisión: {$guia->fecha_emision}\n";
    echo "  Fecha inicio traslado: {$guia->fecha_inicio_traslado}\n";
    echo "  Peso total: {$guia->peso_bruto_total} {$guia->peso_bruto_unidad}\n";
    echo "  Vehículo: {$guia->vehiculo_placa}\n";
    echo "  Conductor: {$guia->conductor_nombre} {$guia->conductor_apellidos}\n";
    echo "  Conductor licencia: {$guia->conductor_licencia}\n";
    echo "  Partida: {$guia->punto_partida_ubigeo} - {$guia->punto_partida_direccion}\n";
    echo "  Llegada: {$guia->punto_llegada_ubigeo} - {$guia->punto_llegada_direccion}\n";
    echo "  Estado: {$guia->estado}\n";
    echo "  NubeFact enviado: " . ($guia->nubefact_enviado_at ? '✓ ' . $guia->nubefact_enviado_at : '✗') . "\n";
    
    if ($guia->items && count($guia->items) > 0) {
        echo "  Items (" . count($guia->items) . "):\n";
        foreach ($guia->items as $item) {
            echo "    - {$item->descripcion} (Cantidad: {$item->cantidad})\n";
        }
    }
    
    echo "\n";
}

echo "===============================================\n";
echo "Total: " . $guias->count() . " guías\n";
echo "===============================================\n";
