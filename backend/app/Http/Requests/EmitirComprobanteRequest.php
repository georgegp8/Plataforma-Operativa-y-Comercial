<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EmitirComprobanteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        // La validación se aplica solo si no se está re-emitiendo un comprobante existente
        $isNewComprobante = ! $this->has('comprobante_id');

        return [
            'comprobante_id' => 'sometimes|exists:comprobantes,id',
            'empresa_id' => [Rule::requiredIf($isNewComprobante), 'exists:empresas,id'],
            // 1=Factura, 2=Boleta, 3=NC, 4=ND (según integración NubeFact)
            'tipo_de_comprobante' => [Rule::requiredIf($isNewComprobante), 'integer', 'in:1,2,3,4'],
            'serie' => [Rule::requiredIf($isNewComprobante), 'string'],
            'numero' => [Rule::requiredIf($isNewComprobante), 'integer'],
            'cliente_numero_de_documento' => [Rule::requiredIf($isNewComprobante), 'string'],
            'cliente_denominacion' => [Rule::requiredIf($isNewComprobante), 'string'],
            'fecha_de_emision' => [Rule::requiredIf($isNewComprobante), 'date'],
            // 1=PEN, 2=USD
            'moneda' => [Rule::requiredIf($isNewComprobante), 'integer', 'in:1,2'],
            'total' => [Rule::requiredIf($isNewComprobante), 'numeric'],
            'items' => [Rule::requiredIf($isNewComprobante), 'array', 'min:1'],
            'items.*.descripcion' => [Rule::requiredIf($isNewComprobante), 'string'],
            'items.*.cantidad' => [Rule::requiredIf($isNewComprobante), 'numeric'],
            'items.*.precio_unitario' => [Rule::requiredIf($isNewComprobante), 'numeric'],
        ];
    }
}
