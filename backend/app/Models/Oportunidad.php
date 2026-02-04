<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Oportunidad extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'oportunidades';

    protected $fillable = [
        'empresa_id',
        'responsable_id',
        'codigo',
        'titulo',
        'descripcion',
        'area',
        'tipo_operacion',
        'estado',
        'monto_estimado',
        'moneda',
        'probabilidad',
        'fecha_inicio',
        'fecha_vencimiento',
        'fecha_cierre',
        'sla_dias',
        'sla_fecha_limite',
        'sla_estado',
        'metadata',
        'notas',
    ];

    protected $casts = [
        'monto_estimado' => 'decimal:2',
        'probabilidad' => 'integer',
        'fecha_inicio' => 'date',
        'fecha_vencimiento' => 'date',
        'fecha_cierre' => 'date',
        'sla_fecha_limite' => 'datetime',
        'metadata' => 'array',
    ];

    /**
     * Boot method
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($oportunidad) {
            if (empty($oportunidad->codigo)) {
                $oportunidad->codigo = static::generarCodigo();
            }

            // Calcular SLA si hay configuración
            if ($oportunidad->sla_dias && $oportunidad->fecha_inicio) {
                $oportunidad->sla_fecha_limite = Carbon::parse($oportunidad->fecha_inicio)
                    ->addDays($oportunidad->sla_dias);
            }
        });

        static::updating(function ($oportunidad) {
            // Actualizar estado SLA
            $oportunidad->actualizarEstadoSLA();
        });
    }

    /**
     * Relaciones
     */
    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    public function responsable()
    {
        return $this->belongsTo(User::class, 'responsable_id');
    }

    public function documentos()
    {
        return $this->hasMany(Documento::class);
    }

    public function pagos()
    {
        return $this->hasMany(Pago::class);
    }

    public function comprobantes()
    {
        return $this->hasMany(Comprobante::class);
    }

    public function alertas()
    {
        return $this->hasMany(Alerta::class);
    }

    /**
     * Scopes
     */
    public function scopeActivas($query)
    {
        return $query->whereNotIn('estado', ['ganado', 'perdido']);
    }

    public function scopeGanadas($query)
    {
        return $query->where('estado', 'ganado');
    }

    public function scopePerdidas($query)
    {
        return $query->where('estado', 'perdido');
    }

    public function scopeSlaVencido($query)
    {
        return $query->where('sla_estado', 'vencido');
    }

    public function scopeSlaProximoVencer($query)
    {
        return $query->where('sla_estado', 'proximo_vencer');
    }

    /**
     * Métodos auxiliares
     */
    private static function generarCodigo()
    {
        $year = date('Y');
        $ultimo = static::where('codigo', 'like', "OPO-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();

        $numero = $ultimo ? (int) substr($ultimo->codigo, -4) + 1 : 1;

        return sprintf('OPO-%s-%04d', $year, $numero);
    }

    public function actualizarEstadoSLA()
    {
        if (! $this->sla_fecha_limite) {
            return;
        }

        $now = Carbon::now();
        $fechaLimite = Carbon::parse($this->sla_fecha_limite);

        if ($now->gt($fechaLimite)) {
            $this->sla_estado = 'vencido';
        } elseif ($now->diffInDays($fechaLimite) <= 3) {
            $this->sla_estado = 'proximo_vencer';
        } else {
            $this->sla_estado = 'en_plazo';
        }
    }

    public function getTotalPagadoAttribute()
    {
        return $this->pagos()->sum('monto');
    }

    public function getSaldoPendienteAttribute()
    {
        return $this->monto_estimado - $this->total_pagado;
    }
}
