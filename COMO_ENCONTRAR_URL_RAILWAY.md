# Cómo Encontrar la URL Pública de Railway

## Método 1: Desde el Dashboard de Railway (Más Fácil) 🎯

1. **Accede a Railway:**
   - Ve a https://railway.app
   - Inicia sesión en tu cuenta

2. **Selecciona tu proyecto:**
   - Haz clic en el proyecto "Essenza-Bot" (o el nombre que le hayas dado)

3. **IMPORTANTE: Ve al SERVICIO, no a la configuración del proyecto:**
   - En la página del proyecto, verás una lista de **servicios** (services)
   - Haz clic en el servicio que está corriendo tu bot (generalmente tiene un nombre como "essenza-bot" o similar)
   - **NO vayas a "Project Settings"** (configuración del proyecto)

4. **Busca la URL pública en el servicio:**
   - Una vez dentro del servicio, busca la pestaña **"Settings"** del servicio (no del proyecto)
   - O busca en la parte superior del servicio un botón que diga **"Generate Domain"** o **"Networking"**
   - También puede aparecer directamente en la página principal del servicio como un enlace o badge

5. **Si no tienes dominio público:**
   - Ve a la pestaña **"Settings"** del SERVICIO (no del proyecto)
   - Busca la sección **"Networking"** o **"Public Domain"**
   - Haz clic en **"Generate Domain"** para crear una URL pública
   - Railway generará algo como: `tu-servicio-production.up.railway.app`

## Método 2: Desde los Logs del Bot 📋

Cuando el bot se inicia, deberías ver en los logs algo como:

```
🌐 SERVIDOR QR INICIADO
🔗 URL pública: https://tu-proyecto-production.up.railway.app/qr
   O visita: https://tu-proyecto-production.up.railway.app/
   Health check: https://tu-proyecto-production.up.railway.app/health
```

**Para ver los logs:**
1. En Railway, ve a tu proyecto
2. Haz clic en tu servicio
3. Ve a la pestaña **"Logs"** o **"Deployments"**
4. Busca el mensaje que dice "🌐 SERVIDOR QR INICIADO"

## Método 3: Desde Variables de Entorno 🔧

Railway automáticamente proporciona la variable `RAILWAY_PUBLIC_DOMAIN` cuando generas un dominio público.

**Para verificar:**
1. En Railway, ve a tu proyecto
2. Haz clic en tu servicio
3. Ve a la pestaña **"Variables"**
4. Busca `RAILWAY_PUBLIC_DOMAIN` - si existe, esa es tu URL (sin el `https://`)

## Método 4: Generar un Dominio Público (Si no tienes uno) 🆕

Si no tienes una URL pública aún:

1. **En Railway Dashboard:**
   - Ve a tu proyecto
   - **Haz clic en tu SERVICIO** (no en "Project Settings")
   - Ve a la pestaña **"Settings"** del servicio
   - Busca **"Networking"** o **"Public Domain"**
   - Haz clic en **"Generate Domain"**
   - Railway generará una URL automáticamente

2. **Alternativa - Desde la página principal del servicio:**
   - Algunas veces, en la página principal del servicio verás un botón o sección que dice **"Generate Domain"** o **"Networking"**
   - Haz clic ahí directamente

3. **O desde la CLI:**
   ```bash
   railway domain
   ```

## Método 5: Desde la CLI de Railway 💻

Si tienes Railway CLI instalado:

```bash
# Ver información del proyecto
railway status

# Ver variables de entorno (incluye RAILWAY_PUBLIC_DOMAIN)
railway variables

# Ver logs (la URL aparece cuando se inicia el servidor)
railway logs
```

## ¿Qué hacer si no aparece la URL? 🤔

1. **Verifica que el servicio esté corriendo:**
   - En Railway, asegúrate de que el estado del servicio sea "Running" (verde)

2. **Revisa los logs:**
   - Si ves errores, puede que el servidor no se haya iniciado correctamente
   - Busca mensajes de error en los logs

3. **Genera un dominio público:**
   - Si no tienes uno, genera un dominio público desde Settings

4. **Verifica el puerto:**
   - Railway asigna automáticamente el puerto
   - El código usa `process.env.PORT` que Railway proporciona automáticamente

## Formato de la URL 🎨

La URL de Railway generalmente tiene este formato:
```
https://[nombre-proyecto]-[ambiente].up.railway.app
```

Ejemplo:
```
https://essenza-bot-production.up.railway.app
```

Para acceder al QR, agrega `/qr` al final:
```
https://essenza-bot-production.up.railway.app/qr
```

## Solución Rápida ⚡

**La forma más rápida:**
1. Ve a https://railway.app
2. Selecciona tu proyecto
3. **Haz clic en tu SERVICIO** (el que está corriendo el bot, NO en "Project Settings")
4. Busca en la página del servicio:
   - Un botón que diga **"Generate Domain"** o **"Networking"** (puede estar en la parte superior)
   - O ve a **"Settings"** del servicio → **"Networking"**
5. Si no hay dominio, haz clic en **"Generate Domain"**
6. Copia la URL que aparece (algo como `tu-servicio-production.up.railway.app`)
7. Agrega `/qr` al final: `https://tu-servicio-production.up.railway.app/qr`
8. Abre esa URL en tu navegador

**⚠️ IMPORTANTE:** 
- El dominio se configura en el **SERVICIO**, no en la configuración del proyecto
- Si estás en "Project Settings" → "General", estás en el lugar equivocado
- Necesitas ir al servicio específico que está corriendo tu bot

¡Esa es la URL donde verás el QR! 🎉
