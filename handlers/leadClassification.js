/**
 * Módulo para clasificación automática de leads
 * Analiza los mensajes del cliente y determina su estado de lead
 */

/**
 * Clasifica un mensaje y determina el estado de lead del cliente
 * @param {string} mensaje - Mensaje del cliente
 * @param {string} estadoActual - Estado actual del cliente
 * @returns {string} - Nuevo estado: 'info', 'lead_tibio', 'lead_caliente', 'reservado'
 */
function clasificarLead(mensaje, estadoActual = 'info') {
  const texto = mensaje.toLowerCase().trim();
  
  // Palabras clave para reservado (confirmación explícita)
  const palabrasReservado = [
    'reservar', 'reserva', 'reservo', 'reservado', 'confirmar', 'confirmo',
    'quiero reservar', 'deseo reservar', 'hacer reserva', 'agendar', 'cita confirmada',
    'sí, reservo', 'sí, quiero', 'acepto', 'de acuerdo', 'perfecto, reservo'
  ];
  
  // Palabras clave para lead_caliente (interés alto - pregunta por horarios/disponibilidad)
  const palabrasLeadCaliente = [
    'horario', 'horarios', 'disponible', 'disponibilidad', 'cuándo', 'cuando',
    'qué día', 'que dia', 'qué hora', 'que hora', 'mañana', 'pasado mañana',
    'esta semana', 'próxima semana', 'proxima semana', 'fines de semana',
    'sábado', 'sabado', 'domingo', 'lunes', 'martes', 'miércoles', 'miercoles',
    'jueves', 'viernes', 'turno', 'turnos', 'cupo', 'cupos', 'hay lugar',
    'tienen espacio', 'puedo ir', 'me conviene'
  ];
  
  // Palabras clave para lead_tibio (interés moderado)
  const palabrasLeadTibio = [
    'precio', 'precios', 'cuánto cuesta', 'cuanto cuesta', 'costo', 'costos',
    'qué servicios', 'que servicios', 'qué tienen', 'que tienen', 'información',
    'informacion', 'más información', 'mas informacion', 'detalles', 'me interesa',
    'suena bien', 'me gusta', 'qué incluye', 'que incluye'
  ];
  
  // Verificar si es reservado
  if (palabrasReservado.some(palabra => texto.includes(palabra))) {
    return 'reservado';
  }
  
  // Si ya es reservado, mantenerlo
  if (estadoActual === 'reservado') {
    return 'reservado';
  }
  
  // Verificar si es lead_caliente
  if (palabrasLeadCaliente.some(palabra => texto.includes(palabra))) {
    return 'lead_caliente';
  }
  
  // Si ya es lead_caliente, mantenerlo (solo sube, no baja)
  if (estadoActual === 'lead_caliente') {
    return 'lead_caliente';
  }
  
  // Verificar si es lead_tibio
  if (palabrasLeadTibio.some(palabra => texto.includes(palabra))) {
    return 'lead_tibio';
  }
  
  // Si ya es lead_tibio, mantenerlo (solo sube, no baja)
  if (estadoActual === 'lead_tibio') {
    return 'lead_tibio';
  }
  
  // Por defecto, es info (solo pidió información)
  return 'info';
}

/**
 * Actualiza el estado de lead de un cliente basado en su mensaje
 * @param {Object} db - Instancia de la base de datos
 * @param {string} sessionId - ID de sesión del cliente
 * @param {string} mensaje - Mensaje del cliente
 * @returns {Promise<string>} - Nuevo estado de lead
 */
async function actualizarEstadoLeadCliente(db, sessionId, mensaje) {
  try {
    // Obtener estado actual del cliente
    const cliente = await db.obtenerOCrearCliente(sessionId);
    const estadoActual = cliente?.estado_lead || 'info';
    
    // Clasificar el nuevo estado
    const nuevoEstado = clasificarLead(mensaje, estadoActual);
    
    // Actualizar en la base de datos
    await db.actualizarEstadoLead(sessionId, nuevoEstado);
    
    return nuevoEstado;
  } catch (error) {
    console.error('Error al actualizar estado de lead:', error);
    return 'info'; // Por defecto
  }
}

module.exports = {
  clasificarLead,
  actualizarEstadoLeadCliente
};
