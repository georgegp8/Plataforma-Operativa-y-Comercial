import { useState, useEffect, useRef } from 'react';
import { Upload, FileText, CheckCircle, Eye, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { NubofactHeader } from '@/components/layout/NubofactHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { DocumentoDigitalizado } from '@/types';

interface InvoiceItem {
  numero?: number;
  codigo?: string;
  descripcion: string;
  unidad_medida?: string;
  cantidad: number;
  precio_unitario: number;
  valor_unitario?: number;
  importe: number;
}

export default function DigitalizacionDocumentos() {
  const [documentos, setDocumentos] = useState<DocumentoDigitalizado[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Filtros
  const [tipoOperacion, setTipoOperacion] = useState<string>('all');
  const [estadoProcesamiento, setEstadoProcesamiento] = useState<string>('all');
  const [requiereValidacion, setRequiereValidacion] = useState<string>('all');
  
  // Upload
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoOperacionUpload, setTipoOperacionUpload] = useState<'compra' | 'venta'>('compra');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edición/Visualización
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedDocumento, setSelectedDocumento] = useState<DocumentoDigitalizado | null>(null);
  const [editMode, setEditMode] = useState(false);
  
  // Confirmación de eliminación
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [documentoToDelete, setDocumentoToDelete] = useState<DocumentoDigitalizado | null>(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const fetchDocumentos = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (tipoOperacion && tipoOperacion !== 'all') params.tipo_operacion = tipoOperacion;
      if (estadoProcesamiento && estadoProcesamiento !== 'all') params.estado_procesamiento = estadoProcesamiento;
      if (requiereValidacion && requiereValidacion !== 'all') params.requiere_validacion = requiereValidacion;
      
      const response = await api.documentosDigitalizados.listar(params);
      setDocumentos(response.data || []);
    } catch (error) {
      console.error('Error al cargar documentos:', error);
      toast.error('Error al cargar la lista de documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoOperacion, estadoProcesamiento, requiereValidacion]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tamaño (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El archivo no debe superar los 10MB');
        return;
      }
      
      // Validar tipo
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        toast.error('Solo se permiten archivos PDF, JPG o PNG');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Debe seleccionar un archivo');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('archivo', selectedFile);
      formData.append('tipo_operacion', tipoOperacionUpload);

      const response = await api.documentosDigitalizados.subir(formData);
      
      if (response.data.success) {
        toast.success(response.data.message || 'Documento subido exitosamente');
        setShowUploadDialog(false);
        setSelectedFile(null);
        setTipoOperacionUpload('compra');
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchDocumentos();
      } else {
        toast.error(response.data.message || 'Error al subir documento');
      }
    } catch (error: unknown) {
      console.error('Error al subir documento:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as {response?: {data?: {message?: string}}}).response?.data?.message
        : undefined;
      toast.error(errorMessage || 'Error al subir el documento');
    } finally {
      setUploading(false);
    }
  };

  const handleView = (documento: DocumentoDigitalizado) => {
    setSelectedDocumento(documento);
    setEditMode(false);
    setShowDetailDialog(true);
  };

  const handleEdit = (documento: DocumentoDigitalizado) => {
    setSelectedDocumento(documento);
    setEditMode(true);
    setShowDetailDialog(true);
  };

  const handleValidar = async (documento: DocumentoDigitalizado) => {
    try {
      const response = await api.documentosDigitalizados.validar(documento.id);
      if (response.data.success) {
        toast.success('Documento validado exitosamente');
        fetchDocumentos();
      }
    } catch (error) {
      console.error('Error al validar documento:', error);
      toast.error('Error al validar documento');
    }
  };

  const handleConvertirACompra = async (documento: DocumentoDigitalizado) => {
    if (documento.tipo_operacion !== 'compra') {
      toast.error('Solo se pueden convertir documentos de tipo compra');
      return;
    }
    
    if (!documento.validado) {
      toast.error('El documento debe estar validado antes de convertirlo');
      return;
    }

    try {
      const response = await api.documentosDigitalizados.convertirACompra(documento.id);
      if (response.data.success) {
        toast.success('Compra creada exitosamente desde el documento');
        fetchDocumentos();
      }
    } catch (error: unknown) {
      console.error('Error al crear compra:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as {response?: {data?: {message?: string}}}).response?.data?.message
        : undefined;
      toast.error(errorMessage || 'Error al crear compra');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!documentoToDelete) return;

    try {
      await api.documentosDigitalizados.eliminar(documentoToDelete.id);
      toast.success('Documento eliminado exitosamente');
      setShowDeleteDialog(false);
      setDocumentoToDelete(null);
      fetchDocumentos();
    } catch (error) {
      console.error('Error al eliminar documento:', error);
      toast.error('Error al eliminar documento');
    }
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pendiente: { variant: "secondary", label: "Pendiente" },
      procesando: { variant: "outline", label: "Procesando..." },
      completado: { variant: "default", label: "Completado" },
      error: { variant: "destructive", label: "Error" },
    };
    const config = variants[estado] || variants.pendiente;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDocumentos = documentos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(documentos.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-background">
      <NubofactHeader />
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Digitalización de Documentos</h1>
            <p className="text-muted-foreground">Sube facturas y extrae datos automáticamente con OCR</p>
          </div>
          <Button onClick={() => setShowUploadDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Upload className="mr-2 h-4 w-4" />
            Subir Documento
          </Button>
        </div>

        {/* Filtros */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Tipo de Operación</Label>
              <Select value={tipoOperacion} onValueChange={setTipoOperacion}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="venta">Venta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Estado de Procesamiento</Label>
              <Select value={estadoProcesamiento} onValueChange={setEstadoProcesamiento}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="procesando">Procesando</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Requiere Validación</Label>
              <Select value={requiereValidacion} onValueChange={setRequiereValidacion}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Sí</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-card rounded-lg border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Archivo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Comprobante</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Entidad</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">OCR</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Cargando documentos...
                    </td>
                  </tr>
                ) : currentDocumentos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      No hay documentos digitalizados
                    </td>
                  </tr>
                ) : (
                  currentDocumentos.map((doc, index) => (
                    <tr key={doc.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 text-sm">{indexOfFirstItem + index + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{doc.nombre_archivo}</div>
                            <div className="text-xs text-muted-foreground">{formatFileSize(doc.tamano_archivo)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={doc.tipo_operacion === 'compra' ? 'default' : 'secondary'}>
                          {doc.tipo_operacion === 'compra' ? 'Compra' : 'Venta'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {doc.comprobante_completo ? (
                          <div>
                            <div className="text-sm font-medium">{doc.comprobante_completo}</div>
                            <div className="text-xs text-muted-foreground">{doc.tipo_comprobante}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {doc.entidad_razon_social ? (
                          <div>
                            <div className="text-sm">{doc.entidad_razon_social}</div>
                            <div className="text-xs text-muted-foreground">{doc.entidad_num_doc}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {doc.total ? (
                          <div className="text-sm font-medium">{doc.moneda} {Number(doc.total).toFixed(2)}</div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getEstadoBadge(doc.estado_procesamiento)}
                      </td>
                      <td className="px-4 py-3">
                        {doc.confianza_ocr ? (
                          <div className="text-sm">{Number(doc.confianza_ocr).toFixed(1)}%</div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <TooltipProvider>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleView(doc)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Ver datos extraídos del documento</p>
                              </TooltipContent>
                            </Tooltip>

                            {doc.estado_procesamiento === 'completado' && !doc.validado && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleValidar(doc)} className="text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Confirmar que los datos extraídos son correctos</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {doc.requiere_validacion && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleEdit(doc)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Corregir datos extraídos por OCR manualmente</p>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setDocumentoToDelete(doc);
                                    setShowDeleteDialog(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Eliminar este documento</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, documentos.length)} de {documentos.length} documentos
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog Upload */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subir Documento</DialogTitle>
            <DialogDescription>
              Selecciona un PDF o imagen de factura. El sistema procesará el documento automáticamente usando IA (Gemini 2.5) y extraerá todos los datos estructurados.
              <br />
              <span className="text-green-600 dark:text-green-400 text-xs mt-1 block font-medium">
                ✨ Extracción automática: RUC, razón social, items, totales, fechas, forma de pago y más
              </span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="tipo_operacion">Tipo de Operación</Label>
              <Select value={tipoOperacionUpload} onValueChange={(v) => setTipoOperacionUpload(v as 'compra' | 'venta')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compra">Compra</SelectItem>
                  <SelectItem value="venta">Venta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="archivo">Archivo (PDF, JPG, PNG - Max 10MB)</Label>
              <Input
                ref={fileInputRef}
                id="archivo"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="mt-1"
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploading}>
              {uploading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Subir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Detalle/Edición */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Editar Datos Extraídos' : 'Detalle del Documento'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Modifica los datos extraídos del documento' : 'Visualiza los datos extraídos por el OCR'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDocumento && (
            <div className="space-y-4">
              {/* Información del archivo */}
              <div className="bg-muted p-3 rounded-lg">
                <h3 className="font-semibold mb-2">Archivo</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Nombre: {selectedDocumento.nombre_archivo}</div>
                  <div>Tamaño: {formatFileSize(selectedDocumento.tamano_archivo)}</div>
                  <div>Tipo: {selectedDocumento.tipo_archivo.toUpperCase()}</div>
                  <div>Estado: {getEstadoBadge(selectedDocumento.estado_procesamiento)}</div>
                </div>
              </div>
              
              {/* Datos del comprobante */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tipo Comprobante</Label>
                  <Input value={selectedDocumento.tipo_comprobante || ''} disabled={!editMode} />
                </div>
                <div>
                  <Label>Comprobante</Label>
                  <Input value={selectedDocumento.comprobante_completo || ''} disabled={!editMode} />
                </div>
                <div>
                  <Label>Fecha Emisión</Label>
                  <Input 
                    type="date" 
                    value={selectedDocumento.fecha_emision ? new Date(selectedDocumento.fecha_emision).toISOString().split('T')[0] : ''} 
                    disabled={!editMode} 
                  />
                </div>
                <div>
                  <Label>Fecha Vencimiento</Label>
                  <Input 
                    type="date" 
                    value={selectedDocumento.fecha_vencimiento ? new Date(selectedDocumento.fecha_vencimiento).toISOString().split('T')[0] : ''} 
                    disabled={!editMode} 
                  />
                </div>
                <div>
                  <Label>Moneda</Label>
                  <Input value={selectedDocumento.moneda || 'PEN'} disabled={!editMode} />
                </div>
                <div>
                  <Label>Forma de Pago</Label>
                  <Input value={selectedDocumento.datos_extraidos?.forma_pago || 'CONTADO'} disabled={!editMode} />
                </div>
              </div>
              
              {/* Datos de entidad */}
              <div>
                <h3 className="font-semibold mb-2">Entidad (Cliente)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>RUC/DNI</Label>
                    <Input value={selectedDocumento.entidad_num_doc || ''} disabled={!editMode} />
                  </div>
                  <div>
                    <Label>Razón Social</Label>
                    <Input value={selectedDocumento.entidad_razon_social || ''} disabled={!editMode} />
                  </div>
                  <div className="col-span-2">
                    <Label>Dirección</Label>
                    <Input value={selectedDocumento.entidad_direccion || ''} disabled={!editMode} />
                  </div>
                </div>
              </div>
              
              {/* Totales */}
              <div>
                <h3 className="font-semibold mb-2">Totales</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Subtotal</Label>
                    <Input type="number" value={selectedDocumento.subtotal || ''} disabled={!editMode} />
                  </div>
                  <div>
                    <Label>IGV</Label>
                    <Input type="number" value={selectedDocumento.igv || ''} disabled={!editMode} />
                  </div>
                  <div>
                    <Label>Total</Label>
                    <Input type="number" value={selectedDocumento.total || ''} disabled={!editMode} />
                  </div>
                </div>
              </div>
              
              {/* Items */}
              {selectedDocumento.datos_extraidos?.items && selectedDocumento.datos_extraidos.items.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Items ({selectedDocumento.datos_extraidos.items.length})</h3>
                  <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="px-2 py-1 text-left">#</th>
                          <th className="px-2 py-1 text-left">Código</th>
                          <th className="px-2 py-1 text-left">Descripción</th>
                          <th className="px-2 py-1 text-center">UM</th>
                          <th className="px-2 py-1 text-right">Cant.</th>
                          <th className="px-2 py-1 text-right">P. Unit.</th>
                          <th className="px-2 py-1 text-right">Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDocumento.datos_extraidos.items.map((item: InvoiceItem, idx: number) => (
                          <tr key={idx} className="border-t hover:bg-muted/50">
                            <td className="px-2 py-1">{item.numero || idx + 1}</td>
                            <td className="px-2 py-1">{item.codigo || '-'}</td>
                            <td className="px-2 py-1">{item.descripcion}</td>
                            <td className="px-2 py-1 text-center">{item.unidad_medida || 'NIU'}</td>
                            <td className="px-2 py-1 text-right">{item.cantidad}</td>
                            <td className="px-2 py-1 text-right">{Number(item.precio_unitario || 0).toFixed(2)}</td>
                            <td className="px-2 py-1 text-right font-semibold">{Number(item.importe || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {selectedDocumento.items_extraidos && selectedDocumento.items_extraidos.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Items (Legacy)</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-2 py-1 text-left">Descripción</th>
                          <th className="px-2 py-1 text-right">Cant.</th>
                          <th className="px-2 py-1 text-right">P. Unit.</th>
                          <th className="px-2 py-1 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDocumento.items_extraidos.map((item, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-1">{item.descripcion}</td>
                            <td className="px-2 py-1 text-right">{item.cantidad}</td>
                            <td className="px-2 py-1 text-right">{item.precio_unitario.toFixed(2)}</td>
                            <td className="px-2 py-1 text-right">{item.subtotal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Acciones adicionales */}
              {selectedDocumento.validado && selectedDocumento.tipo_operacion === 'compra' && !selectedDocumento.compra_id && (
                <Button onClick={() => handleConvertirACompra(selectedDocumento)} className="w-full bg-green-600 hover:bg-green-700">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Convertir a Compra
                </Button>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Eliminar */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de eliminar este documento? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
