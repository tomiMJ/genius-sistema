/* ==========================================================
   GENIUS · dibujos de vehículo (vista superior)
   Una sola función genera cada carrocería con contorno curvo,
   vidrios, ruedas, espejos y luces. Cada pieza cotizable es un
   <g data-pieza="..."> que se recorta con el contorno del auto.
   Para ajustar proporciones, edita la tabla GEO.
   ========================================================== */
(function (global) {
  'use strict';

  const U = global.GeniusUtil;

  // w: ancho · hood: largo capó · cab: largo cabina · rear: largo zona trasera
  // bf / br: alto parachoques delantero / trasero · doors: 2 o 4 · tolva: caja abierta
  // nose / tail: ancho de la trompa y de la cola (fracción del ancho)
  // ws / rw: largo del parabrisas y del vidrio trasero (fracción de la cabina)
  const GEO = {
    hatchback: { w: 128, hood: 92, cab: 132, rear: 52, bf: 28, br: 24, doors: 4, nose: 0.80, tail: 0.78, ws: 0.24, rw: 0.26 },
    sedan: { w: 130, hood: 100, cab: 124, rear: 84, bf: 28, br: 26, doors: 4, nose: 0.80, tail: 0.82, ws: 0.26, rw: 0.20 },
    coupe: { w: 134, hood: 112, cab: 104, rear: 72, bf: 28, br: 26, doors: 2, nose: 0.78, tail: 0.84, ws: 0.30, rw: 0.22 },
    suv: { w: 146, hood: 94, cab: 160, rear: 58, bf: 30, br: 26, doors: 4, nose: 0.84, tail: 0.88, ws: 0.20, rw: 0.20 },
    camioneta: { w: 150, hood: 104, cab: 120, rear: 150, bf: 30, br: 26, doors: 4, tolva: true, nose: 0.84, tail: 0.92, ws: 0.26, rw: 0.12 },
    van: { w: 150, hood: 50, cab: 226, rear: 48, bf: 26, br: 24, doors: 4, nose: 0.78, tail: 0.90, ws: 0.16, rw: 0.12 }
  };

  const STROKE = '#6FA3B2';
  const STROKE_DEF = '#5E8E9C';
  let contador = 0;

  function f(n) { return Math.round(n * 10) / 10; }

  function svgAuto(id, opt) {
    opt = opt || {};
    const g = GEO[id];
    if (!g) return '';
    const sel = opt.sel || {};
    const mini = !!opt.mini;
    const uid = 'a' + (++contador);
    const VW = 340, VH = 500, cx = 170;
    const total = g.bf + g.hood + g.cab + g.rear + g.br;
    const yF = Math.round((VH - total) / 2);
    const yH = yF + g.bf;                 // inicio del capó
    const yW = yH + g.hood;               // base del parabrisas
    const yRear = yW + g.cab;             // fin de la cabina
    const yBr = yRear + g.rear;           // inicio del parachoques trasero
    const yR = yBr + g.br;                // cola
    const m = g.w / 2;                    // medio ancho
    const nn = m * g.nose, tt = m * g.tail;
    const dw = 27;                        // ancho de puerta
    const fw = 19;                        // ancho de aleta
    const hh = m - fw;                    // medio ancho del capó
    const wsL = g.cab * g.ws, rwL = g.cab * g.rw;
    const yRoof0 = yW + wsL, yRoof1 = yRear - rwL;
    const xL = cx - m - 8, xR = cx + m + 8;

    /* ---------- contorno del carro (curvas suaves) ---------- */
    // Nodos del lado derecho; cada segmento: [c1x, c1y, c2x, c2y, x, y] con x relativo al centro
    const nodos = [[0, yF]];
    const segs = [
      [nn * 0.55, yF, nn, yF + 2, nn, yF + g.bf * 0.85],
      [nn + (m - nn) * 0.25, yH + g.hood * 0.12, m, yH + g.hood * 0.28, m, yH + g.hood * 0.62],
      [m, yH + g.hood * 0.8, m, yRear - g.cab * 0.1, m, yRear - g.cab * 0.02],
      [m, yRear + g.rear * 0.35, tt, yBr - g.rear * 0.1, tt, yBr + g.br * 0.3],
      [tt, yR - 1, tt * 0.5, yR, 0, yR]
    ];
    let d = 'M' + f(cx) + ',' + f(yF);
    segs.forEach(function (s) {
      d += ' C' + f(cx + s[0]) + ',' + f(s[1]) + ' ' + f(cx + s[2]) + ',' + f(s[3]) + ' ' + f(cx + s[4]) + ',' + f(s[5]);
    });
    let prev = [[0, yF]].concat(segs.map(function (s) { return [s[4], s[5]]; }));
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i];
      d += ' C' + f(cx - s[2]) + ',' + f(s[3]) + ' ' + f(cx - s[0]) + ',' + f(s[1]) + ' ' + f(cx - prev[i][0]) + ',' + f(prev[i][1]);
    }
    d += ' Z';

    /* ---------- piezas ---------- */
    function parte(pid, dibujar, fuera) {
      const s = sel[pid];
      const fill = s ? s.fill : 'url(#gb' + uid + ')';
      const op = s ? s.op : 1;
      const stroke = s ? s.stroke : STROKE_DEF;
      const sw = s && s.op > 0.9 ? 2 : 1.2;
      const attrs = 'fill="' + fill + '" fill-opacity="' + op + '" stroke="' + stroke +
        '" stroke-width="' + sw + '" stroke-linejoin="round"';
      const titulo = mini ? '' : '<title>' + U.esc(U.nombrePieza(pid, id)) + '</title>';
      return '<g class="pieza' + (s ? ' sel' : '') + '" data-pieza="' + pid + '">' + dibujar(attrs) + titulo + '</g>';
    }
    function rect(x, y, w, h, r) {
      return function (a) { return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" rx="' + r + '" ' + a + '/>'; };
    }
    function trazo(p) { return function (a) { return '<path d="' + p + '" ' + a + '/>'; }; }
    const vidrio = 'fill="url(#gv' + uid + ')" stroke="' + STROKE_DEF + '" stroke-width="1" stroke-linejoin="round"';

    // posición de las ruedas
    const ycF = yH + g.hood * 0.5;
    const ycR = g.tolva ? yRear + 34 : yRear - 22;

    let s = '<defs>' +
      '<clipPath id="cp' + uid + '"><path d="' + d + '"/></clipPath>' +
      '<linearGradient id="gb' + uid + '" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#17404D"/><stop offset=".5" stop-color="#1E4D5D"/><stop offset="1" stop-color="#17404D"/></linearGradient>' +
      '<linearGradient id="gv' + uid + '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2A4A55"/><stop offset=".55" stop-color="#091A20"/><stop offset="1" stop-color="#0B1E25"/></linearGradient>' +
      '<radialGradient id="gs' + uid + '"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>';

    // sombra en el piso
    s += '<ellipse cx="' + cx + '" cy="' + f((yF + yR) / 2 + 6) + '" rx="' + f(m + 26) + '" ry="' + f(total / 2 + 12) + '" fill="url(#gs' + uid + ')"/>';

    // ruedas (la mitad queda tapada por la carrocería)
    [[-1, ycF], [1, ycF], [-1, ycR], [1, ycR]].forEach(function (w) {
      s += '<rect x="' + f(cx + w[0] * (m - 1) - 7) + '" y="' + f(w[1] - 24) + '" width="14" height="48" rx="5" fill="#050D10" stroke="#3F6672" stroke-width="1"/>';
    });

    // contorno
    s += '<path d="' + d + '" fill="url(#gb' + uid + ')" stroke="' + STROKE + '" stroke-width="1.6"/>';

    s += '<g clip-path="url(#cp' + uid + ')">';
    // aletas
    const hoodTop = hh * 0.82;
    s += parte('aleta_i', trazo('M' + f(xL) + ',' + f(yH - 2) + ' L' + f(cx - hoodTop) + ',' + f(yH - 2) + ' L' + f(cx - hh) + ',' + f(yW) + ' L' + f(xL) + ',' + f(yW) + ' Z'));
    s += parte('aleta_d', trazo('M' + f(xR) + ',' + f(yH - 2) + ' L' + f(cx + hoodTop) + ',' + f(yH - 2) + ' L' + f(cx + hh) + ',' + f(yW) + ' L' + f(xR) + ',' + f(yW) + ' Z'));
    // capó
    s += parte('capo', trazo('M' + f(cx - hoodTop) + ',' + f(yH - 2) + ' Q' + f(cx) + ',' + f(yH - 6) + ' ' + f(cx + hoodTop) + ',' + f(yH - 2) +
      ' L' + f(cx + hh) + ',' + f(yW) + ' L' + f(cx - hh) + ',' + f(yW) + ' Z'));
    // parachoques delantero
    s += parte('par_del', trazo('M' + f(xL) + ',' + f(yF - 3) + ' L' + f(xR) + ',' + f(yF - 3) + ' L' + f(xR) + ',' + f(yH - 1) + ' Q' + f(cx) + ',' + f(yH + 7) + ' ' + f(xL) + ',' + f(yH - 1) + ' Z'));
    // línea del capó (relieve)
    s += '<path d="M' + f(cx) + ',' + f(yH + 8) + ' L' + f(cx) + ',' + f(yW - 4) + '" stroke="#6FA3B2" stroke-opacity=".28" stroke-width="1" fill="none" pointer-events="none"/>';

    // vidrios
    const wb = m - dw + 4;                 // medio ancho de la base del parabrisas
    s += '<path d="M' + f(cx - wb) + ',' + f(yW) + ' L' + f(cx + wb) + ',' + f(yW) + ' L' + f(cx + wb - 9) + ',' + f(yRoof0) + ' L' + f(cx - wb + 9) + ',' + f(yRoof0) + ' Z" ' + vidrio + '/>';
    s += '<path d="M' + f(cx - wb + 9) + ',' + f(yRear - rwL) + ' L' + f(cx + wb - 9) + ',' + f(yRear - rwL) + ' L' + f(cx + wb - 3) + ',' + f(yRear) + ' L' + f(cx - wb + 3) + ',' + f(yRear) + ' Z" ' + vidrio + '/>';
    s += '<path d="M' + f(cx - wb + 14) + ',' + f(yW + 4) + ' L' + f(cx - wb + 34) + ',' + f(yW + 4) + ' L' + f(cx - wb + 28) + ',' + f(yRoof0 - 4) + ' L' + f(cx - wb + 16) + ',' + f(yRoof0 - 4) + ' Z" fill="#fff" fill-opacity=".07" pointer-events="none"/>';

    // techo
    s += parte('techo', rect(cx - (m - dw - 1), yRoof0 + 1, (m - dw - 1) * 2, yRoof1 - yRoof0 - 2, 12));
    if (id === 'suv' || id === 'camioneta' || id === 'van') {
      s += '<path d="M' + f(cx - (m - dw - 8)) + ',' + f(yRoof0 + 8) + ' V' + f(yRoof1 - 8) + ' M' + f(cx + (m - dw - 8)) + ',' + f(yRoof0 + 8) + ' V' + f(yRoof1 - 8) + '" stroke="#9CC3CF" stroke-opacity=".35" stroke-width="2" stroke-linecap="round" fill="none" pointer-events="none"/>';
    }

    // puertas
    const dTop = yW + 3, dBot = yRear - 3;
    const dx0 = cx - m - 8, dx1 = cx - (m - dw), dx2 = cx + (m - dw), dx3 = cx + m + 8;
    if (g.doors === 4) {
      const mid = (dTop + dBot) / 2;
      s += parte('puerta_di', rect(dx0, dTop, dx1 - dx0, mid - dTop - 1, 8));
      s += parte('puerta_ti', rect(dx0, mid + 1, dx1 - dx0, dBot - mid - 1, 8));
      s += parte('puerta_dd', rect(dx2, dTop, dx3 - dx2, mid - dTop - 1, 8));
      s += parte('puerta_td', rect(dx2, mid + 1, dx3 - dx2, dBot - mid - 1, 8));
    } else {
      s += parte('puerta_di', rect(dx0, dTop, dx1 - dx0, dBot - dTop, 8));
      s += parte('puerta_dd', rect(dx2, dTop, dx3 - dx2, dBot - dTop, 8));
    }
    // lips: borde entre puertas y techo
    s += parte('lips', function (a) {
      return '<rect x="' + f(cx - (m - dw) - 3) + '" y="' + f(dTop + 6) + '" width="6" height="' + f(dBot - dTop - 12) + '" rx="3" ' + a + '/>' +
        '<rect x="' + f(cx + (m - dw) - 3) + '" y="' + f(dTop + 6) + '" width="6" height="' + f(dBot - dTop - 12) + '" rx="3" ' + a + '/>';
    });

    // zona trasera
    const tr1 = m - dw * 0.55;
    if (g.tolva) {
      s += parte('trasera', function (a) {
        return '<path d="M' + f(cx - tr1 - 8) + ',' + f(yRear) + ' L' + f(cx + tr1 + 8) + ',' + f(yRear) + ' L' + f(cx + tt + 8) + ',' + f(yBr) + ' L' + f(cx - tt - 8) + ',' + f(yBr) + ' Z" ' + a + '/>' +
          '<rect x="' + f(cx - tr1 + 8) + '" y="' + f(yRear + 10) + '" width="' + f((tr1 - 8) * 2) + '" height="' + f(g.rear - 22) + '" rx="4" fill="#0A1C22" fill-opacity=".75" stroke="#5E8E9C" stroke-width="1" pointer-events="none"/>' +
          [0.25, 0.5, 0.75].map(function (k) {
            return '<line x1="' + f(cx - tr1 + 12) + '" x2="' + f(cx + tr1 - 12) + '" y1="' + f(yRear + 10 + (g.rear - 22) * k) + '" y2="' + f(yRear + 10 + (g.rear - 22) * k) + '" stroke="#5E8E9C" stroke-opacity=".45" stroke-width="1" pointer-events="none"/>';
          }).join('');
      });
    } else {
      s += parte('trasera', trazo('M' + f(cx - tr1 - 8) + ',' + f(yRear) + ' L' + f(cx + tr1 + 8) + ',' + f(yRear) + ' L' + f(cx + tt + 8) + ',' + f(yBr) + ' L' + f(cx - tt - 8) + ',' + f(yBr) + ' Z'));
    }
    // parachoques trasero
    s += parte('par_tras', trazo('M' + f(xL) + ',' + f(yBr + 1) + ' Q' + f(cx) + ',' + f(yBr - 5) + ' ' + f(xR) + ',' + f(yBr + 1) + ' L' + f(xR) + ',' + f(yR + 3) + ' L' + f(xL) + ',' + f(yR + 3) + ' Z'));

    // luces traseras (decorativas)
    [-1, 1].forEach(function (k) {
      s += '<rect x="' + f(cx + k * (tt - 16) - 8) + '" y="' + f(yBr - 7) + '" width="16" height="6" rx="3" fill="#9B3A3A" fill-opacity=".8" pointer-events="none"/>';
    });

    // máscara frontal y focos
    s += parte('mascara', rect(cx - 27, yF + 4, 54, 9, 4));
    s += parte('focos', function (a) {
      let o = '';
      [-1, 1].forEach(function (k) {
        o += '<ellipse cx="' + f(cx + k * nn * 0.68) + '" cy="' + f(yH + 3) + '" rx="17" ry="6" transform="rotate(' + (k * -16) + ' ' + f(cx + k * nn * 0.68) + ' ' + f(yH + 3) + ')" ' + a + '/>' +
          '<circle cx="' + f(cx + k * nn * 0.58) + '" cy="' + f(yF + g.bf * 0.62) + '" r="3.5" ' + a + '/>';
      });
      return o;
    });
    s += '</g>';

    // cubre ruedas (guardabarros) y espejos: sobresalen del contorno
    function flare(k, yc) {
      const x = cx + k * (m - 3);
      return function (a) {
        return '<path d="M' + f(x) + ',' + f(yc - 28) + ' Q' + f(x + k * 17) + ',' + f(yc) + ' ' + f(x) + ',' + f(yc + 28) + ' Q' + f(x + k * 7) + ',' + f(yc) + ' ' + f(x) + ',' + f(yc - 28) + ' Z" ' + a + '/>';
      };
    }
    s += parte('cubre_del', function (a) { return flare(-1, ycF)(a) + flare(1, ycF)(a); });
    s += parte('cubre_tras', function (a) { return flare(-1, ycR)(a) + flare(1, ycR)(a); });
    function espejo(k) {
      const x = cx + k * (m - 2), y = yW + wsL * 0.55;
      return function (a) {
        return '<path d="M' + f(x) + ',' + f(y) + ' Q' + f(x + k * 8) + ',' + f(y - 3) + ' ' + f(x + k * 16) + ',' + f(y + 2) + ' Q' + f(x + k * 17) + ',' + f(y + 15) + ' ' + f(x + k * 7) + ',' + f(y + 17) +
          ' Q' + f(x + k * 1) + ',' + f(y + 11) + ' ' + f(x) + ',' + f(y + 7) + ' Z" ' + a + '/>';
      };
    }
    s += parte('espejo_i', espejo(-1));
    s += parte('espejo_d', espejo(1));

    if (!mini) {
      s += '<text x="' + cx + '" y="' + (yF - 12) + '" text-anchor="middle" fill="#8FA6AE" font-size="11" font-family="Instrument Sans, sans-serif">Frente</text>';
      s += '<text x="' + cx + '" y="' + (yR + 22) + '" text-anchor="middle" fill="#8FA6AE" font-size="11" font-family="Instrument Sans, sans-serif">Atrás</text>';
    }

    return '<svg class="auto-svg' + (mini ? ' mini' : '') + '" viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Plano del vehículo, tipo ' +
      U.esc((U.carroceria(id) || {}).nombre || id) + '" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
  }

  global.GeniusAutos = { svgAuto: svgAuto, GEO: GEO };
})(window);
