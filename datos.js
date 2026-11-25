export const ESTADOS = {
  espera: 'En espera',
  atencion: 'En atención',
  atendido: 'Atendido',
};

export const PRIORIDADES = {
  critica: 'Crítica',
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

export const TURNOS = 8;
export const ALERTA_ESPERA = 60;

const CUENTAS = {
  admin: { nombre: 'Lucía Torres', rol: 'Administrador', clave: 'PulsoAdmin24', permisos: ['registro', 'estado', 'historial'] },
  medico: { nombre: 'Andrés Vega', rol: 'Médico', clave: 'PulsoMedico24', permisos: ['estado', 'historial'] },
  recepcion: { nombre: 'Paola Ríos', rol: 'Recepcionista', clave: 'PulsoRecepcion24', permisos: ['registro'] },
};

const CASOS = [
  ['90000001', 'Valeria Salas', 34, 'Dificultad respiratoria', 'critica', 'atencion', 28],
  ['90000002', 'Mateo Paredes', 52, 'Dolor abdominal', 'alta', 'espera', 43],
  ['90000003', 'Camila Rojas', 27, 'Caída accidental', 'media', 'espera', 31],
  ['90000004', 'Diego Ramos', 41, 'Corte superficial', 'baja', 'espera', 18],
  ['90000005', 'Mariana Soto', 63, 'Mareo persistente', 'alta', 'atencion', 52],
  ['90000006', 'Gabriel León', 20, 'Dolor de tobillo', 'media', 'espera', 21],
  ['90000007', 'Renata Núñez', 36, 'Fiebre y malestar', 'media', 'atendido', 85],
  ['90000008', 'Alonso Cruz', 44, 'Dolor de hombro', 'baja', 'atendido', 124],
  ['90000009', 'Sofía Arias', 56, 'Dolor de cabeza', 'media', 'atendido', 104],
  ['90000010', 'Joaquín Silva', 48, 'Dolor en el pecho', 'alta', 'espera', 24],
  ['90000011', 'Elena Campos', 31, 'Lesión en la muñeca', 'media', 'atendido', 147],
];

const DATOS_KEY = 'pulso.datos.v1';
const SESION_KEY = 'pulso.sesion.v1';
const minuto = 60_000;

function cuentaPublica(usuario) {
  const cuenta = Object.hasOwn(CUENTAS, usuario) ? CUENTAS[usuario] : null;
  return cuenta ? { usuario, nombre: cuenta.nombre, rol: cuenta.rol, permisos: [...cuenta.permisos] } : null;
}

export function fechaLocal(valor) {
  const fecha = new Date(valor);
  return [fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate()]
    .map(parte => String(parte).padStart(2, '0')).join('-');
}

export function horaLocal(valor) {
  const fecha = new Date(valor);
  return [fecha.getHours(), fecha.getMinutes()].map(parte => String(parte).padStart(2, '0')).join(':');
}

function sembrar(ahora = new Date()) {
  const pacientes = CASOS.map(([dni, nombre, edad]) => ({ dni, nombre, edad }));
  const casos = CASOS.map(([dni, , , motivo, prioridad, estado, minutos], indice) => {
    const ingreso = +ahora - minutos * minuto;
    return {
      id: `demo-${indice + 1}`, dni, motivo, prioridad, estado, ingreso,
      inicio: estado === 'espera' ? null : ingreso + 12 * minuto,
      fin: estado === 'atendido' ? ingreso + 35 * minuto : null,
      antecedentes: '', observaciones: [],
    };
  });

  for (let dias = 1; dias <= 6; dias++) {
    const fecha = new Date(ahora);
    fecha.setDate(fecha.getDate() - dias);
    fecha.setHours(9, 0, 0, 0);
    const cantidad = [0, 7, 4, 8, 5, 7, 3][dias];
    for (let indice = 0; indice < cantidad; indice++) {
      const ingreso = +fecha + indice * 26 * minuto;
      casos.push({
        id: `demo-h-${dias}-${indice}`, dni: pacientes[(dias + indice - 1) % pacientes.length].dni,
        motivo: 'Consulta de emergencia simulada', prioridad: 'media', estado: 'atendido',
        ingreso, inicio: ingreso + 18 * minuto, fin: ingreso + 44 * minuto,
        antecedentes: 'Antecedente ficticio de esguince leve.',
        observaciones: [{ texto: 'Atención de práctica registrada en el historial.', autor: 'Andrés Vega', fecha: ingreso + 40 * minuto }],
      });
    }
  }
  return { pacientes, casos };
}

function leer() {
  const persistido = localStorage.getItem(DATOS_KEY);
  if (persistido) {
    try {
      const datos = JSON.parse(persistido);
      if (Array.isArray(datos?.pacientes) && Array.isArray(datos?.casos)) return datos;
    } catch {
      throw new Error('Los datos locales no se pudieron leer.');
    }
    throw new Error('Los datos locales tienen un formato incompatible.');
  }
  const datos = sembrar();
  guardar(datos);
  return datos;
}

function guardar(datos) {
  localStorage.setItem(DATOS_KEY, JSON.stringify(datos));
}

function requerir(permiso) {
  if (!repositorio.sesion()?.permisos.includes(permiso)) {
    throw new Error('Tu rol no tiene permiso para realizar esta acción.');
  }
}

function validarCaso(datos) {
  if (!/^\d{8}$/.test(datos.dni)) throw new Error('El DNI debe contener ocho dígitos.');
  if (datos.nombre.length > 100 || datos.nombre.split(/\s+/).length < 2 || !/^[\p{L}\p{M}][\p{L}\p{M} .’'-]*$/u.test(datos.nombre)) {
    throw new Error('Ingresa los nombres y apellidos del paciente.');
  }
  if (!Number.isInteger(datos.edad) || datos.edad < 0 || datos.edad > 120) throw new Error('Ingresa una edad entre 0 y 120 años.');
  if (!Number.isFinite(datos.ingreso) || datos.ingreso > Date.now()) throw new Error('Indica una fecha y hora de ingreso válida, hasta el momento actual.');
  if (datos.motivo.length < 3 || datos.motivo.length > 280) throw new Error('El motivo debe tener entre 3 y 280 caracteres.');
  if (!Object.hasOwn(PRIORIDADES, datos.prioridad)) throw new Error('Selecciona la prioridad indicada por el personal sanitario.');
}

// Punto de acceso a los datos. La interfaz espera operaciones asíncronas para poder usar una API REST.
export const repositorio = {
  credencialesDemo(usuario) {
    return cuentaPublica(usuario) ? { usuario, clave: CUENTAS[usuario].clave } : null;
  },
  iniciarSesion(usuario, clave) {
    const cuenta = cuentaPublica(usuario);
    if (!cuenta || CUENTAS[usuario].clave !== clave) return null;
    localStorage.setItem(SESION_KEY, usuario);
    return cuenta;
  },
  sesion() {
    return cuentaPublica(localStorage.getItem(SESION_KEY));
  },
  cerrarSesion() {
    localStorage.removeItem(SESION_KEY);
  },
  async listar() {
    const sesion = this.sesion();
    if (!sesion) throw new Error('Inicia sesión para consultar los datos.');
    const datos = leer();
    return sesion.permisos.includes('historial') ? datos : {
      pacientes: datos.pacientes,
      casos: datos.casos.map(({ antecedentes, observaciones, ...caso }) => caso),
    };
  },
  async registrar(datos) {
    requerir('registro');
    validarCaso(datos);
    const registros = leer();
    if (registros.casos.some(caso => caso.dni === datos.dni && caso.estado !== 'atendido')) {
      throw new Error('Este DNI ya tiene una atención abierta en la cola.');
    }
    const paciente = registros.pacientes.find(item => item.dni === datos.dni);
    if (paciente && normalizar(paciente.nombre) !== normalizar(datos.nombre)) {
      throw new Error('El DNI pertenece a otro nombre registrado. Revisa los datos.');
    }
    if (paciente) paciente.edad = datos.edad;
    else registros.pacientes.push({ dni: datos.dni, nombre: datos.nombre, edad: datos.edad });
    const id = crypto.randomUUID();
    registros.casos.push({
      id, dni: datos.dni, ingreso: datos.ingreso, motivo: datos.motivo, prioridad: datos.prioridad,
      estado: 'espera', inicio: null, fin: null, antecedentes: '', observaciones: [],
    });
    guardar(registros);
    return id;
  },
  async actualizarEstado(id, estado) {
    requerir('estado');
    const registros = leer();
    const caso = registros.casos.find(item => item.id === id);
    const siguiente = { espera: 'atencion', atencion: 'atendido' };
    if (!caso || siguiente[caso.estado] !== estado) throw new Error('El cambio de estado solicitado no está disponible.');
    const ahora = Math.max(Date.now(), caso.inicio ?? caso.ingreso);
    caso.estado = estado;
    if (estado === 'atencion') caso.inicio = ahora;
    if (estado === 'atendido') caso.fin = ahora;
    guardar(registros);
  },
  async agregarObservacion(id, texto) {
    requerir('historial');
    if (texto.length < 3 || texto.length > 600) throw new Error('La observación debe tener entre 3 y 600 caracteres.');
    const registros = leer();
    const caso = registros.casos.find(item => item.id === id);
    if (!caso) throw new Error('No se encontró la atención.');
    caso.observaciones.push({ texto, autor: this.sesion().nombre, fecha: Date.now() });
    guardar(registros);
  },
};

export function normalizar(valor) {
  return valor.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function minutosEspera(caso, ahora = Date.now()) {
  return Math.max(0, Math.floor(((caso.inicio ?? ahora) - caso.ingreso) / minuto));
}

export function ordenarCola(casos) {
  const prioridades = Object.keys(PRIORIDADES);
  return [...casos].sort((a, b) => prioridades.indexOf(a.prioridad) - prioridades.indexOf(b.prioridad) || a.ingreso - b.ingreso);
}

export function casosDelPanel(casos, ahora = Date.now()) {
  const hoy = fechaLocal(ahora);
  return casos.filter(caso => caso.estado !== 'atendido' || fechaLocal(caso.fin) === hoy);
}

export function resumen(casos, ahora = Date.now()) {
  const panel = casosDelPanel(casos, ahora);
  const espera = panel.filter(caso => caso.estado === 'espera');
  const atencion = panel.filter(caso => caso.estado === 'atencion').length;
  const atendido = panel.filter(caso => caso.estado === 'atendido').length;
  const tiempoPromedio = panel.length ? Math.round(panel.reduce((suma, caso) => suma + minutosEspera(caso, ahora), 0) / panel.length) : 0;
  return {
    total: panel.length, espera: espera.length, atencion, atendido, tiempoPromedio,
    extensas: espera.filter(caso => minutosEspera(caso, ahora) >= ALERTA_ESPERA).length,
    ocupacion: Math.round(atencion / TURNOS * 100),
  };
}

export function actividad(casos, dias, ahora = Date.now()) {
  const formato = new Intl.DateTimeFormat('es-PE', { weekday: 'short' });
  return Array.from({ length: dias }, (_, indice) => {
    const fecha = new Date(ahora);
    fecha.setDate(fecha.getDate() - dias + 1 + indice);
    const dia = fechaLocal(fecha);
    return {
      dia,
      etiqueta: formato.format(fecha).replace('.', ''),
      ingresos: casos.filter(caso => fechaLocal(caso.ingreso) === dia).length,
      atendidos: casos.filter(caso => caso.fin !== null && fechaLocal(caso.fin) === dia).length,
    };
  });
}
