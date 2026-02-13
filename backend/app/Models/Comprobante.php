<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comprobante extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'comprobantes';

    protected $fillable = [
        'empresa_id',
        'oportunidad_id',
        'usuario_id',
        'tipo_doc',
        'serie',
        'correlativo',
        'cliente_tipo_doc',
        'cliente_num_doc',
        'cliente_razon_social',
        'cliente_direccion',
        'cliente_email',
        'moneda',
        'mto_oper_gravadas',
        'mto_oper_exoneradas',
        'mto_oper_inafectas',
        'mto_oper_exportacion',
        'mto_oper_gratuitas',
        'mto_igv',
        'mto_isc',
        'total_impuestos',
        'valor_venta',
        'sub_total',
        'redondeo',
        'mto_imp_venta',
        'tiene_detraccion',
        'detraccion_monto',
        'detraccion_porcentaje',
        'detraccion_tipo',           // NUEVO
        'medio_pago_detraccion',     // NUEVO
        'fecha_emision',
        'fecha_vencimiento',
        'estado_sunat',
        'codigo_sunat',
        'mensaje_sunat',
        'hash_cpe',
        'xml_path',
        'cdr_path',
        'pdf_path',
        'raw_request',
        'raw_response',
        'tipo_doc_relacionado',
        'serie_relacionado',
        'correlativo_relacionado',
        'motivo',
        'forma_pago',
        'cuotas',
        'metadata',
        'observaciones',
        // Campos NubeFact
        'nubefact_enlace',
        'nubefact_aceptada_por_sunat',
        'nubefact_sunat_ticket',
        'nubefact_pdf_url',
        'nubefact_xml_url',
        'nubefact_cdr_url',
        'nubefact_cadena_qr',
        'nubefact_codigo_hash',
        'nubefact_codigo_barras',
        'nubefact_pdf_base64',
        'nubefact_xml_base64',
        'nubefact_cdr_base64',
        'nubefact_response_json',
        'nubefact_enviado_at',
        'nubefact_consultado_at',
        'anulado',
        'anulado_at',
        'motivo_anulacion',
        // Campos panel NubeFact
        'mto_base_imp',
        'pagado',
        'enviado_cliente',
        'enviado_cliente_at',
    ];

    protected $casts = [
        'mto_oper_gravadas' => 'decimal:2',
        'mto_oper_exoneradas' => 'decimal:2',
        'mto_oper_inafectas' => 'decimal:2',
        'mto_oper_exportacion' => 'decimal:2',
        'mto_oper_gratuitas' => 'decimal:2',
        'mto_igv' => 'decimal:2',
        'mto_isc' => 'decimal:2',
        'total_impuestos' => 'decimal:2',
        'valor_venta' => 'decimal:2',
        'sub_total' => 'decimal:2',
        'redondeo' => 'decimal:2',
        'mto_imp_venta' => 'decimal:2',
        'detraccion_monto' => 'decimal:2',
        'detraccion_porcentaje' => 'decimal:2',
        'tiene_detraccion' => 'boolean',
        'fecha_emision' => 'datetime',
        'fecha_vencimiento' => 'date',
        'raw_request' => 'array',
        'raw_response' => 'array',
        'cuotas' => 'array',
        'metadata' => 'array',
        // Casts NubeFact
        'nubefact_aceptada_por_sunat' => 'boolean',
        'nubefact_enviado_at' => 'datetime',
        'nubefact_consultado_at' => 'datetime',
        'anulado' => 'boolean',
        'anulado_at' => 'datetime',
        // Casts campos panel NubeFact
        'mto_base_imp' => 'decimal:2',
        'pagado' => 'boolean',
        'enviado_cliente' => 'boolean',
        'enviado_cliente_at' => 'datetime',
    ];

    /**
     * Relaciones
     */
    public function empresa()
    {
        return $this->belongsTo(Empresa::class);
    }

    public function oportunidad()
    {
        return $this->belongsTo(Oportunidad::class);
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function items()
    {
        return $this->hasMany(ComprobanteItem::class);
    }

    public function pagos()
    {
        return $this->hasMany(Pago::class);
    }

    /**
     * Scopes
     */
    public function scopeAceptados($query)
    {
        return $query->where('estado_sunat', 'aceptado');
    }

    public function scopeRechazados($query)
    {
        return $query->where('estado_sunat', 'rechazado');
    }

    public function scopePendientes($query)
    {
        return $query->where('estado_sunat', 'pendiente');
    }

    public function scopeFacturas($query)
    {
        return $query->where('tipo_doc', '01');
    }

    public function scopeBoletas($query)
    {
        return $query->where('tipo_doc', '03');
    }

    public function scopeNotasCredito($query)
    {
        return $query->where('tipo_doc', '07');
    }

    public function scopeNotasDebito($query)
    {
        return $query->where('tipo_doc', '08');
    }

    /**
     * Accessors
     */
    public function getNumeroCompletoAttribute()
    {
        return "{$this->serie}-{$this->correlativo}";
    }

    public function getTipoDocumentoNombreAttribute()
    {
        $tipos = [
            '01' => 'Factura',
            '03' => 'Boleta de Venta',
            '07' => 'Nota de Crédito',
            '08' => 'Nota de Débito',
        ];

        return $tipos[$this->tipo_doc] ?? 'Desconocido';
    }

    public function getEstadoSunatBadgeAttribute()
    {
        $badges = [
            'aceptado' => ['class' => 'success', 'text' => 'Aceptado'],
            'rechazado' => ['class' => 'danger', 'text' => 'Rechazado'],
            'pendiente' => ['class' => 'warning', 'text' => 'Pendiente'],
            'baja' => ['class' => 'secondary', 'text' => 'Anulado'],
        ];

        return $badges[$this->estado_sunat] ?? ['class' => 'secondary', 'text' => 'Desconocido'];
    }

    /**
     * Obtener descripción del tipo de detracción
     */
    public function getDetraccionTipoDescripcionAttribute(): ?string
    {
        if (!$this->detraccion_tipo) {
            return null;
        }

        $tipos = [
            '001' => 'Azúcar (10%)',
            '003' => 'Alcohol etílico (10%)',
            '004' => 'Recursos hidrobiológicos (4-15%)',
            '012' => 'Intermediación laboral (12%)',
            '019' => 'Arrendamiento de bienes (12%)',
            '027' => 'Transporte de carga (4%)',
            '030' => 'Contratos de construcción (4%)',
            '037' => 'Demás servicios gravados (12%)',
        ];

        return $tipos[$this->detraccion_tipo] ?? "Código {$this->detraccion_tipo}";
    }
}
