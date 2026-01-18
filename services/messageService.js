/**
 * Servicio para manejo de mensajes de WhatsApp
 * Centraliza la lógica de procesamiento de mensajes
 */

const { logMessage, logError } = require('../utils/logger');
const { validarMensaje, validarFormatoUserId } = require('../utils/validators');
const { ValidationError } = require('../utils/errors');

class MessageService {
  constructor(client, db) {
    this.client = client;
    this.db = db;
  }

  /**
   * Valida un mensaje entrante
   * @param {Object} message - Mensaje de wppconnect
   * @returns {{valido: boolean, error?: string, userId?: string, mensajeTexto?: string}}
   */
  validarMensajeEntrante(message) {
    try {
      // Ignorar mensajes de estados, grupos, etc.
      if (
        message.from === "status@broadcast" ||
        message.isGroupMsg ||
        !message.body
      ) {
        return { valido: false, razon: 'mensaje_no_valido' };
      }

      const userId = message.from;
      const mensajeTexto = message.body.trim();

      // Validar formato de userId
      if (!validarFormatoUserId(userId)) {
        logMessage('WARNING', 'UserId con formato inválido', { userId });
        return { valido: false, razon: 'userId_invalido' };
      }

      // Validar mensaje
      try {
        validarMensaje(mensajeTexto, {
          minLength: 2,
          maxLength: 2000,
          allowEmpty: false,
          throwError: true
        });
      } catch (error) {
        if (error instanceof ValidationError) {
          logMessage('WARNING', 'Mensaje no válido', { 
            userId, 
            error: error.message 
          });
          return { valido: false, razon: 'mensaje_invalido', error: error.message };
        }
        throw error;
      }

      return {
        valido: true,
        userId,
        mensajeTexto
      };
    } catch (error) {
      logError(error, { contexto: 'validarMensajeEntrante' });
      return { valido: false, razon: 'error_validacion' };
    }
  }

  /**
   * Envía un mensaje de texto de forma segura
   * @param {string} userId - ID del destinatario
   * @param {string} texto - Texto a enviar
   * @returns {Promise<boolean>} - true si se envió correctamente
   */
  async enviarMensaje(userId, texto) {
    try {
      if (!userId || !texto) {
        throw new ValidationError('UserId y texto son requeridos');
      }

      validarFormatoUserId(userId, true);
      validarMensaje(texto, { minLength: 1, maxLength: 4000, throwError: true });

      await this.client.sendText(userId, texto);
      logMessage('SUCCESS', 'Mensaje enviado', { userId, longitud: texto.length });
      return true;
    } catch (error) {
      logError(error, { 
        contexto: 'enviarMensaje',
        userId 
      });
      return false;
    }
  }

  /**
   * Verifica si el bot está activo para un usuario
   * @param {string} userId - ID del usuario
   * @param {boolean} esAdmin - Si el usuario es administrador
   * @returns {Promise<boolean>} - true si el bot está activo
   */
  async verificarBotActivo(userId, esAdmin = false) {
    try {
      // Verificar si el bot está desactivado para este chat específico
      const botDesactivadoChat = await this.db.obtenerConfiguracion(`bot_desactivado_${userId}`);
      if (botDesactivadoChat === '1') {
        logMessage('INFO', 'Bot desactivado para este chat', { userId });
        return false;
      }

      // Verificar si el bot está desactivado globalmente (solo para no-admins)
      if (!esAdmin) {
        const botActivo = await this.db.obtenerConfiguracion('flag_bot_activo');
        if (botActivo === '0') {
          logMessage('INFO', 'Bot desactivado globalmente', { userId });
          return false;
        }
      }

      return true;
    } catch (error) {
      logError(error, { contexto: 'verificarBotActivo', userId });
      // En caso de error, asumir que está activo para no bloquear
      return true;
    }
  }
}

module.exports = MessageService;
