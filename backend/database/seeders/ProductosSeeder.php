<?php

namespace Database\Seeders;

use App\Models\Empresa;
use App\Models\Producto;
use Illuminate\Database\Seeder;

class ProductosSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Obtener la primera empresa o crear una de prueba
        $empresa = Empresa::first();

        if (! $empresa) {
            echo "⚠️  No hay empresas en la base de datos. Por favor, cree una empresa primero.\n";

            return;
        }

        // Cargar datos de productos desde archivo
        $productos = require __DIR__.'/productos_data.php';

        foreach ($productos as $productoData) {
            Producto::create([
                'empresa_id' => $empresa->id,
                'codigo' => $productoData['codigo'],
                'descripcion' => $productoData['descripcion'],
                'categoria' => $productoData['categoria'] ?? null,
                'unidad_medida' => $productoData['unidad_medida'],
                'codigo_producto_sunat' => null,
                'moneda' => 'PEN',
                'valor_venta_unitario' => $productoData['valor_venta_unitario'],
                'precio_venta_unitario' => $productoData['precio_venta_unitario'],
                'costo_compra_unitario' => null,
                'precio_compra_unitario' => null,
                'tipo_afectacion_igv' => $productoData['tipo_afectacion_igv'],
                'destacado' => $productoData['destacado'] ?? false,
                'activo' => true,
                'stock_actual' => 0,
                'stock_minimo' => null,
                'stock_maximo' => null,
            ]);
        }

        echo '✅ Se crearon '.count($productos)." productos del catálogo.\n";
    }
}
