import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mic, FileText, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';

interface ConversacionVoice {
  id: number;
  usuario_id: number;
  usuario?: { name: string };
  entidad?: { razon_social: string };
  comprobante?: { serie: string; correlativo: string; mto_imp_venta: number; nubefact_pdf_url: string };
  estado: string;
  tipo_comprobante_sugerido: string;
  tiempo_procesamiento_ms: number;
  created_at: string;
  mensajes?: Array<{ rol: string; texto: string }>;
}

export default function VoiceIADashboard() {
  const [conversaciones, setConversaciones] = useState<ConversacionVoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistorial = async () => {
    setLoading(true);
    try {
      const res = await api.get('/v1/voice/conversaciones');
      if (res.data.success) {
        setConversaciones(res.data.data.data || []);
      }
    } catch (error: any) {
      toast.error('Error al cargar historial de voz: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistorial();
  }, []);

  const totalComandos = conversaciones.length;
  const completadas = conversaciones.filter((c) => c.estado === 'completada').length;
  const promedioTiempo = totalComandos
    ? Math.round(conversaciones.reduce((acc, c) => acc + (c.tiempo_procesamiento_ms || 0), 0) / totalComandos)
    : 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mic className="h-6 w-6 text-indigo-600" /> Historial de Operaciones Voice IA
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Registro auditable de todas las emisiones y consultas realizadas mediante comandos de voz.
          </p>
        </div>
        <Button variant="outline" onClick={fetchHistorial} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-indigo-600 tracking-wider">
              Total Comandos Procesados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-indigo-950">{totalComandos}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">
              Facturas / Boletas Emitidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-950">{completadas}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-blue-600 tracking-wider">
              Tiempo Promedio Respuesta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-950">{promedioTiempo} ms</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Historial */}
      <Card className="shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-base font-bold text-slate-800">Sesiones Conversacionales de Voz</CardTitle>
          <CardDescription className="text-xs">
            Lista de comandos de voz procesados, intenciones detectadas y comprobantes generados.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-100/60">
              <TableRow>
                <TableHead>Fecha / Hora</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Comando Transcrito</TableHead>
                <TableHead>Cliente Reconocido</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Comprobante / Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Cargando historial de operaciones de voz...
                  </TableCell>
                </TableRow>
              ) : conversaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No se han registrado operaciones de voz todavía.
                  </TableCell>
                </TableRow>
              ) : (
                conversaciones.map((conv) => {
                  const primerMensajeUser = conv.mensajes?.find((m) => m.rol === 'user')?.texto || 'Comando de voz';
                  return (
                    <TableRow key={conv.id}>
                      <TableCell className="text-xs font-medium text-slate-600">
                        {new Date(conv.created_at).toLocaleString('es-PE')}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-800">
                        {conv.usuario?.name || 'Administrador'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 max-w-xs truncate" title={primerMensajeUser}>
                        "{primerMensajeUser}"
                      </TableCell>
                      <TableCell className="text-xs text-slate-800">
                        {conv.entidad?.razon_social || 'Cliente General'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            conv.estado === 'completada'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : conv.estado === 'esperando_confirmacion'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-50 text-slate-600'
                          }
                        >
                          {conv.estado.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {conv.comprobante ? (
                          <div className="flex justify-end items-center gap-2">
                            <span className="text-xs font-bold text-indigo-700">
                              {conv.comprobante.serie}-{conv.comprobante.correlativo}
                            </span>
                            {conv.comprobante.nubefact_pdf_url && (
                              <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0">
                                <a
                                  href={conv.comprobante.nubefact_pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Descargar PDF"
                                >
                                  <FileText className="h-4 w-4 text-rose-600" />
                                </a>
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin emisión</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
