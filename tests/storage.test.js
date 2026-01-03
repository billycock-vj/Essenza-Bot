/**
 * Tests para el módulo services/storage.js
 * 
 * Este módulo proporciona un servicio de almacenamiento en memoria optimizado
 * usando Map y Set para búsquedas O(1). Maneja:
 * - Estados de usuarios
 * - Datos de usuarios
 * - Historial de conversación
 * - Modo humano/asesor
 * - Reservas
 * - Estadísticas
 */

const StorageService = require('../services/storage');

describe('services/storage.js - StorageService', () => {
  let storage;

  // Crear nueva instancia antes de cada test para evitar interferencias
  beforeEach(() => {
    // Necesitamos crear una nueva instancia, pero el módulo exporta un singleton
    // Vamos a trabajar con el singleton pero limpiarlo antes de cada test
    storage = require('../services/storage');
    
    // Limpiar todos los datos antes de cada test
    storage.userState.clear();
    storage.userNames.clear();
    storage.userData.clear();
    storage.historialConversacion.clear();
    storage.ultimaRespuestaReserva.clear();
    storage.humanModeUsers.clear();
    storage.usuariosBotDesactivado.clear();
    storage.reservas = [];
    storage.estadisticas = {
      usuariosAtendidos: new Set(),
      totalMensajes: 0,
      reservasSolicitadas: 0,
      asesoresActivados: 0,
      inicio: new Date(),
    };
  });

  describe('userState - Gestión de estados de usuario', () => {
    describe('Casos normales', () => {
      test('Debe guardar y recuperar estado de usuario correctamente', () => {
        const userId = '51983104105@c.us';
        const estado = 'reserva';

        storage.setUserState(userId, estado);
        const estadoRecuperado = storage.getUserState(userId);

        expect(estadoRecuperado).toBe(estado);
      });

      test('Debe retornar null para usuario sin estado', () => {
        const userId = '51983104105@c.us';
        const estado = storage.getUserState(userId);

        expect(estado).toBe(null);
      });

      test('Debe actualizar estado existente', () => {
        const userId = '51983104105@c.us';
        
        storage.setUserState(userId, 'reserva');
        storage.setUserState(userId, 'asesor');
        
        expect(storage.getUserState(userId)).toBe('asesor');
      });
    });

    describe('Casos límite', () => {
      test('Debe manejar múltiples usuarios con diferentes estados', () => {
        storage.setUserState('user1@c.us', 'reserva');
        storage.setUserState('user2@c.us', 'asesor');
        storage.setUserState('user3@c.us', null);

        expect(storage.getUserState('user1@c.us')).toBe('reserva');
        expect(storage.getUserState('user2@c.us')).toBe('asesor');
        expect(storage.getUserState('user3@c.us')).toBe(null);
      });

      test('Debe permitir estado null', () => {
        const userId = '51983104105@c.us';
        storage.setUserState(userId, null);
        
        expect(storage.getUserState(userId)).toBe(null);
      });
    });
  });

  describe('userNames - Gestión de nombres de usuario', () => {
    describe('Casos normales', () => {
      test('Debe guardar y recuperar nombre de usuario', () => {
        const userId = '51983104105@c.us';
        const nombre = 'Juan Pérez';

        storage.setUserName(userId, nombre);
        const nombreRecuperado = storage.getUserName(userId);

        expect(nombreRecuperado).toBe(nombre);
      });

      test('Debe retornar undefined para usuario sin nombre', () => {
        const userId = '51983104105@c.us';
        const nombre = storage.getUserName(userId);

        expect(nombre).toBeUndefined();
      });

      test('Debe actualizar nombre existente', () => {
        const userId = '51983104105@c.us';
        
        storage.setUserName(userId, 'Juan');
        storage.setUserName(userId, 'Juan Pérez');
        
        expect(storage.getUserName(userId)).toBe('Juan Pérez');
      });
    });
  });

  describe('userData - Gestión de datos de usuario', () => {
    describe('Casos normales', () => {
      test('Debe guardar y recuperar datos de usuario', () => {
        const userId = '51983104105@c.us';
        const datos = {
          bienvenidaEnviada: true,
          saludoEnviado: false,
          ultimaInteraccion: new Date().toISOString(),
        };

        storage.setUserData(userId, datos);
        const datosRecuperados = storage.getUserData(userId);

        expect(datosRecuperados).toEqual(datos);
      });

      test('Debe retornar undefined para usuario sin datos', () => {
        const userId = '51983104105@c.us';
        const datos = storage.getUserData(userId);

        expect(datos).toBeUndefined();
      });

      test('Debe actualizar datos existentes parcialmente', () => {
        const userId = '51983104105@c.us';
        const datosIniciales = {
          bienvenidaEnviada: false,
          saludoEnviado: false,
        };

        storage.setUserData(userId, datosIniciales);
        storage.setUserData(userId, { ...datosIniciales, bienvenidaEnviada: true });

        const datos = storage.getUserData(userId);
        expect(datos.bienvenidaEnviada).toBe(true);
        expect(datos.saludoEnviado).toBe(false);
      });
    });
  });

  describe('historialConversacion - Gestión de historial', () => {
    describe('Casos normales', () => {
      test('Debe guardar y recuperar historial de conversación', () => {
        const userId = '51983104105@c.us';
        const historial = [
          { role: 'user', content: 'Hola' },
          { role: 'assistant', content: 'Hola, ¿en qué puedo ayudarte?' },
        ];

        storage.setHistorial(userId, historial);
        const historialRecuperado = storage.getHistorial(userId);

        expect(historialRecuperado).toEqual(historial);
      });

      test('Debe retornar array vacío para usuario sin historial', () => {
        const userId = '51983104105@c.us';
        const historial = storage.getHistorial(userId);

        expect(historial).toEqual([]);
      });

      test('Debe permitir reemplazar historial completo', () => {
        const userId = '51983104105@c.us';
        const historial1 = [{ role: 'user', content: 'Mensaje 1' }];
        const historial2 = [{ role: 'user', content: 'Mensaje 2' }];

        storage.setHistorial(userId, historial1);
        storage.setHistorial(userId, historial2);

        expect(storage.getHistorial(userId)).toEqual(historial2);
      });
    });
  });

  describe('humanModeUsers - Gestión de modo asesor', () => {
    describe('Casos normales', () => {
      test('Debe agregar usuario al modo asesor', () => {
        const userId = '51983104105@c.us';

        storage.setHumanMode(userId, true);
        const estaEnModoAsesor = storage.isHumanMode(userId);

        expect(estaEnModoAsesor).toBe(true);
      });

      test('Debe remover usuario del modo asesor', () => {
        const userId = '51983104105@c.us';

        storage.setHumanMode(userId, true);
        storage.setHumanMode(userId, false);
        const estaEnModoAsesor = storage.isHumanMode(userId);

        expect(estaEnModoAsesor).toBe(false);
      });

      test('Debe retornar false para usuario no en modo asesor', () => {
        const userId = '51983104105@c.us';
        const estaEnModoAsesor = storage.isHumanMode(userId);

        expect(estaEnModoAsesor).toBe(false);
      });

      test('Debe limpiar todos los usuarios del modo asesor', () => {
        storage.setHumanMode('user1@c.us', true);
        storage.setHumanMode('user2@c.us', true);
        storage.setHumanMode('user3@c.us', true);

        storage.clearHumanMode();

        expect(storage.humanModeUsers.size).toBe(0);
        expect(storage.isHumanMode('user1@c.us')).toBe(false);
        expect(storage.isHumanMode('user2@c.us')).toBe(false);
        expect(storage.isHumanMode('user3@c.us')).toBe(false);
      });
    });
  });

  describe('usuariosBotDesactivado - Gestión de bot desactivado', () => {
    describe('Casos normales', () => {
      test('Debe marcar usuario como bot desactivado', () => {
        const userId = '51983104105@c.us';

        storage.setBotDesactivado(userId, true);
        const botDesactivado = storage.isBotDesactivado(userId);

        expect(botDesactivado).toBe(true);
      });

      test('Debe reactivar bot para usuario', () => {
        const userId = '51983104105@c.us';

        storage.setBotDesactivado(userId, true);
        storage.setBotDesactivado(userId, false);
        const botDesactivado = storage.isBotDesactivado(userId);

        expect(botDesactivado).toBe(false);
      });

      test('Debe retornar false para usuario con bot activo', () => {
        const userId = '51983104105@c.us';
        const botDesactivado = storage.isBotDesactivado(userId);

        expect(botDesactivado).toBe(false);
      });
    });
  });

  describe('reservas - Gestión de reservas', () => {
    describe('Casos normales', () => {
      test('Debe agregar reserva al array', () => {
        const reserva = {
          userId: '51983104105@c.us',
          userName: 'Juan Pérez',
          servicio: 'Masaje Relajante',
          fechaHora: new Date('2024-12-25T14:00:00'),
          creada: new Date(),
        };

        storage.addReserva(reserva);
        const reservas = storage.getReservas();

        expect(reservas).toHaveLength(1);
        expect(reservas[0]).toEqual(reserva);
      });

      test('Debe permitir múltiples reservas', () => {
        const reserva1 = {
          userId: 'user1@c.us',
          servicio: 'Masaje 1',
          fechaHora: new Date('2024-12-25T14:00:00'),
          creada: new Date(),
        };
        const reserva2 = {
          userId: 'user2@c.us',
          servicio: 'Masaje 2',
          fechaHora: new Date('2024-12-26T15:00:00'),
          creada: new Date(),
        };

        storage.addReserva(reserva1);
        storage.addReserva(reserva2);
        const reservas = storage.getReservas();

        expect(reservas).toHaveLength(2);
      });

      test('Debe retornar array vacío cuando no hay reservas', () => {
        const reservas = storage.getReservas();

        expect(reservas).toEqual([]);
        expect(reservas).toHaveLength(0);
      });
    });
  });

  describe('toPlainObjects - Conversión para persistencia', () => {
    describe('Casos normales', () => {
      test('Debe convertir Maps a objetos planos', () => {
        storage.setUserState('user1@c.us', 'reserva');
        storage.setUserName('user1@c.us', 'Juan');
        storage.setUserData('user1@c.us', { saludoEnviado: true });

        const objetosPlanos = storage.toPlainObjects();

        expect(typeof objetosPlanos.userState).toBe('object');
        expect(Array.isArray(objetosPlanos.userState)).toBe(false);
        expect(objetosPlanos.userState['user1@c.us']).toBe('reserva');
      });

      test('Debe convertir Sets a arrays', () => {
        storage.setHumanMode('user1@c.us', true);
        storage.setHumanMode('user2@c.us', true);

        const objetosPlanos = storage.toPlainObjects();

        expect(Array.isArray(objetosPlanos.humanModeUsers)).toBe(true);
        expect(objetosPlanos.humanModeUsers).toContain('user1@c.us');
        expect(objetosPlanos.humanModeUsers).toContain('user2@c.us');
      });

      test('Debe convertir estadísticas correctamente', () => {
        storage.estadisticas.usuariosAtendidos.add('user1@c.us');
        storage.estadisticas.totalMensajes = 100;

        const objetosPlanos = storage.toPlainObjects();

        expect(Array.isArray(objetosPlanos.estadisticas.usuariosAtendidos)).toBe(true);
        expect(objetosPlanos.estadisticas.totalMensajes).toBe(100);
      });
    });
  });

  describe('fromPlainObjects - Carga desde persistencia', () => {
    describe('Casos normales', () => {
      test('Debe cargar datos desde objetos planos', () => {
        const datos = {
          userState: { 'user1@c.us': 'reserva' },
          userNames: { 'user1@c.us': 'Juan' },
          userData: { 'user1@c.us': { saludoEnviado: true } },
          historialConversacion: { 'user1@c.us': [{ role: 'user', content: 'Hola' }] },
          humanModeUsers: ['user1@c.us'],
          usuariosBotDesactivado: ['user2@c.us'],
          estadisticas: {
            usuariosAtendidos: ['user1@c.us', 'user2@c.us'],
            totalMensajes: 50,
            reservasSolicitadas: 10,
            asesoresActivados: 5,
            inicio: new Date().toISOString(),
          },
          reservas: [],
        };

        storage.fromPlainObjects(datos);

        expect(storage.getUserState('user1@c.us')).toBe('reserva');
        expect(storage.getUserName('user1@c.us')).toBe('Juan');
        expect(storage.isHumanMode('user1@c.us')).toBe(true);
        expect(storage.isBotDesactivado('user2@c.us')).toBe(true);
        expect(storage.estadisticas.totalMensajes).toBe(50);
      });

      test('Debe convertir arrays de Sets correctamente', () => {
        const datos = {
          estadisticas: {
            usuariosAtendidos: ['user1@c.us', 'user2@c.us'],
            totalMensajes: 0,
            reservasSolicitadas: 0,
            asesoresActivados: 0,
            inicio: new Date().toISOString(),
          },
        };

        storage.fromPlainObjects(datos);

        expect(storage.estadisticas.usuariosAtendidos).toBeInstanceOf(Set);
        expect(storage.estadisticas.usuariosAtendidos.has('user1@c.us')).toBe(true);
        expect(storage.estadisticas.usuariosAtendidos.has('user2@c.us')).toBe(true);
      });

      test('Debe convertir fechas de reservas correctamente', () => {
        const reserva = {
          userId: 'user1@c.us',
          fechaHora: new Date('2024-12-25T14:00:00').toISOString(),
          creada: new Date().toISOString(),
        };

        storage.fromPlainObjects({ reservas: [reserva] });

        expect(storage.reservas[0].fechaHora).toBeInstanceOf(Date);
        expect(storage.reservas[0].creada).toBeInstanceOf(Date);
      });
    });

    describe('Casos límite', () => {
      test('Debe manejar datos parciales sin fallar', () => {
        const datos = {
          userState: { 'user1@c.us': 'reserva' },
          // Otros campos faltantes
        };

        expect(() => storage.fromPlainObjects(datos)).not.toThrow();
        expect(storage.getUserState('user1@c.us')).toBe('reserva');
      });

      test('Debe manejar objeto vacío sin fallar', () => {
        expect(() => storage.fromPlainObjects({})).not.toThrow();
      });
    });
  });

  describe('Casos de integración - Múltiples operaciones', () => {
    test('Debe manejar flujo completo de usuario', () => {
      const userId = '51983104105@c.us';

      // Inicializar usuario
      storage.setUserName(userId, 'Juan Pérez');
      storage.setUserData(userId, { bienvenidaEnviada: false });
      storage.setUserState(userId, null);

      // Agregar historial
      storage.setHistorial(userId, [{ role: 'user', content: 'Hola' }]);

      // Activar modo asesor
      storage.setHumanMode(userId, true);

      // Verificar todo
      expect(storage.getUserName(userId)).toBe('Juan Pérez');
      expect(storage.getUserData(userId).bienvenidaEnviada).toBe(false);
      expect(storage.getUserState(userId)).toBe(null);
      expect(storage.getHistorial(userId)).toHaveLength(1);
      expect(storage.isHumanMode(userId)).toBe(true);
    });
  });
});
