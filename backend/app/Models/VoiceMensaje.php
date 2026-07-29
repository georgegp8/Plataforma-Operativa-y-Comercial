<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VoiceMensaje extends Model
{
    use HasFactory;

    protected $table = 'voice_mensajes';

    protected $fillable = [
        'conversacion_id',
        'rol',
        'tipo',
        'texto',
        'audio_path',
        'payload_intencion',
    ];

    protected $casts = [
        'payload_intencion' => 'array',
    ];

    public function conversacion()
    {
        return $this->belongsTo(VoiceConversacion::class, 'conversacion_id');
    }
}
