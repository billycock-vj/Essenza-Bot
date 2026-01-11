/**
 * ESSENZA BOT SIMPLIFICADO
 * Solo IA - Sin lógica compleja de reservas, estados, etc.
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

// Cargar información de Essenza desde el archivo de conocimiento
const ESSENZA_KNOWLEDGE = fs.readFileSync(
  path.join(__dirname, "ESSENZA_KNOWLEDGE_BASE.md"),
  "utf-8"
);

// Inicializar OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ ERROR: OPENAI_API_KEY no configurada en .env");
  process.exit(1);
}

// Sistema de prompt para la IA
const SYSTEM_PROMPT = `${ESSENZA_KNOWLEDGE}

INSTRUCCIONES:
- Responde siempre en español peruano
- Sé cálido, relajante, profesional y humano
- NO repitas saludos si ya saludaste antes
- Si el cliente pregunta por servicios, da precios exactos
- Si pregunta por horarios, da el horario específico del día
- Si pregunta por ubicación, proporciona la dirección y el mapa
- Si pregunta por pagos, da la información de Yape y banco
- Si el cliente quiere reservar, explica el proceso de depósito
- Si no sabes algo, di que consultarás y te pondrás en contacto

IMPORTANTE: Mantén las respuestas concisas pero completas.`;

// Historial de conversación por usuario (simple, en memoria)
const conversaciones = new Map();

// Función para consultar IA
async function consultarIA(mensaje, userId) {
  try {
    // Obtener historial de conversación del usuario
    let historial = conversaciones.get(userId) || [];
    
    // Agregar mensaje del usuario al historial
    historial.push({ role: "user", content: mensaje });
    
    // Limitar historial a últimos 10 mensajes (para no exceder tokens)
    if (historial.length > 20) {
      historial = [
        { role: "system", content: SYSTEM_PROMPT },
        ...historial.slice(-18)
      ];
    } else {
      historial = [
        { role: "system", content: SYSTEM_PROMPT },
        ...historial
      ];
    }
    
    // Consultar OpenAI
    const respuesta = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: historial,
      temperature: 0.7,
      max_tokens: 500,
    });
    
    const respuestaTexto = respuesta.choices[0].message.content;
    
    // Agregar respuesta al historial
    historial.push({ role: "assistant", content: respuestaTexto });
    conversaciones.set(userId, historial.slice(1)); // Guardar sin el system prompt
    
    return respuestaTexto;
  } catch (error) {
    console.error("Error al consultar IA:", error);
    return "Disculpa, no pude procesar tu mensaje en este momento. Por favor, intenta de nuevo o escribe 'asesor' para hablar con un humano.";
  }
}

// Iniciar bot
console.log("🚀 Iniciando Essenza Bot Simplificado...");
console.log("📚 Cargando información de Essenza...");
console.log("✅ Bot listo. Esperando mensajes...\n");

wppconnect
  .create({
    session: "essenza-simple",
    autoClose: false,
    disableWelcome: true,
    multiDevice: false,
    catchQR: (base64Qr, asciiQR) => {
      console.clear();
      console.log("\n" + "=".repeat(70));
      console.log("📱 ESCANEA ESTE QR CON WHATSAPP");
      console.log("=".repeat(70) + "\n");
      console.log(asciiQR);
      console.log("\n" + "=".repeat(70) + "\n");
    },
    statusFind: (statusSession) => {
      if (statusSession === "qrReadSuccess") {
        console.log("\n✅ QR escaneado exitosamente\n");
      }
    },
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
        
        console.log(`📥 Mensaje de ${userId}: ${mensajeTexto.substring(0, 50)}...`);
        
        // Consultar IA
        const respuesta = await consultarIA(mensajeTexto, userId);
        
        // Enviar respuesta
        await client.sendText(userId, respuesta);
        
        console.log(`✅ Respuesta enviada a ${userId}\n`);
      } catch (error) {
        console.error("Error al procesar mensaje:", error);
      }
    });
    
    // Manejar cambios de estado
    client.onStateChange((state) => {
      console.log(`Estado del bot: ${state}`);
      if (state === "CONNECTED") {
        console.log("✅ Bot conectado y funcionando\n");
      }
    });
  })
  .catch((error) => {
    console.error("❌ Error al iniciar bot:", error);
    process.exit(1);
  });
