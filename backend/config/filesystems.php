<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported Drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => env('APP_URL').'/storage',
            'visibility' => 'public',
            'throw' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
        ],

        // MinIO - Almacenamiento principal (S3 Compatible)
        'minio' => [
            'driver' => 's3',
            'key' => env('MINIO_ACCESS_KEY', 'minio'),
            'secret' => env('MINIO_SECRET_KEY', 'minio123'),
            'region' => env('MINIO_REGION', 'us-east-1'),
            'bucket' => env('MINIO_BUCKET', 'facturacion'),
            'url' => env('MINIO_ENDPOINT', 'http://localhost:9000'),
            'endpoint' => env('MINIO_ENDPOINT', 'http://localhost:9000'),
            'use_path_style_endpoint' => env('MINIO_USE_PATH_STYLE_ENDPOINT', true),
            'throw' => false,
        ],

        // MinIO - Documentos Digitalizados (PDFs/Imágenes para OCR)
        'documentos' => [
            'driver' => 's3',
            'key' => env('MINIO_ACCESS_KEY', 'minio'),
            'secret' => env('MINIO_SECRET_KEY', 'minio123'),
            'region' => env('MINIO_REGION', 'us-east-1'),
            'bucket' => env('MINIO_BUCKET', 'facturacion'),
            'url' => env('MINIO_ENDPOINT', 'http://localhost:9000'),
            'endpoint' => env('MINIO_ENDPOINT', 'http://localhost:9000'),
            'use_path_style_endpoint' => true,
            'root' => 'documentos-digitalizados',
            'visibility' => 'private',
            'throw' => false,
        ],

        // MinIO - Comprobantes Electrónicos (PDFs/XMLs de NubeFact)
        'comprobantes' => [
            'driver' => 's3',
            'key' => env('MINIO_ACCESS_KEY', 'minio'),
            'secret' => env('MINIO_SECRET_KEY', 'minio123'),
            'region' => env('MINIO_REGION', 'us-east-1'),
            'bucket' => env('MINIO_BUCKET', 'facturacion'),
            'url' => env('MINIO_ENDPOINT', 'http://localhost:9000'),
            'endpoint' => env('MINIO_ENDPOINT', 'http://localhost:9000'),
            'use_path_style_endpoint' => true,
            'root' => 'comprobantes',
            'visibility' => 'private',
            'throw' => false,
        ],

        // MinIO - Archivos Adjuntos (Contratos, O/C, etc.)
        'adjuntos' => [
            'driver' => 's3',
            'key' => env('MINIO_ACCESS_KEY', 'minio'),
            'secret' => env('MINIO_SECRET_KEY', 'minio123'),
            'region' => env('MINIO_REGION', 'us-east-1'),
            'bucket' => env('MINIO_BUCKET', 'facturacion'),
            'url' => env('MINIO_ENDPOINT', 'http://localhost:9000'),
            'endpoint' => env('MINIO_ENDPOINT', 'http://localhost:9000'),
            'use_path_style_endpoint' => true,
            'root' => 'adjuntos',
            'visibility' => 'private',
            'throw' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
