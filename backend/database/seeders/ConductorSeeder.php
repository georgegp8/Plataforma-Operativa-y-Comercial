<?php

namespace Database\Seeders;

use App\Models\Conductor;
use Illuminate\Database\Seeder;

class ConductorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $conductores = [
            [
                'tipo_documento' => 'DNI',
                'numero_documento' => '12345678',
                'nombre' => 'Juan Pérez García',
                'licencia_conducir' => 'A-III',
                'telefono' => '987654321',
                'activo' => true,
            ],
            [
                'tipo_documento' => 'DNI',
                'numero_documento' => '87654321',
                'nombre' => 'María Rodríguez López',
                'licencia_conducir' => 'A-IIb',
                'telefono' => '912345678',
                'activo' => true,
            ],
            [
                'tipo_documento' => 'CE',
                'numero_documento' => '001234567',
                'nombre' => 'Carlos Mendoza Torres',
                'licencia_conducir' => 'A-IIIc',
                'telefono' => '998877665',
                'activo' => true,
            ],
        ];

        foreach ($conductores as $conductor) {
            Conductor::create($conductor);
        }
    }
}
