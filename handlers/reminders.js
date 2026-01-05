/**
 * Handler para recordatorios y gestión de reservas
 */

const { logMessage } = require('../utils/logger');
const { enviarMensajeSeguro } = require('./messageHelpers');
const { validarFecha, validarServicio } = require('../utils/validators');
const db = require('../services/database');
const storage = require('../services/storage');
const persistence = require('../services/persistence');
const config = require('../config');

const MAX_RESERVAS = config.MAX_RESERVAS;

/**
 * Guarda una reserva para recordatorio (en storage, no en DB)
 * @param {string} userId - ID del usuario
 * @param {string} userName - Nombre del usuario
 * @param {string} servicio - Nombre del servicio
 * @param {Date} fechaHora - Fecha y hora de la reserva
 * @param {number} duracionMinutos - Duración en minutos (default: 60)
 * @returns {{exito: boolean, error?: string, reserva?: Object}} - Resultado de la operación
 */
function guardarReserva(userId, userName, servicio, fechaHora, duracionMinutos = 60) {
  // Validar fecha y horario de atención
  const validacionFecha = validarFecha(fechaHora, duracionMinutos);
  if (!validacionFecha.valida) {
    logMessage("ERROR", `Error al guardar reserva: ${validacionFecha.error}`, {
      userId: userId,
      servicio: servicio,
      fechaHora: fechaHora,
      duracion: duracionMinutos
    });
    return { exito: false, error: validacionFecha.error };
  }
  
  // Validar servicio (opcional, pero recomendado)
  const validacionServicio = validarServicio(servicio);
  if (!validacionServicio.existe && config.LOG_LEVEL === 'verbose') {
    logMessage("WARNING", `Servicio no encontrado en base de datos`, {
      servicio: servicio
    });
  }
  
  const reserva = {
    userId,
    userName,
    servicio,
    fechaHora: validacionFecha.fecha,
    notificado: false,
    creada: new Date(),
  };
  
  // Si se alcanza el límite, eliminar las más antiguas
  const reservas = storage.getReservas();
  if (reservas.length >= MAX_RESERVAS) {
    reservas.sort((a, b) => a.creada - b.creada);
    reservas.splice(0, reservas.length - MAX_RESERVAS + 1);
    logMessage("WARNING", `Límite de reservas alcanzado, eliminando las más antiguas`);
  }
  
  storage.addReserva(reserva);
  // Guardar persistencia
  persistence.guardarReservas(storage.getReservas());
  logMessage("INFO", `Reserva guardada para recordatorio`, { 
    servicio: reserva.servicio,
    fechaHora: reserva.fechaHora.toISOString(),
    duracion: duracionMinutos
  });
  
  return { exito: true, reserva: reserva };
}

/**
 * Verifica y envía recordatorios de citas próximas
 * @param {Object} client - Cliente de wppconnect
 * @returns {Promise<void>}
 */
async function verificarRecordatorios(client) {
  try {
    const ahora = new Date();
    const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    
    // Obtener reservas desde la base de datos
    const reservas = await db.obtenerReservas({
      estado: 'pendiente',
      fechaDesde: ahora,
      fechaHasta: en24Horas
    });

    for (const reserva of reservas) {
      if (
        !reserva.notificado &&
        reserva.fechaHora <= en24Horas &&
        reserva.fechaHora > ahora
      ) {
        try {
          const horasRestantes = Math.round(
            (reserva.fechaHora - ahora) / (1000 * 60 * 60)
          );

          // Validar que la reserva sea en el futuro
          if (horasRestantes <= 0) {
            logMessage("WARNING", `Reserva pasada detectada para ${reserva.userName}`, {
              fechaHora: reserva.fechaHora,
              ahora: ahora
            });
            reserva.notificado = true; // Marcar como notificado para no volver a intentar
            continue;
          }

          await enviarMensajeSeguro(
            client,
            reserva.userId,
            `🔔 *Recordatorio de Cita*\n\n` +
              `Hola ${reserva.userName}! 👋\n\n` +
              `Te recordamos que tienes una cita programada:\n` +
              `📅 *Servicio:* ${reserva.servicio}\n` +
              `⏰ *Fecha/Hora:* ${reserva.fechaHora.toLocaleString("es-PE")}\n` +
              `⏳ *En aproximadamente ${horasRestantes} hora(s)*\n\n` +
              `¿Confirmas tu asistencia?\n\n` +
              `Responde:\n` +
              `✅ *Confirmar* - Para confirmar tu cita\n` +
              `❌ *Cancelar* - Para cancelar tu cita`
          );
          // Actualizar en base de datos y agregar nota
          const notasActuales = reserva.notas || '';
          const nuevaNota = notasActuales ? notasActuales + ' | Esperando confirmación' : 'Esperando confirmación';
          await db.actualizarReserva(reserva.id, { 
            notificado: true,
            notas: nuevaNota
          });
          logMessage("SUCCESS", `Recordatorio enviado a ${reserva.userName}`);
        } catch (error) {
          logMessage("ERROR", `Error al enviar recordatorio`, {
            error: error.message,
          });
        }
      }
    }

    // Sincronizar storage con base de datos para recordatorios
    const reservasPendientes = await db.obtenerReservas({
      estado: 'pendiente',
      fechaDesde: ahora
    });
    storage.reservas = reservasPendientes.slice(0, MAX_RESERVAS);
    
  } catch (error) {
    logMessage("ERROR", "Error al verificar recordatorios", {
      error: error.message
    });
  }
}

module.exports = {
  guardarReserva,
  verificarRecordatorios
};
