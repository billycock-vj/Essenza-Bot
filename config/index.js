// Configuración del bot desde variables de entorno
require("dotenv").config();

// Lista de números de administradores (formato: número sin @c.us)
// Acepta números con o sin código de país
// También acepta números completos con @lid o @c.us
const ADMIN_NUMBERS_RAW = process.env.ADMIN_NUMBERS || "986613254,972002363";
// Números completos con sufijo (para casos especiales como dispositivos vinculados)
const ADMIN_NUMBERS_COMPLETOS = [
  "260602106781739@lid"
];

// Crear array con todas las variantes posibles de cada número
const numerosBase = ADMIN_NUMBERS_RAW.split(',').map(num => num.trim());
const ADMIN_NUMBERS = [];
const ADMIN_NUMBERS_SIN_SUFIJO = []; // Array de números sin sufijo para comparaciones

// Agregar números completos directamente (ya tienen el formato completo)
ADMIN_NUMBERS_COMPLETOS.forEach(numCompleto => {
  ADMIN_NUMBERS.push(numCompleto);
  // También agregar el número sin sufijo para comparaciones
  const numSinSufijo = numCompleto.replace(/@(c\.us|lid)$/, '');
  ADMIN_NUMBERS_SIN_SUFIJO.push(numSinSufijo);
});

// Para cada número base, agregar variantes con y sin código de país
numerosBase.forEach(num => {
  // Agregar número base sin sufijo para comparaciones
  ADMIN_NUMBERS_SIN_SUFIJO.push(num);
  
  // Agregar con @c.us
  ADMIN_NUMBERS.push(num + '@c.us');
  ADMIN_NUMBERS.push(num + '@lid');
  
  // Si el número tiene código de país (51), agregar también sin él
  if (num.startsWith('51') && num.length > 2) {
    const numSinCodigo = num.substring(2);
    ADMIN_NUMBERS_SIN_SUFIJO.push(numSinCodigo);
    ADMIN_NUMBERS.push(numSinCodigo + '@c.us');
    ADMIN_NUMBERS.push(numSinCodigo + '@lid');
  }
  
  // Si el número NO tiene código de país, agregar también con código 51
  if (!num.startsWith('51') && num.length >= 9) {
    const numConCodigo = '51' + num;
    ADMIN_NUMBERS_SIN_SUFIJO.push(numConCodigo);
    ADMIN_NUMBERS.push(numConCodigo + '@c.us');
    ADMIN_NUMBERS.push(numConCodigo + '@lid');
  }
});

// Números específicos para notificaciones de reservas
// Solo estos números recibirán notificaciones de nuevas solicitudes de reserva
const RESERVA_ADMIN_NUMBERS_RAW = ["986613254", "260602106781739"];
const RESERVA_ADMIN_NUMBERS = [];

// Generar todas las variantes para los números de notificaciones de reserva
RESERVA_ADMIN_NUMBERS_RAW.forEach(num => {
  // Agregar con @c.us
  RESERVA_ADMIN_NUMBERS.push(num + '@c.us');
  RESERVA_ADMIN_NUMBERS.push(num + '@lid');
  
  // Si el número tiene código de país (51), agregar también sin él
  if (num.startsWith('51') && num.length > 2) {
    const numSinCodigo = num.substring(2);
    RESERVA_ADMIN_NUMBERS.push(numSinCodigo + '@c.us');
    RESERVA_ADMIN_NUMBERS.push(numSinCodigo + '@lid');
  }
  
  // Si el número NO tiene código de país, agregar también con código 51
  if (!num.startsWith('51') && num.length >= 9) {
    const numConCodigo = '51' + num;
    RESERVA_ADMIN_NUMBERS.push(numConCodigo + '@c.us');
    RESERVA_ADMIN_NUMBERS.push(numConCodigo + '@lid');
  }
  
  // Si el número es muy largo (como 260602106781739), también agregar variantes sin prefijo
  if (num.length > 10) {
    // Intentar extraer el número base (últimos 9 dígitos)
    const numBase = num.slice(-9);
    if (numBase.length === 9) {
      RESERVA_ADMIN_NUMBERS.push(numBase + '@c.us');
      RESERVA_ADMIN_NUMBERS.push(numBase + '@lid');
      RESERVA_ADMIN_NUMBERS.push('51' + numBase + '@c.us');
      RESERVA_ADMIN_NUMBERS.push('51' + numBase + '@lid');
    }
  }
});

module.exports = {
  ADMIN_NUMBER: ADMIN_NUMBERS[0] || "986613254@c.us", // Mantener para compatibilidad
  ADMIN_NUMBERS: ADMIN_NUMBERS, // Array de todos los administradores (con @c.us y @lid)
  ADMIN_NUMBERS_SIN_SUFIJO: ADMIN_NUMBERS_SIN_SUFIJO, // Array de números sin sufijo para comparaciones
  RESERVA_ADMIN_NUMBERS: RESERVA_ADMIN_NUMBERS, // Array de administradores que reciben notificaciones de reservas
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

