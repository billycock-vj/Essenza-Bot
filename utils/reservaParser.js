/**
 * Parser para convertir texto de mensaje del admin a objeto de reserva estructurado
 */

/**
 * Parsea un mensaje de texto con datos de cita a un objeto estructurado
 * @param {string} texto - Texto del mensaje con datos de la cita
 * @returns {Object} - Objeto de reserva parseado
 * @throws {Error} - Si faltan datos obligatorios o el formato es inválido
 */
function parsearTextoReserva(texto) {
  if (!texto || typeof texto !== 'string') {
    throw new Error('El texto no puede estar vacío');
  }

  const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const datos = {
    fechaTexto: null,
    hora: null,
    cliente: null,
    telefono: null,
    servicio: null,
    precio: null,
    deposito: null,
    estado: null
  };

  // Parsear cada línea
  for (const linea of lineas) {
    const lineaLower = linea.toLowerCase();
    
    // Fecha (puede venir en formato "Domingo 11/01/2026" o similar)
    if (lineaLower.includes('domingo') || lineaLower.includes('lunes') || 
        lineaLower.includes('martes') || lineaLower.includes('miércoles') || 
        lineaLower.includes('miercoles') || lineaLower.includes('jueves') || 
        lineaLower.includes('viernes') || lineaLower.includes('sábado') || 
        lineaLower.includes('sabado')) {
      // Extraer día de la semana y fecha completa (ej: "Domingo 11/01/2026 4:00 pm")
      const fechaCompletaMatch = linea.match(/(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
      if (fechaCompletaMatch) {
        // Guardar con día de la semana: "Domingo 11/01/2026"
        datos.fechaTexto = `${fechaCompletaMatch[1].charAt(0).toUpperCase() + fechaCompletaMatch[1].slice(1).toLowerCase()} ${fechaCompletaMatch[2]}`;
        // Normalizar "miercoles" a "miércoles"
        datos.fechaTexto = datos.fechaTexto.replace(/Miercoles/i, 'Miércoles').replace(/Sabado/i, 'Sábado');
      } else {
        // Si no tiene día de la semana, extraer solo la fecha
        const fechaMatch = linea.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
        if (fechaMatch) {
          datos.fechaTexto = fechaMatch[1];
        }
      }
      
      // Extraer hora (ej: "4:00 pm" o "16:00")
      const horaMatch = linea.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)?/i);
      if (horaMatch) {
        let hora = parseInt(horaMatch[1], 10);
        const minutos = horaMatch[2] || '00';
        const periodo = horaMatch[3] ? horaMatch[3].toLowerCase() : null;
        
        if (periodo === 'pm' && hora !== 12) {
          hora += 12;
        } else if (periodo === 'am' && hora === 12) {
          hora = 0;
        }
        
        datos.hora = `${hora.toString().padStart(2, '0')}:${minutos.padStart(2, '0')}`;
      }
    }
    
    // Cliente
    if (lineaLower.startsWith('cliente:') || lineaLower.startsWith('cliente ')) {
      datos.cliente = linea.replace(/^cliente:\s*/i, '').trim();
    }
    
    // Teléfono
    if (lineaLower.startsWith('teléfono:') || lineaLower.startsWith('telefono:') || 
        lineaLower.startsWith('teléfono ') || lineaLower.startsWith('telefono ')) {
      datos.telefono = linea.replace(/^teléfono:\s*/i, '').replace(/^telefono:\s*/i, '').trim();
    }
    
    // Servicio
    if (lineaLower.startsWith('servicio:') || lineaLower.startsWith('servicio ')) {
      datos.servicio = linea.replace(/^servicio:\s*/i, '').trim();
    } else if (!datos.servicio && linea.match(/^\d+\s+[a-záéíóúñ\s]+$/i)) {
      // Si la línea empieza con un número seguido de texto, puede ser el servicio
      // Ej: "2 Masajes compuestos"
      datos.servicio = linea.trim();
    }
    
    // Precio
    if (lineaLower.startsWith('precio:') || lineaLower.startsWith('precio ')) {
      const precioTexto = linea.replace(/^precio:\s*/i, '').trim();
      if (precioTexto.toLowerCase() !== 'a revisión' && precioTexto.toLowerCase() !== 'a revision') {
        const precioNum = parseFloat(precioTexto.replace(/[^\d.,]/g, '').replace(',', '.'));
        if (!isNaN(precioNum)) {
          datos.precio = precioNum;
        }
      } else {
        datos.precio = 'A revisión';
      }
    }
    
    // Depósito
    if (lineaLower.startsWith('depósito:') || lineaLower.startsWith('deposito:') || 
        lineaLower.startsWith('depósito ') || lineaLower.startsWith('deposito ')) {
      const depositoTexto = linea.replace(/^depósito:\s*/i, '').replace(/^deposito:\s*/i, '').trim();
      const depositoNum = parseFloat(depositoTexto.replace(/[^\d.,]/g, '').replace(',', '.'));
      if (!isNaN(depositoNum)) {
        datos.deposito = depositoNum;
      }
    }
    
    // Estado
    if (lineaLower.startsWith('estado:') || lineaLower.startsWith('estado ')) {
      datos.estado = linea.replace(/^estado:\s*/i, '').trim();
    }
  }

  // Validar datos obligatorios
  if (!datos.fechaTexto) {
    throw new Error('Fecha no encontrada en el mensaje');
  }
  
  if (!datos.hora) {
    throw new Error('Hora no encontrada en el mensaje');
  }
  
  if (!datos.cliente) {
    throw new Error('Nombre del cliente no encontrado en el mensaje');
  }
  
  if (!datos.telefono) {
    throw new Error('Teléfono del cliente no encontrado en el mensaje');
  }
  
  if (!datos.servicio) {
    throw new Error('Servicio no encontrado en el mensaje');
  }

  // Valores por defecto
  if (!datos.estado) {
    datos.estado = 'Confirmada';
  }
  
  if (datos.deposito === null || datos.deposito === undefined) {
    datos.deposito = 0;
  }

  return datos;
}

module.exports = {
  parsearTextoReserva
};
