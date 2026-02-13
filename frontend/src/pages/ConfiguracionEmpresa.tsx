import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api, apiBaseUrl, type Empresa } from '@/lib/api';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Building2, Save, Upload, Loader2, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'nubefact_empresa_id';

export default function ConfiguracionEmpresa() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState({
    ruc: '',
    razon_social: '',
    nombre_comercial: '',
    ubigeo: '',
    departamento: '',
    provincia: '',
    distrito: '',
    direccion: '',
    telefono: '',
    email: '',
    sol_user: '',
    sol_password: '',
    client_id: '',
    client_secret: '',
    modo: 'beta' as 'beta' | 'prod',
    activo: true,
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Cargar lista de empresas
  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const res = await api.empresas.listar();
        const lista = (res.data as unknown as { data?: Empresa[] }).data ?? [];
        setEmpresas(lista);

        if (!empresaId && lista.length > 0) {
          const primera = lista[0];
          setEmpresaId(primera.id);
          localStorage.setItem(STORAGE_KEY, String(primera.id));
        }
      } catch {
        toast.error('Error al cargar empresas');
      } finally {
        setLoading(false);
      }
    };
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar datos de empresa seleccionada
  useEffect(() => {
    if (!empresaId) return;
    const cargarEmpresa = async () => {
      try {
        const res = await api.empresas.obtener(empresaId);
        const emp = (res.data as unknown as { data?: Empresa }).data ?? res.data as unknown as Empresa;
        setFormData({
          ruc: emp.ruc || '',
          razon_social: emp.razon_social || '',
          nombre_comercial: emp.nombre_comercial || '',
          ubigeo: emp.ubigeo || '',
          departamento: emp.departamento || '',
          provincia: emp.provincia || '',
          distrito: emp.distrito || '',
          direccion: emp.direccion || '',
          telefono: emp.telefono || '',
          email: emp.email || '',
          sol_user: emp.sol_user || '',
          sol_password: '',
          client_id: emp.client_id || '',
          client_secret: '',
          modo: emp.modo || 'beta',
          activo: emp.activo ?? true,
        });
        if (emp.logo_path) {
          setLogoUrl(`${apiBaseUrl}/v1/empresas/${empresaId}/logo?t=${Date.now()}`);
        } else {
          setLogoUrl(null);
        }
      } catch {
        toast.error('Error al cargar datos de empresa');
      }
    };
    void cargarEmpresa();
  }, [empresaId]);

  const handleSeleccionarEmpresa = (id: string) => {
    const numId = Number(id);
    setEmpresaId(numId);
    localStorage.setItem(STORAGE_KEY, String(numId));
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    try {
      setSaving(true);
      const dataToSend = { ...formData };
      // No enviar password vacío
      if (!dataToSend.sol_password) {
        delete (dataToSend as Record<string, unknown>).sol_password;
      }
      if (!dataToSend.client_secret) {
        delete (dataToSend as Record<string, unknown>).client_secret;
      }
      await api.empresas.actualizar(empresaId, dataToSend);
      toast.success('Empresa actualizada correctamente');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error('Error al actualizar', {
        description: err.response?.data?.message || 'Intente nuevamente',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !empresaId) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('El logo no debe superar los 2MB');
      return;
    }

    try {
      setUploadingLogo(true);
      await api.empresas.uploadLogo(empresaId, file);
      // Usar el endpoint de logo con cache-bust para forzar recarga
      setLogoUrl(`${apiBaseUrl}/v1/empresas/${empresaId}/logo?t=${Date.now()}`);
      toast.success('Logo actualizado correctamente');
    } catch {
      toast.error('Error al subir logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NubofactHeader />
        <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Cargando configuracion...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-primary text-primary-foreground rounded-t-lg px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Configuracion de Empresa
          </h1>
          {empresas.length > 1 && (
            <Select value={String(empresaId)} onValueChange={handleSeleccionarEmpresa}>
              <SelectTrigger className="w-64 bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Seleccionar empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map(emp => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.razon_social} ({emp.ruc})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <form onSubmit={handleGuardar} className="bg-white dark:bg-card border border-t-0 border-border rounded-b-lg">
          {/* Logo y Datos Principales */}
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold mb-4">Datos Principales</h3>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Logo */}
              <div className="flex flex-col items-center gap-3">
                <Label className="text-sm font-medium">Logo</Label>
                <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-12 h-12 text-muted-foreground/30" />
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploadingLogo ? 'Subiendo...' : 'Cambiar Logo'}
                </Button>
                <p className="text-xs text-muted-foreground">PNG/JPG</p>
              </div>

              {/* Campos principales */}
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>RUC *</Label>
                  <Input
                    value={formData.ruc}
                    onChange={e => updateField('ruc', e.target.value)}
                    placeholder="20123456789"
                    maxLength={11}
                  />
                </div>
                <div>
                  <Label>Razon Social *</Label>
                  <Input
                    value={formData.razon_social}
                    onChange={e => updateField('razon_social', e.target.value)}
                    placeholder="MI EMPRESA S.A.C."
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Nombre Comercial</Label>
                  <Input
                    value={formData.nombre_comercial}
                    onChange={e => updateField('nombre_comercial', e.target.value)}
                    placeholder="Nombre comercial (opcional)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Ubicacion */}
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold mb-4">Ubicacion</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Ubigeo *</Label>
                <Input
                  value={formData.ubigeo}
                  onChange={e => updateField('ubigeo', e.target.value)}
                  placeholder="150101"
                  maxLength={6}
                />
              </div>
              <div>
                <Label>Departamento *</Label>
                <Input
                  value={formData.departamento}
                  onChange={e => updateField('departamento', e.target.value)}
                  placeholder="Lima"
                />
              </div>
              <div>
                <Label>Provincia *</Label>
                <Input
                  value={formData.provincia}
                  onChange={e => updateField('provincia', e.target.value)}
                  placeholder="Lima"
                />
              </div>
              <div>
                <Label>Distrito *</Label>
                <Input
                  value={formData.distrito}
                  onChange={e => updateField('distrito', e.target.value)}
                  placeholder="Miraflores"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4">
                <Label>Direccion Fiscal *</Label>
                <Input
                  value={formData.direccion}
                  onChange={e => updateField('direccion', e.target.value)}
                  placeholder="Av. Los Pinos 456 - Miraflores"
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold mb-4">Contacto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => updateField('email', e.target.value)}
                  placeholder="ventas@empresa.com"
                />
              </div>
              <div>
                <Label>Telefono</Label>
                <Input
                  value={formData.telefono}
                  onChange={e => updateField('telefono', e.target.value)}
                  placeholder="01-1234567"
                />
              </div>
            </div>
          </div>

          {/* Credenciales SUNAT */}
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold mb-4">Credenciales SUNAT / NubeFact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Usuario SOL *</Label>
                <Input
                  value={formData.sol_user}
                  onChange={e => updateField('sol_user', e.target.value)}
                  placeholder="MODDATOS"
                />
              </div>
              <div>
                <Label>Clave SOL</Label>
                <Input
                  type="password"
                  value={formData.sol_password}
                  onChange={e => updateField('sol_password', e.target.value)}
                  placeholder="Dejar vacio para mantener actual"
                />
              </div>
              <div>
                <Label>Client ID</Label>
                <Input
                  value={formData.client_id}
                  onChange={e => updateField('client_id', e.target.value)}
                  placeholder="Client ID (opcional)"
                />
              </div>
              <div>
                <Label>Client Secret</Label>
                <Input
                  type="password"
                  value={formData.client_secret}
                  onChange={e => updateField('client_secret', e.target.value)}
                  placeholder="Dejar vacio para mantener actual"
                />
              </div>
            </div>
          </div>

          {/* Configuracion */}
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold mb-4">Configuracion</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Modo de Operacion *</Label>
                <Select value={formData.modo} onValueChange={(v) => updateField('modo', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beta">Beta (Pruebas)</SelectItem>
                    <SelectItem value="prod">Produccion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(v) => updateField('activo', v)}
                />
                <Label>Empresa Activa</Label>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="p-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (empresaId) {
                  // Recargar datos originales
                  setEmpresaId(prev => prev); // trigger useEffect
                }
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recargar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
