<?php

namespace Database\Seeders;

use App\Models\Marca;
use Illuminate\Database\Seeder;

class MarcaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $marcas = [
            ['nombre' => 'MAFERSEM', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => 'D_LEIM', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => 'DEBHACE', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => 'RESENAS', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => 'HAROIRE', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => 'PROCLIPS', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => 'EPICOSM', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => 'INSTITUTO ESPAÑOL', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => 'SEMBOS CLUB', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => '3M', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => '3M', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => 'GYB', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => 'ISZIN', 'activo' => true, 'created_by' => 'Administrador'],
            ['nombre' => 'MEDINACATH', 'activo' => true, 'created_by' => 'Administrador'],
        ];

        foreach ($marcas as $marca) {
            Marca::create($marca);
        }
    }
}
