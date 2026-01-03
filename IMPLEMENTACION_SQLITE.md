# 💾 IMPLEMENTACIÓN DE SQLITE PARA RESERVAS

**Fecha:** 2024-12-19  
**Estado:** ✅ **COMPLETADO**

---

## 📋 RESUMEN

Se ha implementado SQLite para la persistencia de reservas y consulta de disponibilidad diaria. El bot ahora puede:

1. ✅ Guardar reservas en base de datos SQLite
2. ✅ Consultar disponibilidad para cualquier fecha
3. ✅ Verificar conflictos de horarios automáticamente
4. ✅ Mantener historial completo de reservas

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### Tabla: `reservas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PRIMARY KEY | ID único de la reserva |
| `userId` | TEXT | ID del usuario de WhatsApp |
| `userName` | TEXT | Nombre del usuario |
| `servicio` | TEXT | Nombre del servicio |
| `fechaHora` | TEXT (ISO) | Fecha y hora de la reserva |
| `duracion` | INTEGER | Duración en minutos (default: 60) |
| `estado` | TEXT | Estado: 'pendiente', 'confirmada', 'cancelada' |
| `deposito` | REAL | Monto del depósito |
| `notificado` | INTEGER (0/1) | Si se envió recordatorio |
| `creada` | TEXT (ISO) | Fecha de creación |
| `actualizada` | TEXT (ISO) | Fecha de última actualización |

### Índices

- `idx_fechaHora` - Para búsquedas rápidas por fecha
- `idx_userId` - Para búsquedas por usuario
- `idx_estado` - Para filtrar por estado

---

## 📁 ARCHIVOS CREADOS/MODIFICADOS

### Nuevos Archivos

1. **`services/database.js`**
   - Módulo completo de base de datos SQLite
   - Funciones CRUD para reservas
   - Consulta de disponibilidad
   - Estadísticas

### Archivos Modificados

1. **`main.js`**
   - Integración de SQLite
   - Función `guardarReserva()` actualizada para usar SQLite
   - Función `verificarRecordatorios()` actualizada para usar SQLite
   - Nueva función `consultarDisponibilidad()`
   - Nueva función `formatearHorariosDisponibles()`
   - Comando de consulta de disponibilidad agregado

2. **`.gitignore`**
   - Agregado `*.db`, `*.sqlite`, `*.sqlite3` para ignorar archivos de base de datos

---

## 🔧 FUNCIONES IMPLEMENTADAS

### `services/database.js`

#### `inicializarDB()`
Inicializa la base de datos y crea las tablas si no existen.

#### `guardarReserva(reserva)`
Guarda una nueva reserva en la base de datos.
- **Parámetros:** Objeto con `userId`, `userName`, `servicio`, `fechaHora`, `duracion`, `deposito`, `estado`, `notificado`
- **Retorna:** ID de la reserva creada

#### `obtenerReservas(filtros)`
Obtiene reservas con filtros opcionales.
- **Filtros disponibles:** `estado`, `userId`, `fechaDesde`, `fechaHasta`
- **Retorna:** Array de reservas

#### `consultarDisponibilidad(fecha, duracionMinima)`
Consulta horarios disponibles para una fecha específica.
- **Parámetros:**
  - `fecha`: Date - Fecha a consultar
  - `duracionMinima`: number - Duración mínima en minutos (default: 60)
- **Retorna:** Array de horarios disponibles (Date objects)
- **Lógica:**
  - Horario de atención: 11:00 - 19:00
  - Intervalo de 30 minutos
  - Verifica conflictos con reservas existentes
  - Excluye horarios que se solapan

#### `actualizarReserva(id, datos)`
Actualiza una reserva existente.
- **Parámetros:**
  - `id`: number - ID de la reserva
  - `datos`: object - Campos a actualizar (`estado`, `notificado`, `fechaHora`)

#### `eliminarReserva(id)`
Elimina una reserva de la base de datos.

#### `obtenerEstadisticas(fechaDesde, fechaHasta)`
Obtiene estadísticas de reservas en un rango de fechas.

### `main.js`

#### `consultarDisponibilidad(fecha, duracionMinima)`
Wrapper que llama a la función de base de datos con manejo de errores.

#### `formatearHorariosDisponibles(horarios)`
Formatea los horarios disponibles para mostrar al usuario.
- **Retorna:** String formateado con lista de horarios

---

## 💬 COMANDO DE CONSULTA DE DISPONIBILIDAD

El bot ahora reconoce las siguientes frases para consultar disponibilidad:

- "disponibilidad"
- "horarios disponibles"
- "horarios libres"
- "que horas hay"
- "que horarios hay"
- "disponible"
- "libre"
- "consultar disponibilidad"
- "ver disponibilidad"

### Ejemplos de uso:

1. **Consulta simple:**
   - Usuario: "¿Qué horarios hay disponibles?"
   - Bot: Muestra horarios disponibles para hoy

2. **Consulta con fecha:**
   - Usuario: "Disponibilidad para mañana"
   - Bot: Muestra horarios disponibles para mañana

3. **Consulta con fecha específica:**
   - Usuario: "Horarios disponibles el 25/12"
   - Bot: Muestra horarios disponibles para el 25 de diciembre

---

## 🔄 MIGRACIÓN DE DATOS

Las reservas ahora se guardan en SQLite en lugar de archivos JSON. El sistema:

1. ✅ Guarda nuevas reservas directamente en SQLite
2. ✅ Consulta reservas desde SQLite para recordatorios
3. ✅ Mantiene sincronización con storage en memoria para compatibilidad

---

## 📊 VENTAJAS DE SQLite

1. **Consultas SQL:** Permite búsquedas complejas y eficientes
2. **Integridad de datos:** Validación automática de tipos y constraints
3. **Escalabilidad:** Maneja grandes volúmenes de datos eficientemente
4. **Índices:** Búsquedas rápidas por fecha, usuario, estado
5. **Sin servidor:** No requiere configuración adicional
6. **Persistencia:** Datos seguros en archivo local

---

## 🚀 USO

### Para el usuario:

```
Usuario: "¿Qué horarios hay disponibles?"
Bot: 📅 Disponibilidad para [fecha]
     ✅ Horarios disponibles:
     1. 11:00
     2. 11:30
     3. 12:00
     ...
```

### Para el desarrollador:

```javascript
// Consultar disponibilidad
const horarios = await db.consultarDisponibilidad(new Date('2024-12-25'), 60);

// Guardar reserva
const reservaId = await db.guardarReserva({
  userId: '51983104105@c.us',
  userName: 'Juan Pérez',
  servicio: 'Masaje Relajante',
  fechaHora: new Date('2024-12-25T14:00:00'),
  duracion: 60,
  deposito: 20
});

// Obtener reservas
const reservas = await db.obtenerReservas({
  estado: 'pendiente',
  fechaDesde: new Date()
});
```

---

## 📝 NOTAS IMPORTANTES

1. **Ubicación de la base de datos:** `data-storage/reservas.db`
2. **Backup:** Se recomienda hacer backup periódico del archivo `.db`
3. **Horario de atención:** Configurado en `consultarDisponibilidad()` (11:00 - 19:00)
4. **Intervalo de horarios:** 30 minutos (configurable en `database.js`)

---

## ✅ ESTADO DE IMPLEMENTACIÓN

- ✅ Base de datos SQLite implementada
- ✅ Esquema de tablas creado
- ✅ Funciones CRUD completas
- ✅ Consulta de disponibilidad funcionando
- ✅ Integración en main.js
- ✅ Comando de consulta agregado
- ✅ Manejo de errores implementado
- ✅ Logging de operaciones

**El sistema está completamente funcional y listo para usar.**

