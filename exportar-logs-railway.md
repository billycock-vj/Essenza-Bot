# Cómo Exportar Logs de Railway

## Método 1: Desde el Dashboard de Railway (Más Fácil)

1. **Accede a Railway:**
   - Ve a https://railway.app
   - Inicia sesión en tu cuenta

2. **Navega a tu proyecto:**
   - Selecciona el proyecto "Essenza-Bot" o el nombre que le hayas dado

3. **Ve a la pestaña de Logs:**
   - Haz clic en tu servicio (service)
   - Busca la pestaña **"Logs"** o **"Deployments"**
   - Los logs aparecerán en tiempo real

4. **Exportar logs:**
   - Selecciona todo el texto de los logs (Ctrl+A / Cmd+A)
   - Copia (Ctrl+C / Cmd+C)
   - Pega en un archivo de texto o documento

## Método 2: Usando la CLI de Railway (Recomendado)

### Instalación

```bash
# Instalar Railway CLI globalmente
npm install -g @railway/cli
```

### Uso

```bash
# 1. Iniciar sesión en Railway
railway login

# 2. Seleccionar tu proyecto (si tienes varios)
railway link

# 3. Ver logs en tiempo real
railway logs

# 4. Exportar logs a un archivo
railway logs > railway-logs.txt

# 5. Exportar últimos 1000 líneas
railway logs --tail 1000 > railway-logs.txt

# 6. Ver logs de un servicio específico
railway logs --service nombre-del-servicio
```

### Ejemplo Completo

```bash
# Exportar todos los logs a un archivo
railway logs > logs-railway-$(date +%Y%m%d-%H%M%S).txt

# Ver solo los últimos 500 líneas
railway logs --tail 500

# Seguir los logs en tiempo real (como tail -f)
railway logs --follow
```

## Método 3: Desde el Navegador (Copiar y Pegar)

1. Abre Railway en tu navegador
2. Ve a la sección de Logs
3. Usa las herramientas de desarrollador del navegador:
   - Presiona `F12` para abrir DevTools
   - Ve a la pestaña "Console" o "Network"
   - Los logs también pueden estar disponibles en la consola del navegador

## Método 4: Configurar Webhook de Logs (Avanzado)

Si necesitas exportar logs automáticamente, puedes configurar un webhook en Railway que envíe los logs a un servicio externo.

## Variables de Entorno Útiles

Railway también permite exportar las variables de entorno:

```bash
# Ver variables de entorno
railway variables

# Exportar variables a un archivo .env
railway variables > .env.railway
```

## Consejos

- **Filtrado:** Los logs pueden ser muy largos, usa `grep` o busca en el archivo exportado
- **Formato:** Los logs de Railway incluyen timestamps y metadata
- **Retención:** Railway mantiene logs por un período limitado, exporta regularmente si necesitas historial

## Ejemplo de Script para Exportar Logs Automáticamente

```bash
#!/bin/bash
# exportar-logs.sh

# Exportar logs con timestamp
FECHA=$(date +%Y%m%d-%H%M%S)
railway logs > "logs/railway-${FECHA}.txt"

echo "✅ Logs exportados a logs/railway-${FECHA}.txt"
```
