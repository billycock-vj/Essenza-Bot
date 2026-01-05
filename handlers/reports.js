/**
 * Handler para reportes y estadísticas
 */

const { logMessage } = require('../utils/logger');
const { enviarMensajeSeguro, extraerNumero } = require('./messageHelpers');
const db = require('../services/database');

/**
 * Genera y envía reporte diario
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del administrador
 * @param {Date} fecha - Fecha del reporte (opcional)
 * @returns {Promise<void>}
 */
async function enviarReporteDiario(client, userId, fecha = null) {
  try {
    const reporte = await db.generarReporteDiario(fecha);
    const fechaReporte = fecha || new Date();
    
    const mensaje = `📊 *REPORTE DIARIO*\n\n` +
      `📅 Fecha: ${fechaReporte.toLocaleDateString('es-PE')}\n\n` +
      `📈 *Resumen:*\n` +
      `• Total de citas: ${reporte.total || 0}\n` +
      `• ⏳ Pendientes: ${reporte.pendientes || 0}\n` +
      `• ✅ Confirmadas: ${reporte.confirmadas || 0}\n` +
      `• ❌ Canceladas: ${reporte.canceladas || 0}\n\n` +
      `📊 *Actividad del día:*\n` +
      `• Creadas hoy: ${reporte.creadas_hoy || 0}\n` +
      `• Confirmadas hoy: ${reporte.confirmadas_hoy || 0}\n` +
      `• Canceladas hoy: ${reporte.canceladas_hoy || 0}`;
    
    await enviarMensajeSeguro(client, userId, mensaje);
    logMessage("INFO", "Reporte diario enviado", { adminId: extraerNumero(userId) });
  } catch (error) {
    logMessage("ERROR", "Error al generar reporte diario", { error: error.message });
    await enviarMensajeSeguro(
      client,
      userId,
      "❌ Error al generar el reporte diario. Por favor, intenta más tarde."
    );
  }
}

/**
 * Genera y envía reporte mensual
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del administrador
 * @param {number} mes - Mes (1-12)
 * @param {number} año - Año
 * @returns {Promise<void>}
 */
async function enviarReporteMensual(client, userId, mes, año) {
  try {
    const reporte = await db.generarReporteMensual(mes, año);
    const nombreMes = new Date(año, mes - 1, 1).toLocaleDateString('es-PE', { month: 'long' });
    
    const mensaje = `📊 *REPORTE MENSUAL*\n\n` +
      `📅 Período: ${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${año}\n\n` +
      `📈 *Resumen:*\n` +
      `• Total de citas: ${reporte.total || 0}\n` +
      `• ⏳ Pendientes: ${reporte.pendientes || 0}\n` +
      `• ✅ Confirmadas: ${reporte.confirmadas || 0}\n` +
      `• ❌ Canceladas: ${reporte.canceladas || 0}\n\n` +
      `📊 *Actividad del mes:*\n` +
      `• Creadas: ${reporte.creadas_mes || 0}\n` +
      `• Confirmadas: ${reporte.confirmadas_mes || 0}\n` +
      `• Canceladas: ${reporte.canceladas_mes || 0}`;
    
    await enviarMensajeSeguro(client, userId, mensaje);
    logMessage("INFO", "Reporte mensual enviado", { adminId: extraerNumero(userId), mes, año });
  } catch (error) {
    logMessage("ERROR", "Error al generar reporte mensual", { error: error.message });
    await enviarMensajeSeguro(
      client,
      userId,
      "❌ Error al generar el reporte mensual. Por favor, intenta más tarde."
    );
  }
}

/**
 * Envía top servicios más solicitados
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del administrador
 * @param {number} limite - Cantidad de servicios a mostrar (default: 10)
 * @returns {Promise<void>}
 */
async function enviarTopServicios(client, userId, limite = 10) {
  try {
    const topServicios = await db.obtenerTopServicios(limite);
    
    if (topServicios.length === 0) {
      await enviarMensajeSeguro(
        client,
        userId,
        "📊 *TOP SERVICIOS*\n\nNo hay datos suficientes para generar el ranking."
      );
      return;
    }
    
    let mensaje = `📊 *TOP ${limite} SERVICIOS MÁS SOLICITADOS*\n\n`;
    
    topServicios.forEach((servicio, idx) => {
      mensaje += `${idx + 1}. *${servicio.servicio}*\n`;
      mensaje += `   📈 Total: ${servicio.total_reservas}\n`;
      mensaje += `   ✅ Confirmadas: ${servicio.confirmadas}\n`;
      mensaje += `   ❌ Canceladas: ${servicio.canceladas}\n\n`;
    });
    
    await enviarMensajeSeguro(client, userId, mensaje);
    logMessage("INFO", "Top servicios enviado", { adminId: extraerNumero(userId) });
  } catch (error) {
    logMessage("ERROR", "Error al obtener top servicios", { error: error.message });
    await enviarMensajeSeguro(
      client,
      userId,
      "❌ Error al obtener el top de servicios. Por favor, intenta más tarde."
    );
  }
}

module.exports = {
  enviarReporteDiario,
  enviarReporteMensual,
  enviarTopServicios
};
