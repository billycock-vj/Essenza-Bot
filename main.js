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

// Extraer nombre del mensaje
function extractName(text) {
  const patterns = [
    /(?:me llamo|mi nombre es|soy|yo soy)\s+([a-záéíóúñ\s]+)/i,
    /(?:nombre|name)[\s:]+([a-záéíóúñ\s]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().split(/\s+/)[0]; // Primer nombre
    }
  }
  return null;
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

    // Asegurar que el userId tiene el formato correcto (@c.us)
    let numeroFormateado = userId.trim();

    // Si no termina con @c.us, agregarlo
    if (!numeroFormateado.endsWith("@c.us")) {
      // Remover cualquier @g.us u otro sufijo
      numeroFormateado = numeroFormateado.replace(/@.*$/, "");
      // Agregar @c.us
      numeroFormateado = numeroFormateado + "@c.us";
    }

    // Validar que el número tiene formato válido (al menos 10 caracteres antes de @c.us)
    if (numeroFormateado.length < 13 || !numeroFormateado.includes("@c.us")) {
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
      destino: numeroFormateado.replace("@c.us", ""),
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
      console.log("\n" + "=".repeat(50));
      console.log("📱 ESCANEA ESTE QR CON WHATSAPP:");
      console.log("=".repeat(50) + "\n");

      try {
        if (asciiQR && typeof asciiQR === "string") {
          console.log(asciiQR);
        } else if (
          base64Qr &&
          typeof base64Qr === "string" &&
          base64Qr.length < 1000 &&
          !base64Qr.includes("{")
        ) {
          qrcode.generate(base64Qr, { small: false });
        } else {
          console.log("⚠️ El QR se está generando...");
          console.log(
            "💡 Por favor, espera unos segundos o revisa la sesión en la carpeta .wwebjs_auth"
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

      console.log("\n" + "=".repeat(50) + "\n");
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
    ],
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
            ],
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

      // 8. Validación CRÍTICA: Solo procesar chats individuales (@c.us)
      // Los estados NO tienen formato @c.us, así que esto los filtra automáticamente
      if (!message.from || !message.from.endsWith("@c.us")) {
        logMessage("INFO", "Mensaje ignorado - no es chat individual válido", {
          from: message.from,
          type: message.type,
          isStatus: message.isStatus,
        });
        return; // Solo chats individuales (@c.us), NO grupos (@g.us) ni estados
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
      if (!userId || userId.length < 10 || !userId.includes("@c.us")) {
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
        userId: userId.replace("@c.us", ""),
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
                return `${idx + 1}. ${nombre} (${uid.replace("@c.us", "")})`;
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
            `🔔 *Nueva solicitud de asesor*\n\nUsuario: ${userName}\nNúmero: ${userId.replace(
              "@c.us",
              ""
            )}\n\nEl bot dejará de responder a este usuario.`
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
                    `Número: ${userId.replace("@c.us", "")}\n\n` +
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
                  `🔔 *Nueva solicitud de asesor*\n\nUsuario: ${userName}\nNúmero: ${userId.replace(
                    "@c.us",
                    ""
                  )}\n\nEl bot dejará de responder a este usuario.`
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
        const fechaMatch = text.match(
          /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/
        );
        const horaMatch = text.match(/(\d{1,2}):(\d{2})/);
        const servicioMatch = text.match(
          /(masaje|limpieza|manicura|pedicura|extensiones|pestañas|cejas|fisioterapia)/i
        );

        if (fechaMatch || horaMatch || servicioMatch) {
          // Guardar información de reserva para recordatorio
          const servicioTexto = servicioMatch
            ? servicioMatch[0]
            : "Servicio no especificado";

          // Intentar construir fecha válida
          let fechaHora = null;
          if (fechaMatch && horaMatch) {
            try {
              // Formato: DD/MM/YYYY HH:MM
              const dia = parseInt(fechaMatch[1]);
              const mes = parseInt(fechaMatch[2]) - 1; // Mes es 0-indexed
              const año = parseInt(
                fechaMatch[3].length === 2
                  ? "20" + fechaMatch[3]
                  : fechaMatch[3]
              );
              const hora = parseInt(horaMatch[1]);
              const minuto = parseInt(horaMatch[2]);

              fechaHora = new Date(año, mes, dia, hora, minuto);

              // Validar que la fecha sea válida y futura
              if (isNaN(fechaHora.getTime()) || fechaHora <= new Date()) {
                fechaHora = null;
                logMessage(
                  "WARNING",
                  `Fecha inválida o pasada extraída de reserva`
                );
              }
            } catch (error) {
              logMessage("WARNING", `Error al parsear fecha de reserva`, {
                error: error.message,
              });
              fechaHora = null;
            }
          }

          // Solo guardar si tenemos fecha válida
          if (fechaHora) {
            guardarReserva(userId, userName, servicioTexto, fechaHora);
            logMessage(
              "INFO",
              `Información de reserva detectada y guardada de ${userName}`,
              {
                servicio: servicioTexto,
                fecha: fechaHora.toLocaleString("es-PE"),
              }
            );

            // Confirmar que se recibió la información
            try {
              await enviarMensajeSeguro(
                client,
                userId,
                "✅ *Información recibida*\n\n" +
                  "Hemos registrado tu información de reserva:\n" +
                  `📅 *Servicio:* ${servicioTexto}\n` +
                  `⏰ *Fecha/Hora:* ${fechaHora.toLocaleString("es-PE")}\n\n` +
                  "Un asesor se pondrá en contacto contigo pronto para confirmar los detalles.\n\n" +
                  "Si necesitas hacer algún cambio, escribe *Menu* o *Cancelar*."
              );
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
