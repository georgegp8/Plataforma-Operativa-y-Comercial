<?php

namespace Database\Seeders;

use App\Models\Transaccion;
use Illuminate\Database\Seeder;

class TransaccionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $transacciones = [
            ['descripcion' => 'Venta nacional', 'tipo' => 'Salida', 'activo' => true],
            ['descripcion' => 'Compra nacional', 'tipo' => 'Entrada', 'activo' => true],
            ['descripcion' => 'Consignación recibida', 'tipo' => 'Entrada', 'activo' => true],
            ['descripcion' => 'Consignación entregada', 'tipo' => 'Salida', 'activo' => true],
            ['descripcion' => 'Devolución recibida', 'tipo' => 'Entrada', 'activo' => true],
            ['descripcion' => 'Devolución entregada', 'tipo' => 'Salida', 'activo' => true],
            ['descripcion' => 'Bonificación', 'tipo' => 'Salida', 'activo' => true],
        ];

        foreach ($transacciones as $transaccion) {
            Transaccion::create($transaccion);
        }
    }
}
