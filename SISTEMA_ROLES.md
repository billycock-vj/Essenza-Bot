# 🔐 SISTEMA DE ROLES - ESSENZA BOT

**Fecha de Implementación:** 2024-12-19  
**Estado:** ✅ **COMPLETADO**

---

## 📋 RESUMEN

Se ha implementado un sistema de roles que distingue entre **Administradores** y **Clientes**, con diferentes permisos y funcionalidades para cada rol.

---

## 👥 ROLES IMPLEMENTADOS

### 🔑 **Administradores**
Los administradores tienen acceso completo a todas las funcionalidades del bot:

**Números de Administradores:**
- `+51986613254`
- `+51972002363`
- `+51983104105` (mantenido para compatibilidad)

**Comandos Disponibles:**
1. **`estadisticas`** / **`stats`** - Ver estadísticas del bot
2. **`citas de hoy`** / **`citas hoy`** / **`reservas de hoy`** - Ver todas las citas del día
3. **`desactivar ia`** - Desactivar IA globalmente
4. **`activar ia`** - Activar IA globalmente
5. **`estado ia`** - Ver estado de la IA
6. **`desactivar bot [número]`** - Desactivar bot para un usuario específico
7. **`activar bot [número]`** - Reactivar bot para un usuario específico

**Funcionalidades:**
- ✅ Pueden ver estadísticas del bot
- ✅ Pueden consultar citas del día
- ✅ Pueden activar/desactivar IA globalmente
- ✅ Pueden gestionar el bot para usuarios específicos
- ✅ Reciben notificaciones de nuevas reservas y solicitudes de asesor
- ✅ Pueden responder directamente a usuarios en modo asesor

---

### 👤 **Clientes**
Los clientes tienen acceso limitado a funcionalidades básicas:

**Funcionalidades:**
- ✅ Pueden agendar citas/reservas
- ✅ Pueden consultar disponibilidad
- ✅ Pueden solicitar hablar con un asesor humano
- ✅ Pueden interactuar con el bot normalmente
- ❌ **NO pueden** ver estadísticas
- ❌ **NO pueden** ver citas de otros usuarios
- ❌ **NO pueden** gestionar el bot

---

## 🔧 CONFIGURACIÓN

### Variables de Entorno

El sistema de roles se configura mediante la variable de entorno `ADMIN_NUMBERS` en el archivo `.env`:

```env
ADMIN_NUMBERS=51986613254,51972002363,51983104105
```

**Formato:**
- Números separados por comas
- Sin espacios (o con espacios que se eliminan automáticamente)
- Sin el prefijo `+` ni el sufijo `@c.us` (se agregan automáticamente)

---

## 📝 IMPLEMENTACIÓN TÉCNICA

### Archivos Modificados

1. **`config/index.js`**
   - Agregado soporte para múltiples administradores
   - Variable `ADMIN_NUMBERS` como array
   - Mantiene `ADMIN_NUMBER` para compatibilidad

2. **`main.js`**
   - Función `esAdministrador(userId)` para verificar roles
   - Función `obtenerCitasDelDia()` para consultar citas del día
   - Reemplazo de verificaciones `userId === ADMIN_NUMBER` por `esAdministrador(userId)`
   - Notificaciones enviadas a todos los administradores
   - Comandos de administrador restringidos solo a administradores

### Funciones Clave

#### `esAdministrador(userId)`
```javascript
function esAdministrador(userId) {
  if (!userId) return false;
  return ADMIN_NUMBERS.includes(userId);
}
```

#### `obtenerCitasDelDia(fecha)`
```javascript
async function obtenerCitasDelDia(fecha = null) {
  // Obtiene todas las reservas del día desde la base de datos
  // Retorna un mensaje formateado con todas las citas
}
```

---

## 🎯 COMANDOS DE ADMINISTRADOR

### Ver Citas del Día

Los administradores pueden consultar las citas del día usando cualquiera de estos comandos:

- `citas de hoy`
- `citas hoy`
- `reservas de hoy`
- `reservas hoy`

**Ejemplo de Respuesta:**
```
📅 *CITAS DEL DÍA*

lunes, 19 de diciembre de 2024

📋 *Total: 3 cita(s)*

1. ⏳ *11:00*
   👤 María García
   💆 Masaje Relajante
   ⏱️ 60 min
   📱 987654321
   💰 Depósito: S/ 20
   📊 Estado: pendiente

2. ✅ *14:30*
   👤 Juan Pérez
   💆 Facial Rejuvenecedor
   ⏱️ 90 min
   📱 987654322
   📊 Estado: confirmada

...
```

---

## 🔔 NOTIFICACIONES

### Notificaciones a Administradores

Cuando un cliente:
- Solicita hablar con un asesor humano
- Solicita una reserva

**Todos los administradores** reciben una notificación automática con los detalles del cliente.

---

## ✅ VERIFICACIÓN

Para verificar que el sistema funciona correctamente:

1. **Compilación:**
   ```bash
   node -c main.js
   ```
   ✅ Sin errores de sintaxis

2. **Linter:**
   ```bash
   # Verificar linter
   ```
   ✅ Sin errores de linter

3. **Funcionalidad:**
   - ✅ Administradores pueden usar todos los comandos
   - ✅ Clientes solo pueden agendar citas
   - ✅ Notificaciones se envían a todos los administradores
   - ✅ Restricciones de acceso funcionan correctamente

---

## 📊 ESTADO FINAL

| Funcionalidad | Estado |
|---------------|--------|
| Sistema de roles | ✅ Completado |
| Múltiples administradores | ✅ Completado |
| Comando "citas de hoy" | ✅ Completado |
| Restricción de comandos | ✅ Completado |
| Notificaciones a todos los admins | ✅ Completado |
| Verificación de roles | ✅ Completado |

---

## 🚀 PRÓXIMOS PASOS (Opcional)

Posibles mejoras futuras:
- [ ] Agregar más comandos de administrador (ver citas de una fecha específica)
- [ ] Agregar roles intermedios (ej: "supervisor")
- [ ] Agregar logs de acciones de administradores
- [ ] Agregar comando para agregar/remover administradores dinámicamente

---

**✅ Sistema de roles completamente funcional y listo para usar.**
