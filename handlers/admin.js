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
  // Manejar casos donde estadisticas puede no tener todas las propiedades
  const usuariosAtendidos = estadisticas.usuariosAtendidos 
    ? (estadisticas.usuariosAtendidos.size || estadisticas.usuariosAtendidos || 0)
    : (estadisticas.usuariosActivos || 0);
  const totalMensajes = estadisticas.totalMensajes || 0;
  const reservasSolicitadas = estadisticas.reservasSolicitadas || estadisticas.totalReservas || 0;
  const asesoresActivados = estadisticas.asesoresActivados || 0;
  const inicio = estadisticas.inicio ? new Date(estadisticas.inicio) : new Date();
  const diasActivo = Math.floor(
    (new Date() - inicio) / (1000 * 60 * 60 * 24)
  );
  return `
📊 *ESTADÍSTICAS DEL BOT*

👥 *Usuarios únicos atendidos:* ${usuariosAtendidos}
💬 *Total de mensajes procesados:* ${totalMensajes}
📅 *Reservas solicitadas:* ${reservasSolicitadas}
🧑‍💼 *Modos asesor activados:* ${asesoresActivados}
⏰ *Días activo:* ${diasActivo}
📈 *Promedio mensajes/día:* ${
    diasActivo > 0 ? Math.round(totalMensajes / diasActivo) : 0
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

  // Comando reset [numero] eliminado - el payload no proporciona números reales

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

  // Comandos de Bot (controla tanto bot como IA)
  const textoTrimBot = textLower.trim();
  const esDesactivarBot = 
    textoTrimBot === "desactivar bot" ||
    textoTrimBot === "bot off";
  
  const esActivarBot = 
    textoTrimBot === "activar bot" ||
    textoTrimBot === "bot on";

  // Comando: Desactivar bot (desactiva bot e IA completamente)
  if (esDesactivarBot) {
    if (textoTrimBot === "desactivar bot" || textoTrimBot === "bot off") {
      try {
        // Desactivar tanto el bot como la IA
        await db.establecerConfiguracion('flag_bot_activo', '0', 'Bot desactivado globalmente');
        await db.establecerConfiguracion('flag_ia_activada', '0', 'IA desactivada junto con el bot');
        await enviarMensajeSeguro(
          client,
          userId,
          "✅ *Bot Desactivado Completamente*\n\nEl bot y la IA han sido desactivados globalmente.\n\nTodos los mensajes serán ignorados hasta que reactives el bot.\n\nPara reactivarlo, escribe: *Activar bot*"
        );
        logMessage("INFO", "Bot y IA desactivados globalmente por administrador", {
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
  }

  // Comando: Activar bot (activa bot e IA completamente)
  if (esActivarBot) {
    if (textoTrimBot === "activar bot" || textoTrimBot === "bot on") {
      try {
        // Activar tanto el bot como la IA
        await db.establecerConfiguracion('flag_bot_activo', '1', 'Bot activado globalmente');
        await db.establecerConfiguracion('flag_ia_activada', '1', 'IA activada junto con el bot');
        await enviarMensajeSeguro(
          client,
          userId,
          "✅ *Bot Activado Completamente*\n\nEl bot y la IA han sido reactivados globalmente.\n\nAhora puede procesar todos los mensajes y responder con IA normalmente."
        );
        logMessage("INFO", "Bot y IA activados globalmente por administrador", {
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

  // Comandos eliminados: ver cliente, bloquear cliente, desbloquear cliente
  // El payload de WhatsApp Cloud API no proporciona el número real del usuario,
  // solo el session_id (@lid), por lo que estos comandos no son funcionales.

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

  // Si no se procesó ningún comando, mostrar lista de comandos disponibles
  await mostrarListaComandos(client, userId);
  return true;
}

/**
 * Muestra la lista completa de comandos disponibles para administradores
 * @param {Object} client - Cliente de wppconnect
 * @param {string} userId - ID del usuario administrador
 */
async function mostrarListaComandos(client, userId) {
  const listaComandos = `📋 *COMANDOS DISPONIBLES PARA ADMINISTRADORES*\n\n` +
    `📊 *ESTADÍSTICAS Y REPORTES*\n` +
    `• estadisticas / stats / estadísticas - Ver estadísticas del bot\n` +
    `• ver reservas / reservas activas - Ver todas las reservas activas\n` +
    `• citas_dd/MM/yyyy - Ver citas de una fecha específica\n` +
    `   Ejemplo: citas_15/01/2025\n` +
    `• reporte diario / reporte del dia - Reporte diario de actividad\n` +
    `• reporte mensual - Reporte mensual de actividad\n` +
    `• top servicios / servicios mas solicitados - Servicios más solicitados\n\n` +
    `📅 *GESTIÓN DE CITAS*\n` +
    `• confirmar cita [id] - Confirmar una cita\n` +
    `• cancelar cita [id] - Cancelar una cita\n` +
    `• modificar cita [id] - Modificar una cita\n` +
    `• detalle cita [id] - Ver detalles de una cita\n` +
    `• 📷 Enviar imagen - Crear cita desde imagen\n\n` +
    `🤖 *CONTROL DEL BOT*\n` +
    `• activar bot / bot on - Activar bot completamente (bot + IA)\n` +
    `• desactivar bot / bot off - Desactivar bot completamente (bot + IA)\n\n` +
    `🤖 *CONFIGURACIÓN DE IA*\n` +
    `• ia modo [auto|manual|solo_faq] - Cambiar modo de IA\n` +
    `• ia limite [n] - Establecer límite diario de IA (1-100)\n\n` +
    `📋 *GESTIÓN DE SERVICIOS*\n` +
    `• listar servicios / servicios - Listar servicios activos\n` +
    `• agregar servicio [nombre] [duracion] [precio] - Agregar servicio\n` +
    `   Ejemplo: agregar servicio Masaje Relajante 60 35\n` +
    `• desactivar servicio [id] - Desactivar un servicio\n\n` +
    `💡 *NOTA*\n` +
    `Los comandos que requerían número de teléfono han sido eliminados porque el payload de WhatsApp Cloud API no proporciona números reales, solo session_id (@lid).`;

  try {
    await enviarMensajeSeguro(client, userId, listaComandos);
  } catch (error) {
    logMessage("ERROR", "Error al enviar lista de comandos", { error: error.message });
  }
}

module.exports = {
  esAdministrador,
  procesarComandosAdmin,
  obtenerEstadisticas,
  obtenerCitasDelDia
};
