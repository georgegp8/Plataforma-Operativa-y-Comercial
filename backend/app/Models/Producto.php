<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Producto extends Model
{
    use HasFactory;

    protected $fillable = [
        'empresa_id',
        'codigo',
        'descripcion',
        'categoria',
        'unidad_medida',
        'codigo_producto_sunat',
        'moneda',
        'valor_venta_unitario',
        'precio_venta_unitario',
        'costo_compra_unitario',
        'precio_compra_unitario',
        'tipo_afectacion_igv',
        'destacado',
        'activo',
        'stock_actual',
        'stock_minimo',
        'stock_maximo',
    ];

    protected $casts = [
        'destacado' => 'boolean',
        'activo' => 'boolean',
        'valor_venta_unitario' => 'decimal:6',
        'precio_venta_unitario' => 'decimal:6',
        'costo_compra_unitario' => 'decimal:6',
        'precio_compra_unitario' => 'decimal:6',
        'stock_actual' => 'decimal:3',
        'stock_minimo' => 'decimal:3',
        'stock_maximo' => 'decimal:3',
    ];

    /**
     * Relación con Empresa
     */
    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    /**
     * Scope para productos activos
     */
    public function scopeActivo($query)
    {
        return $query->where('activo', true);
    }

    /**
     * Scope para productos destacados
     */
    public function scopeDestacado($query)
    {
        return $query->where('destacado', true);
    }

    /**
     * Scope para búsqueda
     */
    public function scopeBuscar($query, $termino)
    {
        return $query->where(function ($q) use ($termino) {
            $q->where('codigo', 'ilike', "%{$termino}%")
                ->orWhere('descripcion', 'ilike', "%{$termino}%")
                ->orWhere('codigo_producto_sunat', 'ilike', "%{$termino}%");
        });
    }
}
