<?php

/**
 * Script de prueba: Generar comprobante de prueba SIN enviar a SUNAT
 *
 * Ejecutar con: php test_nubefact_generar.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Services\NubefactClient;
use App\Models\Empresa;
use App\Models\Entidad;
use App\Models\Producto;
use App\Models\Serie;

echo "===============================================\n";
echo "PRUEBA DE GENERACIÓN DE COMPROBANTE\n";
echo "===============================================\n\n";

// Verificar configuración
echo "1. CONFIGURACIÓN:\n";
echo "   Auto SUNAT: " . (config('nubefact.enviar_automaticamente_sunat') ? 'ACTIVADO (ENVIARÁ A SUNAT)' : 'DESACTIVADO (No enviará)') . "\n";
echo "   Modo: " . config('nubefact.modo') . "\n\n";

if (config('nubefact.enviar_automaticamente_sunat')) {
    echo "⚠ ADVERTENCIA: Auto SUNAT está activado. El documento se enviará a SUNAT.\n";
    echo "Para pruebas seguras, cambia NUBEFACT_AUTO_SUNAT=false en .env\n\n";
    exit(1);
}

// Cargar datos de prueba
echo "2. CARGANDO DATOS DE PRUEBA:\n";

$empresa = Empresa::where('ruc', '20600695771')->first();
if (!$empresa) {
    echo "   ✗ Empresa no encontrada. Ejecutar: php artisan db:seed\n";
    exit(1);
}
echo "   ✓ Empresa: {$empresa->razon_social}\n";

$cliente = Entidad::where('num_doc', '20434906301')->first();
if (!$cliente) {
    echo "   ✗ Cliente no encontrado\n";
    exit(1);
}
echo "   ✓ Cliente: {$cliente->denominacion}\n";

$producto = Producto::where('codigo', 'PROD001')->first();
if (!$producto) {
    echo "   ✗ Producto no encontrado\n";
    exit(1);
}
echo "   ✓ Producto: {$producto->nombre}\n";

$serie = Serie::where('serie', 'F001')->first();
if (!$serie) {
    echo "   ✗ Serie no encontrada\n";
    exit(1);
}
echo "   ✓ Serie: {$serie->serie} (Correlativo: {$serie->correlativo_actual})\n\n";

// Construir JSON según manual NubeFact
echo "3. CONSTRUYENDO COMPROBANTE:\n";

$numeroComprobante = $serie->correlativo_actual + 1;
echo "   Número: {$serie->serie}-{$numeroComprobante}\n";

$data = [
    'operacion' => 'generar_comprobante',
    'tipo_de_comprobante' => 1, // 1=Factura
    'serie' => $serie->serie,
    'numero' => $numeroComprobante,
    'sunat_transaction' => 1, // 1=Venta interna
    'cliente_tipo_de_documento' => '6', // RUC
    'cliente_numero_de_documento' => $cliente->num_doc,
    'cliente_denominacion' => $cliente->denominacion,
    'cliente_direccion' => $cliente->direccion ?? 'LIMA - PERU',
    'cliente_email' => $cliente->email ?? '',
    'fecha_de_emision' => date('d-m-Y'),
    'moneda' => 1, // 1=PEN (Soles)
    'tipo_de_cambio' => '',
    'porcentaje_de_igv' => 18.00,
    'descuento_global' => '',
    'total_descuento' => '',
    'total_anticipo' => '',
    'total_gravada' => 100.00,
    'total_inafecta' => '',
    'total_exonerada' => '',
    'total_igv' => 18.00,
    'total_gratuita' => '',
    'total_otros_cargos' => '',
    'total' => 118.00,
    'percepcion_tipo' => '',
    'percepcion_base_imponible' => '',
    'total_percepcion' => '',
    'total_incluido_percepcion' => '',
    'detraccion' => false,
    'observaciones' => 'Comprobante de prueba generado desde sistema',
    'documento_que_se_modifica_tipo' => '',
    'documento_que_se_modifica_serie' => '',
    'documento_que_se_modifica_numero' => '',
    'tipo_de_nota_de_credito' => '',
    'tipo_de_nota_de_debito' => '',
    'enviar_automaticamente_a_la_sunat' => config('nubefact.enviar_automaticamente_sunat'),
    'enviar_automaticamente_al_cliente' => config('nubefact.enviar_automaticamente_cliente'),
    'codigo_unico' => '', // Opcional
    'condiciones_de_pago' => '', // Opcional
    'medio_de_pago' => '', // Opcional
    'placa_vehiculo' => '', // Opcional
    'orden_compra_servicio' => '', // Opcional
    'tabla_personalizada_codigo' => '', // Opcional
    'formato_de_pdf' => config('nubefact.formato_pdf'),
    
    // Items
    'items' => [
        [
            'unidad_de_medida' => 'NIU', // NIU = Unidad (catálogo 03 SUNAT)
            'codigo' => $producto->codigo,
            'descripcion' => $producto->nombre ?: 'Producto de prueba',
            'cantidad' => 1,
            'valor_unitario' => 100.00,
            'precio_unitario' => 118.00,
            'descuento' => '',
            'subtotal' => 100.00,
            'tipo_de_igv' => 1, // 1=Gravado - Operación Onerosa
            'igv' => 18.00,
            'total' => 118.00,
            'anticipo_regularizacion' => false,
            'anticipo_documento_serie' => '',
            'anticipo_documento_numero' => '',
        ]
    ]
];

echo "   Tipo: Factura\n";
echo "   Serie: {$data['serie']}\n";
echo "   Número: {$data['numero']}\n";
echo "   Cliente: {$data['cliente_denominacion']}\n";
echo "   Total: S/ {$data['total']}\n\n";

// Generar comprobante
echo "4. ENVIANDO A NUBEFACT (SIN ENVIAR A SUNAT):\n";

try {
    $client = new NubefactClient();
    $resultado = $client->generarComprobante($data);
    
    echo "   ✓ Comprobante generado correctamente\n\n";
    
    echo "5. RESPUESTA DE NUBEFACT:\n";
    echo "   - Tipo: " . ($resultado['tipo'] ?? 'N/A') . "\n";
    echo "   - Serie: " . ($resultado['serie'] ?? 'N/A') . "\n";
    echo "   - Número: " . ($resultado['numero'] ?? 'N/A') . "\n";
    echo "   - Aceptada por SUNAT: " . ($resultado['aceptada_por_sunat'] ?? 'N/A') . "\n";
    echo "   - Descripción SUNAT: " . ($resultado['sunat_description'] ?? 'N/A') . "\n";
    echo "   - Nota SUNAT: " . ($resultado['sunat_note'] ?? 'N/A') . "\n";
    echo "   - Código respuesta SUNAT: " . ($resultado['sunat_responsecode'] ?? 'N/A') . "\n";
    echo "   - SOAP Error: " . ($resultado['sunat_soap_error'] ?? 'N/A') . "\n";
    echo "   - Código único: " . ($resultado['codigo_unico'] ?? 'N/A') . "\n";
    echo "   - Código hash: " . ($resultado['codigo_hash'] ?? 'N/A') . "\n";
    echo "   - Código QR: " . ($resultado['codigo_qr'] ?? 'N/A') . "\n\n";
    
    if (isset($resultado['enlace_del_pdf'])) {
        echo "   - PDF: " . $resultado['enlace_del_pdf'] . "\n";
    }
    if (isset($resultado['enlace_del_xml'])) {
        echo "   - XML: " . $resultado['enlace_del_xml'] . "\n";
    }
    if (isset($resultado['enlace_del_cdr'])) {
        echo "   - CDR: " . $resultado['enlace_del_cdr'] . "\n";
    }
    
    echo "\n";
    echo "6. RESULTADO:\n";
    
    if (isset($resultado['aceptada_por_sunat']) && $resultado['aceptada_por_sunat'] == 1) {
        echo "   ✓ DOCUMENTO ACEPTADO POR SUNAT\n";
    } elseif (config('nubefact.enviar_automaticamente_sunat')) {
        echo "   ⚠ DOCUMENTO RECHAZADO O PENDIENTE EN SUNAT\n";
    } else {
        echo "   ℹ DOCUMENTO GENERADO (no enviado a SUNAT)\n";
        echo "   Para enviarlo a SUNAT, consultar el documento más tarde\n";
        echo "   o cambiar NUBEFACT_AUTO_SUNAT=true\n";
    }
    
    echo "\n";
    echo "7. SIGUIENTE PASO:\n";
    echo "   Para consultar el estado del documento:\n";
    echo "   \$client = new App\\Services\\NubefactClient();\n";
    echo "   \$result = \$client->consultarComprobante(1, '{$data['serie']}', {$data['numero']});\n";
    
} catch (Exception $e) {
    echo "   ✗ Error: " . $e->getMessage() . "\n";
    echo "\n";
    echo "DETALLES DEL ERROR:\n";
    echo $e->getMessage() . "\n";
    exit(1);
}

echo "\n===============================================\n";
echo "FIN DE PRUEBA\n";
echo "===============================================\n";
