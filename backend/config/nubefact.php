<?php

return [
    /*
    |--------------------------------------------------------------------------
    | NubeFact API Configuration
    |--------------------------------------------------------------------------
    |
    | Configuración para integración con NubeFact como proveedor de
    | Facturación Electrónica según SUNAT.
    |
    | Documentación oficial:
    | - NUBEFACT DOC API JSON V1.pdf
    | - API NUBEFACT - GUIA DE REMISIÓN.pdf
    |
    */

    /**
     * URL base del API de NubeFact
     *
     * Formatos según versión:
     * - Online: https://api.nubefact.com/api/v1/{ruc_key}
     * - Offline: http://localhost:8000/api/v1/{ruc_key}
     * - Reseller: https://api.pse.pe/api/v1/{ruc_key}
     *
     * El {ruc_key} es único por cliente y se obtiene desde la cuenta NubeFact
     */
    'base_url' => env('NUBEFACT_BASE_URL', 'https://api.pse.pe/api/v1/45d35a0d56f7441aaa57f3bee732f3a4123f39273dc843cd8432b2179443b214'),

    /**
     * Token de autenticación JWT
     *
     * Se obtiene desde:
     * 1. www.nubefact.com → Login → API (Integración)
     * 2. tuempresa.pse.pe → API (Integración) [Reseller]
     *
     * Formato: largo string alfanumérico
     */
    'token' => env('NUBEFACT_TOKEN', 'eyJhbGciOiJIUzI1NiJ9.ImY3ODExY2NjMmY5YTRjY2NhZGQwNDFjZWVhNmU2NGY0ZTM1NWM2MjBhZTFlNDA4OGI0NWYxYzljNThmMWZiN2Yi.Jo7VAwq7Nqz9mGvUMr9WOESoQ_mV7UG2C9LBxnNMSVA'),

    /**
     * Timeout de requests HTTP en segundos
     */
    'timeout' => env('NUBEFACT_TIMEOUT', 30),

    /**
     * Habilitar envío automático a SUNAT
     *
     * Si es true, NubeFact enviará el comprobante a SUNAT inmediatamente.
     * Si es false, se genera pero no se envía (útil para pruebas).
     */
    'enviar_automaticamente_sunat' => env('NUBEFACT_AUTO_SUNAT', true),

    /**
     * Habilitar envío automático de email al cliente
     *
     * NubeFact puede enviar el PDF por email al cliente automáticamente.
     */
    'enviar_automaticamente_cliente' => env('NUBEFACT_AUTO_EMAIL', false),

    /**
     * Formato de PDF por defecto
     *
     * Opciones: 'A4', 'A5', 'TICKET'
     */
    'formato_pdf' => env('NUBEFACT_PDF_FORMAT', 'A4'),

    /**
     * Incluir archivos ZIP en base64 en la respuesta
     *
     * Si es true, NubeFact incluirá pdf_zip_base64, xml_zip_base64, cdr_zip_base64
     * en la respuesta (útil para almacenar localmente).
     * Debe activarse también desde la cuenta NubeFact en "Configuración principal".
     */
    'incluir_base64' => env('NUBEFACT_INCLUDE_BASE64', false),

    /**
     * Modo de operación
     *
     * - 'demo': Cuenta de pruebas (validaciones parciales)
     * - 'produccion': Cuenta real con validaciones completas de SUNAT
     */
    'modo' => env('NUBEFACT_MODE', 'demo'),

    /**
     * Configuración para guías de remisión
     */
    'guias' => [
        /**
         * Reintentos para consultar guía hasta que SUNAT acepte
         *
         * Según documentación, el PDF de GRE se genera solo después
         * de que SUNAT acepte. Puede tomar segundos o minutos.
         */
        'max_reintentos_consulta' => env('NUBEFACT_GRE_MAX_RETRIES', 10),

        /**
         * Segundos de espera entre reintentos
         */
        'segundos_entre_reintentos' => env('NUBEFACT_GRE_RETRY_DELAY', 5),
    ],

    /**
     * Mapeo de códigos de error de NubeFact
     *
     * Según manual "MANEJO DE ERRORES"
     */
    'codigos_error' => [
        10 => 'No se pudo autenticar, token incorrecto o eliminado',
        11 => 'La ruta o URL que estás usando no es correcta o no existe',
        12 => 'Solicitud incorrecta, la cabecera (Header) no contiene un Content-Type correcto',
        20 => 'El archivo enviado no cumple con el formato establecido',
        21 => 'No se pudo completar la operación',
        22 => 'Documento enviado fuera del plazo permitido',
        23 => 'Este documento ya existe en NubeFact',
        24 => 'El documento indicado no existe o no fue enviado a NubeFact',
        40 => 'Error interno desconocido',
        50 => 'Su cuenta ha sido suspendida',
        51 => 'Su cuenta ha sido suspendida por falta de pago',
    ],
];
