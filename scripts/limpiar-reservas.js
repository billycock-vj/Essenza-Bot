/**
 * Script para limpiar todas las reservas de la base de datos
 */

const db = require('../services/database');
const { logMessage } = require('../utils/logger');

async function limpiarReservas() {
  try {
    console.log('🔄 Inicializando base de datos...');
    await db.inicializarDB();
    
    console.log('🗑️  Eliminando todas las reservas...');
    const totalEliminadas = await db.limpiarTodasLasReservas();
    
    console.log(`✅ Se eliminaron ${totalEliminadas} reserva(s) de la base de datos.`);
    logMessage("INFO", `Todas las reservas fueron eliminadas`, { total: totalEliminadas });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al limpiar reservas:', error.message);
    logMessage("ERROR", "Error al limpiar reservas", {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Ejecutar
limpiarReservas();
