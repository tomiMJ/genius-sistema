/* ==========================================================
   GENIUS · cotizador del cliente
   Flujo: 1 Vehículo → 2 Servicios → 3 Piezas y opciones → 4 Datos
   Las solicitudes se guardan en localStorage (GeniusDB) y
   aparecen en admin.html. En la versión real irán a MySQL.
   ========================================================== */
(function () {
  'use strict';

  const D = window.GENIUS_DATOS, U = window.GeniusUtil, DB = window.GeniusDB, A = window.GeniusAutos, C = window.GeniusComun;
  DB.aplicarPrecios();

  const esc = U.esc, clp = U.clp;
  const $ = function (s) { return document.querySelector(s); };
  const PASOS = ['Vehículo', 'Servicios', 'Piezas y opciones', 'Tus datos'];

  const estado = {
    paso: 1,
    marca: '', modelo: '', marcaLibre: '', modeloLibre: '',
    carroceria: null,
    servicios: [],
    activo: null,
    piezas: {},     // { ppf: ['capo', ...] }
    niveles: {},    // { ceramico: ['basico'] }
    contacto: { nombre: '', telefono: '', email: '', patente: '', modalidad: 'remota', comentario: '', fotos: [] },
    error: '',
    enviado: null,
    borradorPendiente: null,
    acepta: false
  };

  /* ---------- borrador: la cotización se guarda sola en este navegador ---------- */
  const BORRADOR = 'genius_borrador';
  function leerBorrador() {
    try {
      const b = JSON.parse(localStorage.getItem(BORRADOR) || 'null');
      if (!b || !b.fecha || Date.now() - b.fecha > 30 * 86400000) return null;
      if (!(b.carroceria || b.servicios && b.servicios.length)) return null;
      return b;
    } catch (e) { return null; }
  }
  function guardarBorrador() {
    if (estado.enviado) return;
    if (!(estado.marca || estado.carroceria || estado.servicios.length)) return;
    const c = estado.contacto;
    try {
      localStorage.setItem(BORRADOR, JSON.stringify({
        fecha: Date.now(), paso: Math.min(estado.paso, 4), marca: estado.marca, modelo: estado.modelo, marcaLibre: estado.marcaLibre, modeloLibre: estado.modeloLibre,
        carroceria: estado.carroceria, servicios: estado.servicios, activo: estado.activo, piezas: estado.piezas, niveles: estado.niveles,
        contacto: { telefono: c.telefono, patente: c.patente, modalidad: c.modalidad, comentario: c.comentario }
      }));
      estado.borradorPendiente = null;
    } catch (e) { /* sin espacio o sin acceso: se ignora */ }
  }
  function borrarBorrador() { try { localStorage.removeItem(BORRADOR); } catch (e) { /* ignorar */ } }
  function retomarBorrador() {
    const b = estado.borradorPendiente; if (!b) return;
    ['marca', 'modelo', 'marcaLibre', 'modeloLibre', 'carroceria', 'activo'].forEach(function (k) { estado[k] = b[k] || (k === 'carroceria' || k === 'activo' ? null : ''); });
    estado.servicios = (b.servicios || []).filter(U.servicio);
    estado.piezas = b.piezas || {}; estado.niveles = b.niveles || {};
    Object.assign(estado.contacto, b.contacto || {});
    estado.borradorPendiente = null;
    let paso = b.paso || 1;
    if (paso >= 3 && !estado.servicios.length) paso = 2;
    if (paso >= 2 && !estado.carroceria) paso = 1;
    if (paso === 3 && estado.servicios.length && estado.servicios.indexOf(estado.activo) === -1) estado.activo = estado.servicios[0];
    estado.paso = paso;
  }
  estado.borradorPendiente = leerBorrador();

  /* ---------- animaciones ---------- */
  const reducir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animar(el, cls) {
    if (!el || reducir) return;
    el.classList.remove('anim-der', 'anim-izq', 'anim-sube');
    void el.offsetWidth;
    el.classList.add(cls);
  }
  function tween(el, desde, hasta) {
    if (!el || reducir) return;
    const t0 = performance.now();
    (function paso(t) {
      const k = Math.min(1, (t - t0) / 380), e = 1 - Math.pow(1 - k, 3);
      el.textContent = clp(desde.min + (hasta.min - desde.min) * e) + ' a ' + clp(desde.max + (hasta.max - desde.max) * e);
      if (k < 1) requestAnimationFrame(paso);
    })(t0);
  }
  let ultimoPasos = '', ultimaClave = null, prevRango = null, prevLineas = {};

  /* ---------- helpers de estado ---------- */
  function carActual() { return U.carroceria(estado.carroceria); }
  function serviciosElegidos() {
    return estado.servicios.map(function (id) { return U.servicio(id); }).filter(Boolean);
  }
  function nombreVehiculo() {
    if (estado.marca === '__otra') {
      return (estado.marcaLibre + ' ' + estado.modeloLibre).trim();
    }
    return (estado.marca + ' ' + estado.modelo).trim();
  }

  /* ---------- cálculo de precios ---------- */
  function precioPieza(s, pid, car) { return (s.precios[pid] || 0) * car.factor; }

  function calcular() {
    const car = carActual();
    const out = { lineas: [], evaluaciones: [], min: 0, max: 0 };
    if (!car) return out;
    const disp = U.piezasDisponibles(car.id);

    serviciosElegidos().forEach(function (s) {
      if (s.tipo === 'evaluacion') { out.evaluaciones.push(s); return; }

      if (s.tipo === 'pieza') {
        const disp = U.piezasServicio(s, car.id);
        const sel = (estado.piezas[s.id] || []).filter(function (p) { return disp.indexOf(p) !== -1; });
        if (!sel.length) return;
        let total = sel.reduce(function (a, p) { return a + precioPieza(s, p, car); }, 0);
        let mejor = null;
        (s.paquetes || []).forEach(function (pk) {
          const pcs = pk.piezas === 'todas' ? disp : pk.piezas.filter(function (p) { return disp.indexOf(p) !== -1; });
          const completo = pcs.every(function (p) { return sel.indexOf(p) !== -1; });
          if (completo && (!mejor || pk.descuento > mejor.pk.descuento)) mejor = { pk: pk, pcs: pcs };
        });
        let ahorro = 0;
        if (mejor) {
          const sub = mejor.pcs.reduce(function (a, p) { return a + precioPieza(s, p, car); }, 0);
          ahorro = sub * mejor.pk.descuento;
          total -= ahorro;
        }
        const r = U.rango(s, total);
        out.lineas.push({
          id: s.id, nombre: s.nombre,
          detalle: sel.map(function (p) { return U.nombrePieza(p, car.id); }).join(', '),
          min: r[0], max: r[1],
          paquete: mejor ? mejor.pk.nombre : null, descuento: mejor ? mejor.pk.descuento : 0
        });
        return;
      }

      if (s.tipo === 'paquete') {
        const sel = estado.niveles[s.id] || [];
        if (!sel.length) return;
        let total = 0; const nombres = [];
        sel.forEach(function (nid) {
          const n = s.niveles.find(function (x) { return x.id === nid; });
          if (n) { total += n.base * car.factor; nombres.push(n.nombre); }
        });
        const r = U.rango(s, total);
        out.lineas.push({ id: s.id, nombre: s.nombre, detalle: nombres.join(', '), min: r[0], max: r[1], paquete: null, descuento: 0 });
      }
    });

    out.lineas.forEach(function (l) { out.min += l.min; out.max += l.max; });
    return out;
  }

  function desdeServicio(s) {
    const car = carActual();
    if (!car) return null;
    let base = null;
    if (s.tipo === 'pieza') {
      const disp = U.piezasServicio(s, car.id);
      const vals = disp.map(function (p) { return precioPieza(s, p, car); }).filter(function (v) { return v > 0; });
      if (vals.length) base = Math.min.apply(null, vals);
    } else if (s.tipo === 'paquete') {
      base = Math.min.apply(null, s.niveles.map(function (n) { return n.base * car.factor; }));
    }
    return base == null ? null : U.redondear(base, 'abajo');
  }

  function servicioListo(s) {
    if (s.tipo === 'evaluacion') return true;
    if (s.tipo === 'pieza') {
      const disp = U.piezasServicio(s, estado.carroceria);
      return (estado.piezas[s.id] || []).some(function (p) { return disp.indexOf(p) !== -1; });
    }
    return (estado.niveles[s.id] || []).length > 0;
  }

  /* ---------- vistas ---------- */
  function htmlPasos() {
    return PASOS.map(function (n, i) {
      const num = i + 1;
      const cls = num === estado.paso ? 'on' : (num < estado.paso ? 'hecho' : '');
      const dis = num < estado.paso && !estado.enviado ? '' : 'disabled';
      return '<button class="paso-ind ' + cls + '" data-act="ir" data-n="' + num + '" ' + dis +
        (num === estado.paso ? ' aria-current="step"' : '') + '><span class="n">' + num + '</span>' + n + '</button>';
    }).join('');
  }

  function htmlPaso1() {
    const marcas = D.vehiculos.map(function (v) { return v.marca; });
    const fila = D.vehiculos.find(function (v) { return v.marca === estado.marca; });
    const modelos = fila ? fila.modelos : [];
    let modeloHtml;
    if (estado.marca === '__otra') {
      modeloHtml =
        '<label class="campo">Marca<input type="text" id="marcaLibre" value="' + esc(estado.marcaLibre) + '" placeholder="Ej. Honda"></label>' +
        '<label class="campo">Modelo<input type="text" id="modeloLibre" value="' + esc(estado.modeloLibre) + '" placeholder="Ej. Civic"></label>';
    } else {
      modeloHtml =
        '<label class="campo">Modelo<select id="modelo"' + (estado.marca ? '' : ' disabled') + '><option value="">Selecciona un modelo</option>' +
        modelos.map(function (m) {
          return '<option value="' + esc(m[0]) + '"' + (estado.modelo === m[0] ? ' selected' : '') + '>' + esc(m[0]) + '</option>';
        }).join('') + '</select></label>';
    }
    const cliS = C.Sesion.cliente();
    let extra = '';
    if (estado.borradorPendiente && !estado.marca && !estado.carroceria) {
      const b = estado.borradorPendiente;
      const veh = [b.marca === '__otra' ? b.marcaLibre : b.marca, b.marca === '__otra' ? b.modeloLibre : b.modelo].filter(Boolean).join(' ') || 'tu vehículo';
      const sv = (b.servicios || []).map(function (id) { const x = U.servicio(id); return x ? x.nombre : ''; }).filter(Boolean).join(', ');
      extra += '<div class="borrador" role="status"><div><b>Tienes una cotización sin terminar</b><br><span>' + esc(veh) + (sv ? ' · ' + esc(sv) : '') + '</span></div>' +
        '<div class="borrador-acc"><button class="btn" data-act="borrador_retomar">Retomar</button><button class="btn-link" data-act="borrador_borrar">Empezar de nuevo</button></div></div>';
    }
    if (cliS && cliS.vehiculos && cliS.vehiculos.length) {
      extra += '<div class="mis-veh"><div class="campo" style="margin-bottom:8px">Tus vehículos guardados</div><div class="chips-p">' +
        cliS.vehiculos.map(function (v) {
          return '<button type="button" class="chip-p' + (estado.vehiculoId === v.id ? ' on' : '') + '" data-act="veh" data-id="' + esc(v.id) + '">' + esc(v.marca + ' ' + v.modelo) + (v.patente ? ' · ' + esc(v.patente) : '') + '</button>';
        }).join('') + '</div></div>';
    }
    return '<h1>Cotiza tu servicio</h1>' +
      '<p class="sub">Elige tu vehículo, marca las piezas que quieres tratar y mira al tiro un rango de precio. Después un socio de Genius confirma el valor final.</p>' + extra +
      '<div class="campos">' +
      '<label class="campo">Marca<select id="marca"><option value="">Selecciona una marca</option>' +
      marcas.map(function (m) { return '<option value="' + esc(m) + '"' + (estado.marca === m ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') +
      '<option value="__otra"' + (estado.marca === '__otra' ? ' selected' : '') + '>Otra marca</option></select></label>' +
      modeloHtml + '</div>' +
      '<h2>Tipo de carrocería</h2>' +
      '<p class="sub" style="margin-top:0">Si elegiste un modelo, ya la marcamos por ti. Puedes cambiarla.</p>' +
      '<div class="carrocerias">' + D.carrocerias.map(function (c) {
        return '<button class="car-card' + (estado.carroceria === c.id ? ' on' : '') + '" data-act="carroceria" data-id="' + c.id +
          '" aria-pressed="' + (estado.carroceria === c.id) + '">' + A.svgAuto(c.id, { mini: true }) + '<span>' + esc(c.nombre) + '</span></button>';
      }).join('') + '</div>' +
      (estado.error ? '<p class="error" role="alert">' + esc(estado.error) + '</p>' : '') +
      '<div class="acciones"><span></span><button class="btn" data-act="sig">Continuar</button></div>';
  }

  function htmlPaso2() {
    return '<h1>¿Qué servicios te interesan?</h1>' +
      '<p class="sub">Puedes elegir varios. En el siguiente paso defines las piezas u opciones de cada uno.</p>' +
      '<div class="servicios">' + D.servicios.map(function (s) {
        const on = estado.servicios.indexOf(s.id) !== -1;
        const d = desdeServicio(s);
        const precio = s.tipo === 'evaluacion'
          ? '<span class="desde">A evaluación técnica</span>'
          : '<span class="desde"><small>Desde </small>' + (d ? clp(d) : '—') + '</span>';
        return '<button class="serv' + (on ? ' on' : '') + '" data-act="serv" data-id="' + s.id + '" aria-pressed="' + on + '">' +
          '<span class="check" aria-hidden="true">' + (on ? '✓' : '') + '</span>' +
          '<h3>' + esc(s.nombre) + '</h3><p>' + esc(s.desc) + '</p>' + precio + '</button>';
      }).join('') + '</div>' +
      (estado.error ? '<p class="error" role="alert">' + esc(estado.error) + '</p>' : '') +
      '<div class="acciones"><button class="btn-link" data-act="atras">Volver</button><button class="btn" data-act="sig">Continuar</button></div>';
  }

  function mapaSel() {
    const m = {};
    const elegidos = serviciosElegidos().filter(function (s) { return s.tipo === 'pieza'; });
    elegidos.forEach(function (s) {
      if (s.id === estado.activo) return;
      (estado.piezas[s.id] || []).forEach(function (p) { m[p] = { fill: s.color, op: 0.38, stroke: s.color }; });
    });
    elegidos.forEach(function (s) {
      if (s.id !== estado.activo) return;
      (estado.piezas[s.id] || []).forEach(function (p) { m[p] = { fill: s.color, op: 0.95, stroke: '#FFFFFF' }; });
    });
    return m;
  }

  /* ---------- paso 3: una fase por servicio ---------- */
  function nombreCorto(sv) {
    const m = /\(([^)]+)\)/.exec(sv.nombre);
    return m ? m[1] : sv.nombre;
  }
  function asegurarActivo() {
    const sels = serviciosElegidos();
    if (sels.length && !sels.some(function (x) { return x.id === estado.activo; })) estado.activo = sels[0].id;
    return sels;
  }
  function htmlPaso3() {
    return '<h1>Define piezas y opciones</h1><p class="sub" id="faseSub"></p>' +
      '<div class="fases" id="fases" role="list" aria-label="Servicios a configurar"></div>' +
      '<div class="fase-cuerpo" id="faseCuerpo"></div><div id="faseError"></div><div class="acciones" id="faseAcc"></div>';
  }
  function estadoFase(sv, i, idxAct) {
    if (i === idxAct) return 'activa';
    if (sv.tipo === 'evaluacion') return i < idxAct ? 'hecha' : '';
    return servicioListo(sv) ? 'hecha' : '';
  }
  function patchFases(sels, idxAct) {
    const el = $('#fases');
    if (sels.length < 2) { el.innerHTML = ''; el.dataset.key = ''; el.hidden = true; return; }
    el.hidden = false;
    const key = sels.map(function (x) { return x.id; }).join(',');
    if (el.dataset.key !== key) {
      el.dataset.key = key;
      el.innerHTML = sels.map(function (sv, i) {
        const cls = estadoFase(sv, i, idxAct);
        return (i ? '<span class="fase-linea"><i style="width:' + (estadoFase(sels[i - 1], i - 1, idxAct) === 'hecha' ? 100 : 0) + '%"></i></span>' : '') +
          '<button type="button" class="fase ' + cls + '" role="listitem" data-act="tab" data-id="' + sv.id + '" style="--c:' + (sv.color || 'var(--mute)') + '"' +
          (cls === 'activa' ? ' aria-current="step"' : '') + '><span class="fase-dot">' + (cls === 'hecha' ? '✓' : i + 1) + '</span><span class="fase-txt">' + esc(nombreCorto(sv)) + '</span></button>';
      }).join('');
      return;
    }
    const nodos = el.querySelectorAll('.fase'), lineas = el.querySelectorAll('.fase-linea i');
    sels.forEach(function (sv, i) {
      const cls = estadoFase(sv, i, idxAct);
      nodos[i].className = 'fase ' + cls;
      if (cls === 'activa') nodos[i].setAttribute('aria-current', 'step'); else nodos[i].removeAttribute('aria-current');
      nodos[i].querySelector('.fase-dot').textContent = cls === 'hecha' ? '✓' : String(i + 1);
      if (i) lineas[i - 1].style.width = (estadoFase(sels[i - 1], i - 1, idxAct) === 'hecha' ? 100 : 0) + '%';
    });
  }
  function cuerpoFase(act, car) {
    if (act.tipo === 'pieza') {
      const disp = U.piezasServicio(act, car.id);
      const chosen = (estado.piezas[act.id] || []).filter(function (p) { return disp.indexOf(p) !== -1; });
      const paqs = (act.paquetes || []).map(function (pk) {
        return '<button class="btn-sec" data-act="paquete" data-id="' + pk.id + '">' + esc(pk.nombre) + (pk.descuento ? ' (−' + Math.round(pk.descuento * 100) + '%)' : '') + '</button>';
      }).join('');
      const chips = disp.map(function (pid) {
        const on = chosen.indexOf(pid) !== -1;
        return '<button type="button" class="chip-p' + (on ? ' on' : '') + '" data-act="pieza" data-id="' + pid + '" aria-pressed="' + on + '" style="--c:' + act.color + '">' + esc(U.nombrePieza(pid, car.id)) + '</button>';
      }).join('');
      return '<div class="editor"><div><div class="auto" id="auto">' + A.svgAuto(car.id, { sel: mapaSel() }) + '</div>' +
        '<div class="etq" id="etq">Toca una pieza para marcarla</div></div>' +
        '<div class="lateral"><h3>' + esc(act.nombre) + '</h3>' +
        '<p class="sub" style="margin:0 0 14px">' + esc(act.desc) + '</p>' +
        '<div class="botones">' + paqs + '<button class="btn-sec" data-act="limpiar">Quitar todo</button></div>' +
        '<p class="sel-lista">' + (chosen.length ? '<b>' + chosen.length + ' pieza' + (chosen.length > 1 ? 's' : '') + ' marcada' + (chosen.length > 1 ? 's' : '') + '.</b> Toca el dibujo o la lista para cambiar.' : 'Aún no marcas ninguna pieza. Los kits marcan varias de una vez.') + '</p>' +
        '<div class="chips-p" role="group" aria-label="Piezas de ' + esc(act.nombre) + '">' + chips + '</div></div></div>';
    }
    if (act.tipo === 'paquete') {
      const sel = estado.niveles[act.id] || [];
      return '<p class="sub" style="margin-top:0">' + esc(act.desc) + '</p><div class="opciones">' + act.niveles.map(function (n) {
        const on = sel.indexOf(n.id) !== -1;
        const r = U.rango(act, n.base * car.factor);
        return '<label class="opt' + (on ? ' on' : '') + '"><input type="' + (act.multiple ? 'checkbox' : 'radio') + '" name="niv_' + act.id +
          '" data-nivel="' + act.id + ':' + n.id + '"' + (on ? ' checked' : '') + '>' +
          '<span class="t">' + esc(n.nombre) + '<small>' + esc(n.detalle) + '</small></span><span class="p">' + clp(r[0]) + ' a ' + clp(r[1]) + ' <small>+ IVA</small></span></label>';
      }).join('') + '</div>';
    }
    return '<div class="info-box"><b>' + esc(act.nombre) + '</b><br>' + esc(act.desc) +
      ' Este servicio no suma al rango de precio: lo confirma un socio después de ver las fotos.</div>';
  }
  function actualizarFase3() {
    const car = carActual(), sels = asegurarActivo();
    const idx = sels.findIndex(function (x) { return x.id === estado.activo; }), act = sels[idx];
    const ultimo = idx === sels.length - 1, listo = servicioListo(act);
    $('#faseSub').textContent = sels.length > 1
      ? 'Servicio ' + (idx + 1) + ' de ' + sels.length + '. Cada uno tiene su color en el plano.'
      : 'Marca las piezas u opciones. El rango de precio se arma solo.';
    patchFases(sels, idx);
    const cuerpo = $('#faseCuerpo');
    cuerpo.innerHTML = cuerpoFase(act, car);
    if (estado.animFase) { animar(cuerpo, estado.animFase === 'izq' ? 'anim-izq' : 'anim-der'); estado.animFase = ''; }
    $('#faseError').innerHTML = estado.error ? '<p class="error" role="alert">' + esc(estado.error) + '</p>' : '';
    let dcha;
    if (ultimo) dcha = '<button class="btn' + (listo && act.tipo !== 'evaluacion' && sels.every(servicioListo) ? ' lista' : '') + '" data-act="sig">Continuar</button>';
    else dcha = '<button class="btn" data-act="fase_sig"' + (listo ? '' : ' disabled') + '>Listo, siguiente servicio</button>';
    const pista = estado.avanzando === act.id ? 'Pasando al siguiente servicio…' : (!listo ? (act.tipo === 'pieza' ? 'Marca al menos una pieza para seguir.' : 'Elige una opción para seguir.') : '');
    $('#faseAcc').innerHTML = (idx > 0 ? '<button class="btn-link" data-act="fase_prev">Servicio anterior</button>' : '<button class="btn-link" data-act="atras">Volver</button>') +
      '<span class="pista">' + esc(pista) + '</span>' + dcha;
    if (estado._pulse) {
      const g = document.querySelector('#auto [data-pieza="' + estado._pulse + '"]');
      if (g && !reducir) g.classList.add('pulse');
      estado._pulse = null;
    }
  }
  function irFase(delta) {
    const sels = serviciosElegidos();
    const idx = sels.findIndex(function (x) { return x.id === estado.activo; }), n = sels[idx + delta];
    if (!n) return;
    clearTimeout(estado._t); estado.avanzando = null;
    estado.activo = n.id; estado.animFase = delta > 0 ? 'der' : 'izq'; estado.error = '';
    pintar();
  }
  function togglePieza(pid) {
    const sv = U.servicio(estado.activo);
    if (!sv || sv.tipo !== 'pieza') return;
    if (U.piezasServicio(sv, estado.carroceria).indexOf(pid) === -1) {
      const etq = document.getElementById('etq');
      if (etq) etq.textContent = 'Esta pieza no se cotiza en ' + sv.nombre + '.';
      return;
    }
    const lista = estado.piezas[sv.id] || (estado.piezas[sv.id] = []);
    const i = lista.indexOf(pid);
    if (i === -1) { lista.push(pid); estado._pulse = pid; } else lista.splice(i, 1);
    estado.error = '';
    pintar();
  }

  function htmlPaso4() {
    const cli = C.Sesion.cliente();
    if (!cli) {
      return '<h1>Crea tu cuenta para enviar la cotización</h1>' +
        '<p class="sub">Así podrás ver en qué etapa va tu vehículo y revisar tus cotizaciones. Tu selección no se pierde.</p>' +
        '<div id="authBox"></div>' +
        '<div class="acciones"><button class="btn-link" data-act="atras">Volver</button><span></span></div>';
    }
    const c = estado.contacto;
    if (!c.telefono) c.telefono = cli.telefono || '';
    return '<h1>Tus datos de contacto</h1><p class="sub">Un socio revisará tu solicitud y te escribirá por WhatsApp con el valor final.</p>' +
      '<div class="sesion-box"><span>Enviarás como <b>' + esc(cli.nombre) + '</b> · ' + esc(U.rutFormato(cli.rut)) + '</span><button class="btn-link" data-act="salir">No soy yo</button></div>' +
      '<div class="form-grid">' +
      '<label class="campo">Teléfono o WhatsApp<input type="tel" id="c_telefono" value="' + esc(c.telefono) + '" placeholder="+56 9 1234 5678" autocomplete="tel"></label>' +
      '<label class="campo">Patente (opcional)<input type="text" id="c_patente" value="' + esc(c.patente) + '" maxlength="8" autocapitalize="characters"></label>' +
      '<div class="ancho"><div class="campo" style="margin-bottom:8px">¿Cómo prefieres que evaluemos tu vehículo?</div><div class="radios">' +
      '<label class="' + (c.modalidad === 'remota' ? 'on' : '') + '"><input type="radio" name="modalidad" value="remota"' + (c.modalidad === 'remota' ? ' checked' : '') + '><span>Con fotos<small>Las envías y te respondemos por WhatsApp</small></span></label>' +
      '<label class="' + (c.modalidad === 'presencial' ? 'on' : '') + '"><input type="radio" name="modalidad" value="presencial"' + (c.modalidad === 'presencial' ? ' checked' : '') + '><span>Visitando el taller<small>Coordinamos día y hora para revisarlo en persona</small></span></label>' +
      '</div></div>' +
      '<label class="campo ancho">Fotos del vehículo (opcional, hasta 6)<input type="file" id="c_fotos" accept="image/*" multiple>' +
      '<span class="fotos-nota" id="fotosNota">' + (c.fotos.length ? c.fotos.length + ' foto' + (c.fotos.length > 1 ? 's' : '') + ' lista' + (c.fotos.length > 1 ? 's' : '') + ' para enviar.' : 'Muestra el daño o la zona que quieres tratar.') + '</span>' +
      '<span id="fotosPrev">' + C.miniaturas(c.fotos) + '</span></label>' +
      '<label class="campo ancho">Comentarios<textarea id="c_comentario" placeholder="Cuéntanos qué necesitas o qué daño tiene el vehículo">' + esc(c.comentario) + '</textarea></label>' +
      '<label class="acepto ancho"><input type="checkbox" id="c_acepta"' + (estado.acepta ? ' checked' : '') + '><span>Entiendo que el rango es referencial y que el valor final lo confirma un socio. Acepto los <a href="privacidad.html#terminos" target="_blank" rel="noopener">términos de la cotización</a> y el <a href="privacidad.html#privacidad" target="_blank" rel="noopener">aviso de privacidad</a>.</span></label>' +
      '</div>' +
      (estado.error ? '<p class="error" role="alert">' + esc(estado.error) + '</p>' : '') +
      '<div class="acciones"><button class="btn-link" data-act="atras">Volver</button><button class="btn" data-act="enviar">Solicitar cotización</button></div>';
  }

  function htmlEnviado() {
    const e = estado.enviado;
    const msg = 'Hola Genius, envié la solicitud ' + e.folio + ' desde la web.\nVehículo: ' + e.vehiculo + '\nServicios: ' +
      e.servicios + '\nRango referencial: ' + e.rango + ' + IVA';
    const link = 'https://wa.me/' + D.whatsapp + '?text=' + encodeURIComponent(msg);
    return '<div class="ok-box"><h1>Solicitud enviada</h1><div class="folio">' + esc(e.folio) + '</div>' +
      '<p>Guarda este código. Un socio de Genius revisará tu solicitud y te contactará al ' + esc(e.telefono) + '.</p>' +
      '<p>Rango referencial: <b>' + esc(e.rango) + ' + IVA</b>. El valor final se confirma después de evaluar tu vehículo.</p>' +
      '<div class="ok-acciones"><a class="btn" href="' + link + '" target="_blank" rel="noopener">Abrir WhatsApp con el resumen</a>' +
      '<button class="btn-link" data-act="nueva">Hacer otra cotización</button>' +
      '<a class="admin-link" href="admin.html">Ver en el panel de socios</a></div></div>';
  }

  function htmlResumen() {
    const car = carActual();
    const r = calcular();
    let h = '<h2>Tu cotización</h2>';
    if (!car) return h + '<p class="res-vacio">Elige tu vehículo para empezar.</p>';
    h += '<p class="res-veh"><b>' + esc(nombreVehiculo() || 'Vehículo sin modelo') + '</b><br>' + esc(car.nombre) + '</p>';
    if (!r.lineas.length && !r.evaluaciones.length) {
      return h + '<p class="res-vacio">Aún no hay servicios configurados. El rango de precio aparece aquí a medida que eliges piezas u opciones.</p>';
    }
    r.lineas.forEach(function (l) {
      h += '<div class="res-linea" data-lid="' + esc(l.id) + '"><div class="nombre"><span>' + esc(l.nombre) + '</span><span>' + clp(l.min) + ' a ' + clp(l.max) + '</span></div>' +
        '<div class="det">' + esc(l.detalle) + '</div>' +
        (l.paquete && l.descuento ? '<div class="desc">Incluye descuento de ' + esc(l.paquete) + ' (−' + Math.round(l.descuento * 100) + '%)</div>' : '') + '</div>';
    });
    r.evaluaciones.forEach(function (s) {
      h += '<div class="res-linea" data-lid="ev-' + esc(s.id) + '"><div class="nombre"><span>' + esc(s.nombre) + '</span><span>A evaluar</span></div><div class="det">Se cotiza después de ver fotos o revisar el vehículo.</div></div>';
    });
    if (r.lineas.length) {
      h += '<div class="res-total"><div class="lbl">Rango estimado, más IVA</div><div class="rango">' + clp(r.min) + ' a ' + clp(r.max) + '</div>' +
        '<p class="res-nota">Valores netos, más IVA. Valor referencial: el precio final lo confirma un socio de Genius después de evaluar el vehículo.</p></div>';
    }
    return h;
  }

  /* ---------- render ---------- */
  function patchPasos() {
    const el = $('#pasos');
    if (el.children.length !== PASOS.length) { el.innerHTML = htmlPasos(); return; }
    PASOS.forEach(function (n, i) {
      const num = i + 1, b = el.children[i];
      b.className = 'paso-ind ' + (num === estado.paso ? 'on' : (num < estado.paso ? 'hecho' : ''));
      b.disabled = !(num < estado.paso && !estado.enviado);
      if (num === estado.paso) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
  }

  function pintar() {
    patchPasos();
    const cont = $('#paso');
    const clave = estado.enviado ? 'ok' : estado.paso;
    const cambio = clave !== ultimaClave;
    if (!cambio && estado.paso === 3 && !estado.enviado && $('#fases')) {
      actualizarFase3();
    } else {
      if (estado.enviado) cont.innerHTML = htmlEnviado();
      else cont.innerHTML = [null, htmlPaso1, htmlPaso2, htmlPaso3, htmlPaso4][estado.paso]();
      if (estado.paso === 3 && !estado.enviado) { estado.animFase = ''; actualizarFase3(); }
      if (cambio && ultimaClave !== null) animar(cont, estado.dir === 'izq' ? 'anim-izq' : 'anim-der');
      ultimaClave = clave;
    }
    pintarResumen();
    const box = $('#authBox');
    if (box && !estado.enviado) {
      C.montarAuth(box, { modo: 'registro', onOk: function () { estado.error = ''; pintar(); animar($('#paso'), 'anim-der'); window.scrollTo({ top: 0 }); } });
    }
    pintarCabecera();
    guardarBorrador();
  }

  function pintarCabecera() {
    const a = $('#cuentaLink'); if (!a) return;
    const cli = C.Sesion.cliente();
    a.textContent = cli ? 'Mi cuenta (' + cli.nombre.split(' ')[0] + ')' : 'Ingresar';
  }

  function pintarResumen() {
    const r = calcular();
    $('#resumen').innerHTML = htmlResumen();
    // las líneas nuevas entran con una animación corta
    const actuales = {};
    document.querySelectorAll('#resumen .res-linea[data-lid]').forEach(function (el) {
      const id = el.getAttribute('data-lid'); actuales[id] = true;
      if (!prevLineas[id] && !reducir) el.classList.add('nueva');
    });
    prevLineas = actuales;
    $('#barraMovil').innerHTML = r.lineas.length
      ? '<div><div style="color:var(--mute);font-size:.8rem">Rango estimado, más IVA</div><div class="rango">' + clp(r.min) + ' a ' + clp(r.max) + '</div></div><a class="btn-link" href="#resumen">Ver detalle</a>'
      : '<div style="color:var(--mute);font-size:.9rem">Tu rango de precio aparece aquí</div>';
    if (prevRango && r.lineas.length && (prevRango.min !== r.min || prevRango.max !== r.max)) {
      tween(document.querySelector('#resumen .rango'), prevRango, r);
      tween(document.querySelector('#barraMovil .rango'), prevRango, r);
    }
    prevRango = { min: r.min, max: r.max };
  }

  /* ---------- navegación y validación ---------- */
  function validar(paso) {
    if (paso === 1) {
      if (estado.marca === '__otra') {
        if (!estado.marcaLibre.trim() || !estado.modeloLibre.trim()) return 'Escribe la marca y el modelo de tu vehículo.';
      } else if (!estado.marca || !estado.modelo) return 'Selecciona la marca y el modelo de tu vehículo.';
      if (!estado.carroceria) return 'Elige el tipo de carrocería.';
    }
    if (paso === 2 && !estado.servicios.length) return 'Elige al menos un servicio para continuar.';
    if (paso === 3) {
      const falta = serviciosElegidos().filter(function (s) { return !servicioListo(s); });
      if (falta.length) return 'Falta definir piezas u opciones en: ' + falta.map(function (s) { return s.nombre; }).join(', ') + '.';
    }
    if (paso === 4) {
      const c = estado.contacto;
      if (!C.Sesion.cliente()) return 'Crea tu cuenta o ingresa para enviar la cotización.';
      if (c.telefono.replace(/\D/g, '').length < 8) return 'Escribe un teléfono válido, con al menos 8 dígitos.';
      if (!estado.acepta) return 'Marca la casilla para aceptar los términos y el aviso de privacidad.';
    }
    return '';
  }

  function ir(n) {
    estado.dir = n < estado.paso ? 'izq' : 'der';
    if (n === 3 && estado.paso < 3) { const sels = serviciosElegidos(); if (sels.length) estado.activo = sels[0].id; }
    estado.paso = n; estado.error = ''; clearTimeout(estado._t); estado.avanzando = null;
    pintar(); window.scrollTo({ top: 0 });
  }

  function enviar() {
    const err = validar(4);
    if (err) { estado.error = err; pintar(); return; }
    const car = carActual(), r = calcular(), c = estado.contacto;
    const db = DB.get();
    const cli = C.Sesion.cliente();
    if (!cli) { estado.error = 'Tu sesión terminó. Ingresa de nuevo para enviar la cotización.'; pintar(); return; }
    cli.telefono = c.telefono.trim() || cli.telefono;
    const items = r.lineas.map(function (l) { return { servicio: l.id, nombre: l.nombre, detalle: l.detalle, min: l.min, max: l.max }; });
    r.evaluaciones.forEach(function (s) {
      items.push({ servicio: s.id, nombre: s.nombre, detalle: 'A evaluación técnica', min: null, max: null, evaluacion: true });
    });
    const folio = DB.siguienteFolio(db);
    const ahora = new Date().toISOString();
    const marca = estado.marca === '__otra' ? estado.marcaLibre.trim() : estado.marca;
    const modelo = estado.marca === '__otra' ? estado.modeloLibre.trim() : estado.modelo;
    db.solicitudes.push({
      folio: folio, fecha: ahora, estado: 'nueva', clienteId: cli.id,
      vehiculo: { marca: marca, modelo: modelo, carroceria: car.id, patente: c.patente.trim().toUpperCase() },
      items: items, totalMin: r.min, totalMax: r.max, precioFinal: null, motivoAjuste: '',
      modalidad: c.modalidad, comentario: c.comentario.trim(), fotos: c.fotos.slice(), aceptoTerminos: ahora,
      historial: [{ fecha: ahora, texto: 'Solicitud recibida desde la web' }]
    });
    // guarda el vehículo en la cuenta para la próxima vez
    cli.vehiculos = cli.vehiculos || [];
    const pat = c.patente.trim().toUpperCase();
    const yaEsta = cli.vehiculos.some(function (v) { return v.marca.toLowerCase() === marca.toLowerCase() && v.modelo.toLowerCase() === modelo.toLowerCase() && (v.patente || '') === pat; });
    if (!yaEsta && marca && modelo) cli.vehiculos.push({ id: 'v' + Date.now(), marca: marca, modelo: modelo, carroceria: car.id, patente: pat });
    if (!DB.save(db)) { db.solicitudes.pop(); estado.error = 'No pudimos guardar las fotos: ocupan demasiado espacio. Envía menos fotos e inténtalo de nuevo.'; pintar(); return; }
    borrarBorrador();
    estado.enviado = {
      folio: folio, telefono: c.telefono.trim(), vehiculo: nombreVehiculo() + ' (' + car.nombre + ')',
      servicios: items.map(function (i) { return i.nombre; }).join(', '),
      rango: r.lineas.length ? clp(r.min) + ' a ' + clp(r.max) : 'A evaluación técnica'
    };
    pintar();
    window.scrollTo({ top: 0 });
  }

  function reiniciar() {
    estado.paso = 1; estado.marca = ''; estado.modelo = ''; estado.marcaLibre = ''; estado.modeloLibre = '';
    estado.carroceria = null; estado.servicios = []; estado.activo = null; estado.piezas = {}; estado.niveles = {};
    estado.contacto = { nombre: '', telefono: '', email: '', patente: '', modalidad: 'remota', comentario: '', fotos: [] };
    estado.error = ''; estado.enviado = null; estado.acepta = false; estado.vehiculoId = null;
    borrarBorrador();
    pintar();
  }

  /* ---------- eventos ---------- */
  document.addEventListener('click', function (ev) {
    const pieza = ev.target.closest('#auto [data-pieza]');
    if (pieza) { togglePieza(pieza.getAttribute('data-pieza')); return; }
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    estado.error = '';

    if (act === 'ir') { ir(parseInt(el.getAttribute('data-n'), 10)); return; }
    if (act === 'carroceria') {
      estado.carroceria = id;
      document.querySelectorAll('.car-card').forEach(function (b) {
        const on = b.getAttribute('data-id') === id; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      });
      const er = $('#paso .error'); if (er) er.remove();
      pintarResumen(); return;
    }
    if (act === 'serv') {
      const i = estado.servicios.indexOf(id);
      if (i === -1) estado.servicios.push(id); else estado.servicios.splice(i, 1);
      const on = i === -1;
      el.classList.toggle('on', on); el.setAttribute('aria-pressed', on);
      const ck = el.querySelector('.check'); if (ck) ck.textContent = on ? '✓' : '';
      const er = $('#paso .error'); if (er) er.remove();
      return;
    }
    if (act === 'tab') {
      if (id === estado.activo) return;
      const sels = serviciosElegidos();
      const a = sels.findIndex(function (x) { return x.id === estado.activo; }), b = sels.findIndex(function (x) { return x.id === id; });
      clearTimeout(estado._t); estado.avanzando = null;
      estado.animFase = b > a ? 'der' : 'izq'; estado.activo = id; estado.error = '';
      pintar(); return;
    }
    if (act === 'pieza') { togglePieza(id); return; }
    if (act === 'fase_sig') { irFase(1); return; }
    if (act === 'fase_prev') { irFase(-1); return; }
    if (act === 'paquete') {
      const s = U.servicio(estado.activo);
      const pk = s.paquetes.find(function (x) { return x.id === id; });
      const disp = U.piezasServicio(s, estado.carroceria);
      estado.piezas[s.id] = pk.piezas === 'todas' ? disp.slice() : pk.piezas.filter(function (p) { return disp.indexOf(p) !== -1; });
      pintar(); return;
    }
    if (act === 'borrador_retomar') { retomarBorrador(); estado.dir = 'der'; ultimaClave = null; pintar(); window.scrollTo({ top: 0 }); return; }
    if (act === 'borrador_borrar') { borrarBorrador(); estado.borradorPendiente = null; pintar(); return; }
    if (act === 'veh') {
      const cli = C.Sesion.cliente(), v = cli && (cli.vehiculos || []).find(function (x) { return x.id === id; });
      if (!v) return;
      const fila = D.vehiculos.find(function (x) { return x.marca === v.marca; });
      const conocido = fila && fila.modelos.some(function (m) { return m[0] === v.modelo; });
      if (conocido) { estado.marca = v.marca; estado.modelo = v.modelo; estado.marcaLibre = ''; estado.modeloLibre = ''; }
      else { estado.marca = '__otra'; estado.marcaLibre = v.marca; estado.modeloLibre = v.modelo; estado.modelo = ''; }
      estado.carroceria = v.carroceria; estado.contacto.patente = v.patente || ''; estado.vehiculoId = v.id;
      pintar(); return;
    }
    if (act === 'salir') { C.Sesion.salir(); pintar(); return; }
    if (act === 'limpiar') { estado.piezas[estado.activo] = []; pintar(); return; }
    if (act === 'atras') { ir(estado.paso - 1); return; }
    if (act === 'sig') {
      const err = validar(estado.paso);
      if (err) {
        estado.error = err;
        if (estado.paso === 3) {
          const falta = serviciosElegidos().find(function (x) { return !servicioListo(x); });
          if (falta && falta.id !== estado.activo) { estado.activo = falta.id; estado.animFase = 'izq'; }
        }
        pintar(); return;
      }
      ir(estado.paso + 1); return;
    }
    if (act === 'enviar') { enviar(); return; }
    if (act === 'nueva') { reiniciar(); window.scrollTo({ top: 0 }); }
  });

  document.addEventListener('change', function (ev) {
    const t = ev.target;
    if (t.id === 'marca') {
      estado.marca = t.value; estado.modelo = ''; estado.vehiculoId = null;
      pintar(); return;
    }
    if (t.id === 'modelo') {
      estado.modelo = t.value;
      const fila = D.vehiculos.find(function (v) { return v.marca === estado.marca; });
      const m = fila && fila.modelos.find(function (x) { return x[0] === t.value; });
      if (m) estado.carroceria = m[1];
      pintar(); return;
    }
    if (t.hasAttribute && t.hasAttribute('data-nivel')) {
      const partes = t.getAttribute('data-nivel').split(':');
      const s = U.servicio(partes[0]);
      const actual = estado.niveles[s.id] || [];
      if (s.multiple) {
        const i = actual.indexOf(partes[1]);
        if (t.checked && i === -1) actual.push(partes[1]);
        if (!t.checked && i !== -1) actual.splice(i, 1);
        estado.niveles[s.id] = actual;
      } else {
        estado.niveles[s.id] = [partes[1]];
      }
      estado.error = '';
      clearTimeout(estado._t); estado.avanzando = null;
      if (!s.multiple) {
        const sels = serviciosElegidos(), idx = sels.findIndex(function (x) { return x.id === s.id; });
        if (idx !== -1 && idx < sels.length - 1) {
          estado.avanzando = s.id;
          estado._t = setTimeout(function () {
            if (estado.paso === 3 && estado.activo === s.id) irFase(1);
          }, 700);
        }
      }
      pintar(); return;
    }
    if (t.id === 'c_acepta') { estado.acepta = t.checked; const er = $('#paso .error'); if (er) er.remove(); return; }
    if (t.name === 'modalidad') {
      estado.contacto.modalidad = t.value;
      document.querySelectorAll('.radios label').forEach(function (l) {
        l.classList.toggle('on', l.querySelector('input').checked);
      });
      return;
    }
    if (t.id === 'c_fotos') {
      const nota = $('#fotosNota');
      if (nota) nota.textContent = 'Preparando fotos…';
      C.comprimirVarias(t.files, 6).then(function (urls) {
        estado.contacto.fotos = urls;
        const n2 = $('#fotosNota'), prev = $('#fotosPrev');
        if (n2) n2.textContent = urls.length ? urls.length + ' foto' + (urls.length > 1 ? 's' : '') + ' lista' + (urls.length > 1 ? 's' : '') + ' para enviar.' : 'No pudimos leer esas imágenes. Prueba con otras.';
        if (prev) prev.innerHTML = C.miniaturas(urls);
      });
    }
  });

  document.addEventListener('input', function (ev) {
    const t = ev.target, c = estado.contacto;
    if (t.id === 'marcaLibre') estado.marcaLibre = t.value;
    else if (t.id === 'modeloLibre') estado.modeloLibre = t.value;
    else if (t.id === 'c_patente') c.patente = t.value;
    else if (t.id === 'c_telefono') c.telefono = t.value;
    else if (t.id === 'c_comentario') c.comentario = t.value;
    if (/^c_/.test(t.id)) guardarBorrador();
    if (t.id === 'marcaLibre' || t.id === 'modeloLibre') pintarResumen();
  });

  document.addEventListener('mouseover', function (ev) {
    const p = ev.target.closest('#auto [data-pieza]');
    const etq = $('#etq');
    if (!etq) return;
    etq.textContent = p ? U.nombrePieza(p.getAttribute('data-pieza'), estado.carroceria) : 'Toca una pieza para marcarla';
  });

  $('#aviso').textContent = D.aviso;
  pintar();
})();
