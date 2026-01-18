/**
 * Tests para el módulo utils/logger.js
 * 
 * Este módulo maneja el sistema de logging del bot, incluyendo:
 * - Logging de mensajes con diferentes niveles
 * - Rotación de logs antiguos
 * - Sanitización de datos sensibles
 */

const fs = require('fs');
const path = require('path');
const { logMessage, rotarLogs } = require('../utils/logger');

// Mock del módulo fs para evitar escribir archivos reales durante los tests
jest.mock('fs');
jest.mock('../config', () => ({
  LOG_LEVEL: 'normal',
  DIAS_RETENCION_LOGS: 30,
}));

describe('utils/logger.js', () => {
  // Limpiar mocks antes de cada test
  beforeEach(() => {
    jest.clearAllMocks();
    // Configurar mocks por defecto
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    fs.appendFileSync.mockImplementation(() => {});
    fs.readdirSync.mockReturnValue([]);
    fs.statSync.mockReturnValue({ mtime: new Date() });
    fs.unlinkSync.mockImplementation(() => {});
  });

  describe('logMessage', () => {
    describe('Casos normales - Diferentes tipos de log', () => {
      test('Debe escribir log de tipo INFO en archivo', () => {
        logMessage('INFO', 'Mensaje de prueba');

        // Verificar que se creó el directorio si no existe
        expect(fs.existsSync).toHaveBeenCalled();
        
        // Verificar que se escribió en el archivo
        expect(fs.appendFileSync).toHaveBeenCalled();
        
        // Verificar que el mensaje contiene el tipo de log (formato JSON)
        const callArgs = fs.appendFileSync.mock.calls[0];
        const logEntry = JSON.parse(callArgs[1]);
        expect(logEntry.level).toBe('INFO');
        expect(logEntry.message).toBe('Mensaje de prueba');
      });

      test('Debe escribir log de tipo SUCCESS en archivo', () => {
        logMessage('SUCCESS', 'Operación exitosa');

        expect(fs.appendFileSync).toHaveBeenCalled();
        const callArgs = fs.appendFileSync.mock.calls[0];
        const logEntry = JSON.parse(callArgs[1]);
        expect(logEntry.level).toBe('SUCCESS');
        expect(logEntry.message).toBe('Operación exitosa');
      });

      test('Debe escribir log de tipo WARNING en archivo', () => {
        logMessage('WARNING', 'Advertencia importante');

        expect(fs.appendFileSync).toHaveBeenCalled();
        const callArgs = fs.appendFileSync.mock.calls[0];
        const logEntry = JSON.parse(callArgs[1]);
        expect(logEntry.level).toBe('WARNING');
        expect(logEntry.message).toBe('Advertencia importante');
      });

      test('Debe escribir log de tipo ERROR en archivo', () => {
        logMessage('ERROR', 'Error crítico');

        expect(fs.appendFileSync).toHaveBeenCalled();
        const callArgs = fs.appendFileSync.mock.calls[0];
        const logEntry = JSON.parse(callArgs[1]);
        expect(logEntry.level).toBe('ERROR');
        expect(logEntry.message).toBe('Error crítico');
      });
    });

    describe('Casos normales - Logs con datos adicionales', () => {
      test('Debe incluir datos adicionales en el log', () => {
        const datos = { userId: '123456789@c.us', accion: 'reserva' };
        logMessage('INFO', 'Usuario realizó acción', datos);

        expect(fs.appendFileSync).toHaveBeenCalled();
        const callArgs = fs.appendFileSync.mock.calls[0];
        expect(callArgs[1]).toContain('Usuario realizó acción');
        // Los datos deben estar sanitizados
        expect(callArgs[1]).toContain('****');
      });

      test('Debe sanitizar datos sensibles antes de loguear', () => {
        const datos = { 
          userId: '51983104105@c.us',
          apiKey: 'sk-1234567890'
        };
        logMessage('INFO', 'Test con datos sensibles', datos);

        const callArgs = fs.appendFileSync.mock.calls[0];
        const logContent = callArgs[1];
        
        // Verificar que los datos sensibles están ocultos
        expect(logContent).not.toContain('51983104105');
        expect(logContent).not.toContain('sk-1234567890');
        expect(logContent).toContain('****');
        expect(logContent).toContain('***HIDDEN***');
      });

      test('Debe funcionar sin datos adicionales', () => {
        logMessage('INFO', 'Mensaje simple');

        expect(fs.appendFileSync).toHaveBeenCalled();
        const callArgs = fs.appendFileSync.mock.calls[0];
        const logEntry = JSON.parse(callArgs[1]);
        expect(logEntry.level).toBe('INFO');
        expect(logEntry.message).toBe('Mensaje simple');
        // No debe contener "data" si no hay datos adicionales
        expect(logEntry.data).toBeUndefined();
      });
    });

    describe('Casos normales - Creación de directorio', () => {
      test('Debe crear directorio de logs si no existe', () => {
        fs.existsSync.mockReturnValue(false);

        logMessage('INFO', 'Test');

        expect(fs.mkdirSync).toHaveBeenCalled();
        expect(fs.mkdirSync.mock.calls[0][1]).toEqual({ recursive: true });
      });

      test('No debe crear directorio si ya existe', () => {
        fs.existsSync.mockReturnValue(true);

        logMessage('INFO', 'Test');

        expect(fs.mkdirSync).not.toHaveBeenCalled();
      });
    });

    describe('Casos límite - Mensajes largos', () => {
      test('Debe escribir mensajes largos en archivo (completo)', () => {
        const mensajeLargo = 'a'.repeat(100);
        
        logMessage('INFO', mensajeLargo);
        
        // El archivo debe tener el mensaje completo
        expect(fs.appendFileSync).toHaveBeenCalled();
        const callArgs = fs.appendFileSync.mock.calls[0];
        expect(callArgs[1]).toContain(mensajeLargo);
      });
    });
  });

  describe('rotarLogs', () => {
    describe('Casos normales - Rotación de logs antiguos', () => {
      test('Debe eliminar logs más antiguos que el período de retención', () => {
        const fechaAntigua = new Date();
        fechaAntigua.setDate(fechaAntigua.getDate() - 35); // 35 días atrás

        fs.readdirSync.mockReturnValue([
          'bot-2024-11-01.log', // Antiguo
          'bot-2024-12-01.log', // Antiguo
          'bot-2024-12-20.log', // Reciente
        ]);

        fs.statSync.mockImplementation((filePath) => {
          if (filePath.includes('2024-11-01') || filePath.includes('2024-12-01')) {
            return { mtime: fechaAntigua };
          }
          return { mtime: new Date() };
        });

        rotarLogs();

        // Debe intentar eliminar los archivos antiguos
        expect(fs.unlinkSync).toHaveBeenCalled();
      });

      test('Debe mantener logs recientes dentro del período de retención', () => {
        const fechaReciente = new Date();
        fechaReciente.setDate(fechaReciente.getDate() - 10); // 10 días atrás

        fs.readdirSync.mockReturnValue([
          'bot-2024-12-20.log', // Reciente
        ]);

        fs.statSync.mockReturnValue({ mtime: fechaReciente });

        rotarLogs();

        // No debe eliminar archivos recientes
        expect(fs.unlinkSync).not.toHaveBeenCalled();
      });

      test('Debe ignorar archivos que no son logs del bot', () => {
        fs.readdirSync.mockReturnValue([
          'otro-archivo.log',
          'bot-2024-11-01.log',
        ]);

        fs.statSync.mockReturnValue({ mtime: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) });

        rotarLogs();

        // Solo debe eliminar archivos que empiezan con "bot-"
        const unlinkCalls = fs.unlinkSync.mock.calls;
        unlinkCalls.forEach(call => {
          expect(call[0]).toContain('bot-');
        });
      });
    });

    describe('Casos de error - Manejo de errores', () => {
      test('Debe manejar errores al leer directorio sin fallar', () => {
        fs.readdirSync.mockImplementation(() => {
          throw new Error('Error de lectura');
        });

        // No debe lanzar excepción
        expect(() => rotarLogs()).not.toThrow();
      });

      test('Debe manejar errores al eliminar archivos individuales', () => {
        fs.readdirSync.mockReturnValue(['bot-2024-11-01.log']);
        fs.statSync.mockReturnValue({ 
          mtime: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000) 
        });
        fs.unlinkSync.mockImplementation(() => {
          throw new Error('Error al eliminar');
        });

        // No debe lanzar excepción
        expect(() => rotarLogs()).not.toThrow();
      });

      test('Debe retornar sin hacer nada si el directorio no existe', () => {
        fs.existsSync.mockReturnValue(false);

        rotarLogs();

        // No debe intentar leer el directorio
        expect(fs.readdirSync).not.toHaveBeenCalled();
      });
    });

    describe('Casos límite - Directorio vacío', () => {
      test('Debe manejar directorio sin archivos', () => {
        fs.readdirSync.mockReturnValue([]);

        rotarLogs();

        expect(fs.unlinkSync).not.toHaveBeenCalled();
      });
    });
  });
});
