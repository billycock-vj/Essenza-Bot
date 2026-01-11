// Servicio de persistencia de datos
const fs = require('fs');
const path = require('path');
const paths = require('../config/paths');

const DATA_DIR = paths.DATA_BASE_DIR;
const RESERVAS_FILE = paths.RESERVAS_FILE;
const USER_DATA_FILE = paths.USER_DATA_FILE;
const ESTADISTICAS_FILE = paths.ESTADISTICAS_FILE;

// Asegurar que el directorio existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Guarda reservas en archivo JSON
 * @param {Array} reservas - Array de reservas
 */
function guardarReservas(reservas) {
  try {
    const data = reservas.map(r => ({
      ...r,
      fechaHora: r.fechaHora.toISOString(),
      creada: r.creada.toISOString(),
    }));
    fs.writeFileSync(RESERVAS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error al guardar reservas:', error.message);
  }
}

/**
 * Carga reservas desde archivo JSON
 * @returns {Array} - Array de reservas
 */
function cargarReservas() {
  try {
    if (!fs.existsSync(RESERVAS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(RESERVAS_FILE, 'utf8');
    const reservas = JSON.parse(data);
    // Convertir fechas de string a Date
    return reservas.map(r => ({
      ...r,
      fechaHora: new Date(r.fechaHora),
      creada: new Date(r.creada),
    }));
  } catch (error) {
    console.error('Error al cargar reservas:', error.message);
    return [];
  }
}

/**
 * Guarda datos de usuarios en archivo JSON
 * @param {Object} userData - Objeto con datos de usuarios
 */
function guardarUserData(userData) {
  try {
    fs.writeFileSync(USER_DATA_FILE, JSON.stringify(userData, null, 2), 'utf8');
  } catch (error) {
    console.error('Error al guardar userData:', error.message);
  }
}

/**
 * Carga datos de usuarios desde archivo JSON
 * @returns {Object} - Objeto con datos de usuarios
 */
function cargarUserData() {
  try {
    if (!fs.existsSync(USER_DATA_FILE)) {
      return {};
    }
    const data = fs.readFileSync(USER_DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al cargar userData:', error.message);
    return {};
  }
}

/**
 * Guarda estadísticas en archivo JSON
 * @param {Object} estadisticas - Objeto con estadísticas
 */
function guardarEstadisticas(estadisticas) {
  try {
    const data = {
      ...estadisticas,
      usuariosAtendidos: Array.from(estadisticas.usuariosAtendidos || []),
      inicio: estadisticas.inicio.toISOString(),
    };
    fs.writeFileSync(ESTADISTICAS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error al guardar estadísticas:', error.message);
  }
}

/**
 * Carga estadísticas desde archivo JSON
 * @returns {Object} - Objeto con estadísticas
 */
function cargarEstadisticas() {
  try {
    if (!fs.existsSync(ESTADISTICAS_FILE)) {
      return null;
    }
    const data = fs.readFileSync(ESTADISTICAS_FILE, 'utf8');
    const estadisticas = JSON.parse(data);
    return {
      ...estadisticas,
      usuariosAtendidos: new Set(estadisticas.usuariosAtendidos || []),
      inicio: new Date(estadisticas.inicio),
    };
  } catch (error) {
    console.error('Error al cargar estadísticas:', error.message);
    return null;
  }
}

/**
 * Guarda todo el estado del bot
 */
function guardarTodo(reservas, userData, estadisticas) {
  guardarReservas(reservas);
  guardarUserData(userData);
  guardarEstadisticas(estadisticas);
}

module.exports = {
  guardarReservas,
  cargarReservas,
  guardarUserData,
  cargarUserData,
  guardarEstadisticas,
  cargarEstadisticas,
  guardarTodo,
};

