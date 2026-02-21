// Servicio de base de datos SQLite para reservas
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const paths = require('../config/paths');

const DB_DIR = paths.DATA_BASE_DIR;
const DB_PATH = paths.DB_PATH;

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
      // Tabla de reservas (actualizada con nuevos campos)
      db.run(`
        CREATE TABLE IF NOT EXISTS reservas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          userName TEXT NOT NULL,
          servicio_id INTEGER,
          servicio TEXT NOT NULL,
          fechaHora TEXT NOT NULL,
          duracion INTEGER DEFAULT 60,
          estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'confirmada', 'cancelada')),
          deposito REAL DEFAULT 0,
          notificado INTEGER DEFAULT 0,
          origen TEXT DEFAULT 'bot' CHECK(origen IN ('bot', 'admin', 'imagen')),
          notas TEXT,
          creada TEXT NOT NULL,
          actualizada TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Tabla de configuración del bot
        db.run(`
          CREATE TABLE IF NOT EXISTS configuracion (
            clave TEXT PRIMARY KEY,
            valor TEXT NOT NULL,
            descripcion TEXT,
            actualizada TEXT NOT NULL
          )
        `, (err) => {
          if (err) {
            reject(err);
            return;
          }
          
          // Inicializar valores por defecto de configuración
          const ahora = new Date().toISOString();
          
          db.run(`
            INSERT OR IGNORE INTO configuracion (clave, valor, descripcion, actualizada)
            VALUES 
              ('flag_bot_activo', '1', 'Flag que indica si el bot está activo (1=activo, 0=desactivado)', ?),
              ('flag_ia_activada', '1', 'Flag que indica si la IA está activada (1=activada, 0=desactivada)', ?),
              ('modo_ia', 'auto', 'Modo de IA: auto, manual, solo_faq', ?),
              ('limite_ia_por_usuario', '10', 'Cantidad máxima de respuestas IA por usuario por día', ?),
              ('horas_confirmacion_automatica', '24', 'Horas para confirmación automática si no hay respuesta', ?)
          `, [ahora, ahora, ahora, ahora, ahora], (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            // Tabla de servicios
            db.run(`
              CREATE TABLE IF NOT EXISTS servicios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL UNIQUE,
                duracion INTEGER NOT NULL,
                precio REAL NOT NULL,
                activo INTEGER DEFAULT 1 CHECK(activo IN (0, 1)),
                categoria TEXT,
                descripcion TEXT,
                creado TEXT NOT NULL,
                actualizado TEXT NOT NULL
              )
            `, (err) => {
              if (err) {
                reject(err);
                return;
              }
              
              // Tabla de paquetes
              db.run(`
                CREATE TABLE IF NOT EXISTS paquetes (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  nombre TEXT NOT NULL UNIQUE,
                  precio REAL NOT NULL,
                  cantidad_personas INTEGER DEFAULT 1,
                  descripcion TEXT,
                  servicios_incluidos TEXT,
                  activo INTEGER DEFAULT 1 CHECK(activo IN (0, 1)),
                  creado TEXT NOT NULL,
                  actualizado TEXT NOT NULL
                )
              `, (err) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                // Tabla de usuarios_bloqueados
                db.run(`
                  CREATE TABLE IF NOT EXISTS usuarios_bloqueados (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    telefono TEXT NOT NULL UNIQUE,
                    motivo TEXT,
                    fecha_bloqueo TEXT NOT NULL,
                    bloqueado_por TEXT,
                    activo INTEGER DEFAULT 1 CHECK(activo IN (0, 1))
                  )
                `, (err) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  
                  // Tabla de interacciones_ia
                  db.run(`
                    CREATE TABLE IF NOT EXISTS interacciones_ia (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      userId TEXT NOT NULL,
                      fecha TEXT NOT NULL,
                      cantidad INTEGER DEFAULT 1,
                      UNIQUE(userId, fecha)
                    )
                  `, (err) => {
                    if (err) {
                      reject(err);
                      return;
                    }
                    
                    // Tabla de clientes (actualizada con session_id, phone, estado_lead y ultimo_mensaje)
                    db.run(`
                      CREATE TABLE IF NOT EXISTS clientes (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        session_id TEXT NOT NULL UNIQUE,
                        phone TEXT,
                        country TEXT,
                        nombre TEXT,
                        fecha_creacion TEXT NOT NULL,
                        notas TEXT,
                        total_reservas INTEGER DEFAULT 0,
                        reservas_canceladas INTEGER DEFAULT 0,
                        ultima_reserva TEXT,
                        estado_lead TEXT DEFAULT 'info' CHECK(estado_lead IN ('info', 'lead_tibio', 'lead_caliente', 'reservado')),
                        ultimo_mensaje TEXT
                      )
                    `, (err) => {
                      if (err) {
                        reject(err);
                        return;
                      }
                      
                      // Tabla de logs
                      db.run(`
                        CREATE TABLE IF NOT EXISTS logs (
                          id INTEGER PRIMARY KEY AUTOINCREMENT,
                          nivel TEXT NOT NULL,
                          mensaje TEXT NOT NULL,
                          datos TEXT,
                          userId TEXT,
                          timestamp TEXT NOT NULL
                        )
                      `, (err) => {
                        if (err) {
                          reject(err);
                          return;
                        }
                        
                        // Crear índices para búsquedas rápidas (solo si las columnas existen)
                        // Nota: Los índices se crearán después de la migración si es necesario
                        db.run(`
                          CREATE INDEX IF NOT EXISTS idx_fechaHora ON reservas(fechaHora)
                        `, (err) => {
                          // Ignorar errores de índices si las columnas no existen aún
                          if (err && err.message && err.message.includes('no such column')) {
                            console.log('⚠️  Índice no creado (columna no existe aún, se creará después de migración)');
                          } else if (err) {
                            reject(err);
                            return;
                          }
                          
                          db.run(`
                            CREATE INDEX IF NOT EXISTS idx_userId ON reservas(userId)
                          `, (err) => {
                            if (err) {
                              reject(err);
                              return;
                            }
                            
                            db.run(`
                              CREATE INDEX IF NOT EXISTS idx_estado ON reservas(estado)
                            `, (err) => {
                              if (err) {
                                reject(err);
                                return;
                              }
                              
                              // Crear índice de servicio_id solo si la columna existe
                              db.run(`
                                CREATE INDEX IF NOT EXISTS idx_reservas_servicio_id ON reservas(servicio_id)
                              `, (err) => {
                                // Ignorar si la columna no existe (se agregará en migración)
                                if (err && err.message && err.message.includes('no such column')) {
                                  // Continuar sin error
                                } else if (err) {
                                  reject(err);
                                  return;
                                }
                                
                                db.run(`
                                  CREATE INDEX IF NOT EXISTS idx_usuarios_bloqueados_telefono ON usuarios_bloqueados(telefono)
                                `, (err) => {
                                  if (err) {
                                    reject(err);
                                    return;
                                  }
                                  
                                  db.run(`
                                    CREATE INDEX IF NOT EXISTS idx_usuarios_bloqueados_activo ON usuarios_bloqueados(activo)
                                  `, (err) => {
                                    if (err) {
                                      reject(err);
                                      return;
                                    }
                                    
                                    db.run(`
                                      CREATE INDEX IF NOT EXISTS idx_interacciones_ia_userId ON interacciones_ia(userId)
                                    `, (err) => {
                                      if (err) {
                                        reject(err);
                                        return;
                                      }
                                      
                                      db.run(`
                                        CREATE INDEX IF NOT EXISTS idx_interacciones_ia_fecha ON interacciones_ia(fecha)
                                      `, (err) => {
                                        if (err) {
                                          reject(err);
                                          return;
                                        }
                                        
                                        // Crear índices para las nuevas columnas (session_id y phone)
                                        db.run(`
                                          CREATE INDEX IF NOT EXISTS idx_clientes_session_id ON clientes(session_id)
                                        `, (err) => {
                                          // Ignorar errores si la columna no existe aún (se agregará en migración)
                                          if (err && err.message && err.message.includes('no such column')) {
                                            // Continuar sin error
                                          } else if (err) {
                                            reject(err);
                                            return;
                                          }
                                          
                                          db.run(`
                                            CREATE INDEX IF NOT EXISTS idx_clientes_phone ON clientes(phone)
                                          `, (err) => {
                                            // Ignorar errores si la columna no existe aún
                                            if (err && err.message && err.message.includes('no such column')) {
                                              // Continuar sin error
                                            } else if (err) {
                                              reject(err);
                                              return;
                                            }
                                            
                                            db.run(`
                                              CREATE INDEX IF NOT EXISTS idx_servicios_activo ON servicios(activo)
                                            `, (err) => {
                                              if (err) {
                                                reject(err);
                                                return;
                                              }
                                              
                                              db.run(`
                                                CREATE INDEX IF NOT EXISTS idx_paquetes_activo ON paquetes(activo)
                                              `, (err) => {
                                                if (err) {
                                                  reject(err);
                                                  return;
                                                }
                                                
                                                db.run(`
                                                  CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp)
                                                `, (err) => {
                                                  if (err) {
                                                    reject(err);
                                                    return;
                                                  }
                                                  
                                                  db.run(`
                                                    CREATE INDEX IF NOT EXISTS idx_logs_nivel ON logs(nivel)
                                                  `, (err) => {
                                                    if (err) {
                                                      reject(err);
                                                      return;
                                                    }
                                                    
                                                    db.close((err) => {
                                                      if (err) {
                                                        reject(err);
                                                      } else {
                                                        resolve();
                                                      }
                                                    });
                                                  });
                                                });
                                              });
                                            });
                                          });
                                        });
                                      });
                                    });
                                  });
                                });
                              });
                            });
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
}

/**
 * Verifica si hay conflicto de horario con otras reservas
 * @param {Date} fechaHora - Fecha y hora de inicio de la reserva
 * @param {number} duracion - Duración en minutos
 * @param {number} excluirId - ID de reserva a excluir (para actualizaciones)
 * @returns {Promise<{hayConflicto: boolean, reservaConflictiva?: Object}>}
 */
async function verificarConflictoHorario(fechaHora, duracion, excluirId = null) {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    const inicio = new Date(fechaHora);
    const fin = new Date(fechaHora.getTime() + duracion * 60000);
    
    // Obtener todas las reservas que puedan tener conflicto (pendientes o confirmadas)
    // Solo excluir canceladas
    let query = `
      SELECT id, fechaHora, duracion, estado, userName, servicio
      FROM reservas 
      WHERE fechaHora >= datetime(?, '-1 day')
        AND fechaHora <= datetime(?, '+1 day')
        AND estado IN ('pendiente', 'confirmada')
    `;
    const params = [inicio.toISOString(), fin.toISOString()];
    
    if (excluirId) {
      query += ' AND id != ?';
      params.push(excluirId);
    }
    
    db.all(query, params, (err, rows) => {
      db.close();
      if (err) {
        reject(err);
        return;
      }
      
      // Verificar solapamiento con cada reserva existente
      for (const row of rows) {
        const reservaInicio = new Date(row.fechaHora);
        const reservaDuracion = row.duracion || 60;
        const reservaFin = new Date(reservaInicio.getTime() + reservaDuracion * 60000);
        
        // Verificar si hay solapamiento
        const haySolapamiento = 
          (inicio >= reservaInicio && inicio < reservaFin) ||  // Inicio dentro de reserva existente
          (fin > reservaInicio && fin <= reservaFin) ||         // Fin dentro de reserva existente
          (inicio <= reservaInicio && fin >= reservaFin);        // Nueva reserva contiene a existente
        
        if (haySolapamiento) {
          resolve({
            hayConflicto: true,
            reservaConflictiva: {
              id: row.id,
              fechaHora: reservaInicio,
              duracion: reservaDuracion,
              estado: row.estado,
              userName: row.userName,
              servicio: row.servicio
            }
          });
          return;
        }
      }
      
      resolve({ hayConflicto: false });
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
  
  // Verificar conflictos de horario antes de guardar
  const fechaHoraValidada = validacion.fecha instanceof Date 
    ? validacion.fecha 
    : new Date(validacion.fecha);
  
  const conflicto = await verificarConflictoHorario(fechaHoraValidada, duracion);
  
  if (conflicto.hayConflicto) {
    const reservaConflictiva = conflicto.reservaConflictiva;
    const fechaConflictiva = reservaConflictiva.fechaHora.toLocaleString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    throw new Error(
      `Ya existe una cita ${reservaConflictiva.estado} en ese horario:\n` +
      `• ${reservaConflictiva.userName} - ${reservaConflictiva.servicio}\n` +
      `• ${fechaConflictiva}\n` +
      `• Duración: ${reservaConflictiva.duracion} minutos`
    );
  }
  
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    const ahora = new Date().toISOString();
    const fechaHora = fechaHoraValidada.toISOString();
    
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
    
    // Soporte para array de estados o estado único
    if (filtros.estado) {
      if (Array.isArray(filtros.estado)) {
        const placeholders = filtros.estado.map(() => '?').join(',');
        query += ` AND estado IN (${placeholders})`;
        params.push(...filtros.estado);
      } else {
        query += ' AND estado = ?';
        params.push(filtros.estado);
      }
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
          servicio_id: row.servicio_id || null,
          servicio: row.servicio,
          fechaHora: new Date(row.fechaHora),
          duracion: row.duracion,
          estado: row.estado,
          deposito: row.deposito,
          notificado: row.notificado === 1,
          origen: row.origen || 'bot',
          notas: row.notas || null,
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
    
    // Obtener todas las reservas del día (pendientes y confirmadas, no canceladas)
    db.all(`
      SELECT fechaHora, duracion 
      FROM reservas 
      WHERE fechaHora >= ? 
        AND fechaHora <= ? 
        AND estado IN ('pendiente', 'confirmada')
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
  
  return new Promise(async (resolve, reject) => {
    // Si se está actualizando la fecha/hora, verificar conflictos
    if (datos.fechaHora !== undefined) {
      // Obtener la duración actual de la reserva
      db.get('SELECT duracion FROM reservas WHERE id = ?', [id], async (err, row) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        const duracion = datos.duracion !== undefined ? datos.duracion : (row?.duracion || 60);
        const fechaHora = datos.fechaHora instanceof Date 
          ? datos.fechaHora 
          : new Date(datos.fechaHora);
        
        // Verificar conflictos (excluyendo la reserva actual)
        try {
          const conflicto = await verificarConflictoHorario(fechaHora, duracion, id);
          
          if (conflicto.hayConflicto) {
            db.close();
            const reservaConflictiva = conflicto.reservaConflictiva;
            const fechaConflictiva = reservaConflictiva.fechaHora.toLocaleString('es-PE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            reject(new Error(
              `No se puede actualizar: ya existe una cita ${reservaConflictiva.estado} en ese horario:\n` +
              `• ${reservaConflictiva.userName} - ${reservaConflictiva.servicio}\n` +
              `• ${fechaConflictiva}\n` +
              `• Duración: ${reservaConflictiva.duracion} minutos`
            ));
            return;
          }
        } catch (error) {
          db.close();
          reject(error);
          return;
        }
        
        // Continuar con la actualización
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
          valores.push(fechaHora.toISOString());
        }
        
        if (datos.duracion !== undefined) {
          campos.push('duracion = ?');
          valores.push(datos.duracion);
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
    } else {
      // Si no se actualiza fecha/hora, actualizar normalmente
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
      
      if (datos.duracion !== undefined) {
        campos.push('duracion = ?');
        valores.push(datos.duracion);
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
    }
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
 * Elimina todas las reservas de la base de datos
 * @returns {Promise<number>} - Número de reservas eliminadas
 */
async function limpiarTodasLasReservas() {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    // Primero contar cuántas reservas hay
    db.get('SELECT COUNT(*) as total FROM reservas', (err, row) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      const total = row ? row.total : 0;
      
      // Eliminar todas las reservas
      db.run('DELETE FROM reservas', (err) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          resolve(total);
        }
      });
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

/**
 * Obtiene un valor de configuración
 * @param {string} clave - Clave de configuración
 * @returns {Promise<string|null>} - Valor de la configuración o null si no existe
 */
async function obtenerConfiguracion(clave) {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    db.get('SELECT valor FROM configuracion WHERE clave = ?', [clave], (err, row) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.valor : null);
      }
    });
  });
}

/**
 * Establece un valor de configuración
 * @param {string} clave - Clave de configuración
 * @param {string} valor - Valor a establecer
 * @param {string} descripcion - Descripción opcional
 * @returns {Promise<void>}
 */
async function establecerConfiguracion(clave, valor, descripcion = null) {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    const ahora = new Date().toISOString();
    db.run(`
      INSERT OR REPLACE INTO configuracion (clave, valor, descripcion, actualizada)
      VALUES (?, ?, ?, ?)
    `, [clave, valor, descripcion, ahora], (err) => {
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
 * Guarda un log en la base de datos
 * @param {string} nivel - Nivel del log (INFO, ERROR, WARNING, etc.)
 * @param {string} mensaje - Mensaje del log
 * @param {Object} datos - Datos adicionales (opcional)
 * @param {string} userId - ID del usuario (opcional)
 * @returns {Promise<void>}
 */
async function guardarLog(nivel, mensaje, datos = null, userId = null) {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString();
    const datosJson = datos ? JSON.stringify(datos) : null;
    
    db.run(`
      INSERT INTO logs (nivel, mensaje, datos, userId, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [nivel, mensaje, datosJson, userId, timestamp], (err) => {
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
 * Obtiene logs con filtros opcionales
 * @param {Object} filtros - Filtros opcionales (nivel, userId, fechaDesde, fechaHasta, limite)
 * @returns {Promise<Array>} - Array de logs
 */
async function obtenerLogs(filtros = {}) {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM logs WHERE 1=1';
    const params = [];
    
    if (filtros.nivel) {
      query += ' AND nivel = ?';
      params.push(filtros.nivel);
    }
    
    if (filtros.userId) {
      query += ' AND userId = ?';
      params.push(filtros.userId);
    }
    
    if (filtros.fechaDesde) {
      query += ' AND timestamp >= ?';
      params.push(filtros.fechaDesde instanceof Date 
        ? filtros.fechaDesde.toISOString() 
        : filtros.fechaDesde);
    }
    
    if (filtros.fechaHasta) {
      query += ' AND timestamp <= ?';
      params.push(filtros.fechaHasta instanceof Date 
        ? filtros.fechaHasta.toISOString() 
        : filtros.fechaHasta);
    }
    
    query += ' ORDER BY timestamp DESC';
    
    if (filtros.limite) {
      query += ' LIMIT ?';
      params.push(filtros.limite);
    } else {
      query += ' LIMIT 100'; // Límite por defecto
    }
    
    db.all(query, params, (err, rows) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        const logs = rows.map(row => ({
          id: row.id,
          nivel: row.nivel,
          mensaje: row.mensaje,
          datos: row.datos ? JSON.parse(row.datos) : null,
          userId: row.userId,
          timestamp: new Date(row.timestamp)
        }));
        resolve(logs);
      }
    });
  });
}

/**
 * Limpia logs antiguos (más de X días)
 * @param {number} dias - Días de retención
 * @returns {Promise<number>} - Número de logs eliminados
 */
async function limpiarLogsAntiguos(dias = 30) {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    
    db.run(`
      DELETE FROM logs 
      WHERE timestamp < ?
    `, [fechaLimite.toISOString()], function(err) {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(this.changes);
      }
    });
  });
}

// ============================================
// NUEVAS FUNCIONES PARA GESTIÓN DE RESERVAS
// ============================================

/**
 * Confirma una reserva por ID
 * @param {number} id - ID de la reserva
 * @returns {Promise<boolean>}
 */
async function confirmarReserva(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE reservas SET estado = ?, actualizada = ? WHERE id = ?',
      ['confirmada', new Date().toISOString(), id],
      function(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

/**
 * Cancela una reserva por ID
 * @param {number} id - ID de la reserva
 * @returns {Promise<boolean>}
 */
async function cancelarReservaPorId(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE reservas SET estado = ?, actualizada = ? WHERE id = ?',
      ['cancelada', new Date().toISOString(), id],
      function(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

/**
 * Modifica fecha y hora de una reserva
 * @param {number} id - ID de la reserva
 * @param {Date} nuevaFechaHora - Nueva fecha y hora
 * @returns {Promise<boolean>}
 */
async function modificarFechaHoraReserva(id, nuevaFechaHora) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    // Obtener duración actual
    db.get('SELECT duracion FROM reservas WHERE id = ?', [id], async (err, row) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      const duracion = row?.duracion || 60;
      
      // Verificar conflicto antes de actualizar
      try {
        const conflicto = await verificarConflictoHorario(nuevaFechaHora, duracion, id);
        
        if (conflicto.hayConflicto) {
          db.close();
          reject(new Error('Ya existe una cita en ese horario'));
          return;
        }
        
        db.run(
          'UPDATE reservas SET fechaHora = ?, actualizada = ? WHERE id = ?',
          [nuevaFechaHora.toISOString(), new Date().toISOString(), id],
          function(err) {
            db.close();
            if (err) reject(err);
            else resolve(this.changes > 0);
          }
        );
      } catch (error) {
        db.close();
        reject(error);
      }
    });
  });
}

/**
 * Obtiene el detalle completo de una reserva por ID
 * @param {number} id - ID de la reserva
 * @returns {Promise<Object|null>}
 */
async function obtenerDetalleReserva(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM reservas WHERE id = ?', [id], (err, row) => {
      db.close();
      if (err) reject(err);
      else {
        if (row) {
          resolve({
            id: row.id,
            userId: row.userId,
            userName: row.userName,
            servicio: row.servicio,
            servicio_id: row.servicio_id,
            fechaHora: new Date(row.fechaHora),
            duracion: row.duracion,
            estado: row.estado,
            deposito: row.deposito,
            notificado: row.notificado === 1,
            origen: row.origen,
            notas: row.notas,
            creada: new Date(row.creada),
            actualizada: new Date(row.actualizada)
          });
        } else {
          resolve(null);
        }
      }
    });
  });
}

// ============================================
// FUNCIONES PARA GESTIÓN DE SERVICIOS
// ============================================

/**
 * Lista todos los servicios activos
 * @returns {Promise<Array>}
 */
async function listarServicios() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM servicios WHERE activo = 1 ORDER BY nombre', [], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Agrega un nuevo servicio
 * @param {string} nombre - Nombre del servicio
 * @param {number} duracion - Duración en minutos
 * @param {number} precio - Precio
 * @param {string} categoria - Categoría (opcional)
 * @param {string} descripcion - Descripción (opcional)
 * @returns {Promise<number>} - ID del servicio creado
 */
async function agregarServicio(nombre, duracion, precio, categoria = null, descripcion = null) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const ahora = new Date().toISOString();
    db.run(
      'INSERT INTO servicios (nombre, duracion, precio, categoria, descripcion, activo, creado, actualizado) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      [nombre, duracion, precio, categoria, descripcion, ahora, ahora],
      function(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

/**
 * Lista todos los paquetes activos
 * @returns {Promise<Array>}
 */
async function listarPaquetes() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM paquetes WHERE activo = 1 ORDER BY precio', (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Agrega un nuevo paquete
 * @param {string} nombre - Nombre del paquete
 * @param {number} precio - Precio
 * @param {number} cantidadPersonas - Cantidad de personas (1 o 2)
 * @param {string} descripcion - Descripción
 * @param {string} serviciosIncluidos - Servicios incluidos
 * @returns {Promise<number>} - ID del paquete creado
 */
async function agregarPaquete(nombre, precio, cantidadPersonas = 1, descripcion = null, serviciosIncluidos = null) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const ahora = new Date().toISOString();
    db.run(
      'INSERT INTO paquetes (nombre, precio, cantidad_personas, descripcion, servicios_incluidos, activo, creado, actualizado) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      [nombre, precio, cantidadPersonas, descripcion, serviciosIncluidos, ahora, ahora],
      function(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

/**
 * Desactiva un servicio
 * @param {number} id - ID del servicio
 * @returns {Promise<boolean>}
 */
async function desactivarServicio(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE servicios SET activo = 0, actualizado = ? WHERE id = ?',
      [new Date().toISOString(), id],
      function(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

/**
 * Obtiene un servicio por ID
 * @param {number} id - ID del servicio
 * @returns {Promise<Object|null>}
 */
async function obtenerServicioPorId(id) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM servicios WHERE id = ?', [id], (err, row) => {
      db.close();
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

// ============================================
// FUNCIONES PARA GESTIÓN DE USUARIOS BLOQUEADOS
// ============================================

/**
 * Bloquea un usuario
 * @param {string} telefono - Número de teléfono
 * @param {string} motivo - Motivo del bloqueo
 * @param {string} bloqueadoPor - ID del administrador que bloquea
 * @returns {Promise<number>} - ID del bloqueo
 */
async function bloquearUsuario(telefono, motivo = null, bloqueadoPor = null) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    // Normalizar el teléfono antes de guardar
    let telefonoNormalizado = telefono.replace(/\D/g, '');
    // Si tiene 9 dígitos y no empieza con 51, agregar prefijo
    if (telefonoNormalizado.length === 9 && !telefonoNormalizado.startsWith('51')) {
      telefonoNormalizado = '51' + telefonoNormalizado;
    }
    
    // Primero desactivar cualquier bloqueo existente para este teléfono (con ambos formatos)
    const formatosBusqueda = [telefonoNormalizado];
    if (telefonoNormalizado.length === 11 && telefonoNormalizado.startsWith('51')) {
      formatosBusqueda.push(telefonoNormalizado.substring(2));
    }
    
    const condiciones = formatosBusqueda.map(() => 'telefono = ?').join(' OR ');
    db.run(
      `UPDATE usuarios_bloqueados SET activo = 0 WHERE ${condiciones}`,
      formatosBusqueda,
      (err) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        // Ahora insertar el nuevo bloqueo
        db.run(
          'INSERT INTO usuarios_bloqueados (telefono, motivo, fecha_bloqueo, bloqueado_por, activo) VALUES (?, ?, ?, ?, 1)',
          [telefonoNormalizado, motivo, new Date().toISOString(), bloqueadoPor],
          function(err2) {
            db.close();
            if (err2) reject(err2);
            else resolve(this.lastID);
          }
        );
      }
    );
  });
}

/**
 * Desbloquea un usuario
 * @param {string} telefono - Número de teléfono
 * @returns {Promise<boolean>}
 */
async function desbloquearUsuario(telefono) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    // Normalizar el teléfono
    let telefonoNormalizado = telefono.replace(/\D/g, '');
    if (telefonoNormalizado.length === 9 && !telefonoNormalizado.startsWith('51')) {
      telefonoNormalizado = '51' + telefonoNormalizado;
    }
    
    // Preparar formatos de búsqueda
    const formatosBusqueda = [telefonoNormalizado];
    if (telefonoNormalizado.length === 11 && telefonoNormalizado.startsWith('51')) {
      formatosBusqueda.push(telefonoNormalizado.substring(2)); // Sin prefijo
    }
    
    // Desbloquear con formato normalizado y también sin prefijo
    const condiciones = formatosBusqueda.map(() => 'telefono = ?').join(' OR ');
    db.run(
      `UPDATE usuarios_bloqueados SET activo = 0 WHERE ${condiciones}`,
      formatosBusqueda,
      function(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

/**
 * Verifica si un usuario está bloqueado
 * @param {string} telefono - Número de teléfono
 * @returns {Promise<boolean>}
 */
async function estaUsuarioBloqueado(telefono) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    // Normalizar el teléfono antes de buscar
    let telefonoNormalizado = telefono.replace(/\D/g, '');
    // Si tiene 9 dígitos y no empieza con 51, agregar prefijo
    if (telefonoNormalizado.length === 9 && !telefonoNormalizado.startsWith('51')) {
      telefonoNormalizado = '51' + telefonoNormalizado;
    }
    
    // Buscar con el formato normalizado
    db.get(
      'SELECT COUNT(*) as count FROM usuarios_bloqueados WHERE telefono = ? AND activo = 1',
      [telefonoNormalizado],
      (err, row) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        // Si no se encuentra con el formato normalizado, intentar con variaciones
        if (row.count === 0 && telefonoNormalizado.length === 11 && telefonoNormalizado.startsWith('51')) {
          const telefonoSinPrefijo = telefonoNormalizado.substring(2);
          db.get(
            'SELECT COUNT(*) as count FROM usuarios_bloqueados WHERE telefono = ? AND activo = 1',
            [telefonoSinPrefijo],
            (err2, row2) => {
              db.close();
              if (err2) reject(err2);
              else resolve(row2.count > 0);
            }
          );
        } else {
          db.close();
          resolve(row.count > 0);
        }
      }
    );
  });
}

// ============================================
// FUNCIONES PARA GESTIÓN DE CLIENTES
// ============================================

/**
 * Obtiene o crea un cliente en la base de datos
 * @param {string} sessionId - Session ID (userId completo con @c.us o @lid)
 * @param {string} phone - Número de teléfono real (opcional, puede ser null)
 * @param {string} country - Código de país (opcional, ej: 'PE')
 * @param {string} nombre - Nombre del cliente (opcional)
 * @returns {Promise<Object>}
 */
async function obtenerOCrearCliente(sessionId, phone = null, country = null, nombre = null) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    // Buscar por session_id primero
    db.get('SELECT * FROM clientes WHERE session_id = ?', [sessionId], (err, row) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      if (row) {
        // Si existe pero no tiene phone y ahora lo tenemos, actualizar
        if (!row.phone && phone) {
          db.run(
            'UPDATE clientes SET phone = ?, country = ? WHERE session_id = ?',
            [phone, country, sessionId],
            (err) => {
              if (!err) {
                db.get('SELECT * FROM clientes WHERE session_id = ?', [sessionId], (err, updatedRow) => {
                  db.close();
                  if (err) reject(err);
                  else resolve(updatedRow);
                });
              } else {
                db.close();
                resolve(row); // Retornar el existente aunque no se actualizó
              }
            }
          );
        } else {
          db.close();
          resolve(row);
        }
      } else {
        // Si no existe, crear nuevo
        // Si tenemos phone, también buscar por phone para evitar duplicados
        if (phone) {
          db.get('SELECT * FROM clientes WHERE phone = ?', [phone], (err, rowByPhone) => {
            if (err) {
              db.close();
              reject(err);
              return;
            }
            
            if (rowByPhone) {
              // Existe por phone, actualizar session_id
              db.run(
                'UPDATE clientes SET session_id = ? WHERE phone = ?',
                [sessionId, phone],
                (err) => {
                  if (!err) {
                    db.get('SELECT * FROM clientes WHERE session_id = ?', [sessionId], (err, updatedRow) => {
                      db.close();
                      if (err) reject(err);
                      else resolve(updatedRow);
                    });
                  } else {
                    db.close();
                    resolve(rowByPhone);
                  }
                }
              );
            } else {
              // Crear nuevo cliente
              db.run(
                'INSERT INTO clientes (session_id, phone, country, nombre, fecha_creacion) VALUES (?, ?, ?, ?, ?)',
                [sessionId, phone, country, nombre, new Date().toISOString()],
                function(err) {
                  if (err) {
                    db.close();
                    reject(err);
                    return;
                  }
                  db.get('SELECT * FROM clientes WHERE id = ?', [this.lastID], (err, newRow) => {
                    db.close();
                    if (err) reject(err);
                    else resolve(newRow);
                  });
                }
              );
            }
          });
        } else {
          // Crear sin phone (solo session_id)
          db.run(
            'INSERT INTO clientes (session_id, phone, country, nombre, fecha_creacion) VALUES (?, ?, ?, ?, ?)',
            [sessionId, null, country, nombre, new Date().toISOString()],
            function(err) {
              if (err) {
                db.close();
                reject(err);
                return;
              }
              db.get('SELECT * FROM clientes WHERE id = ?', [this.lastID], (err, newRow) => {
                db.close();
                if (err) reject(err);
                else resolve(newRow);
              });
            }
          );
        }
      }
    });
  });
}

/**
 * Obtiene un cliente por número de teléfono (phone)
 * @param {string} phone - Número de teléfono
 * @returns {Promise<Object|null>}
 */
async function obtenerClientePorPhone(phone) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM clientes WHERE phone = ?', [phone], (err, row) => {
      db.close();
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

/**
 * Obtiene un cliente por session_id (sin crear). Para saber si el chat ya estaba iniciado.
 * @param {string} sessionId - session_id (ej. userId de WhatsApp)
 * @returns {Promise<Object|null>}
 */
async function obtenerClientePorSessionId(sessionId) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM clientes WHERE session_id = ?', [sessionId], (err, row) => {
      db.close();
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

/**
 * Obtiene historial completo de un cliente
 * @param {string} telefono - Número de teléfono o session_id
 * @returns {Promise<Object>}
 */
async function obtenerHistorialCliente(telefono) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    // Normalizar el teléfono antes de buscar
    let telefonoNormalizado = telefono.replace(/\D/g, '');
    // Si tiene 9 dígitos y no empieza con 51, agregar prefijo
    if (telefonoNormalizado.length === 9 && !telefonoNormalizado.startsWith('51')) {
      telefonoNormalizado = '51' + telefonoNormalizado;
    }
    
    // Preparar formatos de búsqueda para cliente
    const formatosCliente = [telefonoNormalizado];
    if (telefonoNormalizado.length === 11 && telefonoNormalizado.startsWith('51')) {
      formatosCliente.push(telefonoNormalizado.substring(2)); // Sin prefijo
    }
    
    // Obtener datos del cliente - buscar con formato normalizado y también sin prefijo
    const condicionesCliente = formatosCliente.map(() => 'telefono = ?').join(' OR ');
    db.get(`SELECT * FROM clientes WHERE ${condicionesCliente}`, formatosCliente, (err, cliente) => {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      if (!cliente) {
        db.close();
        resolve(null);
        return;
      }
      
      // Obtener todas las reservas del cliente - buscar con diferentes formatos
      const formatosBusqueda = [
        `%${telefonoNormalizado}%`,
        `%${telefonoNormalizado.substring(2)}%` // Sin prefijo
      ];
      if (telefonoNormalizado.length === 11 && telefonoNormalizado.startsWith('51')) {
        formatosBusqueda.push(`%${telefonoNormalizado.substring(2)}@c.us%`);
        formatosBusqueda.push(`%${telefonoNormalizado.substring(2)}@lid%`);
      }
      formatosBusqueda.push(`%${telefonoNormalizado}@c.us%`);
      formatosBusqueda.push(`%${telefonoNormalizado}@lid%`);
      
      // Construir query con múltiples condiciones LIKE
      const condiciones = formatosBusqueda.map(() => 'userId LIKE ?').join(' OR ');
      db.all(
        `SELECT * FROM reservas WHERE ${condiciones} ORDER BY fechaHora DESC`,
        formatosBusqueda,
        (err, reservas) => {
          db.close();
          if (err) {
            reject(err);
            return;
          }
          
          resolve({
            cliente: cliente,
            reservas: reservas.map(r => ({
              ...r,
              fechaHora: new Date(r.fechaHora),
              creada: new Date(r.creada),
              actualizada: new Date(r.actualizada)
            }))
          });
        }
      );
    });
  });
}

/**
 * Actualiza notas de un cliente
 * @param {string} phone - Número de teléfono (phone) o session_id
 * @param {string} notas - Notas a agregar
 * @returns {Promise<boolean>}
 */
async function actualizarNotasCliente(phone, notas) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    // Intentar actualizar por phone primero, luego por session_id
    db.run(
      'UPDATE clientes SET notas = ? WHERE phone = ? OR session_id = ?',
      [notas, phone, phone],
      function(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.changes > 0);
      }
    );
  });
}

// ============================================
// FUNCIONES PARA REPORTES
// ============================================

/**
 * Genera reporte diario
 * @param {Date} fecha - Fecha del reporte (opcional, por defecto hoy)
 * @returns {Promise<Object>}
 */
async function generarReporteDiario(fecha = null) {
  const db = await abrirDB();
  const fechaConsulta = fecha || new Date();
  const inicioDia = new Date(fechaConsulta);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(fechaConsulta);
  finDia.setHours(23, 59, 59, 999);
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
        SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
        SUM(CASE WHEN DATE(creada) = DATE(?) THEN 1 ELSE 0 END) as creadas_hoy,
        SUM(CASE WHEN DATE(actualizada) = DATE(?) AND estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas_hoy,
        SUM(CASE WHEN DATE(actualizada) = DATE(?) AND estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas_hoy
      FROM reservas
      WHERE DATE(fechaHora) = DATE(?)
    `, [inicioDia.toISOString(), inicioDia.toISOString(), inicioDia.toISOString(), inicioDia.toISOString()], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows[0] || {});
    });
  });
}

/**
 * Genera reporte mensual
 * @param {number} mes - Mes (1-12)
 * @param {number} año - Año
 * @returns {Promise<Object>}
 */
async function generarReporteMensual(mes, año) {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    const mesStr = String(mes).padStart(2, '0');
    const añoStr = String(año);
    
    db.all(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
        SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas,
        SUM(CASE WHEN strftime('%m', creada) = ? AND strftime('%Y', creada) = ? THEN 1 ELSE 0 END) as creadas_mes,
        SUM(CASE WHEN strftime('%m', actualizada) = ? AND strftime('%Y', actualizada) = ? AND estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas_mes,
        SUM(CASE WHEN strftime('%m', actualizada) = ? AND strftime('%Y', actualizada) = ? AND estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas_mes
      FROM reservas
      WHERE strftime('%m', fechaHora) = ? AND strftime('%Y', fechaHora) = ?
    `, [mesStr, añoStr, mesStr, añoStr, mesStr, añoStr, mesStr, añoStr], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows[0] || {});
    });
  });
}

/**
 * Obtiene top servicios más solicitados
 * @param {number} limite - Cantidad de servicios a retornar (default: 10)
 * @returns {Promise<Array>}
 */
async function obtenerTopServicios(limite = 10) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        servicio,
        COUNT(*) as total_reservas,
        SUM(CASE WHEN estado = 'confirmada' THEN 1 ELSE 0 END) as confirmadas,
        SUM(CASE WHEN estado = 'cancelada' THEN 1 ELSE 0 END) as canceladas
      FROM reservas
      WHERE estado != 'cancelada'
      GROUP BY servicio
      ORDER BY total_reservas DESC
      LIMIT ?
    `, [limite], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// ============================================
// FUNCIONES PARA INTERACCIONES IA
// ============================================

/**
 * Registra una interacción IA de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<number>} - Cantidad de interacciones del día
 */
async function registrarInteraccionIA(userId) {
  const db = await abrirDB();
  const hoy = new Date().toISOString().split('T')[0];
  
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO interacciones_ia (userId, fecha, cantidad)
      VALUES (?, ?, 1)
      ON CONFLICT(userId, fecha) DO UPDATE SET cantidad = cantidad + 1
    `, [userId, hoy], function(err) {
      if (err) {
        db.close();
        reject(err);
        return;
      }
      
      // Obtener cantidad actual
      db.get(
        'SELECT cantidad FROM interacciones_ia WHERE userId = ? AND fecha = ?',
        [userId, hoy],
        (err, row) => {
          db.close();
          if (err) reject(err);
          else resolve(row ? row.cantidad : 0);
        }
      );
    });
  });
}

/**
 * Obtiene cantidad de interacciones IA de un usuario hoy
 * @param {string} userId - ID del usuario
 * @returns {Promise<number>}
 */
async function obtenerInteraccionesIAHoy(userId) {
  const db = await abrirDB();
  const hoy = new Date().toISOString().split('T')[0];
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT cantidad FROM interacciones_ia WHERE userId = ? AND fecha = ?',
      [userId, hoy],
      (err, row) => {
        db.close();
        if (err) reject(err);
        else resolve(row ? row.cantidad : 0);
      }
    );
  });
}

/**
 * Verifica si un usuario puede usar IA (no excedió el límite)
 * @param {string} userId - ID del usuario
 * @returns {Promise<{puede: boolean, cantidad: number, limite: number}>}
 */
async function puedeUsarIA(userId) {
  const limite = await obtenerConfiguracion('limite_ia_por_usuario');
  const limiteNum = parseInt(limite || '10', 10);
  const cantidad = await obtenerInteraccionesIAHoy(userId);
  
  return {
    puede: cantidad < limiteNum,
    cantidad: cantidad,
    limite: limiteNum
  };
}

/**
 * Migra la base de datos agregando nuevas tablas y columnas
 */
async function migrarBaseDatos() {
  const db = await abrirDB();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Agregar nuevas columnas a reservas si no existen (SQLite no soporta ALTER TABLE ADD COLUMN IF NOT EXISTS)
      db.run('ALTER TABLE reservas ADD COLUMN servicio_id INTEGER', () => {});
      db.run('ALTER TABLE reservas ADD COLUMN origen TEXT DEFAULT "bot"', () => {});
      db.run('ALTER TABLE reservas ADD COLUMN notas TEXT', () => {});
      
      // Migrar tabla clientes: agregar session_id, phone, country
      // Primero verificar si existe la columna telefono (versión antigua)
      db.all("PRAGMA table_info(clientes)", (err, rows) => {
        if (err) {
          console.log("⚠️  Error al verificar estructura de clientes:", err.message);
          // Continuar con el resto de la migración aunque haya error
        } else if (rows && Array.isArray(rows) && rows.length > 0) {
          const columnas = rows.map(r => r.name);
          const tieneTelefono = columnas.includes('telefono');
          const tieneSessionId = columnas.includes('session_id');
          const tienePhone = columnas.includes('phone');
          
          // Si tiene telefono pero no session_id, migrar datos
          if (tieneTelefono && !tieneSessionId) {
            // Agregar nuevas columnas
            db.run('ALTER TABLE clientes ADD COLUMN session_id TEXT', () => {});
            db.run('ALTER TABLE clientes ADD COLUMN phone TEXT', () => {});
            db.run('ALTER TABLE clientes ADD COLUMN country TEXT', () => {});
            
            // Migrar datos: usar telefono como session_id temporal (si no es @lid)
            // y phone como telefono normalizado
            db.all('SELECT * FROM clientes', (err, clientes) => {
              if (!err && clientes) {
                clientes.forEach(cliente => {
                  const telefono = cliente.telefono;
                  // Si el telefono parece ser un número real (solo dígitos), usarlo como phone
                  // Si tiene @lid o @c.us, usarlo como session_id
                  if (telefono && /^\d+$/.test(telefono)) {
                    // Es un número real, usarlo como phone
                    db.run('UPDATE clientes SET phone = ?, session_id = ? WHERE id = ?', 
                      [telefono, telefono + '@c.us', cliente.id], () => {});
                  } else if (telefono && (telefono.includes('@lid') || telefono.includes('@c.us'))) {
                    // Ya tiene formato de session_id
                    db.run('UPDATE clientes SET session_id = ?, phone = NULL WHERE id = ?', 
                      [telefono, cliente.id], () => {});
                  }
                });
              }
            });
          } else if (!tieneSessionId) {
            // Agregar columnas si no existen
            db.run('ALTER TABLE clientes ADD COLUMN session_id TEXT', () => {});
            db.run('ALTER TABLE clientes ADD COLUMN phone TEXT', () => {});
            db.run('ALTER TABLE clientes ADD COLUMN country TEXT', () => {});
          }
        }
        // Continuar con el resto de la migración (no cerrar DB aquí)
      });
      
      // Crear tabla servicios
      db.run(`
        CREATE TABLE IF NOT EXISTS servicios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL UNIQUE,
          duracion INTEGER NOT NULL,
          precio REAL NOT NULL,
          activo INTEGER DEFAULT 1 CHECK(activo IN (0, 1)),
          categoria TEXT,
          descripcion TEXT,
          creado TEXT NOT NULL,
          actualizado TEXT NOT NULL
        )
      `, (err) => {
        if (err) {
          db.close();
          reject(err);
          return;
        }
        
        // Crear tabla usuarios_bloqueados
        db.run(`
          CREATE TABLE IF NOT EXISTS usuarios_bloqueados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telefono TEXT NOT NULL UNIQUE,
            motivo TEXT,
            fecha_bloqueo TEXT NOT NULL,
            bloqueado_por TEXT,
            activo INTEGER DEFAULT 1 CHECK(activo IN (0, 1))
          )
        `, (err) => {
          if (err) {
            db.close();
            reject(err);
            return;
          }
          
          // Crear tabla interacciones_ia
          db.run(`
            CREATE TABLE IF NOT EXISTS interacciones_ia (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              userId TEXT NOT NULL,
              fecha TEXT NOT NULL,
              cantidad INTEGER DEFAULT 1,
              UNIQUE(userId, fecha)
            )
          `, (err) => {
            if (err) {
              db.close();
              reject(err);
              return;
            }
            
            // Crear tabla clientes (nueva estructura con session_id y phone)
            db.run(`
              CREATE TABLE IF NOT EXISTS clientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL UNIQUE,
                phone TEXT,
                country TEXT,
                nombre TEXT,
                fecha_creacion TEXT NOT NULL,
                notas TEXT,
                total_reservas INTEGER DEFAULT 0,
                reservas_canceladas INTEGER DEFAULT 0,
                ultima_reserva TEXT
              )
            `, (err) => {
              if (err) {
                db.close();
                reject(err);
                return;
              }
              
              // Crear índices
              db.run('CREATE INDEX IF NOT EXISTS idx_usuarios_bloqueados_telefono ON usuarios_bloqueados(telefono)', () => {});
              db.run('CREATE INDEX IF NOT EXISTS idx_usuarios_bloqueados_activo ON usuarios_bloqueados(activo)', () => {});
              db.run('CREATE INDEX IF NOT EXISTS idx_interacciones_ia_userId ON interacciones_ia(userId)', () => {});
              db.run('CREATE INDEX IF NOT EXISTS idx_interacciones_ia_fecha ON interacciones_ia(fecha)', () => {});
              // Índices para clientes (nuevas columnas)
              db.run('CREATE INDEX IF NOT EXISTS idx_clientes_session_id ON clientes(session_id)', () => {});
              db.run('CREATE INDEX IF NOT EXISTS idx_clientes_phone ON clientes(phone)', () => {});
              db.run('CREATE INDEX IF NOT EXISTS idx_servicios_activo ON servicios(activo)', () => {});
              
              // Crear tabla de seguimientos
              db.run(`
                CREATE TABLE IF NOT EXISTS seguimientos (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  session_id TEXT NOT NULL,
                  tipo TEXT NOT NULL CHECK(tipo IN ('primero', 'segundo')),
                  fecha_envio TEXT NOT NULL,
                  mensaje_enviado TEXT,
                  respuesta_recibida INTEGER DEFAULT 0 CHECK(respuesta_recibida IN (0, 1)),
                  fecha_respuesta TEXT,
                  FOREIGN KEY (session_id) REFERENCES clientes(session_id)
                )
              `, (err) => {
                if (err) {
                  db.close();
                  reject(err);
                  return;
                }
                
                  // Crear tabla de conversaciones (historial de mensajes)
                  db.run(`
                    CREATE TABLE IF NOT EXISTS conversaciones (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      session_id TEXT NOT NULL,
                      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
                      content TEXT NOT NULL,
                      timestamp TEXT NOT NULL,
                      FOREIGN KEY (session_id) REFERENCES clientes(session_id)
                    )
                  `, (err) => {
                    if (err) {
                      db.close();
                      reject(err);
                      return;
                    }
                    
                    // Crear índices para conversaciones
                    db.run('CREATE INDEX IF NOT EXISTS idx_conversaciones_session_id ON conversaciones(session_id)', () => {});
                    db.run('CREATE INDEX IF NOT EXISTS idx_conversaciones_timestamp ON conversaciones(timestamp)', () => {});
                    
                    // Crear tabla de historias publicadas
                    db.run(`
                      CREATE TABLE IF NOT EXISTS historias_publicadas (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nombre_archivo TEXT NOT NULL UNIQUE,
                        ruta_completa TEXT NOT NULL,
                        fecha_publicacion TEXT NOT NULL,
                        dia_semana TEXT,
                        hora_publicacion TEXT
                      )
                    `, (err) => {
                      if (err) {
                        db.close();
                        reject(err);
                        return;
                      }
                      
                      // Agregar columnas a clientes si no existen (estado_lead, ultimo_mensaje)
                      db.all("PRAGMA table_info(clientes)", (err, rows) => {
                        if (err) {
                          console.log("⚠️  Error al verificar columnas de clientes:", err.message);
                        } else if (rows && Array.isArray(rows)) {
                          const columnas = rows.map(r => r.name);
                          if (!columnas.includes('estado_lead')) {
                            db.run('ALTER TABLE clientes ADD COLUMN estado_lead TEXT DEFAULT "info" CHECK(estado_lead IN ("info", "lead_tibio", "lead_caliente", "reservado"))', () => {});
                          }
                          if (!columnas.includes('ultimo_mensaje')) {
                            db.run('ALTER TABLE clientes ADD COLUMN ultimo_mensaje TEXT', () => {});
                          }
                        }
                        
                        // Crear índices adicionales
                        db.run('CREATE INDEX IF NOT EXISTS idx_clientes_estado_lead ON clientes(estado_lead)', () => {});
                        db.run('CREATE INDEX IF NOT EXISTS idx_clientes_ultimo_mensaje ON clientes(ultimo_mensaje)', () => {});
                        db.run('CREATE INDEX IF NOT EXISTS idx_seguimientos_session_id ON seguimientos(session_id)', () => {});
                        db.run('CREATE INDEX IF NOT EXISTS idx_seguimientos_fecha_envio ON seguimientos(fecha_envio)', () => {});
                        db.run('CREATE INDEX IF NOT EXISTS idx_historias_nombre ON historias_publicadas(nombre_archivo)', () => {});
                        
                        // Agregar valores por defecto a configuracion
                        const ahora = new Date().toISOString();
                        db.run(`
                          INSERT OR IGNORE INTO configuracion (clave, valor, descripcion, actualizada)
                          VALUES 
                            ('modo_ia', 'auto', 'Modo de IA: auto, manual, solo_faq', ?),
                            ('limite_ia_por_usuario', '10', 'Cantidad máxima de respuestas IA por usuario por día', ?),
                            ('horas_confirmacion_automatica', '24', 'Horas para confirmación automática si no hay respuesta', ?)
                        `, [ahora, ahora, ahora], (err) => {
                          db.close();
                          if (err) reject(err);
                          else resolve();
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
}

/**
 * Actualiza el estado de lead y último mensaje de un cliente
 */
async function actualizarEstadoLead(sessionId, estadoLead, ultimoMensaje = null) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const ahora = new Date().toISOString();
    db.run(
      'UPDATE clientes SET estado_lead = ?, ultimo_mensaje = ? WHERE session_id = ?',
      [estadoLead, ultimoMensaje || ahora, sessionId],
      (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Registra un seguimiento enviado
 */
async function registrarSeguimiento(sessionId, tipo, mensajeEnviado) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const ahora = new Date().toISOString();
    db.run(
      'INSERT INTO seguimientos (session_id, tipo, fecha_envio, mensaje_enviado) VALUES (?, ?, ?, ?)',
      [sessionId, tipo, ahora, mensajeEnviado],
      (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Verifica si ya se envió un seguimiento de un tipo específico a un cliente
 */
async function yaSeEnvioSeguimiento(sessionId, tipo) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM seguimientos WHERE session_id = ? AND tipo = ?',
      [sessionId, tipo],
      (err, row) => {
        db.close();
        if (err) reject(err);
        else resolve((row && row.count > 0) || false);
      }
    );
  });
}

/**
 * Obtiene todos los seguimientos de un cliente
 */
async function obtenerSeguimientos(sessionId) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM seguimientos WHERE session_id = ? ORDER BY fecha_envio DESC',
      [sessionId],
      (err, rows) => {
        db.close();
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

/**
 * Marca que un cliente respondió a un seguimiento
 */
async function marcarRespuestaSeguimiento(sessionId) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const ahora = new Date().toISOString();
    db.run(
      'UPDATE seguimientos SET respuesta_recibida = 1, fecha_respuesta = ? WHERE session_id = ? AND respuesta_recibida = 0',
      [ahora, sessionId],
      (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Obtiene clientes que necesitan seguimiento (info o lead_tibio, sin respuesta reciente)
 */
async function obtenerClientesParaSeguimiento(horasMinimas = 12, horasMaximas = 24) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const ahora = new Date();
    const fechaMinima = new Date(ahora.getTime() - horasMaximas * 60 * 60 * 1000).toISOString();
    const fechaMaxima = new Date(ahora.getTime() - horasMinimas * 60 * 60 * 1000).toISOString();
    
    db.all(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM seguimientos s WHERE s.session_id = c.session_id) as total_seguimientos,
        (SELECT COUNT(*) FROM seguimientos s WHERE s.session_id = c.session_id AND s.tipo = 'primero') as seguimientos_primero,
        (SELECT COUNT(*) FROM seguimientos s WHERE s.session_id = c.session_id AND s.tipo = 'segundo') as seguimientos_segundo
      FROM clientes c
      WHERE c.estado_lead IN ('info', 'lead_tibio')
        AND c.ultimo_mensaje >= ? 
        AND c.ultimo_mensaje <= ?
        AND (SELECT COUNT(*) FROM seguimientos s WHERE s.session_id = c.session_id AND s.respuesta_recibida = 0) = 0
      ORDER BY c.ultimo_mensaje ASC
    `, [fechaMinima, fechaMaxima], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/**
 * Obtiene clientes que necesitan segundo seguimiento (48-72h después del primero)
 */
async function obtenerClientesParaSegundoSeguimiento() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const ahora = new Date();
    const fechaMinima = new Date(ahora.getTime() - 72 * 60 * 60 * 1000).toISOString();
    const fechaMaxima = new Date(ahora.getTime() - 48 * 60 * 60 * 1000).toISOString();
    
    db.all(`
      SELECT DISTINCT c.*,
        (SELECT COUNT(*) FROM seguimientos s WHERE s.session_id = c.session_id AND s.tipo = 'primero') as tiene_primero,
        (SELECT COUNT(*) FROM seguimientos s WHERE s.session_id = c.session_id AND s.tipo = 'segundo') as tiene_segundo,
        (SELECT MAX(fecha_envio) FROM seguimientos s WHERE s.session_id = c.session_id AND s.tipo = 'primero') as fecha_primer_seguimiento
      FROM clientes c
      INNER JOIN seguimientos s ON s.session_id = c.session_id
      WHERE c.estado_lead IN ('info', 'lead_tibio')
        AND s.tipo = 'primero'
        AND s.fecha_envio >= ? 
        AND s.fecha_envio <= ?
        AND s.respuesta_recibida = 0
        AND (SELECT COUNT(*) FROM seguimientos s2 WHERE s2.session_id = c.session_id AND s2.tipo = 'segundo') = 0
      ORDER BY s.fecha_envio ASC
    `, [fechaMinima, fechaMaxima], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/**
 * Registra una historia publicada
 */
async function registrarHistoriaPublicada(nombreArchivo, rutaCompleta, diaSemana = null, horaPublicacion = null) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const ahora = new Date().toISOString();
    db.run(
      'INSERT OR IGNORE INTO historias_publicadas (nombre_archivo, ruta_completa, fecha_publicacion, dia_semana, hora_publicacion) VALUES (?, ?, ?, ?, ?)',
      [nombreArchivo, rutaCompleta, ahora, diaSemana, horaPublicacion],
      (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

/**
 * Verifica si una historia ya fue publicada
 */
async function historiaYaPublicada(nombreArchivo) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM historias_publicadas WHERE nombre_archivo = ?',
      [nombreArchivo],
      (err, row) => {
        db.close();
        if (err) reject(err);
        else resolve((row && row.count > 0) || false);
      }
    );
  });
}

/**
 * Obtiene todas las historias publicadas
 */
async function obtenerHistoriasPublicadas() {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM historias_publicadas ORDER BY fecha_publicacion DESC',
      [],
      (err, rows) => {
        db.close();
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
}

// ============================================
// FUNCIONES PARA GESTIÓN DE CONVERSACIONES
// ============================================

/**
 * Guarda un mensaje en el historial de conversación
 * @param {string} sessionId - ID de sesión del usuario
 * @param {string} role - Rol del mensaje ('user', 'assistant', 'system')
 * @param {string} content - Contenido del mensaje
 * @returns {Promise<number>} - ID del mensaje guardado
 */
async function guardarMensajeConversacion(sessionId, role, content) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString();
    db.run(
      'INSERT INTO conversaciones (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)',
      [sessionId, role, content, timestamp],
      function(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

/**
 * Obtiene el historial de conversación de un usuario
 * @param {string} sessionId - ID de sesión del usuario
 * @param {number} limite - Límite de mensajes a retornar (default: 18)
 * @returns {Promise<Array>} - Array de mensajes ordenados por timestamp
 */
async function obtenerHistorialConversacion(sessionId, limite = 18) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT role, content FROM conversaciones WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?',
      [sessionId, limite],
      (err, rows) => {
        db.close();
        if (err) {
          reject(err);
        } else {
          // Invertir para tener orden cronológico (más antiguo primero)
          resolve(rows.reverse().map(row => ({
            role: row.role,
            content: row.content
          })));
        }
      }
    );
  });
}

/**
 * Limpia el historial de conversación de un usuario
 * @param {string} sessionId - ID de sesión del usuario
 * @returns {Promise<number>} - Número de mensajes eliminados
 */
async function limpiarHistorialConversacion(sessionId) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM conversaciones WHERE session_id = ?',
      [sessionId],
      function(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

/**
 * Limpia conversaciones antiguas (más de X días)
 * @param {number} dias - Días de retención (default: 30)
 * @returns {Promise<number>} - Número de mensajes eliminados
 */
async function limpiarConversacionesAntiguas(dias = 30) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    
    db.run(
      'DELETE FROM conversaciones WHERE timestamp < ?',
      [fechaLimite.toISOString()],
      function(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

module.exports = {
  abrirDB,
  inicializarDB,
  guardarReserva,
  obtenerReservas,
  consultarDisponibilidad,
  actualizarReserva,
  eliminarReserva,
  limpiarTodasLasReservas,
  obtenerEstadisticas,
  verificarConflictoHorario,
  obtenerConfiguracion,
  establecerConfiguracion,
  guardarLog,
  obtenerLogs,
  limpiarLogsAntiguos,
  confirmarReserva,
  cancelarReservaPorId,
  modificarFechaHoraReserva,
  obtenerDetalleReserva,
  listarServicios,
  agregarServicio,
  desactivarServicio,
  obtenerServicioPorId,
  listarPaquetes,
  agregarPaquete,
  bloquearUsuario,
  desbloquearUsuario,
  estaUsuarioBloqueado,
  obtenerOCrearCliente,
  obtenerClientePorPhone,
  obtenerClientePorSessionId,
  obtenerHistorialCliente,
  actualizarNotasCliente,
  generarReporteDiario,
  generarReporteMensual,
  obtenerTopServicios,
  registrarInteraccionIA,
  obtenerInteraccionesIAHoy,
  puedeUsarIA,
  migrarBaseDatos,
  actualizarEstadoLead,
  registrarSeguimiento,
  yaSeEnvioSeguimiento,
  obtenerSeguimientos,
  marcarRespuestaSeguimiento,
  obtenerClientesParaSeguimiento,
  obtenerClientesParaSegundoSeguimiento,
  registrarHistoriaPublicada,
  historiaYaPublicada,
  obtenerHistoriasPublicadas,
  guardarMensajeConversacion,
  obtenerHistorialConversacion,
  limpiarHistorialConversacion,
  limpiarConversacionesAntiguas,
  DB_PATH
};

