<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $tipoDoc }} Electrónica</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #10b981;
            margin: 0;
            font-size: 24px;
        }
        .info-box {
            background-color: #f0fdf4;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: bold;
            color: #6b7280;
        }
        .value {
            color: #111827;
        }
        .total {
            background-color: #10b981;
            color: white;
            padding: 15px;
            border-radius: 4px;
            text-align: center;
            margin: 20px 0;
            font-size: 20px;
            font-weight: bold;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: #10b981;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 5px;
            font-weight: bold;
        }
        .btn:hover {
            background-color: #059669;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
        }
        .links {
            text-align: center;
            margin: 20px 0;
        }
        .sunat-badge {
            display: inline-block;
            background-color: #dbeafe;
            color: #1e40af;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📄 {{ $tipoDoc }} Electrónica</h1>
            <p style="margin: 5px 0; color: #6b7280;">Comprobante de Pago Electrónico</p>
        </div>

        <p>Estimado(a) <strong>{{ $comprobante->cliente_razon_social }}</strong>,</p>

        <p>Le enviamos su {{ $tipoDoc }} Electrónica emitida y aceptada por SUNAT.</p>

        <div class="info-box">
            <div class="info-row">
                <span class="label">{{ $tipoDoc }}:</span>
                <span class="value"><strong>{{ $comprobante->numero_completo }}</strong></span>
            </div>
            <div class="info-row">
                <span class="label">Fecha de Emisión:</span>
                <span class="value">{{ \Carbon\Carbon::parse($comprobante->fecha_emision)->format('d/m/Y') }}</span>
            </div>
            <div class="info-row">
                <span class="label">RUC/DNI:</span>
                <span class="value">{{ $comprobante->cliente_num_doc }}</span>
            </div>
            <div class="info-row">
                <span class="label">Moneda:</span>
                <span class="value">{{ $comprobante->codigo_tipo_moneda === 'PEN' ? 'Soles (PEN)' : 'Dólares (USD)' }}</span>
            </div>
        </div>

        <div class="total">
            Total: {{ $moneda }} {{ number_format($comprobante->mto_imp_venta, 2) }}
        </div>

        @if($comprobante->nubefact_aceptada_por_sunat)
        <div style="text-align: center;">
            <span class="sunat-badge">✓ Aceptado por SUNAT</span>
        </div>
        @endif

        @if($comprobante->nubefact_pdf_url || $comprobante->nubefact_xml_url)
        <div class="links">
            <p style="margin-bottom: 10px; color: #6b7280;">Descargue sus documentos adjuntos o desde estos enlaces:</p>
            @if($comprobante->nubefact_pdf_url)
            <a href="{{ $comprobante->nubefact_pdf_url }}" class="btn" target="_blank">📥 Descargar PDF</a>
            @endif
            @if($comprobante->nubefact_xml_url)
            <a href="{{ $comprobante->nubefact_xml_url }}" class="btn" target="_blank" style="background-color: #3b82f6;">📥 Descargar XML</a>
            @endif
        </div>
        @endif

        <p style="margin-top: 30px;">Gracias por su preferencia.</p>

        <div class="footer">
            <p><strong>{{ config('app.name', 'Sistema de Facturación Electrónica') }}</strong></p>
            <p>Este es un correo automático, por favor no responder.</p>
            <p style="margin-top: 10px; font-size: 11px; color: #9ca3af;">
                Este comprobante de pago electrónico ha sido generado conforme a la normativa de SUNAT.
            </p>
        </div>
    </div>
</body>
</html>
