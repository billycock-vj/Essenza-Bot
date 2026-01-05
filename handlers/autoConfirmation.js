/**
 * Handler para confirmación automática de citas
 */

const { logMessage } = require('../utils/logger');
const { enviarMensajeSeguro } = require('./messageHelpers');
const db = require('../services/database');

/**
 * Verifica y confirma automáticamente citas pendientes
 * @param {Object} client - Cliente de wppconnect
 * @returns {Promise<void>}
 */
async function verificarConfirmacionesAutomaticas(client) {
  try {
    const horasConfirmacion = await db.obtenerConfiguracion('horas_confirmacion_automatica');
    const horas = parseInt(horasConfirmacion || '24', 10);
    
    const ahora = new Date();
    const limiteTiempo = new Date(ahora.getTime() - (horas * 60 * 60 * 1000));
    
    // Obtener reservas pendientes creadas hace más de X horas
    const reservas = await db.obtenerReservas({
      estado: 'pendiente'
    });
    
    for (const reserva of reservas) {
      const fechaCreacion = new Date(reserva.creada);
      if (fechaCreacion < limiteTiempo) {
        // Confirmar automáticamente
        await db.confirmarReserva(reserva.id);
        
        await enviarMensajeSeguro(
          client,
          reserva.userId,
          `✅ *Tu cita ha sido confirmada automáticamente*\n\n` +
          `📅 *Fecha/Hora:* ${reserva.fechaHora.toLocaleString('es-PE')}\n` +
          `💆 *Servicio:* ${reserva.servicio}\n\n` +
          `¡Te esperamos en Essenza Spa! 🌿`
        );
        
        logMessage("INFO", "Cita confirmada automáticamente", {
          reservaId: reserva.id,
          userId: reserva.userId
        });
      }
    }
  } catch (error) {
    logMessage("ERROR", "Error en confirmación automática", { error: error.message });
  }
}

module.exports = {
  verificarConfirmacionesAutomaticas
};
