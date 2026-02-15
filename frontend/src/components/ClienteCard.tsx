import { type Dispatch, type SetStateAction } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Entidad } from '@/lib/api';
import { TIPOS_DOCUMENTO } from '@/services/nubefact';

type ComprobanteFormValues = {
  cliente_tipo_de_documento: string;
  cliente_numero_de_documento?: string;
  cliente_denominacion: string;
  cliente_direccion?: string;
  cliente_email?: string;
};

interface ClienteCardProps {
  form: UseFormReturn<ComprobanteFormValues>;
  clientes: Entidad[];
  loadingClientes: boolean;
  openClienteCombobox: boolean;
  setOpenClienteCombobox: Dispatch<SetStateAction<boolean>>;
  busquedaCliente: string;
  setBusquedaCliente: Dispatch<SetStateAction<string>>;
  seleccionarCliente: (cliente: Entidad) => void;
  total: number;
  requiereDocumento: boolean;
}

export function ClienteCard({
  form,
  clientes,
  loadingClientes,
  openClienteCombobox,
  setOpenClienteCombobox,
  busquedaCliente,
  setBusquedaCliente,
  seleccionarCliente,
  total,
  requiereDocumento,
}: ClienteCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cliente</CardTitle>
        <CardDescription>
          {requiereDocumento
            ? 'Información del receptor (obligatorio)'
            : 'Información del receptor (opcional para montos menores a S/ 700)'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Documento</label>
            <Select
              value={form.watch('cliente_tipo_de_documento')}
              onValueChange={(value) => form.setValue('cliente_tipo_de_documento', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TIPOS_DOCUMENTO.DNI}>DNI</SelectItem>
                <SelectItem value={TIPOS_DOCUMENTO.RUC}>RUC</SelectItem>
                <SelectItem value={TIPOS_DOCUMENTO.CARNET_EXTRANJERIA}>Carnet Extranjería</SelectItem>
                {!requiereDocumento && (
                  <SelectItem value={TIPOS_DOCUMENTO.SIN_DOCUMENTO}>Sin Documento</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Número de Documento{' '}
              {(requiereDocumento || total >= 700) && (
                <span className="text-destructive">*</span>
              )}
            </label>
            <Input
              {...form.register('cliente_numero_de_documento')}
              placeholder={
                form.watch('cliente_tipo_de_documento') === TIPOS_DOCUMENTO.SIN_DOCUMENTO
                  ? 'No requerido'
                  : form.watch('cliente_tipo_de_documento') === TIPOS_DOCUMENTO.RUC
                  ? '20123456789'
                  : '12345678'
              }
              disabled={form.watch('cliente_tipo_de_documento') === TIPOS_DOCUMENTO.SIN_DOCUMENTO}
            />
            {form.formState.errors.cliente_numero_de_documento && (
              <p className="text-sm text-destructive">
                {form.formState.errors.cliente_numero_de_documento.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Buscar Cliente</label>
          <Popover open={openClienteCombobox} onOpenChange={setOpenClienteCombobox}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openClienteCombobox}
                className="w-full justify-between font-normal"
              >
                {form.watch('cliente_denominacion') || 'Seleccionar cliente...'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) max-w-[min(90vw,600px)] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Buscar por RUC, DNI o nombre..."
                  value={busquedaCliente}
                  onValueChange={setBusquedaCliente}
                />
                <CommandEmpty>
                  {loadingClientes ? 'Cargando...' : 'No se encontraron clientes'}
                </CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {clientes
                    .filter((cliente) => {
                      const termino = busquedaCliente.toLowerCase();
                      const numeroDoc = cliente.num_doc || cliente.numero_documento || '';
                      const nombre =
                        cliente.denominacion ||
                        cliente.razon_social ||
                        cliente.nombre_comercial ||
                        cliente.razon_comercial ||
                        '';
                      return (
                        numeroDoc.toLowerCase().includes(termino) ||
                        nombre.toLowerCase().includes(termino)
                      );
                    })
                    .map((cliente) => (
                      <CommandItem
                        key={cliente.id}
                        value={cliente.id.toString()}
                        onSelect={() => seleccionarCliente(cliente)}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {cliente.denominacion ||
                              cliente.razon_social ||
                              cliente.nombre_comercial ||
                              cliente.razon_comercial}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {cliente.num_doc || cliente.numero_documento}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Razón Social / Nombre</label>
          <Input {...form.register('cliente_denominacion')} placeholder="Cliente Varios" />
          {form.formState.errors.cliente_denominacion && (
            <p className="text-sm text-destructive">
              {form.formState.errors.cliente_denominacion.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Dirección</label>
          <Input {...form.register('cliente_direccion')} placeholder="Av. Principal 123" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input type="email" {...form.register('cliente_email')} placeholder="cliente@example.com" />
        </div>
      </CardContent>
    </Card>
  );
}

