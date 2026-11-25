import { actividad, ALERTA_ESPERA, ESTADOS, fechaLocal, horaLocal, minutosEspera, PRIORIDADES, TURNOS } from './datos.js';

const formatoFecha = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
const formatoDia = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
const entidades = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapar = valor => String(valor).replace(/[&<>"']/g, caracter => entidades[caracter]);
export const icono = nombre => `<svg class="icon" aria-hidden="true"><use href="#i-${nombre}"></use></svg>`;
export const fechaCompleta = valor => formatoFecha.format(valor);

export function iniciales(nombre) {
  return nombre.split(/\s+/).slice(0, 2).map(parte => parte[0]).join('').toUpperCase();
}

function encabezado(titulo, descripcion, accion = '') {
  return `<div class="page-heading"><div><h1>${titulo}</h1><p>${descripcion}</p></div>${accion}</div>`;
}

export function enlaceRegistro(sesion) {
  return sesion.permisos.includes('registro') ? `<a href="#registro" class="button primary">${icono('plus')} Registrar paciente</a>` : '';
}

export function alertaOperativa(datos) {
  if (datos.ocupacion >= 100 || datos.espera >= TURNOS) {
    return { nivel: 'danger', titulo: 'Saturación operativa', texto: `${datos.espera} en espera y ${datos.atencion} en atención. Capacidad de referencia de ${TURNOS} puestos.` };
  }
  if (datos.extensas) {
    return { nivel: 'warning', titulo: 'Espera prolongada', texto: `${datos.extensas} paciente(s) llevan ${ALERTA_ESPERA} minutos o más en espera.` };
  }
  return null;
}

export function notificaciones(datos) {
  const aviso = alertaOperativa(datos);
  return aviso ? `<strong>${aviso.titulo}</strong><p>${aviso.texto}</p><a href="#emergencias">Consultar la cola</a>` : '<strong>Notificaciones</strong><p>No hay alertas operativas activas.</p>';
}

export function avisoOperativo(datos) {
  const aviso = alertaOperativa(datos);
  if (!aviso) return '';
  return `<aside class="notice ${aviso.nivel}">${icono('alert')}<div><strong>${aviso.titulo}</strong><p>${aviso.texto}</p></div></aside>`;
}

export function panel(datos, casos, cola, pacientes, sesion, dias) {
  const metricas = [
    ['users', 'blue', 'Total registrados', pacientes.size, 'Pacientes únicos'],
    ['clock', 'amber', 'En espera', datos.espera, 'Pendientes de atención'],
    ['pulse', 'teal', 'En atención', datos.atencion, 'Atenciones en curso'],
    ['check', 'green', 'Atendidos', datos.atendido, 'Finalizados hoy'],
    ['clock', 'violet', 'Espera promedio', `<span id="average-wait">${datos.tiempoPromedio}</span> <small>min</small>`, 'Minutos por ingreso del panel'],
  ];
  return `${encabezado('Panel general', 'Seguimiento de ingresos, atención y ocupación de emergencias.', enlaceRegistro(sesion))}
    <section class="banner"><div><span class="banner-date">${icono('calendar')} ${formatoDia.format(new Date())}</span><h2>Servicio de emergencias</h2><p>Consulta el estado del servicio y la cola de pacientes.</p></div><a class="button banner-button" href="#emergencias">Ver cola de emergencias</a></section>
    <div id="dashboard-alert">${avisoOperativo(datos)}</div>
    <div class="metrics">${metricas.map(([simbolo, color, etiqueta, valor, detalle]) => `<article class="metric"><span class="metric-symbol ${color}">${icono(simbolo)}</span><h2>${etiqueta}</h2><strong>${valor}</strong><p>${detalle}</p></article>`).join('')}</div>
    <div class="charts">
      <section class="card chart-card"><div class="section-head"><div><h2>Actividad de emergencias</h2><p>Ingresos y atenciones finalizadas por día</p></div><select id="chart-days" aria-label="Periodo de actividad"><option value="7" ${dias === 7 ? 'selected' : ''}>Últimos 7 días</option><option value="3" ${dias === 3 ? 'selected' : ''}>Últimos 3 días</option></select></div><div id="activity-chart">${graficoActividad(casos, dias)}</div></section>
      <section class="card occupancy"><div class="section-head"><div><h2>Ocupación actual</h2><p>Puestos de atención simulados</p></div><span class="metric-symbol teal">${icono('pulse')}</span></div>
        <div class="ring" role="img" aria-label="Ocupación actual del ${datos.ocupacion} por ciento" style="--fill:${Math.min(datos.ocupacion, 100)}%"><div><strong>${datos.ocupacion}%</strong><small>ocupación</small></div></div>
        <div class="occupancy-summary"><span><i class="legend-dot teal-dot"></i> En uso <strong>${datos.atencion}</strong></span><span><i class="legend-dot gray-dot"></i> Disponibles <strong>${Math.max(0, TURNOS - datos.atencion)}</strong></span></div>
      </section>
    </div>
    <section class="card table-card"><div class="section-head"><div><h2>Pacientes en espera</h2><p>Ordenados por prioridad y hora de ingreso</p></div><a class="button secondary" href="#emergencias">Ver cola completa</a></div><div id="dashboard-table">${tablaCola(cola.filter(caso => caso.estado === 'espera').slice(0, 5), pacientes, sesion, false)}</div></section>`;
}

export function graficoActividad(casos, dias) {
  const serie = actividad(casos, dias);
  const maximo = Math.max(4, Math.ceil(Math.max(...serie.flatMap(dia => [dia.ingresos, dia.atendidos])) / 4) * 4);
  const escalas = Array.from({ length: 5 }, (_, indice) => maximo - (indice * maximo / 4));
  const descripcion = serie.map(dia => `${dia.dia}, ${dia.ingresos} ingresos y ${dia.atendidos} atendidos`).join('; ');
  return `<div class="chart-legend"><span><i class="legend-dot blue-dot"></i> Ingresos</span><span><i class="legend-dot teal-dot"></i> Atendidos</span></div>
    <div class="chart" role="img" aria-label="${escapar(descripcion)}">
      <div class="chart-scale" aria-hidden="true">${escalas.map(valor => `<span>${valor}</span>`).join('')}</div>
      <div class="chart-grid" aria-hidden="true">${serie.map(dia => `<div class="chart-day" title="${dia.dia} · ${dia.ingresos} ingresos · ${dia.atendidos} atendidos"><div class="bars"><span class="bar bar-blue" style="--height:${dia.ingresos / maximo * 100}%"></span><span class="bar bar-teal" style="--height:${dia.atendidos / maximo * 100}%"></span></div><span class="chart-label">${dia.etiqueta}</span></div>`).join('')}</div>
    </div>`;
}

function opciones(datos, inicial) {
  return `<option value="">${inicial}</option>${Object.entries(datos).map(([valor, texto]) => `<option value="${valor}">${texto}</option>`).join('')}`;
}

export function colaVista(sesion, datos) {
  return `${encabezado('Cola de emergencias', 'Consulta los ingresos y el estado de atención de cada paciente.', enlaceRegistro(sesion))}
    <div id="queue-alert">${avisoOperativo(datos)}</div><section class="card table-card">
      <div class="filters"><label class="search-field"><span class="sr-only">Buscar paciente</span>${icono('search')}<input id="queue-search" type="search" placeholder="Buscar por nombre o DNI"></label>
      <label><span class="sr-only">Estado</span><select id="queue-state">${opciones(ESTADOS, 'Todos los estados')}</select></label>
      <label><span class="sr-only">Prioridad</span><select id="queue-priority">${opciones(PRIORIDADES, 'Todas las prioridades')}</select></label></div>
      <div id="queue-results"></div><p id="queue-count" class="table-count" aria-live="polite"></p>
    </section>`;
}

export function prioridad(caso) {
  return `<span class="badge priority-${caso.prioridad}">${PRIORIDADES[caso.prioridad]}</span>`;
}

export function tablaCola(cola, pacientes, sesion, mostrarAcciones = true) {
  if (!cola.length) return '<p class="empty">No hay pacientes que coincidan con la consulta.</p>';
  const puedeActualizar = mostrarAcciones && sesion.permisos.includes('estado');
  return `<div class="table-scroll"><table><thead><tr><th>Paciente</th><th>Prioridad</th><th>Estado</th><th>Ingreso</th><th>Espera</th>${puedeActualizar ? '<th>Acción</th>' : ''}</tr></thead>
    <tbody>${cola.map(caso => {
      const paciente = pacientes.get(caso.dni);
      const espera = minutosEspera(caso);
      const siguiente = caso.estado === 'espera' ? 'atencion' : 'atendido';
      const accion = caso.estado === 'espera' ? 'Iniciar atención' : 'Finalizar atención';
      return `<tr><td><div class="patient"><span class="patient-avatar">${escapar(iniciales(paciente.nombre))}</span><div><strong>${escapar(paciente.nombre)}</strong><small>DNI ${paciente.dni}</small></div></div></td>
        <td>${prioridad(caso)}</td><td><span class="badge state-${caso.estado}">${ESTADOS[caso.estado]}</span></td>
        <td><time datetime="${new Date(caso.ingreso).toISOString()}">${fechaCompleta(caso.ingreso)}</time></td>
        <td data-wait="${caso.id}" class="${caso.estado === 'espera' && espera >= ALERTA_ESPERA ? 'late' : ''}">${espera} min</td>
        ${puedeActualizar ? `<td>${caso.estado === 'atendido' ? '—' : `<button type="button" class="button secondary compact" data-case="${caso.id}" data-next="${siguiente}">${accion}</button>`}</td>` : ''}</tr>`;
    }).join('')}</tbody></table></div>`;
}

export function registroVista() {
  const ahora = new Date();
  return `${encabezado('Registrar paciente', 'Crea un ingreso con datos ficticios y la prioridad indicada por personal sanitario.')}
    <form id="registration-form" class="card form-card">
      <div class="form-section"><h2>Datos del paciente</h2><div class="form-grid">
      <label>DNI <input name="dni" required inputmode="numeric" pattern="[0-9]{8}" maxlength="8" placeholder="8 dígitos"></label>
      <label>Nombres y apellidos <input name="nombre" required maxlength="100" placeholder="Ej. Lucía Mendoza"></label>
      <label>Edad (años) <input name="edad" type="number" required min="0" max="120" step="1" placeholder="Ej. 35"></label>
      </div></div>
      <div class="form-section"><h2>Datos del ingreso</h2><div class="form-grid">
      <label>Fecha de ingreso <input name="fecha" type="date" required value="${fechaLocal(ahora)}"></label>
      <label>Hora de ingreso <input name="hora" type="time" required value="${horaLocal(ahora)}"></label>
      <label>Prioridad asignada <select name="prioridad" required>${opciones(PRIORIDADES, 'Seleccionar prioridad')}</select></label>
      <label class="full-field">Motivo de ingreso <textarea name="motivo" required minlength="3" maxlength="280" rows="4" placeholder="Describe el motivo del ingreso ficticio"></textarea></label>
      </div></div>
      <p id="registration-error" class="form-error" role="alert" hidden></p>
      <div class="form-actions"><a class="button secondary" href="#emergencias">Cancelar</a><button type="submit" class="button primary">${icono('check')} Guardar ingreso</button></div>
    </form>`;
}

export function historialVista() {
  return `${encabezado('Historial médico', 'Busca un paciente para consultar sus atenciones y registrar observaciones ficticias.')}
    <section class="card table-card"><div class="filters"><label class="search-field"><span class="sr-only">Buscar en el historial</span>${icono('search')}<input id="history-search" type="search" placeholder="Buscar por nombre o DNI"></label></div>
    <div id="history-results"></div><p id="history-count" class="table-count" aria-live="polite"></p></section>`;
}

export function tablaHistorial(pacientes, casos) {
  if (!pacientes.length) return '<p class="empty">No se encontraron pacientes.</p>';
  return `<div class="table-scroll"><table><thead><tr><th>Paciente</th><th>Edad</th><th>Atenciones registradas</th><th>Último ingreso</th><th>Acción</th></tr></thead>
    <tbody>${pacientes.map(paciente => {
      const ingresos = casos.filter(caso => caso.dni === paciente.dni);
      const reciente = Math.max(...ingresos.map(caso => caso.ingreso));
      return `<tr><td><div class="patient"><span class="patient-avatar">${escapar(iniciales(paciente.nombre))}</span><div><strong>${escapar(paciente.nombre)}</strong><small>DNI ${paciente.dni}</small></div></div></td>
        <td>${paciente.edad} años</td><td>${ingresos.length}</td><td>${ingresos.length ? fechaCompleta(reciente) : '—'}</td><td><button type="button" class="button secondary compact" data-history="${paciente.dni}">Ver historial</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
}

export function detalleHistorial(paciente, casos, id) {
  const ingresos = casos.filter(caso => caso.dni === paciente.dni).sort((a, b) => b.ingreso - a.ingreso);
  const actual = ingresos.find(caso => caso.id === id) ?? ingresos[0];
  return `<div class="dialog-head"><div><h2 id="dialog-title">${escapar(paciente.nombre)}</h2><p>DNI ${paciente.dni} · ${paciente.edad} años</p></div><button type="button" id="close-dialog" class="icon-button" aria-label="Cerrar historial">${icono('close')}</button></div>
    <div class="dialog-body">${actual ? `<label>Atención registrada <select id="visit-select">${ingresos.map(caso => `<option value="${caso.id}" ${caso.id === actual.id ? 'selected' : ''}>${fechaCompleta(caso.ingreso)} · ${ESTADOS[caso.estado]}</option>`).join('')}</select></label>
    <div class="visit-detail"><div>${prioridad(actual)} <span class="badge state-${actual.estado}">${ESTADOS[actual.estado]}</span></div><dl><div><dt>Motivo de ingreso</dt><dd>${escapar(actual.motivo)}</dd></div><div><dt>Antecedentes</dt><dd>${escapar(actual.antecedentes || 'Sin antecedentes ficticios registrados.')}</dd></div>
    ${actual.inicio !== null ? `<div><dt>Inicio de atención</dt><dd>${fechaCompleta(actual.inicio)}</dd></div>` : ''}${actual.fin !== null ? `<div><dt>Fin de atención</dt><dd>${fechaCompleta(actual.fin)}</dd></div>` : ''}</dl></div>
    <h3>Observaciones médicas</h3>${actual.observaciones.length ? `<ul class="notes">${actual.observaciones.map(nota => `<li><small>${escapar(nota.autor)} · ${fechaCompleta(nota.fecha)}</small><p>${escapar(nota.texto)}</p></li>`).join('')}</ul>` : '<p class="muted">Aún no hay observaciones en esta atención.</p>'}
    <form id="observation-form" data-visit="${actual.id}"><label>Nueva observación <textarea name="observacion" rows="3" required minlength="3" maxlength="600" placeholder="Ingresa una observación ficticia"></textarea></label><p class="form-error" role="alert" hidden></p><button class="button primary" type="submit">Guardar observación</button></form>` : '<p>No hay atenciones registradas.</p>'}</div>`;
}
