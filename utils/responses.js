/**
 * Respuestas predefinidas del bot
 */

const { obtenerHorarioDelDia, fuzzyMatch } = require('./validators');

/**
 * Obtiene un saludo según la hora del día
 * @returns {string} - Saludo apropiado
 */
function getSaludoPorHora() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "Buenos días";
  if (hora >= 12 && hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Obtiene una respuesta variada según el tipo
 * @param {string} tipo - Tipo de respuesta (buenosDias, buenasTardes, buenasNoches, gracias, adios)
 * @returns {string} - Respuesta aleatoria del tipo
 */
function getRespuestaVariada(tipo) {
  const respuestas = {
    buenosDias: [
      "¡Buenos días! ☀️ ¿En qué puedo ayudarte hoy?",
      "¡Buenos días! Espero que tengas un excelente día. ¿Cómo puedo asistirte?",
      "Buenos días 🌅 ¿Te gustaría ver nuestro menú de servicios?",
    ],
    buenasTardes: [
      "¡Buenas tardes! 😊 ¿En qué puedo ayudarte?",
      "Buenas tardes 🌤️ ¿Hay algo en lo que pueda asistirte?",
      "¡Buenas tardes! ¿Te interesa conocer nuestros servicios?",
    ],
    buenasNoches: [
      "¡Buenas noches! 🌙 ¿En qué puedo ayudarte?",
      "Buenas noches ⭐ ¿Hay algo que necesites?",
      "¡Buenas noches! ¿Te gustaría ver nuestras opciones?",
    ],
    gracias: [
      "¡De nada! 😊 Estoy aquí para ayudarte cuando lo necesites.",
      "¡Con mucho gusto! 🌿 Si necesitas algo más, no dudes en escribirme.",
      "¡Por supuesto! 💚 Fue un placer ayudarte.",
      "¡De nada! Si tienes más preguntas, estaré aquí. 👋",
    ],
    adios: [
      "¡Hasta luego! 👋 Que tengas un excelente día.",
      "¡Chau! 😊 Espero verte pronto en Essenza Spa.",
      "¡Nos vemos! 💚 Cuídate mucho.",
      "¡Hasta pronto! 🌿 Fue un placer atenderte.",
    ],
  };

  const opciones = respuestas[tipo] || respuestas.gracias;
  return opciones[Math.floor(Math.random() * opciones.length)];
}

/**
 * Detecta si el texto contiene un saludo
 * @param {string} text - Texto a analizar
 * @returns {string|null} - Tipo de saludo detectado o null
 */
function detectSaludo(text) {
  const textoLower = text.toLowerCase();
  const saludos = {
    buenosDias: [
      "buenos días",
      "buen día",
      "buenos dias",
      "buen dia",
      "día",
      "dia",
    ],
    buenasTardes: ["buenas tardes", "buena tarde", "tarde"],
    buenasNoches: ["buenas noches", "buena noche", "noche"],
    hola: ["hola", "holaa", "holaaa", "hi", "hey", "que tal", "qué tal"],
    gracias: ["gracias", "gracia", "gracías", "grax", "thx", "thanks"],
    adios: [
      "adiós",
      "adios",
      "chau",
      "chao",
      "hasta luego",
      "nos vemos",
      "bye",
    ],
  };

  // Usar fuzzyMatch de validators para comparación flexible
  for (const [tipo, variantes] of Object.entries(saludos)) {
    for (const variante of variantes) {
      // Usar fuzzyMatch con threshold más bajo para saludos (0.6)
      const textoLimpio = textoLower.trim();
      const varianteLimpio = variante.toLowerCase().trim();
      
      // Coincidencia exacta o parcial
      if (textoLimpio === varianteLimpio || textoLimpio.includes(varianteLimpio) || varianteLimpio.includes(textoLimpio)) {
        return tipo;
      }
      
      // Coincidencia por palabras
      const palabras = textoLimpio.split(/\s+/);
      if (palabras.some(p => p === varianteLimpio)) {
        return tipo;
      }
      
      // Usar fuzzyMatch para coincidencias más flexibles
      if (fuzzyMatch(textoLower, variante, 0.6)) {
        return tipo;
      }
    }
  }
  return null;
}

module.exports = {
  getSaludoPorHora,
  getRespuestaVariada,
  detectSaludo
};
