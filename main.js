require("dotenv").config();

// ============================================
// INICIALIZAR SERVIDOR HTTP LO MÁS PRONTO POSIBLE
// ============================================
// CRÍTICO: Railway necesita que el servidor responda inmediatamente
// Inicializamos el servidor ANTES de cargar otros módulos pesados
const http = require('http');

// Variables globales para el servidor QR (deben estar antes de cualquier otra cosa)
let qrServer = null;
let currentQRData = null;
let currentQRUrl = null;

// Función para inicializar el servidor HTTP (debe estar definida temprano)
function inicializarServidorQR() {
  const port = process.env.PORT || 3000;
  
  if (!port || port === '0') {
    // Error se logueará después de cargar módulos
    return;
  }

  if (qrServer) {
    return;
  }

  try {
    qrServer = http.createServer((req, res) => {
      try {
        if (req.url === '/qr' || req.url === '/') {
          if (currentQRData) {
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(currentQRData)}`;
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>QR Code - Essenza Bot</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <meta http-equiv="refresh" content="5">
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                  }
                  .container {
                    text-align: center;
                    background: rgba(255,255,255,0.1);
                    padding: 30px;
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    max-width: 600px;
                  }
                  h1 { margin-top: 0; }
                  img {
                    max-width: 500px;
                    width: 100%;
                    border: 5px solid white;
                    border-radius: 10px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                  }
                  .url {
                    margin-top: 20px;
                    padding: 15px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 10px;
                    word-break: break-all;
                  }
                  a {
                    color: #fff;
                    text-decoration: underline;
                  }
                  .info {
                    margin-top: 20px;
                    font-size: 14px;
                    opacity: 0.8;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>📱 Escanea este QR con WhatsApp</h1>
                  <img src="${qrApiUrl}" alt="QR Code">
                  ${currentQRUrl ? `<div class="url"><strong>URL:</strong><br><a href="${currentQRUrl}" target="_blank">${currentQRUrl}</a></div>` : ''}
                  <p style="margin-top: 20px;">Escanea el código QR con WhatsApp para conectar el bot</p>
                  <p class="info">Esta página se actualiza automáticamente cada 5 segundos</p>
                </div>
              </body>
              </html>
            `);
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>QR Code - Essenza Bot</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <meta http-equiv="refresh" content="5">
                <style>
                  body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                  }
                  .container {
                    text-align: center;
                    background: rgba(255,255,255,0.1);
                    padding: 30px;
                    border-radius: 20px;
                    backdrop-filter: blur(10px);
                    max-width: 600px;
                  }
                  .spinner {
                    border: 4px solid rgba(255,255,255,0.3);
                    border-top: 4px solid white;
                    border-radius: 50%;
                    width: 50px;
                    height: 50px;
                    animation: spin 1s linear infinite;
                    margin: 20px auto;
                  }
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>⏳ Esperando QR Code...</h1>
                  <div class="spinner"></div>
                  <p>El bot se está iniciando. El QR aparecerá aquí cuando esté listo.</p>
                  <p style="margin-top: 20px; font-size: 14px; opacity: 0.8;">Esta página se actualiza automáticamente</p>
                </div>
              </body>
              </html>
            `);
          }
        } else if (req.url === '/qr-image' && currentQRData) {
          // Endpoint que devuelve SOLO la imagen del QR (sin HTML)
          const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(currentQRData)}`;
          // Redirigir directamente a la imagen
          res.writeHead(302, { 'Location': qrImageUrl });
          res.end();
        } else if (req.url === '/qr-url' && currentQRData) {
          // Endpoint que devuelve la URL del QR en texto plano
          const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(currentQRData)}`;
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(qrImageUrl);
        } else if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'ok', 
            qrAvailable: !!currentQRData,
            qrUrl: currentQRData ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(currentQRData)}` : null
          }));
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      } catch (reqError) {
        console.error("Error procesando petición:", reqError);
        try {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        } catch (resError) {
          res.destroy();
        }
      }
    });

    qrServer.listen(port, '0.0.0.0', () => {
      const railwayUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : null;
      
      // logMessage se cargará después, loguear cuando esté disponible
      if (typeof logMessage === 'function') {
      // logMessage se cargará después, loguear cuando esté disponible
      if (typeof logMessage === 'function') {
        logMessage("INFO", `Servidor HTTP iniciado en puerto ${port}`, { 
          url: railwayUrl || `localhost:${port}`,
          hasPublicDomain: !!railwayUrl
        });
      }
      }
    });

    qrServer.on('error', (err) => {
      if (typeof logMessage === 'function') {
        if (err.code === 'EADDRINUSE') {
          logMessage("WARNING", `Puerto ${port} ya en uso`);
        } else {
          logMessage("ERROR", "Error en servidor HTTP", { error: err.message });
        }
      }
    });

  } catch (serverError) {
    if (typeof logMessage === 'function') {
      logMessage("ERROR", "Error crítico al iniciar servidor HTTP", { error: serverError.message });
    }
  }
}

// INICIALIZAR SERVIDOR INMEDIATAMENTE
inicializarServidorQR();

// Ahora cargar el resto de los módulos
const wppconnect = require("@wppconnect-team/wppconnect");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");
// OpenAI y PQueue ahora están en handlers/ai.js

// ============================================
// MÓDULOS
// ============================================
const config = require('./config');
const servicios = require('./data/services');
const { logMessage, rotarLogs } = require('./utils/logger');
const { 
  validarFormatoUserId, 
  validarFecha, 
  validarServicio, 
  sanitizarMensaje, 
  sanitizarDatosParaLog,
  obtenerHorarioDelDia,
  fuzzyMatch
} = require('./utils/validators');
const persistence = require('./services/persistence');
const storage = require('./services/storage');
const db = require('./services/database');

// ============================================
// HANDLERS MODULARES
// ============================================
const adminHandler = require('./handlers/admin');
const clientHandler = require('./handlers/client');
const reservationHandler = require('./handlers/reservation');
const clientCommandsHandler = require('./handlers/clientCommands');
const autoConfirmationHandler = require('./handlers/autoConfirmation');
const imageHandler = require('./handlers/image');
const aiHandler = require('./handlers/ai');
const remindersHandler = require('./handlers/reminders');
const { enviarMensajeSeguro, extraerNumero, inicializarUsuario, extractName } = require('./handlers/messageHelpers');
const { getSaludoPorHora, getRespuestaVariada, detectSaludo } = require('./utils/responses');

// ============================================
// CONFIGURACIÓN (desde módulo)
// ============================================
const ADMIN_NUMBER = config.ADMIN_NUMBER; // Mantener para compatibilidad
const ADMIN_NUMBERS = config.ADMIN_NUMBERS; // Array de todos los administradores (con @c.us y @lid)
const ADMIN_NUMBERS_SIN_SUFIJO = config.ADMIN_NUMBERS_SIN_SUFIJO || []; // Array de números sin sufijo para comparaciones
const HORARIO_ATENCION = config.HORARIO_ATENCION;
const YAPE_NUMERO = config.YAPE_NUMERO;
const YAPE_TITULAR = config.YAPE_TITULAR;
const BANCO_CUENTA = config.BANCO_CUENTA;
const UBICACION = config.UBICACION;
const MAPS_LINK = config.MAPS_LINK;
const DEPOSITO_RESERVA = config.DEPOSITO_RESERVA;
const LOG_LEVEL = config.LOG_LEVEL;
const MAX_RESERVAS = config.MAX_RESERVAS;

// Inicializar servidor HTTP ahora que logMessage está disponible
if (typeof inicializarServidorQR === 'function' && !qrServer) {
  inicializarServidorQR();
}

// ============================================
// ESTADO DEL BOT (usando StorageService optimizado)
// ============================================
// Nota: StorageService usa Map/Set para búsquedas O(1)
// Acceso a través de storage.getUserState(), storage.getUserData(), etc.

// Control de IA global (solo admin puede activar/desactivar)
let iaGlobalDesactivada = false;

// Control de rate limiting para OpenAI ahora está en handlers/ai.js

// Array para guardar referencias de intervalos y limpiarlos al salir
const intervals = [];

// Estadísticas del bot
let estadisticas;

// Servidor HTTP para QR - Ya inicializado al inicio del archivo
// (las variables están definidas arriba)

// Cargar estado persistido al iniciar
let estadisticasCargadas = persistence.cargarEstadisticas();
if (estadisticasCargadas) {
  estadisticas = {
    usuariosAtendidos: new Set(estadisticasCargadas.usuariosAtendidos || []),
    totalMensajes: estadisticasCargadas.totalMensajes || 0,
    reservasSolicitadas: estadisticasCargadas.reservasSolicitadas || 0,
    asesoresActivados: estadisticasCargadas.asesoresActivados || 0,
    inicio: estadisticasCargadas.inicio ? new Date(estadisticasCargadas.inicio) : new Date(),
  };
} else {
  estadisticas = {
  usuariosAtendidos: new Set(),
  totalMensajes: 0,
  reservasSolicitadas: 0,
  asesoresActivados: 0,
  inicio: new Date(),
};
}

// Cargar reservas persistidas
const reservasCargadas = persistence.cargarReservas();
if (reservasCargadas && reservasCargadas.length > 0) {
  storage.reservas = reservasCargadas.map(r => ({
    ...r,
    fechaHora: new Date(r.fechaHora),
    creada: new Date(r.creada),
  }));
  logMessage("INFO", `Cargadas ${reservasCargadas.length} reservas desde persistencia`);
}

// Cargar userData persistido
const userDataCargado = persistence.cargarUserData();
if (userDataCargado) {
  for (const [userId, data] of Object.entries(userDataCargado)) {
    storage.setUserData(userId, data);
  }
  logMessage("INFO", `Cargados datos de ${Object.keys(userDataCargado).length} usuarios desde persistencia`);
}

// ============================================
// SERVICIOS DETALLADOS (desde módulo data/services.js)
// ============================================
// Los servicios ahora se cargan desde el módulo

// ============================================
// FUNCIONES AUXILIARES
// ============================================
// Las funciones auxiliares ahora están en los handlers modulares
// Usar referencias a los handlers:
const esAdministrador = adminHandler.esAdministrador;

// Función helper para inicializar objetos de usuario (usando storage)
// Ahora está en handlers/messageHelpers.js - usar inicializarUsuario importado arriba

// Función para calcular tokens aproximados (1 token ≈ 4 caracteres)
function calcularTokens(mensaje) {
  if (!mensaje || typeof mensaje !== 'string') return 0;
  return Math.ceil(mensaje.length / 4);
}

// Función para limitar historial por tokens (no solo cantidad)
function limitarHistorialPorTokens(historial, maxTokens = 2000) {
  let tokensAcumulados = 0;
  const historialLimitado = [];
  
  // Recorrer desde el final (mensajes más recientes primero)
  for (let i = historial.length - 1; i >= 0; i--) {
    const tokens = calcularTokens(historial[i].content || '');
    if (tokensAcumulados + tokens > maxTokens) break;
    tokensAcumulados += tokens;
    historialLimitado.unshift(historial[i]);
  }
  
  return historialLimitado;
}

// Fuzzy matching ahora está en utils/validators.js

// Funciones de respuestas y helpers ahora están en los handlers modulares
// detectSaludo, getSaludoPorHora, getRespuestaVariada están en utils/responses.js
// extractName está en handlers/messageHelpers.js

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

// Función para detectar intención de reserva ahora está en handlers/reservation.js
const detectarIntencionReserva = reservationHandler.detectarIntencionReserva;

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
// Ahora está en handlers/ai.js
const consultarIA = aiHandler.consultarIA;

// MAX_RESERVAS ya está definido en config

// Funciones validarFecha y validarServicio ahora vienen del módulo utils/validators

// Funciones de recordatorios ahora están en handlers/reminders.js
const guardarReserva = remindersHandler.guardarReserva;
const verificarRecordatorios = remindersHandler.verificarRecordatorios;

// Funciones ahora están en los handlers modulares
const consultarDisponibilidad = reservationHandler.consultarDisponibilidad;
const formatearHorariosDisponibles = reservationHandler.formatearHorariosDisponibles;
const obtenerEstadisticas = adminHandler.obtenerEstadisticas;
const obtenerCitasDelDia = adminHandler.obtenerCitasDelDia;

// ============================================
// INICIALIZACIÓN DE OPENAI (se inicializará después de definir logMessage)
// ============================================
// openai ahora está en handlers/ai.js

// ============================================
// SISTEMA DE LOGS (desde módulo utils/logger.js)
// ============================================
// logMessage y rotarLogs ahora vienen del módulo

// ============================================
// FUNCIÓN HELPER PARA ENVIAR MENSAJES DE FORMA SEGURA
// ============================================
// Funciones ahora están en handlers/messageHelpers.js
// extraerNumero y enviarMensajeSeguro ya están importadas arriba

// ============================================
// FUNCIONES PARA PROCESAR IMÁGENES CON OPENAI VISION
// ============================================
// Funciones ahora están en handlers/image.js
const procesarImagenCita = imageHandler.procesarImagenCita;

// Funciones rotarLogs y logMessage ahora vienen del módulo utils/logger.js

// Inicializar OpenAI usando el handler
aiHandler.inicializarOpenAI();

// ============================================
// FUNCIÓN PARA LIMPIAR ARCHIVOS BLOQUEADOS
// ============================================
async function limpiarArchivosBloqueados() {
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
                await new Promise(resolve => setTimeout(resolve, waitTime));
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
        logMessage("WARNING", "Error al procesar archivo individual (no crítico)", {
          error: error.message,
          archivo: archivo
        });
      }
    }

    // Intentar liberar Preferences si está bloqueado
    if (fs.existsSync(preferencesPath)) {
      let preferencesLiberado = false;
      
      // Primero verificar si está bloqueado intentando leerlo
      try {
        const fd = fs.openSync(preferencesPath, 'r+');
        fs.closeSync(fd);
        preferencesLiberado = true;
      } catch (accessError) {
        // Está bloqueado, intentar liberarlo
        logMessage("INFO", "Preferences está bloqueado, intentando liberarlo...");
        
        // Intentar renombrar con múltiples intentos
        for (let i = 0; i < 10; i++) {
          try {
            const backupPath = preferencesPath + ".backup." + Date.now();
            fs.renameSync(preferencesPath, backupPath);
            logMessage("SUCCESS", "Preferences renombrado como backup y liberado");
            limpiados++;
            preferencesLiberado = true;
            break;
          } catch (err) {
            if (i < 9) {
              // Esperar progresivamente más tiempo en cada intento
              const waitTime = (i + 1) * 500;
              await new Promise(resolve => setTimeout(resolve, waitTime));
            } else {
              logMessage(
                "WARNING",
                "No se pudo liberar Preferences después de 10 intentos. El archivo puede estar bloqueado por otro proceso."
              );
              logMessage("INFO", "Sugerencia: Cierra todas las instancias de Chrome/Chromium y reinicia el bot.");
            }
          }
        }
      }
      
      // Si no se pudo liberar, esperar un poco más antes de continuar
      if (!preferencesLiberado) {
        logMessage("INFO", "Esperando 3 segundos adicionales para que se libere Preferences...");
        await new Promise(resolve => setTimeout(resolve, 3000));
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

// Limpiar archivos bloqueados antes de iniciar (esperar a que termine)
logMessage("INFO", "Verificando y limpiando archivos bloqueados...");
(async () => {
  try {
    const limpiado = await limpiarArchivosBloqueados();
    if (limpiado) {
      logMessage("INFO", "Esperando 2 segundos adicionales para asegurar que los archivos se liberen...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    logMessage("INFO", "Iniciando bot...");
    iniciarBot();
  } catch (error) {
    logMessage("WARNING", "Error al limpiar archivos bloqueados (no crítico)", {
      error: error.message
    });
    // Intentar iniciar de todas formas después de un delay
    setTimeout(() => {
      logMessage("INFO", "Iniciando bot después de limpieza...");
      iniciarBot();
    }, 3000);
  }
})();

// Verificar si el directorio está bloqueado
const tokensPath = path.join(__dirname, "tokens", "essenza-bot");
const defaultPath = path.join(tokensPath, "Default");
const preferencesPath = path.join(defaultPath, "Preferences");

// Variable para almacenar la ruta del user-data-dir
// SIEMPRE usar el mismo directorio para mantener la sesión persistente
let userDataDir = path.join(__dirname, "tokens", "essenza-bot");

// Verificar si existe una sesión guardada válida
function verificarSesionGuardada() {
  const sessionFiles = [
    path.join(defaultPath, "Local Storage"),
    path.join(defaultPath, "Session Storage"),
    path.join(defaultPath, "IndexedDB"),
    path.join(defaultPath, "Cookies"),
  ];

  const hasValidSession = sessionFiles.some((file) => {
    try {
      return fs.existsSync(file);
    } catch {
      return false;
    }
  });

  return hasValidSession;
}

// Función para verificar si Preferences está bloqueado
function verificarPreferencesBloqueado() {
  if (!fs.existsSync(preferencesPath)) {
    return false;
  }
  
  try {
    // Intentar abrir el archivo en modo de escritura para verificar si está bloqueado
    const fd = fs.openSync(preferencesPath, 'r+');
    fs.closeSync(fd);
    return false; // No está bloqueado
  } catch (accessError) {
    // Si no se puede abrir, está bloqueado
    return true;
  }
}

// Función para crear carpeta temporal
function crearCarpetaTemporal() {
  const timestamp = Date.now();
  const tempSessionName = `essenza-bot-temp-${timestamp}`;
  const tempTokensPath = path.join(__dirname, "tokens", tempSessionName);
  
  // Crear carpeta temporal si no existe
  if (!fs.existsSync(tempTokensPath)) {
    fs.mkdirSync(tempTokensPath, { recursive: true });
  }
  
  sessionName = tempSessionName;
  userDataDir = tempTokensPath;
  
  logMessage(
    "WARNING",
    `Usando carpeta temporal: ${tempSessionName}. La sesión puede no persistir.`
  );
  
  return true;
}

// Verificar si existe una sesión guardada válida ANTES de hacer cualquier cambio
const tieneSesionGuardada = verificarSesionGuardada();
const preferencesBloqueado = verificarPreferencesBloqueado();

if (tieneSesionGuardada && !preferencesBloqueado) {
  logMessage(
    "SUCCESS",
    "✅ Sesión guardada encontrada. El bot se conectará automáticamente sin necesidad de escanear QR."
  );
  // Asegurar que usamos el directorio correcto
  sessionName = "essenza-bot";
  userDataDir = path.join(__dirname, "tokens", "essenza-bot");
} else if (preferencesBloqueado) {
  // Si Preferences está bloqueado, usar carpeta temporal
  logMessage(
    "WARNING",
    "Preferences está bloqueado. Usando carpeta temporal para evitar errores."
  );
  crearCarpetaTemporal();
} else {
  logMessage(
    "INFO",
    "No se encontró sesión guardada. Necesitarás escanear el QR la primera vez."
  );
  // Usar el directorio estándar para mantener la sesión
  sessionName = "essenza-bot";
  userDataDir = path.join(__dirname, "tokens", "essenza-bot");
  
  // Asegurar que el directorio existe
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
}

// La función inicializarServidorQR() ya está definida e inicializada al inicio del archivo
// No es necesario duplicarla aquí

// La función iniciarBot() ahora se llama desde la limpieza de archivos
// No es necesario llamarla aquí también

function iniciarBot() {
  wppconnect
    .create({
      session: sessionName,
      autoClose: false, // Mantener la sesión abierta
      disableWelcome: true, // Deshabilitar mensaje de bienvenida
      multiDevice: true, // Habilitar modo multi-dispositivo para mejor persistencia
      folderNameToken: 'tokens', // Directorio donde se guardan los tokens
      mkdirFolderToken: '', // No crear subdirectorio adicional
      catchQR: async (base64Qr, asciiQR, attempts, urlCode) => {
        console.clear();
        console.log("\n" + "=".repeat(70));
        console.log("📱 ESCANEA ESTE QR CON WHATSAPP");
        console.log("=".repeat(70) + "\n");

        let qrData = null;
        let qrUrl = null;

        try {
          // Determinar qué datos usar para el QR
          if (urlCode && typeof urlCode === "string") {
            qrData = urlCode;
            qrUrl = urlCode;
          } else if (
              base64Qr &&
              typeof base64Qr === "string" &&
            (base64Qr.includes("http") || base64Qr.length > 100)
          ) {
            const urlMatch = base64Qr.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
              qrData = urlMatch[0];
              qrUrl = urlMatch[0];
            } else {
              qrData = base64Qr;
            }
          } else if (
            base64Qr &&
            typeof base64Qr === "string" &&
            base64Qr.length < 1000 &&
            !base64Qr.includes("{") &&
            !base64Qr.includes("http")
          ) {
            qrData = base64Qr;
          }

          // Mostrar QR en consola (ASCII) - MEJORADO
          console.log("\n" + "█".repeat(70));
          console.log("█" + " ".repeat(68) + "█");
          if (asciiQR && typeof asciiQR === "string" && asciiQR.length > 0) {
            const lines = asciiQR.split('\n');
            lines.forEach(line => {
              const lineLength = line.length;
              const paddingLeft = 20;
              const paddingRight = Math.max(0, 68 - paddingLeft - lineLength);
              console.log("█" + " ".repeat(paddingLeft) + line + " ".repeat(paddingRight) + "█");
            });
          } else if (qrData) {
            qrcode.generate(qrData, {
              small: false,
              type: "terminal",
              errorCorrectionLevel: "M",
            });
          }
          console.log("█" + " ".repeat(68) + "█");
          console.log("█".repeat(70) + "\n");

          // Actualizar QR en el servidor (si existe)
          if (qrData) {
            try {
              // Actualizar variables globales con el nuevo QR
              currentQRData = qrData;
              currentQRUrl = qrUrl;
              
              // Generar URL directa del QR usando qr-server.com
              const qrDirectUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrData)}`;
              
              console.log("\n" + "=".repeat(70));
              console.log("✅ QR CODE GENERADO");
              console.log("=".repeat(70));
              
              // URL directa del QR (más simple)
              console.log("\n🔗 URL DIRECTA DEL QR (COPIA Y PEGA EN TU NAVEGADOR):");
              console.log("   " + qrDirectUrl);
              
              console.log("\n" + "=".repeat(70));
              console.log("💡 Copia y pega esa URL en tu navegador para ver el QR");
              console.log("=".repeat(70) + "\n");
              
              logMessage("INFO", "QR generado", { 
                qrDirectUrl: qrDirectUrl,
                hasServer: !!qrServer
              });
            } catch (qrError) {
              logMessage("WARNING", "No se pudo actualizar QR", { error: qrError.message });
            }
          }
        } catch (error) {
          logMessage("ERROR", "Error al generar QR visual", {
            error: error.message.substring(0, 100),
          });
        }

        logMessage("INFO", `QR generado - Intento ${attempts || 1}`, null);
      },
      statusFind: (statusSession, session) => {
        if (statusSession === "isLogged") {
          console.log("\n✅ SESIÓN INICIADA - Bot conectado y listo\n");
          logMessage("SUCCESS", "Sesión iniciada correctamente - No necesitas escanear QR");
          // Limpiar QR del servidor cuando la sesión está activa
          currentQRData = null;
          currentQRUrl = null;
        } else if (statusSession === "notLogged") {
          logMessage("INFO", "Sesión no encontrada - Necesitas escanear el QR");
        } else if (statusSession === "qrReadSuccess") {
          console.log("\n✅ QR ESCANEADO EXITOSAMENTE - Apareamiento completado\n");
          logMessage("SUCCESS", "QR escaneado exitosamente - Apareamiento completado");
          // Limpiar QR del servidor después de escanear
          currentQRData = null;
          currentQRUrl = null;
        } else if (statusSession === "chatsAvailable") {
          logMessage("INFO", "Chats disponibles - Sesión activa");
        } else if (LOG_LEVEL === 'verbose' || LOG_LEVEL === 'debug') {
          logMessage("INFO", `Estado de sesión: ${statusSession}`, { session });
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
              "--user-data-dir=" + userDataDir,
        "--disable-file-system",
      ],
      // Usar Chromium del sistema si está disponible
      executablePath:
        process.env.CHROMIUM_PATH || process.env.CHROME_BIN || undefined,
    })
    .then((client) => {
      clientInstance = client;
      if (LOG_LEVEL === 'verbose' || LOG_LEVEL === 'debug') {
        logMessage("INFO", "Cliente de WhatsApp creado");
      }
      start(client);
    })
    .catch((error) => {
      logMessage("ERROR", "Error al crear cliente", { error: error.message });

      // Si el error es EPERM (permisos) o Protocol error, usar carpeta temporal
      if (
        error.message &&
        (error.message.includes("EPERM") ||
          error.message.includes("operation not permitted") ||
          error.message.includes("Protocol error") ||
          error.message.includes("Session closed"))
      ) {
        logMessage(
          "WARNING",
          "Error de permisos o sesión cerrada detectado. Cambiando a carpeta temporal..."
        );

        // Intentar limpiar primero
        (async () => {
          try {
            await limpiarArchivosBloqueados();
            
            // Verificar si Preferences sigue bloqueado después de limpiar
            const sigueBloqueado = verificarPreferencesBloqueado();
            
            if (sigueBloqueado) {
              logMessage(
                "WARNING",
                "Preferences sigue bloqueado después de limpiar. Usando carpeta temporal."
              );
              crearCarpetaTemporal();
            } else {
              logMessage("INFO", "Preferences liberado. Usando carpeta estándar.");
              sessionName = "essenza-bot";
              userDataDir = path.join(__dirname, "tokens", "essenza-bot");
            }
            
            logMessage("INFO", "Esperando 3 segundos antes de reintentar...");
            await new Promise(resolve => setTimeout(resolve, 3000));
            logMessage("INFO", "Reintentando iniciar bot...");
            iniciarBot();
          } catch (cleanupError) {
            logMessage("ERROR", "Error al limpiar archivos", { error: cleanupError.message });
            logMessage("WARNING", "Usando carpeta temporal como solución alternativa.");
            crearCarpetaTemporal();
            
            setTimeout(() => {
              logMessage("INFO", "Reintentando iniciar bot con carpeta temporal...");
              iniciarBot();
            }, 3000);
          }
        })();
        return; // No continuar con el timeout de reconexión aquí
      }

      // Intentar reconectar después de 10 segundos
      setTimeout(() => {
        logMessage("INFO", "Intentando reconectar...");
        // Limpiar archivos antes de reintentar
        (async () => {
          await limpiarArchivosBloqueados();
        setTimeout(() => {
          iniciarBot();
        }, 2000);
        })();
      }, 10000);
    });
}

// ============================================
// FUNCIÓN PRINCIPAL DEL BOT
// ============================================
async function start(client) {
  // Inicializar base de datos SQLite
  try {
    await db.inicializarDB();
    logMessage("SUCCESS", "Base de datos SQLite inicializada");
    
    // Sincronizar flags con SQLite al iniciar
    try {
      const flagBotActivo = await db.obtenerConfiguracion('flag_bot_activo');
      const flagIAActivada = await db.obtenerConfiguracion('flag_ia_activada');
      
      if (flagBotActivo === '0') {
        logMessage("INFO", "Bot desactivado globalmente (flag_bot_activo = 0)");
      }
      
      if (flagIAActivada === '0') {
        iaGlobalDesactivada = true;
        logMessage("INFO", "IA desactivada globalmente (flag_ia_activada = 0)");
      } else if (flagIAActivada === '1') {
        iaGlobalDesactivada = false;
        logMessage("INFO", "IA activada globalmente (flag_ia_activada = 1)");
      }
    } catch (error) {
      logMessage("WARNING", "Error al sincronizar flags con SQLite, usando valores por defecto", {
        error: error.message
      });
    }
  } catch (error) {
    logMessage("ERROR", "Error al inicializar base de datos", {
      error: error.message
    });
  }
  
  // OpenAI se inicializa en handlers/ai.js
  logMessage("INFO", "IA disponible a través de handlers/ai.js");
  
  logMessage("SUCCESS", "Bot iniciado y listo");

  // Sistema de recordatorios (cada hora)
  const intervalRecordatorios = setInterval(() => {
    verificarRecordatorios(client);
  }, 60 * 60 * 1000);
  intervals.push(intervalRecordatorios);

  // Rotación de logs (cada 24 horas)
  const intervalRotacionLogs = setInterval(() => {
    rotarLogs();
  }, 24 * 60 * 60 * 1000);
  intervals.push(intervalRotacionLogs);

  // Rotar logs al iniciar
  rotarLogs();

  // Verificar recordatorios al iniciar
  setTimeout(() => verificarRecordatorios(client), 5000);

  // Manejo de desconexión y reconexión
  client.onStateChange((state) => {
    if (LOG_LEVEL === 'verbose') {
    logMessage("INFO", `Estado del cliente cambiado: ${state}`);
    }
    if (state === "CLOSE" || state === "DISCONNECTED") {
      logMessage("WARNING", "Bot desconectado. Intentando reconectar...");
      setTimeout(() => {
        wppconnect
          .create({
            session: sessionName,
            autoClose: false, // Mantener la sesión abierta
            disableWelcome: true, // Deshabilitar mensaje de bienvenida
            multiDevice: true, // Habilitar modo multi-dispositivo para mejor persistencia
            folderNameToken: 'tokens', // Directorio donde se guardan los tokens
            mkdirFolderToken: '', // No crear subdirectorio adicional
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
              "--user-data-dir=" + userDataDir,
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

  // Cache para evitar procesar mensajes duplicados
  const mensajesProcesados = new Set();
  const LIMPIEZA_CACHE_INTERVALO = 5 * 60 * 1000; // Limpiar cache cada 5 minutos
  
  // Limpiar cache periódicamente
  setInterval(() => {
    if (mensajesProcesados.size > 1000) {
      mensajesProcesados.clear();
      if (LOG_LEVEL === 'verbose') {
        logMessage("INFO", "Cache de mensajes procesados limpiado");
      }
    }
  }, LIMPIEZA_CACHE_INTERVALO);

  // Evento cuando se recibe un mensaje
  client.onMessage(async (message) => {
    try {
      // ============================================
      // FILTROS ESTRICTOS PARA IGNORAR ESTADOS Y MENSAJES NO DESEADOS
      // ============================================

      // 0. Prevenir procesamiento duplicado de mensajes
      const mensajeId = message.id || `${message.from}_${message.timestamp}_${message.body?.substring(0, 50)}`;
      if (mensajesProcesados.has(mensajeId)) {
        if (LOG_LEVEL === 'verbose') {
          logMessage("INFO", "Mensaje duplicado ignorado", { mensajeId, from: message.from });
        }
        return;
      }
      mensajesProcesados.add(mensajeId);

      // 0.5. Verificar si el bot está activo globalmente (antes de procesar)
      // Obtener userId temporalmente para verificar si es admin
      const userIdTemp = message.from;
      const esAdminTemp = esAdministrador(userIdTemp);
      if (!esAdminTemp) {
        try {
          const flagBotActivo = await db.obtenerConfiguracion('flag_bot_activo');
          if (flagBotActivo === '0') {
            // Bot desactivado globalmente - ignorar mensajes de no-admins
            if (LOG_LEVEL === 'verbose') {
              logMessage("INFO", "Mensaje ignorado - bot desactivado globalmente", { userId: userIdTemp });
            }
            return;
          }
        } catch (error) {
          // Si hay error al obtener configuración, continuar (bot activo por defecto)
          logMessage("WARNING", "Error al verificar flag_bot_activo, continuando", { error: error.message });
        }
      }

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
        if (LOG_LEVEL === 'verbose') {
        logMessage("INFO", "Mensaje de estado ignorado", {
          type: message.type,
          from: message.from,
          chatId: message.chatId,
        });
        }
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
        if (LOG_LEVEL === 'verbose') {
        logMessage("INFO", "Mensaje ignorado - no es chat individual válido", {
          from: message.from,
          type: message.type,
          isStatus: message.isStatus,
        });
        }
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
        if (LOG_LEVEL === 'verbose') {
        logMessage("INFO", "Mensaje ignorado - tipo no permitido", {
          type: message.type,
          from: message.from,
        });
        }
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
        storage.getUserName(userId) ||
        "Usuario";
      
      // Intentar obtener el número real del mensaje si está disponible
      // Algunos mensajes tienen el número en diferentes propiedades
      const numeroRealDelMensaje = message.wid?.user || 
                                   message.author || 
                                   message.from?.split('@')[0] || 
                                   userId.split('@')[0] ||
                                   null;
      
      // Log para debugging - SIEMPRE mostrar información del mensaje
      console.log(`\n📱 INFORMACIÓN DEL MENSAJE:`);
      console.log(`   message.from: ${message.from}`);
      console.log(`   message.wid: ${JSON.stringify(message.wid)}`);
      console.log(`   message.author: ${message.author}`);
      console.log(`   message.notifyName: ${message.notifyName}`);
      console.log(`   message.pushname: ${message.pushname}`);
      console.log(`   userId extraído: ${userId}`);
      console.log(`   número real del mensaje: ${numeroRealDelMensaje}\n`);
      
      // Inicializar usuario al recibir mensaje
      inicializarUsuario(userId);
      
      // Sanitizar mensaje antes de procesar
      const text = sanitizarMensaje(message.body || "");
      const textLower = text.toLowerCase();
      
      // LOG CRÍTICO: Registrar TODOS los mensajes recibidos (especialmente para debugging)
      logMessage("INFO", `📨 MENSAJE RECIBIDO`, {
        userId: userId,
        numero: extraerNumero(userId),
        userName: userName,
        mensaje: text,
        textLower: textLower,
        longitud: text.length
      });

      // Actualizar estadísticas
      estadisticas.totalMensajes++;
      estadisticas.usuariosAtendidos.add(userId);

      // Intentar extraer y guardar nombre
      const nombreExtraido = extractName(text);
      if (nombreExtraido && !storage.getUserName(userId)) {
        storage.setUserName(userId, nombreExtraido);
        userName = nombreExtraido;
        if (LOG_LEVEL === 'verbose') {
        logMessage("INFO", `Nombre guardado para usuario: ${userName}`);
        }
      }

      // Usar nombre guardado si existe
      if (storage.getUserName(userId)) {
        userName = storage.getUserName(userId);
      }

      if (LOG_LEVEL === 'verbose') {
      logMessage("INFO", `Mensaje recibido de ${userName}`, {
        userId: extraerNumero(userId),
        mensaje: text.substring(0, 50),
      });
      } else {
        // Guardar en archivo sin mostrar en consola
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
        const logEntry = `[${timestamp}] [INFO] Mensaje recibido de ${userName} | ${JSON.stringify({
          userId: extraerNumero(userId),
          mensaje: text.substring(0, 50),
        })}\n`;
        fs.appendFileSync(logFile, logEntry, "utf8");
      }

      // ============================================
      // COMANDOS DEL ADMINISTRADOR (PROCESAR PRIMERO - ANTES DE CUALQUIER OTRA LÓGICA)
      // ============================================
      // Verificar si es administrador INMEDIATAMENTE después de obtener el texto
      // Usar el número real del mensaje que ya se extrajo arriba
      logMessage("INFO", `🔍 VERIFICANDO SI ES ADMINISTRADOR`, {
        userId: userId,
        numero: extraerNumero(userId),
        numeroRealDelMensaje: numeroRealDelMensaje,
        adminNumbers: ADMIN_NUMBERS.map(n => extraerNumero(n))
      });
      
      const esAdmin = esAdministrador(userId, numeroRealDelMensaje);
      
      // Log detallado para debugging - SIEMPRE mostrar
      logMessage("INFO", `🔍 RESULTADO VERIFICACIÓN ADMINISTRADOR`, {
        esAdmin: esAdmin,
        userId: userId,
        numero: extraerNumero(userId),
        mensaje: text.substring(0, 50),
        textLower: textLower.substring(0, 50)
      });
      
      if (esAdmin) {
        logMessage("INFO", `🔑 ✅ ADMINISTRADOR CONFIRMADO - PROCESANDO COMANDOS`, {
          userId: userId,
          numero: extraerNumero(userId),
          mensaje: text,
          textLower: textLower,
          tipoMensaje: message.type
        });
        
        // PRIMERO: Procesar comandos de administrador (confirmar, cancelar, modificar, detalle cita, etc.)
        // Esto procesa todos los comandos nuevos que están en handlers/admin.js
        const procesadoAdmin = await adminHandler.procesarComandosAdmin(
          client,
          message,
          userId,
          text,
          textLower,
          estadisticas,
          iaGlobalDesactivada
        );
        
        if (procesadoAdmin) {
          return; // Si se procesó un comando, salir
        }
        
        // SEGUNDO: Procesar comandos legacy que están en main.js (mantener compatibilidad)
        // Comando: Procesar imagen de cita (solo administradores)
        if (message.type === 'image') {
          console.log(`\n📷 IMAGEN RECIBIDA DE ADMINISTRADOR - PROCESANDO...\n`);
          await procesarImagenCita(client, message, userId);
          return; // Salir después de procesar la imagen
        }
        
        // Comando: Estadísticas
        if (
          textLower === "estadisticas" ||
          textLower === "stats" ||
          textLower === "estadísticas"
        ) {
          try {
            await enviarMensajeSeguro(
              client,
                userId,
                obtenerEstadisticas(estadisticas)
            );
            if (LOG_LEVEL === 'verbose') {
            logMessage("INFO", "Estadísticas enviadas al administrador");
            }
          } catch (error) {
            logMessage("ERROR", "Error al enviar estadísticas", {
              error: error.message,
            });
          }
          return;
        }

        // Comando: Ver reservas activas
        const textoTrimReservas = textLower.trim();
        if (
          textoTrimReservas === "ver reservas" ||
          textoTrimReservas === "reservas activas" ||
          textoTrimReservas === "ver reservas activas"
        ) {
          try {
            const reservas = await db.obtenerReservas({});
            // Filtrar solo pendientes y confirmadas
            const reservasActivas = reservas.filter(r => 
              r.estado === 'pendiente' || r.estado === 'confirmada'
            );
            
            if (reservasActivas.length === 0) {
              await enviarMensajeSeguro(
                client,
                userId,
                "📋 *RESERVAS ACTIVAS*\n\n✅ No hay reservas activas en este momento."
              );
              return;
            }
            
            // Ordenar por fecha
            reservasActivas.sort((a, b) => a.fechaHora - b.fechaHora);
            
            let mensaje = `📋 *RESERVAS ACTIVAS*\n\n`;
            mensaje += `Total: ${reservasActivas.length} reserva(s)\n\n`;
            
            reservasActivas.forEach((r, idx) => {
              const fechaHora = r.fechaHora.toLocaleString('es-PE', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
              const estadoEmoji = r.estado === 'confirmada' ? '✅' : '⏳';
              
              mensaje += `${idx + 1}. ${estadoEmoji} *${fechaHora}*\n`;
              mensaje += `   👤 ${r.userName}\n`;
              mensaje += `   💆 ${r.servicio}\n`;
              mensaje += `   📱 ${extraerNumero(r.userId)}\n`;
              mensaje += `   📊 Estado: ${r.estado}\n\n`;
            });
            
            await enviarMensajeSeguro(client, userId, mensaje);
            logMessage("INFO", "Reservas activas enviadas al administrador", {
              total: reservasActivas.length
            });
          } catch (error) {
            logMessage("ERROR", "Error al obtener reservas activas", {
              error: error.message,
            });
            await enviarMensajeSeguro(
              client,
              userId,
              "❌ Error al obtener las reservas activas. Por favor, intenta más tarde."
            );
          }
          return;
        }

        // Comando: Resetear sesión de usuario
        if (textoTrimReservas.startsWith("reset ")) {
          try {
            // Extraer número del comando (acepta +51XXXXXXXXX o 51XXXXXXXXX)
            const numeroMatch = text.match(/reset\s+(\+?5\d{8,12})/i);
            if (!numeroMatch) {
              await enviarMensajeSeguro(
                client,
                userId,
                "❌ Formato incorrecto.\n\nUso: `reset +519XXXXXXXXX` o `reset 519XXXXXXXXX`\n\nEjemplo: `reset +51986613254`"
              );
              return;
            }
            
            let numeroUsuario = numeroMatch[1].replace(/\D/g, ''); // Solo números
            if (!numeroUsuario.startsWith('51') && numeroUsuario.length === 9) {
              numeroUsuario = '51' + numeroUsuario;
            }
            numeroUsuario = numeroUsuario + '@c.us';
            
            // Limpiar estado del usuario
            storage.setUserState(numeroUsuario, null);
            storage.setHumanMode(numeroUsuario, false);
            storage.setBotDesactivado(numeroUsuario, false);
            
            // Limpiar datos de usuario
            const userData = storage.getUserData(numeroUsuario) || {};
            userData.iaDesactivada = false;
            userData.botDesactivadoPorAdmin = false;
            userData.modoReservaDesde = null;
            storage.setUserData(numeroUsuario, userData);
            
            await enviarMensajeSeguro(
              client,
              userId,
              `✅ *Sesión reseteada*\n\nSe ha reseteado la sesión para:\n📱 ${extraerNumero(numeroUsuario)}\n\nEl usuario puede volver a interactuar normalmente con el bot.`
            );
            logMessage("INFO", "Sesión de usuario reseteada por administrador", {
              userId: numeroUsuario,
              adminId: extraerNumero(userId)
            });
          } catch (error) {
            logMessage("ERROR", "Error al resetear sesión", {
              error: error.message,
            });
            await enviarMensajeSeguro(
              client,
              userId,
              "❌ Error al resetear la sesión. Por favor, verifica el número e intenta nuevamente."
            );
          }
          return;
        }

        // Comando: Citas de fecha específica
        // Formato: citas_dd/MM/yyyy (ejemplo: citas_03/01/2025)
        // Funciona en minúsculas o mayúsculas
        const textoTrim = textLower.trim();
        
        // Verificar si el comando empieza con "citas_"
        const esComandoCitas = textoTrim.startsWith("citas_");
        
        console.log(`\n🔍 VERIFICANDO COMANDO DE CITAS:`);
        console.log(`   Texto original: "${text}"`);
        console.log(`   TextLower: "${textLower}"`);
        console.log(`   TextoTrim: "${textoTrim}"`);
        console.log(`   ¿Empieza con "citas_"? ${esComandoCitas ? '✅ SÍ' : '❌ NO'}`);
        
        if (esComandoCitas) {
          // Extraer la fecha del comando (después de "citas_")
          const fechaStr = textoTrim.substring(6); // Quitar "citas_"
          console.log(`   Fecha extraída del comando: "${fechaStr}"`);
          
          // Parsear la fecha en formato dd/MM/yyyy
          let fechaConsulta = null;
          try {
            const partesFecha = fechaStr.split('/');
            if (partesFecha.length === 3) {
              const dia = parseInt(partesFecha[0], 10);
              const mes = parseInt(partesFecha[1], 10) - 1; // Los meses en JS son 0-indexed
              const año = parseInt(partesFecha[2], 10);
              
              // Validar que los números sean válidos
              if (!isNaN(dia) && !isNaN(mes) && !isNaN(año) && 
                  dia >= 1 && dia <= 31 && 
                  mes >= 0 && mes <= 11 && 
                  año >= 2020 && año <= 2100) {
                fechaConsulta = new Date(año, mes, dia);
                
                // Verificar que la fecha es válida (por ejemplo, no 31/02)
                if (fechaConsulta.getDate() === dia && 
                    fechaConsulta.getMonth() === mes && 
                    fechaConsulta.getFullYear() === año) {
                  console.log(`   ✅ Fecha válida parseada: ${fechaConsulta.toLocaleDateString('es-PE')}`);
                } else {
                  console.log(`   ❌ Fecha inválida (ej: 31/02)`);
                  fechaConsulta = null;
                }
              } else {
                console.log(`   ❌ Números de fecha inválidos`);
                fechaConsulta = null;
              }
            } else {
              console.log(`   ❌ Formato de fecha incorrecto (debe ser dd/MM/yyyy)`);
              fechaConsulta = null;
            }
          } catch (error) {
            console.log(`   ❌ Error al parsear fecha: ${error.message}`);
            fechaConsulta = null;
          }
          
          if (fechaConsulta) {
            console.log(`\n✅ ✅ ✅ COMANDO "CITAS" DETECTADO - Fecha: ${fechaConsulta.toLocaleDateString('es-PE')} ✅ ✅ ✅\n`);
            
            logMessage("INFO", `✅ COMANDO "CITAS" DETECTADO - Ejecutando...`, {
              userId: extraerNumero(userId),
              mensaje: text,
              fecha: fechaConsulta.toISOString(),
              fechaFormateada: fechaConsulta.toLocaleDateString('es-PE')
            });
            
            try {
              console.log(`\n📋 Obteniendo citas del día ${fechaConsulta.toLocaleDateString('es-PE')}...\n`);
              const citas = await obtenerCitasDelDia(fechaConsulta);
              console.log(`\n✅ Citas obtenidas correctamente`);
              console.log(`   Longitud del mensaje: ${citas.length} caracteres`);
              console.log(`   Enviando a administrador...\n`);
              
              logMessage("SUCCESS", `Citas obtenidas, enviando a administrador`, {
                fecha: fechaConsulta.toLocaleDateString('es-PE'),
                numeroCitas: citas.split('\n').filter(l => l.includes('✅') || l.includes('⏳')).length
              });
              await enviarMensajeSeguro(client, userId, citas);
              console.log(`\n✅ ✅ ✅ CITAS DEL DÍA ENVIADAS AL ADMINISTRADOR CORRECTAMENTE ✅ ✅ ✅\n`);
              logMessage("SUCCESS", "✅ Citas del día enviadas al administrador correctamente");
            } catch (error) {
              logMessage("ERROR", "❌ Error al obtener citas del día", {
                error: error.message,
                stack: error.stack
              });
              await enviarMensajeSeguro(
                client,
                userId,
                "❌ Error al obtener las citas del día. Por favor, intenta más tarde."
              );
            }
          } else {
            // Fecha inválida
            console.log(`\n❌ FECHA INVÁLIDA EN EL COMANDO\n`);
            await enviarMensajeSeguro(
              client,
              userId,
              "❌ Formato de fecha inválido.\n\n" +
              "Formato correcto: `citas_dd/MM/yyyy`\n\n" +
              "Ejemplos:\n" +
              "• `citas_03/01/2025` - Citas del 3 de enero de 2025\n" +
              "• `citas_15/12/2024` - Citas del 15 de diciembre de 2024\n" +
              "• `citas_01/02/2025` - Citas del 1 de febrero de 2025"
            );
            logMessage("WARNING", `Comando de citas con fecha inválida`, {
              userId: extraerNumero(userId),
              mensaje: text,
              fechaStr: fechaStr
            });
          }
          return; // IMPORTANTE: Salir inmediatamente después de procesar el comando
        }

        // IMPORTANTE: Verificar comandos de IA PRIMERO (más específicos) antes de comandos de bot
        // Comando: Desactivar IA (verificar PRIMERO para evitar conflictos)
        const textoTrimIA = textLower.trim();
        const esDesactivarIA = 
          textoTrimIA === "desactivar ia" ||
          textoTrimIA === "desactivar ai" ||
          textoTrimIA === "ia off" ||
          textoTrimIA === "ai off" ||
          textoTrimIA === "desactivar inteligencia artificial";
        
        const esActivarIA = 
          textoTrimIA === "activar ia" ||
          textoTrimIA === "activar ai" ||
          textoTrimIA === "ia on" ||
          textoTrimIA === "ai on" ||
          textoTrimIA === "activar inteligencia artificial";
        
        console.log(`\n🔍 VERIFICANDO COMANDOS DE IA:`);
        console.log(`   Texto: "${textoTrimIA}"`);
        console.log(`   ¿Es "desactivar ia"? ${esDesactivarIA ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   ¿Es "activar ia"? ${esActivarIA ? '✅ SÍ' : '❌ NO'}`);
        
        if (esDesactivarIA) {
          console.log(`\n✅ ✅ ✅ COMANDO "DESACTIVAR IA" DETECTADO - EJECUTANDO... ✅ ✅ ✅\n`);
          iaGlobalDesactivada = true;
          try {
            // Sincronizar con SQLite
            await db.establecerConfiguracion('flag_ia_activada', '0', 'IA desactivada globalmente');
            await enviarMensajeSeguro(
              client,
              userId,
              "✅ *IA Desactivada*\n\nLa inteligencia artificial ha sido desactivada globalmente.\n\nEl bot seguirá funcionando pero sin respuestas de IA.\n\nPara reactivarla, escribe: *Activar IA*"
            );
            logMessage(
              "INFO",
              "IA desactivada globalmente por el administrador"
            );
            console.log(`\n✅ IA DESACTIVADA CORRECTAMENTE\n`);
          } catch (error) {
            logMessage("ERROR", "Error al desactivar IA", {
              error: error.message,
            });
            console.log(`\n❌ ERROR AL DESACTIVAR IA: ${error.message}\n`);
          }
          return;
        }

        if (esActivarIA) {
          console.log(`\n✅ ✅ ✅ COMANDO "ACTIVAR IA" DETECTADO - EJECUTANDO... ✅ ✅ ✅\n`);
          iaGlobalDesactivada = false;
          try {
            // Sincronizar con SQLite
            await db.establecerConfiguracion('flag_ia_activada', '1', 'IA activada globalmente');
            await enviarMensajeSeguro(
              client,
              userId,
              "✅ *IA Activada*\n\nLa inteligencia artificial ha sido reactivada globalmente.\n\nEl bot ahora puede usar IA para responder a los usuarios."
            );
            logMessage(
              "INFO",
              "IA reactivada globalmente por el administrador"
            );
            console.log(`\n✅ IA ACTIVADA CORRECTAMENTE\n`);
          } catch (error) {
            logMessage("ERROR", "Error al activar IA", {
              error: error.message,
            });
            console.log(`\n❌ ERROR AL ACTIVAR IA: ${error.message}\n`);
          }
          return;
        }
        
        // Comando: Desactivar bot para un usuario específico (solo si NO es comando de IA)
        // Formato: "desactivar bot [número]" o "desactivar bot" (muestra lista)
        const esDesactivarBot = 
          textoTrimIA === "desactivar bot" ||
          textoTrimIA.startsWith("desactivar bot ") ||
          textoTrimIA === "bot off";
        
        const esActivarBot = 
          textoTrimIA === "activar bot" ||
          textoTrimIA.startsWith("activar bot ") ||
          textoTrimIA === "bot on";
        
        console.log(`\n🔍 VERIFICANDO COMANDOS DE BOT:`);
        console.log(`   Texto: "${textoTrimIA}"`);
        console.log(`   ¿Es "desactivar bot"? ${esDesactivarBot ? '✅ SÍ' : '❌ NO'}`);
        console.log(`   ¿Es "activar bot"? ${esActivarBot ? '✅ SÍ' : '❌ NO'}`);

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
              userId,
              `📊 *Estado de la IA*\n\n${estadoIA}\n\nPara cambiar el estado:\n• *Desactivar IA* - Desactiva la IA globalmente\n• *Activar IA* - Reactiva la IA globalmente`
            );
            if (LOG_LEVEL === 'verbose') {
            logMessage("INFO", "Estado de IA consultado por el administrador");
            }
          } catch (error) {
            logMessage("ERROR", "Error al consultar estado de IA", {
              error: error.message,
            });
          }
          return;
        }

        // Comando: Desactivar bot para un usuario específico O globalmente
        // Formato: "desactivar bot [número]" o "desactivar bot" (muestra lista)
        // Si no hay número, desactivar bot globalmente
        if (esDesactivarBot) {
          // Verificar si es comando global (sin número)
          if (textoTrimIA === "desactivar bot" || textoTrimIA === "bot off") {
            try {
              await db.establecerConfiguracion('flag_bot_activo', '0', 'Bot desactivado globalmente');
              await enviarMensajeSeguro(
                client,
                userId,
                "✅ *Bot Desactivado Globalmente*\n\nEl bot ha sido desactivado completamente.\n\nTodos los mensajes serán ignorados hasta que reactives el bot.\n\nPara reactivarlo, escribe: *Activar bot*"
              );
              logMessage("INFO", "Bot desactivado globalmente por administrador", {
                adminId: extraerNumero(userId)
              });
            } catch (error) {
              logMessage("ERROR", "Error al desactivar bot globalmente", {
                error: error.message,
              });
              await enviarMensajeSeguro(
                client,
                userId,
                "❌ Error al desactivar el bot. Por favor, intenta nuevamente."
              );
            }
            return;
          }
          
          // Si hay número, desactivar para usuario específico
          // Intentar extraer número del mensaje
          const numeroMatch = text.match(/(\d{9,12})/);

          if (numeroMatch) {
            // Si hay un número en el mensaje, desactivar para ese usuario
            const numeroBuscado = numeroMatch[1];
            let usuarioEncontrado = null;

            // Buscar el usuario por número
            for (const [uid, nombre] of storage.userNames.entries()) {
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
              storage.setBotDesactivado(usuarioEncontrado, true);
              storage.setHumanMode(usuarioEncontrado, true); // También agregar a modo asesor
              const userDataActual = storage.getUserData(usuarioEncontrado) || {};
              userDataActual.iaDesactivada = true;
              userDataActual.botDesactivadoPorAdmin = true;
              storage.setUserData(usuarioEncontrado, userDataActual);

              try {
                await enviarMensajeSeguro(
                  client,
                  userId,
                  `✅ *Bot Desactivado*\n\nBot y IA desactivados para:\n👤 ${
                    storage.getUserName(usuarioEncontrado) || "Usuario"
                  }\n📱 ${extraerNumero(
                    usuarioEncontrado
                  )}\n\nSolo tú puedes responder ahora.\n\nPara reactivarlo, escribe: *Activar bot ${numeroBuscado}*`
                );
                logMessage(
                  "INFO",
                  `Bot desactivado para usuario ${
                    storage.getUserName(usuarioEncontrado)
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
                  userId,
                  `❌ *Usuario no encontrado*\n\nNo se encontró un usuario con el número: ${numeroBuscado}\n\nUsuarios en modo asesor:\n${
                    Array.from(storage.humanModeUsers)
                      .map(
                        (uid, idx) =>
                          `${idx + 1}. ${
                            storage.getUserName(uid) || "Usuario"
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
            const usuariosEnAsesor = Array.from(storage.humanModeUsers);
            if (usuariosEnAsesor.length > 0) {
              const listaUsuarios = usuariosEnAsesor
                .map((uid, idx) => {
                  const nombre = storage.getUserName(uid) || "Usuario";
                  const numero = extraerNumero(uid);
                  const estado = storage.isBotDesactivado(uid)
                    ? "🔴 Bot desactivado"
                    : "🟢 Bot activo";
                  return `${idx + 1}. ${nombre} (${numero}) - ${estado}`;
                })
                .join("\n");

              try {
                await enviarMensajeSeguro(
                  client,
                  userId,
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
                  userId,
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

        // Comando: Activar bot para un usuario específico O globalmente
        // Si no hay número, activar bot globalmente
        if (esActivarBot) {
          // Verificar si es comando global (sin número)
          if (textoTrimIA === "activar bot" || textoTrimIA === "bot on") {
            try {
              await db.establecerConfiguracion('flag_bot_activo', '1', 'Bot activado globalmente');
              await enviarMensajeSeguro(
                client,
                userId,
                "✅ *Bot Activado Globalmente*\n\nEl bot ha sido reactivado completamente.\n\nAhora puede procesar todos los mensajes normalmente."
              );
              logMessage("INFO", "Bot activado globalmente por administrador", {
                adminId: extraerNumero(userId)
              });
            } catch (error) {
              logMessage("ERROR", "Error al activar bot globalmente", {
                error: error.message,
              });
              await enviarMensajeSeguro(
                client,
                userId,
                "❌ Error al activar el bot. Por favor, intenta nuevamente."
              );
            }
            return;
          }
          
          // Si hay número, activar para usuario específico
          // Intentar extraer número del mensaje
          const numeroMatch = text.match(/(\d{9,12})/);

          if (numeroMatch) {
            const numeroBuscado = numeroMatch[1];
            let usuarioEncontrado = null;

            // Buscar el usuario por número
            for (const [uid, nombre] of storage.userNames.entries()) {
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
              storage.setBotDesactivado(usuarioEncontrado, false);
              // Solo remover de humanModeUsers si fue agregado por el comando del admin
              // (no remover si está en modo asesor por otra razón)
              const userDataAdmin = storage.getUserData(usuarioEncontrado) || {};
              if (userDataAdmin?.botDesactivadoPorAdmin) {
                storage.setHumanMode(usuarioEncontrado, false);
              }
              userDataAdmin.botDesactivadoPorAdmin = false;
                // Reactivar IA si fue desactivada solo por el comando del admin
              userDataAdmin.iaDesactivada = false;
              storage.setUserData(usuarioEncontrado, userDataAdmin);

              try {
                await enviarMensajeSeguro(
                  client,
                  userId,
                  `✅ *Bot Reactivado*\n\nBot y IA reactivados para:\n👤 ${
                    storage.getUserName(usuarioEncontrado) || "Usuario"
                  }\n📱 ${extraerNumero(
                    usuarioEncontrado
                  )}\n\nEl bot ahora puede responder automáticamente.`
                );
                logMessage(
                  "INFO",
                  `Bot reactivado para usuario ${
                    storage.getUserName(usuarioEncontrado)
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
                  userId,
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
                userId,
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
      if (esAdministrador(userId) && storage.humanModeUsers.size > 0) {
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
            const usuariosEnAsesor = Array.from(storage.humanModeUsers);
            const listaUsuarios = usuariosEnAsesor
              .map((uid, idx) => {
                const nombre = storage.getUserName(uid) || "Usuario";
                return `${idx + 1}. ${nombre} (${extraerNumero(uid)})`;
              })
              .join("\n");

            await enviarMensajeSeguro(
              client,
              userId,
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
      const userDataActual = storage.getUserData(userId) || {};
      const ultimaInteraccion = userDataActual?.ultimaInteraccion
        ? new Date(userDataActual.ultimaInteraccion)
        : null;

      // Tiempo mínimo entre saludos: 1 hora (3600000 ms)
      const tiempoMinimoEntreSaludos = 60 * 60 * 1000; // 1 hora
      const tiempoDesdeUltimaInteraccion = ultimaInteraccion
        ? ahora - ultimaInteraccion
        : Infinity; // Si no hay última interacción, es infinito (primera vez)

      // Actualizar última interacción
      userDataActual.ultimaInteraccion = ahora.toISOString();
      storage.setUserData(userId, userDataActual);

      if (saludo) {
        // Si es "hola" y ha pasado suficiente tiempo O es la primera vez
        if (saludo === "hola") {
          const puedeSaludar =
            !userDataActual?.saludoEnviado ||
            tiempoDesdeUltimaInteraccion >= tiempoMinimoEntreSaludos;

          if (puedeSaludar) {
            // Marcar que ya se envió un saludo
            userDataActual.saludoEnviado = true;
            userDataActual.bienvenidaEnviada = true;
            storage.setUserData(userId, userDataActual);

            // Establecer estado
            if (!storage.getUserState(userId)) {
              storage.setUserState(userId, "conversacion");
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
            !userDataActual?.saludoEnviado ||
            tiempoDesdeUltimaInteraccion >= tiempoMinimoEntreSaludos;

          if (puedeSaludar) {
            userDataActual.saludoEnviado = true;
            storage.setUserData(userId, userDataActual);
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
      // CONSULTA DE DISPONIBILIDAD
      // ============================================
      const palabrasDisponibilidad = [
        "disponibilidad",
        "horarios disponibles",
        "horarios libres",
        "que horas hay",
        "que horarios hay",
        "disponible",
        "libre",
        "consultar disponibilidad",
        "ver disponibilidad"
      ];
      
      if (palabrasDisponibilidad.some(palabra => textLower.includes(palabra))) {
        try {
          // Intentar extraer fecha del mensaje
          let fechaConsulta = new Date();
          
          // Buscar referencias a días (hoy, mañana, pasado mañana, etc.)
          if (textLower.includes("hoy") || textLower.includes("ahora")) {
            fechaConsulta = new Date();
          } else if (textLower.includes("mañana") || textLower.includes("manana")) {
            fechaConsulta = new Date();
            fechaConsulta.setDate(fechaConsulta.getDate() + 1);
          } else if (textLower.includes("pasado mañana") || textLower.includes("pasado manana")) {
            fechaConsulta = new Date();
            fechaConsulta.setDate(fechaConsulta.getDate() + 2);
          } else {
            // Intentar extraer fecha del texto (formato: DD/MM, DD-MM, etc.)
            const fechaMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})/);
            if (fechaMatch) {
              const dia = parseInt(fechaMatch[1]);
              const mes = parseInt(fechaMatch[2]) - 1; // Mes es 0-indexed
              const año = new Date().getFullYear();
              fechaConsulta = new Date(año, mes, dia);
            }
          }
          
          // Asegurar que la fecha sea válida y en el futuro
          if (isNaN(fechaConsulta.getTime()) || fechaConsulta < new Date()) {
            fechaConsulta = new Date();
            if (fechaConsulta.getHours() >= 19) {
              // Si ya pasó el horario de cierre, consultar para mañana
              fechaConsulta.setDate(fechaConsulta.getDate() + 1);
            }
          }
          
          // Consultar disponibilidad
          const horariosDisponibles = await consultarDisponibilidad(fechaConsulta, 60);
          const mensajeDisponibilidad = formatearHorariosDisponibles(horariosDisponibles);
          
          const fechaFormateada = fechaConsulta.toLocaleDateString("es-PE", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
          });
          
          await enviarMensajeSeguro(
            client,
            userId,
            `📅 *Disponibilidad para ${fechaFormateada}*\n\n${mensajeDisponibilidad}`
          );
          
          logMessage("INFO", `Consulta de disponibilidad realizada por ${userName}`, {
            fecha: fechaConsulta.toISOString(),
            horariosDisponibles: horariosDisponibles.length
          });
          
          return;
        } catch (error) {
          logMessage("ERROR", "Error al consultar disponibilidad", {
            error: error.message
          });
          await enviarMensajeSeguro(
            client,
            userId,
            "❌ Lo siento, hubo un error al consultar la disponibilidad. Por favor intenta más tarde."
          );
          return;
        }
      }

      // ============================================
      // SI ESTÁ EN MODO RESERVA, verificar cancelación y tiempo PRIMERO
      // (antes de la verificación general de humanModeUsers)
      // ============================================
      if (storage.getUserState(userId) === "reserva") {
        // Verificar si ha pasado suficiente tiempo desde que se activó el modo reserva
        const userDataReserva = storage.getUserData(userId) || {};
        const modoReservaDesde = userDataReserva?.modoReservaDesde
          ? new Date(userDataReserva.modoReservaDesde)
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
          storage.setUserState(userId, null);
          storage.setHumanMode(userId, false);
          userDataReserva.iaDesactivada = false;
          delete userDataReserva.modoReservaDesde;
          storage.setUserData(userId, userDataReserva);
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
            storage.setUserState(userId, null);
            storage.setHumanMode(userId, false);
            const userDataReserva = storage.getUserData(userId) || {};
            userDataReserva.iaDesactivada = false;
            delete userDataReserva.modoReservaDesde;
            storage.setUserData(userId, userDataReserva);
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
      if (storage.isHumanMode(userId)) {
        // Verificar si ha pasado suficiente tiempo desde que se activó el modo asesor
        const userDataAsesor = storage.getUserData(userId) || {};
        const modoAsesorDesde = userDataAsesor?.modoAsesorDesde
          ? new Date(userDataAsesor.modoAsesorDesde)
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
          storage.setHumanMode(userId, false);
          userDataAsesor.iaDesactivada = false;
          delete userDataAsesor.modoAsesorDesde;
          storage.setUserData(userId, userDataAsesor);
          storage.setUserState(userId, null); // Limpiar estado
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
            storage.setHumanMode(userId, false);
            const userDataSalir = storage.getUserData(userId) || {};
            userDataSalir.iaDesactivada = false;
            delete userDataSalir.modoAsesorDesde;
            storage.setUserData(userId, userDataSalir);
            storage.setUserState(userId, null); // Limpiar estado
            // Limpiar historial al salir del modo asesor para empezar conversación fresca
            storage.setHistorial(userId, []);
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
      // VERIFICAR SI EL USUARIO ESTÁ BLOQUEADO
      // ============================================
      if (!esAdmin) {
        const telefonoUsuario = extraerNumero(userId);
        try {
          const estaBloqueado = await db.estaUsuarioBloqueado(telefonoUsuario);
          if (estaBloqueado) {
            logMessage("INFO", `Mensaje ignorado de usuario bloqueado`, { userId, telefono: telefonoUsuario });
            return;
          }
        } catch (error) {
          logMessage("WARNING", "Error al verificar si usuario está bloqueado", { error: error.message });
          // Continuar si hay error (no bloquear por error técnico)
        }
      }

      // ============================================
      // COMANDOS DE CLIENTE
      // ============================================
      if (!esAdmin) {
        // Comando: mis citas
        if (textLower === "mis citas" || textLower === "mis reservas") {
          await clientCommandsHandler.mostrarMisCitas(client, userId);
          return;
        }

        // Comando: estado de mi cita
        if (textLower === "estado de mi cita" || textLower === "estado mi cita" || textLower === "mi cita") {
          await clientCommandsHandler.mostrarEstadoCita(client, userId);
          return;
        }

        // Comando: precios
        if (textLower === "precios" || textLower === "precio" || textLower.includes("cuanto cuesta") || textLower.includes("cuánto cuesta")) {
          await clientCommandsHandler.mostrarPrecios(client, userId);
          return;
        }

        // Comando: formas de pago
        if (textLower === "formas de pago" || textLower === "formas pago" || textLower === "pago" || textLower.includes("como pagar") || textLower.includes("cómo pagar")) {
          await clientCommandsHandler.mostrarFormasPago(client, userId);
          return;
        }

        // Comando: ubicacion
        if (textLower === "ubicacion" || textLower === "ubicación" || textLower === "direccion" || textLower === "dirección" || textLower.includes("donde estan") || textLower.includes("dónde están")) {
          await clientCommandsHandler.mostrarUbicacion(client, userId);
          return;
        }

        // Comando: menu / ayuda
        if (textLower === "menu" || textLower === "menú" || textLower === "ayuda" || textLower === "help" || textLower === "comandos") {
          await clientCommandsHandler.mostrarMenu(client, userId);
          return;
        }

        // Comando: volver
        if (textLower === "volver" || textLower === "atras" || textLower === "atrás") {
          storage.setUserState(userId, null);
          await enviarMensajeSeguro(
            client,
            userId,
            "✅ Has vuelto al menú principal. ¿En qué puedo ayudarte?"
          );
          return;
        }

        // Procesar respuestas de confirmación/cancelación de recordatorios
        if (textLower === "confirmar" || textLower.includes("confirmo") || textLower.includes("sí confirmo") || textLower.includes("si confirmo")) {
          // Buscar reserva pendiente más próxima
          const reservas = await db.obtenerReservas({
            userId: userId,
            estado: 'pendiente'
          });
          
          if (reservas.length > 0) {
            reservas.sort((a, b) => a.fechaHora - b.fechaHora);
            const proximaReserva = reservas[0];
            await db.confirmarReserva(proximaReserva.id);
            await enviarMensajeSeguro(
              client,
              userId,
              `✅ *Cita Confirmada*\n\n` +
              `📅 Fecha/Hora: ${proximaReserva.fechaHora.toLocaleString('es-PE')}\n` +
              `💆 Servicio: ${proximaReserva.servicio}\n\n` +
              `¡Te esperamos en Essenza Spa! 🌿`
            );
            return;
          }
        }
      }

      // ============================================
      // DETECCIÓN: CANCELAR O REPROGRAMAR TURNO (CLIENTES)
      // ============================================
      if (!esAdmin) {
        // Procesar cancelar/reprogramar usando el handler
        const procesadoCancelarReprogramar = await clientHandler.procesarCancelarReprogramar(client, userId, textLower);
        if (procesadoCancelarReprogramar) {
          return;
        }
        
        // Procesar selección de reserva para cancelar usando el handler
        const procesadoSeleccionCancelar = await clientHandler.procesarSeleccionCancelar(client, userId, textLower);
        if (procesadoSeleccionCancelar) {
          return;
        }
        
        // Procesar reprogramación (lógica específica que requiere más contexto)
        if (storage.getUserState(userId) === "reprogramando_reserva" || storage.getUserState(userId) === "seleccionando_reprogramar") {
          const userData = storage.getUserData(userId) || {};
          
          if (storage.getUserState(userId) === "seleccionando_reprogramar") {
            // Primero seleccionar reserva
            const reservasPendientes = userData.reservasPendientes || [];
            const numeroSeleccionado = parseInt(textLower.trim());
            
            if (!isNaN(numeroSeleccionado) && numeroSeleccionado >= 1 && numeroSeleccionado <= reservasPendientes.length) {
              const reservaSeleccionada = reservasPendientes[numeroSeleccionado - 1];
              await enviarMensajeSeguro(
                client,
                userId,
                `🔄 *Reprogramar reserva*\n\n` +
                `Tu reserva actual:\n` +
                `📅 ${reservaSeleccionada.fechaHora.toLocaleString('es-PE')}\n` +
                `💆 ${reservaSeleccionada.servicio}\n\n` +
                `Por favor, indica la nueva fecha y hora que deseas.\n` +
                `Ejemplo: "15 de enero a las 3 de la tarde"`
              );
              storage.setUserState(userId, "reprogramando_reserva");
              userData.reservaAReprogramar = reservaSeleccionada;
              delete userData.reservasPendientes;
              storage.setUserData(userId, userData);
              return;
            }
          } else {
            // Procesar nueva fecha/hora
            const reservaAReprogramar = userData.reservaAReprogramar;
            if (reservaAReprogramar) {
              // Extraer fecha y hora del mensaje (usar lógica similar a flujo de reserva)
              // Por simplicidad, aquí se puede usar la IA o un parser de fechas
              await enviarMensajeSeguro(
                client,
                userId,
                "🔄 Estoy procesando tu solicitud de reprogramación. Por favor, indica la nueva fecha y hora en formato claro.\n\nEjemplo: \"15 de enero a las 3 de la tarde\" o \"mañana a las 2 pm\""
              );
              // El flujo continuará en el siguiente mensaje donde se procesará la fecha
              return;
            }
          }
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
        storage.setHumanMode(userId, true);
        estadisticas.asesoresActivados++;
        storage.setUserState(userId, "asesor");

        // Guardar timestamp de cuando se activó el modo asesor
        const userDataNuevoAsesor = storage.getUserData(userId) || {};
        userDataNuevoAsesor.modoAsesorDesde = new Date().toISOString();
        userDataNuevoAsesor.iaDesactivada = true; // Marcar que la IA está desactivada
        storage.setUserData(userId, userDataNuevoAsesor);

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
            }
          );
        }
        return;
      }

      // Verificar si el bot está desactivado para este usuario por el admin
      if (storage.isBotDesactivado(userId)) {
        logMessage(
          "INFO",
          `Usuario ${userName} tiene bot desactivado por admin - Bot no responde`
        );
        return; // El admin maneja este chat completamente
      }

      if (storage.isHumanMode(userId)) {
        logMessage(
          "INFO",
          `Usuario ${userName} está en modo asesor - Bot no responde`
        );
        return;
      }

      // ============================================
      // DETECCIÓN DE RESERVA (siempre activa)
      // NOTA: Los comandos de administrador ya fueron procesados arriba
      // ============================================
      // Excluir administradores de la detección automática de reserva
      if (
        !esAdministrador(userId) &&
        detectarIntencionReserva(textLower) &&
        storage.getUserState(userId) !== "reserva"
      ) {
        // Activar flujo de reserva
        storage.setUserState(userId, "reserva");
        storage.setHumanMode(userId, true);
        estadisticas.reservasSolicitadas++;

        // Guardar timestamp de cuando se activó el modo reserva
        const userDataNuevaReserva = storage.getUserData(userId) || {};
        userDataNuevaReserva.modoReservaDesde = new Date().toISOString();
        userDataNuevaReserva.iaDesactivada = true; // Marcar que la IA está desactivada
        storage.setUserData(userId, userDataNuevaReserva);

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

        // Enviar notificación solo a administradores específicos para reservas (separado, no crítico si falla)
        try {
          const RESERVA_ADMIN_NUMBERS = config.RESERVA_ADMIN_NUMBERS || ADMIN_NUMBERS;
          const mensajeNotificacion = `🔔 *NUEVA SOLICITUD DE RESERVA*\n\n` +
              `Usuario: ${userName}\n` +
              `Número: ${extraerNumero(userId)}\n\n` +
            `Por favor contacta al cliente para confirmar los detalles.`;
          
          // Enviar solo a administradores de reservas
          for (const adminId of RESERVA_ADMIN_NUMBERS) {
            try {
              await enviarMensajeSeguro(client, adminId, mensajeNotificacion);
            } catch (error) {
              logMessage("WARNING", `Error al notificar a administrador ${extraerNumero(adminId)}`, {
                error: error.message
              });
            }
          }
          logMessage(
            "SUCCESS",
            `Notificación de reserva enviada a administradores de reservas`
          );
        } catch (error) {
          // Error no crítico - solo loguear, no afectar al usuario
          logMessage(
            "WARNING",
            `Error al notificar al administrador (no crítico)`,
            {
              error: error.message,
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
        !storage.getUserState(userId) &&
        !userDataActual?.bienvenidaEnviada &&
        !saludo &&
        tiempoDesdeUltimaInteraccionBienvenida >= tiempoMinimoParaBienvenida
      ) {
        // Inicializar usuario si no existe
        inicializarUsuario(userId);
        userDataActual.bienvenidaEnviada = true;
        userDataActual.saludoEnviado = true; // Marcar también saludo para evitar duplicados
        storage.setUserData(userId, userDataActual);
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
      
      // IMPORTANTE: Si es administrador y no se procesó ningún comando, 
      // NO procesar con IA - los administradores solo usan comandos
      if (esAdmin) {
        console.log(`\n⚠️ ADMINISTRADOR ENVIÓ MENSAJE PERO NO SE DETECTÓ COMANDO`);
        console.log(`   Mensaje: "${text}"`);
        console.log(`   TextLower: "${textLower}"`);
        console.log(`   NO se procesará con IA\n`);
        
        // Si es administrador y el mensaje parece un comando pero no se procesó,
        // mostrar ayuda en lugar de procesar con IA
        const pareceComando = 
          textLower.includes("citas") || 
          textLower.includes("reservas") || 
          textLower.includes("estadisticas") || 
          textLower.includes("stats") ||
          textLower.includes("ia") ||
          textLower.includes("bot");
        
        if (pareceComando) {
          logMessage("WARNING", `⚠️ Administrador envió mensaje que parece comando pero no se procesó`, {
            userId: extraerNumero(userId),
            mensaje: text,
            textLower: textLower
          });
          await enviarMensajeSeguro(
            client,
            userId,
            "❓ No reconocí ese comando. Comandos disponibles:\n\n" +
            "• `citas_hoy` o `citas de hoy` - Ver citas del día\n" +
            "• `estadisticas` o `stats` - Ver estadísticas\n" +
            "• `activar ia` / `desactivar ia` - Controlar IA\n" +
            "• `estado ia` - Ver estado de la IA"
          );
          return; // Salir para no procesar con IA
        } else {
          // Si no parece comando, también evitar IA para administradores
          logMessage("INFO", `Administrador envió mensaje que no es comando - ignorando`);
          return; // Los administradores solo usan comandos, no conversación con IA
        }
      }

      // Respuesta por defecto - SIEMPRE usar IA primero
      logMessage("INFO", `Usuario ${userName} envió mensaje - Consultando IA`, {
        mensaje: text.substring(0, 50),
      });

      // Intentar usar IA primero (solo si no está en modo reserva o asesor)
      // También verificar que la IA no esté desactivada por tiempo o globalmente
      const userDataIA = storage.getUserData(userId) || {};
      const iaDesactivadaUsuario = userDataIA?.iaDesactivada === true;
      const estaEnReserva = storage.getUserState(userId) === "reserva";
      const estaEnAsesor = storage.isHumanMode(userId);
      const puedeUsarIA =
        !estaEnReserva &&
        !estaEnAsesor &&
        !iaDesactivadaUsuario &&
        !iaGlobalDesactivada; // Verificar también desactivación global

      if (puedeUsarIA) {
        // Inicializar usuario si no existe (incluye historial)
        inicializarUsuario(userId);

        // Obtener historial reciente limitado por tokens (no solo cantidad)
        const historialCompleto = storage.getHistorial(userId);
        const historial = limitarHistorialPorTokens(historialCompleto, 2000);

        const userDataIA = storage.getUserData(userId) || {};
        const contextoUsuario = {
          estado: storage.getUserState(userId) || "conversacion",
          nombre: userName,
          yaSaludo: userDataIA?.saludoEnviado || false,
          historial: historial, // Incluir historial en el contexto
        };

        const respuestaIA = await consultarIA(text, contextoUsuario);

        if (respuestaIA) {
          // Si ya se saludó antes, limpiar saludos de la respuesta de la IA
          let respuestaFinal = respuestaIA;
          if (userDataIA?.saludoEnviado) {
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

          // Inicializar usuario si no existe
          inicializarUsuario(userId);
          
          // Guardar mensajes en el historial ANTES de enviar
          const historialActual = storage.getHistorial(userId);
          historialActual.push({
            role: "user",
            content: text,
          });
          historialActual.push({
            role: "assistant",
            content: respuestaFinal,
          });

          // Limitar historial por tokens (no solo cantidad)
          const historialLimitado = limitarHistorialPorTokens(historialActual, 2000);
          storage.setHistorial(userId, historialLimitado);

          // Si la IA respondió, usar su respuesta
          await enviarMensajeSeguro(client, userId, respuestaFinal);
          logMessage("SUCCESS", `Respuesta de IA enviada a ${userName}`);
          return; // Importante: hacer return para no continuar
        }
      } else {
        // Si la IA está desactivada o no puede usarse, no responder nada (el asesor maneja)
        const motivo = estaEnReserva ? "modo reserva" : estaEnAsesor ? "modo asesor" : "IA desactivada";
        if (LOG_LEVEL === 'verbose') {
        logMessage("INFO", `IA desactivada para ${userName} - En ${motivo}`);
        }
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
  const intervalReactivacion = setInterval(() => {
    const clearedCount = storage.humanModeUsers.size;
    storage.clearHumanMode();
    if (clearedCount > 0) {
      logMessage(
        "INFO",
        `Modo asesor reiniciado - ${clearedCount} usuario(s) reactivado(s)`
      );
    }
  }, 10 * 60 * 1000);
  intervals.push(intervalReactivacion);

  logMessage(
    "INFO",
    "Sistema de reactivación automática activado (cada 10 minutos)"
  );

  // Guardar estado periódicamente (cada 5 minutos)
  const intervalPersistencia = setInterval(() => {
    try {
      const userDataPlain = {};
      for (const [userId, data] of storage.userData.entries()) {
        userDataPlain[userId] = data;
      }
      persistence.guardarReservas(storage.getReservas());
      persistence.guardarUserData(userDataPlain);
      persistence.guardarEstadisticas(estadisticas);
      if (LOG_LEVEL === 'verbose') {
        logMessage("INFO", "Estado guardado automáticamente");
      }
    } catch (error) {
      logMessage("WARNING", "Error al guardar estado automáticamente", {
        error: error.message
      });
    }
  }, 5 * 60 * 1000); // Cada 5 minutos
  intervals.push(intervalPersistencia);

  // Limpiar intervalos y guardar estado al salir
  process.on('SIGINT', () => {
    logMessage("INFO", "Limpiando intervalos y guardando estado antes de salir...");
    intervals.forEach(id => clearInterval(id));
    
    // Guardar estado final
    try {
      const userDataPlain = {};
      for (const [userId, data] of storage.userData.entries()) {
        userDataPlain[userId] = data;
      }
      persistence.guardarReservas(storage.getReservas());
      persistence.guardarUserData(userDataPlain);
      persistence.guardarEstadisticas(estadisticas);
      logMessage("INFO", "Estado guardado exitosamente");
    } catch (error) {
      logMessage("WARNING", "Error al guardar estado al salir", {
        error: error.message
      });
    }
    
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logMessage("INFO", "Limpiando intervalos y guardando estado antes de salir...");
    intervals.forEach(id => clearInterval(id));
    
    // Guardar estado final
    try {
      const userDataPlain = {};
      for (const [userId, data] of storage.userData.entries()) {
        userDataPlain[userId] = data;
      }
      persistence.guardarReservas(storage.getReservas());
      persistence.guardarUserData(userDataPlain);
      persistence.guardarEstadisticas(estadisticas);
      logMessage("INFO", "Estado guardado exitosamente");
    } catch (error) {
      logMessage("WARNING", "Error al guardar estado al salir", {
        error: error.message
      });
    }
    
    process.exit(0);
  });
}

