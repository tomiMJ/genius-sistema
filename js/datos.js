/* ==========================================================
   GENIUS · datos y utilidades compartidas
   ----------------------------------------------------------
   TODOS LOS PRECIOS DE ESTE ARCHIVO SON DE EJEMPLO.
   Cuando tengas la lista real, solo edita los números de
   "precios" y "niveles" (o hazlo desde admin.html > Catálogo
   y precios, que guarda los cambios en el navegador).
   Los precios están definidos para un hatchback; el resto de
   carrocerías multiplica por su "factor".
   ========================================================== */
(function (global) {
  'use strict';

  const DATOS = {
    aviso: 'Prototipo con precios de ejemplo. Todos los valores son netos, más IVA.',
    whatsapp: '56946447572',
    capacidadMensual: 4,
    rango: { min: 0.92, max: 1.15 },

    carrocerias: [
      { id: 'hatchback', nombre: 'Hatchback', factor: 1.0, trasera: 'Portón trasero', puertas: 4 },
      { id: 'sedan', nombre: 'Sedán', factor: 1.05, trasera: 'Maleta', puertas: 4 },
      { id: 'coupe', nombre: 'Coupé', factor: 1.05, trasera: 'Maleta', puertas: 2 },
      { id: 'suv', nombre: 'SUV', factor: 1.2, trasera: 'Portón trasero', puertas: 4 },
      { id: 'camioneta', nombre: 'Camioneta', factor: 1.3, trasera: 'Tolva', puertas: 4 },
      { id: 'van', nombre: 'Van o minivan', factor: 1.4, trasera: 'Portón trasero', puertas: 4 }
    ],

    piezas: [
      { id: 'par_del', nombre: 'Parachoques delantero' },
      { id: 'capo', nombre: 'Capó' },
      { id: 'aleta_i', nombre: 'Aleta izquierda' },
      { id: 'aleta_d', nombre: 'Aleta derecha' },
      { id: 'espejo_i', nombre: 'Espejo izquierdo' },
      { id: 'espejo_d', nombre: 'Espejo derecho' },
      { id: 'puerta_di', nombre: 'Puerta delantera izquierda' },
      { id: 'puerta_dd', nombre: 'Puerta delantera derecha' },
      { id: 'puerta_ti', nombre: 'Puerta trasera izquierda' },
      { id: 'puerta_td', nombre: 'Puerta trasera derecha' },
      { id: 'techo', nombre: 'Techo' },
      { id: 'mascara', nombre: 'Máscara frontal' },
      { id: 'cubre_del', nombre: 'Cubre ruedas delanteros (2)' },
      { id: 'cubre_tras', nombre: 'Cubre ruedas traseros (2)' },
      { id: 'lips', nombre: 'Lips de puertas (2)' },
      { id: 'focos', nombre: 'Focos y neblineros' },
      { id: 'trasera', nombre: 'Maleta / portón / tolva' },
      { id: 'par_tras', nombre: 'Parachoques trasero' }
    ],

    servicios: [
      {
        id: 'ppf', nombre: 'Paint Protection Film (PPF)', tipo: 'pieza', color: '#F4C430',
        desc: 'Film transparente que protege la pintura de piedrazos y rayas. Precios por pieza, más IVA.',
        precios: {
          par_del: 215000, capo: 281000, aleta_i: 110000, aleta_d: 110000, mascara: 115000,
          cubre_del: 215000, cubre_tras: 446000, lips: 277000, focos: 46000,
          espejo_i: 38000, espejo_d: 38000, puerta_di: 123000, puerta_dd: 123000,
          puerta_ti: 123000, puerta_td: 123000, techo: 281000, trasera: 169000, par_tras: 215000
        },
        paquetes: [
          { id: 'frontal', nombre: 'Kit frontal', piezas: ['capo', 'par_del', 'mascara', 'cubre_del', 'espejo_i', 'espejo_d', 'focos'], descuento: 0 },
          { id: 'impacto', nombre: 'Kit alto impacto', piezas: ['capo', 'par_del', 'mascara', 'cubre_del', 'par_tras', 'espejo_i', 'espejo_d', 'focos'], descuento: 0 },
          { id: 'full', nombre: 'Full protección', piezas: 'todas', descuento: 0 }
        ]
      },
      {
        id: 'ceramico', nombre: 'Sellado cerámico', tipo: 'paquete', multiple: false,
        desc: 'Capa cerámica que da brillo profundo y repele agua y suciedad.',
        niveles: [
          { id: 'basico', nombre: 'Una capa', detalle: 'Protección base con brillo', base: 250000 },
          { id: 'premium', nombre: 'Multicapa', detalle: 'Mayor durabilidad y espesor', base: 380000 }
        ]
      },
      {
        id: 'laminas', nombre: 'Láminas de seguridad', tipo: 'paquete', multiple: false,
        desc: 'Refuerzan los vidrios ante impactos e intentos de robo.',
        niveles: [
          { id: 'laterales', nombre: 'Laterales y trasera', detalle: 'Sin parabrisas', base: 180000 },
          { id: 'completo', nombre: 'Todos los vidrios', detalle: 'Incluye parabrisas', base: 260000 }
        ]
      },
      {
        id: 'polarizado', nombre: 'Polarizado', tipo: 'paquete', multiple: false,
        desc: 'Láminas de control solar y privacidad.',
        niveles: [
          { id: 'laterales', nombre: 'Laterales y trasero', detalle: 'Vidrios traseros', base: 90000 },
          { id: 'completo', nombre: 'Completo', detalle: 'Incluye parabrisas', base: 120000 }
        ]
      },
      {
        id: 'wrap', nombre: 'Wrap y cambio de color', tipo: 'pieza', color: '#F0836B',
        desc: 'Vinilo para cambiar color o personalizar piezas.',
        precios: {
          par_del: 110000, capo: 140000, aleta_i: 80000, aleta_d: 80000,
          espejo_i: 40000, espejo_d: 40000, puerta_di: 120000, puerta_dd: 120000,
          puerta_ti: 110000, puerta_td: 110000, techo: 150000, trasera: 120000, par_tras: 100000
        },
        paquetes: [
          { id: 'color', nombre: 'Cambio de color completo', piezas: 'todas', descuento: 0.12 }
        ]
      },
      {
        id: 'pulido', nombre: 'Pulido de carrocería', tipo: 'pieza', color: '#5FD0E0',
        desc: 'Corrige rayas finas y devuelve el brillo de la pintura.',
        precios: {
          par_del: 20000, capo: 30000, aleta_i: 20000, aleta_d: 20000,
          espejo_i: 20000, espejo_d: 20000, puerta_di: 25000, puerta_dd: 25000,
          puerta_ti: 25000, puerta_td: 25000, techo: 35000, trasera: 30000, par_tras: 20000
        },
        paquetes: [
          { id: 'completo', nombre: 'Vehículo completo', piezas: 'todas', descuento: 0.15 }
        ]
      },
      {
        id: 'detailing', nombre: 'Detailing y limpieza', tipo: 'paquete', multiple: true,
        desc: 'Limpieza profunda interior y exterior. Puedes combinar opciones.',
        niveles: [
          { id: 'limpieza', nombre: 'Limpieza full', detalle: 'Interior y exterior', base: 70000 },
          { id: 'tapiz', nombre: 'Sanitización y lavado de tapiz', detalle: 'Asientos y alfombras', base: 40000 },
          { id: 'detail', nombre: 'Detailing completo', detalle: 'Limpieza y acabados finos', base: 180000 }
        ]
      },
      {
        id: 'pintura', nombre: 'Desabolladura y pintura', tipo: 'evaluacion',
        desc: 'Se cotiza tras una evaluación técnica. Adjunta fotos del daño y te contactamos.'
      }
    ],

    vehiculos: [
      { marca: 'Audi', modelos: [['A3', 'sedan'], ['Q3', 'suv'], ['Q5', 'suv'], ['TT', 'coupe']] },
      { marca: 'BMW', modelos: [['Serie 1', 'hatchback'], ['Serie 3', 'sedan'], ['Serie 4', 'coupe'], ['X3', 'suv'], ['X5', 'suv']] },
      { marca: 'Chevrolet', modelos: [['Spark', 'hatchback'], ['Sail', 'sedan'], ['Tracker', 'suv'], ['Captiva', 'suv'], ['D-Max', 'camioneta'], ['Silverado', 'camioneta']] },
      { marca: 'Ford', modelos: [['Fiesta', 'hatchback'], ['Mustang', 'coupe'], ['Escape', 'suv'], ['Ranger', 'camioneta'], ['F-150', 'camioneta'], ['Transit', 'van']] },
      { marca: 'Hyundai', modelos: [['Grand i10', 'hatchback'], ['Accent', 'sedan'], ['Elantra', 'sedan'], ['Tucson', 'suv'], ['Santa Fe', 'suv'], ['H1', 'van']] },
      { marca: 'Jeep', modelos: [['Renegade', 'suv'], ['Compass', 'suv'], ['Wrangler', 'suv'], ['Gladiator', 'camioneta']] },
      { marca: 'Kia', modelos: [['Morning', 'hatchback'], ['Rio', 'sedan'], ['Sportage', 'suv'], ['Sorento', 'suv'], ['Carnival', 'van']] },
      { marca: 'Mazda', modelos: [['Mazda2', 'hatchback'], ['Mazda3', 'sedan'], ['MX-5', 'coupe'], ['CX-30', 'suv'], ['CX-5', 'suv'], ['BT-50', 'camioneta']] },
      { marca: 'Mercedes-Benz', modelos: [['Clase A', 'sedan'], ['Clase C', 'sedan'], ['GLC', 'suv'], ['Sprinter', 'van']] },
      { marca: 'Nissan', modelos: [['March', 'hatchback'], ['Versa', 'sedan'], ['Kicks', 'suv'], ['Qashqai', 'suv'], ['X-Trail', 'suv'], ['Navara', 'camioneta']] },
      { marca: 'Peugeot', modelos: [['208', 'hatchback'], ['3008', 'suv'], ['Partner', 'van']] },
      { marca: 'Subaru', modelos: [['Impreza', 'hatchback'], ['WRX', 'sedan'], ['XV', 'suv'], ['Forester', 'suv']] },
      { marca: 'Suzuki', modelos: [['Swift', 'hatchback'], ['Jimny', 'suv'], ['Vitara', 'suv']] },
      { marca: 'Tesla', modelos: [['Model 3', 'sedan'], ['Model Y', 'suv']] },
      { marca: 'Toyota', modelos: [['Yaris', 'hatchback'], ['Corolla', 'sedan'], ['RAV4', 'suv'], ['Hilux', 'camioneta'], ['Hiace', 'van']] },
      { marca: 'Volkswagen', modelos: [['Gol', 'hatchback'], ['Virtus', 'sedan'], ['T-Cross', 'suv'], ['Amarok', 'camioneta'], ['Caddy', 'van']] }
    ]
  };

  /* ---------- utilidades ---------- */
  const U = {
    clp: function (n) {
      return '$' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    },
    esc: function (s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    },
    carroceria: function (id) {
      return DATOS.carrocerias.find(function (c) { return c.id === id; }) || null;
    },
    servicio: function (id) {
      return DATOS.servicios.find(function (s) { return s.id === id; }) || null;
    },
    nombrePieza: function (pid, carId) {
      if (pid === 'trasera') {
        const c = U.carroceria(carId);
        return c ? c.trasera : 'Maleta / portón / tolva';
      }
      const p = DATOS.piezas.find(function (x) { return x.id === pid; });
      return p ? p.nombre : pid;
    },
    piezasServicio: function (servicio, carId) {
      return U.piezasDisponibles(carId).filter(function (id) { return !servicio.precios || servicio.precios[id] != null; });
    },
    piezasDisponibles: function (carId) {
      const c = U.carroceria(carId);
      return DATOS.piezas.map(function (p) { return p.id; }).filter(function (id) {
        if (c && c.puertas === 2 && (id === 'puerta_ti' || id === 'puerta_td')) return false;
        return true;
      });
    },
    redondear: function (n, modo) {
      return modo === 'abajo' ? Math.floor(n / 1000) * 1000 : Math.ceil(n / 1000) * 1000;
    },
    rango: function (servicio, total) {
      const r = (servicio && servicio.rango) || DATOS.rango;
      return [U.redondear(total * r.min, 'abajo'), U.redondear(total * r.max, 'arriba')];
    },
    rutLimpiar: function (r) { return String(r || '').replace(/[^0-9kK]/g, '').toUpperCase(); },
    rutValido: function (r) {
      const c = U.rutLimpiar(r);
      if (c.length < 8) return false;
      const cuerpo = c.slice(0, -1), dv = c.slice(-1);
      if (!/^\d{7,8}$/.test(cuerpo)) return false;
      let suma = 0, m = 2;
      for (let i = cuerpo.length - 1; i >= 0; i--) { suma += parseInt(cuerpo.charAt(i), 10) * m; m = m === 7 ? 2 : m + 1; }
      const res = 11 - (suma % 11);
      return (res === 11 ? '0' : res === 10 ? 'K' : String(res)) === dv;
    },
    rutFormato: function (r) {
      const c = U.rutLimpiar(r);
      if (c.length < 2) return c;
      return c.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + c.slice(-1);
    },
    // Solo para el prototipo. La versión real usa password_hash() de PHP en el servidor.
    hash: function (txt) {
      const s = String(txt) + '|genius';
      let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
      for (let i = 0; i < s.length; i++) {
        const ch = s.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
    },
    fotoDemo: function (texto, color) {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + color + '"/><stop offset="1" stop-color="#0D1B21"/></linearGradient></defs><rect width="640" height="420" fill="url(#g)"/><text x="320" y="215" text-anchor="middle" fill="#fff" font-family="Arial" font-size="34">' + texto + '</text><text x="320" y="255" text-anchor="middle" fill="#ffffffaa" font-family="Arial" font-size="18">Foto de ejemplo</text></svg>';
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    },
    telefonoWA: function (tel) {
      let d = String(tel || '').replace(/\D/g, '');
      if (d.length === 9 && d.charAt(0) === '9') d = '56' + d;
      return d;
    }
  };

  /* ---------- "base de datos" local (localStorage) ---------- */
  const KEY = 'genius_db_v2';
  let memoria = null;

  function dias(n) {
    return new Date(Date.now() - n * 86400000).toISOString();
  }

  // trabajos ya entregados (para el historial y las finanzas de ejemplo)
  function historicos(db) {
    const H = [
      [4, 'c6', 'Tesla', 'Model 3', 'sedan', 'Sellado cerámico', 'Multicapa', 420000, 50],
      [12, 'c7', 'Ford', 'Ranger', 'camioneta', 'Paint Protection Film (PPF)', 'Kit frontal', 1150000, 70],
      [20, 'c2', 'Mazda', 'CX-5', 'suv', 'Pulido de carrocería', 'Vehículo completo', 280000, 50],
      [38, 'c8', 'Toyota', 'Hilux', 'camioneta', 'Polarizado', 'Completo', 150000, 50],
      [52, 'c9', 'BMW', 'Serie 3', 'sedan', 'Sellado cerámico', 'Multicapa', 450000, 70],
      [75, 'c4', 'Hyundai', 'Tucson', 'suv', 'Detailing y limpieza', 'Detailing completo', 230000, 50],
      [110, 'c3', 'Nissan', 'Kicks', 'suv', 'Láminas de seguridad', 'Todos los vidrios', 310000, 50],
      [160, 'c7', 'Ford', 'Ranger', 'camioneta', 'Pulido de carrocería', 'Vehículo completo', 320000, 50],
      [230, 'c5', 'Kia', 'Morning', 'hatchback', 'Sellado cerámico', 'Una capa', 260000, 50],
      [300, 'c8', 'Toyota', 'Hilux', 'camioneta', 'Paint Protection Film (PPF)', 'Full protección', 3100000, 70],
      [390, 'c1', 'Toyota', 'RAV4', 'suv', 'Sellado cerámico', 'Multicapa', 480000, 50]
    ];
    H.forEach(function (h, i) {
      const folio = 'GEN-' + String(7 + i).padStart(4, '0');
      const abono = Math.round(h[7] * h[8] / 100);
      db.solicitudes.push({
        folio: folio, fecha: dias(h[0] + 9), estado: 'aceptada', clienteId: h[1],
        vehiculo: { marca: h[2], modelo: h[3], carroceria: h[4] },
        items: [{ servicio: 'x', nombre: h[5], detalle: h[6], min: Math.round(h[7] * 0.92), max: Math.round(h[7] * 1.15) }],
        totalMin: Math.round(h[7] * 0.92), totalMax: Math.round(h[7] * 1.15), precioFinal: h[7], motivoAjuste: 'Valor acordado con el cliente',
        modalidad: 'presencial', comentario: '', fotos: [],
        historial: [{ fecha: dias(h[0] + 9), texto: 'Solicitud recibida desde la web' }, { fecha: dias(h[0] + 7), texto: 'Estado: Cotización enviada a Aceptada' }]
      });
      db.trabajos.push({
        id: 'th' + (i + 1), folio: folio, etapa: 'entregado', precioFinal: h[7], abonoPct: h[8], abonoPagado: true, materialesPedidos: true,
        apoyoExterno: false, apoyoDetalle: '', checklist: [true, true, true, true], saldoPagado: true, notas: '',
        fechaInicio: dias(h[0] + 6), fechaEntrega: dias(h[0]),
        pagos: [{ fecha: dias(h[0] + 6), monto: abono, tipo: 'abono' }, { fecha: dias(h[0]), monto: h[7] - abono, tipo: 'saldo' }],
        actualizaciones: [{ id: 'ah' + (i + 1), fecha: dias(h[0]), texto: 'Entregamos tu vehículo. Gracias por confiar en Genius.', fotos: i === 0 ? [U.fotoDemo('Entrega final', '#1E8A5B')] : [], etapa: 'entregado' }]
      });
    });
  }

  function semilla() {
    const base = {
      clientes: [
        { id: 'c1', rut: '11111111-1', nombre: 'Matías Rojas', telefono: '+56 9 1111 2222', email: 'matias@ejemplo.cl', origen: 'Voz a voz', notas: '' },
        { id: 'c2', rut: '12345678-5', nombre: 'Camila Fuentes', telefono: '+56 9 3333 4444', email: 'camila@ejemplo.cl', origen: 'Instagram', notas: 'Prefiere que la contacten en la tarde.' },
        { id: 'c3', rut: '15234567-4', nombre: 'Andrés Soto', telefono: '+56 9 5555 6666', email: '', origen: 'Voz a voz', notas: '' },
        { id: 'c4', rut: '16789012-1', nombre: 'Daniela Pizarro', telefono: '+56 9 7777 8888', email: 'daniela@ejemplo.cl', origen: 'Google', notas: '' },
        { id: 'c5', rut: '18456789-K', nombre: 'Rodrigo Vera', telefono: '+56 9 9999 0000', email: '', origen: 'Instagram', notas: '' },
        { id: 'c6', rut: '13579246-2', nombre: 'Valentina Araya', telefono: '+56 9 2222 3131', email: 'vale@ejemplo.cl', origen: 'Instagram', notas: '' },
        { id: 'c7', rut: '17654321-3', nombre: 'Sebastián Núñez', telefono: '+56 9 4545 6767', email: '', origen: 'Voz a voz', notas: '' },
        { id: 'c8', rut: '14876543-K', nombre: 'Pablo Contreras', telefono: '+56 9 8080 1212', email: 'pablo@ejemplo.cl', origen: 'Google', notas: '' },
        { id: 'c9', rut: '19283746-4', nombre: 'Francisca Mora', telefono: '+56 9 3030 9090', email: '', origen: 'Voz a voz', notas: '' }
      ],
      solicitudes: [
        {
          folio: 'GEN-0001', fecha: dias(18), estado: 'aceptada', clienteId: 'c1',
          vehiculo: { marca: 'Toyota', modelo: 'RAV4', carroceria: 'suv' },
          items: [{ servicio: 'ppf', nombre: 'Paint Protection Film (PPF)', detalle: 'Parachoques delantero, Capó, Aleta izquierda, Aleta derecha, Espejo izquierdo, Espejo derecho', min: 735000, max: 919000 }],
          totalMin: 735000, totalMax: 919000, precioFinal: 800000, motivoAjuste: 'Descuento por cliente recurrente',
          modalidad: 'presencial', comentario: 'Quiere el frontal completo.', fotos: [],
          historial: [{ fecha: dias(18), texto: 'Solicitud recibida desde la web' }, { fecha: dias(16), texto: 'Estado: Nueva a Cotización enviada' }, { fecha: dias(15), texto: 'Estado: Cotización enviada a Aceptada' }]
        },
        {
          folio: 'GEN-0002', fecha: dias(6), estado: 'enviada', clienteId: 'c2',
          vehiculo: { marca: 'Mazda', modelo: 'Mazda3', carroceria: 'sedan' },
          items: [{ servicio: 'ceramico', nombre: 'Sellado cerámico', detalle: 'Una capa', min: 242000, max: 302000 }],
          totalMin: 242000, totalMax: 302000, precioFinal: null, motivoAjuste: '',
          modalidad: 'remota', comentario: '', fotos: ['frente.jpg', 'costado.jpg'],
          historial: [{ fecha: dias(6), texto: 'Solicitud recibida desde la web' }, { fecha: dias(5), texto: 'Estado: Nueva a Cotización enviada' }]
        },
        {
          folio: 'GEN-0003', fecha: dias(1), estado: 'nueva', clienteId: 'c3',
          vehiculo: { marca: 'Hyundai', modelo: 'Tucson', carroceria: 'suv' },
          items: [
            { servicio: 'pulido', nombre: 'Pulido de carrocería', detalle: 'Vehículo completo', min: 326000, max: 407000 },
            { servicio: 'detailing', nombre: 'Detailing y limpieza', detalle: 'Limpieza full', min: 77000, max: 97000 }
          ],
          totalMin: 403000, totalMax: 504000, precioFinal: null, motivoAjuste: '',
          modalidad: 'presencial', comentario: 'Puedo ir el sábado.', fotos: [],
          historial: [{ fecha: dias(1), texto: 'Solicitud recibida desde la web' }]
        },
        {
          folio: 'GEN-0004', fecha: dias(3), estado: 'en_revision', clienteId: 'c4',
          vehiculo: { marca: 'Chevrolet', modelo: 'D-Max', carroceria: 'camioneta' },
          items: [
            { servicio: 'pintura', nombre: 'Desabolladura y pintura', detalle: 'A evaluación técnica', min: null, max: null, evaluacion: true },
            { servicio: 'polarizado', nombre: 'Polarizado', detalle: 'Laterales y trasero', min: 108000, max: 135000 }
          ],
          totalMin: 108000, totalMax: 135000, precioFinal: null, motivoAjuste: '',
          modalidad: 'remota', comentario: 'Golpe en la puerta trasera derecha.', fotos: ['golpe1.jpg', 'golpe2.jpg', 'golpe3.jpg'],
          historial: [{ fecha: dias(3), texto: 'Solicitud recibida desde la web' }, { fecha: dias(2), texto: 'Estado: Nueva a En revisión' }]
        },
        {
          folio: 'GEN-0005', fecha: dias(25), estado: 'rechazada', clienteId: 'c5',
          vehiculo: { marca: 'Kia', modelo: 'Morning', carroceria: 'hatchback' },
          items: [{ servicio: 'ceramico', nombre: 'Sellado cerámico', detalle: 'Multicapa', min: 350000, max: 437000 }],
          totalMin: 350000, totalMax: 437000, precioFinal: null, motivoAjuste: '',
          modalidad: 'remota', comentario: '', fotos: [],
          historial: [{ fecha: dias(25), texto: 'Solicitud recibida desde la web' }, { fecha: dias(23), texto: 'Estado: Nueva a Cotización enviada' }, { fecha: dias(20), texto: 'Estado: Cotización enviada a Rechazada' }]
        },
        {
          folio: 'GEN-0006', fecha: dias(10), estado: 'aceptada', clienteId: 'c3',
          vehiculo: { marca: 'Volkswagen', modelo: 'T-Cross', carroceria: 'suv' },
          items: [{ servicio: 'polarizado', nombre: 'Polarizado', detalle: 'Completo', min: 133000, max: 166000 }],
          totalMin: 133000, totalMax: 166000, precioFinal: 150000, motivoAjuste: 'Valor acordado con el cliente',
          modalidad: 'presencial', comentario: '', fotos: [],
          historial: [{ fecha: dias(10), texto: 'Solicitud recibida desde la web' }, { fecha: dias(8), texto: 'Estado: Nueva a Aceptada' }]
        }
      ],
      trabajos: [
        {
          id: 't1', folio: 'GEN-0001', etapa: 'ejecucion', precioFinal: 800000, abonoPct: 50,
          abonoPagado: true, materialesPedidos: true, apoyoExterno: false, apoyoDetalle: '',
          checklist: [false, false, false, false], saldoPagado: false, notas: '', fechaInicio: dias(14), fechaEntrega: null,
          pagos: [{ fecha: dias(13), monto: 400000, tipo: 'abono' }],
          actualizaciones: [
            { id: 'a1', fecha: dias(14), texto: 'Recibimos tu vehículo y empezamos la preparación de la pintura.', fotos: [U.fotoDemo('Antes de empezar', '#1F7A8C')], etapa: 'ejecucion' },
            { id: 'a2', fecha: dias(10), texto: 'Instalamos el film en capó y parachoques. Seguimos con las aletas.', fotos: [U.fotoDemo('Capó con film', '#B7791F'), U.fotoDemo('Parachoques', '#5E7580')], etapa: 'ejecucion' }
          ]
        },
        {
          id: 't2', folio: 'GEN-0006', etapa: 'materiales', precioFinal: 150000, abonoPct: 70,
          abonoPagado: true, materialesPedidos: false, apoyoExterno: false, apoyoDetalle: '',
          checklist: [false, false, false, false], saldoPagado: false, notas: '', fechaInicio: dias(7), fechaEntrega: null,
          pagos: [{ fecha: dias(6), monto: 105000, tipo: 'abono' }],
          actualizaciones: [{ id: 'a3', fecha: dias(5), texto: 'Ya pedimos la lámina. Llega en 2 días hábiles y partimos con la instalación.', fotos: [], etapa: 'materiales' }]
        }
      ],
      cuentas: [{ id: 'u1', rut: '11111111-1', email: 'matias@ejemplo.cl', hash: U.hash('demo1234'), clienteId: 'c1', creada: dias(300) }],
      documentos: [],
      precios: null
    };
    historicos(base);
    return base;
  }

  const PLANTILLAS_MSG = [
    { id: 'pm1', titulo: 'Recibimos tu vehículo', texto: 'Hola {cliente}, recibimos tu {vehiculo} y empezamos a prepararlo.' },
    { id: 'pm2', titulo: 'Entró a pulido', texto: 'Hola {cliente}, tu {vehiculo} entró a pulido. Te enviaremos fotos del resultado.' },
    { id: 'pm3', titulo: 'Entró a aplicación de film o sellado', texto: 'Hola {cliente}, empezamos la aplicación en tu {vehiculo}. Esta etapa necesita que el vehículo repose, así que avanzamos con calma.' },
    { id: 'pm4', titulo: 'Esperando materiales', texto: 'Hola {cliente}, ya pedimos los materiales para tu {vehiculo}. Apenas lleguen partimos.' },
    { id: 'pm5', titulo: 'Revisión de calidad', texto: 'Hola {cliente}, terminamos el trabajo en tu {vehiculo} y estamos en la revisión final de calidad.' },
    { id: 'pm6', titulo: 'Listo para retiro', texto: 'Hola {cliente}, tu {vehiculo} está listo. Escríbenos para coordinar el día y la hora del retiro.' },
    { id: 'pm7', titulo: 'Retraso por clima o curado', texto: 'Hola {cliente}, la entrega de tu {vehiculo} se retrasa un poco por el tiempo de curado del producto. Te avisamos la nueva fecha.' }
  ];
  // Completa lo que falte en datos guardados con versiones anteriores del prototipo.
  function normalizar(d) {
    d.notificaciones = d.notificaciones || [];
    d.recuperaciones = d.recuperaciones || [];
    d.cuentas = d.cuentas || [];
    d.documentos = d.documentos || [];
    d.ajustes = Object.assign({ excel: false }, d.ajustes || {});
    d.plantillasMsg = d.plantillasMsg && d.plantillasMsg.length ? d.plantillasMsg : JSON.parse(JSON.stringify(PLANTILLAS_MSG));
    d.clientes.forEach(function (c) { c.vehiculos = c.vehiculos || []; c.canal = c.canal || 'ambos'; });
    d.trabajos.forEach(function (t) { t.cobros = t.cobros || []; if (t.fechaEstimada === undefined) t.fechaEstimada = null; });
    return d;
  }

  function leer() {
    if (memoria) return memoria;
    try {
      const raw = global.localStorage.getItem(KEY);
      if (raw) { memoria = normalizar(JSON.parse(raw)); return memoria; }
    } catch (e) { /* sin acceso a localStorage: se usa memoria */ }
    memoria = normalizar(semilla());
    escribir(memoria);
    return memoria;
  }

  function escribir(d) {
    memoria = d;
    try { global.localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; }
  }

  const DB = {
    get: leer,
    save: escribir,
    plantillasMsg: PLANTILLAS_MSG,
    reset: function () {
      memoria = null;
      try { global.localStorage.removeItem(KEY); } catch (e) { /* ignorar */ }
    },
    siguienteFolio: function (d) {
      let max = 0;
      d.solicitudes.forEach(function (s) {
        const n = parseInt(String(s.folio).replace(/\D/g, ''), 10);
        if (n > max) max = n;
      });
      return 'GEN-' + String(max + 1).padStart(4, '0');
    },
    aplicarPrecios: function () {
      const p = leer().precios;
      if (!p) return;
      if (p.rango) { DATOS.rango.min = p.rango.min; DATOS.rango.max = p.rango.max; }
      if (p.factores) {
        DATOS.carrocerias.forEach(function (c) {
          if (p.factores[c.id] != null) c.factor = p.factores[c.id];
        });
      }
      if (p.servicios) {
        DATOS.servicios.forEach(function (s) {
          const o = p.servicios[s.id];
          if (!o) return;
          if (o.precios && s.precios) Object.keys(o.precios).forEach(function (k) { s.precios[k] = o.precios[k]; });
          if (o.niveles && s.niveles) s.niveles.forEach(function (n) { if (o.niveles[n.id] != null) n.base = o.niveles[n.id]; });
        });
      }
    }
  };

  global.GENIUS_DATOS = DATOS;
  global.GeniusUtil = U;
  global.GeniusDB = DB;
})(window);
