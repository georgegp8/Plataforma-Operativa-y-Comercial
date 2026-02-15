import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { RefreshCw, Download, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

interface EstadoConexion {
  success: boolean;
  mensaje: string;
  configuracion?: {
    base_url: string;
    modo: string;
    auto_sunat: boolean;
  };
}

interface Estadisticas {
  total: number;
  con_enlace_nubefact: number;
  aceptados_sunat: number;
  nunca_consultados: number;
  desactualizados: number;
  ultima_sincronizacion: string | null;
}

interface ResultadoSync {
  success: boolean;
  mensaje: string;
  total?: number;
  exitosos?: number;
  creados?: number;
  errores?: number;
  comprobante?: unknown;
}

interface ResultadoConsulta {
  success: boolean;
  mensaje?: string;
  data?: {
    cliente_denominacion: string;
    total: string;
    aceptada_por_sunat: boolean;
    sunat_description: string;
    pagado: string;
    pdf_url?: string;
  };
}

/**
 * Componente para sincronizar datos directamente desde NubeFact
 * Sin necesidad de cargar archivos Excel
 */
export default function SincronizacionNubefact() {
  const [loading, setLoading] = useState(false);
  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion | null>(null);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [resultadoSync, setResultadoSync] = useState<ResultadoSync | null>(null);

  // Estado para formulario de comprobante individual
  const [formIndividual, setFormIndividual] = useState({
    tipo_doc: '01',
    serie: 'F010',
    numero: '',
    empresa_id: 1,
  });

  // Estado para formulario de rango
  const [formRango, setFormRango] = useState({
    tipo_doc: '01',
    serie: 'F010',
    numero_inicio: '',
    numero_fin: '',
    empresa_id: 1,
  });

  // Estado para consulta directa
  const [formConsulta, setFormConsulta] = useState({
    tipo_doc: '01',
    serie: 'F010',
    numero: '',
  });
  const [resultadoConsulta, setResultadoConsulta] = useState<ResultadoConsulta | null>(null);

  /**
   * Verificar estado de conexión con NubeFact
   */
  const verificarEstado = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/nubefact-sync/estado`);
      const data = await response.json();
      setEstadoConexion(data);
      
      if (data.success) {
        toast.success('Conexión con NubeFact establecida correctamente');
      } else {
        toast.error('Error de conexión: ' + data.mensaje);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al verificar conexión: ' + errorMsg);
      setEstadoConexion({ success: false, mensaje: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtener estadísticas de sincronización
   */
  const obtenerEstadisticas = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/nubefact-sync/estadisticas`);
      const data = await response.json();
      setEstadisticas(data.estadisticas);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al obtener estadísticas: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sincronizar comprobante individual
   */
  const sincronizarIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResultadoSync(null);

    try {
      const response = await fetch(`${API_BASE}/nubefact-sync/comprobante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formIndividual),
      });

      const data = await response.json();
      setResultadoSync(data);

      if (data.success) {
        toast.success(data.mensaje);
        obtenerEstadisticas(); // Actualizar estadísticas
      } else {
        toast.error(data.mensaje);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al sincronizar: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sincronizar rango de comprobantes
   */
  const sincronizarRango = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResultadoSync(null);

    try {
      const response = await fetch(`${API_BASE}/nubefact-sync/rango`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formRango),
      });

      const data = await response.json();
      setResultadoSync(data);

      if (data.total > 0) {
        toast.success(`Sincronización completa: ${data.exitosos} de ${data.total} comprobantes`);
        obtenerEstadisticas();
      } else {
        toast.error('No se sincronizaron comprobantes');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al sincronizar: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sincronizar comprobantes pendientes
   */
  const sincronizarPendientes = async () => {
    setLoading(true);
    setResultadoSync(null);

    try {
      const response = await fetch(`${API_BASE}/nubefact-sync/pendientes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solo_pendientes: true,
          limite: 50,
        }),
      });

      const data = await response.json();
      setResultadoSync(data);

      toast.success(`${data.exitosos} comprobantes actualizados`);
      obtenerEstadisticas();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Consultar comprobante directo (sin guardar)
   */
  const consultarDirecto = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResultadoConsulta(null);

    try {
      const { tipo_doc, serie, numero } = formConsulta;
      const response = await fetch(
        `${API_BASE}/nubefact-sync/consultar/${tipo_doc}/${serie}/${numero}`
      );

      const data = await response.json();
      setResultadoConsulta(data);

      if (data.success) {
        toast.success('Comprobante consultado exitosamente');
      } else {
        toast.error(data.mensaje);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      toast.error('Error al consultar: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Cargar estado y estadísticas al montar
  React.useEffect(() => {
    verificarEstado();
    obtenerEstadisticas();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sincronización Directa con NubeFact</h1>
        <p className="text-muted-foreground mt-2">
          Obtén información directamente desde NubeFact sin necesidad de cargar archivos Excel
        </p>
      </div>

      {/* Estado de Conexión y Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {estadoConexion?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Estado de Conexión
            </CardTitle>
          </CardHeader>
          <CardContent>
            {estadoConexion ? (
              <div className="space-y-2">
                <Badge variant={estadoConexion.success ? 'default' : 'destructive'}>
                  {estadoConexion.success ? 'Conectado' : 'Desconectado'}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {estadoConexion.mensaje}
                </p>
                {estadoConexion.configuracion && (
                  <div className="text-xs mt-2 space-y-1">
                    <div>Modo: <Badge variant="outline">{estadoConexion.configuracion.modo}</Badge></div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Verificando...</p>
            )}
            <Button onClick={verificarEstado} className="mt-4" variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estadísticas</CardTitle>
          </CardHeader>
          <CardContent>
            {estadisticas ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold">{estadisticas.total}</p>
                  <p className="text-xs text-muted-foreground">Total comprobantes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{estadisticas.aceptados_sunat}</p>
                  <p className="text-xs text-muted-foreground">Aceptados SUNAT</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{estadisticas.con_enlace_nubefact}</p>
                  <p className="text-xs text-muted-foreground">Con enlace NubeFact</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{estadisticas.desactualizados}</p>
                  <p className="text-xs text-muted-foreground">Desactualizados (24h)</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            )}
            <Button onClick={obtenerEstadisticas} className="mt-4" variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para diferentes tipos de sincronización */}
      <Tabs defaultValue="individual" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="rango">Rango</TabsTrigger>
          <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
          <TabsTrigger value="consultar">Consultar</TabsTrigger>
        </TabsList>

        {/* Sincronizar Individual */}
        <TabsContent value="individual">
          <Card>
            <CardHeader>
              <CardTitle>Sincronizar Comprobante Individual</CardTitle>
              <CardDescription>
                Sincroniza un comprobante específico desde NubeFact a tu base de datos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={sincronizarIndividual} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="tipo_doc">Tipo</Label>
                    <select
                      id="tipo_doc"
                      className="w-full p-2 border rounded"
                      value={formIndividual.tipo_doc}
                      onChange={(e) => setFormIndividual({ ...formIndividual, tipo_doc: e.target.value })}
                    >
                      <option value="01">Factura</option>
                      <option value="03">Boleta</option>
                      <option value="07">N. Crédito</option>
                      <option value="08">N. Débito</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="serie">Serie</Label>
                    <Input
                      id="serie"
                      list="series-suggestions"
                      value={formIndividual.serie}
                      onChange={(e) => setFormIndividual({ ...formIndividual, serie: e.target.value.toUpperCase() })}
                      placeholder="Ej: F010, F001, B001"
                      maxLength={4}
                      className="font-mono uppercase"
                    />
                    <datalist id="series-suggestions">
                      <option value="F010">F010 - Factura</option>
                      <option value="F001">F001 - Factura Antigua</option>
                      <option value="B001">B001 - Boleta</option>
                      <option value="FC01">FC01 - N. Crédito</option>
                      <option value="FD01">FD01 - N. Débito</option>
                    </datalist>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ingrese la serie exacta que tiene en NubeFact
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      type="number"
                      value={formIndividual.numero}
                      onChange={(e) => setFormIndividual({ ...formIndividual, numero: e.target.value })}
                      placeholder="21"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Sincronizar
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sincronizar Rango */}
        <TabsContent value="rango">
          <Card>
            <CardHeader>
              <CardTitle>Sincronizar Rango de Comprobantes</CardTitle>
              <CardDescription>
                Sincroniza múltiples comprobantes de una misma serie (máximo 100)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={sincronizarRango} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipo_doc_rango">Tipo</Label>
                    <select
                      id="tipo_doc_rango"
                      className="w-full p-2 border rounded"
                      value={formRango.tipo_doc}
                      onChange={(e) => setFormRango({ ...formRango, tipo_doc: e.target.value })}
                    >
                      <option value="01">Factura</option>
                      <option value="03">Boleta</option>
                      <option value="07">N. Crédito</option>
                      <option value="08">N. Débito</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="serie_rango">Serie</Label>
                    <Input
                      id="serie_rango"
                      list="series-suggestions"
                      value={formRango.serie}
                      onChange={(e) => setFormRango({ ...formRango, serie: e.target.value.toUpperCase() })}
                      placeholder="Ej: F010, F001, B001"
                      maxLength={4}
                      className="font-mono uppercase"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ingrese la serie exacta que tiene en NubeFact
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="numero_inicio">Número Inicio</Label>
                    <Input
                      id="numero_inicio"
                      type="number"
                      value={formRango.numero_inicio}
                      onChange={(e) => setFormRango({ ...formRango, numero_inicio: e.target.value })}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="numero_fin">Número Fin</Label>
                    <Input
                      id="numero_fin"
                      type="number"
                      value={formRango.numero_fin}
                      onChange={(e) => setFormRango({ ...formRango, numero_fin: e.target.value })}
                      placeholder="50"
                    />
                  </div>
                </div>
                <Alert>
                  <AlertDescription>
                    Se procesarán {formRango.numero_inicio && formRango.numero_fin 
                      ? parseInt(formRango.numero_fin) - parseInt(formRango.numero_inicio) + 1 
                      : 0} comprobantes
                  </AlertDescription>
                </Alert>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Sincronizar Rango
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sincronizar Pendientes */}
        <TabsContent value="pendientes">
          <Card>
            <CardHeader>
              <CardTitle>Sincronizar Comprobantes Pendientes</CardTitle>
              <CardDescription>
                Actualiza automáticamente los comprobantes que no han sido consultados recientemente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {estadisticas && (
                <Alert>
                  <AlertDescription>
                    Hay <strong>{estadisticas.desactualizados}</strong> comprobantes sin consultar en las últimas 24 horas
                  </AlertDescription>
                </Alert>
              )}
              <Button onClick={sincronizarPendientes} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sincronizar Pendientes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Consultar Directo */}
        <TabsContent value="consultar">
          <Card>
            <CardHeader>
              <CardTitle>Consultar Comprobante Directamente</CardTitle>
              <CardDescription>
                Consulta información en NubeFact sin guardarla en la base de datos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={consultarDirecto} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="tipo_doc_consulta">Tipo</Label>
                    <select
                      id="tipo_doc_consulta"
                      className="w-full p-2 border rounded"
                      value={formConsulta.tipo_doc}
                      onChange={(e) => setFormConsulta({ ...formConsulta, tipo_doc: e.target.value })}
                    >
                      <option value="01">Factura</option>
                      <option value="03">Boleta</option>
                      <option value="07">N. Crédito</option>
                      <option value="08">N. Débito</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="serie_consulta">Serie</Label>
                    <Input
                      id="serie_consulta"
                      list="series-suggestions"
                      value={formConsulta.serie}
                      onChange={(e) => setFormConsulta({ ...formConsulta, serie: e.target.value.toUpperCase() })}
                      placeholder="Ej: F010, F001"
                      maxLength={4}
                      className="font-mono uppercase"
                    />
                  </div>
                  <div>
                    <Label htmlFor="numero_consulta">Número</Label>
                    <Input
                      id="numero_consulta"
                      type="number"
                      value={formConsulta.numero}
                      onChange={(e) => setFormConsulta({ ...formConsulta, numero: e.target.value })}
                      placeholder="21"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Consultando...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Consultar
                    </>
                  )}
                </Button>
              </form>

              {resultadoConsulta && resultadoConsulta.success && resultadoConsulta.data && (
                <div className="mt-4 p-4 bg-gray-50 rounded space-y-2">
                  <h3 className="font-semibold">Resultado:</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Cliente:</strong> {resultadoConsulta.data?.cliente_denominacion}
                    </div>
                    <div>
                      <strong>Total:</strong> S/ {resultadoConsulta.data?.total}
                    </div>
                    <div>
                      <strong>Estado SUNAT:</strong>{' '}
                      <Badge variant={resultadoConsulta.data?.aceptada_por_sunat ? 'default' : 'destructive'}>
                        {resultadoConsulta.data?.sunat_description}
                      </Badge>
                    </div>
                    <div>
                      <strong>Pagado:</strong> {resultadoConsulta.data?.pagado}
                    </div>
                  </div>
                  {resultadoConsulta.data?.pdf_url && (
                    <Button variant="outline" size="sm" asChild className="mt-2">
                      <a href={resultadoConsulta.data?.pdf_url} target="_blank" rel="noopener noreferrer">
                        Ver PDF
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resultados de Sincronización */}
      {resultadoSync && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado de Sincronización</CardTitle>
          </CardHeader>
          <CardContent>
            {resultadoSync.total !== undefined ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{resultadoSync.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{resultadoSync.exitosos}</p>
                    <p className="text-xs text-muted-foreground">Exitosos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{resultadoSync.creados || 0}</p>
                    <p className="text-xs text-muted-foreground">Creados</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{resultadoSync.errores}</p>
                    <p className="text-xs text-muted-foreground">Errores</p>
                  </div>
                </div>
              </div>
            ) : (
              <Alert variant={resultadoSync.success ? 'default' : 'destructive'}>
                <AlertDescription>{resultadoSync.mensaje}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
