/**
 * Handler para comandos de clientes
 */

const { logMessage } = require('../utils/logger');
const { enviarMensajeSeguro, extraerNumero } = require('./messageHelpers');
const db = require('../services/database');
const config = require('../config');

/**
 * Muestra las citas del usuario
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>}
 */
async function mostrarMisCitas(client, userId) {
  try {
    const reservas = await db.obtenerReservas({
      userId: userId,
      estado: ['pendiente', 'confirmada']
    });
    
    if (reservas.length === 0) {
      await enviarMensajeSeguro(
        client,
        userId,
        "📋 *Mis Citas*\n\nNo tienes citas programadas en este momento.\n\n¿Te gustaría agendar una? Escribe *reservar*"
      );
      return true;
    }
    
    // Ordenar por fecha
    reservas.sort((a, b) => a.fechaHora - b.fechaHora);
    
    let mensaje = `📋 *Mis Próximas Citas*\n\n`;
    reservas.forEach((r, idx) => {
      const estadoEmoji = r.estado === 'confirmada' ? '✅' : '⏳';
      mensaje += `${idx + 1}. ${estadoEmoji} *${r.fechaHora.toLocaleString('es-PE')}*\n`;
      mensaje += `   💆 ${r.servicio}\n`;
      mensaje += `   📊 Estado: ${r.estado}\n\n`;
    });
    
    await enviarMensajeSeguro(client, userId, mensaje);
    return true;
  } catch (error) {
    logMessage("ERROR", "Error al obtener mis citas", { error: error.message });
    return false;
  }
}

/**
 * Muestra el estado de la cita más próxima
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>}
 */
async function mostrarEstadoCita(client, userId) {
  try {
    const reservas = await db.obtenerReservas({
      userId: userId,
      estado: ['pendiente', 'confirmada']
    });
    
    if (reservas.length === 0) {
      await enviarMensajeSeguro(
        client,
        userId,
        "ℹ️ No tienes citas activas en este momento."
      );
      return true;
    }
    
    // Ordenar por fecha y tomar la más próxima
    reservas.sort((a, b) => a.fechaHora - b.fechaHora);
    const proximaCita = reservas[0];
    
    const estadoEmoji = proximaCita.estado === 'confirmada' ? '✅' : '⏳';
    const estadoTexto = proximaCita.estado === 'confirmada' ? 'Confirmada' : 
                       proximaCita.estado === 'pendiente' ? 'Pendiente de confirmación' : 'Cancelada';
    
    await enviarMensajeSeguro(
      client,
      userId,
      `📅 *Estado de Mi Cita*\n\n` +
      `${estadoEmoji} *Estado:* ${estadoTexto}\n` +
      `💆 *Servicio:* ${proximaCita.servicio}\n` +
      `📅 *Fecha/Hora:* ${proximaCita.fechaHora.toLocaleString('es-PE')}\n` +
      `⏱️ *Duración:* ${proximaCita.duracion} minutos\n` +
      (proximaCita.deposito > 0 ? `💰 *Depósito:* S/${proximaCita.deposito}\n` : '')
    );
    return true;
  } catch (error) {
    logMessage("ERROR", "Error al obtener estado de cita", { error: error.message });
    return false;
  }
}

/**
 * Muestra precios de servicios
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>}
 */
async function mostrarPrecios(client, userId) {
  try {
    const servicios = await db.listarServicios();
    const serviciosData = require('../data/services');
    
    if (servicios.length === 0 && !serviciosData) {
      await enviarMensajeSeguro(
        client,
        userId,
        "💰 *Precios*\n\nPor favor contacta con nosotros para conocer nuestros precios."
      );
      return true;
    }
    
    let mensaje = `💰 *PRECIOS DE SERVICIOS*\n\n`;
    
    // Si hay servicios en BD, usarlos
    if (servicios.length > 0) {
      servicios.forEach((s) => {
        mensaje += `💆 *${s.nombre}*\n`;
        mensaje += `   ⏱️ ${s.duracion} min - 💰 S/${s.precio}\n\n`;
      });
    } else {
      // Usar datos hardcodeados como fallback
      Object.values(serviciosData).forEach(categoria => {
        if (categoria.opciones) {
          categoria.opciones.forEach(opcion => {
            mensaje += `💆 *${opcion.nombre}*\n`;
            mensaje += `   ${opcion.duracion} - 💰 ${opcion.precio}\n\n`;
          });
        }
      });
    }
    
    mensaje += `💡 *Nota:* Los precios pueden variar. Contacta con nosotros para más información.`;
    
    await enviarMensajeSeguro(client, userId, mensaje);
    return true;
  } catch (error) {
    logMessage("ERROR", "Error al mostrar precios", { error: error.message });
    return false;
  }
}

/**
 * Muestra formas de pago
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>}
 */
async function mostrarFormasPago(client, userId) {
  const YAPE_NUMERO = config.YAPE_NUMERO;
  const YAPE_TITULAR = config.YAPE_TITULAR;
  const BANCO_CUENTA = config.BANCO_CUENTA;
  const DEPOSITO_RESERVA = config.DEPOSITO_RESERVA;
  
  await enviarMensajeSeguro(
    client,
    userId,
    `💳 *FORMAS DE PAGO*\n\n` +
    `Aceptamos los siguientes métodos de pago:\n\n` +
    `📱 *Yape:*\n` +
    `   Número: ${YAPE_NUMERO}\n` +
    `   Titular: ${YAPE_TITULAR}\n\n` +
    `🏦 *Transferencia BCP:*\n` +
    `   Cuenta: ${BANCO_CUENTA}\n\n` +
    `💰 *Depósito de Reserva:*\n` +
    `   S/${DEPOSITO_RESERVA} (requerido para confirmar tu cita)\n\n` +
    `💡 Una vez realizado el pago, envía el comprobante para confirmar tu reserva.`
  );
  return true;
}

/**
 * Muestra ubicación
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>}
 */
async function mostrarUbicacion(client, userId) {
  const UBICACION = config.UBICACION;
  const MAPS_LINK = config.MAPS_LINK;
  
  await enviarMensajeSeguro(
    client,
    userId,
    `📍 *UBICACIÓN*\n\n` +
    `${UBICACION}\n\n` +
    (MAPS_LINK ? `🗺️ Ver en Google Maps:\n${MAPS_LINK}\n\n` : '') +
    `¡Te esperamos! 🌿`
  );
  return true;
}

/**
 * Muestra menú de ayuda
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario
 * @returns {Promise<boolean>}
 */
async function mostrarMenu(client, userId) {
  await enviarMensajeSeguro(
    client,
    userId,
    `📋 *MENÚ DE AYUDA*\n\n` +
    `Puedes usar estos comandos:\n\n` +
    `📅 *mis citas* - Ver tus citas programadas\n` +
    `📊 *estado de mi cita* - Estado de tu próxima cita\n` +
    `💰 *precios* - Ver precios de servicios\n` +
    `💳 *formas de pago* - Métodos de pago aceptados\n` +
    `📍 *ubicacion* - Dirección del local\n` +
    `❌ *cancelar cita* - Cancelar una cita\n` +
    `🔄 *reprogramar cita* - Cambiar fecha/hora\n` +
    `📅 *reservar* - Agendar una nueva cita\n` +
    `👨‍💼 *asesor* - Hablar con un asesor humano\n\n` +
    `💡 También puedes escribir tus preguntas normalmente y te ayudaré.`
  );
  return true;
}

module.exports = {
  mostrarMisCitas,
  mostrarEstadoCita,
  mostrarPrecios,
  mostrarFormasPago,
  mostrarUbicacion,
  mostrarMenu
};
