// Datos de servicios del spa
module.exports = {
  1: {
    nombre: "Masajes",
    categoria: "Masajes",
    opciones: [
      { nombre: "Masaje Relajante", precio: "S/35", duracion: "45-60 minutos" },
      {
        nombre: "Masaje Descontracturante",
        precio: "S/35",
        duracion: "45-60 minutos",
      },
      {
        nombre: "Masaje Terapéutico",
        precio: "S/45",
        duracion: "45-60 minutos",
      },
      {
        nombre: "Relajante + Piedras Calientes",
        precio: "S/50",
        duracion: "45-60 minutos",
        descripcion: "Combina calor y masaje. Electro compresas.",
      },
      {
        nombre: "Descontracturante + Electroterapia",
        precio: "S/50",
        duracion: "45-60 minutos",
        descripcion: "Estimulación eléctrica. Potencia el masaje.",
      },
      {
        nombre: "Descontracturante + Esferas Chinas",
        precio: "S/40",
        duracion: "45-60 minutos",
        descripcion: "Acupresión con esferas. Reduce el dolor.",
      },
      {
        nombre: "Terapéutico + Compresas + Electroterapia",
        precio: "S/60",
        duracion: "45-60 minutos",
        descripcion: "Tratamiento integral. Acelera recuperación.",
      },
    ],
    descripcion:
      "Masajes relajantes, descontracturantes y terapéuticos para aliviar tensiones, estrés y dolores musculares",
    beneficios: [
      "Alivia dolores musculares y tensiones",
      "Reduce el estrés y la ansiedad",
      "Mejora la circulación",
      "Promueve la relajación profunda",
      "Recuperación física y mental",
    ],
    imagen: process.env.SERVICIO1_IMAGEN || null,
  },
  2: {
    nombre: "Tratamientos Faciales",
    categoria: "Belleza",
    opciones: [
      {
        nombre: "Limpieza Facial Básica",
        precio: "S/30",
        duracion: "60 minutos",
      },
      {
        nombre: "Limpieza Facial Profunda",
        precio: "S/60",
        duracion: "60-90 minutos",
      },
      {
        nombre: "Parálisis Facial + Consulta",
        precio: "S/50",
        duracion: "60 minutos",
      },
    ],
    descripcion:
      "Tratamientos faciales para rejuvenecer, limpiar y cuidar tu piel",
    beneficios: [
      "Elimina impurezas y puntos negros",
      "Hidrata y nutre la piel",
      "Reduce arrugas y líneas de expresión",
      "Mejora la textura y brillo",
      "Tratamiento especializado para parálisis facial",
    ],
    imagen: process.env.SERVICIO2_IMAGEN || null,
  },
  3: {
    nombre: "Manicura y Pedicura",
    categoria: "Belleza",
    precio: "Consultar",
    duracion: "90 minutos",
    descripcion: "Cuidado completo de uñas de manos y pies",
    beneficios: [
      "Uñas limpias y bien cuidadas",
      "Exfoliación y hidratación",
      "Esmaltado profesional",
      "Relajación de manos y pies",
    ],
    imagen: process.env.SERVICIO3_IMAGEN || null,
  },
  4: {
    nombre: "Extensiones de Pestañas",
    categoria: "Belleza",
    precio: "Consultar",
    duracion: "120 minutos",
    descripcion: "Extensiones de pestañas naturales y duraderas",
    beneficios: [
      "Pestañas más largas y voluminosas",
      "Efecto natural y elegante",
      "Duración de 3-4 semanas",
      "Sin necesidad de máscara",
    ],
    imagen: process.env.SERVICIO4_IMAGEN || null,
  },
  5: {
    nombre: "Diseño de Cejas",
    categoria: "Belleza",
    precio: "Consultar",
    duracion: "30 minutos",
    descripcion: "Diseño y perfilado profesional de cejas",
    beneficios: [
      "Cejas perfectamente definidas",
      "Forma personalizada a tu rostro",
      "Técnica profesional",
      "Resultado natural",
    ],
    imagen: process.env.SERVICIO5_IMAGEN || null,
  },
  6: {
    nombre: "Fisioterapia y Rehabilitación",
    categoria: "Rehabilitación",
    opciones: [
      {
        nombre: "Evaluación + Tratamiento de Fisioterapia",
        precio: "S/50",
        duracion: "60 minutos",
      },
    ],
    descripcion:
      "Tratamientos terapéuticos para recuperación física y rehabilitación",
    beneficios: [
      "Alivia dolores crónicos",
      "Mejora la movilidad",
      "Recuperación post-lesión",
      "Bienestar general",
      "Evaluación profesional",
    ],
    imagen: process.env.SERVICIO6_IMAGEN || null,
  },
};

