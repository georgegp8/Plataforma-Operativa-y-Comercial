# Script para corregir caracteres UTF-8 corruptos
$content = Get-Content "frontend\src\pages\BoletasFacturas.tsx" -Raw -Encoding UTF8

# Corregir emojis corruptos
$content = $content -replace 'ðŸ"‹', '📋'
$content = $content -replace 'ðŸ"œ', '📜'
$content = $content -replace 'ðŸ'¥', '👥'
$content = $content -replace 'ðŸ—º', '🗺'
$content = $content -replace 'ðŸ'³', '💳'
$content = $content -replace 'ðŸ"¦', '📦'
$content = $content -replace 'ðŸ"', '📝'
$content = $content -replace 'ðŸ¢', '🏢'
$content = $content -replace 'ðŸ‡µðŸ‡ª', '🇵🇪'
$content = $content -replace 'ðŸŒ', '🌍'
$content = $content -replace 'ðŸ'µ', '💵'
$content = $content -replace 'ðŸ"…', '📅'
$content = $content -replace 'ðŸ¦', '🏦'
$content = $content -replace 'ðŸš¨', '🚨'
$content = $content -replace 'ðŸ'°', '💰'
$content = $content -replace 'ðŸ'¡', '💡'

# Corregir caracteres acentuados
$content = $content -replace 'Informació³n', 'Información'
$content = $content -replace 'aparecero¡', 'aparecerá'
$content = $content -replace 'Exportació³n', 'Exportación'
$content = $content -replace 'Dó³lares', 'Dólares'
$content = $content -replace 'Cró©dito', 'Crédito'

# Escribir contenido corregido
$content | Out-File "frontend\src\pages\BoletasFacturas.tsx" -Encoding UTF8 -NoNewline

Write-Host "Corrección UTF-8 completada"