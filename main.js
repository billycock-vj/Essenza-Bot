require("dotenv").config();
const wppconnect = require("@wppconnect-team/wppconnect");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

// ============================================
// CONFIGURACIÓN (Variables de Entorno)
// ============================================
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || "51983104105@c.us";
const HORARIO_ATENCION =
  process.env.HORARIO_ATENCION || "Lunes a Sábado: 11:00 AM - 6:00 PM";
const YAPE_NUMERO = process.env.YAPE_NUMERO || "953348917";
const YAPE_TITULAR = process.env.YAPE_TITULAR || "Esther Ocaña Baron";
const BANCO_CUENTA = process.env.BANCO_CUENTA || "19194566778095";
const UBICACION =
  process.env.UBICACION || "Jiron Ricardo Palma 603, Puente Piedra, Lima, Perú";
const MAPS_LINK =
  process.env.MAPS_LINK || "https://maps.app.goo.gl/R5F8PGbcFufNADF39";
const DEPOSITO_RESERVA = process.env.DEPOSITO_RESERVA || "20";

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
// SERVICIOS DETALLADOS (Actualizado según Knowledge Base)
// ============================================
const servicios = {
  1: {
    nombre: "Masajes",
    categoria: "Masajes",
    opciones: [
      { nombre: "Masaje Relajante", precio: "S/35", duracion: "45-60 minutos" },
      {
        nombre: "Masaje Descontracturante",
        precio: "S/35",
        duracion: "45-60 minutos",
      },
      {
        nombre: "Masaje Terapéutico",
        precio: "S/45",
        duracion: "45-60 minutos",
      },
      {
        nombre: "Masaje Relajante con Piedras Calientes o Compresas",
        precio: "S/50",
        duracion: "45-60 minutos",
      },
      {
        nombre: "Masaje Descontracturante con Electroterapia",
        precio: "S/50",
        duracion: "45-60 minutos",
      },
      {
        nombre: "Masaje Descontracturante con Esferas Chinas",
        precio: "S/40",
        duracion: "45-60 minutos",
      },
      {
        nombre: "Masaje Terapéutico con Compresas y Electroterapia",
        precio: "S/60",
        duracion: "45-60 minutos",
      },
    ],
    descripcion:
      "Masajes relajantes, descontracturantes y terapéuticos para aliviar tensiones, estrés y dolores musculares",
    beneficios: [
      "Alivia dolores musculares y tensiones",
      "Reduce el estrés y la ansiedad",
      "Mejora la circulación",
      "Promueve la relajación profunda",
      "Recuperación física y mental",
    ],
    imagen: process.env.SERVICIO1_IMAGEN || null,
  },
  2: {
    nombre: "Tratamientos Faciales",
    categoria: "Belleza",
    opciones: [
      {
        nombre: "Limpieza Facial Básica",
        precio: "S/30",
        duracion: "60 minutos",
      },
      {
        nombre: "Limpieza Facial Profunda",
        precio: "S/60",
        duracion: "60-90 minutos",
      },
      {
        nombre: "Parálisis Facial + Consulta",
        precio: "S/50",
        duracion: "60 minutos",
      },
    ],
    descripcion:
      "Tratamientos faciales para rejuvenecer, limpiar y cuidar tu piel",
    beneficios: [
      "Elimina impurezas y puntos negros",
      "Hidrata y nutre la piel",
      "Reduce arrugas y líneas de expresión",
      "Mejora la textura y brillo",
      "Tratamiento especializado para parálisis facial",
    ],
    imagen: process.env.SERVICIO2_IMAGEN || null,
  },
  3: {
    nombre: "Manicura y Pedicura",
    categoria: "Belleza",
    precio: "Consultar",
    duracion: "90 minutos",
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
    categoria: "Belleza",
    precio: "Consultar",
    duracion: "120 minutos",
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
    categoria: "Belleza",
    precio: "Consultar",
    duracion: "30 minutos",
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
    nombre: "Fisioterapia y Rehabilitación",
    categoria: "Rehabilitación",
    opciones: [
      {
        nombre: "Evaluación + Tratamiento de Fisioterapia",
        precio: "S/50",
        duracion: "60 minutos",
      },
    ],
    descripcion:
      "Tratamientos terapéuticos para recuperación física y rehabilitación",
    beneficios: [
      "Alivia dolores crónicos",
      "Mejora la movilidad",
      "Recuperación post-lesión",
      "Bienestar general",
      "Evaluación profesional",
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
        "masaje",
        "masajes",
        "relajante",
        "relajantes",
        "terapéutico",
        "terapeutico",
        "terapia",
        "masajista",
        "masajear",
        "masajeo",
      ],
      precios: ["25", "s/25", "25 soles", "veinticinco", "25.00", "s/.25"],
      sinonimos: [
        "masaje de 25",
        "masaje 25 soles",
        "masaje relajante",
        "masaje terapéutico",
        "masaje de relajación",
      ],
    },
    2: {
      palabras: [
        "limpieza facial",
        "facial",
        "limpieza",
        "rejuvenecer",
        "piel",
        "tratamiento facial",
        "cuidado facial",
        "limpieza de piel",
        "facial profunda",
        "limpieza profunda",
      ],
      precios: ["60", "s/60", "60 soles", "sesenta", "60.00", "s/.60"],
      sinonimos: [
        "limpieza de piel",
        "tratamiento facial",
        "cuidado facial",
        "limpieza de 60",
        "facial de 60",
      ],
    },
    3: {
      palabras: [
        "manicura",
        "pedicura",
        "uñas",
        "unas",
        "manos",
        "pies",
        "esmalte",
        "esmaltado",
        "cuidado de uñas",
        "manicure",
        "pedicure",
        "manicura y pedicura",
      ],
      precios: ["30", "s/30", "30 soles", "treinta", "30.00", "s/.30"],
      sinonimos: [
        "cuidado de uñas",
        "manicure",
        "pedicure",
        "uñas de manos",
        "uñas de pies",
        "manicura de 30",
      ],
    },
    4: {
      palabras: [
        "extensiones",
        "pestañas",
        "pestaña",
        "pestañ",
        "extension",
        "pestañas postizas",
        "pestañas sintéticas",
        "pestañas largas",
        "pestañas voluminosas",
        "extensiones de pestañas",
      ],
      precios: ["80", "s/80", "80 soles", "ochenta", "80.00", "s/.80"],
      sinonimos: [
        "pestañas largas",
        "pestañas voluminosas",
        "extensiones de pestaña",
        "pestañas de 80",
        "extensiones de 80",
      ],
    },
    5: {
      palabras: [
        "cejas",
        "ceja",
        "diseño",
        "perfilado",
        "perfilar",
        "cejas definidas",
        "microblading",
        "diseño de cejas",
        "perfilado de cejas",
        "cejas arregladas",
      ],
      precios: ["30", "s/30", "30 soles", "treinta", "30.00", "s/.30"],
      sinonimos: [
        "diseño de cejas",
        "perfilado de cejas",
        "arreglar cejas",
        "cejas de 30",
        "diseño de ceja",
      ],
    },
    6: {
      palabras: [
        "fisioterapia",
        "fisio",
        "terapias",
        "terapia",
        "recuperación",
        "recuperacion",
        "rehabilitación",
        "rehabilitacion",
        "terapia física",
        "fisioterapeuta",
        "terapia de recuperación",
      ],
      precios: ["60", "s/60", "60 soles", "sesenta", "60.00", "s/.60"],
      sinonimos: [
        "terapia física",
        "fisioterapeuta",
        "terapia de recuperación",
        "fisio de 60",
        "terapia de 60",
      ],
    },
  };

  // Palabras que indican consulta/intención
  const palabrasConsulta = [
    "quiero",
    "deseo",
    "necesito",
    "busco",
    "tengo",
    "me interesa",
    "información",
    "info",
    "precio",
    "cuesta",
    "costo",
    "cuánto",
    "cuanto",
    "oferta",
    "promoción",
    "promocion",
    "servicio",
    "servicios",
    "ver",
    "mostrar",
    "muestra",
    "dame",
    "dime",
    "cuéntame",
    "cuentame",
    "detalles",
    "detalle",
    "sobre",
    "acerca",
    "de",
    "del",
    "la",
    "el",
    "obtener",
    "conseguir",
    "solicitar",
    "pedir",
    "agendar",
    "reservar",
  ];

  // Buscar coincidencias por servicio
  for (const [numServicio, data] of Object.entries(keywords)) {
    const tieneKeyword = data.palabras.some((palabra) =>
      textoLower.includes(palabra)
    );
    const tienePrecio = data.precios.some((precio) =>
      textoLower.includes(precio)
    );
    const tieneSinonimo = data.sinonimos.some((sin) =>
      textoLower.includes(sin)
    );
    const tieneConsulta = palabrasConsulta.some((pal) =>
      textoLower.includes(pal)
    );

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
    "reservar",
    "reserva",
    "cita",
    "agendar",
    "agenda",
    "programar",
    "quiero reservar",
    "deseo reservar",
    "necesito reservar",
    "hacer una cita",
    "sacar cita",
    "pedir cita",
    "solicitar cita",
    "disponibilidad",
    "horarios disponibles",
    "cuándo",
    "cuando",
    "quiero una cita",
    "necesito cita",
    "puedo reservar",
    "puedo agendar",
    "quiero agendar",
    "deseo agendar",
    "necesito agendar",
  ];

  return palabrasReserva.some((palabra) => textoLower.includes(palabra));
}

// Función para detectar consulta sobre promociones
function detectarConsultaPromocion(texto) {
  const textoLower = texto.toLowerCase();

  const palabrasPromo = [
    "promoción",
    "promocion",
    "promo",
    "oferta",
    "descuento",
    "combo",
    "paquete",
    "pack",
    "especial",
    "rebaja",
    "rebajas",
    "qué promociones",
    "que promociones",
    "hay ofertas",
    "tienen descuentos",
    "combo relax",
    "promoción especial",
    "oferta especial",
  ];

  return palabrasPromo.some((palabra) => textoLower.includes(palabra));
}

// Función para detectar consulta sobre ubicación
function detectarConsultaUbicacion(texto) {
  const textoLower = texto.toLowerCase();

  const palabrasUbicacion = [
    "ubicación",
    "ubicacion",
    "dirección",
    "direccion",
    "direccion",
    "dónde",
    "donde",
    "lugar",
    "local",
    "maps",
    "mapa",
    "google maps",
    "cómo llegar",
    "como llegar",
    "adónde",
    "adonde",
    "dónde están",
    "donde estan",
    "dónde se ubican",
    "donde se ubican",
    "dirección del local",
    "direccion del local",
    "dónde queda",
    "donde queda",
  ];

  return palabrasUbicacion.some((palabra) => textoLower.includes(palabra));
}

// Función para detectar consulta sobre pagos
function detectarConsultaPago(texto) {
  const textoLower = texto.toLowerCase();

  const palabrasPago = [
    "pago",
    "pagar",
    "precio",
    "precios",
    "costo",
    "costos",
    "yape",
    "transferencia",
    "banco",
    "cuenta",
    "depósito",
    "deposito",
    "método de pago",
    "metodo de pago",
    "formas de pago",
    "cómo pagar",
    "como pagar",
    "dónde pago",
    "donde pago",
    "número de yape",
    "numero de yape",
    "cuenta bancaria",
    "transferencia bancaria",
    "cómo puedo pagar",
    "como puedo pagar",
    "formas de pago",
  ];

  return palabrasPago.some((palabra) => textoLower.includes(palabra));
}

// Función para detectar consulta sobre políticas
function detectarConsultaPoliticas(texto) {
  const textoLower = texto.toLowerCase();

  const palabrasPoliticas = [
    "política",
    "politica",
    "políticas",
    "politicas",
    "reglas",
    "normas",
    "cancelación",
    "cancelacion",
    "cancelar",
    "modificar",
    "cambio",
    "reembolso",
    "devolución",
    "devolucion",
    "términos",
    "terminos",
    "puedo cancelar",
    "cómo cancelar",
    "como cancelar",
    "política de cancelación",
    "politica de cancelacion",
    "términos y condiciones",
    "terminos y condiciones",
  ];

  return palabrasPoliticas.some((palabra) => textoLower.includes(palabra));
}

// Función mejorada para extraer fecha y hora de múltiples formatos
function extraerFechaHora(texto) {
  const textoLower = texto.toLowerCase();
  let fechaHora = null;
  let fechaMatch = null;
  let horaMatch = null;

  // Patrones de fecha: DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, DD-MM-YY
  const patronesFecha = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, // DD/MM/YYYY o DD-MM-YYYY
    /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/, // DD de MES de YYYY
  ];

  // Patrones de hora: HH:MM, HH:MM AM/PM, a las HH
  const patronesHora = [
    /(\d{1,2}):(\d{2})\s*(am|pm)?/i, // HH:MM o HH:MM AM/PM
    /a\s+las\s+(\d{1,2})\s*(de\s+la\s+)?(mañana|tarde|noche)?/i, // a las HH
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

      if (fechaMatch[0].includes("/") || fechaMatch[0].includes("-")) {
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
          enero: 0,
          febrero: 1,
          marzo: 2,
          abril: 3,
          mayo: 4,
          junio: 5,
          julio: 6,
          agosto: 7,
          septiembre: 8,
          octubre: 9,
          noviembre: 10,
          diciembre: 11,
        };
        mes = meses[fechaMatch[2].toLowerCase()] || 0;
        año = parseInt(fechaMatch[3]);
      }

      // Procesar hora si se encontró
      let hora = 14; // Hora por defecto: 2 PM
      let minuto = 0;

      if (horaMatch) {
        if (horaMatch[0].includes(":")) {
          // Formato HH:MM
          hora = parseInt(horaMatch[1]);
          minuto = parseInt(horaMatch[2]);

          // Ajustar para AM/PM
          if (horaMatch[3]) {
            const ampm = horaMatch[3].toLowerCase();
            if (ampm === "pm" && hora < 12) hora += 12;
            if (ampm === "am" && hora === 12) hora = 0;
          }
        } else {
          // Formato "a las HH" o "HH AM/PM"
          hora = parseInt(horaMatch[1] || horaMatch[0].match(/\d+/)?.[0] || 14);

          // Ajustar según mañana/tarde/noche
          if (horaMatch[0].includes("mañana")) {
            if (hora === 12) hora = 0;
          } else if (horaMatch[0].includes("tarde")) {
            if (hora < 12) hora += 12;
          } else if (horaMatch[0].includes("noche")) {
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
        texto: texto.substring(0, 50),
      });
      fechaHora = null;
    }
  }

  return fechaHora;
}

// ============================================
// FUNCIÓN PARA CONSULTAR IA
// ============================================
async function consultarIA(mensajeUsuario, contextoUsuario = {}) {
  if (!openai) {
    return null; // Si no hay API key, retornar null
  }

  try {
    // Construir información detallada de servicios según Knowledge Base
    let infoServicios = "";
    for (const [num, serv] of Object.entries(servicios)) {
      if (serv.opciones && serv.opciones.length > 0) {
        infoServicios += `${num}. ${serv.nombre} (${serv.categoria}):\n`;
        serv.opciones.forEach((opcion) => {
          infoServicios += `   - ${opcion.nombre}: ${opcion.precio} (${opcion.duracion})\n`;
        });
        infoServicios += `   Descripción: ${serv.descripcion}\n`;
        infoServicios += `   Beneficios: ${serv.beneficios.join(", ")}\n\n`;
      } else {
        infoServicios += `${num}. ${serv.nombre} (${serv.categoria})\n`;
        if (serv.precio) infoServicios += `   Precio: ${serv.precio}\n`;
        if (serv.duracion) infoServicios += `   Duración: ${serv.duracion}\n`;
        infoServicios += `   Descripción: ${serv.descripcion}\n`;
        infoServicios += `   Beneficios: ${serv.beneficios.join(", ")}\n\n`;
      }
    }

    // Contexto del negocio para la IA - BASADO EN KNOWLEDGE BASE COMPLETO
    const contextoNegocio = `Eres un asistente virtual AI diseñado para Essenza, una empresa especializada en masajes, spa y rehabilitación física. Tu objetivo principal es proporcionar una experiencia cálida, relajante y profesional para los clientes que interactúan contigo vía WhatsApp. La mayoría de estos clientes vienen de anuncios en Facebook e Instagram que los dirigen a esta plataforma.

INFORMACIÓN COMPLETA DEL NEGOCIO:

📍 UBICACIÓN Y CONTACTO:
- Dirección: ${UBICACION}
- Mapa: ${MAPS_LINK}
- Horario de atención: ${HORARIO_ATENCION}
- Disponibilidad: 24/7 para asistir clientes

💆 SERVICIOS OFRECIDOS POR ESSENZA:
${infoServicios}

🎁 PROMOCIONES Y DESCUENTOS:

1. DESCUENTO PRIMERA VISITA:
- Para clientes por primera vez: 10% de descuento en compras mayores a 70 soles
- Esta es nuestra forma de darte la bienvenida y asegurar que tu experiencia sea aún más especial
- Aplica automáticamente en tu primera reserva

2. PROMOCIÓN MENSUAL:
- Cada mes hay un combo especial que combina dos servicios o terapias
- Este combo cambia regularmente para satisfacer tus necesidades
- Siempre se ofrece a un precio especial de 50 soles
- ¡No pierdas esta oportunidad de relajarte y cuidarte!

💳 MÉTODOS DE PAGO Y RESERVAS:
- Yape: ${YAPE_NUMERO} (${YAPE_TITULAR})
- Transferencia BCP: ${BANCO_CUENTA} (${YAPE_TITULAR})
- DEPÓSITO DE RESERVA: Todas las reservas requieren un depósito de ${DEPOSITO_RESERVA} soles para asegurar la cita
- El depósito se puede pagar vía Yape o transferencia BCP
- Todas las reservas deben incluir día y mes

📋 POLÍTICAS Y PROCEDIMIENTOS:
- Cancelación: Mínimo 24 horas de anticipación
- Reservas: Todas deben ser confirmadas por un asesor humano
- Confirmación: Un asesor se pondrá en contacto para coordinar detalles
- Horarios: Respetamos el horario de atención establecido (${HORARIO_ATENCION})

FUNCIONES PRINCIPALES:

1. RESERVA DE CITAS:
- Asiste a los clientes en programar servicios según sus necesidades y horarios disponibles
- Todas las reservas deben incluir día y mes
- Una reserva se asegura con un depósito de ${DEPOSITO_RESERVA} soles, pagadero vía Yape (${YAPE_NUMERO}) o Transferencia BCP (${BANCO_CUENTA})

2. RESPONDER PREGUNTAS:
- Proporciona respuestas claras y detalladas sobre tratamientos, servicios, precios y promociones

3. PROPORCIONAR RECOMENDACIONES:
- Sugiere servicios basados en las necesidades específicas del cliente (relajación, belleza o rehabilitación física)

4. OFRECER INFORMACIÓN:
- Explica servicios en detalle, incluyendo masajes, tratamientos faciales, promociones mensuales, descuentos y combos disponibles

5. TRANSFERIR A AGENTE HUMANO:
- Si el cliente quiere hablar con un representante, reconoce palabras clave como "hablar con alguien", "quiero hablar con un agente", "asesor", "representante"
- Responde: "Por supuesto, estoy transfiriendo tu consulta a uno de nuestros representantes. Por favor espera un momento."
- Envía una notificación al personal con el historial de conversación para que puedan asistir manualmente al cliente
- Durante esta interacción, deja de responder automáticamente hasta que el agente concluya

TONO Y VOCABULARIO:
- Usa un tono cálido, relajante y profesional
- Incorpora términos relacionados con bienestar, spa, relajación y autocuidado
- Sé empático y comprensivo

IDIOMAS:
- Responde en español o inglés, dependiendo del idioma usado por el cliente
- Si el cliente escribe en inglés, responde en inglés
- Si escribe en español, responde en español peruano de forma natural y amigable

INSTRUCCIONES DE RESPUESTA:
1. PERSONALIDAD: Sé amigable, cálido, profesional y conversacional. Usa el nombre del usuario cuando sea apropiado.
2. EMOJIS: Usa emojis apropiadamente (😊, ✨, 💆‍♀️, 💡, 🌿, 🧘‍♀️) pero sin exagerar.
3. SERVICIOS: Cuando pregunten sobre servicios, proporciona información completa: precio, duración, descripción y beneficios. Menciona todas las opciones disponibles.
4. RESERVAS: Si preguntan sobre reservas, explícales el proceso completo de forma natural: deben incluir día y mes, y se requiere un depósito de ${DEPOSITO_RESERVA} soles para asegurar la cita. Si quieren hacer una reserva, guíalos naturalmente.
5. PROMOCIONES: Siempre menciona el descuento de primera visita (10% sobre 70 soles) y la promoción mensual (combo a 50 soles) cuando sea relevante.
6. PREGUNTAS GENERALES: Responde de forma natural y completa. Si no sabes algo, admítelo amigablemente.
7. LONGITUD: Responde de forma completa pero concisa (150-400 palabras máximo).
8. ASESOR HUMANO: Si el usuario quiere hablar con un humano, reconoce palabras clave y transfiere inmediatamente.
9. CONVERSACIÓN: Responde de forma natural y conversacional. No menciones comandos, menús o números. Simplemente conversa como un asistente real.
10. INFORMACIÓN: NO inventes información. Si no está en el contexto, admítelo y ofrece contactar con un asesor.
11. OBJETIVO FINAL: Entregar una experiencia acogedora y personalizada que motive a los clientes a reservar una cita o resolver sus consultas rápida y eficientemente.

CONTEXTO DE LA CONVERSACIÓN:
- Estado actual: ${contextoUsuario.estado || "menu"}
- Nombre del usuario: ${contextoUsuario.nombre || "Usuario"}
- Tipo de consulta: ${contextoUsuario.tipoConsulta || "general"}
- Puedes usar esta información para personalizar tu respuesta

IMPORTANTE: Responde de forma natural, como si fueras un asistente real del spa. Sé empático, profesional y siempre busca ayudar al cliente. Recuerda que muchos clientes vienen de anuncios en redes sociales, así que sé acogedor y profesional desde el primer contacto.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modelo económico y rápido
      messages: [
        {
          role: "system",
          content: contextoNegocio,
        },
        {
          role: "user",
          content: mensajeUsuario,
        },
      ],
      max_tokens: 500, // Respuestas más completas y detalladas
      temperature: 0.8, // Más creatividad y naturalidad
    });

    const respuesta = completion.choices[0].message.content.trim();
    return respuesta;
  } catch (error) {
    logMessage("ERROR", "Error al consultar IA", {
      error: error.message,
    });
    return null; // Si hay error, retornar null para usar respuesta por defecto
  }
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
// INICIALIZACIÓN DE OPENAI (se inicializará después de definir logMessage)
// ============================================
let openai = null;

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
    if (
      numeroFormateado.endsWith("@c.us") ||
      numeroFormateado.endsWith("@lid")
    ) {
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
      (numeroFormateado.includes("@c.us") ||
        numeroFormateado.includes("@lid")) &&
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

// Inicializar OpenAI después de definir logMessage
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  logMessage("SUCCESS", "OpenAI inicializado correctamente");
} else {
  logMessage("WARNING", "OpenAI no disponible - OPENAI_API_KEY no configurada");
}

// ============================================
// FUNCIÓN PARA LIMPIAR ARCHIVOS BLOQUEADOS
// ============================================
function limpiarArchivosBloqueados() {
  try {
    const tokensDir = path.join(__dirname, "tokens", "essenza-bot", "Default");
    const preferencesPath = path.join(tokensDir, "Preferences");
    const lockPath = path.join(tokensDir, "lockfile");
    const singletonPath = path.join(tokensDir, "SingletonLock");
    const singletonCookie = path.join(tokensDir, "SingletonCookie");
    const singletonSocket = path.join(tokensDir, "SingletonSocket");

    // Intentar eliminar archivos que pueden estar bloqueados
    const archivosBloqueados = [
      preferencesPath,
      lockPath,
      singletonPath,
      singletonCookie,
      singletonSocket,
    ];

    let limpiados = 0;

    // Primero intentar eliminar archivos individuales
    for (const archivo of archivosBloqueados) {
      try {
        if (fs.existsSync(archivo)) {
          // Intentar eliminar con retry (hasta 5 intentos)
          let eliminado = false;
          for (let i = 0; i < 5; i++) {
            try {
              // Cambiar permisos si es posible
              try {
                fs.chmodSync(archivo, 0o666);
              } catch (e) {
                // Ignorar si no se puede cambiar permisos
              }

              fs.unlinkSync(archivo);
              eliminado = true;
              limpiados++;
              logMessage(
                "SUCCESS",
                `Archivo eliminado: ${path.basename(archivo)}`
              );
              break;
            } catch (err) {
              if (i < 4) {
                // Esperar antes de reintentar (aumentar tiempo progresivamente)
                const waitTime = (i + 1) * 300;
                const start = Date.now();
                while (Date.now() - start < waitTime) {}
              } else {
                logMessage(
                  "WARNING",
                  `No se pudo eliminar después de 5 intentos: ${path.basename(
                    archivo
                  )}`
                );
              }
            }
          }
        }
      } catch (error) {
        // Ignorar errores individuales
      }
    }

    // Si Preferences sigue existiendo y no se pudo eliminar, intentar renombrarlo
    if (fs.existsSync(preferencesPath)) {
      try {
        const backupPath = preferencesPath + ".backup." + Date.now();
        fs.renameSync(preferencesPath, backupPath);
        logMessage("SUCCESS", "Preferences renombrado como backup");
        limpiados++;
      } catch (err) {
        logMessage(
          "WARNING",
          "No se pudo renombrar Preferences. Puede estar bloqueado por otro proceso."
        );
      }
    }

    if (limpiados > 0) {
      logMessage("SUCCESS", `Total archivos limpiados: ${limpiados}`);
    } else {
      logMessage("INFO", "No se encontraron archivos bloqueados para limpiar");
    }

    return limpiados > 0;
  } catch (error) {
    logMessage("WARNING", "Error al limpiar archivos bloqueados", {
      error: error.message,
    });
    return false;
  }
}

// ============================================
// INICIALIZACIÓN DEL BOT
// ============================================
let clientInstance = null;
let sessionName = "essenza-bot"; // Variable global para el nombre de sesión

// Limpiar archivos bloqueados antes de iniciar
logMessage("INFO", "Verificando y limpiando archivos bloqueados...");
const archivosLimpiados = limpiarArchivosBloqueados();

// Verificar si el directorio está bloqueado
const tokensPath = path.join(__dirname, "tokens", "essenza-bot");
const defaultPath = path.join(tokensPath, "Default");
const preferencesPath = path.join(defaultPath, "Preferences");

// Si Preferences existe y no se pudo limpiar, usar un directorio temporal
if (!archivosLimpiados && fs.existsSync(preferencesPath)) {
  // Intentar renombrar la carpeta Default
  try {
    const timestamp = Date.now();
    const backupPath = path.join(tokensPath, `Default.backup.${timestamp}`);
    if (fs.existsSync(defaultPath)) {
      fs.renameSync(defaultPath, backupPath);
      logMessage(
        "SUCCESS",
        `Carpeta Default renombrada. El bot creara una nueva.`
      );
    }
  } catch (renameError) {
    // Si no se puede renombrar, usar un nombre de sesión temporal
    logMessage(
      "WARNING",
      "No se pudo renombrar carpeta Default. Usando sesion temporal.",
      {
        error: renameError.message,
      }
    );
    sessionName = `essenza-bot-${Date.now()}`;
    logMessage("INFO", `Usando nombre de sesion temporal: ${sessionName}`);
  }
}

// Esperar un momento para que los archivos se liberen
setTimeout(() => {
  iniciarBot();
}, 2000);

function iniciarBot() {
  wppconnect
    .create({
      session: sessionName,
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
        "--user-data-dir=" + path.join(__dirname, "tokens", "essenza-bot"),
        "--disable-file-system",
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

      // Si el error es EPERM (permisos), intentar limpiar el archivo bloqueado
      if (
        error.message &&
        (error.message.includes("EPERM") ||
          error.message.includes("operation not permitted"))
      ) {
        logMessage(
          "WARNING",
          "Error de permisos detectado. El archivo Preferences esta bloqueado."
        );
        logMessage(
          "INFO",
          "Intentando limpiar archivos bloqueados automaticamente..."
        );

        // Intentar limpiar el archivo bloqueado con varios intentos
        const limpiarArchivosBloqueados = async (intentos = 0) => {
          try {
            const tokensPath = path.join(
              __dirname,
              "tokens",
              "essenza-bot",
              "Default",
              "Preferences"
            );
            if (fs.existsSync(tokensPath)) {
              // Intentar eliminar el archivo
              fs.unlinkSync(tokensPath);
              logMessage(
                "SUCCESS",
                "Archivo Preferences eliminado. Reiniciando en 3 segundos..."
              );
              setTimeout(() => {
                logMessage("INFO", "Reiniciando bot...");
                process.exit(1); // Se reiniciará automáticamente
              }, 3000);
              return;
            }
          } catch (unlinkError) {
            if (intentos < 3) {
              logMessage(
                "WARNING",
                `Intento ${intentos + 1} fallido. Reintentando en 2 segundos...`
              );
              setTimeout(() => limpiarArchivosBloqueados(intentos + 1), 2000);
            } else {
              logMessage(
                "ERROR",
                "No se pudo eliminar Preferences automaticamente."
              );
              logMessage("INFO", "Soluciones manuales:");
              logMessage("INFO", "   1. Ejecuta: .\\limpiar-tokens.ps1");
              logMessage(
                "INFO",
                "   2. O elimina manualmente la carpeta 'tokens'"
              );
              logMessage(
                "INFO",
                "   3. Asegurate de que no haya otra instancia del bot ejecutandose"
              );
              // Continuar con el timeout de reconexión normal
              setTimeout(() => {
                logMessage("INFO", "Intentando reconectar...");
                process.exit(1);
              }, 10000);
            }
          }
        };

        // Iniciar limpieza después de 1 segundo
        setTimeout(() => limpiarArchivosBloqueados(), 1000);
        return; // No continuar con el timeout de reconexión aquí
      }

      // Intentar reconectar después de 10 segundos
      setTimeout(() => {
        logMessage("INFO", "Intentando reconectar...");
        // Limpiar archivos antes de reintentar
        limpiarArchivosBloqueados();
        setTimeout(() => {
          iniciarBot();
        }, 2000);
      }, 10000);
    });
}

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
            session: sessionName,
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
              "--user-data-dir=" +
                path.join(__dirname, "tokens", "essenza-bot"),
              "--disable-file-system",
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
          // Usar IA para responder el saludo de forma natural
          const contextoSaludo = {
            estado: "inicio",
            nombre: userName,
            tipoConsulta: "saludo",
          };
          const respuestaIA = await consultarIA(
            `Hola, soy ${userName}`,
            contextoSaludo
          );
          if (respuestaIA) {
            respuesta = respuestaIA;
          } else {
            respuesta = `${saludoHora}! 👋\n\n¡Hola ${userName}! Bienvenido a *Essenza Spa*.\n\nSomos especialistas en bienestar y belleza. 💆‍♀️✨\n\n¿En qué puedo ayudarte hoy? 😊`;
          }
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
      // SALIDA DEL MODO ASESOR (solo si está activo)
      // ============================================
      if (humanModeUsers.has(userId)) {
        // Si el usuario quiere volver a hablar con la IA
        if (
          fuzzyMatch(textLower, "bot") ||
          textLower === "bot" ||
          fuzzyMatch(textLower, "ia") ||
          fuzzyMatch(textLower, "inteligencia artificial")
        ) {
          humanModeUsers.delete(userId);
          userState[userId] = null; // Limpiar estado
          try {
            await enviarMensajeSeguro(
              client,
              userId,
              "✅ Perfecto, estoy de vuelta para ayudarte. ¿En qué puedo asistirte? 😊"
            );
            logMessage("SUCCESS", `Usuario ${userName} salió del modo asesor`);
          } catch (error) {
            logMessage("ERROR", `Error al confirmar salida del modo asesor`, {
              error: error.message,
            });
          }
          return;
        }
        // Si está en modo asesor, no procesar más (el asesor humano maneja)
        return;
      }

      // ============================================
      // COMANDO: ASESOR
      // ============================================
      if (fuzzyMatch(textLower, "asesor")) {
        humanModeUsers.add(userId);
        estadisticas.asesoresActivados++;
        logMessage("INFO", `Usuario ${userName} activó modo asesor`);

        // Enviar mensaje al usuario PRIMERO (más importante)
        try {
          await enviarMensajeSeguro(
            client,
            userId,
            "Por supuesto, estoy transfiriendo tu consulta a uno de nuestros representantes. Por favor espera un momento. 😊"
          );
          logMessage(
            "SUCCESS",
            `Mensaje de transferencia enviado al usuario ${userName}`
          );
        } catch (error) {
          logMessage(
            "ERROR",
            `Error al enviar mensaje de transferencia al usuario`,
            {
              error: error.message,
            }
          );
        }

        // Enviar notificación al admin (separado, no crítico si falla)
        try {
          await enviarMensajeSeguro(
            client,
            ADMIN_NUMBER,
            `🔔 *Nueva solicitud de asesor*\n\nUsuario: ${userName}\nNúmero: ${extraerNumero(
              userId
            )}\n\nEl bot dejará de responder a este usuario.`
          );
          logMessage(
            "SUCCESS",
            `Notificación de asesor enviada al administrador`
          );
        } catch (error) {
          // Error no crítico - solo loguear, no afectar al usuario
          logMessage(
            "WARNING",
            `Error al notificar al administrador (no crítico)`,
            {
              error: error.message,
              userId: ADMIN_NUMBER,
            }
          );
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
      // DETECCIÓN DE RESERVA (siempre activa)
      // ============================================
      if (
        detectarIntencionReserva(textLower) &&
        userState[userId] !== "reserva"
      ) {
        // Activar flujo de reserva
        userState[userId] = "reserva";
        humanModeUsers.add(userId);
        estadisticas.reservasSolicitadas++;
        logMessage("INFO", `Usuario ${userName} solicitó reserva`);

        // Enviar mensaje al usuario PRIMERO (más importante)
        try {
          await enviarMensajeSeguro(
            client,
            userId,
            "📅 Perfecto, he recibido tu solicitud de reserva. ✨\n\n" +
              "Un asesor se pondrá en contacto contigo pronto para coordinar todos los detalles.\n\n" +
              "💡 *Información importante:*\n" +
              "• Todas las reservas deben incluir día y mes\n" +
              "• Se requiere un depósito de S/" +
              DEPOSITO_RESERVA +
              " para asegurar tu cita\n" +
              "• El depósito se puede pagar vía Yape (" +
              YAPE_NUMERO +
              ") o Transferencia BCP (" +
              BANCO_CUENTA +
              ")\n\n" +
              "Por favor, envía la siguiente información:\n" +
              "• Tu nombre completo\n" +
              "• Servicio deseado\n" +
              "• Fecha y hora preferida (día y mes)\n\n" +
              "Un asesor te contactará pronto para confirmar tu reserva. 😊"
          );
          logMessage(
            "SUCCESS",
            `Mensaje de reserva enviado al usuario ${userName}`
          );
        } catch (error) {
          logMessage("ERROR", `Error al enviar mensaje de reserva al usuario`, {
            error: error.message,
          });
        }

        // Enviar notificación al admin (separado, no crítico si falla)
        try {
          await enviarMensajeSeguro(
            client,
            ADMIN_NUMBER,
            `🔔 *NUEVA SOLICITUD DE RESERVA*\n\n` +
              `Usuario: ${userName}\n` +
              `Número: ${extraerNumero(userId)}\n\n` +
              `Por favor contacta al cliente para confirmar los detalles.`
          );
          logMessage(
            "SUCCESS",
            `Notificación de reserva enviada al administrador`
          );
        } catch (error) {
          // Error no crítico - solo loguear, no afectar al usuario
          logMessage(
            "WARNING",
            `Error al notificar al administrador (no crítico)`,
            {
              error: error.message,
              userId: ADMIN_NUMBER,
            }
          );
        }
        return;
      }

      // ============================================
      // SI ESTÁ EN MODO RESERVA, solo permitir salir
      // ============================================
      if (userState[userId] === "reserva") {
        // Permitir salir del modo reserva
        if (
          fuzzyMatch(textLower, "cancelar") ||
          fuzzyMatch(textLower, "volver") ||
          fuzzyMatch(textLower, "no quiero reservar")
        ) {
          userState[userId] = null;
          humanModeUsers.delete(userId);
          logMessage(
            "INFO",
            `Usuario ${userName} canceló el proceso de reserva`
          );
          try {
            await enviarMensajeSeguro(
              client,
              userId,
              "✅ Entendido, he cancelado tu solicitud de reserva. ¿En qué más puedo ayudarte? 😊"
            );
          } catch (error) {
            logMessage("ERROR", `Error al cancelar reserva`, {
              error: error.message,
            });
          }
          return;
        }
        // Si está en modo reserva, no procesar más (el asesor maneja)
        return;
      }

      // Mensaje de bienvenida para nuevos usuarios (solo si no tiene estado y no se ha enviado bienvenida)
      if (!userState[userId] && !userData[userId]?.bienvenidaEnviada) {
        if (!userData[userId]) userData[userId] = {};
        userData[userId].bienvenidaEnviada = true;
        logMessage("INFO", `Nuevo usuario detectado: ${userName}`);

        // Usar IA para la bienvenida
        const contextoBienvenida = {
          estado: "inicio",
          nombre: userName,
          tipoConsulta: "bienvenida",
        };
        const respuestaBienvenida = await consultarIA(
          `Hola, soy ${userName}`,
          contextoBienvenida
        );

        if (respuestaBienvenida) {
          await enviarMensajeSeguro(client, userId, respuestaBienvenida);
          logMessage("SUCCESS", `Bienvenida de IA enviada a ${userName}`);
        } else {
          // Fallback simple
          const saludoHora = getSaludoPorHora();
          await enviarMensajeSeguro(
            client,
            userId,
            `${saludoHora}! 👋\n\n¡Hola ${userName}! Bienvenido a *Essenza Spa*.\n\n` +
              `Somos especialistas en bienestar y belleza. 💆‍♀️✨\n\n` +
              `¿En qué puedo ayudarte hoy? 😊`
          );
        }
        // No hacer return, dejar que continúe para procesar cualquier consulta
      }

      // ============================================
      // TODO SE PROCESA CON IA - SIN MENÚ ESTRUCTURADO
      // ============================================

      // ============================================
      // TODO SE PROCESA CON IA - SIN MENÚ ESTRUCTURADO
      // ============================================
      // El código de reserva ya se maneja arriba, aquí solo procesamos con IA

      // Respuesta por defecto - SIEMPRE usar IA primero
      logMessage("INFO", `Usuario ${userName} envió mensaje - Consultando IA`, {
        mensaje: text.substring(0, 50),
      });

      // Intentar usar IA primero (solo si no está en modo reserva o asesor)
      if (userState[userId] !== "reserva" && !humanModeUsers.has(userId)) {
        const contextoUsuario = {
          estado: userState[userId] || "conversacion",
          nombre: userName,
        };

        const respuestaIA = await consultarIA(text, contextoUsuario);

        if (respuestaIA) {
          // Si la IA respondió, usar su respuesta
          await enviarMensajeSeguro(client, userId, respuestaIA);
          logMessage("SUCCESS", `Respuesta de IA enviada a ${userName}`);
          return; // Importante: hacer return para no continuar
        }
      }

      // Si no hay IA o falló, usar respuesta simple
      await enviarMensajeSeguro(
        client,
        userId,
        "😊 Disculpa, no pude procesar tu mensaje en este momento. Por favor, intenta reformular tu pregunta o pregunta algo diferente. ¿En qué puedo ayudarte? 😊"
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
