/**
 * Módulo para automatización de historias de WhatsApp
 * Publica historias automáticamente según horarios programados
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const db = require('../services/database');
const paths = require('../config/paths');

// Directorio base para historias
const HISTORIAS_BASE_DIR = path.join(__dirname, '..', 'historias');

// Configuración de horarios de publicación (formato cron)
// Ejemplo: '0 18 * * 1' = Lunes a las 6:00 PM
const HORARIOS_PUBLICACION = {
  lunes: '0 18 * * 1',      // Lunes 6:00 PM
  miercoles: '0 18 * * 3',  // Miércoles 6:00 PM
  viernes: '0 18 * * 5',    // Viernes 6:00 PM
};

// Delay entre historias (20-40 segundos)
const DELAY_MIN = 20000; // 20 segundos
const DELAY_MAX = 40000; // 40 segundos

/**
 * Obtiene un delay aleatorio entre historias
 */
function obtenerDelay() {
  return Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN + 1)) + DELAY_MIN;
}

/**
 * Obtiene el nombre del día en español
 */
function obtenerDiaSemana() {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  return dias[new Date().getDay()];
}

/**
 * Obtiene todas las imágenes de un directorio de día
 * @param {string} diaDir - Directorio del día (ej: 'lunes')
 * @returns {Promise<string[]>} - Array de rutas completas de imágenes
 */
async function obtenerImagenesDelDia(diaDir) {
  return new Promise((resolve, reject) => {
    const rutaCompleta = path.join(HISTORIAS_BASE_DIR, diaDir);
    
    if (!fs.existsSync(rutaCompleta)) {
      resolve([]);
      return;
    }
    
    fs.readdir(rutaCompleta, (err, archivos) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Filtrar solo imágenes
      const imagenes = archivos
        .filter(archivo => {
          const ext = path.extname(archivo).toLowerCase();
          return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        })
        .map(archivo => path.join(rutaCompleta, archivo));
      
      resolve(imagenes);
    });
  });
}

/**
 * Publica una historia en WhatsApp
 * @param {Object} client - Cliente de wppconnect
 * @param {string} rutaImagen - Ruta completa de la imagen
 * @returns {Promise<void>}
 */
async function publicarHistoria(client, rutaImagen) {
  try {
    const nombreArchivo = path.basename(rutaImagen);
    
    // Verificar si ya fue publicada
    const yaPublicada = await db.historiaYaPublicada(nombreArchivo);
    if (yaPublicada) {
      console.log(`⏭️  Historia ya publicada: ${nombreArchivo}`);
      return;
    }
    
    // Leer imagen
    const imagenBuffer = fs.readFileSync(rutaImagen);
    
    // Publicar en WhatsApp (usando status@broadcast)
    await client.sendImage('status@broadcast', imagenBuffer, nombreArchivo, '');
    
    // Registrar en base de datos
    const diaSemana = obtenerDiaSemana();
    const horaPublicacion = new Date().toLocaleTimeString('es-PE');
    await db.registrarHistoriaPublicada(nombreArchivo, rutaImagen, diaSemana, horaPublicacion);
    
    console.log(`✅ Historia publicada: ${nombreArchivo}`);
  } catch (error) {
    console.error(`❌ Error al publicar historia ${rutaImagen}:`, error.message);
  }
}

/**
 * Publica todas las historias de un día con delays
 * @param {Object} client - Cliente de wppconnect
 * @param {string} dia - Día de la semana (ej: 'lunes')
 * @returns {Promise<void>}
 */
async function publicarHistoriasDelDia(client, dia) {
  try {
    const imagenes = await obtenerImagenesDelDia(dia);
    
    if (imagenes.length === 0) {
      console.log(`ℹ️  No hay imágenes para publicar el ${dia}`);
      return;
    }
    
    console.log(`📸 Publicando ${imagenes.length} historias para ${dia}...`);
    
    // Publicar cada imagen con delay
    for (let i = 0; i < imagenes.length; i++) {
      await publicarHistoria(client, imagenes[i]);
      
      // Delay entre historias (excepto la última)
      if (i < imagenes.length - 1) {
        const delay = obtenerDelay();
        console.log(`⏳ Esperando ${delay / 1000} segundos antes de la siguiente historia...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log(`✅ Todas las historias de ${dia} publicadas`);
  } catch (error) {
    console.error(`❌ Error al publicar historias de ${dia}:`, error);
  }
}

/**
 * Inicializa la automatización de historias
 * @param {Object} client - Cliente de wppconnect
 */
function inicializarAutomatizacionHistorias(client) {
  console.log('📅 Inicializando automatización de historias...');
  
  // Programar publicación para cada día
  Object.entries(HORARIOS_PUBLICACION).forEach(([dia, cronExpression]) => {
    cron.schedule(cronExpression, async () => {
      console.log(`⏰ Hora de publicar historias de ${dia}`);
      await publicarHistoriasDelDia(client, dia);
    });
    
    console.log(`✅ Programada publicación de historias para ${dia} (${cronExpression})`);
  });
  
  console.log('✅ Automatización de historias inicializada');
}

module.exports = {
  inicializarAutomatizacionHistorias,
  publicarHistoriasDelDia,
  publicarHistoria
};
