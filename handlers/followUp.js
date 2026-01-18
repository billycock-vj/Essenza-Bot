/**
 * Módulo para seguimiento automático inteligente de leads
 * Envía mensajes de seguimiento a clientes según su estado
 */

const db = require('../services/database');

// Mensaje de seguimiento (tipo 1: 12-24 horas)
const MENSAJE_SEGUIMIENTO_1 = `Hola 👋 Te escribimos para saber si te gustaría reservar tu cita o si tienes alguna duda sobre nuestros servicios. Tenemos cupos disponibles ✨`;

// Mensaje de seguimiento (tipo 2: 48-72 horas) - Solo si no hubo respuesta
const MENSAJE_SEGUIMIENTO_2 = `Hola 👋 Recordamos que estamos aquí para ayudarte. Si tienes alguna pregunta sobre nuestros servicios o quieres reservar tu cita, no dudes en escribirnos. Estamos para servirte 💆‍♀️✨`;

/**
 * Envía seguimientos automáticos a clientes que lo necesitan
 * @param {Object} client - Cliente de wppconnect
 * @returns {Promise<void>}
 */
async function enviarSeguimientosAutomaticos(client) {
  try {
    // Obtener clientes que necesitan primer seguimiento (12-24 horas)
    const clientesPrimerSeguimiento = await db.obtenerClientesParaSeguimiento(12, 24);
    
    for (const cliente of clientesPrimerSeguimiento) {
      // Verificar si ya se envió el primer seguimiento
      const yaEnviado = await db.yaSeEnvioSeguimiento(cliente.session_id, 'primero');
      
      if (!yaEnviado && cliente.total_seguimientos === 0) {
        try {
          // Enviar mensaje
          await client.sendText(cliente.session_id, MENSAJE_SEGUIMIENTO_1);
          
          // Registrar seguimiento
          await db.registrarSeguimiento(cliente.session_id, 'primero', MENSAJE_SEGUIMIENTO_1);
          
          console.log(`✅ Seguimiento 1 enviado a ${cliente.session_id} (${cliente.nombre || 'Sin nombre'})`);
        } catch (error) {
          console.error(`❌ Error al enviar seguimiento 1 a ${cliente.session_id}:`, error.message);
        }
      }
    }
    
    // Obtener clientes que necesitan segundo seguimiento (48-72 horas después del primero)
    const clientesSegundoSeguimiento = await db.obtenerClientesParaSegundoSeguimiento();
    
    for (const cliente of clientesSegundoSeguimiento) {
      // Verificar que no haya respondido
      const seguimientos = await db.obtenerSeguimientos(cliente.session_id);
      const tieneRespuesta = seguimientos.some(s => s.respuesta_recibida === 1);
      
      if (!tieneRespuesta && cliente.tiene_primero > 0 && cliente.tiene_segundo === 0) {
        try {
          // Enviar mensaje
          await client.sendText(cliente.session_id, MENSAJE_SEGUIMIENTO_2);
          
          // Registrar seguimiento
          await db.registrarSeguimiento(cliente.session_id, 'segundo', MENSAJE_SEGUIMIENTO_2);
          
          console.log(`✅ Seguimiento 2 enviado a ${cliente.session_id} (${cliente.nombre || 'Sin nombre'})`);
        } catch (error) {
          console.error(`❌ Error al enviar seguimiento 2 a ${cliente.session_id}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error en seguimientos automáticos:', error);
  }
}

/**
 * Marca que un cliente respondió (detiene seguimientos pendientes)
 * @param {string} sessionId - ID de sesión del cliente
 * @returns {Promise<void>}
 */
async function marcarClienteRespondio(sessionId) {
  try {
    await db.marcarRespuestaSeguimiento(sessionId);
  } catch (error) {
    console.error('Error al marcar respuesta de cliente:', error);
  }
}

module.exports = {
  enviarSeguimientosAutomaticos,
  marcarClienteRespondio
};
