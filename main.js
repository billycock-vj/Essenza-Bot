/**
 * ESSENZA BOT - Versión Completa con IA y Automatizaciones
 * 
 * Funcionalidades:
 * 1. Recibe mensajes de WhatsApp
 * 2. Consulta OpenAI con la información de Essenza
 * 3. Clasifica leads automáticamente
 * 4. Envía seguimientos automáticos inteligentes
 * 5. Publica historias automáticamente
 * 6. Responde al cliente
 */

require("dotenv").config();
const wppconnect = require("@wppconnect-team/wppconnect");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const http = require("http");
const config = require("./config");
const paths = require("./config/paths");
const paths = require("./config/paths");
const adminHandler = require("./handlers/admin");
const db = require("./services/database");
const { getSaludoPorHora } = require("./utils/responses");

// Módulos de funcionalidades
const leadClassification = require("./handlers/leadClassification");
const followUp = require("./handlers/followUp");
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
- Si el cliente quiere reservar, explica el proceso de depósito (S/20 para todos los servicios) y di que un administrador se pondrá en contacto para confirmar
- NUNCA confirmes ni crees reservas automáticamente
- NUNCA digas que la cita está confirmada o reservada
- Tu función es INFORMAR sobre el proceso, NO crear reservas
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
// FUNCIÓN PARA NOTIFICAR SOLICITUD DE RESERVA
// ============================================
/**
 * Extrae detalles de reserva del mensaje del cliente
 * @param {string} mensaje - Mensaje del cliente
 * @returns {Object} - Detalles extraídos (fecha, hora, servicio, etc.)
 */
function extraerDetallesReserva(mensaje) {
  const detalles = {
    fecha: null,
    hora: null,
    servicio: null,
    mensajeCompleto: mensaje
  };
  
  // Buscar fecha en formato DD/MM/YYYY o DD/MM
  const fechaMatch = mensaje.match(/(\d{1,2}\/\d{1,2}(?:\/\d{4})?)/);
  if (fechaMatch) {
    detalles.fecha = fechaMatch[1];
  }
  
  // Buscar hora en formato HH:MM o "X pm/am"
  const horaMatch24 = mensaje.match(/(\d{1,2}):(\d{2})/);
  const horaMatch12 = mensaje.match(/(\d{1,2})\s*(am|pm|AM|PM)/);
  if (horaMatch24) {
    detalles.hora = `${horaMatch24[1]}:${horaMatch24[2]}`;
  } else if (horaMatch12) {
    let hora = parseInt(horaMatch12[1]);
    const periodo = horaMatch12[2].toLowerCase();
    if (periodo === 'pm' && hora !== 12) hora += 12;
    if (periodo === 'am' && hora === 12) hora = 0;
    detalles.hora = `${hora.toString().padStart(2, '0')}:00`;
  }
  
  // Buscar servicios comunes
  const servicios = [
    'masaje relajante', 'masaje descontracturante', 'masaje terapéutico',
    'limpieza facial básica', 'limpieza facial profunda',
    'fisioterapia', 'electroterapia', 'esferas chinas', 'piedras calientes'
  ];
  
  for (const servicio of servicios) {
    if (mensaje.toLowerCase().includes(servicio)) {
      detalles.servicio = servicio;
      break;
    }
  }
  
  return detalles;
}

/**
 * Notifica a los administradores sobre una solicitud de reserva usando imagen
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del cliente
 * @param {string} userName - Nombre del cliente
 * @param {string} phone - Teléfono del cliente
 * @param {string} mensaje - Mensaje del cliente
 */
async function notificarSolicitudReserva(client, userId, userName, phone, mensaje) {
  try {
    const detalles = extraerDetallesReserva(mensaje);
    const RESERVA_ADMIN_NUMBERS = config.RESERVA_ADMIN_NUMBERS || config.ADMIN_NUMBERS;
    const { extraerNumero, enviarImagenSeguro } = messageHelpers;
    const { generarImagenCita } = require('./handlers/imageGenerator');
    
    // Preparar fecha con día de la semana si tenemos fecha
    let fechaTexto = detalles.fecha || 'Por confirmar';
    if (detalles.fecha) {
      try {
        // Intentar parsear la fecha para obtener el día de la semana
        const partesFecha = detalles.fecha.split('/');
        if (partesFecha.length >= 2) {
          const dia = parseInt(partesFecha[0], 10);
          const mes = parseInt(partesFecha[1], 10) - 1;
          const año = partesFecha[2] ? parseInt(partesFecha[2], 10) : new Date().getFullYear();
          const fecha = new Date(año, mes, dia);
          const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          const diaSemana = diasSemana[fecha.getDay()];
          // Asegurar que la fecha tenga año completo
          const fechaCompleta = partesFecha[2] ? detalles.fecha : `${detalles.fecha}/${año}`;
          fechaTexto = `${diaSemana} ${fechaCompleta}`;
        }
      } catch (e) {
        // Si falla, usar la fecha original
        console.error("Error al parsear fecha:", e.message);
      }
    }
    
    // Preparar hora en formato 24h (debe estar en formato HH:MM)
    let horaFormato24 = detalles.hora || '00:00';
    if (!detalles.hora) {
      horaFormato24 = '00:00';
    } else if (!detalles.hora.includes(':')) {
      // Si no tiene formato, intentar parsear
      horaFormato24 = '00:00';
    }
    
    // Preparar datos para la imagen (formato idéntico al de crear reserva)
    const datosParaImagen = {
      fechaTexto: fechaTexto,
      hora: horaFormato24,
      cliente: userName || 'Cliente',
      telefono: phone || extraerNumero(userId) || 'No disponible',
      servicio: detalles.servicio || 'Por confirmar',
      precio: 'A revisión',
      deposito: 0,
      estado: 'Pendiente'
    };
    
    // Generar imagen usando la misma función que se usa para crear reservas
    // Usar ID 0 (se mostrará como "ID Reserva: #0") ya que aún no se ha creado la reserva
    // La imagen será idéntica a la de confirmación, solo que con estado "Pendiente"
    let imagenBuffer;
    try {
      imagenBuffer = await generarImagenCita(datosParaImagen, 0);
    } catch (error) {
      console.error("⚠️ Error al generar imagen de notificación:", error.message);
      // Si falla la generación de imagen, enviar mensaje de texto como fallback
      let mensajeNotificacion = `🔔 *NUEVA SOLICITUD DE RESERVA*\n\n`;
      mensajeNotificacion += `👤 *Cliente:* ${userName}\n`;
      mensajeNotificacion += `📱 *Teléfono:* ${phone || extraerNumero(userId)}\n\n`;
      if (detalles.fecha) mensajeNotificacion += `📅 *Fecha:* ${detalles.fecha}\n`;
      if (detalles.hora) mensajeNotificacion += `⏰ *Hora:* ${detalles.hora}\n`;
      if (detalles.servicio) mensajeNotificacion += `💆 *Servicio:* ${detalles.servicio}\n`;
      mensajeNotificacion += `\n⚠️ *Estado:* Pendiente de confirmación`;
      
      for (const adminId of RESERVA_ADMIN_NUMBERS) {
        try {
          await client.sendText(adminId, mensajeNotificacion);
        } catch (err) {
          console.error(`❌ Error al enviar notificación a ${extraerNumero(adminId)}:`, err.message);
        }
      }
      return;
    }
    
    // Enviar imagen a todos los administradores
    for (const adminId of RESERVA_ADMIN_NUMBERS) {
      try {
        await enviarImagenSeguro(client, adminId, imagenBuffer, '🔔 Nueva solicitud de reserva - Pendiente de confirmación');
        console.log(`✅ Imagen de notificación enviada a administrador: ${extraerNumero(adminId)}`);
      } catch (error) {
        console.error(`❌ Error al enviar imagen a administrador ${extraerNumero(adminId)}:`, error.message);
      }
    }
  } catch (error) {
    console.error("❌ Error al notificar solicitud de reserva:", error.message);
  }
}

// ============================================
// RESPUESTA SIMPLE AL CLIENTE (solo 3 acciones)
// ============================================
const IMAGENES_PAQUETES_DIR = path.join(paths.DATA_BASE_DIR, "imagenes");

/**
 * Obtiene las rutas de imágenes del directorio de paquetes/servicios.
 * Solo incluye archivos cuyo nombre empieza con números (ej: 01.jpg, 02.png).
 * Excluye la plantilla base (plantilla_base.png).
 * @returns {string[]} - Rutas completas de archivos de imagen
 */
function obtenerImagenesParaCliente() {
  try {
    if (!fs.existsSync(IMAGENES_PAQUETES_DIR)) {
      return [];
    }
    const archivos = fs.readdirSync(IMAGENES_PAQUETES_DIR);
    return archivos
      .filter((f) => {
        const ext = path.extname(f).toLowerCase();
        const base = path.basename(f, ext).toLowerCase();
        const esImagen = /\.(jpg|jpeg|png|gif|webp)$/i.test(path.extname(f));
        const empiezaConNumero = /^\d+/.test(f);
        const noEsPlantillaBase = !base.includes("plantilla");
        return esImagen && empiezaConNumero && noEsPlantillaBase;
      })
      .map((f) => path.join(IMAGENES_PAQUETES_DIR, f))
      .sort();
  } catch (e) {
    console.warn("⚠️ No se pudieron cargar imágenes para cliente:", e.message);
    return [];
  }
}

/**
 * Responde al cliente solo con: saludo según hora, imágenes y pregunta de reserva
 * @param {Object} client - Cliente wppconnect
 * @param {string} userId - ID del usuario
 */
async function responderClienteSimple(client, userId) {
  const { enviarMensajeSeguro, enviarImagenSeguro } = messageHelpers;

  // 1. Saludar condicional a la hora del día
  const saludo = getSaludoPorHora();
  await enviarMensajeSeguro(client, userId, saludo);

  // 2. Enviar imágenes (si existen)
  const rutasImagenes = obtenerImagenesParaCliente();
  for (const ruta of rutasImagenes) {
    try {
      const buffer = fs.readFileSync(ruta);
      await enviarImagenSeguro(client, userId, buffer, "");
      await new Promise((r) => setTimeout(r, 800)); // Pequeña pausa entre imágenes
    } catch (err) {
      console.warn("⚠️ Error al enviar imagen:", ruta, err.message);
    }
  }

  // 3. Preguntar para qué día quiere la reserva
  await enviarMensajeSeguro(
    client,
    userId,
    "¿Para cuándo le gustaría la reserva?"
  );
}

// ============================================
// FUNCIÓN PARA CONSULTAR IA (no usada en flujo cliente simple)
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
    // Evitar versión fija 2.3000.10305x (ya no disponible); cargar WhatsApp Web actual
    whatsappVersion: false,
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
    
    // Inicializar automatización de historias
    try {
      storiesAutomation.inicializarAutomatizacionHistorias(client);
      logMessage('SUCCESS', 'Automatización de historias inicializada');
    } catch (error) {
      logError(error, { contexto: 'inicializacionHistorias' });
    }
    
    // Ejecutar seguimientos automáticos cada hora
    setInterval(async () => {
      try {
        await followUp.enviarSeguimientosAutomaticos(client);
      } catch (error) {
        logError(error, { contexto: 'seguimientosAutomaticos' });
      }
    }, 60 * 60 * 1000); // Cada hora
    
    // Ejecutar seguimientos inmediatamente al iniciar (por si hay clientes pendientes)
    setTimeout(async () => {
      try {
        await followUp.enviarSeguimientosAutomaticos(client);
      } catch (error) {
        logError(error, { contexto: 'seguimientosIniciales' });
      }
    }, 5 * 60 * 1000); // Después de 5 minutos
    
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
        
        // Cliente: solo cuando el chat se inicia por primera vez (no existe en clientes)
        const sessionId = messageHelpers.extraerSessionId(userId);
        let clienteExistente = null;
        try {
          clienteExistente = await db.obtenerClientePorSessionId(sessionId);
        } catch (e) {
          console.warn("⚠️ Error al verificar cliente:", e.message);
        }
        if (clienteExistente) {
          return; // Chat ya iniciado antes, no responder
        }
        try {
          await responderClienteSimple(client, userId);
          const phone = messageHelpers.extraerNumeroReal(message);
          const userName = message.notifyName || message.pushName || "Cliente";
          await db.obtenerOCrearCliente(sessionId, phone, phone?.toString().startsWith("51") ? "PE" : null, userName);
          // Necesario para que los seguimientos (12-24h, 48-72h) encuentren al cliente
          await db.actualizarEstadoLead(sessionId, "info", new Date().toISOString());
          console.log(`✅ [${new Date().toLocaleTimeString()}] Primera respuesta enviada (chat nuevo)\n`);
        } catch (error) {
          console.error("❌ Error al responder al cliente:", error.message);
          await messageHelpers.enviarMensajeSeguro(
            client,
            userId,
            "Disculpa, no pude procesar tu mensaje. Por favor, intenta de nuevo en un momento."
          );
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
<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    logError(error, { contexto: 'iniciarBot', critico: true });
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
    const mensaje = typeof error === 'string' ? error : (error?.message ?? String(error));
    console.error("❌ Error al iniciar bot:", mensaje || '(sin mensaje)');
    if (error?.stack) console.error("Stack:", error.stack);
    if (mensaje === 'Auto Close Called' || mensaje.includes('autoclose')) {
      console.error("💡 Sugerencia: Sesión cerrada o browser en conflicto. Ejecuta scripts/liberar-sesion-browser.ps1 y vuelve a iniciar.");
    }
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
    process.exit(1);
  });
}

// Iniciar el bot
iniciarBot();