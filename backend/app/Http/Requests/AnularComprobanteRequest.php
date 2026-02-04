<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AnularComprobanteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Datos opcionales de contexto
            'empresa_id' => 'sometimes|exists:empresas,id',
            'tipo_de_comprobante' => 'sometimes|integer|in:1,2,3,4',
            'serie' => 'sometimes|string|max:4',
            'numero' => 'sometimes|integer',

            // Datos obligatorios para anulación en NubeFact
            'motivo' => 'required|string|max:250',
            'fecha_de_baja' => 'required|date',
        ];
    }
}
