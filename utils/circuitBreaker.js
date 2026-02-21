/**
 * Circuit Breaker para APIs externas
 * Previene llamadas repetidas a servicios que están fallando
 */

const { logMessage, logError } = require('./logger');
const { ExternalServiceError } = require('./errors');

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'CircuitBreaker';
    this.failureThreshold = options.failureThreshold || 5; // Fallos antes de abrir
    this.resetTimeout = options.resetTimeout || 60000; // 1 minuto
    this.monitoringWindow = options.monitoringWindow || 60000; // Ventana de monitoreo
    
    // Estados: 'CLOSED' (normal), 'OPEN' (bloqueado), 'HALF_OPEN' (probando)
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    // Estadísticas
    this.stats = {
      totalCalls: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      stateChanges: 0
    };
  }

  /**
   * Ejecuta una función con protección de circuit breaker
   * @param {Function} fn - Función a ejecutar
   * @param {string} serviceName - Nombre del servicio (para errores)
   * @returns {Promise<any>} - Resultado de la función
   */
  async execute(fn, serviceName = null) {
    this.stats.totalCalls++;
    
    // Verificar estado del circuit breaker
    if (this.state === 'OPEN') {
      // Verificar si ya pasó el tiempo de reset
      if (Date.now() >= this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logMessage('INFO', `Circuit breaker ${this.name} en estado HALF_OPEN (probando)`, {
          service: serviceName || this.name
        });
      } else {
        const waitTime = Math.ceil((this.nextAttemptTime - Date.now()) / 1000);
        throw new ExternalServiceError(
          serviceName || this.name,
          `Servicio temporalmente no disponible. Intenta nuevamente en ${waitTime} segundos.`,
          {
            circuitState: 'OPEN',
            waitTime
          }
        );
      }
    }

    try {
      const result = await fn();
      
      // Si llegamos aquí, la llamada fue exitosa
      this.onSuccess(serviceName);
      return result;
    } catch (error) {
      this.onFailure(error, serviceName);
      throw error;
    }
  }

  /**
   * Maneja un éxito
   */
  onSuccess(serviceName = null) {
    this.stats.totalSuccesses++;
    
    if (this.state === 'HALF_OPEN') {
      // Si estamos en HALF_OPEN y tenemos éxito, cerrar el circuito
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.stats.stateChanges++;
        logMessage('SUCCESS', `Circuit breaker ${this.name} cerrado (servicio recuperado)`, {
          service: serviceName || this.name
        });
      }
    } else if (this.state === 'CLOSED') {
      // Resetear contador de fallos si hay éxito
      this.failureCount = 0;
    }
  }

  /**
   * Maneja un fallo
   */
  onFailure(error, serviceName = null) {
    this.stats.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Si fallamos en HALF_OPEN, volver a abrir
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      this.stats.stateChanges++;
      logMessage('WARNING', `Circuit breaker ${this.name} abierto nuevamente`, {
        service: serviceName || this.name,
        error: error.message
      });
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      // Abrir el circuito
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      this.stats.stateChanges++;
      logMessage('WARNING', `Circuit breaker ${this.name} abierto (servicio no disponible)`, {
        service: serviceName || this.name,
        failureCount: this.failureCount,
        resetTime: new Date(this.nextAttemptTime).toISOString()
      });
    }
  }

  /**
   * Resetea el circuit breaker manualmente
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    logMessage('INFO', `Circuit breaker ${this.name} reseteado manualmente`);
  }

  /**
   * Obtiene el estado actual
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      stats: { ...this.stats }
    };
  }

  /**
   * Verifica si el servicio está disponible
   */
  isAvailable() {
    if (this.state === 'CLOSED') {
      return true;
    }
    if (this.state === 'HALF_OPEN') {
      return true;
    }
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime) {
      this.state = 'HALF_OPEN';
      return true;
    }
    return false;
  }
}

// Circuit breakers preconfigurados
const openAICircuitBreaker = new CircuitBreaker({
  name: 'OpenAI',
  failureThreshold: 5,
  resetTimeout: 60000 // 1 minuto
});

const whatsappCircuitBreaker = new CircuitBreaker({
  name: 'WhatsApp',
  failureThreshold: 3,
  resetTimeout: 30000 // 30 segundos
});

module.exports = {
  CircuitBreaker,
  openAICircuitBreaker,
  whatsappCircuitBreaker
};
