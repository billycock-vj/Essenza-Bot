/**
 * ESSENZA BOT - Flujo simple
 *
 * Solo 3 cosas para clientes:
 * 1. Saludar condicional a horario
 * 2. Mandar imágenes (carpeta imagenes/)
 * 3. Preguntar para cuándo le gustaría la reserva
 *
 * Los administradores siguen teniendo todos los comandos.
 */

require("dotenv").config();
const wppconnect = require("@wppconnect-team/wppconnect");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const http = require("http");
const config = require("./config");
const paths = require("./config/paths");
const adminHandler = require("./handlers/admin");
const db = require("./services/database");
const flujoSimple = require("./handlers/flujoSimple");
const followUp = require("./handlers/followUp");
const leadClassification = require("./handlers/leadClassification");

// Módulos de funcionalidades (admin, flujo simple, seguimientos)
const storiesAutomation = require("./handlers/storiesAutomation");
const messageHelpers = require("./handlers/messageHelpers");

// Nuevos módulos de mejoras críticas
const { logMessage, logError } = require("./utils/logger");
const { 
  ExternalServiceError, 
  RateLimitError, 
  normalizeError 
} = require("./utils/errors");
const { openAIRateLimiter, withRateLimit } = require("./utils/rateLimiter");
const { iniciarBackupsAutomaticos } = require("./services/backup");

// Servicios refactorizados
const MessageService = require("./services/messageService");
const ConversationService = require("./services/conversationService");
const AIService = require("./services/aiService");

// ============================================
// CONFIGURACIÓN
// ============================================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;

// Detectar si estamos en Fly.io (paths ya definidos en config/paths.js)
const IS_FLY_IO = paths.IS_FLY_IO;
const TOKENS_PATH = paths.TOKENS_PATH;

// Asegurar que el directorio de tokens existe
try {
  if (!fs.existsSync(TOKENS_PATH)) {
    fs.mkdirSync(TOKENS_PATH, { recursive: true });
  }
} catch (error) {
  console.warn(`⚠️ No se pudo crear directorio de tokens: ${error.message}`);
}

if (!OPENAI_API_KEY) {
  logError(new Error("OPENAI_API_KEY no configurada en .env"), { 
    tipo: 'configuracion',
    critico: true 
  });
  process.exit(1);
}

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Cargar información de Essenza desde el archivo de conocimiento
let ESSENZA_KNOWLEDGE = "";
try {
  ESSENZA_KNOWLEDGE = fs.readFileSync(
    path.join(__dirname, "ESSENZA_KNOWLEDGE_BASE.md"),
    "utf-8"
  );
  logMessage('SUCCESS', 'Base de conocimiento de Essenza cargada correctamente');
} catch (error) {
  logError(error, { 
    contexto: 'Carga de ESSENZA_KNOWLEDGE_BASE.md',
    usandoDefault: true 
  });
  ESSENZA_KNOWLEDGE = `
# Essenza Spa

**Ubicación:** Jiron Ricardo Palma 603, Puente Piedra, Lima, Perú
**Mapa:** https://maps.app.goo.gl/Fu2Dd9tiiiwptV5m6

**Horario:**
- Lunes a Domingo: 11:00 AM - 6:00 PM

**Métodos de Pago:**
- Yape: 953348917 (Esther Ocaña Baron)
- Banco: 19194566778095

**Servicios:**
- Masaje Relajante: S/35
- Masaje Descontracturante: S/35
- Masaje Terapéutico: S/45
- Limpieza Facial Básica: S/30
- Limpieza Facial Profunda: S/60
`;
}

// Sistema de prompt para la IA
const SYSTEM_PROMPT = `${ESSENZA_KNOWLEDGE}

INSTRUCCIONES:
- Eres Essenza AI, asistente virtual del spa ESSENZA
- Responde siempre en español peruano
- Sé cálido, relajante, profesional y humano
- NO repitas saludos si ya saludaste antes en esta conversación
- Si el cliente pregunta por servicios, da precios exactos
- Si pregunta por horarios, da el horario específico del día (verificar qué día es hoy/mañana)
- Si pregunta por ubicación, proporciona la dirección y el mapa
- Si pregunta por pagos, da la información de Yape y banco
- Si el cliente quiere reservar, explica el proceso de depósito (S/20 para todos los servicios)
- Si no sabes algo, di que consultarás y te pondrás en contacto
- Mantén las respuestas concisas pero completas (máximo 300 palabras)

IMPORTANTE: El depósito se descuenta del total del servicio.`;

// ============================================
// SERVIDOR HTTP PARA HEALTH CHECKS Y MONITOREO
// ============================================
const monitoringService = require('./services/monitoring');

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/health' || req.url === '/') {
      const health = await monitoringService.healthCheck();
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(health, null, 2));
    } else if (req.url === '/metrics') {
      const metrics = monitoringService.getMetrics();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(metrics, null, 2));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'error', 
      message: error.message 
    }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  logMessage('SUCCESS', `Servidor HTTP iniciado en puerto ${PORT}`);
  if (IS_FLY_IO) {
    logMessage('INFO', `Fly.io: Health check disponible en https://${process.env.FLY_APP_NAME}.fly.dev/health`);
  }
});

// ============================================
// GESTIÓN DE CONVERSACIONES
// ============================================
// Servicio de conversaciones (reemplaza Map directo)
let conversationService = null;

// ============================================
// SERVICIOS (inicializados después de conectar)
// ============================================
let messageService = null;
let aiService = null;

// ============================================
// INICIALIZACIÓN DEL BOT
// ============================================
logMessage('INFO', '🚀 Iniciando Essenza Bot...');
logMessage('INFO', '📚 Cargando información de Essenza...');

// Inicializar base de datos
(async () => {
  try {
    await db.inicializarDB();
    await db.migrarBaseDatos();
    logMessage('SUCCESS', 'Base de datos inicializada correctamente');
    
    // Iniciar sistema de backups automáticos
    iniciarBackupsAutomaticos({
      cronSchedule: '0 2 * * *', // 2 AM diario
      diasRetencion: 30
    });
  } catch (error) {
    logError(error, { contexto: 'inicializacionDB' });
  }
})();

logMessage('SUCCESS', 'Bot listo. Esperando mensajes...');

// Inicializar base de datos (crear tablas si no existen)
async function iniciarBot() {
  try {
    logMessage('INFO', 'Inicializando base de datos...');
    await db.inicializarDB();
    logMessage('SUCCESS', 'Base de datos inicializada correctamente');
  } catch (error) {
    logError(error, { contexto: 'inicializacionDB' });
    logMessage('WARNING', 'Continuando sin base de datos (algunos comandos pueden no funcionar)');
  }

  logMessage('SUCCESS', 'Bot listo. Esperando mensajes...');
  
  // Continuar con la inicialización de wppconnect
  iniciarWppConnect();
}

function iniciarWppConnect() {

// NOTA: No limpiar tokens para mantener la sesión persistente
// Si necesitas forzar un nuevo QR, ejecuta manualmente el script limpiar-tokens.ps1
// o elimina la carpeta tokens/essenza-bot/Default

wppconnect
  .create({
    session: "essenza-bot",
    autoClose: false,
    disableWelcome: true,
    multiDevice: false,
    folderNameToken: TOKENS_PATH,
    headless: true,
    catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
      console.clear();
      console.log("\n" + "=".repeat(70));
      console.log("📱 ESCANEA ESTE QR CON WHATSAPP");
      console.log("=".repeat(70) + "\n");
      
      if (asciiQR) {
        console.log(asciiQR);
      } else if (urlCode) {
        console.log("QR URL:", urlCode);
      }
      
      console.log("\n" + "=".repeat(70));
      console.log(`Intento: ${attempts || 1}`);
      console.log("=".repeat(70) + "\n");
      
      logMessage('INFO', 'QR generado para escaneo', { intento: attempts || 1 });
    },
    statusFind: (statusSession) => {
      if (statusSession === "qrReadSuccess") {
        console.log("\n✅ QR escaneado exitosamente - Bot conectado\n");
        logMessage('SUCCESS', 'QR escaneado exitosamente - Bot conectado');
      } else if (statusSession === "notLogged") {
        console.log("📱 Esperando escaneo de QR...");
        logMessage('INFO', 'Esperando escaneo de QR');
      } else if (statusSession === "isLogged") {
        console.log("\n✅ Sesión guardada encontrada - Bot conectado automáticamente\n");
        logMessage('SUCCESS', 'Sesión guardada encontrada - Bot conectado automáticamente');
      } else if (statusSession === "autocloseCalled") {
        console.log("⚠️ Sesión cerrada automáticamente");
        logMessage('WARNING', 'Sesión cerrada automáticamente');
      } else if (statusSession === "desconnectedMobile") {
        console.log("⚠️ Sesión desconectada desde móvil");
        logMessage('WARNING', 'Sesión desconectada desde móvil');
      }
    },
    browserArgs: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-software-rasterizer",
    ],
  })
  .then(async (client) => {
    console.log("✅ Bot conectado y listo\n");
    logMessage('SUCCESS', 'Bot conectado y listo');
    
    // Inicializar servicios
    conversationService = new ConversationService(db);
    messageService = new MessageService(client, db);
    aiService = new AIService(openai, db, conversationService);
    
    logMessage('SUCCESS', 'Servicios inicializados', {
      messageService: true,
      conversationService: true,
      aiService: true
    });
    
    // Publicación de estados: cron lunes, miércoles y viernes a las 18:00
    try {
      storiesAutomation.inicializarAutomatizacionHistorias(client);
      logMessage('SUCCESS', 'Automatización de historias activada');
    } catch (error) {
      logError(error, { contexto: 'inicializacionHistorias' });
    }

    // Seguimientos automáticos activos: envío cada hora a clientes que no respondieron
    setInterval(async () => {
      try {
        await followUp.enviarSeguimientosAutomaticos(client);
      } catch (error) {
        logError(error, { contexto: 'seguimientosAutomaticos' });
      }
    }, 60 * 60 * 1000);
    setTimeout(async () => {
      try {
        await followUp.enviarSeguimientosAutomaticos(client);
      } catch (error) {
        logError(error, { contexto: 'seguimientosIniciales' });
      }
    }, 5 * 60 * 1000);

    // Clientes que ya recibieron el flujo completo (saludo + imágenes + pregunta) en esta sesión
    const flujoSimpleEnviado = new Set();

    // Manejar mensajes
    client.onMessage(async (message) => {
      try {
        // Validar mensaje usando MessageService
        const validacion = messageService.validarMensajeEntrante(message);
        if (!validacion.valido) {
          return; // Mensaje no válido, ignorar
        }

        const { userId, mensajeTexto } = validacion;
        
        // ============================================
        // CAPTURAR MENSAJES DEL ADMIN ENVIADOS A OTROS
        // ============================================
        if (message.fromMe) {
          // Obtener el destinatario del mensaje (el chat al que se envió)
          const destinatario = message.to || message.chatId || null;
          const mensajeTexto = message.body.trim().toLowerCase();
          
          if (!destinatario || !mensajeTexto || mensajeTexto.length < 2) {
            return;
          }
          
          // Intentar obtener el userId del admin desde el mensaje
          // En wppconnect, cuando fromMe=true, message.from puede ser el número del admin
          // o podemos obtenerlo del perfil del dispositivo
          let adminUserId = message.from;
          
          // Si message.from no tiene formato válido, intentar obtenerlo del cliente
          if (!adminUserId || (!adminUserId.includes('@c.us') && !adminUserId.includes('@lid'))) {
            try {
              const profile = await client.getHostDevice();
              if (profile && profile.wid) {
                adminUserId = profile.wid.id;
              }
            } catch (error) {
              // Si falla, usar el primer admin de la configuración
              adminUserId = config.ADMIN_NUMBERS[0];
            }
          }
          
          // Verificar si el remitente es administrador
          const esAdmin = adminHandler.esAdministrador(adminUserId);
          
          if (esAdmin && destinatario) {
            // Detectar comando "desactivar bot"
            if (mensajeTexto === "desactivar bot" || mensajeTexto === "bot off") {
              try {
                // Guardar en base de datos que este chat tiene bot desactivado
                await db.establecerConfiguracion(
                  `bot_desactivado_${destinatario}`, 
                  '1', 
                  `Bot desactivado para chat: ${destinatario}`
                );
                
                logMessage('SUCCESS', 'Bot desactivado para chat', { 
                  destinatario, 
                  adminUserId 
                });
                return;
              } catch (error) {
                logError(error, { 
                  contexto: 'desactivarBotChat',
                  destinatario,
                  adminUserId 
                });
              }
            }
            
            // Detectar comando "activar bot"
            if (mensajeTexto === "activar bot" || mensajeTexto === "bot on") {
              try {
                await db.establecerConfiguracion(
                  `bot_desactivado_${destinatario}`, 
                  '0', 
                  `Bot activado para chat: ${destinatario}`
                );
                
                logMessage('SUCCESS', 'Bot activado para chat', { 
                  destinatario, 
                  adminUserId 
                });
                return;
              } catch (error) {
                logError(error, { 
                  contexto: 'activarBotChat',
                  destinatario,
                  adminUserId 
                });
              }
            }
          }
          
          // Si no es admin o no es un comando especial, ignorar el mensaje
          return;
        }
        
        // ============================================
        // PROCESAR MENSAJES RECIBIDOS (código normal)
        // ============================================
        
        // Verificar si es administrador
        const esAdmin = adminHandler.esAdministrador(userId);
        
        // Verificar si el bot está activo usando MessageService
        const botActivo = await messageService.verificarBotActivo(userId, esAdmin);
        if (!botActivo) {
          return; // Bot desactivado, ignorar
        }
        
        logMessage('INFO', 'Mensaje recibido', { 
          userId, 
          mensaje: mensajeTexto.substring(0, 50),
          esAdmin 
        });
        
        // Incrementar métricas
        monitoringService.incrementMessages();
        
        if (esAdmin) {
          logMessage('INFO', 'Administrador detectado', { userId });
          try {
            // Crear objeto de estadísticas básico para comandos de admin
            const estadisticas = {
              totalMensajes: 0,
              totalReservas: 0,
              usuariosActivos: new Set().size
            };
            const iaGlobalDesactivada = { value: false };
            
            // Intentar procesar comandos de administrador
            const comandoProcesado = await adminHandler.procesarComandosAdmin(
              client,
              message,
              userId,
              mensajeTexto,
              mensajeTexto.toLowerCase(),
              estadisticas,
              iaGlobalDesactivada
            );
            
            // Si se procesó un comando, no continuar con IA
            if (comandoProcesado) {
              logMessage('SUCCESS', 'Comando de administrador procesado', { userId });
              return;
            }
            
            // Si no es un comando reconocido, mostrar lista de comandos
            await adminHandler.mostrarListaComandos(client, userId);
            return;
          } catch (error) {
            logError(error, { 
              contexto: 'procesarComandoAdmin',
              userId,
              mensaje: mensajeTexto 
            });
            // Enviar mensaje de error al administrador
            try {
              await client.sendText(
                userId,
                `❌ Error al procesar comando: ${error.message}\n\nEnvía 'comandos' para ver la lista disponible.`
              );
            } catch (sendError) {
              logError(sendError, { contexto: 'enviarMensajeErrorAdmin', userId });
            }
            return;
          }
        }
        
        // Restricción de prueba: solo responder a números en TEST_NUMBERS (admins ya procesados arriba)
        if (config.TEST_NUMBERS && config.TEST_NUMBERS.length > 0) {
          const esNumeroPrueba = config.TEST_NUMBERS.includes(userId) ||
            config.TEST_NUMBERS.includes(messageHelpers.extraerNumero(userId));
          if (!esNumeroPrueba) {
            logMessage('INFO', 'Mensaje ignorado (no está en TEST_NUMBERS)', { userId });
            return;
          }
        }
        
        // Registrar/actualizar cliente y estado de lead para que los seguimientos funcionen
        const sessionId = messageHelpers.extraerSessionId(userId);
        const phone = messageHelpers.extraerNumeroReal(message);
        const userName = message.notifyName || message.pushName || 'Cliente';
        try {
          await db.obtenerOCrearCliente(sessionId, phone, phone?.startsWith('51') ? 'PE' : null, userName);
          await leadClassification.actualizarEstadoLeadCliente(db, sessionId, mensajeTexto);
          await followUp.marcarClienteRespondio(sessionId);
        } catch (error) {
          logError(error, { contexto: 'clienteSeguimiento', sessionId });
        }

        // Flujo simple: solo saludo a horario + imágenes + pregunta de reserva (sin IA)
        const primeraVez = !flujoSimpleEnviado.has(userId);
        if (primeraVez) flujoSimpleEnviado.add(userId);

        try {
          await flujoSimple.ejecutarFlujoSimple(client, userId, primeraVez);
        } catch (error) {
          logError(error, { contexto: 'flujoSimple', userId });
          await messageService.enviarMensaje(userId, 'Disculpa, hubo un error. ¿Para qué día le gustaría la reserva?');
        }
      } catch (error) {
        logError(error, { 
          contexto: 'procesarMensaje',
          userId: message?.from 
        });
        monitoringService.incrementErrors();
      }
    });
    
    // Manejar cambios de estado
    client.onStateChange((state) => {
      logMessage('INFO', `Estado del bot: ${state}`);
      if (state === "CONNECTED") {
        logMessage('SUCCESS', 'Bot conectado y funcionando');
      } else if (state === "DISCONNECTED" || state === "CLOSE") {
        logMessage('WARNING', 'Bot desconectado. Reinicia el servicio para reconectar.');
      }
    });
  })
  .catch((error) => {
    logError(error, { contexto: 'iniciarBot', critico: true });
    process.exit(1);
  });
}

// Iniciar el bot
iniciarBot();