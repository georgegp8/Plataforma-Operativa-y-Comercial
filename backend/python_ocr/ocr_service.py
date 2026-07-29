#!/usr/bin/env python3
"""
Servicio OCR para extracción de datos de facturas con Gemini AI
Usar: python ocr_service.py <ruta_archivo>
"""

import sys
import json
import re
import os
from pathlib import Path
from typing import Dict, List, Optional
import urllib.request
import urllib.error

try:
    import pytesseract
    from PIL import Image
    from pdf2image import convert_from_path
    import cv2
    import numpy as np
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Dependencias faltantes: {str(e)}. Ejecuta: pip install pytesseract pillow pdf2image opencv-python"
    }))
    sys.exit(1)

# API Key de Gemini (obligatoria vía variable de entorno; nunca hardcodear)
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
# Modelo Gemini a usar (opciones: gemini-2.5-flash-lite, gemini-2.0-flash-exp, gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash)
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash-lite')

# Configurar ruta de Tesseract (ajustar según instalación)
# Windows
import platform
if platform.system() == 'Windows':
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# Linux/Mac: generalmente está en PATH


class FacturaOCR:
    """Extractor de datos de facturas usando Gemini AI"""
    
    def __init__(self, archivo_path: str, usar_gemini: bool = True):
        self.archivo_path = Path(archivo_path)
        self.texto_completo = ""
        self.confianza = 0.0
        self.usar_gemini = usar_gemini
        
    def procesar(self) -> Dict:
        """Procesa el archivo y extrae datos"""
        try:
            # Convertir archivo a imagen(es)
            imagenes = self._convertir_a_imagenes()
            
            # Extraer texto de todas las imágenes
            textos = []
            confianzas = []
            
            for img in imagenes:
                # Preprocesar imagen para mejorar OCR
                img_procesada = self._preprocesar_imagen(img)
                
                # Extraer texto con confianza
                datos = pytesseract.image_to_data(img_procesada, output_type=pytesseract.Output.DICT, lang='spa')
                
                texto = pytesseract.image_to_string(img_procesada, lang='spa')
                textos.append(texto)
                
                # Calcular confianza promedio
                confidencias_validas = [float(c) for c in datos['conf'] if int(c) != -1]
                if confidencias_validas:
                    confianzas.append(sum(confidencias_validas) / len(confidencias_validas))
            
            self.texto_completo = "\n".join(textos)
            self.confianza = sum(confianzas) / len(confianzas) if confianzas else 0.0
            
            # Extraer datos estructurados
            datos_extraidos = self._extraer_datos()
            
            return {
                "success": True,
                "datos": datos_extraidos,
                "confianza_ocr": round(self.confianza, 2),
                "texto_completo": self.texto_completo
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _convertir_a_imagenes(self) -> List:
        """Convierte PDF o imagen a lista de imágenes PIL"""
        extension = self.archivo_path.suffix.lower()
        
        if extension == '.pdf':
            # Convertir PDF a imágenes
            return convert_from_path(str(self.archivo_path), dpi=300)
        elif extension in ['.jpg', '.jpeg', '.png']:
            # Cargar imagen directamente
            return [Image.open(self.archivo_path)]
        else:
            raise ValueError(f"Formato no soportado: {extension}")
    
    def _preprocesar_imagen(self, img: Image.Image) -> Image.Image:
        """Mejora la imagen para mejor OCR"""
        # Convertir PIL a OpenCV
        img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        # Convertir a escala de grises
        gris = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
        
        # Aplicar threshold adaptativo
        threshold = cv2.adaptiveThreshold(
            gris, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Reducir ruido
        denoised = cv2.fastNlMeansDenoising(threshold)
        
        # Convertir de vuelta a PIL
        return Image.fromarray(denoised)
    
    def _extraer_con_gemini(self) -> Optional[Dict]:
        """Extrae datos estructurados usando Gemini AI"""
        try:
            if not GEMINI_API_KEY:
                print(json.dumps({
                    "success": False,
                    "error": "GEMINI_API_KEY no está configurada. Defínela en el entorno o en .env."
                }), file=sys.stderr)
                return None

            # Prompt optimizado y conciso
            prompt = f"""Extrae datos de factura peruana en JSON. TODOS los items deben tener cantidad.

TEXTO OCR:
{self.texto_completo[:4500]}

Formato JSON exacto:
{{
  "tipo_comprobante": "FACTURA ELECTRONICA",
  "serie": "F010",
  "numero": "000019",
  "fecha_emision": "2025-11-26",
  "fecha_vencimiento": "2025-12-26",
  "entidad_num_doc": "20198033414",
  "entidad_razon_social": "MUNICIPALIDAD PROVINCIAL DE CAYLLOMA",
  "entidad_direccion": "PZA. DE ARMAS NRO. 104",
  "moneda": "PEN",
  "porcentaje_igv": 18,
  "total_gravada": 2719.53,
  "subtotal": 2719.53,
  "igv": 489.51,
  "total": 3209.04,
  "importe_letras": "TRES MIL DOSCIENTOS NUEVE CON 04/100 SOLES",
  "forma_pago": "CREDITO POR PAGAR",
  "cuotas_credito": [{{"numero_cuota": 1, "fecha_vencimiento": "2025-12-26", "monto": 3209.04}}],
  "items": [
    {{"numero": 1, "codigo": "323", "descripcion": "ACEITE DE TRANSMISION SAE 10W - VISTONY", "unidad_medida": "GLL", "cantidad": 5, "valor_unitario": 65.11, "precio_unitario": 76.83, "importe": 384.15}},
    {{"numero": 2, "codigo": "324", "descripcion": "ACEITE HIDROLINA ISO 10 X 5 gal - VISTONY", "unidad_medida": "NIU", "cantidad": 1, "valor_unitario": 184.449, "precio_unitario": 217.65, "importe": 217.65}}
  ]
}}

REGLAS CRÍTICAS:
1. RUC del CLIENTE (no emisor)
2. TODOS los items DEBEN tener cantidad (si no está visible, calcúlala: importe / precio_unitario)
3. Unidades: GLL (galones), NIU (unidades), KGM (kilos), etc.
4. Fechas formato: YYYY-MM-DD
5. Números decimales sin comas: 2,719.53 → 2719.53
6. Descripciones completas sin truncar"""

            # Llamar a Gemini API
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0,
                    "maxOutputTokens": 4096,
                    "responseMimeType": "application/json"
                }
            }
            
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
                
            # Extraer texto de la respuesta
            if 'candidates' in result and len(result['candidates']) > 0:
                texto_respuesta = result['candidates'][0]['content']['parts'][0]['text']
                
                # Limpiar respuesta (quitar markdown si existe)
                texto_respuesta = texto_respuesta.strip()
                if texto_respuesta.startswith('```json'):
                    texto_respuesta = texto_respuesta[7:]
                if texto_respuesta.startswith('```'):
                    texto_respuesta = texto_respuesta[3:]
                if texto_respuesta.endswith('```'):
                    texto_respuesta = texto_respuesta[:-3]
                texto_respuesta = texto_respuesta.strip()
                
                # Parsear JSON
                datos_gemini = json.loads(texto_respuesta)
                return datos_gemini
                
        except urllib.error.HTTPError as e:
            error_body = e.read().decode('utf-8')
            print(f"Error HTTP de Gemini: {e.code} - {error_body}", file=sys.stderr)
            return None
        except Exception as e:
            print(f"Error al llamar a Gemini: {str(e)}", file=sys.stderr)
            return None
    
    def _extraer_datos(self) -> Dict:
        """Extrae datos estructurados del texto"""
        # Intentar primero con Gemini AI
        if self.usar_gemini:
            datos_gemini = self._extraer_con_gemini()
            if datos_gemini:
                # Validar y completar datos faltantes
                return self._validar_datos_gemini(datos_gemini)
        
        # Fallback a extracción tradicional con regex
        datos = {
            # Información básica del documento
            "tipo_comprobante": self._extraer_tipo_comprobante(),
            "serie": self._extraer_serie(),
            "numero": self._extraer_numero(),
            "comprobante_completo": None,
            "fecha_emision": self._extraer_fecha(),
            
            # Información de la entidad
            "entidad_tipo_doc": self._extraer_tipo_documento_cliente(),
            "entidad_num_doc": self._extraer_ruc(),
            "entidad_razon_social": self._extraer_razon_social(),
            "entidad_direccion": self._extraer_direccion(),
            
            # Información monetaria
            "moneda": self._extraer_moneda(),
            "tipo_cambio": self._extraer_tipo_cambio(),
            "porcentaje_igv": self._extraer_porcentaje_igv(),
            
            # Totales
            "total_gravada": self._extraer_monto("GRAVADA"),
            "subtotal": None,  # Se calculará después como = total_gravada
            "total_exonerada": self._extraer_monto("EXONERADA"),
            "total_inafecta": self._extraer_monto("INAFECTA"),
            "igv": self._extraer_monto("IGV"),
            "total": self._extraer_monto("^TOTAL"),
            
            # Descuentos
            "descuento_global": self._extraer_monto("DESCUENTO"),
            
            # Información comercial
            "fecha_vencimiento": self._extraer_fecha_vencimiento(),
            "orden_compra_servicio": self._extraer_orden_compra(),
            "condiciones_pago": self._extraer_condiciones_pago(),
            "observaciones": self._extraer_observaciones(),
            
            # Notas de crédito/débito
            "documento_modifica_tipo": self._extraer_doc_modificado_tipo(),
            "documento_modifica_serie": self._extraer_doc_modificado_serie(),
            "documento_modifica_numero": self._extraer_doc_modificado_numero(),
            
            # Percepciones/Retenciones/Detracciones
            "detraccion": self._extraer_detraccion(),
            "percepcion_tipo": self._extraer_percepcion_tipo(),
            
            # Cuotas de crédito
            "cuotas_credito": self._extraer_cuotas_credito(),
            
            # Items
            "items_extraidos": self._extraer_items()
        }
        
        # Generar comprobante completo
        if datos["serie"] and datos["numero"]:
            datos["comprobante_completo"] = f"{datos['serie']}-{datos['numero']}"
        
        # Calcular subtotal = total_gravada (si no hay exonerada/inafecta)
        if datos["total_gravada"] and not datos["subtotal"]:
            datos["subtotal"] = datos["total_gravada"]
        
        return datos
    
    def _extraer_tipo_comprobante(self) -> Optional[str]:
        """Identifica tipo de comprobante"""
        texto_upper = self.texto_completo.upper()
        
        if re.search(r'\bFACTURA\s+ELECTR[OÓ]NICA\b', texto_upper):
            return "FACTURA ELECTRONICA"
        elif re.search(r'\bFACTURA\b', texto_upper):
            return "FACTURA"
        elif re.search(r'\bBOLETA\s+DE\s+VENTA\b', texto_upper):
            return "BOLETA DE VENTA"
        elif re.search(r'\bBOLETA\b', texto_upper):
            return "BOLETA"
        elif re.search(r'\bNOTA\s+DE\s+CR[EÉ]DITO\b', texto_upper):
            return "NOTA DE CREDITO"
        elif re.search(r'\bNOTA\s+DE\s+D[EÉ]BITO\b', texto_upper):
            return "NOTA DE DEBITO"
        
        return None
    
    def _extraer_serie(self) -> Optional[str]:
        """Extrae serie del comprobante (ej: F001, B001, F010)"""
        # Buscar patrones como F001, B001, F010, FO10, E001, etc. (tolerante a O→0)
        match = re.search(r'\b([A-Z][O0I1][O0I1][O0-9])\b', self.texto_completo)
        if match:
            serie = match.group(1).replace('O', '0').replace('I', '1')
            return serie
        
        # Buscar "SERIE: F001" o similar
        match = re.search(r'SERIE\s*:?\s*([A-Z][O0I1][O0I1][O0-9])', self.texto_completo, re.IGNORECASE)
        if match:
            serie = match.group(1).replace('O', '0').replace('I', '1')
            return serie
        
        return None
    
    def _validar_datos_gemini(self, datos: Dict) -> Dict:
        """Valida y completa datos extraídos por Gemini"""
        # Asegurar que subtotal = total_gravada
        if datos.get('total_gravada') and not datos.get('subtotal'):
            datos['subtotal'] = datos['total_gravada']
        
        # Generar comprobante_completo
        if datos.get('serie') and datos.get('numero'):
            datos['comprobante_completo'] = f"{datos['serie']}-{datos['numero']}"
        
        # Setear tipo_doc por defecto
        if not datos.get('entidad_tipo_doc') and datos.get('entidad_num_doc'):
            datos['entidad_tipo_doc'] = 'RUC' if len(str(datos['entidad_num_doc'])) == 11 else 'DNI'
        
        # Validar y completar items
        if datos.get('items'):
            for item in datos['items']:
                # Asegurar unidad_medida
                if not item.get('unidad_medida'):
                    item['unidad_medida'] = 'NIU'
                
                # Validar y corregir cantidad usando cálculo (importe / precio_unitario)
                if item.get('importe') and item.get('precio_unitario'):
                    cantidad_calculada = round(item['importe'] / item['precio_unitario'], 2)
                    
                    # Si no tiene cantidad O si la cantidad no coincide con el cálculo, usar calculada
                    if not item.get('cantidad') or abs(item['cantidad'] * item['precio_unitario'] - item['importe']) > 0.5:
                        item['cantidad'] = cantidad_calculada
                
                # Calcular importe si falta
                if not item.get('importe') and item.get('cantidad') and item.get('precio_unitario'):
                    item['importe'] = round(item['cantidad'] * item['precio_unitario'], 2)
        
        return datos
    
    def _extraer_numero(self) -> Optional[str]:
        """Extrae número del comprobante"""
        # Buscar después de la serie con guión o espacio (ej: F010-000021, FO10 000021)
        match = re.search(r'[A-Z][O0I1][O0I1][O0-9][\s\-]+([O0\d]{4,8})', self.texto_completo)
        if match:
            numero = match.group(1).replace('O', '0')
            return numero
        
        # Buscar "N°: 00123456" o "NUMERO: 00123456"
        match = re.search(r'N[UÚ]MERO\s*:?\s*([O0\d]{4,8})', self.texto_completo, re.IGNORECASE)
        if match:
            numero = match.group(1).replace('O', '0')
            return numero
        
        match = re.search(r'N[°º]\s*:?\s*([O0\d]{4,8})', self.texto_completo)
        if match:
            numero = match.group(1).replace('O', '0')
            return numero
        
        return None
    
    def _extraer_fecha(self) -> Optional[str]:
        """Extrae fecha de emisión (formato: YYYY-MM-DD)"""
        # Patrones de fecha: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
        patrones = [
            r'(\d{1,2})[/-](\d{1,2})[/-](\d{4})',  # DD/MM/YYYY
            r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})',  # YYYY-MM-DD
        ]
        
        for patron in patrones:
            match = re.search(patron, self.texto_completo)
            if match:
                grupos = match.groups()
                if len(grupos) == 3:
                    if len(grupos[0]) == 4:  # YYYY-MM-DD
                        return f"{grupos[0]}-{grupos[1].zfill(2)}-{grupos[2].zfill(2)}"
                    else:  # DD/MM/YYYY
                        return f"{grupos[2]}-{grupos[1].zfill(2)}-{grupos[0].zfill(2)}"
        
        return None
    
    def _extraer_ruc(self) -> Optional[str]:
        """Extrae RUC del CLIENTE (11 dígitos que empiezan con 10 o 20)"""
        # Buscar RUC específico del cliente (en sección CLIENTE o cerca de DENOMINACIÓN)
        # No requerir "CLIENTE" antes ya que puede estar en línea separada
        match = re.search(
            r'(?:CLIENTE.*?)?RUC\s*:?\s*(\d{11})',
            self.texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match:
            ruc_encontrado = match.group(1)
            # Verificar que sea RUC válido
            if ruc_encontrado.startswith(('10', '20')):
                # Buscar todos los RUCs para asegurarnos que no sea del emisor
                todos_rucs = re.findall(r'\b((?:10|20)\d{9})\b', self.texto_completo)
                # Si hay más de un RUC y este es el primero, es probable que sea del emisor
                if len(todos_rucs) > 1 and ruc_encontrado == todos_rucs[0]:
                    return todos_rucs[1]  # Retornar el segundo (cliente)
                else:
                    return ruc_encontrado
        
        # Buscar en sección DENOMINACIÓN
        match = re.search(
            r'DENOMINACI[OÓ]N.*?(\d{11})',
            self.texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match:
            ruc = match.group(1)
            if ruc.startswith(('10', '20')):
                return ruc
        
        # Buscar todos los RUCs y tomar el segundo (el primero suele ser del emisor)
        rucs = re.findall(r'\b((?:10|20)\d{9})\b', self.texto_completo)
        if len(rucs) >= 2:
            return rucs[1]  # El segundo RUC suele ser del cliente
        elif len(rucs) == 1:
            return rucs[0]
        
        return None
    
    def _extraer_razon_social(self) -> Optional[str]:
        """Extrae razón social del CLIENTE"""
        # Patrón 1: Buscar DENOMINACIÓN: seguido del nombre hasta MONEDA
        # Usa . para coincidir con cualquier carácter (incluyendo UTF-8 mal decodificado)
        match = re.search(
            r'DENOMINACI.N\s*:\s*(.+?)\s+MONEDA',
            self.texto_completo,
            re.IGNORECASE
        )
        if match:
            razon = match.group(1).strip()
            # Limpiar caracteres extraños y validar
            razon = re.sub(r'\s+', ' ', razon)  # Normalizar espacios
            if len(razon) > 5 and not razon.isdigit():
                return razon
        
        # Patrón 2: Buscar DENOMINACIÓN hasta salto de línea
        match = re.search(
            r'DENOMINACI.N\s*:\s*(.+?)$',
            self.texto_completo,
            re.IGNORECASE | re.MULTILINE
        )
        if match:
            razon = match.group(1).strip()
            razon = re.sub(r'\s+', ' ', razon)
            if len(razon) > 5 and not razon.isdigit():
                return razon
        
        # Si hay RUC del cliente, buscar texto cercano que parezca razón social
        ruc_cliente = self._extraer_ruc()
        if ruc_cliente:
            lineas = self.texto_completo.split('\n')
            for i, linea in enumerate(lineas):
                if ruc_cliente in linea:
                    # Revisar líneas anteriores y posteriores
                    for offset in [-2, -1, 1, 2]:
                        idx = i + offset
                        if 0 <= idx < len(lineas):
                            candidato = lineas[idx].strip()
                            # Buscar línea con texto mayúscula larga
                            if (len(candidato) > 10 and 
                                candidato.replace(' ', '').replace('.', '').isupper() and
                                not candidato.isdigit() and
                                ruc_cliente not in candidato):
                                return candidato
        
        return None
    
    def _extraer_direccion(self) -> Optional[str]:
        """Extrae dirección del CLIENTE"""
        # Buscar después de "DIRECCIÓN" hasta fin de línea
        # Usa . para coincidir con cualquier carácter (incluyendo UTF-8 mal decodificado)
        match = re.search(
            r'DIRECCI.N\s*:\s*(.+?)$',
            self.texto_completo,
            re.IGNORECASE | re.MULTILINE
        )
        if match:
            direccion = match.group(1).strip()
            # Limpiar espacios múltiples
            direccion = re.sub(r'\s+', ' ', direccion)
            if len(direccion) > 5:
                return direccion
                return direccion
        
        # Buscar patrón simple DIRECCIÓN:
        match = re.search(
            r'DIRECCI[OÓ]N\s*:?\s*([A-Z0-9\s\.\,\-]+?)(?:\n|FECHA|$)',
            self.texto_completo,
            re.IGNORECASE
        )
        if match:
            direccion = match.group(1).strip()
            if len(direccion) > 10:
                return direccion
        
        return None
    
    def _extraer_tipo_documento_cliente(self) -> str:
        """Identifica tipo de documento del cliente"""
        texto_upper = self.texto_completo.upper()
        
        # Buscar RUC (11 dígitos que empiezan con 10 o 20)
        if re.search(r'\b(?: 10|20)\d{9}\b', self.texto_completo):
            return 'RUC'
        
        # Buscar DNI (8 dígitos)
        if re.search(r'DNI\s*:?\s*\d{8}', texto_upper):
            return 'DNI'
        
        # Buscar Carnet de Extranjería
        if re.search(r'C\.?E\.|CARNET\s+EXTRANJER[IÍ]A', texto_upper):
            return 'CE'
        
        return 'RUC'  # Por defecto RUC
    
    def _extraer_moneda(self) -> str:
        """Identifica moneda (PEN o USD)"""
        texto_upper = self.texto_completo.upper()
        
        if any(palabra in texto_upper for palabra in ['DOLAR', 'DOLLAR', 'USD', 'US$', '$']):
            return 'USD'
        
        return 'PEN'  # Por defecto soles
    
    def _extraer_tipo_cambio(self) -> Optional[float]:
        """Extrae tipo de cambio"""
        match = re.search(r'T\.?\s*C\.?\s*:?\s*([\d,]+\.?\d*)', self.texto_completo, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(',', ''))
            except ValueError:
                pass
        
        match = re.search(r'TIPO\s+CAMBIO\s*:?\s*([\d,]+\.?\d*)', self.texto_completo, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(',', ''))
            except ValueError:
                pass
        
        return None
    
    def _extraer_porcentaje_igv(self) -> float:
        """Extrae porcentaje de IGV (default 18%)"""
        match = re.search(r'IGV\s*\(?(\d{1,2})%', self.texto_completo, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
        
        return 18.00  # Por defecto 18%
    
    def _extraer_fecha_vencimiento(self) -> Optional[str]:
        """Extrae fecha de vencimiento"""
        # Buscar "FECHA DE VENC." o "VENCIMIENTO"
        match = re.search(
            r'(?:FECHA\s+DE\s+VENC|VENCIMIENTO)\.?\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})',
            self.texto_completo,
            re.IGNORECASE
        )
        if match:
            dia, mes, año = match.groups()
            return f"{año}-{mes.zfill(2)}-{dia.zfill(2)}"
        
        return None
    
    def _extraer_orden_compra(self) -> Optional[str]:
        """Extrae número de orden de compra"""
        # Buscar O/C, O.C, OC
        match = re.search(r'O\s?[/\.]?\s?C\s*:?\s*([A-Z0-9-]+)', self.texto_completo, re.IGNORECASE)
        if match:
            return match.group(1).strip()
        
        # Buscar "ORDEN DE COMPRA"
        match = re.search(
            r'ORDEN\s+(?:DE\s+)?COMPRA\s*:?\s*([A-Z0-9-]+)',
            self.texto_completo,
            re.IGNORECASE
        )
        if match:
            return match.group(1).strip()
        
        return None
    
    def _extraer_condiciones_pago(self) -> Optional[str]:
        """Extrae condiciones de pago"""
        match = re.search(
            r'CONDICIONES?\s+(?:DE\s+)?PAGO\s*:?\s*(.+?)(?:\n|$)',
            self.texto_completo,
            re.IGNORECASE
        )
        if match:
            return match.group(1).strip()
        
        # Buscar palabras clave
        texto_upper = self.texto_completo.upper()
        if 'CONTADO' in texto_upper:
            return 'CONTADO'
        
        # Buscar CRÉDITO XX DÍAS
        match = re.search(r'CR[ÉE]DITO\s+(\d+)\s*D[IÍ]AS?', texto_upper)
        if match:
            return f"CRÉDITO {match.group(1)} DÍAS"
        
        return None
    
    def _extraer_observaciones(self) -> Optional[str]:
        """Extrae observaciones"""
        match = re.search(
            r'OBSERVACIONES?\s*:?\s*(.+?)(?:\n\n|$)',
            self.texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        if match:
            return match.group(1).strip()[:500]  # Limitar a 500 caracteres
        
        return None
    
    def _extraer_doc_modificado_tipo(self) -> Optional[int]:
        """Extrae tipo de documento modificado (para notas)"""
        tipo_comprobante = self._extraer_tipo_comprobante()
        
        if tipo_comprobante and 'NOTA' in tipo_comprobante.upper():
            # Buscar el documento que modifica
            if re.search(r'FACTURA\s+[A-Z]\d{3}-\d+', self.texto_completo, re.IGNORECASE):
                return 1  # Factura
            elif re.search(r'BOLETA\s+[A-Z]\d{3}-\d+', self.texto_completo, re.IGNORECASE):
                return 2  # Boleta
        
        return None
    
    def _extraer_doc_modificado_serie(self) -> Optional[str]:
        """Extrae serie del documento modificado"""
        tipo_comprobante = self._extraer_tipo_comprobante()
        
        if tipo_comprobante and 'NOTA' in tipo_comprobante.upper():
            match = re.search(
                r'(?:FACTURA|BOLETA)\s+([A-Z]\d{3})',
                self.texto_completo,
                re.IGNORECASE
            )
            if match:
                return match.group(1)
        
        return None
    
    def _extraer_doc_modificado_numero(self) -> Optional[str]:
        """Extrae número del documento modificado"""
        tipo_comprobante = self._extraer_tipo_comprobante()
        
        if tipo_comprobante and 'NOTA' in tipo_comprobante.upper():
            match = re.search(
                r'(?:FACTURA|BOLETA)\s+[A-Z]\d{3}-(\d{4,8})',
                self.texto_completo,
                re.IGNORECASE
            )
            if match:
                return match.group(1)
        
        return None
    
    def _extraer_detraccion(self) -> bool:
        """Detecta si tiene detracción"""
        texto_upper = self.texto_completo.upper()
        return bool(re.search(r'DETRACC[IÓO]N', texto_upper))
    
    def _extraer_percepcion_tipo(self) -> Optional[int]:
        """Detecta tipo de percepción"""
        texto_upper = self.texto_completo.upper()
        
        if 'PERCEPCI' not in texto_upper:
            return None
        
        # Buscar porcentaje
        if '2%' in texto_upper or '2 %' in texto_upper:
            return 1  # Venta interna 2%
        elif '1%' in texto_upper or '1 %' in texto_upper:
            return 2  # Combustible 1%
        elif '0.5%' in texto_upper or '0,5%' in texto_upper:
            return 3  # Especial 0.5%
        
        return 1  # Default: Venta interna
    
    def _extraer_cuotas_credito(self) -> Optional[List[Dict]]:
        """Extrae cuotas de pago cuando es crédito"""
        cuotas = []
        
        # Buscar patrón: CUOTA DD/MM/YYYY(S/MONTO)
        # Ejemplo: CUOTA 31/01/2026(S/12000.0) o CUOTA 31/01/2026(5/12000.0)
        patron_cuota = r'CUOTA\s+(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s*\([S5]\s?/\s?([\d,]+\.?\d*)\)'
        matches = re.finditer(patron_cuota, self.texto_completo, re.IGNORECASE)
        
        numero_cuota = 1
        for match in matches:
            dia, mes, año = match.group(1), match.group(2), match.group(3)
            monto_str = match.group(4).replace(',', '')
            
            try:
                monto = float(monto_str)
                fecha = f"{año}-{mes.zfill(2)}-{dia.zfill(2)}"
                
                cuotas.append({
                    "numero_cuota": numero_cuota,
                    "fecha_vencimiento": fecha,
                    "monto": round(monto, 2)
                })
                numero_cuota += 1
            except ValueError:
                continue
        
        # Si no hay cuotas explícitas pero dice CRÉDITO, crear una cuota con fecha de vencimiento
        if not cuotas:
            condiciones = self._extraer_condiciones_pago()
            if condiciones and 'CR' in condiciones.upper():
                fecha_venc = self._extraer_fecha_vencimiento()
                total = self._extraer_monto("TOTAL|IMPORTE TOTAL")
                
                if fecha_venc and total:
                    cuotas.append({
                        "numero_cuota": 1,
                        "fecha_vencimiento": fecha_venc,
                        "monto": total
                    })
        
        return cuotas if cuotas else None
    
    def _extraer_monto(self, patron_label: str) -> Optional[float]:
        """Extrae monto asociado a una etiqueta con múltiples formatos"""
        # Patrones para buscar montos con diferentes formatos
        patrones = [
            # Formato con porcentaje: IGV 18,00 % S/ 1,830.51
            rf'{patron_label}\s+[\d,]+\s*%\s*S\s?/\s?([\d,]+\.\d{{2}})',
            # Formato directo sin dos puntos: GRAVADA S/ 10,169.49
            rf'{patron_label}\s+S\s?/\s?([\d,]+\.\d{{2}})',
            # Formato con dos puntos: LABEL: S/ 1,234.56
            rf'{patron_label}\s*:?\s*S\s?/\s?([\d,]+\.\d{{2}})',
            # Formato solo número con decimales: LABEL 1,234.56
            rf'{patron_label}\s+([\d,]+\.\d{{2}})',
            # Formato con dos puntos: LABEL: 1,234.56
            rf'{patron_label}\s*:?\s*([\d,]+\.\d{{2}})',
        ]
        
        for patron in patrones:
            match = re.search(patron, self.texto_completo, re.IGNORECASE | re.MULTILINE)
            if match:
                monto_str = match.group(1)
                if monto_str:
                    # Limpiar formato: eliminar comas
                    monto_str = monto_str.replace(',', '').strip()
                    try:
                        monto = float(monto_str)
                        # Validar que sea un monto razonable (mayor a 0)
                        if monto > 0:
                            return round(monto, 2)
                    except ValueError:
                        continue
        
        return None
    
    def _extraer_items(self) -> List[Dict]:
        """Extrae items/productos de la factura con lógica mejorada"""
        items = []
        
        # Buscar sección de items (entre DESCRIPCIÓN y GRAVADA/TOTAL)
        match_seccion = re.search(
            r'DESCRIPCI[OÓ]N.*?(GRAVADA|TOTAL|SUBTOTAL)',
            self.texto_completo,
            re.IGNORECASE | re.DOTALL
        )
        
        if match_seccion:
            seccion_items = match_seccion.group(0)
            lineas = seccion_items.split('\n')
        else:
            lineas = self.texto_completo.split('\n')
        
        for linea in lineas:
            linea_limpia = linea.strip()
            if not linea_limpia or len(linea_limpia) < 10:
                continue
                
            # Patrón 1: CANT UM CÓD DESCRIPCIÓN V/U P/U IMPORTE
            # Ejemplo: 2 NIU L235 LLANTA 23.5-25 POSTERIOR 5,084.746 6,000.000 12,000.00
            # Nota: OCR a veces confunde formato de números
            match = re.match(
                r'(\d+)\s+([A-Z]{2,3})\s+([A-Z0-9]+)\s+(.+?)\s+([\d,]+\.?\d*)\s+([\d,]+\.?\d*)\s+([\d,]+\.\d{2})$',
                linea_limpia,
                re.IGNORECASE
            )
            
            if match:
                try:
                    cantidad = float(match.group(1))
                    unidad_medida = match.group(2)
                    codigo = match.group(3)
                    descripcion = match.group(4).strip()
                    
                    # El último número con .XX es siempre el IMPORTE (más confiable)
                    importe_str = match.group(7).replace(',', '')
                    importe = float(importe_str)
                    
                    # Precio unitario: IMPORTE / CANTIDAD
                    precio_unitario = importe / cantidad if cantidad > 0 else 0
                    
                    # Calcular valores
                    porcentaje_igv = self._extraer_porcentaje_igv() / 100
                    tipo_igv = self._determinar_tipo_igv(descripcion)
                    
                    if tipo_igv == 1:  # Gravado
                        # El importe incluye IGV
                        valor_sin_igv = importe / (1 + porcentaje_igv)
                        igv_item = importe - valor_sin_igv
                        valor_unitario = valor_sin_igv / cantidad if cantidad > 0 else 0
                    else:  # Exonerado/Inafecto
                        igv_item = 0
                        valor_sin_igv = importe
                        valor_unitario = precio_unitario
                    
                    items.append({
                        "codigo": codigo,
                        "descripcion": descripcion,
                        "cantidad": cantidad,
                        "unidad_medida": unidad_medida,
                        "valor_unitario": round(valor_unitario, 2),
                        "precio_unitario": round(precio_unitario, 2),
                        "subtotal": round(valor_sin_igv, 2),
                        "tipo_igv": tipo_igv,
                        "igv": round(igv_item, 2),
                        "total": round(importe, 2)
                    })
                    continue
                except (ValueError, AttributeError, IndexError):
                    pass
            
            # Patrón 2: CANT DESCRIPCIÓN V/U P/U IMPORTE (sin UM ni código)
            # Ejemplo: 2 LLANTA 23.5-25 POSTERIOR 5084.746 6000.000 12000.00
            match = re.match(
                r'(\d+\.?\d*)\s+(.+?)\s+([\d,]+\.?\d+)\s+([\d,]+\.?\d+)\s+([\d,]+\.?\d+)$',
                linea_limpia
            )
            
            if match:
                try:
                    cantidad = float(match.group(1).replace(',', ''))
                    descripcion = match.group(2).strip()
                    valor_unitario = float(match.group(3).replace(',', ''))
                    precio_unitario = float(match.group(4).replace(',', ''))
                    importe = float(match.group(5).replace(',', ''))
                    
                    # Validar que sea un item válido
                    if len(descripcion) < 5 or descripcion.isdigit():
                        continue
                    
                    porcentaje_igv = self._extraer_porcentaje_igv() / 100
                    tipo_igv = self._determinar_tipo_igv(descripcion)
                    
                    if tipo_igv == 1:
                        igv_item = importe - (importe / (1 + porcentaje_igv))
                        subtotal_item = importe - igv_item
                    else:
                        igv_item = 0
                        subtotal_item = importe
                    
                    items.append({
                        "codigo": "",
                        "descripcion": descripcion,
                        "cantidad": cantidad,
                        "unidad_medida": self._determinar_unidad_medida(descripcion),
                        "valor_unitario": round(valor_unitario, 2),
                        "precio_unitario": round(precio_unitario, 2),
                        "subtotal": round(subtotal_item, 2),
                        "tipo_igv": tipo_igv,
                        "igv": round(igv_item, 2),
                        "total": round(importe, 2)
                    })
                except (ValueError, AttributeError):
                    continue
        
        return items if items else None
    
    def _determinar_tipo_igv(self, descripcion: str) -> int:
        """Determina tipo de IGV del item"""
        desc_upper = descripcion.upper()
        
        if any(palabra in desc_upper for palabra in ['EXONERADO', 'EXONERADA']):
            return 8  # Exonerado
        elif any(palabra in desc_upper for palabra in ['INAFECTO', 'INAFECTA']):
            return 9  # Inafecto
        elif any(palabra in desc_upper for palabra in ['GRATUITO', 'GRATUITA', 'BONIFICACI']):
            return 10  # Inafecto - Retiro por Bonificación
        
        return 1  # Gravado - Operación Onerosa (por defecto)
    
    def _determinar_unidad_medida(self, descripcion: str) -> str:
        """Determina unidad de medida del item"""
        desc_upper = descripcion.upper()
        
        # Palabras clave para servicios
        servicios = ['SERVICIO', 'CONSULTOR', 'ASESOR', 'HORA', 'MANTENIMIENTO', 'INSTALACI']
        if any(palabra in desc_upper for palabra in servicios):
            return 'ZZ'  # Servicios
        
        # Unidades de medida comunes
        if 'KG' in desc_upper or 'KILO' in desc_upper:
            return 'KGM'  # Kilogramos
        elif 'MT' in desc_upper or 'METRO' in desc_upper:
            return 'MTR'  # Metros
        elif 'LT' in desc_upper or 'LITRO' in desc_upper:
            return 'LTR'  # Litros
        elif 'UND' in desc_upper or 'UNIDAD' in desc_upper:
            return 'NIU'  # Unidades
        
        return 'NIU'  # Unidades (por defecto para productos)


def main():
    """Punto de entrada del script"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Uso: python ocr_service.py <ruta_archivo>"
        }))
        sys.exit(1)
    
    archivo = sys.argv[1]
    
    if not Path(archivo).exists():
        print(json.dumps({
            "success": False,
            "error": f"Archivo no encontrado: {archivo}"
        }))
        sys.exit(1)
    
    # Procesar archivo
    ocr = FacturaOCR(archivo)
    resultado = ocr.procesar()
    
    # Retornar JSON
    print(json.dumps(resultado, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
