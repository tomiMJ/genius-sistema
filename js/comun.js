/* ==========================================================
   GENIUS · piezas compartidas: fotos, ampliar imagen, sesión
   del cliente y formulario de cuenta (crear cuenta / ingresar).
   ========================================================== */
(function (global) {
  'use strict';

  const U = global.GeniusUtil, DB = global.GeniusDB, esc = U.esc;
  const SESION = 'genius_sesion';

  /* ---------- fotos: se reducen antes de guardarlas ---------- */
  function comprimirImagen(archivo, max, calidad) {
    max = max || 1000; calidad = calidad || 0.72;
    return new Promise(function (ok, mal) {
      if (!/^image\//.test(archivo.type)) return mal(new Error('El archivo no es una imagen.'));
      const lector = new FileReader();
      lector.onerror = function () { mal(new Error('No se pudo leer la imagen.')); };
      lector.onload = function () {
        const img = new Image();
        img.onerror = function () { mal(new Error('No se pudo abrir la imagen.')); };
        img.onload = function () {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', calidad));
        };
        img.src = lector.result;
      };
      lector.readAsDataURL(archivo);
    });
  }
  function comprimirVarias(lista, maximo) {
    const archivos = Array.prototype.slice.call(lista, 0, maximo || 6);
    return Promise.all(archivos.map(function (f) { return comprimirImagen(f).catch(function () { return null; }); }))
      .then(function (r) { return r.filter(Boolean); });
  }
  // Miniaturas que se pueden ampliar. Acepta fotos reales (data:) o nombres de archivo antiguos.
  function miniaturas(fotos, clase) {
    if (!fotos || !fotos.length) return '';
    return '<div class="' + (clase || 'minis') + '">' + fotos.map(function (f) {
      return /^data:image\//.test(f)
        ? '<img src="' + f + '" alt="Foto" data-zoom loading="lazy">'
        : '<span class="mini-nombre">' + esc(f) + '</span>';
    }).join('') + '</div>';
  }

  /* ---------- ampliar imagen ---------- */
  const css = document.createElement('style');
  css.textContent = '.lightbox{position:fixed;inset:0;background:rgba(0,0,0,.88);display:grid;place-items:center;z-index:200;padding:16px;cursor:zoom-out}' +
    '.lightbox img{max-width:100%;max-height:100%;border-radius:6px;object-fit:contain}' +
    '.lightbox button{position:absolute;top:12px;right:16px;background:none;border:0;color:#fff;font-size:2rem;cursor:pointer;line-height:1}' +
    '.minis{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.minis img{width:96px;height:72px;object-fit:cover;border-radius:6px;cursor:zoom-in;border:1px solid rgba(128,128,128,.4)}' +
    '.mini-nombre{font-size:.85rem;opacity:.75}';
  document.head.appendChild(css);
  function cerrarLightbox() { const l = document.getElementById('lightbox'); if (l) l.remove(); }
  document.addEventListener('click', function (e) {
    const z = e.target.closest && e.target.closest('img[data-zoom]');
    if (z) {
      cerrarLightbox();
      const l = document.createElement('div');
      l.className = 'lightbox'; l.id = 'lightbox'; l.setAttribute('role', 'dialog'); l.setAttribute('aria-label', 'Imagen ampliada');
      l.innerHTML = '<button aria-label="Cerrar">×</button><img alt="Foto ampliada" src="' + z.src + '">';
      document.body.appendChild(l);
      return;
    }
    if (e.target.closest && e.target.closest('#lightbox')) cerrarLightbox();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.getElementById('lightbox')) { cerrarLightbox(); e.stopImmediatePropagation(); }
  });

  /* ---------- sesión del cliente ---------- */
  const Sesion = {
    cuenta: function () {
      let id = null;
      try { id = global.localStorage.getItem(SESION); } catch (e) { /* ignorar */ }
      if (!id) return null;
      return (DB.get().cuentas || []).find(function (c) { return c.id === id; }) || null;
    },
    cliente: function () {
      const c = Sesion.cuenta();
      return c ? DB.get().clientes.find(function (x) { return x.id === c.clienteId; }) || null : null;
    },
    entrar: function (id) { try { global.localStorage.setItem(SESION, id); } catch (e) { /* ignorar */ } },
    salir: function () { try { global.localStorage.removeItem(SESION); } catch (e) { /* ignorar */ } }
  };


  /* ---------- mensajes al cliente (novedades, correo, WhatsApp) ----------
     En el prototipo los mensajes quedan en una bandeja y el socio los envía con
     un clic (abre WhatsApp o su correo). Con el hosting real, un proceso
     automático los envía solo. */
  const MESES_MANT = [3, 6, 12];
  const Msg = {
    crear: function (db, o) {
      db.notificaciones = db.notificaciones || [];
      if (o.id && db.notificaciones.some(function (n) { return n.id === o.id; })) return null;
      const n = { id: o.id || ('n' + Date.now() + Math.floor(Math.random() * 1000)), clienteId: o.clienteId, tipo: o.tipo || 'general',
        asunto: o.asunto, texto: o.texto, fecha: new Date().toISOString(), leida: false, enviada: { correo: false, wa: false }, ref: o.ref || null };
      db.notificaciones.push(n);
      return n;
    },
    deCliente: function (db, clienteId) {
      return (db.notificaciones || []).filter(function (n) { return n.clienteId === clienteId; })
        .sort(function (a, b) { return new Date(b.fecha) - new Date(a.fecha); });
    },
    linkWA: function (cli, texto) {
      const num = U.telefonoWA(cli && cli.telefono);
      return 'https://wa.me/' + num + '?text=' + encodeURIComponent(texto);
    },
    linkCorreo: function (cli, asunto, texto) {
      return 'mailto:' + encodeURIComponent((cli && cli.email) || '') + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(texto);
    },
    rellenar: function (texto, cli, vehiculo) {
      return String(texto).replace(/\{cliente\}/g, (cli && cli.nombre ? cli.nombre.split(' ')[0] : '')).replace(/\{vehiculo\}/g, vehiculo || 'vehículo');
    },
    firma: '\n\nEquipo Genius · Detailing AKNB',
    // Hitos de mantención (3, 6 y 12 meses) de trabajos entregados con sellado o film.
    mantenciones: function (db) {
      const salida = [];
      db.trabajos.forEach(function (t) {
        if (t.etapa !== 'entregado' || !t.fechaEntrega) return;
        const s = db.solicitudes.find(function (x) { return x.folio === t.folio; });
        if (!s || !s.items.some(function (i) { return /cer[aá]mico|ppf|paint protection/i.test(i.nombre); })) return;
        MESES_MANT.forEach(function (m) {
          const f = new Date(t.fechaEntrega); f.setMonth(f.getMonth() + m);
          salida.push({ trabajo: t, solicitud: s, meses: m, fecha: f, vencida: f.getTime() <= Date.now() });
        });
      });
      return salida.sort(function (a, b) { return a.fecha - b.fecha; });
    },
    // Crea el aviso de cada mantención que ya corresponde. Devuelve true si creó alguno.
    generarMantenciones: function (db) {
      let hubo = false;
      Msg.mantenciones(db).forEach(function (m) {
        if (!m.vencida) return;
        // solo se avisa el hito más reciente vencido y hasta 30 días después de su fecha
        if (Date.now() - m.fecha.getTime() > 30 * 86400000) return;
        const veh = m.solicitud.vehiculo.marca + ' ' + m.solicitud.vehiculo.modelo;
        const n = Msg.crear(db, { id: 'mant-' + m.trabajo.id + '-' + m.meses, clienteId: m.solicitud.clienteId, tipo: 'mantencion',
          asunto: 'Mantención de ' + m.meses + ' meses de tu ' + veh,
          texto: 'Hola, ya pasaron ' + m.meses + ' meses desde que entregamos tu ' + veh + '. Es un buen momento para la mantención del tratamiento. Responde este mensaje y te damos hora.' + Msg.firma,
          ref: { folio: m.trabajo.folio } });
        if (n) hubo = true;
      });
      return hubo;
    }
  };

  /* ---------- formulario de cuenta ---------- */
  function montarAuth(cont, opt) {
    opt = opt || {};
    let modo = opt.modo || 'registro', error = '', info = '', demoCodigo = '', cuentaRec = null;
    const v = { nombre: '', rut: '', email: '', telefono: '', pass: '', pass2: '', codigo: '' };
    let acepta = false;

    function pintar() {
      const reg = modo === 'registro', login = modo === 'login';
      const tabs = (reg || login) ? '<div class="tabs auth-tabs" role="tablist">' +
        '<button class="tab' + (reg ? ' on' : '') + '" type="button" data-auth="registro" role="tab" aria-selected="' + reg + '">Crear cuenta</button>' +
        '<button class="tab' + (login ? ' on' : '') + '" type="button" data-auth="login" role="tab" aria-selected="' + login + '">Ya tengo cuenta</button></div>' : '';
      let campos = '', boton = '', nota = '';
      if (reg) {
        campos = '<label class="campo">Nombre completo<input type="text" name="nombre" value="' + esc(v.nombre) + '" autocomplete="name" required></label>' +
          '<label class="campo">RUT<input type="text" name="rut" value="' + esc(v.rut) + '" placeholder="12.345.678-5" autocomplete="username" required></label>' +
          '<label class="campo">Correo<input type="email" name="email" value="' + esc(v.email) + '" autocomplete="email" required></label>' +
          '<label class="campo">Teléfono o WhatsApp<input type="tel" name="telefono" value="' + esc(v.telefono) + '" placeholder="+56 9 1234 5678" autocomplete="tel" required></label>' +
          '<label class="campo">Contraseña (mínimo 8 caracteres)<input type="password" name="pass" value="' + esc(v.pass) + '" autocomplete="new-password" required></label>' +
          '<label class="campo">Repite la contraseña<input type="password" name="pass2" value="' + esc(v.pass2) + '" autocomplete="new-password" required></label>' +
          '<label class="acepto acepto-reg"><input type="checkbox" name="acepta"' + (acepta ? ' checked' : '') + '><span>Acepto el <a href="privacidad.html#privacidad" target="_blank" rel="noopener">aviso de privacidad</a>.</span></label>';
        boton = 'Crear cuenta y continuar';
        nota = 'Usamos tu RUT y correo para identificarte y mostrarte cómo va tu vehículo. Cuenta de prueba: RUT 11.111.111-1, contraseña demo1234.';
      } else if (login) {
        campos = '<label class="campo">RUT o correo<input type="text" name="rut" value="' + esc(v.rut) + '" autocomplete="username" required></label>' +
          '<label class="campo">Contraseña<input type="password" name="pass" value="' + esc(v.pass) + '" autocomplete="current-password" required></label>' +
          '<p class="ancho" style="margin:-4px 0 0"><button class="btn-link" type="button" data-auth="olvido">¿Olvidaste tu contraseña?</button></p>';
        boton = 'Ingresar';
        nota = 'Cuenta de prueba: RUT 11.111.111-1, contraseña demo1234.';
      } else if (modo === 'olvido') {
        campos = '<p class="ancho" style="color:var(--mute)">Escribe tu RUT o correo y te enviamos un código para elegir una contraseña nueva.</p>' +
          '<label class="campo ancho">RUT o correo<input type="text" name="rut" value="' + esc(v.rut) + '" autocomplete="username" required></label>';
        boton = 'Enviar código';
      } else {
        campos = '<p class="ancho" style="color:var(--mute)">Si hay una cuenta con esos datos, enviamos un código de 6 dígitos a su correo. Vale por 30 minutos.</p>' +
          (demoCodigo ? '<p class="ancho demo-codigo">Modo prueba: el código sería <b>' + esc(demoCodigo) + '</b>. En el sitio real solo llega por correo.</p>' : '') +
          '<label class="campo">Código<input type="text" name="codigo" value="' + esc(v.codigo) + '" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required></label>' +
          '<label class="campo">Contraseña nueva (mínimo 8 caracteres)<input type="password" name="pass" value="' + esc(v.pass) + '" autocomplete="new-password" required></label>' +
          '<label class="campo">Repite la contraseña<input type="password" name="pass2" value="' + esc(v.pass2) + '" autocomplete="new-password" required></label>';
        boton = 'Cambiar contraseña';
      }
      cont.innerHTML = '<div class="auth">' + tabs + '<form class="form-grid" id="authForm" novalidate>' + campos +
        (info ? '<p class="ok-msg ancho" role="status">' + esc(info) + '</p>' : '') +
        (error ? '<p class="error ancho" role="alert">' + esc(error) + '</p>' : '') +
        '<div class="ancho"><button class="btn" type="submit">' + boton + '</button>' +
        ((modo === 'olvido' || modo === 'reset') ? ' <button class="btn-link" type="button" data-auth="login">Volver a ingresar</button>' : '') + '</div>' +
        (nota ? '<p class="auth-nota ancho">' + nota + '</p>' : '') + '</form></div>';
    }
    function leer() {
      const f = cont.querySelector('#authForm'); if (!f) return;
      Object.keys(v).forEach(function (k) { if (f.elements[k]) v[k] = f.elements[k].value; });
      if (f.elements.acepta) acepta = f.elements.acepta.checked;
    }
    function registrar() {
      const db = DB.get(); db.cuentas = db.cuentas || [];
      if (!v.nombre.trim()) return 'Escribe tu nombre completo.';
      if (!U.rutValido(v.rut)) return 'El RUT no es válido. Revisa el número y el dígito verificador.';
      if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) return 'Escribe un correo válido.';
      if (v.telefono.replace(/\D/g, '').length < 8) return 'Escribe un teléfono válido, con al menos 8 dígitos.';
      if (v.pass.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
      if (v.pass !== v.pass2) return 'Las contraseñas no coinciden.';
      if (!acepta) return 'Marca la casilla para aceptar el aviso de privacidad.';
      const rut = U.rutFormato(v.rut).replace(/\./g, '');
      if (db.cuentas.some(function (c) { return c.rut === rut; })) return 'Ya existe una cuenta con ese RUT. Usa "Ya tengo cuenta".';
      if (db.cuentas.some(function (c) { return c.email.toLowerCase() === v.email.trim().toLowerCase(); })) return 'Ya existe una cuenta con ese correo.';
      let cli = db.clientes.find(function (c) { return c.rut === rut; });
      if (!cli) {
        cli = { id: 'c' + Date.now(), rut: rut, nombre: v.nombre.trim(), telefono: v.telefono.trim(), email: v.email.trim(), origen: 'Cotizador web', notas: '', vehiculos: [], canal: 'ambos' };
        db.clientes.push(cli);
      } else { cli.email = cli.email || v.email.trim(); cli.telefono = v.telefono.trim() || cli.telefono; }
      const cuenta = { id: 'u' + Date.now(), rut: rut, email: v.email.trim(), hash: U.hash(v.pass), clienteId: cli.id, creada: new Date().toISOString(), aceptoPrivacidad: new Date().toISOString() };
      db.cuentas.push(cuenta);
      DB.save(db);
      Sesion.entrar(cuenta.id);
      return '';
    }
    function buscarCuenta(id) {
      const db = DB.get();
      const rut = U.rutFormato(id).replace(/\./g, '');
      return (db.cuentas || []).find(function (c) { return c.rut === rut || c.email.toLowerCase() === id.toLowerCase(); }) || null;
    }
    function ingresar() {
      const id = v.rut.trim();
      if (!id || !v.pass) return 'Escribe tu RUT o correo y tu contraseña.';
      const cuenta = buscarCuenta(id);
      if (!cuenta || cuenta.hash !== U.hash(v.pass)) return 'RUT, correo o contraseña incorrectos.';
      Sesion.entrar(cuenta.id);
      return '';
    }
    function pedirCodigo() {
      const id = v.rut.trim();
      if (!id) return 'Escribe tu RUT o tu correo.';
      const cuenta = buscarCuenta(id);
      const db = DB.get();
      demoCodigo = ''; cuentaRec = null;
      if (cuenta) {
        const codigo = String(Math.floor(100000 + Math.random() * 900000));
        db.recuperaciones = (db.recuperaciones || []).filter(function (r) { return r.cuentaId !== cuenta.id; });
        db.recuperaciones.push({ cuentaId: cuenta.id, codigo: codigo, expira: Date.now() + 30 * 60000, intentos: 0 });
        DB.save(db);
        cuentaRec = cuenta.id; demoCodigo = codigo;
      }
      return '';
    }
    function cambiarClave() {
      const db = DB.get();
      const rec = (db.recuperaciones || []).find(function (r) { return r.cuentaId === cuentaRec; });
      if (!rec) return 'No encontramos un código vigente. Pide uno nuevo.';
      if (rec.expira < Date.now()) return 'El código venció. Pide uno nuevo.';
      if (rec.intentos >= 5) return 'Demasiados intentos. Pide un código nuevo.';
      if (v.pass.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
      if (v.pass !== v.pass2) return 'Las contraseñas no coinciden.';
      if (v.codigo.trim() !== rec.codigo) { rec.intentos++; DB.save(db); return 'El código no es correcto.'; }
      const cuenta = db.cuentas.find(function (c) { return c.id === rec.cuentaId; });
      cuenta.hash = U.hash(v.pass);
      db.recuperaciones = db.recuperaciones.filter(function (r) { return r !== rec; });
      DB.save(db);
      return '';
    }
    cont.addEventListener('click', function (e) {
      const t = e.target.closest('[data-auth]');
      if (t) { leer(); modo = t.dataset.auth; error = ''; info = ''; v.pass = ''; v.pass2 = ''; v.codigo = ''; pintar(); }
    });
    cont.addEventListener('submit', function (e) {
      e.preventDefault(); leer();
      error = ''; info = '';
      if (modo === 'registro') error = registrar();
      else if (modo === 'login') error = ingresar();
      else if (modo === 'olvido') {
        error = pedirCodigo();
        if (!error) { modo = 'reset'; pintar(); return; }
      } else {
        error = cambiarClave();
        if (!error) { modo = 'login'; info = 'Listo. Cambiaste tu contraseña, ya puedes ingresar.'; v.pass = ''; v.pass2 = ''; v.codigo = ''; pintar(); return; }
      }
      if (error) { pintar(); return; }
      if (opt.onOk) opt.onOk(Sesion.cliente());
    });
    pintar();
  }

  global.GeniusComun = { comprimirImagen: comprimirImagen, comprimirVarias: comprimirVarias, miniaturas: miniaturas, Sesion: Sesion, montarAuth: montarAuth, Msg: Msg };
})(window);
