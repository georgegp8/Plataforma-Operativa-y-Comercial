<?php

namespace Database\Seeders;

use App\Models\Compra;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class CompraSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $compras = [
            [
                'actividad' => 'Administrador',
                'fecha_actividad' => Carbon::parse('2026-02-09 18:30:57'),
                'proveedor_id' => 1,
                'proveedor_nombre' => 'LABRETA S.A.C.',
                'proveedor_ruc' => '20513441208',
                'estado' => 'Pendiente de pago',
                'tipo_comprobante' => 'F',
                'serie_comprobante' => 'F006',
                'numero_comprobante' => '6177',
                'comprobante_completo' => 'F006-6177',
                'tipo_comprobante_desc' => 'FACTURA ELECTRONICA',
                'moneda' => 'PEN',
                'total' => 1071.03,
                'cantidad_productos' => 5,
                'activo' => true,
                'created_by' => 'Administrador',
            ],
            [
                'actividad' => 'Administrador',
                'fecha_actividad' => Carbon::parse('2026-02-13 09:24:36'),
                'proveedor_id' => 2,
                'proveedor_nombre' => 'SERVICIOS DE MEDICINA ORTOMOLECULAR E INTEGRATIVA E.I.R.L.',
                'proveedor_ruc' => '20690875393',
                'estado' => 'Pendiente de pago',
                'tipo_comprobante' => 'E',
                'serie_comprobante' => 'E001',
                'numero_comprobante' => '4746',
                'comprobante_completo' => 'E001-4746',
                'tipo_comprobante_desc' => 'FACTURA ELECTRONICA',
                'moneda' => 'PEN',
                'total' => 465.20,
                'cantidad_productos' => 3,
                'activo' => true,
                'created_by' => 'Administrador',
            ],
            [
                'actividad' => 'Administrador',
                'fecha_actividad' => Carbon::parse('2026-02-09 10:23:00'),
                'proveedor_id' => 3,
                'proveedor_nombre' => 'BUSSCOPP S.A.C.',
                'proveedor_ruc' => '20690302765',
                'estado' => 'Pendiente de pago',
                'tipo_comprobante' => 'F',
                'serie_comprobante' => 'F002',
                'numero_comprobante' => '8935',
                'comprobante_completo' => 'F002-8935',
                'tipo_comprobante_desc' => 'FACTURA ELECTRONICA',
                'moneda' => 'PEN',
                'total' => 2791.43,
                'cantidad_productos' => 8,
                'activo' => true,
                'created_by' => 'Administrador',
            ],
            [
                'actividad' => 'Administrador',
                'fecha_actividad' => Carbon::parse('2026-02-12 19:05:57'),
                'proveedor_id' => 4,
                'proveedor_nombre' => 'M & M PRODUCTOS MEDICOS Y FARMACEUTICOS S.R.L. - M & M PROMEFAR S.R.L.',
                'proveedor_ruc' => '20370715107',
                'estado' => 'Pendiente de pago',
                'tipo_comprobante' => 'F',
                'serie_comprobante' => 'F004',
                'numero_comprobante' => '56734',
                'comprobante_completo' => 'F004-56734',
                'tipo_comprobante_desc' => 'FACTURA ELECTRONICA',
                'moneda' => 'PEN',
                'total' => 2027.18,
                'cantidad_productos' => 12,
                'activo' => true,
                'created_by' => 'Administrador',
            ],
        ];

        foreach ($compras as $compra) {
            Compra::create($compra);
        }
    }
}
