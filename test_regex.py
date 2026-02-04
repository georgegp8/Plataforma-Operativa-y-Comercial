import json
import re

# Cargar el JSON
with open('temp_ocr2.json', encoding='utf-8-sig') as f:
    data = json.load(f)

txt = data['texto_completo']

# Probar extracción de RUC
m = re.search(r'RUC\s*:?\s*(\d{11})', txt)
print(f'RUC match: {m.group(1) if m else "NO MATCH"}')

# Probar todos los RUCs
todos_rucs = re.findall(r'\b((?:10|20)\d{9})\b', txt)
print(f'Todos los RUCs: {todos_rucs}')

# Probar extracción de razón social
m2 = re.search(r'DENOMINACI.N\s*:\s*(.+?)\s+MONEDA', txt, re.IGNORECASE)
print(f'Razón social: {m2.group(1) if m2 else "NO MATCH"}')

# Probar extracción de dirección
m3 = re.search(r'DIRECCI.N\s*:\s*(.+?)$', txt, re.IGNORECASE | re.MULTILINE)
print(f'Dirección: {m3.group(1) if m3 else "NO MATCH"}')

# Mostrar líneas con DENOMINACI
lines = [l for l in txt.split('\n') if 'DENOMINACI' in l]
if lines:
    print(f'\nLínea DENOMINACIÓN: {repr(lines[0][:150])}')
