/**
 * Handler para procesamiento de imágenes con OpenAI Vision
 */

const OpenAI = require("openai");
const { logMessage } = require('../utils/logger');
const { enviarMensajeSeguro } = require('./messageHelpers');
const db = require('../services/database');
const servicios = require('../data/services');
const config = require('../config');

let openai = null;

/**
 * Inicializa OpenAI si está configurado
 */
function inicializarOpenAI() {
  if (config.OPENAI_API_KEY && !openai) {
    openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    });
  }
}

/**
 * Extrae datos de una cita desde una imagen usando OpenAI Vision
 * @param {Object} client - Cliente de wppconnect
 * @param {Object} message - Mensaje con imagen
 * @returns {Promise<Object|null>} - Datos extraídos de la imagen o null si hay error
 */
async function extraerDatosCitaDeImagen(client, message) {
  try {
    inicializarOpenAI();
    
    logMessage("INFO", "Iniciando extracción de datos de imagen con OpenAI Vision", {
      messageId: message.id,
      type: message.type
    });

    // Descargar la imagen usando wppconnect
    let base64Image;
    try {
      // En wppconnect v1.37.8, el método correcto es downloadMedia
      // Verificar si el mensaje tiene mediaKey (necesario para descargar)
      if (!message.mediaKey) {
        logMessage("ERROR", "El mensaje no tiene mediaKey", {
          messageId: message.id,
          type: message.type
        });
        return null;
      }

      // Usar downloadMedia que es el método estándar en wppconnect
      const mediaData = await client.downloadMedia(message);
      
      // Convertir Buffer a base64
      if (Buffer.isBuffer(mediaData)) {
        base64Image = mediaData.toString('base64');
      } else if (typeof mediaData === 'string') {
        // Si ya viene como base64 string
        base64Image = mediaData.replace(/^data:image\/[^;]+;base64,/, '');
      } else {
        throw new Error('Formato de media no reconocido');
      }
    } catch (error) {
      logMessage("ERROR", "Error al descargar imagen", {
        error: error.message,
        stack: error.stack,
        messageId: message.id,
        messageType: message.type,
        hasMediaKey: !!message.mediaKey,
      });
      return null;
    }
    
    if (!openai || !config.OPENAI_API_KEY) {
      logMessage("ERROR", "OpenAI no está configurado");
      return null;
    }

    // Usar OpenAI Vision para extraer información
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analiza esta imagen de una tarjeta de cita de spa y extrae TODA la información visible.

Devuelve SOLO un JSON válido con esta estructura exacta:
{
  "fecha": "dd/MM/yyyy" o "dd/MM" si no hay año (ej: "03/01/2025" o "03/01"),
  "hora": "HH:mm" en formato 24 horas (ej: "18:00" para 6 pm, "14:00" para 2 pm),
  "servicio": "nombre exacto del servicio tal como aparece",
  "precio": número sin símbolos (ej: 35 para "S/ 35"),
  "nombreCliente": "nombre completo del cliente si aparece, null si no",
  "telefonoCliente": "número de teléfono completo si aparece (con código de país si está), null si no",
  "duracion": número en minutos si aparece (ej: 60), null si no
}

IMPORTANTE:
- Si la fecha solo tiene día y mes (ej: "03/01"), no incluyas el año en el JSON
- Convierte las horas de formato 12h (am/pm) a formato 24h
- Si algún dato no está visible en la imagen, usa null para ese campo
- Solo devuelve el JSON, sin texto adicional, sin markdown, sin explicaciones`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.1 // Baja temperatura para respuestas más precisas
    });
    
    const respuesta = response.choices[0].message.content.trim();
    
    // Extraer JSON de la respuesta (puede venir con markdown o texto adicional)
    let jsonMatch = respuesta.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Intentar parsear directamente
      jsonMatch = [respuesta];
    }
    
    const datosCita = JSON.parse(jsonMatch[0]);
    
    logMessage("SUCCESS", "Datos extraídos de imagen exitosamente", {
      datosCita: datosCita
    });
    
    return datosCita;
    
  } catch (error) {
    logMessage("ERROR", "Error al extraer datos de imagen", {
      error: error.message,
      stack: error.stack
    });
    return null;
  }
}

/**
 * Crea una cita completa en la base de datos desde los datos extraídos
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userIdAdmin - ID del administrador que crea la cita
 * @param {Object} datosCita - Datos extraídos de la imagen
 * @returns {Promise<Object>} - Resultado con idReserva o error
 */
async function crearCitaCompleta(client, userIdAdmin, datosCita) {
  const { extraerNumero } = require('./messageHelpers');
  
  try {
    // Validar datos mínimos
    if (!datosCita.fecha || !datosCita.hora || !datosCita.servicio) {
      throw new Error('Faltan datos obligatorios: fecha, hora o servicio');
    }

    // Parsear fecha y hora
    let fechaHora;
    const partesFecha = datosCita.fecha.split('/');
    if (partesFecha.length < 2) {
      throw new Error('Formato de fecha inválido');
    }

    const dia = parseInt(partesFecha[0], 10);
    const mes = parseInt(partesFecha[1], 10) - 1; // Meses en JS son 0-indexed
    let año = partesFecha[2] ? parseInt(partesFecha[2], 10) : new Date().getFullYear();
    
    const [hora, minutos] = datosCita.hora.split(':').map(n => parseInt(n) || 0);
    
    fechaHora = new Date(año, mes, dia, hora, minutos);
    
    // Si la fecha ya pasó este año y no se especificó año, asumir próximo año
    if (fechaHora < new Date() && !partesFecha[2]) {
      fechaHora.setFullYear(año + 1);
    }
    
    // Validar que la fecha es válida
    if (fechaHora.getDate() !== dia || fechaHora.getMonth() !== mes) {
      throw new Error('Fecha inválida (ej: 31/02)');
    }
    
    // Obtener duración del servicio si no está en la imagen
    let duracion = datosCita.duracion;
    if (!duracion) {
      const servicioInfo = Object.values(servicios)
        .flatMap(s => s.opciones || [])
        .find(s => s.nombre.toLowerCase() === datosCita.servicio.toLowerCase());
      if (servicioInfo) {
        const duracionMatch = servicioInfo.duracion.match(/\d+/);
        duracion = duracionMatch ? parseInt(duracionMatch[0]) : 60;
      } else {
        duracion = 60; // Default
      }
    }
    
    // Formatear userId del cliente
    let userIdCliente = datosCita.telefonoCliente;
    if (!userIdCliente) {
      throw new Error('Número de teléfono del cliente no encontrado en la imagen');
    }
    
    // Normalizar número de teléfono al formato estándar 51XXXXXXXXX
    const { normalizarTelefono } = require('./messageHelpers');
    const numeroNormalizado = normalizarTelefono(userIdCliente);
    if (!numeroNormalizado) {
      throw new Error('Número de teléfono inválido en la imagen');
    }
    userIdCliente = numeroNormalizado + '@c.us';
    
    // Obtener nombre del cliente
    const userName = datosCita.nombreCliente || 'Cliente';
    
    // Crear la reserva
    const reserva = {
      userId: userIdCliente,
      userName: userName,
      servicio: datosCita.servicio,
      fechaHora: fechaHora,
      duracion: duracion,
      estado: 'confirmada', // Las citas creadas por admin se marcan como confirmadas
      deposito: datosCita.precio ? parseFloat(datosCita.precio) : 0
    };
    
    // Guardar en base de datos
    const idReserva = await db.guardarReserva(reserva);
    
    // Enviar confirmación al administrador
    await enviarMensajeSeguro(
      client,
      userIdAdmin,
      `✅ *Cita creada exitosamente*\n\n` +
      `🆔 ID Reserva: ${idReserva}\n` +
      `📅 Fecha: ${fechaHora.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n` +
      `⏰ Hora: ${fechaHora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}\n` +
      `👤 Cliente: ${userName}\n` +
      `📱 Teléfono: ${extraerNumero(userIdCliente)}\n` +
      `💆 Servicio: ${datosCita.servicio}\n` +
      `⏱️ Duración: ${duracion} minutos\n` +
      `💰 Precio: S/ ${datosCita.precio || '0'}\n` +
      `📊 Estado: Confirmada`
    );
    
    logMessage("SUCCESS", "Cita creada desde imagen por administrador", {
      idReserva: idReserva,
      datosCita: datosCita,
      reserva: reserva
    });
    
    return { exito: true, idReserva: idReserva, reserva: reserva };
    
  } catch (error) {
    logMessage("ERROR", "Error al crear cita completa", {
      error: error.message,
      stack: error.stack,
      datosCita: datosCita
    });
    throw error;
  }
}

/**
 * Procesa una imagen enviada por un administrador para crear una cita
 * @param {Object} client - Cliente de wppconnect
 * @param {Object} message - Mensaje con imagen
 * @param {string} userId - ID del administrador
 */
async function procesarImagenCita(client, message, userId) {
  try {
    console.log(`\n📷 IMAGEN RECIBIDA DE ADMINISTRADOR - PROCESANDO CON OPENAI VISION...\n`);
    logMessage("INFO", "Procesando imagen de cita enviada por administrador", {
      userId: userId,
      messageId: message.id
    });

    // Enviar mensaje de procesamiento
    await enviarMensajeSeguro(
      client,
      userId,
      "🔄 Procesando imagen con OpenAI Vision...\n\nPor favor espera un momento."
    );

    // Extraer información de la imagen
    const datosCita = await extraerDatosCitaDeImagen(client, message);
    
    if (!datosCita) {
      await enviarMensajeSeguro(
        client,
        userId,
        "❌ No pude procesar la imagen. Por favor, asegúrate de que:\n" +
        "• La imagen sea clara y legible\n" +
        "• Contenga la información de la cita\n" +
        "• Esté bien iluminada\n\n" +
        "Intenta enviar la imagen nuevamente."
      );
      return;
    }
    
    // Validar datos mínimos extraídos
    if (!datosCita.fecha || !datosCita.hora || !datosCita.servicio) {
      let mensajeError = "❌ No pude extraer toda la información necesaria de la imagen.\n\n";
      mensajeError += "*Datos encontrados:*\n";
      mensajeError += `• Fecha: ${datosCita.fecha || '❌ No encontrada'}\n`;
      mensajeError += `• Hora: ${datosCita.hora || '❌ No encontrada'}\n`;
      mensajeError += `• Servicio: ${datosCita.servicio || '❌ No encontrado'}\n`;
      mensajeError += `• Precio: ${datosCita.precio ? 'S/ ' + datosCita.precio : 'No encontrado'}\n`;
      mensajeError += `• Cliente: ${datosCita.nombreCliente || '❌ No encontrado'}\n`;
      mensajeError += `• Teléfono: ${datosCita.telefonoCliente || '❌ No encontrado'}\n\n`;
      mensajeError += "Por favor, verifica que la imagen contenga al menos:\n";
      mensajeError += "• Fecha (dd/MM o dd/MM/yyyy)\n";
      mensajeError += "• Hora\n";
      mensajeError += "• Servicio\n";
      mensajeError += "• Nombre del cliente\n";
      mensajeError += "• Teléfono del cliente";

      await enviarMensajeSeguro(client, userId, mensajeError);
      return;
    }
    
    // Si faltan datos críticos del cliente, informar
    if (!datosCita.telefonoCliente || !datosCita.nombreCliente) {
      let mensajeFaltante = "⚠️ *Datos extraídos de la imagen:*\n\n";
      mensajeFaltante += `📅 Fecha: ${datosCita.fecha}\n`;
      mensajeFaltante += `⏰ Hora: ${datosCita.hora}\n`;
      mensajeFaltante += `💆 Servicio: ${datosCita.servicio}\n`;
      mensajeFaltante += `💰 Precio: S/ ${datosCita.precio || '0'}\n`;
      if (datosCita.duracion) {
        mensajeFaltante += `⏱️ Duración: ${datosCita.duracion} minutos\n`;
      }
      mensajeFaltante += "\n❌ *Faltan los siguientes datos obligatorios:*\n";
      if (!datosCita.telefonoCliente) {
        mensajeFaltante += "• Número de teléfono del cliente\n";
      }
      if (!datosCita.nombreCliente) {
        mensajeFaltante += "• Nombre del cliente\n";
      }
      mensajeFaltante += "\nPor favor, asegúrate de que la imagen contenga esta información.";

      await enviarMensajeSeguro(client, userId, mensajeFaltante);
      return;
    }
    
    // Si tenemos todos los datos, crear la cita directamente
    await crearCitaCompleta(client, userId, datosCita);
    
  } catch (error) {
    logMessage("ERROR", "Error al procesar imagen de cita", {
      error: error.message,
      stack: error.stack
    });
    await enviarMensajeSeguro(
      client,
      userId,
      "❌ Error al procesar la imagen y crear la cita.\n\n" +
      `Error: ${error.message}\n\n` +
      "Por favor, verifica que:\n" +
      "• La imagen contenga todos los datos necesarios\n" +
      "• Los datos sean legibles\n" +
      "• Intenta enviar la imagen nuevamente"
    );
  }
}

module.exports = {
  procesarImagenCita,
  extraerDatosCitaDeImagen,
  crearCitaCompleta
};
