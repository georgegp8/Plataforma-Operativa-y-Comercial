<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class NotaVenta extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'nota_ventas';

    protected $fillable = [
        'empresa_id',
        'serie',
        'numero',
        'fecha_emision',
        'moneda',
        'cliente_tipo_doc',
        'cliente_num_doc',
        'cliente_razon_social',
        'cliente_email',
        'cliente_telefono',
        'cliente_direccion',
        'subtotal',
        'igv',
        'total',
        'metodo_pago',
        'pagado',
        'fecha_vencimiento',
        'cpe_relacionado',
        'motivo',
        'observaciones',
        'actividad',
    ];

    protected $casts = [
        'fecha_emision' => 'date',
        'fecha_vencimiento' => 'date',
        'pagado' => 'boolean',
        'subtotal' => 'decimal:2',
        'igv' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    // Accessor para estado_pago (compatible con el frontend)
    public function getEstadoPagoAttribute(): string
    {
        return $this->pagado ? 'pagado' : 'pendiente';
    }

    // Accessor para número completo
    public function getNumeroCompletoAttribute(): string
    {
        return $this->serie . '-' . $this->numero;
    }
}
