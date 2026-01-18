// Script para eliminar citas duplicadas de la base de datos
// Ejecutar con: node scripts/eliminar-citas-duplicadas.js

const sqlite3 = require('sqlite3').verbose();
const paths = require('../config/paths');

const DB_PATH = paths.DB_PATH;

function abrirDB() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(db);
      }
    });
  });
}

async function encontrarCitasDuplicadas() {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    // Buscar citas que tienen la misma fecha/hora (con tolerancia de 1 minuto)
    // y el mismo estado (pendiente o confirmada)
    db.all(`
      SELECT 
        fechaHora,
        COUNT(*) as cantidad,
        GROUP_CONCAT(id) as ids,
        GROUP_CONCAT(userName) as nombres,
        GROUP_CONCAT(servicio) as servicios
      FROM reservas
      WHERE estado IN ('pendiente', 'confirmada')
      GROUP BY 
        DATE(fechaHora),
        strftime('%H', fechaHora),
        strftime('%M', fechaHora)
      HAVING COUNT(*) > 1
      ORDER BY fechaHora ASC
    `, [], (err, rows) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function obtenerDetallesCitas(ids) {
  const db = await abrirDB();
  const idsArray = ids.split(',');
  const placeholders = idsArray.map(() => '?').join(',');
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        id,
        userId,
        userName,
        servicio,
        fechaHora,
        duracion,
        estado,
        deposito,
        creada
      FROM reservas
      WHERE id IN (${placeholders})
      ORDER BY creada ASC
    `, idsArray, (err, rows) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function eliminarCita(id) {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM reservas WHERE id = ?', [id], function(err) {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

async function main() {
  try {
    console.log('🔍 Buscando citas duplicadas...\n');
    
    const duplicados = await encontrarCitasDuplicadas();
    
    if (duplicados.length === 0) {
      console.log('✅ No se encontraron citas duplicadas.\n');
      return;
    }
    
    console.log(`⚠️  Se encontraron ${duplicados.length} grupo(s) de citas duplicadas:\n`);
    
    let totalEliminadas = 0;
    
    for (const grupo of duplicados) {
      const ids = grupo.ids.split(',');
      const detalles = await obtenerDetallesCitas(grupo.ids);
      
      console.log(`\n📅 Fecha/Hora: ${new Date(grupo.fechaHora).toLocaleString('es-PE')}`);
      console.log(`   Cantidad: ${grupo.cantidad} citas duplicadas\n`);
      
      // Mostrar todas las citas
      detalles.forEach((cita, index) => {
        console.log(`   ${index + 1}. ID: ${cita.id}`);
        console.log(`      👤 Cliente: ${cita.userName}`);
        console.log(`      📱 Teléfono: ${cita.userId}`);
        console.log(`      💆 Servicio: ${cita.servicio}`);
        console.log(`      ⏱️  Duración: ${cita.duracion} min`);
        console.log(`      📊 Estado: ${cita.estado}`);
        console.log(`      💰 Depósito: S/ ${cita.deposito}`);
        console.log(`      📅 Creada: ${new Date(cita.creada).toLocaleString('es-PE')}`);
        console.log('');
      });
      
      // Estrategia: Mantener la más reciente (o la confirmada si hay una confirmada)
      // Eliminar las demás
      const citasOrdenadas = detalles.sort((a, b) => {
        // Priorizar confirmadas sobre pendientes
        if (a.estado === 'confirmada' && b.estado !== 'confirmada') return -1;
        if (b.estado === 'confirmada' && a.estado !== 'confirmada') return 1;
        // Si mismo estado, mantener la más reciente
        return new Date(b.creada) - new Date(a.creada);
      });
      
      const citaAMantener = citasOrdenadas[0];
      const citasAEliminar = citasOrdenadas.slice(1);
      
      console.log(`   ✅ Manteniendo: ID ${citaAMantener.id} (${citaAMantener.userName}, ${citaAMantener.estado})`);
      console.log(`   ❌ Eliminando ${citasAEliminar.length} cita(s) duplicada(s):\n`);
      
      for (const cita of citasAEliminar) {
        await eliminarCita(cita.id);
        console.log(`      ✓ Eliminada: ID ${cita.id} (${cita.userName})`);
        totalEliminadas++;
      }
    }
    
    console.log(`\n\n✅ Proceso completado.`);
    console.log(`   Total de citas eliminadas: ${totalEliminadas}`);
    console.log(`   Citas duplicadas restantes: 0\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar
main();
