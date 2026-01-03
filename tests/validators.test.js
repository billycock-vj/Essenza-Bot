const {
  obtenerHorarioDelDia,
  validarFecha,
  validarFormatoUserId,
  validarServicio,
  sanitizarMensaje,
  sanitizarDatosParaLog,
} = require('../utils/validators');

describe('obtenerHorarioDelDia', () => {
  describe('Casos normales - Días de la semana', () => {
    test('Debe retornar horario correcto para Lunes (11:00 - 19:00)', () => {
      // Crear fecha de un lunes (2024-12-23 es lunes)
      const lunes = new Date('2024-12-23T12:00:00');
      const resultado = obtenerHorarioDelDia(lunes);

      expect(resultado).toEqual({
        abierto: true,
        apertura: 11,
        cierre: 19,
      });
    });

    test('Debe retornar horario correcto para Martes (11:00 - 19:00)', () => {
      const martes = new Date('2024-12-24T12:00:00');
      const resultado = obtenerHorarioDelDia(martes);

      expect(resultado).toEqual({
        abierto: true,
        apertura: 11,
        cierre: 19,
      });
    });

    test('Debe retornar horario correcto para Miércoles (11:00 - 19:00)', () => {
      const miercoles = new Date('2024-12-25T12:00:00');
      const resultado = obtenerHorarioDelDia(miercoles);

      expect(resultado).toEqual({
        abierto: true,
        apertura: 11,
        cierre: 19,
      });
    });

    test('Debe retornar horario correcto para Jueves (11:00 - 19:00)', () => {
      const jueves = new Date('2024-12-26T12:00:00');
      const resultado = obtenerHorarioDelDia(jueves);

      expect(resultado).toEqual({
        abierto: true,
        apertura: 11,
        cierre: 19,
      });
    });

    test('Debe retornar horario correcto para Viernes (11:00 - 19:00)', () => {
      const viernes = new Date('2024-12-27T12:00:00');
      const resultado = obtenerHorarioDelDia(viernes);

      expect(resultado).toEqual({
        abierto: true,
        apertura: 11,
        cierre: 19,
      });
    });

    test('Debe retornar horario correcto para Sábado (10:00 - 16:00)', () => {
      const sabado = new Date('2024-12-28T12:00:00');
      const resultado = obtenerHorarioDelDia(sabado);

      expect(resultado).toEqual({
        abierto: true,
        apertura: 10,
        cierre: 16,
      });
    });

    test('Debe retornar cerrado para Domingo', () => {
      const domingo = new Date('2024-12-22T12:00:00');
      const resultado = obtenerHorarioDelDia(domingo);

      expect(resultado).toEqual({
        abierto: false,
        mensaje: 'Domingo: Cerrado',
      });
    });
  });

  describe('Casos límite - Horas del día', () => {
    test('Debe retornar el mismo horario independientemente de la hora del día', () => {
      const lunesManana = new Date('2024-12-23T08:00:00');
      const lunesMedioDia = new Date('2024-12-23T14:00:00');
      const lunesNoche = new Date('2024-12-23T22:00:00');

      const resultado1 = obtenerHorarioDelDia(lunesManana);
      const resultado2 = obtenerHorarioDelDia(lunesMedioDia);
      const resultado3 = obtenerHorarioDelDia(lunesNoche);

      expect(resultado1).toEqual(resultado2);
      expect(resultado2).toEqual(resultado3);
      expect(resultado1.abierto).toBe(true);
      expect(resultado1.apertura).toBe(11);
      expect(resultado1.cierre).toBe(19);
    });

    test('Debe retornar el mismo horario para Sábado en diferentes horas', () => {
      const sabadoManana = new Date('2024-12-28T08:00:00');
      const sabadoTarde = new Date('2024-12-28T14:00:00');

      const resultado1 = obtenerHorarioDelDia(sabadoManana);
      const resultado2 = obtenerHorarioDelDia(sabadoTarde);

      expect(resultado1).toEqual(resultado2);
      expect(resultado1.apertura).toBe(10);
      expect(resultado1.cierre).toBe(16);
    });
  });

  describe('Casos límite - Diferentes años y meses', () => {
    test('Debe funcionar correctamente con fechas de diferentes años', () => {
      const lunes2023 = new Date('2023-01-02T12:00:00'); // Lunes
      const lunes2024 = new Date('2024-01-01T12:00:00'); // Lunes
      const lunes2025 = new Date('2025-01-06T12:00:00'); // Lunes

      const resultado1 = obtenerHorarioDelDia(lunes2023);
      const resultado2 = obtenerHorarioDelDia(lunes2024);
      const resultado3 = obtenerHorarioDelDia(lunes2025);

      expect(resultado1).toEqual(resultado2);
      expect(resultado2).toEqual(resultado3);
    });

    test('Debe funcionar correctamente con fechas de diferentes meses', () => {
      const lunesEnero = new Date('2024-01-01T12:00:00');
      const lunesJunio = new Date('2024-06-03T12:00:00');
      const lunesDiciembre = new Date('2024-12-23T12:00:00');

      const resultado1 = obtenerHorarioDelDia(lunesEnero);
      const resultado2 = obtenerHorarioDelDia(lunesJunio);
      const resultado3 = obtenerHorarioDelDia(lunesDiciembre);

      expect(resultado1).toEqual(resultado2);
      expect(resultado2).toEqual(resultado3);
    });
  });
});

describe('validarFecha', () => {
  describe('Casos normales - Fechas válidas dentro del horario', () => {
    test('Debe validar correctamente una cita de 60 minutos en horario laboral (Lunes)', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(14, 0, 0, 0); // 2:00 PM

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 60);

      expect(resultado.valida).toBe(true);
      expect(resultado.fecha).toBeInstanceOf(Date);
      expect(resultado.error).toBeUndefined();
    });

    test('Debe validar correctamente una cita de 90 minutos en horario laboral', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(13, 0, 0, 0); // 1:00 PM

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 90);

      expect(resultado.valida).toBe(true);
      expect(resultado.fecha).toBeInstanceOf(Date);
    });

    test('Debe validar correctamente una cita al inicio del horario (11:00)', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(11, 0, 0, 0);

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 60);

      expect(resultado.valida).toBe(true);
    });

    test('Debe validar correctamente una cita justo antes del cierre (Sábado 15:00 con 60 min)', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(15, 0, 0, 0);

      // Asegurar que sea sábado
      while (fechaFutura.getDay() !== 6) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 60);

      expect(resultado.valida).toBe(true);
    });
  });

  describe('Casos de error - Fechas inválidas', () => {
    test('Debe rechazar fecha no proporcionada (null)', () => {
      const resultado = validarFecha(null);

      expect(resultado.valida).toBe(false);
      expect(resultado.error).toBe('Fecha no proporcionada');
      expect(resultado.fecha).toBeUndefined();
    });

    test('Debe rechazar fecha no proporcionada (undefined)', () => {
      const resultado = validarFecha(undefined);

      expect(resultado.valida).toBe(false);
      expect(resultado.error).toBe('Fecha no proporcionada');
    });

    test('Debe rechazar fecha no proporcionada (string vacío)', () => {
      const resultado = validarFecha('');

      expect(resultado.valida).toBe(false);
      // Un string vacío se considera "no proporcionado" porque !'' es true
      expect(resultado.error).toBe('Fecha no proporcionada');
    });

    test('Debe rechazar fecha inválida (string sin formato)', () => {
      const resultado = validarFecha('fecha inválida');

      expect(resultado.valida).toBe(false);
      expect(resultado.error).toBe('Fecha inválida');
    });

    test('Debe rechazar fecha en el pasado', () => {
      const fechaPasada = new Date('2020-01-01T12:00:00');
      const resultado = validarFecha(fechaPasada);

      expect(resultado.valida).toBe(false);
      expect(resultado.error).toBe('La fecha debe ser en el futuro');
    });

    test('Debe rechazar fecha actual (no futura)', () => {
      const fechaActual = new Date();
      const resultado = validarFecha(fechaActual);

      expect(resultado.valida).toBe(false);
      expect(resultado.error).toBe('La fecha debe ser en el futuro');
    });

    test('Debe rechazar fecha más de 1 año en el futuro', () => {
      const fechaLejana = new Date();
      fechaLejana.setFullYear(fechaLejana.getFullYear() + 2);
      const resultado = validarFecha(fechaLejana);

      expect(resultado.valida).toBe(false);
      expect(resultado.error).toBe('La fecha no puede ser más de 1 año en el futuro');
    });
  });

  describe('Casos de error - Días cerrados', () => {
    test('Debe rechazar cita en Domingo (cerrado)', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(14, 0, 0, 0);

      // Asegurar que sea domingo
      while (fechaFutura.getDay() !== 0) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura);

      expect(resultado.valida).toBe(false);
      expect(resultado.error).toContain('cerrados');
      expect(resultado.error).toContain('Domingo');
    });
  });

  describe('Casos de error - Horarios fuera del rango', () => {
    test('Debe rechazar cita antes del horario de apertura (Lunes 10:00)', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(10, 0, 0, 0);

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 60);

      expect(resultado.valida).toBe(false);
      expect(resultado.error).toContain('11:00');
      expect(resultado.error).toContain('después de las');
    });

    test('Debe rechazar cita que se extiende más allá del horario de cierre (Lunes 18:30 con 60 min)', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(18, 30, 0, 0);

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 60);

      expect(resultado.valida).toBe(false);
      expect(resultado.error).toContain('19:00');
      expect(resultado.error).toContain('última cita disponible');
    });

    test('Debe rechazar cita que termina exactamente después del cierre (Lunes 18:01 con 60 min)', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(18, 1, 0, 0);

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 60);

      expect(resultado.valida).toBe(false);
      expect(resultado.error).toContain('19:00');
    });

    test('Debe rechazar cita en Sábado que se extiende más allá de las 16:00', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(15, 30, 0, 0);

      // Asegurar que sea sábado
      while (fechaFutura.getDay() !== 6) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 60);

      expect(resultado.valida).toBe(false);
      expect(resultado.error).toContain('16:00');
    });
  });

  describe('Casos límite - Horarios exactos', () => {
    test('Debe aceptar cita que termina exactamente a la hora de cierre (Lunes 18:00 con 60 min)', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(18, 0, 0, 0);

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 60);

      expect(resultado.valida).toBe(true);
    });

    test('Debe aceptar cita que termina exactamente a la hora de cierre (Sábado 15:00 con 60 min)', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(15, 0, 0, 0);

      // Asegurar que sea sábado
      while (fechaFutura.getDay() !== 6) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 60);

      expect(resultado.valida).toBe(true);
    });

    test('Debe rechazar cita que termina 1 minuto después del cierre (Lunes 18:01 con 60 min)', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(18, 1, 0, 0);

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 60);

      expect(resultado.valida).toBe(false);
    });
  });

  describe('Casos límite - Diferentes duraciones', () => {
    test('Debe aceptar cita corta (30 minutos) en horario válido', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(18, 30, 0, 0);

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 30);

      expect(resultado.valida).toBe(true);
    });

    test('Debe aceptar cita larga (120 minutos) si cabe en el horario', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(13, 0, 0, 0);

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 120);

      expect(resultado.valida).toBe(true);
    });

    test('Debe rechazar cita muy larga (180 minutos) si no cabe', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(17, 0, 0, 0);

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 180);

      expect(resultado.valida).toBe(false);
    });
  });

  describe('Casos límite - Formato de entrada', () => {
    test('Debe aceptar fecha como string ISO', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(14, 0, 0, 0);

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura.toISOString(), 60);

      expect(resultado.valida).toBe(true);
    });

    test('Debe aceptar fecha como objeto Date', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(14, 0, 0, 0);

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado = validarFecha(fechaFutura, 60);

      expect(resultado.valida).toBe(true);
    });
  });

  describe('Casos límite - Duración por defecto', () => {
    test('Debe usar 60 minutos como duración por defecto', () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 1);
      fechaFutura.setHours(14, 0, 0, 0);

      // Asegurar que sea lunes
      while (fechaFutura.getDay() !== 1) {
        fechaFutura.setDate(fechaFutura.getDate() + 1);
      }

      const resultado1 = validarFecha(fechaFutura);
      const resultado2 = validarFecha(fechaFutura, 60);

      expect(resultado1.valida).toBe(resultado2.valida);
    });
  });
});

describe('validarFormatoUserId', () => {
  describe('Casos normales', () => {
    test('Debe aceptar userId válido con formato @c.us', () => {
      expect(validarFormatoUserId('51983104105@c.us')).toBe(true);
    });

    test('Debe aceptar userId válido con formato @lid', () => {
      expect(validarFormatoUserId('51983104105@lid')).toBe(true);
    });

    test('Debe aceptar userId con números largos', () => {
      expect(validarFormatoUserId('12345678901234567890@c.us')).toBe(true);
    });
  });

  describe('Casos de error', () => {
    test('Debe rechazar userId null', () => {
      expect(validarFormatoUserId(null)).toBe(false);
    });

    test('Debe rechazar userId undefined', () => {
      expect(validarFormatoUserId(undefined)).toBe(false);
    });

    test('Debe rechazar userId vacío', () => {
      expect(validarFormatoUserId('')).toBe(false);
    });

    test('Debe rechazar userId sin @', () => {
      expect(validarFormatoUserId('51983104105')).toBe(false);
    });

    test('Debe rechazar userId con formato incorrecto', () => {
      expect(validarFormatoUserId('51983104105@invalid')).toBe(false);
    });

    test('Debe rechazar userId que no es string', () => {
      expect(validarFormatoUserId(123)).toBe(false);
      expect(validarFormatoUserId({})).toBe(false);
      expect(validarFormatoUserId([])).toBe(false);
    });
  });
});

describe('sanitizarMensaje', () => {
  describe('Casos normales', () => {
    test('Debe retornar mensaje normal sin cambios', () => {
      const mensaje = 'Hola, quiero una cita';
      expect(sanitizarMensaje(mensaje)).toBe(mensaje);
    });

    test('Debe eliminar caracteres de control', () => {
      const mensaje = 'Hola\x00\x01\x02mundo';
      expect(sanitizarMensaje(mensaje)).toBe('Holamundo');
    });

    test('Debe preservar saltos de línea', () => {
      const mensaje = 'Línea 1\nLínea 2\rLínea 3';
      expect(sanitizarMensaje(mensaje)).toBe('Línea 1\nLínea 2\rLínea 3');
    });

    test('Debe limitar líneas a 50', () => {
      const lineas = Array(60).fill('Línea').map((l, i) => `${l} ${i}`);
      const mensaje = lineas.join('\n');
      const resultado = sanitizarMensaje(mensaje);
      const lineasResultado = resultado.split('\n');

      expect(lineasResultado.length).toBe(50);
    });

    test('Debe limitar longitud a maxLength', () => {
      const mensaje = 'a'.repeat(3000);
      const resultado = sanitizarMensaje(mensaje, 100);

      expect(resultado.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Casos de error', () => {
    test('Debe retornar string vacío si no es string', () => {
      expect(sanitizarMensaje(null)).toBe('');
      expect(sanitizarMensaje(undefined)).toBe('');
      expect(sanitizarMensaje(123)).toBe('');
      expect(sanitizarMensaje({})).toBe('');
    });
  });
});

describe('sanitizarDatosParaLog', () => {
  describe('Casos normales', () => {
    test('Debe ocultar últimos 4 dígitos de userId', () => {
      const datos = { userId: '51983104105@c.us' };
      const resultado = sanitizarDatosParaLog(datos);

      expect(resultado.userId).toContain('****');
      expect(resultado.userId).not.toContain('4105');
    });

    test('Debe ocultar API keys', () => {
      const datos = { apiKey: 'sk-1234567890', OPENAI_API_KEY: 'sk-abcdefghij' };
      const resultado = sanitizarDatosParaLog(datos);

      expect(resultado.apiKey).toBe('***HIDDEN***');
      expect(resultado.OPENAI_API_KEY).toBe('***HIDDEN***');
    });

    test('Debe preservar otros campos', () => {
      const datos = { nombre: 'Juan', edad: 30 };
      const resultado = sanitizarDatosParaLog(datos);

      expect(resultado.nombre).toBe('Juan');
      expect(resultado.edad).toBe(30);
    });
  });

  describe('Casos de error', () => {
    test('Debe retornar el mismo valor si no es objeto', () => {
      expect(sanitizarDatosParaLog(null)).toBe(null);
      expect(sanitizarDatosParaLog(undefined)).toBe(undefined);
      expect(sanitizarDatosParaLog('string')).toBe('string');
      expect(sanitizarDatosParaLog(123)).toBe(123);
    });
  });
});
