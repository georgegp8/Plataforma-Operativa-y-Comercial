<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CuentaBancaria extends Model
{
    use HasFactory;

    protected $table = 'cuentas_bancarias';

    protected $fillable = [
        'descripcion',
        'numero',
        'balance',
        'abreviatura',
        'banco',
        'moneda',
        'activo',
        'created_by',
    ];

    protected $casts = [
        'balance' => 'decimal:2',
        'activo' => 'boolean',
    ];
}
