/**
 * Funciones auxiliares para el manejo de mensajes
 */

const { logMessage } = require('../utils/logger');
const { validarFormatoUserId } = require('../utils/validators');
const storage = require('../services/storage');

/**
 * Extrae el número real de teléfono del payload del mensaje
 * SOLO desde message.from (@c.us) o contacts[0].wa_id
 * NO intenta extraer números de @lid (identificador de sesión)
 * NO inventa ni reconstruye números
 * @param {Object} message - Objeto del mensaje de WhatsApp
 * @returns {string|null} - Número de teléfono real o null si no está disponible
 */
function extraerNumeroReal(message) {
  if (!message) return null;
  
  // Prioridad 1: message.from si termina en @c.us (número real)
  if (message.from && message.from.endsWith('@c.us')) {
    const numero = message.from.replace('@c.us', '');
    // Validar que sea un número (solo dígitos)
    if (/^\d+$/.test(numero)) {
      return numero;
    }
  }
  
  // Prioridad 2: contacts[0].wa_id (Cloud API)
  if (message.contacts && Array.isArray(message.contacts) && message.contacts.length > 0) {
    const wa_id = message.contacts[0].wa_id;
    if (wa_id && /^\d+$/.test(wa_id)) {
      return wa_id;
    }
  }
  
  // Si no está disponible en ninguna de las fuentes válidas, retornar null
  // NO intentar desde message.wid, message.author u otras fuentes
  // NO intentar extraer números de @lid
  return null;
}

/**
 * Extrae el session_id (userId completo con @c.us o @lid)
 * @param {string} userId - ID de usuario completo (session_id)
 * @returns {string} - Session ID sin modificar
 */
function extraerSessionId(userId) {
  if (!userId || typeof userId !== "string") return userId;
  return userId; // Retornar tal cual, es el session_id
}

/**
 * DEPRECATED: No usar para extraer números de @lid
 * Solo usar para compatibilidad con código legacy que espera un número
 * @param {string} userId - ID de usuario completo
 * @returns {string} - Número sin sufijo (solo si es @c.us, NO para @lid)
 */
function extraerNumero(userId) {
  if (!userId || typeof userId !== "string") return userId;
  
  // Si es @lid, NO intentar extraer número (es un identificador de sesión)
  // Retornar el userId sin el sufijo @lid solo para display/logging
  if (userId.endsWith('@lid')) {
    return userId.replace('@lid', ''); // Solo para display, NO para operaciones críticas
  }
  
  // Solo extraer si es @c.us (número real)
  return userId.replace(/@c\.us$/, "");
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
      // No loggear - esto es un filtro de seguridad, no un error real
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
 * Normaliza un número de teléfono al formato estándar: 51XXXXXXXXX (11 dígitos)
 * Acepta formatos: +51XXXXXXXXX, 51XXXXXXXXX, XXXXXXXXX, 0XXXXXXXXX
 * @param {string} telefono - Número de teléfono en cualquier formato
 * @returns {string} - Número normalizado en formato 51XXXXXXXXX (11 dígitos)
 */
function normalizarTelefono(telefono) {
  if (!telefono || typeof telefono !== 'string') {
    return null;
  }
  
  // Remover todos los caracteres no numéricos
  let numero = telefono.replace(/\D/g, '');
  
  // Si está vacío después de limpiar, retornar null
  if (!numero || numero.length === 0) {
    return null;
  }
  
  // Si tiene 9 dígitos, agregar prefijo 51
  if (numero.length === 9) {
    return '51' + numero;
  }
  
  // Si tiene 10 dígitos y empieza con 0, remover el 0 y agregar 51
  if (numero.length === 10 && numero.startsWith('0')) {
    return '51' + numero.substring(1);
  }
  
  // Si tiene 10 dígitos sin 0, agregar prefijo 51
  if (numero.length === 10) {
    return '51' + numero;
  }
  
  // Si tiene 11 dígitos pero no empieza con 51, verificar
  if (numero.length === 11 && !numero.startsWith('51')) {
    // Si los primeros 2 dígitos son válidos (ej: 01, 02), remover y agregar 51
    if (numero.startsWith('0')) {
      return '51' + numero.substring(1);
    }
    // Si no, asumir que son los últimos 9 dígitos y agregar 51
    return '51' + numero.substring(2);
  }
  
  // Si tiene 12 o más dígitos, tomar los últimos 11
  if (numero.length > 11) {
    numero = numero.slice(-11);
  }
  
  // Si tiene 11 dígitos y empieza con 51, retornar tal cual
  if (numero.length === 11 && numero.startsWith('51')) {
    return numero;
  }
  
  // Si tiene 11 dígitos pero no empieza con 51, tomar los últimos 9 y agregar 51
  if (numero.length === 11) {
    return '51' + numero.substring(2);
  }
  
  // Si tiene menos de 9 dígitos, no es válido
  if (numero.length < 9) {
    return null;
  }
  
  // Por defecto, si tiene más de 9 dígitos, tomar los últimos 9 y agregar 51
  if (numero.length > 9) {
    return '51' + numero.slice(-9);
  }
  
  return null;
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

/**
 * Envía una imagen de forma segura
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario destino
 * @param {Buffer} imagenBuffer - Buffer de la imagen
 * @param {string} caption - Texto opcional para la imagen
 * @returns {Promise<boolean>} - true si se envió correctamente
 */
async function enviarImagenSeguro(client, userId, imagenBuffer, caption = '') {
  try {
    // Validar que userId existe y tiene formato correcto
    if (!userId || typeof userId !== "string") {
      logMessage("ERROR", "Intento de enviar imagen con userId inválido", {
        userId: userId
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
      numeroFormateado = numeroFormateado.replace(/@.*$/, "");
      numeroFormateado = numeroFormateado + "@c.us";
    }

    // Validar que el número tiene formato válido
    const esFormatoValido = validarFormatoUserId(numeroFormateado);

    if (!esFormatoValido) {
      logMessage("ERROR", "Número de WhatsApp inválido para enviar imagen", {
        original: userId,
        formateado: numeroFormateado,
      });
      return false;
    }

    // Validar que NO es un estado
    if (
      numeroFormateado.includes("status") ||
      numeroFormateado.includes("broadcast")
    ) {
      return false;
    }

    // Enviar la imagen usando wppconnect
    // wppconnect sendImage funciona mejor con rutas de archivo
    // Guardar temporalmente el buffer en disco
    const fs = require('fs');
    const path = require('path');
    const paths = require('../config/paths');
    
    const tempDir = path.join(paths.DATA_BASE_DIR, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, `cita_${Date.now()}.png`);
    
    try {
      // Guardar buffer en archivo temporal
      fs.writeFileSync(tempFilePath, imagenBuffer);
      
      // Enviar imagen usando la ruta del archivo
      await client.sendImage(numeroFormateado, tempFilePath, 'cita_confirmacion.png', caption);
      
      // Eliminar archivo temporal después de enviar
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (unlinkError) {
          // Ignorar errores al eliminar archivo temporal
        }
      }, 5000); // Eliminar después de 5 segundos
      
    } catch (sendError) {
      // Limpiar archivo temporal en caso de error
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (unlinkError) {
        // Ignorar
      }
      throw sendError;
    }

    if (process.env.LOG_LEVEL === 'verbose') {
      logMessage("SUCCESS", `Imagen enviada correctamente`, {
        destino: extraerNumero(numeroFormateado),
        tamaño: imagenBuffer.length,
      });
    }

    return true;
  } catch (error) {
    logMessage("ERROR", "Error al enviar imagen", {
      userId: userId,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

module.exports = {
  extraerNumero,
  extraerNumeroReal,
  extraerSessionId,
  enviarMensajeSeguro,
  enviarImagenSeguro,
  normalizarTelefono,
  enviarMensajeSeguro,
  inicializarUsuario,
  extractName,
  normalizarTelefono
};
