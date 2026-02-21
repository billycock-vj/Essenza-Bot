# Seguimientos automáticos y publicación de estados (historias)

## Resumen del análisis

### Por qué no se enviaban seguimientos

1. **`ultimo_mensaje` en NULL**  
   La consulta de seguimientos exige `c.ultimo_mensaje` entre 12 y 24 horas. Los clientes se crean con `obtenerOCrearCliente` sin rellenar `ultimo_mensaje`, así que quedaba en NULL y **ninguno cumplía la condición**.

2. **Qué se hizo**  
   Tras enviar la primera respuesta a un chat nuevo y crear el cliente, se llama a  
   `db.actualizarEstadoLead(sessionId, 'info', new Date().toISOString())`  
   para fijar `estado_lead` y **`ultimo_mensaje`**. A partir de ahí, a las 12–24 h ese cliente entra en la ventana del primer seguimiento.

3. **Clientes antiguos**  
   Los que ya estaban en la base con `ultimo_mensaje` NULL no se modifican. Solo los **nuevos** (desde este cambio) tendrán seguimiento. Si quieres dar seguimiento a viejos, puedes actualizarlos en BD:  
   `UPDATE clientes SET ultimo_mensaje = fecha_creacion WHERE ultimo_mensaje IS NULL;`  
   (opcional; ten en cuenta que algunos pueden llevar mucho tiempo sin escribir).

### Por qué no se publicaban estados (historias)

1. **Carpetas vacías o inexistentes**  
   Las historias se leen desde la carpeta del proyecto:
   - `historias/lunes/`
   - `historias/miercoles/`
   - `historias/viernes/`  
   Si no existen o no tienen imágenes (`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`), el bot no publica nada.

2. **Qué se hizo**  
   - Al iniciar el bot se comprueba la carpeta de historias y se muestra su ruta absoluta.
   - Si falta la carpeta, se crea (y subcarpetas lunes, miercoles, viernes).
   - Se indica cuántas imágenes hay por día y, si hay 0, un aviso claro.
   - Si en la hora programada no hay cliente conectado, se evita intentar publicar y se registra un aviso.

3. **Qué debes hacer tú**  
   - Poner imágenes en:
     - `historias/lunes/`
     - `historias/miercoles/`
     - `historias/viernes/`  
   - Horarios (cron, hora del servidor): Lunes 11:00, Miércoles 18:00, Viernes 21:00.

### Condiciones para que todo funcione

- **Bot conectado**  
  Seguimientos y cron de historias se registran **dentro** del `.then(client)` de wppconnect. Si el bot no llega a conectarse (p. ej. "Auto Close Called", browser en uso), no se programa ningún cron ni `setInterval`, así que no hay ni seguimientos ni historias hasta que el bot arranque bien.

- **Seguimientos**  
  - Cliente en BD con `estado_lead` en `'info'` o `'lead_tibio'`.
  - `ultimo_mensaje` con fecha (para primer seguimiento: entre 12 y 24 h; para segundo: 48–72 h después del primero).
  - No tener ya un seguimiento sin respuesta (para no repetir).

- **Historias**  
  - Cliente wppconnect válido en la hora del cron.
  - Imágenes en la carpeta del día correspondiente.

## Logs útiles

- `[Seguimientos] Ventana 12-24h: N cliente(s) candidatos` — indica cuántos clientes entran en la ventana del primer seguimiento.
- `[Seguimientos] Ventana 48-72h (segundo): N cliente(s) candidatos` — lo mismo para el segundo.
- Al iniciar: `Carpeta de historias: <ruta>` y `lunes: X imagen(es)`, etc.
- Para ver siempre estos conteos de seguimiento: `LOG_LEVEL=verbose` en `.env`.
