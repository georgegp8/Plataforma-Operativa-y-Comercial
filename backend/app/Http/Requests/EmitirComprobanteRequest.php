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
            'moneda' => [Rule::requiredIf($isNewComprobante), 'in:1,2,3,4'],
            'total' => [Rule::requiredIf($isNewComprobante), 'numeric'],
            'items' => [Rule::requiredIf($isNewComprobante), 'array', 'min:1'],
            'items.*.descripcion' => [Rule::requiredIf($isNewComprobante), 'string'],
            'items.*.cantidad' => [Rule::requiredIf($isNewComprobante), 'numeric'],
            'items.*.precio_unitario' => [Rule::requiredIf($isNewComprobante), 'numeric'],
            // Forma de pago
            'forma_pago' => 'sometimes|string|in:Contado,Credito',
            // Detracción - Campos obligatorios si tiene_detraccion = true
            'tiene_detraccion' => 'sometimes|boolean',
            'detraccion_tipo' => 'required_if:tiene_detraccion,true|nullable|string|size:3',
            'detraccion_porcentaje' => 'required_if:tiene_detraccion,true|nullable|numeric|min:0|max:100',
            'detraccion_monto' => 'nullable|numeric|min:0',
            'medio_pago_detraccion' => 'required_if:tiene_detraccion,true|nullable|string|size:3',
        ];
    }

    public function messages(): array
    {
        return [
            'detraccion_tipo.required_if' => 'El tipo de detracción es obligatorio cuando se activa detracción',
            'detraccion_tipo.size' => 'El código de detracción debe tener 3 caracteres',
            'detraccion_porcentaje.required_if' => 'El porcentaje de detracción es obligatorio',
            'detraccion_porcentaje.max' => 'El porcentaje no puede superar el 100%',
            'medio_pago_detraccion.required_if' => 'El medio de pago es obligatorio cuando hay detracción',
        ];
    }
}
