<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'empresa_id' => 'required|exists:empresas,id',
            'codigo' => 'nullable|string|max:50',
            'descripcion' => 'required|string',
            'categoria' => 'nullable|string|max:100',
            'unidad_medida' => 'required|string|max:10',
            'codigo_producto_sunat' => 'nullable|string|max:20',
            'moneda' => 'nullable|string|max:3',
            'valor_venta_unitario' => 'nullable|numeric|min:0',
            'precio_venta_unitario' => 'nullable|numeric|min:0',
            'costo_compra_unitario' => 'nullable|numeric|min:0',
            'precio_compra_unitario' => 'nullable|numeric|min:0',
            'tipo_afectacion_igv' => 'nullable|string|max:2',
            'destacado' => 'nullable|boolean',
            'activo' => 'nullable|boolean',
            'stock_actual' => 'nullable|numeric|min:0',
            'stock_minimo' => 'nullable|numeric|min:0',
            'stock_maximo' => 'nullable|numeric|min:0',
        ];
    }
}
