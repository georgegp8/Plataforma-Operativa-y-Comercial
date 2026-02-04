<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmitirGuiaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // ID de la guía ya registrada en BD que se desea emitir mediante NubeFact
            'guia_id' => 'required|exists:guia_remisions,id',
        ];
    }
}
