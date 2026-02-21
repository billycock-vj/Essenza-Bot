/**
 * Servicio de backup automático de base de datos
 * Realiza backups periódicos de la base de datos SQLite
 */

const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { logMessage } = require('../utils/logger');
const { DatabaseError } = require('../utils/errors');
const paths = require('../config/paths');

const DB_PATH = paths.DB_PATH;
const BACKUP_DIR = path.join(paths.DATA_BASE_DIR, 'backups');

// Asegurar que el directorio de backups existe
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Crea un backup de la base de datos
 * @param {string} customName - Nombre personalizado para el backup (opcional)
 * @returns {Promise<string>} - Ruta del archivo de backup creado
 */
async function crearBackup(customName = null) {
  try {
    // Verificar que la base de datos existe
    if (!fs.existsSync(DB_PATH)) {
      throw new DatabaseError('La base de datos no existe', 'backup');
    }

    // Generar nombre del archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nombreArchivo = customName || `backup-${timestamp}.db`;
    const rutaBackup = path.join(BACKUP_DIR, nombreArchivo);

    // Copiar archivo de base de datos
    fs.copyFileSync(DB_PATH, rutaBackup);

    // Obtener tamaño del archivo
    const stats = fs.statSync(rutaBackup);
    const tamañoMB = (stats.size / (1024 * 1024)).toFixed(2);

    logMessage('SUCCESS', `Backup creado: ${nombreArchivo} (${tamañoMB} MB)`, {
      archivo: nombreArchivo,
      tamaño: stats.size,
      ruta: rutaBackup
    });

    return rutaBackup;
  } catch (error) {
    logMessage('ERROR', 'Error al crear backup', {
      error: error.message,
      stack: error.stack
    });
    throw new DatabaseError(`Error al crear backup: ${error.message}`, 'backup', {
      originalError: error.message
    });
  }
}

/**
 * Lista todos los backups disponibles
 * @returns {Array<{nombre: string, ruta: string, fecha: Date, tamaño: number}>}
 */
function listarBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }

    const archivos = fs.readdirSync(BACKUP_DIR)
      .filter(archivo => archivo.endsWith('.db'))
      .map(archivo => {
        const ruta = path.join(BACKUP_DIR, archivo);
        const stats = fs.statSync(ruta);
        return {
          nombre: archivo,
          ruta: ruta,
          fecha: stats.mtime,
          tamaño: stats.size
        };
      })
      .sort((a, b) => b.fecha - a.fecha); // Más recientes primero

    return archivos;
  } catch (error) {
    logMessage('ERROR', 'Error al listar backups', { error: error.message });
    return [];
  }
}

/**
 * Restaura un backup
 * @param {string} nombreArchivo - Nombre del archivo de backup a restaurar
 * @returns {Promise<void>}
 */
async function restaurarBackup(nombreArchivo) {
  try {
    const rutaBackup = path.join(BACKUP_DIR, nombreArchivo);

    // Verificar que el backup existe
    if (!fs.existsSync(rutaBackup)) {
      throw new DatabaseError(`Backup no encontrado: ${nombreArchivo}`, 'restore');
    }

    // Crear backup de la base de datos actual antes de restaurar
    const backupActual = await crearBackup(`pre-restore-${Date.now()}.db`);

    // Copiar backup sobre la base de datos actual
    fs.copyFileSync(rutaBackup, DB_PATH);

    logMessage('SUCCESS', `Backup restaurado: ${nombreArchivo}`, {
      backupRestaurado: nombreArchivo,
      backupPreRestore: path.basename(backupActual)
    });
  } catch (error) {
    logMessage('ERROR', 'Error al restaurar backup', {
      error: error.message,
      archivo: nombreArchivo
    });
    throw new DatabaseError(`Error al restaurar backup: ${error.message}`, 'restore', {
      originalError: error.message
    });
  }
}

/**
 * Elimina backups antiguos (más de X días)
 * @param {number} diasRetencion - Días de retención (default: 30)
 * @returns {Promise<number>} - Número de backups eliminados
 */
async function limpiarBackupsAntiguos(diasRetencion = 30) {
  try {
    const backups = listarBackups();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasRetencion);

    let eliminados = 0;
    for (const backup of backups) {
      if (backup.fecha < fechaLimite) {
        try {
          fs.unlinkSync(backup.ruta);
          eliminados++;
        } catch (error) {
          logMessage('WARNING', `No se pudo eliminar backup: ${backup.nombre}`, {
            error: error.message
          });
        }
      }
    }

    if (eliminados > 0) {
      logMessage('SUCCESS', `${eliminados} backup(s) antiguo(s) eliminado(s)`, {
        eliminados,
        diasRetencion
      });
    }

    return eliminados;
  } catch (error) {
    logMessage('ERROR', 'Error al limpiar backups antiguos', { error: error.message });
    return 0;
  }
}

/**
 * Obtiene el backup más reciente
 * @returns {Object|null}
 */
function obtenerBackupMasReciente() {
  const backups = listarBackups();
  return backups.length > 0 ? backups[0] : null;
}

/**
 * Inicia el sistema de backups automáticos
 * @param {Object} options - Opciones de configuración
 * @param {string} options.cronSchedule - Cron schedule (default: '0 2 * * *' = 2 AM diario)
 * @param {number} options.diasRetencion - Días de retención (default: 30)
 */
function iniciarBackupsAutomaticos(options = {}) {
  const cronSchedule = options.cronSchedule || '0 2 * * *'; // 2 AM diario
  const diasRetencion = options.diasRetencion || 30;

  // Crear backup inicial
  crearBackup().catch(error => {
    logMessage('ERROR', 'Error en backup inicial', { error: error.message });
  });

  // Programar backups periódicos
  cron.schedule(cronSchedule, async () => {
    try {
      await crearBackup();
      await limpiarBackupsAntiguos(diasRetencion);
    } catch (error) {
      logMessage('ERROR', 'Error en backup automático', { error: error.message });
    }
  });

  logMessage('SUCCESS', 'Sistema de backups automáticos iniciado', {
    cronSchedule,
    diasRetencion
  });
}

module.exports = {
  crearBackup,
  listarBackups,
  restaurarBackup,
  limpiarBackupsAntiguos,
  obtenerBackupMasReciente,
  iniciarBackupsAutomaticos,
  BACKUP_DIR
};
