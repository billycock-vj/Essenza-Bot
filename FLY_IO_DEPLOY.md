# 🚀 Guía de Despliegue en Fly.io - Versión Simplificada

Esta guía te ayudará a desplegar Essenza Bot (versión simplificada) en Fly.io.

## 📋 Requisitos Previos

1. Cuenta en [Fly.io](https://fly.io)
2. [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) instalado
3. API Key de OpenAI

## 🔧 Configuración Inicial

### 1. Instalar Fly CLI

```bash
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# macOS/Linux
curl -L https://fly.io/install.sh | sh
```

### 2. Autenticarse en Fly.io

```bash
fly auth login
```

### 3. Crear el Volumen de Datos

Los tokens de sesión de WhatsApp se guardan en un volumen persistente:

```bash
fly volumes create data --size 3 --region gru
```

> **Nota:** El tamaño mínimo es 3GB, suficiente para tokens de sesión.

## 🚀 Despliegue

### Opción 1: Despliegue Inicial (Primera Vez)

```bash
# Desde el directorio del proyecto
fly launch
```

Cuando te pregunte:
- **App name:** `essenza-bot` (o el que prefieras)
- **Region:** `gru` (São Paulo, más cerca de Perú)
- **Postgres/Redis:** No (no los necesitamos)
- **Deploy now:** Sí

### Opción 2: Despliegue con Configuración Existente

Si ya tienes el `fly.toml` configurado:

```bash
fly deploy
```

## 🔐 Configurar Variables de Entorno

Configura las variables de entorno necesarias:

```bash
# OpenAI API Key (OBLIGATORIO)
fly secrets set OPENAI_API_KEY=sk-tu-api-key-aqui
```

### Verificar Variables Configuradas

```bash
fly secrets list
```

## 📊 Monitoreo y Logs

### Ver Logs en Tiempo Real

```bash
fly logs
```

### Ver Estado de la Aplicación

```bash
fly status
```

### Acceder a la Consola de la App

```bash
fly ssh console
```

## 🔍 Verificar que Funciona

### 1. Health Check

El bot expone un endpoint de health check:

```bash
curl https://essenza-bot.fly.dev/health
```

Debería retornar:
```json
{"status":"ok","service":"essenza-bot"}
```

### 2. Ver Logs del QR

```bash
fly logs
```

Busca el mensaje que muestra el QR code. Deberías ver algo como:
```
📱 ESCANEA ESTE QR CON WHATSAPP
```

### 3. Escanear QR

1. Abre WhatsApp en tu teléfono
2. Ve a Configuración > Dispositivos vinculados
3. Escanea el QR que aparece en los logs

## 🛠️ Solución de Problemas

### El bot no inicia

1. Verifica que `OPENAI_API_KEY` esté configurada:
   ```bash
   fly secrets list
   ```

2. Revisa los logs:
   ```bash
   fly logs
   ```

### El QR no aparece

1. Verifica que el volumen esté montado:
   ```bash
   fly ssh console
   ls -la /data/tokens
   ```

2. Si no existe, verifica `fly.toml`:
   ```toml
   [mounts]
   source = "data"
   destination = "/data"
   ```

### Health Check Falla

1. Verifica que el puerto sea 3000:
   ```bash
   fly ssh console
   netstat -tuln | grep 3000
   ```

2. Revisa los logs para errores:
   ```bash
   fly logs
   ```

### Aumentar Memoria o CPU

Edita `fly.toml`:

```toml
[[vm]]
memory = "2gb"  # Aumentar memoria
cpus = 2        # Aumentar CPUs
```

Luego despliega:
```bash
fly deploy
```

## 📝 Estructura de Datos en Fly.io

En Fly.io, los tokens se guardan en `/data`:

```
/data/
└── tokens/              # Tokens de sesión WhatsApp
    └── essenza-bot/
        └── Default/
```

## 🔒 Seguridad

- **Nunca** subas el archivo `.env` al repositorio
- Usa `fly secrets set` para variables sensibles
- El volumen `/data` es privado y solo accesible desde tu app

## 💰 Costos

Fly.io ofrece:
- **Plan Gratuito:** 3 máquinas compartidas con 256MB RAM
- **Plan Pago:** Desde $1.94/mes por máquina con 1GB RAM

Para este bot, recomendamos al menos 1GB de RAM debido a Chromium.

## 📚 Recursos Adicionales

- [Documentación de Fly.io](https://fly.io/docs/)
- [Fly.io Volumes](https://fly.io/docs/reference/volumes/)
- [Fly.io Secrets](https://fly.io/docs/reference/secrets/)

## ✅ Checklist de Despliegue

- [ ] Fly CLI instalado y autenticado
- [ ] Volumen `data` creado
- [ ] Variable de entorno configurada (`OPENAI_API_KEY`)
- [ ] Aplicación desplegada (`fly deploy`)
- [ ] Health check funcionando (`/health`)
- [ ] QR code visible en logs
- [ ] Sesión de WhatsApp conectada
- [ ] Logs verificados sin errores críticos

---

¡Listo! Tu bot debería estar funcionando en Fly.io. 🎉
