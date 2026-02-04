<?php

namespace Database\Seeders;

use App\Models\Vehiculo;
use Illuminate\Database\Seeder;

class VehiculoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $vehiculos = [
            [
                'placa' => 'ABC-123',
                'modelo' => 'Hilux',
                'marca' => 'Toyota',
                'activo' => true,
            ],
            [
                'placa' => 'XYZ-789',
                'modelo' => 'Ranger',
                'marca' => 'Ford',
                'activo' => true,
            ],
            [
                'placa' => 'DEF-456',
                'modelo' => 'Frontier',
                'marca' => 'Nissan',
                'activo' => true,
            ],
        ];

        foreach ($vehiculos as $vehiculo) {
            Vehiculo::create($vehiculo);
        }
    }
}
