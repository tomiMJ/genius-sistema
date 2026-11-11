/* ==========================================================
   GENIUS · generador de documentos (cotización y certificado)
   La socia llena el formulario de la izquierda; la hoja de la
   derecha se arma sola. "Guardar y descargar PDF" abre la
   impresión del navegador: elige "Guardar como PDF".
   ========================================================== */
(function () {
  'use strict';

  const U = window.GeniusUtil, DB = window.GeniusDB, P = window.GENIUS_PLANTILLAS;
  const esc = U.esc, clp = U.clp;
  const $ = function (id) { return document.getElementById(id); };
  const qs = new URLSearchParams(location.search);
  const CM = window.GeniusComun;
  const modoCliente = qs.get('cliente') === '1';

  let st = null;     // { id, tipo, numero, datos }

  /* ---------- fechas ---------- */
  function hoyISO() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function ddmmyyyy(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; }
  function sumarMeses(iso, n) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return '';
    const d = new Date(+m[1], +m[2] - 1 + n, +m[3]);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---------- valores iniciales ---------- */
  function seccionDesde(p) {
    return { titulo: p.titulo, texto: p.texto || '', lineas: p.lineas.map(function (l) { return { detalle: l[0], valor: l[1] }; }), descPct: 0, descEtiqueta: 'Descuento', sinTotal: !!p.sinTotal };
  }
  function mantenciones(fecha) {
    return P.certificado.mantenciones.map(function (m) { return { fecha: sumarMeses(fecha, m.meses), servicio: m.servicio }; });
  }
  function nuevo(tipo) {
    const db = DB.get();
    let d;
    if (tipo === 'cotizacion') {
      d = { fecha: hoyISO(), cliente: '', vehiculo: '', patente: '', secciones: [], ivaModo: 'nota', abonoPct: P.cotizacion.abonoPct, plazo: P.cotizacion.plazo, incluirNotaPPF: false, notaExtra: '' };
      const folio = qs.get('folio');
      const s = folio && db.solicitudes.find(function (x) { return x.folio === folio; });
      if (s) {
        const c = db.clientes.find(function (x) { return x.id === s.clienteId; });
        d.cliente = c ? c.nombre : ''; d.vehiculo = U.carroceria(s.vehiculo.carroceria) ? (U.carroceria(s.vehiculo.carroceria).nombre.toLowerCase() + ' ' + s.vehiculo.marca + ' ' + s.vehiculo.modelo) : s.vehiculo.marca + ' ' + s.vehiculo.modelo;
        d.folioOrigen = s.folio;
        s.items.forEach(function (i) {
          let v = 0;
          if (!i.evaluacion) v = (s.items.length === 1 && s.precioFinal) ? s.precioFinal : U.redondear((i.min + i.max) / 2, 'arriba');
          d.secciones.push({ titulo: i.nombre, texto: '', lineas: [{ detalle: i.detalle || i.nombre, valor: v }], descPct: 0, descEtiqueta: 'Descuento', sinTotal: true });
        });
      }
    } else {
      const C = P.certificado, f = hoyISO();
      d = {
        cliente: '', celular: '', clienteRut: '', marca: '', modelo: '', anio: '', color: '', patente: '',
        producto: C.producto, prodMarca: C.marca, duracion: C.duracion, fecha: f,
        prof1: 0, prof2: 1, tituloDescripcion: C.tituloDescripcion, descripcion: C.descripcion,
        mantencionTexto: C.mantencionTexto, mantenciones: mantenciones(f)
      };
      const tid = qs.get('trabajo');
      const t = tid && db.trabajos.find(function (x) { return x.id === tid; });
      const s = t && db.solicitudes.find(function (x) { return x.folio === t.folio; });
      if (s) {
        const c = db.clientes.find(function (x) { return x.id === s.clienteId; });
        d.cliente = c ? c.nombre : ''; d.celular = c ? c.telefono : ''; d.marca = s.vehiculo.marca; d.modelo = s.vehiculo.modelo; d.folioOrigen = s.folio;
      }
    }
    return { id: null, tipo: tipo, numero: '', datos: d };
  }
  function cargar() {
    const db = DB.get();
    const id = qs.get('id');
    if (modoCliente) {
      // el cliente solo ve documentos que los socios le compartieron y que son suyos
      const cli = CM && CM.Sesion.cliente();
      const r = (db.documentos || []).find(function (x) { return x && x.id === id; });
      if (!cli || !r || !r.compartido || r.clienteId !== cli.id) return null;
      return JSON.parse(JSON.stringify(r));
    }
    if (id) {
      const r = (db.documentos || []).find(function (x) { return x && x.id === id; });
      if (r) return JSON.parse(JSON.stringify(r));
    }
    return nuevo(qs.get('tipo') === 'certificado' ? 'certificado' : 'cotizacion');
  }

  /* ---------- helpers de acceso por ruta ("secciones.0.titulo") ---------- */
  function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, st.datos); }
  function set(path, v) {
    const ks = path.split('.'); const last = ks.pop();
    const o = ks.reduce(function (a, k) { return a[k]; }, st.datos);
    o[last] = v;
  }

  /* ---------- formulario ---------- */
  function campo(label, path, tipo, extra) {
    const v = get(path);
    return '<label>' + esc(label) + '<input type="' + (tipo || 'text') + '" data-k="' + path + '" value="' + esc(v == null ? '' : v) + '"' + (extra || '') + '></label>';
  }
  function area(label, path, filas) {
    return '<label>' + esc(label) + '<textarea data-k="' + path + '" rows="' + (filas || 3) + '">' + esc(get(path) || '') + '</textarea></label>';
  }
  function panelCot(d) {
    let h = '<h2 style="border:0;margin-top:0">Datos del cliente</h2>' + campo('Nombre del cliente', 'cliente') +
      '<div class="dos">' + campo('Fecha', 'fecha', 'date') + campo('Patente', 'patente') + '</div>' +
      area('Vehículo (como se escribe en el saludo)', 'vehiculo', 2);
    h += '<h2>Servicios y valores</h2>';
    d.secciones.forEach(function (s, i) {
      h += '<div class="bloque"><div class="bloque-cab"><span>Sección ' + (i + 1) + '</span><button class="btn-x" data-act="delSec" data-i="' + i + '" aria-label="Quitar sección">×</button></div>' +
        campo('Título', 'secciones.' + i + '.titulo') + area('Texto explicativo (opcional)', 'secciones.' + i + '.texto', 3);
      s.lineas.forEach(function (l, j) {
        h += '<div class="linea"><input type="text" data-k="secciones.' + i + '.lineas.' + j + '.detalle" value="' + esc(l.detalle) + '" aria-label="Detalle"><input type="number" step="1000" min="0" data-num data-k="secciones.' + i + '.lineas.' + j + '.valor" value="' + esc(l.valor === '' || l.valor == null ? '' : l.valor) + '" placeholder="A evaluar" aria-label="Valor">' +
          '<button class="btn-x" data-act="delLinea" data-i="' + i + '" data-j="' + j + '" aria-label="Quitar línea">×</button></div>';
      });
      h += '<button class="btn-sec chico" data-act="addLinea" data-i="' + i + '">Agregar línea</button>' +
        '<div class="dos" style="margin-top:8px">' + campo('Descuento (%)', 'secciones.' + i + '.descPct', 'number', ' min="0" max="100" data-num') + campo('Nombre del descuento', 'secciones.' + i + '.descEtiqueta') + '</div>' +
        '<label class="fila-check"><input type="checkbox" data-k="secciones.' + i + '.sinTotal"' + (s.sinTotal ? ' checked' : '') + '> No mostrar fila de total (opciones sueltas)</label></div>';
    });
    h += '<label>Agregar sección del catálogo<select id="selPreset"><option value="">Elegir…</option>' + P.secciones.map(function (p) { return '<option value="' + p.id + '">' + esc(p.nombre) + '</option>'; }).join('') + '<option value="_vacia">Sección en blanco</option></select></label>';
    h += '<h2>Condiciones</h2><div class="dos">' + campo('Abono (%)', 'abonoPct', 'number', ' min="0" max="100" data-num') +
      '<label>Valores<select data-k="ivaModo"><option value="nota"' + (d.ivaModo === 'nota' ? ' selected' : '') + '>Texto "+IVA"</option><option value="desglose"' + (d.ivaModo === 'desglose' ? ' selected' : '') + '>Desglosar IVA 19%</option></select></label></div>' +
      area('Tiempo de entrega', 'plazo', 2) +
      '<label class="fila-check"><input type="checkbox" data-k="incluirNotaPPF"' + (d.incluirNotaPPF ? ' checked' : '') + '> Incluir nota técnica del PPF</label>' + area('Nota adicional (opcional)', 'notaExtra', 2);
    return h;
  }
  function panelCert(d) {
    const pr = P.empresa.profesionales;
    const sel = function (path, v) { return '<select data-k="' + path + '" data-num>' + pr.map(function (x, i) { return '<option value="' + i + '"' + (+v === i ? ' selected' : '') + '>' + esc(x.nombre) + '</option>'; }).join('') + '</select>'; };
    let h = '<h2 style="border:0;margin-top:0">Cliente</h2>' + campo('Nombre completo', 'cliente') + '<div class="dos">' + campo('Celular', 'celular') + campo('RUT (para la firma)', 'clienteRut') + '</div>' +
      '<h2>Vehículo</h2><div class="dos">' + campo('Marca', 'marca') + campo('Modelo', 'modelo') + campo('Año', 'anio') + campo('Color', 'color') + campo('Patente', 'patente') + '</div>' +
      '<h2>Producto aplicado</h2>' + campo('Detalle del sellador', 'producto') + '<div class="dos">' + campo('Marca', 'prodMarca') + campo('Duración', 'duracion') + '</div>' + campo('Fecha de aplicación', 'fecha', 'date', ' data-fecha') +
      '<h2>Firmas</h2><div class="dos"><label>Profesional (aplicador)' + sel('prof1', d.prof1) + '</label><label>Segunda firma' + sel('prof2', d.prof2) + '</label></div>' +
      '<h2>Página 2: descripción</h2>' + campo('Título', 'tituloDescripcion') + area('Texto del producto', 'descripcion', 8) + area('Texto de mantenciones', 'mantencionTexto', 2) +
      '<h2>Mantenciones programadas</h2>';
    d.mantenciones.forEach(function (m, j) {
      h += '<div class="linea" style="grid-template-columns:124px 1fr 28px"><input type="date" data-k="mantenciones.' + j + '.fecha" value="' + esc(m.fecha) + '"><input type="text" data-k="mantenciones.' + j + '.servicio" value="' + esc(m.servicio) + '"><button class="btn-x" data-act="delMant" data-j="' + j + '" aria-label="Quitar">×</button></div>';
    });
    h += '<div style="display:flex;gap:8px"><button class="btn-sec chico" data-act="addMant">Agregar fila</button><button class="btn-sec chico" data-act="recalcMant">Recalcular desde la fecha</button></div>';
    return h;
  }
  function pintarPanel() {
    const d = st.datos;
    $('panel').innerHTML = '<div class="panel-marca"><img src="img/logo-genius.png" alt="Genius"></div><a class="volver" href="admin.html">← Volver al panel</a><h1>' + (st.tipo === 'cotizacion' ? 'Cotización' : 'Certificado') + (st.numero ? ' ' + esc(st.numero) : '') + '</h1>' +
      '<p class="mute">Llena los datos y revisa la hoja a la derecha. Todo se puede editar.</p>' +
      (d.folioOrigen ? '<label class="chk"><input type="checkbox" data-share' + (st.compartido ? ' checked' : '') + '><span>Mostrar este documento en Mi cuenta del cliente (' + esc(d.folioOrigen) + ')</span></label>' : '') + (st.tipo === 'cotizacion' ? panelCot(d) : panelCert(d));
  }

  /* ---------- hoja ---------- */
  function parrafos(t) {
    const lineas = String(t || '').split('\n'); let h = '', lista = [];
    function cerrar() { if (lista.length) { h += '<ul>' + lista.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; lista = []; } }
    lineas.forEach(function (l) {
      if (/^\s*[-•]\s+/.test(l)) lista.push(l.replace(/^\s*[-•]\s+/, ''));
      else { cerrar(); if (l.trim()) h += '<p>' + esc(l) + '</p>'; }
    });
    cerrar();
    return h;
  }
  function fila(c1, c2, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td>' + c1 + '</td><td class="n">' + c2 + '</td></tr>'; }
  function seccionHTML(s, iva) {
    let suma = 0;
    s.lineas.forEach(function (l) { suma += +l.valor || 0; });
    let h = '<div class="sec-doc"><h2 class="t">' + esc(s.titulo) + '</h2>' + parrafos(s.texto);
    h += '<table class="val"><tr><th>Detalle</th><th>Valor</th></tr>';
    s.lineas.forEach(function (l) { h += fila(esc(l.detalle), (l.valor === '' || l.valor == null || +l.valor === 0) ? 'A evaluar' : esc(clp(+l.valor))); });
    const pct = +s.descPct || 0;
    if (!s.sinTotal && s.lineas.length > 0 && suma > 0) {
      h += fila('<span style="float:right">Total</span>', esc(clp(suma)), 'tot');
      if (pct > 0) {
        const fin = Math.round(suma * (1 - pct / 100));
        h += fila('<span style="float:right">' + pct + '% de ' + esc(s.descEtiqueta || 'descuento') + '</span>', esc(clp(fin)), 'desc');
        suma = fin;
      }
      if (iva === 'desglose') {
        h += fila('<span style="float:right">IVA 19%</span>', esc(clp(Math.round(suma * 0.19))));
        h += fila('<span style="float:right">Total con IVA</span>', esc(clp(Math.round(suma * 1.19))), 'tot');
      }
    } else if (pct > 0 && suma > 0) {
      h += fila('<span style="float:right">' + pct + '% de ' + esc(s.descEtiqueta || 'descuento') + '</span>', esc(clp(Math.round(suma * (1 - pct / 100)))), 'desc');
    }
    return h + '</table></div>';
  }
  function cuerpoCot(d) {
    let h = '<p class="meta">Cotización ' + esc(st.numero || '(sin guardar)') + '</p>';
    h += '<p>Estimado/a ' + esc(d.cliente || '…') + '</p><p>Adjunto el detalle de la cotización para ' + esc(d.vehiculo || 'su vehículo') + (d.patente ? ', patente ' + esc(d.patente) : '') + '.</p>';
    d.secciones.forEach(function (s) { h += seccionHTML(s, d.ivaModo); });
    if (!d.secciones.length) h += '<p class="mute">Agrega secciones desde el panel de la izquierda.</p>';
    h += '<div class="sec-doc">';
    if (+d.abonoPct > 0) h += '<p>Se solicita un abono de ' + (+d.abonoPct) + '% al inicio del trabajo.</p>';
    if (d.plazo) h += '<p>Tiempo de entrega: ' + esc(d.plazo) + '.</p>';
    h += '<p><b>' + esc(d.ivaModo === 'desglose' ? 'Se realiza factura o boleta según requerimiento.' : P.cotizacion.ivaTexto) + '</b></p>';
    if (d.incluirNotaPPF) h += '<p>** ' + esc(P.cotizacion.notaPPF) + '</p>';
    if (d.notaExtra) h += parrafos(d.notaExtra);
    h += '<p class="firma">' + esc(P.cotizacion.cierre) + '\n\n' + esc(P.cotizacion.firmantes) + '</p></div>';
    return h;
  }
  function tablaFicha(filas) {
    return '<table class="ficha">' + filas.map(function (f) { return '<tr><td>' + esc(f[0]) + '</td><td>' + esc(f[1]) + '</td></tr>'; }).join('') + '</table>';
  }
  function cuerpoCert(d) {
    const E = P.empresa, a = E.profesionales[+d.prof1] || {}, b = E.profesionales[+d.prof2] || {};
    let h = '<img class="sello" src="img/sello.png" alt="">' +
      '<div class="cert-tit">CERTIFICADO</div>' +
      '<p class="meta">Certificado ' + esc(st.numero || '(sin guardar)') + '</p>' +
      '<div class="cert-sub">Información del cliente:</div>' + tablaFicha([['Nombre', d.cliente], ['Celular', d.celular]]) +
      '<div class="cert-sub">Información del vehículo:</div>' + tablaFicha([['Marca', d.marca], ['Modelo', d.modelo], ['Año', d.anio], ['Color del vehículo', d.color], ['Patente', d.patente]]) +
      '<div class="cert-sub">Detalles del ' + esc(d.producto) + ':</div>' + tablaFicha([['Marca', d.prodMarca], ['Duración', d.duracion], ['Fecha aplicación', ddmmyyyy(d.fecha)]]) +
      '<div class="cert-sub">Información del aplicador:</div>' + tablaFicha([['Nombre fantasía', E.nombreFantasia], ['Razón social', E.razonSocial], ['RUT', E.rut], ['Profesional', a.nombre], ['RUT', a.rut], ['Contacto', E.correo], ['Fecha de la aplicación', ddmmyyyy(d.fecha)]]) +
      '<div class="firmas"><div>' + esc(a.nombre) + '<br>' + esc(a.rut) + '<br>Genius</div><div>' + esc(b.nombre) + '<br>' + esc(b.rut) + '<br>Genius</div><div>' + esc(d.cliente) + '<br>' + esc(d.clienteRut) + '<br>Cliente</div></div>';
    h += '<div class="salto desc-cert"><h2 class="t">' + esc(d.tituloDescripcion) + '</h2>' + parrafos(d.descripcion) + '<p style="margin-top:6mm">' + esc(d.mantencionTexto) + '</p>' +
      '<table class="val"><tr><th>Fecha programada</th><th>Servicio</th></tr>' + d.mantenciones.map(function (m) { return '<tr><td class="der" style="text-align:center;width:38mm">' + esc(ddmmyyyy(m.fecha)) + '</td><td>' + esc(m.servicio) + '</td></tr>'; }).join('') + '</table></div>';
    return h;
  }
  function pintarHoja() {
    const E = P.empresa;
    const carta = st.tipo === 'cotizacion';
    $('pagina').textContent = '@page { size: ' + (carta ? 'letter' : 'A4') + '; margin: 0; }';
    const hoja = $('hoja');
    hoja.className = 'hoja' + (carta ? ' carta' : '');
    hoja.innerHTML = '<div class="cab"><img src="img/cabecera.png" alt="Genius Estética"></div>' +
      '<table class="doc"><thead class="sp-cab"><tr><td></td></tr></thead><tfoot class="sp-pie"><tr><td></td></tr></tfoot><tbody><tr><td>' +
      (st.tipo === 'cotizacion' ? cuerpoCot(st.datos) : cuerpoCert(st.datos)) + '</td></tr></tbody></table>' +
      '<div class="pie"><div><img class="web" src="img/web.png" alt="' + esc(E.web) + '">' + (st.tipo === 'cotizacion' ? '<div class="fecha">' + esc(ddmmyyyy(st.datos.fecha)) + '</div>' : '') + '</div><img class="logo" src="img/logo.png" alt="' + esc(E.instagram) + '"></div>';
    document.title = (st.tipo === 'cotizacion' ? 'Cotizacion' : 'Certificado') + '_' + (st.datos.cliente || 'cliente').replace(/\s+/g, '_') + '_' + ddmmyyyy(st.datos.fecha);
  }

  /* ---------- guardar ---------- */
  function toast(msg, mal) {
    const t = document.createElement('div'); t.className = 'toast' + (mal ? ' mal' : ''); t.textContent = msg; $('toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, 3000);
  }
  function guardar() {
    const db = DB.get();
    db.documentos = db.documentos || [];
    if (!st.datos.cliente.trim()) { toast('Escribe el nombre del cliente antes de guardar.', true); return false; }
    if (!st.id) {
      st.id = 'd' + Date.now();
      const pref = st.tipo === 'cotizacion' ? 'COT-' : 'CERT-';
      const n = db.documentos.filter(function (x) { return x.tipo === st.tipo; }).length + 1;
      st.numero = pref + String(n).padStart(4, '0');
      db.documentos.push(null);
    }
    const i = db.documentos.findIndex(function (x) { return x === null || x.id === st.id; });
    st.guardado = new Date().toISOString();
    const sol = st.datos.folioOrigen && db.solicitudes.find(function (x) { return x.folio === st.datos.folioOrigen; });
    st.clienteId = sol ? sol.clienteId : null;
    if (!st.clienteId) st.compartido = false;
    if (st.compartido && !st.avisado && CM) {
      CM.Msg.crear(db, { clienteId: st.clienteId, tipo: 'documento', asunto: (st.tipo === 'cotizacion' ? 'Tu cotización ' : 'Tu certificado ') + st.numero + ' está disponible',
        texto: 'Hola, ya puedes ver y descargar tu ' + (st.tipo === 'cotizacion' ? 'cotización ' : 'certificado ') + st.numero + ' en Mi cuenta, en la sección Mis documentos.' + CM.Msg.firma, ref: { folio: st.datos.folioOrigen } });
      st.avisado = true;
    }
    db.documentos[i] = JSON.parse(JSON.stringify(st));
    DB.save(db);
    history.replaceState(null, '', 'documento.html?id=' + st.id);
    $('estado').textContent = 'Guardado como ' + st.numero;
    return true;
  }

  /* ---------- eventos ---------- */
  document.addEventListener('input', function (e) {
    const k = e.target.dataset && e.target.dataset.k;
    if (!k) return;
    let v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (e.target.hasAttribute('data-num')) v = v === '' ? '' : Number(v);
    set(k, v);
    if (e.target.hasAttribute('data-fecha') && st.tipo === 'certificado') { /* las mantenciones se recalculan con el botón */ }
    pintarHoja();
  });
  document.addEventListener('change', function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-share')) { st.compartido = e.target.checked; return; }
    if (e.target.id === 'selPreset' && e.target.value) {
      const p = e.target.value === '_vacia' ? { titulo: 'Nueva sección', texto: '', lineas: [['Detalle', 0]] } : P.secciones.find(function (x) { return x.id === e.target.value; });
      st.datos.secciones.push(seccionDesde(p));
      pintarPanel(); pintarHoja();
    }
  });
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act, i = +el.dataset.i, j = +el.dataset.j, d = st.datos;
    if (a === 'delSec') { d.secciones.splice(i, 1); }
    else if (a === 'addLinea') { d.secciones[i].lineas.push({ detalle: '', valor: 0 }); }
    else if (a === 'delLinea') { d.secciones[i].lineas.splice(j, 1); }
    else if (a === 'addMant') { d.mantenciones.push({ fecha: '', servicio: '' }); }
    else if (a === 'delMant') { d.mantenciones.splice(j, 1); }
    else if (a === 'recalcMant') { d.mantenciones = mantenciones(d.fecha); }
    else if (a === 'guardar') { if (guardar()) { pintarPanel(); pintarHoja(); toast('Documento guardado'); } return; }
    else if (a === 'pdf' && modoCliente) { window.print(); return; }
    else if (a === 'pdf') { if (guardar()) { pintarPanel(); pintarHoja(); setTimeout(function () { window.print(); }, 150); } return; }
    pintarPanel(); pintarHoja();
  });

  st = cargar();
  if (!st) {
    document.body.innerHTML = '<div style="max-width:480px;margin:18vh auto;padding:0 16px;font-family:sans-serif"><h1>No encontramos este documento</h1><p>Ingresa a tu cuenta con el RUT correcto o pídele el documento a Genius.</p><p><a href="cuenta.html">Ir a Mi cuenta</a></p></div>';
    return;
  }
  if (modoCliente) {
    document.body.classList.add('cliente');
    document.querySelectorAll('[data-act="guardar"]').forEach(function (b) { b.hidden = true; });
    document.querySelectorAll('[data-act="pdf"]').forEach(function (b) { b.textContent = 'Descargar PDF'; });
    $('estado').innerHTML = '<a href="cuenta.html">← Volver a Mi cuenta</a>';
  } else pintarPanel();
  pintarHoja();
})();
