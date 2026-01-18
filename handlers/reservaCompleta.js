/**
 * Handler unificado para crear reserva y generar imagen de confirmación
 */

const db = require('../services/database');
const { parsearTextoReserva } = require('../utils/reservaParser');
const { generarImagenCita } = require('./imageGenerator');
const { normalizarTelefono } = require('./messageHelpers');
const { validarFecha } = require('../utils/validators');
const { logMessage } = require('../utils/logger');

/**
 * Crea una reserva en SQLite y genera una imagen de confirmación
 * NOTA: La validación de administrador debe hacerse ANTES de llamar a esta función
 * @param {string} textoMensaje - Texto del mensaje del admin con datos de la cita
 * @param {string} userIdAdmin - ID del administrador que crea la reserva (ya validado)
 * @returns {Promise<Object>} - Objeto con { idReserva, reserva, imagenBuffer }
 * @throws {Error} - Si hay error en validación, parsing o guardado
 */
async function crearReservaYGenerarImagen(textoMensaje, userIdAdmin) {
  // NOTA: La validación de administrador se hace en admin.js antes de llamar a esta función

  // Parsear el texto a objeto estructurado
  const datosParseados = parsearTextoReserva(textoMensaje);

  // Convertir fecha y hora a objeto Date
  const fechaHora = parsearFechaHora(datosParseados.fechaTexto, datosParseados.hora);

  // Normalizar teléfono del cliente
  const telefonoNormalizado = normalizarTelefono(datosParseados.telefono);
  if (!telefonoNormalizado) {
    throw new Error(`Teléfono inválido: ${datosParseados.telefono}`);
  }
  const userIdCliente = telefonoNormalizado + '@c.us';

  // Obtener duración del servicio (default 60 minutos)
  const duracion = obtenerDuracionServicio(datosParseados.servicio);

  // Validar fecha y horario
  const validacion = validarFecha(fechaHora, duracion);
  if (!validacion.valida) {
    throw new Error(validacion.error || 'Fecha u horario inválido');
  }

  // Crear objeto de reserva para SQLite
  const reserva = {
    userId: userIdCliente,
    userName: datosParseados.cliente,
    servicio: datosParseados.servicio,
    fechaHora: validacion.fecha instanceof Date ? validacion.fecha : new Date(validacion.fecha),
    duracion: duracion,
    estado: datosParseados.estado.toLowerCase() === 'confirmada' ? 'confirmada' : 'pendiente',
    deposito: datosParseados.deposito || 0,
    origen: 'admin'
  };

  // Guardar en SQLite
  let idReserva;
  try {
    idReserva = await db.guardarReserva(reserva);
    logMessage("SUCCESS", "Reserva guardada en SQLite", {
      idReserva: idReserva,
      reserva: reserva
    });
  } catch (error) {
    logMessage("ERROR", "Error al guardar reserva en SQLite", {
      error: error.message,
      stack: error.stack,
      reserva: reserva
    });
    throw new Error(`Error al guardar reserva: ${error.message}`);
  }

  // Preparar datos para la imagen (usar los mismos datos que se guardaron)
  const datosParaImagen = {
    fechaTexto: datosParseados.fechaTexto,
    hora: datosParseados.hora,
    cliente: reserva.userName,
    telefono: datosParseados.telefono,
    servicio: reserva.servicio,
    precio: datosParseados.precio || 'A revisión',
    deposito: reserva.deposito,
    estado: reserva.estado.charAt(0).toUpperCase() + reserva.estado.slice(1)
  };

  // Generar imagen usando la plantilla base
  let imagenBuffer;
  try {
    imagenBuffer = await generarImagenCita(datosParaImagen, idReserva);
    logMessage("SUCCESS", "Imagen de cita generada", {
      idReserva: idReserva,
      tamañoBuffer: imagenBuffer.length
    });
  } catch (error) {
    logMessage("ERROR", "Error al generar imagen de cita", {
      error: error.message,
      stack: error.stack,
      idReserva: idReserva
    });
    // No lanzar error aquí - la reserva ya está guardada
    // Solo loguear el error
    throw new Error(`Error al generar imagen: ${error.message}`);
  }

  return {
    idReserva: idReserva,
    reserva: reserva,
    imagenBuffer: imagenBuffer
  };
}

/**
 * Parsea fecha y hora a objeto Date
 * @param {string} fechaTexto - Texto de fecha (ej: "11/01/2026" o "Sábado 17/01/2026")
 * @param {string} hora - Texto de hora (ej: "16:00")
 * @returns {Date} - Objeto Date
 */
function parsearFechaHora(fechaTexto, hora) {
  // Extraer solo la parte de la fecha (puede venir con día de la semana)
  // Ejemplos: "Sábado 17/01/2026" -> "17/01/2026", "11/01/2026" -> "11/01/2026"
  const fechaMatch = fechaTexto.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (!fechaMatch) {
    throw new Error('Formato de fecha inválido. Debe ser DD/MM/YYYY o incluir día de la semana');
  }
  
  const fechaSolo = fechaMatch[1];
  const partesFecha = fechaSolo.split('/');
  if (partesFecha.length !== 3) {
    throw new Error('Formato de fecha inválido');
  }

  const dia = parseInt(partesFecha[0], 10);
  const mes = parseInt(partesFecha[1], 10) - 1; // Meses en JS son 0-indexed
  const año = parseInt(partesFecha[2], 10);

  const [horaNum, minutos] = hora.split(':').map(n => parseInt(n, 10));

  const fechaHora = new Date(año, mes, dia, horaNum, minutos);

  // Validar que la fecha es válida
  if (fechaHora.getDate() !== dia || fechaHora.getMonth() !== mes || fechaHora.getFullYear() !== año) {
    throw new Error('Fecha inválida');
  }

  return fechaHora;
}

/**
 * Obtiene la duración del servicio en minutos
 * @param {string} nombreServicio - Nombre del servicio
 * @returns {number} - Duración en minutos (default: 60)
 */
function obtenerDuracionServicio(nombreServicio) {
  // Por ahora, retornar 60 minutos por defecto
  // Se puede mejorar consultando la base de datos de servicios
  return 60;
}

module.exports = {
  crearReservaYGenerarImagen
};
