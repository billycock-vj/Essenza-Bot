/**
 * Sistema de Rate Limiting
 * Controla la frecuencia de solicitudes a APIs externas (OpenAI, etc.)
 */

class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 60; // Solicitudes por ventana
    this.windowMs = options.windowMs || 60000; // Ventana de tiempo en ms (default: 1 minuto)
    this.store = new Map(); // Almacenamiento en memoria (key -> {count, resetTime})
    this.cleanupInterval = options.cleanupInterval || 60000; // Limpiar entradas expiradas cada minuto
    
    // Iniciar limpieza periódica
    this.startCleanup();
  }

  /**
   * Verifica si se puede hacer una solicitud
   * @param {string} key - Identificador único (userId, ip, etc.)
   * @returns {{allowed: boolean, remaining: number, resetTime: number, retryAfter?: number}}
   */
  check(key) {
    const now = Date.now();
    const record = this.store.get(key);

    // Si no existe o expiró, crear nueva entrada
    if (!record || now > record.resetTime) {
      this.store.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: now + this.windowMs
      };
    }

    // Si ya alcanzó el límite
    if (record.count >= this.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000); // Segundos
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        retryAfter
      };
    }

    // Incrementar contador
    record.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetTime: record.resetTime
    };
  }

  /**
   * Intenta hacer una solicitud (incrementa contador si se permite)
   * @param {string} key - Identificador único
   * @returns {{allowed: boolean, remaining: number, resetTime: number, retryAfter?: number}}
   */
  consume(key) {
    return this.check(key);
  }

  /**
   * Obtiene información del rate limit sin consumir
   * @param {string} key - Identificador único
   * @returns {{remaining: number, resetTime: number}}
   */
  getInfo(key) {
    const record = this.store.get(key);
    const now = Date.now();

    if (!record || now > record.resetTime) {
      return {
        remaining: this.maxRequests,
        resetTime: now + this.windowMs
      };
    }

    return {
      remaining: Math.max(0, this.maxRequests - record.count),
      resetTime: record.resetTime
    };
  }

  /**
   * Resetea el contador para una clave
   * @param {string} key - Identificador único
   */
  reset(key) {
    this.store.delete(key);
  }

  /**
   * Limpia entradas expiradas
   */
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Inicia limpieza periódica
   */
  startCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
    // Marcar timer como no bloqueante para evitar leaks en tests
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Detiene la limpieza periódica
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Obtiene estadísticas del rate limiter
   */
  getStats() {
    return {
      totalKeys: this.store.size,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs
    };
  }
}

/**
 * Rate limiter específico para OpenAI
 * Configurado según límites de OpenAI API
 */
const openAIRateLimiter = new RateLimiter({
  maxRequests: 60, // 60 solicitudes por minuto (conservador)
  windowMs: 60000, // 1 minuto
  cleanupInterval: 60000
});

/**
 * Rate limiter para mensajes de WhatsApp (por usuario)
 */
const whatsappRateLimiter = new RateLimiter({
  maxRequests: 20, // 20 mensajes por minuto por usuario
  windowMs: 60000,
  cleanupInterval: 60000
});

/**
 * Rate limiter para seguimientos automáticos
 */
const followUpRateLimiter = new RateLimiter({
  maxRequests: 10, // 10 seguimientos por hora
  windowMs: 3600000, // 1 hora
  cleanupInterval: 3600000
});

/**
 * Wrapper para funciones async con rate limiting
 */
async function withRateLimit(rateLimiter, key, fn, errorMessage = 'Límite de solicitudes excedido') {
  const result = rateLimiter.consume(key);
  
  if (!result.allowed) {
    const { RateLimitError } = require('./errors');
    throw new RateLimitError(
      errorMessage,
      result.retryAfter,
      {
        key,
        remaining: result.remaining,
        resetTime: new Date(result.resetTime).toISOString()
      }
    );
  }

  try {
    return await fn();
  } catch (error) {
    // Si hay error, no revertimos el consumo (ya se consumió)
    throw error;
  }
}

module.exports = {
  RateLimiter,
  openAIRateLimiter,
  whatsappRateLimiter,
  followUpRateLimiter,
  withRateLimit
};
