<?php

namespace Database\Seeders;

use App\Models\Banco;
use Illuminate\Database\Seeder;

class BancoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $bancos = [
            [
                'abreviatura' => 'SCOTIABANK',
                'descripcion' => 'BANCO SCOTIABANK',
                'activo' => true,
                'created_by' => 'ADMINISTRADOR - CAJA',
            ],
            [
                'abreviatura' => 'BCP',
                'descripcion' => 'BANCO DE CREDITO DEL PERU',
                'activo' => true,
                'created_by' => 'ADMINISTRADOR - CAJA',
            ],
            [
                'abreviatura' => 'COMERCIO',
                'descripcion' => 'BANCO DE COMERCIO',
                'activo' => true,
                'created_by' => 'ADMINISTRADOR - CAJA',
            ],
            [
                'abreviatura' => 'PICHINCHA',
                'descripcion' => 'BANCO PICHINCHA',
                'activo' => true,
                'created_by' => 'ADMINISTRADOR - CAJA',
            ],
            [
                'abreviatura' => 'BBVA',
                'descripcion' => 'BBVA CONTINENTAL',
                'activo' => true,
                'created_by' => 'ADMINISTRADOR - CAJA',
            ],
            [
                'abreviatura' => 'INTERBANK',
                'descripcion' => 'INTERBANK',
                'activo' => true,
                'created_by' => 'ADMINISTRADOR - CAJA',
            ],
        ];

        foreach ($bancos as $banco) {
            Banco::create($banco);
        }
    }
}
