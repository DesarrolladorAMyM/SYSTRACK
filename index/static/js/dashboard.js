// ============================================================
// dashboard.js — SYSTRAKER
// ============================================================

const BASE = '/SYSTRACK';

const API = {
  catalogos:         `${BASE}/inventario/api/catalogos/`,
  municipios:        (dpto_id) => `${BASE}/inventario/api/municipios/${dpto_id}/`,
  dispositivos:      `${BASE}/inventario/api/dispositivos/`,
  dispositivo:       (pk) => `${BASE}/inventario/api/dispositivos/${pk}/`,
  crearDev:          `${BASE}/inventario/api/dispositivos/crear/`,
  editarDev:         (pk) => `${BASE}/inventario/api/dispositivos/${pk}/editar/`,
  eliminarDev:       (pk) => `${BASE}/inventario/api/dispositivos/${pk}/eliminar/`,
  historial:         `${BASE}/inventario/api/historial/`,
  crearHist:         `${BASE}/inventario/api/historial/crear/`,
  CentroOperaciones: `${BASE}/inventario/api/centro-operaciones/`,
  inactivos:         `${BASE}/inventario/api/inactivos/`,
  editarInactivo:    (pk) => `${BASE}/inventario/api/inactivos/${pk}/editar/`,
  colaboradores:     `${BASE}/inventario/api/colaboradores/`,
  crearColab:        `${BASE}/inventario/api/colaboradores/crear/`,
  cargosColab:       `${BASE}/inventario/api/colaboradores/cargos/`,
  asignar:           (id) => `${BASE}/inventario/api/colaboradores/${id}/asignar/`,
  eliminarAsignacion: (colabId, devId) => `${BASE}/inventario/api/colaboradores/${colabId}/asignar/${devId}/eliminar/`,
  acta:              (id) => `${BASE}/inventario/api/colaboradores/${id}/acta/`,
  actaDetalle:       (id) => `${BASE}/inventario/api/actas/${id}/`,
  cargaMasiva:       `${BASE}/inventario/api/dispositivos/carga-masiva/`,
  dashStats:         `${BASE}/inventario/api/dashboard/stats/`,
  misReqTic:         `${BASE}/inventario/api/mis-req-tic/`,
  todosReqTic:       `${BASE}/inventario/api/todos-req-tic/`,
  historialReqTic:   `${BASE}/inventario/api/historial-req-tic/`,
  colabTi:           `${BASE}/inventario/api/colaboradores-ti/`,
  categoriasReq:     `${BASE}/inventario/api/categorias-req/`,
  subcategoriasReq:  (categoriaId) => `${BASE}/inventario/api/subcategorias-req/?categoria_id=${categoriaId}`,
  reqTicAccion:      (id) => `${BASE}/inventario/api/req-tic/${id}/accion/`,
  notificacionesBell: `${BASE}/inventario/api/notificaciones-bell/`,
  marcarLeidaBell:    `${BASE}/inventario/api/notificaciones-bell/marcar-leida/`,

  // ── Checklist de Inventario ──
  checklistStats:        `${BASE}/inventario/api/checklist/stats/`,
  checklistTiposDisponibles: `${BASE}/inventario/api/checklist/tipos-disponibles/`,
  checklistDispositivos: `${BASE}/inventario/api/checklist/dispositivos/`,
  checklistDispositivoGuardar: (pk) => `${BASE}/inventario/api/checklist/dispositivos/${pk}/guardar/`,
  checklist:          `${BASE}/inventario/api/checklist/`,
  checklistDetalle:   (pk) => `${BASE}/inventario/api/checklist/${pk}/`,
  checklistEditar:    (pk) => `${BASE}/inventario/api/checklist/${pk}/editar/`,
  checklistPdf:       (pk) => `${BASE}/inventario/api/checklist/${pk}/pdf/`,
  checklistColaboradorBuscar: `${BASE}/inventario/api/checklist/colaborador-buscar/`,
  checklistMiResponsable: `${BASE}/inventario/api/checklist/mi-responsable/`,
  checklistItems:     `${BASE}/inventario/api/checklist/items/`,
  checklistItemCrear: `${BASE}/inventario/api/checklist/items/crear/`,
  checklistItemEditar:(pk) => `${BASE}/inventario/api/checklist/items/${pk}/editar/`,

  // ── Novedades Generales ──
  novedadesTipos:       `${BASE}/inventario/api/novedades/tipos/`,
  novedadesTipoCrear:   `${BASE}/inventario/api/novedades/tipos/crear/`,
  novedadesTipoEditar:  (pk) => `${BASE}/inventario/api/novedades/tipos/${pk}/editar/`,
  novedadesCampos:      `${BASE}/inventario/api/novedades/campos/`,
  novedadesCampoCrear:  `${BASE}/inventario/api/novedades/campos/crear/`,
  novedadesCampoEditar: (pk) => `${BASE}/inventario/api/novedades/campos/${pk}/editar/`,
  novedadesLista:       `${BASE}/inventario/api/novedades/`,
  novedadesGuardar:     `${BASE}/inventario/api/novedades/guardar/`,
  novedadesDetalle:     (pk) => `${BASE}/inventario/api/novedades/${pk}/`,
  novedadesAdjuntar:      (pk) => `${BASE}/inventario/api/novedades/${pk}/adjuntar/`,
  novedadesAdjuntoEliminar: (pk) => `${BASE}/inventario/api/novedades/adjuntos/${pk}/eliminar/`,
  novedadesAdjuntosZip:   (pk) => `${BASE}/inventario/api/novedades/${pk}/adjuntos/zip/`,

  // ── Préstamo de Equipos ──
  equiposAdmin:        `${BASE}/inventario/api/prestamo-equipos/`,
  equiposAdminCat:     `${BASE}/inventario/api/prestamo-equipos/catalogos/`,
  equipoAdminGuardar:  `${BASE}/inventario/api/prestamo-equipos/guardar/`,
  equipoAdminEliminar: (pk) => `${BASE}/inventario/api/prestamo-equipos/${pk}/eliminar/`,
  equipoAdminHistorial: (pk) => `${BASE}/inventario/api/prestamo-equipos/${pk}/historial/`,
};
let CAT = {};

let invData   = [], invPage = 1, invPageSize = 10, invSort = 'serial', invSortAsc = true;
let inacData  = [], inacPage = 1, inacPageSize = 10, inacSort = 'serial', inacSortAsc = true;
let colabData = [], colabPage = 1, colabPageSize = 10, colabSort = 'nombre', colabSortAsc = true;
let ccColabData = [], ccColabPage = 1, ccColabPageSize = 10, ccColabQuery = '';
let histData = [], histPage = 1, histPageSize = 10;

let editingId   = null;
let detailId    = null;
let colabEditId = null;
let tempDevices = [];

let invLoading   = false;
let inacLoading  = false;
let colabLoading = false;

// FLAG: bloquea listeners mientras poblarSelects está en curso
let _suppressChange = false;

let carouselIdx = 0, carouselTimer = null;
const CPSLIDE = 3;

let sigPads = {};

let _chkRespuestas = {};
let _chkTextos = {};
const ESTADOS_INACTIVOS_UI = ['ELIMINADO', 'OBSOLETO', 'DEVUELTO'];

// ============================================================
// FETCH HELPERS
// ============================================================
function getCookie(name) {
  const val   = `; ${document.cookie}`;
  const parts = val.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

async function apiFetch(url, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
  };
  if (body) opts.body = JSON.stringify(body);
  try {
    const res = await fetch(url, opts);

    // Sesión expirada → Django redirige (302) y devuelve la página de login
    if (res.redirected || res.url.includes('/login') || res.url === window.location.origin + '/SYSTRACK/') {
      showNotif('Sesión expirada', 'Tu sesión ha expirado. Redirigiendo al login…', 'error', 4000);
      setTimeout(() => { window.location.href = '/SYSTRACK/'; }, 2000);
      return { ok: false, error: 'Sesión expirada' };
    }

    const text = await res.text();

    if (text.trimStart().startsWith('<')) {
      // Respuesta HTML inesperada — probablemente error 500 del servidor
      console.error('Respuesta HTML inesperada del servidor:', res.status, url);
      showNotif('Error del servidor', `El servidor respondió con un error (${res.status}). Revisa la consola.`, 'error', 5000);
      return { ok: false, error: `Error del servidor (${res.status})` };
    }

    try {
      return JSON.parse(text);
    } catch {
      console.error('Respuesta no es JSON:', text);
      return { ok: false, error: `Error del servidor (${res.status}) — revisa la consola` };
    }
  } catch (e) {
    console.error('API error:', e);
    return { ok: false, error: String(e) };
  }
}

// NOTIFICACIONES

function showNotif(title, msg, type = 'success', duration = 3500) {
  const nc = document.getElementById('notificationContainer');
  const n  = document.createElement('div');
  n.className = `notification ${type}`;
  n.innerHTML = `
    <div class="notification-icon">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
    </div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${msg}</div>
    </div>
    <div class="notification-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </div>`;
  nc.appendChild(n);
  setTimeout(() => n.remove(), 4500);
}

function showNotification(type, title, msg) {
  showNotif(title, msg, type);
}

 // CERRAR SESION 
function cerrarSesion() {
  showNotif('Sesión cerrada', 'Has cerrado sesión correctamente', 'success');
  setTimeout(() => {
    window.location.href = '/SYSTRACK/logout/';
  }, 1500);  // espera 1.5s para que se vea la notificación y luego redirige
}


// NAVEGACIÓN

// Buscadores/filtros a limpiar al entrar a cada sección, para no arrastrar
// una búsqueda vieja de una visita anterior (mismo criterio que resetCC).
// Solo se listan los inputs y la variable de página; las funciones de carga
// de cada sección ya leen esos inputs en vivo, así que basta con vaciarlos
// antes de que esas funciones se ejecuten.
const FILTROS_SECCION = {
  'inventario':               { inputs: ['inv-search', 'inv-filter-tipo', 'inv-filter-estado'], onReset: () => { invPage = 1; } },
  'inactivos':                { inputs: ['inac-search', 'inac-filter-tipo', 'inac-filter-estado'], onReset: () => { inacPage = 1; } },
  'colaboradores':            { inputs: ['colab-search'], onReset: () => { colabPage = 1; } },
  'prestamo-equipos':         { inputs: ['equipo-search'] },
  'mis-requerimientos':       { inputs: ['req-search'], onReset: () => { reqActPage = 1; reqCerPage = 1; } },
  'gestion-usuarios':         { inputs: ['usr-search'], onReset: () => { usrPage = 1; } },
  'asignar-requerimientos':   { inputs: ['asig-search'], onReset: () => { asigPage = 1; } },
  'historial-requerimientos': { inputs: ['hreq-search'], onReset: () => { hreqPage = 1; } },
  'checklist':                { inputs: [], onReset: () => { _resetChecklistScreen(); } },
  'novedades':                { inputs: ['nov-search', 'nov-filter-tipo', 'nov-filter-desde', 'nov-filter-hasta'], onReset: () => { novPage = 1; } },
};

function resetFiltrosSeccion(id) {
  const cfg = FILTROS_SECCION[id];
  if (!cfg) return;
  cfg.inputs.forEach(inputId => {
    const el = document.getElementById(inputId);
    if (el) el.value = '';
  });
  if (cfg.onReset) cfg.onReset();
}

// Reinicia filtros y resultados de Historial de Equipo al entrar a la
// pantalla — hoy es la única sección que showScreen no recargaba en absoluto.
function resetHistorialEquipo() {
  ['hist-tipo', 'hist-serial'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  histData = [];
  histPage = 1;
  const wrap = document.getElementById('hist-resultado-wrap');
  const card = wrap && wrap.querySelector('.hist-ficha-card');
  if (card) card.remove();
  const initial = document.getElementById('hist-initial');
  if (initial) initial.style.display = '';
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const t = document.getElementById('screen-' + id);
  if (t) t.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const mb = document.querySelector(`.nav-btn[data-screen="${id}"]`);
  if (mb) mb.classList.add('active');

  document.querySelectorAll('.sub-btn').forEach(b => b.classList.remove('active'));
  const sb = document.querySelector(`.sub-btn[data-screen="${id}"]`);
  if (sb) sb.classList.add('active');

  // Reset flags para que una carga anterior bloqueada no impida la nueva
  invLoading   = false;
  inacLoading  = false;
  colabLoading = false;

  // Limpia buscadores/filtros de la sección antes de que sus funciones de
  // carga lean esos inputs, para no arrastrar una búsqueda de una visita anterior
  resetFiltrosSeccion(id);

  if (id === 'inventario')              loadInventario();
  if (id === 'inactivos')               loadInactivos();
  if (id === 'colaboradores')           loadColaboradores();
  if (id === 'dashboard')               loadDashboard();
  if (id === 'indicadores')             cargarIndicadores();
  if (id === 'mis-requerimientos')      cargarRequerimientos();
  if (id === 'asignar-requerimientos')  cargarAsignar();
  if (id === 'historial-requerimientos') cargarHistorialReq();
  if (id === 'prestamo-equipos')        loadEquiposAdmin();
  if (id === 'centro-costo')            resetCC();
  if (id === 'historial-equipo')        resetHistorialEquipo();
  if (id === 'novedades')               loadNovedades();

  _aplicarSoloLecturaEnPantalla(id);
}

// ── Solo lectura: oculta los botones de escritura de una pantalla cuando
// el backend (screens_solo_lectura, ver context_processors.permisos_menu)
// dice que el usuario solo puede ver, no crear/editar/eliminar. El backend
// ya rechaza estas acciones igual (requiere_pantalla en las vistas) — esto
// es solo para que ni aparezca el botón.
const SOLO_LECTURA_BTN_SELECTOR = '.btn-create, .tbl-btn.edit, .tbl-btn.del, [onclick="abrirAdminTiposNovedad()"]';

function _pantallaEsSoloLectura(screenKey) {
  return Array.isArray(window.SCREENS_SOLO_LECTURA) && window.SCREENS_SOLO_LECTURA.includes(screenKey);
}

function _aplicarSoloLecturaEnPantalla(screenKey) {
  if (!_pantallaEsSoloLectura(screenKey)) return;
  const seccion = document.getElementById('screen-' + screenKey);
  if (!seccion) return;
  seccion.querySelectorAll(SOLO_LECTURA_BTN_SELECTOR).forEach(btn => { btn.style.display = 'none'; });
}

// Las tablas se repintan de forma asíncrona (tras el fetch de cada pantalla),
// así que un solo pase en showScreen() no alcanza para los botones de
// Editar/Eliminar que se generan por fila — este observer vuelve a aplicar
// el ocultado cada vez que el contenido de la pantalla activa cambia.
document.addEventListener('DOMContentLoaded', () => {
  const contenedor = document.querySelector('.content-area') || document.body;
  new MutationObserver(() => {
    const activa = document.querySelector('.screen.active');
    if (activa) _aplicarSoloLecturaEnPantalla(activa.id.replace('screen-', ''));
  }).observe(contenedor, { childList: true, subtree: true });
});

// Reinicia filtros y resultados de Centro de Costos al entrar a la pantalla,
// para no arrastrar una consulta vieja de una visita anterior.
function resetCC() {
  ['cc-co', 'cc-prop', 'cc-tipo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ccColabData  = [];
  ccColabPage  = 1;
  ccColabQuery = '';
  const statsRow = document.getElementById('cc-stats-row');
  if (statsRow) statsRow.style.display = 'none';
  const wrap = document.getElementById('cc-results-wrap');
  if (wrap) {
    wrap.innerHTML = `
      <div class="cc-empty">
        <div class="cc-empty-icon"><i class="fas fa-filter"></i></div>
        <p>Aplica los filtros y presiona <strong>Consultar</strong></p>
        <small>Se mostrarán los dispositivos agrupados por tipo</small>
      </div>`;
  }
}

function toggleSubmenu(smId, btnId) {
  const sm   = document.getElementById(smId);
  const btn  = document.getElementById(btnId);
  const open = sm.classList.contains('visible');
  document.querySelectorAll('.submenu').forEach(s => s.classList.remove('visible'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('open'));
  if (!open) { sm.classList.add('visible'); btn.classList.add('open'); }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}


// CATÁLOGOS

async function loadCatalogos() {
  const res = await apiFetch(API.catalogos);
  if (!res.ok) { showNotif('Error', 'No se pudieron cargar los catálogos', 'warning'); return; }
  CAT = res.data;
  poblarSelects();
}

function poblarSelects() {
  //  Activar flag ANTES de tocar cualquier select 
  _suppressChange = true;

  function _fillSilent(selectId, items, valKey, labelKey) {
    const el = document.getElementById(selectId);
    if (!el) return;
    const current = el.value;
    el.innerHTML = '<option value="">Seleccione</option>' +
      items.map(i => `<option value="${i[valKey]}">${i[labelKey]}</option>`).join('');
    if (current) el.value = current;
  }

  const tipoOpts = CAT.tipos_dispositivo || [];
  ['f-tipo', 'hf-tipo', 'inac-f-tipo', 'as-tipo-device',
   'inv-filter-tipo', 'inac-filter-tipo', 'hist-tipo', 'cc-tipo', 'chk-item-tipo',
  ].forEach(id => _fillSilent(id, tipoOpts, 'g200_id', 'g200_tipo_dispositivo'));

  const mapaFiltroEl = document.getElementById('mapaFiltro');
  if (mapaFiltroEl) {
    mapaFiltroEl.innerHTML = '<option value="">Todos los tipos</option>' +
      tipoOpts.map(t =>
        `<option value="${t.g200_tipo_dispositivo}">${t.g200_tipo_dispositivo}</option>`
      ).join('');
  }

  ['f-marca', 'inac-f-marca'].forEach(id =>
    _fillSilent(id, CAT.marcas || [], 'g202_id', 'g202_marca')
  );

  const propOpts = CAT.propietarios || [];
  ['f-prop', 'hf-prop', 'inac-f-prop', 'cc-prop'].forEach(id =>
    _fillSilent(id, propOpts, 'g203_id', 'g203_propietario')
  );

  // Centros de Operaciones → para inventario, historial, inactivos
  const coOpsOpts = (CAT.centros_operaciones || []).map(c => ({
    id:    c.g207_id,
    label: `${c.g207_co} — ${c.g207_descripcion_co}`,
  }));
  ['f-co', 'hf-co', 'inac-f-co'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">Seleccione</option>' +
      coOpsOpts.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
  });

  // Centros de Costo → solo para el módulo de Centro de Costos
  const coOpts = (CAT.centros_costo || []).map(c => ({
    id:    c.g228_id,
    label: c.g228_nombre,
  }));
  const ccCoEl = document.getElementById('cc-co');
  if (ccCoEl) {
    ccCoEl.innerHTML = '<option value="">Todos los centros</option>' +
      coOpts.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
  }
  const colabAreaEl = document.getElementById('colab-f-area');
  if (colabAreaEl) {
    colabAreaEl.innerHTML = '<option value="">Seleccione</option>' +
      coOpts.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
  }
  // Proceso / Área (Acta) → misma fuente que Centros de Costo (tabla j228_Area)
 const actaProcesoEl = document.getElementById('acta-proceso');
  if (actaProcesoEl) {
    const current = actaProcesoEl.value;
    actaProcesoEl.innerHTML = '<option value="">Seleccione una opción</option>' +
      coOpts.map(c => `<option value="${c.label}">${c.label}</option>`).join('');
    if (current) actaProcesoEl.value = current;
  }

  // Tipo Acta (ENTREGA, DEVOLUCIÓN, TRASLADO...) → catálogo dinámico j233_tipo_acta
  const actaTipoEl = document.getElementById('acta-tipo');
  if (actaTipoEl) {
    const current = actaTipoEl.value;
    actaTipoEl.innerHTML = '<option value="">Seleccione una opción</option>' +
      (CAT.tipos_acta || []).map(t =>
        `<option value="${t.g233_tipo_acta}">${t.g233_tipo_acta}</option>`
      ).join('');
    if (current) actaTipoEl.value = current;
  }

  _fillSilent('hf-novedad', CAT.tipos_novedad || [], 'g220_id', 'g220_novedad');
  _fillSilent('f-dpto', CAT.departamentos || [], 'g204_id', 'g204_departamento');

  const estOpts = CAT.estados || [];
  const invEstEl = document.getElementById('inv-filter-estado');
  if (invEstEl) {
    invEstEl.innerHTML = '<option value="">Todos los estados</option>' +
      estOpts.map(e => `<option value="${e.g201_id}">${e.g201_descripcion}</option>`).join('');
  }
  const inacEstEl = document.getElementById('inac-filter-estado');
  if (inacEstEl) {
    inacEstEl.innerHTML = '<option value="">Todos los estados</option>' +
      estOpts.map(e => `<option value="${e.g201_id}">${e.g201_descripcion}</option>`).join('');
  }

  _fillSilent('f-estado',      estOpts, 'g201_id', 'g201_descripcion');
  _fillSilent('inac-f-estado', estOpts, 'g201_id', 'g201_descripcion');
  _fillSilent('colab-f-estado', estOpts, 'g201_id', 'g201_descripcion');
  _fillSilent('hf-resp', propOpts, 'g203_id', 'g203_propietario');

  // ── Desactivar flag DESPUÉS de poblar todos los selects ──
  _suppressChange = false;
}

async function loadMunicipios() {
  const dptoId = document.getElementById('f-dpto').value;
  const sel    = document.getElementById('f-municipio');
  sel.innerHTML = '<option value="">Cargando...</option>';
  if (!dptoId) {
    sel.innerHTML = '<option value="">Seleccione departamento primero</option>';
    return;
  }
  const res = await apiFetch(API.municipios(dptoId));
  if (!res.ok) { sel.innerHTML = '<option value="">Error al cargar</option>'; return; }
  sel.innerHTML = '<option value="">Seleccione</option>' +
    res.data.map(m => `<option value="${m.g205_id}">${m.g205_municipio}</option>`).join('');
}
function animateCount(element, targetValue, duration = 1200) {
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed  = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cúbico
    element.textContent = Math.round(eased * targetValue).toLocaleString('es-CO');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}



// DASHBOARD

async function loadDashboard() {
  const res = await apiFetch(API.dashStats);
  if (!res.ok) { showNotif('Error', 'No se pudieron cargar las estadísticas', 'warning'); return; }
  const { tipos, activos, inactivos, ubicaciones } = res.data;

  const elA = document.getElementById('totalActivos');
  const elI = document.getElementById('totalInactivos');
// DESPUÉS — con animación count-up
if (elA) animateCount(elA, activos,   1400);
if (elI) animateCount(elI, inactivos, 1000);



  const fechaEl = document.getElementById('sidebar-fecha-corte');
  if (fechaEl) {
    const now = new Date();
    fechaEl.textContent = now.toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  buildCarousel(tipos);
  startCarouselAuto();
  setTimeout(() => initMapa(ubicaciones), 200);
}

function buildCarousel(tipos) {
  const track = document.getElementById('carouselTrack');
  const ctrl  = document.getElementById('carouselControls');
  if (!track || !ctrl) return;
  track.innerHTML = '';
  ctrl.innerHTML  = '';
  if (!tipos || tipos.length === 0) {
    track.innerHTML = '<div class="carousel-slide" style="min-width:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);font-size:14px;padding:20px;">Sin dispositivos registrados</div>';
    return;
  }
  const slides = Math.ceil(tipos.length / CPSLIDE);

  for (let s = 0; s < slides; s++) {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    tipos.slice(s * CPSLIDE, s * CPSLIDE + CPSLIDE).forEach(eq => {
      const c = document.createElement('div');
      c.className = 'equipo-card';
      c.innerHTML = `
        <img src="${eq.src}" alt="${eq.label}"
             onerror="this.src='https://img.icons8.com/fluency/96/server.png'">
        <div class="eq-label">${eq.label}</div>
        <div class="eq-value">${eq.value.toLocaleString('es-CO')}</div>`;
      slide.appendChild(c);
    });
    track.appendChild(slide);
  }

  const prev = document.createElement('button');
  prev.className = 'carousel-btn';
  prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prev.onclick   = () => goCarousel(carouselIdx - 1);
  ctrl.appendChild(prev);

  for (let s = 0; s < slides; s++) {
    const dot = document.createElement('div');
    dot.className = 'carousel-dot' + (s === 0 ? ' active' : '');
    dot.onclick   = () => goCarousel(s);
    dot.id        = 'cdot-' + s;
    ctrl.appendChild(dot);
  }

  const next = document.createElement('button');
  next.className = 'carousel-btn';
  next.innerHTML = '<i class="fas fa-chevron-right"></i>';
  next.onclick   = () => goCarousel(carouselIdx + 1);
  ctrl.appendChild(next);

  goCarousel(0);
}

function goCarousel(idx) {
  const track = document.getElementById('carouselTrack');
  if (!track) return;
  const slides = track.children.length;
  if (slides === 0) return;
  carouselIdx = ((idx % slides) + slides) % slides;
  track.style.transform = `translateX(-${carouselIdx * 100}%)`;
  document.querySelectorAll('.carousel-dot').forEach((d, i) =>
    d.classList.toggle('active', i === carouselIdx)
  );
}

function startCarouselAuto() {
  stopCarouselAuto();
  carouselTimer = setInterval(() => goCarousel(carouselIdx + 1), 5000);
}
function stopCarouselAuto() {
  if (carouselTimer) { clearInterval(carouselTimer); carouselTimer = null; }
}

let mapaInstance = null, mapaMarkers = [];
let mapaUbicacionesCache = [];

function initMapa(ubicaciones) {
  mapaUbicacionesCache = ubicaciones || [];
  if (!mapaInstance) {
    mapaInstance = L.map('mapaColombia', {
      zoomControl: true, scrollWheelZoom: false,
    }).setView([4.5709, -74.2973], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18,
    }).addTo(mapaInstance);
  }
  renderMapaMarkers('');
}

function renderMapaMarkers(filtro) {
  mapaMarkers.forEach(m => mapaInstance.removeLayer(m));
  mapaMarkers = [];
  const colorMap = {
    'celular':             '#e74c3c',
    'portatil':            '#2980b9',
    'portatil':            '#2980b9',
    'torre de escritorio': '#8e44ad',
    'impresora':           '#27ae60',
    'tablet':              '#f39c12',
    'pantalla':            '#16a085',
    'modem wifi':          '#d35400',
    'simcard':             '#c0392b',
    'diadema':             '#7f8c8d',
    'video beam':          '#2c3e50',
    'telefono fijo':       '#1abc9c',
    'periferico':          '#95a5a6',
    'licencia office':     '#2ecc71',
  };
  function norm(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  const datos = filtro
    ? mapaUbicacionesCache.filter(u => norm(u.tipo) === norm(filtro))
    : mapaUbicacionesCache;
  datos.forEach(u => {
    const color = colorMap[norm(u.tipo)] || '#1B4698';
    const icon  = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};
                   border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7],
    });
    const m = L.marker([u.lat, u.lng], { icon })
      .addTo(mapaInstance)
      .bindPopup(`<strong>${u.ciudad}</strong><br>Tipo: ${u.tipo}<br>Cantidad: ${u.cantidad}`);
    mapaMarkers.push(m);
  });
}

function filtrarMapa() {
  const filtro = document.getElementById('mapaFiltro').value;
  renderMapaMarkers(filtro);
}


// INVENTARIO

async function loadInventario() {
  if (invLoading || _suppressChange) return;
  invLoading = true;
  try {
    const q      = (document.getElementById('inv-search')        || {}).value || '';
    const tipo   = (document.getElementById('inv-filter-tipo')   || {}).value || '';
    const estado = (document.getElementById('inv-filter-estado') || {}).value || '';
    const params = new URLSearchParams();
    if (q)      params.set('q', q);
    if (tipo)   params.set('tipo', tipo);
    if (estado) params.set('estado', estado);
    const res = await apiFetch(`${API.dispositivos}?${params}`);
    if (!res.ok) { showNotif('Error', 'No se pudo cargar el inventario', 'warning'); return; }
    invData = res.data.dispositivos;
    const stats = res.data.stats;
    document.getElementById('stat-total').textContent = stats.total;
    // Renderizar tarjetas dinámicas por estado
    const estadosRow = document.getElementById('inv-stats-estados');
    if (estadosRow) {
      const COLORES = {
        'HABILITADO':       { borde: '#16a34a', bg: 'rgba(34,197,94,0.07)',  color: '#16a34a', icon: 'fa-check-circle' },
        'INHABILITADO':     { borde: '#ef4444', bg: 'rgba(239,68,68,0.07)',  color: '#ef4444', icon: 'fa-ban' },
        'ASIGNADO':         { borde: '#2563eb', bg: 'rgba(37,99,235,0.07)',  color: '#2563eb', icon: 'fa-user-check' },
        'EN MANTENIMIENTO': { borde: '#d97706', bg: 'rgba(245,158,11,0.07)', color: '#d97706', icon: 'fa-tools' },
        'DADO DE BAJA':     { borde: '#6b7280', bg: 'rgba(107,114,128,0.07)',color: '#6b7280', icon: 'fa-trash-alt' },
        'OBSOLETO':         { borde: '#7c3aed', bg: 'rgba(124,58,237,0.07)', color: '#7c3aed', icon: 'fa-archive' },
        'DEVUELTO':         { borde: '#0891b2', bg: 'rgba(8,145,178,0.07)',  color: '#0891b2', icon: 'fa-undo' },
      };
      estadosRow.innerHTML = (stats.por_estado || []).map(e => {
        const c = COLORES[e.estado] || { borde: '#94a3b8', bg: 'rgba(148,163,184,0.07)', color: '#64748b', icon: 'fa-circle' };
        return `<div class="inv-stat-card" style="border-left:3px solid ${c.borde}">
          <div class="inv-stat-icon" style="background:${c.bg};border-radius:10px;width:38px;height:38px">
            <i class="fas ${c.icon}" style="color:${c.color};font-size:16px"></i>
          </div>
          <div>
            <div class="inv-stat-val" style="color:${c.color}">${e.cantidad}</div>
            <div class="inv-stat-lbl">${e.estado}</div>
          </div>
        </div>`;
      }).join('');
    }
    invPage = 1;
    _renderInvTable();
  } finally {
    invLoading = false;
  }
}

function renderInventario() { loadInventario(); }

function _getInvSorted() {
  return [...invData].sort((a, b) => {
    const va = a[invSort] ?? '', vb = b[invSort] ?? '';
    return typeof va === 'string'
      ? (invSortAsc ? va.localeCompare(vb) : vb.localeCompare(va))
      : (invSortAsc ? va - vb : vb - va);
  });
}

function _renderInvTable() {
  const sorted  = _getInvSorted();
  const total   = sorted.length;
  const maxPage = Math.max(1, Math.ceil(total / invPageSize));
  if (invPage > maxPage) invPage = 1;
  const from  = (invPage - 1) * invPageSize;
  const slice = sorted.slice(from, from + invPageSize);
  document.getElementById('pag-from').textContent  = total === 0 ? 0 : from + 1;
  document.getElementById('pag-to').textContent    = Math.min(from + invPageSize, total);
  document.getElementById('pag-total').textContent = total;
  const tbody = document.getElementById('inv-tbody');
  tbody.innerHTML = slice.length === 0
    ? `<tr><td colspan="6"><div class="empty-state">
         <i class="fas fa-search"></i><p>No se encontraron dispositivos</p>
       </div></td></tr>`
    : slice.map(d => `
      <tr onclick="openDetail(${d.id})">
        <td><span class="serial-mono">${d.serial}</span></td>
        <td>${d.tipo}</td>
        <td>${d.marca}</td>
        <td><i class="fas fa-user" style="margin-right:6px;color:var(--gray-light);font-size:12px"></i>${d.propietario}</td>
        <td>${badgeHTML(d.estado)}</td>
        <td onclick="event.stopPropagation()">
          <div class="tbl-actions">
            <button class="tbl-btn info" onclick="openDetail(${d.id})"><i class="fas fa-info-circle"></i></button>
            <button class="tbl-btn edit" onclick="openEdit(${d.id})"><i class="fas fa-edit"></i></button>
            <button class="tbl-btn del"  onclick="openDelete(${d.id})"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>`).join('');
  renderPagination(total, maxPage);
}

function badgeHTML(estado) {
  const map = {
    'HABILITADO':   ['status-habilitado',   'dot-habilitado'],
    'INHABILITADO': ['status-inhabilitado', 'dot-inhabilitado'],
    'ASIGNADO':     ['status-asignado',     'dot-asignado'],
    'ELIMINADO':    ['status-eliminado',    'dot-eliminado'],
    'OBSOLETO':     ['status-obsoleto',     'dot-obsoleto'],
    'DEVUELTO':     ['status-devuelto',     'dot-devuelto'],
  };
  const [cls, dotCls] = map[estado] || ['status-habilitado', 'dot-habilitado'];
  return `<span class="status-badge ${cls}"><span class="dot ${dotCls}"></span>${estado}</span>`;
}

function renderPagination(total, maxPage) {
  const ctrl = document.getElementById('pag-controls');
  let html = `<button class="pag-btn" ${invPage <= 1 ? 'disabled' : ''} onclick="goPage(${invPage - 1})">
    <i class="fas fa-chevron-left"></i></button>`;
  buildPages(invPage, maxPage).forEach(p => {
    html += p === '...'
      ? `<span class="pag-btn" style="border:none;cursor:default">…</span>`
      : `<button class="pag-btn ${p === invPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
  });
  html += `<button class="pag-btn" ${invPage >= maxPage ? 'disabled' : ''} onclick="goPage(${invPage + 1})">
    <i class="fas fa-chevron-right"></i></button>`;
  ctrl.innerHTML = html;
}

function buildPages(cur, max) {
  if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1);
  const p = [1];
  if (cur > 3) p.push('...');
  for (let i = Math.max(2, cur - 1); i <= Math.min(max - 1, cur + 1); i++) p.push(i);
  if (cur < max - 2) p.push('...');
  p.push(max);
  return p;
}

function goPage(p) { invPage = p; _renderInvTable(); }
function changePageSize() {
  invPageSize = parseInt(document.getElementById('pag-size').value);
  invPage = 1;
  _renderInvTable();
}
function sortInv(field) {
  if (invSort === field) invSortAsc = !invSortAsc;
  else { invSort = field; invSortAsc = true; }
  invPage = 1;
  _renderInvTable();
}

function openCreateModal() {
  editingId = null;
  document.getElementById('formTitle').textContent  = 'Inventario — Crear';
  document.getElementById('formSub').textContent    = 'Complete los campos para registrar un nuevo dispositivo';
  document.getElementById('formIcon').className     = 'fas fa-plus';
  document.getElementById('btnSaveTxt').textContent = 'Crear dispositivo';
  clearForm();
  renderCaracteristicas('');
  document.getElementById('modalForm').classList.add('active');
}

async function openEdit(id) {
  editingId = id;
  _hideChecklistEditSection();
  const res = await apiFetch(API.dispositivo(id));
  if (!res.ok) { showNotif('Error', 'No se pudo cargar el dispositivo', 'warning'); return; }
  const d = res.data;
  document.getElementById('formTitle').textContent  = 'Inventario — Editar';
  document.getElementById('formSub').textContent    = `Editando serial ${d.serial}`;
  document.getElementById('formIcon').className     = 'fas fa-edit';
  document.getElementById('btnSaveTxt').textContent = 'Guardar cambios';
  await fillForm(d);
  document.getElementById('modalForm').classList.add('active');
  document.getElementById('modalDetail').classList.remove('active');
}

async function fillForm(d) {
  document.getElementById('f-tipo').value   = d.tipo_id   || '';
  document.getElementById('f-serial').value = d.serial    || '';
  document.getElementById('f-marca').value  = d.marca_id  || '';
  document.getElementById('f-prop').value   = d.propietario_id || '';
  document.getElementById('f-co').value     = d.co_id     || '';
  document.getElementById('f-obs').value    = d.observaciones || '';
  const dptoEl = document.getElementById('f-dpto');
  if (dptoEl && d.departamento_id) {
    dptoEl.value = d.departamento_id;
    await loadMunicipios();
    document.getElementById('f-municipio').value = d.municipio_id || '';
  }
  const fields = ['f-nombre-equipo', 'f-valor-promedio', 'f-valor-arrendamiento', 'f-estado'];
  const keys   = ['nombre_equipo', 'valor_promedio', 'valor_arrendamiento', 'estado_id'];
  fields.forEach((fid, i) => {
    const el = document.getElementById(fid);
    if (el) el.value = d[keys[i]] ?? '';
  });
  fillCaracteristicas(d.tipo, d.caracteristicas || {});
}

function clearForm() {
  const ids = ['f-tipo', 'f-serial', 'f-marca', 'f-prop', 'f-co',
             'f-estado', 'f-nombre-equipo', 'f-valor-promedio', 'f-valor-arrendamiento'];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const serialEl = document.getElementById('f-serial');
  if (serialEl) { serialEl.readOnly = false; serialEl.placeholder = ''; }
  const mun = document.getElementById('f-municipio');
  if (mun) mun.innerHTML = '<option value="">Seleccione</option>';
  const obs = document.getElementById('f-obs');
  if (obs) obs.value = '';
  renderCaracteristicas('');
  _hideChecklistEditSection();
}

async function saveDevice() {
  const tipo   = document.getElementById('f-tipo').value;
  const prop   = document.getElementById('f-prop').value;
  const co     = document.getElementById('f-co').value;
  const estado = document.getElementById('f-estado')?.value || '';
  const dpto   = document.getElementById('f-dpto').value;
  const mun    = document.getElementById('f-municipio').value;
  if (!tipo || !prop || !dpto || !mun) {
    showNotif('Campos requeridos', 'Completa todos los campos obligatorios (*)', 'warning');
    return;
  }

  // ── VALIDACIÓN SERIAL DUPLICADO ──
  const serial = document.getElementById('f-serial').value.trim();
  if (!editingId && serial) {
    const check = await apiFetch(`${BASE}/inventario/api/dispositivos/verificar-serial/?serial=${encodeURIComponent(serial)}`);
    if (check.ok && check.data.existe) {
      showNotif(
        'Serial duplicado',
        `El serial "${serial}" ya está registrado en el inventario. Verifica el equipo antes de continuar.`,
        'warning',
        6000
      );
      return;
    }
  }
  const body = {
    serial:              document.getElementById('f-serial').value.trim(),
    tipo_id:             tipo,
    marca_id:            document.getElementById('f-marca').value || null,
    propietario_id:      prop,
    estado_id:           estado || null,
    co_id:               co || null,
    nombre_equipo:       document.getElementById('f-nombre-equipo')?.value || '',
    valor_promedio:      document.getElementById('f-valor-promedio')?.value || null,
    valor_arrendamiento: document.getElementById('f-valor-arrendamiento')?.value || null,
    departamento_id:     dpto,
    municipio_id:        mun,
    observaciones:       document.getElementById('f-obs').value,
    caract:              buildCaracteristicasBody(),
  };
  if (editingId && document.getElementById('chkSectionEdit')?.style.display !== 'none') {
    const checklistPayload = _buildChecklistPayload();
    // Si la sección está visible es porque el tipo sí tiene preguntas (ver
    // _showChecklistEditSection) — no se puede pasar a un estado inactivo
    // sin responder ni una, igual que ya se exige en la pantalla Checklist.
    if (checklistPayload.respuestas.length === 0) {
      showNotif('Falta el checklist', 'Responde al menos una pregunta del checklist antes de guardar este cambio de estado.', 'warning');
      return;
    }
    body.checklist = checklistPayload;
  }
  const res = editingId
    ? await apiFetch(API.editarDev(editingId), 'PUT', body)
    : await apiFetch(API.crearDev, 'POST', body);
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo guardar', 'warning'); return; }
  showNotif(
    editingId ? ' Actualizado' : ' Dispositivo creado',
    `Serial ${res.data.serial} ${editingId ? 'modificado' : 'registrado'} correctamente`,
    'success'
  );
  closeModal('modalForm');
  loadInventario();
}

async function openDetail(id) {
  detailId = id;
  const res = await apiFetch(API.dispositivo(id));
  if (!res.ok) { showNotif('Error', 'No se pudo cargar el dispositivo', 'warning'); return; }
  const d = res.data;
  document.getElementById('det-serial').textContent = 'Serial: ' + d.serial;
  document.getElementById('det-name').textContent   = `${d.tipo} — ${d.marca}`;
  document.getElementById('det-badge').innerHTML    = badgeHTML(d.estado);
  const fmtMoneda = (v) => (v ? `$${Number(v).toLocaleString('es-CO')}` : '');
  const camposGeneral = [
    { l: 'Serial',      v: d.serial,      mono: true },
    { l: 'Tipo',        v: d.tipo },
    { l: 'Marca',       v: d.marca },
    { l: 'Propietario', v: d.propietario },
    { l: 'Estado',      v: d.estado },
    { l: 'CO',          v: d.co },
  ];
  document.getElementById('det-general').innerHTML = camposGeneral.map(f => `
    <div class="detail-field">
      <div class="detail-field-label">${f.l}</div>
      <div class="detail-field-value ${f.mono ? 'mono' : ''}">${f.v || '—'}</div>
    </div>`).join('');
 // ── Características (dict plano clave→valor desde el servidor) ──
  // Nombre del Equipo / Valor Promedio / Valor Arrendamiento van aquí (no en
  // Info General) — vienen del dispositivo (no del tipo), por eso se agregan
  // aparte antes que el resto. Se excluyen de 'caract': 'grupo' (uso interno),
  // *_id (IDs crudos — ya se muestra el nombre resuelto), la contraseña Gmail
  // (no se expone en el detalle) y nombre/valor (ya agregados arriba, para no
  // duplicarlos si el tipo también los trae dentro de "caracteristicas").
  const caract = d.caracteristicas || {};
  const CARACT_EXCLUIR = new Set(['grupo', 'contrasena_gmail', 'nombre_equipo', 'valor_promedio', 'valor_arrendamiento']);
  const camposCaract = [];
  if (d.nombre_equipo)      camposCaract.push({ l: 'Nombre del Equipo', v: d.nombre_equipo });
  if (d.valor_promedio)     camposCaract.push({ l: 'Valor Promedio', v: fmtMoneda(d.valor_promedio) });
  if (d.valor_arrendamiento) camposCaract.push({ l: 'Valor Arrendamiento', v: fmtMoneda(d.valor_arrendamiento) });
  camposCaract.push(...Object.entries(caract)
    .filter(([k, v]) => !CARACT_EXCLUIR.has(k) && !k.endsWith('_id') && v && v !== '—')
    .map(([k, v]) => ({ l: CARACT_LABELS[k] || k, v })));

  document.getElementById('det-caract').innerHTML = camposCaract.length > 0
    ? camposCaract.map(f => `
        <div class="detail-field">
          <div class="detail-field-label">${f.l}</div>
          <div class="detail-field-value">${f.v}</div>
        </div>`).join('')
    : '<div class="detail-field"><div class="detail-field-value" style="color:var(--text-light)">Sin características registradas</div></div>';


  document.getElementById('det-ubicacion').innerHTML = [
    { l: 'Departamento', v: d.departamento },
    { l: 'Municipio',    v: d.municipio },
  ].map(f => `
    <div class="detail-field">
      <div class="detail-field-label">${f.l}</div>
      <div class="detail-field-value">${f.v || '—'}</div>
    </div>`).join('');

  const asignadoEl = document.getElementById('det-asignado');
  if (asignadoEl) {
    asignadoEl.innerHTML = d.asignado_a
      ? `<div class="detail-field">
           <div class="detail-field-label">Asignado a</div>
           <div class="detail-field-value">${d.asignado_a}</div>
         </div>`
      : `<div class="detail-field">
           <div class="detail-field-label">Asignado a</div>
           <div class="detail-field-value" style="color:var(--text-light)">Sin asignación</div>
         </div>`;
  }
  const obsSection = document.getElementById('det-obs-section');
  if (d.observaciones) {
    obsSection.style.display = 'block';
    document.getElementById('det-obs').textContent = d.observaciones;
  } else {
    obsSection.style.display = 'none';
  }
  document.getElementById('modalDetail').classList.add('active');
}

function editFromDetail() { if (detailId) openEdit(detailId); }

function openDelete(id) {
  const d = invData.find(x => x.id === id);
  if (!d) return;
  document.getElementById('confirmSub').textContent  = `Dispositivo serial ${d.serial}`;
  document.getElementById('confirmBody').innerHTML   =
    `Eliminarás permanentemente el registro del <strong>${d.tipo} ${d.marca}</strong> con serial <strong>${d.serial}</strong>.`;
  document.getElementById('btnConfirmDel').onclick = async () => {
    const res = await apiFetch(API.eliminarDev(id), 'DELETE');
    if (!res.ok) { showNotif('Error', res.error || 'No se pudo eliminar', 'warning'); return; }
    showNotif(' Eliminado', `El dispositivo ${d.serial} fue eliminado del inventario`, 'success', 4000);
    closeModal('modalConfirm');
    loadInventario();
  };
  document.getElementById('modalConfirm').classList.add('active');
}

function exportarInventario() {
  const rows = [['Serial', 'Tipo', 'Marca', 'Modelo', 'Propietario',
                 'Estado', 'CO', 'Departamento', 'Municipio', 'Año', 'Obs']];
  invData.forEach(d => rows.push([
    d.serial, d.tipo, d.marca, d.modelo || '', d.propietario,
    d.estado, d.co, d.departamento, d.municipio, d.anio || '', d.observaciones || '',
  ]));
  downloadCSV(rows, 'inventario_dispositivos.csv');
  showNotif('📥 Exportado', 'El inventario fue descargado en CSV', 'success');
}
// ============================================================
// EXPORTAR INVENTARIO — Excel y PDF
// ============================================================
function toggleExportMenu(id) {
  const menu = document.getElementById(id);
  if (!menu) return;
  const visible = menu.style.display === 'block';
  document.querySelectorAll('[id$="-export-menu"]').forEach(m => m.style.display = 'none');
  menu.style.display = visible ? 'none' : 'block';
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.export-dropdown')) {
    document.querySelectorAll('[id$="-export-menu"]').forEach(m => m.style.display = 'none');
  }
});

function exportarInventario(tipo) {
  document.querySelectorAll('[id$="-export-menu"]').forEach(m => m.style.display = 'none');

  if (tipo === 'xlsx') {
    const q      = document.getElementById('inv-search')?.value || '';
    const tipo_f = document.getElementById('inv-filter-tipo')?.value || '';
    const estado = document.getElementById('inv-filter-estado')?.value || '';
    const params = new URLSearchParams();
    if (q)       params.set('q', q);
    if (tipo_f)  params.set('tipo', tipo_f);
    if (estado)  params.set('estado', estado);
    window.location.href = `${BASE}/inventario/api/dispositivos/exportar/?${params}`;
    showNotif('Exportando', 'El archivo Excel se está descargando...', 'success');
    return;
  }

  if (tipo === 'pdf') {
    if (!invData || invData.length === 0) {
      showNotif('Sin datos', 'No hay dispositivos para exportar', 'warning');
      return;
    }
    if (!window.jspdf) {
      showNotif('Error', 'Librería PDF no cargada', 'warning');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFillColor(27, 70, 152);
    doc.rect(0, 0, 297, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('SYSTRAKER — Inventario de Dispositivos', 14, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`Generado: ${fecha}`, 220, 12);

    doc.autoTable({
      startY: 22,
      head: [['Serial', 'Tipo', 'Marca', 'Propietario', 'Estado', 'CO', 'Departamento', 'Municipio']],
      body: invData.map(d => [
        d.serial       || '—',
        d.tipo         || '—',
        d.marca        || '—',
        d.propietario  || '—',
        d.estado       || '—',
        d.co           || '—',
        d.departamento || '—',
        d.municipio    || '—',
      ]),
      styles:     { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [27, 70, 152], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 252] },
      columnStyles: { 0: { cellWidth: 30, font: 'courier' } },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, 14, doc.internal.pageSize.height - 6);
      doc.text('SYSTRAKER © ' + new Date().getFullYear(), 240, doc.internal.pageSize.height - 6);
    }

    doc.save(`inventario_systraker_${new Date().toISOString().slice(0, 10)}.pdf`);
    showNotif('PDF generado', 'El inventario fue exportado en PDF', 'success');
  }
}

// ============================================================
// CARACTERÍSTICAS DINÁMICAS
// ============================================================
function _fInp(label, req, placeholder, id, type = 'text') {
  const r = req ? '<span class="req">*</span>' : '';
  return `<div class="form-group">
    <label class="form-label">${label} ${r}</label>
    <input class="form-input" id="${id}" type="${type}" placeholder="${placeholder}">
  </div>`;
}

function _fRow(cols, ...fields) {
  return `<div class="form-row ${cols}">${fields.join('')}</div>`;
}

function _selFromCat(label, req, catKey, valProp, textProp, id) {
  const r    = req ? '<span class="req">*</span>' : '';
  const opts = (CAT[catKey] || [])
    .map(o => `<option value="${o[valProp]}">${o[textProp]}</option>`)
    .join('');
  return `<div class="form-group">
    <label class="form-label">${label} ${r}</label>
    <select class="form-select" id="${id}">
      <option value="">Seleccione una opción</option>${opts}
    </select>
  </div>`;
}

function _selStatic(label, req, opts, id) {
  const r    = req ? '<span class="req">*</span>' : '';
  const html = opts.map(o => `<option>${o}</option>`).join('');
  return `<div class="form-group">
    <label class="form-label">${label} ${r}</label>
    <select class="form-select" id="${id}">
      <option value="">Seleccione una opción</option>${html}
    </select>
  </div>`;
}

const CHAR_FIELDS_MAP = {
  'TORRE DE ESCRITORIO': () => `
    ${_fRow('cols4',
      _fInp('Nombre', false, 'Ej: PC-Admin-01', 'tc-nombre'),
      _selFromCat('Antivirus', true, 'antivirus', 'g208_id', 'g208_antivirus', 'tc-antivirus'),
      _selFromCat('Procesador', true, 'procesadores', 'g209_id', 'g209_procesador', 'tc-procesador'),
      _selFromCat('SO', true, 'sistemas_operativos', 'g210_id', 'g210_so', 'tc-so')
    )}
    ${_fRow('cols4',
      _fInp('RAM (GB)', true, 'Ej: 8', 'tc-ram', 'number'),
     _selFromCat('Tipo Disco', true, 'tipos_disco', 'g231_id', 'g231_tipo_disco', 'tc-disco'),
      _selFromCat('Almacenamiento', true, 'almacenamientos', 'g219_id', 'g219_almacenamiento', 'tc-alm'),
      _selFromCat('Office', true, 'licencias_office', 'g211_id', 'g211_office', 'tc-office')
    )}
    ${_fRow('cols3',
      _fInp('Correo / Key Office', true, 'correo@empresa.com', 'tc-correo'),
      _fInp('Valor Promedio', false, 'Ej: 2500000', 'tc-valor', 'number'),
      _fInp('Valor Arrendamiento', false, 'Ej: 180000', 'tc-arrend', 'number')
    )}`,
  'PORTATIL': () => `
    ${_fRow('cols4',
      _fInp('Nombre', false, 'Ej: LAPTOP-02', 'pc-nombre'),
      _selFromCat('Antivirus', true, 'antivirus', 'g208_id', 'g208_antivirus', 'pc-antivirus'),
      _selFromCat('Procesador', true, 'procesadores', 'g209_id', 'g209_procesador', 'pc-procesador'),
      _selFromCat('SO', true, 'sistemas_operativos', 'g210_id', 'g210_so', 'pc-so')
    )}
    ${_fRow('cols4',
      _fInp('RAM (GB)', true, 'Ej: 8', 'pc-ram', 'number'),
      _selFromCat('Tipo Disco', true, 'tipos_disco', 'g231_id', 'g231_tipo_disco', 'pc-disco'),
      _selFromCat('Almacenamiento', true, 'almacenamientos', 'g219_id', 'g219_almacenamiento', 'pc-alm'),
      _selFromCat('Office', false, 'licencias_office', 'g211_id', 'g211_office', 'pc-office')
    )}
    ${_fRow('cols4',
      _fInp('Correo / Key Office', false, 'correo@empresa.com', 'pc-correo'),
      _fInp('Activo', false, 'Ej: AC-0042', 'pc-activo'),
      _fInp('Valor Promedio', false, 'Ej: 3200000', 'pc-valor', 'number'),
      _fInp('Valor Arrendamiento', false, 'Ej: 220000', 'pc-arrend', 'number')
    )}`,
  'PANTALLA': () => `
    ${_fRow('cols4',
      _fInp('Tamaño (Pulgadas)', true, 'Ej: 27', 'pan-tam', 'number'),
      _fInp('Resolución', false, 'Ej: 1920x1080', 'pan-res'),
      _fInp('Valor Promedio', false, 'Ej: 900000', 'pan-valor', 'number'),
      _fInp('Valor Arrendamiento', false, 'Ej: 50000', 'pan-arrend', 'number')
    )}`,
  'CELULAR': () => `
    ${_fRow('cols4',
      _fInp('Número', true, 'Ej: 3001234567', 'cel-num'),
      _selFromCat('Operador', true, 'operadores', 'g221_id', 'g221_operador', 'cel-op'),
      _fInp('IMEI 1', true, 'Ej: 352001234567890', 'cel-imei1'),
      _fInp('IMEI 2', false, 'Ej: 352001234567891', 'cel-imei2')
    )}
    ${_fRow('cols4',
      _fInp('Plan de Datos', true, 'Ej: 5GB', 'cel-plan'),
      _fInp('Cuenta Gmail', true, 'correo@gmail.com', 'cel-gmail'),
      _fInp('Contraseña', true, '••••••••', 'cel-pass', 'password'),
      _fInp('Valor Promedio', false, 'Ej: 1800000', 'cel-valor', 'number'),
      _fInp('Valor Arrendamiento', false, 'Ej: 30000', 'cel-arrend', 'number')
    )}`,
    
  'MODEM WIFI': () => `
    ${_fRow('cols4',
      _fInp('Número', true, 'Ej: 3001234567', 'mw-num'),
      _selFromCat('Operador', true, 'operadores', 'g221_id', 'g221_operador', 'mw-op'),
      _fInp('IMEI 1', true, 'Ej: 352001234567890', 'mw-imei1'),
      _fInp('IMEI 2', false, 'Ej: 352001234567891', 'mw-imei2')
    )}
    ${_fRow('cols3',
      _fInp('Plan de Datos', true, 'Ej: 10GB', 'mw-plan'),
      _fInp('Valor Promedio', false, 'Ej: 400000', 'mw-valor', 'number'),
      _fInp('Valor Arrendamiento', false, 'Ej: 30000', 'mw-arrend', 'number')
    )}`,
  'SIMCARD': () => `
    ${_fRow('cols4',
      _fInp('Número', true, 'Ej: 3001234567', 'sim-num'),
      _selFromCat('Operador', true, 'operadores', 'g221_id', 'g221_operador', 'sim-op'),
      _fInp('Plan', false, 'Ej: Postpago 5GB', 'sim-plan'),
      _fInp('Valor Arrendamiento', false, 'Ej: 25000', 'sim-arrend', 'number')
    )}`,
  'VIDEO BEAM': () => `
    ${_fRow('cols4',
    _fInp('Lúmenes', true, 'Ej: 3500', 'vb-lumenes', 'number'),

    )}`,
    
  'TABLET': () => `
    ${_fRow('cols4',
      _fInp('Número', false, 'Ej: 3001234567', 'tab-num'),
      _selFromCat('Operador', false, 'operadores', 'g221_id', 'g221_operador', 'tab-op'),
      _fInp('IMEI 1', false, 'Ej: 352001234567890', 'tab-imei1'),
      _fInp('IMEI 2', false, 'Ej: 352001234567891', 'tab-imei2')
    )}
    ${_fRow('cols4',
      _fInp('Plan de Datos', false, 'Ej: 3GB', 'tab-plan'),
      _fInp('Cuenta Gmail', true, 'correo@gmail.com', 'tab-gmail'),
      _fInp('Contraseña', true, '••••••••', 'tab-pass', 'password'),
      _fInp('Valor Promedio', false, 'Ej: 1200000', 'tab-valor', 'number')
    )}
    ${_fRow('cols2',
      _fInp('Valor Arrendamiento', false, 'Ej: 80000', 'tab-arrend', 'number'),
      '<div class="form-group"></div>'
    )}`,
  'TELEFONO FIJO': () => `
    ${_fRow('cols2',
      _fInp('IMEI 1', true, 'Ej: 352001234567890', 'tf-imei1'),
      '<div class="form-group"></div>'
    )}`,
  'IMPRESORA': () => `
    ${_fRow('cols2',
      _selFromCat('Tipo de Impresora', true, 'tipos_impresora', 'g229_id', 'g229_tipo_impresora', 'imp-tipo')
    )}`,
  'PERIFERICO': () => `
    ${_fRow('cols4',
      _selStatic('Base', true, ['SÍ', 'NO', 'NO APLICA'], 'per-base'),
      _selStatic('Teclado', true, ['SÍ', 'NO', 'NO APLICA'], 'per-teclado'),
      _selStatic('Mouse', true, ['SÍ', 'NO', 'NO APLICA'], 'per-mouse'),
      _selStatic('Auriculares', true, ['SÍ', 'NO', 'NO APLICA'], 'per-auriculares')
    )}
    ${_fRow('cols2',
      _selStatic('Cargador PC', true, ['SÍ', 'NO', 'NO APLICA'], 'per-cargpc'),
      _selStatic('Cargador Móvil', true, ['SÍ', 'NO', 'NO APLICA'], 'per-cargmov')
    )}`,
  'LICENCIA OFFICE': () => `
    ${_fRow('cols3',
      _selFromCat('Tipo de Licencia', true, 'licencias_office', 'g211_id', 'g211_office', 'lic-tipo'),
      _selFromCat('Almacenamiento', true, 'almacenamientos', 'g219_id', 'g219_almacenamiento', 'lic-alm'),
      _fInp('Valor Arrendamiento', false, 'Ej: 45000', 'lic-arrend', 'number')
    )}`,
};

// Etiquetas en español para las claves internas de "características" que
// devuelve el backend (_get_caracteristicas), usadas en el modal de Detalle.
const CARACT_LABELS = {
  procesador: 'Procesador', so: 'Sistema Operativo', antivirus: 'Antivirus',
  licencia: 'Licencia Office', correo_office: 'Correo / Key Office', key_office: 'Key Office',
  ram: 'RAM', tipo_disco: 'Tipo de Disco', almacenamiento: 'Almacenamiento',
  activo: 'Activo', pulgadas: 'Pulgadas',
  numero_linea: 'Número de Línea', operador: 'Operador', plan_datos: 'Plan de Datos',
  imei1: 'IMEI 1', imei2: 'IMEI 2', cuenta_gmail: 'Cuenta Gmail',
  resolucion: 'Resolución', tipo_impresora: 'Tipo de Impresora', funcion: 'Función',
  incluye_base: 'Base', incluye_teclado: 'Teclado', incluye_mouse: 'Mouse',
  incluye_auriculares: 'Auriculares', incluye_cargador: 'Cargador',
  descripcion_adicional: 'Descripción Adicional', software: 'Software', version: 'Versión',
  key: 'Key / Licencia', correo: 'Correo', fecha_vencimiento: 'Fecha de Vencimiento',
  lumenes: 'Lúmenes',
};

// Normaliza el nombre del tipo (sin tildes, mayúsculas, espacios colapsados)
// para que el cruce contra CHAR_FIELDS_MAP no falle por diferencias de
// formato en el catálogo de la base de datos (mismo criterio que el
// backend usa en carga masiva — ver _normalizar en views.py).
function _normTipoKey(s) {
  if (!s) return '';
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ').trim().toUpperCase();
}

function _buscarBuilderTipo(tipo) {
  const key = _normTipoKey(tipo);
  if (Object.prototype.hasOwnProperty.call(CHAR_FIELDS_MAP, key)) return CHAR_FIELDS_MAP[key];
  const encontrada = Object.keys(CHAR_FIELDS_MAP).find(k => _normTipoKey(k) === key);
  return encontrada !== undefined ? CHAR_FIELDS_MAP[encontrada] : undefined;
}

function renderCaracteristicas(tipo) {
  const section = document.getElementById('charSection');
  if (!section) return;
  if (!tipo) {
    section.innerHTML = `
      <div class="form-section">
        <div class="form-section-title"><i class="fas fa-microchip"></i> Características</div>
        <div style="display:flex;align-items:center;gap:10px;padding:16px 18px;
             background:rgba(27,70,152,0.04);border:2px dashed var(--border);
             border-radius:var(--radius-md);font-size:13px;color:var(--text-light);">
          <i class="fas fa-info-circle" style="color:var(--primary-light)"></i>
          Selecciona el tipo de dispositivo para ver los campos específicos
        </div>
      </div>`;
    return;
  }
  const builder = _buscarBuilderTipo(tipo);
  if (builder === null) {
    section.innerHTML = `
      <div class="form-section">
        <div class="form-section-title">
          <i class="fas fa-microchip"></i> Características
          <span style="font-size:12px;font-weight:400;color:var(--text-light);
                text-transform:none;letter-spacing:0;margin-left:6px">
            — Este tipo no cuenta con campos adicionales
          </span>
        </div>
      </div>`;
    return;
  }
  if (typeof builder !== 'function') {
    section.innerHTML = `
      <div class="form-section">
        <div class="form-section-title"><i class="fas fa-microchip"></i> Características</div>
        <div style="padding:16px 18px;font-size:13px;color:var(--text-light);">
          <i class="fas fa-exclamation-circle"></i> No hay campos configurados para este tipo.
        </div>
      </div>`;
    return;
  }
  section.innerHTML = `
    <div class="form-section">
      <div class="form-section-title"><i class="fas fa-microchip"></i> Características</div>
      <div style="animation:fadeIn .2s ease">${builder()}</div>
    </div>`;
}

function fillCaracteristicas(tipoNombre, caract) {
  renderCaracteristicas(tipoNombre);
  if (!caract || !caract.grupo) return;
  requestAnimationFrame(() => {
    const mappings = {
      pc: {
        'tc-antivirus': caract.antivirus_id,  'pc-antivirus': caract.antivirus_id,
        'tc-procesador': caract.procesador_id, 'pc-procesador': caract.procesador_id,
        'tc-so': caract.so_id,                 'pc-so': caract.so_id,
        'tc-office': caract.licencia_id,       'pc-office': caract.licencia_id,
        'tc-ram': caract.ram,                   'pc-ram': caract.ram,
        'tc-disco': caract.tipo_disco_id,      'pc-disco': caract.tipo_disco_id,
        'tc-alm': caract.almacenamiento_id,    'pc-alm': caract.almacenamiento_id,
        'tc-correo': caract.correo_office,     'pc-correo': caract.correo_office,
        'pc-activo': caract.activo,
        'tc-nombre': caract.nombre_equipo,     'pc-nombre': caract.nombre_equipo,
        'tc-valor': caract.valor_promedio,     'pc-valor': caract.valor_promedio,
        'tc-arrend': caract.valor_arrendamiento, 'pc-arrend': caract.valor_arrendamiento,
      },
      movil: {
        'cel-num': caract.numero_linea,  'mw-num': caract.numero_linea,
        'sim-num': caract.numero_linea,  'tab-num': caract.numero_linea,
        'cel-op': caract.operador_id,    'mw-op': caract.operador_id,
        'sim-op': caract.operador_id,    'tab-op': caract.operador_id,
        'cel-imei1': caract.imei1,       'mw-imei1': caract.imei1,
        'tab-imei1': caract.imei1,       'tf-imei1': caract.imei1,
        'cel-imei2': caract.imei2,       'mw-imei2': caract.imei2, 'tab-imei2': caract.imei2,
        'cel-plan': caract.plan_datos,   'mw-plan': caract.plan_datos, 'tab-plan': caract.plan_datos,
        'cel-gmail': caract.cuenta_gmail, 'tab-gmail': caract.cuenta_gmail,
        'cel-pass': caract.contrasena_gmail, 'tab-pass': caract.contrasena_gmail,
        'cel-valor': caract.valor_promedio,  'tab-valor': caract.valor_promedio, 'mw-valor': caract.valor_promedio,
        'cel-arrend': caract.valor_arrendamiento, 'tab-arrend': caract.valor_arrendamiento,
        'mw-arrend': caract.valor_arrendamiento,  'sim-arrend': caract.valor_arrendamiento,
      },
      pantalla:  { 'pan-tam': caract.pulgadas, 'pan-res': caract.resolucion, 'pan-valor': caract.valor_promedio, 'pan-arrend': caract.valor_arrendamiento },
      impresora: { 'imp-tipo': caract.tipo_impresora_id, 'imp-funcion': caract.funcion },
      videobeam: { 'vb-lumenes': caract.lumenes },
      periferico: {
        'per-base':        caract.incluye_base ? 'SÍ' : 'NO',
        'per-teclado':     caract.incluye_teclado ? 'SÍ' : 'NO',
        'per-mouse':       caract.incluye_mouse ? 'SÍ' : 'NO',
        'per-auriculares': caract.incluye_auriculares ? 'SÍ' : 'NO',
        'per-cargpc':      caract.incluye_cargador ? 'SÍ' : 'NO',
        'per-cargmov':     caract.incluye_cargador ? 'SÍ' : 'NO',
      },
      licencia: {
        'lic-tipo': (CAT.licencias_office || []).find(l => l.g211_office === caract.software)?.g211_id || '',
        'lic-alm':  caract.almacenamiento_id,
        'lic-arrend': caract.valor_arrendamiento,
      },
    };
    const map = mappings[caract.grupo] || {};
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val !== undefined && val !== null) el.value = val;
    });
  });
}

function buildCaracteristicasBody() {
  // Resolver el nombre a partir del ID
  const tipoId = document.getElementById('f-tipo').value;
  const tipo = (CAT.tipos_dispositivo || [])
    .find(t => String(t.g200_id) === String(tipoId))
    ?.g200_tipo_dispositivo || '';

  const g = (id) => document.getElementById(id)?.value || '';
  if (tipo === 'TORRE DE ESCRITORIO') return { grupo: 'pc', antivirus_id: g('tc-antivirus'), procesador_id: g('tc-procesador'), so_id: g('tc-so'), licencia_id: g('tc-office'), ram: g('tc-ram'), tipo_disco_id: g('tc-disco'), almacenamiento_id: g('tc-alm'), correo_office: g('tc-correo'), nombre_equipo: g('tc-nombre'), valor_promedio: g('tc-valor'), valor_arrendamiento: g('tc-arrend')  };
  if (tipo === 'PORTATIL')            return { grupo: 'pc', antivirus_id: g('pc-antivirus'), procesador_id: g('pc-procesador'), so_id: g('pc-so'), licencia_id: g('pc-office'), ram: g('pc-ram'), tipo_disco_id: g('pc-disco'), almacenamiento_id: g('pc-alm'), correo_office: g('pc-correo'), activo: g('pc-activo'), nombre_equipo: g('pc-nombre'), valor_promedio: g('pc-valor'), valor_arrendamiento: g('pc-arrend')  };
  if (tipo === 'CELULAR')             return { grupo: 'movil', numero_linea: g('cel-num'), operador_id: g('cel-op'), imei1: g('cel-imei1'), imei2: g('cel-imei2'), plan_datos: g('cel-plan'), cuenta_gmail: g('cel-gmail'), contrasena_gmail: g('cel-pass'), valor_promedio: g('cel-valor'), valor_arrendamiento: g('cel-arrend') };
  if (tipo === 'TABLET')              return { grupo: 'movil', numero_linea: g('tab-num'), operador_id: g('tab-op'), imei1: g('tab-imei1'), imei2: g('tab-imei2'), plan_datos: g('tab-plan'), cuenta_gmail: g('tab-gmail'), contrasena_gmail: g('tab-pass'), valor_promedio: g('tab-valor'), valor_arrendamiento: g('tab-arrend') };
  if (tipo === 'MODEM WIFI')          return { grupo: 'movil', numero_linea: g('mw-num'), operador_id: g('mw-op'), imei1: g('mw-imei1'), imei2: g('mw-imei2'), plan_datos: g('mw-plan'), valor_promedio: g('mw-valor'), valor_arrendamiento: g('mw-arrend') };
  if (tipo === 'SIMCARD')             return { grupo: 'movil', numero_linea: g('sim-num'), operador_id: g('sim-op'), plan_datos: g('sim-plan'), valor_arrendamiento: g('sim-arrend') };
  if (tipo === 'TELEFONO FIJO')       return { grupo: 'movil', imei1: g('tf-imei1') };
  if (tipo === 'PANTALLA')            return { grupo: 'pantalla', pulgadas: g('pan-tam'), resolucion: g('pan-res'), valor_promedio: g('pan-valor'), valor_arrendamiento: g('pan-arrend') };
  if (tipo === 'IMPRESORA')           return { grupo: 'impresora', tipo_impresora_id: g('imp-tipo') };
  if (tipo === 'PERIFERICO')          return { grupo: 'periferico', incluye_base: g('per-base') === 'SÍ', incluye_teclado: g('per-teclado') === 'SÍ', incluye_mouse: g('per-mouse') === 'SÍ', incluye_auriculares: g('per-auriculares') === 'SÍ', incluye_cargador: (g('per-cargpc') === 'SÍ') || (g('per-cargmov') === 'SÍ') };
  if (tipo === 'LICENCIA OFFICE') {
    const licId = g('lic-tipo');
    const licNombre = (CAT.licencias_office || []).find(l => String(l.g211_id) === String(licId))?.g211_office || '';
    return { grupo: 'licencia', software: licNombre, almacenamiento_id: g('lic-alm'), valor_arrendamiento: g('lic-arrend') };
  }
  if (tipo === 'VIDEO BEAM') return {grupo: 'videobeam',lumenes: g('vb-lumenes')};
  return {};

}


// HISTORIAL

const noveladIconMap = {
  'ASIGNACIÓN': 'fa-user-plus', 'DEVOLUCIÓN': 'fa-undo-alt',
  'MANTENIMIENTO': 'fa-tools',  'BAJA': 'fa-trash-alt',
  'ACTUALIZACIÓN': 'fa-sync-alt', 'TRASLADO': 'fa-exchange-alt',
};
const novedadClsMap = {
  'ASIGNACIÓN': 'nov-asignacion', 'DEVOLUCIÓN': 'nov-devolucion',
  'MANTENIMIENTO': 'nov-mantenimiento', 'BAJA': 'nov-baja',
  'ACTUALIZACIÓN': 'nov-actualizacion', 'TRASLADO': 'nov-traslado',
};

function novedadBadge(nov) {
  const cls = novedadClsMap[nov] || 'nov-asignacion';
  const ico = noveladIconMap[nov] || 'fa-info-circle';
  return `<span class="hist-novedad-badge ${cls}"><i class="fas ${ico}" style="font-size:11px"></i> ${nov}</span>`;
}

function respAvatar(name) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return `<span class="hist-td-resp"><span class="hist-td-resp-avatar">${initials}</span>${name}</span>`;
}

async function consultarHistorial() {
  const tipoId = document.getElementById('hist-tipo').value;
  const serial = document.getElementById('hist-serial').value.trim();
  if (!tipoId && !serial) {
    showNotif('Filtro requerido', 'Selecciona un tipo de dispositivo o ingresa un serial', 'warning');
    return;
  }
  const params = new URLSearchParams();
  if (tipoId) params.set('tipo_id', tipoId);
  if (serial)  params.set('serial', serial);
  const res = await apiFetch(`${API.historial}?${params}`);
  if (!res.ok) { showNotif('Error', 'No se pudo consultar el historial', 'warning'); return; }
  const registros = res.data;
  document.getElementById('hist-initial').style.display = 'none';
  const wrap     = document.getElementById('hist-resultado-wrap');
  const existing = wrap.querySelector('.hist-ficha-card');
  if (existing) existing.remove();
  if (registros.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'hist-ficha-card';
    emptyDiv.innerHTML = `<div class="hist-empty"><div class="hist-empty-icon"><i class="fas fa-inbox"></i></div><h3>Sin registros encontrados</h3><p>No hay novedades registradas para los filtros seleccionados.</p></div>`;
    wrap.appendChild(emptyDiv);
    return;
  }
  const primer = registros[0];
  histData = registros;
  histPage = 1;
  const card = document.createElement('div');
  card.className = 'hist-ficha-card';

  card.innerHTML = `
    <div class="hist-ficha-header">
      <div class="hist-ficha-title"><i class="fas fa-clipboard-list"></i> Ficha Histórica del Equipo</div>
      <div class="hist-ficha-meta">
        <div class="hist-ficha-meta-item">
          <div class="hist-ficha-meta-label">Serial</div>
          <div class="hist-ficha-meta-value mono">${primer.serial}</div>
        </div>
        <div class="hist-ficha-meta-item">
          <div class="hist-ficha-meta-label">Tipo</div>
          <div class="hist-ficha-meta-value">${primer.tipo}</div>
        </div>
        <div class="hist-ficha-meta-item">
          <div class="hist-ficha-meta-label">Marca</div>
          <div class="hist-ficha-meta-value">${primer.marca}</div>
        </div>
        <div class="hist-ficha-meta-item">
          <div class="hist-ficha-meta-label">Propietario</div>
          <div class="hist-ficha-meta-value">${primer.propietario}</div>
        </div>
        <div class="hist-ficha-meta-item">
          <div class="hist-ficha-meta-label">Estado</div>
          <div class="hist-ficha-meta-value">${primer.estado}</div>
        </div>
        <div class="hist-ficha-meta-item">
          <div class="hist-ficha-meta-label">Centro Operaciones</div>
          <div class="hist-ficha-meta-value">${primer.co_equipo}</div>
        </div>
        <div class="hist-ficha-meta-item">
          <div class="hist-ficha-meta-label">Registros</div>
          <div class="hist-ficha-meta-value">${registros.length}</div>
        </div>
      </div>
    </div>
    <div class="hist-table-wrap">
      <table class="hist-table">
        <thead><tr class="subheader">
          <th>Novedad</th><th>Fecha</th><th>Hora</th>
          <th>Responsable</th><th>CO </th><th>Observaciones</th>
        </tr></thead>
        <tbody id="hist-tbody"></tbody>
      </table>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;flex-wrap:wrap;gap:10px">
      <div style="font-size:13px;color:var(--text-secondary)">
        Mostrando <span id="hist-pag-from">—</span>–<span id="hist-pag-to">—</span>
        de <span id="hist-pag-total">—</span> registros
      </div>
      <div class="pag-controls" id="hist-pag-controls"></div>
    </div>`;
    wrap.appendChild(card);
    _renderHistTable();
  }

function goHistPage(p) {
  histPage = p;
  _renderHistTable();
}

function _renderHistTable() {
  const total   = histData.length;
  const maxPage = Math.max(1, Math.ceil(total / histPageSize));
  if (histPage > maxPage) histPage = 1;
  const from  = (histPage - 1) * histPageSize;
  const slice = histData.slice(from, from + histPageSize);

  const tbody = document.getElementById('hist-tbody');
  if (tbody) {
    tbody.innerHTML = slice.map((h, i) => `
      <tr style="animation: fadeIn ${0.05*i+0.1}s ease both">
        <td>${novedadBadge(h.novedad)}</td>
        <td class="hist-td-fecha">${h.fecha.split('-').reverse().join('/')}</td>
        <td class="hist-td-hora">${h.hora}</td>
        <td>${respAvatar(h.responsable)}</td>
        <td style="font-size:13px">${h.co}</td>
        <td style="font-size:13px;color:var(--text-secondary);max-width:220px">${h.observaciones || '—'}</td>
      </tr>`).join('');
  }

  const fromEl  = document.getElementById('hist-pag-from');
  const toEl    = document.getElementById('hist-pag-to');
  const totalEl = document.getElementById('hist-pag-total');
  if (fromEl)  fromEl.textContent  = total === 0 ? 0 : from + 1;
  if (toEl)    toEl.textContent    = Math.min(from + histPageSize, total);
  if (totalEl) totalEl.textContent = total;

  const ctrl = document.getElementById('hist-pag-controls');
  if (ctrl) {
    let html = `<button class="pag-btn" ${histPage <= 1 ? 'disabled' : ''} onclick="goHistPage(${histPage - 1})">
      <i class="fas fa-chevron-left"></i></button>`;
    buildPages(histPage, maxPage).forEach(p => {
      html += p === '...'
        ? `<span class="pag-btn" style="border:none;cursor:default">…</span>`
        : `<button class="pag-btn ${p === histPage ? 'active' : ''}" onclick="goHistPage(${p})">${p}</button>`;
    });
    html += `<button class="pag-btn" ${histPage >= maxPage ? 'disabled' : ''} onclick="goHistPage(${histPage + 1})">
      <i class="fas fa-chevron-right"></i></button>`;
    ctrl.innerHTML = html;
  }
}

function openHistModal() {
  const tipo   = document.getElementById('hist-tipo').value;
  const serial = document.getElementById('hist-serial').value.trim();
  document.getElementById('hf-tipo').value   = tipo   || '';
  document.getElementById('hf-serial').value = serial || '';
  const now = new Date();
  document.getElementById('hf-fecha').value = now.toISOString().split('T')[0];
  document.getElementById('hf-hora').value  = now.toTimeString().slice(0, 5);
  ['hf-prop', 'hf-co', 'hf-novedad', 'hf-resp', 'hf-obs'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('modalHistForm').classList.add('active');
}

async function saveHistorial() {
  const tipoId  = document.getElementById('hf-tipo').value;
  const serial  = document.getElementById('hf-serial').value.trim();
  const novedad = document.getElementById('hf-novedad').value;
  const resp    = document.getElementById('hf-resp').value;
  const fecha   = document.getElementById('hf-fecha').value;
  const hora    = document.getElementById('hf-hora').value;
  if (!tipoId || !serial || !novedad || !resp || !fecha || !hora) {
    showNotif('Campos requeridos', 'Completa todos los campos obligatorios (*)', 'warning');
    return;
  }
  const devRes = await apiFetch(`${API.dispositivos}?q=${encodeURIComponent(serial)}`);
  if (!devRes.ok || !devRes.data.dispositivos.length) {
    showNotif('Error', 'No se encontró un dispositivo con ese serial', 'warning');
    return;
  }
  const dispositivo = devRes.data.dispositivos.find(d => d.serial === serial);
  if (!dispositivo) { showNotif('Error', `Serial "${serial}" no encontrado en el inventario`, 'warning'); return; }
  const body = {
    dispositivo_id: dispositivo.id,
    novedad_id:     novedad,
    fecha, hora,
    responsable:    resp,
    co_id:          document.getElementById('hf-co').value || null,
    observaciones:  document.getElementById('hf-obs').value,
  };
  const res = await apiFetch(API.crearHist, 'POST', body);
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo guardar', 'warning'); return; }
  closeModal('modalHistForm');
  showNotif(' Novedad registrada', `La novedad fue guardada para el serial ${serial}`, 'success', 4000);
  if (document.getElementById('hist-tipo').value || document.getElementById('hist-serial').value) {
    consultarHistorial();
  }
}

function exportarHistorial() {
  if (!histData.length) {
    showNotif('Sin datos', 'Consulta un historial antes de exportar', 'warning');
    return;
  }
  // Se exporta desde histData (todos los registros de la consulta), no desde
  // la tabla visible — la tabla ahora está paginada y solo muestra una página.
  const rows = [['Serial', 'Tipo', 'Novedad', 'Fecha', 'Hora', 'Responsable', 'CO', 'Observaciones']];
  histData.forEach(h => {
    rows.push([
      h.serial, h.tipo, h.novedad,
      h.fecha.split('-').reverse().join('/'), h.hora,
      h.responsable, h.co, h.observaciones || '',
    ]);
  });
  downloadCSV(rows, 'historial_equipos.csv');
  showNotif(' Exportado', 'El historial fue descargado en CSV', 'success');
}

// ============================================================
// CENTRO DE COSTOS
// ============================================================
async function consultarCC() {
  const coId   = document.getElementById('cc-co').value;
  const propId = document.getElementById('cc-prop').value;
  const tipoId = document.getElementById('cc-tipo').value;
  const params = new URLSearchParams();
  if (coId)   params.set('co_id', coId);
  if (propId) params.set('prop_id', propId);
  if (tipoId) params.set('tipo_id', tipoId);
  const res = await apiFetch(`${API.CentroOperaciones}?${params}`);
  if (!res.ok) { showNotif('Error', 'No se pudo consultar', 'warning'); return; }
  const { total, habilitados, otros, grupos, colaboradores, resumen } = res.data;

  // ── Tarjetas de stats superiores ───────────────────────────
  document.getElementById('cc-stats-row').style.display  = 'grid';
  document.getElementById('cc-st-total').textContent     = total;
  document.getElementById('cc-st-hab').textContent       = habilitados;
  document.getElementById('cc-st-inhab').textContent     = otros;
  document.getElementById('cc-st-hab-pct').textContent   = total > 0 ? `${Math.round((habilitados / total) * 100)}% del total` : '—';
  document.getElementById('cc-st-inhab-pct').textContent = total > 0 ? `${Math.round((otros / total) * 100)}% del total` : '—';

  const wrap = document.getElementById('cc-results-wrap');
  if (total === 0) {
    wrap.innerHTML = `<div class="cc-empty"><div class="cc-empty-icon"><i class="fas fa-inbox"></i></div><p>No se encontraron dispositivos</p><small>Intenta con otros criterios</small></div>`;
    return;
  }

  const fmt = n => Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  // ── Tarjetas de costos ──────────────────────────────────────
  const tarjetas = grupos.map(g => `
    <div class="cc-cost-card">
      <div class="cc-cost-card-header">
        <span class="cc-cost-tipo">${g.tipo}</span>
        <span class="cc-cost-cant-badge">${g.cantidad} dispositivos</span>
      </div>
      <div class="cc-cost-grid">
        <div class="cc-cost-item">
          <span class="cc-cost-lbl">Costo mensual arrendamiento</span>
          <span class="cc-cost-val">$ ${fmt(g.costo_mensual)}</span>
        </div>
        ${g.aplica_bitdefender ? `
        <div class="cc-cost-item">
          <span class="cc-cost-lbl">Costo mensual BitDefender</span>
          <span class="cc-cost-val">$ ${fmt(g.costo_bitdefender)}</span>
        </div>` : ''}
        <div class="cc-cost-item cc-cost-total">
          <span class="cc-cost-lbl">Total</span>
          <span class="cc-cost-val">$ ${fmt(g.total)}</span>
        </div>
      </div>
      <div class="cc-cost-estados">
        ${badgeHTML('HABILITADO')} <strong>${g.habilitados}</strong>
        &nbsp;&nbsp;${badgeHTML('INHABILITADO')} <strong>${g.inhabilitados}</strong>
        &nbsp;&nbsp;${badgeHTML('ASIGNADO')} <strong>${g.asignados}</strong>
      </div>
    </div>`).join('');

  // ── Tabla resumen total ─────────────────────────────────────
  const tbody = grupos.map(g => `
    <tr>
      <td class="td-tipo">${g.tipo}</td>
      <td class="td-cant">${g.cantidad}</td>
      <td>$ ${fmt(g.costo_mensual)}</td>
      <td>${g.aplica_bitdefender ? '$ ' + fmt(g.costo_bitdefender) : '<span style="color:#94a3b8">—</span>'}</td>
      <td><strong>$ ${fmt(g.total)}</strong></td>
    </tr>`).join('');

  // ── Desglose por colaborador — de dónde sale el total del área ──
  // Se pinta como tabla con búsqueda y paginación (igual que Inventario /
  // Colaboradores), para que no se vuelva interminable cuando el área
  // tiene muchos colaboradores.
  ccColabData  = colaboradores || [];
  ccColabPage  = 1;
  ccColabQuery = '';

  wrap.innerHTML = `
    <div class="cc-cost-cards-wrap">${tarjetas}</div>
    <div class="cc-results-header" style="margin-top:24px">
      <div class="cc-results-title"><i class="fas fa-table"></i> Resumen de costos por tipo</div>
      <span class="cc-results-count">${total} dispositivos</span>
    </div>
    <table class="cc-table">
      <thead><tr>
        <th>Tipo</th><th>Cantidad</th>
        <th>Costo arrendamiento</th>
        <th>BitDefender</th>
        <th>Total mensual</th>
      </tr></thead>
      <tbody>${tbody}</tbody>
      <tfoot><tr>
        <td class="td-total-label">TOTAL</td>
        <td class="td-total-val">${total}</td>
        <td><strong>$ ${fmt(resumen.costo_arrendamiento)}</strong></td>
        <td><strong>$ ${fmt(resumen.costo_bitdefender)}</strong></td>
        <td><strong>$ ${fmt(resumen.total)}</strong></td>
      </tr></tfoot>
    </table>
    ${ccColabData.length > 0 ? `
    <div class="cc-results-header" style="margin-top:24px">
      <div class="cc-results-title"><i class="fas fa-users"></i> Desglose por colaborador</div>
      <span class="cc-results-count" id="cc-colab-count">${ccColabData.length} colaborador${ccColabData.length === 1 ? '' : 'es'}</span>
    </div>
    <div style="padding:14px 20px;background:white;border-bottom:1px solid var(--border)">
      <input type="text" class="colab-search-input" id="cc-colab-search"
             placeholder="Buscar por nombre o documento..."
             oninput="filtrarCCColab(this.value)">
    </div>
    <table class="cc-table">
      <thead><tr>
        <th>Colaborador</th><th>Documento</th>
        <th>Dispositivos</th>
        <th>Costo arrendamiento</th>
      </tr></thead>
      <tbody id="cc-colab-tbody"></tbody>
      <tfoot id="cc-colab-tfoot"></tfoot>
    </table>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;flex-wrap:wrap;gap:10px">
      <div style="font-size:13px;color:var(--text-secondary)">
        Mostrando <span id="cc-colab-pag-from">—</span>–<span id="cc-colab-pag-to">—</span>
        de <span id="cc-colab-pag-total">—</span> colaboradores
      </div>
      <div class="pag-controls" id="cc-colab-pag-controls"></div>
    </div>` : ''}`;

  if (ccColabData.length > 0) _renderCCColabTable();
}

function filtrarCCColab(q) {
  ccColabQuery = (q || '').trim().toLowerCase();
  ccColabPage = 1;
  _renderCCColabTable();
}

function goCCColabPage(p) {
  ccColabPage = p;
  _renderCCColabTable();
}

function _renderCCColabTable() {
  const fmt = n => Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const filtrados = ccColabQuery
    ? ccColabData.filter(c =>
        (c.nombre || '').toLowerCase().includes(ccColabQuery) ||
        (c.documento || '').toLowerCase().includes(ccColabQuery))
    : ccColabData;

  const total   = filtrados.length;
  const maxPage = Math.max(1, Math.ceil(total / ccColabPageSize));
  if (ccColabPage > maxPage) ccColabPage = 1;
  const from  = (ccColabPage - 1) * ccColabPageSize;
  const slice = filtrados.slice(from, from + ccColabPageSize);

  const countEl = document.getElementById('cc-colab-count');
  if (countEl) countEl.textContent = `${filtrados.length} colaborador${filtrados.length === 1 ? '' : 'es'}`;

  const tbody = document.getElementById('cc-colab-tbody');
  if (tbody) {
    tbody.innerHTML = slice.length === 0
      ? `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-light)">Sin resultados para esa búsqueda</td></tr>`
      : slice.map(c => `
        <tr>
          <td class="td-tipo">${c.nombre}</td>
          <td>${c.documento}</td>
          <td class="td-cant">${c.cantidad_dispositivos}</td>
          <td><strong>$ ${fmt(c.costo_arrendamiento)}</strong></td>
        </tr>`).join('');
  }

  const totalArrend = filtrados.reduce((s, c) => s + c.costo_arrendamiento, 0);
  const totalDisp   = filtrados.reduce((s, c) => s + c.cantidad_dispositivos, 0);
  const tfoot = document.getElementById('cc-colab-tfoot');
  if (tfoot) {
    tfoot.innerHTML = `
      <tr>
        <td class="td-total-label">TOTAL${ccColabQuery ? ' (filtrado)' : ''}</td>
        <td></td>
        <td class="td-total-val">${totalDisp}</td>
        <td><strong>$ ${fmt(totalArrend)}</strong></td>
      </tr>`;
  }

  const fromEl  = document.getElementById('cc-colab-pag-from');
  const toEl    = document.getElementById('cc-colab-pag-to');
  const totalEl = document.getElementById('cc-colab-pag-total');
  if (fromEl)  fromEl.textContent  = total === 0 ? 0 : from + 1;
  if (toEl)    toEl.textContent    = Math.min(from + ccColabPageSize, total);
  if (totalEl) totalEl.textContent = total;

  const ctrl = document.getElementById('cc-colab-pag-controls');
  if (ctrl) {
    let html = `<button class="pag-btn" ${ccColabPage <= 1 ? 'disabled' : ''} onclick="goCCColabPage(${ccColabPage - 1})">
      <i class="fas fa-chevron-left"></i></button>`;
    buildPages(ccColabPage, maxPage).forEach(p => {
      html += p === '...'
        ? `<span class="pag-btn" style="border:none;cursor:default">…</span>`
        : `<button class="pag-btn ${p === ccColabPage ? 'active' : ''}" onclick="goCCColabPage(${p})">${p}</button>`;
    });
    html += `<button class="pag-btn" ${ccColabPage >= maxPage ? 'disabled' : ''} onclick="goCCColabPage(${ccColabPage + 1})">
      <i class="fas fa-chevron-right"></i></button>`;
    ctrl.innerHTML = html;
  }
}

// ============================================================
// INACTIVOS
// ============================================================
async function loadInactivos() {
  if (inacLoading || _suppressChange) return;
  inacLoading = true;
  try {
    const q      = (document.getElementById('inac-search')        || {}).value || '';
    const tipo   = (document.getElementById('inac-filter-tipo')   || {}).value || '';
    const estado = (document.getElementById('inac-filter-estado') || {}).value || '';
    const params = new URLSearchParams();
    if (q)      params.set('q', q);
    if (tipo)   params.set('tipo_id', tipo);
    if (estado) params.set('estado_id', estado);
    const res = await apiFetch(`${API.inactivos}?${params}`);
    if (!res.ok) return;
    inacData = res.data.inactivos;
    const stats = res.data.stats;
    document.getElementById('inac-stat-total').textContent      = stats.total;
    document.getElementById('inac-stat-eliminados').textContent = stats.eliminados;
    document.getElementById('inac-stat-obsoletos').textContent  = stats.obsoletos;
    document.getElementById('inac-stat-devueltos').textContent  = stats.devueltos;
    inacPage = 1;
    _renderInacTable();
  } finally {
    inacLoading = false;
  }
}

function renderInactivos() { loadInactivos(); }

function _renderInacTable() {
  const sorted = [...inacData].sort((a, b) => {
    const va = a[inacSort] ?? '', vb = b[inacSort] ?? '';
    return typeof va === 'string'
      ? (inacSortAsc ? va.localeCompare(vb) : vb.localeCompare(va))
      : (inacSortAsc ? va - vb : vb - va);
  });
  const total   = sorted.length;
  const maxPage = Math.max(1, Math.ceil(total / inacPageSize));
  if (inacPage > maxPage) inacPage = 1;
  const from  = (inacPage - 1) * inacPageSize;
  const slice = sorted.slice(from, from + inacPageSize);
  document.getElementById('inac-pag-from').textContent  = total === 0 ? 0 : from + 1;
  document.getElementById('inac-pag-to').textContent    = Math.min(from + inacPageSize, total);
  document.getElementById('inac-pag-total').textContent = total;
  const tbody = document.getElementById('inac-tbody');
  tbody.innerHTML = slice.length === 0
    ? `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-search"></i><p>No se encontraron dispositivos</p></div></td></tr>`
    : slice.map(d => `
      <tr>
        <td><span class="serial-mono">${d.serial}</span></td>
        <td>${d.tipo}</td>
        <td>${d.marca}</td>
        <td><i class="fas fa-user" style="margin-right:6px;color:var(--gray-light);font-size:12px"></i>${d.propietario}</td>
        <td>${badgeHTML(d.estado)}</td>
        <td><div class="tbl-actions"><button class="tbl-btn edit" onclick="openInacEdit(${d.id})"><i class="fas fa-edit"></i></button></div></td>
      </tr>`).join('');
  const ctrl = document.getElementById('inac-pag-controls');
  let html = `<button class="pag-btn" ${inacPage <= 1 ? 'disabled' : ''} onclick="goInacPage(${inacPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
  buildPages(inacPage, maxPage).forEach(p => {
    html += p === '...'
      ? `<span class="pag-btn" style="border:none;cursor:default">…</span>`
      : `<button class="pag-btn ${p === inacPage ? 'active' : ''}" onclick="goInacPage(${p})">${p}</button>`;
  });
  html += `<button class="pag-btn" ${inacPage >= maxPage ? 'disabled' : ''} onclick="goInacPage(${inacPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
  ctrl.innerHTML = html;
}

function goInacPage(p) { inacPage = p; _renderInacTable(); }
function changeInacPageSize() {
  inacPageSize = parseInt(document.getElementById('inac-pag-size').value);
  inacPage = 1;
  _renderInacTable();
}
function sortInac(field) {
  if (inacSort === field) inacSortAsc = !inacSortAsc;
  else { inacSort = field; inacSortAsc = true; }
  inacPage = 1;
  _renderInacTable();
}

function openInacEdit(id) {
  const d = inacData.find(x => x.id === id);
  if (!d) return;
  document.getElementById('inacFormSub').textContent  = `Editando serial ${d.serial}`;
  document.getElementById('inac-f-tipo').value        = d.tipo_id        || '';
  document.getElementById('inac-f-serial').value      = d.serial         || '';
  document.getElementById('inac-f-marca').value       = d.marca_id       || '';
  document.getElementById('inac-f-prop').value        = d.propietario_id || '';
  document.getElementById('inac-f-co').value          = d.co_id          || '';
  document.getElementById('inac-f-estado').value      = d.estado_id      || '';
  document.getElementById('inac-f-obs').value         = d.observaciones  || '';
  document.getElementById('modalInacForm').classList.add('active');
}

async function saveInactivo() {
  const propId   = document.getElementById('inac-f-prop').value;
  const estadoId = document.getElementById('inac-f-estado').value;
  if (!propId || !estadoId) { showNotif('Campos requeridos', 'Completa los campos obligatorios', 'warning'); return; }
  const serial = document.getElementById('inac-f-serial').value.trim();
  const item   = inacData.find(x => x.serial === serial);
  if (!item) { showNotif('Error', 'No se encontró el inactivo', 'warning'); return; }
  const body = {
    serial,
    tipo_id:        document.getElementById('inac-f-tipo').value  || null,
    marca_id:       document.getElementById('inac-f-marca').value || null,
    propietario_id: propId,
    estado_id:      estadoId,
    co_id:          document.getElementById('inac-f-co').value    || null,
    observaciones:  document.getElementById('inac-f-obs').value,
  };
  const res = await apiFetch(API.editarInactivo(item.id), 'PUT', body);
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo guardar', 'warning'); return; }
  showNotif(' Actualizado', `El serial ${serial} fue modificado correctamente`, 'success', 4000);
  closeModal('modalInacForm');
  loadInactivos();
}

function exportarInactivos() {
  const rows = [['Serial', 'Tipo', 'Marca', 'Propietario', 'Estado', 'CO', 'Obs']];
  inacData.forEach(d => rows.push([
    d.serial, d.tipo, d.marca, d.propietario, d.estado, d.co || '', d.observaciones || '',
  ]));
  downloadCSV(rows, 'inactivos.csv');
  showNotif(' Exportado', 'Los inactivos fueron descargados en CSV', 'success');
}

// ============================================================
// CHECKLIST DE INVENTARIO
// ============================================================

// ── Sección embebida en el modal de Editar dispositivo ──

// Trae las preguntas activas que aplican a un tipo de dispositivo (las
// genéricas + las propias de ese tipo, ej. el checklist de PORTÁTIL),
// ya ordenadas por sección tal como las devuelve el backend.
async function fetchChecklistItems(tipoId) {
  const params = tipoId ? `?tipo_dispositivo_id=${tipoId}` : '';
  const res = await apiFetch(`${API.checklistItems}${params}`);
  return res.ok ? res.data.filter(i => i.activo) : [];
}

// Arma el HTML de una lista de preguntas agrupadas por sección, con
// botones Sí/No. `idPrefix` evita choques de id entre las 3 pantallas
// que usan esto (editar dispositivo, fila de Checklist, ver detalle);
// `toggleFnName` es el nombre de la función (mismo patrón (itemId, valor)
// en las 3) que se llama al marcar una respuesta.
// `toggleFnName` marca Sí/No (itemId, valor); `textoFnName` guarda el valor
// de una pregunta de texto libre (itemId, texto). Al cerrar cada sección se
// agrega su propio campo de observaciones (no uno solo general al final).
// Estado de cada tabla de sección ya renderizada (para poder paginarla sin
// perder lo que el usuario ya marcó). Clave: `${idPrefix}-${índice de sección}`.
let _chkSeccionState = {};

// Arma una tabla por sección (Item / Observación / Sí / No, igual que la
// plantilla en Excel), con paginador propio. `respuestasRef`/`textosRef` son
// los objetos {itemId: valor} del contexto que llama (edición, ver detalle,
// o el formulario nuevo) — se leen por referencia, así que se pintan solos
// tanto al renderizar por primera vez como al cambiar de página.
function _renderPreguntasAgrupadasHTML(items, idPrefix, toggleFnName, textoFnName, respuestasRef, textosRef) {
  if (!items.length) {
    return '<p style="margin:0;font-size:13px;color:var(--text-light);">No hay preguntas configuradas para este tipo de dispositivo. Usa "Administrar preguntas" para agregarlas.</p>';
  }
  const grupos = [];
  items.forEach(it => {
    const seccion = it.seccion || 'GENERAL';
    let g = grupos.find(x => x.seccion === seccion);
    if (!g) { g = { seccion, items: [] }; grupos.push(g); }
    g.items.push(it);
  });
  let html = '';
  grupos.forEach((g, idx) => {
    const key = `${idPrefix}-${idx}`;
    _chkSeccionState[key] = {
      items: g.items, page: 1, pageSize: 10,
      idPrefix, toggleFnName, textoFnName,
      respuestasRef: respuestasRef || {}, textosRef: textosRef || {},
    };
    html += `<div class="chk-seccion"><div class="chk-seccion-title">${g.seccion}</div><div id="${key}-wrap">${_renderSeccionTablaHTML(key)}</div></div>`;
  });
  return html;
}

// Nombre de la columna/campo de texto de cada sección: solo "Controlador de
// Dominio" usa "Observación" — las demás usan "Registro" con un placeholder
// propio de lo que se anota ahí (correo, usuario, código, etc.).
const CHK_CAMPO_SECCION = {
  'CONTROLADOR DE DOMINIO': { label: 'Observación' },
  'CORREO':                 { label: 'Registro' },
  'ERP':                    { label: 'Registro' },
  'APLICATIVOS':            { label: 'Registro' },
  'IMPRESORA':              { label: 'Registro' },
};
const CHK_CAMPO_DEFAULT = { label: 'Registro' };

// Placeholder propio de cada pregunta (no uno solo repetido por sección).
// Si una pregunta no está en este mapa (ej. una nueva agregada desde
// "Administrar preguntas"), usa un genérico según su sección.
const CHK_PLACEHOLDER_POR_PREGUNTA = {
  'NOMBRE DE PC':                          'Ej: PC-VENTAS-05',
  'INGRESAR EQUIPO AL DOMINIO':            'Ej: fecha o novedad',
  'CREAR USUARIO ADMINISTRADOR (LOCAL)':   'Ej: nombre del usuario local',
  'CREAR USUARIO DEL DOMINIO':             'Ej: nombre de usuario del dominio',
  'ASIGNAR GRUPO DE AREA':                 'Ej: nombre del grupo asignado',
  'PERMISOS EN ARCHIVOS COMPARTIDOS':      'Ej: carpetas con acceso',
  'CREAR CUENTA DE CORREO ELECTRONICO':    'Ej: correo@montacargasamym.com',
  'ASIGNACION DE GRUPOS DE CORREO':        'Ej: nombre del grupo de correo',
  'CONFIGURACION DE CONTACTO':             'Ej: datos del contacto configurado',
  'ASIGNACION DE CLAVE':                   'Ej: clave asignada',
  'CREACION DE USUARIO':                   'Ej: usuario ERP creado',
  'ASIGNACION DE GRUPO ERP':               'Ej: nombre del grupo ERP',
  'ANYDESK (CODIGO)':                      'Ej: código de AnyDesk',
  'CLAVE DE ANYDESK':                      'Ej: clave de AnyDesk',
  'OFFICE 365':                            'Ej: correo/licencia Office 365',
  'SIESA':                                 'Ej: usuario SIESA',
  'ACROBAT':                               'Ej: versión o licencia',
  'ANTIVIRUS':                             'Ej: nombre del antivirus instalado',
  'GOOGLE':                                'Ej: cuenta de Google',
  'MARCADORES DE GOOGLE':                  'Ej: marcadores configurados',
  'INSTALACION':                           'Ej: nombre o IP de la impresora',
  'USUARIO':                               'Ej: usuario asignado',
  'CODIGO':                                'Ej: código de la impresora',
};

function _chkPlaceholder(it, campoDefault) {
  return CHK_PLACEHOLDER_POR_PREGUNTA[(it.pregunta || '').toUpperCase()] || `${campoDefault.label}...`;
}

function _renderSeccionTablaHTML(key) {
  const st = _chkSeccionState[key];
  const total   = st.items.length;
  const maxPage = Math.max(1, Math.ceil(total / st.pageSize));
  if (st.page > maxPage) st.page = maxPage;
  const from  = (st.page - 1) * st.pageSize;
  const slice = st.items.slice(from, from + st.pageSize);
  const seccion = st.items[0]?.seccion || 'GENERAL';
  const campo = CHK_CAMPO_SECCION[seccion] || CHK_CAMPO_DEFAULT;

  const filas = slice.map(it => {
    const esSi = st.respuestasRef[it.id] === true;
    const esNo = st.respuestasRef[it.id] === false;
    const obs  = st.textosRef[it.id] || '';
    return `
    <tr>
      <td>${it.pregunta}</td>
      <td><input type="text" class="form-input chk-obs-input" spellcheck="false" value="${obs.replace(/"/g, '&quot;')}" id="${st.idPrefix}-obs-${it.id}" placeholder="${_chkPlaceholder(it, campo)}" oninput="${st.textoFnName}(${it.id}, this.value)"></td>
      <td style="text-align:center;"><button type="button" class="chk-toggle-btn ${esSi ? 'active-si' : ''}" id="${st.idPrefix}-si-${it.id}" onclick="${st.toggleFnName}(${it.id}, true)"><i class="fas fa-check"></i></button></td>
      <td style="text-align:center;"><button type="button" class="chk-toggle-btn ${esNo ? 'active-no' : ''}" id="${st.idPrefix}-no-${it.id}" onclick="${st.toggleFnName}(${it.id}, false)"><i class="fas fa-xmark"></i></button></td>
    </tr>`;
  }).join('');

  const pagHtml = total <= st.pageSize ? '' : `
    <div class="pagination-wrap chk-seccion-pag">
      <div class="pag-info">Mostrando ${total === 0 ? 0 : from + 1}–${Math.min(from + st.pageSize, total)} de ${total}</div>
      <div class="pag-controls">
        <button class="pag-btn" ${st.page <= 1 ? 'disabled' : ''} onclick="_chkSeccionGoPage('${key}', ${st.page - 1})"><i class="fas fa-chevron-left"></i></button>
        <button class="pag-btn" ${st.page >= maxPage ? 'disabled' : ''} onclick="_chkSeccionGoPage('${key}', ${st.page + 1})"><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>`;

  return `
    <table class="data-table chk-seccion-table">
      <thead><tr><th>Item</th><th>${campo.label}</th><th style="text-align:center;width:56px;">Sí</th><th style="text-align:center;width:56px;">No</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>${pagHtml}`;
}

function _chkSeccionGoPage(key, page) {
  _chkSeccionState[key].page = page;
  const wrap = document.getElementById(`${key}-wrap`);
  wrap.innerHTML = _renderSeccionTablaHTML(key);
  if (key.startsWith('chkdet-') && !_chkDetEditando) {
    wrap.querySelectorAll('button, input').forEach(el => el.disabled = true);
  }
}

function _hideChecklistEditSection() {
  const sec = document.getElementById('chkSectionEdit');
  if (sec) sec.style.display = 'none';
  _chkRespuestas = {};
  _chkTextos = {};
}

async function _onEstadoEditChange() {
  const sel = document.getElementById('f-estado');
  const texto = (sel.selectedOptions[0]?.textContent || '').trim().toUpperCase();
  if (ESTADOS_INACTIVOS_UI.includes(texto)) {
    await _showChecklistEditSection();
  } else {
    _hideChecklistEditSection();
  }
}

async function _showChecklistEditSection() {
  const tipoId = document.getElementById('f-tipo')?.value || '';
  const items = await fetchChecklistItems(tipoId);
  // Si el tipo de dispositivo no tiene preguntas de checklist configuradas
  // (hoy en día, todo menos Portátil), no tiene sentido mostrar la sección
  // ni dejar que se guarde un checklist vacío — se oculta igual que si el
  // estado nuevo no fuera inactivo.
  if (items.length === 0) { _hideChecklistEditSection(); return; }
  _chkRespuestas = {};
  _chkTextos = {};
  document.getElementById('chkEditPreguntas').innerHTML = _renderPreguntasAgrupadasHTML(items, 'chk-edit', '_toggleChkRespuesta', '_setTextoChkRespuesta', _chkRespuestas, _chkTextos);
  document.getElementById('chkSectionEdit').style.display = '';
}

function _toggleChkRespuesta(itemId, valor) {
  _chkRespuestas[itemId] = valor;
  const siBtn = document.getElementById(`chk-edit-si-${itemId}`);
  const noBtn = document.getElementById(`chk-edit-no-${itemId}`);
  if (siBtn) siBtn.classList.toggle('active-si', valor === true);
  if (noBtn) noBtn.classList.toggle('active-no', valor === false);
}

function _setTextoChkRespuesta(itemId, valor) {
  _chkTextos[itemId] = valor;
}

function _buildChecklistPayload() {
  const idsRespuestas = new Set([...Object.keys(_chkRespuestas), ...Object.keys(_chkTextos)]);
  const respuestas = Array.from(idsRespuestas).map(itemId => ({
    item_id: parseInt(itemId),
    respuesta: _chkRespuestas[itemId] || false,
    valor_texto: _chkTextos[itemId] || '',
  }));
  return { respuestas };
}

// ── Pantalla "Checklist" (buscar → aviso → continuar → formulario) ──

let _chkResultadosData = [];
let _chkDispositivoSeleccionado = null;
let _chkNuevoRespuestas = {};
let _chkNuevoTextos = {};

function _resetChecklistScreen() {
  const serialEl = document.getElementById('chk-buscar-serial');
  const tipoEl   = document.getElementById('chk-buscar-tipo');
  if (serialEl) serialEl.value = '';
  if (tipoEl)   tipoEl.value = '';
  closeModal('modalChecklistResultados');
  _volverBusquedaChecklist();
  cargarChecklistStats();
  cargarChecklistTiposDisponibles();
}

async function cargarChecklistTiposDisponibles() {
  const tipoEl = document.getElementById('chk-buscar-tipo');
  if (!tipoEl) return;
  const actual = tipoEl.value;
  const res = await apiFetch(API.checklistTiposDisponibles);
  const tipos = res.ok ? res.data : [];
  tipoEl.innerHTML = '<option value="">Seleccione una opción</option>' +
    tipos.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
  if (actual) tipoEl.value = actual;
}

async function cargarChecklistStats() {
  const res = await apiFetch(API.checklistStats);
  if (!res.ok) return;
  document.getElementById('chk-stat-con').textContent  = res.data.con_checklist;
  document.getElementById('chk-stat-pend').textContent = res.data.pendientes;
}

async function buscarChecklistDispositivo() {
  const tipo   = document.getElementById('chk-buscar-tipo').value;
  const serial = document.getElementById('chk-buscar-serial').value.trim();
  if (!tipo && !serial) {
    showNotif('Completa un filtro', 'Elige un tipo de dispositivo o escribe un serial para buscar', 'warning');
    return;
  }
  const params = new URLSearchParams();
  if (tipo)   params.set('tipo', tipo);
  if (serial) params.set('q', serial);
  const res = await apiFetch(`${API.checklistDispositivos}?${params}`);
  const lista = res.ok ? res.data : [];
  document.getElementById('chkResultadosSub').textContent = `${lista.length} dispositivo${lista.length === 1 ? '' : 's'} encontrado${lista.length === 1 ? '' : 's'}`;
  _renderResultadosChecklist(lista);
  document.getElementById('modalChecklistResultados').classList.add('active');
}

function _renderResultadosChecklist(lista) {
  _chkResultadosData = lista;
  const wrap = document.getElementById('chkResultados');
  wrap.innerHTML = lista.length === 0
    ? `<div class="empty-state"><i class="fas fa-magnifying-glass"></i><p>No se encontraron dispositivos con ese filtro.</p></div>`
    : lista.map(d => `
      <div class="chk-resultado-row">
        <div>
          <span class="serial-mono">${d.serial}</span>
          <span style="margin-left:10px;color:var(--text-light);font-size:12.5px;">${d.tipo} · ${d.responsable || 'Sin asignar'}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${badgeHTML(d.estado)}
          <span class="chk-badge ${d.checklist_realizado ? 'chk-badge-si' : 'chk-badge-no'}">
            <i class="fas fa-${d.checklist_realizado ? 'check' : 'xmark'}"></i> ${d.checklist_realizado ? 'Con checklist' : 'Sin checklist'}
          </span>
          ${d.checklist_realizado
            ? `<div class="tbl-actions">
                 <button type="button" class="tbl-btn info" title="Detalle del checklist" onclick="verChecklistDetalle(${d.ultimo_checklist_id})"><i class="fas fa-eye"></i></button>
                 <button type="button" class="tbl-btn edit" title="Editar checklist" onclick="editarChecklistDirecto(${d.ultimo_checklist_id})"><i class="fas fa-edit"></i></button>
                 <button type="button" class="tbl-btn info" title="Historial de checklists" onclick='verHistorialChecklistDispositivo(${d.id}, ${JSON.stringify(d.serial)})'><i class="fas fa-history"></i></button>
               </div>`
            : `<button type="button" class="btn-create" onclick="seleccionarDispositivoChecklist(${d.id})"><i class="fas fa-plus"></i> Ingresar checklist</button>`}
        </div>
      </div>`).join('');
}

function _dispositivoInfoHTML(d) {
  return `
    <div style="display:flex;align-items:center;gap:14px;padding:10px 0 14px;flex-wrap:wrap;">
      <span class="serial-mono" style="font-size:16px;">${d.serial}</span>
      ${badgeHTML(d.estado)}
      <span style="color:var(--text-light);font-size:13px;">${d.tipo} · ${d.responsable || 'Sin asignar'}</span>
    </div>`;
}

async function seleccionarDispositivoChecklist(id) {
  const d = _chkResultadosData.find(x => x.id === id);
  if (!d) return;
  _chkDispositivoSeleccionado = d;
  closeModal('modalChecklistResultados');

  const items = await fetchChecklistItems(d.tipo_id);
  _chkNuevoRespuestas = {};
  _chkNuevoTextos = {};
  document.getElementById('chkFormDispositivo').innerHTML = _dispositivoInfoHTML(d);
  document.getElementById('chkFormPreguntas').innerHTML = _renderPreguntasAgrupadasHTML(items, 'chknuevo', '_toggleChkNuevoRespuesta', '_setTextoChkNuevoRespuesta', _chkNuevoRespuestas, _chkNuevoTextos);
  _cargarHistorialAnteriorChecklist(d.id);
  document.getElementById('chk-resp-nombre').value = '';
  document.getElementById('chk-resp-cedula').value = '';
  document.getElementById('chk-resp-area').value   = '';
  document.getElementById('chk-resp-cargo').value  = '';
  document.getElementById('chk-nuevo-obs').value   = '';
  _precargarMiResponsable();
  const btnGuardar = document.getElementById('btnGuardarChecklistNuevo');
  if (btnGuardar) { btnGuardar.disabled = false; btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar checklist'; }
  document.getElementById('modalChecklistForm').classList.add('active');
}


// El login usa la cédula como usuario, así que siempre debe coincidir con
// un Colaborador — "Datos del Responsable" se toma de la sesión y no se
// puede editar (los 4 campos son de solo lectura): el responsable del
// checklist es quien tiene la sesión abierta, no alguien que se escriba.
async function _precargarMiResponsable() {
  const res = await apiFetch(API.checklistMiResponsable);
  if (!res.ok || !res.data) {
    showNotif('No se encontró tu colaborador', 'Tu usuario no está vinculado a un registro de Colaborador — pide al administrador que lo revise antes de guardar un checklist.', 'warning');
    return;
  }
  const c = res.data;
  document.getElementById('chk-resp-nombre').value = c.nombre;
  document.getElementById('chk-resp-cedula').value = c.documento;
  document.getElementById('chk-resp-area').value   = c.area;
  document.getElementById('chk-resp-cargo').value  = c.cargo;
}

async function _cargarHistorialAnteriorChecklist(dispositivoId) {
  const wrap = document.getElementById('chkHistorialAnterior');
  wrap.innerHTML = '';
  const res = await apiFetch(`${API.checklist}?dispositivo_id=${dispositivoId}`);
  const lista = res.ok ? res.data : [];
  if (lista.length === 0) return;
  wrap.innerHTML = `
    <div class="form-section-title" style="margin-bottom:8px;"><i class="fas fa-clock-rotate-left"></i> Checklists generados</div>
    <table class="data-table chk-mini-table"><thead><tr><th>Fecha</th><th>Responsable</th><th></th></tr></thead>
    <tbody>${lista.map(c => `
      <tr>
        <td>${c.fecha}</td>
        <td>${c.responsable}</td>
        <td><div class="tbl-actions">
          <button class="tbl-btn edit" onclick="verChecklistDetalle(${c.id})" title="Ver detalle"><i class="fas fa-eye"></i></button>
        </div></td>
      </tr>`).join('')}</tbody></table>`;
}

function _volverBusquedaChecklist() {
  closeModal('modalChecklistForm');
  _chkDispositivoSeleccionado = null;
}

function _toggleChkNuevoRespuesta(itemId, valor) {
  _chkNuevoRespuestas[itemId] = valor;
  const siBtn = document.getElementById(`chknuevo-si-${itemId}`);
  const noBtn = document.getElementById(`chknuevo-no-${itemId}`);
  if (siBtn) siBtn.classList.toggle('active-si', valor === true);
  if (noBtn) noBtn.classList.toggle('active-no', valor === false);
}

function _setTextoChkNuevoRespuesta(itemId, valor) {
  _chkNuevoTextos[itemId] = valor;
}

async function guardarChecklistNuevo() {
  const d = _chkDispositivoSeleccionado;
  if (!d) return;

  const respCedula = document.getElementById('chk-resp-cedula').value.trim();
  const respNombre = document.getElementById('chk-resp-nombre').value.trim();
  if (!respCedula || !respNombre) {
    showNotif('Falta el responsable', 'Escribe la cédula del responsable — el nombre se completa solo si es un colaborador registrado.', 'warning');
    document.getElementById('chk-resp-cedula').focus();
    return;
  }

  const idsRespuestas = new Set([...Object.keys(_chkNuevoRespuestas), ...Object.keys(_chkNuevoTextos)]);
  if (idsRespuestas.size === 0) {
    showNotif('Falta el checklist', 'Responde al menos una pregunta del checklist antes de guardar — no puede quedar solo con los datos del responsable.', 'warning');
    return;
  }

  const respuestas = Array.from(idsRespuestas).map(itemId => ({
    item_id: parseInt(itemId),
    respuesta: _chkNuevoRespuestas[itemId] || false,
    valor_texto: _chkNuevoTextos[itemId] || '',
  }));
  const body = {
    respuestas,
    observaciones: document.getElementById('chk-nuevo-obs').value,
    resp_nombre:   respNombre,
    resp_cedula:   respCedula,
    resp_area:     document.getElementById('chk-resp-area').value,
    resp_cargo:    document.getElementById('chk-resp-cargo').value,
  };
  const res = await apiFetch(API.checklistDispositivoGuardar(d.id), 'POST', body);
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo guardar el checklist', 'warning'); return; }
  showNotif(' Guardado', `Checklist del equipo ${d.serial} guardado correctamente`, 'success');
  cargarChecklistStats();
  _volverBusquedaChecklist();
}

let _chkDetId = null;
let _chkDetRespuestas = {};
let _chkDetTextos = {};

async function verChecklistDetalle(id) {
  const res = await apiFetch(API.checklistDetalle(id));
  if (!res.ok) { showNotif('Error', 'No se pudo cargar el checklist', 'warning'); return; }
  closeModal('modalChecklistResultados');
  const c = res.data;
  const items = await fetchChecklistItems(c.tipo_dispositivo_id || '');

  _chkDetId = id;
  _chkDetRespuestas = {};
  _chkDetTextos = {};
  document.getElementById('chkDetalleSub').textContent = `Serial ${c.serial} — ${c.fecha} — ${c.responsable}`;

  // Preguntas a mostrar: todas las activas que aplican a este tipo + cualquier
  // respuesta guardada de una pregunta que ya no esté activa/aplique (para no
  // perder el dato).
  const preguntas = [...items];
  c.respuestas.forEach(r => {
    if (r.item_id && !preguntas.some(p => p.id === r.item_id)) {
      preguntas.push({ id: r.item_id, pregunta: r.pregunta, seccion: '', activo: false });
    }
    if (r.item_id) {
      _chkDetRespuestas[r.item_id] = r.respuesta;
      _chkDetTextos[r.item_id] = r.valor_texto || '';
    }
  });

  document.getElementById('chkDetalleRespuestas').innerHTML = _renderPreguntasAgrupadasHTML(preguntas, 'chkdet', '_toggleChkDetRespuesta', '_setTextoChkDetRespuesta', _chkDetRespuestas, _chkDetTextos);

  document.getElementById('chkdet-resp-nombre').value = c.resp_nombre || '';
  document.getElementById('chkdet-resp-cedula').value = c.resp_cedula || '';
  document.getElementById('chkdet-resp-area').value   = c.resp_area || '';
  document.getElementById('chkdet-resp-cargo').value  = c.resp_cargo || '';
  document.getElementById('chkdet-obs').value         = c.observaciones || '';

  _setModoChecklistDetalle(false);
  document.getElementById('modalChecklistDetalle').classList.add('active');
}

let _chkDetEditando = false;

function _setModoChecklistDetalle(editando) {
  _chkDetEditando = editando;
  document.querySelectorAll('#chkDetalleRespuestas button, #chkDetalleRespuestas input').forEach(el => el.disabled = !editando);
  document.getElementById('chkdet-obs').disabled = !editando;
  document.getElementById('chkDetalleTitulo').textContent = editando ? 'Editar Checklist' : 'Detalle del Checklist';
  document.getElementById('chkDetalleHint').textContent = editando
    ? 'Corrige lo que necesites y da clic en "Guardar cambios".'
    : 'Solo lectura — haz clic en "Editar checklist" para corregir algo.';
  document.getElementById('btnChkDetalleEditar').style.display = editando ? 'none' : '';
  document.getElementById('btnChkDetalleGuardar').style.display = editando ? '' : 'none';
  document.getElementById('btnChkDetallePdf').style.display = 'none';
}

function _activarEdicionChecklistDetalle() {
  _setModoChecklistDetalle(true);
}

function _toggleChkDetRespuesta(itemId, valor) {
  _chkDetRespuestas[itemId] = valor;
  const siBtn = document.getElementById(`chkdet-si-${itemId}`);
  const noBtn = document.getElementById(`chkdet-no-${itemId}`);
  if (siBtn) siBtn.classList.toggle('active-si', valor === true);
  if (noBtn) noBtn.classList.toggle('active-no', valor === false);
}

function _setTextoChkDetRespuesta(itemId, valor) {
  _chkDetTextos[itemId] = valor;
}

async function guardarEdicionChecklist() {
  if (!_chkDetId) return;

  const respCedula = document.getElementById('chkdet-resp-cedula').value.trim();
  const respNombre = document.getElementById('chkdet-resp-nombre').value.trim();
  if (!respCedula || !respNombre) {
    showNotif('Falta el responsable', 'Escribe la cédula del responsable — el nombre se completa solo si es un colaborador registrado.', 'warning');
    document.getElementById('chkdet-resp-cedula').focus();
    return;
  }

  const idsRespuestas = new Set([...Object.keys(_chkDetRespuestas), ...Object.keys(_chkDetTextos)]);
  if (idsRespuestas.size === 0) {
    showNotif('Falta el checklist', 'Responde al menos una pregunta del checklist antes de guardar — no puede quedar solo con los datos del responsable.', 'warning');
    return;
  }

  const respuestas = Array.from(idsRespuestas).map(itemId => ({
    item_id: parseInt(itemId),
    respuesta: _chkDetRespuestas[itemId] || false,
    valor_texto: _chkDetTextos[itemId] || '',
  }));
  const body = {
    respuestas,
    observaciones: document.getElementById('chkdet-obs').value,
    resp_nombre:   respNombre,
    resp_cedula:   respCedula,
    resp_area:     document.getElementById('chkdet-resp-area').value,
    resp_cargo:    document.getElementById('chkdet-resp-cargo').value,
  };

  const res = await apiFetch(API.checklistEditar(_chkDetId), 'PUT', body);
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo guardar', 'warning'); return; }
  showNotif(' Actualizado', 'El checklist fue corregido correctamente', 'success');
  closeModal('modalChecklistDetalle');
}

function descargarChecklistPdf(id) {
  const a = document.createElement('a');
  a.href = API.checklistPdf(id || _chkDetId);
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function verVistaPreviaChecklist(id) {
  // No se cierra "Historial de Checklists" — queda debajo (mismo z-index,
  // pero este modal va después en el HTML así que se pinta encima) para
  // que al cerrar la vista previa el usuario vuelva directo al historial
  // y pueda abrir el otro registro sin tener que reabrirlo desde cero.
  const body = document.getElementById('chkPreviewBody');
  body.innerHTML = `<div class="empty-state" style="color:#fff"><i class="fas fa-spinner fa-spin"></i><p>Cargando…</p></div>`;
  document.getElementById('btnChkPreviewPdf').onclick = () => descargarChecklistPdf(id);
  document.getElementById('modalChecklistVistaPrevia').classList.add('active');

  const res = await apiFetch(API.checklistDetalle(id));
  if (!res.ok) {
    body.innerHTML = `<div class="empty-state" style="color:#fff"><i class="fas fa-triangle-exclamation"></i><p>No se pudo cargar el checklist.</p></div>`;
    return;
  }
  body.innerHTML = _construirVistaPreviaChecklistHTML(res.data);
}

const CHK_PREVIEW_CAMPO_SECCION = { 'CONTROLADOR DE DOMINIO': 'OBSERVACIÓN' };

function _construirVistaPreviaChecklistHTML(c) {
  const seccionesMap = {};
  const ordenSecciones = [];
  c.respuestas.forEach(r => {
    if (!seccionesMap[r.seccion]) { seccionesMap[r.seccion] = []; ordenSecciones.push(r.seccion); }
    seccionesMap[r.seccion].push(r);
  });

  const seccionesHTML = ordenSecciones.map(seccion => {
    const campo = CHK_PREVIEW_CAMPO_SECCION[seccion] || 'REGISTRO';
    const filas = seccionesMap[seccion].map(r => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #e5e7eb">${r.pregunta}</td>
        <td style="padding:8px 10px;border:1px solid #e5e7eb;font-size:12px;color:#374151">${r.valor_texto || '&nbsp;'}</td>
        <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:center;color:#15803d;font-size:15px">${r.respuesta ? '<i class="fas fa-check"></i>' : ''}</td>
        <td style="padding:8px 10px;border:1px solid #e5e7eb;text-align:center;color:#b91c1c;font-size:15px">${!r.respuesta ? '<i class="fas fa-times"></i>' : ''}</td>
      </tr>`).join('');
    return `
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:13px;table-layout:fixed">
        <colgroup><col style="width:38%"><col style="width:37%"><col style="width:12.5%"><col style="width:12.5%"></colgroup>
        <thead>
          <tr style="background:#1e3a5f;color:#fff">
            <th colspan="4" style="padding:7px 10px;text-align:left;font-size:11px;letter-spacing:.03em">${seccion}</th>
          </tr>
          <tr style="background:#e5edf5">
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#374151">ITEM</th>
            <th style="padding:7px 10px;text-align:left;font-size:11px;color:#374151">${campo}</th>
            <th style="padding:7px 10px;text-align:center;font-size:11px;color:#374151">SI</th>
            <th style="padding:7px 10px;text-align:center;font-size:11px;color:#374151">NO</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>`;
  }).join('');

  return `
    <div style="font-family:Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:36px;max-width:820px;margin:0 auto;border-radius:8px;box-sizing:border-box;">
      <table style="width:100%;margin-bottom:6px;border-bottom:2px solid #111;padding-bottom:12px">
        <tr>
          <td style="width:170px;vertical-align:middle">
            ${c.logo
              ? `<img src="${c.logo}" style="max-height:85px;max-width:130px;display:block">`
              : `<div style="font-size:22px;font-weight:700;color:#1e3a5f">AM&amp;M</div>`}
          </td>
          <td style="text-align:center;vertical-align:middle;padding:0 10px">
            <div style="font-size:14px;font-weight:700;text-transform:uppercase">CHECKLIST DE INGRESO Y EGRESO DE EQUIPOS</div>
            <div style="font-size:11.5px;font-weight:600;margin-top:4px">GESTIÓN DE TECNOLOGÍA DE LA INFORMACIÓN Y LA COMUNICACIÓN</div>
          </td>
          <td style="width:110px"></td>
        </tr>
      </table>
      <table style="width:100%;margin-bottom:14px;font-size:12px">
        <tr>
          <td style="width:150px;padding:3px 0"><b>FECHA:</b></td>
          <td style="padding:3px 0">${c.fecha}</td>
          <td style="width:150px;padding:3px 0"><b>SERIAL:</b></td>
          <td style="padding:3px 0">${c.serial}</td>
        </tr>
        <tr>
          <td style="padding:3px 0"><b>TIPO DE EQUIPO:</b></td>
          <td style="padding:3px 0">${c.tipo}</td>
          <td style="padding:3px 0"><b>REGISTRADO POR:</b></td>
          <td style="padding:3px 0">${c.responsable}</td>
        </tr>
        <tr>
          <td style="padding:3px 0"><b>ASIGNADO A:</b></td>
          <td colspan="3" style="padding:3px 0">${c.asignado_a}</td>
        </tr>
      </table>
      ${seccionesHTML}
      <table style="width:100%;margin-top:6px;font-size:12px">
        <tr style="background:#1e3a5f;color:#fff">
          <td colspan="4" style="padding:7px 10px;font-weight:700;text-align:center">DATOS DEL RESPONSABLE</td>
        </tr>
        <tr>
          <td style="padding:6px 10px;border:1px solid #cbd5e1;background:#e5edf5;font-weight:700;width:22%">NOMBRE COMPLETO</td>
          <td colspan="3" style="padding:6px 10px;border:1px solid #cbd5e1">${c.resp_nombre || '&nbsp;'}</td>
        </tr>
        <tr>
          <td style="padding:6px 10px;border:1px solid #cbd5e1;background:#e5edf5;font-weight:700">CEDULA</td>
          <td colspan="3" style="padding:6px 10px;border:1px solid #cbd5e1">${c.resp_cedula || '&nbsp;'}</td>
        </tr>
        <tr>
          <td style="padding:6px 10px;border:1px solid #cbd5e1;background:#e5edf5;font-weight:700">AREA</td>
          <td style="padding:6px 10px;border:1px solid #cbd5e1;width:33%">${c.resp_area || '&nbsp;'}</td>
          <td style="padding:6px 10px;border:1px solid #cbd5e1;background:#e5edf5;font-weight:700;width:20%">CARGO</td>
          <td style="padding:6px 10px;border:1px solid #cbd5e1">${c.resp_cargo || '&nbsp;'}</td>
        </tr>
      </table>
      <table style="width:100%;margin-top:14px;font-size:12px">
        <tr style="background:#1e3a5f;color:#fff">
          <td style="padding:7px 10px;font-weight:700">OBSERVACIONES:</td>
        </tr>
        <tr>
          <td style="padding:12px 10px;border:1px solid #cbd5e1;min-height:60px;vertical-align:top">${c.observaciones || '&nbsp;'}</td>
        </tr>
      </table>
    </div>`;
}

async function editarChecklistDirecto(id) {
  await verChecklistDetalle(id);
  _activarEdicionChecklistDetalle();
}

async function verHistorialChecklistDispositivo(dispositivoId, serial) {
  closeModal('modalChecklistResultados');
  document.getElementById('chkHistDispSub').textContent = `Serial ${serial}`;
  const body = document.getElementById('chkHistDispBody');
  body.innerHTML = `<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando…</p></div>`;
  document.getElementById('modalChecklistHistorialDispositivo').classList.add('active');

  const res = await apiFetch(`${API.checklist}?dispositivo_id=${dispositivoId}`);
  const lista = res.ok ? res.data : [];
  if (lista.length === 0) {
    body.innerHTML = `<div class="empty-state"><i class="fas fa-clock-rotate-left"></i><p>Este dispositivo no tiene checklists registrados.</p></div>`;
    return;
  }
  // Cada checklist puede generar hasta 2 entradas en esta lista: la de
  // creación siempre, y la de edición solo si ya se corrigió alguna vez
  // (fecha_edicion). Ambas apuntan al mismo checklist (es el mismo
  // registro corregido, no uno nuevo) — ver "Ver detalle".
  const eventos = [];
  lista.forEach(c => {
    eventos.push({ id: c.id, fecha: c.fecha, responsable: c.responsable, tipo: 'creado' });
    if (c.fecha_edicion) {
      eventos.push({ id: c.id, fecha: c.fecha_edicion, responsable: c.responsable, tipo: 'editado' });
    }
  });
  // "dd/mm/yyyy HH:MM" no se puede comparar como texto directo (agosto
  // quedaría después de septiembre) — se reordena a "yyyy-mm-dd HH:MM" solo
  // para poder ordenar cronológicamente, sin tocar cómo se muestra.
  const _comparable = f => {
    const m = f.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2})$/);
    return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}` : f;
  };
  eventos.sort((a, b) => _comparable(b.fecha).localeCompare(_comparable(a.fecha)));

  body.innerHTML = `<div class="chk-hist-list">${eventos.map(ev => `
    <div class="chk-hist-item">
      <div class="chk-hist-item-info">
        <div class="chk-hist-item-icon ${ev.tipo === 'editado' ? 'chk-hist-item-icon-editado' : ''}">
          <i class="fas ${ev.tipo === 'editado' ? 'fa-pen' : 'fa-clipboard-check'}"></i>
        </div>
        <div class="chk-hist-item-text">
          <div class="chk-hist-item-fecha">${ev.fecha}</div>
          <div class="chk-hist-item-resp">${ev.responsable}</div>
          <div class="chk-hist-item-tipo ${ev.tipo === 'editado' ? 'chk-hist-item-editado' : ''}">${ev.tipo === 'editado' ? 'Checklist editado' : 'Checklist creado'}</div>
        </div>
      </div>
      <div class="tbl-actions">
        <button class="tbl-btn edit" onclick="verVistaPreviaChecklist(${ev.id})" title="Vista previa del checklist"><i class="fas fa-eye"></i></button>
      </div>
    </div>`).join('')}</div>`;
}

// ── Administrar preguntas (catálogo) ──

async function abrirAdminPreguntasChecklist() {
  document.getElementById('chk-item-nueva').value = '';
  document.getElementById('chk-item-seccion').value = '';
  const tipoSelect = document.getElementById('chk-item-tipo');
  // Hoy el checklist solo aplica a Portátil, así que se deja preseleccionado
  // para no tener que elegirlo cada vez (se puede cambiar si hace falta).
  const opcionPortatil = Array.from(tipoSelect.options).find(o => o.textContent.trim().toUpperCase() === 'PORTATIL');
  tipoSelect.value = opcionPortatil ? opcionPortatil.value : '';
  await _cargarYRenderAdminPreguntas();
  document.getElementById('modalAdminPreguntas').classList.add('active');
}

async function _cargarYRenderAdminPreguntas() {
  const res = await apiFetch(API.checklistItems);
  const items = res.ok ? res.data : [];

  const secciones = [...new Set(items.map(it => it.seccion).filter(Boolean))].sort();
  document.getElementById('chk-secciones-list').innerHTML =
    secciones.map(s => `<option value="${s}"></option>`).join('');

  const wrap = document.getElementById('chk-items-lista');
  if (items.length === 0) {
    wrap.innerHTML = '<p style="font-size:13px;color:var(--text-light);">No hay preguntas creadas todavía.</p>';
    return;
  }
  let html = '';
  let grupoActual = null;
  items.forEach(it => {
    const clave = `${it.seccion || 'GENERAL'} — ${it.tipo_dispositivo_nombre || 'Todos los tipos'}`;
    if (clave !== grupoActual) {
      if (grupoActual !== null) html += '</div>';
      html += `<div class="chk-seccion"><div class="chk-seccion-title">${clave}</div>`;
      grupoActual = clave;
    }
    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.06);">
        <span style="font-size:13.5px;${it.activo ? '' : 'color:var(--text-light);text-decoration:line-through;'}">${it.pregunta}</span>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-light);flex-shrink:0;">
          <input type="checkbox" ${it.activo ? 'checked' : ''} onchange="toggleItemChecklistActivo(${it.id}, this.checked)"> Activa
        </label>
      </div>`;
  });
  if (grupoActual !== null) html += '</div>';
  wrap.innerHTML = html;
}

async function crearItemChecklist() {
  const input = document.getElementById('chk-item-nueva');
  const pregunta = input.value.trim();
  if (!pregunta) { showNotif('Campo requerido', 'Escribe el texto de la pregunta', 'warning'); return; }
  const seccion = document.getElementById('chk-item-seccion').value.trim();
  const tipoId  = document.getElementById('chk-item-tipo').value || null;
  const res = await apiFetch(API.checklistItemCrear, 'POST', { pregunta, seccion, tipo_dispositivo_id: tipoId });
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo crear la pregunta', 'warning'); return; }
  input.value = '';
  await _cargarYRenderAdminPreguntas();
  showNotif(' Agregada', 'La pregunta fue agregada al checklist', 'success');
}

async function toggleItemChecklistActivo(id, activo) {
  const res = await apiFetch(API.checklistItemEditar(id), 'PUT', { activo });
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo actualizar', 'warning'); return; }
  await _cargarYRenderAdminPreguntas();
}

// ============================================================
// NOVEDADES GENERALES — bitácora independiente (no se liga a
// dispositivos ni colaboradores). Catálogo de tipos + campos
// dinámicos por tipo, mismo patrón que Checklist de Inventario.
// ============================================================
let NOV_DATA = [];
let novPage = 1;
let novPageSize = 10;
let _novCamposRespuestas = {};
let _novDetalleId = null; // novedad abierta en el modal de detalle, para "Descargar todos"

async function loadNovedades() {
  await cargarNovTiposFiltro();
  const q      = (document.getElementById('nov-search')       || {}).value || '';
  const tipo   = (document.getElementById('nov-filter-tipo')  || {}).value || '';
  const desde  = (document.getElementById('nov-filter-desde') || {}).value || '';
  const hasta  = (document.getElementById('nov-filter-hasta') || {}).value || '';
  const params = new URLSearchParams();
  if (q)     params.set('q', q);
  if (tipo)  params.set('tipo_id', tipo);
  if (desde) params.set('fecha_desde', desde);
  if (hasta) params.set('fecha_hasta', hasta);
  const res = await apiFetch(`${API.novedadesLista}?${params}`);
  if (!res.ok) { showNotif('Error', 'No se pudo cargar las novedades', 'warning'); return; }
  NOV_DATA = res.data;
  novPage = 1;
  _renderNovTable();
}

function renderNovedades() { loadNovedades(); }

async function cargarNovTiposFiltro() {
  const sel = document.getElementById('nov-filter-tipo');
  if (!sel) return;
  const actual = sel.value;
  const res = await apiFetch(API.novedadesTipos);
  const tipos = res.ok ? res.data : [];
  sel.innerHTML = '<option value="">Todos los tipos</option>' +
    tipos.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
  if (actual) sel.value = actual;
}

function _renderNovTable() {
  const total   = NOV_DATA.length;
  const maxPage = Math.max(1, Math.ceil(total / novPageSize));
  if (novPage > maxPage) novPage = 1;
  const from  = (novPage - 1) * novPageSize;
  const slice = NOV_DATA.slice(from, from + novPageSize);
  document.getElementById('nov-pag-from').textContent  = total === 0 ? 0 : from + 1;
  document.getElementById('nov-pag-to').textContent    = Math.min(from + novPageSize, total);
  document.getElementById('nov-pag-total').textContent = total;
  const tbody = document.getElementById('nov-tbody');
  tbody.innerHTML = slice.length === 0
    ? `<tr><td colspan="4"><div class="empty-state">
         <i class="fas fa-bullhorn"></i><p>No se encontraron novedades</p>
       </div></td></tr>`
    : slice.map(n => `
      <tr onclick="verNovedadDetalle(${n.id})">
        <td><span class="serial-mono">${n.fecha}</span></td>
        <td>${n.tipo}</td>
        <td>${n.responsable} ${n.tiene_adjuntos ? '<i class="fas fa-paperclip" style="color:var(--text-light);margin-left:4px;" title="Tiene adjuntos"></i>' : ''}</td>
        <td onclick="event.stopPropagation()">
          <div class="tbl-actions">
            <button class="tbl-btn info" onclick="verNovedadDetalle(${n.id})"><i class="fas fa-eye"></i></button>
          </div>
        </td>
      </tr>`).join('');
  renderNovPagination(total, maxPage);
}

function renderNovPagination(total, maxPage) {
  const ctrl = document.getElementById('nov-pag-controls');
  let html = `<button class="pag-btn" ${novPage <= 1 ? 'disabled' : ''} onclick="novGoPage(${novPage - 1})">
    <i class="fas fa-chevron-left"></i></button>`;
  buildPages(novPage, maxPage).forEach(p => {
    html += p === '...'
      ? `<span class="pag-btn" style="border:none;cursor:default">…</span>`
      : `<button class="pag-btn ${p === novPage ? 'active' : ''}" onclick="novGoPage(${p})">${p}</button>`;
  });
  html += `<button class="pag-btn" ${novPage >= maxPage ? 'disabled' : ''} onclick="novGoPage(${novPage + 1})">
    <i class="fas fa-chevron-right"></i></button>`;
  ctrl.innerHTML = html;
}

function novGoPage(p) { novPage = p; _renderNovTable(); }
function changeNovPageSize() {
  novPageSize = parseInt(document.getElementById('nov-pag-size').value);
  novPage = 1;
  _renderNovTable();
}

// ── Registrar novedad ──

let _novAdjuntosStaged = []; // archivos elegidos, aun no subidos (se suben al guardar)

async function abrirRegistrarNovedad() {
  document.getElementById('nov-campos-dinamicos').innerHTML = '';
  _novCamposRespuestas = {};
  _novAdjuntosStaged = [];
  document.getElementById('nov-adjuntos-input').value = '';
  document.getElementById('nov-adjuntos-preview').innerHTML = '';
  document.getElementById('nov-adjuntos-seccion').style.display = 'none';
  const sel = document.getElementById('nov-tipo');
  const res = await apiFetch(API.novedadesTipos);
  const tipos = (res.ok ? res.data : []).filter(t => t.activo);
  sel.innerHTML = '<option value="">Selecciona un tipo</option>' +
    tipos.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
  sel.value = '';
  document.getElementById('modalRegistrarNovedad').classList.add('active');
}

async function _cargarCamposNovedad() {
  const tipoId = document.getElementById('nov-tipo').value;
  const wrap = document.getElementById('nov-campos-dinamicos');
  _novCamposRespuestas = {};
  // Adjuntos también se ocultan hasta que haya un tipo elegido — no tiene
  // sentido dejar adjuntar algo antes de saber a qué novedad va.
  document.getElementById('nov-adjuntos-seccion').style.display = tipoId ? '' : 'none';
  if (!tipoId) { wrap.innerHTML = ''; return; }
  const res = await apiFetch(`${API.novedadesCampos}?tipo_id=${tipoId}`);
  const campos = res.ok ? res.data : [];
  if (campos.length === 0) {
    wrap.innerHTML = `<p style="font-size:12.5px;color:var(--text-light);">Este tipo de novedad no tiene campos configurados.</p>`;
    return;
  }
  wrap.innerHTML = `
    <div class="chk-seccion">
      <div class="chk-seccion-title"><i class="fas fa-list-check"></i> Campos de la novedad</div>
      <div class="chk-resp-body" style="display:flex;flex-direction:column;gap:12px;">
        ${campos.map(c => `
          <div class="form-group" style="margin:0;">
            <label class="form-label">${c.nombre}</label>
            <input class="form-input" type="text" placeholder="Observación..." spellcheck="false"
              oninput="_novCamposRespuestas[${c.id}] = this.value">
          </div>`).join('')}
      </div>
    </div>`;
}

// ── Adjuntos (Registrar novedad): se eligen y se ven de una vez con
// URL.createObjectURL — no se suben todavía, se quedan en memoria hasta
// que se guarde la novedad (necesita su id para asociarlos). ──

function _novAdjuntosSeleccionados(fileList) {
  Array.from(fileList).forEach(f => _novAdjuntosStaged.push(f));
  document.getElementById('nov-adjuntos-input').value = ''; // permite volver a elegir el mismo archivo si lo quita y lo agrega de nuevo
  _renderNovAdjuntosPreview();
}

function _novQuitarAdjuntoStaged(idx) {
  _novAdjuntosStaged.splice(idx, 1);
  _renderNovAdjuntosPreview();
}

function _renderNovAdjuntosPreview() {
  const wrap = document.getElementById('nov-adjuntos-preview');
  wrap.innerHTML = _novAdjuntosStaged.map((f, i) => {
    const esImagen = ADJUNTO_EXT_IMAGEN.includes((f.name.split('.').pop() || '').toLowerCase());
    return `
      <div class="nov-adjunto-card">
        <button type="button" class="nov-adjunto-quitar" onclick="_novQuitarAdjuntoStaged(${i})" title="Quitar"><i class="fas fa-times"></i></button>
        ${esImagen
          ? `<img src="${URL.createObjectURL(f)}" alt="${f.name}">`
          : `<div class="nov-adjunto-icono"><i class="fas fa-file-lines"></i></div>`}
        <div class="nov-adjunto-nombre" title="${f.name}">${f.name}</div>
      </div>`;
  }).join('');
}

async function guardarNovedad() {
  const tipoId = document.getElementById('nov-tipo').value;
  if (!tipoId) { showNotif('Falta el tipo', 'Elige un tipo de novedad', 'warning'); return; }
  const campos = Object.keys(_novCamposRespuestas).map(campoId => ({
    campo_id: parseInt(campoId),
    observacion: _novCamposRespuestas[campoId] || '',
  }));
  const body = { tipo_id: tipoId, campos };
  const res = await apiFetch(API.novedadesGuardar, 'POST', body);
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo guardar la novedad', 'warning'); return; }

  // Los adjuntos se suben en un segundo paso — novedadesGuardar recibe JSON
  // puro y no puede llevar binarios (mismo patrón que Requerimientos).
  if (_novAdjuntosStaged.length > 0) {
    const fallos = [];
    for (const archivo of _novAdjuntosStaged) {
      const fd = new FormData();
      fd.append('archivo', archivo);
      try {
        const ra = await fetch(API.novedadesAdjuntar(res.data.id), {
          method: 'POST', headers: { 'X-CSRFToken': getCookie('csrftoken') }, body: fd,
        });
        const respA = await ra.json();
        if (!respA.ok) fallos.push(archivo.name);
      } catch {
        fallos.push(archivo.name);
      }
    }
    if (fallos.length > 0) {
      showNotif('Algunos adjuntos no se subieron', fallos.join(', '), 'warning', 6000);
    }
  }

  showNotif(' Registrada', 'La novedad fue registrada correctamente', 'success');
  closeModal('modalRegistrarNovedad');
  loadNovedades();
}

// ── Detalle ──

async function verNovedadDetalle(id) {
  const res = await apiFetch(API.novedadesDetalle(id));
  if (!res.ok) { showNotif('Error', 'No se pudo cargar la novedad', 'warning'); return; }
  const n = res.data;
  document.getElementById('nov-det-sub').textContent = `${n.tipo} — ${n.fecha} — ${n.responsable}`;
  const wrap = document.getElementById('nov-det-campos');
  if (n.respuestas.length === 0) {
    wrap.innerHTML = '';
  } else {
    wrap.innerHTML = `
      <div class="chk-seccion">
        <div class="chk-seccion-title"><i class="fas fa-list-check"></i> Campos</div>
        <table class="data-table chk-mini-table">
          <thead><tr><th>Campo</th><th>Observación</th></tr></thead>
          <tbody>${n.respuestas.map(r => `
            <tr><td>${r.campo}</td><td>${r.observacion || '—'}</td></tr>`).join('')}</tbody>
        </table>
      </div>`;
  }

  const seccionAdj = document.getElementById('nov-det-adjuntos-seccion');
  const adjuntos = n.adjuntos || [];
  _novDetalleId = n.id;
  if (adjuntos.length === 0) {
    seccionAdj.style.display = 'none';
  } else {
    seccionAdj.style.display = '';
    document.getElementById('nov-det-adjuntos-descargar-todos').style.display = adjuntos.length > 1 ? '' : 'none';
    document.getElementById('nov-det-adjuntos').innerHTML = adjuntos.map(a => {
      const esImagen = ADJUNTO_EXT_IMAGEN.includes((a.nombre.split('.').pop() || '').toLowerCase());
      return `
        <div class="nov-adjunto-card">
          <a href="${a.url}" target="_blank" rel="noopener" title="Abrir ${a.nombre}" style="display:contents;">
            ${esImagen
              ? `<img src="${a.url}" alt="${a.nombre}">`
              : `<div class="nov-adjunto-icono"><i class="fas fa-file-lines"></i></div>`}
            <div class="nov-adjunto-nombre">${a.nombre}</div>
          </a>
          <a class="nov-adjunto-descargar" href="${a.url}" download="${a.nombre}" title="Descargar ${a.nombre}"><i class="fas fa-download"></i></a>
        </div>`;
    }).join('');
  }

  document.getElementById('modalDetalleNovedad').classList.add('active');
}

function _novDescargarTodosAdjuntos() {
  if (!_novDetalleId) return;
  const a = document.createElement('a');
  a.href = API.novedadesAdjuntosZip(_novDetalleId);
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ── Administrar tipos y campos ──

async function abrirAdminTiposNovedad() {
  document.getElementById('nov-tipo-nuevo').value = '';
  await _cargarYRenderTiposNovedad();
  document.getElementById('modalAdminTiposNovedad').classList.add('active');
}

async function _cargarYRenderTiposNovedad() {
  const res = await apiFetch(API.novedadesTipos);
  const tipos = res.ok ? res.data : [];
  const wrap = document.getElementById('nov-tipos-lista');
  if (tipos.length === 0) {
    wrap.innerHTML = '<p style="font-size:13px;color:var(--text-light);">No hay tipos de novedad creados todavía.</p>';
    return;
  }
  const bloques = await Promise.all(tipos.map(t => _renderBloqueTipoNovedad(t)));
  wrap.innerHTML = bloques.join('');
}

async function _renderBloqueTipoNovedad(t) {
  const res = await apiFetch(`${API.novedadesCampos}?tipo_id=${t.id}&todos=1`);
  const campos = res.ok ? res.data : [];
  const camposHtml = campos.map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.06);">
      <span style="font-size:13px;${c.activo ? '' : 'color:var(--text-light);text-decoration:line-through;'}">${c.nombre}</span>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-light);flex-shrink:0;">
        <input type="checkbox" ${c.activo ? 'checked' : ''} onchange="toggleCampoNovedadActivo(${c.id}, this.checked)"> Activo
      </label>
    </div>`).join('');
  return `
    <div class="chk-seccion">
      <div class="chk-seccion-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>${t.nombre}</span>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:400;">
          <input type="checkbox" ${t.activo ? 'checked' : ''} onchange="toggleTipoNovedadActivo(${t.id}, this.checked)"> Activo
        </label>
      </div>
      <div class="chk-resp-body">
        ${camposHtml || '<p style="font-size:12.5px;color:var(--text-light);margin:0 0 8px;">Sin campos todavía.</p>'}
        <div class="form-row" style="display:flex;gap:8px;margin-top:10px;">
          <input class="form-input" id="nov-campo-nuevo-${t.id}" type="text" placeholder="Nuevo campo..." style="flex:1;">
          <button class="btn-save" onclick="crearCampoNovedad(${t.id})" style="white-space:nowrap;"><i class="fas fa-plus"></i> Agregar campo</button>
        </div>
      </div>
    </div>`;
}

async function crearTipoNovedad() {
  const input = document.getElementById('nov-tipo-nuevo');
  const nombre = input.value.trim();
  if (!nombre) { showNotif('Campo requerido', 'Escribe el nombre del tipo', 'warning'); return; }
  const res = await apiFetch(API.novedadesTipoCrear, 'POST', { nombre });
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo crear el tipo', 'warning'); return; }
  input.value = '';
  await _cargarYRenderTiposNovedad();
  showNotif(' Agregado', 'El tipo de novedad fue creado', 'success');
}

async function toggleTipoNovedadActivo(id, activo) {
  const res = await apiFetch(API.novedadesTipoEditar(id), 'PUT', { activo });
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo actualizar', 'warning'); return; }
  await _cargarYRenderTiposNovedad();
}

async function crearCampoNovedad(tipoId) {
  const input = document.getElementById(`nov-campo-nuevo-${tipoId}`);
  const nombreCampo = input.value.trim();
  if (!nombreCampo) { showNotif('Campo requerido', 'Escribe el nombre del campo', 'warning'); return; }
  const res = await apiFetch(API.novedadesCampoCrear, 'POST', { tipo_id: tipoId, nombre_campo: nombreCampo });
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo crear el campo', 'warning'); return; }
  await _cargarYRenderTiposNovedad();
  showNotif(' Agregado', 'El campo fue agregado al tipo de novedad', 'success');
}

async function toggleCampoNovedadActivo(id, activo) {
  const res = await apiFetch(API.novedadesCampoEditar(id), 'PUT', { activo });
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo actualizar', 'warning'); return; }
  await _cargarYRenderTiposNovedad();
}

// ============================================================
// COLABORADORES
// ============================================================
let colabTotal = 0, colabTotalPages = 1;

// ── Colaborador: buscador (dropdown) de Cargo y Centro de Operación ──
let _colabCargoData = [];

function colabAbrirDropdown(tipo) {
  const dd = document.getElementById(`colab-${tipo}-dropdown`);
  if (dd) { dd.style.display = 'block'; colabFiltrarDropdown(tipo); }
}
function colabCerrarDropdown(tipo) {
  const dd = document.getElementById(`colab-${tipo}-dropdown`);
  if (dd) dd.style.display = 'none';
}
function colabFiltrarDropdown(tipo) {
  const dd = document.getElementById(`colab-${tipo}-dropdown`);
  if (!dd) return;

  if (tipo === 'co') {
    const q = (document.getElementById('colab-f-co-search')?.value || '').toLowerCase();
    const coOpts = (CAT.centros_operaciones || []).map(c => ({
      id: c.g207_id, nombre: `${c.g207_co} — ${c.g207_descripcion_co}`,
    }));
    const filtrado = coOpts.filter(c => c.nombre.toLowerCase().includes(q));
    dd.innerHTML = filtrado.length
      ? filtrado.map(c =>
          `<div class="usr-dropdown-item" onmousedown="colabSeleccionarCo(${c.id},'${c.nombre.replace(/'/g, "\\'")}')">${c.nombre}</div>`
        ).join('')
      : `<div class="usr-dropdown-empty">Sin resultados</div>`;
  } else {
    const q = (document.getElementById('colab-f-cargo')?.value || '').toLowerCase();
    const filtrado = _colabCargoData.filter(c => c.nombre.toLowerCase().includes(q));
    dd.innerHTML = filtrado.length
      ? filtrado.map(c =>
          `<div class="usr-dropdown-item" onmousedown="colabSeleccionarCargo('${c.nombre.replace(/'/g, "\\'")}')">${c.nombre}</div>`
        ).join('')
      : `<div class="usr-dropdown-empty">Sin resultados — se usará el texto escrito</div>`;
  }
}
function colabSeleccionarCo(id, nombre) {
  document.getElementById('colab-f-co').value        = id;
  document.getElementById('colab-f-co-search').value = nombre;
  colabCerrarDropdown('co');
}
// Si el usuario escribió el texto exacto de un Centro de Operación pero
// nunca hizo clic en el dropdown (colabSeleccionarCo no se disparó),
// intenta resolverlo aquí mismo antes de guardar.
function colabResolverCo() {
  const coIdField = document.getElementById('colab-f-co');
  if (coIdField.value) return; // ya viene resuelto desde el dropdown

  const search = document.getElementById('colab-f-co-search').value.trim().toLowerCase();
  if (!search) return;

  const match = (CAT.centros_operaciones || []).find(c =>
    `${c.g207_co} — ${c.g207_descripcion_co}`.toLowerCase() === search
  );
  if (match) coIdField.value = match.g207_id;
}
function colabSeleccionarCargo(nombre) {
  document.getElementById('colab-f-cargo').value = nombre;
  colabCerrarDropdown('cargo');
}
async function colabCargarCargos() {
  if (_colabCargoData.length) return;
  const res = await apiFetch(API.cargosColab);
  if (res.ok) _colabCargoData = res.data || [];
}

function openColabModal() {
  document.getElementById('colab-f-documento').value = '';
  document.getElementById('colab-f-nombre').value    = '';
  document.getElementById('colab-f-correo').value    = '';
  document.getElementById('colab-f-cargo').value     = '';
  document.getElementById('colab-f-co').value        = '';
  document.getElementById('colab-f-co-search').value = '';
  document.getElementById('colab-f-area').value      = '';
  document.getElementById('colab-f-estado').value    = '';
  colabCargarCargos();
  document.getElementById('modalColaborador').classList.add('active');
}

async function saveColaborador() {
  const documento = document.getElementById('colab-f-documento').value.trim();
  const nombre    = document.getElementById('colab-f-nombre').value.trim();
  const cargo     = document.getElementById('colab-f-cargo').value.trim();
  const estado    = document.getElementById('colab-f-estado').value;

  
  colabResolverCo();
  const coSearch = document.getElementById('colab-f-co-search').value.trim();
  const coId     = document.getElementById('colab-f-co').value;
  if (coSearch && !coId) {
    showNotif(
      'Centro de Operación no válido',
      'El texto no coincide con ningún centro registrado. Bórralo o selecciona uno de la lista.',
      'warning'
    );
    document.getElementById('colab-f-co-search').focus();
    return;
  }

  if (!documento || !nombre || !cargo || !estado) {
    showNotif('Campos requeridos', 'Completa documento, nombre, cargo y estado', 'warning');
    return;
  }

  const body = {
    documento, nombre,
    correo: document.getElementById('colab-f-correo').value.trim(),
    cargo,
    co_id:     coId || null,
    area_id:   document.getElementById('colab-f-area').value || null,
    estado_id: estado,
  };

  const res = await apiFetch(API.crearColab, 'POST', body);
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo crear el colaborador', 'warning'); return; }
  showNotif('Colaborador creado', `${nombre} fue registrado correctamente`, 'success');
  closeModal('modalColaborador');
  colabPage = 1;
  loadColaboradores();
}
async function loadColaboradores() {
  if (colabLoading || _suppressChange) return;
  colabLoading = true;
  const tbody = document.getElementById('colab-tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando colaboradores...</p></div></td></tr>`;
  try {
    const q    = (document.getElementById('colab-search') || {}).value || '';
    const psEl = document.getElementById('colab-pag-size');
    colabPageSize = psEl ? parseInt(psEl.value) : 25;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', colabPage);
    params.set('page_size', colabPageSize);
    params.set('sort', colabSort);
    params.set('dir', colabSortAsc ? 'asc' : 'desc');
    const res = await apiFetch(`${API.colaboradores}?${params}`);
    if (!res.ok) { showNotif('Error', 'No se pudieron cargar los colaboradores', 'warning'); return; }
    colabData       = res.data.colaboradores;
    colabTotal      = res.data.total;
    colabTotalPages = res.data.total_pages;
    _renderColabTable();
  } finally {
    colabLoading = false;
  }
}

function renderColaboradores() { colabPage = 1; loadColaboradores(); }

function _updateColabSortIcons() {
  document.querySelectorAll('#screen-colaboradores .data-table th[data-field]').forEach(th => {
    const ico = th.querySelector('.sort-ico');
    if (!ico) return;
    ico.className = th.dataset.field === colabSort
      ? `fas ${colabSortAsc ? 'fa-sort-up' : 'fa-sort-down'} sort-ico active`
      : 'fas fa-sort sort-ico';
  });
}

function _renderColabTable() {
  _updateColabSortIcons();
  const total   = colabTotal;
  const maxPage = colabTotalPages;
  const from    = (colabPage - 1) * colabPageSize;
  document.getElementById('colab-pag-from').textContent  = total === 0 ? 0 : from + 1;
  document.getElementById('colab-pag-to').textContent    = Math.min(from + colabPageSize, total);
  document.getElementById('colab-pag-total').textContent = total;
  const tbody = document.getElementById('colab-tbody');
  tbody.innerHTML = colabData.length === 0
    ? `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-users"></i><p>No se encontraron colaboradores</p></div></td></tr>`
    : colabData.map(c => `
      <tr>
        <td><span class="serial-mono">${c.documento}</span></td>
        <td><strong>${c.nombre}</strong></td>
        <td><span style="font-size:12px;color:var(--text-secondary)">${c.co}</span></td>
        <td>${c.cargo}</td>
        <td>${badgeHTML(c.estado)}</td>
        <td>
          <div class="tbl-actions">
            <button class="tbl-btn assign" title="Asignar dispositivos" onclick="openAsignar(${c.id})"><i class="fas fa-user-plus"></i></button>
            <button class="tbl-btn pdf" title="Generar Acta" onclick="openActa(${c.id})"><i class="fas fa-file-pdf"></i></button>
          </div>
        </td>
      </tr>`).join('');
  const ctrl = document.getElementById('colab-pag-controls');
  let html = `<button class="pag-btn" ${colabPage <= 1 ? 'disabled' : ''} onclick="goColabPage(${colabPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
  buildPages(colabPage, maxPage).forEach(p => {
    html += p === '...'
      ? `<span class="pag-btn" style="border:none;cursor:default">…</span>`
      : `<button class="pag-btn ${p === colabPage ? 'active' : ''}" onclick="goColabPage(${p})">${p}</button>`;
  });
  html += `<button class="pag-btn" ${colabPage >= maxPage ? 'disabled' : ''} onclick="goColabPage(${colabPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
  ctrl.innerHTML = html;
}

function goColabPage(p) { colabPage = p; loadColaboradores(); }
function sortColab(field) {
  if (colabSort === field) colabSortAsc = !colabSortAsc;
  else { colabSort = field; colabSortAsc = true; }
  colabPage = 1;
  loadColaboradores();
}

async function openAsignar(id) {
  const c = colabData.find(x => x.id === id);
  if (!c) return;
  colabEditId = id;
  window._asignarColabId = id;  // ← guardar para el buscador de seriales
  document.getElementById('asignar-sub-colab').textContent = `${c.nombre} — Doc: ${c.documento}`;
  // Empezamos con lista vacía: solo se agregan dispositivos NUEVOS.
  // Los ya asignados siguen en la BD y se mantienen al guardar.
  tempDevices = [];
  document.getElementById('as-tipo-device').value = '';
  document.getElementById('as-serial-device').innerHTML = '<option value="">Seleccione una opción</option>';
  renderTempDevices();
  // Mostrar los dispositivos actuales como referencia (solo lectura)
  renderCurrentDevices(c.dispositivos || [], id);
  document.getElementById('modalAsignar').classList.add('active');
}

async function addDeviceToAsignacion() {
  const tipoEl       = document.getElementById('as-tipo-device');
  const serialHidden = document.getElementById('as-serial-device');  // hidden → tiene el ID
  const serialInput  = document.getElementById('as-serial-input');   // texto visible
  const drop         = document.getElementById('as-serial-dropdown');

  const tipoId = tipoEl.value;
  const devId  = parseInt(serialHidden.value);

  if (!tipoId || !devId) {
    showNotif('Selección requerida', 'Elige el tipo y serial del dispositivo', 'warning');
    return;
  }
  if (tempDevices.find(d => d.id === devId)) {
    showNotif('Ya en la lista', 'Este dispositivo ya fue añadido en esta sesión', 'warning');
    return;
  }

  // Verificar en la BD si ya está asignado a otro colaborador
  const serialTexto = serialInput.value.split('—')[0].trim();
  const chk = await apiFetch(`${BASE}/inventario/api/dispositivos/verificar-serial/?serial=${encodeURIComponent(serialTexto)}`);
  if (chk.ok && chk.data?.asignado_a) {
    // Si el asignado es el propio colaborador actual, no bloquear
    const propioColab = colabData.find(x => x.id === colabEditId);
    const mismoColab = propioColab && (
      chk.data.asignado_a === propioColab.nombre ||
      chk.data.colaborador_id === colabEditId
    );
    if (!mismoColab) {
      showNotif(
        '🚫 Dispositivo ya asignado',
        `El serial <strong>${serialTexto}</strong> ya está asignado a: <strong>${chk.data.asignado_a}</strong>. Debes desasignarlo primero.`,
        'error',
        7000
      );
      // Limpiar los campos para evitar que intenten guardar igual
      serialInput.value  = '';
      serialHidden.value = '';
      document.getElementById('as-serial-dropdown').style.display = 'none';
      return;
    }
  }

  
  const text = serialInput.value.split('—');

  tempDevices.push({
    id:     devId,
    tipo:   tipoEl.options[tipoEl.selectedIndex].textContent,
    marca:  text[1] ? text[1].trim().split(' ')[0] : '—',
    serial: text[0].trim(),
  });

  // Limpiar campos
  tipoEl.value        = '';
  serialInput.value   = '';
  serialHidden.value  = '';
  serialInput.disabled = true;
  drop.style.display  = 'none';
  drop.innerHTML      = '';

  renderTempDevices();
}

function renderTempDevices() {
  const tbody = document.getElementById('as-devices-tbody');
  if (tempDevices.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="assigned-empty">No hay dispositivos nuevos por agregar aún</td></tr>';
    return;
  }
  tbody.innerHTML = tempDevices.map((d, i) => `
    <tr>
      <td>${d.tipo}</td>
      <td>${d.marca}</td>
      <td><span class="serial-mono">${d.serial}</span></td>
      <td><button class="btn-remove-row" onclick="removeTempDevice(${i})"><i class="fas fa-times"></i></button></td>
    </tr>`).join('');
}

function renderCurrentDevices(dispositivos, colabId) {
  // Intenta encontrar o crear el contenedor de dispositivos actuales en el modal
  let container = document.getElementById('as-current-devices');
  if (!container) return; // Si el HTML no tiene el contenedor, no hacemos nada
  if (!dispositivos || dispositivos.length === 0) {
    container.innerHTML = '<p class="assigned-empty">Sin dispositivos asignados actualmente.</p>';
    return;
  }
  container.innerHTML = `
    <div class="assigned-table-wrap">
      <table class="assigned-table" style="margin-bottom:0">
        <thead><tr><th>Tipo</th><th>Marca</th><th>Serial</th><th></th></tr></thead>
        <tbody>
          ${dispositivos.map(d => `
            <tr>
              <td>${d.tipo}</td>
              <td>${d.marca}</td>
              <td><span class="serial-mono">${d.serial}</span></td>
              <td style="text-align:right"><button class="btn-remove-row" title="Quitar asignación"
                onclick="eliminarAsignacion(${colabId}, ${d.id})">
                <i class="fas fa-unlink"></i></button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function removeTempDevice(idx) { tempDevices.splice(idx, 1); renderTempDevices(); }
function clearAsignacion() { tempDevices = []; renderTempDevices(); }

async function guardarAsignacion() {
  // Enviamos SOLO los dispositivos nuevos que el usuario agregó en esta sesión.
  // El backend los acumula sin borrar los anteriores (reemplazar: false por defecto).
  const res = await apiFetch(API.asignar(colabEditId), 'POST', {
    dispositivos: tempDevices.map(d => d.id),
    reemplazar: false,
  });
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo guardar', 'warning'); return; }
  const c = colabData.find(x => x.id === colabEditId);
  closeModal('modalAsignar');
  showNotif(' Asignación guardada', `Los dispositivos fueron asignados a ${c ? c.nombre : ''}`, 'success', 4000);
  loadColaboradores();
}

async function eliminarAsignacion(colabId, devId) {
  document.getElementById('modalAsignar').classList.remove('active');
  document.getElementById('confirmSub').textContent = '¿Eliminar esta asignación?';
  document.getElementById('confirmBody').innerHTML  = '';
  document.getElementById('btnConfirmDel').onclick = async () => {
    document.getElementById('modalConfirm').classList.remove('active');
    const res = await apiFetch(API.eliminarAsignacion(colabId, devId), 'DELETE');
    if (!res.ok) {
      showNotif('Error', res.error || 'No se pudo eliminar', 'warning');
      openAsignar(colabId);
      return;
    }
    showNotif('✓ Asignación eliminada', '', 'success', 3000);
    await loadColaboradores();
    openAsignar(colabId);
  };
  // Cancelar también reabre el modal
  document.getElementById('modalConfirm')
    .querySelector('.btn-cancel').onclick = () => {
      document.getElementById('modalConfirm').classList.remove('active');
      openAsignar(colabId);
    };
  document.getElementById('modalConfirm').classList.add('active');
}
function openActa(id) {
  const c = colabData.find(x => x.id === id);
  if (!c) return;
  colabEditId = id;
  document.getElementById('acta-sub-colab').textContent = `${c.nombre} — Doc: ${c.documento}`;
  document.getElementById('acta-colaborador').value     = c.nombre;
  document.getElementById('acta-correo').value = c.correo || '';
  document.getElementById('acta-tipo').value            = '';
  document.getElementById('acta-proceso').value         = '';
  const tbody   = document.getElementById('acta-devices-tbody');
  const chkTh   = document.getElementById('acta-chk-th');
  const chkAll  = document.getElementById('acta-chk-all');
  const multiple = !!(c.dispositivos && c.dispositivos.length > 1);
  if (chkTh)  chkTh.style.display = multiple ? '' : 'none';
  if (chkAll) chkAll.checked = true;
  if (!c.dispositivos || c.dispositivos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="acta-devices-empty">Sin dispositivos asignados al colaborador</td></tr>';
  } else {
    tbody.innerHTML = c.dispositivos.map(d => `
      <tr>
        ${multiple ? `<td class="acta-chk-td"><input type="checkbox" class="acta-dev-chk" value="${d.id}" checked></td>` : ''}
        <td>${d.tipo}</td>
        <td><span class="serial-mono">${d.serial}</span></td>
        <td>${d.marca}</td>
        <td><input type="text" style="border:1px solid var(--border);border-radius:6px;padding:5px 9px;font-size:12px;width:100%;font-family:'DM Sans',sans-serif" placeholder="Observación..."></td>
      </tr>`).join('');
  }
  renderActaHist(c);
  document.getElementById('modalActa').classList.add('active');
  setTimeout(() => initSignaturePads(), 100);
}

function toggleActaAllDevices(masterChk) {
  document.querySelectorAll('#acta-devices-tbody .acta-dev-chk').forEach(chk => {
    chk.checked = masterChk.checked;
  });
}

function renderActaHist(c) {
  const tbody = document.getElementById('acta-hist-tbody');
  if (!c.actas || c.actas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="padding:20px;text-align:center;font-size:13px;color:var(--text-light)">No hay datos disponibles en la tabla</td></tr>`;
    const pagInfo = document.querySelector('.acta-pag-info');
    if (pagInfo) pagInfo.textContent = 'Mostrando 0 a 0 de 0 registros';
    return;
  }
  tbody.innerHTML = c.actas.map(a => `
    <tr>
      <td><span class="proceso-badge">${a.tipo}</span></td>
      <td style="font-family:'DM Mono',monospace;font-size:13px;color:var(--text-secondary)">${a.fecha}</td>
      <td><button class="tbl-btn info" title="Ver acta" onclick="verActa(${a.id})"><i class="fas fa-eye"></i></button></td>
    </tr>`).join('');
  const pagInfo = document.querySelector('.acta-pag-info');
  if (pagInfo) pagInfo.textContent = `Mostrando 1 a ${c.actas.length} de ${c.actas.length} registros`;
}

async function verActa(actaId) {
  const res = await apiFetch(API.actaDetalle(actaId), 'GET');
  if (!res.ok) { showNotif('Error', 'No se pudo cargar el acta', 'warning'); return; }
  const a = res.data;

  const dispositivosHTML = a.dispositivos.length
    ? a.dispositivos.map((d, i) => {
        const caracItems = Object.entries(d.caracteristicas || {})
          .map(([k, v]) => `<div><span style="font-weight:600;color:#374151">${k}:</span> ${v}</div>`)
          .join('');
        return `
          <tr style="${i % 2 === 0 ? 'background:#fff' : 'background:#f8fafc'}">
            <td style="padding:10px 12px;border:1px solid #e5e7eb;vertical-align:top;font-weight:600;text-align:center">${i + 1}</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;vertical-align:top;font-weight:600;white-space:nowrap">${d.tipo}</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;vertical-align:top;font-family:monospace;font-size:11px">${d.serial}</td>
            <td style="padding:10px 12px;border:1px solid #e5e7eb;vertical-align:top;font-size:11px;line-height:1.7">${caracItems}</td>
          </tr>`;
      }).join('')
    : `<tr><td colspan="4" style="padding:16px;text-align:center;color:#6b7280">Sin dispositivos asignados</td></tr>`;

  const firmaRecebeHTML = a.firma_recibe
    ? `<img src="${a.firma_recibe}" style="max-width:220px;max-height:70px;display:block;margin:0 auto">`
    : `<div style="height:50px;border-bottom:2px solid #374151"></div>`;
  const firmaEntregaHTML = a.firma_entrega
    ? `<img src="${a.firma_entrega}" style="max-width:220px;max-height:70px;display:block;margin:0 auto">`
    : `<div style="height:50px;border-bottom:2px solid #374151"></div>`;

  const ahora = new Date();
  const fechaStr = ahora.toLocaleDateString('es-CO', {day:'2-digit', month:'2-digit', year:'numeric'})
    + ' ' + ahora.toLocaleTimeString('es-CO', {hour:'2-digit', minute:'2-digit', hour12:false});

  const contenidoActa = `
    <div id="acta-preview-content" style="font-family:Arial,sans-serif;font-size:12px;color:#111;background:#fff;padding:40px;max-width:780px;margin:0 auto">

        <!-- ENCABEZADO -->
          <div style="
              display:flex;
              align-items:flex-start;
              justify-content:space-between;
              margin-bottom:20px;
              border-bottom:2px solid #111;
              padding-bottom:14px;
          ">

            <!-- Logo izquierda -->
            <div style="
                width:170px;
                margin-top:-10px;
                margin-left:-10px;
            ">
              ${a.logo
                ? `<img src="${a.logo}" style="max-height:85px;max-width:130px;display:block">`
                : `<div style="font-size:22px;font-weight:700;color:#1e3a5f">AM&amp;M</div>`
              }
            </div>

            <!-- Título centro -->
            <div style="
                flex:1;
                text-align:center;
                padding:0 15px;
                margin-top:8px;
                line-height:1.4;
            ">
                <div style="
                    font-size:15px;
                    font-weight:700;
                    text-transform:uppercase;
                ">
                    ${a.tipo && a.tipo.toUpperCase().includes('DEVOLU') ? 'ACTA DE DEVOLUCIÓN DE EQUIPOS TECNOLÓGICOS' : 'ACTA DE ENTREGA DE EQUIPOS TECNOLÓGICOS'}
                </div>

                <div style="
                    font-size:12px;
                    font-weight:600;
                    margin-top:6px;
                ">
                    GESTIÓN DE TECNOLOGÍA DE LA INFORMACIÓN
                </div>

                <div style="
                    font-size:12px;
                    font-weight:600;
                ">
                    Y LA COMUNICACIÓN
                </div>
            </div>

            <!-- Código y versión derecha -->
            <div style="
                width:130px;
                text-align:right;
                font-size:11px;
                font-weight:600;
                line-height:1.8;
                margin-top:5px;
            ">
                <div>CÓDIGO: TIC-INF-F-2</div>
                <div>VERSIÓN: 6</div>
            </div>

          </div>

      <!-- INFO COLABORADOR -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:11px">
        <tr>
          <td style="padding:4px 0;width:160px"><strong>FECHA:</strong></td>
          <td style="padding:4px 0">${fechaStr}</td>
        </tr>
        <tr>
          <td style="padding:4px 0"><strong>NOMBRE COLABORADOR:</strong></td>
          <td style="padding:4px 0">${a.colaborador.nombre}</td>
        </tr>
        <tr>
          <td style="padding:4px 0"><strong>CARGO COLABORADOR:</strong></td>
          <td style="padding:4px 0">${a.colaborador.cargo}</td>
        </tr>
        <tr>
          <td style="padding:4px 0"><strong>PROCESO/ÁREA COLABORADOR:</strong></td>
          <td style="padding:4px 0">${a.proceso}</td>
        </tr>
      </table>

      <!-- TABLA DISPOSITIVOS -->
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px">
        <thead>
          <tr style="background:#1e3a5f;color:#fff">
            <th style="padding:8px 10px;border:1px solid #1e3a5f;text-align:center;width:30px">#</th>
            <th style="padding:8px 10px;border:1px solid #1e3a5f;text-align:left;width:130px">TIPO DISPOSITIVO</th>
            <th style="padding:8px 10px;border:1px solid #1e3a5f;text-align:left;width:120px">SERIAL</th>
            <th style="padding:8px 10px;border:1px solid #1e3a5f;text-align:left">CARACTERÍSTICAS</th>
          </tr>
        </thead>
        <tbody>${dispositivosHTML}</tbody>
      </table>

      <!-- TEXTO LEGAL -->
      <div style="font-size:10px;color:#222;text-align:justify;line-height:1.7;margin-bottom:20px;border-top:1px solid #ccc;padding-top:12px">
        <p>Certifico que los elementos detallados en el presente documento, me han sido entregados en las condiciones descritas y en buenas condiciones, operativas, funcionales y físicas para mi cuidado y custodia con el propósito de cumplir con las tareas y asignaciones propias de mi cargo en la empresa, siendo estas de mi única y exclusiva responsabilidad. Si la parte o equipo tecnológico presentase fallas o mal funcionamiento reportarlo al área de sistemas en un tiempo no mayor a 30 días para el trámite de las garantías correspondientes si las cubriese. Me comprometo a usar correctamente los recursos, y solo para los fines establecidos, a no instalar ni permitir la instalación de software para uso personal ajeno al personal de Gestión de Tecnología e Informática. Todo daño físico causado por maltrato o por el uso inapropiado de los equipos asignados y de los planes corporativos el robo o pérdida de éstos es de mi única y exclusiva responsabilidad, por lo cual autorizo el descuento del valor correspondiente del pago de nómina; así mismo al finalizar mi contrato laboral me comprometo a realizar la devolución a la totalidad de los equipos asignados y autorizo el descuento de salarios, prestaciones sociales, vacaciones, indemnizaciones, bonificaciones, auxilios y demás derechos que me correspondan el valor correspondiente a daños, pérdida o robo de los equipos en mención.</p>
        <p style="margin-top:8px">De igual manera, certifico que con el equipo tecnológico recibido daré buen uso a los recursos informáticos, conforme lo establecido en el documento TI-P-005 Política uso de recursos informáticos.</p>
      </div>

      <!-- FIRMAS -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:20px;text-align:center">
        <div>
          ${firmaRecebeHTML}
          <div style="border-top:1px solid #333;margin-top:6px;padding-top:6px">
            <div style="font-weight:700;font-size:11px">${a.colaborador.nombre}</div>
            <div style="font-size:10px;color:#555">FIRMA QUIEN RECIBE</div>
          </div>
        </div>
        <div>
          ${firmaEntregaHTML}
          <div style="border-top:1px solid #333;margin-top:6px;padding-top:6px">
            <div style="font-weight:700;font-size:11px">TECNOLOGÍA DE LA INFORMACIÓN</div>
            <div style="font-size:10px;color:#555">FIRMA QUIEN ENTREGA</div>
          </div>
        </div>
      </div>

    </div>`;

  let overlay = document.getElementById('modalVerActa');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modalVerActa';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:12px;width:100%;max-width:860px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.3)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #e5e7eb;background:#1e3a5f">
          <span style="color:#fff;font-weight:600;font-size:15px"><i class="fas fa-file-contract" style="margin-right:8px"></i>Vista de Acta</span>
          <div style="display:flex;gap:10px;align-items:center">
            <button id="btn-descargar-acta" style="background:#fff;color:#1e3a5f;border:none;border-radius:6px;padding:7px 16px;font-size:13px;font-weight:600;cursor:pointer"><i class="fas fa-download" style="margin-right:6px"></i>Descargar PDF</button>
            <button onclick="document.getElementById('modalVerActa').style.display='none'" style="background:transparent;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1"><i class="fas fa-times"></i></button>
          </div>
        </div>
        <div id="acta-preview-body" style="overflow-y:auto;flex:1;background:#f8fafc;padding:20px"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
  }

  overlay.style.display = 'flex';
  document.getElementById('acta-preview-body').innerHTML = contenidoActa;
  document.getElementById('btn-descargar-acta').onclick = () => descargarActaPDF(a);
}

function descargarActaPDF(a) {
  const el = document.getElementById('acta-preview-content');
  if (!el) return;
  const style = `<style>
    body{margin:0;font-family:Arial,sans-serif}
    @media print{
      @page{margin:15mm}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    }
  </style>`;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Acta ${a.tipo} - ${a.colaborador.nombre}</title>${style}</head><body>${el.outerHTML}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}
async function guardarActa() {
  const correo  = document.getElementById('acta-correo').value.trim();
  const tipo    = document.getElementById('acta-tipo').value;
  const proceso = document.getElementById('acta-proceso').value;
  if (!correo || !tipo || !proceso) { showNotif('Campos requeridos', 'Completa correo, tipo de acta y proceso/área', 'warning'); return; }

  // Selección parcial de dispositivos (solo existe si el colaborador tiene >1)
  const devChks = document.querySelectorAll('#acta-devices-tbody .acta-dev-chk');
  let dispositivosIds = null;
  if (devChks.length) {
    dispositivosIds = Array.from(devChks).filter(chk => chk.checked).map(chk => parseInt(chk.value));
    if (dispositivosIds.length === 0) {
      showNotif('Selecciona dispositivos', 'Marca al menos un dispositivo para incluir en el acta', 'warning');
      return;
    }
  }

  const getSigData = (id) => {
    const pad = sigPads[id];
    if (!pad) return '';
    return pad.isEmpty() ? '' : pad.toDataURL();
  };
  const payload = {
    tipo, proceso, correo,
    firma_recibe:  getSigData('sig-recibe'),
    firma_entrega: getSigData('sig-entrega'),
  };
  if (dispositivosIds) payload.dispositivos_ids = dispositivosIds;
  const res = await apiFetch(API.acta(colabEditId), 'POST', payload);
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo guardar el acta', 'warning'); return; }
  const c = colabData.find(x => x.id === colabEditId);
  showNotif('📄 Acta generada', `Acta de ${tipo} creada exitosamente para ${c ? c.nombre : ''}`, 'success', 5000);
  clearSig('sig-recibe');
  clearSig('sig-entrega');
  document.getElementById('acta-correo').value = '';
  document.getElementById('acta-tipo').value    = '';
  document.getElementById('acta-proceso').value = '';
  await loadColaboradores();
  const cActualizado = colabData.find(x => x.id === colabEditId);
  if (cActualizado) renderActaHist(cActualizado);
}

function initSignaturePads(ids) {
  (ids || ['sig-recibe', 'sig-entrega']).forEach(id => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const wrap    = canvas.parentElement;
    canvas.width  = wrap.offsetWidth || 360;
    canvas.height = 130;
    if (typeof SignaturePad !== 'undefined') {
      if (sigPads[id] && typeof sigPads[id].off === 'function') sigPads[id].off();
      sigPads[id] = new SignaturePad(canvas, { penColor: '#1B4698', minWidth: 1, maxWidth: 3 });
    } else {
      _initFallbackPad(canvas, id);
    }
  });
}

function _initFallbackPad(canvas, id) {
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#1B4698'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  let drawing = false;
  canvas.addEventListener('mousedown', e => { drawing = true; ctx.beginPath(); const r = canvas.getBoundingClientRect(); ctx.moveTo(e.clientX - r.left, e.clientY - r.top); });
  canvas.addEventListener('mousemove', e => { if (!drawing) return; const r = canvas.getBoundingClientRect(); ctx.lineTo(e.clientX - r.left, e.clientY - r.top); ctx.stroke(); });
  canvas.addEventListener('mouseup',    () => { drawing = false; });
  canvas.addEventListener('mouseleave', () => { drawing = false; });
  sigPads[id] = { clear: () => ctx.clearRect(0, 0, canvas.width, canvas.height), isEmpty: () => false, toDataURL: () => canvas.toDataURL() };
}

function clearSig(id) { if (sigPads[id]) sigPads[id].clear(); }
function updateSigSize(id, val) {
  const v = parseFloat(val);
  if (sigPads[id] && sigPads[id].maxWidth !== undefined) { sigPads[id].minWidth = v * 0.5; sigPads[id].maxWidth = v; }
  else { const canvas = document.getElementById(id); if (canvas) canvas.getContext('2d').lineWidth = v; }
}

// ============================================================
// PRÉSTAMO DE EQUIPOS
// ============================================================
let equiposAdminData = [];
let equiposAdminCatalogos = { estados: [], usuarios: [] };

let _eqRespData = [];

function eqAbrirResponsableDropdown() {
  const dd = document.getElementById('eq-responsable-dropdown');
  if (dd) { dd.style.display = 'block'; eqFiltrarResponsable(); }
}
function eqCerrarResponsableDropdown() {
  const dd = document.getElementById('eq-responsable-dropdown');
  if (dd) dd.style.display = 'none';
}
function eqFiltrarResponsable() {
  const q  = (document.getElementById('eq-responsable-search')?.value || '').toLowerCase();
  const dd = document.getElementById('eq-responsable-dropdown');
  if (!dd) return;
  const filtrado = _eqRespData.filter(u => u.NombreCompleto.toLowerCase().includes(q));
  if (!filtrado.length) {
    dd.innerHTML = `<div class="usr-dropdown-empty">Sin resultados</div>`;
    return;
  }
  dd.innerHTML = filtrado.map(u =>
    `<div class="usr-dropdown-item" onmousedown="eqSeleccionarResponsable(${u.IdUsuario},'${u.NombreCompleto.replace(/'/g,"\\'")}')">${u.NombreCompleto}</div>`
  ).join('');
}
function eqSeleccionarResponsable(id, nombre) {
  document.getElementById('eq-responsable').value        = id;
  document.getElementById('eq-responsable-search').value = nombre;
  eqCerrarResponsableDropdown();
}
function eqLimpiarResponsable() {
  document.getElementById('eq-responsable').value        = '';
  document.getElementById('eq-responsable-search').value = '';
}

async function loadEquiposAdmin() {
  const tbody = document.getElementById('equipo-tbody');
  if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-light)">Cargando...</td></tr>`;

  const res = await apiFetch(API.equiposAdmin);
  if (!res.ok) { showNotif('Error', 'No se pudieron cargar los equipos', 'warning'); return; }
  equiposAdminData = res.equipos || [];
  _renderEquiposAdmin();
}

function _eqEstadoBadge(estado) {
  const e = (estado || '').trim().toUpperCase();
  const esDisponible = e.includes('DISPONIBLE') && !e.includes('NO DISPONIBLE');
  const bg    = esDisponible ? 'rgba(34,197,94,0.12)'  : 'rgba(239,68,68,0.12)';
  const color = esDisponible ? '#16a34a'               : '#dc2626';
  return `<span style="display:inline-block;padding:5px 14px;border-radius:20px;
           font-size:12px;font-weight:600;background:${bg};color:${color}">
           ${estado || '—'}
         </span>`;
}
function _renderEquiposAdmin() {
  const q = (document.getElementById('equipo-search')?.value || '').toLowerCase();
  const data = equiposAdminData.filter(e =>
    !q ||
    (e.nombre || '').toLowerCase().includes(q) ||
    (e.responsable || '').toLowerCase().includes(q)
  );
  const tbody = document.getElementById('equipo-tbody');
  if (!tbody) return;
  
  tbody.innerHTML = data.length === 0
    ? `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-laptop"></i><p>No se encontraron equipos</p></div></td></tr>`
    : data.map(e => `
      <tr>
        <td><strong>${e.nombre}</strong></td>
        <td>${e.descripcion || '—'}</td>
        <td>${e.responsable}</td>
        <td>${_eqEstadoBadge(e.estado)}</td>
        <td>
          <div class="tbl-actions">
            <button class="tbl-btn info" title="Ver historial" onclick='abrirHistorialEquipoModal(${e.id_equipo}, ${JSON.stringify(e.nombre)})'><i class="fas fa-history"></i></button>
            <button class="tbl-btn edit" onclick="openEquipoModal(${e.id_equipo})"><i class="fas fa-edit"></i></button>
            <button class="tbl-btn del"  onclick="eliminarEquipoAdmin(${e.id_equipo})"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>`).join('');
}

/* ── Modal: historial de préstamos de un equipo (con buscador) ── */
let _historialEquipoData = [];

async function abrirHistorialEquipoModal(idEquipo, nombreEquipo) {
  let overlay = document.getElementById('modalHistorialEquipo');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modalHistorialEquipo';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:12px;width:100%;max-width:800px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 60px rgba(0,0,0,.3)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #e5e7eb;background:#1e3a5f">
          <span style="color:#fff;font-weight:600;font-size:15px" id="historialEquipoTitulo"></span>
          <button onclick="document.getElementById('modalHistorialEquipo').style.display='none'"
                  style="background:transparent;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1"><i class="fas fa-times"></i></button>
        </div>
        <div style="padding:14px 24px 0;background:#f8fafc">
          <div style="position:relative">
            <i class="fas fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-light);font-size:13px"></i>
            <input type="text" id="historialEquipoBuscar" placeholder="Buscar por solicitante, cédula, área u observación..."
                   style="width:100%;box-sizing:border-box;border:1.5px solid var(--border);border-radius:8px;
                          padding:9px 12px 9px 34px;font-family:'DM Sans',sans-serif;font-size:13px">
          </div>
        </div>
        <div id="historialEquipoBody" style="overflow-y:auto;flex:1;padding:20px;background:#f8fafc"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
    document.getElementById('historialEquipoBuscar').addEventListener('input', _renderHistorialEquipoTabla);
  }

  overlay.style.display = 'flex';
  document.getElementById('historialEquipoTitulo').innerHTML =
    `<i class="fas fa-history" style="margin-right:8px"></i>Historial de préstamos — ${nombreEquipo}`;
  document.getElementById('historialEquipoBuscar').value = '';
  const body = document.getElementById('historialEquipoBody');
  body.innerHTML = `<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Cargando historial...</p></div>`;

  const res = await apiFetch(API.equipoAdminHistorial(idEquipo));
  if (!res.ok) {
    _historialEquipoData = [];
    body.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${res.error || 'No se pudo cargar el historial'}</p></div>`;
    return;
  }
  _historialEquipoData = res.historial || [];
  _renderHistorialEquipoTabla();
}

function _renderHistorialEquipoTabla() {
  const body = document.getElementById('historialEquipoBody');
  if (!body) return;

  if (_historialEquipoData.length === 0) {
    body.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><p>Este equipo todavía no tiene préstamos registrados</p></div>`;
    return;
  }

  const q = (document.getElementById('historialEquipoBuscar')?.value || '').toLowerCase().trim();
  const filtrado = !q ? _historialEquipoData : _historialEquipoData.filter(h =>
    (h.solicitante || '').toLowerCase().includes(q) ||
    (h.cedula || '').toLowerCase().includes(q) ||
    (h.area || '').toLowerCase().includes(q) ||
    (h.observaciones || '').toLowerCase().includes(q)
  );

  if (filtrado.length === 0) {
    body.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><p>Sin resultados</p></div>`;
    return;
  }

  body.innerHTML = `
    <table class="data-table" style="width:100%">
      <thead>
        <tr>
          <th>Solicitante</th><th>Cédula</th><th>Área</th>
          <th>Fecha préstamo</th><th>Devolución estimada</th><th>Devolución real</th>
          <th>Observaciones</th><th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${filtrado.map(h => `
          <tr>
            <td>${h.solicitante}</td>
            <td class="serial-mono">${h.cedula}</td>
            <td>${h.area}</td>
            <td>${h.fecha_prestamo}</td>
            <td>${h.fecha_estimada_devolucion}</td>
            <td>${h.fecha_devolucion_real || '—'}</td>
            <td>${h.observaciones || '—'}</td>
            <td>${h.activo
              ? '<span style="display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600;background:rgba(37,99,235,0.12);color:#2563eb">Activo</span>'
              : '<span style="display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:600;background:rgba(34,197,94,0.12);color:#16a34a">Devuelto</span>'}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

async function openEquipoModal(id = null) {
  // Poblar catálogos (estados / responsables) — se recarga siempre para
  // reflejar cambios recientes en la BD (nuevos estados, usuarios, etc.)
  const res = await apiFetch(API.equiposAdminCat);
  if (res.ok) {
    equiposAdminCatalogos = { estados: res.estados || [], usuarios: res.usuarios || [] };
  } else {
    showNotif('Error', 'No se pudieron cargar los catálogos de estado/responsable', 'warning');
  }

 const selEstado = document.getElementById('eq-estado');
  selEstado.innerHTML = equiposAdminCatalogos.estados
    .filter(e => [3, 4].includes(e.IdEstado))
    .map(e => `<option value="${e.IdEstado}">${e.Descripcion}</option>`).join('');

  _eqRespData = equiposAdminCatalogos.usuarios || [];

  document.getElementById('eq-id-equipo').value = '';
  document.getElementById('eq-nombre').value = '';
  document.getElementById('eq-descripcion').value = '';
  eqLimpiarResponsable();
  selEstado.value = '';

  if (id) {
    const eq = equiposAdminData.find(e => e.id_equipo === id);
    if (eq) {
      document.getElementById('eq-modal-title').textContent = 'Editar equipo';
      document.getElementById('eq-id-equipo').value = eq.id_equipo;
      document.getElementById('eq-nombre').value = eq.nombre;
      document.getElementById('eq-descripcion').value = eq.descripcion || '';
      const respItem = _eqRespData.find(u => String(u.IdUsuario) === String(eq.id_responsable));
      document.getElementById('eq-responsable').value        = eq.id_responsable || '';
      document.getElementById('eq-responsable-search').value = respItem ? respItem.NombreCompleto : '';
      selEstado.value = eq.id_estado || '';
    }
  } else {
    document.getElementById('eq-modal-title').textContent = 'Nuevo equipo';
  }

  document.getElementById('modalEquipo').classList.add('active');
}

async function guardarEquipo() {
  const id_equipo   = document.getElementById('eq-id-equipo').value || null;
  const nombre      = document.getElementById('eq-nombre').value.trim();
  const descripcion = document.getElementById('eq-descripcion').value.trim();
  const id_responsable = document.getElementById('eq-responsable').value || null;
  const id_estado   = document.getElementById('eq-estado').value || null;

  if (!nombre)    { showNotif('Campo requerido', 'El nombre del equipo es obligatorio', 'warning'); return; }
  if (!id_estado) { showNotif('Campo requerido', 'Debes seleccionar un estado', 'warning'); return; }

  const res = await apiFetch(API.equipoAdminGuardar, 'POST', {
    id_equipo, nombre, descripcion, id_responsable, id_estado,
  });
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo guardar el equipo', 'warning'); return; }

  showNotif(id_equipo ? 'Actualizado' : 'Equipo creado', `"${nombre}" guardado correctamente`, 'success');
  closeModal('modalEquipo');
  loadEquiposAdmin();
}

function eliminarEquipoAdmin(id) {
  const eq = equiposAdminData.find(e => e.id_equipo === id);
  if (!eq) return;
  document.getElementById('confirmSub').textContent = eq.nombre;
  document.getElementById('confirmBody').innerHTML = `Eliminarás permanentemente el equipo <strong>${eq.nombre}</strong>.`;
  document.getElementById('btnConfirmDel').onclick = async () => {
    const res = await apiFetch(API.equipoAdminEliminar(id), 'DELETE');
    if (!res.ok) { showNotif('Error', res.error || 'No se pudo eliminar', 'warning'); return; }
    showNotif('Eliminado', `"${eq.nombre}" fue eliminado`, 'success');
    closeModal('modalConfirm');
    loadEquiposAdmin();
  };
  document.getElementById('modalConfirm').classList.add('active');
}

// ============================================================
// CSV UTIL
// ============================================================
function downloadCSV(rows, filename) {
  const csv  = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// CAMPANITA DE NOTIFICACIONES (header) — requerimientos TIC vencidos
// asignados al usuario logueado. Se refresca solo (polling) para que se
// sienta casi en tiempo real sin necesitar WebSockets/infraestructura nueva.
// ============================================================
let BELL_DATA = { vencidos: [], licencias_por_vencer: [], pendientes_aprobacion: [], vencidos_sin_asignar: [], nuevos_sin_asignar: [], prestamos_realizados: [], checklist_pendiente: [] };

async function cargarNotificacionesBell() {
  const res = await apiFetch(API.notificacionesBell);
  if (!res.ok) return;
  BELL_DATA = {
    vencidos:              res.data.vencidos || [],
    licencias_por_vencer:  res.data.licencias_por_vencer || [],
    pendientes_aprobacion: res.data.pendientes_aprobacion || [],
    vencidos_sin_asignar:  res.data.vencidos_sin_asignar || [],
    nuevos_sin_asignar:    res.data.nuevos_sin_asignar || [],
    prestamos_realizados:  res.data.prestamos_realizados || [],
    checklist_pendiente:   res.data.checklist_pendiente || [],
  };
  renderBellBadge();
  const panel = document.getElementById('bellPanel');
  if (panel && !panel.classList.contains('hidden')) renderBellPanel();
}

// "Marcar como leído" — SOLO para licencias y pendientes de aprobación.
// Vencidos y vencidos-sin-asignar NUNCA se pueden ocultar: son alertas que
// necesitan una acción real, no que se ignoren.
//
// Se guarda en el SERVIDOR (tabla NotificacionBellLeida, por usuario), no en
// localStorage — así persiste sin importar desde qué computador/navegador
// inicies sesión. api_notificaciones_bell ya excluye del lado del backend
// lo que el usuario marcó como leído, así que aquí solo hace falta avisarle
// al servidor y quitar el item de la vista al instante (optimista).
async function _bellMarcarLeida(tipo, referenciaId, referenciaFecha) {
  if (tipo === 'licencia') {
    BELL_DATA.licencias_por_vencer = BELL_DATA.licencias_por_vencer
      .filter(l => !(l.id === referenciaId && l.fecha_vencimiento === referenciaFecha));
  } else if (tipo === 'aprobacion') {
    BELL_DATA.pendientes_aprobacion = BELL_DATA.pendientes_aprobacion
      .filter(p => !(p.id === referenciaId && p.fecha === referenciaFecha));
  } else if (tipo === 'checklist') {
    BELL_DATA.checklist_pendiente = BELL_DATA.checklist_pendiente
      .filter(d => !(d.id === referenciaId && d.fecha === referenciaFecha));
  }
  renderBellBadge();
  renderBellPanel();

  try {
    await apiFetch(API.marcarLeidaBell, 'POST', {
      tipo, referencia_id: referenciaId, referencia_fecha: referenciaFecha,
    });
  } catch (e) {
    console.error('No se pudo marcar la notificación como leída:', e);
  }
}

// Construye la lista de items visibles, compartida entre el badge y el
// panel para que siempre cuenten exactamente lo mismo.
function _construirBellItems() {
  const items = [];

  // Orden a propósito: primero lo "nuevo" (aprobación, licencia, nuevo,
  // préstamo — todo marcable como leído), y AL FINAL lo vencido/sin
  // asignar — esas dos siguen ahí siempre hasta que se resuelvan de
  // verdad, así que no hace falta que compitan por el primer lugar.
  BELL_DATA.pendientes_aprobacion.forEach(p => items.push({
    tipo: 'aprobacion', titulo: `${p.codigo} espera tu aprobación`,
    mensaje: `Solicitado por ${p.solicitante}`,
    fecha: `Creado el ${p.fecha}`,
    icono: 'fa-user-check', onClick: () => _irARequerimiento(p.codigo),
    dismissible: true, onLeida: () => _bellMarcarLeida('aprobacion', p.id, p.fecha),
  }));
  BELL_DATA.licencias_por_vencer.forEach(l => items.push({
    tipo: 'licencia', titulo: `Licencia ${l.software} ${l.vencida ? 'venció' : 'por vencer'}`,
    mensaje: `Dispositivo: ${l.serial_dispositivo}`,
    fecha: `${l.vencida ? 'Venció' : 'Vence'} el ${l.fecha_vencimiento}`,
    icono: 'fa-key', onClick: () => _irADispositivo(l.serial_dispositivo),
    dismissible: true, onLeida: () => _bellMarcarLeida('licencia', l.id, l.fecha_vencimiento),
  }));
  BELL_DATA.nuevos_sin_asignar.forEach(n => items.push({
    tipo: 'nuevo', titulo: `${n.codigo} nuevo sin asignar`,
    mensaje: `Solicitado por ${n.solicitante}`,
    fecha: `Creado el ${n.fecha}`,
    icono: 'fa-inbox', onClick: () => _irARequerimiento(n.codigo),
    dismissible: true, onLeida: () => _bellMarcarLeida('nuevo', n.id, n.fecha),
  }));
  BELL_DATA.prestamos_realizados.forEach(p => items.push({
    tipo: 'prestamo', titulo: `Préstamo realizado: ${p.equipo}`,
    mensaje: `${p.solicitante}${p.area ? ' — ' + p.area : ''}`,
    fecha: `Prestado el ${p.fecha}`,
    icono: 'fa-hand-holding', onClick: () => _irAPrestamoEquipos(p.equipo),
    dismissible: true, onLeida: () => _bellMarcarLeida('prestamo', p.id, p.fecha),
  }));
  BELL_DATA.checklist_pendiente.forEach(d => items.push({
    tipo: 'checklist', titulo: `Falta el checklist de ${d.serial}`,
    mensaje: `${d.tipo} — registrado el ${d.fecha}`,
    fecha: `Registrado el ${d.fecha}`,
    icono: 'fa-clipboard-check', onClick: () => _irAChecklistDispositivo(d.serial),
    dismissible: true, onLeida: () => _bellMarcarLeida('checklist', d.id, d.fecha),
  }));
  BELL_DATA.vencidos.forEach(v => items.push({
    tipo: 'vencido', titulo: `${v.codigo} está vencido`,
    mensaje: v.descripcion || 'Sin descripción',
    fecha: `Debió resolverse antes del ${v.fecha_estimada}`,
    icono: 'fa-clock', onClick: () => _irARequerimiento(v.codigo),
    dismissible: false,
  }));
  BELL_DATA.vencidos_sin_asignar.forEach(v => items.push({
    tipo: 'sin_asignar', titulo: `${v.codigo} vencido y sin asignar`,
    mensaje: v.descripcion || 'Sin descripción',
    fecha: `Debió resolverse antes del ${v.fecha_estimada}`,
    icono: 'fa-triangle-exclamation', onClick: () => _irARequerimiento(v.codigo),
    dismissible: false,
  }));

  return items;
}

function renderBellBadge() {
  const btn   = document.getElementById('btnBell');
  const badge = document.getElementById('bellBadge');
  if (!btn || !badge) return;
  const total = _construirBellItems().length;
  if (total > 0) {
    badge.textContent = total > 9 ? '9+' : String(total);
    badge.style.display = 'flex';
    btn.classList.add('bell-alert');
  } else {
    badge.style.display = 'none';
    btn.classList.remove('bell-alert');
  }
}

// Navega a Asignar Requerimientos y filtra por el código — usado por
// vencidos (asignados a mí), vencidos sin asignar, y pendientes de aprobación
// (ahí también aparecen, aunque la aprobación en sí se hace por el link del correo).
function _irARequerimiento(codigo) {
  cerrarBellPanel();
  showScreen('asignar-requerimientos');
  setTimeout(() => {
    const buscador = document.getElementById('asig-search');
    if (buscador) { buscador.value = codigo; asigPage = 1; renderAsignar(); }
  }, 500);
}

// Navega a Inventario y busca el dispositivo de la licencia por vencer.
function _irADispositivo(serial) {
  cerrarBellPanel();
  showScreen('inventario');
  setTimeout(() => {
    const buscador = document.getElementById('inv-search');
    if (buscador) { buscador.value = serial; loadInventario(); }
  }, 500);
}

// Navega a Checklist y busca el dispositivo al que le falta el checklist.
function _irAChecklistDispositivo(serial) {
  cerrarBellPanel();
  showScreen('checklist');
  setTimeout(() => {
    const buscador = document.getElementById('chk-buscar-serial');
    if (buscador) { buscador.value = serial; buscarChecklistDispositivo(); }
  }, 500);
}

// Navega a Préstamo de Equipos y busca el equipo del préstamo recién hecho.
function _irAPrestamoEquipos(nombreEquipo) {
  cerrarBellPanel();
  showScreen('prestamo-equipos');
  setTimeout(() => {
    const buscador = document.getElementById('equipo-search');
    if (buscador) { buscador.value = nombreEquipo; _renderEquiposAdmin(); }
  }, 500);
}

function renderBellPanel() {
  const list = document.getElementById('bellPanelList');
  if (!list) return;

  const items = _construirBellItems();

  if (items.length === 0) {
    list.innerHTML = '<div class="bell-panel-empty">No tienes notificaciones nuevas.</div>';
    return;
  }

  list.innerHTML = items.map((it, i) => `
    <div class="bell-item" data-idx="${i}">
      <div class="bell-item-icon ${it.tipo}"><i class="fa-solid ${it.icono}"></i></div>
      <div class="bell-item-body">
        <div class="bell-item-title">${it.titulo}</div>
        <div class="bell-item-msg">${it.mensaje}</div>
        <div class="bell-item-time">${it.fecha}</div>
      </div>
      ${it.dismissible ? `<button class="bell-item-leida" data-idx="${i}" title="Marcar como leída"><i class="fa-solid fa-check"></i></button>` : ''}
    </div>`).join('');

  list.querySelectorAll('.bell-item').forEach(el => {
    el.addEventListener('click', () => items[Number(el.dataset.idx)].onClick());
  });
  list.querySelectorAll('.bell-item-leida').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation(); // no disparar el onClick de navegación del item
      items[Number(btn.dataset.idx)].onLeida(); // ya re-renderiza el panel/badge internamente
    });
  });
}

function toggleBellPanel(ev) {
  ev.stopPropagation();
  const panel = document.getElementById('bellPanel');
  if (!panel) return;
  panel.classList.contains('hidden') ? abrirBellPanel() : cerrarBellPanel();
}

function abrirBellPanel() {
  const btn   = document.getElementById('btnBell');
  const panel = document.getElementById('bellPanel');
  if (!btn || !panel) return;
  // El panel nace dentro del header (.app-header tiene overflow:hidden), lo
  // que puede recortarlo al hacer scroll aunque use position:fixed. Se mueve
  // una sola vez al <body> — mismo truco que ya usa la vista previa del
  // acta (modalVerActa) — para que quede libre de cualquier contenedor padre.
  if (panel.parentElement !== document.body) document.body.appendChild(panel);
  const rect = btn.getBoundingClientRect();
  panel.style.top   = (rect.bottom + 10) + 'px';
  panel.style.right = (window.innerWidth - rect.right) + 'px';
  panel.classList.remove('hidden');
  renderBellPanel();
}

function cerrarBellPanel() {
  document.getElementById('bellPanel')?.classList.add('hidden');
}

document.addEventListener('click', (ev) => {
  const panel = document.getElementById('bellPanel');
  const wrap  = document.getElementById('bellWrap');
  if (!panel || panel.classList.contains('hidden')) return;
  // Tras moverse al <body> (ver abrirBellPanel), el panel ya no es
  // descendiente de #bellWrap — hay que considerar clic "adentro" a
  // cualquiera de los dos, si no, un clic dentro del panel lo cerraría solo.
  const dentro = (wrap && wrap.contains(ev.target)) || panel.contains(ev.target);
  if (!dentro) cerrarBellPanel();
});

window.addEventListener('resize', () => {
  const panel = document.getElementById('bellPanel');
  if (panel && !panel.classList.contains('hidden')) abrirBellPanel();
});

// Refresco cada 15s + al volver a la pestaña — se siente casi instantáneo
// sin necesitar WebSockets (ver conversación sobre infraestructura del servidor).
setInterval(cargarNotificacionesBell, 15000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') cargarNotificacionesBell();
});

// ============================================================
// FOTO DE PERFIL (header) — mismo patrón que ya existe y funciona en el
// Portal de Requerimientos: solo local (localStorage), no viaja al backend.
// Se guarda ligada al usuario de sesión (data-userkey en #miAvatar, tomado
// de request.session.usuario = la cédula), así que solo cambia cuando el
// usuario lo pide explícitamente (Cambiar foto / Quitar foto) — nunca solo.
// ============================================================
function _avatarKey() {
  const userKey = document.getElementById('miAvatar')?.dataset.userkey || '';
  return userKey ? ('amm_avatar_' + userKey) : '';
}
function _getAvatarFoto() {
  const key = _avatarKey();
  try { return key ? (localStorage.getItem(key) || '') : ''; } catch (e) { return ''; }
}
function _setAvatarFoto(dataUrl) {
  const key = _avatarKey();
  try { if (key) localStorage.setItem(key, dataUrl); } catch (e) {}
}
function _removeAvatarFoto() {
  const key = _avatarKey();
  try { if (key) localStorage.removeItem(key); } catch (e) {}
}

// Guarda la primera vez la inicial que ya renderiza Django (ej. "J"), para
// poder volver a mostrarla tal cual cuando se quite la foto.
let _avatarInicialHTML = {};
function _pintarAvatar(elId, foto) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (!(elId in _avatarInicialHTML)) _avatarInicialHTML[elId] = el.innerHTML;
  el.innerHTML = foto ? `<img src="${foto}" alt="">` : _avatarInicialHTML[elId];
}

function toggleAvatarPanel(ev) {
  ev.stopPropagation();
  const panel = document.getElementById('avatarPanel');
  if (!panel) return;
  panel.classList.contains('hidden') ? abrirAvatarPanel() : cerrarAvatarPanel();
}

function abrirAvatarPanel() {
  cerrarBellPanel();
  const btn   = document.getElementById('miAvatar');
  const panel = document.getElementById('avatarPanel');
  if (!btn || !panel) return;
  // Mismo truco que el panel de la campana: se mueve al <body> para no
  // quedar recortado por el overflow:hidden del header al hacer scroll.
  if (panel.parentElement !== document.body) document.body.appendChild(panel);
  const rect = btn.getBoundingClientRect();
  panel.style.top   = (rect.bottom + 10) + 'px';
  panel.style.right = (window.innerWidth - rect.right) + 'px';
  panel.classList.remove('hidden');
  const foto = _getAvatarFoto();
  _pintarAvatar('avatarPanelPreview', foto);
  const btnQuitar = document.getElementById('avatarPanelQuitar');
  if (btnQuitar) btnQuitar.style.display = foto ? '' : 'none';
}
function cerrarAvatarPanel() {
  document.getElementById('avatarPanel')?.classList.add('hidden');
}

document.addEventListener('click', (ev) => {
  const panel = document.getElementById('avatarPanel');
  if (!panel || panel.classList.contains('hidden')) return;
  const btn = document.getElementById('miAvatar');
  const dentro = panel.contains(ev.target) || (btn && btn.contains(ev.target));
  if (!dentro) cerrarAvatarPanel();
});

window.addEventListener('resize', () => {
  const panel = document.getElementById('avatarPanel');
  if (panel && !panel.classList.contains('hidden')) abrirAvatarPanel();
});

document.getElementById('avatarFileInput')?.addEventListener('change', (ev) => {
  const file = ev.target.files && ev.target.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => {
    _setAvatarFoto(reader.result);
    _pintarAvatar('miAvatar', reader.result);
    _pintarAvatar('avatarPanelPreview', reader.result);
    const btnQuitar = document.getElementById('avatarPanelQuitar');
    if (btnQuitar) btnQuitar.style.display = '';
  };
  reader.readAsDataURL(file);
});

document.getElementById('avatarPanelQuitar')?.addEventListener('click', () => {
  _removeAvatarFoto();
  _pintarAvatar('miAvatar', '');
  _pintarAvatar('avatarPanelPreview', '');
  document.getElementById('avatarPanelQuitar').style.display = 'none';
  const input = document.getElementById('avatarFileInput');
  if (input) input.value = '';
});

// ============================================================
// INIT — único DOMContentLoaded
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
  // 1. Catálogos — pobla todos los selects con _suppressChange = true internamente
  await loadCatalogos();

  // 2. Dashboard inicial
  await loadDashboard();

  // 3. Campanita de notificaciones (no se espera, no debe bloquear el resto)
  cargarNotificacionesBell();

  // 4. Foto de perfil guardada en este navegador (si tiene una puesta)
  _pintarAvatar('miAvatar', _getAvatarFoto());

  // ── Tipo dispositivo → características dinámicas ──
  document.getElementById('f-tipo')?.addEventListener('change', async function () {
    const tipoNombre = (CAT.tipos_dispositivo || [])
      .find(t => String(t.g200_id) === this.value)
      ?.g200_tipo_dispositivo || '';
    renderCaracteristicas(tipoNombre);

    // ── Al cambiar de tipo (solo creando, no editando), limpiar TODOS
    //    los campos generales que no deberían arrastrarse de un tipo a otro ──
    if (!editingId) {
      ['f-marca', 'f-nombre-equipo', 'f-valor-promedio', 'f-valor-arrendamiento',
       'f-prop', 'f-co', 'f-estado', 'f-obs']
        .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

      const dptoEl = document.getElementById('f-dpto');
      if (dptoEl) dptoEl.value = '';
      const munEl = document.getElementById('f-municipio');
      if (munEl) munEl.innerHTML = '<option value="">Seleccione</option>';
    }

    // ── Tipos con serial autogenerado (Licencia Office, Periférico...):
    //    mostrar de una vez el siguiente serial mientras llenas el resto ──
    const serialInput = document.getElementById('f-serial');
    const tipoId = this.value;
    if (serialInput) {
      if (tipoId && !editingId) {
        serialInput.value = 'Calculando...';
        serialInput.readOnly = true;
        try {
          const res = await apiFetch(`${BASE}/inventario/api/dispositivos/siguiente-serial/?tipo_id=${encodeURIComponent(tipoId)}`);
          if (res.ok && res.data.aplica) {
            serialInput.value = res.data.serial || '';
          } else {
            serialInput.readOnly = false;
            serialInput.value = '';
            serialInput.placeholder = '';
          }
        } catch (e) {
          serialInput.readOnly = false;
          serialInput.value = '';
        }
      } else if (!editingId) {
        serialInput.readOnly = false;
        serialInput.value = '';
        serialInput.placeholder = '';
      }
    }
  });

  // ── Modal asignar → cargar seriales por tipo ──
 // ── Modal asignar → habilitar buscador de serial al cambiar tipo ──
document.getElementById('as-tipo-device')?.addEventListener('change', function () {
    const tipoId = this.value;
    const input  = document.getElementById('as-serial-input');
    const hidden = document.getElementById('as-serial-device');
    const drop   = document.getElementById('as-serial-dropdown');

    // Limpiar selección anterior
    input.value  = '';
    hidden.value = '';
    drop.style.display = 'none';
    drop.innerHTML = '';

    if (!tipoId) {
      input.disabled = true;
      input.placeholder = 'Buscar serial...';
    } else {
      input.disabled = false;
      input.placeholder = 'Escribe para buscar serial...';
      input.focus();
    }
  });

  // ── Inventario — filtros ──
  document.getElementById('inv-search')?.addEventListener('input', () => {
    if (!_suppressChange) loadInventario();
  });
  document.getElementById('inv-filter-tipo')?.addEventListener('change', () => {
    if (!_suppressChange) loadInventario();
  });
  document.getElementById('inv-filter-estado')?.addEventListener('change', () => {
    if (!_suppressChange) loadInventario();
  });

  // ── Inactivos — filtros ──
  document.getElementById('inac-search')?.addEventListener('input', () => {
    if (!_suppressChange) loadInactivos();
  });
  document.getElementById('inac-filter-tipo')?.addEventListener('change', () => {
    if (!_suppressChange) loadInactivos();
  });
  document.getElementById('inac-filter-estado')?.addEventListener('change', () => {
    if (!_suppressChange) loadInactivos();
  });

  // ── Colaboradores — búsqueda y tamaño de página ──
document.getElementById('colab-search')?.addEventListener('input', () => {
    if (!_suppressChange) { colabPage = 1; loadColaboradores(); }
});
  document.getElementById('colab-pag-size')?.addEventListener('change', () => {
    if (!_suppressChange) {
      colabPageSize = parseInt(document.getElementById('colab-pag-size').value);
      colabPage = 1;
      _renderColabTable();
    }
  });

  // ── Préstamo de Equipos — búsqueda ──
  document.getElementById('equipo-search')?.addEventListener('input', () => {
    if (!_suppressChange) _renderEquiposAdmin();
  });

  // ── Historial Requerimientos — búsqueda ──
  document.getElementById('req-search')?.addEventListener('input', () => {
    if (!_suppressChange) { reqActPage = 1; reqCerPage = 1; reqLoadPage(1); }
  });

document.getElementById('asig-search')?.addEventListener('input', () => {
  if (!_suppressChange) { asigPage = 1; renderAsignar(); }
});

});


// ── Buscador de seriales con debounce ──
(function setupSerialSearch() {
  let debounceTimer = null;

  document.addEventListener('input', async function (e) {
    if (e.target.id !== 'as-serial-input') return;

    const tipoId = document.getElementById('as-tipo-device')?.value;
    const q      = e.target.value.trim();
    const drop   = document.getElementById('as-serial-dropdown');
    const hidden = document.getElementById('as-serial-device');

    // Si borra el texto, limpiar selección
    hidden.value = '';

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (!tipoId) return;

      // Mostrar loading
      drop.innerHTML = '<div style="padding:8px 12px;color:var(--text-muted);font-size:.85rem">Buscando...</div>';
      drop.style.display = 'block';

      const colabId = window._asignarColabId || '';
      const params = `tipo=${tipoId}&solo_disponibles=1${colabId ? '&colaborador_id=' + colabId : ''}${q ? '&q=' + encodeURIComponent(q) : ''}`;
      const res = await apiFetch(`${API.dispositivos}?${params}`);

      if (!res.ok || !res.data?.dispositivos?.length) {
        drop.innerHTML = '<div style="padding:8px 12px;color:var(--text-muted);font-size:.85rem">Sin resultados</div>';
        return;
      }

      drop.innerHTML = res.data.dispositivos.slice(0, 30).map(d => `
        <div class="serial-option" data-id="${d.id}" data-label="${d.serial} — ${d.marca} ${d.modelo || ''}"
          style="padding:8px 12px;cursor:pointer;font-size:.85rem;border-bottom:1px solid var(--border)">
          <strong>${d.serial}</strong>
          <span style="color:var(--text-muted);margin-left:6px">${d.marca} ${d.modelo || ''}</span>
        </div>
      `).join('');
    }, 280); // debounce 280ms
  });

  // Seleccionar opción del dropdown
  document.addEventListener('click', function (e) {
    const opt = e.target.closest('.serial-option');
    if (opt) {
      document.getElementById('as-serial-input').value  = opt.dataset.label;
      document.getElementById('as-serial-device').value = opt.dataset.id;
      document.getElementById('as-serial-dropdown').style.display = 'none';
      return;
    }
    // Click fuera → cerrar dropdown
    if (!e.target.closest('#as-serial-dropdown') && !e.target.closest('#as-serial-input')) {
      const drop = document.getElementById('as-serial-dropdown');
      if (drop) drop.style.display = 'none';
    }
  });

  // Hover highlight
  document.addEventListener('mouseover', function (e) {
    const opt = e.target.closest('.serial-option');
    if (!opt) return;
    opt.closest('#as-serial-dropdown')?.querySelectorAll('.serial-option')
      .forEach(o => o.style.background = '');
    opt.style.background = 'var(--bg-hover, rgba(255,255,255,.07))';
  });
})();

// ══════════════════════════════════════════════════════
// CARGA MASIVA
// ══════════════════════════════════════════════════════

// ── COLUMNAS POR TIPO para carga masiva ──────────────────────────
const CM_BASE_COLS = [
  ['serial',             'Serial unico del dispositivo',      true],
  ['marca',              'Nombre de la marca (Ej: XIAOMI)',    true],
  ['propietario',        'Nombre del propietario',            true],
  ['centro_operaciones', 'Codigo del CO (Ej: CO-01)',         false],
  ['departamento',       'Nombre del departamento',           true],
  ['municipio',          'Nombre del municipio',              true],
  
  ['observaciones','observaciones', false],
  
];
const CM_EXTRA_COLS = {
  'CELULAR':             [['numero_linea','Numero de linea',true],['operador','Nombre del operador',true],['imei1','IMEI 1',true],['valor_promedio','Valor del equipo (solo numero)',false],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['imei2','IMEI 2 dual SIM',false],['plan_datos','Plan de datos',false],['cuenta_email','Cuenta Gmail',false],['contrasena','Contrasena Gmail',false]],
  'TABLET':              [['numero_linea','Numero de linea',false],['valor_promedio','Valor del equipo (solo numero)',false],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['operador','Operador',false],['imei1','IMEI 1',false],['imei2','IMEI 2',false],['plan_datos','Plan de datos',false],['cuenta_email','Cuenta Gmail',true],['contrasena','Contrasena Gmail',true]],
  'PORTATIL':            [['procesador','Procesador (Ej: CORE I5)',true],['nombre','Nombre del equipo (Ej: LAPTOP-02)',false],['valor_promedio','Valor del equipo (solo numero)',false],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['activo','Activo',false],['ram','RAM (Ej: 8, solo numero)',true],['disco','Tipo de disco SSD o HDD',true],['almacenamiento','Capacidad del disco',true],['so','Sistema operativo',true],['antivirus','Antivirus',false],['licencia_office','Licencia Office',false],['correo_office','Correo Office',false]],
  'TORRE DE ESCRITORIO': [['procesador','Procesador',true],['valor_promedio',     'Valor del equipo (solo numero)',false],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['nombre','Nombre del equipo',false],['ram','RAM',true],['disco','Tipo de disco',true],['almacenamiento','Capacidad',true],['so','Sistema operativo',true],['antivirus','Antivirus',false],['licencia_office','Licencia Office',false],['correo_office','Correo Office',false]],
  'MODEM WIFI':          [['numero_linea','Numero de linea',true],['valor_promedio','Valor del equipo (solo numero)',false],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['operador','Operador',true],['imei1','IMEI 1',true],['imei2','IMEI 2',false],['plan_datos','Plan de datos',false]],
  'SIMCARD':             [['numero_linea','Numero de linea',true],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['operador','Operador',true],['plan_datos','Plan de datos',false]],
  'PANTALLA':            [['pulgadas','Tamano en pulgadas',true],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['resolucion','Resolucion (Ej: 1920x1080)',false]],
  'TELEFONO FIJO':       [['imei1','IMEI 1',true]],
  'IMPRESORA':           [['tipo_impresora','Tipo de impresora',true],['funcion','Funcion (Ej: MULTIFUNCIONAL)',false]],
  'PERIFERICO':          [['base','Base (SI/NO/NO APLICA)',true],['teclado','Teclado',true],['mouse','Mouse',true],['auriculares','Auriculares',true],['cargador_pc','Cargador PC',true],['cargador_movil','Cargador movil',true]],
  'LICENCIA OFFICE':     [['tipo_licencia','Tipo de licencia',true],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['almacenamiento','Almacenamiento',true],['version','Version (Ej: 365, 2021)',false]],
  'VIDEO BEAM':          [['lumenes','Lumenes (Ej: 3500)',true]],
};

function cmOnTipoChange() {
  const tipo = document.getElementById('cm-tipo').value;
  const colsSection   = document.getElementById('cm-cols-section');
  const uploadSection = document.getElementById('cm-upload-section');
  const btn           = document.getElementById('cm-btn-importar');

  if (!tipo) {
    colsSection.style.display   = 'none';
    uploadSection.style.display = 'none';
    btn.disabled = true;
    return;
  }

  const extra = CM_EXTRA_COLS[tipo] || [];
  const cols  = [...CM_BASE_COLS, ...extra];
  const tbody = document.getElementById('cm-cols-body');

   if (extra !== null && extra.length === 0 && CM_EXTRA_COLS[tipo] !== undefined) {
  tbody.innerHTML = `
    <tr>
      <td colspan="3" style="padding:24px;text-align:center;color:var(--text-secondary);font-size:13px;">
        <i class="fas fa-info-circle" style="margin-right:6px;color:var(--primary);"></i>
        Este tipo de dispositivo no tiene campos adicionales
      </td>
    </tr>`;
  } else {
  tbody.innerHTML = cols.map(([name, desc, req]) => `
    <tr style="${req ? 'background:rgba(34,197,94,0.04)' : ''}">
      <td style="padding:8px 14px;border-bottom:1px solid var(--border);font-family:'DM Mono',monospace;font-size:12px;font-weight:600;color:var(--primary);">${name}</td>
      <td style="padding:8px 14px;border-bottom:1px solid var(--border);color:var(--text-secondary);font-size:12px;">${desc}</td>
      <td style="padding:8px 14px;border-bottom:1px solid var(--border);text-align:center;">
        <span class="status-badge ${req ? 'status-habilitado' : 'status-inactivo'}" style="font-size:10px;padding:3px 8px;">${req ? '&#x2714; Si' : 'Opcional'}</span>
      </td>
    </tr>`).join('');
  }

  colsSection.style.display   = 'block';
  uploadSection.style.display = 'block';
  btn.disabled = false;
}



function cmDescargarPlantilla() {
  const tipo = document.getElementById('cm-tipo').value;
  if (!tipo) return;

  const extra = CM_EXTRA_COLS[tipo];
  if (extra !== undefined && extra.length === 0) {
    showNotif('Sin plantilla', 'Este tipo de dispositivo no requiere carga masiva.', 'error');
    return;
  }

  const cols = [...CM_BASE_COLS, ...(extra || [])].map(c => c[0]);

  // Crear workbook con SheetJS
  const wb = XLSX.utils.book_new();

  // Crear hoja con los encabezados como primera fila
  const ws = XLSX.utils.aoa_to_sheet([cols]);

  // Aplicar estilos a los encabezados (ancho de columna automático)
  ws['!cols'] = cols.map(() => ({ wch: 20 })); // 20 caracteres de ancho por columna

  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');

  // Descargar como .xlsx
  XLSX.writeFile(wb, `plantilla_${tipo.toLowerCase().replace(/ /g, '_')}.xlsx`);
}

function openCargaMasiva() {
  // Reset estado
  const tipoSel = document.getElementById('cm-tipo');
  if (tipoSel) {
    // Poblar con tipos del catalogo
    tipoSel.innerHTML = '<option value="">Seleccione un tipo...</option>' +
      (CAT.tipos_dispositivo || []).map(t =>
        `<option value="${t.g200_tipo_dispositivo}">${t.g200_tipo_dispositivo}</option>`
      ).join('');
    tipoSel.value = '';
  }
  document.getElementById('cm-cols-section').style.display   = 'none';
  document.getElementById('cm-upload-section').style.display = 'none';
  document.getElementById('cm-btn-importar').disabled = true;
  document.getElementById('cm-archivo').value = '';
  const res = document.getElementById('cm-resultado');
  res.style.display = 'none';
  res.innerHTML = '';
  document.getElementById('modalCargaMasiva').classList.add('active');
}

async function ejecutarCargaMasiva() {
  const fileInput = document.getElementById('cm-archivo');
  const resultado = document.getElementById('cm-resultado');
  const btn = document.getElementById('cm-btn-importar');

  if (!fileInput.files || fileInput.files.length === 0) {
    showNotif('Archivo requerido', 'Selecciona un archivo Excel primero', 'warning');
    return;
  }

  const tipo = document.getElementById('cm-tipo').value;
  if (!tipo) {
    showNotif('Tipo requerido', 'Selecciona el tipo de dispositivo primero', 'warning');
    return;
  }
  const formData = new FormData();
  formData.append('archivo', fileInput.files[0]);
  formData.append('tipo_dispositivo', tipo);

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...';
  resultado.style.display = 'none';

  try {
    const resp = await fetch(API.cargaMasiva, {
      method: 'POST',
      body: formData,
      headers: { 'X-CSRFToken': getCsrfToken() },
    });
    const data = await resp.json();

    if (!data.ok) {
      resultado.style.display = 'block';
      resultado.style.background = 'var(--danger-bg, #fee2e2)';
      resultado.style.color = 'var(--danger, #dc2626)';
      resultado.innerHTML = `<b>Error:</b> ${data.error}`;
      return;
    }

    const d = data.data;
    let html = `
      <b style="font-size:14px">Importación completada</b><br><br>
       Creados: <b>${d.creados}</b><br>
       Omitidos: <b>${d.omitidos}</b>
    `;

    if (d.errores && d.errores.length > 0) {
      html += `
        <br><br>
        <b style="font-size:12px">Detalle de omitidos (${d.errores.length}):</b>
        <div style="max-height:200px;overflow-y:scroll;margin-top:6px;border:1px solid #ccc;border-radius:6px;display:block;">
          <table style="font-size:11px;width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#f3f4f6;position:sticky;top:0;z-index:1;">
                <th style="padding:4px 8px;text-align:left;border-bottom:1px solid #ccc;">Fila</th>
                <th style="padding:4px 8px;text-align:left;border-bottom:1px solid #ccc;">Serial</th>
                <th style="padding:4px 8px;text-align:left;border-bottom:1px solid #ccc;">Error</th>
              </tr>
            </thead>
            <tbody>
              ${d.errores.map(e => `
                <tr style="border-top:1px solid #e5e7eb;">
                  <td style="padding:4px 8px;">${e.fila}</td>
                  <td style="padding:4px 8px;">${e.serial}</td>
                  <td style="padding:4px 8px;">${e.error}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    resultado.style.display = 'block';
    resultado.style.background = d.creados > 0 ? 'var(--success-bg, #dcfce7)' : 'var(--warning-bg, #fef9c3)';
    resultado.style.color = 'var(--text)';
    resultado.innerHTML = html;

    if (d.creados > 0) {
      loadInventario();
      showNotif(' Carga masiva', `${d.creados} ${tipo.toLowerCase()}(s) importados correctamente`, 'success', 5000);
    }
  } catch (err) {
    resultado.style.display = 'block';
    resultado.style.background = 'var(--danger-bg, #fee2e2)';
    resultado.innerHTML = `<b>Error de red:</b> ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-upload"></i> Importar';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const cmArchivo = document.getElementById('cm-archivo');
  if (cmArchivo) {
    cmArchivo.addEventListener('change', function() {
      const name = this.files[0]?.name || 'Ningun archivo seleccionado';
      document.getElementById('cm-filename').textContent = name;
    });
  }
});

function getCsrfToken() {
  // Django CSRF token desde cookie
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (let c of cookies) {
    c = c.trim();
    if (c.startsWith(name + '=')) return decodeURIComponent(c.substring(name.length + 1));
  }
  return '';
}


// ============================================================
// GESTIÓN DE USUARIOS
// ============================================================
const API_USR = {
  lista:    `${BASE}/requerimiento/api/usuarios/`,
  crear:    `${BASE}/requerimiento/api/usuarios/crear/`,
  editar:   (pk) => `${BASE}/requerimiento/api/usuarios/${pk}/editar/`,
  eliminar: (pk) => `${BASE}/requerimiento/api/usuarios/${pk}/eliminar/`,
  cos:      `${BASE}/dashboard/api/req/centros-operacion/`,
  cargos:   `${BASE}/dashboard/api/req/cargos/`,
  tipos:    `${BASE}/api/tipos-usuario/`,
};

let usrPage = 1, usrEditId = null;

function usrPageSize() {
  return parseInt(document.getElementById('usr-pag-size')?.value || 10);
}

async function usrLoadPage(p = 1) {
  usrPage = p;
  const q    = document.getElementById('usr-search')?.value.trim() || '';
  const size = usrPageSize();
  const url  = `${API_USR.lista}?page=${p}&size=${size}${q ? '&q=' + encodeURIComponent(q) : ''}`;

  const tbodyLoad = document.getElementById('usr-tbody');
  if (tbodyLoad) {
    tbodyLoad.innerHTML = `<tr><td colspan="5">
      <div class="empty-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Cargando usuarios...</p>
      </div>
    </td></tr>`;
  }

  const res  = await apiFetch(url);
  if (!res.ok) { showNotif('Error', 'No se pudo cargar la lista de usuarios', 'error'); return; }

  const { results, total } = res;
  const tbody = document.getElementById('usr-tbody');

  if (!results.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-light)">Sin resultados</td></tr>`;
  } else {
    tbody.innerHTML = results.map(u => `
      <tr data-id="${u.id}" data-cedula="${u.cedula}" data-nombre="${u.nombre}"
          data-cargo-id="${u.cargo_id || ''}" data-co-id="${u.co_id || ''}"
          data-correo="${u.correo || ''}" data-tipo="${u.tipo_usuario_id || ''}" data-tipo-nombre="${u.tipo_usuario || ''}"
          data-cargo-nombre="${u.cargo || ''}" data-co-nombre="${u.co || ''}" data-fecha="${u.fecha || ''}">
        <td>${u.cedula}</td>
        <td>${u.nombre}</td>
        <td>${u.cargo || '—'}</td>
        <td>${u.co || '—'}</td>
        <!-- Correo / Fecha de creación / Tipo de usuario: se ocultaron de la
             tabla — se siguen guardando y cargando igual, solo se ven ahora
             en el botón "Ver detalle" (ojito). -->
        <td>
          <div style="display:flex;gap:6px;">
            <button class="tbl-btn info" title="Ver detalle" onclick="verUsuarioDetalle(${u.id})"><i class="fas fa-eye"></i></button>
            <button class="tbl-btn edit" title="Editar" onclick="openUsuarioEdit(${u.id})"><i class="fas fa-edit"></i></button>
            <button class="tbl-btn del"  title="Eliminar" onclick="deleteUsuario(${u.id},'${u.nombre}')"><i class="fas fa-trash-alt"></i></button>
          </div>
        </td>
      </tr>`).join('');
  }

  // Paginación
  const from = (p - 1) * size + 1;
  const to   = Math.min(p * size, total);
  document.getElementById('usr-pag-from').textContent  = total ? from : 0;
  document.getElementById('usr-pag-to').textContent    = to;
  document.getElementById('usr-pag-total').textContent = total;

  const pages = Math.ceil(total / size);
  const ctrl  = document.getElementById('usr-pag-controls');
  let btns = '';
  for (let i = 1; i <= pages; i++) {
    btns += `<button class="pag-btn${i===p?' active':''}" onclick="usrLoadPage(${i})">${i}</button>`;
  }
  ctrl.innerHTML = btns;
}

// Datos cacheados para los searchable dropdowns
let _usrCoData    = [];
let _usrCargoData = [];

function usrAbrirDropdown(tipo) {
  const dd = document.getElementById(`usr-${tipo}-dropdown`);
  if (dd) { dd.style.display = 'block'; usrFiltrarDropdown(tipo); }
}
function usrCerrarDropdown(tipo) {
  const dd = document.getElementById(`usr-${tipo}-dropdown`);
  if (dd) dd.style.display = 'none';
}
function usrFiltrarDropdown(tipo) {
  const q    = (document.getElementById(`usr-${tipo}-search`)?.value || '').toLowerCase();
  const dd   = document.getElementById(`usr-${tipo}-dropdown`);
  const data = tipo === 'co' ? _usrCoData : _usrCargoData;
  if (!dd) return;
  const filtrado = data.filter(d => d.nombre.toLowerCase().includes(q));
  if (!filtrado.length) {
    dd.innerHTML = `<div class="usr-dropdown-empty">Sin resultados</div>`;
    return;
  }
  dd.innerHTML = filtrado.map(d =>
    `<div class="usr-dropdown-item" onmousedown="usrSeleccionarDropdown('${tipo}','${d.id.toString().replace(/'/g,"\'")}','${d.nombre.replace(/'/g,"\'")}')">${d.nombre}</div>`
  ).join('');
}
function usrSeleccionarDropdown(tipo, id, nombre) {
  document.getElementById(`usr-${tipo}`).value        = id;
  document.getElementById(`usr-${tipo}-search`).value = nombre;
  usrCerrarDropdown(tipo);
}
function usrLimpiarDropdowns() {
  ['co','cargo'].forEach(t => {
    const inp = document.getElementById(`usr-${t}-search`);
    const hid = document.getElementById(`usr-${t}`);
    if (inp) inp.value = '';
    if (hid) hid.value = '';
  });
}

async function usrPoblarSelects() {
  if (!_usrCoData.length) {
    try {
      const res = await apiFetch(API_USR.cos);
      if (res.ok && res.results.length) _usrCoData = res.results;
    } catch(e) { console.error('usrPoblarSelects CO error:', e); }
  }
  if (!_usrCargoData.length) {
    try {
      const res = await apiFetch(API_USR.cargos);
      if (res.ok && res.results.length) _usrCargoData = res.results;
    } catch(e) { console.error('usrPoblarSelects Cargo error:', e); }
  }

  // ← AGREGAR ESTO
  try {
    const res = await apiFetch(`${BASE}/api/tipos-usuario/`);  
    if (res.ok && res.results.length) {
      const sel = document.getElementById('usr-tipo');
      sel.innerHTML = '<option value="">-- Selecciona --</option>' +
        res.results.map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
    }
  } catch(e) { console.error('usrPoblarSelects Tipo error:', e); }
}




async function openUsuarioModal() {
  usrEditId = null;
  document.getElementById('usr-modal-title').textContent = 'CREAR USUARIO';
  document.getElementById('usr-modal-sub').textContent   = 'Nuevo acceso al sistema';
  document.getElementById('usr-cedula').value    = '';
  document.getElementById('usr-nombre').value    = '';
  document.getElementById('usr-correo').value    = '';
  document.getElementById('usr-password').value  = '';
  document.getElementById('usr-tipo').value      = '';
  document.getElementById('usr-cedula').disabled = false;
  document.getElementById('usr-pwd-req').style.display = '';
  usrLimpiarDropdowns();
  await usrPoblarSelects();
  document.getElementById('modalUsuario').classList.add('active');
}

function verUsuarioDetalle(id) {
  const row = document.querySelector(`#usr-tbody tr[data-id="${id}"]`);
  if (!row) return;
  document.getElementById('usr-detalle-nombre').textContent = row.dataset.nombre || '—';
  document.getElementById('usr-detalle-cedula').textContent = 'Cédula: ' + (row.dataset.cedula || '—');
  document.getElementById('usr-detalle-cargo').textContent  = row.dataset.cargoNombre || '—';
  document.getElementById('usr-detalle-co').textContent     = row.dataset.coNombre    || '—';
  document.getElementById('usr-detalle-correo').textContent = row.dataset.correo      || '—';
  document.getElementById('usr-detalle-fecha').textContent  = row.dataset.fecha       || '—';
  document.getElementById('usr-detalle-tipo').textContent   = row.dataset.tipoNombre  || '—';
  document.getElementById('modalVerUsuario').classList.add('active');
}

async function openUsuarioEdit(id) {
  usrEditId = id;
  await usrPoblarSelects();
  const row = document.querySelector(`#usr-tbody tr[data-id="${id}"]`);
  document.getElementById('usr-modal-title').textContent = 'EDITAR USUARIO';
  document.getElementById('usr-modal-sub').textContent   = 'Modificar datos de acceso';
  if (row) {
    document.getElementById('usr-cedula').value  = row.dataset.cedula  || '';
    document.getElementById('usr-nombre').value  = row.dataset.nombre  || '';
    const coItem    = _usrCoData.find(d => String(d.id) === String(row.dataset.coId));
    const cargoItem = _usrCargoData.find(d => String(d.id) === String(row.dataset.cargoId));
    document.getElementById('usr-co').value           = row.dataset.coId    || '';
    document.getElementById('usr-co-search').value    = coItem    ? coItem.nombre    : '';
    document.getElementById('usr-cargo').value        = row.dataset.cargoId || '';
    document.getElementById('usr-cargo-search').value = cargoItem ? cargoItem.nombre : '';
    document.getElementById('usr-correo').value  = row.dataset.correo  || '';
    document.getElementById('usr-tipo').value    = row.dataset.tipo    || '';
  }
  document.getElementById('usr-cedula').disabled = false;
  document.getElementById('usr-password').value  = '';
  document.getElementById('usr-pwd-req').style.display = 'none';
  document.getElementById('modalUsuario').classList.add('active');
}

async function saveUsuario() {
  const cedula   = document.getElementById('usr-cedula').value.trim();
  const nombre   = document.getElementById('usr-nombre').value.trim();
  const co_id    = document.getElementById('usr-co').value.trim();
  const cargo_id = document.getElementById('usr-cargo').value.trim();
  const correo   = document.getElementById('usr-correo').value.trim();
  const password = document.getElementById('usr-password').value.trim();
  const tipo     = document.getElementById('usr-tipo').value;

  if (!cedula || !nombre) { showNotif('Campos requeridos', 'Cédula y nombre son obligatorios', 'warning'); return; }
  if (!usrEditId && !password) { showNotif('Campos requeridos', 'La contraseña es obligatoria al crear', 'warning'); return; }
  if (!usrEditId && !co_id) { showNotif('Campos requeridos', 'El Centro de Operación es obligatorio', 'warning'); return; }

  const body = { cedula, nombre, co_id, cargo_id: cargo_id || null, correo, password, tipo_usuario: tipo };
  const url  = usrEditId ? API_USR.editar(usrEditId) : API_USR.crear;
  const res  = await apiFetch(url, 'POST', body);
  

  if (!res.ok) { showNotif('Error', res.error || 'No se pudo guardar', 'error'); return; }
  showNotif('Éxito', usrEditId ? 'Usuario actualizado' : 'Usuario creado', 'success');
  closeModal('modalUsuario');
  usrLoadPage(usrPage);
}

function deleteUsuario(id, nombre) {
  document.getElementById('confirmSub').textContent = `Usuario "${nombre}"`;
  document.getElementById('confirmBody').innerHTML   =
    `Eliminarás permanentemente el acceso del usuario <strong>${nombre}</strong>.`;
  document.getElementById('btnConfirmDel').onclick = async () => {
    const res = await apiFetch(API_USR.eliminar(id), 'POST', {});
    if (!res.ok) { showNotif('Error', res.error || 'No se pudo eliminar', 'error'); return; }
    showNotif('Eliminado', `Usuario "${nombre}" eliminado`, 'success');
    closeModal('modalConfirm');
    usrLoadPage(usrPage);
  };
  document.getElementById('modalConfirm').classList.add('active');
}

// Cargar la pantalla cuando se navega a ella
const _origShowScreen = showScreen;
window.showScreen = function(id) {
  _origShowScreen(id);
  if (id === 'gestion-usuarios') { usrLoadPage(1); usrPoblarSelects(); }
};

/* 
   MIS REQUERIMIENTOS — lógica
 */

let reqTabActual = 'activos';
let reqActivos   = [];   // se llenará desde la API
let reqCerrados  = [];
let reqActPage   = 1;
let reqCerPage   = 1;
let reqSortKey   = '';
let reqSortAsc   = true;
let reqCSortKey  = '';
let reqCSortAsc  = true;

function switchReqTab(tab) {
  reqTabActual = tab;
  document.getElementById('tab-activos').classList.toggle('active',  tab === 'activos');
  document.getElementById('tab-cerrados').classList.toggle('active', tab === 'cerrados');
  document.getElementById('req-panel-activos').style.display  = tab === 'activos'  ? '' : 'none';
  document.getElementById('req-panel-cerrados').style.display = tab === 'cerrados' ? '' : 'none';
  reqLoadPage(1);
}

function reqLoadPage(page) {
  if (reqTabActual === 'activos') {
    reqActPage = page;
    renderReqActivos();
  } else {
    reqCerPage = page;
    renderReqCerrados();
  }
}

/* ── Render activos ── */
function renderReqActivos() {
  const q        = (document.getElementById('req-search')?.value || '').toLowerCase();
  const pageSize = parseInt(document.getElementById('req-pag-size')?.value || 10);

  let data = reqActivos.filter(r =>
    !q ||
    (r.codigo       || '').toLowerCase().includes(q) ||
    (r.descripcion  || '').toLowerCase().includes(q) ||
    (r.solicitante  || '').toLowerCase().includes(q)
  );

  if (reqSortKey) {
    data.sort((a, b) => {
      const va = (a[reqSortKey] || '').toString().toLowerCase();
      const vb = (b[reqSortKey] || '').toString().toLowerCase();
      return reqSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  const total = data.length;
  const from  = total ? (reqActPage - 1) * pageSize + 1 : 0;
  const to    = Math.min(reqActPage * pageSize, total);
  const page  = data.slice((reqActPage - 1) * pageSize, reqActPage * pageSize);

  document.getElementById('req-act-from').textContent  = from;
  document.getElementById('req-act-to').textContent    = to;
  document.getElementById('req-act-total').textContent = total;

  const tbody = document.getElementById('req-activos-tbody');
  if (!page.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light)">
      <i class="fas fa-clipboard-list" style="font-size:28px;display:block;margin-bottom:10px;opacity:.3"></i>
      No hay requerimientos activos
    </td></tr>`;
  } else {
    tbody.innerHTML = page.map(r => `
      <tr>
        <!-- Fecha creación / Fecha vencimiento: ya se ven en "Ver detalle",
             se ocultan aquí. Los datos se siguen guardando y llegando igual. -->
        <td><span class="serial-mono" style="color:var(--primary)">${r.codigo || '—'}</span></td>
        <td>${r.solicitante || '—'}</td>
        <td>${_reqPrioridadBadge(r.prioridad)}</td>
        <td>${_reqEstadoBadge(r.estado)}</td>
        <td style="text-align:center">
          ${r.tiene_adjunto
            ? `<button class="tbl-btn info" title="Ver adjunto: ${r.nombre_adjunto}"
                onclick='verAdjuntoReq(${JSON.stringify(r.nombre_adjunto)}, ${JSON.stringify(r.url_adjunto)})'>
                <i class="fas fa-paperclip"></i>
              </button>`
            : `<span style="color:var(--text-light)">—</span>`
          }
        </td>
        <td>
          <div class="tbl-actions">
            <button class="tbl-btn info"    title="Ver detalle" onclick="verReq(${r.id})"><i class="fas fa-eye"></i></button>
            <button class="tbl-btn assign"  title="Reasignar"
              onclick='openAsignarReqModal(${JSON.stringify(r)}, "misreq")'><i class="fas fa-random"></i></button>
            <button class="tbl-btn plan"    title="Plan de acción"
              onclick='openPlanReqModal(${JSON.stringify(r)})'><i class="fas fa-tasks"></i></button>
            <button class="tbl-btn success" title="Solucionar"
              onclick='openSolucionarReqModal(${JSON.stringify(r)})'><i class="fas fa-check-circle"></i></button>
            <button class="tbl-btn del" title="Rechazar"
              onclick='openRechazarReqModal(${r.id}, ${JSON.stringify(r.codigo)}, ${JSON.stringify(r.descripcion || "")})'>
              <i class="fas fa-ban"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');
  }

  const totalPages = Math.ceil(total / pageSize);
  document.getElementById('req-act-controls').innerHTML = _buildPagControls(
    reqActPage, totalPages, p => { reqActPage = p; renderReqActivos(); }
  );
}

/* ──
<td class="td-clamp">
</td><span class="clamp-text" title="${(r.descripcion || '').replace(/"/g, '&quot;')}">${r.descripcion || '—'}</span>
</td> ESTO  PERNENECE A LA TABLA DE  DESCRIPCION
 ── */
/* ── Plan de acción (Mis Requerimientos) ── */
let planReqId = null;

function openPlanReqModal(req) {
  planReqId = req.id;
  document.getElementById('plan-f-codigo').textContent      = req.codigo || '—';
  document.getElementById('plan-f-documento').textContent   = req.documento || '—';
  document.getElementById('plan-f-nombre').textContent      = req.solicitante || '—';
  document.getElementById('plan-f-correo').textContent      = req.correo || '—';
  document.getElementById('plan-f-cargo').textContent       = req.cargo || '—';
  document.getElementById('plan-f-co').textContent          = req.centro_operacion || '—';
  document.getElementById('plan-f-fecha').textContent       = _soloFecha(req.fecha);
  document.getElementById('plan-f-tipo').textContent        = req.tipo_requerimiento || '—';
  document.getElementById('plan-f-categoria').textContent   = req.categoria || '—';
  document.getElementById('plan-f-subcategoria').textContent= req.subcategoria || '—';
  document.getElementById('plan-f-prioridad').textContent   = req.prioridad || '—';
  document.getElementById('plan-f-vencimiento').textContent = _soloFecha(req.fecha_vencimiento);
  document.getElementById('plan-f-estado').textContent      = req.estado || '—';
  document.getElementById('plan-f-clasificacion').textContent = req.clasificacion || 'No hay Clasificación';
  document.getElementById('plan-f-descripcion').textContent = req.descripcion || '—';
  document.getElementById('plan-f-planaccion').value        = req.plan_accion || '';
  openModal('modalPlanReq');
}

function openSolucionarReqModal(req) {
  solReqId = req.id;
  document.getElementById('sol-modal-title').textContent = `Solución Requerimiento #${req.codigo || ''}`;
  document.getElementById('sol-f-documento').textContent    = req.documento || '—';
  document.getElementById('sol-f-nombre').textContent       = req.solicitante || '—';
  document.getElementById('sol-f-cargo').textContent        = req.cargo || '—';
  document.getElementById('sol-f-co').textContent           = req.centro_operacion || '—';
  document.getElementById('sol-f-correo').textContent       = req.correo || '—';
  document.getElementById('sol-f-fecha-registro').textContent = _soloFecha(req.fecha);
  document.getElementById('sol-f-fecha-venc').textContent   = _soloFecha(req.fecha_vencimiento);
  document.getElementById('sol-f-tipo').textContent         = req.tipo_requerimiento || '—';
  document.getElementById('sol-f-categoria').textContent    = req.categoria || '—';
  document.getElementById('sol-f-subcategoria').textContent = req.subcategoria || '—';
  document.getElementById('sol-f-prioridad').textContent    = req.prioridad || '—';
  document.getElementById('sol-f-clasificacion').textContent= req.clasificacion || 'Sin información';
  document.getElementById('sol-f-estado').textContent       = req.estado || '—';
  document.getElementById('sol-f-descripcion').value        = req.descripcion || '';
  document.getElementById('sol-f-plan').value                = req.plan_accion || '';
  document.getElementById('sol-f-costo').value                = req.costo || '';
  document.getElementById('sol-f-solucion').value             = '';
  document.getElementById('sol-f-archivo').value               = '';
  document.getElementById('sol-f-archivo-actual').textContent = req.archivo_acciones ? `Archivo actual: ${req.archivo_acciones}` : '';
  openModal('modalSolucionarReq');
}

async function guardarPlanReq() {
  const plan = document.getElementById('plan-f-planaccion').value.trim();
  if (!plan) return showNotification('warning', 'Campo requerido', 'Describe el plan de acción');

  const res = await apiFetch(API.reqTicAccion(planReqId), 'POST', {
    accion: 'plan',
    plan_accion: plan,
  });

  if (res.ok) {
    closeModal('modalPlanReq');
    showNotification('success', 'Plan guardado', 'El requerimiento quedó en proceso');
    cargarRequerimientos();
  } else {
    showNotification('warning', 'Error', res.error || 'No se pudo guardar el plan');
  }
}


let solReqId = null;

async function guardarSolucionReq() {
  const solucion = document.getElementById('sol-f-solucion').value.trim();
  if (!solucion) return showNotification('warning', 'Campo requerido', 'Describe la solución del requerimiento');
  const fecha = new Date().toISOString().slice(0, 10); // no hay input de fecha en el HTML, se usa la fecha actual

  const res = await apiFetch(API.reqTicAccion(solReqId), 'POST', {
    accion: 'solucionar',
    solucion,
    fecha_solucion: fecha,
  });

  if (res.ok) {
    closeModal('modalSolucionarReq');
    showNotification('success', 'Requerimiento solucionado', 'El requerimiento fue marcado como cerrado');
    cargarRequerimientos();
  } else {
    showNotification('warning', 'Error', res.error || 'No se pudo guardar la solución');
  }
}


function renderReqCerrados() {
  const q        = (document.getElementById('req-search')?.value || '').toLowerCase();
  const pageSize = parseInt(document.getElementById('req-pag-size')?.value || 10);

  let data = reqCerrados.filter(r =>
    !q ||
    (r.codigo       || '').toLowerCase().includes(q) ||
    (r.descripcion  || '').toLowerCase().includes(q) ||
    (r.solicitante  || '').toLowerCase().includes(q)
  );

  if (reqCSortKey) {
    data.sort((a, b) => {
      const va = (a[reqCSortKey] || '').toString().toLowerCase();
      const vb = (b[reqCSortKey] || '').toString().toLowerCase();
      return reqCSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  const total = data.length;
  const from  = total ? (reqCerPage - 1) * pageSize + 1 : 0;
  const to    = Math.min(reqCerPage * pageSize, total);
  const page  = data.slice((reqCerPage - 1) * pageSize, reqCerPage * pageSize);

  document.getElementById('req-cer-from').textContent  = from;
  document.getElementById('req-cer-to').textContent    = to;
  document.getElementById('req-cer-total').textContent = total;

  const tbody = document.getElementById('req-cerrados-tbody');
  if (!page.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-light)">
      <i class="fas fa-archive" style="font-size:28px;display:block;margin-bottom:10px;opacity:.3"></i>
      No hay requerimientos cerrados
    </td></tr>`;
  } else {
    tbody.innerHTML = page.map(r => `
  <tr>
    <!-- Fecha creación: ya se ve en "Ver detalle", se oculta aquí.
         El dato se sigue guardando y llegando igual. -->
    <td><span class="serial-mono" style="color:var(--primary)">${r.codigo || '—'}</span></td>
    <td>${r.solicitante  || '—'}</td>
    <td>${r.responsable  || '—'}</td>
    <td>${_soloFecha(r.fecha_solucion)}</td>
    <td>${_reqEstadoBadge(r.estado)}</td>
    <td style="text-align:center">
      ${r.tiene_adjunto
        ? `<button class="tbl-btn info" title="Ver adjunto: ${r.nombre_adjunto}"
            onclick='verAdjuntoReq(${JSON.stringify(r.nombre_adjunto)}, ${JSON.stringify(r.url_adjunto)})'>
            <i class="fas fa-paperclip"></i>
          </button>`
        : `<span style="color:var(--text-light)">—</span>`
      }
    </td>
    <td>
      <div class="tbl-actions">
        <button class="tbl-btn info" title="Ver detalle" onclick="verReq(${r.id})"><i class="fas fa-eye"></i></button>
      </div>
    </td>
  </tr>`).join('');
  }

  /*<td style="max-width:160px;white-space:normal;line-height:1.4">${r.plan_accion || '—'}</td>
   <td style="max-width:160px;white-space:normal;line-height:1.4">${r.solucion    || '—'}</td>
    */

  const totalPages = Math.ceil(total / pageSize);
  document.getElementById('req-cer-controls').innerHTML = _buildPagControls(
    reqCerPage, totalPages, p => { reqCerPage = p; renderReqCerrados(); }
  );
}

/* ── Helpers badges ── */
function _reqPrioridadBadge(p) {
  const m = {
    'ALTA':  ['req-prioridad req-prior-alta',  'fa-arrow-up'],
    'MEDIA': ['req-prioridad req-prior-media', 'fa-minus'],
    'BAJA':  ['req-prioridad req-prior-baja',  'fa-arrow-down'],
  };
  const [cls, ico] = m[(p || '').toUpperCase()] || ['req-prioridad req-prior-media', 'fa-minus'];
  return `<span class="${cls}"><i class="fas ${ico}"></i>${p || '—'}</span>`;
}

function _soloFecha(f) {
  if (!f) return '—';
  return String(f).split(' ')[0].split('T')[0];
}

function _reqEstadoBadge(e) {
  const m = {
    'PENDIENTE':  'req-estado-badge req-estado-pendiente',
    'EN PROCESO': 'req-estado-badge req-estado-proceso',
    'RESUELTO':   'req-estado-badge req-estado-resuelto',
    'CERRADO':    'req-estado-badge req-estado-cerrado',
    'CALIFICADO': 'req-estado-badge req-estado-calificado',
  };
  const cls = m[(e || '').toUpperCase()] || 'req-estado-badge req-estado-pendiente';
  return `<span class="${cls}">${e || '—'}</span>`;
}

/* ── Sorting ── */
function sortReq(key) {
  if (reqSortKey === key) reqSortAsc = !reqSortAsc;
  else { reqSortKey = key; reqSortAsc = true; }
  renderReqActivos();
}
function sortReqC(key) {
  if (reqCSortKey === key) reqCSortAsc = !reqCSortAsc;
  else { reqCSortKey = key; reqCSortAsc = true; }
  renderReqCerrados();
}

/* ── Placeholders acciones (conectar a tu API cuando esté lista) ── */
function openReqModal() {
  showNotification('info', 'Próximamente', 'Formulario de nuevo requerimiento en desarrollo');
}
function verReq(id) {
  const r = reqActivos.find(x => x.id === id)
         || reqCerrados.find(x => x.id === id)
         || asigData.find(x => x.id === id)
         || hreqData.find(x => x.id === id);

  if (!r) { showNotif('Error', 'No se encontró el requerimiento', 'warning'); return; }

  document.getElementById('rd-codigo').textContent = r.codigo || r.consecutivo || '—';
  document.getElementById('rd-fecha').textContent   = _soloFecha(r.fecha_creacion || r.fecha || r.fecha_requerimiento) || '—';
  document.getElementById('rd-badge').innerHTML     = _reqEstadoBadge(r.estado);

  document.getElementById('rd-solicitante').innerHTML = [
    { l: 'Solicitante', v: r.solicitante || r.remitente },
    { l: 'Prioridad',   v: r.prioridad },
    { l: 'Asignado a',  v: r.asignado || r.responsable || 'Sin asignar' },
    { l: 'Vencimiento', v: _soloFecha(r.fecha_vencimiento) },
  ].map(f => `
    <div class="detail-field">
      <div class="detail-field-label">${f.l}</div>
      <div class="detail-field-value">${f.v || '—'}</div>
    </div>`).join('');

  document.getElementById('rd-descripcion').textContent = r.descripcion || 'Sin descripción';

  const planSec = document.getElementById('rd-plan-section');
  if (r.plan_accion) {
    planSec.style.display = 'block';
    document.getElementById('rd-plan').textContent = r.plan_accion;
  } else {
    planSec.style.display = 'none';
  }

  const solSec = document.getElementById('rd-solucion-section');
  if (r.solucion) {
    solSec.style.display = 'block';
    document.getElementById('rd-solucion').textContent = r.solucion;
  } else {
    solSec.style.display = 'none';
  }

  document.getElementById('modalReqDetail').classList.add('active');
}
function editReq(id)     { showNotification('info', 'Editar requerimiento', `ID: ${id} — en desarrollo`); }
function cancelarReq(id) { showNotification('warning', 'Cancelar requerimiento', `ID: ${id} — en desarrollo`); }


/* ── Cargar datos desde API  de requerimientos── */
async function cargarRequerimientos() {
  const tbAct = document.getElementById('req-activos-tbody');
  const tbCer = document.getElementById('req-cerrados-tbody');
  const loadingRow = (cols) => `<tr><td colspan="${cols}">
    <div class="empty-state">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Cargando requerimientos...</p>
    </div>
  </td></tr>`;
  if (tbAct) tbAct.innerHTML = loadingRow(6);
  if (tbCer) tbCer.innerHTML = loadingRow(7);

  try {
    const res = await apiFetch(API.misReqTic);
    if (!res.ok) return;
    const lista = res.data.requerimientos || [];

    const mapRow = r => ({
      fecha_creacion:     r.fecha,
      fecha:              r.fecha,
      codigo:             r.codigo,
      id:                 r.id,
      descripcion:        r.requerimiento,
      documento:          r.documento,
      correo:             r.correo,
      cargo:              r.cargo,
      centro_operacion:   r.centro_operacion,
      tipo_requerimiento: r.tipo_requerimiento,
      categoria:          r.categoria,
      subcategoria:       r.subcategoria,
      clasificacion:      r.clasificacion,
      costo:              r.costo,
      solicitante:        r.solicitante,
      prioridad:          r.prioridad,
      fecha_vencimiento:  r.vencimiento,
      asignado:           r.asignado,        
      responsable:        r.asignado,
      plan_accion:        r.plan_accion,
      solucion:           r.solucion,
      fecha_solucion:     r.fecha_solucion,
      estado:             r.estado,
      categoria_id:       r.categoria_id,
      subcategoria_id:    r.subcategoria_id,
      id_usuario_asig:    r.id_usuario_asig,
      tiene_adjunto:      r.tiene_adjunto,
      nombre_adjunto:     r.nombre_adjunto,
      url_adjunto:        r.url_adjunto,
    });

    const ESTADOS_CERRADOS = [4, 6]; // 4 = Cerrado, 6 = Calificado
    reqActivos  = lista.filter(r => !ESTADOS_CERRADOS.includes(r.estado_id)).map(mapRow);
    reqCerrados = lista.filter(r =>  ESTADOS_CERRADOS.includes(r.estado_id)).map(mapRow);

    renderReqActivos();
    renderReqCerrados();
  } catch(e) {
    console.error('Error cargando requerimientos:', e);
    if (tbAct) tbAct.innerHTML = loadingRow(6).replace('fa-spinner fa-spin','fa-exclamation-triangle').replace('Cargando requerimientos...','Error al cargar');
  }
}

/* ── Helper paginación (reutiliza la misma lógica del sistema) ── */
function _buildPagControls(current, total, onPage) {
  if (total <= 1) return '';
  let html = `<button class="pag-btn" ${current===1?'disabled':''} onclick="(${onPage.toString()})(${current-1})">
    <i class="fas fa-chevron-left"></i></button>`;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) {
      html += `<button class="pag-btn ${i===current?'active':''}" onclick="(${onPage.toString()})(${i})">${i}</button>`;
    } else if (Math.abs(i - current) === 2) {
      html += `<span style="padding:0 4px;color:var(--text-light)">…</span>`;
    }
  }
  html += `<button class="pag-btn" ${current===total?'disabled':''} onclick="(${onPage.toString()})(${current+1})">
    <i class="fas fa-chevron-right"></i></button>`;
  return html;
}

/* ══════════════════════════════
   ASIGNAR REQUERIMIENTOS — lógica
══════════════════════════════ */

let asigData     = [];
let asigPage     = 1;
let asigSortKey  = '';
let asigSortAsc  = true;
let asigReqId    = null;
let asigOrigen = 'asignar'; // 'asignar' | 'misreq'

/* ── Categorías / Subcategorías dinámicas (desde la BD) ── */
async function asigCargarCategorias() {
  const sel = document.getElementById('asig-f-categoria');
  sel.innerHTML = '<option value="">Cargando...</option>';
  try {
    const res = await apiFetch(API.reqCatalogos);
    const cats = (res.categorias || res.data?.categorias || []);
    sel.innerHTML = '<option value="">Seleccione una opción</option>' +
      cats.map(c => `<option value="${c.IdCategoria}">${c.Descripcion}</option>`).join('');
  } catch(e) {
    console.error('Error cargando categorías:', e);
    sel.innerHTML = '<option value="">No se pudieron cargar</option>';
  }
}

async function asigLoadSubcat(preseleccionar = null) {
  const catId = document.getElementById('asig-f-categoria').value;
  const sel   = document.getElementById('asig-f-subcategoria');

  if (!catId) {
    sel.innerHTML = '<option value="">Seleccione una opción</option>';
    return;
  }

  sel.innerHTML = '<option value="">Cargando...</option>';
  const res = await apiFetch(API.subcategoriasReq(catId));
  sel.innerHTML = '<option value="">Seleccione una opción</option>' +
    (res.data || []).map(s => `<option value="${s.id}">${s.descripcion}</option>`).join('');

  if (preseleccionar) sel.value = preseleccionar;
}


/* ── Abrir modal ── */
async function openAsignarReqModal(req, origen = 'asignar') {
  asigReqId  = req.id;
  asigOrigen = origen;
  document.getElementById('asig-modal-title').textContent =
    origen === 'misreq' ? 'Reasignar Requerimiento' : 'Asignar Requerimiento';
  document.getElementById('asig-f-codigo').value     = req.codigo || '';

  document.getElementById('asig-modal-sub').textContent =
    `Req. ${req.codigo} — ${req.descripcion || ''}`;

  const selColab = document.getElementById('asig-f-colaborador');
  selColab.innerHTML = '<option value="">Cargando...</option>';

  const selCat = document.getElementById('asig-f-categoria');
  selCat.innerHTML = '<option value="">Cargando...</option>';

  const selSub = document.getElementById('asig-f-subcategoria');
  selSub.innerHTML = '<option value="">Seleccione una opción</option>';

  // 1. Abrir el modal YA, mostrando "Cargando..." en los selects
  document.getElementById('modalAsignarReq').classList.add('active');

  // 2. Traer colaboradores y categorías EN PARALELO, sin bloquear la apertura
  const [colabs, categorias] = await Promise.all([
    apiFetch(API.colabTi),
    apiFetch(API.categoriasReq),
  ]);

  selColab.innerHTML = '<option value="">Seleccione una opción</option>' +
    (colabs.data || []).map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  if (req.id_usuario_asig) selColab.value = req.id_usuario_asig;

  selCat.innerHTML = '<option value="">Seleccione una opción</option>' +
    (categorias.data || []).map(c => `<option value="${c.id}">${c.descripcion}</option>`).join('');

  // 3. Si el requerimiento ya tenía categoría, preseleccionarla y cargar su subcategoría
  if (req.categoria_id) {
    selCat.value = req.categoria_id;
    await asigLoadSubcat(req.subcategoria_id);
  }
}

/* esta funcion es la que permite abril modal  */
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

/* ── Guardar asignación ── */
async function guardarAsignacionReq() {
  const colaborador = document.getElementById('asig-f-colaborador').value;
  if (!colaborador) return showNotification('warning', 'Campo requerido', 'Selecciona un colaborador');

  const res = await apiFetch(API.reqTicAccion(asigReqId), 'POST', {
    accion: 'reasignar',
    id_usuario_asig: colaborador,
  });

  if (res.ok) {
    closeModal('modalAsignarReq');
    const esReasignacion = asigOrigen === 'misreq';
    showNotification('success',
      esReasignacion ? 'Requerimiento reasignado' : 'Asignación guardada',
      esReasignacion ? 'El requerimiento fue reasignado correctamente' : 'El requerimiento fue asignado correctamente'
    );
    if (esReasignacion) cargarRequerimientos();
    else cargarAsignar();
  } else {
    showNotification('warning', 'Error', res.error || 'No se pudo asignar');
  }
}
/* ── Render tabla ── */
function renderAsignar() {
  const q        = (document.getElementById('asig-search')?.value || '').toLowerCase();
  const pageSize = parseInt(document.getElementById('asig-pag-size')?.value || 10);

  let data = asigData.filter(r =>
    !q ||
    (r.codigo       || '').toLowerCase().includes(q) ||
    (r.descripcion  || '').toLowerCase().includes(q) ||
    (r.solicitante  || '').toLowerCase().includes(q) ||
    (r.asignado     || '').toLowerCase().includes(q)
  );

  if (asigSortKey) {
    data.sort((a, b) => {
      const va = (a[asigSortKey] || '').toString().toLowerCase();
      const vb = (b[asigSortKey] || '').toString().toLowerCase();
      return asigSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  const total = data.length;
  const from  = total ? (asigPage - 1) * pageSize + 1 : 0;
  const to    = Math.min(asigPage * pageSize, total);
  const slice = data.slice((asigPage - 1) * pageSize, asigPage * pageSize);

  document.getElementById('asig-pag-from').textContent  = from;
  document.getElementById('asig-pag-to').textContent    = to;
  document.getElementById('asig-pag-total').textContent = total;

  const tbody = document.getElementById('asig-tbody');

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-light)">
      <i class="fas fa-user-plus" style="font-size:28px;display:block;margin-bottom:10px;opacity:.3"></i>
      No hay requerimientos pendientes de asignación
    </td></tr>`;
  } else {
    tbody.innerHTML = slice.map(r => `
      <tr>
        <td><span class="serial-mono" style="color:var(--primary)">${r.codigo || '—'}</span></td>
        <td>${r.solicitante || '—'}</td>
        <!-- Fecha / Prioridad / Fecha vencimiento: ya se ven en "Ver detalle",
             se ocultan aquí para no repetir. Los datos se siguen guardando
             y llegando igual, solo se dejó de pintar la columna. -->
        <td>
          ${r.asignado
            ? `<span class="asig-asignado"><i class="fas fa-user-check"></i>${r.asignado}</span>`
            : `<span class="asig-sin-asignar"><i class="fas fa-user-clock"></i>Sin asignar</span>`
          }
        </td>
        <td>${_reqEstadoBadge(r.estado)}</td>
        <td style="text-align:center">
          ${r.tiene_adjunto
            ? `<button class="tbl-btn info" title="Ver adjunto: ${r.nombre_adjunto}"
                onclick='verAdjuntoReq(${JSON.stringify(r.nombre_adjunto)}, ${JSON.stringify(r.url_adjunto)})'>
                <i class="fas fa-paperclip"></i>
              </button>`
            : `<span style="color:var(--text-light)">—</span>`
          }
        </td>
        <td>
          <div class="tbl-actions">
            <button class="tbl-btn assign" title="Asignar"
              onclick='openAsignarReqModal(${JSON.stringify(r)})'>
              <i class="fas fa-user-plus"></i>
            </button>
            <button class="tbl-btn info" title="Ver detalle"
              onclick="verReq(${r.id})">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </td>
      </tr>`).join('');
  }

  /* ESTO PERTENECE  A LA TABLA DE DESCRIPCION 
  <td style="max-width:240px;white-space:normal;line-height:1.4">${r.descripcion || '—'}</td>
  */

  const totalPages = Math.ceil(total / pageSize);
  document.getElementById('asig-pag-controls').innerHTML = _buildPagControls(
    asigPage, totalPages, p => { asigPage = p; renderAsignar(); }
  );
}

// Extensiones que se muestran visualmente en el modal; el resto solo
// ofrece el botón de descarga (Word, Excel, etc. no se pueden incrustar
// de forma confiable sin una librería extra).
const ADJUNTO_EXT_IMAGEN = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];

function verAdjuntoReq(nombre, url) {
  const ext = (nombre.split('.').pop() || '').toLowerCase();
  const visor = document.getElementById('adjunto-modal-visor');
  document.getElementById('adjunto-modal-nombre').textContent = nombre;
  document.getElementById('adjunto-modal-descargar').href = url;
  document.getElementById('adjunto-modal-descargar').setAttribute('download', nombre);

  if (ADJUNTO_EXT_IMAGEN.includes(ext)) {
    visor.innerHTML = `<img src="${url}" alt="${nombre}" style="max-width:100%;max-height:60vh;border-radius:var(--radius-md);box-shadow:var(--shadow-sm)">`;
  } else if (ext === 'pdf') {
    // No se incrusta en <iframe>: el visor de PDF de Chrome hace peticiones
    // internas propias que en algunos servidores (proxys/antivirus de red)
    // terminan en "conexión rechazada" aunque la descarga directa sí
    // funciona. Se muestra solo el ícono + nombre y se usa "Descargar".
    visor.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--text-secondary)">
        <i class="fas fa-file-pdf" style="font-size:52px;color:#dc2626"></i>
        <span>${nombre}</span>
        <small>Usa "Descargar" para abrir el PDF.</small>
      </div>`;
  } else {
    visor.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--text-secondary)">
        <i class="fas fa-file-alt" style="font-size:52px;color:var(--primary-light)"></i>
        <span>${nombre}</span>
        <small>Vista previa no disponible para este tipo de archivo — usa "Descargar".</small>
      </div>`;
  }
  document.getElementById('modalVerAdjunto').classList.add('active');
}

function sortAsig(key) {
  if (asigSortKey === key) asigSortAsc = !asigSortAsc;
  else { asigSortKey = key; asigSortAsc = true; }
  renderAsignar();
}

// Rechazar requerimiento (con motivo obligatorio) — dispara correo al
// solicitante con un botón para corregirlo. Solo disponible desde "Mis
// Requerimientos" (siempre asignado al técnico logueado) — no desde
// "Asignar Requerimientos", para no poder rechazar algo sin asignar
// todavía (ahí no habría a quién avisarle cuando se corrija).
// Reutiliza el modal de confirmación genérico (mismas clases CSS), pero
// con su propio overlay (#modalRechazarReq) para no interferir con el de
// "Eliminar".
let _rechazarReqId = null;

function openRechazarReqModal(id, codigo, descripcion) {
  _rechazarReqId = id;
  document.getElementById('rechazar-sub').textContent = `Requerimiento ${codigo}`;
  document.getElementById('rechazar-descripcion').textContent = descripcion || '(sin descripción)';
  document.getElementById('rechazar-motivo').value = '';
  document.getElementById('modalRechazarReq').classList.add('active');
}

document.getElementById('btnConfirmRechazar')?.addEventListener('click', async () => {
  const motivo = document.getElementById('rechazar-motivo').value.trim();
  if (!motivo) {
    showNotif('Motivo requerido', 'Escribe el motivo del rechazo', 'warning');
    return;
  }
  const res = await apiFetch(API.reqTicAccion(_rechazarReqId), 'POST', { accion: 'rechazar', motivo });
  if (!res.ok) { showNotif('Error', res.error || 'No se pudo rechazar el requerimiento', 'warning'); return; }
  showNotif(
    'Requerimiento rechazado',
    `${res.data.codigo} fue rechazado — se notificó al solicitante para que lo corrija.`,
    'success'
  );
  closeModal('modalRechazarReq');
  cargarRequerimientos();
});

async function cargarAsignar() {
  const tbody = document.getElementById('asig-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Cargando requerimientos...</p>
      </div>
    </td></tr>`;
  }

  try {
    const res = await apiFetch(API.todosReqTic);
    if (!res.ok) return;
    asigData = res.data.requerimientos || [];
    renderAsignar();
  } catch(e) {
    console.error('Error cargando asignaciones:', e);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="9">
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error al cargar el historial. Intenta de nuevo.</p>
        </div>
      </td></tr>`;
    }
  }
}

/* ══════════════════════════════
   HISTORIAL REQUERIMIENTOS — lógica
══════════════════════════════ */

let hreqData    = [];
let hreqPage    = 1;
let hreqSortKey = '';
let hreqSortAsc = true;
let hreqSelId   = null;   // fila actualmente seleccionada

/* ── Cargar datos ── */
async function cargarHistorialReq() {
  const tbody = document.getElementById('hreq-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Cargando historial...</p>
      </div>
    </td></tr>`;
  }

  try {
    const res = await apiFetch(API.historialReqTic);
    if (!res.ok) {
      hreqData = [];
      renderHReq();
      return;
    }
    const lista = res.data.requerimientos || [];
    hreqData = lista.map(r => ({
      id:                   r.id,
      consecutivo:          r.consecutivo,
      fecha_requerimiento:  r.fecha_requerimiento,
      remitente:            r.remitente,
      descripcion:          r.descripcion,
      prioridad:            r.prioridad,
      asignado:             r.asignado,
      clasificacion:        r.clasificacion,
      plan_accion:          r.plan_accion,
      fecha_solucion:       r.fecha_solucion,
      solucion:             r.solucion,
      estado:               r.estado,
    }));
    renderHReq();
  } catch(e) {
    console.error('Error cargando historial requerimientos:', e);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7">
        <div class="empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Error al cargar el historial. Intenta de nuevo.</p>
        </div>
      </td></tr>`;
    }
  }
}
/* ── Render ── */
function renderHReq() {
  const q        = (document.getElementById('hreq-search')?.value || '').toLowerCase();
  const pageSize = parseInt(document.getElementById('hreq-pag-size')?.value || 10);

  let data = hreqData.filter(r =>
    !q ||
    (r.consecutivo  || '').toString().toLowerCase().includes(q) ||
    (r.remitente    || '').toLowerCase().includes(q) ||
    (r.descripcion  || '').toLowerCase().includes(q) ||
    (r.asignado     || '').toLowerCase().includes(q) ||
    (r.clasificacion|| '').toLowerCase().includes(q)
  );

  if (hreqSortKey) {
    data.sort((a, b) => {
      const va = (a[hreqSortKey] || '').toString().toLowerCase();
      const vb = (b[hreqSortKey] || '').toString().toLowerCase();
      return hreqSortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  const total = data.length;
  const from  = total ? (hreqPage - 1) * pageSize + 1 : 0;
  const to    = Math.min(hreqPage * pageSize, total);
  const slice = data.slice((hreqPage - 1) * pageSize, hreqPage * pageSize);

  document.getElementById('hreq-pag-from').textContent  = from;
  document.getElementById('hreq-pag-to').textContent    = to;
  document.getElementById('hreq-pag-total').textContent = total;

  const tbody = document.getElementById('hreq-tbody');

  if (!slice.length) {
    // Ocultar detalle si no hay datos
    document.getElementById('hreq-detalle-wrap').style.display = 'none';
    hreqSelId = null;

    tbody.innerHTML = `<tr><td colspan="8"
      style="text-align:center;padding:40px;color:var(--text-light)">
      <i class="fas fa-history"
        style="font-size:28px;display:block;margin-bottom:10px;opacity:.3"></i>
      No hay registros en el historial
    </td></tr>`;
  } else {
    tbody.innerHTML = slice.map(r => `
  <tr class="hreq-row ${hreqSelId === r.id ? 'hreq-row-active' : ''}"
      onclick="hreqSeleccionar(${r.id})"
      style="cursor:pointer">
    <td>
      <span class="serial-mono" style="color:var(--primary)">
        ${r.consecutivo || '—'}
      </span>
    </td>
    <td>
      <span class="serial-mono">${r.fecha_requerimiento || '—'}</span>
    </td>
    <td>${r.remitente || '—'}</td>
    <td>${_reqPrioridadBadge(r.prioridad)}</td>
    <td>
      ${r.clasificacion
        ? `<span class="hreq-sin-info" style="background:#dce9ff;color:#1B4698">${r.clasificacion}</span>`
        : `<span class="hreq-sin-info">Sin información</span>`
      }
    </td>
    <td onclick="event.stopPropagation()">
      <div class="tbl-actions">
        <button class="tbl-btn info" title="Ver detalle" onclick="verReq(${r.id})"><i class="fas fa-eye"></i></button>
      </div>
    </td>
  </tr>`).join('');

    // Si había una selección activa, re-mostrar su detalle
    if (hreqSelId) {
      const r = hreqData.find(x => x.id === hreqSelId);
      if (r) _mostrarDetalleHReq(r);
    }
  }

  const totalPages = Math.ceil(total / pageSize);
  document.getElementById('hreq-pag-controls').innerHTML = _buildPagControls(
    hreqPage, totalPages, p => { hreqPage = p; renderHReq(); }
  );
}

/* ── Seleccionar fila y mostrar detalle ── */
function hreqSeleccionar(id) {
  // Toggle: si ya estaba seleccionada, colapsa
  if (hreqSelId === id) {
    hreqSelId = null;
    document.getElementById('hreq-detalle-wrap').style.display = 'none';
    document.querySelectorAll('.hreq-row').forEach(r => r.classList.remove('hreq-row-active'));
    return;
  }

  hreqSelId = id;
  const r = hreqData.find(x => x.id === id);
  if (!r) return;

  // Marcar fila activa
  document.querySelectorAll('.hreq-row').forEach(row => row.classList.remove('hreq-row-active'));
  document.querySelectorAll('.hreq-row').forEach(row => {
    if (row.querySelector('.serial-mono')?.textContent.trim() == r.consecutivo) {
      row.classList.add('hreq-row-active');
    }
  });

  _mostrarDetalleHReq(r);
}

function _mostrarDetalleHReq(r) {
  _pintarTimelineHReq(r);

  // Fecha solución
  const elFecha = document.getElementById('hreq-det-fecha-sol');
  if (r.fecha_solucion) {
    elFecha.textContent = _soloFecha(r.fecha_solucion);
    elFecha.style.background = '#dce9ff';
    elFecha.style.color      = '#1B4698';
  } else {
    elFecha.textContent = 'Sin información';
    elFecha.style.background = '#e5e7eb';
    elFecha.style.color      = '#6b7280';
  }

  // Solución
  const elSol = document.getElementById('hreq-det-solucion');
  if (r.solucion) {
    elSol.textContent = r.solucion;
    elSol.style.background = '#dce9ff';
    elSol.style.color      = '#1B4698';
  } else {
    elSol.textContent = 'Sin información';
    elSol.style.background = '#e5e7eb';
    elSol.style.color      = '#6b7280';
  }

  // Estado
  document.getElementById('hreq-det-estado').innerHTML = _reqEstadoBadge(r.estado);

  // Mostrar panel
  document.getElementById('hreq-detalle-wrap').style.display = '';
}

/* ── Línea de tiempo del requerimiento ──
   Determina, según los datos disponibles, qué etapas ya se
   cumplieron (done), cuál es la etapa actual (current) y
   cuáles faltan (pending). */
function _pintarTimelineHReq(r) {
  const estado = (r.estado || '').toUpperCase();

  // Cada etapa se marca "cumplida" si su dato ya existe
  const pasos = [
    { key: 'recibido',    cumplido: true,                 fecha: r.fecha_requerimiento ? _soloFecha(r.fecha_requerimiento) : null },
    { key: 'asignado',    cumplido: !!r.asignado,          fecha: r.asignado },
    { key: 'plan',        cumplido: !!r.plan_accion,       fecha: r.plan_accion },
    { key: 'solucionado', cumplido: !!(r.fecha_solucion || r.solucion), fecha: r.fecha_solucion ? _soloFecha(r.fecha_solucion) : r.solucion },
    { key: 'cerrado',     cumplido: estado === 'CERRADO',  fecha: estado === 'CERRADO' ? (r.fecha_solucion ? _soloFecha(r.fecha_solucion) : 'Cerrado') : null },
  ];

  // La "etapa actual" es la primera pendiente después de la última cumplida
  let currentIdx = pasos.findIndex(p => !p.cumplido);
  if (currentIdx === -1) currentIdx = pasos.length; // todo cumplido

  pasos.forEach((p, i) => {
    const stepEl = document.getElementById(`hreq-tl-${p.key}`);
    const dateEl = document.getElementById(`hreq-tl-date-${p.key}`);
    if (!stepEl) return;

    stepEl.classList.remove('done', 'current', 'pending');
    if (p.cumplido) {
      stepEl.classList.add('done');
      if (dateEl) dateEl.textContent = p.fecha || 'Completado';
    } else if (i === currentIdx) {
      stepEl.classList.add('current');
      if (dateEl) dateEl.textContent = 'En curso';
    } else {
      stepEl.classList.add('pending');
      if (dateEl) dateEl.textContent = p.key === 'cerrado' ? 'Pendiente' : 'Sin información';
    }
  });

  // Conectores entre pasos: se pintan de azul hasta la última etapa cumplida
  for (let i = 1; i <= 4; i++) {
    const lineEl = document.getElementById(`hreq-tl-line-${i}`);
    if (!lineEl) continue;
    lineEl.classList.toggle('done', pasos[i - 1].cumplido);
  }
}

/* ── Acciones del detalle ── */
function hreqEvaluacion() {
  const r = hreqData.find(x => x.id === hreqSelId);
  if (!r) return;
  showNotification('info', 'Evaluación', `Evaluación del requerimiento ${r.consecutivo} — en desarrollo`);
  // Aquí abrirás el modal de evaluación cuando esté lista la API
}

function hreqDetalles() {
  const r = hreqData.find(x => x.id === hreqSelId);
  if (!r) return;
  showNotification('info', 'Detalles', `Detalles del requerimiento ${r.consecutivo} — en desarrollo`);
  // Aquí abrirás el modal de detalles cuando esté lista la API
}

/* ── Sorting ── */
function sortHReq(key) {
  if (hreqSortKey === key) hreqSortAsc = !hreqSortAsc;
  else { hreqSortKey = key; hreqSortAsc = true; }
  renderHReq();
}

/* ══════════════════════════════
   INDICADORES — Panel de requerimientos
══════════════════════════════ */

let indTendenciaChartInst     = null;
let indGaugeChartInst         = null;
let indCalifTendenciaChartInst = null;
let indCalifDistChartInst      = null;
let indCategoriasCache        = [];

async function cargarIndicadores() {
  // 1. Resumen (tarjetas)
  indCargarResumen();

  // 2. Poblar categorías (solo la primera vez)
  if (!indCategoriasCache.length) {
    await indCargarCategorias();
  }

  // 3. Tendencia + gauge
  indCargarTendencia();
}

async function indCargarResumen() {
  const res = await apiFetch(`${BASE}/inventario/api/indicadores/resumen/`);
  if (!res.ok) return;
  const d = res.data;
  document.getElementById('ind-r-asignados').textContent   = d.asignados;
  document.getElementById('ind-r-sinasignar').textContent  = d.sin_asignar;
  document.getElementById('ind-r-enproceso').textContent   = d.en_proceso;
  document.getElementById('ind-r-finalizados').textContent = d.finalizados;
}

async function indCargarCategorias() {
  const sel = document.getElementById('ind-f-categoria');
  const res = await apiFetch(API.categoriasReq);
  if (!res.ok) return;
  indCategoriasCache = res.data || [];
  sel.innerHTML = '<option value="">Todas las categorías</option>' +
    indCategoriasCache.map(c => `<option value="${c.id}">${c.descripcion}</option>`).join('');
}

async function indOnCategoriaChange() {
  const catId = document.getElementById('ind-f-categoria').value;
  const selSub = document.getElementById('ind-f-subcategoria');

  if (!catId) {
    selSub.innerHTML = '<option value="">Todas las subcategorías</option>';
    indCargarTendencia();
    return;
  }

  selSub.innerHTML = '<option value="">Cargando...</option>';
  const res = await apiFetch(API.subcategoriasReq(catId));
  selSub.innerHTML = '<option value="">Todas las subcategorías</option>' +
    (res.data || []).map(s => `<option value="${s.id}">${s.descripcion}</option>`).join('');

  indCargarTendencia();
}

async function indCargarTendencia() {
  const categoriaId    = document.getElementById('ind-f-categoria').value;
  const subcategoriaId = document.getElementById('ind-f-subcategoria').value;
  const dias           = document.getElementById('ind-f-dias').value;

  const params = new URLSearchParams({ dias });
  if (categoriaId)    params.set('categoria_id', categoriaId);
  if (subcategoriaId) params.set('subcategoria_id', subcategoriaId);

  const res = await apiFetch(`${BASE}/inventario/api/indicadores/tendencia/?${params}`);
  if (res.ok) {
    const { serie, pct_cumplimiento, total_cerrados, a_tiempo } = res.data;
    _indRenderTendenciaChart(serie);
    _indRenderGauge(pct_cumplimiento, total_cerrados, a_tiempo);
  }

  // Misma combinación de filtros para la calificación de calidad
  indCargarCalificacion(categoriaId, subcategoriaId, dias);
}

async function indCargarCalificacion(categoriaId, subcategoriaId, dias) {
  const params = new URLSearchParams({ dias });
  if (categoriaId)    params.set('categoria_id', categoriaId);
  if (subcategoriaId) params.set('subcategoria_id', subcategoriaId);

  const res = await apiFetch(`${BASE}/inventario/api/indicadores/calificacion/?${params}`);
  if (!res.ok) return;

  const { promedio, total_evaluaciones, distribucion, tendencia } = res.data;

  document.getElementById('ind-calif-promedio').textContent = promedio || '0';
  document.getElementById('ind-calif-total').textContent    = total_evaluaciones;

  _indRenderCalifTendencia(tendencia);
  _indRenderCalifDist(distribucion);
}

function _indRenderCalifTendencia(tendencia) {
  const canvas = document.getElementById('indCalifTendenciaChart');
  if (!canvas) return;
  const wrap = canvas.parentElement;
  let vacioEl = wrap.querySelector('.ind-chart-vacio');

  if (!tendencia || !tendencia.length) {
    canvas.style.display = 'none';
    if (!vacioEl) {
      vacioEl = document.createElement('div');
      vacioEl.className = 'ind-chart-vacio';
      wrap.appendChild(vacioEl);
    }
    vacioEl.innerHTML = `
      <i class="fas fa-star" style="font-size:22px;opacity:.25;margin-bottom:8px;display:block"></i>
      <div style="font-weight:600;color:var(--text-light,#6b7280);font-size:13px">Sin evaluaciones en el rango</div>`;
    vacioEl.style.display = 'flex';
    if (indCalifTendenciaChartInst) { indCalifTendenciaChartInst.destroy(); indCalifTendenciaChartInst = null; }
    return;
  }
  if (vacioEl) vacioEl.style.display = 'none';
  canvas.style.display = 'block';

  const labels    = tendencia.map(t => t.semana);
  const promedios = tendencia.map(t => t.promedio);

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, '#f59e0b55');
  gradient.addColorStop(1, '#f59e0b00');

  if (indCalifTendenciaChartInst) indCalifTendenciaChartInst.destroy();

  indCalifTendenciaChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Promedio',
        data: promedios,
        borderColor: '#f59e0b',
        backgroundColor: gradient,
        borderWidth: 2.5,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a', titleColor: '#f8fafc', bodyColor: '#e2e8f0',
          borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, padding: 10, cornerRadius: 8,
          callbacks: { label: (c) => `Promedio: ${c.parsed.y} ★` },
        },
      },
      scales: {
        y: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: 11 }, color: '#94a3b8' }, grid: { color: '#f1f5f9' }, border: { display: false } },
        x: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
      },
    },
  });
}

function _indRenderCalifDist(distribucion) {
  const canvas = document.getElementById('indCalifDistChart');
  if (!canvas) return;

  const labels = ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'];
  const data   = [1, 2, 3, 4, 5].map(n => distribucion[String(n)] || 0);
  const colors = ['#dc2626', '#f97316', '#f59e0b', '#84cc16', '#16a34a'];

  if (indCalifDistChartInst) indCalifDistChartInst.destroy();

  indCalifDistChartInst = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.6,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f172a', titleColor: '#f8fafc', bodyColor: '#e2e8f0',
          borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1, padding: 10, cornerRadius: 8,
        },
      },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 }, color: '#94a3b8' }, grid: { color: '#f1f5f9' }, border: { display: false } },
        y: { grid: { display: false }, border: { display: false }, ticks: { font: { size: 12, weight: '600' }, color: '#475569' } },
      },
    },
  });
}

const IND_SERIES_CONFIG = [
  { key: 'abiertos',   label: 'Abiertos',   color: '#f43f5e' },
  { key: 'asignado',   label: 'Asignado',   color: '#6366f1' },
  { key: 'en_proceso', label: 'En Proceso', color: '#f59e0b' },
  { key: 'cerrados',   label: 'Cerrados',   color: '#10b981' },
];

function _indRenderTendenciaChart(serie) {
  const canvas = document.getElementById('indTendenciaChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // ── ¿Hay algún valor distinto de 0 en todo el rango? ──
  const totalSuma = serie.reduce((acc, s) =>
    acc + s.abiertos + s.asignado + s.en_proceso + s.cerrados, 0);

  const wrap = canvas.parentElement;
  let vacioEl = wrap.querySelector('.ind-chart-vacio');

  if (totalSuma === 0) {
    canvas.style.display = 'none';
    if (!vacioEl) {
      vacioEl = document.createElement('div');
      vacioEl.className = 'ind-chart-vacio';
      wrap.appendChild(vacioEl);
    }
    vacioEl.innerHTML = `
      <i class="fas fa-chart-bar" style="font-size:26px;opacity:.25;margin-bottom:8px;display:block"></i>
      <div style="font-weight:600;color:var(--text-light,#6b7280)">Sin requerimientos en el rango seleccionado</div>
      <div style="font-size:12px;color:var(--text-light,#9ca3af);margin-top:4px">Prueba ampliar el rango de días o quitar los filtros de categoría/subcategoría</div>`;
    vacioEl.style.display = 'flex';
    if (indTendenciaChartInst) { indTendenciaChartInst.destroy(); indTendenciaChartInst = null; }
    _indRenderLegend(IND_SERIES_CONFIG.map(c => ({ label: c.label, backgroundColor: c.color })));
    return;
  }
  if (vacioEl) vacioEl.style.display = 'none';
  canvas.style.display = 'block';

  const labels = serie.map(s => {
    const [, m, d] = s.fecha.split('-');
    return `${d}/${m}`;
  });

  const datasets = IND_SERIES_CONFIG.map(cfg => ({
    key:             cfg.key,
    label:           cfg.label,
    data:            serie.map(s => s[cfg.key]),
    backgroundColor: cfg.color,
    hoverBackgroundColor: cfg.color,
    borderRadius:    4,
    borderSkipped:   false,
    barPercentage:   0.55,
    categoryPercentage: 0.7,
  }));

  if (indTendenciaChartInst) indTendenciaChartInst.destroy();

  indTendenciaChartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: '#0f172a',
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(255,255,255,0.08)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 10,
          displayColors: true,
          boxPadding: 4,
          titleFont: { size: 12, weight: '600' },
          bodyFont: { size: 12 },
        },
      },
      scales: {
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0, font: { size: 11 }, color: '#94a3b8' },
          grid: { color: '#f1f5f9', drawTicks: false },
          border: { display: false },
        },
        x: {
          stacked: true,
          grid: { display: false },
          border: { display: false },
          ticks: { font: { size: 11 }, color: '#94a3b8', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
        },
      },
    },
  });

  _indRenderLegend(datasets);
}

function _indRenderLegend(datasets) {
  const box = document.getElementById('ind-tendencia-legend');
  if (!box) return;
  box.innerHTML = datasets.map((ds, i) => `
    <div class="ind-legend-pill" data-idx="${i}" onclick="_indToggleSerie(${i})">
      <span class="ind-legend-dot" style="background:${ds.backgroundColor}"></span>
      ${ds.label}
    </div>`).join('');
}

function _indToggleSerie(idx) {
  if (!indTendenciaChartInst) return;
  const meta = indTendenciaChartInst.getDatasetMeta(idx);
  meta.hidden = meta.hidden === null ? !indTendenciaChartInst.data.datasets[idx].hidden : !meta.hidden;
  indTendenciaChartInst.update();
  const pill = document.querySelector(`.ind-legend-pill[data-idx="${idx}"]`);
  if (pill) pill.classList.toggle('off', meta.hidden);
}

function _indRenderGauge(pct, totalCerrados, aTiempo) {
  const ctx = document.getElementById('indGaugeChart');
  if (!ctx) return;

  const color = pct >= 80 ? '#16a34a' : '#dc2626';

  if (indGaugeChartInst) indGaugeChartInst.destroy();

  indGaugeChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [pct, 100 - pct],
        backgroundColor: [color, '#e5e7eb'],
        borderWidth: 0,
        cutout: '78%',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      circumference: 360,
      rotation: -90,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
    },
  });

  document.getElementById('ind-gauge-pct').textContent   = pct + '%';
  document.getElementById('ind-gauge-pct').style.color   = color;
  document.getElementById('ind-gauge-detalle').textContent =
    totalCerrados > 0
      ? `${aTiempo} de ${totalCerrados} requerimientos cerrados a tiempo en el rango seleccionado`
      : 'No hay requerimientos cerrados en el rango seleccionado';
}

/* ── Paginación ── */
function hreqLoadPage(page) {
  hreqPage = page;
  renderHReq();
}

/* ── Exportar ── */
function exportarHistorialReq() {
  if (!hreqData.length) {
    showNotification('warning', 'Sin datos', 'No hay registros para exportar');
    return;
  }
  // Exportar con SheetJS (ya está cargado en el proyecto)
  const XLSX    = window.XLSX;
  const headers = [
    'Consecutivo','Fecha Requerimiento','Colaborador Remitente',
    'Descripción','Prioridad','Colaborador Asignado',
    'Clasificación','Plan de Acción',
    'Fecha Solucionado','Solución','Estado'
  ];
  const rows = hreqData.map(r => [
    r.consecutivo        || '',
    r.fecha_requerimiento|| '',
    r.remitente          || '',
    r.descripcion        || '',
    r.prioridad          || '',
    r.asignado           || '',
    r.clasificacion      || '',
    r.plan_accion        || '',
    r.fecha_solucion     || '',
    r.solucion           || '',
    r.estado             || '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historial');
  XLSX.writeFile(wb, 'historial_requerimientos.xlsx');
  showNotification('success', 'Exportado', 'Archivo descargado correctamente');
}