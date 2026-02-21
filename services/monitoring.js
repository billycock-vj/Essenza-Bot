/**
 * Servicio de monitoreo básico
 * Health checks mejorados y métricas básicas
 */

const { logMessage } = require('../utils/logger');
const db = require('./database');
const { openAICircuitBreaker } = require('../utils/circuitBreaker');
const { openAIRateLimiter } = require('../utils/rateLimiter');

class MonitoringService {
  constructor() {
    this.metrics = {
      uptime: Date.now(),
      totalMessages: 0,
      totalAIResponses: 0,
      totalErrors: 0,
      lastHealthCheck: null
    };
  }

  /**
   * Health check completo del sistema
   * @returns {Promise<Object>} - Estado de salud del sistema
   */
  async healthCheck() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.metrics.uptime) / 1000), // segundos
      services: {},
      metrics: { ...this.metrics }
    };

    try {
      // Verificar base de datos
      try {
        await db.obtenerConfiguracion('flag_bot_activo');
        health.services.database = { status: 'healthy' };
      } catch (error) {
        health.services.database = { 
          status: 'unhealthy', 
          error: error.message 
        };
        health.status = 'degraded';
      }

      // Verificar OpenAI (circuit breaker)
      const openAIState = openAICircuitBreaker.getState();
      health.services.openai = {
        status: openAIState.state === 'CLOSED' ? 'healthy' : 'degraded',
        circuitState: openAIState.state,
        failureCount: openAIState.failureCount
      };
      if (openAIState.state === 'OPEN') {
        health.status = 'degraded';
      }

      // Verificar rate limiter
      const rateLimiterStats = openAIRateLimiter.getStats();
      health.services.rateLimiter = {
        status: 'healthy',
        ...rateLimiterStats
      };

      this.metrics.lastHealthCheck = new Date().toISOString();
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }

  /**
   * Incrementa contador de mensajes
   */
  incrementMessages() {
    this.metrics.totalMessages++;
  }

  /**
   * Incrementa contador de respuestas IA
   */
  incrementAIResponses() {
    this.metrics.totalAIResponses++;
  }

  /**
   * Incrementa contador de errores
   */
  incrementErrors() {
    this.metrics.totalErrors++;
  }

  /**
   * Obtiene métricas actuales
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Math.floor((Date.now() - this.metrics.uptime) / 1000),
      successRate: this.metrics.totalMessages > 0
        ? ((this.metrics.totalMessages - this.metrics.totalErrors) / this.metrics.totalMessages * 100).toFixed(2)
        : 100
    };
  }

  /**
   * Resetea métricas
   */
  resetMetrics() {
    this.metrics = {
      uptime: Date.now(),
      totalMessages: 0,
      totalAIResponses: 0,
      totalErrors: 0,
      lastHealthCheck: null
    };
    logMessage('INFO', 'Métricas reseteadas');
  }
}

// Instancia singleton
const monitoringService = new MonitoringService();

module.exports = monitoringService;
