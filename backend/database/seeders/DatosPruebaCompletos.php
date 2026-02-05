<?php

namespace Database\Seeders;

use App\Models\Empresa;
use App\Models\Entidad;
use App\Models\Producto;
use App\Models\Serie;
use App\Models\Vehiculo;
use App\Models\Conductor;
use App\Models\CuentaBancaria;
use Illuminate\Database\Seeder;

/**
 * Seeder con datos de prueba completos según los manuales de integración de NubeFact
 * 
 * Genera datos de ejemplo para:
 * - Facturas (01)
 * - Boletas (03)
 * - Notas de Crédito (07)
 * - Notas de Débito (08)
 * - Guías de Remisión Remitente (09)
 * - Guías de Remisión Transportista (31)
 * 
 * Compatible con:
 * - Manual de Facturas, Boletas y Notas (JSON) v2.9
 * - Manual de Guías de Remisión (GRE) v1.6
 */
class DatosPruebaCompletos extends Seeder
{
    public function run(): void
    {
        // 1. Empresa de prueba (emisor)
        $this->crearEmpresaPrueba();

        // 2. Clientes de prueba
        $this->crearClientesPrueba();

        // 3. Productos de prueba
        $this->crearProductosPrueba();

        // 4. Series de comprobantes
        $this->crearSeriesPrueba();

        // 5. Vehículos para guías de remisión
        $this->crearVehiculosPrueba();

        // 6. Conductores para guías de remisión
        $this->crearConductoresPrueba();

        // 7. Cuentas bancarias para detracciones
        $this->crearCuentasBancariasPrueba();
    }

    /**
     * Empresa emisora de prueba - Compatible con NubeFact DEMO
     */
    private function crearEmpresaPrueba()
    {
        Empresa::updateOrCreate(
            ['ruc' => '20600695771'],
            [
                'razon_social' => 'NUBEFACT SA',
                'nombre_comercial' => 'NUBEFACT',
                'ubigeo' => '150140', // Miraflores, Lima, Lima
                'departamento' => 'LIMA',
                'provincia' => 'LIMA',
                'distrito' => 'MIRAFLORES',
                'direccion' => 'CALLE LIBERTAD 116 MIRAFLORES - LIMA - PERU',
                'sol_user' => null, // No usa SOL, usa NubeFact API
                'sol_password' => null,
                'modo' => 'beta', // MODO BETA/DEMO
                'activo' => true,
            ]
        );
    }

    /**
     * Clientes de prueba según tipos de documento del manual
     */
    private function crearClientesPrueba()
    {
        // Obtener la empresa creada anteriormente
        $empresa = Empresa::where('ruc', '20600695771')->first();
        
        if (!$empresa) {
            $this->command->warn('⚠ Empresa no encontrada. Creando clientes sin asociación.');
            return;
        }

        $clientes = [
            // Cliente con RUC (tipo 6)
            [
                'empresa_id' => $empresa->id,
                'tipo_doc' => '6',
                'num_doc' => '20434906301',
                'denominacion' => 'GRUPO MOSS S.R.L.',
                'razon_comercial' => 'MOSS',
                'direccion' => 'LT. 2 MZ. G - ASC.VILLA CORPAC, CERRO COLORADO, AREQUIPA',
                'telefono' => '054-123456',
                'email' => 'cliente1@moss.com',
                'es_cliente' => true,
                'es_proveedor' => false,
                'activo' => true,
            ],
            // Cliente con DNI (tipo 1)
            [
                'empresa_id' => $empresa->id,
                'tipo_doc' => '1',
                'num_doc' => '12345678',
                'denominacion' => 'JUAN PEREZ GARCIA',
                'razon_comercial' => null,
                'direccion' => 'AV. AREQUIPA 123, LIMA',
                'telefono' => '987654321',
                'email' => 'juan.perez@gmail.com',
                'es_cliente' => true,
                'es_proveedor' => false,
                'activo' => true,
            ],
            // Cliente con Carnet de Extranjería (tipo 4)
            [
                'empresa_id' => $empresa->id,
                'tipo_doc' => '4',
                'num_doc' => '001234567',
                'denominacion' => 'MARIA RODRIGUEZ SANCHEZ',
                'razon_comercial' => null,
                'direccion' => 'CALLE GRAU 456, CUSCO',
                'telefono' => '912345678',
                'email' => 'maria.rodriguez@email.com',
                'es_cliente' => true,
                'es_proveedor' => false,
                'activo' => true,
            ],
            // Cliente con Pasaporte (tipo 7)
            [
                'empresa_id' => $empresa->id,
                'tipo_doc' => '7',
                'num_doc' => 'AB123456',
                'denominacion' => 'JOHN SMITH',
                'razon_comercial' => null,
                'direccion' => 'AV. PARDO 789, MIRAFLORES',
                'telefono' => '999888777',
                'email' => 'john.smith@email.com',
                'es_cliente' => true,
                'es_proveedor' => false,
                'activo' => true,
            ],
            // Proveedor con RUC
            [
                'empresa_id' => $empresa->id,
                'tipo_doc' => '6',
                'num_doc' => '20100070970',
                'denominacion' => 'SUPERMERCADOS PERUANOS S.A.',
                'razon_comercial' => 'PLAZA VEA',
                'direccion' => 'AV. AVIACION 2405, SAN BORJA, LIMA',
                'telefono' => '01-6186300',
                'email' => 'contacto@spsa.pe',
                'es_cliente' => false,
                'es_proveedor' => true,
                'activo' => true,
            ],
            // Transportista (puede ser cliente y proveedor)
            [
                'empresa_id' => $empresa->id,
                'tipo_doc' => '6',
                'num_doc' => '20987654321',
                'denominacion' => 'TRANSPORTES DEL NORTE SAC',
                'razon_comercial' => 'TRANSNORTE',
                'direccion' => 'AV. TUPAC AMARU 1500, LIMA',
                'telefono' => '01-4567890',
                'email' => 'info@transnorte.com',
                'es_cliente' => true,
                'es_proveedor' => true,
                'activo' => true,
            ],
        ];

        foreach ($clientes as $cliente) {
            Entidad::updateOrCreate(
                [
                    'empresa_id' => $cliente['empresa_id'],
                    'tipo_doc' => $cliente['tipo_doc'],
                    'num_doc' => $cliente['num_doc'],
                ],
                $cliente
            );
        }
    }

    /**
     * Productos de prueba según códigos SUNAT
     */
    private function crearProductosPrueba()
    {
        // Obtener la empresa
        $empresa = Empresa::where('ruc', '20600695771')->first();
        
        if (!$empresa) {
            $this->command->warn('⚠ Empresa no encontrada. Saltando creación de productos.');
            return;
        }

        $productos = [
            // Producto gravado
            [
                'empresa_id' => $empresa->id,
                'codigo' => 'PROD001',
                'codigo_producto_sunat' => '10000000',
                'descripcion' => 'LAPTOP LENOVO THINKPAD X1 CARBON',
                'unidad_medida' => 'NIU',
                'precio_venta_unitario' => 4130.00,
                'valor_venta_unitario' => 3500.00,
                'tipo_afectacion_igv' => '10',
                'categoria' => 'ELECTRONICA',
                'stock_actual' => 10,
                'activo' => true,
            ],
            [
                'empresa_id' => $empresa->id,
                'codigo' => 'PROD002',
                'codigo_producto_sunat' => '10000000',
                'descripcion' => 'MONITOR LG 27 PULGADAS 4K',
                'unidad_medida' => 'NIU',
                'precio_venta_unitario' => 1416.00,
                'valor_venta_unitario' => 1200.00,
                'tipo_afectacion_igv' => '10',
                'categoria' => 'ELECTRONICA',
                'stock_actual' => 25,
                'activo' => true,
            ],
            // Servicio gravado
            [
                'empresa_id' => $empresa->id,
                'codigo' => 'SERV001',
                'codigo_producto_sunat' => '20000000',
                'descripcion' => 'SERVICIO DE CONSULTORIA EN TI',
                'unidad_medida' => 'ZZ',
                'precio_venta_unitario' => 590.00,
                'valor_venta_unitario' => 500.00,
                'tipo_afectacion_igv' => '10',
                'categoria' => 'SERVICIOS',
                'activo' => true,
            ],
            [
                'empresa_id' => $empresa->id,
                'codigo' => 'SERV002',
                'codigo_producto_sunat' => '20000000',
                'descripcion' => 'MANTENIMIENTO DE EQUIPOS DE COMPUTO',
                'unidad_medida' => 'ZZ',
                'precio_venta_unitario' => 177.00,
                'valor_venta_unitario' => 150.00,
                'tipo_afectacion_igv' => '10',
                'categoria' => 'SERVICIOS',
                'activo' => true,
            ],
            // Producto exonerado
            [
                'empresa_id' => $empresa->id,
                'codigo' => 'PROD003',
                'codigo_producto_sunat' => '10000000',
                'descripcion' => 'LIBRO DE CONTABILIDAD AVANZADA',
                'unidad_medida' => 'NIU',
                'precio_venta_unitario' => 80.00,
                'valor_venta_unitario' => 80.00,
                'tipo_afectacion_igv' => '20',
                'categoria' => 'LIBROS',
                'stock_actual' => 50,
                'activo' => true,
            ],
            // Producto para exportación
            [
                'empresa_id' => $empresa->id,
                'codigo' => 'PROD004',
                'codigo_producto_sunat' => '10000000',
                'descripcion' => 'ARTESANIA DE ALPACA - PONCHO',
                'unidad_medida' => 'NIU',
                'precio_venta_unitario' => 250.00,
                'valor_venta_unitario' => 250.00,
                'tipo_afectacion_igv' => '40',
                'categoria' => 'ARTESANIA',
                'stock_actual' => 15,
                'activo' => true,
            ],
            // Producto gratuito
            [
                'empresa_id' => $empresa->id,
                'codigo' => 'PROD005',
                'codigo_producto_sunat' => '10000000',
                'descripcion' => 'MUESTRA GRATIS - LAPICERO PROMOCIONAL',
                'unidad_medida' => 'NIU',
                'precio_venta_unitario' => 2.36,
                'valor_venta_unitario' => 2.00,
                'tipo_afectacion_igv' => '15',
                'categoria' => 'PROMOCIONES',
                'stock_actual' => 1000,
                'activo' => true,
            ],
        ];

        foreach ($productos as $producto) {
            Producto::updateOrCreate(
                [
                    'empresa_id' => $producto['empresa_id'],
                    'codigo' => $producto['codigo']
                ],
                $producto
            );
        }
    }

    /**
     * Series de comprobantes según manual NubeFact
     */
    private function crearSeriesPrueba()
    {
        // Obtener la empresa
        $empresa = Empresa::where('ruc', '20600695771')->first();
        
        if (!$empresa) {
            $this->command->warn('⚠ Empresa no encontrada. Saltando creación de series.');
            return;
        }

        $series = [
            // Facturas
            [
                'empresa_id' => $empresa->id,
                'tipo_comprobante' => '01',
                'serie' => 'F001',
                'correlativo_actual' => 1,
                'activo' => true,
                'por_defecto' => true,
            ],
            // Boletas
            [
                'empresa_id' => $empresa->id,
                'tipo_comprobante' => '03',
                'serie' => 'B001',
                'correlativo_actual' => 1,
                'activo' => true,
                'por_defecto' => true,
            ],
            // Notas de Crédito
            [
                'empresa_id' => $empresa->id,
                'tipo_comprobante' => '07',
                'serie' => 'FC01',
                'correlativo_actual' => 1,
                'activo' => true,
                'por_defecto' => true,
            ],
            // Notas de Débito
            [
                'empresa_id' => $empresa->id,
                'tipo_comprobante' => '08',
                'serie' => 'FD01',
                'correlativo_actual' => 1,
                'activo' => true,
                'por_defecto' => false,
            ],
            // Guías de Remisión Remitente
            [
                'empresa_id' => $empresa->id,
                'tipo_comprobante' => '09',
                'serie' => 'T001',
                'correlativo_actual' => 1,
                'activo' => true,
                'por_defecto' => true,
            ],
        ];

        foreach ($series as $serie) {
            Serie::updateOrCreate(
                [
                    'empresa_id' => $serie['empresa_id'],
                    'tipo_comprobante' => $serie['tipo_comprobante'],
                    'serie' => $serie['serie'],
                ],
                $serie
            );
        }
    }

    /**
     * Vehículos para guías de remisión
     */
    private function crearVehiculosPrueba()
    {
        $vehiculos = [
            [
                'placa' => 'ABC123',
                'marca' => 'TOYOTA',
                'modelo' => 'HILUX 4X4',
                'activo' => true,
            ],
            [
                'placa' => 'XYZ789',
                'marca' => 'MITSUBISHI',
                'modelo' => 'CANTER FB',
                'activo' => true,
            ],
            [
                'placa' => 'DEF456',
                'marca' => 'HYUNDAI',
                'modelo' => 'HD78',
                'activo' => true,
            ],
        ];

        foreach ($vehiculos as $vehiculo) {
            Vehiculo::updateOrCreate(
                ['placa' => $vehiculo['placa']],
                $vehiculo
            );
        }
    }

    /**
     * Conductores para guías de remisión
     */
    private function crearConductoresPrueba()
    {
        $conductores = [
            [
                'tipo_documento' => '1', // DNI
                'numero_documento' => '12345678',
                'nombre' => 'JORGE LOPEZ MARTINEZ',
                'licencia_conducir' => 'Q12345678',
                'telefono' => '987654321',
                'activo' => true,
            ],
            [
                'tipo_documento' => '1',
                'numero_documento' => '87654321',
                'nombre' => 'CARLOS RAMIREZ TORRES',
                'licencia_conducir' => 'Q87654321',
                'telefono' => '912345678',
                'activo' => true,
            ],
            [
                'tipo_documento' => '4', // Carnet de Extranjería
                'numero_documento' => '001234567',
                'nombre' => 'JUAN GONZALEZ RUIZ',
                'licencia_conducir' => 'Q98765432',
                'telefono' => '999888777',
                'activo' => true,
            ],
        ];

        foreach ($conductores as $conductor) {
            Conductor::updateOrCreate(
                [
                    'tipo_documento' => $conductor['tipo_documento'],
                    'numero_documento' => $conductor['numero_documento'],
                ],
                $conductor
            );
        }
    }

    /**
     * Cuentas bancarias para detracciones
     */
    private function crearCuentasBancariasPrueba()
    {
        $cuentas = [
            [
                'descripcion' => 'CUENTA DETRACCIONES - BN',
                'numero' => '00000012345',
                'abreviatura' => 'DET-BN',
                'banco' => 'BANCO DE LA NACION',
                'moneda' => 'PEN',
                'balance' => 0.00,
                'activo' => true,
            ],
        ];

        foreach ($cuentas as $cuenta) {
            CuentaBancaria::updateOrCreate(
                ['numero' => $cuenta['numero']],
                $cuenta
            );
        }
    }
}
