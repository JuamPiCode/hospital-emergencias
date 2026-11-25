import { ALERTA_ESPERA, casosDelPanel, fechaLocal, minutosEspera, normalizar, ordenarCola, repositorio, resumen } from './datos.js';
import { alertaOperativa, avisoOperativo, colaVista, detalleHistorial, graficoActividad, historialVista, iniciales, notificaciones, panel, registroVista, tablaCola, tablaHistorial } from './vistas.js';

const buscar = selector => document.querySelector(selector);
const vista = buscar('#view');
const dialogo = buscar('#detail-dialog');
const rutas = {
  dashboard: { titulo: 'Panel general' },
  emergencias: { titulo: 'Cola de emergencias' },
  registro: { titulo: 'Registrar paciente', permiso: 'registro' },
  historial: { titulo: 'Historial médico', permiso: 'historial' },
};
const desplegables = [
  { boton: buscar('#notifications-button'), panel: buscar('#notifications') },
  { boton: buscar('#profile-button'), panel: buscar('#profile-popover') },
];
let sesion = null;
let datos = { pacientes: [], casos: [] };
let pacientes = new Map();
let pagina = '';
let diasGrafico = 7;
let dniDetalle = null;
let temporizadorAviso;
let fechaVista;

function puede(permiso) {
  return !permiso || sesion?.permisos.includes(permiso);
}

function mensaje(elemento, texto = '') {
  elemento.textContent = texto;
  elemento.hidden = !texto;
}

function avisar(texto, error = false) {
  const aviso = buscar('#toast');
  clearTimeout(temporizadorAviso);
  aviso.classList.toggle('toast-error', error);
  mensaje(aviso, texto);
  temporizadorAviso = setTimeout(() => mensaje(aviso), 4500);
}

async function cargar() {
  datos = await repositorio.listar();
  pacientes = new Map(datos.pacientes.map(paciente => [paciente.dni, paciente]));
}

function abrirSesion() {
  buscar('#login').hidden = true;
  buscar('#app').hidden = false;
  buscar('#avatar').textContent = iniciales(sesion.nombre);
  buscar('#profile-name').textContent = sesion.nombre;
  buscar('#profile-role').textContent = sesion.rol;
  buscar('#profile-button').setAttribute('aria-label', `Perfil de ${sesion.nombre}`);
  buscar('#profile-summary').textContent = `${sesion.nombre} · ${sesion.rol}`;
  document.querySelectorAll('[data-page]').forEach(enlace => {
    enlace.hidden = !puede(rutas[enlace.dataset.page].permiso);
  });
}

function mostrarLogin() {
  if (dialogo.open) dialogo.close();
  cerrarDesplegables();
  menu(false);
  buscar('#app').hidden = true;
  buscar('#login').hidden = false;
  buscar('#login-form').reset();
  mensaje(buscar('#login-error'));
  mensaje(buscar('#toast'));
  vista.replaceChildren();
  datos = { pacientes: [], casos: [] };
  pacientes.clear();
  pagina = '';
  diasGrafico = 7;
}

function colaActual() {
  return ordenarCola(casosDelPanel(datos.casos));
}

function coincide(paciente, consulta) {
  return normalizar(paciente.nombre).includes(consulta) || paciente.dni.includes(consulta);
}

function renderCola() {
  const consulta = normalizar(buscar('#queue-search').value);
  const estado = buscar('#queue-state').value;
  const prioridad = buscar('#queue-priority').value;
  const filtrados = colaActual().filter(caso => coincide(pacientes.get(caso.dni), consulta)
    && (!estado || caso.estado === estado) && (!prioridad || caso.prioridad === prioridad));
  buscar('#queue-results').innerHTML = tablaCola(filtrados, pacientes, sesion);
  buscar('#queue-count').textContent = `${filtrados.length} ${filtrados.length === 1 ? 'ingreso' : 'ingresos'}`;
}

function renderHistorial() {
  const consulta = normalizar(buscar('#history-search').value);
  const filtrados = datos.pacientes.filter(paciente => coincide(paciente, consulta))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  buscar('#history-results').innerHTML = tablaHistorial(filtrados, datos.casos);
  buscar('#history-count').textContent = `${filtrados.length} ${filtrados.length === 1 ? 'paciente' : 'pacientes'}`;
}

function renderNotificaciones(indicadores) {
  const elemento = buscar('#notifications');
  const contenido = notificaciones(indicadores);
  if (elemento.innerHTML !== contenido) elemento.innerHTML = contenido;
  buscar('#notification-dot').hidden = !alertaOperativa(indicadores);
}

function navegar(enfocar = true) {
  if (!sesion) return;
  const solicitada = location.hash.slice(1);
  pagina = Object.hasOwn(rutas, solicitada) && puede(rutas[solicitada].permiso) ? solicitada : 'dashboard';
  if (solicitada !== pagina) history.replaceState(null, '', `#${pagina}`);
  if (dialogo.open) dialogo.close();
  cerrarDesplegables();
  menu(false);
  buscar('#breadcrumb').textContent = rutas[pagina].titulo;
  document.querySelectorAll('[data-page]').forEach(enlace => {
    if (enlace.dataset.page === pagina) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  });
  const indicadores = resumen(datos.casos);
  if (pagina === 'dashboard') vista.innerHTML = panel(indicadores, datos.casos, colaActual(), pacientes, sesion, diasGrafico);
  if (pagina === 'emergencias') {
    vista.innerHTML = colaVista(sesion, indicadores);
    renderCola();
  }
  if (pagina === 'registro') vista.innerHTML = registroVista();
  if (pagina === 'historial') {
    vista.innerHTML = historialVista();
    renderHistorial();
  }
  renderNotificaciones(indicadores);
  fechaVista = fechaLocal(Date.now());
  if (enfocar) {
    window.scrollTo(0, 0);
    vista.focus({ preventScroll: true });
  }
}

function mostrarDetalle(id) {
  if (!puede('historial') || !pacientes.has(dniDetalle)) return;
  dialogo.innerHTML = detalleHistorial(pacientes.get(dniDetalle), datos.casos, id);
  if (!dialogo.open) dialogo.showModal();
}

function cerrarDesplegables(excepto = null) {
  for (const item of desplegables) {
    if (item.boton === excepto) continue;
    item.panel.hidden = true;
    item.boton.setAttribute('aria-expanded', 'false');
  }
}

function menu(abierto) {
  buscar('#sidebar').classList.toggle('open', abierto);
  buscar('#scrim').hidden = !abierto;
  buscar('#menu-button').setAttribute('aria-expanded', String(abierto));
  buscar('#menu-button').setAttribute('aria-label', abierto ? 'Cerrar navegación' : 'Abrir navegación');
}

buscar('#menu-button').addEventListener('click', evento => menu(evento.currentTarget.getAttribute('aria-expanded') !== 'true'));
buscar('#scrim').addEventListener('click', () => { menu(false); buscar('#menu-button').focus(); });
for (const { boton, panel: desplegable } of desplegables) {
  boton.addEventListener('click', () => {
    const abrir = desplegable.hidden;
    cerrarDesplegables(boton);
    desplegable.hidden = !abrir;
    boton.setAttribute('aria-expanded', String(abrir));
  });
}
document.addEventListener('click', evento => {
  if (!evento.target.closest('.popover-anchor')) cerrarDesplegables();
  if (evento.target.closest('a[href^="#"]')) {
    cerrarDesplegables();
    if (evento.target.closest('a').hash === location.hash) {
      menu(false);
      window.scrollTo(0, 0);
      vista.focus({ preventScroll: true });
    }
  }
});
document.addEventListener('keydown', evento => {
  if (evento.key !== 'Escape' || dialogo.open) return;
  const activo = desplegables.find(item => !item.panel.hidden);
  cerrarDesplegables();
  if (activo) activo.boton.focus();
  if (buscar('#menu-button').getAttribute('aria-expanded') === 'true') {
    menu(false);
    buscar('#menu-button').focus();
  }
});

buscar('#login-form').addEventListener('click', evento => {
  const cuenta = evento.target.closest('[data-demo]')?.dataset.demo;
  if (!cuenta) return;
  const { usuario, clave } = repositorio.credencialesDemo(cuenta);
  buscar('#username').value = usuario;
  buscar('#password').value = clave;
  mensaje(buscar('#login-error'));
  buscar('#login-form button[type="submit"]').focus();
});

buscar('#login-form').addEventListener('submit', async evento => {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    sesion = repositorio.iniciarSesion(formulario.elements.username.value.trim().toLowerCase(), formulario.elements.password.value);
    if (!sesion) {
      mensaje(buscar('#login-error'), 'Usuario o contraseña incorrectos.');
      return;
    }
    formulario.reset();
    await cargar();
    abrirSesion();
    navegar();
  } catch (error) {
    mensaje(buscar('#login-error'), error.message);
  } finally {
    boton.disabled = false;
  }
});

buscar('#logout-button').addEventListener('click', () => {
  repositorio.cerrarSesion();
  sesion = null;
  history.replaceState(null, '', location.pathname + location.search);
  mostrarLogin();
  buscar('#username').focus();
});

window.addEventListener('hashchange', () => navegar());
vista.addEventListener('input', evento => {
  if (evento.target.id === 'queue-search') renderCola();
  if (evento.target.id === 'history-search') renderHistorial();
});
vista.addEventListener('change', evento => {
  if (['queue-state', 'queue-priority'].includes(evento.target.id)) renderCola();
  if (evento.target.id === 'chart-days') {
    diasGrafico = Number(evento.target.value);
    buscar('#activity-chart').innerHTML = graficoActividad(datos.casos, diasGrafico);
  }
});
vista.addEventListener('click', async evento => {
  const historial = evento.target.closest('[data-history]');
  if (historial) {
    dniDetalle = historial.dataset.history;
    mostrarDetalle();
    return;
  }
  const accion = evento.target.closest('[data-next]');
  if (!accion || !puede('estado')) return;
  accion.disabled = true;
  try {
    await repositorio.actualizarEstado(accion.dataset.case, accion.dataset.next);
    await cargar();
    if (pagina === 'emergencias') {
      renderCola();
      actualizarEspera();
      const siguiente = vista.querySelector(`[data-case="${CSS.escape(accion.dataset.case)}"]`) ?? buscar('#queue-search');
      siguiente.focus();
    }
    avisar(accion.dataset.next === 'atencion' ? 'Atención iniciada.' : 'Atención finalizada.');
  } catch (error) {
    avisar(error.message, true);
  } finally {
    accion.disabled = false;
  }
});
vista.addEventListener('submit', async evento => {
  if (evento.target.id !== 'registration-form') return;
  evento.preventDefault();
  const formulario = evento.target;
  const entrada = new FormData(formulario);
  const boton = formulario.querySelector('button[type="submit"]');
  const errorFormulario = formulario.querySelector('.form-error');
  boton.disabled = true;
  mensaje(errorFormulario);
  try {
    await repositorio.registrar({
      dni: entrada.get('dni').trim(),
      nombre: entrada.get('nombre').trim().replace(/\s+/g, ' '),
      edad: Number(entrada.get('edad')),
      ingreso: new Date(`${entrada.get('fecha')}T${entrada.get('hora')}`).getTime(),
      prioridad: entrada.get('prioridad'),
      motivo: entrada.get('motivo').trim(),
    });
    await cargar();
    location.hash = 'emergencias';
    avisar('Ingreso registrado correctamente.');
  } catch (error) {
    mensaje(errorFormulario, error.message);
  } finally {
    boton.disabled = false;
  }
});

dialogo.addEventListener('click', evento => {
  if (evento.target.closest('#close-dialog')) dialogo.close();
});
dialogo.addEventListener('change', evento => {
  if (evento.target.id !== 'visit-select') return;
  mostrarDetalle(evento.target.value);
  buscar('#visit-select').focus();
});
dialogo.addEventListener('submit', async evento => {
  if (evento.target.id !== 'observation-form') return;
  evento.preventDefault();
  const formulario = evento.target;
  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  try {
    await repositorio.agregarObservacion(formulario.dataset.visit, formulario.elements.observacion.value.trim());
    await cargar();
    if (dialogo.open) {
      mostrarDetalle(formulario.dataset.visit);
      buscar('#observation-form textarea').focus();
    }
    avisar('Observación guardada.');
  } catch (error) {
    mensaje(formulario.querySelector('.form-error'), error.message);
  } finally {
    boton.disabled = false;
  }
});

function actualizarEspera() {
  if (!sesion) return;
  if (fechaLocal(Date.now()) !== fechaVista && pagina !== 'registro' && !dialogo.open) {
    navegar(false);
    return;
  }
  const indicadores = resumen(datos.casos);
  renderNotificaciones(indicadores);
  const aviso = buscar('#queue-alert, #dashboard-alert');
  if (aviso) aviso.innerHTML = avisoOperativo(indicadores);
  const promedio = buscar('#average-wait');
  if (promedio) promedio.textContent = indicadores.tiempoPromedio;
  const activos = new Map(datos.casos.filter(caso => caso.estado === 'espera').map(caso => [caso.id, caso]));
  vista.querySelectorAll('[data-wait]').forEach(celda => {
    const caso = activos.get(celda.dataset.wait);
    if (!caso) return;
    const minutos = minutosEspera(caso);
    celda.textContent = `${minutos} min`;
    celda.classList.toggle('late', minutos >= ALERTA_ESPERA);
  });
}

setInterval(actualizarEspera, 15000);
try {
  sesion = repositorio.sesion();
  if (sesion) {
    await cargar();
    abrirSesion();
    navegar(false);
  } else {
    mostrarLogin();
  }
} catch (error) {
  sesion = null;
  mostrarLogin();
  mensaje(buscar('#login-error'), error.message);
}
