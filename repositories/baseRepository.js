/**
 * Repository Pattern - Base Repository
 * Abstrae el acceso a datos de la lógica de negocio
 */

const { logError } = require('../utils/logger');
const { DatabaseError } = require('../utils/errors');

class BaseRepository {
  constructor(db, tableName) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Abre conexión a la base de datos
   */
  async abrirDB() {
    // El db pasado debe tener el método abrirDB exportado
    if (typeof this.db.abrirDB === 'function') {
      return await this.db.abrirDB();
    }
    throw new Error('Database module must export abrirDB function');
  }

  /**
   * Ejecuta una query y maneja errores
   */
  async ejecutarQuery(query, params = []) {
    const db = await this.abrirDB();
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        db.close();
        if (err) {
          logError(err, { contexto: 'ejecutarQuery', query, table: this.tableName });
          reject(new DatabaseError(`Error en query: ${err.message}`, 'query', { query }));
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Ejecuta una query que retorna un solo resultado
   */
  async ejecutarQueryOne(query, params = []) {
    const db = await this.abrirDB();
    return new Promise((resolve, reject) => {
      db.get(query, params, (err, row) => {
        db.close();
        if (err) {
          logError(err, { contexto: 'ejecutarQueryOne', query, table: this.tableName });
          reject(new DatabaseError(`Error en query: ${err.message}`, 'query', { query }));
        } else {
          resolve(row || null);
        }
      });
    });
  }

  /**
   * Ejecuta una query de inserción/actualización
   */
  async ejecutarUpdate(query, params = []) {
    const db = await this.abrirDB();
    return new Promise((resolve, reject) => {
      db.run(query, params, function(err) {
        db.close();
        if (err) {
          logError(err, { contexto: 'ejecutarUpdate', query, table: this.tableName });
          reject(new DatabaseError(`Error en update: ${err.message}`, 'update', { query }));
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }
}

module.exports = BaseRepository;
