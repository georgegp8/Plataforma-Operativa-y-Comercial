<?php

namespace App\Console\Commands;

use App\Models\Comprobante;
use App\Services\NubefactClient;
use App\Services\NubefactMapper;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class NubefactSyncCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'nubefact:sync 
                            {--empresa= : ID de empresa específica para sincronizar}
                            {--desde= : Fecha desde (Y-m-d)}
                            {--hasta= : Fecha hasta (Y-m-d)}
                            {--tipo= : Tipo de comprobante (01=Factura, 03=Boleta, 07=NC, 08=ND)}
                            {--serie= : Serie específica}
                            {--numero= : Número específico}
                            {--pendientes : Solo comprobantes pendientes de aceptación SUNAT}
                            {--force : Forzar sincronización aunque ya tenga datos de NubeFact}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sincronizar comprobantes desde NubeFact API y actualizar estado local';

    protected $nubefactClient;

    public function __construct(NubefactClient $nubefactClient)
    {
        parent::__construct();
        $this->nubefactClient = $nubefactClient;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔄 Iniciando sincronización con NubeFact...');

        // Construir query
        $query = Comprobante::query()->with(['items', 'empresa']);

        // Filtros
        if ($empresaId = $this->option('empresa')) {
            $query->where('empresa_id', $empresaId);
        }

        if ($desde = $this->option('desde')) {
            $query->whereDate('fecha_emision', '>=', $desde);
        }

        if ($hasta = $this->option('hasta')) {
            $query->whereDate('fecha_emision', '<=', $hasta);
        }

        if ($tipo = $this->option('tipo')) {
            $query->where('tipo_doc', $tipo);
        }

        if ($serie = $this->option('serie')) {
            $query->where('serie', $serie);
        }

        if ($numero = $this->option('numero')) {
            $query->where('correlativo', $numero);
        }

        // Solo pendientes
        if ($this->option('pendientes')) {
            $query->whereNested(function ($q) {
                $q->whereNull('nubefact_aceptada_por_sunat')
                    ->orWhere('nubefact_aceptada_por_sunat', false);
            });
        }

        // Si no forzamos, solo sincronizar los que ya tienen enlace NubeFact
        if (!$this->option('force')) {
            $query->whereNotNull('nubefact_enlace');
        }

        $comprobantes = $query->get();

        if ($comprobantes->isEmpty()) {
            $this->warn('⚠️  No se encontraron comprobantes para sincronizar con los filtros aplicados.');

            return 0;
        }

        $this->info("📋 Encontrados {$comprobantes->count()} comprobantes para sincronizar");

        $exitosos = 0;
        $fallidos = 0;
        $sinCambios = 0;

        $progressBar = $this->output->createProgressBar($comprobantes->count());
        $progressBar->start();

        foreach ($comprobantes as $comprobante) {
            /** @var \App\Models\Comprobante $comprobante */
            try {
                // Consultar estado en NubeFact
                $tipoInt = NubefactClient::mapearTipoComprobante($comprobante->tipo_doc);
                $response = $this->nubefactClient->consultarComprobante(
                    $tipoInt,
                    $comprobante->serie,
                    $comprobante->correlativo
                );

                // Verificar si hubo cambios
                $cambios = $this->detectarCambios($comprobante, $response);

                if ($cambios) {
                    // Actualizar modelo
                    NubefactMapper::updateComprobanteFromNubefact($comprobante, $response);
                    $comprobante->nubefact_consultado_at = now();
                    $comprobante->save();

                    $exitosos++;

                    $this->newLine();
                    $this->info("✅ {$comprobante->tipo_doc}-{$comprobante->serie}-{$comprobante->correlativo} sincronizado");
                }
                else {
                    $sinCambios++;
                }

            }
            catch (\Exception $e) {
                $fallidos++;

                Log::channel('nubefact')->error('Error sincronizando comprobante', [
                    'comprobante_id' => $comprobante->id,
                    'tipo' => $comprobante->tipo_doc,
                    'serie' => $comprobante->serie,
                    'numero' => $comprobante->correlativo,
                    'error' => $e->getMessage(),
                ]);

                $this->newLine();
                $this->error("❌ Error en {$comprobante->tipo_doc}-{$comprobante->serie}-{$comprobante->correlativo}: {$e->getMessage()}");
            }

            $progressBar->advance();
        }

        $progressBar->finish();
        $this->newLine(2);

        // Resumen
        $this->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->info('📊 Resumen de sincronización:');
        $this->info("   ✅ Exitosos: {$exitosos}");
        $this->info("   ⚠️  Sin cambios: {$sinCambios}");
        $this->info("   ❌ Fallidos: {$fallidos}");
        $this->info("   📋 Total: {$comprobantes->count()}");
        $this->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        return $fallidos > 0 ? 1 : 0;
    }

    /**
     * Detectar si hubo cambios en la respuesta de NubeFact
     */
    protected function detectarCambios($comprobante, array $response): bool
    {
        if (!($comprobante instanceof Comprobante)) {
            Log::channel('nubefact')->error('Type error in detecting changes', [
                'expected' => Comprobante::class ,
                'actual_type' => get_debug_type($comprobante),
                'value' => $comprobante,
            ]);

            return false;
        }

        // Si es primera consulta
        if (!$comprobante->nubefact_consultado_at) {
            return true;
        }

        // Verificar cambios relevantes
        $cambios = [
            $comprobante->nubefact_aceptada_por_sunat != ($response['aceptada_por_sunat'] ?? false),
            $comprobante->nubefact_pdf_url != ($response['enlace_del_pdf'] ?? null),
            $comprobante->codigo_sunat != ($response['sunat_responsecode'] ?? null),
        ];

        return in_array(true, $cambios, true);
    }
}
