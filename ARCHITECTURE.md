# Arquitectura del Sistema - Essenza Bot

## Visión General

Essenza Bot es un bot de WhatsApp para Essenza Spa que utiliza IA (OpenAI) para responder automáticamente a clientes, gestionar reservas y realizar seguimientos automáticos.

## Arquitectura de Capas

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
│    (WhatsApp Messages Handler)      │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│         Service Layer               │
│  MessageService, AIService, etc.    │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│         Repository Layer            │
│  ConversationRepository, etc.       │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│         Data Layer                  │
│         SQLite Database             │
└─────────────────────────────────────┘
```

## Componentes Principales

### 1. Services (Lógica de Negocio)

- **MessageService**: Manejo de mensajes de WhatsApp
- **AIService**: Consultas a OpenAI con rate limiting y circuit breaker
- **ConversationService**: Gestión de historial de conversaciones
- **MonitoringService**: Health checks y métricas

### 2. Repositories (Acceso a Datos)

- **BaseRepository**: Clase base para repositorios
- **ConversationRepository**: Acceso a datos de conversaciones

### 3. Utils (Utilidades)

- **errors.js**: Sistema de errores estructurado
- **rateLimiter.js**: Rate limiting para APIs
- **circuitBreaker.js**: Circuit breaker para servicios externos
- **logger.js**: Sistema de logging estructurado
- **validators.js**: Validaciones de inputs

### 4. Handlers (Manejadores Específicos)

- **admin.js**: Comandos de administrador
- **leadClassification.js**: Clasificación de leads
- **followUp.js**: Seguimientos automáticos
- **storiesAutomation.js**: Automatización de historias

## Flujo de un Mensaje

1. **Recepción**: WhatsApp recibe mensaje
2. **Validación**: MessageService valida el mensaje
3. **Verificación**: Se verifica si el bot está activo
4. **Procesamiento**:
   - Si es admin → procesar comandos
   - Si no → consultar IA
5. **IA**:
   - Rate limiting
   - Circuit breaker
   - Consulta a OpenAI
6. **Respuesta**: Envío de respuesta al cliente
7. **Persistencia**: Guardado en BD

## Patrones de Diseño

### Repository Pattern
Abstrae el acceso a datos de la lógica de negocio.

### Service Layer
Separa la lógica de negocio de la presentación.

### Circuit Breaker
Previene llamadas repetidas a servicios que están fallando.

### Rate Limiting
Controla la frecuencia de solicitudes a APIs externas.

## Base de Datos

### Tablas Principales

- **reservas**: Citas del spa
- **clientes**: Información de clientes
- **conversaciones**: Historial de mensajes
- **configuracion**: Configuración del bot
- **seguimientos**: Seguimientos automáticos enviados
- **servicios**: Servicios disponibles
- **logs**: Registro de actividad

## Seguridad

- Validación de inputs en todos los endpoints
- Rate limiting para prevenir abuso
- Circuit breaker para prevenir sobrecarga
- Logging estructurado sin datos sensibles
- Backups automáticos de BD

## Monitoreo

- Health checks en `/health`
- Métricas en `/metrics`
- Logging estructurado en JSON
- Circuit breaker states
- Rate limiter stats

## Escalabilidad

- Conversaciones en BD (no solo memoria)
- Cache en memoria para acceso rápido
- Limpieza automática de datos antiguos
- Rate limiting por usuario
- Circuit breaker para servicios externos
