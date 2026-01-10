/**
 * Handler para integración con OpenAI
 */

const OpenAI = require("openai");
const PQueue = require('p-queue').default;
const { logMessage } = require('../utils/logger');
const { obtenerHorarioDelDia } = require('../utils/validators');
const db = require('../services/database');
const config = require('../config');

let openai = null;
const queue = new PQueue({ concurrency: 1, interval: 1000, intervalCap: 1 });

/**
 * Inicializa OpenAI si está configurado
 */
function inicializarOpenAI() {
  if (config.OPENAI_API_KEY && !openai) {
    openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }
  return openai;
}

/**
 * Consulta a OpenAI con el mensaje del usuario
 * @param {string} mensajeUsuario - Mensaje del usuario
 * @param {Object} contextoUsuario - Contexto de la conversación
 * @returns {Promise<string|null>} - Respuesta de la IA o null si hay error
 */
async function consultarIA(mensajeUsuario, contextoUsuario = {}) {
  inicializarOpenAI();
  
  if (!openai) {
    return null;
  }

  // Verificar modo de IA
  const modoIA = await db.obtenerConfiguracion('modo_ia') || 'auto';
  
  // Si el modo es 'manual', no responder automáticamente
  if (modoIA === 'manual') {
    return null;
  }
  
  // Si el modo es 'solo_faq', solo responder preguntas frecuentes
  if (modoIA === 'solo_faq') {
    const esFAQ = detectarPreguntaFrecuente(mensajeUsuario);
    if (!esFAQ) {
      return null;
    }
  }
  
  // Verificar límite de interacciones IA
  const userId = contextoUsuario.userId;
  if (userId) {
    try {
      const puedeUsar = await db.puedeUsarIA(userId);
      if (!puedeUsar.puede) {
        return `⚠️ Has alcanzado el límite de ${puedeUsar.limite} respuestas con IA por hoy. Por favor, contacta con un asesor escribiendo "asesor".`;
      }
    } catch (error) {
      // Si hay error al verificar límite, continuar (no bloquear por error técnico)
      logMessage("WARNING", "Error al verificar límite de IA (continuando)", { error: error.message });
    }
  }

  // Usar cola de peticiones para rate limiting (1 petición por segundo)
  return await queue.add(async () => {
    try {
      const MAPS_LINK = config.MAPS_LINK;
      const YAPE_NUMERO = config.YAPE_NUMERO;
      const BANCO_CUENTA = config.BANCO_CUENTA;
      
      // Prompt consolidado para Essenza AI
      const contextoNegocio = `Eres Essenza AI, asistente virtual del spa ESSENZA. Responde en español peruano, de forma cálida, relajante, profesional y humana. Debes sonar amable, no robótico, usar el nombre del cliente cuando lo conozcas.

REGLA CRÍTICA SOBRE SALUDOS:
- Si "Ya se saludó antes" es true en el contexto, NUNCA debes saludar de nuevo. NO uses "Hola", "Buenos días", "Buenas tardes", ni ningún saludo.
- Si "Ya se saludó antes" es false, puedes saludar solo una vez al inicio.
- NUNCA repitas saludos en la misma conversación, incluso si el usuario escribe "hola" de nuevo.

Tu meta final: resolver dudas, recomendar servicios, y cerrar reserva con depósito confirmado.

INFORMACIÓN DEL SPA

Nombre del bot: Essenza AI
Tipo: Asistente virtual del spa ESSENZA
Ubicación: Jiron Ricardo Palma 603, Puente Piedra, Lima, Perú
Mapa: ${MAPS_LINK} (mantener como link clicable)

Horario de atención:
- Lunes a Jueves: 11:00 - 19:00
- Viernes: 11:00 - 19:00
- Sábado: 10:00 - 16:00
- Domingo: Cerrado

IMPORTANTE - HORARIO ESPECÍFICO POR DÍA:
Cuando el usuario mencione "mañana", "hoy", o una fecha específica, DEBES verificar qué día de la semana es y dar el horario CORRECTO de ese día:
- Si es Lunes, Martes, Miércoles o Jueves: 11:00 - 19:00
- Si es Viernes: 11:00 - 19:00
- Si es Sábado: 10:00 - 16:00
- Si es Domingo: Cerrado (no hay atención)

MÉTODOS DE PAGO Y DEPÓSITO

Depósito obligatorio para reservar:
- Si el servicio cuesta menos de 50 soles: depósito 10
- Si el servicio cuesta 50 o más: depósito 20

Métodos de pago:
- Yape ${YAPE_NUMERO} (Titular Esther Ocaña Baron)
- BCP ${BANCO_CUENTA}

El depósito se descuenta del total del servicio.

SERVICIOS CON PRECIOS (ACTUALIZADOS)

MASAJES BÁSICOS (45-60 minutos):
- Masaje Relajante: S/35
- Masaje Descontracturante: S/35
- Masaje Terapéutico: S/45

MASAJES COMPUESTOS (45-60 minutos):
- Relajante + Piedras Calientes: S/50
- Descontracturante + Electroterapia: S/50
- Descontracturante + Esferas Chinas: S/40
- Terapéutico + Compresas + Electroterapia: S/60

FISIOTERAPIA Y TERAPIAS:
- Evaluación + Tratamiento de Fisioterapia: S/50 (60 minutos)

TRATAMIENTOS FACIALES:
- Limpieza Facial Básica: S/30 (60 minutos)
- Limpieza Facial Profunda: S/60 (60-90 minutos)
- Parálisis Facial + Consulta: S/50 (60 minutos)

PAQUETES MENSUALES:
1. PAQUETE RELAJACIÓN: S/80 - 3 masajes relajantes
2. PAQUETE BIENESTAR: S/100 - 4 masajes terapéuticos
3. PAQUETE RECUPERACIÓN: S/140 - 4 sesiones de fisioterapia

PAQUETES PARA DOS PERSONAS:
1. PAQUETE ARMÓNICO: S/140 (2 personas)
2. PAQUETE AMOR: S/150 (2 personas)

CONTEXTO DE LA CONVERSACIÓN:
- Estado actual: ${contextoUsuario.estado || "conversacion"}
- Nombre del usuario: ${contextoUsuario.nombre || "Usuario"}
- Tipo de consulta: ${contextoUsuario.tipoConsulta || "general"}
- Fecha actual: ${new Date().toLocaleDateString("es-PE", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long"
    })}
- Ya se saludó antes: ${contextoUsuario.yaSaludo || false}
${(() => {
  const mañana = new Date();
  mañana.setDate(mañana.getDate() + 1);
  const horarioMañana = obtenerHorarioDelDia(mañana);
  const nombreDiaMañana = mañana.toLocaleDateString('es-PE', { 
    weekday: 'long',
    timeZone: 'America/Lima'
  });
  
  if (horarioMañana.abierto) {
    return `- Mañana (${nombreDiaMañana.charAt(0).toUpperCase() + nombreDiaMañana.slice(1)}): Horario ${horarioMañana.apertura}:00 - ${horarioMañana.cierre}:00`;
  } else {
    return `- Mañana (${nombreDiaMañana.charAt(0).toUpperCase() + nombreDiaMañana.slice(1)}): ${horarioMañana.mensaje || 'Cerrado'}`;
  }
})()}

REGLA CRÍTICA SOBRE MEMORIA Y CONTEXTO:
- Tienes acceso al historial de la conversación anterior. ÚSALO.
- NO repitas preguntas que ya fueron respondidas.
- RECUERDA la información que el usuario ya compartió y avanza en el flujo.

Meta final del bot: resolver dudas, recomendar, cerrar reserva.`;

      // Construir array de mensajes con historial
      const messages = [
        {
          role: "system",
          content: contextoNegocio,
        },
      ];

      // Agregar historial de conversación si existe (últimos 8 mensajes)
      const historial = contextoUsuario.historial || [];
      if (historial.length > 0) {
        const historialReciente = historial.slice(-8);
        messages.push(...historialReciente);
      }

      // Agregar el mensaje actual
      messages.push({
        role: "user",
        content: mensajeUsuario,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        max_tokens: 500,
        temperature: 0.8,
      });

      // Validar respuesta de OpenAI
      if (!completion?.choices?.[0]?.message?.content) {
        logMessage("ERROR", "Respuesta inválida de OpenAI", {
          completion: JSON.stringify(completion).substring(0, 200)
        });
        return null;
      }

      const respuesta = completion.choices[0].message.content.trim();
      if (!respuesta || respuesta.length === 0) {
        logMessage("WARNING", "Respuesta vacía de OpenAI");
        return null;
      }

      // Registrar interacción DESPUÉS de obtener respuesta exitosa
      if (userId) {
        try {
          await db.registrarInteraccionIA(userId);
        } catch (error) {
          // No crítico si falla el registro
          logMessage("WARNING", "Error al registrar interacción IA (no crítico)", { error: error.message });
        }
      }

      return respuesta;
    } catch (error) {
      logMessage("ERROR", "Error al consultar IA", {
        error: error.message,
      });
      return null;
    }
  });
}

/**
 * Detecta si un mensaje es una pregunta frecuente
 * @param {string} texto - Texto del mensaje
 * @returns {boolean}
 */
function detectarPreguntaFrecuente(texto) {
  const textoLower = texto.toLowerCase();
  const preguntasFrecuentes = [
    'horario', 'horarios', 'abierto', 'cierra', 'abre',
    'precio', 'precios', 'cuesta', 'costo',
    'ubicacion', 'ubicación', 'direccion', 'dirección', 'donde', 'dónde',
    'pago', 'pagos', 'yape', 'transferencia',
    'servicio', 'servicios', 'que ofrecen', 'qué ofrecen'
  ];
  
  return preguntasFrecuentes.some(palabra => textoLower.includes(palabra));
}

module.exports = {
  inicializarOpenAI,
  consultarIA
};
