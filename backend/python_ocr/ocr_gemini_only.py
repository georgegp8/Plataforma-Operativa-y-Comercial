#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Servicio OCR simplificado usando solo Gemini AI (sin Tesseract ni Poppler)
Procesa PDFs directamente enviándolos a Gemini
"""

import sys
import json
import os
import base64
from pathlib import Path
import urllib.request
import urllib.error

# Configurar encoding UTF-8 para stdout
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# API Key de Gemini — configurar en variables de entorno (ver docs/DESPLIEGUE.md sección B.3)
# Obtener clave en: https://aistudio.google.com/apikey
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
GEMINI_MODEL = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash-lite')  # Versión que soporta PDFs


def procesar_pdf_con_gemini(archivo_path: str):
    """Procesa PDF directamente con Gemini AI"""
    try:
        # Leer archivo PDF y convertir a base64
        with open(archivo_path, 'rb') as f:
            pdf_bytes = f.read()
        pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
        
        # Prompt optimizado para extracción de factura
        prompt = """Extrae TODOS los datos de esta factura peruana en formato JSON.

FORMATO REQUERIDO:
{
  "tipo_comprobante": "FACTURA" o "BOLETA" o "NOTA DE CREDITO",
  "serie": "F010",
  "numero": "000019",
  "fecha_emision": "2025-11-26",
  "fecha_vencimiento": "2025-12-26" o null,
  "entidad_tipo_doc": "RUC" o "DNI",
  "entidad_num_doc": "20198033414",
  "entidad_razon_social": "NOMBRE COMPLETO DEL CLIENTE",
  "entidad_direccion": "DIRECCION COMPLETA",
  "moneda": "PEN" o "USD",
  "porcentaje_igv": 18,
  "total_gravada": 2719.53,
  "subtotal": 2719.53,
  "igv": 489.51,
  "total": 3209.04,
  "importe_letras": "TRES MIL DOSCIENTOS NUEVE CON 04/100 SOLES",
  "forma_pago": "CONTADO" o "CREDITO POR PAGAR",
  "cuotas_credito": [{"numero_cuota": 1, "fecha_vencimiento": "2025-12-26", "monto": 3209.04}],
  "items": [
    {
      "numero": 1,
      "codigo": "323",
      "descripcion": "DESCRIPCION COMPLETA DEL PRODUCTO",
      "unidad_medida": "GLL" o "NIU" o "KGM",
      "cantidad": 5,
      "valor_unitario": 65.11,
      "precio_unitario": 76.83,
      "importe": 384.15
    }
  ]
}

REGLAS IMPORTANTES:
1. El RUC/DNI es del CLIENTE (a quién se le factura), NO del emisor
2. TODOS los items DEBEN incluir cantidad (si no está visible, calcular: importe/precio_unitario)
3. Las fechas en formato YYYY-MM-DD
4. Los números SIN comas (2,719.53 → 2719.53)
5. Unidades comunes: GLL (galones), NIU (unidades), KGM (kilos), ZZ (servicios)
6. Si es CONTADO, cuotas_credito debe ser array vacío []
7. Extraer TODAS las líneas de items visibles en la factura"""

        # Llamar a Gemini API con PDF
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": "application/pdf",
                            "data": pdf_base64
                        }
                    }
                ]
            }],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 8192
            }
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        # Extraer respuesta JSON
        if 'candidates' in result and len(result['candidates']) > 0:
            texto_respuesta = result['candidates'][0]['content']['parts'][0]['text']
            
            # Limpiar markdown si existe
            texto_respuesta = texto_respuesta.strip()
            if texto_respuesta.startswith('```json'):
                texto_respuesta = texto_respuesta[7:]
            if texto_respuesta.startswith('```'):
                texto_respuesta = texto_respuesta[3:]
            if texto_respuesta.endswith('```'):
                texto_respuesta = texto_respuesta[:-3]
            texto_respuesta = texto_respuesta.strip()
            
            # Parsear JSON
            datos = json.loads(texto_respuesta)
            
            # Limpiar caracteres problemáticos en las descripciones
            if 'items' in datos and isinstance(datos['items'], list):
                for item in datos['items']:
                    if 'descripcion' in item:
                        # Reemplazar caracteres problemáticos
                        item['descripcion'] = item['descripcion'].replace('°', ' ')
                        item['descripcion'] = item['descripcion'].replace('\n', ' ')
                        item['descripcion'] = ' '.join(item['descripcion'].split())
            
            # Completar campos derivados
            if 'serie' in datos and 'numero' in datos:
                datos['comprobante_completo'] = f"{datos['serie']}-{datos['numero']}"
            
            # Retornar resultado exitoso
            return {
                "success": True,
                "datos": datos,
                "confianza_ocr": 95.0,  # Gemini tiene alta confianza
                "metodo": "gemini_direct_pdf"
            }
        else:
            return {
                "success": False,
                "error": "No se obtuvo respuesta válida de Gemini"
            }
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return {
            "success": False,
            "error": f"Error HTTP {e.code}: {error_body}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def main():
    """Función principal"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Uso: python ocr_gemini_only.py <archivo_pdf>"
        }))
        sys.exit(1)
    
    archivo = sys.argv[1]
    
    if not os.path.exists(archivo):
        print(json.dumps({
            "success": False,
            "error": f"Archivo no encontrado: {archivo}"
        }))
        sys.exit(1)
    
    # Verificar que sea PDF
    if not archivo.lower().endswith('.pdf'):
        print(json.dumps({
            "success": False,
            "error": "Solo se aceptan archivos PDF con este script. Use ocr_service.py para imágenes."
        }))
        sys.exit(1)
    
    # Procesar PDF con Gemini
    resultado = procesar_pdf_con_gemini(archivo)
    
    # Retornar JSON
    print(json.dumps(resultado, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
