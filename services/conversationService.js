/**
 * Servicio para manejo de conversaciones
 * Gestiona el historial de conversaciones y contexto
 */

const { logMessage, logError } = require('../utils/logger');
const { validarFormatoUserId } = require('../utils/validators');
const { ValidationError } = require('../utils/errors');

class ConversationService {
  constructor(db) {
    this.db = db;
    // Cache en memoria para acceso rápido (se sincroniza con BD)
    this.cache = new Map();
    
    // Limpiar conversaciones antiguas diariamente
    this.iniciarLimpiezaPeriodica();
  }

  /**
   * Obtiene el historial de conversación de un usuario (desde BD)
   * @param {string} userId - ID del usuario
   * @param {number} maxMensajes - Máximo de mensajes a retornar (default: 18)
   * @returns {Promise<Array>} - Historial de conversación
   */
  async obtenerHistorial(userId, maxMensajes = 18) {
    try {
      validarFormatoUserId(userId, true);
      
      // Intentar desde cache primero
      const cacheKey = `${userId}_${maxMensajes}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        // Cache válido por 5 minutos
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
          return cached.data;
        }
      }
      
      // Obtener de BD
      const historial = await this.db.obtenerHistorialConversacion(userId, maxMensajes);
      
      // Actualizar cache
      this.cache.set(cacheKey, {
        data: historial,
        timestamp: Date.now()
      });
      
      return historial;
    } catch (error) {
      logError(error, { contexto: 'obtenerHistorial', userId });
      // Fallback a cache si BD falla
      const cacheKey = `${userId}_${maxMensajes}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey).data;
      }
      return [];
    }
  }

  /**
   * Agrega un mensaje al historial (guarda en BD)
   * @param {string} userId - ID del usuario
   * @param {string} role - Rol del mensaje ('user' o 'assistant')
   * @param {string} content - Contenido del mensaje
   * @param {number} maxMensajes - Máximo de mensajes a mantener (default: 18)
   */
  async agregarMensaje(userId, role, content, maxMensajes = 18) {
    try {
      validarFormatoUserId(userId, true);
      
      if (!['user', 'assistant', 'system'].includes(role)) {
        throw new ValidationError('Rol inválido', { role });
      }

      if (!content || typeof content !== 'string') {
        throw new ValidationError('Contenido inválido');
      }

      // Guardar en BD
      await this.db.guardarMensajeConversacion(userId, role, content.trim());
      
      // Invalidar cache para este usuario
      this.cache.forEach((value, key) => {
        if (key.startsWith(userId + '_')) {
          this.cache.delete(key);
        }
      });
      
      // Limpiar mensajes antiguos si hay muchos (mantener solo los últimos maxMensajes)
      // Esto se hace automáticamente al obtener el historial
    } catch (error) {
      logError(error, { 
        contexto: 'agregarMensaje',
        userId,
        role 
      });
    }
  }

  /**
   * Limpia el historial de un usuario
   * @param {string} userId - ID del usuario
   */
  async limpiarHistorial(userId) {
    try {
      await this.db.limpiarHistorialConversacion(userId);
      
      // Limpiar cache
      this.cache.forEach((value, key) => {
        if (key.startsWith(userId + '_')) {
          this.cache.delete(key);
        }
      });
      
      logMessage('INFO', 'Historial limpiado', { userId });
    } catch (error) {
      logError(error, { contexto: 'limpiarHistorial', userId });
    }
  }

  /**
   * Obtiene estadísticas de conversaciones
   * @returns {Promise<Object>} - Estadísticas
   */
  async obtenerEstadisticas() {
    try {
      // Obtener estadísticas desde BD sería más preciso
      // Por ahora retornamos estadísticas del cache
      return {
        totalConversaciones: this.cache.size,
        cacheSize: this.cache.size
      };
    } catch (error) {
      logError(error, { contexto: 'obtenerEstadisticas' });
      return {
        totalConversaciones: 0,
        cacheSize: 0
      };
    }
  }

  /**
   * Limpia conversaciones antiguas de la BD
   */
  async limpiarConversacionesAntiguas() {
    try {
      const eliminadas = await this.db.limpiarConversacionesAntiguas(30); // 30 días
      if (eliminadas > 0) {
        logMessage('INFO', 'Conversaciones antiguas limpiadas de BD', {
          eliminadas
        });
      }
      // Limpiar cache completo
      this.cache.clear();
    } catch (error) {
      logError(error, { contexto: 'limpiarConversacionesAntiguas' });
    }
  }

  /**
   * Inicia limpieza periódica de conversaciones
   */
  iniciarLimpiezaPeriodica() {
    // Limpiar cada día a las 2 AM
    const ahora = new Date();
    const proximaLimpieza = new Date();
    proximaLimpieza.setHours(2, 0, 0, 0);
    if (proximaLimpieza <= ahora) {
      proximaLimpieza.setDate(proximaLimpieza.getDate() + 1);
    }
    const tiempoHastaLimpieza = proximaLimpieza.getTime() - ahora.getTime();
    
    const timeoutId = setTimeout(() => {
      this.limpiarConversacionesAntiguas();
      // Programar limpieza diaria
      const intervalId = setInterval(() => {
        this.limpiarConversacionesAntiguas();
      }, 24 * 60 * 60 * 1000);
      // Marcar como no bloqueante para evitar leaks en tests
      if (intervalId && typeof intervalId.unref === 'function') {
        intervalId.unref();
      }
    }, tiempoHastaLimpieza);
    // Marcar timeout como no bloqueante
    if (timeoutId && typeof timeoutId.unref === 'function') {
      timeoutId.unref();
    }
  }
}

module.exports = ConversationService;
