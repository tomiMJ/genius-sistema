/* ==========================================================
   GENIUS · panel de socios (prototipo)
   Lee y escribe en la misma "base de datos" local que el
   cotizador (GeniusDB / localStorage).
   ========================================================== */
(function () {
  'use strict';

  const D = window.GENIUS_DATOS, U = window.GeniusUtil, DB = window.GeniusDB, C = window.GeniusComun;
  const esc = U.esc, clp = U.clp;
  const CLAVE = 'genius';

  const ESTADOS = [
    ['nueva', 'Nueva'], ['en_revision', 'En revisión'], ['enviada', 'Cotización enviada'],
    ['aceptada', 'Aceptada'], ['rechazada', 'Rechazada']
  ];
  const ETAPAS = [
    ['abono', 'Abono pendiente'], ['materiales', 'Materiales'], ['ejecucion', 'En ejecución'],
    ['calidad', 'Revisión de calidad'], ['listo', 'Listo para entrega'], ['entregado', 'Entregado']
  ];
  const AVISO_ETAPA = {
    abono: 'Tu trabajo volvió a la etapa de reserva.',
    materiales: 'Recibimos tu abono. Ahora estamos preparando los materiales.',
    ejecucion: 'Empezamos a trabajar en tu vehículo.',
    calidad: 'Terminamos el trabajo y estamos haciendo la revisión de calidad.',
    listo: 'Tu vehículo está listo. Coordina con nosotros el retiro.',
    entregado: 'Entregamos tu vehículo. Gracias por confiar en Genius.'
  };
  const CHECK = ['Pulido o aplicación revisada con luz', 'Sin burbujas ni residuos', 'Interior y vidrios limpios', 'Fotos de entrega tomadas'];
  const ORIGENES = ['Voz a voz', 'Instagram', 'Google', 'Sitio web', 'Otro'];

  const st = { vista: 'panel', filtro: 'todas', busqueda: '', modal: null, hq: '', hanio: 'todos', fper: 'mes', iva: false };
  const $ = function (id) { return document.getElementById(id); };

  function nombreEstado(e) { return (ESTADOS.find(function (x) { return x[0] === e; }) || [0, e])[1]; }
  function nombreEtapa(e) { return (ETAPAS.find(function (x) { return x[0] === e; }) || [0, e])[1]; }
  function fecha(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function cliente(db, id) { return db.clientes.find(function (c) { return c.id === id; }) || { nombre: 'Cliente eliminado', telefono: '', email: '' }; }
  function solicitud(db, folio) { return db.solicitudes.find(function (s) { return s.folio === folio; }); }
  function rangoTxt(s) {
    if (s.precioFinal) return clp(s.precioFinal);
    if (!s.totalMax) return 'A evaluar';
    return clp(s.totalMin) + ' a ' + clp(s.totalMax);
  }
  function badge(e) { return '<span class="badge b-' + esc(e) + '">' + esc(nombreEstado(e)) + '</span>'; }

  function toast(msg, mal) {
    const t = document.createElement('div');
    t.className = 'toast' + (mal ? ' mal' : '');
    t.textContent = msg;
    $('toasts').appendChild(t);
    setTimeout(function () { t.classList.add('sale'); setTimeout(function () { t.remove(); }, 300); }, 3200);
  }

  /* ---------- mensajes y utilidades nuevas ---------- */
  const Msg = C.Msg;
  function nombreVeh(sol) { return sol ? (sol.vehiculo.marca + ' ' + sol.vehiculo.modelo).trim() : 'vehículo'; }
  function notificar(db, trabajo, tipo, asunto, texto) {
    const sol = solicitud(db, trabajo.folio); if (!sol) return null;
    return Msg.crear(db, { clienteId: sol.clienteId, tipo: tipo, asunto: asunto, texto: texto + Msg.firma, ref: { folio: trabajo.folio } });
  }
  function pendienteDeCobro(t) {
    if (!t.precioFinal) return null;
    if (t.etapa === 'abono' && !t.abonoPagado) return 'abono';
    if ((t.etapa === 'listo' || t.etapa === 'entregado') && !t.saldoPagado) return 'saldo';
    return null;
  }
  function montoCobro(t, tipo) {
    const abono = Math.round((t.precioFinal || 0) * t.abonoPct / 100);
    return tipo === 'abono' ? abono : (t.precioFinal || 0) - abono;
  }
  function descargarCSV(nombre, filas) {
    const csv = '\ufeff' + filas.map(function (f) {
      return f.map(function (c) { c = String(c == null ? '' : c); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';');
    }).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function btnExcel(db, id) { return db.ajustes && db.ajustes.excel ? '<button class="btn-sec" id="' + id + '">Descargar para Excel</button>' : ''; }
  const TIPO_MSG = { etapa: 'Etapa', avance: 'Avance', mantencion: 'Mantención', cobro: 'Cobro', documento: 'Documento', fecha: 'Fecha de entrega', general: 'Mensaje' };

  /* ---------- acceso de prueba ---------- */
  function logueado() { try { return sessionStorage.getItem('genius_admin') === '1'; } catch (e) { return false; } }
  function iniciar() {
    if (logueado()) { $('login').hidden = true; $('app').hidden = false; const db = DB.get(); if (Msg.generarMantenciones(db)) DB.save(db); pintar(); }
    else { $('login').hidden = false; $('app').hidden = true; }
  }

  /* ---------- lateral ---------- */
  function lateral(db) {
    const nuevas = db.solicitudes.filter(function (s) { return s.estado === 'nueva'; }).length;
    const pendMsg = (db.notificaciones || []).filter(function (n) { return !n.enviada.correo && !n.enviada.wa; }).length;
    const items = [['panel', 'Panel', 0], ['cotizaciones', 'Cotizaciones', nuevas], ['clientes', 'Clientes', 0], ['trabajos', 'Trabajos', 0], ['historial', 'Historial', 0], ['mensajes', 'Mensajes', pendMsg], ['finanzas', 'Finanzas', 0], ['documentos', 'Documentos', 0], ['catalogo', 'Catálogo y precios', 0]];
    let h = '<img class="marca-logo" src="img/logo-genius.png" alt="Genius"><nav>';
    items.forEach(function (i) {
      h += '<button class="nav-btn' + (st.vista === i[0] ? ' act' : '') + '" data-vista="' + i[0] + '"><span>' + i[1] + '</span>' +
        (i[2] ? '<span class="cnt">' + i[2] + '</span>' : '') + '</button>';
    });
    h += '</nav><div class="nav-sep">Próximas fases</div>';
    [['Pagos', 'Fase 3'], ['Materiales y proveedores', 'Fase 3'], ['Calendario', 'Fase 3'], ['Reportes', 'Fase 5']].forEach(function (x) {
      h += '<div class="nav-off"><span>' + x[0] + '</span><i>' + x[1] + '</i></div>';
    });
    h += '<div class="pie"><a href="index.html" target="_blank" rel="noopener">Ver cotizador de clientes</a><button type="button" id="btnSalir">Cerrar sesión</button></div>';
    $('lateral').innerHTML = h;
  }

  /* ---------- panel ---------- */
  function vistaPanel(db) {
    const sol = db.solicitudes;
    const nuevas = sol.filter(function (s) { return s.estado === 'nueva'; }).length;
    const pend = sol.filter(function (s) { return s.estado === 'enviada'; }).length;
    const curso = db.trabajos.filter(function (t) { return t.etapa !== 'entregado'; }).length;
    const resueltas = sol.filter(function (s) { return s.estado === 'aceptada' || s.estado === 'rechazada'; });
    const conv = resueltas.length ? Math.round(100 * resueltas.filter(function (s) { return s.estado === 'aceptada'; }).length / resueltas.length) + '%' : 'sin datos';
    const max = Math.max.apply(null, ESTADOS.map(function (e) { return sol.filter(function (s) { return s.estado === e[0]; }).length; }).concat([1]));

    let h = '<header><div><h1>Panel</h1><p>Resumen de la operación</p></div></header><div class="kpis">' +
      kpi(nuevas, 'Solicitudes nuevas') + kpi(pend, 'Esperando respuesta del cliente') + kpi(curso, 'Trabajos en curso') +
      kpi(curso + ' de ' + D.capacidadMensual, 'Capacidad del mes') + kpi(conv, 'Cotizaciones aceptadas') + '</div>';
    h += '<div class="dos-col"><div class="card"><h3>Cotizaciones por estado</h3>';
    ESTADOS.forEach(function (e) {
      const n = sol.filter(function (s) { return s.estado === e[0]; }).length;
      h += '<div class="barra-fila"><span>' + e[1] + '</span><div class="barra"><i style="width:' + (100 * n / max) + '%"></i></div><b>' + n + '</b></div>';
    });
    h += '</div><div class="card"><h3>Últimas solicitudes</h3>';
    const ult = sol.slice().sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); }).slice(0, 5);
    h += ult.length ? '<table>' : '<p class="vacio">Aún no hay solicitudes.</p>';
    ult.forEach(function (s) {
      h += '<tr class="click" data-sol="' + esc(s.folio) + '"><td><b>' + esc(s.folio) + '</b><br><span class="mute">' + esc(cliente(db, s.clienteId).nombre) + '</span></td><td>' +
        esc(s.vehiculo.marca + ' ' + s.vehiculo.modelo) + '</td><td>' + badge(s.estado) + '</td></tr>';
    });
    if (ult.length) h += '</table>';
    h += '</div></div>';
    const cobrar = db.trabajos.map(function (t) { return { t: t, tipo: pendienteDeCobro(t) }; }).filter(function (x) { return x.tipo; });
    h += '<div class="card" style="margin-top:16px"><h3>Por cobrar</h3>' + (cobrar.length ? '<table>' + cobrar.map(function (x) {
      const sol = solicitud(db, x.t.folio), ult = (x.t.cobros || [])[(x.t.cobros || []).length - 1];
      return '<tr><td><b>' + esc(x.t.folio) + '</b><br><span class="mute">' + esc(sol ? cliente(db, sol.clienteId).nombre : '') + '</span></td><td>' + esc(nombreVeh(sol)) + '</td><td>' + (x.tipo === 'abono' ? 'Abono' : 'Saldo') + ': <b>' + esc(clp(montoCobro(x.t, x.tipo))) + '</b> + IVA</td>' +
        '<td>' + (ult ? '<span class="mute">Recordado ' + fecha(ult.fecha) + '</span>' : '') + '</td><td><button class="btn-sec btn-chico" data-cobro="' + esc(x.t.id) + '|' + x.tipo + '">Recordar cobro</button></td></tr>';
    }).join('') + '</table>' : '<p class="mute">No hay abonos ni saldos pendientes de cobro.</p>') + '</div>';
    return h;
  }
  function kpi(v, t) { return '<div class="kpi"><b>' + esc(v) + '</b><span>' + esc(t) + '</span></div>'; }

  /* ---------- cotizaciones ---------- */
  function filasCot(db) {
    const q = st.busqueda.trim().toLowerCase();
    const lista = db.solicitudes.filter(function (s) {
      if (st.filtro !== 'todas' && s.estado !== st.filtro) return false;
      if (!q) return true;
      const c = cliente(db, s.clienteId);
      return (s.folio + ' ' + c.nombre + ' ' + c.telefono + ' ' + s.vehiculo.marca + ' ' + s.vehiculo.modelo).toLowerCase().indexOf(q) >= 0;
    }).sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
    if (!lista.length) return '<div class="vacio">No hay cotizaciones con ese filtro. Prueba con otro estado o borra la búsqueda.</div>';
    let h = '<table><thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Vehículo</th><th>Servicios</th><th>Valor</th><th>Estado</th></tr></thead><tbody>';
    lista.forEach(function (s) {
      h += '<tr class="click" data-sol="' + esc(s.folio) + '"><td><b>' + esc(s.folio) + '</b></td><td>' + fecha(s.fecha) + '</td><td>' + esc(cliente(db, s.clienteId).nombre) +
        '</td><td>' + esc(s.vehiculo.marca + ' ' + s.vehiculo.modelo) + '</td><td>' + esc(s.items.map(function (i) { return i.nombre; }).join(', ')) +
        '</td><td>' + esc(rangoTxt(s)) + '</td><td>' + badge(s.estado) + '</td></tr>';
    });
    return h + '</tbody></table>';
  }
  function vistaCot(db) {
    let h = '<header><div><h1>Cotizaciones</h1><p>Solicitudes que llegan desde el cotizador</p></div></header><div class="herr">';
    [['todas', 'Todas']].concat(ESTADOS).forEach(function (e) {
      const n = e[0] === 'todas' ? db.solicitudes.length : db.solicitudes.filter(function (s) { return s.estado === e[0]; }).length;
      h += '<button class="chip' + (st.filtro === e[0] ? ' act' : '') + '" data-filtro="' + e[0] + '">' + e[1] + ' (' + n + ')</button>';
    });
    h += '<input type="search" class="buscar" id="buscar" placeholder="Buscar por folio, cliente o vehículo" value="' + esc(st.busqueda) + '"></div>' +
      '<div class="tabla-wrap" id="tabla">' + filasCot(db) + '</div>';
    return h;
  }

  function modalSol(db, folio) {
    const s = solicitud(db, folio);
    if (!s) return '';
    const c = cliente(db, s.clienteId);
    const wa = U.telefonoWA(c.telefono);
    const car = U.carroceria(s.vehiculo.carroceria);
    let h = '<div class="modal-cab"><div><h2>' + esc(s.folio) + '</h2><p class="mute">' + fecha(s.fecha) + ' · ' + badge(s.estado) + '</p></div><button class="cerrar" data-cerrar aria-label="Cerrar">×</button></div>';
    h += '<div class="grid2"><div><b>' + esc(c.nombre) + '</b><br>' + esc(c.telefono) + (c.email ? '<br>' + esc(c.email) : '') + '</div>' +
      '<div><b>' + esc(s.vehiculo.marca + ' ' + s.vehiculo.modelo) + '</b>' + (s.vehiculo.patente ? ' · ' + esc(s.vehiculo.patente) : '') + '<br>' + esc(car ? car.nombre : s.vehiculo.carroceria) + ' · atención ' + esc(s.modalidad) + '</div></div>';
    h += '<div class="sec"><h3>Servicios pedidos</h3><table class="lineas"><thead><tr><th>Servicio</th><th>Detalle</th><th>Rango</th></tr></thead><tbody>';
    s.items.forEach(function (i) {
      h += '<tr><td>' + esc(i.nombre) + '</td><td>' + esc(i.detalle) + '</td><td>' + (i.evaluacion ? 'A evaluar' : esc(clp(i.min) + ' a ' + clp(i.max))) + '</td></tr>';
    });
    h += '</tbody></table><p><b>Rango total: ' + esc(s.totalMax ? clp(s.totalMin) + ' a ' + clp(s.totalMax) + ' + IVA' : 'A evaluar') + '</b></p></div>';
    if (s.comentario || (s.fotos && s.fotos.length)) {
      h += '<div class="sec"><h3>Comentario y fotos del cliente</h3>' + (s.comentario ? '<p>' + esc(s.comentario) + '</p>' : '') +
        (s.fotos && s.fotos.length ? C.miniaturas(s.fotos) + '<p class="mute">Toca una foto para verla en grande.</p>' : '') + '</div>';
    }
    h += '<div class="sec"><h3>Respuesta de Genius</h3><div class="grid2"><label>Precio final (CLP)<input type="number" id="mPrecio" min="0" step="1000" value="' + (s.precioFinal || '') + '"></label>' +
      '<label>Estado<select id="mEstado">' + ESTADOS.map(function (e) { return '<option value="' + e[0] + '"' + (s.estado === e[0] ? ' selected' : '') + '>' + e[1] + '</option>'; }).join('') + '</select></label></div>' +
      '<label>Motivo del ajuste (obligatorio si defines precio final)<input type="text" id="mMotivo" value="' + esc(s.motivoAjuste) + '" placeholder="Ej: daño adicional, descuento por cliente recurrente"></label>' +
      '<p class="error" id="mError" hidden></p></div>';
    h += '<div class="sec"><h3>Historial</h3><ul class="hist">' + s.historial.map(function (x) { return '<li>' + fecha(x.fecha) + ': ' + esc(x.texto) + '</li>'; }).join('') + '</ul></div>';
    const msg = 'Hola ' + c.nombre.split(' ')[0] + ', te escribimos de Genius por tu cotización ' + s.folio + '.';
    h += '<div class="acciones">' + (wa ? '<a class="btn-sec" target="_blank" rel="noopener" href="https://wa.me/' + wa + '?text=' + encodeURIComponent(msg) + '">Escribir por WhatsApp</a>' : '') +
      '<a class="btn-sec" href="documento.html?tipo=cotizacion&folio=' + encodeURIComponent(s.folio) + '">Crear cotización en PDF</a><button class="btn-sec" data-cerrar>Cerrar</button><button class="btn" id="mGuardar" data-folio="' + esc(s.folio) + '">Guardar cambios</button></div>';
    return h;
  }

  function guardarSol(folio) {
    const db = DB.get();
    const s = solicitud(db, folio);
    const precio = parseInt($('mPrecio').value, 10) || null;
    const motivo = $('mMotivo').value.trim();
    const estado = $('mEstado').value;
    const err = $('mError');
    function falla(t) { err.textContent = t; err.hidden = false; }
    if (precio && !motivo) return falla('Escribe el motivo del ajuste para guardar el precio final.');
    if (estado === 'aceptada' && !precio) return falla('Para marcar como aceptada, define el precio final acordado.');
    const ahora = new Date().toISOString();
    if (estado !== s.estado) {
      s.historial.push({ fecha: ahora, texto: 'Estado: ' + nombreEstado(s.estado) + ' a ' + nombreEstado(estado) });
      if (estado === 'aceptada' && !db.trabajos.some(function (t) { return t.folio === s.folio; })) {
        db.trabajos.push({
          id: 't' + Date.now(), folio: s.folio, etapa: 'abono', precioFinal: precio, abonoPct: 50, abonoPagado: false,
          materialesPedidos: false, apoyoExterno: false, apoyoDetalle: '', checklist: [false, false, false, false],
          saldoPagado: false, notas: '', fechaInicio: ahora, fechaEntrega: null, pagos: [],
          actualizaciones: [{ id: 'a' + Date.now(), fecha: ahora, texto: 'Aceptamos tu cotización. Estamos esperando el abono para reservar tu cupo.', fotos: [], etapa: 'abono' }]
        });
        s.historial.push({ fecha: ahora, texto: 'Se creó el trabajo en etapa Abono pendiente' });
      }
      s.estado = estado;
    }
    if (precio !== s.precioFinal) s.historial.push({ fecha: ahora, texto: precio ? 'Precio final definido: ' + clp(precio) : 'Precio final eliminado' });
    s.precioFinal = precio;
    s.motivoAjuste = motivo;
    db.trabajos.forEach(function (t) { if (t.folio === s.folio && precio) t.precioFinal = precio; });
    DB.save(db);
    cerrarModal();
    toast('Cotización ' + s.folio + ' guardada');
    pintar();
  }

  /* ---------- clientes ---------- */
  function vistaClientes(db) {
    let h = '<header><div><h1>Clientes</h1><p>' + db.clientes.length + ' registrados</p></div>' + btnExcel(db, 'xClientes') + '</header><div class="tabla-wrap">';
    if (!db.clientes.length) return h + '<div class="vacio">Aún no hay clientes. Se crean solos cuando alguien envía una cotización.</div></div>';
    h += '<table><thead><tr><th>Nombre</th><th>RUT</th><th>Contacto</th><th>Origen</th><th>Cotizaciones</th><th>Trabajos</th></tr></thead><tbody>';
    db.clientes.forEach(function (c) {
      const sols = db.solicitudes.filter(function (s) { return s.clienteId === c.id; });
      const tr = db.trabajos.filter(function (t) { return sols.some(function (s) { return s.folio === t.folio; }); });
      h += '<tr class="click" data-cli="' + esc(c.id) + '"><td><b>' + esc(c.nombre) + '</b></td><td>' + esc(c.rut ? U.rutFormato(c.rut) : '') + '</td><td>' + esc(c.telefono) + (c.email ? '<br><span class="mute">' + esc(c.email) + '</span>' : '') +
        '</td><td>' + esc(c.origen || '') + '</td><td>' + sols.length + '</td><td>' + tr.length + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }
  function modalCli(db, id) {
    const c = db.clientes.find(function (x) { return x.id === id; });
    if (!c) return '';
    const sols = db.solicitudes.filter(function (s) { return s.clienteId === id; });
    const wa = U.telefonoWA(c.telefono);
    let h = '<div class="modal-cab"><div><h2>' + esc(c.nombre) + '</h2><p class="mute">' + (c.rut ? esc(U.rutFormato(c.rut)) + ' · ' : '') + esc(c.telefono) + (c.email ? ' · ' + esc(c.email) : '') + '</p></div><button class="cerrar" data-cerrar aria-label="Cerrar">×</button></div>';
    h += '<div class="grid2"><label>¿Cómo nos conoció?<select id="cOrigen">' + ORIGENES.concat(ORIGENES.indexOf(c.origen) < 0 && c.origen ? [c.origen] : []).map(function (o) {
      return '<option' + (o === c.origen ? ' selected' : '') + '>' + esc(o) + '</option>';
    }).join('') + '</select></label></div><label>Notas internas<textarea id="cNotas">' + esc(c.notas || '') + '</textarea></label>';
    h += '<div class="sec"><h3>Historial</h3>' + (sols.length ? '<table class="lineas">' + sols.map(function (s) {
      return '<tr><td><b>' + esc(s.folio) + '</b></td><td>' + esc(s.vehiculo.marca + ' ' + s.vehiculo.modelo) + '</td><td>' + esc(rangoTxt(s)) + '</td><td>' + badge(s.estado) + '</td></tr>';
    }).join('') + '</table>' : '<p class="mute">Todavía no tiene cotizaciones.</p>') + '</div>';
    h += '<div class="acciones">' + (wa ? '<a class="btn-sec" target="_blank" rel="noopener" href="https://wa.me/' + wa + '">Escribir por WhatsApp</a>' : '') +
      '<button class="btn-sec" data-cerrar>Cerrar</button><button class="btn" id="cGuardar" data-id="' + esc(id) + '">Guardar</button></div>';
    return h;
  }

  /* ---------- trabajos ---------- */
  function vistaTrabajos(db) {
    let h = '<header><div><h1>Trabajos</h1><p>Seguimiento desde el abono hasta la entrega. Capacidad del mes: ' + D.capacidadMensual + ' trabajos.</p></div></header><div class="kanban">';
    ETAPAS.forEach(function (e, idx) {
      const lista = db.trabajos.filter(function (t) {
        if (t.etapa !== e[0]) return false;
        return e[0] !== 'entregado' || (Date.now() - new Date(t.fechaEntrega || 0)) < 30 * 86400000;
      });
      h += '<section class="col"><h3><span>' + e[1] + '</span><span>' + lista.length + '</span></h3>';
      lista.forEach(function (t) {
        const s = solicitud(db, t.folio);
        h += '<div class="tarjeta" data-trab="' + esc(t.id) + '"><b>' + esc(t.folio) + '</b><span>' + esc(s ? cliente(db, s.clienteId).nombre : '') + '</span><div class="mini">' +
          esc(s ? s.vehiculo.marca + ' ' + s.vehiculo.modelo : '') + '<br>' + esc(clp(t.precioFinal || 0)) + (t.apoyoExterno ? ' · con apoyo externo' : '') + '</div>' +
          '<div class="mover"><button class="btn-sec btn-chico" data-mover="' + esc(t.id) + '" data-dir="-1"' + (idx === 0 ? ' disabled' : '') + ' aria-label="Etapa anterior">←</button>' +
          '<button class="btn-sec btn-chico" data-mover="' + esc(t.id) + '" data-dir="1"' + (idx === ETAPAS.length - 1 ? ' disabled' : '') + ' aria-label="Etapa siguiente">→</button></div></div>';
      });
      if (!lista.length) h += '<p class="mute" style="padding:6px">Sin trabajos</p>';
      if (e[0] === 'entregado') h += '<p class="mute" style="padding:6px;font-size:.82rem">Aquí van los últimos 30 días. Todos están en Historial.</p>';
      h += '</section>';
    });
    return h + '</div>';
  }
  function requisito(t, destino) {
    if (destino === 'materiales' && !t.abonoPagado) return 'Registra el abono pagado antes de pasar a Materiales.';
    if (destino === 'ejecucion' && !t.materialesPedidos) return 'Marca los materiales como pedidos antes de pasar a ejecución.';
    if (destino === 'listo' && !t.checklist.every(Boolean)) return 'Completa el checklist de calidad antes de dejarlo listo para entrega.';
    if (destino === 'entregado' && !t.saldoPagado) return 'Registra el saldo pagado antes de marcar como entregado.';
    return '';
  }
  function mover(id, dir) {
    const db = DB.get();
    const t = db.trabajos.find(function (x) { return x.id === id; });
    const i = ETAPAS.findIndex(function (e) { return e[0] === t.etapa; });
    const n = ETAPAS[i + dir];
    if (!n) return;
    if (dir > 0) { const r = requisito(t, n[0]); if (r) return toast(r, true); }
    t.etapa = n[0];
    t.fechaEntrega = n[0] === 'entregado' ? new Date().toISOString() : null;
    flipAntes = capturarTarjetas();
    t.actualizaciones = t.actualizaciones || [];
    t.actualizaciones.push({ id: 'a' + Date.now(), fecha: new Date().toISOString(), texto: AVISO_ETAPA[n[0]], fotos: [], etapa: n[0] });
    notificar(db, t, 'etapa', 'Tu ' + nombreVeh(solicitud(db, t.folio)) + ' avanzó de etapa', AVISO_ETAPA[n[0]]);
    DB.save(db);
    toast(t.folio + ' pasó a ' + n[1]);
    pintar();
  }
  function modalTrab(db, id) {
    const t = db.trabajos.find(function (x) { return x.id === id; });
    if (!t) return '';
    const s = solicitud(db, t.folio);
    const abono = Math.round((t.precioFinal || 0) * t.abonoPct / 100);
    let h = '<div class="modal-cab"><div><h2>' + esc(t.folio) + '</h2><p class="mute">' + esc(s ? cliente(db, s.clienteId).nombre + ' · ' + s.vehiculo.marca + ' ' + s.vehiculo.modelo : '') + ' · ' + esc(nombreEtapa(t.etapa)) + '</p></div><button class="cerrar" data-cerrar aria-label="Cerrar">×</button></div>';
    h += '<div class="grid2"><div><b>Precio final: ' + esc(clp(t.precioFinal || 0)) + '</b></div><label>Porcentaje de abono<select id="tPct">' +
      [50, 60, 70].map(function (p) { return '<option value="' + p + '"' + (t.abonoPct === p ? ' selected' : '') + '>' + p + '% (' + esc(clp((t.precioFinal || 0) * p / 100)) + ')</option>'; }).join('') + '</select></label></div>';
    h += '<p class="mute">Abono de ' + esc(clp(abono)) + ' · saldo de ' + esc(clp((t.precioFinal || 0) - abono)) + '</p>';
    const pc = pendienteDeCobro(t);
    h += '<div class="grid2"><label>Fecha estimada de entrega (la ve el cliente)<input type="date" id="tFest" value="' + esc(t.fechaEstimada || '') + '"></label>' +
      (pc ? '<div class="cobro-caja"><b>' + (pc === 'abono' ? 'Abono' : 'Saldo') + ' pendiente: ' + esc(clp(montoCobro(t, pc))) + ' + IVA</b><button class="btn-sec btn-chico" data-cobro="' + esc(t.id) + '|' + pc + '">Recordar cobro al cliente</button>' +
        ((t.cobros || []).length ? '<span class="mute">Último recordatorio: ' + fecha(t.cobros[t.cobros.length - 1].fecha) + '</span>' : '') + '</div>' : '<div></div>') + '</div>';
    h += '<div class="sec"><h3>Control</h3><div style="display:grid;gap:8px">' +
      chk('tAbono', t.abonoPagado, 'Abono pagado') + chk('tMat', t.materialesPedidos, 'Materiales pedidos') + chk('tApoyo', t.apoyoExterno, 'Requiere apoyo externo (por ejemplo, desarmar piezas grandes)') +
      '<label>Detalle del apoyo externo<input type="text" id="tApoyoDet" value="' + esc(t.apoyoDetalle) + '"></label>' + chk('tSaldo', t.saldoPagado, 'Saldo pagado') + '</div></div>';
    h += '<div class="sec"><h3>Revisión de calidad</h3><div style="display:grid;gap:8px">' + CHECK.map(function (x, i) { return chk('tCk' + i, t.checklist[i], x); }).join('') + '</div></div>';
    h += '<label>Notas internas (el cliente no las ve)<textarea id="tNotas">' + esc(t.notas) + '</textarea></label>';
    h += '<div class="sec"><h3>Avances para el cliente</h3><p class="mute">Lo que publiques aquí lo ve el cliente en su cuenta, con las fotos.</p>' +
      '<label>Mensaje rápido<select id="avPlantilla"><option value="">Elegir una plantilla…</option>' + (db.plantillasMsg || []).map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.titulo) + '</option>'; }).join('') + '</select></label>' +
      '<label>Mensaje<textarea id="avTexto" placeholder="Ej: Ya instalamos el film en el capó y los parachoques"></textarea></label>' +
      '<label>Fotos (hasta 6)<input type="file" id="avFotos" accept="image/*" multiple></label><div id="avPrev"></div>' +
      '<button class="btn-sec" id="avPublicar" data-id="' + esc(id) + '">Publicar avance</button>' +
      '<div style="margin-top:12px">' + (t.actualizaciones || []).slice().sort(function (x, y) { return new Date(y.fecha) - new Date(x.fecha); }).map(function (u) {
        return '<div style="border-top:1px solid var(--line);padding:8px 0"><div class="mute">' + fecha(u.fecha) + ' <button class="link-btn" data-delav="' + esc(id) + '|' + esc(u.id) + '">Quitar</button></div>' + esc(u.texto) + C.miniaturas(u.fotos) + '</div>';
      }).join('') + '</div></div>';
    h += '<div class="sec"><h3>Pagos registrados</h3>' + ((t.pagos || []).length ? '<table class="lineas">' + t.pagos.map(function (p) {
      return '<tr><td>' + fecha(p.fecha) + '</td><td>' + (p.tipo === 'abono' ? 'Abono' : 'Saldo') + '</td><td>' + esc(clp(p.monto)) + ' + IVA</td></tr>';
    }).join('') + '</table>' : '<p class="mute">Todavía no hay pagos. Se registran al marcar abono o saldo como pagado.</p>') + '</div>';
    h += '<div class="acciones"><a class="btn-sec" href="documento.html?tipo=certificado&trabajo=' + encodeURIComponent(id) + '">Crear certificado</a><button class="btn-sec" data-cerrar>Cerrar</button><button class="btn" id="tGuardar" data-id="' + esc(id) + '">Guardar</button></div>';
    return h;
  }
  // El abono y el saldo marcados como pagados quedan registrados como ingresos
  function syncPagos(t) {
    t.pagos = t.pagos || [];
    const precio = t.precioFinal || 0, abono = Math.round(precio * t.abonoPct / 100);
    [['abono', t.abonoPagado, abono], ['saldo', t.saldoPagado, precio - abono]].forEach(function (x) {
      const i = t.pagos.findIndex(function (p) { return p.tipo === x[0]; });
      if (x[1] && i === -1) t.pagos.push({ fecha: new Date().toISOString(), monto: x[2], tipo: x[0] });
      else if (x[1] && i !== -1) t.pagos[i].monto = x[2];
      else if (!x[1] && i !== -1) t.pagos.splice(i, 1);
    });
  }
  function chk(id, v, txt) { return '<label class="fila-check"><input type="checkbox" id="' + id + '"' + (v ? ' checked' : '') + '>' + esc(txt) + '</label>'; }



  /* ---------- historial de entregados ---------- */
  function entregados(db) {
    return db.trabajos.filter(function (t) { return t.etapa === 'entregado'; }).map(function (t) { return { t: t, s: solicitud(db, t.folio) }; })
      .filter(function (x) { return x.s; }).sort(function (a, b) { return new Date(b.t.fechaEntrega) - new Date(a.t.fechaEntrega); });
  }
  function filasHist(db) {
    const q = st.hq.trim().toLowerCase();
    const lista = entregados(db).filter(function (x) {
      if (st.hanio !== 'todos' && String(new Date(x.t.fechaEntrega).getFullYear()) !== st.hanio) return false;
      if (!q) return true;
      const c = cliente(db, x.s.clienteId);
      return (x.s.folio + ' ' + c.nombre + ' ' + (c.rut || '') + ' ' + x.s.vehiculo.marca + ' ' + x.s.vehiculo.modelo + ' ' + (x.s.vehiculo.patente || '') + ' ' + x.s.items.map(function (i) { return i.nombre; }).join(' ')).toLowerCase().indexOf(q) >= 0;
    });
    if (!lista.length) return '<div class="vacio">No hay vehículos entregados con ese filtro.</div>';
    let h = '<table><thead><tr><th>Entrega</th><th>Folio</th><th>Cliente</th><th>Vehículo</th><th>Servicios</th><th>Valor</th><th>Días</th></tr></thead><tbody>';
    lista.forEach(function (x) {
      const dias = Math.max(1, Math.round((new Date(x.t.fechaEntrega) - new Date(x.t.fechaInicio)) / 86400000));
      h += '<tr class="click" data-trab="' + esc(x.t.id) + '"><td>' + fecha(x.t.fechaEntrega) + '</td><td><b>' + esc(x.s.folio) + '</b></td><td>' + esc(cliente(db, x.s.clienteId).nombre) + '</td><td>' +
        esc(x.s.vehiculo.marca + ' ' + x.s.vehiculo.modelo) + (x.s.vehiculo.patente ? '<br><span class="mute">' + esc(x.s.vehiculo.patente) + '</span>' : '') + '</td><td>' +
        esc(x.s.items.map(function (i) { return i.nombre; }).join(', ')) + '</td><td>' + esc(clp(x.t.precioFinal || 0)) + '</td><td>' + dias + '</td></tr>';
    });
    return h + '</tbody></table>';
  }
  function vistaHistorial(db) {
    const todos = entregados(db);
    const anios = Array.from(new Set(todos.map(function (x) { return String(new Date(x.t.fechaEntrega).getFullYear()); }))).sort().reverse();
    let h = '<header><div><h1>Historial</h1><p>' + todos.length + ' vehículos entregados. Toca uno para ver sus avances y fotos.</p></div></header><div class="herr">';
    ['todos'].concat(anios).forEach(function (a) { h += '<button class="chip' + (st.hanio === a ? ' act' : '') + '" data-hanio="' + a + '">' + (a === 'todos' ? 'Todos' : a) + '</button>'; });
    h += '<input type="search" class="buscar" id="buscarH" placeholder="Buscar por cliente, RUT, vehículo o servicio" value="' + esc(st.hq) + '"></div><div class="tabla-wrap" id="tablaH">' + filasHist(db) + '</div>';
    return h;
  }

  /* ---------- finanzas ---------- */
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function lunes(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function inicioPeriodo(per, d, desplaza) {
    if (per === 'semana') { const x = lunes(d); x.setDate(x.getDate() + 7 * desplaza); return x; }
    if (per === 'mes') return new Date(d.getFullYear(), d.getMonth() + desplaza, 1);
    return new Date(d.getFullYear() + desplaza, 0, 1);
  }
  function finPeriodo(per, ini) {
    if (per === 'semana') { const x = new Date(ini); x.setDate(x.getDate() + 7); return x; }
    if (per === 'mes') return new Date(ini.getFullYear(), ini.getMonth() + 1, 1);
    return new Date(ini.getFullYear() + 1, 0, 1);
  }
  function corto(n) {
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1).replace('.', ',') + ' M';
    if (n >= 1000) return '$' + Math.round(n / 1000) + ' mil';
    return '$' + Math.round(n);
  }
  function pagosLista(db) {
    const r = [];
    db.trabajos.forEach(function (t) { (t.pagos || []).forEach(function (p) { r.push({ f: new Date(p.fecha), monto: p.monto, tipo: p.tipo, folio: t.folio }); }); });
    return r;
  }
  function sumar(pagos, a, b) { return pagos.reduce(function (s, p) { return p.f >= a && p.f < b ? s + p.monto : s; }, 0); }
  function vistaFinanzas(db) {
    const k = st.iva ? 1.19 : 1, ahora = new Date(), pagos = pagosLista(db);
    function m(n) { return clp(n * k); }
    const per = st.fper;
    const nombres = { semana: ['Esta semana', 'Semana pasada'], mes: ['Este mes', 'Mes pasado'], anio: ['Este año', 'Año pasado'] };
    let h = '<header><div><h1>Finanzas</h1><p>Ingresos recibidos (abonos y saldos pagados). ' + (st.iva ? 'Valores con IVA 19%.' : 'Valores netos, sin IVA.') + '</p></div>' +
      '<div class="acciones">' + btnExcel(db, 'xFinanzas') + '<label class="fila-check"><input type="checkbox" id="chkIva"' + (st.iva ? ' checked' : '') + '> Mostrar con IVA</label></div></header><div class="kpis">';
    ['semana', 'mes', 'anio'].forEach(function (p) {
      const ini = inicioPeriodo(p, ahora, 0), ant = inicioPeriodo(p, ahora, -1);
      const act = sumar(pagos, ini, finPeriodo(p, ini)), prev = sumar(pagos, ant, finPeriodo(p, ant));
      h += '<div class="kpi"><span>' + nombres[p][0] + '</span><b>' + esc(m(act)) + '</b><span>' + nombres[p][1] + ': ' + esc(m(prev)) + '</span></div>';
    });
    const porCobrar = db.trabajos.filter(function (t) { return t.etapa !== 'entregado'; }).reduce(function (s, t) { return s + Math.max(0, (t.precioFinal || 0) - (t.pagos || []).reduce(function (a, p) { return a + p.monto; }, 0)); }, 0);
    const anioIni = inicioPeriodo('anio', ahora, 0);
    const entAnio = db.trabajos.filter(function (t) { return t.etapa === 'entregado' && new Date(t.fechaEntrega) >= anioIni; });
    h += '<div class="kpi"><span>Por cobrar (trabajos en curso)</span><b>' + esc(m(porCobrar)) + '</b><span>Saldos y abonos pendientes</span></div>' +
      '<div class="kpi"><span>Ticket promedio del año</span><b>' + esc(entAnio.length ? m(entAnio.reduce(function (s, t) { return s + (t.precioFinal || 0); }, 0) / entAnio.length) : '$0') + '</b><span>' + entAnio.length + ' trabajos entregados</span></div></div>';

    // gráfico
    const cols = [];
    if (per === 'semana') for (let i = -11; i <= 0; i++) { const ini = inicioPeriodo('semana', ahora, i); cols.push({ ini: ini, et: ini.getDate() + '/' + (ini.getMonth() + 1) }); }
    else if (per === 'mes') for (let i = -11; i <= 0; i++) { const ini = inicioPeriodo('mes', ahora, i); cols.push({ ini: ini, et: MESES[ini.getMonth()] + (ini.getMonth() === 0 || i === -11 ? ' ' + String(ini.getFullYear()).slice(2) : '') }); }
    else { const y0 = Math.min.apply(null, pagos.map(function (p) { return p.f.getFullYear(); }).concat([ahora.getFullYear() - 1])); for (let y = y0; y <= ahora.getFullYear(); y++) cols.push({ ini: new Date(y, 0, 1), et: String(y) }); }
    cols.forEach(function (c) { c.v = sumar(pagos, c.ini, finPeriodo(per, c.ini)) * k; });
    const max = Math.max.apply(null, cols.map(function (c) { return c.v; }).concat([1]));
    const paso = Math.pow(10, Math.floor(Math.log10(max))), tope = Math.ceil(max / paso) * paso;
    const W = 640, H = 250, ml = 56, mb = 28, mt = 12, aw = W - ml - 8, ah = H - mb - mt, bw = aw / cols.length;
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Ingresos por ' + (per === 'anio' ? 'año' : per) + '" style="width:100%;min-width:480px;height:auto">';
    for (let i = 0; i <= 4; i++) {
      const y = mt + ah - ah * i / 4;
      svg += '<line x1="' + ml + '" x2="' + (W - 8) + '" y1="' + y + '" y2="' + y + '" stroke="#D3DDE0" stroke-width="1"/><text x="' + (ml - 6) + '" y="' + (y + 4) + '" text-anchor="end" font-size="11" fill="#5E7580">' + esc(corto(tope * i / 4)) + '</text>';
    }
    cols.forEach(function (c, i) {
      const hh = ah * c.v / tope, x = ml + i * bw + bw * 0.18, w = bw * 0.64, actual = i === cols.length - 1;
      svg += '<g><title>' + esc(c.et + ': ' + clp(c.v)) + '</title><rect x="' + x + '" y="' + (mt + ah - hh) + '" width="' + w + '" height="' + Math.max(hh, c.v ? 1 : 0) + '" rx="2" fill="' + (actual ? '#F4C430' : '#173039') + '"/>' +
        '<text x="' + (x + w / 2) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="11" fill="#5E7580">' + esc(c.et) + '</text></g>';
    });
    svg += '</svg>';
    h += '<div class="card" style="margin-bottom:16px"><div class="herr" style="margin-bottom:6px"><h3 style="margin-right:auto">Ingresos por período</h3>' +
      [['semana', 'Semanal'], ['mes', 'Mensual'], ['anio', 'Anual']].map(function (x) { return '<button class="chip' + (per === x[0] ? ' act' : '') + '" data-fper="' + x[0] + '">' + x[1] + '</button>'; }).join('') +
      '</div><div style="overflow-x:auto">' + svg + '</div><p class="mute" style="font-size:.85rem">La barra amarilla es el período actual, que aún no termina.</p></div>';

    // detalle
    const ini = inicioPeriodo(per, ahora, 0), fin = finPeriodo(per, ini);
    const det = pagos.filter(function (p) { return p.f >= ini && p.f < fin; }).sort(function (a, b) { return b.f - a.f; });
    h += '<div class="card"><h3>Pagos de ' + nombres[per][0].toLowerCase() + '</h3>' + (det.length ? '<div class="tabla-wrap" style="max-height:340px;overflow:auto"><table><thead><tr><th>Fecha</th><th>Folio</th><th>Cliente</th><th>Tipo</th><th>Monto</th></tr></thead><tbody>' +
      det.map(function (p) {
        const s = solicitud(db, p.folio);
        return '<tr><td>' + fecha(p.f.toISOString()) + '</td><td>' + esc(p.folio) + '</td><td>' + esc(s ? cliente(db, s.clienteId).nombre : '') + '</td><td>' + (p.tipo === 'abono' ? 'Abono' : 'Saldo') + '</td><td>' + esc(m(p.monto)) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="mute">No hay pagos registrados en este período.</p>') + '</div>';
    return h;
  }


  /* ---------- mensajes a clientes ---------- */
  function vistaMensajes(db) {
    const f = st.mfiltro || 'pend';
    const todos = (db.notificaciones || []).slice().sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
    const pend = todos.filter(function (n) { return !n.enviada.correo && !n.enviada.wa; });
    const lista = f === 'pend' ? pend : f === 'env' ? todos.filter(function (n) { return n.enviada.correo || n.enviada.wa; }) : todos;
    let h = '<header><div><h1>Mensajes a clientes</h1><p>Cada aviso ya lo ve el cliente en Mi cuenta. Aquí lo envías también por WhatsApp o correo con un clic.</p></div></header>' +
      '<div class="nota">En el prototipo el envío es manual: se abre WhatsApp o tu correo con el mensaje escrito. Con el hosting real, estos avisos saldrían solos según el canal que elige cada cliente.</div><div class="herr">';
    [['pend', 'Por enviar (' + pend.length + ')'], ['env', 'Enviados'], ['todos', 'Todos (' + todos.length + ')']].forEach(function (x) {
      h += '<button class="chip' + (f === x[0] ? ' act' : '') + '" data-mfiltro="' + x[0] + '">' + x[1] + '</button>';
    });
    h += '</div>';
    if (!lista.length) h += '<div class="card vacio">' + (f === 'pend' ? 'No hay mensajes por enviar.' : 'No hay mensajes en esta lista.') + '</div>';
    else {
      h += '<div class="tabla-wrap"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Mensaje</th><th>Canal que prefiere</th><th></th></tr></thead><tbody>';
      lista.slice(0, 60).forEach(function (n) {
        const c = cliente(db, n.clienteId);
        const canal = c.canal === 'correo' ? 'Correo' : c.canal === 'wa' ? 'WhatsApp' : 'Correo y WhatsApp';
        const okWA = !!U.telefonoWA(c.telefono), okMail = !!c.email;
        h += '<tr><td>' + fecha(n.fecha) + '<br><span class="badge b-nueva">' + esc(TIPO_MSG[n.tipo] || 'Mensaje') + '</span></td><td><b>' + esc(c.nombre) + '</b></td>' +
          '<td style="max-width:360px"><b>' + esc(n.asunto) + '</b><br><span class="mute">' + esc(n.texto.replace(/\n\nEquipo Genius.*$/, '')) + '</span></td><td>' + esc(canal) + '</td>' +
          '<td class="acc-msg"><button class="btn-sec btn-chico' + (n.enviada.wa ? ' hecho' : '') + '" data-msg-wa="' + esc(n.id) + '"' + (okWA ? '' : ' disabled title="El cliente no tiene teléfono"') + '>' + (n.enviada.wa ? '✓ ' : '') + 'WhatsApp</button> ' +
          '<button class="btn-sec btn-chico' + (n.enviada.correo ? ' hecho' : '') + '" data-msg-mail="' + esc(n.id) + '"' + (okMail ? '' : ' disabled title="El cliente no tiene correo"') + '>' + (n.enviada.correo ? '✓ ' : '') + 'Correo</button></td></tr>';
      });
      h += '</tbody></table></div>';
      if (lista.length > 60) h += '<p class="mute" style="margin-top:8px">Se muestran los 60 más recientes.</p>';
    }
    // próximas mantenciones
    const prox = Msg.mantenciones(db).filter(function (m) { return !m.vencida && m.fecha.getTime() - Date.now() < 60 * 86400000; }).slice(0, 10);
    h += '<div class="card" style="margin-top:18px"><h3>Mantenciones que se vienen (próximos 60 días)</h3>' + (prox.length ? '<table>' + prox.map(function (m) {
      return '<tr><td><b>' + esc(cliente(db, m.solicitud.clienteId).nombre) + '</b></td><td>' + esc(nombreVeh(m.solicitud)) + '</td><td>' + m.meses + ' meses</td><td>' + fecha(m.fecha.toISOString()) + '</td></tr>';
    }).join('') + '</table><p class="mute" style="margin-top:8px;font-size:.88rem">El aviso se crea solo cuando llega la fecha, para los trabajos con sellado cerámico o PPF.</p>' : '<p class="mute">No hay mantenciones en los próximos 60 días.</p>') + '</div>';
    return h;
  }

  /* ---------- documentos ---------- */
  function vistaDocs(db) {
    const docs = (db.documentos || []).filter(Boolean).sort(function (a, b) { return new Date(b.guardado) - new Date(a.guardado); });
    let h = '<header><div><h1>Documentos</h1><p>Cotizaciones y certificados en PDF con el formato de Genius</p></div><div class="acciones">' +
      '<a class="btn-sec" href="documento.html?tipo=certificado">Nuevo certificado</a><a class="btn" href="documento.html?tipo=cotizacion">Nueva cotización</a></div></header>';
    if (!docs.length) return h + '<div class="card vacio">Aún no hay documentos. Crea una cotización desde aquí, o desde el detalle de una solicitud.</div>';
    h += '<div class="tabla-wrap"><table><thead><tr><th>Número</th><th>Tipo</th><th>Cliente</th><th>Fecha</th><th></th></tr></thead><tbody>';
    docs.forEach(function (d) {
      h += '<tr><td><b>' + esc(d.numero) + '</b></td><td>' + (d.tipo === 'cotizacion' ? 'Cotización' : 'Certificado') + '</td><td>' + esc(d.datos.cliente) + '</td><td>' + fecha(d.guardado) +
        '</td><td><a class="btn-sec btn-chico" href="documento.html?id=' + encodeURIComponent(d.id) + '">Abrir</a> <button class="btn-sec btn-chico" data-deldoc="' + esc(d.id) + '">Eliminar</button></td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  /* ---------- catálogo y precios ---------- */
  function vistaCatalogo() {
    let h = '<header><div><h1>Catálogo y precios</h1><p>Los precios base son los de un hatchback. Las demás carrocerías aplican su factor.</p></div></header>' +
      '<div class="nota">Los cambios se aplican solo a cotizaciones nuevas. Las ya enviadas conservan su rango.</div>';
    const db0 = DB.get();
    h += '<details class="card" open><summary>Opciones del sistema</summary><label class="fila-check"><input type="checkbox" id="ajExcel"' + (db0.ajustes.excel ? ' checked' : '') + '> Permitir descargar clientes y finanzas para Excel</label><p class="mute" style="margin-top:6px;font-size:.88rem">Si lo activan, aparece el botón "Descargar para Excel" en Clientes y en Finanzas. Si no lo quieren, déjenlo apagado.</p></details>';
    h += '<details class="card"><summary>Mensajes rápidos para avances</summary><p class="mute" style="margin-bottom:10px;font-size:.9rem">Se eligen al publicar un avance. Usa {cliente} y {vehiculo} para que se llenen solos.</p>' +
      db0.plantillasMsg.map(function (x) {
        return '<div class="pm-fila"><label>Título<input type="text" data-pm-t="' + esc(x.id) + '" value="' + esc(x.titulo) + '"></label><label>Mensaje<textarea data-pm-x="' + esc(x.id) + '" rows="2">' + esc(x.texto) + '</textarea></label><button class="btn-sec btn-chico" data-pm-del="' + esc(x.id) + '">Quitar</button></div>';
      }).join('') + '<div class="acciones"><button class="btn-sec" id="pmAdd">Agregar mensaje</button><button class="btn" id="pmGuardar">Guardar mensajes</button></div></details>';
    h += '<details class="card" open><summary>Rango mostrado al cliente y factores por carrocería</summary><div class="grid2" style="margin-bottom:12px">' +
      '<label>Rango mínimo (% del total)<input type="number" id="kMin" step="1" min="50" max="100" value="' + Math.round(D.rango.min * 100) + '"></label>' +
      '<label>Rango máximo (% del total)<input type="number" id="kMax" step="1" min="100" max="200" value="' + Math.round(D.rango.max * 100) + '"></label></div><div class="cat-grid">';
    D.carrocerias.forEach(function (c) {
      h += '<label>' + esc(c.nombre) + '<input type="number" step="0.01" min="0.5" max="3" data-fac="' + c.id + '" value="' + c.factor + '"></label>';
    });
    h += '</div></details>';
    D.servicios.forEach(function (s) {
      if (s.tipo === 'evaluacion') return;
      h += '<details class="card"><summary>' + esc(s.nombre) + '</summary><div class="cat-grid">';
      if (s.precios) {
        D.piezas.filter(function (p) { return s.precios[p.id] != null; }).forEach(function (p) {
          h += '<label>' + esc(p.nombre) + '<input type="number" step="1000" min="0" data-sp="' + s.id + '|' + p.id + '" value="' + s.precios[p.id] + '"></label>';
        });
      } else {
        s.niveles.forEach(function (n) {
          h += '<label>' + esc(n.nombre) + '<input type="number" step="1000" min="0" data-nv="' + s.id + '|' + n.id + '" value="' + n.base + '"></label>';
        });
      }
      h += '</div></details>';
    });
    h += '<div class="acciones"><button class="btn-sec" id="pReset">Volver a los precios del archivo</button><button class="btn" id="pGuardar">Guardar precios</button></div>';
    return h;
  }
  function guardarPrecios() {
    const db = DB.get();
    const min = parseFloat($('kMin').value) / 100, max = parseFloat($('kMax').value) / 100;
    if (!(min > 0 && min <= 1 && max >= 1)) return toast('El rango mínimo debe ser menor o igual a 100% y el máximo mayor o igual a 100%.', true);
    const p = { rango: { min: min, max: max }, factores: {}, servicios: {} };
    document.querySelectorAll('[data-fac]').forEach(function (i) { const v = parseFloat(i.value); if (v > 0) p.factores[i.dataset.fac] = v; });
    document.querySelectorAll('[data-sp]').forEach(function (i) {
      const k = i.dataset.sp.split('|'), v = parseInt(i.value, 10);
      if (v >= 0) { p.servicios[k[0]] = p.servicios[k[0]] || {}; p.servicios[k[0]].precios = p.servicios[k[0]].precios || {}; p.servicios[k[0]].precios[k[1]] = v; }
    });
    document.querySelectorAll('[data-nv]').forEach(function (i) {
      const k = i.dataset.nv.split('|'), v = parseInt(i.value, 10);
      if (v >= 0) { p.servicios[k[0]] = p.servicios[k[0]] || {}; p.servicios[k[0]].niveles = p.servicios[k[0]].niveles || {}; p.servicios[k[0]].niveles[k[1]] = v; }
    });
    db.precios = p;
    DB.save(db);
    DB.aplicarPrecios();
    toast('Precios guardados');
  }

  /* ---------- pintar ---------- */
  let vistaPrev = null, flipAntes = null, tokenModal = 0;
  const reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function capturarTarjetas() {
    const m = {};
    document.querySelectorAll('.tarjeta[data-trab]').forEach(function (el) { m[el.dataset.trab] = el.getBoundingClientRect(); });
    return m;
  }
  function aplicarFlip(antes) {
    if (!antes || reducir) return;
    document.querySelectorAll('.tarjeta[data-trab]').forEach(function (el) {
      const a = antes[el.dataset.trab]; if (!a || !el.animate) return;
      const b = el.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
      if (!dx && !dy) return;
      el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.3,1)' });
    });
  }
  function pintar() {
    const db = DB.get();
    lateral(db);
    const v = st.vista;
    const vistaEl = $('vista');
    if (vistaPrev !== v) {
      vistaEl.classList.remove('entra'); void vistaEl.offsetWidth;
      if (!reducir && vistaPrev !== null) vistaEl.classList.add('entra');
      else if (!reducir) vistaEl.classList.add('entra');
      vistaPrev = v;
    } else vistaEl.classList.remove('entra');
    vistaEl.innerHTML = v === 'panel' ? vistaPanel(db) : v === 'cotizaciones' ? vistaCot(db) : v === 'clientes' ? vistaClientes(db) : v === 'trabajos' ? vistaTrabajos(db) : v === 'documentos' ? vistaDocs(db) : v === 'historial' ? vistaHistorial(db) : v === 'finanzas' ? vistaFinanzas(db) : v === 'mensajes' ? vistaMensajes(db) : vistaCatalogo();
    const f = flipAntes; flipAntes = null; aplicarFlip(f);
  }
  function abrirModal(html) {
    tokenModal++;
    $('modalCaja').innerHTML = html;
    const m = $('modal'); m.classList.remove('saliendo');
    if (m.hidden) { m.hidden = false; m.classList.remove('abre'); void m.offsetWidth; if (!reducir) m.classList.add('abre'); }
    const f = $('modalCaja').querySelector('input, select, textarea, button');
    if (f) f.focus();
  }
  function cerrarModal() {
    const m = $('modal'); if (m.hidden) return;
    const mi = ++tokenModal;
    const fin = function () { if (mi !== tokenModal) return; m.hidden = true; m.classList.remove('saliendo', 'abre'); $('modalCaja').innerHTML = ''; };
    if (reducir) return fin();
    m.classList.add('saliendo'); setTimeout(fin, 190);
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', function (e) {
    const t = e.target;
    const q = function (sel) { return t.closest(sel); };
    if (q('[data-cerrar]')) return cerrarModal();
    if (t === $('modal')) return cerrarModal();
    let el;
    if ((el = q('[data-vista]'))) { st.vista = el.dataset.vista; return pintar(); }
    if (q('#btnSalir')) { try { sessionStorage.removeItem('genius_admin'); } catch (x) { /* ignorar */ } return iniciar(); }
    if (q('#btnReset')) { if (confirm('Se borrarán los cambios y volverán los datos de ejemplo. ¿Continuar?')) { DB.reset(); location.reload(); } return; }
    if ((el = q('[data-deldoc]'))) {
      if (confirm('¿Eliminar este documento guardado?')) {
        const db = DB.get(); db.documentos = (db.documentos || []).filter(function (d) { return d && d.id !== el.dataset.deldoc; }); DB.save(db); pintar();
      }
      return;
    }
    if ((el = q('[data-hanio]'))) { st.hanio = el.dataset.hanio; return pintar(); }
    if ((el = q('[data-fper]'))) { st.fper = el.dataset.fper; return pintar(); }
    if ((el = q('[data-delav]'))) {
      const p = el.dataset.delav.split('|'), db = DB.get(), tr = db.trabajos.find(function (x) { return x.id === p[0]; });
      tr.actualizaciones = tr.actualizaciones.filter(function (u) { return u.id !== p[1]; });
      DB.save(db); return abrirModal(modalTrab(db, p[0]));
    }
    if ((el = q('#avPublicar'))) {
      const id = el.dataset.id, texto = $('avTexto').value.trim(), files = $('avFotos').files;
      if (!texto && !files.length) return toast('Escribe un mensaje o elige al menos una foto.', true);
      el.disabled = true; el.textContent = 'Publicando…';
      C.comprimirVarias(files, 6).then(function (fotos) {
        const db = DB.get(), tr = db.trabajos.find(function (x) { return x.id === id; });
        tr.actualizaciones = tr.actualizaciones || [];
        tr.actualizaciones.push({ id: 'a' + Date.now(), fecha: new Date().toISOString(), texto: texto || 'Nuevas fotos de tu vehículo.', fotos: fotos, etapa: tr.etapa });
        if (!DB.save(db)) {
          tr.actualizaciones.pop();
          el.disabled = false; el.textContent = 'Publicar avance';
          return toast('No hay espacio para guardar esas fotos en el prototipo. Prueba con menos.', true);
        }
        notificar(db, tr, 'avance', 'Nuevo avance de tu ' + nombreVeh(solicitud(db, tr.folio)), (texto || 'Subimos nuevas fotos de tu vehículo.') + (fotos.length ? ' (' + fotos.length + ' foto' + (fotos.length > 1 ? 's' : '') + ' en Mi cuenta)' : ''));
        DB.save(db);
        toast('Avance publicado: el cliente ya lo puede ver');
        abrirModal(modalTrab(db, id));
      });
      return;
    }
    if ((el = q('[data-mfiltro]'))) { st.mfiltro = el.dataset.mfiltro; return pintar(); }
    if ((el = q('[data-msg-wa]')) || (el = q('[data-msg-mail]'))) {
      const wa = el.hasAttribute('data-msg-wa'), id = wa ? el.dataset.msgWa : el.dataset.msgMail;
      const db = DB.get(), n = db.notificaciones.find(function (x) { return x.id === id; }); if (!n) return;
      const c = cliente(db, n.clienteId);
      window.open(wa ? Msg.linkWA(c, n.texto) : Msg.linkCorreo(c, n.asunto, n.texto), wa ? '_blank' : '_self', 'noopener');
      n.enviada[wa ? 'wa' : 'correo'] = true; DB.save(db);
      toast('Mensaje marcado como enviado por ' + (wa ? 'WhatsApp' : 'correo'));
      return pintar();
    }
    if ((el = q('[data-cobro]'))) {
      const p = el.dataset.cobro.split('|'), db = DB.get(), tr = db.trabajos.find(function (x) { return x.id === p[0]; }); if (!tr) return;
      const sol = solicitud(db, tr.folio), c = cliente(db, sol.clienteId), tipo = p[1] === 'abono' ? 'abono' : 'saldo';
      notificar(db, tr, 'cobro', (tipo === 'abono' ? 'Abono' : 'Saldo') + ' pendiente de tu ' + nombreVeh(sol),
        'Hola ' + c.nombre.split(' ')[0] + ', te recordamos que está pendiente el ' + tipo + ' de ' + clp(montoCobro(tr, tipo)) + ' + IVA por el trabajo de tu ' + nombreVeh(sol) + ' (' + tr.folio + '). Si ya lo pagaste, avísanos y lo registramos. Gracias.');
      tr.cobros = tr.cobros || []; tr.cobros.push({ fecha: new Date().toISOString(), tipo: tipo });
      DB.save(db); toast('Recordatorio creado. Envíalo desde Mensajes.'); st.mfiltro = 'pend';
      if (!$('modal').hidden) abrirModal(modalTrab(db, tr.id));
      return pintar();
    }
    if (q('#xClientes')) {
      const db = DB.get();
      descargarCSV('clientes-genius.csv', [['Nombre', 'RUT', 'Teléfono', 'Correo', 'Origen', 'Cotizaciones', 'Trabajos']].concat(db.clientes.map(function (c) {
        const sols = db.solicitudes.filter(function (x) { return x.clienteId === c.id; });
        return [c.nombre, c.rut ? U.rutFormato(c.rut) : '', c.telefono, c.email, c.origen, sols.length, db.trabajos.filter(function (t) { return sols.some(function (x) { return x.folio === t.folio; }); }).length];
      })));
      return;
    }
    if (q('#xFinanzas')) {
      const db = DB.get(), rows = [['Fecha', 'Folio', 'Cliente', 'Tipo', 'Monto neto', 'IVA 19%', 'Total con IVA']];
      pagosLista(db).sort(function (a, b) { return a.f - b.f; }).forEach(function (p) {
        const sol = solicitud(db, p.folio);
        rows.push([p.f.toLocaleDateString('es-CL'), p.folio, sol ? cliente(db, sol.clienteId).nombre : '', p.tipo === 'abono' ? 'Abono' : 'Saldo', Math.round(p.monto), Math.round(p.monto * 0.19), Math.round(p.monto * 1.19)]);
      });
      descargarCSV('pagos-genius.csv', rows); return;
    }
    if (q('#pmAdd')) { const db = DB.get(); db.plantillasMsg.push({ id: 'pm' + Date.now(), titulo: 'Nuevo mensaje', texto: 'Hola {cliente}, ' }); DB.save(db); return pintar(); }
    if ((el = q('[data-pm-del]'))) { const db = DB.get(); db.plantillasMsg = db.plantillasMsg.filter(function (x) { return x.id !== el.dataset.pmDel; }); DB.save(db); return pintar(); }
    if (q('#pmGuardar')) {
      const db = DB.get();
      db.plantillasMsg.forEach(function (x) {
        const t = document.querySelector('[data-pm-t="' + x.id + '"]'), tx = document.querySelector('[data-pm-x="' + x.id + '"]');
        if (t) x.titulo = t.value.trim() || 'Mensaje'; if (tx) x.texto = tx.value.trim();
      });
      DB.save(db); toast('Mensajes guardados'); return;
    }
    if ((el = q('[data-filtro]'))) { st.filtro = el.dataset.filtro; return pintar(); }
    if ((el = q('[data-mover]'))) { e.stopPropagation(); return mover(el.dataset.mover, parseInt(el.dataset.dir, 10)); }
    if ((el = q('[data-sol]'))) return abrirModal(modalSol(DB.get(), el.dataset.sol));
    if ((el = q('[data-cli]'))) return abrirModal(modalCli(DB.get(), el.dataset.cli));
    if ((el = q('[data-trab]'))) return abrirModal(modalTrab(DB.get(), el.dataset.trab));
    if ((el = q('#mGuardar'))) return guardarSol(el.dataset.folio);
    if (q('#pGuardar')) return guardarPrecios();
    if (q('#pReset')) {
      if (confirm('Se quitarán los precios guardados y se usarán los del archivo datos.js. ¿Continuar?')) {
        const db = DB.get(); db.precios = null; DB.save(db); location.reload();
      }
      return;
    }
    if ((el = q('#cGuardar'))) {
      const db = DB.get(), c = db.clientes.find(function (x) { return x.id === el.dataset.id; });
      c.origen = $('cOrigen').value; c.notas = $('cNotas').value.trim();
      DB.save(db); cerrarModal(); toast('Cliente guardado'); return pintar();
    }
    if ((el = q('#tGuardar'))) {
      const db = DB.get(), tr = db.trabajos.find(function (x) { return x.id === el.dataset.id; });
      tr.abonoPct = parseInt($('tPct').value, 10);
      tr.abonoPagado = $('tAbono').checked; tr.materialesPedidos = $('tMat').checked;
      tr.apoyoExterno = $('tApoyo').checked; tr.apoyoDetalle = $('tApoyoDet').value.trim();
      tr.saldoPagado = $('tSaldo').checked; tr.notas = $('tNotas').value.trim();
      tr.checklist = CHECK.map(function (x, i) { return $('tCk' + i).checked; });
      syncPagos(tr);
      const nuevaFest = $('tFest').value || null;
      if (nuevaFest !== (tr.fechaEstimada || null)) {
        tr.fechaEstimada = nuevaFest;
        if (nuevaFest) {
          const d = nuevaFest.split('-');
          notificar(db, tr, 'fecha', 'Fecha estimada de entrega de tu ' + nombreVeh(solicitud(db, tr.folio)), 'La fecha estimada de entrega de tu vehículo es el ' + d[2] + '-' + d[1] + '-' + d[0] + '. Si algo cambia, te avisamos.');
        }
      }
      DB.save(db); cerrarModal(); toast('Trabajo ' + tr.folio + ' guardado'); return pintar();
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'chkIva') { st.iva = e.target.checked; pintar(); }
    if (e.target.id === 'ajExcel') { const db = DB.get(); db.ajustes.excel = e.target.checked; DB.save(db); toast(e.target.checked ? 'Descarga para Excel activada' : 'Descarga para Excel desactivada'); }
    if (e.target.id === 'avPlantilla' && e.target.value) {
      const db = DB.get(), pl = db.plantillasMsg.find(function (x) { return x.id === e.target.value; });
      const idT = (document.querySelector('#avPublicar') || {}).dataset;
      const tr = idT && db.trabajos.find(function (x) { return x.id === idT.id; });
      const sol = tr && solicitud(db, tr.folio);
      if (pl) $('avTexto').value = Msg.rellenar(pl.texto, sol ? cliente(db, sol.clienteId) : null, nombreVeh(sol));
      e.target.value = '';
    }
    if (e.target.id === 'avFotos') {
      C.comprimirVarias(e.target.files, 6).then(function (u) { $('avPrev').innerHTML = C.miniaturas(u); });
    }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'buscarH') { st.hq = e.target.value; $('tablaH').innerHTML = filasHist(DB.get()); }
    if (e.target.id === 'buscar') {
      st.busqueda = e.target.value;
      $('tabla').innerHTML = filasCot(DB.get());   // solo la tabla, para no perder el foco
    }
  });

  /* ---------- buscador global ---------- */
  function resultadosBusqueda(db, q) {
    q = q.trim().toLowerCase(); if (q.length < 2) return [];
    const dig = q.replace(/[^0-9k]/g, '');
    const out = [];
    db.clientes.forEach(function (c) {
      const txt = (c.nombre + ' ' + (c.email || '')).toLowerCase();
      const rutOk = dig.length >= 3 && (c.rut || '').toLowerCase().replace(/[^0-9k]/g, '').indexOf(dig) >= 0;
      const telOk = dig.length >= 4 && (c.telefono || '').replace(/\D/g, '').indexOf(dig) >= 0;
      const patOk = (c.vehiculos || []).some(function (v) { return (v.patente || '').toLowerCase().indexOf(q) >= 0; });
      if (txt.indexOf(q) >= 0 || rutOk || telOk || patOk) out.push({ k: 'cli', id: c.id, t: c.nombre, d: 'Cliente' + (c.rut ? ' · ' + U.rutFormato(c.rut) : '') });
    });
    db.solicitudes.forEach(function (sol) {
      const c = cliente(db, sol.clienteId);
      const txt = (sol.folio + ' ' + sol.vehiculo.marca + ' ' + sol.vehiculo.modelo + ' ' + (sol.vehiculo.patente || '') + ' ' + c.nombre).toLowerCase();
      if (txt.indexOf(q) >= 0) out.push({ k: 'sol', id: sol.folio, t: sol.folio + ' · ' + nombreVeh(sol) + (sol.vehiculo.patente ? ' · ' + sol.vehiculo.patente : ''), d: 'Cotización · ' + c.nombre + ' · ' + nombreEstado(sol.estado) });
    });
    return out.slice(0, 8);
  }
  function pintarBusqueda() {
    const box = $('gbRes'), inp = $('gb'); if (!box || !inp) return;
    const r = resultadosBusqueda(DB.get(), inp.value);
    if (inp.value.trim().length < 2) { box.hidden = true; return; }
    box.innerHTML = r.length ? r.map(function (x) {
      return '<button type="button" class="gb-item" ' + (x.k === 'cli' ? 'data-cli' : 'data-sol') + '="' + esc(x.id) + '"><b>' + esc(x.t) + '</b><span>' + esc(x.d) + '</span></button>';
    }).join('') : '<div class="gb-vacio">No encontramos nada. Prueba con el nombre, el RUT, el folio o la patente.</div>';
    box.hidden = false;
  }
  document.addEventListener('input', function (e) { if (e.target.id === 'gb') pintarBusqueda(); });
  document.addEventListener('click', function (e) {
    const box = $('gbRes'); if (!box) return;
    if (e.target.closest('.gb-item')) { box.hidden = true; $('gb').value = ''; return; }
    if (!e.target.closest('.gbusca')) box.hidden = true;
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && !$('app').hidden) { e.preventDefault(); $('gb').focus(); $('gb').select(); }
    else if (e.key === 'Escape' && document.activeElement === $('gb')) { $('gb').value = ''; $('gbRes').hidden = true; $('gb').blur(); }
    else if (e.key === 'Enter' && document.activeElement === $('gb')) { const b = document.querySelector('#gbRes .gb-item'); if (b) b.click(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('modal').hidden && document.activeElement !== $('gb')) cerrarModal(); });
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('loginPass').value.trim().toLowerCase() === CLAVE) {
      try { sessionStorage.setItem('genius_admin', '1'); } catch (x) { /* ignorar */ }
      iniciar();
    } else { $('loginError').hidden = false; }
  });

  DB.aplicarPrecios();
  iniciar();
})();
