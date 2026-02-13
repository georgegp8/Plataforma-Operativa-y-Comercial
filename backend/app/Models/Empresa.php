<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Empresa extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'empresas';

    protected $fillable = [
        'ruc',
        'razon_social',
        'nombre_comercial',
        'ubigeo',
        'departamento',
        'provincia',
        'distrito',
        'direccion',
        'telefono',
        'email',
        'certificado_path',
        'sol_user',
        'sol_password',
        'client_id',
        'client_secret',
        'logo_path',
        'activo',
        'modo',
    ];

    protected $hidden = [
        'sol_password',
        'client_id',
        'client_secret',
    ];

    protected $casts = [
        'activo' => 'boolean',
    ];

    /**
     * Relaciones
     */
    public function oportunidades()
    {
        return $this->hasMany(Oportunidad::class);
    }

    public function comprobantes()
    {
        return $this->hasMany(Comprobante::class);
    }

    /**
     * Accessors & Mutators
     */
    public function setSolPasswordAttribute($value)
    {
        $this->attributes['sol_password'] = encrypt($value);
    }

    public function getSolPasswordAttribute($value)
    {
        return decrypt($value);
    }

    public function setClientSecretAttribute($value)
    {
        $this->attributes['client_secret'] = encrypt($value);
    }

    public function getClientSecretAttribute($value)
    {
        return $value ? decrypt($value) : null;
    }

    /**
     * Scopes
     */
    public function scopeActivas($query)
    {
        return $query->where('activo', true);
    }

    public function scopeProduccion($query)
    {
        return $query->where('modo', 'prod');
    }

    public function scopeBeta($query)
    {
        return $query->where('modo', 'beta');
    }

    /**
     * Métodos auxiliares
     */
    public function getDireccionCompletaAttribute()
    {
        return "{$this->direccion}, {$this->distrito}, {$this->provincia}, {$this->departamento}";
    }
}
