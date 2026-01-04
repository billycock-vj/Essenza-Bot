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
const OpenAI = require("openai");
const PQueue = require('p-queue').default;

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
  obtenerHorarioDelDia
} = require('./utils/validators');
const persistence = require('./services/persistence');
const storage = require('./services/storage');
const db = require('./services/database');

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

// Control de rate limiting para OpenAI (cola de peticiones)
const queue = new PQueue({ concurrency: 1, interval: 1000, intervalCap: 1 });

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

// Función para verificar si un usuario es administrador
function esAdministrador(userId) {
  if (!userId) {
    console.log(`❌ esAdministrador: userId vacío`);
    return false;
  }
  
  // Extraer número sin sufijo para comparación
  const numeroUsuario = extraerNumero(userId);
  const numerosAdmin = ADMIN_NUMBERS.map(n => extraerNumero(n));
  
  console.log(`\n🔍 VERIFICANDO ADMINISTRADOR:`);
  console.log(`   UserId recibido: "${userId}"`);
  console.log(`   Número extraído: "${numeroUsuario}"`);
  console.log(`   Números admin configurados:`, numerosAdmin);
  console.log(`   Admin numbers completos:`, ADMIN_NUMBERS);
  console.log(`   ADMIN_NUMBERS_SIN_SUFIJO:`, ADMIN_NUMBERS_SIN_SUFIJO);
  
  // Verificar coincidencia exacta del userId completo
  if (ADMIN_NUMBERS.includes(userId)) {
    console.log(`✅ ADMINISTRADOR DETECTADO (coincidencia exacta userId)`);
    return true;
  }
  
  // Verificar por número sin sufijo
  if (numerosAdmin.includes(numeroUsuario)) {
    console.log(`✅ ADMINISTRADOR DETECTADO (coincidencia por número)`);
    return true;
  }
  
  // Verificar también con diferentes formatos posibles
  const numeroSinPrefijo = numeroUsuario.replace(/^\+?/, ''); // Quitar + si existe
  const numerosAdminSinPrefijo = numerosAdmin.map(n => n.replace(/^\+?/, ''));
  
  if (numerosAdminSinPrefijo.includes(numeroSinPrefijo)) {
    console.log(`✅ ADMINISTRADOR DETECTADO (coincidencia sin prefijo)`);
    return true;
  }
  
  // Verificar si el número termina con alguno de los números admin (para casos como 260602106781739 que contiene 972002363)
  // O si algún número admin está contenido en el número del usuario
  // También verificar con ADMIN_NUMBERS_SIN_SUFIJO que incluye variantes con y sin código de país
  const todosLosNumerosAdmin = ADMIN_NUMBERS_SIN_SUFIJO || numerosAdmin;
  
  for (const numAdmin of todosLosNumerosAdmin) {
    const numAdminSinPrefijo = numAdmin.replace(/^\+?/, '').replace(/^51/, ''); // Quitar + y código 51
    const numUsuarioSinPrefijo = numeroSinPrefijo.replace(/^51/, ''); // Quitar código 51 si existe
    
    // Verificar coincidencia exacta sin prefijos
    if (numUsuarioSinPrefijo === numAdminSinPrefijo) {
      console.log(`✅ ADMINISTRADOR DETECTADO (coincidencia sin prefijos)`);
      console.log(`   Número usuario (sin prefijos): "${numUsuarioSinPrefijo}"`);
      console.log(`   Número admin (sin prefijos): "${numAdminSinPrefijo}"`);
      return true;
    }
    
    // Verificar si el número admin está al final del número del usuario (últimos 9 dígitos)
    if (numUsuarioSinPrefijo.length >= 9 && numAdminSinPrefijo.length >= 9) {
      const ultimos9Usuario = numUsuarioSinPrefijo.slice(-9);
      const ultimos9Admin = numAdminSinPrefijo.slice(-9);
      if (ultimos9Usuario === ultimos9Admin) {
        console.log(`✅ ADMINISTRADOR DETECTADO (coincidencia últimos 9 dígitos)`);
        console.log(`   Últimos 9 dígitos usuario: "${ultimos9Usuario}"`);
        console.log(`   Últimos 9 dígitos admin: "${ultimos9Admin}"`);
        return true;
      }
    }
    
    // Verificar si contiene el número admin (para casos donde el userId es un ID largo)
    // Especialmente útil para números como 260602106781739 que pueden contener 972002363
    if (numUsuarioSinPrefijo.includes(numAdminSinPrefijo) || 
        numAdminSinPrefijo.includes(numUsuarioSinPrefijo)) {
      console.log(`✅ ADMINISTRADOR DETECTADO (coincidencia parcial)`);
      console.log(`   Número usuario: "${numUsuarioSinPrefijo}"`);
      console.log(`   Número admin: "${numAdminSinPrefijo}"`);
      return true;
    }
    
    // Verificar si los últimos dígitos del número admin coinciden con los últimos dígitos del userId
    // Esto es útil cuando WhatsApp usa IDs largos pero mantiene los últimos dígitos del número real
    if (numAdminSinPrefijo.length >= 6 && numUsuarioSinPrefijo.length >= numAdminSinPrefijo.length) {
      const ultimosDigitosAdmin = numAdminSinPrefijo.slice(-6); // Últimos 6 dígitos
      const ultimosDigitosUsuario = numUsuarioSinPrefijo.slice(-6);
      if (ultimosDigitosUsuario === ultimosDigitosAdmin) {
        console.log(`✅ ADMINISTRADOR DETECTADO (coincidencia últimos 6 dígitos)`);
        console.log(`   Últimos 6 dígitos usuario: "${ultimosDigitosUsuario}"`);
        console.log(`   Últimos 6 dígitos admin: "${ultimosDigitosAdmin}"`);
        return true;
      }
    }
  }
  
  console.log(`❌ NO ES ADMINISTRADOR`);
  console.log(`   Comparación falló para: "${numeroUsuario}"`);
  console.log(`   No coincide con:`, numerosAdmin);
  
  return false;
}

// Función helper para inicializar objetos de usuario (usando storage)
function inicializarUsuario(userId) {
  if (!storage.getUserData(userId)) {
    storage.setUserData(userId, {
      bienvenidaEnviada: false,
      saludoEnviado: false,
      ultimaInteraccion: null
    });
  }
  
  if (!storage.getHistorial(userId) || storage.getHistorial(userId).length === 0) {
    storage.setHistorial(userId, []);
  }
  
  if (storage.getUserState(userId) === undefined) {
    storage.setUserState(userId, null);
  }
}

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
  const textoLower = texto.toLowerCase().trim();

  // Excluir comandos de administrador que contienen "citas" o "reservas"
  const comandosAdmin = [
    "citas de hoy",
    "citas hoy",
    "reservas de hoy",
    "reservas hoy",
    "estadisticas",
    "stats",
    "estadísticas"
  ];
  
  // Si es un comando de administrador, no es una reserva
  if (comandosAdmin.some(cmd => textoLower === cmd || textoLower.includes(cmd))) {
    return false;
  }

  const palabrasReserva = [
    "reservar",
    "reserva",
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

  // Solo detectar "cita" si NO es parte de "citas de hoy" o "citas hoy"
  const tieneCita = textoLower.includes("cita");
  const esComandoCitas = textoLower.includes("citas de hoy") || 
                         textoLower.includes("citas hoy") ||
                         textoLower === "citas de hoy" ||
                         textoLower === "citas hoy";
  
  if (tieneCita && !esComandoCitas) {
    // Verificar que sea una intención real de reserva, no una consulta
    const esIntencionReserva = palabrasReserva.some((palabra) => {
      if (palabra === "cita") return false; // Ya lo manejamos arriba
      return textoLower.includes(palabra);
    });
    
    // Si tiene "cita" y también tiene palabras de intención, es reserva
    if (esIntencionReserva) {
      return true;
    }
    
    // Si solo tiene "cita" pero con contexto de solicitud
    const contextoReserva = ["quiero", "deseo", "necesito", "puedo", "hacer", "sacar", "pedir", "solicitar"];
    if (contextoReserva.some(ctx => textoLower.includes(ctx))) {
      return true;
    }
    
    return false;
  }

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

  // Usar cola de peticiones para rate limiting (1 petición por segundo)
  return await queue.add(async () => {

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
- Lunes a Jueves: 11:00 - 19:00
- Viernes: 11:00 - 19:00
- Sábado: 10:00 - 16:00
- Domingo: Cerrado

IMPORTANTE - HORARIO ESPECÍFICO POR DÍA:
Cuando el usuario mencione "mañana", "hoy", o una fecha específica, DEBES verificar qué día de la semana es y dar el horario CORRECTO de ese día:
- Si es Lunes, Martes, Miércoles o Jueves: 11:00 - 19:00
- Si es Viernes: 11:00 - 19:00
- Si es Sábado: 10:00 - 16:00
- Si es Domingo: Cerrado (no hay atención)

Ejemplo: Si el usuario pregunta "¿qué horario tienen mañana?" y mañana es Sábado, debes decir "10:00 - 16:00", NO "11:00 - 19:00".

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

SERVICIOS CON PRECIOS (ACTUALIZADOS)

MASAJES BÁSICOS (45-60 minutos):
- Masaje Relajante: S/35
- Masaje Descontracturante: S/35
- Masaje Terapéutico: S/45

MASAJES COMPUESTOS (45-60 minutos):
- Relajante + Piedras Calientes: S/50 (Combina calor y masaje)
- Descontracturante + Electroterapia: S/50 (Estimulación eléctrica, potencia el masaje)
- Descontracturante + Esferas Chinas: S/40 (Acupresión con esferas, reduce el dolor)
- Terapéutico + Compresas + Electroterapia: S/60 (Tratamiento integral, acelera recuperación)

FISIOTERAPIA Y TERAPIAS:
- Evaluación + Tratamiento de Fisioterapia: S/50 (60 minutos)
- Fisioterapia terapéutica
- Rehabilitación muscular y articular
- Alivio de dolores cervicales y lumbares
- Terapia para estrés y tensión corporal

TRATAMIENTOS FACIALES:
- Limpieza Facial Básica: S/30 (60 minutos)
- Limpieza Facial Profunda: S/60 (60-90 minutos)
- Parálisis Facial + Consulta: S/50 (60 minutos)

OTROS SERVICIOS:
- Manicura y Pedicura: Consultar precio (90 minutos)
- Extensiones de Pestañas: Consultar precio (120 minutos)
- Diseño de Cejas: Consultar precio (30 minutos)

PAQUETES MENSUALES (IDEALES PARA MANTENIMIENTO):

1. PAQUETE RELAJACIÓN: S/80
   - 3 masajes relajantes
   - Ideal para estrés y descanso

2. PAQUETE BIENESTAR: S/100
   - 4 masajes terapéuticos
   - Para mantenimiento muscular

3. PAQUETE RECUPERACIÓN: S/140
   - 4 sesiones de fisioterapia
   - Ideal para dolores recurrentes

PAQUETES PARA DOS PERSONAS:

1. PAQUETE ARMÓNICO: S/140 (2 personas)
   Incluye:
   - Masaje con pindas herbales
   - Compresas calientes
   - Reflexología
   - Exfoliación corporal
   - Fangoterapia
   - Musicaterapia/aromaterapia
   - Copa de vino 🍷 / mate ☕
   - Snack de frutas

2. PAQUETE AMOR: S/150 (2 personas)
   Incluye:
   - Masaje relajante/descontracturante
   - Piedras calientes
   - Reflexología
   - Exfoliación corporal
   - Limpieza facial
   - Aromaterapia/musicaterapia
   - Copa de vino
   - Snack de frutas y alfajores
   - Decoración romántica

NOTA IMPORTANTE SOBRE PRECIOS:
- Todos los precios mostrados son los precios actuales y correctos
- Los paquetes son ideales para ahorrar y tener tratamientos regulares
- Los paquetes para dos personas son perfectos para parejas o amigos

RECOMENDACIONES INTELIGENTES

El bot debe responder según necesidad:
- Dolor fuerte → Masaje Terapéutico, Terapéutico + Compresas + Electroterapia, Fisioterapia, Paquete Recuperación (S/140 - 4 sesiones)
- Dolor recurrente → Paquete Recuperación (S/140 - 4 sesiones de fisioterapia)
- Estrés → Masaje Relajante, Relajante + Piedras Calientes, Paquete Relajación (S/80 - 3 masajes)
- Tensión muscular → Masaje Descontracturante, Descontracturante + Electroterapia, Descontracturante + Esferas Chinas
- Mantenimiento muscular → Paquete Bienestar (S/100 - 4 masajes terapéuticos)
- Piel → Limpieza Facial Básica o Profunda
- Relajación profunda → Relajante + Piedras Calientes, Reflexología
- Para dos personas → Paquete Armónico (S/140) o Paquete Amor (S/150)
- Parejas románticas → Paquete Amor (S/150) - incluye decoración romántica, vino, frutas

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

"Es caro" → Ofrecer paquetes mensuales (ahorran dinero), masajes básicos (S/35), o paquetes para dos personas (mejor precio por persona)
"Estoy dudando" → Generar urgencia suave, mencionar beneficios de los paquetes
"No quiero depósito" → Explicar que asegura el espacio y se descuenta del total
"Quiero para dos" → Sugerir Paquete Armónico (S/140) o Paquete Amor (S/150) - ambos incluyen múltiples servicios
"Quiero algo romántico" → Recomendar Paquete Amor (S/150) - incluye decoración romántica, vino, frutas
"Tengo dolor recurrente" → Recomendar Paquete Recuperación (S/140 - 4 sesiones de fisioterapia)
"Quiero mantenimiento" → Recomendar Paquete Bienestar (S/100 - 4 masajes terapéuticos)
"Quiero relajarme regularmente" → Recomendar Paquete Relajación (S/80 - 3 masajes relajantes)
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
      weekday: "long"
    })}
- Ya se saludó antes: ${contextoUsuario.yaSaludo || false}
${(() => {
  // Calcular información de mañana para el contexto
  const mañana = new Date();
  mañana.setDate(mañana.getDate() + 1);
  const horarioMañana = obtenerHorarioDelDia(mañana);
  const nombreDiaMañana = mañana.toLocaleDateString('es-PE', { 
    weekday: 'long',
    timeZone: 'America/Lima'
  });
  
  if (horarioMañana.abierto) {
    return `- Mañana (${nombreDiaMañana.charAt(0).toUpperCase() + nombreDiaMañana.slice(1)}): Horario ${horarioMañana.apertura}:00 - ${horarioMañana.cierre}:00`;
  } else {
    return `- Mañana (${nombreDiaMañana.charAt(0).toUpperCase() + nombreDiaMañana.slice(1)}): ${horarioMañana.mensaje || 'Cerrado'}`;
  }
})()}

REGLA CRÍTICA SOBRE SALUDOS:
- Si "Ya se saludó antes" es true, NO debes saludar de nuevo. NO uses "Hola", "Buenos días", "Buenas tardes", ni ningún saludo.
- Si "Ya se saludó antes" es false, puedes saludar solo una vez.
- NUNCA repitas saludos en la misma conversación.

REGLA ANTI ALUCINACIÓN:
Si la IA no sabe algo responde:
"No tengo esa información exacta disponible, pero puedo consultar con un asesor humano si deseas."

REGLA CRÍTICA SOBRE MEMORIA Y CONTEXTO:
- Tienes acceso al historial de la conversación anterior. ÚSALO.
- NO repitas preguntas que ya fueron respondidas.
- Si el usuario ya dijo "tengo dolor en la lumbar", NO vuelvas a preguntar "¿qué zona del cuerpo?"
- Si el usuario ya dijo "intenso", NO vuelvas a preguntar "¿intenso o suave?"
- Si el usuario ya mencionó una fecha/hora, NO vuelvas a preguntar por fecha/hora.
- RECUERDA la información que el usuario ya compartió y avanza en el flujo.
- Si ya recomendaste un servicio, NO vuelvas a preguntar lo mismo, avanza al siguiente paso (fecha, depósito, etc.).

Meta final del bot: resolver dudas, recomendar, cerrar reserva.`;

    // Construir array de mensajes con historial
    const messages = [
      {
        role: "system",
        content: contextoNegocio,
      },
    ];

    // Agregar historial de conversación si existe (últimos 8 mensajes para mantener contexto)
    const historial = contextoUsuario.historial || [];
    if (historial.length > 0) {
      // Agregar solo los últimos 8 mensajes para no exceder tokens
      const historialReciente = historial.slice(-8);
      messages.push(...historialReciente);
    }

    // Agregar el mensaje actual
    messages.push({
      role: "user",
      content: mensajeUsuario,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Modelo económico y rápido
      messages: messages,
      max_tokens: 500, // Respuestas más completas y detalladas
      temperature: 0.8, // Más creatividad y naturalidad
    });

    // Validar respuesta de OpenAI
    if (!completion?.choices?.[0]?.message?.content) {
      logMessage("ERROR", "Respuesta inválida de OpenAI", {
        completion: JSON.stringify(completion).substring(0, 200)
      });
      return null;
    }

    const respuesta = completion.choices[0].message.content.trim();
    if (!respuesta || respuesta.length === 0) {
      logMessage("WARNING", "Respuesta vacía de OpenAI");
      return null;
    }

    return respuesta;
  } catch (error) {
    logMessage("ERROR", "Error al consultar IA", {
      error: error.message,
    });
    return null; // Si hay error, retornar null para usar respuesta por defecto
  }
  });
}

// MAX_RESERVAS ya está definido en config

// Funciones validarFecha y validarServicio ahora vienen del módulo utils/validators

// Guardar reserva para recordatorio
function guardarReserva(userId, userName, servicio, fechaHora, duracionMinutos = 60) {
  // Validar fecha y horario de atención
  const validacionFecha = validarFecha(fechaHora, duracionMinutos);
  if (!validacionFecha.valida) {
    logMessage("ERROR", `Error al guardar reserva: ${validacionFecha.error}`, {
      userId: userId,
      servicio: servicio,
      fechaHora: fechaHora,
      duracion: duracionMinutos
    });
    return { exito: false, error: validacionFecha.error };
  }
  
  // Validar servicio (opcional, pero recomendado)
  const validacionServicio = validarServicio(servicio);
  if (!validacionServicio.existe && LOG_LEVEL === 'verbose') {
    logMessage("WARNING", `Servicio no encontrado en base de datos`, {
      servicio: servicio
    });
  }
  
  const reserva = {
    userId,
    userName,
    servicio,
    fechaHora: validacionFecha.fecha,
    notificado: false,
    creada: new Date(),
  };
  
  // Si se alcanza el límite, eliminar las más antiguas
  const reservas = storage.getReservas();
  if (reservas.length >= MAX_RESERVAS) {
    reservas.sort((a, b) => a.creada - b.creada);
    reservas.splice(0, reservas.length - MAX_RESERVAS + 1);
    logMessage("WARNING", `Límite de reservas alcanzado, eliminando las más antiguas`);
  }
  
  storage.addReserva(reserva);
  // Guardar persistencia
  persistence.guardarReservas(storage.getReservas());
  logMessage("INFO", `Reserva guardada para recordatorio`, { 
    servicio: reserva.servicio,
    fechaHora: reserva.fechaHora.toISOString(),
    duracion: duracionMinutos
  });
  
  return { exito: true, reserva: reserva };
}

// Verificar y enviar recordatorios
async function verificarRecordatorios(client) {
  try {
    const ahora = new Date();
    const en24Horas = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    
    // Obtener reservas desde la base de datos
    const reservas = await db.obtenerReservas({
      estado: 'pendiente',
      fechaDesde: ahora,
      fechaHasta: en24Horas
    });

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

        // Validar que la reserva sea en el futuro
        if (horasRestantes <= 0) {
          logMessage("WARNING", `Reserva pasada detectada para ${reserva.userName}`, {
            fechaHora: reserva.fechaHora,
            ahora: ahora
          });
          reserva.notificado = true; // Marcar como notificado para no volver a intentar
          continue;
        }

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
        // Actualizar en base de datos
        await db.actualizarReserva(reserva.id, { notificado: true });
        logMessage("SUCCESS", `Recordatorio enviado a ${reserva.userName}`);
      } catch (error) {
        logMessage("ERROR", `Error al enviar recordatorio`, {
          error: error.message,
        });
      }
    }
  }

    // Limpiar reservas antiguas (más de 7 días) - ahora se hace automáticamente con SQLite
    // Las reservas se mantienen en la base de datos, no necesitamos limpiar manualmente
    
    // Sincronizar storage con base de datos para recordatorios
    const reservasPendientes = await db.obtenerReservas({
      estado: 'pendiente',
      fechaDesde: ahora
    });
    storage.reservas = reservasPendientes.slice(0, MAX_RESERVAS);
    
  } catch (error) {
    logMessage("ERROR", "Error al verificar recordatorios", {
      error: error.message
    });
  }
}

// Consultar disponibilidad para una fecha
async function consultarDisponibilidad(fecha, duracionMinima = 60) {
  try {
    const horariosDisponibles = await db.consultarDisponibilidad(fecha, duracionMinima);
    return horariosDisponibles;
  } catch (error) {
    logMessage("ERROR", "Error al consultar disponibilidad", {
      error: error.message,
      fecha: fecha.toISOString()
    });
    return [];
  }
}

// Formatear horarios disponibles para mostrar
function formatearHorariosDisponibles(horarios) {
  if (horarios.length === 0) {
    return "❌ *No hay horarios disponibles* para esta fecha.";
  }
  
  const horariosTexto = horarios.map((h, idx) => {
    const hora = h.toLocaleTimeString("es-PE", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
    return `${idx + 1}. ${hora}`;
  }).join("\n");
  
  return `✅ *Horarios disponibles:*\n\n${horariosTexto}\n\n💡 *Selecciona un horario escribiendo el número o la hora.*`;
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

// Obtener citas del día para administradores
async function obtenerCitasDelDia(fecha = null) {
  try {
    const fechaConsulta = fecha || new Date();
    const inicioDia = new Date(fechaConsulta);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(fechaConsulta);
    finDia.setHours(23, 59, 59, 999);

    const reservas = await db.obtenerReservas({
      fechaDesde: inicioDia,
      fechaHasta: finDia
    });

    if (reservas.length === 0) {
      const fechaFormateada = fechaConsulta.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return `📅 *CITAS DEL DÍA*\n\n${fechaFormateada}\n\n✅ No hay citas programadas para hoy.`;
    }

    // Ordenar por hora
    reservas.sort((a, b) => a.fechaHora - b.fechaHora);

    const fechaFormateada = fechaConsulta.toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let mensaje = `📅 *CITAS DEL DÍA*\n\n${fechaFormateada}\n\n`;
    mensaje += `📋 *Total: ${reservas.length} cita(s)*\n\n`;

    reservas.forEach((reserva, index) => {
      const hora = reserva.fechaHora.toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const estadoEmoji = reserva.estado === 'confirmada' ? '✅' : 
                          reserva.estado === 'cancelada' ? '❌' : '⏳';
      
      mensaje += `${index + 1}. ${estadoEmoji} *${hora}*\n`;
      mensaje += `   👤 ${reserva.userName}\n`;
      mensaje += `   💆 ${reserva.servicio}\n`;
      mensaje += `   ⏱️ ${reserva.duracion} min\n`;
      mensaje += `   📱 ${extraerNumero(reserva.userId)}\n`;
      if (reserva.deposito > 0) {
        mensaje += `   💰 Depósito: S/ ${reserva.deposito}\n`;
      }
      mensaje += `   📊 Estado: ${reserva.estado}\n\n`;
    });

    return mensaje.trim();
  } catch (error) {
    logMessage("ERROR", "Error al obtener citas del día", {
      error: error.message
    });
    return "❌ Error al obtener las citas del día. Por favor, intenta más tarde.";
  }
}

// ============================================
// INICIALIZACIÓN DE OPENAI (se inicializará después de definir logMessage)
// ============================================
let openai = null;

// ============================================
// SISTEMA DE LOGS (desde módulo utils/logger.js)
// ============================================
// logMessage y rotarLogs ahora vienen del módulo

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
    const esFormatoValido = validarFormatoUserId(numeroFormateado);

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

    if (LOG_LEVEL === 'verbose') {
      logMessage("SUCCESS", `Mensaje enviado correctamente`, {
        destino: extraerNumero(numeroFormateado),
        longitud: mensaje.length,
      });
    }

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

// Funciones rotarLogs y logMessage ahora vienen del módulo utils/logger.js

// Inicializar OpenAI
if (config.OPENAI_API_KEY && config.OPENAI_API_KEY.trim() !== "") {
  try {
    openai = new OpenAI({
      apiKey: config.OPENAI_API_KEY.trim(),
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

// Limpiar archivos bloqueados antes de iniciar (ejecutar de forma asíncrona)
logMessage("INFO", "Verificando y limpiando archivos bloqueados...");
(async () => {
  try {
    await limpiarArchivosBloqueados();
  } catch (error) {
    logMessage("WARNING", "Error al limpiar archivos bloqueados (no crítico)", {
      error: error.message
    });
  }
})();

// Verificar si el directorio está bloqueado
const tokensPath = path.join(__dirname, "tokens", "essenza-bot");
const defaultPath = path.join(tokensPath, "Default");
const preferencesPath = path.join(defaultPath, "Preferences");

// Variable para almacenar la ruta del user-data-dir (puede ser temporal)
let userDataDir = path.join(__dirname, "tokens", "essenza-bot");

// Verificar si Preferences está bloqueado intentando acceder a él
let carpetaBloqueada = false;
if (fs.existsSync(preferencesPath)) {
  try {
    // Intentar abrir el archivo en modo de escritura para verificar si está bloqueado
    const fd = fs.openSync(preferencesPath, 'r+');
    fs.closeSync(fd);
  } catch (accessError) {
    // Si no se puede abrir (probablemente está bloqueado por Chrome), usar carpeta temporal
    carpetaBloqueada = true;
    logMessage(
      "WARNING",
      "Carpeta Default bloqueada (probablemente por Chrome). Usando carpeta temporal para la sesión."
    );
  }
}

// Si la carpeta está bloqueada, usar carpeta temporal
if (carpetaBloqueada) {
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
    "INFO",
    `Usando carpeta temporal para la sesión: ${tempSessionName}`
  );
  logMessage(
    "INFO",
    `Ruta temporal: ${tempTokensPath}`
  );
} else {
  // Verificar si hay una sesión guardada válida antes de renombrar
  // Solo renombrar si Preferences está bloqueado Y no hay archivos de sesión importantes
  if (fs.existsSync(preferencesPath)) {
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
        const timestamp = Date.now();
        const tempSessionName = `essenza-bot-${timestamp}`;
        const tempTokensPath = path.join(__dirname, "tokens", tempSessionName);
        
        if (!fs.existsSync(tempTokensPath)) {
          fs.mkdirSync(tempTokensPath, { recursive: true });
        }
        
        sessionName = tempSessionName;
        userDataDir = tempTokensPath;
        logMessage("INFO", `Usando nombre de sesion temporal: ${sessionName}`);
      }
    } else {
      logMessage(
        "INFO",
        "Sesión guardada encontrada. Manteniendo carpeta Default para preservar la sesión."
      );
    }
  }
}

// La función inicializarServidorQR() ya está definida e inicializada al inicio del archivo
// No es necesario duplicarla aquí

// Esperar un momento para que los archivos se liberen antes de iniciar el bot
setTimeout(() => {
  try {
    iniciarBot();
  } catch (error) {
    logMessage("ERROR", "Error al iniciar bot", { error: error.message });
  }
}, 2000);

function iniciarBot() {
  wppconnect
    .create({
      session: sessionName,
      autoClose: false, // Mantener la sesión abierta
      disableWelcome: true, // Deshabilitar mensaje de bienvenida
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
        } else if (statusSession === "notLogged") {
          logMessage("INFO", "Sesión no encontrada - Necesitas escanear el QR");
        } else if (statusSession === "qrReadSuccess") {
          console.log("\n✅ QR ESCANEADO EXITOSAMENTE - Apareamiento completado\n");
          logMessage("SUCCESS", "QR escaneado exitosamente - Apareamiento completado");
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
              setTimeout(async () => await limpiarArchivosBloqueados(intentos + 1), 2000);
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
        setTimeout(async () => await limpiarArchivosBloqueados(), 1000);
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
  } catch (error) {
    logMessage("ERROR", "Error al inicializar base de datos", {
      error: error.message
    });
  }
  
  if (openai) {
    logMessage("INFO", "IA activada");
  } else if (LOG_LEVEL === 'verbose' || LOG_LEVEL === 'debug') {
    logMessage("INFO", "IA desactivada (sin API key)");
  }
  
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
          textLower: textLower
        });
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
              obtenerEstadisticas()
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
              userId,
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
              userId,
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

        // Enviar notificación a todos los administradores (separado, no crítico si falla)
        try {
          const mensajeNotificacion = `🔔 *NUEVA SOLICITUD DE RESERVA*\n\n` +
            `Usuario: ${userName}\n` +
            `Número: ${extraerNumero(userId)}\n\n` +
            `Por favor contacta al cliente para confirmar los detalles.`;
          
          // Enviar a todos los administradores
          for (const adminId of ADMIN_NUMBERS) {
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
            `Notificación de reserva enviada al administrador`
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

