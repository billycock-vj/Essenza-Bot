# 📦 Modularización Completa - Handlers Separados

## ✅ Archivos Creados

### Handlers
- ✅ `handlers/admin.js` - Todos los comandos de administrador
- ✅ `handlers/client.js` - Lógica de clientes (reservas, cancelar, reprogramar, asesor)
- ✅ `handlers/reservation.js` - Lógica específica de reservas
- ✅ `handlers/image.js` - Procesamiento de imágenes con OpenAI Vision
- ✅ `handlers/ai.js` - Integración con OpenAI

### Utilidades
- ✅ `handlers/messageHelpers.js` - Funciones auxiliares para mensajes
- ✅ `utils/responses.js` - Respuestas predefinidas (saludos, etc.)

## 🔄 Cómo Integrar en main.js

### 1. Importar los handlers al inicio de main.js

```javascript
// Agregar después de los imports existentes
const adminHandler = require('./handlers/admin');
const clientHandler = require('./handlers/client');
const reservationHandler = require('./handlers/reservation');
const imageHandler = require('./handlers/image');
const aiHandler = require('./handlers/ai');
const { enviarMensajeSeguro, extraerNumero, inicializarUsuario, extractName } = require('./handlers/messageHelpers');
const { getSaludoPorHora, getRespuestaVariada, detectSaludo } = require('./utils/responses');
```

### 2. Reemplazar funciones en main.js

#### Reemplazar `esAdministrador`:
```javascript
// ANTES:
function esAdministrador(userId) { ... }

// DESPUÉS:
const esAdministrador = adminHandler.esAdministrador;
```

#### Reemplazar `consultarIA`:
```javascript
// ANTES:
async function consultarIA(mensajeUsuario, contextoUsuario = {}) { ... }

// DESPUÉS:
const consultarIA = aiHandler.consultarIA;
```

#### Reemplazar `detectarIntencionReserva`:
```javascript
// ANTES:
function detectarIntencionReserva(texto) { ... }

// DESPUÉS:
const detectarIntencionReserva = reservationHandler.detectarIntencionReserva;
```

#### Reemplazar `consultarDisponibilidad` y `formatearHorariosDisponibles`:
```javascript
// ANTES:
async function consultarDisponibilidad(fecha, duracionMinima = 60) { ... }
function formatearHorariosDisponibles(horarios) { ... }

// DESPUÉS:
const consultarDisponibilidad = reservationHandler.consultarDisponibilidad;
const formatearHorariosDisponibles = reservationHandler.formatearHorariosDisponibles;
```

#### Reemplazar funciones de respuestas:
```javascript
// ANTES:
function getSaludoPorHora() { ... }
function getRespuestaVariada(tipo) { ... }
function detectSaludo(text) { ... }

// DESPUÉS:
// Ya importadas desde utils/responses.js
```

#### Reemplazar funciones auxiliares:
```javascript
// ANTES:
function extraerNumero(userId) { ... }
async function enviarMensajeSeguro(client, userId, mensaje) { ... }
function inicializarUsuario(userId) { ... }
function extractName(text) { ... }

// DESPUÉS:
// Ya importadas desde handlers/messageHelpers.js
```

#### Reemplazar funciones de administrador:
```javascript
// ANTES:
function obtenerEstadisticas() { ... }
async function obtenerCitasDelDia(fecha = null) { ... }
async function procesarImagenCita(client, message, userId) { ... }

// DESPUÉS:
const obtenerEstadisticas = adminHandler.obtenerEstadisticas;
const obtenerCitasDelDia = adminHandler.obtenerCitasDelDia;
const procesarImagenCita = imageHandler.procesarImagenCita;
```

### 3. Refactorizar el handler `onMessage` en main.js

#### En la sección de comandos de administrador:
```javascript
// ANTES: Todo el código de comandos admin inline

// DESPUÉS:
if (esAdmin) {
  // Crear objeto para pasar referencia a iaGlobalDesactivada
  const iaGlobalDesactivadaRef = { value: iaGlobalDesactivada };
  
  const comandoProcesado = await adminHandler.procesarComandosAdmin(
    client,
    message,
    userId,
    text,
    textLower,
    estadisticas,
    iaGlobalDesactivadaRef
  );
  
  // Actualizar el valor global
  iaGlobalDesactivada = iaGlobalDesactivadaRef.value;
  
  if (comandoProcesado) {
    return; // Salir si se procesó un comando
  }
}
```

#### En la sección de cancelar/reprogramar:
```javascript
// ANTES: Todo el código inline

// DESPUÉS:
if (!esAdmin) {
  // Procesar cancelar/reprogramar
  const procesado = await clientHandler.procesarCancelarReprogramar(
    client,
    userId,
    textLower
  );
  if (procesado) return;
  
  // Procesar selección de cancelar
  const seleccionProcesada = await clientHandler.procesarSeleccionCancelar(
    client,
    userId,
    textLower
  );
  if (seleccionProcesada) return;
}
```

#### En la sección de solicitud de asesor:
```javascript
// ANTES: Todo el código inline

// DESPUÉS:
const asesorProcesado = await clientHandler.procesarSolicitudAsesor(
  client,
  userId,
  textLower,
  text,
  userName,
  estadisticas
);
if (asesorProcesado) return;
```

#### En la sección de detección de reserva:
```javascript
// ANTES:
if (detectarIntencionReserva(textLower) && ...) {
  // Todo el código inline
}

// DESPUÉS:
if (
  !esAdministrador(userId) &&
  reservationHandler.detectarIntencionReserva(textLower) &&
  storage.getUserState(userId) !== "reserva"
) {
  await clientHandler.activarFlujoReserva(
    client,
    userId,
    userName,
    estadisticas
  );
  return;
}
```

### 4. Inicializar OpenAI

```javascript
// En la función start() o al inicio:
aiHandler.inicializarOpenAI();
```

### 5. Actualizar referencias a funciones movidas

Buscar y reemplazar en `main.js`:
- `obtenerEstadisticas()` → `adminHandler.obtenerEstadisticas(estadisticas)`
- `obtenerCitasDelDia()` → `adminHandler.obtenerCitasDelDia()`
- `procesarImagenCita()` → `imageHandler.procesarImagenCita()`

## 📝 Notas Importantes

1. **iaGlobalDesactivada**: Se pasa como objeto `{ value: ... }` para poder modificarlo dentro del handler.

2. **estadisticas**: Se pasa como parámetro a las funciones que lo necesitan.

3. **Funciones eliminadas de main.js**: Las siguientes funciones ya no deben existir en main.js (se movieron a handlers):
   - `esAdministrador`
   - `consultarIA`
   - `detectarIntencionReserva`
   - `consultarDisponibilidad`
   - `formatearHorariosDisponibles`
   - `getSaludoPorHora`
   - `getRespuestaVariada`
   - `detectSaludo`
   - `extraerNumero`
   - `enviarMensajeSeguro`
   - `inicializarUsuario`
   - `extractName`
   - `obtenerEstadisticas`
   - `obtenerCitasDelDia`
   - `procesarImagenCita`
   - `extraerDatosCitaDeImagen`
   - `crearCitaCompleta`

4. **Mantener en main.js**: Las siguientes funciones deben permanecer en main.js porque son específicas del flujo principal:
   - `inicializarServidorQR()`
   - `start()`
   - `iniciarBot()`
   - Funciones de inicialización y configuración

## ✅ Beneficios de la Modularización

1. **Código más organizado**: Cada handler tiene una responsabilidad clara
2. **Más fácil de mantener**: Cambios en una funcionalidad no afectan otras
3. **Reutilizable**: Los handlers pueden usarse en otros proyectos
4. **Testeable**: Cada handler puede probarse de forma independiente
5. **Escalable**: Fácil agregar nuevos handlers sin modificar código existente

## 🚀 Próximos Pasos

1. Refactorizar `main.js` siguiendo las instrucciones arriba
2. Probar todos los comandos de administrador
3. Probar flujo de clientes (reservas, cancelar, reprogramar)
4. Verificar que la IA sigue funcionando correctamente
5. Ejecutar tests si existen
