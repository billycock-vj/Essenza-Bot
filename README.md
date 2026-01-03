# 🤖 Essenza Bot - Bot de WhatsApp con IA

Bot de WhatsApp inteligente para Essenza Spa, desarrollado con Node.js, wppconnect y OpenAI.

## 📋 Características

- ✅ Integración con OpenAI (GPT-4o-mini) para respuestas inteligentes
- ✅ Gestión de reservas y recordatorios automáticos
- ✅ Sistema de logging configurable con rotación automática
- ✅ Sanitización de entrada del usuario
- ✅ Validación de datos y manejo robusto de errores
- ✅ Modo asesor humano (handoff)
- ✅ Estadísticas y métricas del bot

## 🚀 Instalación

### Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Chrome/Chromium (para wppconnect)
- Cuenta de WhatsApp
- API Key de OpenAI

### Pasos de Instalación

1. **Clonar o descargar el repositorio**
   ```bash
   cd Essenza-Bot
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crear un archivo `.env` en la raíz del proyecto:
   ```env
   # Configuración del Bot
   ADMIN_NUMBER=51983104105@c.us
   LOG_LEVEL=normal
   
   # Información del Spa
   HORARIO_ATENCION=Lunes a Jueves: 11:00 - 19:00, Viernes: 11:00 - 19:00, Sábado: 10:00 - 16:00, Domingo: Cerrado
   UBICACION=Jiron Ricardo Palma 603, Puente Piedra, Lima, Perú
   MAPS_LINK=https://maps.app.goo.gl/Fu2Dd9tiiiwptV5m6
   
   # Información de Pago
   YAPE_NUMERO=953348917
   YAPE_TITULAR=Esther Ocaña Baron
   BANCO_CUENTA=19194566778095
   DEPOSITO_RESERVA=20
   
   # OpenAI
   OPENAI_API_KEY=sk-proj-...
   ```

4. **Iniciar el bot**
   ```bash
   npm start
   ```

5. **Escanear el código QR**
   
   Al iniciar, se mostrará un código QR en la consola. Escanéalo con WhatsApp desde tu teléfono para conectar el bot.

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Requerido | Default |
|----------|-------------|-----------|---------|
| `ADMIN_NUMBER` | Número de WhatsApp del administrador | Sí | - |
| `OPENAI_API_KEY` | API Key de OpenAI | Sí | - |
| `LOG_LEVEL` | Nivel de logging: `silent`, `minimal`, `normal`, `verbose` | No | `normal` |
| `HORARIO_ATENCION` | Horario de atención del spa | No | Ver código |
| `UBICACION` | Dirección del spa | No | Ver código |
| `MAPS_LINK` | Link de Google Maps | No | Ver código |
| `YAPE_NUMERO` | Número de Yape | No | Ver código |
| `YAPE_TITULAR` | Titular de cuenta Yape | No | Ver código |
| `BANCO_CUENTA` | Número de cuenta bancaria | No | Ver código |
| `DEPOSITO_RESERVA` | Depósito requerido para reservas | No | `20` |

### Niveles de Logging

- **`silent`**: Solo errores críticos
- **`minimal`**: Errores y warnings
- **`normal`**: Errores, warnings y mensajes de éxito (recomendado)
- **`verbose`**: Todo, incluyendo información detallada

## 📱 Uso

### Comandos del Administrador

El administrador puede usar los siguientes comandos:

- **`/stats`** - Ver estadísticas del bot
- **`/activar-ia`** - Activar IA globalmente
- **`/desactivar-ia`** - Desactivar IA globalmente
- **`/asesor [número]`** - Activar modo asesor para un usuario
- **`/bot [número]`** - Desactivar bot para un usuario (solo admin responde)

### Flujo de Conversación

1. El usuario envía un mensaje
2. El bot procesa el mensaje con IA (si está activa)
3. El bot responde de forma natural y contextual
4. Si el usuario solicita una reserva, se activa el modo reserva
5. El administrador recibe notificación de nuevas reservas

## 📁 Estructura del Proyecto

```
Essenza-Bot/
├── main.js                 # Archivo principal del bot
├── package.json            # Dependencias y scripts
├── .env                    # Variables de entorno (no commitear)
├── logs/                   # Archivos de log (generados automáticamente)
├── tokens/                 # Tokens de sesión de WhatsApp
├── README.md              # Este archivo
├── INFORME_REVISION.md    # Informe de revisión técnica
└── CORRECCIONES_CRITICAS.md # Correcciones aplicadas
```

## 🔒 Seguridad

- ✅ Variables de entorno para datos sensibles
- ✅ Sanitización de entrada del usuario
- ✅ Sanitización de datos en logs (oculta números de teléfono)
- ✅ Validación de formato de números
- ✅ Rotación automática de logs (elimina logs > 30 días)

**⚠️ IMPORTANTE:** 
- Nunca commitees el archivo `.env` al repositorio
- Asegúrate de que `.env` esté en `.gitignore`
- Mantén tu API Key de OpenAI segura

## 🛠️ Desarrollo

### Scripts Disponibles

```bash
npm start          # Inicia el bot (ejecuta npm install primero)
```

### Mejoras Futuras

- [ ] Modularización del código
- [ ] Persistencia de datos (base de datos)
- [ ] Tests unitarios e integración
- [ ] API REST para gestión
- [ ] Dashboard web para estadísticas

## 🐛 Solución de Problemas

### El bot no se conecta

1. Verifica que Chrome/Chromium esté instalado
2. Revisa que no haya otra instancia del bot ejecutándose
3. Si hay problemas con tokens bloqueados, ejecuta:
   ```powershell
   .\limpiar-tokens.ps1
   ```

### Error de permisos en Windows

Si ves errores de `EPERM` o archivos bloqueados:
1. Cierra todas las ventanas de Chrome
2. Ejecuta `limpiar-tokens.ps1`
3. Reinicia el bot

### La IA no responde

1. Verifica que `OPENAI_API_KEY` esté configurada en `.env`
2. Verifica que la API key sea válida
3. Revisa los logs para ver errores específicos

### Logs excesivos

Ajusta `LOG_LEVEL` en `.env`:
- Para producción: `LOG_LEVEL=normal`
- Para desarrollo: `LOG_LEVEL=verbose`
- Para silencioso: `LOG_LEVEL=minimal`

## 📊 Logs

Los logs se guardan en la carpeta `logs/` con el formato:
- `bot-YYYY-MM-DD.log` - Un archivo por día

Los logs se rotan automáticamente eliminando archivos mayores a 30 días.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la licencia ISC.

## 👤 Autor

Desarrollado para Essenza Spa.

## 🙏 Agradecimientos

- [wppconnect-team/wppconnect](https://github.com/wppconnect-team/wppconnect) - Librería de WhatsApp
- [OpenAI](https://openai.com/) - API de IA
- [qrcode-terminal](https://github.com/gtanner/qrcode-terminal) - Generación de QR en consola

---

**⚠️ Nota Legal:** Este bot utiliza la API no oficial de WhatsApp. Úsalo bajo tu propio riesgo. WhatsApp puede prohibir cuentas que usen bots no oficiales.

