<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DocumentoDigitalizado extends Model
{
    use HasFactory;

    protected $table = 'documentos_digitalizados';

    protected $fillable = [
        'nombre_archivo',
        'ruta_archivo',
        'tipo_archivo',
        'tamano_archivo',
        'tipo_operacion',
        'estado_procesamiento',
        'error_mensaje',
        'datos_extraidos',
        'tipo_comprobante',
        'serie',
        'numero',
        'comprobante_completo',
        'fecha_emision',
        'entidad_tipo_doc',
        'entidad_num_doc',
        'entidad_razon_social',
        'entidad_direccion',
        'moneda',
        'subtotal',
        'igv',
        'total',
        'items_extraidos',
        'confianza_ocr',
        'requiere_validacion',
        'validado',
        'fecha_validacion',
        'validado_por',
        'compra_id',
        'venta_id',
        'activo',
        'created_by',
        // Nuevos campos de NubeFact
        'sunat_transaction',
        'tipo_documento_cliente',
        'fecha_vencimiento',
        'tipo_cambio',
        'porcentaje_igv',
        'total_gravada',
        'total_exonerada',
        'total_inafecta',
        'total_gratuita',
        'total_otros_cargos',
        'total_descuentos',
        'suma_igv',
        'suma_isc',
        'suma_otros_tributos',
        'mto_operaciones_gravadas',
        'mto_operaciones_exoneradas',
        'mto_operaciones_inafectas',
        'mto_operaciones_gratuitas',
        'detraccion',
        'detraccion_codigo',
        'detraccion_porcentaje',
        'detraccion_monto',
        'percepcion_tipo',
        'percepcion_monto',
        'condiciones_pago',
        'orden_compra_servicio',
        'observaciones',
        'documento_modifica_tipo',
        'documento_modifica_serie',
        'documento_modifica_numero',
        'tipo_nota',
        'motivo_nota',
        'venta_al_credito',
        'venta_credito_cuotas',
        'guias_relacionadas',
    ];

    protected $casts = [
        'fecha_emision' => 'date',
        'fecha_vencimiento' => 'date',
        'datos_extraidos' => 'array',
        'items_extraidos' => 'array',
        'venta_credito_cuotas' => 'array',
        'guias_relacionadas' => 'array',
        'subtotal' => 'decimal:2',
        'igv' => 'decimal:2',
        'total' => 'decimal:2',
        'tipo_cambio' => 'decimal:3',
        'porcentaje_igv' => 'decimal:2',
        'total_gravada' => 'decimal:2',
        'total_exonerada' => 'decimal:2',
        'total_inafecta' => 'decimal:2',
        'total_gratuita' => 'decimal:2',
        'total_otros_cargos' => 'decimal:2',
        'total_descuentos' => 'decimal:2',
        'suma_igv' => 'decimal:2',
        'suma_isc' => 'decimal:2',
        'suma_otros_tributos' => 'decimal:2',
        'mto_operaciones_gravadas' => 'decimal:2',
        'mto_operaciones_exoneradas' => 'decimal:2',
        'mto_operaciones_inafectas' => 'decimal:2',
        'mto_operaciones_gratuitas' => 'decimal:2',
        'detraccion_porcentaje' => 'decimal:2',
        'detraccion_monto' => 'decimal:2',
        'percepcion_monto' => 'decimal:2',
        'confianza_ocr' => 'decimal:2',
        'requiere_validacion' => 'boolean',
        'validado' => 'boolean',
        'venta_al_credito' => 'boolean',
        'fecha_validacion' => 'datetime',
        'activo' => 'boolean',
        'tamano_archivo' => 'integer',
    ];

    /**
     * Relación con Compra
     */
    public function compra()
    {
        return $this->belongsTo(Compra::class);
    }

    /**
     * Relación con Venta (cuando se cree el modelo)
     */
    // public function venta()
    // {
    //     return $this->belongsTo(Venta::class);
    // }
}
