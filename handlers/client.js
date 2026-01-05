/**
 * Handler para lógica de clientes (reservas, cancelar, reprogramar, asesor)
 */

const { logMessage } = require('../utils/logger');
const { enviarMensajeSeguro, extraerNumero } = require('./messageHelpers');
const db = require('../services/database');
const storage = require('../services/storage');
const config = require('../config');

/**
 * Procesa solicitud de cancelar o reprogramar turno
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario
 * @param {string} textLower - Texto en minúsculas
 * @returns {Promise<boolean>} - true si se procesó la solicitud
 */
async function procesarCancelarReprogramar(client, userId, textLower) {
  // Detectar intención de cancelar
  const quiereCancelar = 
    (textLower.includes("cancelar") && 
     (textLower.includes("cita") || textLower.includes("reserva") || textLower.includes("turno"))) ||
    textLower === "cancelar" ||
    textLower.includes("quiero cancelar");
  
  // Detectar intención de reprogramar
  const quiereReprogramar = 
    (textLower.includes("reprogramar") || textLower.includes("cambiar fecha") || textLower.includes("cambiar hora")) &&
    (textLower.includes("cita") || textLower.includes("reserva") || textLower.includes("turno"));
  
  if (!quiereCancelar && !quiereReprogramar) {
    return false;
  }

  try {
    // Obtener reservas activas del usuario
    const reservasUsuario = await db.obtenerReservas({
      userId: userId,
      estado: ['pendiente', 'confirmada']
    });
    
    if (reservasUsuario.length === 0) {
      await enviarMensajeSeguro(
        client,
        userId,
        "ℹ️ No tienes reservas activas para " + (quiereCancelar ? "cancelar" : "reprogramar") + "."
      );
      return true;
    }
    
    if (quiereCancelar) {
      // Si solo hay una reserva, cancelarla directamente
      if (reservasUsuario.length === 1) {
        await db.actualizarReserva(reservasUsuario[0].id, { estado: 'cancelada' });
        await enviarMensajeSeguro(
          client,
          userId,
          `✅ *Reserva cancelada*\n\n` +
          `Se ha cancelado tu reserva:\n` +
          `📅 ${reservasUsuario[0].fechaHora.toLocaleString('es-PE')}\n` +
          `💆 ${reservasUsuario[0].servicio}\n\n` +
          `Si deseas agendar una nueva cita, solo escribe "reservar" o "agendar".`
        );
        logMessage("INFO", "Reserva cancelada por usuario", {
          userId: extraerNumero(userId),
          reservaId: reservasUsuario[0].id
        });
        return true;
      } else {
        // Si hay múltiples reservas, mostrar lista para seleccionar
        let mensaje = "📋 *Tus reservas activas:*\n\n";
        reservasUsuario.forEach((r, idx) => {
          mensaje += `${idx + 1}. ${r.fechaHora.toLocaleString('es-PE')} - ${r.servicio}\n`;
        });
        mensaje += "\nResponde con el número de la reserva que deseas cancelar.";
        await enviarMensajeSeguro(client, userId, mensaje);
        storage.setUserState(userId, "cancelando_reserva");
        storage.setUserData(userId, { ...storage.getUserData(userId), reservasPendientes: reservasUsuario });
        return true;
      }
    }
    
    if (quiereReprogramar) {
      // Similar a cancelar, pero guiar a nueva fecha/hora
      if (reservasUsuario.length === 1) {
        await enviarMensajeSeguro(
          client,
          userId,
          `🔄 *Reprogramar reserva*\n\n` +
          `Tu reserva actual:\n` +
          `📅 ${reservasUsuario[0].fechaHora.toLocaleString('es-PE')}\n` +
          `💆 ${reservasUsuario[0].servicio}\n\n` +
          `Por favor, indica la nueva fecha y hora que deseas.\n` +
          `Ejemplo: "15 de enero a las 3 de la tarde"`
        );
        storage.setUserState(userId, "reprogramando_reserva");
        storage.setUserData(userId, { ...storage.getUserData(userId), reservaAReprogramar: reservasUsuario[0] });
        return true;
      } else {
        // Múltiples reservas - seleccionar primero
        let mensaje = "📋 *Tus reservas activas:*\n\n";
        reservasUsuario.forEach((r, idx) => {
          mensaje += `${idx + 1}. ${r.fechaHora.toLocaleString('es-PE')} - ${r.servicio}\n`;
        });
        mensaje += "\nResponde con el número de la reserva que deseas reprogramar.";
        await enviarMensajeSeguro(client, userId, mensaje);
        storage.setUserState(userId, "seleccionando_reprogramar");
        storage.setUserData(userId, { ...storage.getUserData(userId), reservasPendientes: reservasUsuario });
        return true;
      }
    }
  } catch (error) {
    logMessage("ERROR", "Error al procesar cancelar/reprogramar", {
      error: error.message,
    });
    await enviarMensajeSeguro(
      client,
      userId,
      "❌ Ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente."
    );
    return true;
  }
}

/**
 * Procesa selección de reserva para cancelar
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario
 * @param {string} textLower - Texto en minúsculas
 * @returns {Promise<boolean>} - true si se procesó la selección
 */
async function procesarSeleccionCancelar(client, userId, textLower) {
  if (storage.getUserState(userId) !== "cancelando_reserva") {
    return false;
  }

  const userData = storage.getUserData(userId) || {};
  const reservasPendientes = userData.reservasPendientes || [];
  const numeroSeleccionado = parseInt(textLower.trim());
  
  if (!isNaN(numeroSeleccionado) && numeroSeleccionado >= 1 && numeroSeleccionado <= reservasPendientes.length) {
    const reservaSeleccionada = reservasPendientes[numeroSeleccionado - 1];
    await db.actualizarReserva(reservaSeleccionada.id, { estado: 'cancelada' });
    await enviarMensajeSeguro(
      client,
      userId,
      `✅ *Reserva cancelada*\n\n` +
      `Se ha cancelado tu reserva:\n` +
      `📅 ${reservaSeleccionada.fechaHora.toLocaleString('es-PE')}\n` +
      `💆 ${reservaSeleccionada.servicio}\n\n` +
      `Si deseas agendar una nueva cita, solo escribe "reservar".`
    );
    storage.setUserState(userId, null);
    delete userData.reservasPendientes;
    storage.setUserData(userId, userData);
    return true;
  }
  
  return false;
}

/**
 * Procesa solicitud de asesor humano
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario
 * @param {string} textLower - Texto en minúsculas
 * @param {string} text - Texto original
 * @param {string} userName - Nombre del usuario
 * @param {Object} estadisticas - Estadísticas globales
 * @returns {Promise<boolean>} - true si se procesó la solicitud
 */
async function procesarSolicitudAsesor(client, userId, textLower, text, userName, estadisticas) {
  const palabrasAsesor = [
    "asesor",
    "asesor humano",
    "hablar con alguien",
    "quiero hablar con un agente",
    "quiero hablar con un representante",
    "representante",
    "agente",
    "humano",
    "persona",
    "hablar con una persona",
    "hablar con un humano",
    "quiero hablar con alguien",
    "necesito hablar con alguien",
    "atencion humana",
    "atención humana",
    "atencion personal",
    "atención personal",
  ];

  if (!palabrasAsesor.some((palabra) => textLower.includes(palabra))) {
    return false;
  }

  storage.setHumanMode(userId, true);
  estadisticas.asesoresActivados++;
  storage.setUserState(userId, "asesor");

  // Guardar timestamp de cuando se activó el modo asesor
  const userDataNuevoAsesor = storage.getUserData(userId) || {};
  userDataNuevoAsesor.modoAsesorDesde = new Date().toISOString();
  userDataNuevoAsesor.iaDesactivada = true;
  storage.setUserData(userId, userDataNuevoAsesor);

  logMessage("INFO", `Usuario ${userName} solicitó hablar con asesor humano - IA desactivada por 3 horas`);

  // Enviar mensaje al usuario
  try {
    await enviarMensajeSeguro(
      client,
      userId,
      "Por supuesto, estoy transfiriendo tu consulta a uno de nuestros representantes. Por favor espera un momento. 😊\n\n" +
        "Un asesor se pondrá en contacto contigo pronto."
    );
    logMessage("SUCCESS", `Mensaje de transferencia enviado al usuario ${userName}`);
  } catch (error) {
    logMessage("ERROR", `Error al enviar mensaje de transferencia al usuario`, {
      error: error.message,
    });
  }

  // Enviar notificación a administradores
  try {
    const ADMIN_NUMBERS = config.ADMIN_NUMBERS;
    const mensajeNotificacion = `🔔 *NUEVA SOLICITUD DE ASESOR*\n\n` +
      `👤 *Usuario:* ${userName}\n` +
      `📱 *Número:* ${extraerNumero(userId)}\n` +
      `💬 *Mensaje:* "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}"\n\n` +
      `⚠️ El bot dejará de responder automáticamente a este usuario.\n` +
      `✅ Puedes atenderlo directamente desde aquí.`;
    
    for (const adminId of ADMIN_NUMBERS) {
      try {
        await enviarMensajeSeguro(client, adminId, mensajeNotificacion);
      } catch (error) {
        logMessage("WARNING", `Error al notificar a administrador ${extraerNumero(adminId)}`, {
          error: error.message
        });
      }
    }
    logMessage("SUCCESS", `Notificación de asesor enviada al administrador`);
  } catch (error) {
    logMessage("WARNING", `Error al notificar al administrador (no crítico)`, {
      error: error.message,
    });
  }

  return true;
}

/**
 * Activa el flujo de reserva para un usuario
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario
 * @param {string} userName - Nombre del usuario
 * @param {Object} estadisticas - Estadísticas globales
 * @returns {Promise<void>}
 */
async function activarFlujoReserva(client, userId, userName, estadisticas) {
  storage.setUserState(userId, "reserva");
  storage.setHumanMode(userId, true);
  estadisticas.reservasSolicitadas++;

  // Guardar timestamp de cuando se activó el modo reserva
  const userDataNuevaReserva = storage.getUserData(userId) || {};
  userDataNuevaReserva.modoReservaDesde = new Date().toISOString();
  userDataNuevaReserva.iaDesactivada = true;
  storage.setUserData(userId, userDataNuevaReserva);

  logMessage("INFO", `Usuario ${userName} solicitó reserva - IA desactivada por 24 horas`);

  const DEPOSITO_RESERVA = config.DEPOSITO_RESERVA;
  const YAPE_NUMERO = config.YAPE_NUMERO;
  const BANCO_CUENTA = config.BANCO_CUENTA;

  // Enviar mensaje al usuario
  try {
    await enviarMensajeSeguro(
      client,
      userId,
      "📅 Perfecto, he recibido tu solicitud de reserva. ✨\n\n" +
        "Un asesor se pondrá en contacto contigo pronto para coordinar todos los detalles.\n\n" +
        "💡 *Información importante:*\n" +
        "• Todas las reservas deben incluir día y mes\n" +
        "• Se requiere un depósito de S/" +
        DEPOSITO_RESERVA +
        " para asegurar tu cita\n" +
        "• El depósito se puede pagar vía Yape (" +
        YAPE_NUMERO +
        ") o Transferencia BCP (" +
        BANCO_CUENTA +
        ")\n\n" +
        "Por favor, envía la siguiente información:\n" +
        "• Tu nombre completo\n" +
        "• Servicio deseado\n" +
        "• Fecha y hora preferida (día y mes)\n\n" +
        "Un asesor te contactará pronto para confirmar tu reserva. 😊"
    );
    logMessage("SUCCESS", `Mensaje de reserva enviado al usuario ${userName}`);
  } catch (error) {
    logMessage("ERROR", `Error al enviar mensaje de reserva al usuario`, {
      error: error.message,
    });
  }

  // Enviar notificación a administradores
  try {
    const ADMIN_NUMBERS = config.ADMIN_NUMBERS;
    const mensajeNotificacion = `🔔 *NUEVA SOLICITUD DE RESERVA*\n\n` +
      `Usuario: ${userName}\n` +
      `Número: ${extraerNumero(userId)}\n\n` +
      `Por favor contacta al cliente para confirmar los detalles.`;
    
    for (const adminId of ADMIN_NUMBERS) {
      try {
        await enviarMensajeSeguro(client, adminId, mensajeNotificacion);
      } catch (error) {
        logMessage("WARNING", `Error al notificar a administrador ${extraerNumero(adminId)}`, {
          error: error.message
        });
      }
    }
    logMessage("SUCCESS", `Notificación de reserva enviada al administrador`);
  } catch (error) {
    logMessage("WARNING", `Error al notificar al administrador (no crítico)`, {
      error: error.message,
    });
  }
}

module.exports = {
  procesarCancelarReprogramar,
  procesarSeleccionCancelar,
  procesarSolicitudAsesor,
  activarFlujoReserva
};
