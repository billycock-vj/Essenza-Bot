/**
 * Script para migrar la base de datos agregando nuevas tablas y columnas
 */

const db = require('../services/database');
const { logMessage } = require('../utils/logger');

async function migrar() {
  try {
    console.log('🔄 Iniciando migración de base de datos...\n');
    
    // Primero inicializar la DB (creará las tablas si no existen)
    await db.inicializarDB();
    console.log('✅ Base de datos inicializada\n');
    
    // Luego ejecutar la migración (agregará columnas y tablas nuevas)
    await db.migrarBaseDatos();
    console.log('✅ Migración completada exitosamente\n');
    
    logMessage("SUCCESS", "Migración de base de datos completada");
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error);
    logMessage("ERROR", "Error en migración de base de datos", { error: error.message });
    process.exit(1);
  }
}

migrar();
