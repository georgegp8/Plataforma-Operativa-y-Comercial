# ROTOCOLO OFICIAL DE ENTREGA TÉCNICA DE PROYECTOS

## (Entrega Formal + Repositorio Oficial + Hyscloud/Nextcloud)

**Empresa:** \___________________________\_  
 **Proyecto:** \___________________________\_  
 **Equipo:** \___________________________\_  
 **Repositorio oficial (URL):** \___________________________\_  
 **Hyscloud (Nextcloud) – Ruta del proyecto:** \___________________________\_  
 **Versión de entrega (tag/commit):** \___________________________\_  
 **Fecha de entrega:** \___\_ / \___\_ / \_____\_

---

## 1. Objetivo

Establecer los requisitos **obligatorios** para la entrega de proyectos, asegurando que:

1. El equipo de redes/infra pueda **desplegar sin ayuda** del desarrollador.
2. La continuidad del proyecto sea posible por terceros (nuevo dev / mantenimiento).
3. Todo quede **auditado y trazable** mediante:

- Repositorio oficial (código y cambios)
- Hyscloud/Nextcloud (videos, documentación, evidencias)
- Identificación de responsables por módulo (si participaron varias personas)

---

## 2. Política de Entrega (Reglas no negociables)

La entrega se considera válida **solo** si:

- ✅ El proyecto está **100% actualizado en el repositorio oficial** (donde fueron agregados como colaboradores).
- ✅ Todos los **videos son con voz** (obligatorio).
- ✅ Todos los videos y documentación están **subidos en Hyscloud (Nextcloud)** en la carpeta asignada al proyecto.
- ✅ Existe documentación mínima técnica para:
  - Despliegue (redes/infra)
  - Operación (logs, reinicios, backups)
  - Continuidad (seguir desarrollando)
- ✅ Si hubo varias personas, existe matriz “quién hizo qué” y responsables.

No se aceptará:

- ❌ Videos sin voz
- ❌ Videos fuera de Hyscloud
- ❌ Entrega por cuentas personales o links externos temporales
- ❌ Código final solo en local
- ❌ Repositorio sin commit/tag final de entrega
- ❌ Documentación incompleta
- ❌ Proyecto que requiere al dev para levantar

---

## 3. Repositorio Oficial (OBLIGATORIO Y AUDITADO)

### 3.1 Condiciones obligatorias del repositorio

- Código final actualizado en branch definido (ej: `main` o `master`).
- Existe commit final de entrega.
- Se crea un **tag/release** obligatorio:
  - Ejemplo: `v1.0-entrega`, `release-2026-02-19`.
- Archivos obligatorios:
  - `README.md`
  - `.env.example`
  - `docs/` con documentación mínima
- Prohibido:
  - Credenciales reales
  - Claves privadas
  - Tokens productivos
  - Contraseñas hardcodeadas

> Si el repositorio no está actualizado en el repo oficial asignado, la entrega queda inválida.

---

## 4. Hyscloud (Nextcloud) – Entrega de Videos y Documentación (OBLIGATORIO)

### 4.1 Ubicación obligatoria

Todos los archivos de entrega deben subirse a:

✅ **Hyscloud (Nextcloud) – cuenta asignada al proyecto/equipo**  
 ✅ En la **ruta/carpeta oficial del proyecto** indicada por la empresa

> No se aceptan videos en Drive personal, WhatsApp, YouTube personal o enlaces temporales.

---

## 5. Estructura obligatoria en Hyscloud (Nextcloud)

En la carpeta del proyecto (asignada), debe existir esta estructura:

```
/Proyecto-Nombre/ ├── 01_Videos/ ├── 02_Documentacion/ ├── 03_Evidencias/ ├── 04_Release/ └── 05_Operaciones/
```

### 5.1 01_Videos (OBLIGATORIO – CON VOZ)

Debe contener 3 videos mínimos:

- `01_Funcionamiento_General.mp4`
- `02_Despliegue_Tecnico.mp4`
- `03_Continuidad_Desarrollo.mp4`

**Reglas de los videos**

- Deben ser **con voz clara** (humana).
- Mostrar pantalla y pasos reales (no solo slides).
- Resolución mínima: 720p.
- Formato recomendado: MP4.
- Audio: sin música, sin ruidos fuertes, explicación entendible.
- Si el video está acelerado, debe tener explicación clara igual (no recomendado).

---

## 6. Contenido obligatorio por video (DETALLADO)

## 🎥 Video 1 — Funcionamiento General (con voz)

**Objetivo:** Que cualquiera entienda qué hace el sistema y cómo se usa.

Debe incluir:

1. **Introducción**
   - Nombre del proyecto
   - Objetivo del sistema
   - Problema que resuelve
   - Perfil del usuario final
2. **Arquitectura a nivel usuario**
   - Qué es frontend / backend / BD (si aplica)
   - Qué módulos existen y qué hace cada uno
3. **Flujo completo**
   - Login (si existe)
   - Navegación por módulos
   - Crear/editar/eliminar (si aplica)
   - Reportes/listados (si aplica)
   - Configuraciones (si aplica)
4. **Roles y permisos**
   - Qué roles existen
   - Qué puede hacer cada rol
   - Cómo se valida el acceso
5. **Casos de uso**
   - 2–3 casos reales demostrados (ej: registrar cliente, generar reporte, etc.)
6. **Errores y validaciones**
   - Mostrar al menos 1 caso real:
     - dato inválido
     - sin permisos
     - error controlado (y qué mensaje aparece)

---

## 🎥 Video 2 — Despliegue Técnico (con voz) **CRÍTICO PARA REDES**

**Objetivo:** Que redes/infra despliegue el sistema sin depender del desarrollador.

Debe incluir, paso a paso:

### A) Requisitos del entorno

- CPU/RAM/Disco recomendados
- SO recomendado (ej: Debian/Ubuntu)
- Dependencias necesarias (node, docker, nginx, postgres, redis, etc.)
- Puertos usados (lista completa)

### B) Preparación del servidor

- Instalación de dependencias
- Ajustes necesarios (firewall, permisos, directorios)
- Estructura de carpetas en servidor

### C) Obtención de código

- Clonar repo oficial
- Checkout del tag/commit final de entrega

### D) Variables de entorno

- Explicar `.env.example`
- Qué variables son obligatorias
- Qué valores deben colocarse
- Diferenciar dev vs prod
- Cómo guardar `.env` correctamente

### E) Construcción/ejecución (según stack)

- Instalación dependencias: `npm install` / `composer install`
- Build: `npm run build`
- Run: `pm2` / `systemd` / `docker compose`

### F) Base de datos

- Crear base de datos
- Ejecutar migraciones
- Seed inicial si existe
- Credenciales y conexión

### G) Reverse proxy / Nginx (si aplica)

- Config de Nginx o proxy
- Dominio/subdominio (si aplica)
- HTTPS/TLS (si aplica)
- Rutas y puertos mapeados

### H) Verificación final (obligatorio)

- Cómo validar backend
- Cómo validar frontend
- Endpoint de health-check (si existe)
- Comando o URL de prueba
- Captura real de “funcionando”

### I) Logs y troubleshooting básico

- Dónde están los logs
- Comandos para ver logs
- Problemas comunes y solución rápida (mínimo 3)

---

## 🎥 Video 3 — Continuidad de Desarrollo (con voz)

**Objetivo:** Que otro desarrollador pueda continuar el proyecto sin “reinventarlo”.

Debe incluir:

1. **Estructura del repositorio**
   - Carpetas principales
   - Separación frontend/backend
   - Patrón (MVC, Clean, modular, etc.)
2. **Explicación por módulos**
   - Qué módulo existe y dónde vive en el código
   - Cómo se conectan los módulos
3. **Base de datos**
   - Tablas principales
   - Relaciones clave
   - Migraciones y ubicación
4. **Cómo agregar nuevas funcionalidades**
   - Cómo agregar un endpoint nuevo
   - Cómo agregar una vista/página nueva
   - Cómo seguir el patrón del proyecto
5. **Deuda técnica / pendientes**
   - Lista clara de pendientes
   - Qué quedó “a medias”
   - Qué decisiones se tomaron y por qué
6. **Bugs conocidos**
   - Lista de bugs conocidos
   - Cómo reproducirlos
   - Qué parte del código afecta

---

## 7. Documentación obligatoria en Hyscloud (Nextcloud)

En `02_Documentacion/` deben subir como mínimo:

- `README.md` (resumen general)
- `ARQUITECTURA.md` (arquitectura y componentes)
- `DESPLIEGUE.md` (paso a paso para redes)
- `OPERACION.md` (cómo operar en producción)
- `CONTINUIDAD.md` (cómo continuar desarrollo)
- `RESPONSABILIDADES.md` (si hubo varias personas)
- Diagrama de arquitectura (PNG/PDF)

---

## 8. Proyecto desarrollado por varias personas (OBLIGATORIO)

Si trabajaron varias personas, deben entregar:

### 8.1 `RESPONSABILIDADES.md`

Debe contener:

- Nombre completo
- Rol
- Módulos desarrollados
- Entregables concretos
- Responsable final por módulo
- Contacto

Ejemplo:

- Auth/Login → Juan Pérez (responsable)
- Dashboard → María Torres (responsable)
- API Clientes → Luis Ramos (responsable)
- Docker/Nginx → Carlos Díaz (responsable)

### 8.2 “Handover interno”

Cada responsable debe explicar en el Video 3 o en `CONTINUIDAD.md`:

- decisiones técnicas del módulo
- puntos críticos
- qué falta

---

## 9. Evidencias y Release (Hyscloud)

### 9.1 `03_Evidencias/`

- Capturas del sistema funcionando
- Pruebas (si existen)
- Postman collection / Insomnia (si aplica)
- Evidencia de endpoints

### 9.2 `04_Release/`

- Copia del `.env.example`
- Archivo de configuración Nginx (si aplica)
- `docker-compose.yml` final (si aplica)
- Scripts de instalación (si existen)
- Export o dump de BD (solo si aplica y permitido)

### 9.3 `05_Operaciones/`

- Guía de backups
- Restauración
- Procedimiento de actualización (pull + restart)
- Rollback (volver a tag anterior)

---

## 10. Criterios de aceptación (Validación final)

La entrega se considera oficialmente “OK” solo si:

- ✅ Repositorio oficial actualizado + tag/release final
- ✅ Videos con voz en Hyscloud (Nextcloud)
- ✅ Documentación completa en Hyscloud
- ✅ Matriz de responsables si hubo varias personas
- ✅ Redes despliega sin depender del dev
- ✅ Sistema validado con pruebas mínimas

---

## 11. Cláusula de invalidez de entrega

La entrega queda inválida si:

- ❌ Falta cualquier video o no tiene voz
- ❌ Videos no están en Hyscloud (Nextcloud)
- ❌ Repo no está actualizado o sin tag final
- ❌ No existe documentación de despliegue
- ❌ No existe matriz de responsables (si hubo varios devs)

```markdown
# CHECKLIST OFICIAL DE ENTREGA Y EVALUACIÓN DE PROYECTOS

**Proyecto:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\
**Equipo:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\
**Repositorio Oficial:**
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\
**Ruta Hyscloud (Nextcloud):**
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\
**Fecha de Evaluación:**
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\
**Evaluador:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

------------------------------------------------------------------------

## 1. VALIDACIÓN DEL REPOSITORIO OFICIAL

-   [ ] Código actualizado en el repositorio oficial.
-   [ ] Existe commit final de entrega.
-   [ ] Se creó tag/release de versión (ej: v1.0-entrega).
-   [ ] README.md completo.
-   [ ] .env.example documentado.
-   [ ] Carpeta /docs con documentación mínima.
-   [ ] No existen credenciales reales en el código.

------------------------------------------------------------------------

## 2. VALIDACIÓN DE VIDEOS (Hyscloud - Nextcloud)

-   [ ] Videos subidos en la cuenta Hyscloud asignada al proyecto.
-   [ ] Video 1 -- Funcionamiento General (con voz clara).
-   [ ] Video 2 -- Despliegue Técnico (con voz y pasos completos).
-   [ ] Video 3 -- Continuidad y Estructura (con voz).
-   [ ] Videos muestran pruebas reales de funcionamiento.
-   [ ] Se explican variables de entorno y despliegue.
-   [ ] Se explican logs y troubleshooting básico.

------------------------------------------------------------------------

## 3. DOCUMENTACIÓN EN Hyscloud

-   [ ] README.md subido.
-   [ ] DESPLIEGUE.md subido.
-   [ ] OPERACION.md subido.
-   [ ] CONTINUIDAD.md subido.
-   [ ] ARQUITECTURA.md subido.
-   [ ] RESPONSABILIDADES.md (si participaron varias personas).
-   [ ] Diagrama de arquitectura (PNG/PDF).

------------------------------------------------------------------------

## 4. EVALUACIÓN DE DESEMPEÑO TÉCNICO

-   [ ] Participa activamente en soluciones (Excelente / Buena / Regular
    / Baja).
-   [ ] Realiza pruebas y aplica mejoras (Excelente / Buena / Regular /
    Baja).
-   [ ] Trabajo en equipo y comunicación efectiva (Excelente / Buena /
    Regular / Baja).
-   [ ] Aplica criterios de calidad y seguridad (Excelente / Buena /
    Regular / Baja).

------------------------------------------------------------------------

## 5. VALIDACIÓN FINAL

-   [ ] Redes puede desplegar el sistema sin asistencia.
-   [ ] Proyecto funcional tras pruebas básicas.
-   [ ] Responsables por módulo identificados.
-   [ ] Se cumplen todos los requisitos obligatorios.

------------------------------------------------------------------------

## RESULTADO FINAL

-   [ ] Aprobado\
-   [ ] Observado\
-   [ ] Rechazado

------------------------------------------------------------------------

## OBSERVACIONES GENERALES

------------------------------------------------------------------------

------------------------------------------------------------------------

------------------------------------------------------------------------

------------------------------------------------------------------------

**Firma Evaluador:**
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\
**Firma Responsable Técnico:**
\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
```