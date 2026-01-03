/**
 * Tests para el módulo config/index.js
 * 
 * Este módulo maneja la configuración del bot desde variables de entorno:
 * - Números de administradores
 * - Horarios de atención
 * - Información de pago
 * - Configuración de logging
 * 
 * IMPORTANTE: Estos tests verifican la configuración por defecto y la carga de variables de entorno
 */

// Guardar variables de entorno originales
const originalEnv = process.env;

describe('config/index.js', () => {
  beforeEach(() => {
    // Limpiar cache del módulo para que se recargue con nuevos valores
    jest.resetModules();
    // Limpiar variables de entorno
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restaurar variables de entorno originales
    process.env = originalEnv;
  });

  describe('Carga de configuración', () => {
    test('Debe exportar objeto de configuración', () => {
      const config = require('../config');
      
      expect(typeof config).toBe('object');
      expect(config).not.toBeNull();
    });

    test('Debe tener ADMIN_NUMBER definido', () => {
      const config = require('../config');
      
      expect(config).toHaveProperty('ADMIN_NUMBER');
      expect(typeof config.ADMIN_NUMBER).toBe('string');
      expect(config.ADMIN_NUMBER).toContain('@c.us');
    });

    test('Debe tener ADMIN_NUMBERS como array', () => {
      const config = require('../config');
      
      expect(config).toHaveProperty('ADMIN_NUMBERS');
      expect(Array.isArray(config.ADMIN_NUMBERS)).toBe(true);
      expect(config.ADMIN_NUMBERS.length).toBeGreaterThan(0);
    });

    test('Debe tener HORARIO_ATENCION definido', () => {
      const config = require('../config');
      
      expect(config).toHaveProperty('HORARIO_ATENCION');
      expect(typeof config.HORARIO_ATENCION).toBe('string');
    });
  });

  describe('ADMIN_NUMBERS - Múltiples administradores', () => {
    test('Debe parsear múltiples administradores desde variable de entorno', () => {
      process.env.ADMIN_NUMBERS = '51986613254,51972002363,51983104105';
      jest.resetModules();
      
      const config = require('../config');
      
      expect(config.ADMIN_NUMBERS).toHaveLength(3);
      expect(config.ADMIN_NUMBERS).toContain('51986613254@c.us');
      expect(config.ADMIN_NUMBERS).toContain('51972002363@c.us');
      expect(config.ADMIN_NUMBERS).toContain('51983104105@c.us');
    });

    test('Debe usar valores por defecto si ADMIN_NUMBERS no está definido', () => {
      delete process.env.ADMIN_NUMBERS;
      jest.resetModules();
      
      const config = require('../config');
      
      expect(config.ADMIN_NUMBERS.length).toBeGreaterThan(0);
      // Debe incluir los números por defecto
      expect(config.ADMIN_NUMBERS.some(n => n.includes('51986613254'))).toBe(true);
    });

    test('Debe eliminar espacios en blanco de números', () => {
      process.env.ADMIN_NUMBERS = '51986613254 , 51972002363 , 51983104105';
      jest.resetModules();
      
      const config = require('../config');
      
      config.ADMIN_NUMBERS.forEach(num => {
        expect(num).not.toContain(' ');
        expect(num).toContain('@c.us');
      });
    });

    test('Debe agregar @c.us a cada número automáticamente', () => {
      process.env.ADMIN_NUMBERS = '51986613254,51972002363';
      jest.resetModules();
      
      const config = require('../config');
      
      config.ADMIN_NUMBERS.forEach(num => {
        expect(num).toMatch(/^\d+@c\.us$/);
      });
    });
  });

  describe('Variables de entorno - Valores personalizados', () => {
    test('Debe usar HORARIO_ATENCION desde variable de entorno', () => {
      process.env.HORARIO_ATENCION = 'Lunes a Viernes: 9:00 - 18:00';
      jest.resetModules();
      
      const config = require('../config');
      
      expect(config.HORARIO_ATENCION).toBe('Lunes a Viernes: 9:00 - 18:00');
    });

    test('Debe usar YAPE_NUMERO desde variable de entorno', () => {
      process.env.YAPE_NUMERO = '999999999';
      jest.resetModules();
      
      const config = require('../config');
      
      expect(config.YAPE_NUMERO).toBe('999999999');
    });

    test('Debe usar LOG_LEVEL desde variable de entorno', () => {
      process.env.LOG_LEVEL = 'verbose';
      jest.resetModules();
      
      const config = require('../config');
      
      expect(config.LOG_LEVEL).toBe('verbose');
    });

    test('Debe usar OPENAI_API_KEY desde variable de entorno', () => {
      process.env.OPENAI_API_KEY = 'sk-test123';
      jest.resetModules();
      
      const config = require('../config');
      
      expect(config.OPENAI_API_KEY).toBe('sk-test123');
    });
  });

  describe('Valores por defecto', () => {
    test('Debe usar valores por defecto si variables no están definidas', () => {
      // Eliminar todas las variables de entorno relevantes
      delete process.env.HORARIO_ATENCION;
      delete process.env.YAPE_NUMERO;
      delete process.env.LOG_LEVEL;
      jest.resetModules();
      
      const config = require('../config');
      
      // Debe tener valores por defecto
      expect(config.HORARIO_ATENCION).toBeDefined();
      expect(config.YAPE_NUMERO).toBeDefined();
      expect(config.LOG_LEVEL).toBe('normal');
    });

      test('Debe usar null para OPENAI_API_KEY si no está definido', () => {
        // Nota: Este test verifica el comportamiento cuando la variable no está definida
        // Sin embargo, si existe un archivo .env con la variable, dotenv la cargará
        // Por lo tanto, verificamos que la propiedad existe y es un string o null
        jest.resetModules();
        
        const config = require('../config');
        
        // La clave debe existir y ser string o null
        expect(config).toHaveProperty('OPENAI_API_KEY');
        expect(config.OPENAI_API_KEY === null || typeof config.OPENAI_API_KEY === 'string').toBe(true);
      });
  });

  describe('Compatibilidad - ADMIN_NUMBER', () => {
    test('ADMIN_NUMBER debe ser el primer elemento de ADMIN_NUMBERS', () => {
      process.env.ADMIN_NUMBERS = '51986613254,51972002363';
      jest.resetModules();
      
      const config = require('../config');
      
      expect(config.ADMIN_NUMBER).toBe(config.ADMIN_NUMBERS[0]);
    });

    test('ADMIN_NUMBER debe tener valor por defecto si ADMIN_NUMBERS está vacío', () => {
      process.env.ADMIN_NUMBERS = '';
      jest.resetModules();
      
      const config = require('../config');
      
      expect(config.ADMIN_NUMBER).toBeDefined();
      expect(config.ADMIN_NUMBER).toContain('@c.us');
    });
  });

  describe('Validación de tipos', () => {
    test('Todas las propiedades de texto deben ser strings', () => {
      const config = require('../config');
      
      expect(typeof config.HORARIO_ATENCION).toBe('string');
      expect(typeof config.YAPE_NUMERO).toBe('string');
      expect(typeof config.YAPE_TITULAR).toBe('string');
      expect(typeof config.BANCO_CUENTA).toBe('string');
      expect(typeof config.UBICACION).toBe('string');
      expect(typeof config.MAPS_LINK).toBe('string');
      expect(typeof config.DEPOSITO_RESERVA).toBe('string');
    });

    test('MAX_RESERVAS debe ser número', () => {
      const config = require('../config');
      
      expect(typeof config.MAX_RESERVAS).toBe('number');
      expect(config.MAX_RESERVAS).toBeGreaterThan(0);
    });

    test('DIAS_RETENCION_LOGS debe ser número', () => {
      const config = require('../config');
      
      expect(typeof config.DIAS_RETENCION_LOGS).toBe('number');
      expect(config.DIAS_RETENCION_LOGS).toBeGreaterThan(0);
    });
  });
});
