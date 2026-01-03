// Configuración del bot desde variables de entorno
require("dotenv").config();

// Lista de números de administradores (formato: número sin @c.us)
const ADMIN_NUMBERS_RAW = process.env.ADMIN_NUMBERS || "51986613254,51972002363,51983104105";
const ADMIN_NUMBERS = ADMIN_NUMBERS_RAW.split(',').map(num => num.trim() + '@c.us');

module.exports = {
  ADMIN_NUMBER: ADMIN_NUMBERS[0] || "51983104105@c.us", // Mantener para compatibilidad
  ADMIN_NUMBERS: ADMIN_NUMBERS, // Array de todos los administradores
  HORARIO_ATENCION: process.env.HORARIO_ATENCION || "Lunes a Jueves: 11:00 - 19:00, Viernes: 11:00 - 19:00, Sábado: 10:00 - 16:00, Domingo: Cerrado",
  YAPE_NUMERO: process.env.YAPE_NUMERO || "953348917",
  YAPE_TITULAR: process.env.YAPE_TITULAR || "Esther Ocaña Baron",
  BANCO_CUENTA: process.env.BANCO_CUENTA || "19194566778095",
  UBICACION: process.env.UBICACION || "Jiron Ricardo Palma 603, Puente Piedra, Lima, Perú",
  MAPS_LINK: process.env.MAPS_LINK || "https://maps.app.goo.gl/Fu2Dd9tiiiwptV5m6",
  DEPOSITO_RESERVA: process.env.DEPOSITO_RESERVA || "20",
  LOG_LEVEL: process.env.LOG_LEVEL || 'normal',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || null,
  MAX_RESERVAS: 1000, // Límite máximo de reservas en memoria
  DIAS_RETENCION_LOGS: 30, // Días de retención de logs
};

