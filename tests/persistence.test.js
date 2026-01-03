/**
 * Tests para el módulo services/persistence.js
 * 
 * Este módulo maneja la persistencia de datos en archivos JSON:
 * - Guardado y carga de reservas
 * - Guardado y carga de datos de usuarios
 * - Guardado y carga de estadísticas
 * 
 * IMPORTANTE: Usa mocks de fs para no escribir archivos reales durante los tests
 */

const fs = require('fs');
const path = require('path');
const {
  guardarReservas,
  cargarReservas,
  guardarUserData,
  cargarUserData,
  guardarEstadisticas,
  cargarEstadisticas,
  guardarTodo,
} = require('../services/persistence');

// Mock del módulo fs
jest.mock('fs');

describe('services/persistence.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configurar mocks por defecto
    fs.existsSync.mockReturnValue(true);
    fs.writeFileSync.mockImplementation(() => {});
    fs.readFileSync.mockImplementation(() => '[]');
    fs.mkdirSync.mockImplementation(() => {});
  });

  describe('guardarReservas', () => {
    describe('Casos normales', () => {
      test('Debe guardar array de reservas en formato JSON', () => {
        const reservas = [
          {
            userId: '51983104105@c.us',
            userName: 'Juan Pérez',
            servicio: 'Masaje Relajante',
            fechaHora: new Date('2024-12-25T14:00:00'),
            creada: new Date('2024-12-20T10:00:00'),
          },
        ];

        guardarReservas(reservas);

        expect(fs.writeFileSync).toHaveBeenCalled();
        const callArgs = fs.writeFileSync.mock.calls[0];
        expect(callArgs[0]).toContain('reservas.json');
        expect(callArgs[1]).toContain('Juan Pérez');
        expect(callArgs[1]).toContain('Masaje Relajante');
      });

      test('Debe convertir fechas a ISO string antes de guardar', () => {
        const fechaHora = new Date('2024-12-25T14:00:00');
        const creada = new Date('2024-12-20T10:00:00');
        const reservas = [
          {
            userId: 'user1@c.us',
            fechaHora,
            creada,
          },
        ];

        guardarReservas(reservas);

        const callArgs = fs.writeFileSync.mock.calls[0];
        const dataGuardada = JSON.parse(callArgs[1]);
        
        expect(typeof dataGuardada[0].fechaHora).toBe('string');
        expect(typeof dataGuardada[0].creada).toBe('string');
        expect(dataGuardada[0].fechaHora).toBe(fechaHora.toISOString());
      });

      test('Debe guardar array vacío sin errores', () => {
        guardarReservas([]);

        expect(fs.writeFileSync).toHaveBeenCalled();
        const callArgs = fs.writeFileSync.mock.calls[0];
        const dataGuardada = JSON.parse(callArgs[1]);
        expect(dataGuardada).toEqual([]);
      });

      test('Debe guardar múltiples reservas correctamente', () => {
        const reservas = [
          { userId: 'user1@c.us', fechaHora: new Date(), creada: new Date() },
          { userId: 'user2@c.us', fechaHora: new Date(), creada: new Date() },
          { userId: 'user3@c.us', fechaHora: new Date(), creada: new Date() },
        ];

        guardarReservas(reservas);

        const callArgs = fs.writeFileSync.mock.calls[0];
        const dataGuardada = JSON.parse(callArgs[1]);
        expect(dataGuardada).toHaveLength(3);
      });
    });

    describe('Casos de error', () => {
      test('Debe manejar errores de escritura sin lanzar excepción', () => {
        fs.writeFileSync.mockImplementation(() => {
          throw new Error('Error de escritura');
        });

        const reservas = [{ userId: 'user1@c.us', fechaHora: new Date(), creada: new Date() }];

        // No debe lanzar excepción, solo loguear error
        expect(() => guardarReservas(reservas)).not.toThrow();
      });
    });
  });

  describe('cargarReservas', () => {
    describe('Casos normales', () => {
      test('Debe cargar reservas desde archivo JSON', () => {
        const reservasJSON = JSON.stringify([
          {
            userId: '51983104105@c.us',
            userName: 'Juan Pérez',
            fechaHora: '2024-12-25T14:00:00.000Z',
            creada: '2024-12-20T10:00:00.000Z',
          },
        ]);

        fs.readFileSync.mockReturnValue(reservasJSON);

        const reservas = cargarReservas();

        expect(reservas).toHaveLength(1);
        expect(reservas[0].userId).toBe('51983104105@c.us');
        expect(reservas[0].fechaHora).toBeInstanceOf(Date);
        expect(reservas[0].creada).toBeInstanceOf(Date);
      });

      test('Debe convertir strings de fecha a objetos Date', () => {
        const fechaISO = '2024-12-25T14:00:00.000Z';
        const reservasJSON = JSON.stringify([
          { userId: 'user1@c.us', fechaHora: fechaISO, creada: fechaISO },
        ]);

        fs.readFileSync.mockReturnValue(reservasJSON);

        const reservas = cargarReservas();

        expect(reservas[0].fechaHora).toBeInstanceOf(Date);
        expect(reservas[0].fechaHora.toISOString()).toBe(fechaISO);
      });

      test('Debe retornar array vacío si el archivo no existe', () => {
        fs.existsSync.mockReturnValue(false);

        const reservas = cargarReservas();

        expect(reservas).toEqual([]);
        expect(fs.readFileSync).not.toHaveBeenCalled();
      });
    });

    describe('Casos de error', () => {
      test('Debe retornar array vacío si hay error al leer archivo', () => {
        fs.readFileSync.mockImplementation(() => {
          throw new Error('Error de lectura');
        });

        const reservas = cargarReservas();

        expect(reservas).toEqual([]);
      });

      test('Debe retornar array vacío si el JSON es inválido', () => {
        fs.readFileSync.mockReturnValue('JSON inválido {');

        const reservas = cargarReservas();

        expect(reservas).toEqual([]);
      });
    });
  });

  describe('guardarUserData', () => {
    describe('Casos normales', () => {
      test('Debe guardar datos de usuarios en formato JSON', () => {
        const userData = {
          '51983104105@c.us': {
            bienvenidaEnviada: true,
            saludoEnviado: false,
          },
          '51972002363@c.us': {
            bienvenidaEnviada: false,
            saludoEnviado: true,
          },
        };

        guardarUserData(userData);

        expect(fs.writeFileSync).toHaveBeenCalled();
        const callArgs = fs.writeFileSync.mock.calls[0];
        expect(callArgs[0]).toContain('user-data.json');
        const dataGuardada = JSON.parse(callArgs[1]);
        expect(dataGuardada['51983104105@c.us'].bienvenidaEnviada).toBe(true);
      });

      test('Debe guardar objeto vacío sin errores', () => {
        guardarUserData({});

        expect(fs.writeFileSync).toHaveBeenCalled();
        const callArgs = fs.writeFileSync.mock.calls[0];
        const dataGuardada = JSON.parse(callArgs[1]);
        expect(dataGuardada).toEqual({});
      });
    });

    describe('Casos de error', () => {
      test('Debe manejar errores de escritura sin lanzar excepción', () => {
        fs.writeFileSync.mockImplementation(() => {
          throw new Error('Error de escritura');
        });

        expect(() => guardarUserData({ 'user1@c.us': {} })).not.toThrow();
      });
    });
  });

  describe('cargarUserData', () => {
    describe('Casos normales', () => {
      test('Debe cargar datos de usuarios desde archivo JSON', () => {
        const userDataJSON = JSON.stringify({
          '51983104105@c.us': {
            bienvenidaEnviada: true,
            saludoEnviado: false,
          },
        });

        fs.readFileSync.mockReturnValue(userDataJSON);

        const userData = cargarUserData();

        expect(userData['51983104105@c.us'].bienvenidaEnviada).toBe(true);
        expect(userData['51983104105@c.us'].saludoEnviado).toBe(false);
      });

      test('Debe retornar objeto vacío si el archivo no existe', () => {
        fs.existsSync.mockReturnValue(false);

        const userData = cargarUserData();

        expect(userData).toEqual({});
        expect(fs.readFileSync).not.toHaveBeenCalled();
      });
    });

    describe('Casos de error', () => {
      test('Debe retornar objeto vacío si hay error al leer archivo', () => {
        fs.readFileSync.mockImplementation(() => {
          throw new Error('Error de lectura');
        });

        const userData = cargarUserData();

        expect(userData).toEqual({});
      });

      test('Debe retornar objeto vacío si el JSON es inválido', () => {
        fs.readFileSync.mockReturnValue('JSON inválido {');

        const userData = cargarUserData();

        expect(userData).toEqual({});
      });
    });
  });

  describe('guardarEstadisticas', () => {
    describe('Casos normales', () => {
      test('Debe guardar estadísticas en formato JSON', () => {
        const estadisticas = {
          usuariosAtendidos: new Set(['user1@c.us', 'user2@c.us']),
          totalMensajes: 100,
          reservasSolicitadas: 50,
          asesoresActivados: 10,
          inicio: new Date('2024-01-01T00:00:00'),
        };

        guardarEstadisticas(estadisticas);

        expect(fs.writeFileSync).toHaveBeenCalled();
        const callArgs = fs.writeFileSync.mock.calls[0];
        expect(callArgs[0]).toContain('estadisticas.json');
        const dataGuardada = JSON.parse(callArgs[1]);
        expect(Array.isArray(dataGuardada.usuariosAtendidos)).toBe(true);
        expect(dataGuardada.totalMensajes).toBe(100);
      });

      test('Debe convertir Set a array antes de guardar', () => {
        const estadisticas = {
          usuariosAtendidos: new Set(['user1@c.us']),
          totalMensajes: 0,
          reservasSolicitadas: 0,
          asesoresActivados: 0,
          inicio: new Date(),
        };

        guardarEstadisticas(estadisticas);

        const callArgs = fs.writeFileSync.mock.calls[0];
        const dataGuardada = JSON.parse(callArgs[1]);
        expect(Array.isArray(dataGuardada.usuariosAtendidos)).toBe(true);
        expect(dataGuardada.usuariosAtendidos).toContain('user1@c.us');
      });

      test('Debe convertir fecha de inicio a ISO string', () => {
        const fechaInicio = new Date('2024-01-01T00:00:00');
        const estadisticas = {
          usuariosAtendidos: new Set(),
          totalMensajes: 0,
          reservasSolicitadas: 0,
          asesoresActivados: 0,
          inicio: fechaInicio,
        };

        guardarEstadisticas(estadisticas);

        const callArgs = fs.writeFileSync.mock.calls[0];
        const dataGuardada = JSON.parse(callArgs[1]);
        expect(typeof dataGuardada.inicio).toBe('string');
        expect(dataGuardada.inicio).toBe(fechaInicio.toISOString());
      });
    });

    describe('Casos de error', () => {
      test('Debe manejar errores de escritura sin lanzar excepción', () => {
        fs.writeFileSync.mockImplementation(() => {
          throw new Error('Error de escritura');
        });

        const estadisticas = {
          usuariosAtendidos: new Set(),
          totalMensajes: 0,
          reservasSolicitadas: 0,
          asesoresActivados: 0,
          inicio: new Date(),
        };

        expect(() => guardarEstadisticas(estadisticas)).not.toThrow();
      });
    });
  });

  describe('cargarEstadisticas', () => {
    describe('Casos normales', () => {
      test('Debe cargar estadísticas desde archivo JSON', () => {
        const estadisticasJSON = JSON.stringify({
          usuariosAtendidos: ['user1@c.us', 'user2@c.us'],
          totalMensajes: 100,
          reservasSolicitadas: 50,
          asesoresActivados: 10,
          inicio: '2024-01-01T00:00:00.000Z',
        });

        fs.readFileSync.mockReturnValue(estadisticasJSON);

        const estadisticas = cargarEstadisticas();

        expect(estadisticas.usuariosAtendidos).toBeInstanceOf(Set);
        expect(estadisticas.usuariosAtendidos.has('user1@c.us')).toBe(true);
        expect(estadisticas.totalMensajes).toBe(100);
        expect(estadisticas.inicio).toBeInstanceOf(Date);
      });

      test('Debe convertir array a Set correctamente', () => {
        const estadisticasJSON = JSON.stringify({
          usuariosAtendidos: ['user1@c.us'],
          totalMensajes: 0,
          reservasSolicitadas: 0,
          asesoresActivados: 0,
          inicio: new Date().toISOString(),
        });

        fs.readFileSync.mockReturnValue(estadisticasJSON);

        const estadisticas = cargarEstadisticas();

        expect(estadisticas.usuariosAtendidos).toBeInstanceOf(Set);
        expect(estadisticas.usuariosAtendidos.has('user1@c.us')).toBe(true);
      });

      test('Debe convertir string de fecha a Date', () => {
        const fechaISO = '2024-01-01T00:00:00.000Z';
        const estadisticasJSON = JSON.stringify({
          usuariosAtendidos: [],
          totalMensajes: 0,
          reservasSolicitadas: 0,
          asesoresActivados: 0,
          inicio: fechaISO,
        });

        fs.readFileSync.mockReturnValue(estadisticasJSON);

        const estadisticas = cargarEstadisticas();

        expect(estadisticas.inicio).toBeInstanceOf(Date);
        expect(estadisticas.inicio.toISOString()).toBe(fechaISO);
      });

      test('Debe retornar null si el archivo no existe', () => {
        fs.existsSync.mockReturnValue(false);

        const estadisticas = cargarEstadisticas();

        expect(estadisticas).toBeNull();
        expect(fs.readFileSync).not.toHaveBeenCalled();
      });
    });

    describe('Casos de error', () => {
      test('Debe retornar null si hay error al leer archivo', () => {
        fs.readFileSync.mockImplementation(() => {
          throw new Error('Error de lectura');
        });

        const estadisticas = cargarEstadisticas();

        expect(estadisticas).toBeNull();
      });

      test('Debe retornar null si el JSON es inválido', () => {
        fs.readFileSync.mockReturnValue('JSON inválido {');

        const estadisticas = cargarEstadisticas();

        expect(estadisticas).toBeNull();
      });

      test('Debe manejar datos faltantes sin fallar', () => {
        const estadisticasJSON = JSON.stringify({
          totalMensajes: 100,
          // usuariosAtendidos faltante
        });

        fs.readFileSync.mockReturnValue(estadisticasJSON);

        const estadisticas = cargarEstadisticas();

        expect(estadisticas.usuariosAtendidos).toBeInstanceOf(Set);
        expect(estadisticas.usuariosAtendidos.size).toBe(0);
      });
    });
  });

  describe('guardarTodo', () => {
    describe('Casos normales', () => {
      test('Debe guardar reservas, userData y estadísticas', () => {
        const reservas = [{ userId: 'user1@c.us', fechaHora: new Date(), creada: new Date() }];
        const userData = { 'user1@c.us': { saludoEnviado: true } };
        const estadisticas = {
          usuariosAtendidos: new Set(),
          totalMensajes: 0,
          reservasSolicitadas: 0,
          asesoresActivados: 0,
          inicio: new Date(),
        };

        guardarTodo(reservas, userData, estadisticas);

        // Debe llamar a las tres funciones de guardado
        expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
      });

      test('Debe manejar datos vacíos sin errores', () => {
        guardarTodo([], {}, {
          usuariosAtendidos: new Set(),
          totalMensajes: 0,
          reservasSolicitadas: 0,
          asesoresActivados: 0,
          inicio: new Date(),
        });

        expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
      });
    });
  });
});
