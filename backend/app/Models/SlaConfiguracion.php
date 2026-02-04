<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SlaConfiguracion extends Model
{
    use HasFactory;

    protected $table = 'sla_configuraciones';

    protected $fillable = [
        'nombre',
        'dias_limite',
        'color_alerta',
        'activo',
    ];

    protected $casts = [
        'dias_limite' => 'integer',
        'activo' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
