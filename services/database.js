// Servicio de base de datos SQLite para reservas
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'data-storage');
const DB_PATH = path.join(DB_DIR, 'reservas.db');

// Asegurar que el directorio existe
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

/**
 * Abre la conexión a la base de datos
 * @returns {Promise<sqlite3.Database>}
 */
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

/**
 * Inicializa la base de datos y crea las tablas si no existen
 */
async function inicializarDB() {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabla de reservas
      db.run(`
        CREATE TABLE IF NOT EXISTS reservas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          userName TEXT NOT NULL,
          servicio TEXT NOT NULL,
          fechaHora TEXT NOT NULL,
          duracion INTEGER DEFAULT 60,
          estado TEXT DEFAULT 'pendiente',
          deposito REAL DEFAULT 0,
          notificado INTEGER DEFAULT 0,
          creada TEXT NOT NULL,
          actualizada TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          // Crear índices para búsquedas rápidas
          db.run(`
            CREATE INDEX IF NOT EXISTS idx_fechaHora ON reservas(fechaHora)
          `, (err) => {
            if (err) {
              reject(err);
            } else {
              db.run(`
                CREATE INDEX IF NOT EXISTS idx_userId ON reservas(userId)
              `, (err) => {
                if (err) {
                  reject(err);
                } else {
                  db.run(`
                    CREATE INDEX IF NOT EXISTS idx_estado ON reservas(estado)
                  `, (err) => {
                    if (err) {
                      reject(err);
                    } else {
                      db.close((err) => {
                        if (err) {
                          reject(err);
                        } else {
                          resolve();
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    });
  });
}

/**
 * Guarda una reserva en la base de datos
 * @param {Object} reserva - Objeto de reserva
 * @returns {Promise<number>} - ID de la reserva creada
 */
async function guardarReserva(reserva) {
  // Importar validadores para validar horario antes de guardar
  const { validarFecha } = require('../utils/validators');
  
  // Validar fecha y horario antes de guardar
  const duracion = reserva.duracion || 60;
  const validacion = validarFecha(reserva.fechaHora, duracion);
  
  if (!validacion.valida) {
    throw new Error(validacion.error || 'Fecha u horario inválido');
  }
  
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    const ahora = new Date().toISOString();
    const fechaHora = validacion.fecha instanceof Date 
      ? validacion.fecha.toISOString() 
      : validacion.fecha;
    
    db.run(`
      INSERT INTO reservas (
        userId, userName, servicio, fechaHora, duracion, 
        estado, deposito, notificado, creada, actualizada
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reserva.userId,
      reserva.userName,
      reserva.servicio,
      fechaHora,
      duracion,
      reserva.estado || 'pendiente',
      reserva.deposito || 0,
      reserva.notificado ? 1 : 0,
      ahora,
      ahora
    ], function(err) {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(this.lastID);
      }
    });
  });
}

/**
 * Obtiene todas las reservas
 * @param {Object} filtros - Filtros opcionales (estado, userId, fechaDesde, fechaHasta)
 * @returns {Promise<Array>} - Array de reservas
 */
async function obtenerReservas(filtros = {}) {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM reservas WHERE 1=1';
    const params = [];
    
    if (filtros.estado) {
      query += ' AND estado = ?';
      params.push(filtros.estado);
    }
    
    if (filtros.userId) {
      query += ' AND userId = ?';
      params.push(filtros.userId);
    }
    
    if (filtros.fechaDesde) {
      query += ' AND fechaHora >= ?';
      params.push(filtros.fechaDesde instanceof Date 
        ? filtros.fechaDesde.toISOString() 
        : filtros.fechaDesde);
    }
    
    if (filtros.fechaHasta) {
      query += ' AND fechaHora <= ?';
      params.push(filtros.fechaHasta instanceof Date 
        ? filtros.fechaHasta.toISOString() 
        : filtros.fechaHasta);
    }
    
    query += ' ORDER BY fechaHora ASC';
    
    db.all(query, params, (err, rows) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        // Convertir fechas de string a Date
        const reservas = rows.map(row => ({
          id: row.id,
          userId: row.userId,
          userName: row.userName,
          servicio: row.servicio,
          fechaHora: new Date(row.fechaHora),
          duracion: row.duracion,
          estado: row.estado,
          deposito: row.deposito,
          notificado: row.notificado === 1,
          creada: new Date(row.creada),
          actualizada: new Date(row.actualizada)
        }));
        resolve(reservas);
      }
    });
  });
}

/**
 * Consulta disponibilidad para una fecha específica
 * @param {Date} fecha - Fecha a consultar
 * @param {number} duracionMinima - Duración mínima requerida en minutos (default: 60)
 * @returns {Promise<Array>} - Array de horarios disponibles
 */
async function consultarDisponibilidad(fecha, duracionMinima = 60) {
  const db = await abrirDB();
  
  // Importar función para obtener horario del día (evitar dependencia circular)
  const { obtenerHorarioDelDia } = require('../utils/validators');
  
  return new Promise((resolve, reject) => {
    // Obtener inicio y fin del día
    const inicioDia = new Date(fecha);
    inicioDia.setHours(0, 0, 0, 0);
    
    const finDia = new Date(fecha);
    finDia.setHours(23, 59, 59, 999);
    
    // Obtener horario de atención según el día de la semana
    const horario = obtenerHorarioDelDia(fecha);
    
    // Si el día está cerrado, retornar array vacío
    if (!horario.abierto) {
      db.close();
      resolve([]);
      return;
    }
    
    // Obtener todas las reservas del día
    db.all(`
      SELECT fechaHora, duracion 
      FROM reservas 
      WHERE fechaHora >= ? 
        AND fechaHora <= ? 
        AND estado = 'pendiente'
      ORDER BY fechaHora ASC
    `, [inicioDia.toISOString(), finDia.toISOString()], (err, rows) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        // Horario de atención según el día (dinámico)
        const horarioApertura = horario.apertura; // 10 para sábado, 11 para otros días
        const horarioCierre = horario.cierre; // 16 para sábado, 19 para otros días
        const intervalo = 30; // Intervalo de 30 minutos
        
        // Convertir reservas a objetos Date
        const reservas = rows.map(row => ({
          inicio: new Date(row.fechaHora),
          duracion: row.duracion || 60,
          fin: new Date(new Date(row.fechaHora).getTime() + (row.duracion || 60) * 60000)
        }));
        
        // Generar todos los horarios posibles del día
        const horariosDisponibles = [];
        const horaActual = new Date(inicioDia);
        horaActual.setHours(horarioApertura, 0, 0, 0);
        
        // Calcular hora de cierre en minutos para comparación precisa
        const horaCierreMinutos = horarioCierre * 60;
        
        while (horaActual.getHours() < horarioCierre || 
               (horaActual.getHours() === horarioCierre && horaActual.getMinutes() === 0)) {
          const finHorario = new Date(horaActual.getTime() + duracionMinima * 60000);
          
          // Verificar que el horario completo (inicio + duración) no exceda el cierre
          const horaFinMinutos = finHorario.getHours() * 60 + finHorario.getMinutes();
          if (horaFinMinutos > horaCierreMinutos) {
            // Si este horario se extiende más allá del cierre, no incluirlo
            break;
          }
          
          // Verificar si este horario se solapa con alguna reserva
          const hayConflicto = reservas.some(reserva => {
            return (horaActual >= reserva.inicio && horaActual < reserva.fin) ||
                   (finHorario > reserva.inicio && finHorario <= reserva.fin) ||
                   (horaActual <= reserva.inicio && finHorario >= reserva.fin);
          });
          
          if (!hayConflicto) {
            horariosDisponibles.push(new Date(horaActual));
          }
          
          // Avanzar al siguiente intervalo
          horaActual.setMinutes(horaActual.getMinutes() + intervalo);
          
          // Si ya pasamos el horario de cierre, salir
          const horaActualMinutos = horaActual.getHours() * 60 + horaActual.getMinutes();
          if (horaActualMinutos >= horaCierreMinutos) {
            break;
          }
        }
        
        resolve(horariosDisponibles);
      }
    });
  });
}

/**
 * Actualiza una reserva
 * @param {number} id - ID de la reserva
 * @param {Object} datos - Datos a actualizar
 * @returns {Promise<void>}
 */
async function actualizarReserva(id, datos) {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    const campos = [];
    const valores = [];
    
    if (datos.estado !== undefined) {
      campos.push('estado = ?');
      valores.push(datos.estado);
    }
    
    if (datos.notificado !== undefined) {
      campos.push('notificado = ?');
      valores.push(datos.notificado ? 1 : 0);
    }
    
    if (datos.fechaHora !== undefined) {
      campos.push('fechaHora = ?');
      valores.push(datos.fechaHora instanceof Date 
        ? datos.fechaHora.toISOString() 
        : datos.fechaHora);
    }
    
    campos.push('actualizada = ?');
    valores.push(new Date().toISOString());
    valores.push(id);
    
    db.run(`
      UPDATE reservas 
      SET ${campos.join(', ')} 
      WHERE id = ?
    `, valores, (err) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Elimina una reserva
 * @param {number} id - ID de la reserva
 * @returns {Promise<void>}
 */
async function eliminarReserva(id) {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM reservas WHERE id = ?', [id], (err) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Obtiene estadísticas de reservas
 * @param {Date} fechaDesde - Fecha desde
 * @param {Date} fechaHasta - Fecha hasta
 * @returns {Promise<Object>} - Estadísticas
 */
async function obtenerEstadisticas(fechaDesde, fechaHasta) {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
        SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
        SUM(deposito) as totalDepositos
      FROM reservas
      WHERE fechaHora >= ? AND fechaHora <= ?
    `, [
      fechaDesde.toISOString(),
      fechaHasta.toISOString()
    ], (err, row) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve({
          total: row.total || 0,
          pendientes: row.pendientes || 0,
          confirmadas: row.confirmadas || 0,
          canceladas: row.canceladas || 0,
          totalDepositos: row.totalDepositos || 0
        });
      }
    });
  });
}

module.exports = {
  inicializarDB,
  guardarReserva,
  obtenerReservas,
  consultarDisponibilidad,
  actualizarReserva,
  eliminarReserva,
  obtenerEstadisticas,
  DB_PATH
};

