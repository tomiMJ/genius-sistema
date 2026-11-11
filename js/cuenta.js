/* ==========================================================
   GENIUS · Mi cuenta (cliente): estado de su vehículo,
   cotizaciones e historial. Lee de GeniusDB (localStorage).
   ========================================================== */
(function () {
  'use strict';

  const U = window.GeniusUtil, DB = window.GeniusDB, C = window.GeniusComun, esc = U.esc, clp = U.clp;
  const $ = function (s) { return document.querySelector(s); };
  const D = window.GENIUS_DATOS;
  let MANT = [];

  // Lo que ve el cliente en cada etapa (los socios usan nombres internos distintos)
  const ETAPAS = [
    ['abono', 'Reserva', 'Estamos esperando el abono para reservar tu cupo. Apenas lo recibamos, pasamos a preparar los materiales.'],
    ['materiales', 'Materiales', 'Estamos pidiendo y preparando los productos que se usarán en tu vehículo. Te avisamos cuando partimos.'],
    ['ejecucion', 'En trabajo', 'Tu vehículo está en el taller. Aquí abajo subimos fotos para que veas cómo va.'],
    ['calidad', 'Revisión', 'Estamos revisando cada detalle con luz y de cerca antes de entregártelo.'],
    ['listo', 'Listo para retiro', 'Tu vehículo está listo. Coordina con nosotros el día y la hora de retiro y el pago del saldo.'],
    ['entregado', 'Entregado', 'Trabajo terminado y entregado. Gracias por confiar en Genius.']
  ];
  const ESTADOS = { nueva: ['Recibida', ''], en_revision: ['En revisión', 'cur'], enviada: ['Cotización enviada', 'cur'], aceptada: ['Aceptada', 'ok'], rechazada: ['Rechazada', 'no'] };

  function fecha(iso) { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function fechaDia(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return fecha(iso); return fecha(new Date(+m[1], +m[2] - 1, +m[3]).toISOString()); }
  function waLink(texto) { return 'https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(texto); }
  function pagado(t) { return (t.pagos || []).reduce(function (a, p) { return a + p.monto; }, 0); }

  function tarjetaTrabajo(t, s) {
    const idx = ETAPAS.findIndex(function (e) { return e[0] === t.etapa; });
    const pct = Math.round((idx / (ETAPAS.length - 1)) * 100);
    const v = s.vehiculo;
    const abono = Math.round((t.precioFinal || 0) * t.abonoPct / 100);
    let h = '<article class="tarjeta-c"><header><div><b>' + esc(v.marca + ' ' + v.modelo) + '</b><div class="mute">' + esc(s.folio) + (v.patente ? ' · ' + esc(v.patente) : '') + ' · ' + esc(s.items.map(function (i) { return i.nombre; }).join(', ')) + '</div></div>' +
      '<span class="insignia ' + (t.etapa === 'entregado' ? 'ok' : 'cur') + '">' + esc(ETAPAS[idx][1]) + '</span></header>' +
      '<div class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Avance del trabajo"><div class="progreso-barra"><i style="width:' + Math.max(pct, 4) + '%"></i></div>' +
      '<ol class="etapas">' + ETAPAS.map(function (e, i) { return '<li class="' + (i < idx || t.etapa === 'entregado' ? 'hecha' : i === idx ? 'actual' : '') + '">' + esc(e[1]) + '</li>'; }).join('') + '</ol></div>' +
      '<div class="etapa-actual"><b>' + esc(ETAPAS[idx][1]) + '</b>' + esc(ETAPAS[idx][2]) + '</div>';
    if (t.etapa !== 'entregado' && t.fechaEstimada) h += '<div class="entrega-est"><b>Entrega estimada: ' + esc(fechaDia(t.fechaEstimada)) + '</b><span>Si algo cambia, te avisamos.</span></div>';
    if (t.etapa === 'entregado') {
      const ms = MANT.filter(function (m) { return m.trabajo.id === t.id; });
      let ultV = -1; ms.forEach(function (m, i) { if (m.vencida) ultV = i; });
      if (ms.length) h += '<div class="mantenciones"><b>Mantenciones de tu tratamiento</b><ul>' + ms.map(function (m, i) {
        return '<li class="' + (i === ultV ? 'vencida' : '') + '"><span>A los ' + m.meses + ' meses</span><span>' + esc(fecha(m.fecha.toISOString())) + (i === ultV ? ' · te toca, escríbenos' : m.vencida ? ' · fecha pasada' : '') + '</span></li>';
      }).join('') + '</ul></div>';
    }
    h += '<div class="pagos-c"><span>Valor acordado: ' + esc(clp(t.precioFinal || 0)) + ' + IVA</span><span class="' + (t.abonoPagado ? 'ok' : '') + '">Abono ' + t.abonoPct + '% (' + esc(clp(abono)) + '): ' + (t.abonoPagado ? 'recibido' : 'pendiente') + '</span>' +
      '<span class="' + (t.saldoPagado ? 'ok' : '') + '">Saldo: ' + (t.saldoPagado ? 'pagado' : 'pendiente') + '</span>' + (t.fechaEntrega ? '<span>Entregado el ' + esc(fecha(t.fechaEntrega)) + '</span>' : '') + '</div>';
    const av = (t.actualizaciones || []).slice().sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
    if (av.length) {
      h += '<div class="avances"><h3>Avances</h3>' + av.map(function (a) {
        return '<div class="avance"><div class="fecha">' + esc(fecha(a.fecha)) + '</div><p style="margin:2px 0">' + esc(a.texto) + '</p>' + C.miniaturas(a.fotos) + '</div>';
      }).join('') + '</div>';
    }
    return h + '</article>';
  }

  function pintar() {
    const el = $('#cuenta');
    const cli = C.Sesion.cliente();
    if (!cli) {
      el.innerHTML = '<h1>Mi cuenta</h1><p class="sub">Ingresa con tu RUT o crea una cuenta para ver cómo va tu vehículo.</p><div id="authBox"></div>';
      C.montarAuth($('#authBox'), { modo: 'login', onOk: pintar });
      return;
    }
    const db = DB.get();
    if (C.Msg.generarMantenciones(db)) DB.save(db);
    MANT = C.Msg.mantenciones(db).filter(function (m) { return m.solicitud.clienteId === cli.id; });
    const sols = db.solicitudes.filter(function (s) { return s.clienteId === cli.id; }).sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
    const trabajos = db.trabajos.map(function (t) { return { t: t, s: sols.find(function (s) { return s.folio === t.folio; }) }; }).filter(function (x) { return x.s; });
    const curso = trabajos.filter(function (x) { return x.t.etapa !== 'entregado'; });
    const hist = trabajos.filter(function (x) { return x.t.etapa === 'entregado'; }).sort(function (a, b) { return new Date(b.t.fechaEntrega) - new Date(a.t.fechaEntrega); });

    let h = '<div class="cuenta-cab"><div><h1>Hola, ' + esc(cli.nombre.split(' ')[0]) + '</h1><p class="sub" style="margin:0">' + esc(U.rutFormato(cli.rut)) + ' · ' + esc(cli.email || '') + '</p></div>' +
      '<div><a class="btn" href="index.html">Nueva cotización</a> <button class="btn-link" data-salir>Cerrar sesión</button></div></div>';
    const nov = C.Msg.deCliente(db, cli.id);
    const noLeidas = nov.filter(function (n) { return !n.leida; }).length;
    h += '<section class="novedades"><h2>Novedades' + (noLeidas ? ' <span class="cnt-c">' + noLeidas + ' nueva' + (noLeidas > 1 ? 's' : '') + '</span>' : '') + '</h2>' +
      (nov.length ? nov.slice(0, 6).map(function (n) {
        return '<div class="novedad' + (n.leida ? '' : ' nueva-n') + '"><div class="nov-cab"><b>' + esc(n.asunto) + '</b><span class="mute">' + esc(fecha(n.fecha)) + '</span></div><p>' + esc(n.texto.replace(/\n\nEquipo Genius.*$/, '')) + '</p></div>';
      }).join('') + (nov.length > 6 ? '<p class="mute">Mostrando las 6 más recientes.</p>' : '') : '<div class="vacio-c">Cuando haya novedades de tu vehículo, las verás aquí.</div>') +
      '<label class="canal">Cómo quieres que te avisemos<select id="canalAviso"><option value="ambos"' + (cli.canal === 'ambos' ? ' selected' : '') + '>Correo y WhatsApp</option><option value="correo"' + (cli.canal === 'correo' ? ' selected' : '') + '>Solo correo</option><option value="wa"' + (cli.canal === 'wa' ? ' selected' : '') + '>Solo WhatsApp</option></select></label></section>';
    h += '<h2>Mis vehículos en servicio</h2>' + (curso.length ? curso.map(function (x) { return tarjetaTrabajo(x.t, x.s); }).join('') :
      '<div class="vacio-c">No tienes vehículos en servicio. Cuando aceptes una cotización, aquí verás cada etapa del trabajo.</div>');
    h += '<h2>Mis cotizaciones</h2>' + (sols.length ? sols.map(function (s) {
      const e = ESTADOS[s.estado] || [s.estado, ''];
      const valor = s.precioFinal ? clp(s.precioFinal) + ' + IVA (valor final)' : s.totalMax ? clp(s.totalMin) + ' a ' + clp(s.totalMax) + ' + IVA (rango)' : 'A evaluar';
      return '<article class="tarjeta-c"><div class="fila-cot"><div><b>' + esc(s.folio) + '</b> · ' + esc(s.vehiculo.marca + ' ' + s.vehiculo.modelo) + '<div class="mute">' + esc(fecha(s.fecha)) + ' · ' + esc(s.items.map(function (i) { return i.nombre; }).join(', ')) + '</div></div>' +
        '<div style="text-align:right"><span class="insignia ' + e[1] + '">' + esc(e[0]) + '</span><div class="mute">' + esc(valor) + '</div></div></div>' + C.miniaturas(s.fotos) + '<div class="fila-acc"><a class="btn-link" target="_blank" rel="noopener" href="' + waLink('Hola Genius, quiero consultar por mi cotización ' + s.folio + ' (' + s.vehiculo.marca + ' ' + s.vehiculo.modelo + ').') + '">Consultar por WhatsApp</a></div></article>';
    }).join('') : '<div class="vacio-c">Todavía no has enviado cotizaciones.</div>');
    const docs = (db.documentos || []).filter(function (d) { return d && d.compartido && d.clienteId === cli.id; }).sort(function (a, b) { return new Date(b.guardado) - new Date(a.guardado); });
    h += '<h2>Mis documentos</h2>' + (docs.length ? docs.map(function (d) {
      return '<article class="tarjeta-c fila-doc"><div><b>' + (d.tipo === 'cotizacion' ? 'Cotización ' : 'Certificado ') + esc(d.numero) + '</b><div class="mute">' + esc(fecha(d.guardado)) + (d.datos.vehiculo ? ' · ' + esc(d.datos.vehiculo) : (d.datos.marca ? ' · ' + esc(d.datos.marca + ' ' + d.datos.modelo) : '')) + '</div></div>' +
        '<a class="btn" href="documento.html?id=' + encodeURIComponent(d.id) + '&cliente=1" target="_blank" rel="noopener">Ver y descargar PDF</a></article>';
    }).join('') : '<div class="vacio-c">Tus cotizaciones formales y certificados aparecerán aquí cuando Genius los publique.</div>');
    h += '<h2>Mis vehículos guardados</h2>' + ((cli.vehiculos || []).length ? '<div class="chips-p">' + cli.vehiculos.map(function (v) {
      return '<span class="chip-p veh-chip">' + esc(v.marca + ' ' + v.modelo) + (v.patente ? ' · ' + esc(v.patente) : '') + '<button type="button" class="quitar" data-quitar-veh="' + esc(v.id) + '" aria-label="Quitar ' + esc(v.marca + ' ' + v.modelo) + '">×</button></span>';
    }).join('') + '</div>' : '<div class="vacio-c">Los vehículos que cotices quedarán guardados para la próxima vez.</div>');
    h += '<h2>Historial de vehículos entregados</h2>' + (hist.length ? hist.map(function (x) { return tarjetaTrabajo(x.t, x.s); }).join('') : '<div class="vacio-c">Aquí quedarán los trabajos ya entregados.</div>');
    el.innerHTML = h;
    if (noLeidas) { nov.forEach(function (n) { n.leida = true; }); DB.save(db); }
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-salir]')) { C.Sesion.salir(); pintar(); return; }
    const q = e.target.closest('[data-quitar-veh]');
    if (q) {
      const cli = C.Sesion.cliente(); if (!cli) return;
      const db = DB.get(), c = db.clientes.find(function (x) { return x.id === cli.id; });
      c.vehiculos = (c.vehiculos || []).filter(function (v) { return v.id !== q.dataset.quitarVeh; });
      DB.save(db); pintar();
    }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'canalAviso') return;
    const cli = C.Sesion.cliente(); if (!cli) return;
    const db = DB.get(), c = db.clientes.find(function (x) { return x.id === cli.id; });
    c.canal = e.target.value; DB.save(db);
  });
  pintar();
})();
