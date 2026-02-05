<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeder principal de la aplicación
 * 
 * Organizado por prioridad:
 * 1. Catálogos SUNAT (requeridos para validaciones)
 * 2. Datos maestros del sistema
 * 3. Datos de prueba (solo en entornos de desarrollo)
 */
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ========================================
        // 1. CATÁLOGOS SUNAT (OBLIGATORIOS)
        // ========================================
        // Tipos de documento, moneda, tributos, etc.
        $this->call([
            CatalogosSunatSeeder::class,
        ]);

        // ========================================
        // 2. DATOS MAESTROS BÁSICOS (OPCIONAL)
        // ========================================
        // Bancos, unidades de medida, etc.
        // Descomentar si necesitas estos datos
        /*
        $this->call([
            BancoSeeder::class,
            UnidadMedidaSeeder::class,
            MarcaSeeder::class,
            CategoriaSeeder::class,
        ]);
        */

        // ========================================
        // 3. USUARIOS DEL SISTEMA
        // ========================================
        $this->crearUsuarios();

        // ========================================
        // 4. DATOS DE PRUEBA (SOLO EN DESARROLLO)
        // ========================================
        // Compatible con manuales de NubeFact v2.9 y GRE v1.6
        if (app()->environment(['local', 'development', 'testing'])) {
            $this->call([
                DatosPruebaCompletos::class,
            ]);
            
            $this->command->info('✓ Datos de prueba cargados según manuales NubeFact');
        }

        $this->command->info('✓ Base de datos inicializada correctamente');
    }

    /**
     * Crear usuarios del sistema
     */
    private function crearUsuarios(): void
    {
        // Usuario administrador
        User::updateOrCreate(
            ['email' => 'admin@facturacion.pe'],
            [
                'name' => 'Administrador',
                'password' => bcrypt('password'),
                'rol' => 'admin',
                'activo' => true,
            ]
        );

        // Usuario operador de prueba
        User::updateOrCreate(
            ['email' => 'operador@facturacion.pe'],
            [
                'name' => 'Operador',
                'password' => bcrypt('password'),
                'rol' => 'operador',
                'activo' => true,
            ]
        );

        // Usuario vendedor de prueba
        User::updateOrCreate(
            ['email' => 'vendedor@facturacion.pe'],
            [
                'name' => 'Vendedor',
                'password' => bcrypt('password'),
                'rol' => 'vendedor',
                'activo' => true,
            ]
        );

        $this->command->info('✓ Usuarios creados: admin, operador, vendedor');
    }
}
