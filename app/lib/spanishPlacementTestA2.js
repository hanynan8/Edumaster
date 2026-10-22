// ═══════════════════════════════════════════════
//  app/lib/spanishPlacementTestA2.js
//  بيانات اختبار تحديد المستوى (إسباني) — Prueba de nivel de español A2 (100 نقطة)
//  المصدر: ملف "Edumaster365 Prueba Completa Español A2" — 3 أجزاء: قراءة (25) + استماع (25)
//  + قواعد ومفردات (50).
//
//  نفس هيكل اختبار A1 بالظبط (spanishPlacementTest.js): PLACEMENT_PARTS_A2 → tasks → questions
//    - question: { n: رقم السؤال العام (1–100)، ln: رقم السؤال داخل الجزء، q: النص،
//                  ctx: نص يخص السؤال (اختياري)، o: الخيارات }
//    - task.bank: سؤال "ربط": الخيارات حروف (A, B, C…) والنصوص في task.bank.
//    - task.passage: نص مشترك لأسئلة المهمة.
//    - q.audioSlot (1–10): Tarea 1 و Tarea 2 في الاستماع — كل سؤال/رسالة ليها تسجيل منفصل
//      زي ملف الاختبار بالظبط (5 + 5). task.audioSlot (11–12): Tarea 3 و Tarea 4 — تسجيل واحد لكل مهمة.
//      المجموع 12 تسجيل. الصوت بيترفع من لوحة الأدمن (Placement Tests → تبويب A2 → Listening audio)
//      وأي سؤال/مهمة من غير صوت بتتخفي والدرجة بتتحسب كنسبة من 100.
//  - 🔒 مفتاح الإجابات مش هنا (الملف ده بيتحمّل في المتصفح) — هو في
//    app/lib/spanishPlacementTestKeyA2.js والتصحيح بيتم على السيرفر بس.
//  - 🔒 كمان نصوص الاستماع (guiones) مش هنا — هي في app/lib/placementAudioScripts.js (سيرفر بس).
// ═══════════════════════════════════════════════

export const PLACEMENT_TEST_TITLE_A2 = "Prueba de nivel de español A2";

const L = "ABCDEFGHIJK";
// خيارات الربط: أول k حرف (A..)
const letters = (k) => L.slice(0, k).split("");
// سؤال اختيار من متعدد
const mc = (n, ln, q, o, ctx) => (ctx ? { n, ln, q, ctx, o } : { n, ln, q, o });
// سؤال ربط: الخيارات حروف
const mt = (n, ln, q, k) => ({ n, ln, q, o: letters(k) });
// 🎧 بيربط كل سؤال في المهمة بتسجيله الخاص: أول سؤال = خانة first، التاني first+1…
const withSlots = (first, qs) => qs.map((q, i) => ({ ...q, audioSlot: first + i }));
// بنك الربط من نصوص بالترتيب A, B, C…
const bankOf = (texts) => texts.map((t, i) => ({ l: L[i], t }));

export const PLACEMENT_PARTS_A2 = [
  // ───────────────────────── PARTE 1. COMPRENSIÓN DE LECTURA ─────────────────────────
  {
    id: "read",
    title: "Comprensión de lectura",
    minutes: 45,
    tasks: [
      {
        title: "Tarea 1. Mensajes breves",
        intro: "Lee cada mensaje y elige la opción correcta (a, b o c).",
        questions: [
          mc(1, 1, "¿Qué le pasa a Pablo?", ["Está enfermo y no puede salir.", "Tiene que trabajar.", "No quiere visitar el museo."],
            "Pablo escribe a un amigo: «Lo siento, hoy no puedo ir al museo contigo. Mi jefe me ha pedido que cubra el turno de un compañero. ¿Lo dejamos para el sábado?»"),
          mc(2, 2, "¿Qué deben tener en cuenta los clientes?", ["Que pueden devolver cualquier chaqueta.", "Que la oferta termina el domingo.", "Que el descuento solo se aplica el domingo."],
            "En una tienda se lee: «Descuento del 20 % en todas las chaquetas hasta el domingo. No se admiten devoluciones de artículos rebajados»."),
          mc(3, 3, "¿Qué destaca Nuria de su nueva vivienda?", ["Está cerca del transporte público.", "Tiene muchas habitaciones.", "Está lejos del centro."],
            "Nuria escribe: «¡Por fin me he mudado! El piso es pequeño, pero tiene mucha luz y está a cinco minutos del metro. Este fin de semana podéis venir a conocerlo»."),
          mc(4, 4, "¿Qué actividad no se podrá hacer esos días?", ["Yoga.", "Pilates.", "Natación."],
            "Aviso del centro deportivo: «La piscina permanecerá cerrada por mantenimiento del lunes al miércoles. Las clases de yoga y pilates se celebrarán con normalidad».")
          ,
          mc(5, 5, "¿A qué hora empieza el examen?", ["A las 10:10.", "A las 10:30.", "A las 10:40."],
            "Mensaje de una academia: «El examen de nivel previsto para las 10:00 se retrasa media hora. Por favor, llegad diez minutos antes de la nueva hora».")
        ]
      },
      {
        title: "Tarea 2. Relacionar textos con afirmaciones",
        intro: "Lee los anuncios (A–I). Relaciona cada afirmación (6–11) con el anuncio adecuado. Hay tres anuncios que no necesitas. Escribe la letra.",
        bank: bankOf([
          "HABITACIÓN EN PISO COMPARTIDO — Se alquila habitación amueblada en un piso con dos estudiantes. Gastos de agua e Internet incluidos. Cerca de la universidad y de varias paradas de autobús. No se admiten mascotas.",
          "TALLER DE COCINA MEDITERRÁNEA — Aprende a preparar platos sencillos con verduras, pescado y aceite de oliva. Sábados de 11:00 a 14:00. Ingredientes incluidos en el precio.",
          "AVISO DE RENFE — El tren de las 17:20 llegará con aproximadamente 35 minutos de retraso por una incidencia en la vía. Consulte las pantallas de la estación.",
          "OFERTA DE EMPLEO — Hotel del centro busca recepcionista con buen trato al público. Se valorará el conocimiento de inglés. Es necesario tener disponibilidad para trabajar algunos fines de semana.",
          "BIBLIOTECA MUNICIPAL — Durante julio y agosto abrimos de lunes a viernes de 9:00 a 14:00. Los sábados permaneceremos cerrados.",
          "LIQUIDACIÓN DE CALZADO — Últimos días de rebajas. Los artículos con descuento no se pueden cambiar ni devolver. Consulte las tallas disponibles en tienda.",
          "EXCURSIÓN CULTURAL — Visita guiada a Medina Azahara el domingo. Transporte desde Córdoba incluido. La actividad dura cuatro horas. Reserva previa obligatoria.",
          "CURSOS DE ESPAÑOL — Clases para extranjeros en grupos reducidos. Niveles A1, A2 y B1. Horarios de mañana y tarde y prueba de nivel gratuita.",
          "FARMACIA DE GUARDIA — Esta noche estamos abiertos hasta las 8:00 de la mañana. Para urgencias, llame al timbre de la entrada lateral."
        ]),
        questions: [
          mt(6, 6, "Una persona quiere vivir cerca de la universidad y compartir los gastos.", 9),
          mt(7, 7, "Un viajero necesita saber por qué su tren no llegará a la hora prevista.", 9),
          mt(8, 8, "Alguien busca una actividad práctica para aprender a cocinar.", 9),
          mt(9, 9, "Una persona quiere encontrar trabajo en un hotel y habla inglés.", 9),
          mt(10, 10, "Una familia quiere conocer un lugar histórico con un guía.", 9),
          mt(11, 11, "Una persona extranjera quiere estudiar español y conocer su nivel.", 9)
        ]
      },
      {
        title: "Tarea 3. ¿Qué anuncio necesita cada persona?",
        intro: "Lee los anuncios (A–I) y relaciona cada persona (12–17) con el servicio que necesita. Hay tres anuncios que no necesitas. Escribe la letra.",
        bank: bankOf([
          "CLUB DE SENDERISMO — Salidas por la naturaleza todos los domingos. Rutas de distintos niveles y actividades para nuevos miembros.",
          "ACADEMIA DE INGLÉS — Cursos de inglés para adultos. Grupos por la tarde y preparación para entrevistas de trabajo.",
          "RESTAURANTE EL PATIO — Se busca ayudante de cocina para viernes y sábados. No se necesita experiencia, pero sí ganas de aprender.",
          "REPARACIÓN INFORMÁTICA — Arreglamos ordenadores, instalamos programas y recuperamos archivos. Presupuesto sin compromiso.",
          "RESIDENCIA DE ESTUDIANTES — Habitaciones individuales, comedor y sala de estudio. A diez minutos de la universidad.",
          "MERCADO DE SEGUNDA MANO — Este domingo puedes vender ropa, libros y objetos usados. Inscripción gratuita para vendedores.",
          "INTERCAMBIO CULTURAL — Encuentros para practicar español y otros idiomas con personas de diferentes países.",
          "TALLER DE FOTOGRAFÍA — Aprende a hacer mejores fotografías con tu móvil o cámara. Curso práctico de cuatro sábados.",
          "CLÍNICA DENTAL — Revisiones, limpiezas y tratamientos dentales. Pide cita por teléfono."
        ]),
        questions: [
          mt(12, 12, "Ahmed quiere mejorar su inglés para solicitar un puesto en una empresa internacional.", 9),
          mt(13, 13, "Lucía disfruta caminando por el campo y quiere conocer gente con la misma afición.", 9),
          mt(14, 14, "Un estudiante que llega de otra ciudad busca alojamiento con comedor y un lugar tranquilo para estudiar.", 9),
          mt(15, 15, "Marcos tiene un ordenador que no funciona y necesita recuperar unos documentos.", 9),
          mt(16, 16, "Sara quiere practicar español con hablantes de otros idiomas y conocer personas nuevas.", 9),
          mt(17, 17, "Inés quiere aprender a hacer buenas fotos con su teléfono.", 9)
        ]
      },
      {
        title: "Tarea 4. Leer información sobre una academia",
        intro: "Lee el anuncio de la academia y responde. Elige la opción correcta (a, b o c).",
        passage:
          "Academia de idiomas Puentes\n¿Quieres mejorar tu español y comunicarte con más confianza? En Puentes ofrecemos cursos de nivel A2 para estudiantes extranjeros.\nCURSO A — A2.1 / A2.2: lunes y miércoles, de 18:00 a 20:00. Precio: 110 euros al mes.\nCURSO B — A2 completo intensivo: de lunes a jueves, de 9:30 a 12:00. Incluye una sesión de conversación semanal. Precio: 180 euros al mes.\nCURSO C — A2.1 / A2.2: sábados, de 9:00 a 13:00. Precio: 85 euros al mes.\nMatrícula: 25 euros. Materiales incluidos. Prueba de nivel gratuita. Las ausencias no dan derecho a descuentos. La academia permanecerá cerrada del 1 al 15 de agosto.\nInformación: 957 456 789 · info@puentesidiomas.es",
        questions: [
          mc(18, 18, "¿Qué tienen en común los tres cursos?", ["Son intensivos de lunes a jueves.", "Incluyen los materiales.", "Tienen clases los sábados."]),
          mc(19, 19, "¿Qué curso incluye una sesión semanal de conversación?", ["El curso A.", "El curso C.", "El curso B."]),
          mc(20, 20, "¿Cuánto cuesta un mes del curso intensivo?", ["85 euros.", "180 euros.", "205 euros."]),
          mc(21, 21, "¿Qué hay que pagar para matricularse, además del precio mensual?", ["Una tasa de examen.", "El precio de los materiales.", "25 euros de matrícula."]),
          mc(22, 22, "¿Qué ofrece gratuitamente la academia?", ["La prueba de nivel.", "La matrícula.", "Las clases de conversación."]),
          mc(23, 23, "¿Cuándo estará cerrada la academia?", ["Todo el mes de agosto.", "Del 15 al 31 de agosto.", "Del 1 al 15 de agosto."]),
          mc(24, 24, "Marta trabaja entre semana hasta las 17:00 y quiere estudiar por la tarde o el fin de semana. ¿Qué cursos pueden convenirle por horario?", ["Los cursos A o C.", "Solo el curso B.", "Ninguno de los tres."]),
          mc(25, 25, "¿Cómo puede una persona pedir información?", ["Solo visitando la academia.", "Por teléfono o correo electrónico.", "Únicamente por correo postal."])
        ]
      }
    ]
  },

  // ───────────────────────── PARTE 2. COMPRENSIÓN AUDITIVA ─────────────────────────
  {
    id: "listen",
    title: "Comprensión auditiva",
    minutes: 25,
    tasks: [
      {
        title: "Tarea 1. Mensajes breves",
        intro: "Escucha cinco mensajes y elige A, B o C.",
        questions: withSlots(1, [ // 🎧 خانات 1–5: تسجيل منفصل لكل رسالة (Audio 1…5)
          mc(26, 1, "¿Por qué llama la mujer al centro médico?", ["Para cancelar una consulta definitivamente.", "Para cambiar la hora de una consulta.", "Para pedir los resultados de unos análisis."]),
          mc(27, 2, "¿A qué hora sale el autobús?", ["A las 7:45.", "A las 8:00.", "A las 8:15."]),
          mc(28, 3, "¿Cuánto cuesta la chaqueta con el descuento?", ["24 euros.", "25 euros.", "30 euros."]),
          mc(29, 4, "¿Cuándo van a reunirse finalmente los compañeros?", ["El miércoles.", "El jueves.", "El viernes."]),
          mc(30, 5, "¿Qué problema tiene el hombre?", ["Ha perdido las llaves de casa.", "No puede encontrar su cartera.", "Ha olvidado su teléfono en el trabajo."])
        ])
      },
      {
        title: "Tarea 2. Mensajes y situaciones",
        intro: "Escucha cinco mensajes y relaciónalos con las situaciones (A–H). Hay tres opciones que no necesitas. Escribe la letra.",
        bank: bankOf([
          "Una persona ha perdido su equipaje durante un viaje.",
          "Una persona informa de que un tren lleva retraso.",
          "Una persona quiere reservar una mesa para dos.",
          "Una persona busca una habitación en un piso compartido.",
          "Una persona invita a otros a una excursión por la montaña.",
          "Una persona quiere devolver unos zapatos.",
          "Una persona pide información sobre un curso de español.",
          "Una persona necesita cambiar una cita médica."
        ]),
        questions: withSlots(6, [ // 🎧 خانات 6–10: تسجيل منفصل لكل Mensaje (1…5)
          mt(31, 6, "Mensaje 1", 8),
          mt(32, 7, "Mensaje 2", 8),
          mt(33, 8, "Mensaje 3", 8),
          mt(34, 9, "Mensaje 4", 8),
          mt(35, 10, "Mensaje 5", 8)
        ])
      },
      {
        title: "Tarea 3. Una experiencia personal",
        intro: "Escucha a Carmen hablar sobre su vida después de mudarse a otra ciudad. Relaciona cada frase (11–18) con una opción (A–K). Hay tres opciones que no necesitas. Escribe la letra.",
        bank: bankOf([
          "Eligió su vivienda porque está cerca del trabajo.",
          "Se matriculó en una academia de idiomas.",
          "Comparte piso con otras personas.",
          "Se mudó porque los precios eran más bajos.",
          "Ha conocido a gente nueva.",
          "Va a una actividad todos los sábados por la mañana.",
          "Va en autobús y después camina un poco.",
          "Quiere regresar a su pueblo cuanto antes.",
          "Ha aprendido a preparar platos españoles.",
          "Tarda unos veinte minutos en llegar al trabajo.",
          "Se mudó para encontrar mejores oportunidades laborales."
        ]),
        audioSlot: 11, // 🎧 خانة 11 — Carmen
        questions: [
          mt(36, 11, "Carmen decidió mudarse a la ciudad porque...", 11),
          mt(37, 12, "Actualmente vive en una casa donde...", 11),
          mt(38, 13, "Escogió su vivienda principalmente porque...", 11),
          mt(39, 14, "Para llegar al trabajo normalmente...", 11),
          mt(40, 15, "El trayecto desde su casa hasta el trabajo...", 11),
          mt(41, 16, "Desde que llegó a la ciudad...", 11),
          mt(42, 17, "Durante estos meses...", 11),
          mt(43, 18, "Los sábados por la mañana...", 11)
        ]
      },
      {
        title: "Tarea 4. Organizar un viaje",
        intro: "Escucha la conversación entre Rosa y Miguel y relaciona las preguntas (19–25) con las opciones (A–H). Hay una opción que no necesitas. Escribe la letra.",
        bank: bankOf([
          "El viernes por la tarde.",
          "En una pensión situada en el centro.",
          "Porque el tren es más barato.",
          "Visitar un museo y el casco antiguo.",
          "Llevar una mochila pequeña y ropa cómoda.",
          "A las ocho y media.",
          "El domingo después de comer.",
          "Reservar el alojamiento por Internet."
        ]),
        audioSlot: 12, // 🎧 خانة 12 — Rosa y Miguel
        questions: [
          mt(44, 19, "¿Cuándo quieren salir?", 8),
          mt(45, 20, "¿Por qué prefieren viajar en tren?", 8),
          mt(46, 21, "¿Cómo van a reservar el alojamiento?", 8),
          mt(47, 22, "¿Qué quieren visitar durante el viaje?", 8),
          mt(48, 23, "¿Qué recomienda Rosa llevar?", 8),
          mt(49, 24, "¿A qué hora han quedado para encontrarse?", 8),
          mt(50, 25, "¿Cuándo piensan regresar?", 8)
        ]
      }
    ]
  },

  // ───────────────────────── PARTE 3. GRAMÁTICA Y VOCABULARIO ─────────────────────────
  {
    id: "gram",
    title: "Gramática y vocabulario",
    minutes: 30,
    tasks: [
      {
        title: "Bloque I. Gramática",
        intro: "Marca una sola opción correcta en cada pregunta: a, b o c.",
        questions: [
          mc(51, 1, "Esta semana todavía no ____ a mis compañeros de clase.", ["vi", "he visto", "veía"]),
          mc(52, 2, "El verano pasado nosotros ____ por varias ciudades de Andalucía.", ["hemos viajado", "viajábamos", "viajamos"]),
          mc(53, 3, "Cuando era pequeño, ____ al parque con mi abuelo todos los domingos.", ["iba", "fui", "he ido"]),
          mc(54, 4, "Ayer, mientras yo ____ la cena, sonó el teléfono.", ["preparé", "he preparado", "preparaba"]),
          mc(55, 5, "Este hotel es ____ que el que está junto a la estación.", ["más barato", "tan barato como", "el más barato"]),
          mc(56, 6, "¿Has visto mis gafas? No ____ encuentro.", ["los", "las", "le"]),
          mc(57, 7, "A Marta ____ gustan mucho las películas de aventuras.", ["le", "la", "se"]),
          mc(58, 8, "El sábado pasado ____ una excursión, pero empezó a llover.", ["hacemos", "hicimos", "hemos hecho"]),
          mc(59, 9, "Antes vivía lejos del trabajo, pero ahora ____ cerca.", ["vivía", "viví", "vivo"]),
          mc(60, 10, "¿Puedes ____ un momento? Necesito preguntarte algo.", ["esperas", "esperar", "esperando"]),
          mc(61, 11, "Para ir al centro, ____ tomar el autobús número 6.", ["tienes que", "hay que de", "debes que"]),
          mc(62, 12, "Este fin de semana ____ visitar a mis primos; ya hemos comprado los billetes.", ["fui a", "iba", "voy a"]),
          mc(63, 13, "Mi hermana es ____ que yo, pero los dos somos bastante altos.", ["tan joven", "la más joven", "más joven"]),
          mc(64, 14, "Cuando llegué a la estación, el tren ya ____.", ["salía", "había salido", "ha salido"]),
          mc(65, 15, "Ayer no fui a trabajar ____ tenía fiebre.", ["porque", "para", "aunque"]),
          mc(66, 16, "¿Has llamado a tus padres? Sí, ____ he llamado esta mañana.", ["los", "les", "se"]),
          mc(67, 17, "No ____ tarde a clase; el profesor ya está esperando.", ["llegas", "llegar", "llegues"]),
          mc(68, 18, "En esta biblioteca ____ hablar en voz baja.", ["hay que", "hay de", "tienen"]),
          mc(69, 19, "Me duele la garganta. Creo que ____ beber algo caliente.", ["deberías que", "debes de que", "deberías"]),
          mc(70, 20, "El médico me ha recomendado que ____ más agua.", ["beba", "bebo", "bebí"]),
          mc(71, 21, "¿Te importa ____ la ventana? Hace frío.", ["cierras", "cerrar", "cerrando"]),
          mc(72, 22, "Si tienes tiempo, ____ a verme esta tarde.", ["ven", "vienes", "vendrías"]),
          mc(73, 23, "No puedo salir ahora; ____ terminar este informe primero.", ["hay que", "tengo que", "debo que"]),
          mc(74, 24, "Este es el restaurante ____ cenamos el día de mi cumpleaños.", ["que", "quien", "donde"]),
          mc(75, 25, "Me gustaría ____ una habitación con vistas al mar.", ["reservando", "reservar", "reservo"])
        ]
      },
      {
        title: "Bloque II. Vocabulario y uso cotidiano",
        intro: "Marca una sola opción correcta en cada pregunta: a, b o c.",
        questions: [
          mc(76, 26, "Una persona que siempre dice la verdad es...", ["sincera", "perezosa", "despistada"]),
          mc(77, 27, "En un currículum, normalmente incluimos nuestra experiencia...", ["turística", "doméstica", "laboral"]),
          mc(78, 28, "Una película que hace reír a la gente es una...", ["noticia", "receta", "comedia"]),
          mc(79, 29, "Para subir al segundo piso de un edificio sin usar el ascensor, puedes ir por...", ["el tejado", "la escalera", "el pasillo de entrada"]),
          mc(80, 30, "Si sabes hacer algo muy bien, tienes mucha...", ["habilidad", "hambre", "prisa"]),
          mc(81, 31, "En una tienda, si una prenda no te queda bien, puedes pedir otra...", ["cuenta", "talla", "receta"]),
          mc(82, 32, "Para pagar en un restaurante, normalmente pides...", ["la entrada", "el horario", "la cuenta"]),
          mc(83, 33, "Si tienes tos y fiebre, puedes pedir consejo en...", ["una farmacia", "una papelería", "una estación"]),
          mc(84, 34, "La persona que atiende a los clientes en la recepción de un hotel es...", ["cocinero", "conductor", "recepcionista"]),
          mc(85, 35, "Antes de viajar al extranjero, comprueba que llevas el...", ["pasaporte", "recibo de la compra", "menú"]),
          mc(86, 36, "Si el tren sale más tarde de lo previsto, tiene un...", ["descuento", "retraso", "recorrido"]),
          mc(87, 37, "Para conocer una ciudad con una persona que explica sus monumentos, puedes contratar una visita...", ["guiada", "privada de ropa", "retrasada"]),
          mc(88, 38, "Si no puedes asistir a una reserva, conviene llamar para...", ["estrenarla", "cancelarla", "devolverla"]),
          mc(89, 39, "Un producto que no funciona correctamente puede estar en...", ["oferta", "equipaje", "garantía"]),
          mc(90, 40, "Si un amigo te pide una recomendación, quiere que le des...", ["una factura", "un consejo", "una contraseña"]),
          mc(91, 41, "En un hotel, la persona que se aloja allí es un...", ["huésped", "vecino", "pasajero de autobús"]),
          mc(92, 42, "Cuando dos personas no tienen la misma opinión, pueden...", ["tener una talla", "hacer una reserva", "estar en desacuerdo"]),
          mc(93, 43, "Si quieres devolver un producto comprado, normalmente necesitas el...", ["billete de metro", "mapa", "recibo"]),
          mc(94, 44, "Una persona que no conoce bien una ciudad puede consultar un...", ["currículum", "plano", "contrato de trabajo"]),
          mc(95, 45, "Para reservar una mesa, debes indicar cuántas personas van a...", ["asistir", "conducir", "reparar"]),
          mc(96, 46, "Si una persona está agotada, está muy...", ["contenta", "cansada", "enfadada"]),
          mc(97, 47, "En un aeropuerto, recoges las maletas en la zona de recogida de...", ["facturas", "matrículas", "equipajes"]),
          mc(98, 48, "Cuando un precio baja temporalmente, hay un...", ["descuento", "retraso", "requisito"]),
          mc(99, 49, "Si quieres expresar que una actividad te parece buena idea, puedes decir: «Me parece...»", ["averiado", "obligatorio", "estupendo"]),
          mc(100, 50, "Si el autobús no llega a la hora indicada, puedes decir que no ha sido...", ["puntual", "amable", "cómodo"])
        ]
      }
    ]
  }
];
