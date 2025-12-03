# Configuración de Variables de Entorno en Railway.com

## Guía para agregar la API Key de OpenAI en Railway

### Paso 1: Obtener tu API Key de OpenAI

1. Ve a https://platform.openai.com/api-keys
2. Inicia sesión o crea una cuenta
3. Haz clic en "Create new secret key"
4. Copia la clave (comienza con `sk-proj-` o `sk-`)

### Paso 2: Agregar la API Key en Railway (Variables de Entorno)

⚠️ **IMPORTANTE - Seguridad:**
- ✅ El archivo `.env` local está en `.gitignore` (línea 412) y **NO se subirá** al repositorio
- ✅ Para desarrollo local: puedes usar `.env` (está ignorado por Git)
- ✅ Para producción (Railway): **DEBES** configurar la API key como **Variable de Entorno** en Railway
- ⚠️ **NUNCA** incluyas la API key en ningún archivo del código fuente que se suba a Git

1. **Accede a tu proyecto en Railway:**
   - Ve a https://railway.app
   - Selecciona tu proyecto del bot

2. **Abre la configuración de Variables:**
   - En el menú lateral, haz clic en tu servicio (service)
   - Ve a la pestaña **"Variables"** o **"Environment"**
   - Aquí puedes agregar variables de entorno

3. **Agrega la variable:**
   - Haz clic en **"+ New Variable"** o **"+ Add Variable"**
   - **Nombre de la variable:** `OPENAI_API_KEY` (exactamente así, en mayúsculas)
   - **Valor:** Pega tu API key de OpenAI (ejemplo: `sk-proj-...`)
   - Haz clic en **"Add"** o **"Save"**

4. **Importante:**
   - ✅ Asegúrate de que el nombre sea exactamente `OPENAI_API_KEY` (en mayúsculas)
   - ✅ NO agregues comillas alrededor del valor
   - ✅ NO agregues espacios antes o después del valor
   - ✅ Railway aplicará los cambios automáticamente y reiniciará el servicio
   - ✅ Railway maneja las variables de forma segura (encriptadas y privadas)

### Paso 3: Verificar que funciona

Después de agregar la variable:
1. Railway reiniciará automáticamente tu servicio
2. Revisa los logs en Railway
3. Deberías ver: `✅ OpenAI inicializado correctamente`
4. Si ves: `⚠️ OpenAI no disponible`, verifica que:
   - El nombre de la variable sea exacto: `OPENAI_API_KEY`
   - El valor no tenga espacios extra
   - La API key sea válida

## Todas las Variables de Entorno Necesarias

### Variables Requeridas:

```env
ADMIN_NUMBER=51983104105@c.us
HORARIO_ATENCION=Lunes a Sábado: 11:00 AM - 6:00 PM
YAPE_NUMERO=953348917
YAPE_TITULAR=Esther Ocaña Baron
BANCO_CUENTA=19194566778095
UBICACION=Jiron Ricardo Palma 603, Puente Piedra, Lima, Perú
MAPS_LINK=https://maps.app.goo.gl/R5F8PGbcFufNADF39
DEPOSITO_RESERVA=20
```

### Variables Opcionales (pero recomendadas):

```env
OPENAI_API_KEY=sk-proj-tu-api-key-aqui
```

## Notas Importantes de Seguridad

🔒 **IMPORTANTE - Seguridad de la API Key:**
- ⚠️ **NUNCA** subas tu API key al repositorio Git
- ✅ El archivo `.env` está en `.gitignore` (línea 412) y **NO se subirá** al repositorio
- ✅ Para desarrollo local: puedes usar `.env` (está ignorado por Git)
- ✅ Para producción (Railway): **DEBES** configurar `OPENAI_API_KEY` como **Variable de Entorno** en Railway
- ✅ Railway maneja automáticamente las variables de entorno de forma segura
- ✅ Las variables en Railway están encriptadas y son privadas
- ✅ **NO** incluyas la API key en ningún archivo que se suba a Git

✅ **Formato correcto:**
- Nombre: `OPENAI_API_KEY`
- Valor: `sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

❌ **Formato incorrecto:**
- `OPENAI_API_KEY = sk-proj-...` (con espacios)
- `"sk-proj-..."` (con comillas)
- `OPENAI_API_KEY: sk-proj-...` (con dos puntos)

## Solución de Problemas

### El bot no usa la IA
1. Verifica que `OPENAI_API_KEY` esté configurada en Railway
2. Revisa los logs: debería aparecer `✅ OpenAI inicializado correctamente`
3. Si ves `⚠️ OpenAI no disponible`, la variable no está configurada correctamente

### Error al inicializar OpenAI
1. Verifica que la API key sea válida
2. Asegúrate de que no tenga espacios extra
3. Verifica que tengas créditos en tu cuenta de OpenAI

### El bot funciona pero sin IA
- Esto es normal si no configuraste `OPENAI_API_KEY`
- El bot funcionará con respuestas predefinidas
- Para habilitar la IA, agrega la variable `OPENAI_API_KEY`

