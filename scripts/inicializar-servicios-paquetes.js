/**
 * Script para inicializar servicios y paquetes en la base de datos
 */

const db = require('../services/database');

async function inicializar() {
  try {
    console.log('🔄 Iniciando carga de servicios y paquetes...\n');
    
    // Primero inicializar la DB
    await db.inicializarDB();
    console.log('✅ Base de datos inicializada\n');
    
    // SERVICIOS
    const servicios = [
      // Masajes Básicos
      { nombre: 'Masaje Relajante', duracion: 60, precio: 35, categoria: 'Masajes Básicos' },
      { nombre: 'Masaje Descontracturante', duracion: 60, precio: 35, categoria: 'Masajes Básicos' },
      { nombre: 'Masaje Terapéutico', duracion: 60, precio: 45, categoria: 'Masajes Básicos' },
      
      // Masajes Compuestos
      { nombre: 'Relajante + Piedras Calientes', duracion: 60, precio: 50, categoria: 'Masajes Compuestos' },
      { nombre: 'Descontracturante + Electroterapia', duracion: 60, precio: 50, categoria: 'Masajes Compuestos' },
      { nombre: 'Descontracturante + Esferas Chinas', duracion: 60, precio: 40, categoria: 'Masajes Compuestos' },
      { nombre: 'Terapéutico + Compresas + Electroterapia', duracion: 60, precio: 60, categoria: 'Masajes Compuestos' },
      
      // Fisioterapia
      { nombre: 'Evaluación + Tratamiento de Fisioterapia', duracion: 60, precio: 50, categoria: 'Fisioterapia y Terapias' },
      
      // Tratamientos Faciales
      { nombre: 'Limpieza Facial Básica', duracion: 60, precio: 30, categoria: 'Tratamientos Faciales' },
      { nombre: 'Limpieza Facial Profunda', duracion: 90, precio: 60, categoria: 'Tratamientos Faciales' },
      { nombre: 'Parálisis Facial + Consulta', duracion: 60, precio: 50, categoria: 'Tratamientos Faciales' },
    ];
    
    console.log('📦 Cargando servicios...');
    for (const servicio of servicios) {
      try {
        await db.agregarServicio(
          servicio.nombre,
          servicio.duracion,
          servicio.precio,
          servicio.categoria,
          null
        );
        console.log(`  ✅ ${servicio.nombre} - S/${servicio.precio}`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint')) {
          console.log(`  ⚠️ ${servicio.nombre} ya existe, omitiendo...`);
        } else {
          console.error(`  ❌ Error al agregar ${servicio.nombre}:`, error.message);
        }
      }
    }
    
    // PAQUETES
    const paquetes = [
      { nombre: 'PAQUETE RELAJACIÓN', precio: 80, personas: 1, descripcion: '3 masajes relajantes' },
      { nombre: 'PAQUETE BIENESTAR', precio: 100, personas: 1, descripcion: '4 masajes terapéuticos' },
      { nombre: 'PAQUETE RECUPERACIÓN', precio: 140, personas: 1, descripcion: '4 sesiones de fisioterapia' },
      { nombre: 'PAQUETE ARMÓNICO', precio: 140, personas: 2, descripcion: 'Paquete para 2 personas' },
      { nombre: 'PAQUETE AMOR', precio: 150, personas: 2, descripcion: 'Paquete para 2 personas' },
    ];
    
    console.log('\n📦 Cargando paquetes...');
    for (const paquete of paquetes) {
      try {
        await db.agregarPaquete(
          paquete.nombre,
          paquete.precio,
          paquete.personas,
          paquete.descripcion,
          null
        );
        console.log(`  ✅ ${paquete.nombre} - S/${paquete.precio} (${paquete.personas} persona${paquete.personas > 1 ? 's' : ''})`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint')) {
          console.log(`  ⚠️ ${paquete.nombre} ya existe, omitiendo...`);
        } else {
          console.error(`  ❌ Error al agregar ${paquete.nombre}:`, error.message);
        }
      }
    }
    
    console.log('\n✅ Servicios y paquetes cargados correctamente\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

inicializar();
