/**
 * Handler para comandos de administrador
 */

const { logMessage } = require('../utils/logger');
const { enviarMensajeSeguro, extraerNumero, normalizarTelefono } = require('./messageHelpers');
const { procesarImagenCita } = require('./image');
const db = require('../services/database');
const storage = require('../services/storage');
const config = require('../config');

const ADMIN_NUMBERS = config.ADMIN_NUMBERS;
const ADMIN_NUMBERS_SIN_SUFIJO = config.ADMIN_NUMBERS_SIN_SUFIJO || [];

/**
 * Verifica si un userId es administrador
 * @param {string} userId - ID del usuario
 * @returns {boolean} - true si es administrador
 */
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
  
  // Verificar si el número termina con alguno de los números admin
  const todosLosNumerosAdmin = ADMIN_NUMBERS_SIN_SUFIJO || numerosAdmin;
  
  for (const numAdmin of todosLosNumerosAdmin) {
    const numAdminSinPrefijo = numAdmin.replace(/^\+?/, '').replace(/^51/, '');
    const numUsuarioSinPrefijo = numeroSinPrefijo.replace(/^51/, '');
    
    // Verificar coincidencia exacta sin prefijos
    if (numUsuarioSinPrefijo === numAdminSinPrefijo) {
      console.log(`✅ ADMINISTRADOR DETECTADO (coincidencia sin prefijos)`);
      return true;
    }
    
    // Verificar si el número admin está al final del número del usuario (últimos 9 dígitos)
    if (numUsuarioSinPrefijo.length >= 9 && numAdminSinPrefijo.length >= 9) {
      const ultimos9Usuario = numUsuarioSinPrefijo.slice(-9);
      const ultimos9Admin = numAdminSinPrefijo.slice(-9);
      if (ultimos9Usuario === ultimos9Admin) {
        console.log(`✅ ADMINISTRADOR DETECTADO (coincidencia últimos 9 dígitos)`);
        return true;
      }
    }
    
    // Verificar si contiene el número admin
    if (numUsuarioSinPrefijo.includes(numAdminSinPrefijo) || 
        numAdminSinPrefijo.includes(numUsuarioSinPrefijo)) {
      console.log(`✅ ADMINISTRADOR DETECTADO (coincidencia parcial)`);
      return true;
    }
    
    // Verificar si los últimos dígitos del número admin coinciden
    if (numAdminSinPrefijo.length >= 6 && numUsuarioSinPrefijo.length >= numAdminSinPrefijo.length) {
      const ultimosDigitosAdmin = numAdminSinPrefijo.slice(-6);
      const ultimosDigitosUsuario = numUsuarioSinPrefijo.slice(-6);
      if (ultimosDigitosUsuario === ultimosDigitosAdmin) {
        console.log(`✅ ADMINISTRADOR DETECTADO (coincidencia últimos 6 dígitos)`);
        return true;
      }
    }
  }
  
  console.log(`❌ NO ES ADMINISTRADOR`);
  return false;
}

/**
 * Obtiene las estadísticas del bot
 * @param {Object} estadisticas - Objeto con estadísticas globales
 * @returns {string} - Mensaje formateado con estadísticas
 */
function obtenerEstadisticas(estadisticas) {
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

/**
 * Obtiene las citas del día para administradores
 * @param {Date} fecha - Fecha a consultar (opcional, por defecto hoy)
 * @returns {Promise<string>} - Mensaje formateado con las citas
 */
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
      
      mensaje += `${index + 1}. ${estadoEmoji} *ID: ${reserva.id}* - ${hora}\n`;
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

/**
 * Procesa comandos de administrador
 * @param {Object} client - Cliente de wppconnect
 * @param {Object} message - Mensaje recibido
 * @param {string} userId - ID del usuario
 * @param {string} text - Texto del mensaje
 * @param {string} textLower - Texto en minúsculas
 * @param {Object} estadisticas - Estadísticas globales
 * @param {Object} iaGlobalDesactivada - Referencia al flag de IA global
 * @returns {Promise<boolean>} - true si se procesó un comando, false si no
 */
async function procesarComandosAdmin(client, message, userId, text, textLower, estadisticas, iaGlobalDesactivada) {
  // Verificar si es administrador
  if (!esAdministrador(userId)) {
    return false;
  }

  // Log solo en verbose
  if (config.LOG_LEVEL === 'verbose') {
    logMessage("INFO", `Admin: ${extraerNumero(userId)}`, {
      comando: text.substring(0, 30)
    });
  }

  // Comando: Procesar imagen de cita (solo administradores)
  if (message.type === 'image') {
    console.log(`\n📷 IMAGEN RECIBIDA DE ADMINISTRADOR - PROCESANDO...\n`);
    await procesarImagenCita(client, message, userId);
    return true;
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
      if (config.LOG_LEVEL === 'verbose') {
        logMessage("INFO", "Estadísticas enviadas al administrador");
      }
    } catch (error) {
      logMessage("ERROR", "Error al enviar estadísticas", {
        error: error.message,
      });
    }
    return true;
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
        return true;
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
        
        mensaje += `${idx + 1}. ${estadoEmoji} *ID: ${r.id}* - ${fechaHora}\n`;
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
    return true;
  }

  // Comando: Resetear sesión de usuario
  if (textoTrimReservas.startsWith("reset ")) {
    try {
      // Extraer número del comando (acepta cualquier formato)
      const numeroMatch = text.match(/reset\s+(\+?\d{9,12})/i);
      if (!numeroMatch) {
        await enviarMensajeSeguro(
          client,
          userId,
          "❌ Formato incorrecto.\n\nUso: `reset [número]`\n\nEjemplo: `reset 972002363` o `reset 51972002363`"
        );
        return true;
      }
      
      // Normalizar el número al formato estándar 51XXXXXXXXX
      const numeroNormalizado = normalizarTelefono(numeroMatch[1]);
      if (!numeroNormalizado) {
        await enviarMensajeSeguro(
          client,
          userId,
          "❌ Número de teléfono inválido.\n\nEl número debe tener entre 9 y 12 dígitos."
        );
        return true;
      }
      
      const numeroUsuario = numeroNormalizado + '@c.us';
      
      // Limpiar TODO el estado del usuario
      storage.setUserState(numeroUsuario, null);
      storage.setHumanMode(numeroUsuario, false);
      storage.setBotDesactivado(numeroUsuario, false);
      
      // Limpiar historial de conversación
      storage.setHistorial(numeroUsuario, []);
      
      // Limpiar datos de usuario completamente
      const userData = {};
      userData.iaDesactivada = false;
      userData.botDesactivadoPorAdmin = false;
      userData.modoReservaDesde = null;
      userData.saludoEnviado = false;
      userData.bienvenidaEnviada = false;
      userData.ultimaInteraccion = null;
      storage.setUserData(numeroUsuario, userData);
      
      // También verificar y desbloquear en la base de datos si está bloqueado
      try {
        await db.desbloquearUsuario(numeroNormalizado);
      } catch (error) {
        // No crítico si falla
        logMessage("WARNING", "Error al verificar bloqueo en BD (no crítico)", { error: error.message });
      }
      
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
    return true;
  }

  // Comando: Citas de fecha específica
  // Formato: citas_dd/MM/yyyy (ejemplo: citas_03/01/2025)
  const textoTrim = textLower.trim();
  const esComandoCitas = textoTrim.startsWith("citas_");
  
  if (esComandoCitas) {
    // Extraer la fecha del comando (después de "citas_")
    const fechaStr = textoTrim.substring(6); // Quitar "citas_"
    
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
        const citas = await obtenerCitasDelDia(fechaConsulta);
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
    return true;
  }

  // Comandos de IA (más específicos)
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
  
  if (esDesactivarIA) {
    console.log(`\n✅ ✅ ✅ COMANDO "DESACTIVAR IA" DETECTADO - EJECUTANDO... ✅ ✅ ✅\n`);
    iaGlobalDesactivada.value = true;
    try {
      await db.establecerConfiguracion('flag_ia_activada', '0', 'IA desactivada globalmente');
      await enviarMensajeSeguro(
        client,
        userId,
        "✅ *IA Desactivada*\n\nLa inteligencia artificial ha sido desactivada globalmente.\n\nEl bot seguirá funcionando pero sin respuestas de IA.\n\nPara reactivarla, escribe: *Activar IA*"
      );
      logMessage("INFO", "IA desactivada globalmente por el administrador");
      console.log(`\n✅ IA DESACTIVADA CORRECTAMENTE\n`);
    } catch (error) {
      logMessage("ERROR", "Error al desactivar IA", {
        error: error.message,
      });
    }
    return true;
  }
  
  if (esActivarIA) {
    console.log(`\n✅ ✅ ✅ COMANDO "ACTIVAR IA" DETECTADO - EJECUTANDO... ✅ ✅ ✅\n`);
    iaGlobalDesactivada.value = false;
    try {
      await db.establecerConfiguracion('flag_ia_activada', '1', 'IA activada globalmente');
      await enviarMensajeSeguro(
        client,
        userId,
        "✅ *IA Activada*\n\nLa inteligencia artificial ha sido reactivada globalmente.\n\nEl bot ahora puede usar IA para responder a los usuarios."
      );
      logMessage("INFO", "IA reactivada globalmente por el administrador");
      console.log(`\n✅ IA ACTIVADA CORRECTAMENTE\n`);
    } catch (error) {
      logMessage("ERROR", "Error al activar IA", {
        error: error.message,
      });
    }
    return true;
  }

  // Comando: Estado de IA
  if (
    textLower === "estado ia" ||
    textLower === "estado de la ia" ||
    textLower === "ia estado"
  ) {
    const estadoIA = iaGlobalDesactivada.value
      ? "❌ Desactivada"
      : "✅ Activada";
    try {
      await enviarMensajeSeguro(
        client,
        userId,
        `📊 *Estado de la IA*\n\n${estadoIA}\n\nPara cambiar el estado:\n• *Desactivar IA* - Desactiva la IA globalmente\n• *Activar IA* - Reactiva la IA globalmente`
      );
      if (config.LOG_LEVEL === 'verbose') {
        logMessage("INFO", "Estado de IA consultado por el administrador");
      }
    } catch (error) {
      logMessage("ERROR", "Error al consultar estado de IA", {
        error: error.message,
      });
    }
    return true;
  }

  // Comandos de Bot
  const esDesactivarBot = 
    textoTrimIA === "desactivar bot" ||
    textoTrimIA.startsWith("desactivar bot ") ||
    textoTrimIA === "bot off";
  
  const esActivarBot = 
    textoTrimIA === "activar bot" ||
    textoTrimIA.startsWith("activar bot ") ||
    textoTrimIA === "bot on";

  // Comando: Desactivar bot
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
      return true;
    }
    
    // Si hay número, desactivar para usuario específico
    const numeroMatch = text.match(/(?:desactivar bot|bot off)\s+(\+?\d{9,12})/i) || text.match(/(\d{9,12})/);

    if (numeroMatch) {
      // Normalizar el número al formato estándar 51XXXXXXXXX
      const numeroBuscado = normalizarTelefono(numeroMatch[1]);
      if (!numeroBuscado) {
        await enviarMensajeSeguro(
          client,
          userId,
          "❌ Número de teléfono inválido.\n\nUso: *Desactivar bot [número]*\n\nEjemplo: *Desactivar bot 972002363*"
        );
        return true;
      }
      let usuarioEncontrado = null;

      // Buscar el usuario por número (normalizar números para comparación)
      for (const [uid, nombre] of storage.userNames.entries()) {
        const numeroUsuario = normalizarTelefono(extraerNumero(uid));
        if (numeroUsuario === numeroBuscado) {
          usuarioEncontrado = uid;
          break;
        }
      }

      if (usuarioEncontrado) {
        storage.setBotDesactivado(usuarioEncontrado, true);
        storage.setHumanMode(usuarioEncontrado, true);
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
          logMessage("INFO", `Bot desactivado para usuario ${storage.getUserName(usuarioEncontrado)} (${extraerNumero(usuarioEncontrado)}) por el administrador`);
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
    return true;
  }

  // Comando: Activar bot
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
      return true;
    }
    
    // Si hay número, activar para usuario específico
    const numeroMatch = text.match(/(?:activar bot|bot on)\s+(\+?\d{9,12})/i) || text.match(/(\d{9,12})/);

    if (numeroMatch) {
      // Normalizar el número al formato estándar 51XXXXXXXXX
      const numeroBuscado = normalizarTelefono(numeroMatch[1]);
      if (!numeroBuscado) {
        await enviarMensajeSeguro(
          client,
          userId,
          "❌ Número de teléfono inválido.\n\nUso: *Activar bot [número]*\n\nEjemplo: *Activar bot 972002363*"
        );
        return true;
      }
      let usuarioEncontrado = null;

      // Buscar el usuario por número (normalizar números para comparación)
      for (const [uid, nombre] of storage.userNames.entries()) {
        const numeroUsuario = normalizarTelefono(extraerNumero(uid));
        if (numeroUsuario === numeroBuscado) {
          usuarioEncontrado = uid;
          break;
        }
      }

      if (usuarioEncontrado) {
        storage.setBotDesactivado(usuarioEncontrado, false);
        const userDataAdmin = storage.getUserData(usuarioEncontrado) || {};
        if (userDataAdmin?.botDesactivadoPorAdmin) {
          storage.setHumanMode(usuarioEncontrado, false);
        }
        userDataAdmin.botDesactivadoPorAdmin = false;
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
          logMessage("INFO", `Bot reactivado para usuario ${storage.getUserName(usuarioEncontrado)} (${extraerNumero(usuarioEncontrado)}) por el administrador`);
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
    return true;
  }

  // ============================================
  // GESTIÓN DE RESERVAS
  // ============================================

  // Comando: confirmar cita [id]
  if (textLower.startsWith("confirmar cita ")) {
    const idMatch = text.match(/confirmar cita (\d+)/i);
    if (idMatch) {
      const id = parseInt(idMatch[1]);
      try {
        const exito = await db.confirmarReserva(id);
        if (exito) {
          const reserva = await db.obtenerDetalleReserva(id);
          await enviarMensajeSeguro(
            client,
            userId,
            `✅ *Cita Confirmada*\n\n` +
            `ID: ${id}\n` +
            `👤 Cliente: ${reserva.userName}\n` +
            `📅 Fecha/Hora: ${reserva.fechaHora.toLocaleString('es-PE')}\n` +
            `💆 Servicio: ${reserva.servicio}`
          );
        } else {
          await enviarMensajeSeguro(client, userId, `❌ No se encontró una cita con ID ${id}`);
        }
      } catch (error) {
        logMessage("ERROR", "Error al confirmar cita", { error: error.message });
        await enviarMensajeSeguro(client, userId, `❌ Error al confirmar la cita: ${error.message}`);
      }
      return true;
    }
  }

  // Comando: cancelar cita [id]
  if (textLower.startsWith("cancelar cita ")) {
    const idMatch = text.match(/cancelar cita (\d+)/i);
    if (idMatch) {
      const id = parseInt(idMatch[1]);
      try {
        const exito = await db.cancelarReservaPorId(id);
        if (exito) {
          await enviarMensajeSeguro(client, userId, `✅ Cita #${id} cancelada correctamente`);
        } else {
          await enviarMensajeSeguro(client, userId, `❌ No se encontró una cita con ID ${id}`);
        }
      } catch (error) {
        logMessage("ERROR", "Error al cancelar cita", { error: error.message });
        await enviarMensajeSeguro(client, userId, `❌ Error al cancelar la cita: ${error.message}`);
      }
      return true;
    }
  }

  // Comando: modificar cita [id] fecha hora
  if (textLower.startsWith("modificar cita ")) {
    const match = text.match(/modificar cita (\d+) (.+)/i);
    if (match) {
      const id = parseInt(match[1]);
      const nuevaFechaHoraStr = match[2].trim();
      
      try {
        // Parser mejorado de fecha/hora con múltiples formatos
        let nuevaFechaHora = null;
        
        // Formato 1: "15/01/2026 14:30" o "15/01/2026 2:30 PM"
        const formato1 = nuevaFechaHoraStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
        if (formato1) {
          let dia = parseInt(formato1[1]);
          let mes = parseInt(formato1[2]) - 1; // Mes es 0-indexed
          let año = parseInt(formato1[3]);
          let hora = parseInt(formato1[4]);
          let minuto = parseInt(formato1[5]);
          const ampm = formato1[6]?.toUpperCase();
          
          if (ampm === 'PM' && hora < 12) hora += 12;
          if (ampm === 'AM' && hora === 12) hora = 0;
          
          nuevaFechaHora = new Date(año, mes, dia, hora, minuto);
        }
        
        // Formato 2: "15-01-2026 14:30"
        if (!nuevaFechaHora || isNaN(nuevaFechaHora.getTime())) {
          const formato2 = nuevaFechaHoraStr.match(/(\d{1,2})-(\d{1,2})-(\d{4})\s+(\d{1,2}):(\d{2})/);
          if (formato2) {
            let dia = parseInt(formato2[1]);
            let mes = parseInt(formato2[2]) - 1;
            let año = parseInt(formato2[3]);
            let hora = parseInt(formato2[4]);
            let minuto = parseInt(formato2[5]);
            nuevaFechaHora = new Date(año, mes, dia, hora, minuto);
          }
        }
        
        // Formato 3: "15/01/2026" (solo fecha, usar hora por defecto 14:00)
        if (!nuevaFechaHora || isNaN(nuevaFechaHora.getTime())) {
          const formato3 = nuevaFechaHoraStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (formato3) {
            let dia = parseInt(formato3[1]);
            let mes = parseInt(formato3[2]) - 1;
            let año = parseInt(formato3[3]);
            nuevaFechaHora = new Date(año, mes, dia, 14, 0); // Hora por defecto: 2 PM
          }
        }
        
        // Formato 4: ISO o formato estándar de JavaScript
        if (!nuevaFechaHora || isNaN(nuevaFechaHora.getTime())) {
          nuevaFechaHora = new Date(nuevaFechaHoraStr);
        }
        
        // Validar que la fecha sea válida y futura
        if (!nuevaFechaHora || isNaN(nuevaFechaHora.getTime())) {
          await enviarMensajeSeguro(
            client,
            userId,
            `❌ Formato de fecha/hora inválido.\n\n` +
            `Formatos aceptados:\n` +
            `• 15/01/2026 14:30\n` +
            `• 15/01/2026 2:30 PM\n` +
            `• 15-01-2026 14:30\n` +
            `• 15/01/2026 (usa hora 14:00 por defecto)\n` +
            `• 2026-01-15T14:30:00\n\n` +
            `Ejemplo: modificar cita 123 15/01/2026 14:30`
          );
          return true;
        }
        
        // Validar que la fecha no sea en el pasado
        if (nuevaFechaHora < new Date()) {
          await enviarMensajeSeguro(
            client,
            userId,
            `❌ La fecha/hora debe ser en el futuro.\n\n` +
            `Fecha ingresada: ${nuevaFechaHora.toLocaleString('es-PE')}`
          );
          return true;
        }
        
        const exito = await db.modificarFechaHoraReserva(id, nuevaFechaHora);
        if (exito) {
          const reserva = await db.obtenerDetalleReserva(id);
          await enviarMensajeSeguro(
            client,
            userId,
            `✅ *Cita Modificada*\n\n` +
            `ID: ${id}\n` +
            `👤 Cliente: ${reserva.userName}\n` +
            `📅 Nueva Fecha/Hora: ${reserva.fechaHora.toLocaleString('es-PE')}\n` +
            `💆 Servicio: ${reserva.servicio}`
          );
        } else {
          await enviarMensajeSeguro(client, userId, `❌ No se encontró una cita con ID ${id}`);
        }
      } catch (error) {
        logMessage("ERROR", "Error al modificar cita", { error: error.message });
        await enviarMensajeSeguro(
          client,
          userId,
          `❌ Error al modificar la cita: ${error.message}`
        );
      }
      return true;
    }
  }

  // Comando: detalle cita [id]
  if (textLower.startsWith("detalle cita ")) {
    const idMatch = text.match(/detalle cita (\d+)/i);
    if (idMatch) {
      const id = parseInt(idMatch[1]);
      try {
        const reserva = await db.obtenerDetalleReserva(id);
        if (reserva) {
          const estadoEmoji = reserva.estado === 'confirmada' ? '✅' : 
                             reserva.estado === 'cancelada' ? '❌' : '⏳';
          
          await enviarMensajeSeguro(
            client,
            userId,
            `📋 *DETALLE DE CITA #${id}*\n\n` +
            `${estadoEmoji} *Estado:* ${reserva.estado}\n` +
            `👤 *Cliente:* ${reserva.userName}\n` +
            `📱 *Teléfono:* ${extraerNumero(reserva.userId)}\n` +
            `💆 *Servicio:* ${reserva.servicio}\n` +
            `📅 *Fecha/Hora:* ${reserva.fechaHora.toLocaleString('es-PE')}\n` +
            `⏱️ *Duración:* ${reserva.duracion} minutos\n` +
            `💰 *Depósito:* S/${reserva.deposito}\n` +
            `📝 *Origen:* ${reserva.origen}\n` +
            (reserva.notas ? `📄 *Notas:* ${reserva.notas}\n` : '') +
            `\n📅 Creada: ${reserva.creada.toLocaleString('es-PE')}\n` +
            `🔄 Actualizada: ${reserva.actualizada.toLocaleString('es-PE')}`
          );
        } else {
          await enviarMensajeSeguro(client, userId, `❌ No se encontró una cita con ID ${id}`);
        }
      } catch (error) {
        logMessage("ERROR", "Error al obtener detalle de cita", { error: error.message });
        await enviarMensajeSeguro(client, userId, `❌ Error al obtener el detalle: ${error.message}`);
      }
      return true;
    }
  }

  // ============================================
  // CONTROL DE IA
  // ============================================

  // Comando: ia modo [auto|manual|solo_faq]
  if (textLower.startsWith("ia modo ")) {
    const modoMatch = text.match(/ia modo (auto|manual|solo_faq)/i);
    if (modoMatch) {
      const modo = modoMatch[1].toLowerCase();
      try {
        await db.establecerConfiguracion('modo_ia', modo, `Modo de IA: ${modo}`);
        await enviarMensajeSeguro(
          client,
          userId,
          `✅ *Modo de IA actualizado*\n\n` +
          `Modo: *${modo}*\n\n` +
          `• *auto*: IA responde automáticamente\n` +
          `• *manual*: IA solo cuando se solicita\n` +
          `• *solo_faq*: IA solo para preguntas frecuentes`
        );
        logMessage("INFO", "Modo de IA actualizado", { modo, adminId: extraerNumero(userId) });
      } catch (error) {
        logMessage("ERROR", "Error al actualizar modo IA", { error: error.message });
        await enviarMensajeSeguro(client, userId, `❌ Error al actualizar el modo: ${error.message}`);
      }
      return true;
    }
  }

  // Comando: ia limite [n]
  if (textLower.startsWith("ia limite ")) {
    const limiteMatch = text.match(/ia limite (\d+)/i);
    if (limiteMatch) {
      const limite = parseInt(limiteMatch[1]);
      if (limite > 0 && limite <= 100) {
        try {
          await db.establecerConfiguracion('limite_ia_por_usuario', String(limite), `Límite de IA por usuario: ${limite}`);
          await enviarMensajeSeguro(
            client,
            userId,
            `✅ *Límite de IA actualizado*\n\n` +
            `Límite diario por usuario: *${limite}* respuestas`
          );
          logMessage("INFO", "Límite de IA actualizado", { limite, adminId: extraerNumero(userId) });
        } catch (error) {
          logMessage("ERROR", "Error al actualizar límite IA", { error: error.message });
          await enviarMensajeSeguro(client, userId, `❌ Error al actualizar el límite: ${error.message}`);
        }
      } else {
        await enviarMensajeSeguro(client, userId, `❌ El límite debe estar entre 1 y 100`);
      }
      return true;
    }
  }

  // ============================================
  // GESTIÓN DE USUARIOS
  // ============================================

  // Comando: ver cliente [telefono]
  if (textLower.startsWith("ver cliente ")) {
    const telefonoMatch = text.match(/ver cliente (\+?\d{9,12})/i);
    if (telefonoMatch) {
      // Normalizar el número al formato estándar 51XXXXXXXXX
      const telefono = normalizarTelefono(telefonoMatch[1]);
      if (!telefono) {
        await enviarMensajeSeguro(client, userId, `❌ Número de teléfono inválido.\n\nUso: *ver cliente [número]*\n\nEjemplo: *ver cliente 972002363*`);
        return true;
      }
      
      try {
        // Buscar con el formato normalizado (51XXXXXXXXX)
        const historial = await db.obtenerHistorialCliente(telefono);
        
        if (historial && historial.cliente) {
          let mensaje = `👤 *CLIENTE*\n\n`;
          mensaje += `📱 *Teléfono:* ${telefono}\n`;
          mensaje += `👤 *Nombre:* ${historial.cliente.nombre || 'No registrado'}\n`;
          mensaje += `📅 *Cliente desde:* ${new Date(historial.cliente.fecha_creacion).toLocaleDateString('es-PE')}\n`;
          mensaje += `📊 *Total reservas:* ${historial.cliente.total_reservas || 0}\n`;
          mensaje += `❌ *Canceladas:* ${historial.cliente.reservas_canceladas || 0}\n`;
          if (historial.cliente.notas) {
            mensaje += `📄 *Notas:* ${historial.cliente.notas}\n`;
          }
          
          if (historial.reservas && historial.reservas.length > 0) {
            mensaje += `\n📋 *Historial de Reservas:*\n\n`;
            historial.reservas.slice(0, 10).forEach((r, idx) => {
              const estadoEmoji = r.estado === 'confirmada' ? '✅' : 
                                 r.estado === 'cancelada' ? '❌' : '⏳';
              const fechaHora = r.fechaHora instanceof Date 
                ? r.fechaHora.toLocaleString('es-PE')
                : new Date(r.fechaHora).toLocaleString('es-PE');
              mensaje += `${idx + 1}. ${estadoEmoji} ${fechaHora} - ${r.servicio}\n`;
            });
            if (historial.reservas.length > 10) {
              mensaje += `\n... y ${historial.reservas.length - 10} más`;
            }
          } else {
            mensaje += `\n📋 *Historial de Reservas:*\n\nNo hay reservas registradas.`;
          }
          
          await enviarMensajeSeguro(client, userId, mensaje);
        } else {
          await enviarMensajeSeguro(client, userId, `❌ No se encontró información del cliente ${telefono}\n\nVerifica que el número sea correcto y que el cliente haya interactuado con el bot.`);
        }
      } catch (error) {
        logMessage("ERROR", "Error al obtener historial cliente", { error: error.message, telefono });
        await enviarMensajeSeguro(client, userId, `❌ Error al obtener el historial: ${error.message}`);
      }
      return true;
    } else {
      // Si no coincide el regex, mostrar ayuda
      await enviarMensajeSeguro(client, userId, `❌ Formato incorrecto.\n\nUso: *ver cliente [número]*\n\nEjemplo: *ver cliente 972002363*`);
      return true;
    }
  }

  // Comando: bloquear cliente [telefono]
  if (textLower.startsWith("bloquear cliente ")) {
    const telefonoMatch = text.match(/bloquear cliente (\+?\d{9,12})/i);
    if (telefonoMatch) {
      // Normalizar el número al formato estándar 51XXXXXXXXX
      const telefono = normalizarTelefono(telefonoMatch[1]);
      if (!telefono) {
        await enviarMensajeSeguro(client, userId, `❌ Número de teléfono inválido.\n\nUso: *bloquear cliente [número]*\n\nEjemplo: *bloquear cliente 972002363*`);
        return true;
      }
      
      try {
        await db.bloquearUsuario(telefono, 'Bloqueado por administrador', extraerNumero(userId));
        await enviarMensajeSeguro(
          client,
          userId,
          `✅ *Cliente Bloqueado*\n\n` +
          `📱 Teléfono: ${telefono}\n\n` +
          `El bot dejará de responder a este número.`
        );
        logMessage("SUCCESS", "Cliente bloqueado", { telefono, adminId: extraerNumero(userId) });
      } catch (error) {
        logMessage("ERROR", "Error al bloquear cliente", { error: error.message });
        await enviarMensajeSeguro(client, userId, `❌ Error al bloquear: ${error.message}`);
      }
      return true;
    } else {
      await enviarMensajeSeguro(client, userId, `❌ Formato incorrecto.\n\nUso: *bloquear cliente [número]*\n\nEjemplo: *bloquear cliente 972002363*`);
      return true;
    }
  }

  // Comando: desbloquear cliente [telefono]
  if (textLower.startsWith("desbloquear cliente ")) {
    const telefonoMatch = text.match(/desbloquear cliente (\+?\d{9,12})/i);
    if (telefonoMatch) {
      // Normalizar el número al formato estándar 51XXXXXXXXX
      const telefono = normalizarTelefono(telefonoMatch[1]);
      if (!telefono) {
        await enviarMensajeSeguro(client, userId, `❌ Número de teléfono inválido.\n\nUso: *desbloquear cliente [número]*\n\nEjemplo: *desbloquear cliente 972002363*`);
        return true;
      }
      
      try {
        // Desbloquear con formato normalizado
        const exito = await db.desbloquearUsuario(telefono);
        
        if (exito) {
          await enviarMensajeSeguro(
            client,
            userId,
            `✅ *Cliente Desbloqueado*\n\n` +
            `📱 Teléfono: ${telefono}\n\n` +
            `El bot volverá a responder a este número.`
          );
          logMessage("SUCCESS", "Cliente desbloqueado", { telefono, adminId: extraerNumero(userId) });
        } else {
          await enviarMensajeSeguro(client, userId, `❌ El cliente ${telefono} no estaba bloqueado`);
        }
      } catch (error) {
        logMessage("ERROR", "Error al desbloquear cliente", { error: error.message });
        await enviarMensajeSeguro(client, userId, `❌ Error al desbloquear: ${error.message}`);
      }
      return true;
    } else {
      await enviarMensajeSeguro(client, userId, `❌ Formato incorrecto.\n\nUso: *desbloquear cliente [número]*\n\nEjemplo: *desbloquear cliente 972002363*`);
      return true;
    }
  }

  // ============================================
  // REPORTES
  // ============================================

  // Comando: reporte diario
  if (textLower === "reporte diario" || textLower === "reporte del dia") {
    const reportsHandler = require('./reports');
    await reportsHandler.enviarReporteDiario(client, userId);
    return true;
  }

  // Comando: reporte mensual
  if (textLower.startsWith("reporte mensual")) {
    const reportsHandler = require('./reports');
    const ahora = new Date();
    await reportsHandler.enviarReporteMensual(client, userId, ahora.getMonth() + 1, ahora.getFullYear());
    return true;
  }

  // Comando: top servicios
  if (textLower === "top servicios" || textLower === "servicios mas solicitados") {
    const reportsHandler = require('./reports');
    await reportsHandler.enviarTopServicios(client, userId, 10);
    return true;
  }

  // ============================================
  // GESTIÓN DE SERVICIOS
  // ============================================

  // Comando: listar servicios
  if (textLower === "listar servicios" || textLower === "servicios") {
    try {
      const servicios = await db.listarServicios();
      if (servicios.length === 0) {
        await enviarMensajeSeguro(client, userId, "📋 *SERVICIOS*\n\nNo hay servicios activos.");
        return true;
      }
      
      let mensaje = `📋 *SERVICIOS ACTIVOS*\n\n`;
      servicios.forEach((s, idx) => {
        mensaje += `${idx + 1}. *${s.nombre}*\n`;
        mensaje += `   ⏱️ Duración: ${s.duracion} min\n`;
        mensaje += `   💰 Precio: S/${s.precio}\n`;
        if (s.categoria) mensaje += `   📂 Categoría: ${s.categoria}\n`;
        mensaje += `\n`;
      });
      
      await enviarMensajeSeguro(client, userId, mensaje);
    } catch (error) {
      logMessage("ERROR", "Error al listar servicios", { error: error.message });
      await enviarMensajeSeguro(client, userId, `❌ Error al listar servicios: ${error.message}`);
    }
    return true;
  }

  // Comando: agregar servicio [nombre] [duracion] [precio]
  if (textLower.startsWith("agregar servicio ")) {
    const match = text.match(/agregar servicio (.+?) (\d+) (\d+(?:\.\d+)?)/i);
    if (match) {
      const nombre = match[1].trim();
      const duracion = parseInt(match[2]);
      const precio = parseFloat(match[3]);
      
      try {
        const id = await db.agregarServicio(nombre, duracion, precio);
        await enviarMensajeSeguro(
          client,
          userId,
          `✅ *Servicio Agregado*\n\n` +
          `ID: ${id}\n` +
          `Nombre: ${nombre}\n` +
          `Duración: ${duracion} min\n` +
          `Precio: S/${precio}`
        );
        logMessage("INFO", "Servicio agregado", { id, nombre, adminId: extraerNumero(userId) });
      } catch (error) {
        logMessage("ERROR", "Error al agregar servicio", { error: error.message });
        await enviarMensajeSeguro(client, userId, `❌ Error al agregar servicio: ${error.message}`);
      }
      return true;
    } else {
      await enviarMensajeSeguro(
        client,
        userId,
        `❌ Formato incorrecto.\n\nUso: agregar servicio [nombre] [duracion] [precio]\n\nEjemplo: agregar servicio Masaje Relajante 60 35`
      );
      return true;
    }
  }

  // Comando: desactivar servicio [id]
  if (textLower.startsWith("desactivar servicio ")) {
    const idMatch = text.match(/desactivar servicio (\d+)/i);
    if (idMatch) {
      const id = parseInt(idMatch[1]);
      try {
        const exito = await db.desactivarServicio(id);
        if (exito) {
          await enviarMensajeSeguro(client, userId, `✅ Servicio #${id} desactivado correctamente`);
        } else {
          await enviarMensajeSeguro(client, userId, `❌ No se encontró un servicio con ID ${id}`);
        }
      } catch (error) {
        logMessage("ERROR", "Error al desactivar servicio", { error: error.message });
        await enviarMensajeSeguro(client, userId, `❌ Error al desactivar servicio: ${error.message}`);
      }
      return true;
    }
  }

  // Si no se procesó ningún comando, retornar false
  return false;
}

module.exports = {
  esAdministrador,
  procesarComandosAdmin,
  obtenerEstadisticas,
  obtenerCitasDelDia
};
