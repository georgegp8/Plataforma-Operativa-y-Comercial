<?php

namespace Database\Seeders;

use App\Models\Empresa;
use Illuminate\Database\Seeder;

class EmpresaPruebaSeeder extends Seeder
{
    public function run()
    {
        // Crear empresa de prueba compatible con NubeFact
        // Usar updateOrCreate para evitar duplicados por RUC
        Empresa::updateOrCreate(
            ['ruc' => '20434906301'],
            [
                'razon_social' => 'GRUPO MOSS S.R.L.',
                'nombre_comercial' => null,
                'ubigeo' => '040122',
                'departamento' => 'AREQUIPA',
                'provincia' => 'AREQUIPA',
                'distrito' => 'CERRO COLORADO',
                'direccion' => 'LT. 2 MZ. G ---- ASC.VILLA CORPAC',
                'sol_user' => null, // No usa SOL, usa NubeFact API directa
                'sol_password' => null,
                'modo' => 'beta', // MODO BETA por defecto
                'activo' => true,
            ]
        );
    }
}
