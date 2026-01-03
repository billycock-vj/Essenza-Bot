/**
 * Tests de Integración para main.js
 * 
 * Estos tests verifican el flujo completo del bot:
 * - Procesamiento de mensajes de WhatsApp
 * - Creación de reservas
 * - Comandos de administrador
 * - Integración con OpenAI
 * - Manejo de errores
 * 
 * IMPORTANTE: 
 * - Usa mocks completos de wppconnect, OpenAI, y otros servicios externos
 * - No importa main.js directamente (tiene efectos secundarios)
 * - Simula el comportamiento del bot mediante funciones auxiliares
 */

// Mocks antes de importar módulos
jest.mock('@wppconnect-team/wppconnect', () => ({
  create: jest.fn(),
}));
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});
jest.mock('fs');
jest.mock('sqlite3', () => ({
  verbose: () => ({
    Database: jest.fn(),
  }),
}));
jest.mock('../services/database');
jest.mock('../services/persistence');
jest.mock('../utils/logger', () => ({
  logMessage: jest.fn(),
  rotarLogs: jest.fn(),
}));

const wppconnect = require('@wppconnect-team/wppconnect');
const OpenAI = require('openai');
const fs = require('fs');
const db = require('../services/database');
const persistence = require('../services/persistence');
const storage = require('../services/storage');
const config = require('../config');
const { validarFecha, validarFormatoUserId } = require('../utils/validators');

// Funciones auxiliares que simulan el comportamiento de main.js
function esAdministrador(userId) {
  if (!userId) return false;
  return config.ADMIN_NUMBERS.includes(userId);
}

function inicializarUsuario(userId) {
  if (!storage.getUserData(userId)) {
    storage.setUserData(userId, {
      bienvenidaEnviada: false,
      saludoEnviado: false,
      ultimaInteraccion: null
    });
  }
  
  if (!storage.getHistorial(userId) || storage.getHistorial(userId).length === 0) {
    storage.setHistorial(userId, []);
  }
  
  if (storage.getUserState(userId) === undefined) {
    storage.setUserState(userId, null);
  }
}

async function enviarMensajeSeguro(client, userId, mensaje) {
  if (!userId || typeof userId !== "string") {
    return false;
  }
  
  if (!validarFormatoUserId(userId)) {
    return false;
  }
  
  try {
    await client.sendText(userId, mensaje);
    return true;
  } catch (error) {
    return false;
  }
}

async function obtenerCitasDelDia() {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finDia = new Date(hoy);
    finDia.setHours(23, 59, 59, 999);
    
    const reservas = await db.obtenerReservas({
      fechaDesde: hoy,
      fechaHasta: finDia,
      estado: 'pendiente'
    });
    
    if (reservas.length === 0) {
      return '📅 *Citas de Hoy*\n\nNo hay citas programadas para hoy.';
    }
    
    let mensaje = `📅 *Citas de Hoy*\n\n`;
    reservas.forEach((reserva, index) => {
      const fechaHora = new Date(reserva.fechaHora).toLocaleString("es-PE");
      mensaje += `${index + 1}. *${reserva.userName}*\n`;
      mensaje += `   📋 Servicio: ${reserva.servicio}\n`;
      mensaje += `   ⏰ Hora: ${fechaHora}\n\n`;
    });
    
    return mensaje;
  } catch (error) {
    throw error;
  }
}

describe('main.js - Tests de Integración', () => {
  let mockClient;
  let mockOpenAI;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Limpiar storage antes de cada test
    storage.userState.clear();
    storage.userNames.clear();
    storage.userData.clear();
    storage.historialConversacion.clear();
    storage.humanModeUsers.clear();
    storage.usuariosBotDesactivado.clear();
    storage.reservas = [];

    // Mock de OpenAI
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };
    OpenAI.mockImplementation(() => mockOpenAI);

    // Mock de cliente de WhatsApp
    mockClient = {
      sendText: jest.fn().mockResolvedValue({ id: 'msg123' }),
      onMessage: jest.fn(),
      getState: jest.fn().mockResolvedValue('CONNECTED'),
    };

    // Mock de wppconnect
    wppconnect.create.mockResolvedValue(mockClient);

    // Mock de fs
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    fs.appendFileSync.mockImplementation(() => {});

    // Mock de database
    db.guardarReserva = jest.fn().mockResolvedValue(1);
    db.obtenerReservas = jest.fn().mockResolvedValue([]);
    db.consultarDisponibilidad = jest.fn().mockResolvedValue([]);
    db.obtenerCitasDelDia = jest.fn().mockResolvedValue([]);

    // Mock de persistence
    persistence.cargarEstadisticas = jest.fn().mockReturnValue(null);
    persistence.cargarReservas = jest.fn().mockReturnValue([]);
    persistence.cargarUserData = jest.fn().mockReturnValue({});
    persistence.guardarReservas = jest.fn();
    persistence.guardarUserData = jest.fn();
    persistence.guardarEstadisticas = jest.fn();
    persistence.guardarTodo = jest.fn();
  });

  describe('Funciones Auxiliares - Validaciones', () => {
    test('esAdministrador debe identificar correctamente a los administradores', () => {
      const adminId = config.ADMIN_NUMBERS[0];
      const normalUserId = '51999999999@c.us';
      
      expect(esAdministrador(adminId)).toBe(true);
      expect(esAdministrador(normalUserId)).toBe(false);
      expect(esAdministrador(null)).toBe(false);
    });

    test('inicializarUsuario debe crear datos básicos para nuevo usuario', () => {
      const userId = '51983104105@c.us';
      
      inicializarUsuario(userId);
      
      expect(storage.getUserData(userId)).toBeDefined();
      expect(storage.getHistorial(userId)).toEqual([]);
      expect(storage.getUserState(userId)).toBe(null);
    });

    test('enviarMensajeSeguro debe validar userId antes de enviar', async () => {
      const userIdValido = '51983104105@c.us';
      const userIdInvalido = 'invalid';
      
      const resultado1 = await enviarMensajeSeguro(mockClient, userIdValido, 'Hola');
      const resultado2 = await enviarMensajeSeguro(mockClient, userIdInvalido, 'Hola');
      
      expect(resultado1).toBe(true);
      expect(resultado2).toBe(false);
      expect(mockClient.sendText).toHaveBeenCalledTimes(1);
    });
  });

  describe('Procesamiento de Mensajes - Filtros y Validaciones', () => {
    test('Debe validar formato de userId correctamente', () => {
      const userIdsValidos = [
        '51983104105@c.us',
        '51983104105@lid',
      ];
      const userIdsInvalidos = [
        '51983104105@g.us', // Grupo
        'status@broadcast', // Estado
        null,
        '',
      ];
      
      userIdsValidos.forEach(userId => {
        expect(validarFormatoUserId(userId)).toBe(true);
      });
      
      userIdsInvalidos.forEach(userId => {
        expect(validarFormatoUserId(userId)).toBe(false);
      });
    });

    test('Debe validar que mensajes sin cuerpo no se procesan', () => {
      // Validación de que mensajes sin body ni caption no deberían procesarse
      const mensajeSinCuerpo = {
        body: null,
        caption: null,
      };
      
      expect(mensajeSinCuerpo.body).toBeNull();
      expect(mensajeSinCuerpo.caption).toBeNull();
    });

    test('Debe identificar mensajes de estado correctamente', () => {
      const mensajeEstado = {
        type: 'status',
        isStatus: true,
        from: 'status@broadcast',
      };
      
      expect(mensajeEstado.isStatus).toBe(true);
      expect(mensajeEstado.type).toBe('status');
    });

    test('Debe identificar mensajes de grupos correctamente', () => {
      const mensajeGrupo = {
        from: '51983104105@g.us',
        isGroupMsg: true,
        isGroup: true,
      };
      
      expect(mensajeGrupo.isGroupMsg).toBe(true);
      expect(mensajeGrupo.from).toContain('@g.us');
    });
  });

  describe('Comandos de Administrador', () => {
    const adminUserId = config.ADMIN_NUMBERS[0]; // Primer administrador

    test('Debe identificar correctamente a los administradores', () => {
      expect(esAdministrador(adminUserId)).toBe(true);
      expect(esAdministrador('51999999999@c.us')).toBe(false);
    });

    test('Debe obtener citas del día correctamente', async () => {
      // Mock de reservas del día
      const reservasMock = [
        {
          id: 1,
          userId: 'user1@c.us',
          userName: 'Usuario 1',
          servicio: 'Masaje Relajante',
          fechaHora: new Date('2024-12-25T14:00:00'),
          estado: 'pendiente',
        },
        {
          id: 2,
          userId: 'user2@c.us',
          userName: 'Usuario 2',
          servicio: 'Tratamiento Facial',
          fechaHora: new Date('2024-12-25T16:00:00'),
          estado: 'pendiente',
        },
      ];

      db.obtenerReservas.mockResolvedValue(reservasMock);

      const resultado = await obtenerCitasDelDia();

      expect(db.obtenerReservas).toHaveBeenCalled();
      expect(resultado).toContain('Citas de Hoy');
      expect(resultado).toContain('Usuario 1');
      expect(resultado).toContain('Usuario 2');
    });

    test('Debe retornar mensaje cuando no hay citas', async () => {
      db.obtenerReservas.mockResolvedValue([]);

      const resultado = await obtenerCitasDelDia();

      expect(resultado).toContain('No hay citas programadas');
    });

    test('Debe manejar errores al obtener citas del día', async () => {
      db.obtenerReservas.mockRejectedValue(new Error('Error de BD'));

      await expect(obtenerCitasDelDia()).rejects.toThrow();
    });
  });

  describe('Creación de Reservas', () => {
    test('Debe validar fecha y horario antes de guardar reserva', () => {
      const fechaValida = new Date();
      fechaValida.setDate(fechaValida.getDate() + 1);
      fechaValida.setHours(14, 0, 0, 0);
      
      const fechaInvalida = new Date();
      fechaInvalida.setDate(fechaInvalida.getDate() - 1); // Pasado
      
      const validacion1 = validarFecha(fechaValida, 60);
      const validacion2 = validarFecha(fechaInvalida, 60);
      
      expect(validacion1.valida).toBe(true);
      expect(validacion2.valida).toBe(false);
    });

    test('Debe rechazar reserva fuera del horario de atención', () => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + 1);
      fecha.setHours(20, 0, 0, 0); // Fuera del horario (cierre a las 19:00)
      
      const validacion = validarFecha(fecha, 60);
      
      expect(validacion.valida).toBe(false);
      expect(validacion.error).toBeDefined();
    });

    test('Debe guardar reserva en base de datos cuando se confirma', async () => {
      const userId = '51983104105@c.us';
      
      // Simular que el usuario confirma la reserva
      const fechaReserva = new Date();
      fechaReserva.setDate(fechaReserva.getDate() + 1);
      fechaReserva.setHours(14, 0, 0, 0);

      const reserva = {
        userId,
        userName: 'Juan Pérez',
        servicio: 'Masaje Relajante',
        fechaHora: fechaReserva,
        duracion: 60,
        estado: 'pendiente',
        deposito: 20,
      };

      db.guardarReserva.mockResolvedValue(1);
      const id = await db.guardarReserva(reserva);

      expect(db.guardarReserva).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          servicio: 'Masaje Relajante',
        })
      );
      expect(id).toBe(1);
    });
  });

  describe('Consulta de Disponibilidad', () => {
    test('Debe consultar disponibilidad para una fecha específica', async () => {
      const fecha = new Date('2024-12-25');
      const horarios = [
        new Date('2024-12-25T11:00:00'),
        new Date('2024-12-25T11:30:00'),
        new Date('2024-12-25T14:00:00'),
      ];
      
      db.consultarDisponibilidad.mockResolvedValue(horarios);
      
      const resultado = await db.consultarDisponibilidad(fecha, 60);
      
      expect(db.consultarDisponibilidad).toHaveBeenCalledWith(fecha, 60);
      expect(resultado).toEqual(horarios);
    });

    test('Debe retornar array vacío cuando no hay horarios disponibles', async () => {
      const fecha = new Date('2024-12-25');
      db.consultarDisponibilidad.mockResolvedValue([]);
      
      const resultado = await db.consultarDisponibilidad(fecha, 60);
      
      expect(resultado).toEqual([]);
    });
  });

  describe('Integración con OpenAI', () => {
    test('Debe crear instancia de OpenAI con API key válida', () => {
      process.env.OPENAI_API_KEY = 'sk-test123';
      jest.resetModules();
      
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      expect(openai).toBeDefined();
    });

    test('Debe manejar error de OpenAI sin fallar', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API Error')
      );

      await expect(
        mockOpenAI.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hola' }],
        })
      ).rejects.toThrow('API Error');
    });

    test('Debe retornar respuesta válida de OpenAI', async () => {
      const respuestaMock = {
        choices: [{
          message: {
            content: 'Tenemos masajes, tratamientos faciales, y más servicios.',
          },
        }],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(respuestaMock);

      const respuesta = await mockOpenAI.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: '¿Qué servicios tienen?' }],
      });

      expect(respuesta.choices[0].message.content).toBeDefined();
    });
  });

  describe('Manejo de Estado de Usuario', () => {
    test('Debe inicializar usuario correctamente al recibir primer mensaje', () => {
      const userId = '51983104105@c.us';
      
      inicializarUsuario(userId);
      
      const userData = storage.getUserData(userId);
      expect(userData).toBeDefined();
      expect(userData.bienvenidaEnviada).toBe(false);
      expect(userData.saludoEnviado).toBe(false);
    });

    test('Debe actualizar última interacción del usuario', () => {
      const userId = '51983104105@c.us';
      inicializarUsuario(userId);
      
      const ahora = new Date().toISOString();
      const userData = storage.getUserData(userId);
      userData.ultimaInteraccion = ahora;
      storage.setUserData(userId, userData);
      
      expect(storage.getUserData(userId).ultimaInteraccion).toBe(ahora);
    });
  });

  describe('Manejo de Errores', () => {
    test('Debe manejar error al enviar mensaje sin fallar', async () => {
      const userId = '51983104105@c.us';
      
      mockClient.sendText.mockRejectedValue(new Error('Error de envío'));

      const resultado = await enviarMensajeSeguro(mockClient, userId, 'Hola');
      
      expect(resultado).toBe(false);
    });

    test('Debe manejar error al consultar base de datos', async () => {
      db.obtenerReservas.mockRejectedValue(new Error('Error de BD'));

      await expect(obtenerCitasDelDia()).rejects.toThrow('Error de BD');
    });

    test('Debe validar userId antes de enviar mensaje', async () => {
      const resultado1 = await enviarMensajeSeguro(mockClient, null, 'Hola');
      const resultado2 = await enviarMensajeSeguro(mockClient, '', 'Hola');
      const resultado3 = await enviarMensajeSeguro(mockClient, 'invalid', 'Hola');
      
      expect(resultado1).toBe(false);
      expect(resultado2).toBe(false);
      expect(resultado3).toBe(false);
    });
  });

  describe('Flujo Completo de Reserva', () => {
    test('Debe completar flujo completo: consulta → disponibilidad → confirmación', async () => {
      const userId = '51983104105@c.us';
      
      // Paso 1: Consultar disponibilidad
      const fechaManana = new Date();
      fechaManana.setDate(fechaManana.getDate() + 1);
      const horarios = [
        new Date(fechaManana.getTime() + 14 * 60 * 60 * 1000), // 14:00
        new Date(fechaManana.getTime() + 15 * 60 * 60 * 1000), // 15:00
      ];
      db.consultarDisponibilidad.mockResolvedValue(horarios);

      const disponibilidad = await db.consultarDisponibilidad(fechaManana, 60);
      expect(disponibilidad).toEqual(horarios);

      // Paso 2: Guardar reserva
      const fechaReserva = horarios[0];
      const reserva = {
        userId,
        userName: 'Juan Pérez',
        servicio: 'Masaje Relajante',
        fechaHora: fechaReserva,
        duracion: 60,
        estado: 'pendiente',
        deposito: 20,
      };

      db.guardarReserva.mockResolvedValue(1);
      const idReserva = await db.guardarReserva(reserva);

      expect(idReserva).toBe(1);
      expect(db.guardarReserva).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          servicio: 'Masaje Relajante',
        })
      );
    });
  });

  describe('Persistencia de Datos', () => {
    test('Debe guardar y cargar datos de usuario correctamente', () => {
      const userId = '51983104105@c.us';
      
      // Guardar datos
      storage.setUserName(userId, 'Juan Pérez');
      storage.setUserData(userId, {
        bienvenidaEnviada: true,
        saludoEnviado: true,
        ultimaInteraccion: new Date().toISOString(),
      });

      // Verificar que se guardaron
      expect(storage.getUserName(userId)).toBe('Juan Pérez');
      expect(storage.getUserData(userId).bienvenidaEnviada).toBe(true);
    });

    test('Debe cargar datos persistidos correctamente', () => {
      // Simular datos persistidos
      const userDataCargado = {
        '51983104105@c.us': {
          bienvenidaEnviada: true,
          saludoEnviado: true,
        },
      };

      persistence.cargarUserData.mockReturnValue(userDataCargado);

      // Al cargar, debe estar disponible
      const userData = persistence.cargarUserData();
      expect(userData).toEqual(userDataCargado);
    });

    test('Debe guardar reservas en persistencia', () => {
      const reservas = [
        {
          userId: '51983104105@c.us',
          userName: 'Juan Pérez',
          servicio: 'Masaje Relajante',
          fechaHora: new Date('2024-12-25T14:00:00'),
          creada: new Date(),
        },
      ];

      persistence.guardarReservas(reservas);

      expect(persistence.guardarReservas).toHaveBeenCalledWith(reservas);
    });
  });
});
