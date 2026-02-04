<?php

namespace App\Console\Commands;

use App\Models\Comprobante;
use App\Models\ComprobanteItem;
use App\Models\Empresa;
use App\Models\Entidad;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ImportNubefactCsv extends Command
{
    protected $signature = 'import:nubefact-csv {comprobantes_file} {items_file} {entidades_file?}';

    protected $description = 'Importa datos de CSV de NubeFact (comprobantes, items y entidades)';

    public function handle()
    {
        $comprobantesFile = $this->argument('comprobantes_file');
        $itemsFile = $this->argument('items_file');
        $entidadesFile = $this->argument('entidades_file');

        if (! file_exists($comprobantesFile) || ! file_exists($itemsFile)) {
            $this->error('Los archivos CSV de comprobantes o items no existen.');

            return 1;
        }

        // Crear empresa de ejemplo si no existe
        $empresa = Empresa::firstOrCreate([
            'ruc' => '20434906301',
        ], [
            'razon_social' => 'EMPRESA DE EJEMPLO',
            'nombre_comercial' => 'Empresa Ejemplo',
            'direccion' => 'Dirección de ejemplo',
            'ubigeo' => '150101', // Lima - Lima - Lima por defecto
            'departamento' => 'LIMA',
            'provincia' => 'LIMA',
            'distrito' => 'LIMA',
            'activo' => true,
        ]);

        $this->info("Importando comprobantes desde: {$comprobantesFile}");
        $comprobantesImportados = $this->importarComprobantes($comprobantesFile, $empresa);

        $this->info("Importando items desde: {$itemsFile}");
        $itemsImportados = $this->importarItems($itemsFile);

        $entidadesImportadas = 0;
        if ($entidadesFile) {
            if (! file_exists($entidadesFile)) {
                $this->warn("El archivo de ENTIDADES no existe: {$entidadesFile}. Se omite su importación.");
            } else {
                $this->info("Importando entidades desde: {$entidadesFile}");
                $entidadesImportadas = $this->importarEntidades($entidadesFile, $empresa);
            }
        }

        $this->info('Importación completada:');
        $this->info("- Comprobantes: {$comprobantesImportados}");
        $this->info("- Items: {$itemsImportados}");
        if ($entidadesFile) {
            $this->info("- Entidades: {$entidadesImportadas}");
        }

        return 0;
    }

    private function importarComprobantes($file, $empresa)
    {
        $handle = fopen($file, 'r');
        $header = fgetcsv($handle, 0, ';');

        // Debug: mostrar headers encontrados
        $this->info('Headers encontrados: '.implode(', ', $header));

        // Crear mapeo de headers más flexible
        $headerMap = [];
        foreach ($header as $index => $col) {
            $col = trim($col);
            // Normalizar nombres de columnas
            if (strpos($col, 'FECHA') !== false && strpos($col, 'EMISI') !== false) {
                $headerMap['FECHA_EMISION'] = $index;
            } elseif (strpos($col, 'FECHA') !== false && strpos($col, 'VENC') !== false) {
                $headerMap['FECHA_VENCIMIENTO'] = $index;
            } elseif ($col === 'TIPO') {
                $headerMap['TIPO'] = $index;
            } elseif ($col === 'SERIE') {
                $headerMap['SERIE'] = $index;
            } elseif ($col === 'NÚMERO') {
                $headerMap['NUMERO'] = $index;
            } elseif (strpos($col, 'DOC ENTIDAD') !== false) {
                $headerMap['DOC_ENTIDAD'] = $index;
            } elseif ($col === 'RUC') {
                $headerMap['RUC'] = $index;
            } elseif (strpos($col, 'DENOMINACIÓN') !== false) {
                $headerMap['DENOMINACION'] = $index;
            } elseif ($col === 'MONEDA') {
                $headerMap['MONEDA'] = $index;
            } elseif ($col === 'GRAVADA') {
                $headerMap['GRAVADA'] = $index;
            } elseif ($col === 'EXONERADA') {
                $headerMap['EXONERADA'] = $index;
            } elseif ($col === 'INAFECTA') {
                $headerMap['INAFECTA'] = $index;
            } elseif ($col === 'IGV') {
                $headerMap['IGV'] = $index;
            } elseif ($col === 'TOTAL') {
                $headerMap['TOTAL'] = $index;
            } elseif (strpos($col, 'TOTAL GRATUITA') !== false) {
                $headerMap['TOTAL_GRATUITA'] = $index;
            } elseif ($col === 'PAGADO') {
                $headerMap['PAGADO'] = $index;
            } elseif ($col === 'ANULADO') {
                $headerMap['ANULADO'] = $index;
            } elseif (strpos($col, 'ACEPTADO') !== false) {
                $headerMap['ACEPTADO'] = $index;
            }
        }

        $count = 0;

        while (($row = fgetcsv($handle, 0, ';')) !== false) {
            if (count($row) < 10) {
                continue;
            } // Saltar filas incompletas

            try {
                // Usar el mapeo para acceder a los datos
                $fechaEmision = isset($headerMap['FECHA_EMISION']) ?
                    Carbon::createFromFormat('d/m/Y', $row[$headerMap['FECHA_EMISION']]) :
                    now();

                $fechaVencimiento = isset($headerMap['FECHA_VENCIMIENTO']) && $row[$headerMap['FECHA_VENCIMIENTO']] ?
                    Carbon::createFromFormat('d/m/Y', $row[$headerMap['FECHA_VENCIMIENTO']]) :
                    $fechaEmision;

                $comprobante = Comprobante::create([
                    'empresa_id' => $empresa->id,
                    'usuario_id' => 1, // Usuario por defecto
                    'tipo_doc' => isset($headerMap['TIPO']) ? $row[$headerMap['TIPO']] : '01',
                    'serie' => isset($headerMap['SERIE']) ? $row[$headerMap['SERIE']] : '',
                    'correlativo' => isset($headerMap['NUMERO']) ? (int) $row[$headerMap['NUMERO']] : 0,
                    'cliente_tipo_doc' => isset($headerMap['DOC_ENTIDAD']) ? ($row[$headerMap['DOC_ENTIDAD']] ?: '6') : '6',
                    'cliente_num_doc' => isset($headerMap['RUC']) ? ($row[$headerMap['RUC']] ?: '') : '',
                    'cliente_razon_social' => isset($headerMap['DENOMINACION']) ? ($row[$headerMap['DENOMINACION']] ?: 'Sin denominación') : 'Sin denominación',
                    'cliente_direccion' => '',
                    'cliente_email' => '',
                    'moneda' => isset($headerMap['MONEDA']) ? ($row[$headerMap['MONEDA']] ?: 'PEN') : 'PEN',
                    'mto_oper_gravadas' => isset($headerMap['GRAVADA']) ? (float) ($row[$headerMap['GRAVADA']] ?: 0) : 0,
                    'mto_oper_exoneradas' => isset($headerMap['EXONERADA']) ? (float) ($row[$headerMap['EXONERADA']] ?: 0) : 0,
                    'mto_oper_inafectas' => isset($headerMap['INAFECTA']) ? (float) ($row[$headerMap['INAFECTA']] ?: 0) : 0,
                    'mto_base_imp' => isset($headerMap['GRAVADA']) ? (float) ($row[$headerMap['GRAVADA']] ?: 0) : 0,
                    'mto_igv' => isset($headerMap['IGV']) ? (float) ($row[$headerMap['IGV']] ?: 0) : 0,
                    'mto_imp_venta' => isset($headerMap['TOTAL']) ? (float) ($row[$headerMap['TOTAL']] ?: 0) : 0,
                    'mto_oper_gratuitas' => isset($headerMap['TOTAL_GRATUITA']) ? (float) ($row[$headerMap['TOTAL_GRATUITA']] ?: 0) : 0,
                    'pagado' => isset($headerMap['PAGADO']) ? (($row[$headerMap['PAGADO']] ?? '') === 'SI') : false,
                    'anulado' => isset($headerMap['ANULADO']) ? (($row[$headerMap['ANULADO']] ?? '') === 'SI') : false,
                    'enviado_cliente' => false,
                    'estado_sunat' => isset($headerMap['ACEPTADO']) ? (($row[$headerMap['ACEPTADO']] ?? '') === 'SI' ? 'aceptado' : 'pendiente') : 'pendiente',
                    'fecha_emision' => $fechaEmision,
                    'fecha_vencimiento' => $fechaVencimiento,
                ]);

                $count++;

                if ($count % 10 === 0) {
                    $this->info("Procesados {$count} comprobantes...");
                }

            } catch (\Exception $e) {
                $serie = isset($headerMap['SERIE']) ? $row[$headerMap['SERIE']] : 'Unknown';
                $numero = isset($headerMap['NUMERO']) ? $row[$headerMap['NUMERO']] : 'Unknown';
                $this->error("Error procesando comprobante {$serie}-{$numero}: ".$e->getMessage());

                continue;
            }
        }

        fclose($handle);

        return $count;
    }

    private function importarItems($file)
    {
        $handle = fopen($file, 'r');
        $header = fgetcsv($handle, 0, ';');
        $count = 0;

        while (($row = fgetcsv($handle, 0, ';')) !== false) {
            if (count($row) < 10) {
                continue;
            } // Saltar filas incompletas

            $data = array_combine($header, $row);

            try {
                // Buscar el comprobante correspondiente
                $comprobante = Comprobante::where('tipo_doc', $data['TIPO'])
                    ->where('serie', $data['SERIE'])
                    ->where('correlativo', (int) $data['NÚMERO'])
                    ->first();

                if (! $comprobante) {
                    $this->warn("Comprobante no encontrado: {$data['SERIE']}-{$data['NÚMERO']}");

                    continue;
                }

                // Calcular los valores necesarios
                $cantidad = (float) ($data['CANTIDAD'] ?: 1);
                $precioUnitario = (float) ($data['PRECIO UNITARIO'] ?: 0);
                $valorUnitario = (float) ($data['VALOR UNITARIO'] ?: 0);
                $subtotal = (float) ($data['SUBTOTAL'] ?: 0);
                $igv = (float) ($data['IGV'] ?: 0);

                ComprobanteItem::create([
                    'comprobante_id' => $comprobante->id,
                    'item' => 1, // Se podría mejorar con un counter por comprobante
                    'codigo_producto' => $data['CÓDIGO'] ?: '',
                    'descripcion' => $data['DESCRIPCIÓN'] ?: 'Sin descripción',
                    'unidad' => $data['UNIDAD DE MEDIDA'] ?: 'NIU',
                    'cantidad' => $cantidad,
                    'mto_valor_unitario' => $valorUnitario,
                    'mto_precio_unitario' => $precioUnitario,
                    'mto_valor_venta' => $subtotal,
                    'mto_base_igv' => $subtotal,
                    'igv' => $igv,
                    'tip_afe_igv' => isset($data['TIPO DE IGV']) && $data['TIPO DE IGV'] ? '10' : '20',
                    'descuento' => (float) ($data['DESCUENTO'] ?: 0),
                    'total_impuestos' => $igv,
                ]);

                $count++;

                if ($count % 50 === 0) {
                    $this->info("Procesados {$count} items...");
                }

            } catch (\Exception $e) {
                $this->error("Error procesando item {$data['DESCRIPCIÓN']}: ".$e->getMessage());

                continue;
            }
        }

        fclose($handle);

        return $count;
    }

    private function importarEntidades($file, Empresa $empresa)
    {
        $handle = fopen($file, 'r');
        $header = fgetcsv($handle, 0, ';'); // Solo para saltar la primera fila

        if (! $header) {
            $this->warn('El archivo de ENTIDADES está vacío.');
            fclose($handle);

            return 0;
        }

        $count = 0;

        while (($row = fgetcsv($handle, 0, ';')) !== false) {
            if (empty($row)) {
                continue;
            }

            // El archivo de ENTIDADES tiene un orden fijo de columnas
            $row = array_pad($row, 12, null);

            $tipoDoc = trim($row[0] ?? '');
            $numDoc = trim($row[1] ?? '');
            $denominacion = trim($row[2] ?? '');
            $razonComercial = $row[3] ?? null;
            $direccion = $row[4] ?? null;
            $email = $row[5] ?? null;
            $email2 = $row[6] ?? null;
            $email3 = $row[7] ?? null;
            $telefono = $row[8] ?? null;
            $codigoCliente = $row[9] ?? null;
            $licencia = $row[10] ?? null;
            $placa = $row[11] ?? null;

            if ($tipoDoc === '' && $numDoc === '' && $denominacion === '') {
                continue;
            }

            // Saltar filas de leyenda/cabecera que describen los tipos de documento
            // (por ejemplo: "6 = RUC", "1 = DNI", "- = VARIOS ...").
            if (strlen($tipoDoc) !== 1 || ! preg_match('/^[0-9A-Z\-]$/', $tipoDoc)) {
                continue;
            }

            try {
                Entidad::updateOrCreate(
                    [
                        'empresa_id' => $empresa->id,
                        'tipo_doc' => $tipoDoc,
                        'num_doc' => $numDoc,
                    ],
                    [
                        'denominacion' => $denominacion ?: 'Sin denominación',
                        'razon_comercial' => $razonComercial ?: null,
                        'direccion' => $direccion ?: null,
                        'email' => $email ?: null,
                        'email_2' => $email2 ?: null,
                        'email_3' => $email3 ?: null,
                        'telefono' => $telefono ?: null,
                        'codigo_cliente' => $codigoCliente ?: null,
                        'licencia_conducir' => $licencia ?: null,
                        'placa_vehiculo' => $placa ?: null,
                        'es_cliente' => true,
                        'es_proveedor' => false,
                    ]
                );

                $count++;
                if ($count % 20 === 0) {
                    $this->info("Procesadas {$count} entidades...");
                }
            } catch (\Exception $e) {
                $this->error('Error procesando entidad '.$denominacion.': '.$e->getMessage());

                continue;
            }
        }

        fclose($handle);

        return $count;
    }
}
