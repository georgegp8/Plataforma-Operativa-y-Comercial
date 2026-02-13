import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { apiBaseUrl } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Building2, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import type { Empresa } from '@/types';

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const { toast } = useToast();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo] = useState(false);
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

  const fetchEmpresas = async () => {
    try {
      const response = await api.empresas.listar();
      setEmpresas(response.data.data);
    } catch {
      toast({
        title: "Error",
        description: "No se pudo cargar la lista de empresas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEmpresa) {
        await api.empresas.actualizar(editingEmpresa.id, formData);
        toast({
          title: "Éxito",
          description: "Empresa actualizada correctamente",
        });
      } else {
        await api.empresas.crear(formData);
        toast({
          title: "Éxito",
          description: "Empresa creada correctamente",
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      fetchEmpresas();
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      toast({
        title: "Error",
        description: errorMessage || "No se pudo guardar la empresa",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (empresa: Empresa) => {
    setLogoFile(null);
    setEditingEmpresa(empresa);
    setFormData({
      ruc: empresa.ruc,
      razon_social: empresa.razon_social,
      nombre_comercial: empresa.nombre_comercial || '',
      ubigeo: empresa.ubigeo || '',
      departamento: empresa.departamento || '',
      provincia: empresa.provincia || '',
      distrito: empresa.distrito || '',
      direccion: empresa.direccion,
      telefono: empresa.telefono || '',
      email: empresa.email || '',
      sol_user: empresa.sol_user,
      sol_password: '',
      client_id: empresa.client_id || '',
      client_secret: '',
      modo: empresa.modo || 'beta',
      activo: empresa.activo !== false,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Está seguro de eliminar esta empresa?')) return;
    
    try {
      await api.empresas.eliminar(id);
      toast({
        title: "Éxito",
        description: "Empresa eliminada correctamente",
      });
      fetchEmpresas();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo eliminar la empresa",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
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
      modo: 'beta',
      activo: true,
    });
    setEditingEmpresa(null);
  };

  const filteredEmpresas = empresas.filter(empresa =>
    empresa.ruc.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.razon_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
    empresa.nombre_comercial?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columnCount = 5;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleLogoChange(_event: ChangeEvent<HTMLInputElement>): void {
    throw new Error('Function not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleLogoUpload(_event: React.MouseEvent<HTMLButtonElement>): void {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
      <PageHeader
        title="Empresas"
        description="Gestiona las empresas emisoras de comprobantes electrónicos"
        actions={
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Empresa
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEmpresa ? 'Editar Empresa' : 'Nueva Empresa'}
              </DialogTitle>
              <DialogDescription>
                Complete los datos de la empresa emisora
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ruc">RUC *</Label>
                  <Input
                    id="ruc"
                    value={formData.ruc}
                    onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                    placeholder="20123456789"
                    maxLength={11}
                    required
                    disabled={!!editingEmpresa}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="razon_social">Razón Social *</Label>
                  <Input
                    id="razon_social"
                    value={formData.razon_social}
                    onChange={(e) => setFormData({ ...formData, razon_social: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="nombre_comercial">Nombre Comercial</Label>
                  <Input
                    id="nombre_comercial"
                    value={formData.nombre_comercial}
                    onChange={(e) => setFormData({ ...formData, nombre_comercial: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="border-t pt-4">
                                {editingEmpresa && (
                                  <div className="border-b pb-4 mb-4">
                                    <h3 className="font-semibold mb-2">Logo de la Empresa</h3>
                                    <div className="flex items-center gap-4">
                                      {/* Vista previa del logo actual si existe */}
                                      {editingEmpresa.logo_path && (
                                        <img
                                          src={editingEmpresa.logo_path.startsWith('http') ? editingEmpresa.logo_path : `${apiBaseUrl}${editingEmpresa.logo_path}`}
                                          alt="Logo actual"
                                          className="w-20 h-20 object-contain border rounded bg-white"
                                          style={{ maxWidth: 80, maxHeight: 80 }}
                                        />
                                      )}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        ref={logoInputRef}
                                        onChange={handleLogoChange}
                                        className="block"
                                        disabled={uploadingLogo}
                                      />
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleLogoUpload}
                                        disabled={!logoFile || uploadingLogo}
                                      >
                                        {uploadingLogo ? 'Subiendo...' : 'Subir Logo'}
                                      </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Solo imágenes. Tamaño recomendado: 300x300px.</p>
                                  </div>
                                )}
                <h3 className="font-semibold mb-3">Ubicación</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ubigeo">Ubigeo *</Label>
                    <Input
                      id="ubigeo"
                      value={formData.ubigeo}
                      onChange={(e) => setFormData({ ...formData, ubigeo: e.target.value })}
                      placeholder="150101"
                      maxLength={6}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="departamento">Departamento *</Label>
                    <Input
                      id="departamento"
                      value={formData.departamento}
                      onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                      placeholder="Lima"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="provincia">Provincia *</Label>
                    <Input
                      id="provincia"
                      value={formData.provincia}
                      onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                      placeholder="Lima"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="distrito">Distrito *</Label>
                    <Input
                      id="distrito"
                      value={formData.distrito}
                      onChange={(e) => setFormData({ ...formData, distrito: e.target.value })}
                      placeholder="Miraflores"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="direccion">Dirección Fiscal *</Label>
                    <Input
                      id="direccion"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="+51 1 234 5678"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contacto@empresa.com"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Credenciales SUNAT (SOL)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sol_user">Usuario SOL *</Label>
                    <Input
                      id="sol_user"
                      value={formData.sol_user}
                      onChange={(e) => setFormData({ ...formData, sol_user: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sol_password">
                      Contraseña SOL {editingEmpresa && '(dejar vacío para mantener)'}
                    </Label>
                    <Input
                      id="sol_password"
                      type="password"
                      value={formData.sol_password}
                      onChange={(e) => setFormData({ ...formData, sol_password: e.target.value })}
                      required={!editingEmpresa}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="client_id">Client ID (API)</Label>
                    <Input
                      id="client_id"
                      value={formData.client_id}
                      onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="client_secret">
                      Client Secret {editingEmpresa && '(dejar vacío para mantener)'}
                    </Label>
                    <Input
                      id="client_secret"
                      type="password"
                      value={formData.client_secret}
                      onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Configuración</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modo">Modo de Operación *</Label>
                    <Select
                      value={formData.modo}
                      onValueChange={(value: 'beta' | 'prod') => setFormData({ ...formData, modo: value })}
                    >
                      <SelectTrigger id="modo">
                        <SelectValue placeholder="Seleccionar modo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beta">Beta / Pruebas</SelectItem>
                        <SelectItem value="prod">Producción</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Beta usa servidores de prueba de SUNAT
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2 pt-6">
                    <Label htmlFor="activo" className="cursor-pointer">
                      Empresa Activa
                    </Label>
                    <Switch
                      id="activo"
                      checked={formData.activo}
                      onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingEmpresa ? 'Actualizar' : 'Crear'} Empresa
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Lista de Empresas</CardTitle>
              <CardDescription>
                {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} registrada{empresas.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                placeholder="Buscar empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                aria-label="Buscar empresa por RUC, razón social o nombre comercial"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="overflow-x-auto">
              <TableSkeleton columns={columnCount} rows={6} />
            </div>
          ) : filteredEmpresas.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No se encontraron empresas"
              description={searchTerm ? 'Prueba con otro criterio de búsqueda.' : 'Registra tu primera empresa emisora con el botón Nueva Empresa.'}
              action={searchTerm ? (
                <Button variant="link" onClick={() => setSearchTerm('')}>
                  Limpiar búsqueda
                </Button>
              ) : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-b-2">
                    <TableHead className="min-w-32 py-2 px-2">RUC</TableHead>
                    <TableHead className="min-w-48 py-2 px-2">Razón Social</TableHead>
                    <TableHead className="min-w-40 py-2 px-2 hidden md:table-cell">Nombre Comercial</TableHead>
                    <TableHead className="min-w-32 py-2 px-2 hidden lg:table-cell">Usuario SOL</TableHead>
                    <TableHead className="w-24 text-center py-2 px-2">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmpresas.map((empresa) => (
                    <TableRow key={empresa.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="py-2 px-2 font-mono text-sm flex items-center gap-2">
                        {empresa.logo_path && (
                          <img
                            src={empresa.logo_path.startsWith('http') ? empresa.logo_path : `${apiBaseUrl}${empresa.logo_path}`}
                            alt="Logo"
                            className="w-8 h-8 object-contain border rounded bg-white"
                          />
                        )}
                        {empresa.ruc}
                      </TableCell>
                      <TableCell className="py-2 px-2 text-sm">{empresa.razon_social}</TableCell>
                      <TableCell className="py-2 px-2 hidden md:table-cell text-sm text-muted-foreground">
                        {empresa.nombre_comercial || '-'}
                      </TableCell>
                      <TableCell className="py-2 px-2 hidden lg:table-cell font-mono text-sm">
                        {empresa.sol_user}
                      </TableCell>
                      <TableCell className="py-2 px-2">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(empresa)}
                            aria-label="Editar empresa"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(empresa.id)}
                            aria-label="Eliminar empresa"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
