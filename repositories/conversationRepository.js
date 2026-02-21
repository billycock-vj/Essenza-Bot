/**
 * Repository para conversaciones
 * Implementa Repository Pattern para acceso a datos de conversaciones
 */

const BaseRepository = require('./baseRepository');

class ConversationRepository extends BaseRepository {
  constructor(db) {
    super(db, 'conversaciones');
  }

  /**
   * Guarda un mensaje en el historial
   */
  async guardar(sessionId, role, content) {
    const query = `
      INSERT INTO conversaciones (session_id, role, content, timestamp)
      VALUES (?, ?, ?, ?)
    `;
    const timestamp = new Date().toISOString();
    const result = await this.ejecutarUpdate(query, [sessionId, role, content, timestamp]);
    return result.lastID;
  }

  /**
   * Obtiene el historial de un usuario
   */
  async obtenerHistorial(sessionId, limite = 18) {
    const query = `
      SELECT role, content 
      FROM conversaciones 
      WHERE session_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    const rows = await this.ejecutarQuery(query, [sessionId, limite]);
    return rows.reverse().map(row => ({
      role: row.role,
      content: row.content
    }));
  }

  /**
   * Limpia el historial de un usuario
   */
  async limpiar(sessionId) {
    const query = 'DELETE FROM conversaciones WHERE session_id = ?';
    const result = await this.ejecutarUpdate(query, [sessionId]);
    return result.changes;
  }

  /**
   * Limpia conversaciones antiguas
   */
  async limpiarAntiguas(dias = 30) {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    const query = 'DELETE FROM conversaciones WHERE timestamp < ?';
    const result = await this.ejecutarUpdate(query, [fechaLimite.toISOString()]);
    return result.changes;
  }
}

module.exports = ConversationRepository;
