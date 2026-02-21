<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductoCompuesto extends Model
{
    protected $table = 'productos_compuestos';

    protected $fillable = [
        'empresa_id',
        'codigo_interno',
        'nombre',
        'unidad',
        'precio_unitario_venta',
        'tiene_igv',
        'activo',
    ];

    protected $casts = [
        'precio_unitario_venta' => 'decimal:4',
        'tiene_igv' => 'boolean',
        'activo' => 'boolean',
    ];

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    public function scopeActivo($query)
    {
        return $query->where('activo', true);
    }
}
