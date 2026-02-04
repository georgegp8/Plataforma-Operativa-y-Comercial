<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vendedor extends Model
{
    use HasFactory;

    protected $table = 'vendedores';

    protected $fillable = [
        'nombre',
        'email',
        'telefono',
        'porcentaje_comision',
        'activo',
        'created_by',
        'ventas_cpe',
        'ventas_nv',
        'total_ventas',
        'total_comision',
    ];

    protected $casts = [
        'porcentaje_comision' => 'decimal:2',
        'ventas_cpe' => 'decimal:2',
        'ventas_nv' => 'decimal:2',
        'total_ventas' => 'decimal:2',
        'total_comision' => 'decimal:2',
        'activo' => 'boolean',
    ];
}
