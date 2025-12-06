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
// ============================================
// VALIDACIÓN TEMPORAL PARA PRUEBAS
// TODO: QUITAR ESTA VALIDACIÓN DESPUÉS DE PRUEBAS
// ============================================
const NUMERO_PRUEBA = "51972002363"; // Solo responder a este número durante pruebas (con código de país)
const MODO_PRUEBA = true; // Cambiar a false o quitar esta validación después
// ============================================
const HORARIO_ATENCION =
  process.env.HORARIO_ATENCION ||
  "Lunes a Viernes: 11:00 AM - 5:00 PM, Sábados: 10:00 AM - 2:00 PM";
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

// Control de IA global (solo admin puede activar/desactivar)
let iaGlobalDesactivada = false;

// Usuarios con bot desactivado por el admin (solo el admin puede responder)
const usuariosBotDesactivado = new Set();

// Control de rate limiting para OpenAI (1 segundo entre peticiones)
let ultimaPeticionIA = 0;

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

  // Rate limiting: esperar 1 segundo entre peticiones
  const ahora = Date.now();
  const tiempoDesdeUltimaPeticion = ahora - ultimaPeticionIA;
  if (tiempoDesdeUltimaPeticion < 1000) {
    const tiempoEspera = 1000 - tiempoDesdeUltimaPeticion;
    await new Promise((resolve) => setTimeout(resolve, tiempoEspera));
  }
  ultimaPeticionIA = Date.now();

  try {
    // Prompt consolidado para Essenza AI
    const contextoNegocio = `Eres Essenza AI, asistente virtual del spa ESSENZA. Responde en español peruano, de forma cálida, relajante, profesional y humana. Debes sonar amable, no robótico, usar el nombre del cliente cuando lo conozcas.

REGLA CRÍTICA SOBRE SALUDOS:
- Si "Ya se saludó antes" es true en el contexto, NUNCA debes saludar de nuevo. NO uses "Hola", "Buenos días", "Buenas tardes", ni ningún saludo.
- Si "Ya se saludó antes" es false, puedes saludar solo una vez al inicio.
- NUNCA repitas saludos en la misma conversación, incluso si el usuario escribe "hola" de nuevo.

Tu meta final: resolver dudas, recomendar servicios, y cerrar reserva con depósito confirmado.

INFORMACIÓN DEL SPA

Nombre del bot: Essenza AI
Tipo: Asistente virtual del spa ESSENZA
Ubicación: Jiron Ricardo Palma 603, Puente Piedra, Lima, Perú
Mapa: ${MAPS_LINK} (mantener como link clicable)

Horario de atención:
- Lunes a Viernes de 11am a 5pm
- Sábados de 10am a 2pm

MÉTODOS DE PAGO Y DEPÓSITO

Depósito obligatorio para reservar:
- Si el servicio cuesta menos de 50 soles: depósito 10
- Si el servicio cuesta 50 o más: depósito 20
- Si un servicio está con precio promocional en diciembre, el depósito se calcula con el precio promocional
- Si el cliente elige más de un servicio o combo, el depósito se calcula basado en el total final

Métodos de pago:
- Yape ${YAPE_NUMERO} (Titular Esther Ocaña Baron)
- BCP ${BANCO_CUENTA}

El depósito se descuenta del total del servicio.

SERVICIOS CON PRECIOS

REGLA PRINCIPAL:
Los precios promocionales solo se aplican si la fecha actual es diciembre 2025.
El bot usa fecha de sistema para decidir qué precio mostrar.
Si no es diciembre o el servicio no tiene promo: mostrar solo precio normal.
Si el cliente pregunta por promociones fuera de diciembre, responder:
"De momento no tenemos promociones activas, pero puedo recomendarte combos y tratamientos según lo que necesites."

CATEGORÍA MASAJES RELAJANTES:
- Masaje Relajante: 50 (promo 25)
- Masaje con Piedras Calientes: 80 (promo 35)
- Masaje con Esferas Chinas: 70 (promo 30)
- Exfoliación Corporal: 50 (promo 30)

CATEGORÍA TERAPIAS Y FISIOTERAPIA:
- Masaje Descontracturante: 55 (promo 30)
- Masaje Terapéutico Cuerpo Completo: 80 (promo 60)
- Terapia Física: 70 (promo 40)
- Terapia del Dolor zona afectada: 60 (promo 50)
- Punción Seca: 60 (promo 40)
- Auriculoterapia: 50 (promo 30)
- Reflexología: 70 (promo 40)

CATEGORÍA FACIALES:
- Facial Básico: 40 (sin promo)
- Facial Profundo: 70 (sin promo)
- Terapia Facial: 50 (sin promo)

CATEGORÍA ESPECIALES:
- Terapia Neural: 80 (sin promo)

PROMOCIONES Y COMBOS

Solo mostrar si es diciembre con fecha válida. El bot debe seleccionar y recomendar combos según necesidad.

COMBOS RELAX:
- Masaje Relajante + Facial Básico: 60
- Masaje Relajante + Exfoliación: 55
- Facial Profundo + Terapia Facial: 100
- Limpieza Básica + Piedras Calientes: 75

COMBOS PARA DOLOR:
- Descontracturante + Terapia del Dolor: 70
- Terapéutico + Punción Seca: 95
- Reflexología + Punción Seca: 70
- Terapia Física + Auriculoterapia: 60

COMBOS PREMIUM:
- Piedras Calientes + Facial Profundo: 95
- Terapéutico + Exfoliación + Reflexología: 150
- Esferas Chinas + Terapia Facial: 80
- Descontracturante + Facial Profundo + Auriculoterapia: 140

PAQUETE AMOR (PROMOCIÓN NAVIDAD):
Esta promo se activa solo cada diciembre del 1 al 23.
- Precio promo diciembre hasta 23: 120
- Precio regular fuera de ese periodo: 150
Incluye: masaje a elección, piedras calientes, reflexología, exfoliación, limpieza facial, aromaterapia, musicoterapia, copa de vino, frutas, alfajor, decoración romántica.
Ideal para parejas.
La IA debe mostrar el precio correcto según fecha actual.

RECOMENDACIONES INTELIGENTES

El bot debe responder según necesidad:
- Dolor fuerte → Terapéutico, Punción seca, Terapia del dolor, Neural
- Estrés → Relajante, Piedras, Esferas
- Tensión muscular → Descontracturante, Terapia Física
- Piel → Faciales
- Relajación profunda → Reflexología, Auriculoterapia, Exfoliación

FLUJO DE CONVERSACIÓN

1. Saluda una sola vez SOLO si "Ya se saludó antes" es false. Si ya se saludó, omite el saludo completamente.
2. Pregunta necesidad con diagnóstico rápido:
   - "¿Tienes dolor o deseas relajación?"
   - "¿Qué zona del cuerpo duele o deseas tratar?"
   - "¿Intenso o suave?"
3. Recomienda servicio o combo ideal
4. Pide fecha y hora de preferencia
5. Ofrece separar con depósito calculado automáticamente
6. Confirma reserva con alegría

OBJECIONES

"Es caro" → Ofrecer combos y si es diciembre ofrecer promociones
"Estoy dudando" → Generar urgencia suave
"No quiero depósito" → Explicar que asegura el espacio y se descuenta
"Quiero para dos" → Sugerir Paquete Amor según fecha
"Quiero hablar con alguien" → Responder exactamente:
"Claro, te comunico con un asesor humano en un momento"
y el bot deja de hablar, no agrega nada más.

CONTEXTO DE LA CONVERSACIÓN:
- Estado actual: ${contextoUsuario.estado || "conversacion"}
- Nombre del usuario: ${contextoUsuario.nombre || "Usuario"}
- Tipo de consulta: ${contextoUsuario.tipoConsulta || "general"}
- Fecha actual: ${new Date().toLocaleDateString("es-PE", {
      timeZone: "America/Lima",
      year: "numeric",
      month: "long",
      day: "numeric",
    })}
- Ya se saludó antes: ${contextoUsuario.yaSaludo || false}

REGLA CRÍTICA SOBRE SALUDOS:
- Si "Ya se saludó antes" es true, NO debes saludar de nuevo. NO uses "Hola", "Buenos días", "Buenas tardes", ni ningún saludo.
- Si "Ya se saludó antes" es false, puedes saludar solo una vez.
- NUNCA repitas saludos en la misma conversación.

REGLA ANTI ALUCINACIÓN:
Si la IA no sabe algo responde:
"No tengo esa información exacta disponible, pero puedo consultar con un asesor humano si deseas."

Meta final del bot: resolver dudas, recomendar, cerrar reserva.`;

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
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== "") {
  try {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY.trim(),
    });
    logMessage("SUCCESS", "✅ OpenAI inicializado correctamente");
  } catch (error) {
    logMessage("ERROR", "Error al inicializar OpenAI", {
      error: error.message,
    });
    openai = null;
  }
} else {
  logMessage(
    "WARNING",
    "⚠️ OpenAI no disponible - OPENAI_API_KEY no configurada o está vacía"
  );
  logMessage(
    "INFO",
    "💡 Para habilitar OpenAI, configura la variable de entorno OPENAI_API_KEY"
  );
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

    // Solo eliminar archivos de lock, NO archivos de sesión importantes
    // Preferences puede contener datos de sesión, así que solo lo renombramos si está bloqueado
    const archivosBloqueados = [
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

// Verificar si hay una sesión guardada válida antes de renombrar
// Solo renombrar si Preferences está bloqueado Y no hay archivos de sesión importantes
if (!archivosLimpiados && fs.existsSync(preferencesPath)) {
  // Verificar si hay archivos de sesión importantes (como Local Storage)
  const sessionFiles = [
    path.join(defaultPath, "Local Storage"),
    path.join(defaultPath, "Session Storage"),
    path.join(defaultPath, "IndexedDB"),
  ];

  const hasSessionData = sessionFiles.some((file) => {
    try {
      return fs.existsSync(file) && fs.statSync(file).isDirectory();
    } catch {
      return false;
    }
  });

  if (!hasSessionData) {
    // Solo renombrar si no hay datos de sesión importantes
    try {
      const timestamp = Date.now();
      const backupPath = path.join(tokensPath, `Default.backup.${timestamp}`);
      if (fs.existsSync(defaultPath)) {
        fs.renameSync(defaultPath, backupPath);
        logMessage(
          "SUCCESS",
          `Carpeta Default renombrada (sin datos de sesión). El bot creara una nueva.`
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
  } else {
    logMessage(
      "INFO",
      "Sesión guardada encontrada. Manteniendo carpeta Default para preservar la sesión."
    );
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
      autoClose: false, // Mantener la sesión abierta
      disableWelcome: true, // Deshabilitar mensaje de bienvenida
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
        if (statusSession === "isLogged") {
          logMessage(
            "SUCCESS",
            "✅ Sesión iniciada correctamente - No necesitas escanear QR"
          );
        } else if (statusSession === "notLogged") {
          logMessage(
            "WARNING",
            "⚠️ Sesión no encontrada - Necesitas escanear el QR"
          );
        } else if (statusSession === "qrReadSuccess") {
          logMessage("SUCCESS", "✅ QR escaneado exitosamente");
        }
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
            autoClose: false, // Mantener la sesión abierta
            disableWelcome: true, // Deshabilitar mensaje de bienvenida
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

      // ============================================
      // VALIDACIÓN TEMPORAL PARA PRUEBAS
      // TODO: QUITAR ESTA VALIDACIÓN DESPUÉS DE PRUEBAS
      // ============================================
      if (MODO_PRUEBA) {
        const numeroUsuario = extraerNumero(userId);
        if (numeroUsuario !== NUMERO_PRUEBA && userId !== ADMIN_NUMBER) {
          logMessage(
            "INFO",
            `Mensaje ignorado en modo prueba - Número: ${numeroUsuario}`,
            {
              userId: userId,
              numero: numeroUsuario,
              esperado: NUMERO_PRUEBA,
            }
          );
          return; // Ignorar mensajes de otros números durante pruebas
        }
      }
      // ============================================

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
      // COMANDOS DEL ADMINISTRADOR
      // ============================================
      if (userId === ADMIN_NUMBER) {
        // Comando: Estadísticas
        if (
          textLower === "estadisticas" ||
          textLower === "stats" ||
          textLower === "estadísticas"
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

        // Comando: Desactivar IA
        if (
          fuzzyMatch(textLower, "desactivar ia") ||
          fuzzyMatch(textLower, "desactivar inteligencia artificial") ||
          textLower === "desactivar ia" ||
          textLower === "ia off" ||
          textLower === "desactivar ai"
        ) {
          iaGlobalDesactivada = true;
          try {
            await enviarMensajeSeguro(
              client,
              ADMIN_NUMBER,
              "✅ *IA Desactivada*\n\nLa inteligencia artificial ha sido desactivada globalmente.\n\nEl bot seguirá funcionando pero sin respuestas de IA.\n\nPara reactivarla, escribe: *Activar IA*"
            );
            logMessage(
              "INFO",
              "IA desactivada globalmente por el administrador"
            );
          } catch (error) {
            logMessage("ERROR", "Error al desactivar IA", {
              error: error.message,
            });
          }
          return;
        }

        // Comando: Activar IA
        if (
          fuzzyMatch(textLower, "activar ia") ||
          fuzzyMatch(textLower, "activar inteligencia artificial") ||
          textLower === "activar ia" ||
          textLower === "ia on" ||
          textLower === "activar ai"
        ) {
          iaGlobalDesactivada = false;
          try {
            await enviarMensajeSeguro(
              client,
              ADMIN_NUMBER,
              "✅ *IA Activada*\n\nLa inteligencia artificial ha sido reactivada globalmente.\n\nEl bot ahora puede usar IA para responder a los usuarios."
            );
            logMessage(
              "INFO",
              "IA reactivada globalmente por el administrador"
            );
          } catch (error) {
            logMessage("ERROR", "Error al activar IA", {
              error: error.message,
            });
          }
          return;
        }

        // Comando: Estado de IA
        if (
          fuzzyMatch(textLower, "estado ia") ||
          fuzzyMatch(textLower, "estado de la ia") ||
          textLower === "estado ia" ||
          textLower === "ia estado"
        ) {
          const estadoIA = iaGlobalDesactivada
            ? "❌ Desactivada"
            : "✅ Activada";
          try {
            await enviarMensajeSeguro(
              client,
              ADMIN_NUMBER,
              `📊 *Estado de la IA*\n\n${estadoIA}\n\nPara cambiar el estado:\n• *Desactivar IA* - Desactiva la IA globalmente\n• *Activar IA* - Reactiva la IA globalmente`
            );
            logMessage("INFO", "Estado de IA consultado por el administrador");
          } catch (error) {
            logMessage("ERROR", "Error al consultar estado de IA", {
              error: error.message,
            });
          }
          return;
        }

        // Comando: Desactivar bot para un usuario específico
        // Formato: "desactivar bot [número]" o "desactivar bot" (muestra lista)
        if (
          fuzzyMatch(textLower, "desactivar bot") ||
          textLower === "desactivar bot" ||
          textLower === "bot off" ||
          fuzzyMatch(textLower, "modo manual")
        ) {
          // Intentar extraer número del mensaje
          const numeroMatch = text.match(/(\d{9,12})/);

          if (numeroMatch) {
            // Si hay un número en el mensaje, desactivar para ese usuario
            const numeroBuscado = numeroMatch[1];
            let usuarioEncontrado = null;

            // Buscar el usuario por número
            for (const [uid, nombre] of Object.entries(userNames)) {
              const numeroUsuario = extraerNumero(uid);
              if (
                numeroUsuario === numeroBuscado ||
                numeroUsuario.includes(numeroBuscado)
              ) {
                usuarioEncontrado = uid;
                break;
              }
            }

            if (usuarioEncontrado) {
              usuariosBotDesactivado.add(usuarioEncontrado);
              humanModeUsers.add(usuarioEncontrado); // También agregar a modo asesor
              if (!userData[usuarioEncontrado])
                userData[usuarioEncontrado] = {};
              userData[usuarioEncontrado].iaDesactivada = true;
              userData[usuarioEncontrado].botDesactivadoPorAdmin = true;

              try {
                await enviarMensajeSeguro(
                  client,
                  ADMIN_NUMBER,
                  `✅ *Bot Desactivado*\n\nBot y IA desactivados para:\n👤 ${
                    userNames[usuarioEncontrado] || "Usuario"
                  }\n📱 ${extraerNumero(
                    usuarioEncontrado
                  )}\n\nSolo tú puedes responder ahora.\n\nPara reactivarlo, escribe: *Activar bot ${numeroBuscado}*`
                );
                logMessage(
                  "INFO",
                  `Bot desactivado para usuario ${
                    userNames[usuarioEncontrado]
                  } (${extraerNumero(usuarioEncontrado)}) por el administrador`
                );
              } catch (error) {
                logMessage("ERROR", "Error al desactivar bot", {
                  error: error.message,
                });
              }
            } else {
              try {
                await enviarMensajeSeguro(
                  client,
                  ADMIN_NUMBER,
                  `❌ *Usuario no encontrado*\n\nNo se encontró un usuario con el número: ${numeroBuscado}\n\nUsuarios en modo asesor:\n${
                    Array.from(humanModeUsers)
                      .map(
                        (uid, idx) =>
                          `${idx + 1}. ${
                            userNames[uid] || "Usuario"
                          } (${extraerNumero(uid)})`
                      )
                      .join("\n") || "Ninguno"
                  }`
                );
              } catch (error) {
                logMessage("ERROR", "Error al buscar usuario", {
                  error: error.message,
                });
              }
            }
          } else {
            // Si no hay número, mostrar lista de usuarios en modo asesor
            const usuariosEnAsesor = Array.from(humanModeUsers);
            if (usuariosEnAsesor.length > 0) {
              const listaUsuarios = usuariosEnAsesor
                .map((uid, idx) => {
                  const nombre = userNames[uid] || "Usuario";
                  const numero = extraerNumero(uid);
                  const estado = usuariosBotDesactivado.has(uid)
                    ? "🔴 Bot desactivado"
                    : "🟢 Bot activo";
                  return `${idx + 1}. ${nombre} (${numero}) - ${estado}`;
                })
                .join("\n");

              try {
                await enviarMensajeSeguro(
                  client,
                  ADMIN_NUMBER,
                  `📋 *Usuarios en modo asesor*\n\n${listaUsuarios}\n\nPara desactivar el bot para un usuario, escribe:\n*Desactivar bot [número]*\n\nEjemplo: *Desactivar bot 972002363*`
                );
              } catch (error) {
                logMessage("ERROR", "Error al mostrar lista de usuarios", {
                  error: error.message,
                });
              }
            } else {
              try {
                await enviarMensajeSeguro(
                  client,
                  ADMIN_NUMBER,
                  `ℹ️ *No hay usuarios en modo asesor*\n\nPara desactivar el bot para un usuario específico, escribe:\n*Desactivar bot [número]*\n\nEjemplo: *Desactivar bot 972002363*`
                );
              } catch (error) {
                logMessage("ERROR", "Error al mostrar mensaje", {
                  error: error.message,
                });
              }
            }
          }
          return;
        }

        // Comando: Activar bot para un usuario específico
        if (
          fuzzyMatch(textLower, "activar bot") ||
          textLower === "activar bot" ||
          textLower === "bot on" ||
          fuzzyMatch(textLower, "reactivar bot")
        ) {
          // Intentar extraer número del mensaje
          const numeroMatch = text.match(/(\d{9,12})/);

          if (numeroMatch) {
            const numeroBuscado = numeroMatch[1];
            let usuarioEncontrado = null;

            // Buscar el usuario por número
            for (const [uid, nombre] of Object.entries(userNames)) {
              const numeroUsuario = extraerNumero(uid);
              if (
                numeroUsuario === numeroBuscado ||
                numeroUsuario.includes(numeroBuscado)
              ) {
                usuarioEncontrado = uid;
                break;
              }
            }

            if (usuarioEncontrado) {
              usuariosBotDesactivado.delete(usuarioEncontrado);
              // Solo remover de humanModeUsers si fue agregado por el comando del admin
              // (no remover si está en modo asesor por otra razón)
              if (userData[usuarioEncontrado]?.botDesactivadoPorAdmin) {
                humanModeUsers.delete(usuarioEncontrado);
              }
              if (userData[usuarioEncontrado]) {
                userData[usuarioEncontrado].botDesactivadoPorAdmin = false;
                // Reactivar IA si fue desactivada solo por el comando del admin
                userData[usuarioEncontrado].iaDesactivada = false;
              }

              try {
                await enviarMensajeSeguro(
                  client,
                  ADMIN_NUMBER,
                  `✅ *Bot Reactivado*\n\nBot y IA reactivados para:\n👤 ${
                    userNames[usuarioEncontrado] || "Usuario"
                  }\n📱 ${extraerNumero(
                    usuarioEncontrado
                  )}\n\nEl bot ahora puede responder automáticamente.`
                );
                logMessage(
                  "INFO",
                  `Bot reactivado para usuario ${
                    userNames[usuarioEncontrado]
                  } (${extraerNumero(usuarioEncontrado)}) por el administrador`
                );
              } catch (error) {
                logMessage("ERROR", "Error al reactivar bot", {
                  error: error.message,
                });
              }
            } else {
              try {
                await enviarMensajeSeguro(
                  client,
                  ADMIN_NUMBER,
                  `❌ *Usuario no encontrado*\n\nNo se encontró un usuario con el número: ${numeroBuscado}`
                );
              } catch (error) {
                logMessage("ERROR", "Error al buscar usuario", {
                  error: error.message,
                });
              }
            }
          } else {
            try {
              await enviarMensajeSeguro(
                client,
                ADMIN_NUMBER,
                `ℹ️ *Activar Bot*\n\nPara reactivar el bot para un usuario específico, escribe:\n*Activar bot [número]*\n\nEjemplo: *Activar bot 972002363*`
              );
            } catch (error) {
              logMessage("ERROR", "Error al mostrar mensaje", {
                error: error.message,
              });
            }
          }
          return;
        }
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
          textLower === "estadísticas" ||
          fuzzyMatch(textLower, "desactivar ia") ||
          fuzzyMatch(textLower, "activar ia") ||
          fuzzyMatch(textLower, "estado ia") ||
          fuzzyMatch(textLower, "desactivar bot") ||
          fuzzyMatch(textLower, "activar bot");

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
      // DETECCIÓN DE SALUDOS (con control de tiempo desde última interacción)
      // ============================================
      const saludo = detectSaludo(textLower);
      const ahora = new Date();
      const ultimaInteraccion = userData[userId]?.ultimaInteraccion
        ? new Date(userData[userId].ultimaInteraccion)
        : null;

      // Tiempo mínimo entre saludos: 1 hora (3600000 ms)
      const tiempoMinimoEntreSaludos = 60 * 60 * 1000; // 1 hora
      const tiempoDesdeUltimaInteraccion = ultimaInteraccion
        ? ahora - ultimaInteraccion
        : Infinity; // Si no hay última interacción, es infinito (primera vez)

      // Actualizar última interacción
      if (!userData[userId]) userData[userId] = {};
      userData[userId].ultimaInteraccion = ahora.toISOString();

      if (saludo) {
        // Si es "hola" y ha pasado suficiente tiempo O es la primera vez
        if (saludo === "hola") {
          const puedeSaludar =
            !userData[userId]?.saludoEnviado ||
            tiempoDesdeUltimaInteraccion >= tiempoMinimoEntreSaludos;

          if (puedeSaludar) {
            // Marcar que ya se envió un saludo
            userData[userId].saludoEnviado = true;
            userData[userId].bienvenidaEnviada = true;

            // Establecer estado
            if (!userState[userId]) {
              userState[userId] = "conversacion";
            }

            const saludoHora = getSaludoPorHora();
            let respuesta = "";

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

            try {
              await enviarMensajeSeguro(client, userId, respuesta);
              logMessage("SUCCESS", `Saludo respondido a ${userName}`, {
                tipo: saludo,
                tiempoDesdeUltima:
                  Math.round(tiempoDesdeUltimaInteraccion / 1000 / 60) +
                  " minutos",
              });
            } catch (error) {
              logMessage("ERROR", "Error al responder saludo", {
                error: error.message,
              });
            }
            return;
          } else {
            // Si ya se saludó recientemente, no repetir saludo pero continuar con el flujo normal
            logMessage(
              "INFO",
              `Usuario ${userName} escribió "hola" pero ya fue saludado recientemente`,
              {
                tiempoDesdeUltima:
                  Math.round(tiempoDesdeUltimaInteraccion / 1000 / 60) +
                  " minutos",
              }
            );
            // No hacer return, dejar que continúe con el flujo normal (la IA puede responder)
          }
        } else if (saludo === "gracias") {
          const respuesta = getRespuestaVariada("gracias");
          await enviarMensajeSeguro(client, userId, respuesta);
          return;
        } else if (saludo === "adios") {
          const respuesta = getRespuestaVariada("adios");
          await enviarMensajeSeguro(client, userId, respuesta);
          return;
        } else {
          // Otros saludos (buenos días, buenas tardes, etc.)
          const puedeSaludar =
            !userData[userId]?.saludoEnviado ||
            tiempoDesdeUltimaInteraccion >= tiempoMinimoEntreSaludos;

          if (puedeSaludar) {
            userData[userId].saludoEnviado = true;
            const saludoHora = getSaludoPorHora();
            const respuesta = `${getSaludoPorHora()}! ${getRespuestaVariada(
              saludo
            )}`;
            await enviarMensajeSeguro(client, userId, respuesta);
            logMessage("SUCCESS", `Saludo respondido a ${userName}`, {
              tipo: saludo,
            });
            return;
          } else {
            // No repetir saludo si fue reciente
            return;
          }
        }
      }

      // ============================================
      // SI ESTÁ EN MODO RESERVA, verificar cancelación y tiempo PRIMERO
      // (antes de la verificación general de humanModeUsers)
      // ============================================
      if (userState[userId] === "reserva") {
        // Verificar si ha pasado suficiente tiempo desde que se activó el modo reserva
        const modoReservaDesde = userData[userId]?.modoReservaDesde
          ? new Date(userData[userId].modoReservaDesde)
          : null;
        const ahora = new Date();
        const tiempoMinimoDesactivacion = 24 * 60 * 60 * 1000; // 24 horas (1 día) en milisegundos
        const tiempoTranscurrido = modoReservaDesde
          ? ahora - modoReservaDesde
          : Infinity;

        // Si ha pasado el tiempo mínimo (1 día), reactivar automáticamente la IA
        if (
          modoReservaDesde &&
          tiempoTranscurrido >= tiempoMinimoDesactivacion
        ) {
          userState[userId] = null;
          humanModeUsers.delete(userId);
          if (userData[userId]) {
            userData[userId].iaDesactivada = false;
            delete userData[userId].modoReservaDesde;
          }
          logMessage(
            "INFO",
            `Modo reserva expirado para ${userName} - IA reactivada automáticamente después de ${Math.round(
              tiempoTranscurrido / 1000 / 60 / 60
            )} horas`
          );
          // No hacer return, dejar que continúe para que la IA pueda responder
        } else {
          // Permitir salir del modo reserva manualmente
          if (
            fuzzyMatch(textLower, "cancelar") ||
            fuzzyMatch(textLower, "volver") ||
            fuzzyMatch(textLower, "no quiero reservar")
          ) {
            userState[userId] = null;
            humanModeUsers.delete(userId);
            if (userData[userId]) {
              userData[userId].iaDesactivada = false;
              delete userData[userId].modoReservaDesde;
            }
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
          // Si está en modo reserva y no ha pasado el tiempo, no procesar más (el asesor maneja)
          const tiempoRestante = modoReservaDesde
            ? Math.round(
                (tiempoMinimoDesactivacion - tiempoTranscurrido) /
                  1000 /
                  60 /
                  60
              )
            : 24;
          logMessage(
            "INFO",
            `Usuario ${userName} está en modo reserva - IA desactivada (${tiempoRestante} horas restantes)`
          );
          return;
        }
      }

      // ============================================
      // SALIDA DEL MODO ASESOR (solo si está activo y NO en reserva)
      // ============================================
      if (humanModeUsers.has(userId)) {
        // Verificar si ha pasado suficiente tiempo desde que se activó el modo asesor
        const modoAsesorDesde = userData[userId]?.modoAsesorDesde
          ? new Date(userData[userId].modoAsesorDesde)
          : null;
        const ahora = new Date();
        const tiempoMinimoDesactivacion = 3 * 60 * 60 * 1000; // 3 horas en milisegundos
        const tiempoTranscurrido = modoAsesorDesde
          ? ahora - modoAsesorDesde
          : Infinity;

        // Si ha pasado el tiempo mínimo, reactivar automáticamente la IA
        if (
          modoAsesorDesde &&
          tiempoTranscurrido >= tiempoMinimoDesactivacion
        ) {
          humanModeUsers.delete(userId);
          if (userData[userId]) {
            userData[userId].iaDesactivada = false;
            delete userData[userId].modoAsesorDesde;
          }
          userState[userId] = null; // Limpiar estado
          logMessage(
            "INFO",
            `Modo asesor expirado para ${userName} - IA reactivada automáticamente después de ${Math.round(
              tiempoTranscurrido / 1000 / 60 / 60
            )} horas`
          );
          // No hacer return, dejar que continúe para que la IA pueda responder
        } else {
          // Si el usuario quiere volver a hablar con la IA manualmente
          if (
            fuzzyMatch(textLower, "bot") ||
            textLower === "bot" ||
            fuzzyMatch(textLower, "ia") ||
            fuzzyMatch(textLower, "inteligencia artificial")
          ) {
            humanModeUsers.delete(userId);
            if (userData[userId]) {
              userData[userId].iaDesactivada = false;
              delete userData[userId].modoAsesorDesde;
            }
            userState[userId] = null; // Limpiar estado
            try {
              await enviarMensajeSeguro(
                client,
                userId,
                "✅ Perfecto, estoy de vuelta para ayudarte. ¿En qué puedo asistirte? 😊"
              );
              logMessage(
                "SUCCESS",
                `Usuario ${userName} salió del modo asesor manualmente`
              );
            } catch (error) {
              logMessage("ERROR", `Error al confirmar salida del modo asesor`, {
                error: error.message,
              });
            }
            return;
          }
          // Si está en modo asesor y no ha pasado el tiempo, no procesar más (el asesor humano maneja)
          logMessage(
            "INFO",
            `Usuario ${userName} está en modo asesor - IA desactivada (${Math.round(
              (tiempoMinimoDesactivacion - tiempoTranscurrido) / 1000 / 60
            )} minutos restantes)`
          );
          return;
        }
      }

      // ============================================
      // DETECCIÓN: SOLICITUD DE ASESOR HUMANO
      // ============================================
      const palabrasAsesor = [
        "asesor",
        "asesor humano",
        "hablar con alguien",
        "quiero hablar con un agente",
        "quiero hablar con un representante",
        "representante",
        "agente",
        "humano",
        "persona",
        "hablar con una persona",
        "hablar con un humano",
        "quiero hablar con alguien",
        "necesito hablar con alguien",
        "atencion humana",
        "atención humana",
        "atencion personal",
        "atención personal",
      ];

      if (palabrasAsesor.some((palabra) => textLower.includes(palabra))) {
        humanModeUsers.add(userId);
        estadisticas.asesoresActivados++;
        userState[userId] = "asesor";

        // Guardar timestamp de cuando se activó el modo asesor
        if (!userData[userId]) userData[userId] = {};
        userData[userId].modoAsesorDesde = new Date().toISOString();
        userData[userId].iaDesactivada = true; // Marcar que la IA está desactivada

        logMessage(
          "INFO",
          `Usuario ${userName} solicitó hablar con asesor humano - IA desactivada por 3 horas`
        );

        // Enviar mensaje al usuario PRIMERO (más importante)
        try {
          await enviarMensajeSeguro(
            client,
            userId,
            "Por supuesto, estoy transfiriendo tu consulta a uno de nuestros representantes. Por favor espera un momento. 😊\n\n" +
              "Un asesor se pondrá en contacto contigo pronto."
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
            `🔔 *NUEVA SOLICITUD DE ASESOR*\n\n` +
              `👤 *Usuario:* ${userName}\n` +
              `📱 *Número:* ${extraerNumero(userId)}\n` +
              `💬 *Mensaje:* "${text.substring(0, 100)}${
                text.length > 100 ? "..." : ""
              }"\n\n` +
              `⚠️ El bot dejará de responder automáticamente a este usuario.\n` +
              `✅ Puedes atenderlo directamente desde aquí.`
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

      // Verificar si el bot está desactivado para este usuario por el admin
      if (usuariosBotDesactivado.has(userId)) {
        logMessage(
          "INFO",
          `Usuario ${userName} tiene bot desactivado por admin - Bot no responde`
        );
        return; // El admin maneja este chat completamente
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

        // Guardar timestamp de cuando se activó el modo reserva
        if (!userData[userId]) userData[userId] = {};
        userData[userId].modoReservaDesde = new Date().toISOString();
        userData[userId].iaDesactivada = true; // Marcar que la IA está desactivada

        logMessage(
          "INFO",
          `Usuario ${userName} solicitó reserva - IA desactivada por 24 horas`
        );

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

      // Mensaje de bienvenida para nuevos usuarios (solo si no tiene estado y no se ha enviado bienvenida)
      // NOTA: Esta sección solo se ejecuta si NO se detectó un saludo arriba
      // y ha pasado suficiente tiempo desde la última interacción
      const tiempoDesdeUltimaInteraccionBienvenida = ultimaInteraccion
        ? ahora - ultimaInteraccion
        : Infinity;
      const tiempoMinimoParaBienvenida = 60 * 60 * 1000; // 1 hora

      if (
        !userState[userId] &&
        !userData[userId]?.bienvenidaEnviada &&
        !saludo &&
        tiempoDesdeUltimaInteraccionBienvenida >= tiempoMinimoParaBienvenida
      ) {
        userData[userId].bienvenidaEnviada = true;
        userData[userId].saludoEnviado = true; // Marcar también saludo para evitar duplicados
        logMessage(
          "INFO",
          `Nuevo usuario detectado o usuario que regresa después de tiempo: ${userName}`
        );

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
      // También verificar que la IA no esté desactivada por tiempo o globalmente
      const iaDesactivadaUsuario = userData[userId]?.iaDesactivada === true;
      const estaEnReserva = userState[userId] === "reserva";
      const estaEnAsesor = humanModeUsers.has(userId);
      const puedeUsarIA =
        !estaEnReserva &&
        !estaEnAsesor &&
        !iaDesactivadaUsuario &&
        !iaGlobalDesactivada; // Verificar también desactivación global

      if (puedeUsarIA) {
        const contextoUsuario = {
          estado: userState[userId] || "conversacion",
          nombre: userName,
          yaSaludo: userData[userId]?.saludoEnviado || false,
        };

        const respuestaIA = await consultarIA(text, contextoUsuario);

        if (respuestaIA) {
          // Si ya se saludó antes, limpiar saludos de la respuesta de la IA
          let respuestaFinal = respuestaIA;
          if (userData[userId]?.saludoEnviado) {
            // Eliminar saludos comunes del inicio de la respuesta
            respuestaFinal = respuestaIA
              .replace(/^(Hola,?\s*[^.!?]*[.!?]\s*)/i, "")
              .replace(/^(Buenos días,?\s*[^.!?]*[.!?]\s*)/i, "")
              .replace(/^(Buenas tardes,?\s*[^.!?]*[.!?]\s*)/i, "")
              .replace(/^(Buenas noches,?\s*[^.!?]*[.!?]\s*)/i, "")
              .replace(/^(Hola\s+[^.!?]*[.!?]\s*)/i, "")
              .trim();

            // Si después de limpiar queda vacío o muy corto, usar la respuesta original
            if (respuestaFinal.length < 10) {
              respuestaFinal = respuestaIA;
            }
          }

          // Si la IA respondió, usar su respuesta
          await enviarMensajeSeguro(client, userId, respuestaFinal);
          logMessage("SUCCESS", `Respuesta de IA enviada a ${userName}`);
          return; // Importante: hacer return para no continuar
        }
      } else if (iaDesactivada) {
        // Si la IA está desactivada, no responder nada (el asesor maneja)
        const motivo = estaEnReserva ? "modo reserva" : "modo asesor";
        logMessage("INFO", `IA desactivada para ${userName} - En ${motivo}`);
        return;
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
