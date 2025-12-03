require("dotenv").config();
const wppconnect = require("@wppconnect-team/wppconnect");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

// ============================================
// CONFIGURACIÓN (Variables de Entorno)
// ============================================
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || "51983104105@c.us";
const HORARIO_ATENCION =
  process.env.HORARIO_ATENCION || "Lunes a Sábado: 9:00 AM - 8:00 PM";
const YAPE_NUMERO = process.env.YAPE_NUMERO || "953348917";
const YAPE_TITULAR = process.env.YAPE_TITULAR || "Esther Ocaña Baron";
const BANCO_CUENTA = process.env.BANCO_CUENTA || "19194566778095";
const UBICACION = process.env.UBICACION || "Puente Piedra, Lima, Perú";
const MAPS_LINK =
  process.env.MAPS_LINK || "https://maps.app.goo.gl/R5F8PGbcFufNADF39";

// Estados de usuario
const userState = {};
const humanModeUsers = new Set();
const userNames = {}; // Recordar nombres de usuarios
const userData = {}; // Datos adicionales de usuarios
const reservas = []; // Reservas temporales para recordatorios
const ultimaRespuestaReserva = {}; // Guardar timestamp de última respuesta en modo reserva
const estadisticas = {
  usuariosAtendidos: new Set(),
  totalMensajes: 0,
  reservasSolicitadas: 0,
  asesoresActivados: 0,
  inicio: new Date(),
};

// ============================================
// SERVICIOS DETALLADOS
// ============================================
const servicios = {
  1: {
    nombre: "Masajes Relajantes",
    duracion: "45 minutos",
    precio: "S/25",
    descripcion: "Masaje terapéutico para aliviar tensiones y estrés",
    beneficios: [
      "Alivia dolores musculares",
      "Reduce el estrés y la ansiedad",
      "Mejora la circulación",
      "Promueve la relajación profunda",
    ],
    imagen: process.env.SERVICIO1_IMAGEN || null,
  },
  2: {
    nombre: "Limpieza Facial Profunda",
    duracion: "60 minutos",
    precio: "S/60",
    descripcion: "Tratamiento facial completo para rejuvenecer tu piel",
    beneficios: [
      "Elimina impurezas y puntos negros",
      "Hidrata y nutre la piel",
      "Reduce arrugas y líneas de expresión",
      "Mejora la textura y brillo",
    ],
    imagen: process.env.SERVICIO2_IMAGEN || null,
  },
  3: {
    nombre: "Manicura y Pedicura",
    duracion: "90 minutos",
    precio: "S/30",
    descripcion: "Cuidado completo de uñas de manos y pies",
    beneficios: [
      "Uñas limpias y bien cuidadas",
      "Exfoliación y hidratación",
      "Esmaltado profesional",
      "Relajación de manos y pies",
    ],
    imagen: process.env.SERVICIO3_IMAGEN || null,
  },
  4: {
    nombre: "Extensiones de Pestañas",
    duracion: "120 minutos",
    precio: "S/80",
    descripcion: "Extensiones de pestañas naturales y duraderas",
    beneficios: [
      "Pestañas más largas y voluminosas",
      "Efecto natural y elegante",
      "Duración de 3-4 semanas",
      "Sin necesidad de máscara",
    ],
    imagen: process.env.SERVICIO4_IMAGEN || null,
  },
  5: {
    nombre: "Diseño de Cejas",
    duracion: "30 minutos",
    precio: "S/30",
    descripcion: "Diseño y perfilado profesional de cejas",
    beneficios: [
      "Cejas perfectamente definidas",
      "Forma personalizada a tu rostro",
      "Técnica profesional",
      "Resultado natural",
    ],
    imagen: process.env.SERVICIO5_IMAGEN || null,
  },
  6: {
    nombre: "Fisioterapia y Terapias",
    duracion: "60 minutos",
    precio: "S/60",
    descripcion: "Tratamientos terapéuticos para recuperación y bienestar",
    beneficios: [
      "Alivia dolores crónicos",
      "Mejora la movilidad",
      "Recuperación post-lesión",
      "Bienestar general",
    ],
    imagen: process.env.SERVICIO6_IMAGEN || null,
  },
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

// Fuzzy matching para errores de escritura
function fuzzyMatch(input, target, threshold = 0.7) {
  const inputLower = input.toLowerCase();
  const targetLower = target.toLowerCase();

  if (inputLower === targetLower) return true;
  if (inputLower.includes(targetLower) || targetLower.includes(inputLower))
    return true;

  // Calcular similitud simple (Levenshtein simplificado)
  let matches = 0;
  const minLen = Math.min(inputLower.length, targetLower.length);
  for (let i = 0; i < minLen; i++) {
    if (inputLower[i] === targetLower[i]) matches++;
  }
  return matches / Math.max(inputLower.length, targetLower.length) >= threshold;
}

// Detectar saludos
function detectSaludo(text) {
  const saludos = {
    buenosDias: [
      "buenos días",
      "buen día",
      "buenos dias",
      "buen dia",
      "día",
      "dia",
    ],
    buenasTardes: ["buenas tardes", "buena tarde", "tarde"],
    buenasNoches: ["buenas noches", "buena noche", "noche"],
    hola: ["hola", "holaa", "holaaa", "hi", "hey", "que tal", "qué tal"],
    gracias: ["gracias", "gracia", "gracías", "grax", "thx", "thanks"],
    adios: [
      "adiós",
      "adios",
      "chau",
      "chao",
      "hasta luego",
      "nos vemos",
      "bye",
    ],
  };

  for (const [tipo, variantes] of Object.entries(saludos)) {
    for (const variante of variantes) {
      if (fuzzyMatch(text, variante)) {
        return tipo;
      }
    }
  }
  return null;
}

// Obtener saludo según hora del día
function getSaludoPorHora() {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return "Buenos días";
  if (hora >= 12 && hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

// Respuestas variadas
function getRespuestaVariada(tipo) {
  const respuestas = {
    buenosDias: [
      "¡Buenos días! ☀️ ¿En qué puedo ayudarte hoy?",
      "¡Buenos días! Espero que tengas un excelente día. ¿Cómo puedo asistirte?",
      "Buenos días 🌅 ¿Te gustaría ver nuestro menú de servicios?",
    ],
    buenasTardes: [
      "¡Buenas tardes! 😊 ¿En qué puedo ayudarte?",
      "Buenas tardes 🌤️ ¿Hay algo en lo que pueda asistirte?",
      "¡Buenas tardes! ¿Te interesa conocer nuestros servicios?",
    ],
    buenasNoches: [
      "¡Buenas noches! 🌙 ¿En qué puedo ayudarte?",
      "Buenas noches ⭐ ¿Hay algo que necesites?",
      "¡Buenas noches! ¿Te gustaría ver nuestras opciones?",
    ],
    gracias: [
      "¡De nada! 😊 Estoy aquí para ayudarte cuando lo necesites.",
      "¡Con mucho gusto! 🌿 Si necesitas algo más, no dudes en escribirme.",
      "¡Por supuesto! 💚 Fue un placer ayudarte.",
      "¡De nada! Si tienes más preguntas, estaré aquí. 👋",
    ],
    adios: [
      "¡Hasta luego! 👋 Que tengas un excelente día.",
      "¡Chau! 😊 Espero verte pronto en Essenza Spa.",
      "¡Nos vemos! 💚 Cuídate mucho.",
      "¡Hasta pronto! 🌿 Fue un placer atenderte.",
    ],
  };

  const opciones = respuestas[tipo] || respuestas.gracias;
  return opciones[Math.floor(Math.random() * opciones.length)];
}

// Extraer nombre del mensaje (mejorado con más patrones)
function extractName(text) {
  const patterns = [
    /(?:me llamo|mi nombre es|soy|yo soy)\s+([a-záéíóúñ\s]+)/i,
    /(?:nombre|name)[\s:]+([a-záéíóúñ\s]+)/i,
    /(?:me llaman|me dicen)\s+([a-záéíóúñ\s]+)/i,
    /(?:puedes llamarme|llámame)\s+([a-záéíóúñ\s]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().split(/\s+/)[0]; // Primer nombre
    }
  }
  return null;
}

// ============================================
// DETECCIÓN DE CONSULTAS EN LENGUAJE NATURAL
// ============================================

// Función para detectar consultas sobre servicios específicos
function detectarConsultaServicio(texto) {
  const textoLower = texto.toLowerCase();
  
  // Palabras clave para cada servicio con múltiples variantes
  const keywords = {
    1: {
      palabras: [
        "masaje", "masajes", "relajante", "relajantes", "terapéutico", 
        "terapeutico", "terapia", "masajista", "masajear", "masajeo"
      ],
      precios: ["25", "s/25", "25 soles", "veinticinco", "25.00", "s/.25"],
      sinonimos: [
        "masaje de 25", "masaje 25 soles", "masaje relajante", 
        "masaje terapéutico", "masaje de relajación"
      ]
    },
    2: {
      palabras: [
        "limpieza facial", "facial", "limpieza", "rejuvenecer", "piel", 
        "tratamiento facial", "cuidado facial", "limpieza de piel",
        "facial profunda", "limpieza profunda"
      ],
      precios: ["60", "s/60", "60 soles", "sesenta", "60.00", "s/.60"],
      sinonimos: [
        "limpieza de piel", "tratamiento facial", "cuidado facial",
        "limpieza de 60", "facial de 60"
      ]
    },
    3: {
      palabras: [
        "manicura", "pedicura", "uñas", "unas", "manos", "pies", 
        "esmalte", "esmaltado", "cuidado de uñas", "manicure", "pedicure",
        "manicura y pedicura"
      ],
      precios: ["30", "s/30", "30 soles", "treinta", "30.00", "s/.30"],
      sinonimos: [
        "cuidado de uñas", "manicure", "pedicure", "uñas de manos",
        "uñas de pies", "manicura de 30"
      ]
    },
    4: {
      palabras: [
        "extensiones", "pestañas", "pestaña", "pestañ", "extension", 
        "pestañas postizas", "pestañas sintéticas", "pestañas largas",
        "pestañas voluminosas", "extensiones de pestañas"
      ],
      precios: ["80", "s/80", "80 soles", "ochenta", "80.00", "s/.80"],
      sinonimos: [
        "pestañas largas", "pestañas voluminosas", "extensiones de pestaña",
        "pestañas de 80", "extensiones de 80"
      ]
    },
    5: {
      palabras: [
        "cejas", "ceja", "diseño", "perfilado", "perfilar", 
        "cejas definidas", "microblading", "diseño de cejas",
        "perfilado de cejas", "cejas arregladas"
      ],
      precios: ["30", "s/30", "30 soles", "treinta", "30.00", "s/.30"],
      sinonimos: [
        "diseño de cejas", "perfilado de cejas", "arreglar cejas",
        "cejas de 30", "diseño de ceja"
      ]
    },
    6: {
      palabras: [
        "fisioterapia", "fisio", "terapias", "terapia", "recuperación", 
        "recuperacion", "rehabilitación", "rehabilitacion", "terapia física",
        "fisioterapeuta", "terapia de recuperación"
      ],
      precios: ["60", "s/60", "60 soles", "sesenta", "60.00", "s/.60"],
      sinonimos: [
        "terapia física", "fisioterapeuta", "terapia de recuperación",
        "fisio de 60", "terapia de 60"
      ]
    }
  };
  
  // Palabras que indican consulta/intención
  const palabrasConsulta = [
    "quiero", "deseo", "necesito", "busco", "tengo", "me interesa",
    "información", "info", "precio", "cuesta", "costo", "cuánto", "cuanto",
    "oferta", "promoción", "promocion", "servicio", "servicios",
    "ver", "mostrar", "muestra", "dame", "dime", "cuéntame", "cuentame",
    "detalles", "detalle", "sobre", "acerca", "de", "del", "la", "el",
    "obtener", "conseguir", "solicitar", "pedir", "agendar", "reservar"
  ];
  
  // Buscar coincidencias por servicio
  for (const [numServicio, data] of Object.entries(keywords)) {
    const tieneKeyword = data.palabras.some(palabra => textoLower.includes(palabra));
    const tienePrecio = data.precios.some(precio => textoLower.includes(precio));
    const tieneSinonimo = data.sinonimos.some(sin => textoLower.includes(sin));
    const tieneConsulta = palabrasConsulta.some(pal => textoLower.includes(pal));
    
    // Si tiene keyword Y (precio O palabra de consulta O sinónimo)
    if (tieneKeyword && (tienePrecio || tieneConsulta || tieneSinonimo)) {
      return parseInt(numServicio);
    }
    
    // Si tiene sinónimo y palabra de consulta
    if (tieneSinonimo && tieneConsulta) {
      return parseInt(numServicio);
    }
    
    // Si solo tiene keyword pero es una consulta clara (sin ambigüedad)
    if (tieneKeyword && tieneConsulta && textoLower.length > 10) {
      return parseInt(numServicio);
    }
  }
  
  return null;
}

// Función para detectar intención de reserva en lenguaje natural
function detectarIntencionReserva(texto) {
  const textoLower = texto.toLowerCase();
  
  const palabrasReserva = [
    "reservar", "reserva", "cita", "agendar", "agenda", "programar",
    "quiero reservar", "deseo reservar", "necesito reservar",
    "hacer una cita", "sacar cita", "pedir cita", "solicitar cita",
    "disponibilidad", "horarios disponibles", "cuándo", "cuando",
    "quiero una cita", "necesito cita", "puedo reservar", "puedo agendar",
    "quiero agendar", "deseo agendar", "necesito agendar"
  ];
  
  return palabrasReserva.some(palabra => textoLower.includes(palabra));
}

// Función para detectar consulta sobre promociones
function detectarConsultaPromocion(texto) {
  const textoLower = texto.toLowerCase();
  
  const palabrasPromo = [
    "promoción", "promocion", "promo", "oferta", "descuento",
    "combo", "paquete", "pack", "especial", "rebaja", "rebajas",
    "qué promociones", "que promociones", "hay ofertas", "tienen descuentos",
    "combo relax", "promoción especial", "oferta especial"
  ];
  
  return palabrasPromo.some(palabra => textoLower.includes(palabra));
}

// Función para detectar consulta sobre ubicación
function detectarConsultaUbicacion(texto) {
  const textoLower = texto.toLowerCase();
  
  const palabrasUbicacion = [
    "ubicación", "ubicacion", "dirección", "direccion", "direccion",
    "dónde", "donde", "lugar", "local", "maps", "mapa",
    "google maps", "cómo llegar", "como llegar", "adónde", "adonde",
    "dónde están", "donde estan", "dónde se ubican", "donde se ubican",
    "dirección del local", "direccion del local", "dónde queda", "donde queda"
  ];
  
  return palabrasUbicacion.some(palabra => textoLower.includes(palabra));
}

// Función para detectar consulta sobre pagos
function detectarConsultaPago(texto) {
  const textoLower = texto.toLowerCase();
  
  const palabrasPago = [
    "pago", "pagar", "precio", "precios", "costo", "costos",
    "yape", "transferencia", "banco", "cuenta", "depósito", "deposito",
    "método de pago", "metodo de pago", "formas de pago", "cómo pagar", 
    "como pagar", "dónde pago", "donde pago", "número de yape", 
    "numero de yape", "cuenta bancaria", "transferencia bancaria",
    "cómo puedo pagar", "como puedo pagar", "formas de pago"
  ];
  
  return palabrasPago.some(palabra => textoLower.includes(palabra));
}

// Función para detectar consulta sobre políticas
function detectarConsultaPoliticas(texto) {
  const textoLower = texto.toLowerCase();
  
  const palabrasPoliticas = [
    "política", "politica", "políticas", "politicas", "reglas", "normas",
    "cancelación", "cancelacion", "cancelar", "modificar", "cambio",
    "reembolso", "devolución", "devolucion", "términos", "terminos",
    "puedo cancelar", "cómo cancelar", "como cancelar",
    "política de cancelación", "politica de cancelacion",
    "términos y condiciones", "terminos y condiciones"
  ];
  
  return palabrasPoliticas.some(palabra => textoLower.includes(palabra));
}

// Función mejorada para extraer fecha y hora de múltiples formatos
function extraerFechaHora(texto) {
  const textoLower = texto.toLowerCase();
  let fechaHora = null;
  let fechaMatch = null;
  let horaMatch = null;
  
  // Patrones de fecha: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, DD-MM-YY
  const patronesFecha = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,  // DD/MM/YYYY o DD-MM-YYYY
    /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/,     // DD de MES de YYYY
  ];
  
  // Patrones de hora: HH:MM, HH:MM AM/PM, a las HH
  const patronesHora = [
    /(\d{1,2}):(\d{2})\s*(am|pm)?/i,             // HH:MM o HH:MM AM/PM
    /a\s+las\s+(\d{1,2})\s*(de\s+la\s+)?(mañana|tarde|noche)?/i,  // a las HH
    /(\d{1,2})\s*(am|pm|de\s+la\s+mañana|de\s+la\s+tarde|de\s+la\s+noche)/i,
  ];
  
  // Buscar fecha
  for (const patron of patronesFecha) {
    const match = texto.match(patron);
    if (match) {
      fechaMatch = match;
      break;
    }
  }
  
  // Buscar hora
  for (const patron of patronesHora) {
    const match = texto.match(patron);
    if (match) {
      horaMatch = match;
      break;
    }
  }
  
  // Procesar fecha si se encontró
  if (fechaMatch) {
    try {
      let dia, mes, año;
      
      if (fechaMatch[0].includes('/') || fechaMatch[0].includes('-')) {
        // Formato DD/MM/YYYY o DD-MM-YYYY
        dia = parseInt(fechaMatch[1]);
        mes = parseInt(fechaMatch[2]) - 1; // Mes es 0-indexed
        año = parseInt(
          fechaMatch[3].length === 2 ? "20" + fechaMatch[3] : fechaMatch[3]
        );
      } else {
        // Formato "DD de MES de YYYY"
        dia = parseInt(fechaMatch[1]);
        const meses = {
          "enero": 0, "febrero": 1, "marzo": 2, "abril": 3,
          "mayo": 4, "junio": 5, "julio": 6, "agosto": 7,
          "septiembre": 8, "octubre": 9, "noviembre": 10, "diciembre": 11
        };
        mes = meses[fechaMatch[2].toLowerCase()] || 0;
        año = parseInt(fechaMatch[3]);
      }
      
      // Procesar hora si se encontró
      let hora = 14; // Hora por defecto: 2 PM
      let minuto = 0;
      
      if (horaMatch) {
        if (horaMatch[0].includes(':')) {
          // Formato HH:MM
          hora = parseInt(horaMatch[1]);
          minuto = parseInt(horaMatch[2]);
          
          // Ajustar para AM/PM
          if (horaMatch[3]) {
            const ampm = horaMatch[3].toLowerCase();
            if (ampm === 'pm' && hora < 12) hora += 12;
            if (ampm === 'am' && hora === 12) hora = 0;
          }
        } else {
          // Formato "a las HH" o "HH AM/PM"
          hora = parseInt(horaMatch[1] || horaMatch[0].match(/\d+/)?.[0] || 14);
          
          // Ajustar según mañana/tarde/noche
          if (horaMatch[0].includes('mañana')) {
            if (hora === 12) hora = 0;
          } else if (horaMatch[0].includes('tarde')) {
            if (hora < 12) hora += 12;
          } else if (horaMatch[0].includes('noche')) {
            if (hora < 8) hora += 12;
          }
        }
      }
      
      fechaHora = new Date(año, mes, dia, hora, minuto);
      
      // Validar que la fecha sea válida y futura
      if (isNaN(fechaHora.getTime()) || fechaHora <= new Date()) {
        fechaHora = null;
      }
    } catch (error) {
      logMessage("WARNING", `Error al parsear fecha/hora`, {
        error: error.message,
        texto: texto.substring(0, 50)
      });
      fechaHora = null;
    }
  }
  
  return fechaHora;
}

// Guardar reserva para recordatorio
function guardarReserva(userId, userName, servicio, fechaHora) {
  const reserva = {
    userId,
    userName,
    servicio,
    fechaHora: new Date(fechaHora),
    notificado: false,
    creada: new Date(),
  };
  reservas.push(reserva);
  logMessage("INFO", `Reserva guardada para recordatorio`, { reserva });
}

// Verificar y enviar recordatorios
async function verificarRecordatorios(client) {
  const ahora = new Date();
  const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);

  for (const reserva of reservas) {
    if (
      !reserva.notificado &&
      reserva.fechaHora <= en24Horas &&
      reserva.fechaHora > ahora
    ) {
      try {
        const horasRestantes = Math.round(
          (reserva.fechaHora - ahora) / (1000 * 60 * 60)
        );
        await enviarMensajeSeguro(
          client,
          reserva.userId,
          `🔔 *Recordatorio de Cita*\n\n` +
            `Hola ${reserva.userName}! 👋\n\n` +
            `Te recordamos que tienes una cita programada:\n` +
            `📅 *Servicio:* ${reserva.servicio}\n` +
            `⏰ *Fecha/Hora:* ${reserva.fechaHora.toLocaleString("es-PE")}\n` +
            `⏳ *En aproximadamente ${horasRestantes} hora(s)*\n\n` +
            `¡Te esperamos en Essenza Spa! 🌿`
        );
        reserva.notificado = true;
        logMessage("SUCCESS", `Recordatorio enviado a ${reserva.userName}`);
      } catch (error) {
        logMessage("ERROR", `Error al enviar recordatorio`, {
          error: error.message,
        });
      }
    }
  }

  // Limpiar reservas antiguas (más de 7 días)
  const hace7Dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const reservasLimpias = reservas.filter((r) => r.fechaHora > hace7Dias);
  reservas.length = 0;
  reservas.push(...reservasLimpias);
}

// Obtener estadísticas
function obtenerEstadisticas() {
  const diasActivo = Math.floor(
    (new Date() - estadisticas.inicio) / (1000 * 60 * 60 * 24)
  );
  return `
📊 *ESTADÍSTICAS DEL BOT*

👥 *Usuarios únicos atendidos:* ${estadisticas.usuariosAtendidos.size}
💬 *Total de mensajes procesados:* ${estadisticas.totalMensajes}
📅 *Reservas solicitadas:* ${estadisticas.reservasSolicitadas}
🧑‍💼 *Modos asesor activados:* ${estadisticas.asesoresActivados}
⏰ *Días activo:* ${diasActivo}
📈 *Promedio mensajes/día:* ${
    diasActivo > 0 ? Math.round(estadisticas.totalMensajes / diasActivo) : 0
  }
  `.trim();
}

// ============================================
// SISTEMA DE LOGS
// ============================================
// ============================================
// FUNCIÓN HELPER PARA ENVIAR MENSAJES DE FORMA SEGURA
// ============================================
// Función auxiliar para extraer el número sin el sufijo (@c.us o @lid)
function extraerNumero(userId) {
  if (!userId || typeof userId !== "string") return userId;
  return userId.replace(/@(c\.us|lid)$/, "");
}

async function enviarMensajeSeguro(client, userId, mensaje) {
  try {
    // Validar que userId existe y tiene formato correcto
    if (!userId || typeof userId !== "string") {
      logMessage("ERROR", "Intento de enviar mensaje con userId inválido", {
        userId: userId,
        mensaje: mensaje.substring(0, 50),
      });
      return false;
    }

    // Asegurar que el userId tiene el formato correcto (@c.us o @lid)
    let numeroFormateado = userId.trim();

    // Si ya tiene @c.us o @lid, mantenerlo
    if (numeroFormateado.endsWith("@c.us") || numeroFormateado.endsWith("@lid")) {
      // Ya está en formato correcto, no hacer nada
    } else {
      // Si no termina con @c.us o @lid, agregar @c.us
      // Remover cualquier @g.us u otro sufijo
      numeroFormateado = numeroFormateado.replace(/@.*$/, "");
      // Agregar @c.us por defecto
      numeroFormateado = numeroFormateado + "@c.us";
    }

    // Validar que el número tiene formato válido (@c.us o @lid)
    const esFormatoValido = 
      (numeroFormateado.includes("@c.us") || numeroFormateado.includes("@lid")) &&
      numeroFormateado.length >= 13;
    
    if (!esFormatoValido) {
      logMessage("ERROR", "Número de WhatsApp inválido para enviar mensaje", {
        original: userId,
        formateado: numeroFormateado,
      });
      return false;
    }

    // Validar que NO es un estado (los estados no tienen formato @c.us válido)
    if (
      numeroFormateado.includes("status") ||
      numeroFormateado.includes("broadcast")
    ) {
      logMessage("ERROR", "Intento de enviar mensaje a estado o broadcast", {
        numeroFormateado: numeroFormateado,
      });
      return false;
    }

    // Enviar el mensaje usando el número formateado correctamente
    await client.sendText(numeroFormateado, mensaje);

    logMessage("SUCCESS", `Mensaje enviado correctamente`, {
      destino: extraerNumero(numeroFormateado),
      longitud: mensaje.length,
    });

    return true;
  } catch (error) {
    logMessage("ERROR", "Error al enviar mensaje", {
      userId: userId,
      error: error.message,
      stack: error.stack?.substring(0, 200),
    });
    return false;
  }
}

function logMessage(type, message, data = null) {
  const timestamp = new Date().toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "medium",
  });
  const logDir = path.join(__dirname, "logs");

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(
    logDir,
    `bot-${new Date().toISOString().split("T")[0]}.log`
  );
  const logEntry = `[${timestamp}] [${type}] ${message}${
    data ? ` | ${JSON.stringify(data)}` : ""
  }\n`;

  fs.appendFileSync(logFile, logEntry, "utf8");

  const colors = {
    INFO: "\x1b[36m",
    SUCCESS: "\x1b[32m",
    WARNING: "\x1b[33m",
    ERROR: "\x1b[31m",
    RESET: "\x1b[0m",
  };

  const color = colors[type] || colors.INFO;
  console.log(`${color}[${timestamp}] [${type}]${colors.RESET} ${message}`);
  if (data) {
    console.log(`  └─ Datos:`, data);
  }
}

// ============================================
// INICIALIZACIÓN DEL BOT
// ============================================
let clientInstance = null;

wppconnect
  .create({
    session: "essenza-bot",
    catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
      console.clear();
      console.log("\n" + "=".repeat(60));
      console.log("📱 ESCANEA ESTE QR CON WHATSAPP:");
      console.log("=".repeat(60) + "\n");

      // Variables para guardar base64 y URL
      let qrBase64 = null;
      let qrUrl = null;

      try {
        // Priorizar asciiQR si está disponible (mejor para terminales)
        if (asciiQR && typeof asciiQR === "string" && asciiQR.length > 0) {
          console.log(asciiQR);
          // Intentar obtener base64 si está disponible
          if (
            base64Qr &&
            typeof base64Qr === "string" &&
            base64Qr.length > 50
          ) {
            if (!base64Qr.includes("http") && !base64Qr.includes("://")) {
              qrBase64 = base64Qr;
            }
          }
        }
        // Si tenemos urlCode, intentar generar QR desde la URL
        else if (urlCode && typeof urlCode === "string") {
          qrUrl = urlCode;
          console.log(
            "🔗 URL del QR (copia y pega en tu navegador si el QR no se escanea):"
          );
          console.log(urlCode);
          console.log("\n📱 QR Code:\n");
          qrcode.generate(urlCode, {
            small: false,
            type: "terminal",
            errorCorrectionLevel: "M",
          });
        }
        // Si tenemos base64Qr válido
        else if (
          base64Qr &&
          typeof base64Qr === "string" &&
          base64Qr.length < 1000 &&
          !base64Qr.includes("{") &&
          !base64Qr.includes("http")
        ) {
          qrBase64 = base64Qr;
          console.log("📱 QR Code:\n");
          qrcode.generate(base64Qr, {
            small: false,
            type: "terminal",
            errorCorrectionLevel: "M",
          });
        }
        // Si tenemos una URL en base64Qr
        else if (
          base64Qr &&
          typeof base64Qr === "string" &&
          (base64Qr.includes("http") || base64Qr.length > 100)
        ) {
          // Intentar extraer URL si está en el string
          const urlMatch = base64Qr.match(/https?:\/\/[^\s]+/);
          if (urlMatch) {
            qrUrl = urlMatch[0];
            console.log(
              "🔗 URL del QR (copia y pega en tu navegador si el QR no se escanea):"
            );
            console.log(urlMatch[0]);
            console.log("\n📱 QR Code:\n");
            qrcode.generate(urlMatch[0], {
              small: false,
              type: "terminal",
              errorCorrectionLevel: "M",
            });
          } else {
            // Si no hay URL pero hay base64, guardarlo
            if (base64Qr && base64Qr.length > 50) {
              qrBase64 = base64Qr;
            }
            console.log("⚠️ El QR se está generando...");
            console.log(
              "💡 Por favor, espera unos segundos o revisa la sesión en la carpeta tokens/"
            );
          }
        } else {
          // Intentar guardar base64 si está disponible
          if (
            base64Qr &&
            typeof base64Qr === "string" &&
            base64Qr.length > 50
          ) {
            if (!base64Qr.includes("http") && !base64Qr.includes("://")) {
              qrBase64 = base64Qr;
            }
          }
          console.log("⚠️ El QR se está generando...");
          console.log(
            "💡 Por favor, espera unos segundos o revisa la sesión en la carpeta tokens/"
          );
          logMessage(
            "WARNING",
            "QR recibido en formato no estándar - usando sesión guardada"
          );
        }
      } catch (error) {
        console.log("⚠️ Error al mostrar QR visual.");
        console.log(
          "💡 El bot seguirá funcionando. Revisa la sesión guardada."
        );
        logMessage("ERROR", "Error al generar QR visual", {
          error: error.message.substring(0, 100),
        });
      }

      // Las variables qrBase64 y qrUrl ya están definidas arriba

      console.log("\n" + "=".repeat(60));
      console.log("📋 ALTERNATIVAS SI EL QR NO SE ESCANEA:");
      console.log("=".repeat(60));

      if (qrUrl) {
        console.log("\n🔗 Opción 1 - URL directa:");
        console.log(qrUrl);
        console.log("   (Copia y pega esta URL en tu navegador)");
      }

      if (qrBase64) {
        console.log("\n🖼️ Opción 2 - QR en Base64:");
        console.log(
          "   (Copia este código y pégalo en https://base64.guru/converter/decode/image)"
        );
        console.log("   O usa este comando en tu terminal:");
        console.log(`   echo "${qrBase64}" | base64 -d > qr.png`);
        console.log("\n📄 Base64 completo:");
        // Mostrar el base64 en líneas más cortas para que sea más fácil copiar
        const base64Lines = qrBase64.match(/.{1,80}/g) || [];
        base64Lines.forEach((line) => {
          console.log(line);
        });
      } else if (qrUrl) {
        console.log(
          "\n💡 Puedes generar un QR desde la URL usando cualquier generador online"
        );
        console.log("   Ejemplo: https://www.qr-code-generator.com/");
      }

      console.log("\n" + "=".repeat(60) + "\n");
      logMessage(
        "INFO",
        `QR Code procesado - Intento ${attempts || 1} - Esperando escaneo`
      );
    },
    statusFind: (statusSession, session) => {
      logMessage("INFO", `Estado de sesión: ${statusSession}`, { session });
    },
    headless: true,
    browserArgs: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--disable-software-rasterizer",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-extensions",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-ipc-flooding-protection",
    ],
    // Usar Chromium del sistema si está disponible
    executablePath:
      process.env.CHROMIUM_PATH || process.env.CHROME_BIN || undefined,
  })
  .then((client) => {
    clientInstance = client;
    logMessage("SUCCESS", "Cliente de WhatsApp creado exitosamente");
    start(client);
  })
  .catch((error) => {
    logMessage("ERROR", "Error al crear cliente", { error: error.message });
    console.error(error);
    // Intentar reconectar después de 10 segundos
    setTimeout(() => {
      logMessage("INFO", "Intentando reconectar...");
      process.exit(1); // El proceso se reiniciará si está en un gestor de procesos
    }, 10000);
  });

// ============================================
// FUNCIÓN PRINCIPAL DEL BOT
// ============================================
function start(client) {
  logMessage("SUCCESS", "✅ Bot conectado y listo para recibir mensajes");
  console.log("\n" + "=".repeat(50));
  console.log("🌿 ESSENZA SPA BOT - ACTIVO");
  console.log("=".repeat(50) + "\n");

  // Sistema de recordatorios (cada hora)
  setInterval(() => {
    verificarRecordatorios(client);
  }, 60 * 60 * 1000);

  // Verificar recordatorios al iniciar
  setTimeout(() => verificarRecordatorios(client), 5000);

  // Manejo de desconexión y reconexión
  client.onStateChange((state) => {
    logMessage("INFO", `Estado del cliente cambiado: ${state}`);
    if (state === "CLOSE" || state === "DISCONNECTED") {
      logMessage("WARNING", "Bot desconectado. Intentando reconectar...");
      setTimeout(() => {
        wppconnect
          .create({
            session: "essenza-bot",
            catchQR: () => {},
            headless: true,
            browserArgs: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-accelerated-2d-canvas",
              "--disable-gpu",
              "--disable-software-rasterizer",
              "--no-first-run",
              "--no-zygote",
              "--single-process",
              "--disable-extensions",
              "--disable-background-timer-throttling",
              "--disable-backgrounding-occluded-windows",
              "--disable-renderer-backgrounding",
              "--disable-features=TranslateUI",
              "--disable-ipc-flooding-protection",
            ],
            // Usar Chromium del sistema si está disponible
            executablePath:
              process.env.CHROMIUM_PATH || process.env.CHROME_BIN || undefined,
          })
          .then((newClient) => {
            clientInstance = newClient;
            start(newClient);
          });
      }, 5000);
    }
  });

  // Evento cuando se recibe un mensaje
  client.onMessage(async (message) => {
    try {
      // ============================================
      // FILTROS ESTRICTOS PARA IGNORAR ESTADOS Y MENSAJES NO DESEADOS
      // ============================================

      // 1. Ignorar mensajes propios
      if (message.fromMe === true) return;

      // 2. Ignorar si no tiene cuerpo de mensaje (texto, imagen, etc.)
      if (!message.body && !message.caption) return;

      // 3. Filtrar estados de WhatsApp - Múltiples verificaciones
      if (
        message.isStatus === true ||
        message.type === "status" ||
        message.isStatusMsg === true ||
        (message.chatId && message.chatId.includes("status")) ||
        (message.from && message.from.includes("status"))
      ) {
        logMessage("INFO", "Mensaje de estado ignorado", {
          type: message.type,
          from: message.from,
          chatId: message.chatId,
        });
        return;
      }

      // 4. Filtrar mensajes de grupos
      if (message.isGroupMsg === true || message.isGroup === true) {
        return;
      }

      // 5. Filtrar mensajes de broadcast
      if (message.isBroadcast === true) {
        return;
      }

      // 6. Filtrar actualizaciones de perfil y otros tipos de sistema
      if (
        message.type === "protocol" ||
        message.type === "notification" ||
        message.type === "e2e_notification" ||
        message.type === "revoked" ||
        message.type === "sticker" ||
        message.type === "location" ||
        message.type === "vcard" ||
        message.type === "multi_vcard"
      ) {
        return;
      }

      // 7. Validar que el remitente sea un número válido (no estados)
      if (!message.from || typeof message.from !== "string") {
        return;
      }

      // 8. Validación CRÍTICA: Solo procesar chats individuales (@c.us o @lid)
      // Los estados NO tienen formato @c.us o @lid, así que esto los filtra automáticamente
      // @lid = linked device (dispositivo vinculado, también es un chat individual válido)
      const esChatIndividual = 
        message.from && 
        (message.from.endsWith("@c.us") || message.from.endsWith("@lid"));
      
      if (!esChatIndividual) {
        logMessage("INFO", "Mensaje ignorado - no es chat individual válido", {
          from: message.from,
          type: message.type,
          isStatus: message.isStatus,
        });
        return; // Solo chats individuales (@c.us o @lid), NO grupos (@g.us) ni estados
      }

      // 9. Solo procesar mensajes de texto, imagen, video, audio, documento
      const tiposPermitidos = [
        "chat",
        "image",
        "video",
        "audio",
        "document",
        "ptt",
      ];
      if (message.type && !tiposPermitidos.includes(message.type)) {
        logMessage("INFO", "Mensaje ignorado - tipo no permitido", {
          type: message.type,
          from: message.from,
        });
        return;
      }

      // 10. Validación final del userId
      const userId = message.from;
      // Aceptar tanto @c.us como @lid (dispositivo vinculado)
      const esUserIdValido = 
        userId && 
        userId.length >= 10 && 
        (userId.includes("@c.us") || userId.includes("@lid"));
      
      if (!esUserIdValido) {
        logMessage("WARNING", "Mensaje ignorado - userId inválido", {
          userId: userId,
          type: message.type,
        });
        return;
      }
      let userName =
        message.notifyName ||
        message.pushname ||
        userNames[userId] ||
        "Usuario";
      const text = message.body.trim();
      const textLower = text.toLowerCase();

      // Actualizar estadísticas
      estadisticas.totalMensajes++;
      estadisticas.usuariosAtendidos.add(userId);

      // Intentar extraer y guardar nombre
      const nombreExtraido = extractName(text);
      if (nombreExtraido && !userNames[userId]) {
        userNames[userId] = nombreExtraido;
        userName = nombreExtraido;
        logMessage("INFO", `Nombre guardado para usuario: ${userName}`);
      }

      // Usar nombre guardado si existe
      if (userNames[userId]) {
        userName = userNames[userId];
      }

      logMessage("INFO", `Mensaje recibido de ${userName}`, {
        userId: extraerNumero(userId),
        mensaje: text.substring(0, 50),
      });

      // ============================================
      // COMANDO ADMINISTRADOR: ESTADÍSTICAS
      // ============================================
      if (
        userId === ADMIN_NUMBER &&
        (textLower === "estadisticas" ||
          textLower === "stats" ||
          textLower === "estadísticas")
      ) {
        try {
          await enviarMensajeSeguro(
            client,
            ADMIN_NUMBER,
            obtenerEstadisticas()
          );
          logMessage("INFO", "Estadísticas enviadas al administrador");
        } catch (error) {
          logMessage("ERROR", "Error al enviar estadísticas", {
            error: error.message,
          });
        }
        return;
      }

      // ============================================
      // RECORDATORIO PARA ADMIN EN MODO ASESOR
      // ============================================
      // Cuando el admin envía un mensaje y hay usuarios en modo asesor,
      // recordarle cómo salir del modo asesor
      if (userId === ADMIN_NUMBER && humanModeUsers.size > 0) {
        // Solo enviar recordatorio si no es un comando conocido
        const esComando =
          textLower === "estadisticas" ||
          textLower === "stats" ||
          textLower === "estadísticas";

        if (!esComando) {
          try {
            const usuariosEnAsesor = Array.from(humanModeUsers);
            const listaUsuarios = usuariosEnAsesor
              .map((uid, idx) => {
                const nombre = userNames[uid] || "Usuario";
                return `${idx + 1}. ${nombre} (${extraerNumero(uid)})`;
              })
              .join("\n");

            await enviarMensajeSeguro(
              client,
              ADMIN_NUMBER,
              `⚠️ *Recordatorio*\n\n` +
                `Hay ${usuariosEnAsesor.length} usuario(s) en modo asesor.\n\n` +
                `No olvide que para salir del modo asesor, los usuarios deben escribir *Bot*.\n\n` +
                `*Usuarios en modo asesor:*\n${listaUsuarios}`
            );
            logMessage(
              "INFO",
              "Recordatorio enviado al administrador sobre modo asesor"
            );
          } catch (error) {
            logMessage("ERROR", "Error al enviar recordatorio al admin", {
              error: error.message,
            });
          }
        }
      }

      // ============================================
      // DETECCIÓN DE SALUDOS
      // ============================================
      const saludo = detectSaludo(textLower);
      if (saludo) {
        // Si es "hola", también establecer estado de menú para facilitar navegación
        if (saludo === "hola") {
          if (!userState[userId]) {
            userState[userId] = "menu";
          }
        }

        const saludoHora = getSaludoPorHora();
        let respuesta = "";

        if (saludo === "hola") {
          respuesta = `${saludoHora}! 👋\n\n¡Hola ${userName}! Bienvenido a *Essenza Spa*.\n\n¿Te gustaría ver nuestro menú de servicios? Escribe *Menu*`;
        } else if (saludo === "gracias") {
          respuesta = getRespuestaVariada("gracias");
        } else if (saludo === "adios") {
          respuesta = getRespuestaVariada("adios");
        } else {
          respuesta = `${getSaludoPorHora()}! ${getRespuestaVariada(saludo)}`;
        }

        try {
          await enviarMensajeSeguro(client, userId, respuesta);
          logMessage("SUCCESS", `Saludo respondido a ${userName}`, {
            tipo: saludo,
          });
        } catch (error) {
          logMessage("ERROR", "Error al responder saludo", {
            error: error.message,
          });
        }
        return;
      }

      // ============================================
      // COMANDOS DE SALIDA DEL MODO ASESOR
      // Estos comandos permiten salir del modo asesor
      // ============================================
      if (
        fuzzyMatch(textLower, "menu") ||
        textLower === "menu" ||
        textLower === "menú" ||
        fuzzyMatch(textLower, "cancelar") ||
        fuzzyMatch(textLower, "volver") ||
        fuzzyMatch(textLower, "bot") ||
        textLower === "bot"
      ) {
        // Si está en modo asesor, salir automáticamente
        if (humanModeUsers.has(userId)) {
          humanModeUsers.delete(userId);
          // Si escribió "bot", confirmar que salió del modo asesor
          if (fuzzyMatch(textLower, "bot") || textLower === "bot") {
            try {
              await enviarMensajeSeguro(
                client,
                userId,
                "✅ *Modo Asesor Desactivado*\n\n" +
                  "Has vuelto al bot automático.\n\n" +
                  "Escribe *Menu* para ver las opciones disponibles."
              );
              logMessage(
                "SUCCESS",
                `Usuario ${userName} salió del modo asesor escribiendo "Bot"`
              );
            } catch (error) {
              logMessage("ERROR", `Error al confirmar salida del modo asesor`, {
                error: error.message,
              });
            }
            return;
          }
          logMessage(
            "INFO",
            `Usuario ${userName} salió del modo asesor escribiendo "${textLower}"`
          );
        }
      }

      // ============================================
      // COMANDO: ASESOR
      // ============================================
      if (fuzzyMatch(textLower, "asesor")) {
        humanModeUsers.add(userId);
        estadisticas.asesoresActivados++;
        logMessage("INFO", `Usuario ${userName} activó modo asesor`);

        try {
          await enviarMensajeSeguro(
            client,
            ADMIN_NUMBER,
            `🔔 *Nueva solicitud de asesor*\n\nUsuario: ${userName}\nNúmero: ${extraerNumero(userId)}\n\nEl bot dejará de responder a este usuario.`
          );
          await enviarMensajeSeguro(
            client,
            userId,
            "🧑‍💼 *Modo Asesor Activado*\n\nTe contactará un asesor humano. El bot dejará de responder automáticamente.\n\nPara volver al bot, escribe *Bot*."
          );
          logMessage(
            "SUCCESS",
            `Notificación enviada al administrador para ${userName}`
          );
        } catch (error) {
          logMessage("ERROR", `Error al enviar notificación de asesor`, {
            error: error.message,
          });
        }
        return;
      }

      if (humanModeUsers.has(userId)) {
        logMessage(
          "INFO",
          `Usuario ${userName} está en modo asesor - Bot no responde`
        );
        return;
      }

      // ============================================
      // COMANDO: MENU
      // ============================================
      // Nota: "hola" se maneja en la sección de saludos, pero también puede activar el menú
      if (
        fuzzyMatch(textLower, "menu") ||
        textLower === "menu" ||
        textLower === "menú"
      ) {
        // Establecer estado de menú (sobrescribe cualquier estado anterior excepto reserva)
        if (userState[userId] !== "reserva") {
          userState[userId] = "menu";
        }
        logMessage("INFO", `Usuario ${userName} solicitó el menú principal`);

        try {
          await enviarMensajeSeguro(
            client,
            userId,
            "🌿 *ESSENZA SPA*\n\n" +
              "1️⃣ Servicios\n" +
              "2️⃣ Promociones\n" +
              "3️⃣ Reservar\n" +
              "4️⃣ Ubicación\n" +
              "5️⃣ Pagos\n" +
              "6️⃣ Políticas\n" +
              "7️⃣ Asesor\n\n" +
              "Escribe el *número* de la opción que deseas:"
          );
          logMessage("SUCCESS", `Menú principal enviado a ${userName}`);
        } catch (error) {
          logMessage("ERROR", `Error al enviar menú principal`, {
            error: error.message,
          });
        }
        return;
      }

      // Mensaje de bienvenida para nuevos usuarios (solo si no tiene estado y no se ha enviado bienvenida)
      // Esto evita enviar bienvenida a usuarios que ya interactuaron
      if (!userState[userId] && !userData[userId]?.bienvenidaEnviada) {
        // ANTES de enviar bienvenida, verificar si hay una consulta directa
        // Si el usuario pregunta algo específico, responder directamente sin bienvenida genérica
        
        const servicioDetectado = detectarConsultaServicio(textLower);
        const intencionReserva = detectarIntencionReserva(textLower);
        const consultaPromo = detectarConsultaPromocion(textLower);
        const consultaUbicacion = detectarConsultaUbicacion(textLower);
        const consultaPago = detectarConsultaPago(textLower);
        const consultaPoliticas = detectarConsultaPoliticas(textLower);
        
        // Si hay una consulta específica, procesarla directamente
        if (servicioDetectado || intencionReserva || consultaPromo || 
            consultaUbicacion || consultaPago || consultaPoliticas) {
          // Establecer estado para que se procese la consulta
          userState[userId] = "menu";
          if (!userData[userId]) userData[userId] = {};
          userData[userId].bienvenidaEnviada = true;
          // No hacer return, dejar que el flujo continúe para procesar la consulta
        } else {
          // Si no hay consulta específica, enviar bienvenida normal
          userState[userId] = "menu";
          if (!userData[userId]) userData[userId] = {};
          userData[userId].bienvenidaEnviada = true;
          logMessage("INFO", `Nuevo usuario detectado: ${userName}`);

          try {
            const saludoHora = getSaludoPorHora();
            await enviarMensajeSeguro(
              client,
              userId,
              `${saludoHora}! 👋\n\n¡Hola ${userName}! Bienvenido a *Essenza Spa*.\n\n` +
                `Somos especialistas en bienestar y belleza. 💆‍♀️✨\n\n` +
                `Escribe *Menu* para ver nuestras opciones y servicios disponibles.`
            );
            logMessage("SUCCESS", `Mensaje de bienvenida enviado a ${userName}`);
          } catch (error) {
            logMessage("ERROR", `Error al enviar mensaje de bienvenida`, {
              error: error.message,
            });
          }
          return;
        }
      }

      // ============================================
      // PROCESAR SELECCIÓN DE SERVICIOS (cuando está viendo la lista)
      // ============================================
      if (userState[userId] === "servicios") {
        const numServicio = parseInt(textLower);
        if (!isNaN(numServicio) && numServicio >= 1 && numServicio <= 6) {
          const serv = servicios[numServicio];
          logMessage(
            "INFO",
            `Usuario ${userName} solicitó detalles del servicio ${numServicio}`
          );

          let detalle = `💆‍♀️ *${serv.nombre}*\n\n`;
          detalle += `📝 *Descripción:*\n${serv.descripcion}\n\n`;
          detalle += `⏱️ *Duración:* ${serv.duracion}\n`;
          detalle += `💰 *Precio:* ${serv.precio}\n\n`;
          detalle += `✨ *Beneficios:*\n`;
          serv.beneficios.forEach((ben) => {
            detalle += `• ${ben}\n`;
          });
          detalle += `\n¿Te interesa este servicio? Escribe *3* para reservar o *Menu* para volver al menú principal`;

          await enviarMensajeSeguro(client, userId, detalle);

          // Si hay imagen configurada, intentar enviarla
          if (serv.imagen && fs.existsSync(serv.imagen)) {
            try {
              await client.sendImage(
                userId,
                serv.imagen,
                `imagen-${numServicio}.jpg`,
                `Imagen de ${serv.nombre}`
              );
            } catch (error) {
              logMessage(
                "WARNING",
                `No se pudo enviar imagen del servicio ${numServicio}`,
                { error: error.message }
              );
            }
          }

          // Volver al estado menu después de mostrar detalles
          userState[userId] = "menu";
          logMessage(
            "SUCCESS",
            `Detalles del servicio ${numServicio} enviados a ${userName}`
          );
          return;
        }

        // Si es "menu", volver al menú principal
        if (
          fuzzyMatch(textLower, "menu") ||
          textLower === "menu" ||
          textLower === "menú"
        ) {
          userState[userId] = "menu";
          try {
            await enviarMensajeSeguro(
              client,
              userId,
              "🌿 *ESSENZA SPA*\n\n" +
                "1️⃣ Servicios\n" +
                "2️⃣ Promociones\n" +
                "3️⃣ Reservar\n" +
                "4️⃣ Ubicación\n" +
                "5️⃣ Pagos\n" +
                "6️⃣ Políticas\n\n" +
                "Escribe el *número* de la opción que deseas:"
            );
            logMessage("SUCCESS", `Menú principal enviado a ${userName}`);
          } catch (error) {
            logMessage("ERROR", `Error al enviar menú principal`, {
              error: error.message,
            });
          }
          return;
        }

        // Si no es un número válido, mostrar error
        logMessage(
          "WARNING",
          `Usuario ${userName} envió opción inválida en lista de servicios`,
          { opcion: textLower }
        );
        await enviarMensajeSeguro(
          client,
          userId,
          "❌ Opción inválida.\n\nEscribe el *número* (1-6) del servicio que deseas ver, o *Menu* para volver al menú principal."
        );
        return;
      }

      // ============================================
      // PROCESAR OPCIONES DEL MENÚ
      // ============================================
      if (userState[userId] === "menu") {
        try {
          // PRIMERO: Detectar consultas en lenguaje natural ANTES del switch
          // Esto permite que el bot entienda consultas como "quiero masaje de 25 soles"
          
          // 1. Detectar consulta sobre servicio específico
          const servicioDetectado = detectarConsultaServicio(textLower);
          if (servicioDetectado) {
            const serv = servicios[servicioDetectado];
            logMessage(
              "INFO",
              `Usuario ${userName} consultó sobre servicio ${servicioDetectado} usando lenguaje natural`,
              { consulta: textLower }
            );

            let detalle = `💆‍♀️ *${serv.nombre}*\n\n`;
            detalle += `📝 *Descripción:*\n${serv.descripcion}\n\n`;
            detalle += `⏱️ *Duración:* ${serv.duracion}\n`;
            detalle += `💰 *Precio:* ${serv.precio}\n\n`;
            detalle += `✨ *Beneficios:*\n`;
            serv.beneficios.forEach((ben) => {
              detalle += `• ${ben}\n`;
            });
            detalle += `\n¿Te interesa este servicio? Escribe *3* para reservar o *Menu* para volver al menú principal`;

            await enviarMensajeSeguro(client, userId, detalle);

            // Si hay imagen configurada, intentar enviarla
            if (serv.imagen && fs.existsSync(serv.imagen)) {
              try {
                await client.sendImage(
                  userId,
                  serv.imagen,
                  `imagen-${servicioDetectado}.jpg`,
                  `Imagen de ${serv.nombre}`
                );
              } catch (error) {
                logMessage(
                  "WARNING",
                  `No se pudo enviar imagen del servicio ${servicioDetectado}`,
                  { error: error.message }
                );
              }
            }
            return;
          }
          
          // 2. Detectar intención de reserva
          if (detectarIntencionReserva(textLower)) {
            // Activar flujo de reserva
            userState[userId] = "reserva";
            humanModeUsers.add(userId);
            estadisticas.reservasSolicitadas++;
            logMessage(
              "INFO",
              `Usuario ${userName} solicitó reserva usando lenguaje natural`
            );

            try {
              await enviarMensajeSeguro(
                client,
                ADMIN_NUMBER,
                `🔔 *NUEVA SOLICITUD DE RESERVA*\n\n` +
                  `Usuario: ${userName}\n` +
                  `Número: ${extraerNumero(userId)}\n\n` +
                  `Por favor contacta al cliente para confirmar los detalles.`
              );
              await enviarMensajeSeguro(
                client,
                userId,
                "📅 *SOLICITUD DE RESERVA*\n\n" +
                  "Un asesor se pondrá en contacto contigo pronto.\n\n" +
                  "Por favor, envía la siguiente información:\n" +
                  "• Tu nombre completo\n" +
                  "• Servicio deseado\n" +
                  "• Fecha y hora preferida\n\n" +
                  "El bot dejará de responder automáticamente."
              );
              logMessage(
                "SUCCESS",
                `Solicitud de reserva procesada para ${userName}`
              );
            } catch (error) {
              logMessage("ERROR", `Error al procesar reserva`, {
                error: error.message,
              });
            }
            return;
          }
          
          // 3. Detectar consulta sobre promociones
          if (detectarConsultaPromocion(textLower)) {
            logMessage(
              "INFO",
              `Usuario ${userName} consultó sobre promociones usando lenguaje natural`
            );
            await enviarMensajeSeguro(
              client,
              userId,
              "🌟 *PROMOCIÓN ESPECIAL*\n\n" +
                "💆 *Combo Relax*\n" +
                "Masaje Relajante + Limpieza Facial\n\n" +
                "💰 *Precio:* S/120 (Ahorra S/60)\n" +
                "⏱️ *Duración:* 90 minutos\n\n" +
                "✨ *Beneficios:*\n" +
                "• Relajación completa\n" +
                "• Piel renovada y luminosa\n" +
                "• Alivio de tensiones\n\n" +
                "¡Aprovecha esta oferta limitada!\n\n" +
                "Escribe *Menu* para volver"
            );
            logMessage("SUCCESS", `Promoción enviada a ${userName}`);
            return;
          }
          
          // 4. Detectar consulta sobre ubicación
          if (detectarConsultaUbicacion(textLower)) {
            logMessage("INFO", `Usuario ${userName} consultó sobre ubicación usando lenguaje natural`);
            await enviarMensajeSeguro(
              client,
              userId,
              `📍 *NUESTRA UBICACIÓN*\n\n` +
                `🏢 ${UBICACION}\n\n` +
                `🕐 *Horario de atención:*\n${HORARIO_ATENCION}\n\n` +
                `🗺️ [Ver en Google Maps](${MAPS_LINK})\n\n` +
                "Escribe *Menu* para volver"
            );
            logMessage("SUCCESS", `Ubicación enviada a ${userName}`);
            return;
          }
          
          // 5. Detectar consulta sobre pagos
          if (detectarConsultaPago(textLower)) {
            logMessage(
              "INFO",
              `Usuario ${userName} consultó sobre pagos usando lenguaje natural`
            );
            await enviarMensajeSeguro(
              client,
              userId,
              "💳 *INFORMACIÓN DE PAGO*\n\n" +
                "📱 *Yape:*\n" +
                `Número: *${YAPE_NUMERO}*\n` +
                `Titular: *${YAPE_TITULAR}*\n\n` +
                "🏦 *Transferencia Bancaria:*\n" +
                `Cuenta: *${BANCO_CUENTA}*\n` +
                `Titular: *${YAPE_TITULAR}*\n\n` +
                "Escribe *Menu* para volver"
            );
            logMessage(
              "SUCCESS",
              `Información de pago enviada a ${userName}`
            );
            return;
          }
          
          // 6. Detectar consulta sobre políticas
          if (detectarConsultaPoliticas(textLower)) {
            logMessage("INFO", `Usuario ${userName} consultó sobre políticas usando lenguaje natural`);
            await enviarMensajeSeguro(
              client,
              userId,
              "📜 *POLÍTICAS DE RESERVA*\n\n" +
                "⏰ *Cancelación/Modificación:*\n" +
                "Debe realizarse con mínimo 24 horas de anticipación.\n\n" +
                "❌ *Cancelaciones tardías:*\n" +
                "Pueden estar sujetas a cargos adicionales.\n\n" +
                "✅ *Confirmación:*\n" +
                "Todas las reservas deben ser confirmadas por un asesor.\n\n" +
                "Escribe *Menu* para volver"
            );
            logMessage("SUCCESS", `Políticas enviadas a ${userName}`);
            return;
          }
          
          // 7. Detectar consulta genérica sobre servicios (sin especificar cuál)
          if (
            (textLower.includes("servicio") || textLower.includes("servicios")) &&
            !textLower.match(/servicio\s*[1-6]/) // No es un número específico
          ) {
            // Mostrar lista de servicios
            logMessage("INFO", `Usuario ${userName} consultó sobre servicios en general`);
            userState[userId] = "servicios";
            let lista = "💆‍♀️ *NUESTROS SERVICIOS:*\n\n";
            Object.keys(servicios).forEach((k) => {
              const serv = servicios[k];
              lista += `${k}️⃣ *${serv.nombre}*\n`;
              lista += `   ⏱️ ${serv.duracion} | 💰 ${serv.precio}\n\n`;
            });
            lista +=
              "Escribe el *número* del servicio (1-6) para más detalles o *Menu* para volver";
            await enviarMensajeSeguro(client, userId, lista);
            logMessage("SUCCESS", `Lista de servicios enviada a ${userName}`);
            return;
          }

          // Si no se detectó ninguna consulta en lenguaje natural, procesar opciones normales
          switch (textLower) {
            case "1":
              logMessage("INFO", `Usuario ${userName} solicitó ver servicios`);
              // Cambiar estado a "servicios" para que los números 1-6 se interpreten como selección de servicio
              userState[userId] = "servicios";
              let lista = "💆‍♀️ *NUESTROS SERVICIOS:*\n\n";
              Object.keys(servicios).forEach((k) => {
                const serv = servicios[k];
                lista += `${k}️⃣ *${serv.nombre}*\n`;
                lista += `   ⏱️ ${serv.duracion} | 💰 ${serv.precio}\n\n`;
              });
              lista +=
                "Escribe el *número* del servicio (1-6) para más detalles o *Menu* para volver";
              await enviarMensajeSeguro(client, userId, lista);
              logMessage("SUCCESS", `Lista de servicios enviada a ${userName}`);
              return;

            case "2":
              logMessage(
                "INFO",
                `Usuario ${userName} solicitó ver promociones`
              );
              await enviarMensajeSeguro(
                client,
                userId,
                "🌟 *PROMOCIÓN ESPECIAL*\n\n" +
                  "💆 *Combo Relax*\n" +
                  "Masaje Relajante + Limpieza Facial\n\n" +
                  "💰 *Precio:* S/120 (Ahorra S/60)\n" +
                  "⏱️ *Duración:* 90 minutos\n\n" +
                  "✨ *Beneficios:*\n" +
                  "• Relajación completa\n" +
                  "• Piel renovada y luminosa\n" +
                  "• Alivio de tensiones\n\n" +
                  "¡Aprovecha esta oferta limitada!\n\n" +
                  "Escribe *Menu* para volver"
              );
              logMessage("SUCCESS", `Promoción enviada a ${userName}`);
              return;

            case "3":
              userState[userId] = "reserva";
              humanModeUsers.add(userId);
              estadisticas.reservasSolicitadas++;
              logMessage(
                "INFO",
                `Usuario ${userName} solicitó hacer una reserva`
              );

              try {
                await enviarMensajeSeguro(
                  client,
                  ADMIN_NUMBER,
                  `🔔 *NUEVA SOLICITUD DE RESERVA*\n\n` +
                    `Usuario: ${userName}\n` +
                    `Número: ${extraerNumero(userId)}\n\n` +
                    `Por favor contacta al cliente para confirmar los detalles.`
                );
                await enviarMensajeSeguro(
                  client,
                  userId,
                  "📅 *SOLICITUD DE RESERVA*\n\n" +
                    "Un asesor se pondrá en contacto contigo pronto.\n\n" +
                    "Por favor, envía la siguiente información:\n" +
                    "• Tu nombre completo\n" +
                    "• Servicio deseado\n" +
                    "• Fecha y hora preferida\n\n" +
                    "El bot dejará de responder automáticamente."
                );
                logMessage(
                  "SUCCESS",
                  `Solicitud de reserva procesada para ${userName}`
                );
              } catch (error) {
                logMessage("ERROR", `Error al procesar reserva`, {
                  error: error.message,
                });
              }
              return;

            case "4":
              logMessage("INFO", `Usuario ${userName} solicitó ver ubicación`);
              await enviarMensajeSeguro(
                client,
                userId,
                `📍 *NUESTRA UBICACIÓN*\n\n` +
                  `🏢 ${UBICACION}\n\n` +
                  `🕐 *Horario de atención:*\n${HORARIO_ATENCION}\n\n` +
                  `🗺️ [Ver en Google Maps](${MAPS_LINK})\n\n` +
                  "Escribe *Menu* para volver"
              );
              logMessage("SUCCESS", `Ubicación enviada a ${userName}`);
              return;

            case "5":
              logMessage(
                "INFO",
                `Usuario ${userName} solicitó ver información de pagos`
              );
              await enviarMensajeSeguro(
                client,
                userId,
                "💳 *INFORMACIÓN DE PAGO*\n\n" +
                  "📱 *Yape:*\n" +
                  `Número: *${YAPE_NUMERO}*\n` +
                  `Titular: *${YAPE_TITULAR}*\n\n` +
                  "🏦 *Transferencia Bancaria:*\n" +
                  `Cuenta: *${BANCO_CUENTA}*\n` +
                  `Titular: *${YAPE_TITULAR}*\n\n` +
                  "Escribe *Menu* para volver"
              );
              logMessage(
                "SUCCESS",
                `Información de pago enviada a ${userName}`
              );
              return;

            case "6":
              logMessage("INFO", `Usuario ${userName} solicitó ver políticas`);
              await enviarMensajeSeguro(
                client,
                userId,
                "📜 *POLÍTICAS DE RESERVA*\n\n" +
                  "⏰ *Cancelación/Modificación:*\n" +
                  "Debe realizarse con mínimo 24 horas de anticipación.\n\n" +
                  "❌ *Cancelaciones tardías:*\n" +
                  "Pueden estar sujetas a cargos adicionales.\n\n" +
                  "✅ *Confirmación:*\n" +
                  "Todas las reservas deben ser confirmadas por un asesor.\n\n" +
                  "Escribe *Menu* para volver"
              );
              logMessage("SUCCESS", `Políticas enviadas a ${userName}`);
              return;

            case "7":
              humanModeUsers.add(userId);
              estadisticas.asesoresActivados++;
              logMessage(
                "INFO",
                `Usuario ${userName} activó modo asesor desde menú`
              );

              try {
                await enviarMensajeSeguro(
                  client,
                  ADMIN_NUMBER,
                  `🔔 *Nueva solicitud de asesor*\n\nUsuario: ${userName}\nNúmero: ${extraerNumero(userId)}\n\nEl bot dejará de responder a este usuario.`
                );
                await enviarMensajeSeguro(
                  client,
                  userId,
                  "🧑‍💼 *Modo Asesor Activado*\n\nTe contactará un asesor humano. El bot dejará de responder automáticamente.\n\nPara volver al bot, escribe *Bot*."
                );
                logMessage(
                  "SUCCESS",
                  `Notificación enviada al administrador para ${userName}`
                );
              } catch (error) {
                logMessage("ERROR", `Error al enviar notificación de asesor`, {
                  error: error.message,
                });
              }
              return;

            default:
              // Si no es una opción válida del menú principal, mostrar error
              logMessage(
                "WARNING",
                `Usuario ${userName} envió opción inválida en menú`,
                { opcion: textLower, estado: userState[userId] }
              );
              await enviarMensajeSeguro(
                client,
                userId,
                "❌ Opción inválida.\n\nEscribe el *número* (1-7) de la opción que deseas o *Menu* para ver el menú principal."
              );
              return;
          }
        } catch (error) {
          logMessage("ERROR", `Error al procesar opción del menú`, {
            error: error.message,
            opcion: textLower,
          });
        }
      }

      if (userState[userId] === "reserva") {
        // Permitir salir del modo reserva escribiendo "menu" o "cancelar"
        if (
          fuzzyMatch(textLower, "menu") ||
          fuzzyMatch(textLower, "cancelar") ||
          fuzzyMatch(textLower, "volver")
        ) {
          userState[userId] = "menu";
          humanModeUsers.delete(userId); // Remover del modo asesor también
          logMessage(
            "INFO",
            `Usuario ${userName} canceló el proceso de reserva y volvió al menú`
          );
          try {
            await enviarMensajeSeguro(
              client,
              userId,
              "✅ Has vuelto al menú principal.\n\n" +
                "🌿 *ESSENZA SPA*\n\n" +
                "1️⃣ Servicios\n" +
                "2️⃣ Promociones\n" +
                "3️⃣ Reservar\n" +
                "4️⃣ Ubicación\n" +
                "5️⃣ Pagos\n" +
                "6️⃣ Políticas\n\n" +
                "Escribe el *número* de la opción que deseas:"
            );
          } catch (error) {
            logMessage(
              "ERROR",
              `Error al enviar menú después de cancelar reserva`,
              { error: error.message }
            );
          }
          return;
        }

        // Intentar extraer información de reserva del mensaje
        // Usar la función mejorada para extraer fecha y hora
        const fechaHora = extraerFechaHora(text);
        
        // Detectar servicio mencionado
        const servicioMatch = text.match(
          /(masaje|masajes|limpieza|facial|manicura|pedicura|extensiones|pestañas|pestaña|cejas|ceja|fisioterapia|fisio)/i
        );
        
        // También intentar detectar servicio usando la función de detección
        const servicioDetectado = detectarConsultaServicio(text);

        if (fechaHora || servicioMatch || servicioDetectado) {
          // Guardar información de reserva para recordatorio
          let servicioTexto = "Servicio no especificado";
          
          if (servicioDetectado) {
            servicioTexto = servicios[servicioDetectado].nombre;
          } else if (servicioMatch) {
            servicioTexto = servicioMatch[0];
          }

          // Guardar si tenemos fecha válida O servicio detectado
          if (fechaHora || servicioDetectado) {
            // Solo guardar reserva si tenemos fecha válida (para recordatorios)
            if (fechaHora) {
              guardarReserva(userId, userName, servicioTexto, fechaHora);
            }
            
            logMessage(
              "INFO",
              `Información de reserva detectada y guardada de ${userName}`,
              {
                servicio: servicioTexto,
                fecha: fechaHora ? fechaHora.toLocaleString("es-PE") : "Pendiente",
              }
            );

            // Confirmar que se recibió la información
            try {
              let mensajeConfirmacion = "✅ *Información recibida*\n\n";
              mensajeConfirmacion += "Hemos registrado tu información de reserva:\n";
              mensajeConfirmacion += `📅 *Servicio:* ${servicioTexto}\n`;
              
              if (fechaHora) {
                mensajeConfirmacion += `⏰ *Fecha/Hora:* ${fechaHora.toLocaleString("es-PE")}\n\n`;
              } else {
                mensajeConfirmacion += `⏰ *Fecha/Hora:* Pendiente\n\n`;
              }
              
              mensajeConfirmacion += "Un asesor se pondrá en contacto contigo pronto para confirmar los detalles.\n\n";
              mensajeConfirmacion += "Si necesitas hacer algún cambio, escribe *Menu* o *Cancelar*.";
              
              await enviarMensajeSeguro(client, userId, mensajeConfirmacion);
              ultimaRespuestaReserva[userId] = new Date();
              logMessage(
                "SUCCESS",
                `Confirmación de información de reserva enviada a ${userName}`
              );
            } catch (error) {
              logMessage("ERROR", `Error al enviar confirmación de reserva`, {
                error: error.message,
              });
            }
          } else {
            logMessage(
              "INFO",
              `Información de reserva detectada pero sin fecha válida de ${userName}`
            );

            // Responder que se necesita más información
            const ahora = new Date();
            const ultimaRespuesta = ultimaRespuestaReserva[userId];
            const dosMinutos = 2 * 60 * 1000;

            if (!ultimaRespuesta || ahora - ultimaRespuesta >= dosMinutos) {
              try {
                await enviarMensajeSeguro(
                  client,
                  userId,
                  "📝 *Información parcial recibida*\n\n" +
                    "Hemos detectado información de tu reserva, pero necesitamos más detalles:\n\n" +
                    "Por favor, envía:\n" +
                    "• Tu nombre completo\n" +
                    "• Servicio deseado\n" +
                    "• Fecha y hora preferida (formato: DD/MM/YYYY HH:MM)\n\n" +
                    "Ejemplo: *15/12/2024 14:30*\n\n" +
                    "O escribe *Menu* para volver al menú principal."
                );
                ultimaRespuestaReserva[userId] = ahora;
                logMessage(
                  "INFO",
                  `Solicitud de más información enviada a ${userName}`
                );
              } catch (error) {
                logMessage(
                  "ERROR",
                  `Error al solicitar más información de reserva`,
                  { error: error.message }
                );
              }
            }
          }
        } else {
          // No se detectó información de reserva, enviar recordatorio
          const ahora = new Date();
          const ultimaRespuesta = ultimaRespuestaReserva[userId];
          const dosMinutos = 2 * 60 * 1000;

          // Solo responder si han pasado al menos 2 minutos desde la última respuesta
          if (!ultimaRespuesta || ahora - ultimaRespuesta >= dosMinutos) {
            try {
              await enviarMensajeSeguro(
                client,
                userId,
                "📅 *Estás en proceso de reserva*\n\n" +
                  "Un asesor se pondrá en contacto contigo pronto.\n\n" +
                  "Si ya enviaste tu información, solo espera la confirmación.\n\n" +
                  "Si quieres cancelar o volver al menú, escribe *Menu* o *Cancelar*.\n\n" +
                  "¿Necesitas ayuda? Escribe:\n" +
                  "• *Menu* - Volver al menú principal\n" +
                  "• *Cancelar* - Cancelar la reserva"
              );
              ultimaRespuestaReserva[userId] = ahora;
              logMessage(
                "INFO",
                `Mensaje recordatorio enviado a ${userName} en proceso de reserva`
              );
            } catch (error) {
              logMessage(
                "ERROR",
                `Error al enviar mensaje recordatorio de reserva`,
                { error: error.message }
              );
            }
          } else {
            logMessage(
              "INFO",
              `Usuario ${userName} en proceso de reserva - Esperando cooldown (${Math.round(
                (dosMinutos - (ahora - ultimaRespuesta)) / 1000
              )}s restantes)`
            );
          }
        }

        logMessage(
          "INFO",
          `Usuario ${userName} está en proceso de reserva - Mensaje procesado`
        );
        return;
      }

      // Respuesta por defecto con sugerencias
      logMessage("WARNING", `Usuario ${userName} envió mensaje no reconocido`, {
        mensaje: text.substring(0, 50),
      });

      const respuestasVariadas = [
        "No entendí tu mensaje. 😅\n\nEscribe *Menu* para ver las opciones disponibles.",
        "Lo siento, no comprendí. 🤔\n\n¿Te gustaría ver nuestro *Menu*?",
        "No estoy seguro de qué necesitas. 💭\n\nEscribe *Menu* para explorar nuestros servicios.",
      ];

      await enviarMensajeSeguro(
        client,
        userId,
        respuestasVariadas[
          Math.floor(Math.random() * respuestasVariadas.length)
        ]
      );
    } catch (error) {
      logMessage("ERROR", `Error general al procesar mensaje`, {
        error: error.message,
        stack: error.stack?.substring(0, 200),
      });
    }
  });

  // Reactivación automática del modo bot
  setInterval(() => {
    const clearedCount = humanModeUsers.size;
    humanModeUsers.clear();
    if (clearedCount > 0) {
      logMessage(
        "INFO",
        `Modo asesor reiniciado - ${clearedCount} usuario(s) reactivado(s)`
      );
    }
  }, 10 * 60 * 1000);

  logMessage(
    "INFO",
    "Sistema de reactivación automática activado (cada 10 minutos)"
  );
}
