# 📋 MVP - FUNCIONALIDADES ESSENZA BOT

**Fecha:** 2026-01-05  
**Estado:** ✅ **EN DESARROLLO**

---

## 🎯 RESUMEN EJECUTIVO

Este documento detalla todas las funcionalidades MVP del bot Essenza, separadas por tipo de usuario (Cliente y Administrador), y la estructura de base de datos SQLite.

---

## 🗄️ ESTRUCTURA SQLITE

### Tabla: `reservas`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PRIMARY KEY | ID único de la reserva |
| `userId` | TEXT NOT NULL | ID del usuario de WhatsApp (ej: 51986613254@c.us) |
| `userName` | TEXT NOT NULL | Nombre del usuario |
| `servicio` | TEXT NOT NULL | Nombre del servicio |
| `fechaHora` | TEXT NOT NULL | Fecha y hora en formato ISO |
| `duracion` | INTEGER DEFAULT 60 | Duración en minutos |
| `estado` | TEXT DEFAULT 'pendiente' | Estados: 'pendiente', 'confirmada', 'cancelada' |
| `deposito` | REAL DEFAULT 0 | Monto del depósito |
| `notificado` | INTEGER DEFAULT 0 | Si se envió recordatorio (0/1) |
| `creada` | TEXT NOT NULL | Fecha de creación (ISO) |
| `actualizada` | TEXT NOT NULL | Fecha de última actualización (ISO) |

**Índices:**
- `idx_fechaHora` - Búsquedas rápidas por fecha
- `idx_userId` - Búsquedas por usuario
- `idx_estado` - Filtrado por estado

### Tabla: `configuracion`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `clave` | TEXT PRIMARY KEY | Clave de configuración |
| `valor` | TEXT NOT NULL | Valor de la configuración |
| `descripcion` | TEXT | Descripción opcional |
| `actualizada` | TEXT NOT NULL | Fecha de última actualización (ISO) |

**Valores por defecto:**
- `flag_bot_activo` = '1' (bot activo)
- `flag_ia_activada` = '1' (IA activada)

### Tabla: `logs`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER PRIMARY KEY | ID único del log |
| `nivel` | TEXT NOT NULL | Nivel: 'INFO', 'ERROR', 'WARNING', 'SUCCESS' |
| `mensaje` | TEXT NOT NULL | Mensaje del log |
| `datos` | TEXT | Datos adicionales en JSON (opcional) |
| `userId` | TEXT | ID del usuario relacionado (opcional) |
| `timestamp` | TEXT NOT NULL | Fecha y hora del log (ISO) |

**Índices:**
- `idx_logs_timestamp` - Búsquedas por fecha
- `idx_logs_nivel` - Filtrado por nivel

---

## 👤 FUNCIONALIDADES CLIENTE

### ✅ 1. Realizar Reserva
**Estado:** ✅ **IMPLEMENTADO**

- El usuario puede solicitar una reserva mediante lenguaje natural
- El bot guía al usuario a través del flujo:
  1. Selección de servicio
  2. Selección de fecha
  3. Selección de hora
  4. Confirmación de depósito
- Los datos se guardan en SQLite (`reservas`)

**Comandos:**
- "Quiero reservar"
- "Agendar cita"
- "Reservar turno"

**Implementación:**
- Función: `detectarIntencionReserva()` en `main.js`
- Guardado: `db.guardarReserva()` en `services/database.js`
- Validación: `validarFecha()` en `utils/validators.js`

---

### ⚠️ 2. Cancelar o Reprogramar Turno
**Estado:** ⚠️ **PARCIALMENTE IMPLEMENTADO**

**Cancelar:**
- ❌ Falta implementar comando específico para clientes
- ✅ Existe `actualizarReserva()` en base de datos

**Reprogramar:**
- ❌ Falta implementar flujo de reprogramación
- ✅ Existe validación de conflictos en `verificarConflictoHorario()`

**Pendiente:**
- Agregar comandos: "cancelar cita", "reprogramar cita"
- Crear flujo conversacional para reprogramación

---

### ✅ 3. Consultar Servicios Disponibles
**Estado:** ✅ **IMPLEMENTADO**

- Los servicios están definidos en `data/services.js`
- El bot puede mostrar servicios cuando el usuario pregunta
- La IA puede recomendar servicios según necesidades

**Implementación:**
- Archivo: `data/services.js`
- Función: `validarServicio()` en `utils/validators.js`

---

### ✅ 4. Respuestas con IA (si flag_ia_activada = true)
**Estado:** ✅ **IMPLEMENTADO**

- El bot usa OpenAI GPT-4o-mini para respuestas naturales
- La IA se puede activar/desactivar globalmente
- El flag se guarda en SQLite (`configuracion.flag_ia_activada`)

**Implementación:**
- Función: `consultarIA()` en `main.js`
- Control: Variable `iaGlobalDesactivada` (se sincroniza con DB)

---

### ✅ 5. Información del Local
**Estado:** ✅ **IMPLEMENTADO**

- Dirección: Configurada en `config/index.js` (UBICACION)
- Horarios: Configurados en `config/index.js` (HORARIO_ATENCION)
- Mapa: Link de Google Maps en `config/index.js` (MAPS_LINK)

**La IA puede responder:**
- "¿Dónde están ubicados?"
- "¿Qué horarios tienen?"
- "¿Cómo llegar?"

---

### ✅ 6. Escalar a Humano
**Estado:** ✅ **IMPLEMENTADO**

- El usuario puede solicitar hablar con un asesor humano
- Comando: "asesor", "hablar con alguien", "humano"
- El bot activa modo asesor y notifica a administradores

**Implementación:**
- Función: `storage.setHumanMode(userId, true)`
- Notificaciones a administradores

---

## 🛠️ FUNCIONALIDADES ADMINISTRADOR

### ⚠️ 1. Desactivar Bot Completamente (!desactivar bot)
**Estado:** ⚠️ **PARCIALMENTE IMPLEMENTADO**

**Actual:**
- ✅ Existe comando `desactivar bot [número]` para desactivar bot para un usuario específico
- ❌ Falta comando para desactivar el bot globalmente

**Pendiente:**
- Implementar `!desactivar bot` (sin número) para desactivar bot globalmente
- Guardar en `configuracion.flag_bot_activo = '0'`
- Ignorar todos los mensajes entrantes hasta reactivación

---

### ✅ 2. Activar/Desactivar IA (!desactivar ia / !activar ia)
**Estado:** ✅ **IMPLEMENTADO**

**Comandos:**
- `desactivar ia` - Desactiva IA globalmente
- `activar ia` - Activa IA globalmente
- `estado ia` - Muestra estado actual

**Implementación:**
- Variable: `iaGlobalDesactivada`
- Pendiente: Sincronizar con `configuracion.flag_ia_activada` en SQLite

---

### ⚠️ 3. Ver Reservas Activas (!ver reservas)
**Estado:** ⚠️ **PARCIALMENTE IMPLEMENTADO**

**Actual:**
- ✅ Existe comando `citas_dd/MM/yyyy` para ver citas de una fecha específica
- ❌ Falta comando `!ver reservas` para ver todas las reservas activas

**Pendiente:**
- Implementar comando `ver reservas` o `reservas activas`
- Mostrar todas las reservas con estado 'pendiente' o 'confirmada'

---

### ✅ 4. Ver Estadísticas (!stats)
**Estado:** ✅ **IMPLEMENTADO**

**Comando:**
- `estadisticas` o `stats`

**Muestra:**
- Total de mensajes
- Usuarios atendidos
- Reservas solicitadas
- Asesores activados
- Tiempo de funcionamiento

---

### ⚠️ 5. Resetear Sesión de Usuario (!reset +número)
**Estado:** ❌ **NO IMPLEMENTADO**

**Pendiente:**
- Implementar comando `reset +549XXXXXXXXXX` o `reset 519XXXXXXXXX`
- Limpiar estado del usuario:
  - `storage.setUserState(userId, null)`
  - `storage.setHumanMode(userId, false)`
  - `storage.setBotDesactivado(userId, false)`
  - Limpiar datos de usuario en `storage.userData`

---

## 📌 REQUISITOS ADICIONALES

### ✅ Validación de Comandos Admin
**Estado:** ✅ **IMPLEMENTADO**

- Los comandos de admin solo funcionan desde números autorizados
- Función: `esAdministrador(userId)` en `main.js`
- Configuración: `ADMIN_NUMBERS` en `config/index.js`

---

### ⚠️ Modularización
**Estado:** ⚠️ **PARCIALMENTE MODULARIZADO**

**Actual:**
- ✅ `services/database.js` - Base de datos
- ✅ `services/storage.js` - Almacenamiento en memoria
- ✅ `services/persistence.js` - Persistencia en archivos
- ✅ `utils/validators.js` - Validaciones
- ✅ `utils/logger.js` - Logging
- ✅ `config/index.js` - Configuración

**Pendiente:**
- ❌ `handlers/admin.js` - Handlers de comandos admin
- ❌ `handlers/cliente.js` - Handlers de comandos cliente
- ❌ `handlers/reserva.js` - Lógica de reservas
- ❌ `responses/fixed.js` - Respuestas fijas
- ❌ `responses/ai.js` - Respuestas con IA

---

### ✅ Separación de Respuestas
**Estado:** ✅ **IMPLEMENTADO**

- Respuestas fijas: Para comandos específicos y errores
- Respuestas IA: Para conversación natural
- Control: Variable `iaGlobalDesactivada` determina si usar IA

---

### ⚠️ Lógica Conversacional Escalable
**Estado:** ⚠️ **PARCIALMENTE IMPLEMENTADO**

**Actual:**
- ✅ Estados de usuario: `storage.getUserState()`
- ✅ Flujo de reserva: Estado "reserva"
- ✅ Modo asesor: `storage.setHumanMode()`

**Pendiente:**
- ❌ Máquina de estados más robusta
- ❌ Handlers modulares por tipo de interacción
- ❌ Middleware para procesamiento de mensajes

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Completar Funcionalidades Faltantes
1. ✅ Expandir estructura SQLite (configuracion, logs)
2. ⏳ Implementar `!desactivar bot` global
3. ⏳ Implementar `!ver reservas`
4. ⏳ Implementar `!reset +número`
5. ⏳ Implementar cancelar/reprogramar turnos

### Fase 2: Modularización
1. ⏳ Crear `handlers/admin.js`
2. ⏳ Crear `handlers/cliente.js`
3. ⏳ Crear `handlers/reserva.js`
4. ⏳ Refactorizar `main.js` para usar handlers

### Fase 3: Mejoras
1. ⏳ Sincronizar flags con SQLite
2. ⏳ Implementar limpieza automática de logs
3. ⏳ Mejorar máquina de estados
4. ⏳ Agregar tests unitarios

---

## 📝 NOTAS

- El bot usa `@wppconnect-team/wppconnect` para WhatsApp
- OpenAI API (GPT-4o-mini) para respuestas inteligentes
- SQLite para persistencia local
- Sistema de logging con rotación automática
- Validación de conflictos de horarios automática

---

**Última actualización:** 2026-01-05
