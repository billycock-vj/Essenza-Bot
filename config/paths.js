// Configuración de rutas para diferentes entornos
// En Fly.io, los datos persistentes se guardan en /data (volumen montado)
// En desarrollo local, se usan directorios relativos

const path = require('path');
const fs = require('fs');

// Detectar si estamos en Fly.io
const IS_FLY_IO = process.env.FLY_APP_NAME !== undefined || fs.existsSync('/data');

// Directorio base para datos persistentes
const DATA_BASE_DIR = IS_FLY_IO ? '/data' : path.join(__dirname, '..', 'data-storage');

// Directorio base para tokens de WhatsApp
const TOKENS_BASE_DIR = IS_FLY_IO ? '/data/tokens' : path.join(__dirname, '..', 'tokens');

// Directorio base para logs
const LOGS_BASE_DIR = IS_FLY_IO ? '/data/logs' : path.join(__dirname, '..', 'logs');

// Asegurar que los directorios existen
function asegurarDirectorios() {
  const directorios = [
    DATA_BASE_DIR,
    TOKENS_BASE_DIR,
    LOGS_BASE_DIR
  ];

  directorios.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (error) {
      // En Fly.io, el volumen puede no estar montado inmediatamente
      // Los directorios se crearán cuando sea necesario
      console.warn(`⚠️  No se pudo crear directorio ${dir}: ${error.message}`);
    }
  });
}

// Inicializar directorios al cargar el módulo
// Usar try-catch para no bloquear la inicialización
try {
  asegurarDirectorios();
} catch (error) {
  console.warn(`⚠️  Error al inicializar directorios: ${error.message}`);
  // Continuar de todas formas, los directorios se crearán cuando sea necesario
}

module.exports = {
  IS_FLY_IO,
  DATA_BASE_DIR,
  TOKENS_BASE_DIR,
  LOGS_BASE_DIR,
  // Rutas específicas
  DB_PATH: path.join(DATA_BASE_DIR, 'reservas.db'),
  RESERVAS_FILE: path.join(DATA_BASE_DIR, 'reservas.json'),
  USER_DATA_FILE: path.join(DATA_BASE_DIR, 'user-data.json'),
  ESTADISTICAS_FILE: path.join(DATA_BASE_DIR, 'estadisticas.json'),
  TOKENS_PATH: path.join(TOKENS_BASE_DIR, 'essenza-bot'),
};
