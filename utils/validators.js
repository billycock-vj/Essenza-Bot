// Funciones de validación
const servicios = require('../data/services');

/**
 * Valida el formato de un userId de WhatsApp
 * @param {string} userId - ID del usuario
 * @returns {boolean} - true si el formato es válido
 */
function validarFormatoUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    return false;
  }
  
  // Formato válido: número@c.us o número@lid
  const formatoValido = /^\d+@(c\.us|lid)$/;
  return formatoValido.test(userId);
}

/**
 * Obtiene el horario de atención para un día específico
 * @param {Date} fecha - Fecha a consultar
 * @returns {{abierto: boolean, apertura?: number, cierre?: number, mensaje?: string}} - Horario del día
 */
function obtenerHorarioDelDia(fecha) {
  const diaSemana = fecha.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const horarios = {
    0: { abierto: true, apertura: 11, cierre: 18 }, // Domingo - 11:00 AM - 6:00 PM
    1: { abierto: true, apertura: 11, cierre: 18 }, // Lunes - 11:00 AM - 6:00 PM
    2: { abierto: true, apertura: 11, cierre: 18 }, // Martes - 11:00 AM - 6:00 PM
    3: { abierto: true, apertura: 11, cierre: 18 }, // Miércoles - 11:00 AM - 6:00 PM
    4: { abierto: true, apertura: 11, cierre: 18 }, // Jueves - 11:00 AM - 6:00 PM
    5: { abierto: true, apertura: 11, cierre: 18 }, // Viernes - 11:00 AM - 6:00 PM
    6: { abierto: true, apertura: 11, cierre: 18 }, // Sábado - 11:00 AM - 6:00 PM
  };
  
  return horarios[diaSemana] || { abierto: false, mensaje: "Día no disponible" };
}

/**
 * Valida una fecha para reservas, incluyendo horario de atención
 * @param {string|Date} fechaHora - Fecha a validar
 * @param {number} duracionMinutos - Duración de la cita en minutos (default: 60)
 * @returns {{valida: boolean, error?: string, fecha?: Date}} - Resultado de la validación
 */
function validarFecha(fechaHora, duracionMinutos = 60) {
  if (!fechaHora) {
    return { valida: false, error: "Fecha no proporcionada" };
  }
  
  const fecha = new Date(fechaHora);
  
  // Verificar que la fecha sea válida
  if (isNaN(fecha.getTime())) {
    return { valida: false, error: "Fecha inválida" };
  }
  
  // Verificar que la fecha sea en el futuro
  const ahora = new Date();
  if (fecha <= ahora) {
    return { valida: false, error: "La fecha debe ser en el futuro" };
  }
  
  // Verificar que no sea más de 1 año en el futuro
  const unAno = new Date(ahora.getTime() + 365 * 24 * 60 * 60 * 1000);
  if (fecha > unAno) {
    return { valida: false, error: "La fecha no puede ser más de 1 año en el futuro" };
  }
  
  // Validar horario de atención
  const horario = obtenerHorarioDelDia(fecha);
  
  if (!horario.abierto) {
    const nombreDia = fecha.toLocaleDateString('es-PE', { weekday: 'long' });
    return { 
      valida: false, 
      error: `Lo sentimos, ${nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)} estamos cerrados. ${horario.mensaje || 'Por favor, elige otro día.'}` 
    };
  }
  
  // Obtener hora de la cita
  const horaCita = fecha.getHours();
  const minutoCita = fecha.getMinutes();
  
  // Calcular hora de finalización de la cita
  const fechaFin = new Date(fecha.getTime() + duracionMinutos * 60 * 1000);
  const horaFin = fechaFin.getHours();
  const minutoFin = fechaFin.getMinutes();
  
  // Validar que la hora de inicio esté dentro del horario
  const horaInicioMinutos = horaCita * 60 + minutoCita;
  const horaAperturaMinutos = horario.apertura * 60;
  const horaCierreMinutos = horario.cierre * 60;
  
  if (horaInicioMinutos < horaAperturaMinutos) {
    return { 
      valida: false, 
      error: `El horario de atención comienza a las ${horario.apertura}:00. Por favor, elige una hora después de las ${horario.apertura}:00.` 
    };
  }
  
  // Validar que la cita no se extienda más allá del horario de cierre
  if (horaFin > horario.cierre || (horaFin === horario.cierre && minutoFin > 0)) {
    const horaMaxima = new Date(fecha);
    horaMaxima.setHours(horario.cierre, 0, 0, 0);
    const horaMaximaInicio = new Date(horaMaxima.getTime() - duracionMinutos * 60 * 1000);
    
    return { 
      valida: false, 
      error: `El horario de atención termina a las ${horario.cierre}:00. La última cita disponible es a las ${horaMaximaInicio.getHours()}:${String(horaMaximaInicio.getMinutes()).padStart(2, '0')}.` 
    };
  }
  
  return { valida: true, fecha: fecha };
}

/**
 * Valida que un servicio existe en la base de datos
 * @param {string} nombreServicio - Nombre del servicio a buscar
 * @returns {{existe: boolean, error?: string, servicio?: object, opcion?: object}} - Resultado de la búsqueda
 */
function validarServicio(nombreServicio) {
  if (!nombreServicio || typeof nombreServicio !== 'string') {
    return { existe: false, error: "Nombre de servicio no válido" };
  }
  
  // Buscar en todos los servicios
  for (const servicioId in servicios) {
    const servicio = servicios[servicioId];
    
    // Buscar en el nombre del servicio
    if (servicio.nombre && servicio.nombre.toLowerCase().includes(nombreServicio.toLowerCase())) {
      return { existe: true, servicio: servicio };
    }
    
    // Buscar en las opciones
    if (servicio.opciones) {
      for (const opcion of servicio.opciones) {
        if (opcion.nombre && opcion.nombre.toLowerCase().includes(nombreServicio.toLowerCase())) {
          return { existe: true, servicio: servicio, opcion: opcion };
        }
      }
    }
  }
  
  return { existe: false, error: "Servicio no encontrado" };
}

/**
 * Sanitiza un mensaje del usuario
 * @param {string} mensaje - Mensaje a sanitizar
 * @param {number} maxLength - Longitud máxima (default: 2000)
 * @returns {string} - Mensaje sanitizado
 */
function sanitizarMensaje(mensaje, maxLength = 2000) {
  if (typeof mensaje !== 'string') {
    return '';
  }
  
  // Limitar longitud
  let sanitizado = mensaje.substring(0, maxLength);
  
  // Eliminar caracteres de control (excepto \n, \r, \t)
  sanitizado = sanitizado.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Limitar líneas (prevenir spam)
  const lineas = sanitizado.split('\n');
  if (lineas.length > 50) {
    sanitizado = lineas.slice(0, 50).join('\n');
  }
  
  return sanitizado.trim();
}

/**
 * Sanitiza datos sensibles para logs
 * @param {object} data - Datos a sanitizar
 * @returns {object} - Datos sanitizados
 */
function sanitizarDatosParaLog(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const sanitizado = { ...data };
  
  // Ocultar números de teléfono (últimos 4 dígitos)
  const camposSensibles = ['userId', 'numero', 'telefono', 'phone', 'user', 'from'];
  for (const campo of camposSensibles) {
    if (sanitizado[campo] && typeof sanitizado[campo] === 'string') {
      const valor = sanitizado[campo];
      // Si es un número de teléfono, ocultar últimos dígitos
      if (valor.match(/\d+@(c\.us|lid)/)) {
        const numero = valor.split('@')[0];
        if (numero.length > 4) {
          sanitizado[campo] = numero.substring(0, numero.length - 4) + '****@' + valor.split('@')[1];
        } else {
          sanitizado[campo] = '****@' + valor.split('@')[1];
        }
      }
    }
  }
  
  // Ocultar API keys
  if (sanitizado.apiKey || sanitizado.OPENAI_API_KEY) {
    sanitizado.apiKey = '***HIDDEN***';
    sanitizado.OPENAI_API_KEY = '***HIDDEN***';
  }
  
  return sanitizado;
}

/**
 * Fuzzy matching para errores de escritura y coincidencias flexibles
 * @param {string} input - Texto de entrada
 * @param {string} target - Texto objetivo
 * @param {number} threshold - Umbral de similitud (0-1, default: 0.7)
 * @returns {boolean} - true si hay coincidencia
 */
function fuzzyMatch(input, target, threshold = 0.7) {
  const inputLower = input.toLowerCase();
  const targetLower = target.toLowerCase();

  if (inputLower === targetLower) return true;
  if (inputLower.includes(targetLower) || targetLower.includes(inputLower))
    return true;

  // Calcular similitud simple (Levenshtein simplificado)
  let matches = 0;
  const minLen = Math.min(inputLower.length, targetLower.length);
  for (let i = 0; i < minLen; i++) {
    if (inputLower[i] === targetLower[i]) matches++;
  }
  return matches / Math.max(inputLower.length, targetLower.length) >= threshold;
}

module.exports = {
  validarFormatoUserId,
  validarFecha,
  validarServicio,
  sanitizarMensaje,
  sanitizarDatosParaLog,
  obtenerHorarioDelDia,
  fuzzyMatch
};

