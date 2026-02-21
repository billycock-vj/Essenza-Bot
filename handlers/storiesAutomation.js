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

// Configuración de horarios de publicación (formato cron: minuto hora * * día_semana)
const HORARIOS_PUBLICACION = {
  lunes: '0 11 * * 1',      // Lunes 11:00 AM
  miercoles: '0 18 * * 3',  // Miércoles 6:00 PM
  viernes: '0 21 * * 5',    // Viernes 9:00 PM
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
    const rutaCompleta = path.resolve(path.join(HISTORIAS_BASE_DIR, diaDir));
    
    if (!fs.existsSync(rutaCompleta)) {
      console.warn(`⚠️ [Historias] Carpeta no existe: ${rutaCompleta}`);
      resolve([]);
      return;
    }
    
    fs.readdir(rutaCompleta, (err, archivos) => {
      if (err) {
        console.error(`❌ [Historias] Error al leer carpeta ${rutaCompleta}:`, err.message);
        reject(err);
        return;
      }
      
      if (archivos.length === 0) {
        console.log(`ℹ️ [Historias] Carpeta ${diaDir} está vacía`);
        resolve([]);
        return;
      }
      
      // Filtrar solo archivos (no subdirectorios) e imágenes
      const imagenes = archivos
        .filter(archivo => {
          const rutaArchivo = path.join(rutaCompleta, archivo);
          const esArchivo = fs.statSync(rutaArchivo).isFile();
          if (!esArchivo) {
            console.log(`⏭️ [Historias] Ignorando subdirectorio: ${archivo}`);
            return false;
          }
          const ext = path.extname(archivo).toLowerCase();
          const esImagen = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
          if (!esImagen) {
            console.log(`⏭️ [Historias] Ignorando archivo no imagen: ${archivo} (ext: ${ext || 'sin extensión'})`);
          }
          return esImagen;
        })
        .map(archivo => path.resolve(path.join(rutaCompleta, archivo)));
      
      if (imagenes.length === 0) {
        console.warn(`⚠️ [Historias] No se encontraron imágenes válidas en ${diaDir}. Archivos encontrados: ${archivos.join(', ')}`);
      } else {
        console.log(`✅ [Historias] Encontradas ${imagenes.length} imagen(es) en ${diaDir}`);
      }
      
      resolve(imagenes);
    });
  });
}

/**
 * Obtiene el MIME type según la extensión del archivo
 */
function getMimeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
  return mimeMap[ext] || 'image/jpeg';
}

/**
 * Publica una historia en WhatsApp usando la API de Estado (Stories).
 * El cliente wppconnect tiene sendImageStatus(pathOrBase64) que usa WPP.status.sendImageStatus.
 * @param {Object} client - Cliente de wppconnect
 * @param {string} rutaImagen - Ruta completa de la imagen
 * @returns {Promise<{ ok: boolean, skip?: boolean, error?: string }>}
 */
async function publicarHistoria(client, rutaImagen) {
  const nombreArchivo = path.basename(rutaImagen);
  try {
    // Verificar si ya fue publicada
    const yaPublicada = await db.historiaYaPublicada(nombreArchivo);
    if (yaPublicada) {
      console.log(`⏭️  Historia ya publicada: ${nombreArchivo}`);
      return { ok: true, skip: true };
    }

    // 1) Preferir client.sendImageStatus (API oficial de wppconnect) con data URL base64
    const imagenBuffer = fs.readFileSync(rutaImagen);
    const base64 = imagenBuffer.toString('base64');
    const mime = getMimeFromPath(rutaImagen);
    const dataUrl = `data:${mime};base64,${base64}`;

    if (typeof client.sendImageStatus === 'function') {
      await client.sendImageStatus(dataUrl);
    } else {
      // 2) Fallback: ejecutar en la página si el cliente no expone sendImageStatus
      const page = client.page || (client.getPage && await client.getPage());
      if (page && typeof page.evaluate === 'function') {
        await page.evaluate(async (dataUrlImage) => {
          if (typeof WPP !== 'undefined' && WPP.status && typeof WPP.status.sendImageStatus === 'function') {
            return await WPP.status.sendImageStatus(dataUrlImage);
          }
          throw new Error('WPP.status.sendImageStatus no disponible');
        }, dataUrl);
      } else {
        await client.sendImage('status@broadcast', imagenBuffer, nombreArchivo, '');
      }
    }

    const diaSemana = obtenerDiaSemana();
    const horaPublicacion = new Date().toLocaleTimeString('es-PE');
    await db.registrarHistoriaPublicada(nombreArchivo, rutaImagen, diaSemana, horaPublicacion);
    console.log(`✅ Historia publicada: ${nombreArchivo}`);
    return { ok: true };
  } catch (error) {
    console.error(`❌ Error al publicar historia ${rutaImagen}:`, error.message);
    return { ok: false, error: error.message };
  }
}

/**
 * Publica todas las historias de un día con delays
 * @param {Object} client - Cliente de wppconnect
 * @param {string} dia - Día de la semana (ej: 'lunes')
 * @returns {Promise<{ total: number, publicadas: number, omitidas: number, errores: string[] }>}
 */
async function publicarHistoriasDelDia(client, dia) {
  const resultado = { total: 0, publicadas: 0, omitidas: 0, errores: [] };
  try {
<<<<<<< Updated upstream
    const imagenes = await obtenerImagenesDelDia(dia);
    resultado.total = imagenes.length;

    if (imagenes.length === 0) {
      console.log(`ℹ️  No hay imágenes para publicar el ${dia}`);
      return resultado;
    }

=======
    if (!client) {
      console.warn(`⚠️ [Historias] No hay cliente conectado; no se publican historias de ${dia}.`);
      return;
    }
    const imagenes = await obtenerImagenesDelDia(dia);
    if (imagenes.length === 0) {
      console.log(`ℹ️  No hay imágenes para publicar el ${dia}. Coloca .jpg/.png en: ${path.resolve(HISTORIAS_BASE_DIR, dia)}`);
      return;
    }
>>>>>>> Stashed changes
    console.log(`📸 Publicando ${imagenes.length} historias para ${dia}...`);

    for (let i = 0; i < imagenes.length; i++) {
      const res = await publicarHistoria(client, imagenes[i]);
      if (res.ok && res.skip) resultado.omitidas += 1;
      else if (res.ok) resultado.publicadas += 1;
      else resultado.errores.push(`${path.basename(imagenes[i])}: ${res.error}`);

      if (i < imagenes.length - 1) {
        const delay = obtenerDelay();
        console.log(`⏳ Esperando ${delay / 1000} segundos antes de la siguiente historia...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`✅ Historias de ${dia}: ${resultado.publicadas} publicadas, ${resultado.omitidas} omitidas, ${resultado.errores.length} errores`);
  } catch (error) {
    console.error(`❌ Error al publicar historias de ${dia}:`, error);
    resultado.errores.push(error.message);
  }
  return resultado;
}

/**
 * Inicializa la automatización de historias
 * @param {Object} client - Cliente de wppconnect
 */
function inicializarAutomatizacionHistorias(client) {
  const rutaAbsoluta = path.resolve(HISTORIAS_BASE_DIR);
  console.log('📅 Inicializando automatización de historias...');
<<<<<<< Updated upstream
  
  // Asegurar que existan los directorios por día (lunes, miercoles, viernes)
  ['lunes', 'miercoles', 'viernes'].forEach((dia) => {
    const dir = path.join(HISTORIAS_BASE_DIR, dia);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Creado directorio: ${dir}`);
      } catch (e) {
        console.warn(`⚠️ No se pudo crear ${dir}:`, e.message);
      }
    }
  });
  console.log(`📂 Coloca imágenes en: ${HISTORIAS_BASE_DIR}/lunes, .../miercoles, .../viernes`);
  
  // Programar publicación para cada día
=======
  console.log(`   Carpeta de historias: ${rutaAbsoluta}`);

  if (!fs.existsSync(HISTORIAS_BASE_DIR)) {
    fs.mkdirSync(HISTORIAS_BASE_DIR, { recursive: true });
    ['lunes', 'miercoles', 'viernes'].forEach((d) => {
      const sub = path.join(HISTORIAS_BASE_DIR, d);
      if (!fs.existsSync(sub)) fs.mkdirSync(sub, { recursive: true });
    });
    console.warn(`⚠️ Carpeta creada. Coloca imágenes en: ${rutaAbsoluta}/lunes, .../miercoles, .../viernes`);
  }

  ['lunes', 'miercoles', 'viernes'].forEach((dia) => {
    const sub = path.resolve(path.join(HISTORIAS_BASE_DIR, dia));
    const existe = fs.existsSync(sub);
    if (!existe) {
      console.warn(`   ${dia}: carpeta no existe (${sub})`);
      return;
    }
    try {
      const archivos = fs.readdirSync(sub);
      const imagenes = archivos.filter((f) => {
        const rutaCompleta = path.join(sub, f);
        const esArchivo = fs.statSync(rutaCompleta).isFile();
        if (!esArchivo) return false;
        const ext = path.extname(f).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });
      if (imagenes.length === 0) {
        console.warn(`   ${dia}: sin imágenes (${archivos.length} archivo(s) encontrado(s): ${archivos.join(', ') || 'ninguno'})`);
      } else {
        console.log(`   ${dia}: ${imagenes.length} imagen(es) - ${imagenes.join(', ')}`);
      }
    } catch (error) {
      console.error(`   ${dia}: Error al leer carpeta: ${error.message}`);
    }
  });

  if (!client) {
    console.warn('⚠️ [Historias] No hay cliente wppconnect; los cron se programarán pero fallarán hasta que el bot esté conectado.');
  }

>>>>>>> Stashed changes
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
