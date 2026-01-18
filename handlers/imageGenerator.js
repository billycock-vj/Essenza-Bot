/**
 * Generador de imágenes de confirmación de citas
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { logMessage } = require('../utils/logger');
const paths = require('../config/paths');

const IMAGENES_DIR = path.join(paths.DATA_BASE_DIR, 'imagenes');
const PLANTILLA_BASE_PATH = path.join(IMAGENES_DIR, 'plantilla_base.png');

// Asegurar que el directorio de imágenes existe
if (!fs.existsSync(IMAGENES_DIR)) {
  fs.mkdirSync(IMAGENES_DIR, { recursive: true });
}

/**
 * Crea una imagen de confirmación de cita usando la plantilla base
 * @param {Object} datosReserva - Datos de la reserva
 * @param {number} idReserva - ID de la reserva en la base de datos
 * @returns {Promise<Buffer>} - Buffer de la imagen generada
 * @throws {Error} - Si no existe la plantilla base o hay error al generar
 */
async function generarImagenCita(datosReserva, idReserva) {
  try {
    // Verificar que existe la plantilla base
    if (!fs.existsSync(PLANTILLA_BASE_PATH)) {
      throw new Error(`No se encontró la plantilla base en: ${PLANTILLA_BASE_PATH}`);
    }

    // Cargar la plantilla base
    const plantilla = await sharp(PLANTILLA_BASE_PATH);
    const metadata = await plantilla.metadata();
    const ancho = metadata.width;
    const alto = metadata.height;

    // Crear un SVG con el texto de la cita
    const svgTexto = crearSVGTexto(datosReserva, idReserva, ancho, alto);

    // Superponer el texto sobre la plantilla (sin recortar)
    const imagenFinal = await plantilla
      .composite([
        {
          input: Buffer.from(svgTexto),
          top: 0,
          left: 0
        }
      ])
      .png()
      .toBuffer();

    logMessage("SUCCESS", "Imagen de cita generada exitosamente", {
      idReserva: idReserva,
      ancho: ancho,
      alto: alto
    });

    return imagenFinal;

  } catch (error) {
    logMessage("ERROR", "Error al generar imagen de cita", {
      error: error.message,
      stack: error.stack,
      idReserva: idReserva
    });
    throw error;
  }
}

/**
 * Crea el SVG con el texto de la cita
 * @param {Object} datosReserva - Datos de la reserva
 * @param {number} idReserva - ID de la reserva
 * @param {number} ancho - Ancho de la imagen
 * @param {number} alto - Alto de la imagen
 * @returns {string} - SVG como string
 */
function crearSVGTexto(datosReserva, idReserva, ancho, alto) {
  const padding = 40;
  const fontSizeTitulo = Math.floor(ancho * 0.05);
  // Aumentar ligeramente el tamaño de fuente para mejor legibilidad
  const fontSizeNormal = Math.floor(ancho * 0.038);
  // Ajustar espaciado entre líneas para mejor legibilidad
  const lineHeight = fontSizeNormal * 1.7;
  
  // Calcular posición inicial: más cerca de "Cita:" (aproximadamente al 52% de la altura)
  const yInicio = Math.floor(alto * 0.52);
  // Centrar el texto horizontalmente
  const xPos = ancho / 2;

  // Formatear fecha y hora con día de la semana y formato AM/PM
  const fechaHoraTexto = formatearFechaHora(datosReserva.fechaTexto, datosReserva.hora);
  
  // Formatear precio
  const precioTexto = datosReserva.precio === 'A revisión' 
    ? 'A revisión' 
    : `S/ ${datosReserva.precio}`;
  
  // Formatear depósito
  const depositoTexto = datosReserva.deposito > 0 
    ? `S/ ${datosReserva.deposito}` 
    : 'S/ 20';

  // Crear las líneas de texto (formato similar a la plantilla)
  const lineas = [
    { texto: `ID Reserva: #${idReserva}`, size: fontSizeNormal, weight: 'normal' },
    { texto: `Fecha y hora: ${fechaHoraTexto}`, size: fontSizeNormal, weight: 'normal' },
    { texto: `Cliente: ${datosReserva.cliente}`, size: fontSizeNormal, weight: 'normal' },
    { texto: `Teléfono: ${datosReserva.telefono}`, size: fontSizeNormal, weight: 'normal' },
    { texto: `Servicio: ${datosReserva.servicio}`, size: fontSizeNormal, weight: 'normal', multilinea: true },
    { texto: `Precio: ${precioTexto}`, size: fontSizeNormal, weight: 'normal' },
    { texto: `Depósito: ${depositoTexto}`, size: fontSizeNormal, weight: 'normal' },
    { texto: `Estado: ${datosReserva.estado}`, size: fontSizeNormal, weight: 'bold', conCaja: true }
  ];

  // Calcular posiciones Y con espaciado mejorado
  let currentY = yInicio;
  lineas.forEach((linea, index) => {
    // Agregar un poco más de espacio después del ID Reserva
    if (index === 0) {
      linea.y = currentY;
      currentY += lineHeight * 1.2; // Más espacio después del ID
    } else {
      linea.y = currentY;
      // Si es multilínea, calcular altura adicional
      if (linea.multilinea) {
        const lineasServicio = dividirTextoEnLineas(linea.texto, ancho - (padding * 2), fontSizeNormal);
        currentY += lineHeight * Math.max(1, lineasServicio.length);
      } else {
        currentY += lineHeight;
      }
    }
  });

  // Crear elementos de texto SVG (centrados)
  const elementosTexto = [];
  lineas.forEach((linea) => {
    const fontWeight = linea.weight === 'bold' ? 'bold' : 'normal';
    // Color más oscuro para mejor legibilidad
    const fillColor = '#3a3a3a';
    
    if (linea.multilinea) {
      // Dividir el servicio en múltiples líneas si es necesario
      const lineasTexto = dividirTextoEnLineas(linea.texto, ancho - (padding * 2), fontSizeNormal);
      let yOffset = 0;
      lineasTexto.forEach((lineaTexto) => {
        elementosTexto.push(
          `<text x="${xPos}" y="${linea.y + yOffset}" font-family="Georgia, serif" font-size="${linea.size}" font-weight="${fontWeight}" fill="${fillColor}" text-anchor="middle">${escapeXml(lineaTexto)}</text>`
        );
        yOffset += lineHeight;
      });
    } else if (linea.conCaja && datosReserva.estado.toLowerCase() === 'confirmada') {
      // Agregar caja verde para el estado "Confirmada" (solo la palabra, no el label)
      const textoEstado = datosReserva.estado;
      const textoLabel = "Estado: ";
      
      // Calcular ancho del texto usando un factor más preciso para Georgia serif
      // Factor aproximado: caracteres promedio en Georgia serif
      const factorAncho = fontSizeNormal * 0.58;
      const labelWidth = textoLabel.length * factorAncho;
      const estadoWidth = textoEstado.length * factorAncho;
      const boxPadding = 6;
      const boxHeight = fontSizeNormal + (boxPadding * 2);
      const boxWidth = estadoWidth + (boxPadding * 2);
      
      // Calcular posición X de la caja
      // El texto completo está centrado en xPos con text-anchor="middle"
      const textoCompleto = linea.texto;
      const anchoTextoCompleto = textoCompleto.length * factorAncho;
      const inicioTexto = xPos - (anchoTextoCompleto / 2);
      
      // La caja debe empezar justo después del label "Estado: " con un pequeño espacio
      const espacioEntreLabelYEstado = fontSizeNormal * 0.1; // Pequeño espacio entre "Estado: " y "Confirmada"
      const boxX = inicioTexto + labelWidth + espacioEntreLabelYEstado - boxPadding;
      const boxY = linea.y - fontSizeNormal - boxPadding;
      
      // Caja verde con bordes redondeados
      elementosTexto.push(
        `<rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="6" ry="6" fill="#90EE90" opacity="0.4"/>`
      );
      
      // Texto completo centrado con estado en verde oscuro y negrita
      elementosTexto.push(
        `<text x="${xPos}" y="${linea.y}" font-family="Georgia, serif" font-size="${linea.size}" font-weight="normal" fill="${fillColor}" text-anchor="middle">${escapeXml(textoLabel)}<tspan fill="#1a5a1a" font-weight="bold">${escapeXml(textoEstado)}</tspan></text>`
      );
    } else {
      // Texto centrado con mejor contraste
      const textoColor = fillColor;
      elementosTexto.push(
        `<text x="${xPos}" y="${linea.y}" font-family="Georgia, serif" font-size="${linea.size}" font-weight="${fontWeight}" fill="${textoColor}" text-anchor="middle">${escapeXml(linea.texto)}</text>`
      );
    }
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${ancho}" height="${alto}" xmlns="http://www.w3.org/2000/svg">
  ${elementosTexto.join('\n')}
</svg>`;

  return svg;
}

/**
 * Formatea la fecha y hora con día de la semana y formato AM/PM
 * @param {string} fechaTexto - Texto de fecha (ej: "Domingo 11/01/2026" o "11/01/2026")
 * @param {string} hora - Hora en formato 24h (ej: "16:00")
 * @returns {string} - Fecha y hora formateada (ej: "Lunes 12/01/2026 – 5:00 PM")
 */
function formatearFechaHora(fechaTexto, hora) {
  // Extraer día de la semana si está en fechaTexto
  let diaSemana = '';
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  
  // Buscar día de la semana en el texto
  for (const dia of diasSemana) {
    if (fechaTexto.toLowerCase().includes(dia.toLowerCase())) {
      diaSemana = dia;
      break;
    }
  }
  
  // Si no se encontró, calcular desde la fecha
  if (!diaSemana) {
    const fechaMatch = fechaTexto.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (fechaMatch) {
      const [, dia, mes, año] = fechaMatch;
      const fecha = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
      diaSemana = diasSemana[fecha.getDay()];
    }
  }
  
  // Extraer fecha sin día de la semana
  const fechaMatch = fechaTexto.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  const fechaFormateada = fechaMatch ? fechaMatch[1] : fechaTexto;
  
  // Convertir hora de 24h a 12h con AM/PM
  const [horas, minutos] = hora.split(':').map(Number);
  let horas12 = horas;
  let periodo = 'AM';
  
  if (horas === 0) {
    horas12 = 12;
  } else if (horas === 12) {
    periodo = 'PM';
  } else if (horas > 12) {
    horas12 = horas - 12;
    periodo = 'PM';
  }
  
  const horaFormateada = `${horas12}:${minutos.toString().padStart(2, '0')} ${periodo}`;
  
  return `${diaSemana} ${fechaFormateada} – ${horaFormateada}`;
}

/**
 * Divide un texto en múltiples líneas si excede el ancho máximo
 * @param {string} texto - Texto a dividir
 * @param {number} anchoMaximo - Ancho máximo en píxeles
 * @param {number} fontSize - Tamaño de fuente
 * @returns {Array<string>} - Array de líneas
 */
function dividirTextoEnLineas(texto, anchoMaximo, fontSize) {
  // Aproximación: cada carácter ocupa aproximadamente 0.6 * fontSize
  const caracteresPorLinea = Math.floor(anchoMaximo / (fontSize * 0.6));
  
  const palabras = texto.split(' ');
  const lineas = [];
  let lineaActual = '';
  
  palabras.forEach((palabra) => {
    const textoPrueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
    if (textoPrueba.length <= caracteresPorLinea) {
      lineaActual = textoPrueba;
    } else {
      if (lineaActual) {
        lineas.push(lineaActual);
      }
      lineaActual = palabra;
    }
  });
  
  if (lineaActual) {
    lineas.push(lineaActual);
  }
  
  return lineas.length > 0 ? lineas : [texto];
}

/**
 * Escapa caracteres especiales para XML
 */
function escapeXml(texto) {
  if (!texto) return '';
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Guarda la imagen generada en disco (opcional, para debugging)
 * @param {Buffer} imagenBuffer - Buffer de la imagen
 * @param {number} idReserva - ID de la reserva
 * @returns {Promise<string>} - Ruta del archivo guardado
 */
async function guardarImagen(imagenBuffer, idReserva) {
  const nombreArchivo = `cita_${idReserva}_${Date.now()}.png`;
  const rutaArchivo = path.join(IMAGENES_DIR, nombreArchivo);
  
  await fs.promises.writeFile(rutaArchivo, imagenBuffer);
  
  return rutaArchivo;
}

module.exports = {
  generarImagenCita,
  guardarImagen,
  PLANTILLA_BASE_PATH
};
