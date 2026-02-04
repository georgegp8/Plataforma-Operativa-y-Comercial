<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'empresa_id' => 'sometimes|exists:empresas,id',
            'codigo' => 'sometimes|nullable|string|max:50',
            'descripcion' => 'sometimes|string',
            'categoria' => 'sometimes|nullable|string|max:100',
            'unidad_medida' => 'sometimes|string|max:10',
            'codigo_producto_sunat' => 'sometimes|nullable|string|max:20',
            'moneda' => 'sometimes|nullable|string|max:3',
            'valor_venta_unitario' => 'sometimes|nullable|numeric|min:0',
            'precio_venta_unitario' => 'sometimes|nullable|numeric|min:0',
            'costo_compra_unitario' => 'sometimes|nullable|numeric|min:0',
            'precio_compra_unitario' => 'sometimes|nullable|numeric|min:0',
            'tipo_afectacion_igv' => 'sometimes|nullable|string|max:2',
            'destacado' => 'sometimes|boolean',
            'activo' => 'sometimes|boolean',
            'stock_actual' => 'sometimes|nullable|numeric|min:0',
            'stock_minimo' => 'sometimes|nullable|numeric|min:0',
            'stock_maximo' => 'sometimes|nullable|numeric|min:0',
        ];
    }
}
