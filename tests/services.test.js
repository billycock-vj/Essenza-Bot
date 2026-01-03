/**
 * Tests para el módulo data/services.js
 * 
 * Este módulo contiene la información de servicios del spa:
 * - Servicios disponibles
 * - Precios
 * - Duraciones
 * - Descripciones
 * 
 * Tests simples para verificar que la estructura de datos es correcta
 */

const servicios = require('../data/services');

describe('data/services.js', () => {
  describe('Estructura de datos', () => {
    test('Debe exportar un objeto con servicios', () => {
      expect(typeof servicios).toBe('object');
      expect(servicios).not.toBeNull();
    });

    test('Debe tener al menos un servicio definido', () => {
      const idsServicios = Object.keys(servicios);
      expect(idsServicios.length).toBeGreaterThan(0);
    });
  });

  describe('Validación de estructura de servicios', () => {
    test('Cada servicio debe tener nombre', () => {
      Object.values(servicios).forEach(servicio => {
        expect(servicio).toHaveProperty('nombre');
        expect(typeof servicio.nombre).toBe('string');
        expect(servicio.nombre.length).toBeGreaterThan(0);
      });
    });

    test('Cada servicio debe tener categoría', () => {
      Object.values(servicios).forEach(servicio => {
        expect(servicio).toHaveProperty('categoria');
        expect(typeof servicio.categoria).toBe('string');
      });
    });

    test('Servicios con opciones deben tener array de opciones válido', () => {
      Object.values(servicios).forEach(servicio => {
        if (servicio.opciones) {
          expect(Array.isArray(servicio.opciones)).toBe(true);
          servicio.opciones.forEach(opcion => {
            expect(opcion).toHaveProperty('nombre');
            expect(opcion).toHaveProperty('precio');
            expect(opcion).toHaveProperty('duracion');
          });
        }
      });
    });

    test('Servicios sin opciones deben tener precio y duración directos', () => {
      Object.values(servicios).forEach(servicio => {
        if (!servicio.opciones) {
          expect(servicio).toHaveProperty('precio');
          expect(servicio).toHaveProperty('duracion');
        }
      });
    });
  });

  describe('Validación de contenido', () => {
    test('Debe incluir servicio de Masajes', () => {
      const masajes = Object.values(servicios).find(s => 
        s.nombre.toLowerCase().includes('masaje')
      );
      expect(masajes).toBeDefined();
    });

    test('Debe incluir servicio de Tratamientos Faciales', () => {
      const faciales = Object.values(servicios).find(s => 
        s.nombre.toLowerCase().includes('facial')
      );
      expect(faciales).toBeDefined();
    });

    test('Las opciones de masajes deben tener precios válidos', () => {
      const masajes = Object.values(servicios).find(s => 
        s.nombre.toLowerCase().includes('masaje')
      );
      
      if (masajes && masajes.opciones) {
        masajes.opciones.forEach(opcion => {
          expect(opcion.precio).toMatch(/S\/\d+/);
        });
      }
    });

    test('Las duraciones deben estar en formato válido', () => {
      Object.values(servicios).forEach(servicio => {
        if (servicio.opciones) {
          servicio.opciones.forEach(opcion => {
            expect(opcion.duracion).toMatch(/\d+/);
          });
        } else if (servicio.duracion) {
          expect(servicio.duracion).toMatch(/\d+/);
        }
      });
    });
  });

  describe('Casos límite', () => {
    test('Debe manejar servicios con descripciones opcionales', () => {
      Object.values(servicios).forEach(servicio => {
        // Algunos servicios pueden no tener descripción
        if (servicio.descripcion) {
          expect(typeof servicio.descripcion).toBe('string');
        }
      });
    });

    test('Debe manejar servicios con imágenes opcionales', () => {
      Object.values(servicios).forEach(servicio => {
        // Las imágenes son opcionales y pueden ser null
        if (servicio.imagen !== undefined) {
          expect(servicio.imagen === null || typeof servicio.imagen === 'string').toBe(true);
        }
      });
    });
  });
});
