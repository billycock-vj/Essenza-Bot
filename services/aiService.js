/**
 * Servicio para consultas a OpenAI
 * Centraliza la lógica de IA con rate limiting y manejo de errores
 */

const { logMessage, logError } = require('../utils/logger');
const { 
  ExternalServiceError, 
  RateLimitError, 
  normalizeError 
} = require('../utils/errors');
const { openAIRateLimiter, withRateLimit } = require('../utils/rateLimiter');
const { openAICircuitBreaker } = require('../utils/circuitBreaker');
const { validarMensaje } = require('../utils/validators');

class AIService {
  constructor(openaiClient, db, conversationService) {
    this.openai = openaiClient;
    this.db = db;
    this.conversationService = conversationService;
  }

  /**
   * Consulta OpenAI con el mensaje del usuario
   * @param {string} mensaje - Mensaje del usuario
   * @param {string} userId - ID del usuario
   * @param {string} systemPrompt - Prompt del sistema
   * @returns {Promise<string|null>} - Respuesta de la IA o null si no debe responder
   */
  async consultar(mensaje, userId, systemPrompt) {
    try {
      // Validar inputs
      validarMensaje(mensaje, {
        minLength: 1,
        maxLength: 2000,
        throwError: true
      });

      // Obtener modo de IA desde la base de datos
      const modoIA = await this.db.obtenerConfiguracion('modo_ia') || 'auto';
      
      // Si el modo es 'manual', no responder automáticamente
      if (modoIA === 'manual') {
        logMessage('INFO', 'IA en modo manual - no responde', { userId });
        return null;
      }
      
      // Si el modo es 'solo_faq', solo responder preguntas frecuentes
      if (modoIA === 'solo_faq') {
        const esFAQ = this.detectarPreguntaFrecuente(mensaje);
        if (!esFAQ) {
          logMessage('INFO', 'Mensaje no es FAQ - no responde', { userId });
          return null;
        }
      }
      
      // Obtener historial de conversación (desde BD)
      let historial = await this.conversationService.obtenerHistorial(userId, 18);
      
      // Agregar mensaje del usuario al historial (guardar en BD)
      await this.conversationService.agregarMensaje(userId, 'user', mensaje);
      
      // Construir mensajes para OpenAI
      const messages = [
        { role: "system", content: systemPrompt },
        ...historial
      ];
      
      // Consultar OpenAI con rate limiting y circuit breaker
      const respuesta = await withRateLimit(
        openAIRateLimiter,
        userId,
        async () => {
          return await openAICircuitBreaker.execute(async () => {
            try {
              const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: messages,
                temperature: 0.7,
                max_tokens: 500,
              });

              // Validar respuesta
              if (!completion?.choices?.[0]?.message?.content) {
                throw new ExternalServiceError('OpenAI', 'Respuesta inválida de OpenAI', {
                  completion: completion
                });
              }

              return completion.choices[0].message.content.trim();
            } catch (error) {
              // Si es error de rate limit de OpenAI, convertirlo
              if (error.status === 429) {
                throw new RateLimitError(
                  'Límite de OpenAI excedido. Por favor, espera un momento.',
                  error.headers?.['retry-after'],
                  { service: 'OpenAI' }
                );
              }
              throw new ExternalServiceError('OpenAI', error.message, {
                status: error.status,
                code: error.code
              });
            }
          }, 'OpenAI');
        },
        'Límite de consultas a IA excedido. Por favor, espera un momento.'
      );
      
      // Formatear respuesta para WhatsApp
      const respuestaFormateada = respuesta.replace(/\*\*([^*]+)\*\*/g, '*$1*');
      
      // Agregar respuesta al historial (guardar en BD)
      await this.conversationService.agregarMensaje(userId, 'assistant', respuestaFormateada);
      
      logMessage('SUCCESS', 'Respuesta IA generada', {
        userId,
        longitudMensaje: mensaje.length,
        longitudRespuesta: respuestaFormateada.length
      });
      
      return respuestaFormateada;
    } catch (error) {
      const normalizedError = normalizeError(error);
      
      // Si es rate limit, retornar mensaje amigable
      if (normalizedError instanceof RateLimitError) {
        logMessage('WARNING', 'Rate limit excedido en consulta IA', {
          userId,
          retryAfter: normalizedError.retryAfter
        });
        return normalizedError.message;
      }

      // Para otros errores, loguear y retornar mensaje genérico
      logError(normalizedError, {
        contexto: 'consultaIA',
        userId,
        mensaje: mensaje?.substring(0, 50)
      });
      
      return "Disculpa, no pude procesar tu mensaje en este momento. Por favor, intenta de nuevo en un momento.";
    }
  }

  /**
   * Detecta si un mensaje es una pregunta frecuente
   * @param {string} mensaje - Mensaje a analizar
   * @returns {boolean} - true si es FAQ
   */
  detectarPreguntaFrecuente(mensaje) {
    const mensajeLower = mensaje.toLowerCase();
    const palabrasFAQ = [
      'horario', 'hora', 'abierto', 'cerrado', 'atencion', 'atención',
      'precio', 'costo', 'cuanto', 'cuánto', 'precios',
      'servicio', 'servicios', 'masaje', 'masajes',
      'reserva', 'reservar', 'cita', 'agendar',
      'ubicacion', 'ubicación', 'direccion', 'dirección', 'donde', 'dónde',
      'telefono', 'teléfono', 'contacto', 'whatsapp',
      'yape', 'pago', 'deposito', 'depósito'
    ];
    
    return palabrasFAQ.some(palabra => mensajeLower.includes(palabra));
  }
}

module.exports = AIService;
