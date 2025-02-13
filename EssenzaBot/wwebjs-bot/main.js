require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const userState = {};
const humanModeUsers = new Map();
const AUTO_REACTIVATE_TIME = 10 * 60 * 1000; // 10 minutos en milisegundos

// 📌 Números configurados
const ADMIN_NUMBER = "51921240722@c.us"; // Notificación cuando un usuario pide un asesor

// 📌 Lista de servicios
const servicios = {
  1: "Masajes (45 min)",
  2: "Limpieza facial (60 min)",
  3: "Manicura y pedicura",
  4: "Extensiones de pestañas",
  5: "Diseño de cejas",
  6: "Fisioterapia y terapias",
};

// Inicializar el bot
const client = new Client({ authStrategy: new LocalAuth() });

// Mostrar QR para conectar el bot
client.on("qr", (qr) => {
  console.log("Escanea este código QR para conectar el bot:");
  qrcode.generate(qr, { small: true });
});

// Confirmar que el bot está activo
client.once("ready", () => {
  console.log("✅ Bot de WhatsApp listo y conectado.");
});

// 📌 Función para reactivar el bot después de 10 minutos
const checkReactivation = () => {
  const now = Date.now();
  humanModeUsers.forEach((startTime, userId) => {
    if (now - startTime >= AUTO_REACTIVATE_TIME) {
      humanModeUsers.delete(userId);
      client.sendMessage(
        userId,
        "🤖 El bot ha sido reactivado. Si necesitas ayuda, escribe *Asesor* nuevamente."
      );
    }
  });
};

// Revisar reactivación cada 1 minuto
setInterval(checkReactivation, 60 * 1000);

// 📌 Manejo de mensajes entrantes
client.on("message", async (message) => {
  const userId = message.from;
  const text = message.body.trim().toLowerCase();

  // 📌 Modo Asesor: desactivar bot y registrar tiempo
  if (text === "asesor") {
    humanModeUsers.set(userId, Date.now());
    await client.sendMessage(
      ADMIN_NUMBER,
      `🔔 *Atención requerida:* El usuario ${userId} ha solicitado un *Asesor*.`
    );
    return await message.reply(
      "🧑‍💼 Te comunicaremos con un asesor y el bot dejará de responder."
    );
  }

  // 📌 Si el usuario está en modo asesor, el bot NO responde
  if (humanModeUsers.has(userId)) return;

  // 📌 Volver al menú principal
  if (text === "menu") {
    userState[userId] = "menu_principal";
    return sendMainMenu(message);
  }

  // 📌 Si el usuario no tiene estado, asignarlo al menú principal
  if (!userState[userId]) {
    userState[userId] = "menu_principal";
    return sendMainMenu(message);
  }

  // 📌 Manejo de flujos
  switch (userState[userId]) {
    case "menu_principal":
      switch (text) {
        case "hola":
          return sendMainMenu(message);

        case "1":
          userState[userId] = "menu_servicios";
          return await message.reply(
            "💆‍♀️ *Nuestros servicios disponibles:*\n" +
              "1️⃣ Masajes (45 min)\n" +
              "2️⃣ Limpieza facial (60 min)\n" +
              "3️⃣ Manicura y pedicura\n" +
              "4️⃣ Extensiones de pestañas\n" +
              "5️⃣ Diseño de cejas\n" +
              "6️⃣ Fisioterapia y terapias\n\n" +
              "✏️ Escribe el número del servicio que deseas conocer o *Volver*.\n\n" +
              "📞 Si necesitas hablar con alguien, escribe *Asesor* y te comunicaremos con un asesor.\n\n" +
              "👉 Si necesitas ir al menú principal, escribe *Menu*"
          );

        case "2":
          userState[userId] = "menu_promociones";
          return await message.reply(
            "🌟 *Promoción del mes:* Masaje relajante + Limpieza facial por S/50 🌿\n\n" +
              "📞 Si necesitas más información, escribe *Asesor* y te comunicaremos con un asesor.\n\n" +
              "👉 Si necesitas ir al menú principal, escribe *Menu*"
          );

        case "3":
          return goToReservas(userId, message);

        case "4":
          userState[userId] = "menu_ubicacion";
          return await message.reply(
            "📍 Estamos en *Puente Piedra, Lima, Perú*.\n👉 [Google Maps](https://maps.app.goo.gl/R5F8PGbcFufNADF39)\n\n" +
              "📞 Si necesitas más información, escribe *Asesor* y te comunicaremos con un asesor.\n\n" +
              "👉 Si necesitas ir al menú principal, escribe *Menu*"
          );

        case "5":
          userState[userId] = "menu_pagos";
          return await message.reply(
            "💳 *Métodos de pago:* Efectivo, Yape, Plin, Tarjeta.\n\n" +
              "📌 *Datos para transferencia:*\n" +
              "Yape: *953348917*\n" +
              "Transferencia bancaria:\n- *Esther Ocaña Baron*\n- *19194566778095*\n\n" +
              "📞 Si necesitas ayuda con el pago, escribe *Asesor* y te comunicaremos con un asesor.\n\n" +
              "👉 Si necesitas ir al menú principal, escribe *Menu*"
          );

        case "6":
          userState[userId] = "menu_politicas";
          return await message.reply(
            "📜 *Política de Cancelaciones*:\n- Puedes modificar o cancelar con 24h de anticipación.\n- Los adelantos no son reembolsables, pero puedes reprogramar.\n\n" +
              "📞 Si tienes dudas sobre nuestras políticas, escribe *Asesor* y te comunicaremos con un asesor.\n\n" +
              "👉 Si necesitas ir al menú principal, escribe *Menu*"
          );

        default:
          return await message.reply(
            "🤖 No tengo información sobre eso. Escribe *Hola* para ver el menú principal."
          );
      }

    case "menu_servicios":
      if (servicios[text]) {
        userState[userId] = `detalle_servicio_${text}`;
        return await message.reply(
          `✅ Has seleccionado: *${servicios[text]}*.\n\n` +
            "📌 ¿Qué deseas hacer ahora?\n" +
            "👉 Escribe *Reservar* para agendar una cita.\n" +
            "👉 Escribe *Volver* para regresar al menú anterior.\n" +
            "👉 Escribe *Asesor* para comunicarte con un asesor.\n\n" +
            "👉 Si necesitas ir al menú principal, escribe *Menu*"
        );
      } else if (text === "reservar") {
        return goToReservas(userId, message);
      } else if (text === "volver") {
        userState[userId] = "menu_principal";
        return sendMainMenu(message);
      } else if (text === "menu") {
        userState[userId] = "menu_principal";
        return sendMainMenu(message);
      } else {
        return await message.reply(
          "❌ Opción no válida. Escribe un número del 1 al 6 o *Volver*."
        );
      }

    default:
      if (userState[userId].startsWith("detalle_servicio")) {
        if (text === "reservar") {
          return goToReservas(userId, message);
        } else if (text === "volver") {
          return sendMenuServicios(message);
        } else if (text === "menu") {
          userState[userId] = "menu_principal";
          return sendMainMenu(message);
        } else if (text === "asesor") {
          humanModeUsers.set(userId, Date.now());
          await client.sendMessage(
            ADMIN_NUMBER,
            `🔔 *Atención requerida:* El usuario ${userId} ha solicitado un *Asesor*.`
          );
          return await message.reply(
            "🧑‍💼 Te comunicaremos con un asesor y el bot dejará de responder."
          );
        } else {
          return await message.reply(
            "❌ Opción no válida.\n" +
              "👉 Escribe *Reservar* para agendar una cita.\n" +
              "👉 Escribe *Volver* para regresar al menú anterior.\n" +
              "👉 Escribe *Asesor* para comunicarte con un asesor.\n\n" +
              "👉 Si necesitas ir al menú principal, escribe *Menu*"
          );
        }
      } else return;
  }
});

// 📌 Función para ir al menú de reservas y notificar al administrador
const goToReservas = async (userId, message) => {
  userState[userId] = "menu_reservas";
  humanModeUsers.set(userId, Date.now()); // El bot deja la atención al administrador

  // Notificar al administrador
  await client.sendMessage(
    ADMIN_NUMBER,
    `🔔 *Atención requerida:* El usuario ${userId} ha solicitado una *Reserva* y necesita asistencia.`
  );

  return await message.reply(
    "📅 Para reservar, por favor envíanos:\n✅ *Tu nombre*\n✅ *El servicio que deseas*\n✅ *Día y hora preferida*\n✅ *Si tienes alguna condición especial*.\n\n" +
      "📞 Si necesitas ayuda con la reserva, escribe *Asesor* y te comunicaremos con un asesor."
  );
};

// 📌 Función para mostrar el menú principal
const sendMainMenu = async (message) => {
  const userId = message.from;
  userState[userId] = "menu_principal";
  return await message.reply(
    "🌿 ¡Hola! Bienvenido a *Essenza Spa*.\n🕒 *Horario de atención:* Lunes a Sábado de 11 AM a 6 PM.\n\n" +
      "1️⃣ Servicios disponibles\n" +
      "2️⃣ Promociones\n" +
      "3️⃣ Reservar una cita\n" +
      "4️⃣ Ubicación y contacto\n" +
      "5️⃣ Métodos de pago\n" +
      "6️⃣ Políticas y cancelaciones\n\n" +
      "✏️ Escribe el número de la opción que deseas.\n\n" +
      "📞 Si necesitas atención personalizada, escribe *Asesor* y te comunicaremos con un asesor."
  );
};

// 📌 Función para mostrar el menú principal
const sendMenuServicios = async (message) => {
  const userId = message.from;
  userState[userId] = "menu_servicios";
  return await message.reply(
    "💆‍♀️ *Nuestros servicios disponibles:*\n" +
      "1️⃣ Masajes (45 min)\n" +
      "2️⃣ Limpieza facial (60 min)\n" +
      "3️⃣ Manicura y pedicura\n" +
      "4️⃣ Extensiones de pestañas\n" +
      "5️⃣ Diseño de cejas\n" +
      "6️⃣ Fisioterapia y terapias\n\n" +
      "✏️ Escribe el número del servicio que deseas conocer o *Volver*.\n\n" +
      "📞 Si necesitas hablar con alguien, escribe *Asesor* y te comunicaremos con un asesor.\n\n" +
      "👉 Si necesitas ir al menú principal, escribe *Menu*"
  );
};

// Iniciar el bot
client.initialize();
