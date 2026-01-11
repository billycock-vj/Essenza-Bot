# 🤖 Essenza Bot - Versión Simplificada

Bot de WhatsApp inteligente para Essenza Spa usando solo IA (OpenAI). Versión simplificada sin lógica compleja de reservas, base de datos, etc.

## ✨ Características

- ✅ **Solo IA**: Responde automáticamente usando OpenAI GPT-4o-mini
- ✅ **Simple**: Sin base de datos, sin estados complejos, sin lógica de reservas
- ✅ **Fácil de mantener**: Solo un archivo principal (`main.js`)
- ✅ **Información completa**: Toda la información de Essenza en `ESSENZA_KNOWLEDGE_BASE.md`

## 🚀 Instalación Rápida

### 1. Requisitos

- Node.js 18+
- Cuenta de WhatsApp
- API Key de OpenAI

### 2. Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env y agregar tu OPENAI_API_KEY
```

### 3. Configurar `.env`

```env
OPENAI_API_KEY=sk-proj-tu-api-key-aqui
PORT=3000
```

### 4. Iniciar el bot

```bash
npm start
```

### 5. Escanear QR

Al iniciar, se mostrará un código QR en la consola. Escanéalo con WhatsApp desde tu teléfono.

## 📁 Estructura del Proyecto

```
Essenza-Bot/
├── main.js                      # Archivo principal (todo el bot)
├── ESSENZA_KNOWLEDGE_BASE.md    # Información de Essenza para la IA
├── package.json                 # Dependencias
├── .env                         # Variables de entorno
└── tokens/                      # Tokens de sesión (generado automáticamente)
```

## 🎯 Cómo Funciona

1. **Recibe mensaje** de WhatsApp
2. **Consulta OpenAI** con:
   - Información de Essenza (servicios, precios, horarios, etc.)
   - Historial de la conversación
3. **Responde** automáticamente al cliente

## 📝 Personalizar Información de Essenza

Edita el archivo `ESSENZA_KNOWLEDGE_BASE.md` para actualizar:
- Servicios y precios
- Horarios
- Métodos de pago
- Ubicación
- Cualquier información del spa

La IA usará automáticamente esta información para responder.

## 🔧 Configuración Avanzada

### Cambiar modelo de OpenAI

En `main.js`, línea ~150, cambia:
```javascript
model: "gpt-4o-mini",  // Cambiar a "gpt-4", "gpt-3.5-turbo", etc.
```

### Ajustar temperatura (creatividad)

En `main.js`, línea ~151:
```javascript
temperature: 0.7,  // 0.0 = más preciso, 1.0 = más creativo
```

### Cambiar límite de tokens

En `main.js`, línea ~152:
```javascript
max_tokens: 500,  // Máximo de palabras en la respuesta
```

## 🚢 Despliegue

### Fly.io (Recomendado)

```bash
# 1. Instalar flyctl
# https://fly.io/docs/getting-started/installing-flyctl/

# 2. Login
fly auth login

# 3. Crear volumen para tokens persistentes
fly volumes create data --size 3 --region gru

# 4. Crear app (primera vez)
fly launch

# 5. Configurar variable de entorno
fly secrets set OPENAI_API_KEY=tu-api-key

# 6. Desplegar
fly deploy
```

**Ver guía completa:** [FLY_IO_DEPLOY.md](./FLY_IO_DEPLOY.md)

### Railway

1. Conecta tu repositorio
2. Agrega variable de entorno: `OPENAI_API_KEY`
3. Railway detectará automáticamente Node.js

## 📊 Monitoreo

El bot incluye un endpoint de health check:
- `GET /health` - Retorna `{ status: 'ok' }`

Útil para monitoreo en producción.

## ⚠️ Limitaciones

- **Sin persistencia**: Las conversaciones se pierden al reiniciar el bot
- **Sin reservas automáticas**: La IA solo informa, no crea reservas
- **Sin base de datos**: No hay historial permanente

Si necesitas estas funcionalidades, considera usar la versión completa del bot.

## 🆘 Solución de Problemas

### El bot no inicia

- Verifica que `OPENAI_API_KEY` esté configurada en `.env`
- Asegúrate de tener Node.js 18+

### El QR no aparece

- Revisa los logs para ver errores
- Elimina la carpeta `tokens/` y reinicia

### La IA no responde correctamente

- Verifica que `ESSENZA_KNOWLEDGE_BASE.md` tenga la información correcta
- Revisa los logs para ver errores de OpenAI

## 📚 Recursos

- [Documentación de wppconnect](https://wppconnect-team.github.io/wppconnect/)
- [Documentación de OpenAI](https://platform.openai.com/docs)
- [Base de Conocimiento de Essenza](./ESSENZA_KNOWLEDGE_BASE.md)

## 📝 Licencia

ISC

---

**Desarrollado para Essenza Spa** 💆‍♀️
