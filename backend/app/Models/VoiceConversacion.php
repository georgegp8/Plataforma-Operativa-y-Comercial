<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VoiceConversacion extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'voice_conversaciones';

    protected $fillable = [
        'usuario_id',
        'entidad_id',
        'comprobante_id',
        'estado',
        'tipo_comprobante_sugerido',
        'payload_intencion',
        'tiempo_transcripcion_ms',
        'tiempo_procesamiento_ms',
        'error_mensaje',
    ];

    protected $casts = [
        'payload_intencion' => 'array',
        'tiempo_transcripcion_ms' => 'integer',
        'tiempo_procesamiento_ms' => 'integer',
    ];

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function entidad()
    {
        return $this->belongsTo(Entidad::class, 'entidad_id');
    }

    public function comprobante()
    {
        return $this->belongsTo(Comprobante::class, 'comprobante_id');
    }

    public function mensajes()
    {
        return $this->hasMany(VoiceMensaje::class, 'conversacion_id');
    }
}
