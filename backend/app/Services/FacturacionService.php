<?php

namespace App\Services;

use Exception;

/**
 * Servicio de facturación electrónica
 * Nota: la emisión directa con Greenter fue removida. La plataforma se integra con NubeFact como proveedor de comprobantes.
 */
class FacturacionService
{
    /**
     * Emitir un comprobante electrónico (ENFOQUE SIMPLIFICADO DEL TUTORIAL)
     *
     * @param  array  $data  Data del comprobante en formato Greenter
     * @param  string  $tipoComprobante  'invoice', 'note', 'despatch', etc.
     * @return array
     *
     * @throws Exception
     */
    public function emitirComprobante(array $data, string $tipoComprobante = 'invoice')
    {
        throw new Exception('La emisión directa de comprobantes vía SUNAT ha sido deshabilitada en esta instalación. La plataforma debe integrarse con la API de NubeFact.');
    }

    /**
     * Generar representación HTML de un comprobante
     */
    public function generarHtml($comprobanteId): string
    {
        throw new Exception('La generación de HTML/PDF basada en Greenter ha sido deshabilitada.');
    }
}
