/**
 * Flujo simple del bot: solo 3 acciones para clientes
 * 1. Saludar condicional a horario
 * 2. Mandar imágenes (desde carpeta imagenes/)
 * 3. Preguntar para cuándo le gustaría la reserva
 */

const path = require('path');
const fs = require('fs');

const CARPETA_IMAGENES = path.join(__dirname, '..', 'imagenes');
const EXTENSIONES_IMAGEN = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Devuelve el saludo según la hora (Perú)
 */
function saludoPorHorario() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return 'Buenos días';
  if (hora >= 12 && hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Lista rutas de imágenes en la carpeta imagenes/
 * La carpeta se crea si no existe.
 */
function obtenerImagenes() {
  if (!fs.existsSync(CARPETA_IMAGENES)) {
    try {
      fs.mkdirSync(CARPETA_IMAGENES, { recursive: true });
    } catch (e) {
      return [];
    }
  }
  const archivos = fs.readdirSync(CARPETA_IMAGENES);
  return archivos
    .filter((f) => EXTENSIONES_IMAGEN.includes(path.extname(f).toLowerCase()))
    .map((f) => path.join(CARPETA_IMAGENES, f));
}

/**
 * Ejecuta el flujo simple: saludo + imágenes + pregunta de reserva
 * @param {Object} client - Cliente wppconnect
 * @param {string} userId - ID del chat
 * @param {boolean} primeraVez - Si es la primera interacción (enviar imágenes); si no, solo pregunta
 */
async function ejecutarFlujoSimple(client, userId, primeraVez = true) {
  const saludo = saludoPorHorario();
  const nombre = 'Essenza Spa';

  if (primeraVez) {
    const textoSaludo = `${saludo} 👋\n\nSomos *${nombre}*. Gracias por escribirnos.`;
    await client.sendText(userId, textoSaludo);

    const imagenes = obtenerImagenes();
    for (const ruta of imagenes) {
      try {
        const nombreArchivo = path.basename(ruta);
        await client.sendImage(userId, ruta, nombreArchivo, '');
        await new Promise((r) => setTimeout(r, 800));
      } catch (e) {
        console.warn('Flujo simple: error enviando imagen', ruta, e.message);
      }
    }
  }

  const preguntaReserva = '¿Para qué día le gustaría la reserva?';
  await client.sendText(userId, preguntaReserva);
}

module.exports = {
  saludoPorHorario,
  obtenerImagenes,
  ejecutarFlujoSimple,
  CARPETA_IMAGENES,
};
