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
  : path.join(__dirname, 'tokens');

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
- Lunes a Jueves: 11:00 - 19:00
- Viernes: 11:00 - 19:00
- Sábado: 10:00 - 16:00
- Domingo: Cerrado

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
- Si el cliente quiere reservar, explica el proceso de depósito (S/10 para servicios < S/50, S/20 para servicios >= S/50)
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
    
    // Agregar respuesta al historial
    historial.push({ role: "assistant", content: respuestaTexto });
    conversaciones.set(userId, historial);
    
    return respuestaTexto;
  } catch (error) {
    console.error("❌ Error al consultar IA:", error.message);
    return "Disculpa, no pude procesar tu mensaje en este momento. Por favor, intenta de nuevo en un momento.";
  }
}

// ============================================
// INICIALIZACIÓN DEL BOT
// ============================================
console.log("🚀 Iniciando Essenza Bot...");
console.log("📚 Cargando información de Essenza...");
console.log("✅ Bot listo. Esperando mensajes...\n");

// Limpiar tokens anteriores para forzar nuevo QR (solo si no estamos en Fly.io o si es necesario)
if (!IS_FLY_IO && fs.existsSync(TOKENS_PATH)) {
  try {
    const items = fs.readdirSync(TOKENS_PATH);
    items.forEach(item => {
      const itemPath = path.join(TOKENS_PATH, item);
      try {
        if (fs.statSync(itemPath).isDirectory()) {
          fs.rmSync(itemPath, { recursive: true, force: true });
        }
      } catch (err) {
        // Ignorar errores
      }
    });
  } catch (error) {
    // Ignorar errores de limpieza
  }
}

wppconnect
  .create({
    session: "essenza-bot",
    autoClose: false,
    disableWelcome: true,
    multiDevice: false,
    folderNameToken: TOKENS_PATH,
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
      }
    },
    headless: true,
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
        // Ignorar mensajes del bot mismo, estados, grupos, etc.
        if (
          message.from === "status@broadcast" ||
          message.isGroupMsg ||
          message.fromMe ||
          !message.body
        ) {
          return;
        }
        
        const userId = message.from;
        const mensajeTexto = message.body.trim();
        
        // Si el mensaje es muy corto o solo emojis, ignorar
        if (mensajeTexto.length < 2) {
          return;
        }
        
        console.log(`📥 [${new Date().toLocaleTimeString()}] Mensaje de ${userId}: ${mensajeTexto.substring(0, 50)}${mensajeTexto.length > 50 ? '...' : ''}`);
        
        // Consultar IA
        const respuesta = await consultarIA(mensajeTexto, userId);
        
        // Enviar respuesta
        await client.sendText(userId, respuesta);
        
        console.log(`✅ [${new Date().toLocaleTimeString()}] Respuesta enviada\n`);
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
