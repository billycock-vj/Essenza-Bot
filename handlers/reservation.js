/**
 * Handler para lógica de reservas
 */

const { logMessage } = require('../utils/logger');
const { enviarMensajeSeguro, extraerNumero } = require('./messageHelpers');
const db = require('../services/database');
const { obtenerHorarioDelDia } = require('../utils/validators');

/**
 * Detecta si el texto contiene intención de reserva
 * @param {string} texto - Texto a analizar
 * @returns {boolean} - true si hay intención de reserva
 */
function detectarIntencionReserva(texto) {
  const textoLower = texto.toLowerCase().trim();

  // Excluir comandos de administrador
  const comandosAdmin = [
    "citas de hoy",
    "citas hoy",
    "reservas de hoy",
    "reservas hoy",
    "estadisticas",
    "stats",
    "estadísticas"
  ];
  
  if (comandosAdmin.some(cmd => textoLower === cmd || textoLower.includes(cmd))) {
    return false;
  }

  const palabrasReserva = [
    "reservar",
    "reserva",
    "agendar",
    "agenda",
    "programar",
    "quiero reservar",
    "deseo reservar",
    "necesito reservar",
    "hacer una cita",
    "sacar cita",
    "pedir cita",
    "solicitar cita",
    "disponibilidad",
    "horarios disponibles",
    "cuándo",
    "cuando",
    "quiero una cita",
    "necesito cita",
    "puedo reservar",
    "puedo agendar",
    "quiero agendar",
    "deseo agendar",
    "necesito agendar",
  ];

  const tieneCita = textoLower.includes("cita");
  const esComandoCitas = textoLower.includes("citas de hoy") || 
                         textoLower.includes("citas hoy") ||
                         textoLower === "citas de hoy" ||
                         textoLower === "citas hoy";
  
  if (tieneCita && !esComandoCitas) {
    const esIntencionReserva = palabrasReserva.some((palabra) => {
      if (palabra === "cita") return false;
      return textoLower.includes(palabra);
    });
    
    if (esIntencionReserva) {
      return true;
    }
    
    const contextoReserva = ["quiero", "deseo", "necesito", "puedo", "hacer", "sacar", "pedir", "solicitar"];
    if (contextoReserva.some(ctx => textoLower.includes(ctx))) {
      return true;
    }
    
    return false;
  }

  return palabrasReserva.some((palabra) => textoLower.includes(palabra));
}

/**
 * Consulta disponibilidad para una fecha
 * @param {Date} fecha - Fecha a consultar
 * @param {number} duracionMinima - Duración mínima en minutos
 * @returns {Promise<Array>} - Array de horarios disponibles
 */
async function consultarDisponibilidad(fecha, duracionMinima = 60) {
  try {
    const horariosDisponibles = await db.consultarDisponibilidad(fecha, duracionMinima);
    return horariosDisponibles;
  } catch (error) {
    logMessage("ERROR", "Error al consultar disponibilidad", {
      error: error.message,
      fecha: fecha.toISOString()
    });
    return [];
  }
}

/**
 * Formatea horarios disponibles para mostrar
 * @param {Array} horarios - Array de fechas/horarios disponibles
 * @returns {string} - Mensaje formateado
 */
function formatearHorariosDisponibles(horarios) {
  if (horarios.length === 0) {
    return "❌ *No hay horarios disponibles* para esta fecha.";
  }
  
  const horariosTexto = horarios.map((h, idx) => {
    const hora = h.toLocaleTimeString("es-PE", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
    return `${idx + 1}. ${hora}`;
  }).join("\n");
  
  return `✅ *Horarios disponibles:*\n\n${horariosTexto}\n\n💡 *Selecciona un horario escribiendo el número o la hora.*`;
}

module.exports = {
  detectarIntencionReserva,
  consultarDisponibilidad,
  formatearHorariosDisponibles
};
