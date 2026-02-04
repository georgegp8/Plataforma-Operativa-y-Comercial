# Instalación de Poppler para OCR de PDFs

## Problema
El servicio OCR no puede procesar archivos PDF porque **Poppler** no está instalado.

Error: `Unable to get page count. Is poppler installed and in PATH?`

## Solución para Windows

### Opción 1: Descarga Manual (Recomendado)
1. **Descargar Poppler para Windows:**
   - Ir a: https://github.com/oschwartz10612/poppler-windows/releases/
   - Descargar la última versión de `Release-XX.XX.X-0.zip`

2. **Extraer archivos:**
   - Extraer el ZIP a `C:\Program Files\poppler` (crear la carpeta si no existe)
   - La estructura debe quedar: `C:\Program Files\poppler\Library\bin\`

3. **Agregar a PATH:**
   - Abrir "Variables de entorno del sistema"
   - Editar la variable `Path`
   - Agregar nueva ruta: `C:\Program Files\poppler\Library\bin`
   - Guardar y cerrar

4. **Verificar instalación:**
   ```powershell
   pdftoppm -v
   ```
   
   Debe mostrar la versión de Poppler

### Opción 2: Usando Chocolatey (si está instalado)
```powershell
choco install poppler
```

### Opción 3: Usar Conda (si usas Anaconda/Miniconda)
```powershell
conda install -c conda-forge poppler
```

## Verificar que funciona
Después de instalar, ejecutar:

```powershell
cd c:\Plataforma_Op_Com_Facturacion_Elect
python backend\python_ocr\ocr_service.py examples\20434906301-01-F010-19.pdf
```

Debe procesar el PDF y extraer los datos de la factura.

## Dependencias del OCR
El sistema requiere:
- ✅ Python 3.12.9 (instalado)
- ✅ pytesseract, PIL, pdf2image, opencv-python (instalado)
- ✅ Tesseract OCR (instalado en `C:\Program Files\Tesseract-OCR\`)
- ❌ **Poppler (FALTA INSTALAR)**

## Solución Alternativa (Docker)
Si no quieres instalar Poppler localmente, puedes usar Docker:

```powershell
cd backend
docker-compose up -d ocr
```

Esto levantará un contenedor con todas las dependencias incluidas.
