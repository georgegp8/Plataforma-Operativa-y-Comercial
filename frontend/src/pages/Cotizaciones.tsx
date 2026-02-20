import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { DollarSign, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Cotizaciones() {
  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />
      <div className="container mx-auto px-4 py-6 max-w-7xl">

        {/* Header */}
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <h1 className="text-xl font-semibold">Cotizaciones</h1>
          </div>
          <Badge className="bg-white/20 text-primary-foreground border-0">Próximamente</Badge>
        </div>

        {/* Contenido */}
        <div className="bg-white dark:bg-card border border-t-0 border-border rounded-b-lg">
          {/* Placeholder visual */}
          <div className="p-8 flex flex-col items-center text-center gap-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-10 w-10 text-primary/50" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold mb-2">Módulo de Cotizaciones</h2>
              <p className="text-muted-foreground max-w-md">
                Este módulo permitirá crear y gestionar cotizaciones para tus clientes,
                con conversión directa a Boletas o Facturas.
              </p>
            </div>

            {/* Funcionalidades previstas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 w-full max-w-3xl">
              <div className="border border-border rounded-lg p-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium text-sm">Crear Cotización</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Genera cotizaciones profesionales con items, precios y vigencia.
                </p>
              </div>
              <div className="border border-border rounded-lg p-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <span className="font-medium text-sm">Control de Vigencia</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Seguimiento del estado: pendiente, aceptada, rechazada o vencida.
                </p>
              </div>
              <div className="border border-border rounded-lg p-4 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-sm">Convertir a CPE</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Convierte cotizaciones aceptadas en Facturas o Boletas con un clic.
                </p>
              </div>
            </div>

            {/* Estados previstos */}
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="text-xs text-muted-foreground">Estados:</span>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                <Clock className="h-3 w-3 mr-1" />
                Pendiente
              </Badge>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Aceptada
              </Badge>
              <Badge className="bg-red-100 text-red-800 border-red-300">
                <XCircle className="h-3 w-3 mr-1" />
                Rechazada
              </Badge>
              <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                <XCircle className="h-3 w-3 mr-1" />
                Vencida
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground mt-2 border-t pt-4 w-full">
              Este módulo está en desarrollo. Próximamente disponible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
