/* ==========================================================
   GENIUS · datos fijos de los documentos (cotización y certificado)
   Edita aquí los datos de la empresa, los textos y las
   secciones rápidas. Los valores de las secciones salen de la
   cotización de la camioneta L200 (ago-2026): son una base que
   la socia ajusta en cada documento.
   ========================================================== */
window.GENIUS_PLANTILLAS = {
  empresa: {
    nombreFantasia: 'Genius',
    razonSocial: 'Detailing AKNB EIRL',
    rut: '77.903.613-8',
    correo: 'Genius.detailing.chile@gmail.com',
    web: 'www.geniuschile.com',
    instagram: 'GENIUS.CHILE',
    profesionales: [
      { nombre: 'Daniel Quintero', rut: '24.843.744-8' },
      { nombre: 'Arianna Navas', rut: '16.007.417-5' }
    ]
  },

  cotizacion: {
    abonoPct: 70,
    plazo: '3 a 7 días hábiles, según los servicios seleccionados',
    ivaTexto: 'TODOS LOS VALORES +IVA. Se realiza factura o boleta según requerimiento.',
    notaPPF: 'El PPF, al momento de la instalación, se encuentra protegido por 2 películas que al removerlas generan una carga estática que atrae material particulado. Mediante técnicas de eliminación de estática, limpieza de material y preparación de superficie, con herramientas dieléctricas, se logra mantener un acabado libre de contaminantes, considerando un margen de error del 5% (pelusas, etc.).',
    cierre: 'Estamos en contacto.\nSaludos cordiales.',
    firmantes: 'Daniel Quintero y Arianna Navas\nGenius Detailing'
  },

  /* Secciones que se agregan con un clic y luego se editan */
  secciones: [
    {
      id: 'ppf_full', nombre: 'PPF · Full protección exterior (camioneta)',
      titulo: 'PPF · Full protección exterior',
      texto: 'El Paint Protection Film (PPF) es un film ultra transparente de poliuretano termoplástico que se instala sobre la pintura y la aísla de chinazos, arañazos, golpes, excrementos de pájaro, restos de insectos y marcas de lavado.\nTrabajamos PPF TPU regenerable Avery Dennison, americano (K2): duración 7 años, 135 mic.\nTop coating PPF adicional: $100.000.',
      lineas: [
        ['Capó', 365000], ['Parachoques delantero', 280000], ['Máscara frontal', 150000],
        ['Cubre rueda lateral delantero (2) $140.000 c/u', 280000], ['Puertas (4) $160.000 c/u', 640000], ['Techo', 365000],
        ['Portón', 220000], ['Parachoques trasero', 280000], ['Cubre rueda lateral trasero pick up (2) $290.000 c/u', 580000],
        ['Lips laterales y superior puertas (2) $180.000 c/u, en C sin corte', 360000], ['Espejos retrovisores (2) $50.000 c/u', 100000],
        ['Focos principales (2) $20.000 y neblineros (2) $10.000', 60000]
      ]
    },
    {
      id: 'ppf_impacto', nombre: 'PPF · Kit alto impacto (camioneta)',
      titulo: 'PPF · Kit alto impacto', texto: '',
      lineas: [
        ['Capó', 365000], ['Parachoques delantero', 280000], ['Máscara frontal', 150000],
        ['Cubre rueda lateral delantero (2) $140.000 c/u', 280000], ['Parachoques trasero', 280000],
        ['Espejos retrovisores (2) $50.000 c/u', 100000], ['Focos principales y neblineros (2/2)', 60000]
      ]
    },
    {
      id: 'ppf_frontal', nombre: 'PPF · Kit frontal (camioneta)',
      titulo: 'PPF · Kit frontal', texto: '',
      lineas: [
        ['Capó', 365000], ['Parachoques delantero', 280000], ['Máscara frontal', 150000],
        ['Cubre rueda lateral delantero (2) $140.000 c/u', 280000], ['Espejos retrovisores (2) $50.000 c/u', 100000],
        ['Focos principales y neblineros (2/2)', 60000]
      ]
    },
    {
      id: 'ceramico', nombre: 'Sellado cerámico · Packs 1, 2 y 3',
      titulo: 'Sellado cerámico',
      texto: 'El sellado cerámico es una protección líquida y transparente que se aplica sobre la pintura para crear una capa dura que la protege de rayones superficiales, excrementos de aves, resina de árboles y rayos UV. Da un brillo intenso, facilita la limpieza al repeler suciedad y agua, y dura entre 1 y 5 años según el producto y la mantención.\n- Pack 1 Premium: 2 etapas de corrección 70%, cerámico 12 meses, sello sintético UV plásticos, sello sintético vidrios, detallado de llantas.\n- Pack 2 Premium: 2 etapas de corrección 80%, cerámico 36 meses (Carpro dquartz), sello sintético UV plásticos y vidrios, sellado cerámico de llantas cara exterior.\n- Pack 3 Super Premium: 3 etapas de corrección 90% y 1 abrillantado, cerámico 60 meses (Gtechniq o Gyeon Mohs), sello cerámico plásticos y vidrios, sellado cerámico de llantas cara exterior.',
      lineas: [['Pack 1 Premium (12 meses)', 400000], ['Pack 2 Premium (36 meses)', 600000], ['Pack 3 Super Premium (60 meses)', 800000]],
      sinTotal: true
    },
    {
      id: 'pintura', nombre: 'Reparación de daño y pintura',
      titulo: 'Reparación de daño y pintura',
      texto: 'El valor del trabajo de pintura es de $150.000 por pieza. En base a eso se calcula el valor por zona y daño.',
      lineas: [['Pieza o zona (detallar)', 0]]
    },
    {
      id: 'butacas', nombre: 'Sellado de butacas',
      titulo: 'Sellado de butacas',
      texto: 'Recubrimiento cerámico para interior, formulado para tapicería de cuero de automóviles modernos. Protege de la suciedad, los rayos UV y el uso diario, sin cambiar la sensación ni el color (acabado mate). No obstruye los poros del cuero.\nTolerancia al pH: 2 a 11. Durabilidad: 18 meses o 30.000 km.',
      lineas: [['Sellado de todas las butacas', 120000]], sinTotal: true
    },
    {
      id: 'ducha', nombre: 'Ducha grafitada y lavado de chasis',
      titulo: 'Protección de ducha grafitada y limpieza de chasis',
      texto: 'La ducha grafitada protege las partes inferiores del vehículo, en especial el chasis, contra la corrosión, la humedad, el barro y otros agentes externos.',
      lineas: [['Lavado de chasis', 30000], ['Ducha grafitada', 75000]]
    },
    {
      id: 'parabrisas', nombre: 'Film protector de parabrisas',
      titulo: 'Parabrisas (aprox. 1,5 m)',
      texto: 'Film protector de parabrisas ClearPlex® de Madico®, que reduce el riesgo de daños y ayuda a mantener el parabrisas en una sola pieza incluso si el vidrio se rompe.',
      lineas: [['Film protector de parabrisas', 320000]], sinTotal: true
    }
  ],

  certificado: {
    producto: 'Sellador cerámico plásticos, vidrios y llantas',
    marca: 'Gtechniq',
    duracion: 'De 5 años',
    tituloDescripcion: 'Sellador cerámico Kit Exo + Crystal Serum Light',
    descripcion: 'Tanto Crystal Serum Light como EXO son recubrimientos compuestos, lo que significa que penetran más profundamente en el sustrato y ofrecen un rendimiento y una durabilidad muy altos en comparación con los recubrimientos tradicionales a base de cuarzo.\n\nCon la aplicación de ambos productos, la pintura obtiene la mejor protección posible contra marcas circulares de lavado, todo tipo de contaminación y el desgaste en general. Este sistema de doble capa es ópticamente transparente, ultrarresistente, suave al tacto y proporciona una excepcional repelencia a la suciedad y al agua.\n\nComo capa base, la tecnología de Crystal Serum Light está orientada a brindar máxima dureza y durabilidad. Es resistente a productos químicos de pH 2 a pH 12 y a temperaturas de -40 a +250 grados Celsius.\n\nLa capa superior EXO está diseñada para ofrecer una superficie lisa, repelente a la suciedad y con efecto hidrófugo. Es única por su carácter omnifóbico: repele tanto agua como aceite, a diferencia de los recubrimientos convencionales que solo son hidrófobos. EXO ofrece un nivel de brillo excepcionalmente alto y un aspecto mucho más cálido.',
    mantencionTexto: 'Considere realizar las mantenciones sugeridas para alargar la vida útil del recubrimiento a los 3 meses (incluida por agendar), 6 meses y 1 año.',
    mantenciones: [
      { meses: 3, servicio: 'Mantención Booster incluido y revisión de garantía' },
      { meses: 6, servicio: 'Mantención de los 6 meses · Booster' },
      { meses: 12, servicio: 'Mantención de los 12 meses · Booster' }
    ]
  }
};
