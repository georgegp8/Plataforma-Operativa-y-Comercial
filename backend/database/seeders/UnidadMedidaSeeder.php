<?php

namespace Database\Seeders;

use App\Models\UnidadMedida;
use Illuminate\Database\Seeder;

class UnidadMedidaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $unidades = [
            // Unidades de la captura original
            ['codigo' => 'ZZ', 'descripcion' => 'SERVICIO', 'simbolo' => 'SERV', 'activo' => true],
            ['codigo' => 'BX', 'descripcion' => 'CAJA', 'simbolo' => 'CAJA', 'activo' => true],
            ['codigo' => 'GLI', 'descripcion' => 'GALÓN', 'simbolo' => 'GAL', 'activo' => true],
            ['codigo' => 'GRM', 'descripcion' => 'GRAMOS', 'simbolo' => 'GR', 'activo' => true],
            ['codigo' => 'KGM', 'descripcion' => 'KILOGRAMO', 'simbolo' => 'KG', 'activo' => true],

            // Unidades encontradas en tabla productos
            ['codigo' => 'NIU', 'descripcion' => 'UNIDAD (BIENES)', 'simbolo' => 'UND', 'activo' => true],
            ['codigo' => 'GLL', 'descripcion' => 'GALÓN (US)', 'simbolo' => 'GAL', 'activo' => true],
            ['codigo' => 'LTR', 'descripcion' => 'LITRO', 'simbolo' => 'L', 'activo' => true],
            ['codigo' => 'MTR', 'descripcion' => 'METRO', 'simbolo' => 'M', 'activo' => true],
            ['codigo' => 'WG', 'descripcion' => 'GRAMOS DE PESO', 'simbolo' => 'G', 'activo' => true],
        ];

        foreach ($unidades as $unidad) {
            UnidadMedida::create($unidad);
        }
    }
}
