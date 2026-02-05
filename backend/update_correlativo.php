<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Serie;

$serie = Serie::where('serie', 'F001')->first();
if ($serie) {
    $serie->correlativo_actual = 100;
    $serie->save();
    echo "Correlativo de F001 actualizado a 100\n";
} else {
    echo "Serie F001 no encontrada\n";
}
