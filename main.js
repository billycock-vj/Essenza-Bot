/**
 * ESSENZA BOT - Versión Simplificada
 * Solo IA - Sin lógica compleja de reservas, estados, base de datos, etc.
 * 
 * Este bot solo:
 * 1. Recibe mensajes de WhatsApp
 * 2. Consulta OpenAI con la información de Essenza
 * 3. Responde al cliente
 */

require("dotenv").config();
const wppconnect = require("@wppconnect-team/wppconnect");
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");
const http = require("http");
const config = require("./config");
const adminHandler = require("./handlers/admin");
const db = require("./services/database");

// ============================================
// CONFIGURACIÓN
// ============================================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;

// Detectar si estamos en Fly.io
const IS_FLY_IO = process.env.FLY_APP_NAME !== undefined || fs.existsSync('/data');

// Configurar paths dinámicos
const TOKENS_PATH = IS_FLY_IO 
  ? '/data/tokens' 
  : 'C:\\apps\\essenza-bot\\tokens';

// Asegurar que el directorio de tokens existe
try {
  if (!fs.existsSync(TOKENS_PATH)) {
    fs.mkdirSync(TOKENS_PATH, { recursive: true });
  }
} catch (error) {
  console.warn(`⚠️ No se pudo crear directorio de tokens: ${error.message}`);
}

if (!OPENAI_API_KEY) {
  console.error("❌ ERROR: OPENAI_API_KEY no configurada en .env");
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
} catch (error) {
  console.warn("⚠️ No se pudo cargar ESSENZA_KNOWLEDGE_BASE.md, usando información por defecto");
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
// SERVIDOR HTTP PARA HEALTH CHECKS
// ============================================
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'essenza-bot' }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor HTTP iniciado en puerto ${PORT}`);
  if (IS_FLY_IO) {
    console.log(`🌐 Fly.io: Health check disponible en https://${process.env.FLY_APP_NAME}.fly.dev/health`);
  }
});

// ============================================
// GESTIÓN DE CONVERSACIONES
// ============================================
// Historial de conversación por usuario (simple, en memoria)
const conversaciones = new Map();

// Limpiar conversaciones antiguas cada hora (evitar memory leak)
setInterval(() => {
  if (conversaciones.size > 1000) {
    // Mantener solo las 500 conversaciones más recientes
    const entries = Array.from(conversaciones.entries());
    conversaciones.clear();
    entries.slice(-500).forEach(([key, value]) => {
      conversaciones.set(key, value);
    });
    console.log("🧹 Limpieza de conversaciones antiguas");
  }
}, 60 * 60 * 1000); // Cada hora

// ============================================
// FUNCIÓN PARA CONSULTAR IA
// ============================================
async function consultarIA(mensaje, userId) {
  try {
    // Obtener modo de IA desde la base de datos
    const modoIA = await db.obtenerConfiguracion('modo_ia') || 'auto';
    
    // Si el modo es 'manual', no responder automáticamente
    if (modoIA === 'manual') {
      return null;
    }
    
    // Si el modo es 'solo_faq', solo responder preguntas frecuentes
    if (modoIA === 'solo_faq') {
      const esFAQ = detectarPreguntaFrecuente(mensaje);
      if (!esFAQ) {
        return null;
      }
    }
    
    // Obtener historial de conversación del usuario
    let historial = conversaciones.get(userId) || [];
    
    // Agregar mensaje del usuario al historial
    historial.push({ role: "user", content: mensaje });
    
    // Limitar historial a últimos 18 mensajes (para no exceder tokens)
    // Mantener contexto pero no demasiado
    if (historial.length > 18) {
      historial = historial.slice(-18);
    }
    
    // Construir mensajes para OpenAI (system prompt + historial)
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...historial
    ];
    
    // Consultar OpenAI
    const respuesta = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });
    
    const respuestaTexto = respuesta.choices[0].message.content.trim();
    
    // Reemplazar doble negrita (**texto**) por negrita simple (*texto*) para WhatsApp
    const respuestaFormateada = respuestaTexto.replace(/\*\*([^*]+)\*\*/g, '*$1*');
    
    // Agregar respuesta al historial
    historial.push({ role: "assistant", content: respuestaFormateada });
    conversaciones.set(userId, historial);
    
    return respuestaFormateada;
  } catch (error) {
    console.error("❌ Error al consultar IA:", error.message);
    return "Disculpa, no pude procesar tu mensaje en este momento. Por favor, intenta de nuevo en un momento.";
  }
}

// Función simple para detectar preguntas frecuentes
function detectarPreguntaFrecuente(mensaje) {
  const mensajeLower = mensaje.toLowerCase();
  const palabrasFAQ = [
    'horario', 'hora', 'abierto', 'cerrado', 'atencion', 'atención',
    'precio', 'costo', 'cuanto', 'cuánto', 'precios',
    'servicio', 'servicios', 'masaje', 'masajes',
    'reserva', 'reservar', 'cita', 'agendar',
    'ubicacion', 'ubicación', 'direccion', 'dirección', 'donde', 'dónde',
    'telefono', 'teléfono', 'contacto', 'whatsapp',
    'yape', 'pago', 'deposito', 'depósito'
  ];
  
  return palabrasFAQ.some(palabra => mensajeLower.includes(palabra));
}

// ============================================
// INICIALIZACIÓN DEL BOT
// ============================================
console.log("🚀 Iniciando Essenza Bot...");
console.log("📚 Cargando información de Essenza...");

// Inicializar base de datos (crear tablas si no existen)
async function iniciarBot() {
  try {
    console.log("🗄️ Inicializando base de datos...");
    await db.inicializarDB();
    console.log("✅ Base de datos inicializada correctamente\n");
  } catch (error) {
    console.error("❌ Error al inicializar base de datos:", error.message);
    console.warn("⚠️ Continuando sin base de datos (algunos comandos pueden no funcionar)\n");
  }

  console.log("✅ Bot listo. Esperando mensajes...\n");
  
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
    },
    statusFind: (statusSession) => {
      if (statusSession === "qrReadSuccess") {
        console.log("\n✅ QR escaneado exitosamente - Bot conectado\n");
      } else if (statusSession === "notLogged") {
        console.log("📱 Esperando escaneo de QR...");
      } else if (statusSession === "isLogged") {
        console.log("\n✅ Sesión guardada encontrada - Bot conectado automáticamente\n");
      } else if (statusSession === "autocloseCalled") {
        console.log("⚠️ Sesión cerrada automáticamente");
      } else if (statusSession === "desconnectedMobile") {
        console.log("⚠️ Sesión desconectada desde móvil");
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
    
    // Manejar mensajes
    client.onMessage(async (message) => {
      try {
        // Ignorar mensajes de estados, grupos, etc.
        if (
          message.from === "status@broadcast" ||
          message.isGroupMsg ||
          !message.body
        ) {
          return;
        }
        
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
                
                console.log(`🔧 Bot desactivado para chat: ${destinatario} por admin ${adminUserId}`);
                return;
              } catch (error) {
                console.error(`❌ Error al desactivar bot para ${destinatario}:`, error.message);
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
                
                console.log(`🔧 Bot activado para chat: ${destinatario} por admin ${adminUserId}`);
                return;
              } catch (error) {
                console.error(`❌ Error al activar bot para ${destinatario}:`, error.message);
              }
            }
          }
          
          // Si no es admin o no es un comando especial, ignorar el mensaje
          return;
        }
        
        // ============================================
        // PROCESAR MENSAJES RECIBIDOS (código normal)
        // ============================================
        const userId = message.from;
        const mensajeTexto = message.body.trim();
        
        // Si el mensaje es muy corto o solo emojis, ignorar
        if (mensajeTexto.length < 2) {
          return;
        }
        
        // Verificar si el bot está desactivado para este chat específico
        const botDesactivadoChat = await db.obtenerConfiguracion(`bot_desactivado_${userId}`);
        if (botDesactivadoChat === '1') {
          console.log(`🚫 Bot desactivado para este chat: ${userId}`);
          return; // Ignorar mensaje
        }
        
        // Verificar si es administrador - Los administradores solo envían comandos, no usan IA
        const esAdmin = adminHandler.esAdministrador(userId);
        
        // Verificar si el bot está desactivado globalmente (solo para no-admins)
        if (!esAdmin) {
          const botActivo = await db.obtenerConfiguracion('flag_bot_activo');
          if (botActivo === '0') {
            console.log(`🚫 Bot desactivado globalmente - Mensaje ignorado de ${userId}`);
            return; // Ignorar sin responder
          }
        }
        
        console.log(`📥 [${new Date().toLocaleTimeString()}] Mensaje de ${userId}: ${mensajeTexto.substring(0, 50)}${mensajeTexto.length > 50 ? '...' : ''}`);
        
        if (esAdmin) {
          console.log(`🔑 Administrador detectado: ${userId}`);
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
              console.log(`✅ Comando de administrador procesado\n`);
              return;
            }
            
            // Si no es un comando reconocido, informar al administrador
            await client.sendText(
              userId,
              "❓ No reconocí ese comando. Envía 'comandos' para ver la lista de comandos disponibles."
            );
            return;
          } catch (error) {
            console.error(`❌ Error al procesar comando de administrador: ${error.message}`);
            // Enviar mensaje de error al administrador
            try {
              await client.sendText(
                userId,
                `❌ Error al procesar comando: ${error.message}\n\nEnvía 'comandos' para ver la lista disponible.`
              );
            } catch (sendError) {
              console.error(`❌ Error al enviar mensaje de error: ${sendError.message}`);
            }
            return;
          }
        }
        
        // Si no es administrador, usar IA normalmente
        // (La verificación de flag_bot_activo ya cubre todo, incluyendo IA)
        
        // Consultar IA (puede retornar null si el modo no lo permite)
        const respuesta = await consultarIA(mensajeTexto, userId);
        
        // Solo enviar respuesta si la IA respondió
        if (respuesta) {
          await client.sendText(userId, respuesta);
          console.log(`✅ [${new Date().toLocaleTimeString()}] Respuesta enviada\n`);
        } else {
          // Si la IA no respondió (modo manual o solo_faq), informar al usuario
          console.log(`ℹ️ [${new Date().toLocaleTimeString()}] IA no responde (modo actual)\n`);
        }
      } catch (error) {
        console.error("❌ Error al procesar mensaje:", error.message);
      }
    });
    
    // Manejar cambios de estado
    client.onStateChange((state) => {
      console.log(`📊 Estado del bot: ${state}`);
      if (state === "CONNECTED") {
        console.log("✅ Bot conectado y funcionando\n");
      } else if (state === "DISCONNECTED" || state === "CLOSE") {
        console.log("⚠️ Bot desconectado. Reinicia el servicio para reconectar.\n");
      }
    });
  })
  .catch((error) => {
    console.error("❌ Error al iniciar bot:", error.message);
    console.error("Detalles:", error);
    process.exit(1);
  });
}

// Iniciar el bot
iniciarBot();