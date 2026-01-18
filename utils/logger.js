// Sistema de logging estructurado
const fs = require('fs');
const path = require('path');
const { sanitizarDatosParaLog } = require('./validators');
const { normalizeError } = require('./errors');
const config = require('../config');
const paths = require('../config/paths');

const LOG_LEVEL = config.LOG_LEVEL || 'normal';

/**
 * Rota logs antiguos (elimina logs > 30 días)
 */
function rotarLogs() {
  try {
    const logDir = paths.LOGS_BASE_DIR;
    if (!fs.existsSync(logDir)) {
      return;
    }
    
    const archivos = fs.readdirSync(logDir);
    const ahora = new Date();
    const diasRetencion = config.DIAS_RETENCION_LOGS || 30;
    const fechaLimite = new Date(ahora.getTime() - diasRetencion * 24 * 60 * 60 * 1000);
    
    let eliminados = 0;
    for (const archivo of archivos) {
      if (archivo.startsWith("bot-") && archivo.endsWith(".log")) {
        const rutaArchivo = path.join(logDir, archivo);
        const stats = fs.statSync(rutaArchivo);
        
        if (stats.mtime < fechaLimite) {
          try {
            fs.unlinkSync(rutaArchivo);
            eliminados++;
          } catch (error) {
            // Ignorar errores al eliminar
          }
        }
      }
    }
    
    if (eliminados > 0 && LOG_LEVEL !== 'silent') {
      console.log(`📝 Rotación de logs: ${eliminados} archivo(s) antiguo(s) eliminado(s)`);
    }
  } catch (error) {
    // No crítico, solo loguear si es verbose
    if (LOG_LEVEL === 'verbose') {
      console.error("Error en rotación de logs:", error.message);
    }
  }
}

/**
 * Función principal de logging estructurado
 * @param {string} type - Tipo de log (INFO, SUCCESS, WARNING, ERROR)
 * @param {string} message - Mensaje a loguear
 * @param {object|Error} data - Datos adicionales o Error object (opcional)
 */
function logMessage(type, message, data = null) {
  const timestamp = new Date().toISOString();
  const logDir = paths.LOGS_BASE_DIR;

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(
    logDir,
    `bot-${new Date().toISOString().split("T")[0]}.log`
  );
  
  // Manejar errores estructurados
  let dataSanitizado = null;
  let errorInfo = null;
  
  if (data instanceof Error) {
    // Si es un error, normalizarlo y extraer información
    const normalizedError = normalizeError(data);
    errorInfo = {
      name: normalizedError.name,
      code: normalizedError.code,
      statusCode: normalizedError.statusCode,
      message: normalizedError.message,
      details: normalizedError.details,
      stack: normalizedError.stack
    };
    dataSanitizado = sanitizarDatosParaLog(errorInfo);
  } else if (data) {
    dataSanitizado = sanitizarDatosParaLog(data);
  }
  
  // Crear entrada de log estructurada
  const logEntry = {
    timestamp,
    level: type,
    message,
    ...(errorInfo ? { error: errorInfo } : {}),
    ...(dataSanitizado && !errorInfo ? { data: dataSanitizado } : {})
  };
  
  const logLine = JSON.stringify(logEntry) + '\n';

  // Siempre guardar en archivo (formato JSON estructurado)
  try {
    fs.appendFileSync(logFile, logLine, "utf8");
  } catch (error) {
    // Fallback a console si falla escribir archivo
    console.error('Error al escribir log:', error.message);
    console.log(logLine);
  }

  const colors = {
    INFO: "\x1b[36m",
    SUCCESS: "\x1b[32m",
    WARNING: "\x1b[33m",
    ERROR: "\x1b[31m",
    RESET: "\x1b[0m",
  };

  const color = colors[type] || colors.INFO;
  
  // Decidir qué mostrar en consola según nivel de log
  const mostrarEnConsola = 
    LOG_LEVEL === 'verbose' || // Mostrar todo en verbose
    (LOG_LEVEL === 'normal' && (type === 'SUCCESS' || type === 'WARNING' || type === 'ERROR')) || // Normal: solo importantes
    (LOG_LEVEL === 'minimal' && (type === 'ERROR' || type === 'WARNING')) || // Minimal: solo errores y warnings
    (LOG_LEVEL === 'silent' && type === 'ERROR'); // Silent: solo errores críticos

  if (mostrarEnConsola) {
    // Formato simplificado y limpio para consola
    const iconos = {
      INFO: '',
      SUCCESS: '✓',
      WARNING: '⚠',
      ERROR: '✗',
    };
    const icono = iconos[type] || '';
    
    // Mensaje más corto y limpio (máximo 50 caracteres)
    const mensajeCorto = message.length > 50 ? message.substring(0, 47) + '...' : message;
    
    // Formato compacto: solo icono y mensaje (sin [TYPE])
    if (type === 'ERROR') {
      console.log(`${color}${icono} ${mensajeCorto}${colors.RESET}`);
      // Para errores estructurados, mostrar información relevante
      if (errorInfo) {
        if (errorInfo.code) {
          console.log(`   Código: ${errorInfo.code}`);
        }
        if (errorInfo.details) {
          console.log(`   Detalles: ${JSON.stringify(errorInfo.details).substring(0, 100)}`);
        }
        // Stack solo en verbose
        if (LOG_LEVEL === 'verbose' && errorInfo.stack) {
          console.log(`   Stack: ${errorInfo.stack.split('\n')[0]}`);
        }
      } else if (dataSanitizado) {
        const datosRelevantes = Object.keys(dataSanitizado).length > 0 
          ? JSON.stringify(dataSanitizado).substring(0, 100)
          : '';
        if (datosRelevantes) {
          console.log(`   ${datosRelevantes}`);
        }
      }
    } else if (type === 'WARNING') {
      console.log(`${color}${icono} ${mensajeCorto}${colors.RESET}`);
    } else if (type === 'SUCCESS') {
      console.log(`${color}${icono} ${mensajeCorto}${colors.RESET}`);
    } else {
      // INFO solo en verbose
      console.log(`${mensajeCorto}`);
    }
  }
}

/**
 * Helper para loguear errores estructurados
 * @param {Error|AppError} error - Error a loguear
 * @param {object} context - Contexto adicional (opcional)
 */
function logError(error, context = null) {
  const normalizedError = normalizeError(error);
  logMessage('ERROR', normalizedError.message, normalizedError);
  
  if (context) {
    logMessage('INFO', 'Contexto del error', context);
  }
}

module.exports = {
  logMessage,
  logError,
  rotarLogs,
};

