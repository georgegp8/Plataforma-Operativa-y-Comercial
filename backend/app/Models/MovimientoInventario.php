<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MovimientoInventario extends Model
{
    protected $table = 'movimientos_inventario';

    protected $fillable = [
        'empresa_id',
        'fecha',
        'codigo_producto',
        'nombre_producto',
        'almacen',
        'categoria_id',
        'cantidad',
        'tipo',
        'ticket_id',
        'usuario_id',
        'observaciones',
    ];

    protected $casts = [
        'fecha' => 'datetime',
        'cantidad' => 'decimal:3',
    ];

    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    public function categoria()
    {
        return $this->belongsTo(Categoria::class);
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
