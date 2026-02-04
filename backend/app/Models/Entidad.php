<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Entidad extends Model
{
    use HasFactory;

    protected $table = 'entidades';

    protected $fillable = [
        'empresa_id',
        'tipo_doc',
        'num_doc',
        'denominacion',
        'razon_comercial',
        'direccion',
        'email',
        'email_2',
        'email_3',
        'telefono',
        'codigo_cliente',
        'licencia_conducir',
        'placa_vehiculo',
        'es_cliente',
        'es_proveedor',
        'activo',
    ];

    protected $casts = [
        'es_cliente' => 'boolean',
        'es_proveedor' => 'boolean',
        'activo' => 'boolean',
    ];

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }
}
