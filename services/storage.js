// Servicio de almacenamiento optimizado con Map/Set
// Usa estructuras de datos eficientes para búsquedas O(1)

class StorageService {
  constructor() {
    // Usar Map para búsquedas O(1) en lugar de objetos
    this.userState = new Map();
    this.userNames = new Map();
    this.userData = new Map();
    this.historialConversacion = new Map();
    this.ultimaRespuestaReserva = new Map();
    
    // Sets para operaciones rápidas
    this.humanModeUsers = new Set();
    this.usuariosBotDesactivado = new Set();
    this.estadisticas = {
      usuariosAtendidos: new Set(),
      totalMensajes: 0,
      reservasSolicitadas: 0,
      asesoresActivados: 0,
      inicio: new Date(),
    };
    
    // Array para reservas (se mantiene como array para ordenamiento)
    this.reservas = [];
  }

  // Métodos para userState
  getUserState(userId) {
    return this.userState.get(userId) || null;
  }

  setUserState(userId, state) {
    this.userState.set(userId, state);
  }

  // Métodos para userNames
  getUserName(userId) {
    return this.userNames.get(userId);
  }

  setUserName(userId, name) {
    this.userNames.set(userId, name);
  }

  // Métodos para userData
  getUserData(userId) {
    return this.userData.get(userId);
  }

  setUserData(userId, data) {
    this.userData.set(userId, data);
  }

  // Métodos para historialConversacion
  getHistorial(userId) {
    return this.historialConversacion.get(userId) || [];
  }

  setHistorial(userId, historial) {
    this.historialConversacion.set(userId, historial);
  }

  // Métodos para humanModeUsers
  isHumanMode(userId) {
    return this.humanModeUsers.has(userId);
  }

  setHumanMode(userId, enabled) {
    if (enabled) {
      this.humanModeUsers.add(userId);
    } else {
      this.humanModeUsers.delete(userId);
    }
  }

  clearHumanMode() {
    this.humanModeUsers.clear();
  }

  // Métodos para usuariosBotDesactivado
  isBotDesactivado(userId) {
    return this.usuariosBotDesactivado.has(userId);
  }

  setBotDesactivado(userId, desactivado) {
    if (desactivado) {
      this.usuariosBotDesactivado.add(userId);
    } else {
      this.usuariosBotDesactivado.delete(userId);
    }
  }

  // Métodos para reservas
  getReservas() {
    return this.reservas;
  }

  addReserva(reserva) {
    this.reservas.push(reserva);
  }

  // Convertir a objetos planos para persistencia
  toPlainObjects() {
    return {
      userState: Object.fromEntries(this.userState),
      userNames: Object.fromEntries(this.userNames),
      userData: Object.fromEntries(this.userData),
      historialConversacion: Object.fromEntries(this.historialConversacion),
      ultimaRespuestaReserva: Object.fromEntries(this.ultimaRespuestaReserva),
      humanModeUsers: Array.from(this.humanModeUsers),
      usuariosBotDesactivado: Array.from(this.usuariosBotDesactivado),
      estadisticas: {
        ...this.estadisticas,
        usuariosAtendidos: Array.from(this.estadisticas.usuariosAtendidos),
      },
      reservas: this.reservas,
    };
  }

  // Cargar desde objetos planos
  fromPlainObjects(data) {
    if (data.userState) {
      this.userState = new Map(Object.entries(data.userState));
    }
    if (data.userNames) {
      this.userNames = new Map(Object.entries(data.userNames));
    }
    if (data.userData) {
      this.userData = new Map(Object.entries(data.userData));
    }
    if (data.historialConversacion) {
      this.historialConversacion = new Map(Object.entries(data.historialConversacion));
    }
    if (data.ultimaRespuestaReserva) {
      this.ultimaRespuestaReserva = new Map(Object.entries(data.ultimaRespuestaReserva));
    }
    if (data.humanModeUsers) {
      this.humanModeUsers = new Set(data.humanModeUsers);
    }
    if (data.usuariosBotDesactivado) {
      this.usuariosBotDesactivado = new Set(data.usuariosBotDesactivado);
    }
    if (data.estadisticas) {
      this.estadisticas = {
        ...data.estadisticas,
        usuariosAtendidos: new Set(data.estadisticas.usuariosAtendidos || []),
        inicio: new Date(data.estadisticas.inicio),
      };
    }
    if (data.reservas) {
      this.reservas = data.reservas.map(r => ({
        ...r,
        fechaHora: new Date(r.fechaHora),
        creada: new Date(r.creada),
      }));
    }
  }
}

// Singleton
const storage = new StorageService();

module.exports = storage;

