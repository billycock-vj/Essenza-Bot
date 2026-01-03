// Sistema de logging
const fs = require('fs');
const path = require('path');
const { sanitizarDatosParaLog } = require('./validators');
const config = require('../config');

const LOG_LEVEL = config.LOG_LEVEL || 'normal';

/**
 * Rota logs antiguos (elimina logs > 30 días)
 */
function rotarLogs() {
  try {
    const logDir = path.join(__dirname, '..', 'logs');
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
 * Función principal de logging
 * @param {string} type - Tipo de log (INFO, SUCCESS, WARNING, ERROR)
 * @param {string} message - Mensaje a loguear
 * @param {object} data - Datos adicionales (opcional)
 */
function logMessage(type, message, data = null) {
  const timestamp = new Date().toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "medium",
  });
  const logDir = path.join(__dirname, '..', 'logs');

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(
    logDir,
    `bot-${new Date().toISOString().split("T")[0]}.log`
  );
  
  // Sanitizar datos sensibles antes de loguear
  const dataSanitizado = data ? sanitizarDatosParaLog(data) : null;
  const logEntry = `[${timestamp}] [${type}] ${message}${
    dataSanitizado ? ` | ${JSON.stringify(dataSanitizado)}` : ""
  }\n`;

  // Siempre guardar en archivo
  fs.appendFileSync(logFile, logEntry, "utf8");

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
    // Formato simplificado para consola
    const iconos = {
      INFO: 'ℹ️',
      SUCCESS: '✅',
      WARNING: '⚠️',
      ERROR: '❌',
    };
    const icono = iconos[type] || '';
    
    // Mensaje más corto y limpio
    const mensajeCorto = message.length > 60 ? message.substring(0, 57) + '...' : message;
    console.log(`${color}${icono} [${type}]${colors.RESET} ${mensajeCorto}`);
    
    // Solo mostrar datos en modo verbose o si es un error
    if (dataSanitizado && (LOG_LEVEL === 'verbose' || type === 'ERROR')) {
      console.log(`   └─`, dataSanitizado);
    }
  }
}

module.exports = {
  logMessage,
  rotarLogs,
};

