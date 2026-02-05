<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GuiaRemision extends Model
{
    use HasFactory;

    protected $fillable = [
        'empresa_id',
        'oportunidad_id',
        'usuario_id',
        'tipo_comprobante',
        'serie',
        'numero',
        'cliente_tipo_documento',
        'cliente_numero_documento',
        'cliente_denominacion',
        'cliente_direccion',
        'cliente_email',
        'fecha_emision',
        'fecha_inicio_traslado',
        'observaciones',
        'motivo_traslado',
        'motivo_traslado_otros',
        'tipo_transporte',
        'peso_bruto_total',
        'peso_bruto_unidad',
        'numero_bultos',
        'transportista_tipo_documento',
        'transportista_numero_documento',
        'transportista_denominacion',
        'vehiculo_placa',
        'vehiculo_tuc',
        'conductor_tipo_documento',
        'conductor_numero_documento',
        'conductor_nombre',
        'conductor_apellidos',
        'conductor_licencia',
        'destinatario_tipo_documento',
        'destinatario_numero_documento',
        'destinatario_denominacion',
        'punto_partida_ubigeo',
        'punto_partida_direccion',
        'punto_partida_establecimiento',
        'punto_llegada_ubigeo',
        'punto_llegada_direccion',
        'punto_llegada_establecimiento',
        'nubefact_enlace',
        'nubefact_aceptada_por_sunat',
        'nubefact_pdf_url',
        'nubefact_xml_url',
        'nubefact_cdr_url',
        'nubefact_cadena_qr',
        'nubefact_response_json',
        'nubefact_enviado_at',
        'nubefact_consultado_at',
    ];

    protected $casts = [
        'fecha_emision' => 'date',
        'fecha_inicio_traslado' => 'date',
        'peso_bruto_total' => 'decimal:3',
        'nubefact_aceptada_por_sunat' => 'boolean',
        'nubefact_enviado_at' => 'datetime',
        'nubefact_consultado_at' => 'datetime',
    ];

    protected $appends = ['estado'];

    public function getEstadoAttribute()
    {
        if ($this->nubefact_aceptada_por_sunat) {
            return 'aceptado';
        }
        if ($this->nubefact_enviado_at) {
            return 'enviado';
        }
        return 'pendiente';
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function oportunidad(): BelongsTo
    {
        return $this->belongsTo(Oportunidad::class);
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class , 'usuario_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(GuiaRemisionItem::class);
    }
}
