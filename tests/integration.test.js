/**
 * Tests de integración críticos
 * Prueban flujos completos del sistema
 */

const db = require('../services/database');
const { validarMensaje, validarFecha, validarFormatoUserId } = require('../utils/validators');
const { ValidationError, RateLimitError } = require('../utils/errors');
const { openAIRateLimiter } = require('../utils/rateLimiter');
const { openAICircuitBreaker } = require('../utils/circuitBreaker');

describe('Tests de Integración Críticos', () => {
  beforeAll(async () => {
    // Inicializar BD para tests
    await db.inicializarDB();
  });

  afterAll(async () => {
    // Limpiar después de tests
  });

  describe('Validaciones', () => {
    test('debe validar mensajes correctamente', () => {
      expect(() => validarMensaje('Hola', { throwError: true })).not.toThrow();
      expect(() => validarMensaje('', { throwError: true })).toThrow(ValidationError);
      expect(() => validarMensaje('a'.repeat(3000), { throwError: true })).toThrow(ValidationError);
    });

    test('debe validar formato de userId', () => {
      expect(validarFormatoUserId('123456789@c.us')).toBe(true);
      expect(validarFormatoUserId('123456789@lid')).toBe(true);
      expect(validarFormatoUserId('invalid')).toBe(false);
    });

    test('debe validar fechas correctamente', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      // Establecer hora dentro del horario de atención (14:00)
      fechaFutura.setHours(14, 0, 0, 0);
      
      const resultado = validarFecha(fechaFutura);
      
      expect(resultado.valida).toBe(true);
      
      const fechaPasada = new Date('2020-01-01');
      const resultado2 = validarFecha(fechaPasada);
      expect(resultado2.valida).toBe(false);
    });
  });

  describe('Base de Datos', () => {
    test('debe guardar y obtener configuración', async () => {
      await db.establecerConfiguracion('test_key', 'test_value', 'Test');
      const valor = await db.obtenerConfiguracion('test_key');
      expect(valor).toBe('test_value');
    });

    test('debe guardar y obtener conversaciones', async () => {
      const sessionId = '123456789@c.us';
      await db.guardarMensajeConversacion(sessionId, 'user', 'Hola');
      await db.guardarMensajeConversacion(sessionId, 'assistant', 'Hola, ¿cómo puedo ayudarte?');
      
      const historial = await db.obtenerHistorialConversacion(sessionId, 10);
      expect(historial.length).toBeGreaterThanOrEqual(2);
      expect(historial[0].role).toBe('user');
      expect(historial[1].role).toBe('assistant');
    });
  });

  describe('Rate Limiting', () => {
    test('debe limitar solicitudes', () => {
      const key = 'test_user';
      
      // Consumir hasta el límite
      for (let i = 0; i < 60; i++) {
        const result = openAIRateLimiter.consume(key);
        expect(result.allowed).toBe(true);
      }
      
      // La siguiente debe ser rechazada
      const result = openAIRateLimiter.consume(key);
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });
  });

  describe('Circuit Breaker', () => {
    test('debe abrirse después de fallos', async () => {
      const breaker = openAICircuitBreaker;
      breaker.reset(); // Resetear para test limpio
      
      // Simular fallos
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(() => {
            throw new Error('Simulated failure');
          }, 'TestService');
        } catch (error) {
          // Esperado
        }
      }
      
      const state = breaker.getState();
      expect(state.state).toBe('OPEN');
    });
  });
});
