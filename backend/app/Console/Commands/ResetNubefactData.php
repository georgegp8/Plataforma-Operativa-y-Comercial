<?php

namespace App\Console\Commands;

use App\Models\ComprobanteItem;
use App\Models\Entidad;
use Illuminate\Console\Command;

class ResetNubefactData extends Command
{
    protected $signature = 'nubefact:reset-data {--force : Ejecutar sin confirmación interactiva}';

    protected $description = 'Limpia datos importados desde NubeFact (items y entidades) para permitir una nueva importación limpia';

    public function handle(): int
    {
        if (! $this->option('force')) {
            if (! $this->confirm('Esto eliminará TODOS los items de comprobantes y entidades importadas. ¿Deseas continuar?')) {
                $this->info('Operación cancelada.');

                return self::SUCCESS;
            }
        }

        $this->info('Eliminando items de comprobantes...');
        ComprobanteItem::truncate();

        $this->info('Eliminando entidades...');
        Entidad::truncate();

        $this->info('Datos de NubeFact limpiados correctamente. Ahora puedes reimportar los CSV.');

        return self::SUCCESS;
    }
}
