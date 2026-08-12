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
    setTimeout(() => n.remove(), duration);
  }

  let DATA = [];

  const COLS = {
    pendientes: [
      {key:'fecha_creacion', label:'FECHA'},
      {key:'area',           label:'ÁREA REQUERIDA'},
      /*{key:'requerimiento',  label:'DESCRIPCIÓN'},*/
      {key:'vencimiento',    label:'FECHA VENCIMIENTO'},
     /* {key:'responsable',    label:'PERSONA ASIGNADA'},*/
      /*{key:'plan_accion',    label:'PLAN A ACCIONAR'},*/
    ],
    solucionados: [
      {key:'fecha_creacion', label:'FECHA CREACIÓN'},
      /*{key:'requerimiento',  label:'REQUERIMIENTO'},*/
      {key:'area',           label:'ÁREA'},
      /*{key:'responsable',    label:'RESPONSABLE'},
        {key:'plan_accion',    label:'PLAN DE ACCIÓN'},
        {key:'solucion',       label:'SOLUCIÓN'},
      */
      {key:'vencimiento',    label:'FECHA VENCIMIENTO'},
      {key:'fecha_solucion', label:'FECHA SOLUCIÓN'},
      {key:'clasificacion',  label:'CLASIFICACIÓN'},
    ],
  };

  const FULL_WIDTH_FIELDS = new Set(['requerimiento','plan_accion','solucion']);
  const PEND_ESTADOS = ['Abierto','Asignado','En Proceso','Pendiente Aprobación'];
  const SOL_ESTADOS  = ['Cerrado', 'Calificado'];
  let tab = 'pendientes', page = 1, size = 10, q = '';

  // ===== [FIX 1] Variables globales para el control de la calificación:
  // ratingLocked evita clics una vez ya calificado, ratingSeleccionada
  // guarda la estrella elegida antes de confirmar con el botón ENVIAR. =====
  let ratingLocked = false;
  let ratingSeleccionada = 0;

  function getPerfil(){ try{ return JSON.parse(sessionStorage.getItem('amm_perfil')||'{}'); }catch(e){ return {}; } }
  function setPerfil(obj){ sessionStorage.setItem('amm_perfil', JSON.stringify(obj)); }
  function clearPerfil(){ sessionStorage.removeItem('amm_perfil'); }

  async function cargarMisRequerimientos(cedula){
    try {
      const r    = await fetch('/SYSTRACK/requerimiento/api/mis-requerimientos/?cedula=' + encodeURIComponent(cedula));
      const resp = await r.json();
      if(resp.ok){
        DATA = resp.data;
      } else {
        console.error('Error del servidor al cargar requerimientos:', resp.error);
      }
    } catch(e){
      console.error('Error cargando requerimientos:', e);
    } finally {
      actualizarBell();
      cargarNotificaciones(cedula);
      if (document.getElementById('screen-mis-req')?.classList.contains('active')) {
        renderMisReq();
      }
    }
  }

  function setDocumento(doc){ sessionStorage.setItem('amm_documento', doc); }
  function getDocumento(){ return sessionStorage.getItem('amm_documento') || ''; }
  function clearDocumento(){ sessionStorage.removeItem('amm_documento'); clearPerfil(); DATA = []; }

  function misRequerimientos(){
    const doc = getDocumento();
    return DATA.filter(r => r.estado !== 'Eliminado' && (!doc || String(r.documento) === String(doc)));
  }

  // ===== Requerimientos ya solucionados (Cerrado) que el usuario aún
  // no ha calificado. Mientras existan, se bloquea crear uno nuevo.
  // Se basa en DATA (ya cargado) para que el bloqueo sea instantáneo,
  // sin depender de otro fetch. =====
  function requerimientosPendientesCalificar(){
    return misRequerimientos().filter(r => r.estado === 'Cerrado');
  }

  // ===== Notificaciones reales (asignado/aprobado/rechazado/solucionado
  // + vencidos por SLA), traídas de /api/notificaciones/. Alimentan tanto
  // el número del badge como el panel desplegable. =====
  let NOTIF = { notificaciones: [], vencidos: [], pendientes_calificar: [], total_alertas: 0 };
  const ICONOS_NOTIF = {
    asignado:  'fa-user-gear', aprobado: 'fa-check', rechazado: 'fa-xmark',
    solucionado: 'fa-circle-check', pendiente_calificar: 'fa-star', vencido: 'fa-clock',
  };

  async function cargarNotificaciones(cedula){
    if(!cedula) return;
    try {
      const r    = await fetch('/SYSTRACK/requerimiento/api/notificaciones/?cedula=' + encodeURIComponent(cedula));
      const resp = await r.json();
      if(resp.ok){
        NOTIF = resp;
      }
    } catch(e){
      console.error('Error cargando notificaciones:', e);
    } finally {
      actualizarBell();
    }
  }

  function actualizarBell(){
    const btnBell = document.getElementById('btnBell');
    const badge   = document.getElementById('bellBadge');
    if(!btnBell || !badge) return;
    // El badge combina: notificaciones reales sin leer + vencidos + pendientes por calificar.
    // requerimientosPendientesCalificar() (DATA local) manda sobre pendientes_calificar del
    // backend por si el usuario acaba de calificar y el fetch de /notificaciones/ aún no llega.
    const noLeidas   = NOTIF.notificaciones.filter(n => !n.leida).length;
    const pendientes = requerimientosPendientesCalificar().length;
    const vencidos    = NOTIF.vencidos.length;
    const total = noLeidas + pendientes + vencidos;
    if(total > 0){
      badge.textContent = total > 9 ? '9+' : String(total);
      badge.style.display = 'flex';
      btnBell.classList.add('bell-alert');
    } else {
      badge.style.display = 'none';
      btnBell.classList.remove('bell-alert');
    }
  }

  function renderBellPanel(){
    const list = document.getElementById('bellPanelList');
    const items = [];

    requerimientosPendientesCalificar().forEach(r => items.push({
      tipo: 'pendiente_calificar', codigo: r.codigo, titulo: `${r.codigo} pendiente por calificar`,
      mensaje: 'Ya fue solucionado. Califica la atención recibida.', fecha: r.fecha_solucion || '', leida: true,
    }));
    NOTIF.vencidos.forEach(v => items.push({
      tipo: 'vencido', codigo: v.codigo, titulo: `${v.codigo} está vencido`,
      mensaje: `Debió resolverse antes del ${v.fecha_estimada}.`, fecha: v.fecha_estimada, leida: true,
    }));
    NOTIF.notificaciones.forEach(n => items.push({
      tipo: n.tipo, codigo: n.codigo, titulo: n.titulo, mensaje: n.mensaje, fecha: n.fecha, leida: n.leida, id: n.id,
    }));

    if(items.length === 0){
      list.innerHTML = '<div class="bell-panel-empty">No tienes notificaciones nuevas.</div>';
      return;
    }

    list.innerHTML = items.map(it => `
      <div class="bell-item ${it.leida ? '' : 'unread'}" data-codigo="${it.codigo || ''}">
        <div class="bell-item-icon ${it.tipo}"><i class="fa-solid ${ICONOS_NOTIF[it.tipo] || 'fa-bell'}"></i></div>
        <div class="bell-item-body">
          <div class="bell-item-title">${it.titulo}</div>
          <div class="bell-item-msg">${it.mensaje}</div>
          ${it.fecha ? `<div class="bell-item-time">${it.fecha}</div>` : ''}
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.bell-item').forEach(el => {
      el.addEventListener('click', () => {
        const codigo = el.dataset.codigo;
        cerrarBellPanel();
        if(!codigo) return;
        const enSolucionados = SOL_ESTADOS.includes(
          (misRequerimientos().find(r => r.codigo === codigo) || {}).estado
        );
        irAVista('mis-req');
        tab = enSolucionados ? 'solucionados' : 'pendientes'; page = 1;
        document.querySelectorAll('.req-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
        renderMisReq();
        setTimeout(() => abrirTripModal(codigo), 150);
      });
    });
  }

  function abrirBellPanel(){
    cerrarDropdown();
    const btn   = document.getElementById('btnBell');
    const panel = document.getElementById('bellPanel');
    const rect  = btn.getBoundingClientRect();
    panel.style.top   = (rect.bottom + 10) + 'px';
    panel.style.right = (window.innerWidth - rect.right) + 'px';
    panel.classList.remove('hidden');
    renderBellPanel();
    // Marcar como leídas las notificaciones reales (no los pendientes/vencidos,
    // que solo desaparecen cuando el requerimiento deja de estarlo).
    const doc = getDocumento();
    if(doc && NOTIF.notificaciones.some(n => !n.leida)){
      fetch('/SYSTRACK/requerimiento/api/notificaciones/leer-todas/', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ cedula: doc })
      }).then(() => {
        NOTIF.notificaciones.forEach(n => n.leida = true);
        actualizarBell();
      }).catch(() => {});
    }
  }

  function cerrarBellPanel(){
    document.getElementById('bellPanel').classList.add('hidden');
  }

  window.addEventListener('resize', () => {
    const panel = document.getElementById('bellPanel');
    if(!panel.classList.contains('hidden')) abrirBellPanel();
  });

  function irASolucionadosPendientes(){
    irAVista('mis-req');
    tab = 'solucionados'; page = 1;
    document.querySelectorAll('.req-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === 'solucionados'));
    renderMisReq();
  }

  // Refresco automático: cada 2 minutos y al volver a la pestaña, por si
  // algo cambió (asignación, solución, aprobación) mientras el usuario
  // tenía el portal abierto sin navegar.
  setInterval(() => { const d = getDocumento(); if(d) cargarNotificaciones(d); }, 120000);
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'visible'){ const d = getDocumento(); if(d) cargarNotificaciones(d); }
  });

  function filtered(){
    return misRequerimientos().filter(r => {
      const ok = tab==='pendientes' ? PEND_ESTADOS.includes(r.estado) : SOL_ESTADOS.includes(r.estado);
      const s  = !q || Object.values(r).some(v=>String(v??'').toLowerCase().includes(q));
      return ok && s;
    });
  }

  function prioBadge(p){
    const c = p==='Alta'?'prio-alta':p==='Media'?'prio-media':'prio-baja';
    return `<span class="prio-badge ${c}"><span class="pd"></span>${p}</span>`;
  }
  function estBadge(e){
    const m = {'Abierto':'est-abierto','Asignado':'est-asignado','En Proceso':'est-en-proceso',
               'Cerrado':'est-cerrado','Calificado':'est-cerrado',
               'Pendiente Aprobación':'est-pendiente-aprob','Rechazado':'est-rechazado'};
    return `<span class="est-badge ${m[e]||''}"><span class="ed"></span>${e}</span>`;
  }

  function renderTableHead(){
    const head = document.getElementById('reqTableHead');
    let h = `<th>CÓDIGO</th><th>PRIORIDAD</th>`;
    COLS[tab].forEach(c => h += `<th>${c.label}</th>`);
    h += `<th>ACCIÓN</th>`;
    head.innerHTML = h;
  }

  function renderTableRow(r){
    let tds = `<td><span class="codigo-mono">${r.codigo || '—'}</span></td>`;
    tds += `<td>${r.prioridad ? prioBadge(r.prioridad) : '<span class="muted">—</span>'}</td>`;
    COLS[tab].forEach(c=>{
      const val = r[c.key];
      const cls = (val===undefined || val===null || val==='') ? ' class="muted"' : '';
      tds += `<td${cls}>${(val===undefined||val===null||val==='') ? '—' : val}</td>`;
    });
    tds += `<td><button class="req-action-btn" title="Ver seguimiento" data-codigo="${r.codigo}"><i class="fa-solid fa-magnifying-glass"></i></button></td>`;
    return `<tr>${tds}</tr>`;
  }

  function renderMisReq(){
    const data = filtered();
    const total = data.length;
    const pages = Math.max(1, Math.ceil(total/size));
    if(page>pages) page=1;
    const from = total===0?0:(page-1)*size+1;
    const to   = Math.min(page*size,total);
    const rows = data.slice(from-1,to);

    const tbody = document.getElementById('reqTableBody');
    const empty = document.getElementById('reqEmpty');

    renderTableHead();

    if(!rows.length){
      tbody.innerHTML='';
      empty.style.display='flex';
    } else {
      empty.style.display='none';
      tbody.innerHTML = rows.map(r => renderTableRow(r)).join('');
      tbody.querySelectorAll('.req-action-btn').forEach(btn=>{
        btn.addEventListener('click', () => abrirTripModal(btn.dataset.codigo));
      });
    }

    document.getElementById('pagFrom').textContent  = from;
    document.getElementById('pagTo').textContent    = to;
    document.getElementById('pagTotal').textContent = total;

    const ctrl = document.getElementById('pagControls');
    let h = `<button class="pag-btn" id="pp" ${page===1?'disabled':''}><i class="fa-solid fa-chevron-left"></i></button>`;
    for(let i=1;i<=pages;i++) h+=`<button class="pag-btn ${i===page?'active':''}" data-p="${i}">${i}</button>`;
    h+=`<button class="pag-btn" id="pn" ${page===pages?'disabled':''}><i class="fa-solid fa-chevron-right"></i></button>`;
    ctrl.innerHTML=h;
    ctrl.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click',()=>{page=+b.dataset.p;renderMisReq();}));
    ctrl.querySelector('#pp')?.addEventListener('click',()=>{if(page>1){page--;renderMisReq();}});
    ctrl.querySelector('#pn')?.addEventListener('click',()=>{page++;renderMisReq();});
  }

  document.querySelectorAll('.req-tab').forEach(t=>{
    t.addEventListener('click',()=>{
      document.querySelectorAll('.req-tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      tab=t.dataset.tab; page=1; renderMisReq();
    });
  });
  document.getElementById('reqSearch').addEventListener('input',e=>{q=e.target.value.toLowerCase().trim();page=1;renderMisReq();});
  document.getElementById('pagSize').addEventListener('change',e=>{size=+e.target.value;page=1;renderMisReq();});

  const VISTAS_QUE_PIDEN_DOC = ['mis-req','agregar','seguimiento','equipos'];

  function irAVista(nombre){
    if(nombre === 'agregar'){
      const pendientes = requerimientosPendientesCalificar();
      if(pendientes.length > 0){
        const lista = pendientes.map(r => r.codigo).join(', ');
        showNotif(
          'Tienes requerimientos pendientes por calificar',
          (pendientes.length === 1
            ? `El requerimiento ${lista} ya fue solucionado y está pendiente por calificar.`
            : `Los requerimientos ${lista} ya fueron solucionados y están pendientes por calificar.`)
          + ' Por favor califícalos antes de crear un nuevo requerimiento.',
          'error', 6000
        );
        irASolucionadosPendientes();
        return;
      }
    }
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen===nombre));
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + nombre).classList.add('active');
    actualizarChipsDocumento();
    if(nombre === 'mis-req'){ page=1; renderMisReq(); }
    if(nombre === 'agregar'){ precargarDocumentoEnFormulario(); cargarCatalogos(); }
    if(nombre === 'seguimiento'){ resetSegBuscador(); }
    if(nombre === 'equipos'){ cargarEquipos(); }
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const nombre = btn.dataset.screen;
      if(VISTAS_QUE_PIDEN_DOC.includes(nombre) && !getDocumento()){
        pedirDocumento(() => irAVista(nombre));
      } else {
        irAVista(nombre);
      }
    });
  });

  document.getElementById('btnBell').addEventListener('click', (e) => {
    e.stopPropagation();
    const panel = document.getElementById('bellPanel');
    const abrir = () => panel.classList.contains('hidden') ? abrirBellPanel() : cerrarBellPanel();
    if(!getDocumento()){ pedirDocumento(abrir); } else { abrir(); }
  });
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('bellPanel');
    if(!panel.classList.contains('hidden') && !panel.contains(e.target) && e.target.id !== 'btnBell'){
      cerrarBellPanel();
    }
  });

  /* ===== Chat de soporte embebido (Microsoft Teams vía Graph, backend) =====
     Muestra la presencia real de la persona de soporte y, dentro de la
     misma página, un chat real: el mensaje se manda a nuestro backend, que
     lo entrega en Microsoft Teams en nombre del usuario (requiere que el
     usuario haya vinculado su cuenta Microsoft una vez). Sin esa
     vinculación se muestra un botón "Conectar con Microsoft Teams" en vez
     del chat. */
  let teamsCorreoSoporte = '';
  let chatPollTimer = null;
  let chatUltimoId  = 0;

  function _pintarPresenciaTeams(estado, color){
    const dotModal   = document.getElementById('teamsPresenceDot');
    const dotSidebar = document.getElementById('helpBoxPresenceDot');
    const label = document.getElementById('teamsPresenceLabel');
    [dotModal, dotSidebar].forEach(dot => {
      if(!dot) return;
      dot.classList.remove('green', 'red', 'yellow', 'gray');
      dot.classList.add(color || 'gray');
    });
    if(label) label.textContent = estado || 'Desconocido';
  }

  async function actualizarPresenciaTeams(){
    try {
      const r = await fetch('/SYSTRACK/requerimiento/api/teams-presence/');
      const resp = await r.json();
      if(resp.ok){
        teamsCorreoSoporte = resp.correo || '';
        _pintarPresenciaTeams(resp.estado, resp.color);

        const nombreEl = document.getElementById('chatAgenteNombre');
        if(nombreEl) nombreEl.textContent = resp.nombre || 'Soporte técnico';

        const fotoEl = document.getElementById('teamsAgenteFoto');
        if(fotoEl && teamsCorreoSoporte && !fotoEl.dataset.cargada){
          fotoEl.dataset.cargada = '1';
          fotoEl.style.display = '';
          fotoEl.src = '/SYSTRACK/requerimiento/api/teams-agente-foto/';
        }
      }
    } catch(e){
      console.error('Error consultando presencia de Teams:', e);
    }
  }

  function chatAgregarBurbuja(m){
    const lista = document.getElementById('chatMensajesLista');
    const vacio = document.getElementById('chatMensajesVacio');
    if(vacio) vacio.remove();

    const burbuja = document.createElement('div');
    burbuja.className = 'chat-bubble ' + (m.direccion === 'SALIENTE' ? 'saliente' : 'entrante') + (m.estado === 'error' ? ' error' : '');
    burbuja.textContent = m.texto; // textContent, nunca innerHTML: el texto viene de Teams/del usuario, no es de confiar como HTML

    const hora = document.createElement('span');
    hora.className = 'chat-bubble-hora';
    try {
      hora.textContent = new Date(m.fecha).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    } catch(e){ hora.textContent = ''; }
    burbuja.appendChild(hora);

    lista.appendChild(burbuja);
    lista.scrollTop = lista.scrollHeight;
    if(m.id) chatUltimoId = Math.max(chatUltimoId, m.id);
  }

  function chatDetenerPolling(){
    if(chatPollTimer){ clearInterval(chatPollTimer); chatPollTimer = null; }
  }

  async function chatPollMensajes(){
    try {
      const url = '/SYSTRACK/requerimiento/api/chat/mensajes/?cedula=' + encodeURIComponent(getDocumento()) + '&despues_de=' + chatUltimoId;
      const r = await fetch(url);
      const resp = await r.json();
      if(!resp.ok) return;
      if(resp.requiere_vinculacion){ chatMostrarNoVinculado(); return; }
      (resp.mensajes || []).forEach(chatAgregarBurbuja);
    } catch(e){
      console.error('Error consultando mensajes del chat:', e);
    }
  }

  function chatMostrarNoVinculado(){
    chatDetenerPolling();
    document.getElementById('chatNoVinculado').classList.remove('hidden');
    document.getElementById('chatVinculado').classList.add('hidden');
  }

  function chatMostrarVinculado(){
    document.getElementById('chatNoVinculado').classList.add('hidden');
    document.getElementById('chatVinculado').classList.remove('hidden');
    document.getElementById('chatMensajesLista').innerHTML = '<div class="chat-widget-vacio" id="chatMensajesVacio">Cargando conversación...</div>';
    chatUltimoId = 0;
    chatPollMensajes(); // primera carga inmediata
    chatDetenerPolling();
    chatPollTimer = setInterval(chatPollMensajes, 4000);
  }

  async function chatCargarEstado(){
    try {
      const r = await fetch('/SYSTRACK/requerimiento/api/chat/estado/?cedula=' + encodeURIComponent(getDocumento()));
      const resp = await r.json();
      if(resp.ok && resp.vinculado) chatMostrarVinculado();
      else chatMostrarNoVinculado();
    } catch(e){
      console.error('Error consultando estado del chat:', e);
      chatMostrarNoVinculado();
    }
  }

  async function chatEnviarMensaje(){
    const input = document.getElementById('chatInputTexto');
    const texto = input.value.trim();
    if(!texto) return;
    input.value = '';
    input.disabled = true;
    try {
      const r = await fetch('/SYSTRACK/requerimiento/api/chat/enviar/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({cedula: getDocumento(), texto}),
      });
      const resp = await r.json();
      if(resp.requiere_vinculacion){ chatMostrarNoVinculado(); return; }
      if(resp.mensaje) chatAgregarBurbuja(resp.mensaje);
      if(!resp.ok && resp.error) showNotif('Chat de soporte', resp.error, 'error');
    } catch(e){
      console.error('Error enviando mensaje del chat:', e);
      showNotif('Chat de soporte', 'No se pudo enviar el mensaje. Intenta de nuevo.', 'error');
    } finally {
      input.disabled = false;
      input.focus();
    }
  }

  const teamsChatOverlay = document.getElementById('teamsChatOverlay');
  function abrirChatTeams(){
    teamsChatOverlay.classList.remove('hidden');
    actualizarPresenciaTeams(); // refresca al abrir, no solo cada minuto
    chatCargarEstado();
  }
  function cerrarChatTeams(){
    teamsChatOverlay.classList.add('hidden');
    chatDetenerPolling();
  }

  document.getElementById('btnContact').addEventListener('click', () => {
    if(!getDocumento()){ pedirDocumento(abrirChatTeams); } else { abrirChatTeams(); }
  });
  document.getElementById('teamsChatClose').addEventListener('click', cerrarChatTeams);
  teamsChatOverlay.addEventListener('click', (e) => { if(e.target === teamsChatOverlay) cerrarChatTeams(); });

  document.getElementById('btnChatVincular').addEventListener('click', () => {
    window.location.href = '/SYSTRACK/requerimiento/api/chat/vincular/?cedula=' + encodeURIComponent(getDocumento());
  });

  document.getElementById('btnChatEnviar').addEventListener('click', chatEnviarMensaje);
  document.getElementById('chatInputTexto').addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); chatEnviarMensaje(); }
  });

  // El callback de vinculación con Microsoft redirige de vuelta con
  // ?chat_link=ok|error — mostramos el resultado y reabrimos el chat.
  (function chatRevisarRetornoVinculacion(){
    const params = new URLSearchParams(window.location.search);
    const resultado = params.get('chat_link');
    if(!resultado) return;
    params.delete('chat_link');
    const nuevaUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', nuevaUrl);
    if(resultado === 'ok'){
      showNotif('Microsoft Teams', 'Tu cuenta quedó conectada. Ya puedes chatear con soporte.', 'success');
      abrirChatTeams();
    } else {
      showNotif('Microsoft Teams', 'No se pudo completar la conexión con tu cuenta. Intenta de nuevo.', 'error');
    }
  })();

  // Presencia inicial (para el puntito del panel lateral) + refresco cada minuto
  actualizarPresenciaTeams();
  setInterval(actualizarPresenciaTeams, 60000);

  function precargarDocumentoEnFormulario(){
    const doc    = getDocumento();
    const perfil = getPerfil();
    const fDoc   = document.getElementById('f_documento');
    const fNombre= document.getElementById('f_nombre');
    const fCorreo= document.getElementById('f_correo');
    const fCargo = document.getElementById('f_cargo');
    if(fDoc    && doc           && !fDoc.value)    fDoc.value    = doc;
    if(fNombre && perfil.nombre && !fNombre.value) fNombre.value = perfil.nombre;
    if(fCorreo && perfil.email  && !fCorreo.value) fCorreo.value = perfil.email;
    if(fCargo  && perfil.cargo_txt)                fCargo.value  = perfil.cargo_txt;
  }

  /*  MODAL DE IDENTIFICACIÓN  */
  const idModalOverlay = document.getElementById('idModalOverlay');
  const idModalInput   = document.getElementById('idModalInput');
  const idModalError   = document.getElementById('idModalError');
  const idModalClose   = document.getElementById('idModalClose');
  let onDocumentoConfirmado = null;

  function pedirDocumento(callback){
    onDocumentoConfirmado = callback;
    idModalError.classList.remove('show');
    idModalInput.value = '';
    idModalOverlay.classList.remove('hidden');
    setTimeout(()=>idModalInput.focus(), 50);
  }

  function cerrarModalDocumento(){
    idModalOverlay.classList.add('hidden');
    onDocumentoConfirmado = null;
  }

  function confirmarDocumento(){
    const val = idModalInput.value.trim();
    if(val.length < 5){
      idModalError.textContent = 'Ingresa un número de documento válido.';
      idModalError.classList.add('show');
      return;
    }
    const btnSubmit = document.getElementById('idModalSubmit');
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Validando...';
    idModalError.classList.remove('show');

    fetch('/SYSTRACK/requerimiento/api/validar-cedula/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedula: val })
    })
    .then(r => r.json())
    .then(resp => {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'CONTINUAR';
      if(!resp.ok){
        idModalError.textContent = resp.error || 'Cédula no encontrada.';
        idModalError.classList.add('show');
        return;
      }
      setDocumento(val);
      setPerfil({
        nombre:    resp.nombre,
        email:     resp.email,
        id_cargo:  resp.id_cargo,
        cargo_txt: resp.cargo_txt,
        id_co:     resp.id_co,
        co_texto:  resp.co_texto,
      });
      cargarMisRequerimientos(val).then(() => {
        idModalOverlay.classList.add('hidden');
        const callback = onDocumentoConfirmado;
        onDocumentoConfirmado = null;
        if(typeof callback === 'function') callback();
      });
    })
    .catch(() => {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'CONTINUAR';
      idModalError.textContent = 'Error de conexión. Intenta de nuevo.';
      idModalError.classList.add('show');
    });
  }

  document.getElementById('idModalSubmit').addEventListener('click', confirmarDocumento);
  idModalInput.addEventListener('keydown', e => { if(e.key==='Enter') confirmarDocumento(); });
  idModalClose.addEventListener('click', cerrarModalDocumento);
  idModalOverlay.addEventListener('click', (e) => { if(e.target === idModalOverlay) cerrarModalDocumento(); });
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && !idModalOverlay.classList.contains('hidden')) cerrarModalDocumento();
  });

  /* ===== AUTO-REGISTRO DE USUARIO NUEVO =====
     Se abre desde el link "Regístrate aquí" del modal de identificación,
     cuando validar-cedula responde que el documento no existe. Al terminar,
     reutiliza confirmarDocumento() para entrar con la cédula recién creada. */
  const registroModalOverlay = document.getElementById('registroModalOverlay');
  const registroModalClose   = document.getElementById('registroModalClose');
  const abrirRegistroLink    = document.getElementById('abrirRegistroLink');
  const formRegistroUsuario  = document.getElementById('formRegistroUsuario');
  const registroModalError   = document.getElementById('registroModalError');

  // Convierte "Nombre completo" a mayúsculas mientras el usuario escribe.
  const rNombreInput = document.getElementById('r_nombre');
  if(rNombreInput){
    rNombreInput.addEventListener('input', () => {
      const pos = rNombreInput.selectionStart;
      rNombreInput.value = rNombreInput.value.toUpperCase();
      rNombreInput.setSelectionRange(pos, pos);
    });
  }

  let catalogosRegistroCargados = false;

  async function cargarCatalogosRegistro(){
    if(catalogosRegistroCargados) return;
    try {
      const r    = await fetch('/SYSTRACK/requerimiento/api/catalogos-registro/');
      const resp = await r.json();
      if(!resp.ok) return;

      const opsCargo  = resp.cargos.map(c=>({ value:String(c.IdCargo), label:c.Descripcion }));
      const opsCentro = resp.centros.map(c=>({ value:String(c.IdCo), label:c.Descripcion }));

      if(document.getElementById('sdr_r_cargo')?._sdr){
        document.getElementById('sdr_r_cargo')._sdr.cargar(opsCargo);
      } else {
        crearSDR('sdr_r_cargo', 'r_cargo', opsCargo);
      }

      if(document.getElementById('sdr_r_centro')?._sdr){
        document.getElementById('sdr_r_centro')._sdr.cargar(opsCentro);
      } else {
        crearSDR('sdr_r_centro', 'r_centro', opsCentro);
      }

      const selArea = document.getElementById('r_area');
      resp.areas.forEach(a=>{
        const opt = document.createElement('option');
        opt.value = a.IdArea; opt.textContent = a.NombreArea;
        selArea.appendChild(opt);
      });

      catalogosRegistroCargados = true;
    } catch(e){ console.error('Error cargando catálogos de registro:', e); }
  }

  function abrirModalRegistro(){
    const cedulaActual = idModalInput.value.trim();
    registroModalError.textContent = '';
    registroModalError.classList.remove('show');
    idModalOverlay.classList.add('hidden');
    registroModalOverlay.classList.remove('hidden');
    cargarCatalogosRegistro();
    if(cedulaActual) document.getElementById('r_documento').value = cedulaActual;
  }

  function cerrarModalRegistro(){
    registroModalOverlay.classList.add('hidden');
    idModalOverlay.classList.remove('hidden');
  }

  if(abrirRegistroLink){
    abrirRegistroLink.addEventListener('click', (e)=>{ e.preventDefault(); abrirModalRegistro(); });
  }
  if(registroModalClose){
    registroModalClose.addEventListener('click', cerrarModalRegistro);
  }
  registroModalOverlay.addEventListener('click', (e)=>{ if(e.target === registroModalOverlay) cerrarModalRegistro(); });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && !registroModalOverlay.classList.contains('hidden')) cerrarModalRegistro();
  });

  if(formRegistroUsuario){
    formRegistroUsuario.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const btnSubmit = document.getElementById('registroModalSubmit');
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Registrando...';
      registroModalError.textContent = '';
      registroModalError.classList.remove('show');

      const payload = {
        cedula:          document.getElementById('r_documento').value.trim(),
        nombre_completo: document.getElementById('r_nombre').value.trim(),
        id_cargo:        document.getElementById('r_cargo').value,
        id_co:           document.getElementById('r_centro').value,
        id_area:         document.getElementById('r_area').value,
        correo:          document.getElementById('r_correo').value.trim(),
      };

      try {
        const r    = await fetch('/SYSTRACK/requerimiento/api/registro/', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
        });
        const resp = await r.json();
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'REGISTRARME';

        if(!resp.ok){
          registroModalError.textContent = resp.error || 'No se pudo completar el registro.';
          registroModalError.classList.add('show');
          return;
        }

        registroModalOverlay.classList.add('hidden');
        showNotif('¡Registro exitoso!', 'Ya puedes usar tus requerimientos.', 'success');

        idModalOverlay.classList.remove('hidden');
        idModalInput.value = payload.cedula;
        confirmarDocumento();

      } catch(err){
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'REGISTRARME';
        registroModalError.textContent = 'Error de conexión. Intenta de nuevo.';
        registroModalError.classList.add('show');
      }
    });
  }

  /* ===== AVATAR DE PERFIL (solo local, no viaja al backend) =====
     No existe un campo de foto en mv_Usuarios (modelo no administrado
     por Django), asi que la foto se guarda en localStorage (no en
     sessionStorage: localStorage persiste entre sesiones/dias en el mismo
     navegador, hasta que el usuario la quite o borre datos del sitio),
     ligada al numero de documento, igual que el resto del perfil. */
  function avatarKey(doc){ return 'amm_avatar_' + doc; }
  function getAvatar(doc){ return doc ? (localStorage.getItem(avatarKey(doc)) || '') : ''; }
  function setAvatar(doc, dataUrl){ if(doc) localStorage.setItem(avatarKey(doc), dataUrl); }
  function removeAvatar(doc){ if(doc) localStorage.removeItem(avatarKey(doc)); }

  function iniciales(nombre){
    if(!nombre) return '?';
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    const ini = (partes[0]?.[0] || '') + (partes[1]?.[0] || '');
    return (ini || partes[0]?.[0] || '?').toUpperCase();
  }

  function actualizarChipsDocumento(){
    const doc       = getDocumento();
    const perfil    = getPerfil();
    const avatarUrl = getAvatar(doc);
    const wrap   = document.getElementById('idChipHeader');
    const avatar = document.getElementById('idChipHeaderAvatar');
    if(!wrap) return;
    if(doc){
      wrap.style.display = 'flex';
      if(avatar){
        avatar.innerHTML = avatarUrl ? ('<img src="' + avatarUrl + '" alt="">') : iniciales(perfil.nombre);
      }
    } else {
      wrap.style.display = 'none';
    }
  }

  /* ===== MENU DESPLEGABLE DEL AVATAR (Perfil / Cerrar sesion) ===== */
  const profileDropdown = document.getElementById('profileDropdownMenu');
  let chipActivo = null;

  function abrirDropdown(chip){
    cerrarBellPanel();
    chipActivo = chip;
    const r = chip.getBoundingClientRect();
    profileDropdown.classList.remove('hidden');
    profileDropdown.style.top  = (r.bottom + window.scrollY + 8) + 'px';
    profileDropdown.style.left = Math.max(8, r.right + window.scrollX - profileDropdown.offsetWidth) + 'px';
  }
  function cerrarDropdown(){
    profileDropdown.classList.add('hidden');
    chipActivo = null;
  }
  function cerrarSesionDesdeMenu(){
    cerrarDropdown();
    cerrarModalPerfil();
    clearDocumento();
    pedirDocumento(() => irAVista(document.querySelector('.nav-btn.active').dataset.screen));
  }

  document.querySelectorAll('.profile-avatar-btn').forEach(chip=>{
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      if(chipActivo === chip && !profileDropdown.classList.contains('hidden')){
        cerrarDropdown();
      } else {
        abrirDropdown(chip);
      }
    });
  });
  document.addEventListener('click', (e) => {
    if(!profileDropdown.classList.contains('hidden') && !profileDropdown.contains(e.target)) cerrarDropdown();
  });
  document.getElementById('btnCerrarSesion').addEventListener('click', cerrarSesionDesdeMenu);
  document.getElementById('btnAbrirPerfil').addEventListener('click', () => {
    cerrarDropdown();
    abrirModalPerfil();
  });

  /* ===== MODAL DE PERFIL ===== */
  const profileModalOverlay = document.getElementById('profileModalOverlay');
  const profileModalAvatar  = document.getElementById('profileModalAvatar');
  const profileModalInput   = document.getElementById('profileModalAvatarInput');

  const profileModalAvatarQuitar = document.getElementById('profileModalAvatarQuitar');

  function abrirModalPerfil(){
    const doc       = getDocumento();
    const perfil    = getPerfil();
    const avatarUrl = getAvatar(doc);
    profileModalAvatar.innerHTML = avatarUrl ? ('<img src="' + avatarUrl + '" alt="">') : iniciales(perfil.nombre);
    profileModalAvatarQuitar.style.display = avatarUrl ? '' : 'none';
    document.getElementById('profileModalNombre').textContent    = perfil.nombre    || '—';
    document.getElementById('profileModalCargo').textContent     = perfil.cargo_txt || '';
    document.getElementById('profileModalDocGrande').textContent = doc || '—';
    profileModalOverlay.classList.remove('hidden');
  }
  function cerrarModalPerfil(){
    profileModalOverlay.classList.add('hidden');
  }

  document.getElementById('profileModalClose').addEventListener('click', cerrarModalPerfil);
  profileModalOverlay.addEventListener('click', (e) => { if(e.target === profileModalOverlay) cerrarModalPerfil(); });
  document.getElementById('profileModalAvatarBtn').addEventListener('click', () => profileModalInput.click());
  document.getElementById('profileModalCerrarSesion').addEventListener('click', cerrarSesionDesdeMenu);

  profileModalInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if(!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(getDocumento(), reader.result);
      profileModalAvatar.innerHTML = '<img src="' + reader.result + '" alt="">';
      profileModalAvatarQuitar.style.display = '';
      actualizarChipsDocumento();
    };
    reader.readAsDataURL(file);
  });

  profileModalAvatarQuitar.addEventListener('click', () => {
    const doc = getDocumento();
    removeAvatar(doc);
    profileModalAvatar.innerHTML = iniciales(getPerfil().nombre);
    profileModalAvatarQuitar.style.display = 'none';
    profileModalInput.value = '';
    actualizarChipsDocumento();
  });

  /* ===== SEGUIMIENTO ===== */
  const TRIP_STEPS_BASE = [
    {estado:'Abierto',    label:'Abierto',     icon:'fa-file-pen',
      detalle:(r)=> `Tu requerimiento fue registrado el ${r.fecha_creacion||'—'} y está a la espera de ser asignado a un responsable.`},
    {estado:'Asignado',   label:'Asignado',    icon:'fa-user-check',
      detalle:(r)=> r.responsable ? `Fue asignado a ${r.responsable}, quien revisará tu solicitud en breve.` : 'Está a la espera de que se le asigne un responsable.'},
    {estado:'En Proceso', label:'En proceso',  icon:'fa-screwdriver-wrench',
      detalle:(r)=> r.plan_accion || 'Se está trabajando en la solución de tu requerimiento.'},
    {estado:'Cerrado',    label:'Cerrado',     icon:'fa-circle-check',
      detalle:(r)=> r.solucion ? `${r.solucion}${r.fecha_solucion ? ' (Solucionado el '+r.fecha_solucion+')' : ''}` : 'Tu requerimiento fue solucionado.'},
    // ===== [FIX 4] El paso "Calificado" ahora revisa el campo correcto
    // (r.calificacion, no r.evaluacion) y valida si el paso realmente ya
    // pasó, en vez de asumir "ya fue calificado" solo por hacer clic ahí. =====
    {estado:'Calificado', label:'Calificado', icon:'fa-star',
      detalle:(r)=> {
        if(r.estado !== 'Calificado') return 'Aún no has calificado este requerimiento.';
        return r.calificacion ? `Calificaste este requerimiento con ${r.calificacion} de 5 estrellas.` : 'Este requerimiento ya fue calificado.';
      }},
  ];

  function buildTripSteps(r){
    if(!r.requiere_aprobacion) return TRIP_STEPS_BASE;

    const fueRechazado = r.estado === 'Rechazado';
    const pasoAprobacion = {
      estado: fueRechazado ? 'Rechazado' : 'Pendiente Aprobación',
      label: fueRechazado ? 'Rechazado' : 'Aprobación',
      icon:  fueRechazado ? 'fa-file-circle-xmark' : 'fa-file-signature',
      detalle: (r) => {
        if(r.estado === 'Rechazado'){
          return `Tu requerimiento fue rechazado por el jefe de área${r.fecha_aprobacion ? ' el '+r.fecha_aprobacion : ''}.`;
        }
        if(r.estado === 'Pendiente Aprobación'){
          return 'Tu requerimiento está a la espera de aprobación por el jefe de área.';
        }
        return `Tu requerimiento fue aprobado por el jefe de área${r.fecha_aprobacion ? ' el '+r.fecha_aprobacion : ''} y continuó su curso normal.`;
      }
    };
    return [pasoAprobacion, ...TRIP_STEPS_BASE];
  }

  const segCodigoInput   = document.getElementById('segCodigoInput');
  const segSearchError   = document.getElementById('segSearchError');
  const tripModalOverlay = document.getElementById('tripModalOverlay');
  const tripModalClose   = document.getElementById('tripModalClose');

  function resetSegBuscador(){
    segCodigoInput.value = '';
    segSearchError.classList.remove('show');
  }

  function buscarRequerimiento(){
    const val = segCodigoInput.value.trim();
    segSearchError.classList.remove('show');
    if(!val) return;
    const match = misRequerimientos().find(r => String(r.codigo).toLowerCase() === val.toLowerCase());
    if(match) abrirTripModal(match.codigo);
    else segSearchError.classList.add('show');
  }

  document.getElementById('segCodigoBtn').addEventListener('click', buscarRequerimiento);
  segCodigoInput.addEventListener('keydown', e => { if(e.key==='Enter') buscarRequerimiento(); });

  function cerrarTripModal(){ tripModalOverlay.classList.add('hidden'); }
  tripModalClose.addEventListener('click', cerrarTripModal);
  tripModalOverlay.addEventListener('click', (e) => { if(e.target===tripModalOverlay) cerrarTripModal(); });
  document.addEventListener('keydown', (e) => {
    if(e.key==='Escape' && !tripModalOverlay.classList.contains('hidden')) cerrarTripModal();
  });

  function abrirTripModal(codigo){
    const r = misRequerimientos().find(x => String(x.codigo) === String(codigo));
    if(!r) return;

    document.getElementById('tripCodigo').textContent = r.codigo || '';
    document.getElementById('tripDesc').textContent    = r.requerimiento || '';
    const estadoBadgeEl = document.getElementById('tripEstadoBadge');
    estadoBadgeEl.outerHTML = estBadge(r.estado).replace('<span class="est-badge', '<span id="tripEstadoBadge" class="est-badge');

    const tripSteps = buildTripSteps(r);
    const idxActual = tripSteps.findIndex(s => s.estado === r.estado);
    const esUltimoPaso = idxActual === tripSteps.length - 1;
    const stepsWrap = document.getElementById('tripSteps');
    stepsWrap.innerHTML = tripSteps.map((s, i) => {
      let cls = '';
      if(i < idxActual) cls = 'done';
      else if(i === idxActual) cls = esUltimoPaso ? 'done' : 'current';
      return `
        <button type="button" class="trip-step ${cls}" data-i="${i}">
          <div class="trip-step-icon"><i class="fa-solid ${s.icon}"></i></div>
          <div class="trip-step-label">${s.label}</div>
          <div class="trip-step-time">${i===0 ? (r.fecha_creacion||'') : ''}</div>
        </button>
      `;
    }).join('');

    /* ===== DETALLE DEL PASO: altura sincronizada con ResizeObserver,
       nunca se recorta el texto y no hay choques al cambiar de paso. ===== */
    const detailBox   = document.getElementById('tripStepDetail');
    const detailClip  = detailBox.querySelector('.trip-step-detail-clip');
    const detailInner = detailBox.querySelector('.trip-step-detail-inner');
    const detailIcon  = document.getElementById('tripStepDetailIcon');
    const detailTitle = document.getElementById('tripStepDetailTitle');
    const detailText  = document.getElementById('tripStepDetailText');
    detailBox.classList.remove('show');
    detailClip.style.height = '0px';

    let pasoSeleccionado = null;

    if(!detailClip._ro){
      detailClip._ro = new ResizeObserver(() => {
        if(detailBox.classList.contains('show')){
          detailClip.style.height = detailInner.scrollHeight + 'px';
        }
      });
      detailClip._ro.observe(detailInner);
    }

    function pintarContenido(s){
      detailIcon.innerHTML = `<i class="fa-solid ${s.icon}"></i>`;
      detailTitle.textContent = s.label;
      detailText.textContent = s.detalle(r);
    }

    function abrirDetalle(s){
      pintarContenido(s);
      detailBox.classList.add('show');
      detailClip.style.height = detailInner.scrollHeight + 'px';
    }

    function cerrarDetalle(){
      detailBox.classList.remove('show');
      detailClip.style.height = '0px';
    }

    function cambiarDetalle(s){
      detailInner.classList.add('fading');
      setTimeout(() => {
        pintarContenido(s);
        detailInner.classList.remove('fading');
        detailClip.style.height = detailInner.scrollHeight + 'px';
      }, 160);
    }

    stepsWrap.querySelectorAll('.trip-step').forEach(stepEl => {
      stepEl.addEventListener('click', () => {
        const i = +stepEl.dataset.i;
        const s = tripSteps[i];

        if(pasoSeleccionado === i){
          stepEl.classList.remove('selected');
          pasoSeleccionado = null;
          cerrarDetalle();
          return;
        }

        stepsWrap.querySelectorAll('.trip-step').forEach(x=>x.classList.remove('selected'));
        stepEl.classList.add('selected');

        if(pasoSeleccionado === null){
          abrirDetalle(s);
        } else {
          cambiarDetalle(s);
        }
        pasoSeleccionado = i;
      });
    });

    /*  [FIX 2] CALIFICACIÓN: ahora contempla el textarea de comentario
       y el modo de solo lectura, en vez de solo mostrar/ocultar la fila.  */
    const ratingRow       = document.getElementById('segRatingRow');
    const ratingStars     = document.getElementById('segRatingStars');
    const ratingSubmit    = document.getElementById('segRatingSubmit');
    const ratingSub       = document.getElementById('segRatingSub');
    const commentWrap     = document.getElementById('segRatingCommentWrap');
    const commentInput    = document.getElementById('segRatingComment');
    const commentReadonly = document.getElementById('segRatingReadonlyComment');

    if(r.estado === 'Cerrado' || r.estado === 'Calificado'){
      ratingRow.style.display = 'flex';

      if(r.estado === 'Calificado' || r.calificacion){
        // Ya fue calificado: solo lectura, se muestra lo que ya se calificó
        ratingLocked = true;
        ratingSeleccionada = r.calificacion || 0;
        pintarEstrellas(ratingSeleccionada);
        ratingStars.classList.add('readonly');
        ratingSubmit.style.display = 'none';
        ratingSub.textContent = 'Ya calificaste este requerimiento';

        commentWrap.style.display = 'none';
        if(r.comentario_evaluacion){
          commentReadonly.style.display = 'block';
          commentReadonly.textContent = '"' + r.comentario_evaluacion + '"';
        } else {
          commentReadonly.style.display = 'none';
        }
      } else {
        // Cerrado pero sin calificar: modo interactivo
        ratingLocked = false;
        ratingSeleccionada = 0;
        pintarEstrellas(0);
        ratingStars.classList.remove('readonly');
        ratingSubmit.style.display = 'inline-flex';
        ratingSubmit.disabled = true;
        ratingSubmit.textContent = 'ENVIAR';
        ratingSub.textContent = 'Tu calificación nos ayuda a mejorar';

        commentReadonly.style.display = 'none';
        commentWrap.style.display = 'block';
        commentInput.value = '';
      }
    } else {
      ratingRow.style.display = 'none';
    }

    document.getElementById('tripLineFill').style.width = '0%';
    tripModalOverlay.classList.remove('hidden');

    const pasos = Array.from(stepsWrap.querySelectorAll('.trip-step'));
    const pct = idxActual <= 0 ? 0 : (idxActual / (tripSteps.length - 1)) * 100;
    pasos.forEach((stepEl, i) => { setTimeout(() => { stepEl.classList.add('show'); }, 180 + i*220); });
    setTimeout(() => { document.getElementById('tripLineFill').style.width = pct + '%'; }, 180 + idxActual*220 + 160);
  }

  function pintarEstrellas(valor){
    const stars = document.querySelectorAll('#segRatingStars i');
    stars.forEach(st=>{
      const v = +st.dataset.v;
      st.className = (v<=valor ? 'fa-solid' : 'fa-regular') + ' fa-star' + (v<=valor?' active':'');
    });
  }

  /* ===== [FIX 3] Listeners globales de calificación: ahora la selección
     solo se previsualiza al clic/hover, y el envío real (con comentario
     incluido) solo ocurre al presionar el botón ENVIAR. Una vez enviado,
     queda bloqueado en modo solo lectura. ===== */
  document.querySelectorAll('#segRatingStars i').forEach(st=>{
    st.addEventListener('click', () => {
      if(ratingLocked) return;
      ratingSeleccionada = +st.dataset.v;
      pintarEstrellas(ratingSeleccionada);
      document.getElementById('segRatingSubmit').disabled = false;
    });
    st.addEventListener('mouseenter', () => {
      if(ratingLocked) return;
      pintarEstrellas(+st.dataset.v);
    });
  });
  document.getElementById('segRatingStars').addEventListener('mouseleave', () => {
    if(ratingLocked) return;
    pintarEstrellas(ratingSeleccionada);
  });

  document.getElementById('segRatingSubmit').addEventListener('click', () => {
    if(ratingLocked || !ratingSeleccionada) return;
    const btn = document.getElementById('segRatingSubmit');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    const codigoActual = document.getElementById('tripCodigo').textContent;
    const comentarioTexto = document.getElementById('segRatingComment').value.trim();

    fetch('/SYSTRACK/requerimiento/api/calificar/', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        codigo: codigoActual,
        calificacion: ratingSeleccionada,
        comentario: comentarioTexto || null
      })
    })
    .then(r => r.json())
    .then(resp => {
      if(resp.ok){
        // Actualiza en memoria para que el resto de la app (badges, filtros,
        // reapertura del modal, etc.) quede coherente con lo que ya se guardó.
        const reg = misRequerimientos().find(x => String(x.codigo) === String(codigoActual));
        if(reg){ reg.estado = 'Calificado'; reg.calificacion = ratingSeleccionada; reg.comentario_evaluacion = comentarioTexto || ''; }
        actualizarBell();

        showNotif('¡Gracias!', 'Tu calificación fue registrada.', 'success');

        // Repinta el modal completo (badge "Cerrado" -> "Calificado", línea de
        // tiempo con el chulito en el último paso, barra de progreso) sin
        // necesidad de cerrar y volver a abrir.
        abrirTripModal(codigoActual);

        // Si la tabla de "Solucionados" está visible detrás del modal, también
        // se refresca para que el estado quede consistente ahí.
        if (document.getElementById('screen-mis-req')?.classList.contains('active')) {
          renderMisReq();
        }
      } else {
        btn.disabled = false;
        btn.textContent = 'ENVIAR';
        showNotif('No se pudo calificar', resp.error || 'Intenta de nuevo.', 'error');
      }
    })
    .catch(() => {
      btn.disabled = false;
      btn.textContent = 'ENVIAR';
      showNotif('Error de conexión', 'Intenta de nuevo.', 'error');
    });
  });

  /* ===== SEARCHABLE DROPDOWN ===== */
  function crearSDR(wrapId, hiddenId, opciones, onChange){
    const wrap   = document.getElementById(wrapId);
    const hidden = document.getElementById(hiddenId);
    const input  = wrap.querySelector('.sdr-input');
    const drop   = wrap.querySelector('.sdr-dropdown');
    let todos    = opciones;
    let focused  = -1;

    function render(filtro=''){
      const q = filtro.toLowerCase().trim();
      const lista = q ? todos.filter(o=>o.label.toLowerCase().includes(q)) : todos;
      if(!lista.length){ drop.innerHTML = '<div class="sdr-empty">Sin resultados</div>'; return; }
      drop.innerHTML = lista.map((o,i)=>{
        const sel = o.value === hidden.value ? ' selected' : '';
        return `<div class="sdr-option${sel}" data-v="${o.value}" data-l="${o.label}" data-i="${i}">${o.label}</div>`;
      }).join('');
      drop.querySelectorAll('.sdr-option').forEach(el=>{
        el.addEventListener('mousedown', e=>{ e.preventDefault(); seleccionar(el.dataset.v, el.dataset.l); });
      });
      focused = -1;
    }

    function seleccionar(val, lbl){
      hidden.value = val;
      input.value  = lbl;
      input.dataset.selected = lbl;
      wrap.classList.remove('open');
      input.blur();
      if(typeof onChange === 'function') onChange(val);
    }

    function abrir(){
      if(wrap.classList.contains('sdr-disabled')) return;
      wrap.classList.add('open');
      render(input.value === input.dataset.selected ? '' : input.value);
    }

    input.addEventListener('focus', abrir);
    input.addEventListener('input', ()=>{ hidden.value=''; input.dataset.selected=''; render(input.value); wrap.classList.add('open'); });
    input.addEventListener('blur', ()=>{ setTimeout(()=>wrap.classList.remove('open'), 150); });
    input.addEventListener('keydown', e=>{
      const opts = drop.querySelectorAll('.sdr-option');
      if(e.key==='ArrowDown'){ e.preventDefault(); focused=Math.min(focused+1,opts.length-1); opts.forEach((o,i)=>o.classList.toggle('focused',i===focused)); opts[focused]?.scrollIntoView({block:'nearest'}); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); focused=Math.max(focused-1,0); opts.forEach((o,i)=>o.classList.toggle('focused',i===focused)); opts[focused]?.scrollIntoView({block:'nearest'}); }
      else if(e.key==='Enter' && focused>=0){ e.preventDefault(); const o=opts[focused]; if(o) seleccionar(o.dataset.v, o.dataset.l); }
      else if(e.key==='Escape'){ wrap.classList.remove('open'); input.blur(); }
    });

    wrap._sdr = {
      cargar(nuevas){ todos=nuevas; hidden.value=''; input.value=''; input.dataset.selected=''; },
      habilitar(){ wrap.classList.remove('sdr-disabled'); input.disabled=false; input.placeholder='Buscar...'; },
      deshabilitar(txt='Seleccione categoría primero...'){ wrap.classList.add('sdr-disabled'); input.disabled=true; input.placeholder=txt; hidden.value=''; input.value=''; },
      reset(){ hidden.value=''; input.value=''; input.dataset.selected=''; },
    };
  }

  async function cargarCatalogos(){
    try {
      const r    = await fetch('/SYSTRACK/requerimiento/api/catalogos/');
      const resp = await r.json();
      if(!resp.ok) return;

      const opsCO = resp.centros.map(c=>({ value: String(c.IdCo).trim(), label: c.Ciudad ? c.Descripcion+' — '+c.Ciudad : c.Descripcion }));
      if(document.getElementById('sdr_centro')?._sdr){
        document.getElementById('sdr_centro')._sdr.cargar(opsCO);
      } else {
        crearSDR('sdr_centro','f_centro', opsCO);
      }

      const opsCat = resp.categorias.map(c=>({value:String(c.IdCategoria), label:c.Descripcion}));
      if(document.getElementById('sdr_categoria')?._sdr){
        document.getElementById('sdr_categoria')._sdr.cargar(opsCat);
      } else {
        crearSDR('sdr_categoria','f_categoria', opsCat, async (idCat)=>{
          const sdrSub = document.getElementById('sdr_subcategoria');
          sdrSub._sdr.deshabilitar('Cargando...');
          try {
            const rs  = await fetch('/SYSTRACK/requerimiento/api/subcategorias/?categoria='+idCat);
            const rsj = await rs.json();
            if(rsj.ok && rsj.subcategorias.length){
              const opsSub = rsj.subcategorias.map(s=>({value:String(s.IdSubCategoria), label:s.Descripcion, prio:s.Prioridad||'Media'}));
              sdrSub._sdr.cargar(opsSub);
              sdrSub._sdr.habilitar();
            } else {
              sdrSub._sdr.cargar([]);
              sdrSub._sdr.deshabilitar('Sin subcategorías');
            }
          } catch(e){ sdrSub._sdr.deshabilitar('Error al cargar'); }
        });
      }

      if(!document.getElementById('sdr_subcategoria')?._sdr){
        crearSDR('sdr_subcategoria','f_subcategoria', []);
        document.getElementById('sdr_subcategoria')._sdr.deshabilitar();
      }

      const perfil = getPerfil();
      if(perfil.id_co){
        const idCoPerfil = String(perfil.id_co).trim();
        const co = opsCO.find(o=>o.value === idCoPerfil);
        if(co){
          document.getElementById('f_centro').value = co.value;
          document.getElementById('sdr_centro').querySelector('.sdr-input').value = co.label;
        }
      }

    } catch(e){ console.error('Error cargando catálogos:', e); }
  }

  cargarCatalogos();

  /* Mostrar nombre de archivos */
  const inputArchivos = document.getElementById('f_archivos');
  const fileInputName = document.getElementById('fileInputName');
  if(inputArchivos){
    inputArchivos.addEventListener('change', () => {
      const files = inputArchivos.files;
      if(!files.length) fileInputName.textContent = 'Ningún archivo seleccionado';
      else if(files.length === 1) fileInputName.textContent = files[0].name;
      else fileInputName.textContent = `${files.length} archivos seleccionados`;
    });
  }

  /* Submit formulario */
  const formAgregarReq = document.getElementById('formAgregarReq');
  if(formAgregarReq){
    formAgregarReq.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnEnviar = formAgregarReq.querySelector('.btn-submit');
      btnEnviar.disabled = true;
      btnEnviar.textContent = 'Enviando...';

      const perfil  = getPerfil();
      const selCat  = document.getElementById('f_categoria');
      const selSub  = document.getElementById('f_subcategoria');
      const selCO   = document.getElementById('f_centro');
      const centroInput = document.getElementById('sdr_centro')?.querySelector('.sdr-input');
      const formData = {
        cedula:             document.getElementById('f_documento').value.trim(),
        nombre_completo:    document.getElementById('f_nombre').value.trim(),
        id_cargo:           perfil.id_cargo || null,
        id_co:              selCO ? selCO.value : (perfil.id_co || null),
        co_texto:           centroInput ? centroInput.value.trim() : '',
        correo_electronico: document.getElementById('f_correo').value.trim(),
        id_categoria:       selCat ? selCat.value : null,
        id_subcategoria:    selSub ? selSub.value : null,
        descripcion:        document.getElementById('f_descripcion').value.trim(),
      };

      const archivoElegido = inputArchivos && inputArchivos.files.length ? inputArchivos.files[0] : null;

      try {
        const r    = await fetch('/SYSTRACK/requerimiento/api/crear/', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(formData)
        });
        const resp = await r.json();
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'ENVIAR';
        if(resp.ok){
          if(resp.estado === 'pendiente_aprobacion'){
            showNotif('Requerimiento ' + resp.codigo, resp.mensaje || 'Queda pendiente de aprobación por tu jefe de área.', 'success');
          } else {
            showNotif('Requerimiento ' + resp.codigo, 'Creado exitosamente.', 'success');
          }
          // Subir el adjunto (si se eligió uno) en un segundo paso — crear_requerimiento
          // recibe JSON puro y no puede llevar el archivo en la misma petición.
          if (archivoElegido) {
            const codigoNum = parseInt(String(resp.codigo).replace('REQ-', ''), 10);
            const fd = new FormData();
            fd.append('archivo', archivoElegido);
            try {
              const ra = await fetch(`/SYSTRACK/requerimiento/api/adjuntar/${codigoNum}/`, { method: 'POST', body: fd });
              const respA = await ra.json();
              if (!respA.ok) {
                showNotif('Adjunto no se pudo subir', respA.error || 'El requerimiento se creó igual, pero el archivo falló.', 'error', 6000);
              }
            } catch (eAdj) {
              showNotif('Adjunto no se pudo subir', 'El requerimiento se creó igual, pero el archivo falló por conexión.', 'error', 6000);
            }
          }
          formAgregarReq.reset();
          document.getElementById('fileInputName').textContent = 'Ningún archivo seleccionado';
          // reset() borra también los campos que se autocompletan del perfil
          // (documento, nombre, correo, cargo, centro) — se vuelven a llenar
          // aquí mismo, igual que cuando se entra a la pantalla, para no
          // tener que cambiar de menú o refrescar la página.
          precargarDocumentoEnFormulario();
          await cargarCatalogos();
          await cargarMisRequerimientos(getDocumento());
        } else if(resp.codigo_error === 'PENDIENTE_CALIFICACION'){
          showNotif('Calificación pendiente', resp.error || 'Tienes requerimientos pendientes por calificar.', 'error', 6000);
          await cargarMisRequerimientos(getDocumento());
          irASolucionadosPendientes();
        } else {
          showNotif('No se pudo crear', resp.error || 'Error al crear el requerimiento.', 'error');
        }
      } catch(err) {
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'ENVIAR';
        showNotif('Error de conexión', 'Intenta de nuevo.', 'error');
      }
    });
  }

  /* Al recargar, si ya validaron antes en esta visita, recargar requerimientos */
  (async () => {
    const doc = getDocumento();
    if(doc) await cargarMisRequerimientos(doc);
    actualizarChipsDocumento();
  })();


  /* ===== Abrir seguimiento directo desde el correo (?seg=REQ-0001) ===== */
  (function manejarLinkSeguimiento(){
    const params = new URLSearchParams(window.location.search);
    const codigoSeg = params.get('seg');
    if(!codigoSeg) return;

    function abrirSeguimientoConCodigo(){
      irAVista('seguimiento');
      segCodigoInput.value = codigoSeg;
      setTimeout(buscarRequerimiento, 300);
      window.history.replaceState({}, '', window.location.pathname);
    }

    if(getDocumento()){
      abrirSeguimientoConCodigo();
    } else {
      pedirDocumento(abrirSeguimientoConCodigo);
    }
  })();

  /* ===== PRÉSTAMO DE EQUIPOS ===== */
  let EQUIPOS = [];
  let equiposQ = '';

  async function cargarEquipos(){
    try {
      const r    = await fetch('/SYSTRACK/requerimiento/api/equipos/');
      const resp = await r.json();
      if(resp.ok){
        EQUIPOS = resp.equipos;
        renderEquiposTable();
      }
    } catch(e){
      console.error('Error cargando equipos:', e);
    }
  }

  function renderEquiposTable(){
  const q = equiposQ.toLowerCase().trim();
  const data = EQUIPOS.filter(eq =>
    !q || Object.values(eq).some(v => String(v ?? '').toLowerCase().includes(q))
  );

  const tbody = document.getElementById('equiposTableBody');
  const empty = document.getElementById('equiposEmpty');

  if(!data.length){
    tbody.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = data.map(eq => `
    <tr>
      <td>${eq.nombre}</td>
      <td>${eq.descripcion || '—'}</td>
      <td>${eq.responsable}</td>
      <td>
        <span class="equipo-badge ${eq.disponible ? 'disponible' : 'no-disponible'}">
          ${eq.estado}
        </span>
      </td>
      <td>
        ${eq.disponible
          ? `<button class="req-action-btn btn-prestar-equipo" data-id="${eq.id_equipo}" data-nombre="${eq.nombre}" title="Prestar equipo"><i class="fa-solid fa-right-left"></i></button>`
          : `<button class="req-action-btn btn-devolver-equipo" data-id="${eq.id_equipo}" data-nombre="${eq.nombre}" title="Registrar devolución"><i class="fa-solid fa-rotate-left"></i></button>`
        }
      </td>
    </tr>
  `).join('');
}

  const equiposSearchInput = document.getElementById('equiposSearch');
  if(equiposSearchInput){
    equiposSearchInput.addEventListener('input', (e) => {
      equiposQ = e.target.value;
      renderEquiposTable();
    });
  }

  /* ===== MODAL DE PRÉSTAMO DE EQUIPOS ===== */
  (function(){
    const overlay   = document.getElementById('prestarEquipoOverlay');
    const closeBtn  = document.getElementById('prestarEquipoClose');
    const form      = document.getElementById('formPrestarEquipo');
    const errorBox  = document.getElementById('prestarEquipoError');
    const submitBtn = document.getElementById('prestarEquipoSubmit');
    const cedulaInp = document.getElementById('pe_cedula');
    const nombreInp = document.getElementById('pe_nombre');
    const areaInp   = document.getElementById('pe_area');

    // ── Modal de devolución ──
    const cdOverlay  = document.getElementById('confirmarDevolucionOverlay');
    const cdClose    = document.getElementById('confirmarDevolucionClose');
    const cdCancelar = document.getElementById('confirmarDevolucionCancelar');
    const cdSubmit   = document.getElementById('confirmarDevolucionSubmit');
    const cdNombre   = document.getElementById('cdEquipoNombre');
    const cdError    = document.getElementById('confirmarDevolucionError');
    let idEquipoADevolver = null;

    function abrirModalPrestar(idEquipo, nombreEquipo){
      form.reset();
      errorBox.style.display = 'none';
      document.getElementById('pe_id_equipo').value = idEquipo;
      document.getElementById('peEquipoNombre').textContent = nombreEquipo;

      const doc    = getDocumento();
      const perfil = getPerfil();
      if(doc)              cedulaInp.value = doc;
      if(perfil.nombre)    nombreInp.value = perfil.nombre;
      if(perfil.cargo_txt) areaInp.value   = perfil.cargo_txt;

      overlay.classList.remove('hidden');
    }
    function cerrarModalPrestar(){ overlay.classList.add('hidden'); }

    function abrirModalDevolucion(idEquipo, nombreEquipo){
      idEquipoADevolver = idEquipo;
      cdNombre.textContent = nombreEquipo || 'este equipo';
      cdError.style.display = 'none';
      cdError.textContent = '';
      cdSubmit.disabled = false;
      cdSubmit.textContent = 'CONFIRMAR';
      cdOverlay.classList.remove('hidden');
    }
    function cerrarModalDevolucion(){
      cdOverlay.classList.add('hidden');
      idEquipoADevolver = null;
    }
    cdClose.addEventListener('click', cerrarModalDevolucion);
    cdCancelar.addEventListener('click', cerrarModalDevolucion);
    cdOverlay.addEventListener('click', function(e){ if(e.target === cdOverlay) cerrarModalDevolucion(); });
    cdSubmit.addEventListener('click', function(){
      if(!idEquipoADevolver) return;
      cdSubmit.disabled = true;
      cdSubmit.textContent = 'Procesando...';
      devolverEquipo(idEquipoADevolver);
    });

    document.addEventListener('click', function(e){
      const btn = e.target.closest('.btn-prestar-equipo');
      if (btn) abrirModalPrestar(btn.dataset.id, btn.dataset.nombre);

      const btnDevolver = e.target.closest('.btn-devolver-equipo');
      if (btnDevolver) abrirModalDevolucion(btnDevolver.dataset.id, btnDevolver.dataset.nombre);
    });

    closeBtn.addEventListener('click', cerrarModalPrestar);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) cerrarModalPrestar(); });

    let debounce;
    cedulaInp.addEventListener('input', function(){
      clearTimeout(debounce);
      const cedula = cedulaInp.value.trim();
      if (cedula.length < 5) return;
      debounce = setTimeout(function(){
        fetch('/SYSTRACK/requerimiento/api/validar-cedula/', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({cedula: cedula})
        })
        .then(r => r.json())
        .then(data => {
          if (data.ok) {
            nombreInp.value = data.nombre || '';
            areaInp.value   = data.cargo_txt || '';
          }
        });
      }, 400);
    });

    form.addEventListener('submit', function(e){
      e.preventDefault();
      submitBtn.disabled = true;

      fetch('/SYSTRACK/requerimiento/api/equipos/prestar/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          id_equipo: document.getElementById('pe_id_equipo').value,
          cedula: cedulaInp.value.trim(),
          nombre: nombreInp.value.trim(),
          area: areaInp.value.trim(),
          fecha_estimada_devolucion: document.getElementById('pe_fecha_devol').value || null,
          observaciones: document.getElementById('pe_observ').value.trim(),
        })
      })
      .then(r => r.json())
      .then(data => {
        submitBtn.disabled = false;
        if (!data.ok) {
          cerrarModalPrestar();
          showNotif('No se pudo prestar el equipo', data.error || 'Intenta de nuevo.', 'error');
          cargarEquipos();
          return;
        }
        cerrarModalPrestar();
        showNotif('Préstamo registrado', 'El equipo quedó asignado correctamente.', 'success');
        cargarEquipos();
      })
      .catch(() => {
        submitBtn.disabled = false;
        cerrarModalPrestar();
        showNotif('Error de conexión', 'Intenta de nuevo.', 'error');
      });
    });

    function devolverEquipo(idEquipo){
      fetch('/SYSTRACK/requerimiento/api/equipos/devolver/', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id_equipo: idEquipo})
      })
      .then(r => r.json())
      .then(data => {
        cdSubmit.disabled = false;
        cdSubmit.textContent = 'CONFIRMAR';
        if (data.ok) {
          cerrarModalDevolucion();
          showNotif('Devolución registrada', 'El equipo vuelve a estar disponible.', 'success');
          cargarEquipos();
        } else {
          cdError.textContent = data.error || 'No se pudo registrar la devolución.';
          cdError.style.display = 'block';
        }
      })
      .catch(() => {
        cdSubmit.disabled = false;
        cdSubmit.textContent = 'CONFIRMAR';
        cdError.textContent = 'Error de conexión. Intenta de nuevo.';
        cdError.style.display = 'block';
      });
    }
  })();