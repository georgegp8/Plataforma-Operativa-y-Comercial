<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Documento extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'documentos';

    protected $fillable = [
        'oportunidad_id',
        'usuario_id',
        'tipo',
        'nombre_archivo',
        'storage_path',
        'mime_type',
        'size',
        'metadata',
        'descripcion',
        'version',
        'documento_padre_id',
    ];

    protected $casts = [
        'size' => 'integer',
        'version' => 'integer',
        'metadata' => 'array',
    ];

    /**
     * Relaciones
     */
    public function oportunidad()
    {
        return $this->belongsTo(Oportunidad::class);
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function documentoPadre()
    {
        return $this->belongsTo(Documento::class, 'documento_padre_id');
    }

    public function versiones()
    {
        return $this->hasMany(Documento::class, 'documento_padre_id');
    }

    /**
     * Scopes
     */
    public function scopePorTipo($query, $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    /**
     * Accessors
     */
    public function getSizeFormattedAttribute()
    {
        $bytes = $this->size;

        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2).' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2).' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2).' KB';
        } else {
            return $bytes.' bytes';
        }
    }
}
