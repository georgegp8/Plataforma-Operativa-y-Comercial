<?php

namespace App\Services;

use App\Models\Alerta;
use App\Models\Oportunidad;
use App\Models\SlaConfiguracion;
use Carbon\Carbon;

class SlaService
{
    /**
     * Calcular SLA para una oportunidad
     */
    public function calcularSla(Oportunidad $oportunidad): array
    {
        $sla = SlaConfiguracion::where('nombre', $oportunidad->area)
            ->where('activo', true)
            ->first();

        if (! $sla) {
            return [
                'tiene_sla' => false,
                'dias_limite' => null,
                'fecha_limite' => null,
                'dias_transcurridos' => null,
                'dias_restantes' => null,
                'estado' => null,
                'color' => null,
            ];
        }

        $fechaInicio = Carbon::parse($oportunidad->fecha_inicio);
        $fechaLimite = $fechaInicio->copy()->addDays($sla->dias_limite);
        $ahora = Carbon::now();

        $diasTranscurridos = $fechaInicio->diffInDays($ahora);
        $diasRestantes = $ahora->diffInDays($fechaLimite, false);

        // Determinar estado
        $estado = 'en_plazo';
        $color = '#10B981'; // Verde

        if ($diasRestantes < 0) {
            $estado = 'vencido';
            $color = '#EF4444'; // Rojo
        } elseif ($diasRestantes <= 3) {
            $estado = 'proximo_vencer';
            $color = '#F59E0B'; // Amarillo
        }

        return [
            'tiene_sla' => true,
            'dias_limite' => $sla->dias_limite,
            'fecha_limite' => $fechaLimite->toDateString(),
            'dias_transcurridos' => $diasTranscurridos,
            'dias_restantes' => $diasRestantes,
            'estado' => $estado,
            'color' => $color,
            'color_alerta' => $sla->color_alerta,
        ];
    }

    /**
     * Verificar y crear alertas automáticas
     */
    public function verificarAlertas(): int
    {
        $oportunidades = Oportunidad::whereNotIn('estado', ['ganado', 'perdido', 'cancelado'])
            ->get();

        $alertasCreadas = 0;

        foreach ($oportunidades as $oportunidad) {
            $slaInfo = $this->calcularSla($oportunidad);

            if (! $slaInfo['tiene_sla']) {
                continue;
            }

            // Crear alerta si está próximo a vencer o vencido
            if (in_array($slaInfo['estado'], ['proximo_vencer', 'vencido'])) {
                $alertaExistente = Alerta::where('oportunidad_id', $oportunidad->id)
                    ->where('tipo', 'sla')
                    ->where('leido', false)
                    ->first();

                if (! $alertaExistente) {
                    $mensaje = $slaInfo['estado'] === 'vencido'
                        ? "SLA vencido para oportunidad {$oportunidad->cliente_nombre}"
                        : "SLA próximo a vencer ({$slaInfo['dias_restantes']} días) para {$oportunidad->cliente_nombre}";

                    Alerta::create([
                        'oportunidad_id' => $oportunidad->id,
                        'tipo' => 'sla',
                        'prioridad' => $slaInfo['estado'] === 'vencido' ? 'alta' : 'media',
                        'titulo' => 'Alerta SLA',
                        'mensaje' => $mensaje,
                        'leido' => false,
                    ]);

                    $alertasCreadas++;
                }
            }
        }

        return $alertasCreadas;
    }

    /**
     * Obtener resumen de SLAs
     */
    public function resumenSlas(): array
    {
        $oportunidades = Oportunidad::whereNotIn('estado', ['ganado', 'perdido', 'cancelado'])
            ->get();

        $enPlazo = 0;
        $proximoVencer = 0;
        $vencidos = 0;

        foreach ($oportunidades as $oportunidad) {
            $slaInfo = $this->calcularSla($oportunidad);

            if (! $slaInfo['tiene_sla']) {
                continue;
            }

            switch ($slaInfo['estado']) {
                case 'en_plazo':
                    $enPlazo++;
                    break;
                case 'proximo_vencer':
                    $proximoVencer++;
                    break;
                case 'vencido':
                    $vencidos++;
                    break;
            }
        }

        return [
            'total' => $enPlazo + $proximoVencer + $vencidos,
            'en_plazo' => $enPlazo,
            'proximo_vencer' => $proximoVencer,
            'vencidos' => $vencidos,
        ];
    }
}
