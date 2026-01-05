/**
 * Funciones auxiliares para el manejo de mensajes
 */

const { logMessage } = require('../utils/logger');
const { validarFormatoUserId } = require('../utils/validators');
const storage = require('../services/storage');

/**
 * Extrae el número de teléfono sin el sufijo (@c.us o @lid)
 * @param {string} userId - ID de usuario completo
 * @returns {string} - Número sin sufijo
 */
function extraerNumero(userId) {
  if (!userId || typeof userId !== "string") return userId;
  return userId.replace(/@(c\.us|lid)$/, "");
}

/**
 * Envía un mensaje de forma segura validando el formato del userId
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario destino
 * @param {string} mensaje - Mensaje a enviar
 * @returns {Promise<boolean>} - true si se envió correctamente
 */
async function enviarMensajeSeguro(client, userId, mensaje) {
  try {
    // Validar que userId existe y tiene formato correcto
    if (!userId || typeof userId !== "string") {
      logMessage("ERROR", "Intento de enviar mensaje con userId inválido", {
        userId: userId,
        mensaje: mensaje.substring(0, 50),
      });
      return false;
    }

    // Asegurar que el userId tiene el formato correcto (@c.us o @lid)
    let numeroFormateado = userId.trim();

    // Si ya tiene @c.us o @lid, mantenerlo
    if (
      numeroFormateado.endsWith("@c.us") ||
      numeroFormateado.endsWith("@lid")
    ) {
      // Ya está en formato correcto, no hacer nada
    } else {
      // Si no termina con @c.us o @lid, agregar @c.us
      // Remover cualquier @g.us u otro sufijo
      numeroFormateado = numeroFormateado.replace(/@.*$/, "");
      // Agregar @c.us por defecto
      numeroFormateado = numeroFormateado + "@c.us";
    }

    // Validar que el número tiene formato válido (@c.us o @lid)
    const esFormatoValido = validarFormatoUserId(numeroFormateado);

    if (!esFormatoValido) {
      logMessage("ERROR", "Número de WhatsApp inválido para enviar mensaje", {
        original: userId,
        formateado: numeroFormateado,
      });
      return false;
    }

    // Validar que NO es un estado (los estados no tienen formato @c.us válido)
    if (
      numeroFormateado.includes("status") ||
      numeroFormateado.includes("broadcast")
    ) {
      logMessage("ERROR", "Intento de enviar mensaje a estado o broadcast", {
        numeroFormateado: numeroFormateado,
      });
      return false;
    }

    // Enviar el mensaje usando el número formateado correctamente
    await client.sendText(numeroFormateado, mensaje);

    if (process.env.LOG_LEVEL === 'verbose') {
      logMessage("SUCCESS", `Mensaje enviado correctamente`, {
        destino: extraerNumero(numeroFormateado),
        longitud: mensaje.length,
      });
    }

    return true;
  } catch (error) {
    logMessage("ERROR", "Error al enviar mensaje", {
      userId: userId,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

/**
 * Inicializa un usuario en el sistema si no existe
 * @param {string} userId - ID del usuario
 */
function inicializarUsuario(userId) {
  if (!storage.getUserState(userId)) {
    storage.setUserState(userId, null);
  }
  if (!storage.getUserData(userId)) {
    storage.setUserData(userId, {});
  }
}

/**
 * Extrae el nombre del usuario del mensaje
 * @param {string} text - Texto del mensaje
 * @returns {string|null} - Nombre extraído o null
 */
function extractName(text) {
  const patterns = [
    /(?:me llamo|mi nombre es|soy|yo soy)\s+([a-záéíóúñ\s]+)/i,
    /(?:nombre|name)[\s:]+([a-záéíóúñ\s]+)/i,
    /(?:me llaman|me dicen)\s+([a-záéíóúñ\s]+)/i,
    /(?:puedes llamarme|llámame)\s+([a-záéíóúñ\s]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().split(/\s+/)[0]; // Primer nombre
    }
  }
  return null;
}

module.exports = {
  extraerNumero,
  enviarMensajeSeguro,
  inicializarUsuario,
  extractName
};
