# 📧 Configuración de Email para Envío Automático de Comprobantes

## ✅ Requisitos

- Cuenta de Gmail o Google Workspace
- Verificación en 2 pasos habilitada

---

## 🔐 Paso 1: Generar App Password de Gmail

Google requiere una **contraseña de aplicación** para permitir que aplicaciones externas envíen emails.

### Instrucciones:

1. **Habilitar Verificación en 2 pasos**:
   - Ve a: https://myaccount.google.com/security
   - Busca "Verificación en 2 pasos" y actívala si no lo está

2. **Generar App Password**:
   - Ve a: https://myaccount.google.com/apppasswords
   - Si no ves esta opción, asegúrate de tener la verificación en 2 pasos activa
   - Selecciona:
     - **Aplicación**: Correo
     - **Dispositivo**: Otro (nombre personalizado, ej: "Sistema Facturación")
   - Haz clic en **Generar**
   - Google mostrará una contraseña de 16 caracteres (ej: `abcd efgh ijkl mnop`)
   - **COPIA ESTA CONTRASEÑA** (solo se muestra una vez)

---

## ⚙️ Paso 2: Configurar Laravel (.env)

Edita el archivo `backend/.env` y actualiza las siguientes variables:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=george.guerra@tecsup.edu.pe
MAIL_PASSWORD=abcdefghijklmnop
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=george.guerra@tecsup.edu.pe
MAIL_FROM_NAME="Sistema de Facturación"
```

### ⚠️ Importante:
- `MAIL_PASSWORD` debe ser la **App Password** generada en el Paso 1 (sin espacios)
- **NO uses tu contraseña normal de Gmail** - no funcionará
- Usa `tls` para el puerto 587 o `ssl` para el puerto 465

---

## 🧪 Paso 3: Probar el Envío

### Probar desde Laravel Tinker:

```bash
cd backend
php artisan tinker
```

```php
// En tinker:
$comprobante = \App\Models\Comprobante::first();
\Mail::to('tu-email@example.com')->send(new \App\Mail\ComprobanteEmitido($comprobante));
```

Si todo está bien configurado, deberías recibir un email en unos segundos.

---

## 🚀 Cómo Funciona

### Envío Automático:

Cuando emites un comprobante desde el frontend:

1. Se emite el comprobante en NubeFact
2. Se guarda en la base de datos
3. **Automáticamente** se envía por email a: `george.guerra@tecsup.edu.pe`

### Envío Manual al Cliente:

También puedes enviar manualmente al cliente:
- Usa el botón "Más opciones" (⋮) en la lista de comprobantes
- Selecciona "Enviar por Email"
- Ingresa el email del cliente

---

## 🎨 Contenido del Email

El email incluye:

- ✅ **Asunto**: Factura Electrónica F001-123 (o el número correspondiente)
- ✅ **Cuerpo HTML bonito** con:
  - Logo de la empresa (si está configurado)
  - Detalles del comprobante (número, fecha, cliente, total)
  - Badge "Aceptado por SUNAT"
  - Botones para descargar PDF y XML
- ✅ **Adjuntos automáticos**:
  - PDF del comprobante
  - XML firmado (si está disponible)

---

## 🔧 Solución de Problemas

### Error: "Failed to authenticate on SMTP server"

**Causa**: Contraseña incorrecta o no es una App Password

**Solución**:
1. Verifica que usaste la App Password, no tu contraseña normal
2. Regenera una nueva App Password
3. Copia la contraseña SIN espacios

### Error: "Connection could not be established"

**Causa**: Puerto bloqueado o configuración incorrecta

**Solución**:
```env
# Prueba con puerto 465 + ssl:
MAIL_PORT=465
MAIL_ENCRYPTION=ssl
```

### Email se envía pero no llega

**Causa**: Email en spam o bloqueado

**Solución**:
1. Revisa la carpeta de spam
2. Agrega el remitente a tus contactos
3. Verifica que el email de destino sea correcto

### Error: "Please log in via your web browser"

**Causa**: Google bloqueó el acceso por seguridad

**Solución**:
1. Ve a: https://accounts.google.com/DisplayUnlockCaptcha
2. Haz clic en "Continuar"
3. Intenta enviar el email nuevamente

---

## 📝 Cambiar el Email Configurado

Para cambiar el email que recibe los comprobantes automáticamente:

**Frontend**: Edita `frontend/src/pages/BoletasFacturas.tsx` línea ~634:

```typescript
const emailConfigurado = 'nuevo-email@ejemplo.com';
```

**Backend**: Actualiza `.env`:

```env
MAIL_FROM_ADDRESS=nuevo-email@ejemplo.com
```

---

## 🔄 Alternativas a Gmail

### SendGrid (Recomendado para producción):

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=tu_sendgrid_api_key
MAIL_ENCRYPTION=tls
```

**Ventajas**: 100 emails/día gratis, sin límites de Gmail

### Mailgun:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=postmaster@tu-dominio.mailgun.org
MAIL_PASSWORD=tu_mailgun_password
MAIL_ENCRYPTION=tls
```

### Outlook/Hotmail:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.office365.com
MAIL_PORT=587
MAIL_USERNAME=tu-email@outlook.com
MAIL_PASSWORD=tu_app_password
MAIL_ENCRYPTION=tls
```

---

## ✅ Checklist de Configuración

- [ ] Verificación en 2 pasos activada en Gmail
- [ ] App Password generada
- [ ] Variables MAIL_* configuradas en `.env`
- [ ] Prueba con `php artisan tinker` exitosa
- [ ] Email recibido correctamente
- [ ] PDF y XML adjuntos funcionan
- [ ] Email configurado en frontend actualizado

---

## 📞 Soporte

Si tienes problemas, revisa los logs de Laravel:

```bash
tail -f backend/storage/logs/laravel.log
```

Los errores de email se registran con detalles completos.
