/**
 * Sistema de manejo de errores estructurado
 * Clases de error personalizadas para diferentes tipos de errores
 */

/**
 * Clase base para errores de la aplicación
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // Errores operacionales vs errores de programación
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * Error de validación (400)
 */
class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

/**
 * Error de autenticación/autorización (401/403)
 */
class AuthenticationError extends AppError {
  constructor(message = 'No autorizado', details = null) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Acceso denegado', details = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

/**
 * Error de recurso no encontrado (404)
 */
class NotFoundError extends AppError {
  constructor(resource = 'Recurso', details = null) {
    super(`${resource} no encontrado`, 404, 'NOT_FOUND', details);
  }
}

/**
 * Error de conflicto (409) - ej: reserva duplicada
 */
class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

/**
 * Error de rate limiting (429)
 */
class RateLimitError extends AppError {
  constructor(message = 'Límite de solicitudes excedido', retryAfter = null, details = null) {
    super(message, 429, 'RATE_LIMIT_ERROR', details);
    this.retryAfter = retryAfter;
  }
}

/**
 * Error de servicio externo (502/503)
 */
class ExternalServiceError extends AppError {
  constructor(service, message, details = null) {
    super(`Error en servicio externo ${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', {
      service,
      ...details
    });
    this.service = service;
  }
}

/**
 * Error de base de datos (500)
 */
class DatabaseError extends AppError {
  constructor(message, operation = null, details = null) {
    super(`Error de base de datos: ${message}`, 500, 'DATABASE_ERROR', {
      operation,
      ...details
    });
    this.operation = operation;
  }
}

/**
 * Error de configuración (500)
 */
class ConfigurationError extends AppError {
  constructor(message, configKey = null, details = null) {
    super(`Error de configuración: ${message}`, 500, 'CONFIGURATION_ERROR', {
      configKey,
      ...details
    });
    this.configKey = configKey;
  }
}

/**
 * Wrapper para manejar errores asíncronos
 * Convierte errores no operacionales en AppError
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware de manejo de errores global
 */
function errorHandler(error, req, res, next) {
  // Si es un error operacional conocido, usar su información
  if (error.isOperational) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.toJSON()
    });
  }

  // Si no es operacional, es un error de programación
  // Loggear detalles completos pero no exponer al cliente
  console.error('❌ Error no operacional:', {
    name: error.name,
    message: error.message,
    stack: error.stack
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Convierte un error genérico en AppError
 */
function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  // Errores conocidos de dependencias
  if (error.name === 'ValidationError') {
    return new ValidationError(error.message, error.details);
  }

  if (error.code === 'SQLITE_CONSTRAINT') {
    return new DatabaseError('Violación de restricción de base de datos', null, {
      originalError: error.message
    });
  }

  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return new ExternalServiceError('Network', 'Error de conexión', {
      code: error.code
    });
  }

  // Error genérico
  return new AppError(
    error.message || 'Error desconocido',
    500,
    'INTERNAL_ERROR',
    { originalError: error.name }
  );
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  ConfigurationError,
  asyncHandler,
  errorHandler,
  normalizeError
};
