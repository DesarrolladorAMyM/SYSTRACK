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
};
let CAT = {};

let invData   = [], invPage = 1, invPageSize = 10, invSort = 'serial', invSortAsc = true;
let inacData  = [], inacPage = 1, inacPageSize = 10, inacSort = 'serial', inacSortAsc = true;
let colabData = [], colabPage = 1, colabPageSize = 10, colabSort = 'nombre', colabSortAsc = true;

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

  if (id === 'inventario')              loadInventario();
  if (id === 'inactivos')               loadInactivos();
  if (id === 'colaboradores')           loadColaboradores();
  if (id === 'dashboard')               loadDashboard();
  if (id === 'indicadores')             cargarIndicadores();
  if (id === 'mis-requerimientos')      cargarRequerimientos();
  if (id === 'asignar-requerimientos')  cargarAsignar();
  if (id === 'historial-requerimientos') cargarHistorialReq();
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
   'inv-filter-tipo', 'inac-filter-tipo', 'hist-tipo', 'cc-tipo',
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
  ['f-prop', 'hf-prop', 'inac-f-prop'].forEach(id =>
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

  const ccPropEl = document.getElementById('cc-prop');
  if (ccPropEl) {
    ccPropEl.innerHTML = '<option value="">Todos los propietarios</option>' +
      propOpts.map(p =>
        `<option value="${p.g203_id}">${p.g203_propietario}</option>`
      ).join('');
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
  const mun = document.getElementById('f-municipio');
  if (mun) mun.innerHTML = '<option value="">Seleccione</option>';
  const obs = document.getElementById('f-obs');
  if (obs) obs.value = '';
  renderCaracteristicas('');
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
  document.getElementById('det-general').innerHTML = [
    { l: 'Serial',      v: d.serial,      mono: true },
    { l: 'Tipo',        v: d.tipo },
    { l: 'Marca',       v: d.marca },
    { l: 'Propietario', v: d.propietario },
    { l: 'Estado',      v: d.estado },
    { l: 'CO',          v: d.co },
  ].map(f => `
    <div class="detail-field">
      <div class="detail-field-label">${f.l}</div>
      <div class="detail-field-value ${f.mono ? 'mono' : ''}">${f.v || '—'}</div>
    </div>`).join('');
 // ── Características (dict plano clave→valor desde el servidor) ──
  const caract = d.caracteristicas || {};
  const camposCaract = Object.entries(caract)
    .filter(([k, v]) => v && v !== '—')
    .map(([k, v]) => ({ l: k, v }));

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
  const builder = CHAR_FIELDS_MAP[tipo];
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
      },
      pantalla:  { 'pan-tam': caract.pulgadas, 'pan-res': caract.resolucion },
      impresora: { 'imp-tipo': caract.tipo_impresora_id, 'imp-funcion': caract.funcion },
      videobeam: { 'vb-lumenes': caract.lumenes },
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
  if (tipo === 'TORRE DE ESCRITORIO') return { grupo: 'pc', antivirus_id: g('tc-antivirus'), procesador_id: g('tc-procesador'), so_id: g('tc-so'), licencia_id: g('tc-office'), ram: g('tc-ram'), tipo_disco_id: g('tc-disco'), almacenamiento_id: g('tc-alm'), correo_office: g('tc-correo'), valor_promedio: g('tc-valor'), valor_arrendamiento: g('tc-arrend')  };
  if (tipo === 'PORTATIL')            return { grupo: 'pc', antivirus_id: g('pc-antivirus'), procesador_id: g('pc-procesador'), so_id: g('pc-so'), licencia_id: g('pc-office'), ram: g('pc-ram'), tipo_disco_id: g('pc-disco'), almacenamiento_id: g('pc-alm'), correo_office: g('pc-correo'), activo: g('pc-activo'), valor_promedio: g('pc-valor'), valor_arrendamiento: g('pc-arrend')  };
  if (tipo === 'CELULAR')             return { grupo: 'movil', numero_linea: g('cel-num'), operador_id: g('cel-op'), imei1: g('cel-imei1'), imei2: g('cel-imei2'), plan_datos: g('cel-plan'), cuenta_gmail: g('cel-gmail'), contrasena_gmail: g('cel-pass'), valor_promedio: g('cel-valor'), valor_arrendamiento: g('cel-arrend') };
  if (tipo === 'TABLET')              return { grupo: 'movil', numero_linea: g('tab-num'), operador_id: g('tab-op'), imei1: g('tab-imei1'), imei2: g('tab-imei2'), plan_datos: g('tab-plan'), cuenta_gmail: g('tab-gmail'), contrasena_gmail: g('tab-pass'), valor_promedio: g('tab-valor'), valor_arrendamiento: g('tab-arrend') };
  if (tipo === 'MODEM WIFI')          return { grupo: 'movil', numero_linea: g('mw-num'), operador_id: g('mw-op'), imei1: g('mw-imei1'), imei2: g('mw-imei2'), plan_datos: g('mw-plan'), valor_promedio: g('mw-valor'), valor_arrendamiento: g('mw-arrend') };
  if (tipo === 'SIMCARD')             return { grupo: 'movil', numero_linea: g('sim-num'), operador_id: g('sim-op'), plan_datos: g('sim-plan'), valor_arrendamiento: g('sim-arrend') };
  if (tipo === 'TELEFONO FIJO')       return { grupo: 'movil', imei1: g('tf-imei1') };
  if (tipo === 'PANTALLA')            return { grupo: 'pantalla', pulgadas: g('pan-tam'), resolucion: g('pan-res'), valor_promedio: g('pan-valor'), valor_arrendamiento: g('pan-arrend') };
  if (tipo === 'IMPRESORA')           return { grupo: 'impresora', tipo_impresora_id: g('imp-tipo') };
  if (tipo === 'PERIFERICO')          return { grupo: 'periferico', incluye_base: g('per-base') === 'SÍ', incluye_teclado: g('per-teclado') === 'SÍ', incluye_mouse: g('per-mouse') === 'SÍ', incluye_auriculares: g('per-auriculares') === 'SÍ', incluye_cargador: g('per-cargpc') === 'SÍ' };
  if (tipo === 'LICENCIA OFFICE')     return { grupo: 'licencia', software: g('lic-tipo'), almacenamiento_id: g('lic-alm'), valor_arrendamiento: g('lic-arrend') };
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
 const rows = registros.map((h, i) => `
  <tr style="animation: fadeIn ${0.05*i+0.1}s ease both">
    <td>${novedadBadge(h.novedad)}</td>
    <td class="hist-td-fecha">${h.fecha.split('-').reverse().join('/')}</td>
    <td class="hist-td-hora">${h.hora}</td>
    <td>${respAvatar(h.responsable)}</td>
    <td style="font-size:13px">${h.co}</td>
    <td style="font-size:13px;color:var(--text-secondary);max-width:220px">${h.observaciones || '—'}</td>
  </tr>`).join('');
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
        <tbody>${rows}</tbody>
      </table>
    </div>
    ...`;
    wrap.appendChild(card);
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
  const rows = [['Serial', 'Tipo', 'Novedad', 'Fecha', 'Hora', 'Responsable', 'CO', 'Observaciones']];
  document.querySelectorAll('.hist-table tbody tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 6) {
      rows.push([
        cells[0].textContent.trim(), cells[1].textContent.trim(),
        cells[2].textContent.trim(), cells[3].textContent.trim(),
        cells[4].textContent.trim(), cells[5].textContent.trim(),
      ]);
    }
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
  const { total, habilitados, otros, grupos, resumen } = res.data;

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
    </table>`;
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
// COLABORADORES
// ============================================================
let colabTotal = 0, colabTotalPages = 1;

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

function _renderColabTable() {
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
    <table class="inv-table" style="margin-bottom:0">
      <thead><tr><th>Tipo</th><th>Marca</th><th>Serial</th><th></th></tr></thead>
      <tbody>
        ${dispositivos.map(d => `
          <tr>
            <td>${d.tipo}</td>
            <td>${d.marca}</td>
            <td><span class="serial-mono">${d.serial}</span></td>
            <td><button class="btn-remove-row" title="Quitar asignación"
              onclick="eliminarAsignacion(${colabId}, ${d.id})">
              <i class="fas fa-unlink"></i></button></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
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
  const tbody = document.getElementById('acta-devices-tbody');
  if (!c.dispositivos || c.dispositivos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="acta-devices-empty">Sin dispositivos asignados al colaborador</td></tr>';
  } else {
    tbody.innerHTML = c.dispositivos.map(d => `
      <tr>
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
  const getSigData = (id) => {
    const pad = sigPads[id];
    if (!pad) return '';
    return pad.isEmpty() ? '' : pad.toDataURL();
  };
  const res = await apiFetch(API.acta(colabEditId), 'POST', {
    tipo, proceso, correo,
    firma_recibe:  getSigData('sig-recibe'),
    firma_entrega: getSigData('sig-entrega'),
  });
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

function initSignaturePads() {
  ['sig-recibe', 'sig-entrega'].forEach(id => {
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
// INIT — único DOMContentLoaded
// ============================================================
window.addEventListener('DOMContentLoaded', async () => {
  // 1. Catálogos — pobla todos los selects con _suppressChange = true internamente
  await loadCatalogos();

  // 2. Dashboard inicial
  await loadDashboard();

  // ── Tipo dispositivo → características dinámicas ──
  document.getElementById('f-tipo')?.addEventListener('change', function () {
    const tipoNombre = (CAT.tipos_dispositivo || [])
      .find(t => String(t.g200_id) === this.value)
      ?.g200_tipo_dispositivo || '';
    renderCaracteristicas(tipoNombre);
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
  'PORTATIL':            [['procesador','Procesador (Ej: CORE I5)',true],['nombre','Nombre del equipo (Ej: LAPTOP-02)',false],['valor_promedio','Valor del equipo (solo numero)',false],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['activo','Activo',false],['ram','RAM (Ej: 8GB)',true],['disco','Tipo de disco SSD o HDD',true],['almacenamiento','Capacidad del disco',true],['so','Sistema operativo',true],['antivirus','Antivirus',false],['licencia_office','Licencia Office',false],['correo_office','Correo Office',false]],
  'TORRE DE ESCRITORIO': [['procesador','Procesador',true],['valor_promedio',     'Valor del equipo (solo numero)',false],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['nombre','Nombre del equipo',false],['ram','RAM',true],['disco','Tipo de disco',true],['almacenamiento','Capacidad',true],['so','Sistema operativo',true],['antivirus','Antivirus',false],['licencia_office','Licencia Office',false],['correo_office','Correo Office',false]],
  'MODEM WIFI':          [['numero_linea','Numero de linea',true],['valor_promedio','Valor del equipo (solo numero)',false],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['operador','Operador',true],['imei1','IMEI 1',true],['imei2','IMEI 2',false],['plan_datos','Plan de datos',false]],
  'SIMCARD':             [['numero_linea','Numero de linea',true],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['operador','Operador',true],['plan_datos','Plan de datos',false]],
  'PANTALLA':            [['pulgadas','Tamano en pulgadas',true],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['resolucion','Resolucion (Ej: 1920x1080)',false]],
  'TELEFONO FIJO':       [['imei1','IMEI 1',true]],
  'IMPRESORA':           [['tipo_impresora','Tipo de impresora',true],['funcion','Funcion (Ej: MULTIFUNCIONAL)',false]],
  'PERIFERICO':          [['base','Base (SI/NO/NO APLICA)',true],['teclado','Teclado',true],['mouse','Mouse',true],['auriculares','Auriculares',true],['cargador_pc','Cargador PC',true],['cargador_movil','Cargador movil',true]],
  'LICENCIA OFFICE':     [['tipo_licencia','Tipo de licencia',true],['valor_arrendamiento','Valor arrendamiento (solo numero)', false],['almacenamiento','Almacenamiento',true]],
  'VIDEO BEAM':          [],
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
    tbodyLoad.innerHTML = `<tr><td colspan="8">
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
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-light)">Sin resultados</td></tr>`;
  } else {
    tbody.innerHTML = results.map(u => `
      <tr data-id="${u.id}" data-cedula="${u.cedula}" data-nombre="${u.nombre}"
          data-cargo-id="${u.cargo_id || ''}" data-co-id="${u.co_id || ''}"
          data-correo="${u.correo || ''}" data-tipo="${u.tipo_usuario_id || ''}" data-tipo-nombre="${u.tipo_usuario || ''}">
        <td>${u.cedula}</td>
        <td>${u.nombre}</td>
        <td>${u.cargo || '—'}</td>
        <td>${u.co || '—'}</td>
        <td>${u.correo || '—'}</td>
        <td>${u.fecha}</td>
        <td>
          <span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;
            background:${u.tipo_usuario==='Superusuario'?'rgba(220,38,38,.1)':u.tipo_usuario==='Administrador'?'rgba(27,70,152,.1)':'rgba(22,163,74,.1)'};
            color:${u.tipo_usuario==='Superusuario'?'#dc2626':u.tipo_usuario==='Administrador'?'var(--primary)':'#16a34a'}">
            ${u.tipo_usuario || '—'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="action-btn edit-btn"   title="Editar"   onclick="openUsuarioEdit(${u.id})"><i class="fas fa-edit"></i></button>
            <button class="action-btn delete-btn" title="Eliminar" onclick="deleteUsuario(${u.id},'${u.nombre}')"><i class="fas fa-trash"></i></button>
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
    const res = await apiFetch('${BASE}/api/tipos-usuario/');
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
  openConfirm(
    `¿Eliminar el usuario "${nombre}"? Esta acción no se puede deshacer.`,
    async () => {
      const res = await apiFetch(API_USR.eliminar(id), 'POST', {});
      if (!res.ok) { showNotif('Error', res.error || 'No se pudo eliminar', 'error'); return; }
      showNotif('Eliminado', `Usuario "${nombre}" eliminado`, 'success');
      usrLoadPage(usrPage);
    }
  );
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
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-light)">
      <i class="fas fa-clipboard-list" style="font-size:28px;display:block;margin-bottom:10px;opacity:.3"></i>
      No hay requerimientos activos
    </td></tr>`;
  } else {
    tbody.innerHTML = page.map(r => `
      <tr>
        <td><span class="serial-mono">${r.fecha_creacion || '—'}</span></td>
        <td><span class="serial-mono" style="color:var(--primary)">${r.codigo || '—'}</span></td>
        <td style="max-width:260px;white-space:normal;line-height:1.4">${r.descripcion || '—'}</td>
        <td>${r.solicitante || '—'}</td>
        <td>${_reqPrioridadBadge(r.prioridad)}</td>
        <td>${r.fecha_vencimiento || '—'}</td>
        <td>${_reqEstadoBadge(r.estado)}</td>
        <td>
          <div class="tbl-actions">
            <button class="tbl-btn info"    title="Ver detalle" onclick="verReq(${r.id})"><i class="fas fa-eye"></i></button>
            <button class="tbl-btn assign"  title="Reasignar"
              onclick='openAsignarReqModal(${JSON.stringify(r)}, "misreq")'><i class="fas fa-random"></i></button>
            <button class="tbl-btn plan"    title="Plan de acción"
              onclick='openPlanReqModal(${JSON.stringify(r)})'><i class="fas fa-tasks"></i></button>
            <button class="tbl-btn success" title="Solucionar"
              onclick='openSolucionarReqModal(${JSON.stringify(r)})'><i class="fas fa-check-circle"></i></button>
          </div>
        </td>
      </tr>`).join('');
  }

  const totalPages = Math.ceil(total / pageSize);
  document.getElementById('req-act-controls').innerHTML = _buildPagControls(
    reqActPage, totalPages, p => { reqActPage = p; renderReqActivos(); }
  );
}

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
  document.getElementById('plan-f-fecha').textContent       = req.fecha || '—';
  document.getElementById('plan-f-tipo').textContent        = req.tipo_requerimiento || '—';
  document.getElementById('plan-f-categoria').textContent   = req.categoria || '—';
  document.getElementById('plan-f-subcategoria').textContent= req.subcategoria || '—';
  document.getElementById('plan-f-prioridad').textContent   = req.prioridad || '—';
  document.getElementById('plan-f-vencimiento').textContent = req.fecha_vencimiento || '—';
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
  document.getElementById('sol-f-fecha-registro').textContent = req.fecha || '—';
  document.getElementById('sol-f-fecha-venc').textContent   = req.fecha_vencimiento || '—';
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
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-light)">
      <i class="fas fa-archive" style="font-size:28px;display:block;margin-bottom:10px;opacity:.3"></i>
      No hay requerimientos cerrados
    </td></tr>`;
  } else {
    tbody.innerHTML = page.map(r => `
      <tr>
        <td><span class="serial-mono">${r.fecha_creacion || '—'}</span></td>
        <td><span class="serial-mono" style="color:var(--primary)">${r.codigo || '—'}</span></td>
        <td style="max-width:200px;white-space:normal;line-height:1.4">${r.descripcion || '—'}</td>
        <td>${r.solicitante  || '—'}</td>
        <td>${r.responsable  || '—'}</td>
        <td style="max-width:160px;white-space:normal;line-height:1.4">${r.plan_accion || '—'}</td>
        <td style="max-width:160px;white-space:normal;line-height:1.4">${r.solucion    || '—'}</td>
        <td>${r.fecha_solucion || '—'}</td>
        <td>${_reqEstadoBadge(r.estado)}</td>
      </tr>`).join('');
  }

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

function _reqEstadoBadge(e) {
  const m = {
    'PENDIENTE':  'req-estado-badge req-estado-pendiente',
    'EN PROCESO': 'req-estado-badge req-estado-proceso',
    'RESUELTO':   'req-estado-badge req-estado-resuelto',
    'CERRADO':    'req-estado-badge req-estado-cerrado',
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
function verReq(id)      { showNotification('info', 'Ver requerimiento', `ID: ${id} — en desarrollo`); }
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
  if (tbAct) tbAct.innerHTML = loadingRow(8);
  if (tbCer) tbCer.innerHTML = loadingRow(9);

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
      responsable:        r.solicitante,
      plan_accion:        r.plan_accion,
      solucion:           r.solucion,
      fecha_solucion:     r.fecha_solucion,
      estado:             r.estado,
      categoria_id:       r.categoria_id,
      subcategoria_id:    r.subcategoria_id,
      id_usuario_asig:    r.id_usuario_asig,
    });

    reqActivos  = lista.filter(r => r.estado_id !== 4).map(mapRow);
    reqCerrados = lista.filter(r => r.estado_id === 4).map(mapRow);

    renderReqActivos();
    renderReqCerrados();
  } catch(e) {
    console.error('Error cargando requerimientos:', e);
    if (tbAct) tbAct.innerHTML = loadingRow(8).replace('fa-spinner fa-spin','fa-exclamation-triangle').replace('Cargando requerimientos...','Error al cargar');
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
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-light)">
      <i class="fas fa-user-plus" style="font-size:28px;display:block;margin-bottom:10px;opacity:.3"></i>
      No hay requerimientos pendientes de asignación
    </td></tr>`;
  } else {
    tbody.innerHTML = slice.map(r => `
      <tr>
        <td><span class="serial-mono" style="color:var(--primary)">${r.codigo || '—'}</span></td>
        <td style="max-width:240px;white-space:normal;line-height:1.4">${r.descripcion || '—'}</td>
        <td><span class="serial-mono">${r.fecha || '—'}</span></td>
        <td>${r.solicitante || '—'}</td>
        <td>${_reqPrioridadBadge(r.prioridad)}</td>
        <td><span class="serial-mono">${r.fecha_vencimiento || '—'}</span></td>
        <td>
          ${r.asignado
            ? `<span class="asig-asignado"><i class="fas fa-user-check"></i>${r.asignado}</span>`
            : `<span class="asig-sin-asignar"><i class="fas fa-user-clock"></i>Sin asignar</span>`
          }
        </td>
        <td>${_reqEstadoBadge(r.estado)}</td>
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

  const totalPages = Math.ceil(total / pageSize);
  document.getElementById('asig-pag-controls').innerHTML = _buildPagControls(
    asigPage, totalPages, p => { asigPage = p; renderAsignar(); }
  );
}

function sortAsig(key) {
  if (asigSortKey === key) asigSortAsc = !asigSortAsc;
  else { asigSortKey = key; asigSortAsc = true; }
  renderAsignar();
}

async function cargarAsignar() {
  const tbody = document.getElementById('asig-tbody');
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="9">
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
        <td style="max-width:220px;white-space:normal;line-height:1.4">
          ${r.descripcion || '—'}
        </td>
        <td>${_reqPrioridadBadge(r.prioridad)}</td>
        <td>
          ${r.asignado
            ? `<span class="asig-asignado">
                <i class="fas fa-user-check"></i>${r.asignado}
               </span>`
            : `<span class="asig-sin-asignar">
                <i class="fas fa-user-clock"></i>Sin asignar
               </span>`
          }
        </td>
        <td>
          ${r.clasificacion
            ? `<span class="hreq-sin-info" style="background:#dce9ff;color:#1B4698">
                ${r.clasificacion}
               </span>`
            : `<span class="hreq-sin-info">Sin información</span>`
          }
        </td>
        <td>
          ${r.plan_accion
            ? `<span class="hreq-sin-info" style="background:#dce9ff;color:#1B4698">
                ${r.plan_accion}
               </span>`
            : `<span class="hreq-sin-info">Sin información</span>`
          }
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
    elFecha.textContent = r.fecha_solucion;
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
    { key: 'recibido',    cumplido: true,                 fecha: r.fecha_requerimiento },
    { key: 'asignado',    cumplido: !!r.asignado,          fecha: r.asignado },
    { key: 'plan',        cumplido: !!r.plan_accion,       fecha: r.plan_accion },
    { key: 'solucionado', cumplido: !!(r.fecha_solucion || r.solucion), fecha: r.fecha_solucion || r.solucion },
    { key: 'cerrado',     cumplido: estado === 'CERRADO',  fecha: estado === 'CERRADO' ? (r.fecha_solucion || 'Cerrado') : null },
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
  const res = await apiFetch('/inventario/api/indicadores/resumen/');
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

  const res = await apiFetch(`/inventario/api/indicadores/tendencia/?${params}`);
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

  const res = await apiFetch(`/inventario/api/indicadores/calificacion/?${params}`);
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