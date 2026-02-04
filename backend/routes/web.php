<?php

use App\Services\FacturacionService;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

/**
 * RUTA DE PRUEBA SUNAT - Como en el video tutorial
 */
Route::get('/prueba-sunat', function (FacturacionService $facturacionService) {
    try {
        // Data de ejemplo EXACTA como en el tutorial de CodersFree
        $data = [
            'empresa_id' => 1, // Debe existir en la tabla empresas
            'ublVersion' => '2.1',
            'tipoOperacion' => '0101', // Catálogo 51
            'tipoDoc' => '01', // Factura
            'serie' => 'F001',
            'correlativo' => 1,
            'fechaEmision' => date('Y-m-d'),
            'tipoMoneda' => 'PEN', // Catálogo 02

            // Cliente
            'client' => [
                'tipoDoc' => '6', // RUC
                'numDoc' => '20000000001',
                'rznSocial' => 'EMPRESA CLIENTE SAC',
                'address' => [
                    'direccion' => 'Av. Ejemplo 123, Lima',
                ],
            ],

            // Totales
            'mtoOperGravadas' => 100.00,
            'mtoIGV' => 18.00,
            'totalImpuestos' => 18.00,
            'valorVenta' => 100.00,
            'subTotal' => 118.00,
            'mtoImpVenta' => 118.00,

            // Forma de pago
            'formaPago' => [
                'tipo' => 'Contado',
            ],

            // Items del comprobante
            'details' => [
                [
                    'codProducto' => 'P001',
                    'unidad' => 'NIU', // Catálogo 03
                    'descripcion' => 'PRODUCTO DE PRUEBA',
                    'cantidad' => 2,
                    'mtoValorUnitario' => 50.00,
                    'mtoValorVenta' => 100.00,
                    'mtoBaseIgv' => 100.00,
                    'porcentajeIgv' => 18.00,
                    'igv' => 18.00,
                    'tipAfeIgv' => '10', // Catálogo 07 - Gravado
                    'totalImpuestos' => 18.00,
                    'mtoPrecioUnitario' => 59.00,
                ],
            ],
        ];

        // Emitir comprobante
        $resultado = $facturacionService->emitirComprobante($data, 'invoice');

        // Mostrar resultado
        return response()->json([
            'titulo' => '✅ PRUEBA EXITOSA - SUNAT ACEPTÓ EL COMPROBANTE',
            'success' => $resultado['success'],
            'comprobante' => [
                'tipo' => $resultado['comprobante']->tipo_doc,
                'numero' => $resultado['comprobante']->serie.'-'.$resultado['comprobante']->correlativo,
                'cliente' => $resultado['comprobante']->cliente_razon_social,
                'total' => 'S/ '.number_format($resultado['comprobante']->mto_imp_venta, 2),
            ],
            'respuesta_sunat' => [
                'codigo' => $resultado['cdr_response']->getCode(),
                'descripcion' => $resultado['cdr_response']->getDescription(),
                'notas' => $resultado['cdr_response']->getNotes(),
            ],
            'archivos_generados' => [
                'xml' => $resultado['xml_url'],
                'cdr' => $resultado['cdr_url'],
                'pdf' => $resultado['pdf_url'],
            ],
        ], 200, [], JSON_PRETTY_PRINT);

    } catch (\Exception $e) {
        return response()->json([
            'titulo' => '❌ ERROR AL EMITIR',
            'success' => false,
            'error' => $e->getMessage(),
            'codigo' => $e->getCode(),
            'linea' => $e->getLine(),
            'archivo' => $e->getFile(),
        ], 500, [], JSON_PRETTY_PRINT);
    }
});
