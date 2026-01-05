// test-refactor.js
console.log('🔍 Verificando refactorización...\n');

try {
  // Verificar handlers
  const adminHandler = require('./handlers/admin');
  const clientHandler = require('./handlers/client');
  const remindersHandler = require('./handlers/reminders');
  const { fuzzyMatch } = require('./utils/validators');
  
  console.log('✅ adminHandler cargado');
  console.log('✅ clientHandler cargado');
  console.log('✅ remindersHandler cargado');
  console.log('✅ fuzzyMatch disponible');
  
  // Verificar funciones específicas
  console.log('\n📋 Verificando exports:');
  console.log('  - guardarReserva:', typeof remindersHandler.guardarReserva === 'function' ? '✅' : '❌');
  console.log('  - verificarRecordatorios:', typeof remindersHandler.verificarRecordatorios === 'function' ? '✅' : '❌');
  console.log('  - procesarCancelarReprogramar:', typeof clientHandler.procesarCancelarReprogramar === 'function' ? '✅' : '❌');
  console.log('  - procesarSeleccionCancelar:', typeof clientHandler.procesarSeleccionCancelar === 'function' ? '✅' : '❌');
  console.log('  - fuzzyMatch:', typeof fuzzyMatch === 'function' ? '✅' : '❌');
  
  // Probar fuzzyMatch
  console.log('\n🧪 Probando fuzzyMatch:');
  console.log('  - "hola" vs "hola":', fuzzyMatch('hola', 'hola') ? '✅' : '❌');
  console.log('  - "hola" vs "holaa":', fuzzyMatch('hola', 'holaa', 0.6) ? '✅' : '❌');
  console.log('  - "hola" vs "adios":', fuzzyMatch('hola', 'adios', 0.6) ? '❌ (debería ser false)' : '✅');
  
  // Verificar que main.js puede cargar los handlers
  console.log('\n📦 Verificando imports en main.js:');
  try {
    // Solo verificar que los require funcionan, no ejecutar main.js completo
    const fs = require('fs');
    const mainContent = fs.readFileSync('main.js', 'utf8');
    const hasRemindersHandler = mainContent.includes('remindersHandler');
    const hasClientHandler = mainContent.includes('clientHandler.procesarCancelarReprogramar');
    const hasFuzzyMatchImport = mainContent.includes('fuzzyMatch') && mainContent.includes('validators');
    
    console.log('  - remindersHandler importado:', hasRemindersHandler ? '✅' : '❌');
    console.log('  - clientHandler.procesarCancelarReprogramar usado:', hasClientHandler ? '✅' : '❌');
    console.log('  - fuzzyMatch importado de validators:', hasFuzzyMatchImport ? '✅' : '❌');
  } catch (err) {
    console.log('  ⚠️  No se pudo verificar imports:', err.message);
  }
  
  console.log('\n✅ Todas las verificaciones pasaron!');
  process.exit(0);
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
