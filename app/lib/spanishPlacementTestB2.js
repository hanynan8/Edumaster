// ═══════════════════════════════════════════════
//  app/lib/spanishPlacementTestB2.js
//  بيانات اختبار تحديد المستوى (إسباني) — Prueba de nivel de español B2
//  المصدر: ملف "Prueba de nivel de español B2: cuadernillo del candidato" (docx).
//
//  نفس هيكل A1/A2/B1 بالظبط (PLACEMENT_PARTS → tasks → questions):
//    - question: { n: رقم السؤال العام، ln: رقم السؤال داخل الجزء (زي ترقيم الملف)، q، ctx، o }
//    - task.bank: سؤال "ربط": الخيارات حروف (A, B, C…) والنصوص في task.bank.
//    - task.passage: نص مشترك لأسئلة المهمة.
//
//  الترقيم العام (n):
//    قراءة 1–36  ·  استماع 37–66  ·  قواعد ومفردات 67–116   (116 سؤال، كل سؤال بدرجة)
//  الدرجة بتتحسب كنسبة مئوية من الأسئلة الظاهرة فعلًا (من 100) — زي A1/A2/B1.
//
//  🎧 الاستماع (37–66) بنفس منطق B1: 5 تسجيلات، كل تسجيل على Tarea كاملة (شوف PARTE 2 تحت).
//    الصوتيات بتترفع من لوحة الأدمن، وأي مهمة من غير صوت بتتخفي والدرجة بتتحسب كنسبة من 100.
//    ⚠️ ملف الاختبار فيه "Soluciones" (مفتاح كل الأجزاء) لكن مفيهوش نصوص التسجيلات (guiones) —
//    النصوص اتكتبت بما يطابق أسئلة الملف ومفتاحه (placementAudioScripts.js).
//  ✍️🗣️ التعبير الكتابي (Parte 4) والشفهي (Parte 5) مش بيتصححوا آليًا، فمش جزء من الاختبار هنا
//    (زي A1/A2/B1).
//  - 🔒 مفتاح الإجابات مش هنا (الملف ده بيتحمّل في المتصفح) — هو في spanishPlacementTestKeyB2.js
// ═══════════════════════════════════════════════

export const PLACEMENT_TEST_TITLE_B2 = "Prueba de nivel de español B2";

const L = "ABCDEFGHIJK";
// خيارات الربط: أول k حرف (A..)
const letters = (k) => L.slice(0, k).split("");
// سؤال اختيار من متعدد
const mc = (n, ln, q, o, ctx) => (ctx ? { n, ln, q, ctx, o } : { n, ln, q, o });
// سؤال ربط: الخيارات حروف
const mt = (n, ln, q, k) => ({ n, ln, q, o: letters(k) });
// بنك الربط من نصوص بالترتيب A, B, C…
const bankOf = (texts) => texts.map((t, i) => ({ l: L[i], t }));

const BASE_PARTS_B2 = [
  // ───────────────────────── PARTE 1. COMPRENSIÓN DE LECTURA (n 1–36) ─────────────────────────
  {
    id: "read",
    title: "Comprensión de lectura",
    minutes: 70,
    tasks: [
      {
        title: "Tarea 1",
        intro: "Lee el texto y responde a las preguntas. Elige la opción correcta (a, b o c).",
        passage:
          "La semana laboral de cuatro días: ¿utopía o futuro cercano?\n\n" +
          "En los últimos años, varias empresas españolas han empezado a probar una idea que hace una década habría sonado a ciencia ficción: trabajar solo cuatro días a la semana sin cobrar menos. El experimento, impulsado en parte por el Gobierno y por un grupo de investigadores, ha implicado ya a cientos de trabajadores de sectores tan distintos como la tecnología, la industria y los servicios.\n\n" +
          "Los primeros resultados, publicados hace unos meses, sorprendieron incluso a los más optimistas. La mayoría de las empresas participantes aseguró que la productividad se había mantenido o incluso había mejorado, y los empleados declararon sentirse menos estresados y dormir mejor. Además, el número de bajas por enfermedad descendió de forma notable. «Pensábamos que tendríamos que reorganizarlo todo y lo que hicimos fue eliminar reuniones inútiles», cuenta Raquel Domínguez, directora de una pequeña empresa de software de Zaragoza.\n\n" +
          "Sin embargo, no todo el mundo está convencido. Algunos economistas advierten de que los resultados podrían no ser extrapolables, porque las empresas que se ofrecieron voluntarias eran, casi por definición, las más dispuestas al cambio. Otros señalan que en sectores como la sanidad o la hostelería, donde la presencia física es imprescindible, reducir la jornada obligaría a contratar más personal, lo que encarecería el servicio. Por último, hay quien teme que, en la práctica, los trabajadores acaben haciendo en cuatro días el mismo trabajo que antes hacían en cinco, con el consiguiente aumento de la presión.\n\n" +
          "Los sindicatos, por su parte, defienden la medida, aunque reclaman que se aplique mediante convenios colectivos y no por decisión unilateral de cada empresa, para evitar que se creen diferencias entre quienes pueden permitírselo y quienes no. La patronal, en cambio, pide prudencia: considera que cada empresa debe decidir libremente y que una ley general podría perjudicar a las pymes.\n\n" +
          "Mientras el debate continúa, muchos de los participantes en la prueba se muestran reacios a volver atrás. «Si me ofrecieran un aumento de sueldo a cambio de volver a cinco días, probablemente lo rechazaría», reconoce Daniel, un técnico de 34 años. Para él, el tiempo libre se ha convertido en una forma de salario que no aparece en la nómina.",
        questions: [
          mc(1, 1, "Según el texto, el experimento…", ["se ha limitado al sector tecnológico.", "ha implicado a trabajadores de sectores muy distintos.", "obliga a los empleados a cobrar menos."]),
          mc(2, 2, "En la empresa de Raquel Domínguez, lo que hicieron fue…", ["contratar a más personal.", "cambiar de programas informáticos.", "eliminar reuniones innecesarias."]),
          mc(3, 3, "Algunos economistas dudan de que los resultados sirvan para todos porque…", ["las empresas participantes eran las más dispuestas al cambio.", "la muestra era demasiado numerosa.", "los datos no se han publicado."]),
          mc(4, 4, "En sectores como la sanidad o la hostelería, reducir la jornada…", ["está prohibido por ley.", "obligaría a contratar más personal y encarecería el servicio.", "no tendría ningún efecto en los costes."]),
          mc(5, 5, "Los sindicatos reclaman que la medida se aplique…", ["mediante convenios colectivos.", "solo en las grandes empresas.", "por decisión de cada empresa."]),
          mc(6, 6, "Con la frase de Daniel sobre el tiempo libre, el texto da a entender que…", ["su empresa le paga las horas libres.", "valora el tiempo libre como un beneficio equiparable al dinero.", "ha renunciado a parte de su sueldo."]),
        ],
      },
      {
        title: "Tarea 2",
        intro: "Lee los textos de cuatro personas (A–D) y los enunciados (7–16). Relaciona cada enunciado con la persona que corresponde. Escribe la letra. Puedes usar cada letra más de una vez.",
        bank: bankOf([
          "Lidia. Me mudé a un pueblo de la sierra de Albacete hace dos años, cuando me quedé sin trabajo en Madrid. Mis padres tenían allí una casa que llevaba años vacía y decidí arreglarla para vivir en ella. Al principio me costó adaptarme: en el pueblo todo el mundo se conoce y apenas hay privacidad, y yo venía de una ciudad donde ni siquiera saludaba a los vecinos. Con el tiempo, sin embargo, he descubierto que esa cercanía es una ventaja, porque siempre hay alguien dispuesto a echarte una mano, ya sea para arreglar una avería o para cuidar de tu perro. Ahora trabajo como traductora desde casa y viajo a la capital una vez al mes para ver a mis amigos.",
          "Rubén. Yo no me fui por gusto, sino por necesidad: la subida de los alquileres en Barcelona me obligó a buscar alternativas y encontré una casa baja en un pueblo de Teruel por un precio ridículo. Lo que no esperaba era la falta de servicios: el médico solo viene dos días a la semana, la fibra óptica llegó el año pasado y para comprar una simple camiseta hay que conducir cuarenta kilómetros. Mis vecinos son muy amables, eso sí, y me han invitado a todas las fiestas. Aun así, si pudiera, volvería a la ciudad mañana mismo, aunque tendría que cambiar de profesión para poder pagarla.",
          "Inés. Soy veterinaria y en mi pueblo hay más vacas que habitantes, así que trabajo no me falta. Me instalé aquí porque quería criar a mis hijos en un entorno seguro, donde puedan jugar en la calle sin peligro y volver a casa solos desde los siete años. Lo que más echo de menos es la oferta cultural: para ir al teatro o a un concierto tengo que conducir una hora, y eso me obliga a planificarlo con semanas de antelación. A cambio, tengo algo que en la ciudad era impensable: tiempo. Entre semana ceno todos los días con mi familia y los domingos hacemos excursiones por el monte sin tener que coger el coche.",
          "Tomás. Soy jubilado y llevo diez años en el pueblo donde nací. Volví cuando enviudé, para estar cerca de mis hermanos. Me parece una exageración que ahora se hable de «la España vaciada» como si fuera un descubrimiento: aquí lo hemos vivido siempre. Lo que de verdad me preocupa es que cierren la escuela, porque sin niños el pueblo se muere. Los jóvenes que llegan gracias al teletrabajo son bienvenidos, sin duda, y han dado vida al bar y a la tienda, pero no sé si se quedarán cuando se les pase la novedad. Yo, desde luego, no me iría de aquí por nada del mundo.",
        ]),
        questions: [
          mt(7, 7, "Se fue a vivir al pueblo después de perder su empleo en la ciudad.", 4),
          mt(8, 8, "Lamenta que cerca de su casa haya poca oferta de teatro y conciertos.", 4),
          mt(9, 9, "Dejó la ciudad porque no podía pagar el alquiler.", 4),
          mt(10, 10, "Teme que la escuela del pueblo desaparezca.", 4),
          mt(11, 11, "Ha descubierto que los vecinos se ayudan unos a otros.", 4),
          mt(12, 12, "Eligió el pueblo porque lo considera un lugar seguro para sus hijos.", 4),
          mt(13, 13, "Duda de que los recién llegados permanezcan a largo plazo.", 4),
          mt(14, 14, "Volvería a vivir en la ciudad si sus ingresos se lo permitieran.", 4),
          mt(15, 15, "Al principio le resultó difícil acostumbrarse a la falta de intimidad.", 4),
          mt(16, 16, "Sabe que su profesión le garantiza trabajo en el pueblo.", 4),
        ],
      },
      {
        title: "Tarea 3",
        intro: "Lee el texto. Faltan seis fragmentos (17–22). Elige para cada hueco el fragmento correcto (A–H). Hay dos fragmentos que no necesitas. Escribe la letra.",
        passage:
          "Aprender un idioma de adulto: mitos y realidades\n\n" +
          "Durante décadas se creyó que el mejor momento para aprender una lengua extranjera era la infancia y que, pasada la adolescencia, las posibilidades de dominarla se reducían drásticamente. (17) Los estudios más recientes, sin embargo, matizan esta idea.\n\n" +
          "Es cierto que los niños suelen adquirir una pronunciación más natural. (18) Los adultos, en cambio, cuentan con ventajas que los pequeños no tienen: saben cómo aprenden mejor, pueden relacionar las reglas nuevas con las de su propia lengua y tienen motivos concretos para estudiar, ya sea un ascenso o un viaje.\n\n" +
          "Lo que de verdad marca la diferencia no es la edad, sino la constancia. (19) Los expertos lo explican así: la memoria funciona mejor con repasos frecuentes que con grandes maratones de estudio.\n\n" +
          "Otro error habitual es esperar a hablar «perfectamente» para empezar a comunicarse. Cometer errores forma parte del proceso, y quien tiene miedo a equivocarse suele quedarse en silencio durante años. Por eso, muchos profesores aconsejan buscar cuanto antes ocasiones reales de conversación, aunque (20).\n\n" +
          "La tecnología también ayuda, pero con matices. Las aplicaciones permiten practicar en cualquier momento y lugar, y eso es una gran ventaja. (21) Los especialistas coinciden en que ninguna aplicación sustituye al contacto con hablantes reales.\n\n" +
          "Por último, conviene fijar objetivos realistas. No se trata de alcanzar el nivel de un nativo, sino de poder desenvolverse en las situaciones que nos interesan. Y, cuando se logra, la satisfacción compensa con creces el esfuerzo. Si alguna vez dudaste de tu capacidad, recuerda que (22).",
        bank: bankOf([
          "Esta convicción estaba tan extendida que muchos adultos renunciaban a estudiar antes siquiera de intentarlo.",
          "Sin embargo, la pronunciación es solo un aspecto del idioma y no siempre el más importante para comunicarse.",
          "Quien estudia veinte minutos cada día suele avanzar más que quien se pasa cinco horas seguidas un domingo.",
          "al principio solo se sepa decir lo básico",
          "Pero confiar demasiado en ellas puede dar una falsa sensación de progreso.",
          "Por eso, lo mejor es estudiar solo con libros de gramática y evitar hablar.",
          "otros muchos adultos han demostrado antes que tú que nunca es tarde para empezar",
          "En consecuencia, los niños nunca deberían aprender dos idiomas a la vez.",
        ]),
        questions: [
          mt(17, 17, "Hueco (17)", 8),
          mt(18, 18, "Hueco (18)", 8),
          mt(19, 19, "Hueco (19)", 8),
          mt(20, 20, "Hueco (20)", 8),
          mt(21, 21, "Hueco (21)", 8),
          mt(22, 22, "Hueco (22)", 8),
        ],
      },
      {
        title: "Tarea 4",
        intro: "Lee el texto y elige la opción correcta para cada hueco (a, b o c).",
        passage:
          "El mercado que volvió a abrir sus puertas\n\n" +
          "Cuando el mercado de San Cristóbal cerró en 2012, muchos vecinos creyeron que el barrio nunca (23). La mayoría de los puestos llevaba años (24) clientes a causa de los supermercados y los propietarios, ya mayores, no encontraron a nadie que (25) el negocio. Durante casi una década, el edificio permaneció abandonado.\n\n" +
          "Todo cambió cuando un grupo de jóvenes arquitectos presentó al ayuntamiento un proyecto para (26) el mercado en un espacio mixto, con tiendas, un restaurante y una sala de actividades. Al principio, las autoridades se mostraron escépticas, (27) acabaron aprobando la propuesta cuando comprobaron que los vecinos la apoyaban de forma masiva.\n\n" +
          "Las obras duraron dos años. (28) acabaron, el mercado volvió a abrir con unos cuarenta comercios, muchos de ellos gestionados por jóvenes emprendedores. «Si no (29) por el apoyo del barrio, nunca lo habríamos conseguido», reconoce Marta Ibáñez, una de las promotoras.\n\n" +
          "Hoy el mercado recibe cada semana a miles de visitantes, (30) ha atraído también a nuevos residentes. Algunos vecinos veteranos, no obstante, se quejan de que los precios han (31) mucho y de que ya no pueden comprar allí como antes. Los promotores aseguran que (32) por mantener una oferta asequible, algo (33) no siempre es fácil.\n\n" +
          "Los expertos señalan que este tipo de proyectos, siempre que (34) bien planteados, pueden revitalizar barrios enteros, pero advierten del riesgo de que la mejora (35) a los habitantes de siempre. «Lo importante es que el barrio (36) de todos», concluye Marta.",
        questions: [
          mc(23, 23, "Hueco (23)", ["se recupere", "b) se recupera", "c) se recuperaría"]),
          mc(24, 24, "Hueco (24)", ["perdido", "b) perder", "c) perdiendo"]),
          mc(25, 25, "Hueco (25)", ["continuara", "b) continúa", "c) continuaría"]),
          mc(26, 26, "Hueco (26)", ["pasar", "b) convertir", "c) volver"]),
          mc(27, 27, "Hueco (27)", ["pero", "b) sino", "c) o sea"]),
          mc(28, 28, "Hueco (28)", ["Antes de que", "b) Una vez que", "c) Mientras que"]),
          mc(29, 29, "Hueco (29)", ["había sido", "b) habría sido", "c) hubiera sido"]),
          mc(30, 30, "Hueco (30)", ["cuya", "b) lo que", "c) el que"]),
          mc(31, 31, "Hueco (31)", ["subido", "b) sube", "c) subiendo"]),
          mc(32, 32, "Hueco (32)", ["luchen", "b) luchaban", "c) luchan"]),
          mc(33, 33, "Hueco (33)", ["lo", "b) cual", "c) que"]),
          mc(34, 34, "Hueco (34)", ["están", "b) estén", "c) estarán"]),
          mc(35, 35, "Hueco (35)", ["expulsa", "b) expulse", "c) expulsando"]),
          mc(36, 36, "Hueco (36)", ["esté", "b) es", "c) sea"]),
        ],
      },
    ],
  },

  // ───────────────────────── PARTE 3. GRAMÁTICA Y VOCABULARIO (n 67–116) ─────────────────────────
  // (ترقيم n بيبدأ من 67 عشان يفضل مكان الاستماع 37–66 محجوز — شوف تعليق الملف.)
  {
    id: "gram",
    title: "Gramática y vocabulario",
    minutes: 40,
    tasks: [
      {
        title: "Tarea 1. Gramática I",
        intro: "Elige la opción que completa correctamente cada frase (a, b o c).",
        questions: [
          mc(67, 1, "Cuando llegamos al cine, la película ya ___.", ["empezó", "había empezado", "empezaba"]),
          mc(68, 2, "Ayer me ___ con una antigua compañera de clase que no veía desde hacía años.", ["había encontrado", "encontraba", "encontré"]),
          mc(69, 3, "Si ves a Pablo, ___ que me llame.", ["dice", "dile", "dígale"]),
          mc(70, 4, "Es importante que todos ___ las normas de seguridad.", ["respetan", "respetarán", "respeten"]),
          mc(71, 5, "Este regalo es ___ mi hermana: cumple años mañana.", ["para", "por", "a"]),
          mc(72, 6, "La reunión ___ en la sala B, no en la A.", ["está", "es", "hay"]),
          mc(73, 7, "Nunca ___ tanto como en este viaje.", ["me reía", "he reído", "me he reído"]),
          mc(74, 8, "Si ___ más dinero, me compraría una casa en la sierra.", ["tuviera", "tengo", "tendría"]),
          mc(75, 9, "Me dijo que ___ al día siguiente para recoger el paquete.", ["vendrá", "venga", "vendría"]),
          mc(76, 10, "Buscamos un piso que ___ cerca del metro.", ["esté", "está", "estará"]),
          mc(77, 11, "En esta zona ___ muchas casas rurales.", ["se alquila", "alquila", "se alquilan"]),
          mc(78, 12, "Mi madre quería que ___ medicina, pero yo prefería las letras.", ["estudie", "estudiara", "estudiaría"]),
          mc(79, 13, "Tan pronto como ___ el resultado del examen, te llamo.", ["sé", "sabré", "sepa"]),
        ],
      },
      {
        title: "Tarea 2. Gramática II",
        intro: "Elige la opción que completa correctamente cada frase (a, b o c).",
        questions: [
          mc(80, 14, "Si ___ antes, no habríamos perdido el vuelo.", ["saliéramos", "salíamos", "hubiéramos salido"]),
          mc(81, 15, "Me alegro de que ya ___ el trabajo; estabas muy agobiado.", ["hayas acabado", "acabes", "hubieras acabado"]),
          mc(82, 16, "Por mucho que ___, no conseguirás convencerle.", ["insistes", "insistas", "insistirás"]),
          mc(83, 17, "Ya te dije que ___ el paraguas, pero no me hiciste caso.", ["llevas", "llevarías", "llevaras"]),
          mc(84, 18, "Mañana iré a verte, siempre que no ___ trabajo.", ["tenga", "tengo", "tuviera"]),
          mc(85, 19, "Lo hice ___ me lo pidió el jefe, no por gusto.", ["para que", "a pesar de que", "porque"]),
          mc(86, 20, "El proyecto no se aprobó ___ la falta de presupuesto.", ["para", "debido a", "a pesar de"]),
          mc(87, 21, "Se comporta ___ no supiera nada del asunto.", ["aunque", "como", "como si"]),
          mc(88, 22, "No iremos a la excursión, a no ser que ___ el tiempo.", ["mejora", "mejore", "mejorará"]),
          mc(89, 23, "El informe, ___ por un comité de expertos, se publicará mañana.", ["elaborar", "elaborando", "elaborado"]),
          mc(90, 24, "Es probable que, cuando lleguemos, ya ___ la ceremonia.", ["termine", "había terminado", "haya terminado"]),
          mc(91, 25, "Hubo tantos problemas, ___ el viaje se canceló.", ["de ahí que", "de modo que", "con tal de que"]),
        ],
      },
      {
        title: "Tarea 3. Vocabulario I",
        intro: "Elige la opción que completa correctamente cada frase (a, b o c).",
        questions: [
          mc(92, 26, "Los inquilinos deben pagar el ___ antes del día cinco de cada mes.", ["préstamo", "propietario", "alquiler"]),
          mc(93, 27, "Después de la reunión, el director nos ___ un resumen por correo electrónico.", ["puso", "hizo", "mandó"]),
          mc(94, 28, "Llevo toda la semana con mucho ___ y no he podido dormir bien.", ["estructura", "estrés", "estrella"]),
          mc(95, 29, "Para ahorrar energía, conviene apagar los aparatos que están en modo de ___.", ["pausa", "reserva", "espera"]),
          mc(96, 30, "Mi compañero de piso es muy ___: nunca hace ruido y deja siempre la cocina limpia.", ["respetuoso", "respetable", "respetado"]),
          mc(97, 31, "Hay que ___ la factura antes de que termine el plazo si no quieres pagar un recargo.", ["ampliar", "abandonar", "abonar"]),
          mc(98, 32, "El escándalo ___ a la luz tras una investigación periodística.", ["cayó", "salió", "puso"]),
          mc(99, 33, "Su hermano es muy ___: siempre cuenta con orgullo todo lo que ha conseguido.", ["presumible", "presumido", "presumo"]),
          mc(100, 34, "No estoy seguro de que sea buena idea; tendremos que ___ los pros y los contras.", ["soportar", "sostener", "sopesar"]),
          mc(101, 35, "Mi vecino me hizo un favor enorme cuando me ___ su coche.", ["prestó", "pidió", "tomó"]),
          mc(102, 36, "La empresa decidió ___ la producción por la caída de la demanda.", ["reducir", "reponer", "reducirse"]),
          mc(103, 37, "Es una persona muy ___: nunca le ha gustado depender de nadie.", ["insistente", "indiferente", "independiente"]),
          mc(104, 38, "Para evitar el despilfarro, hay que ___ los recursos de forma eficiente.", ["gestionar", "regalar", "olvidar"]),
        ],
      },
      {
        title: "Tarea 4. Vocabulario II",
        intro: "Elige la opción que completa correctamente cada frase (a, b o c).",
        questions: [
          mc(105, 39, "La ___ de energías renovables ha crecido un veinte por ciento en el último año.", ["productividad", "producción", "producto"]),
          mc(106, 40, "El Gobierno ha anunciado un plan para ___ el desempleo juvenil.", ["combinar", "comprobar", "combatir"]),
          mc(107, 41, "Los científicos ___ que el nivel del mar seguirá subiendo en las próximas décadas.", ["previenen", "prevén", "proveen"]),
          mc(108, 42, "Tras la crisis, muchas familias tuvieron que ___ el cinturón.", ["apretarse", "romperse", "estirarse"]),
          mc(109, 43, "Me parece una ___ de tiempo seguir discutiendo sin datos nuevos.", ["falta", "pérdida", "perdida"]),
          mc(110, 44, "La nueva ley ha ___ una fuerte polémica entre los expertos.", ["subido", "soltado", "suscitado"]),
          mc(111, 45, "Con su actitud solo consiguió ___ las tensiones, en lugar de calmarlas.", ["avivar", "avisar", "aviar"]),
          mc(112, 46, "Su discurso fue tan ___ que nadie se atrevió a contradecirle.", ["corriente", "contundente", "cuantioso"]),
          mc(113, 47, "Cuando le preguntaron por el escándalo, se salió por la ___ y no respondió.", ["tangente", "frontera", "puerta"]),
          mc(114, 48, "Los sindicatos han ___ una huelga para el próximo mes.", ["provocado", "invocado", "convocado"]),
          mc(115, 49, "Es una situación muy ___: nadie sabe qué va a pasar.", ["incorrecta", "incierta", "inexperta"]),
          mc(116, 50, "El proyecto cuenta con el ___ de varias instituciones internacionales.", ["aval", "avatar", "aviso"]),
        ],
      },
    ],
  },
];

// ───────────────────────── PARTE 2. COMPRENSIÓN AUDITIVA (n 37–66) ─────────────────────────
// 🎧 5 تسجيلات، كل تسجيل على Tarea كاملة وبصوت منفصل (الأدمن بيرفع 5 أوديو):
//   خانة 1 → Tarea 1 كاملة (6 محادثات قصيرة · أسئلة 37–42)
//   خانة 2 → Tarea 2 كاملة (Elena y Mario · أسئلة 43–48)
//   خانة 3 → Tarea 3 كاملة (مقابلة Clara Montero · أسئلة 49–54)
//   خانة 4 → Tarea 4 كاملة (6 أشخاص والموبايل · أسئلة 55–60)
//   خانة 5 → Tarea 5 كاملة (محاضرة الحميات · أسئلة 61–66)
//   الصوت بيترفع من لوحة الأدمن (Placement Tests → B2 → Listening audio) ونصوص التسجيلات (guiones)
//   في placementAudioScripts.js. أي مهمة من غير صوت بتتخفي والدرجة بتتحسب كنسبة من 100.
export const LISTENING_ENABLED_B2 = true;
export const PLACEMENT_LISTENING_B2 = {
  id: "listen",
  title: "Comprensión auditiva",
  minutes: 40,
  tasks: [
    {
      title: "Tarea 1",
      intro: "Escucha seis conversaciones breves. Elige la opción correcta (a, b o c).",
      audioSlot: 1,
      questions: [
        mc(37, 1, "¿Qué le ofrece la mujer a Álvaro?", ["Terminar ella el informe.", "Dejarle su ordenador.", "Enviarle la plantilla por correo."]),
        mc(38, 2, "¿Cuándo verá el piso el hombre?", ["Esta tarde.", "Mañana por la mañana.", "El sábado a las diez."]),
        mc(39, 3, "¿Cuál es la postura de la mujer sobre las vacaciones?", ["Rechaza la oferta de forma tajante.", "Acepta la oferta sin dudar.", "Quiere más tiempo antes de decidir."]),
        mc(40, 4, "¿Qué advierte el locutor?", ["Que no todos los productos se pueden devolver.", "Que la tienda siempre paga los gastos de devolución.", "Que el plazo para devolver es de un mes."]),
        mc(41, 5, "¿Qué lamenta el hombre?", ["Haber hecho la obra en un momento poco adecuado.", "Haber elegido una empresa poco seria.", "Haber gastado más dinero del previsto."]),
        mc(42, 6, "¿En qué coinciden los dos interlocutores?", ["En que prohibir los coches antiguos es inútil.", "En que antes de prohibir debe mejorar el transporte público.", "En que los autobuses contaminan más que los coches."]),
      ],
    },
    {
      title: "Tarea 2",
      intro: "Escucha la conversación entre Elena y Mario. Relaciona cada enunciado (7–12) con la opción correcta: a) Elena, b) Mario o c) Los dos. Escribe la letra.",
      audioSlot: 2,
      questions: [
        mc(43, 7, "Considera que la solidaridad obligatoria es una contradicción.", ["Elena", "Mario", "Los dos"]),
        mc(44, 8, "Cree que el servicio permitiría conocer realidades que los jóvenes no conocen.", ["Elena", "Mario", "Los dos"]),
        mc(45, 9, "Piensa que los participantes deberían recibir una compensación económica.", ["Elena", "Mario", "Los dos"]),
        mc(46, 10, "Quiere destinar más dinero a los programas de voluntariado que ya existen.", ["Elena", "Mario", "Los dos"]),
        mc(47, 11, "Opina que el riesgo de sustituir empleos reales no justifica renunciar a la idea.", ["Elena", "Mario", "Los dos"]),
        mc(48, 12, "Está de acuerdo en que es necesario hacer algo al respecto.", ["Elena", "Mario", "Los dos"]),
      ],
    },
    {
      title: "Tarea 3",
      intro: "Escucha la entrevista a Clara Montero, bióloga especializada en abejas. Elige la opción correcta (a, b o c).",
      audioSlot: 3,
      questions: [
        mc(49, 13, "Clara empezó a trabajar con colmenas urbanas…", ["por encargo de la universidad.", "por la propuesta de un compañero, como experimento.", "después de dejar el laboratorio."]),
        mc(50, 14, "Según Clara, las abejas sobreviven mejor en la ciudad porque…", ["hay menos pesticidas y más variedad de flores.", "hace menos calor.", "hay menos competencia por el néctar."]),
        mc(51, 15, "¿Qué problema señala Clara?", ["La falta de apicultores.", "El ruido de la ciudad.", "La competencia por el néctar con las abejas silvestres."]),
        mc(52, 16, "A quien quiera ayudar a las abejas, le recomienda…", ["plantar flores autóctonas y no usar insecticidas.", "instalar muchas colmenas.", "crear más parques."]),
        mc(53, 17, "Los vecinos cambian de opinión sobre las colmenas porque…", ["reciben miel gratis.", "los niños se lo piden.", "comprenden que las abejas de miel son poco agresivas."]),
        mc(54, 18, "De lo que dice Clara se deduce que las colmenas urbanas…", ["son la mejor solución para salvar a las abejas.", "pueden resultar perjudiciales si hay demasiadas.", "solo funcionan en zonas agrícolas."]),
      ],
    },
    {
      title: "Tarea 4",
      intro:
        "Escucharás a seis personas que hablan de su relación con el móvil. Relaciona cada persona (19–24) con el enunciado correspondiente (A–H). Hay dos enunciados que no necesitas. Escribe la letra.",
      bank: bankOf([
        "Ha decidido no usar el móvil por la noche.",
        "Valora el móvil porque le permite mantener el contacto con su familia.",
        "Se queja de que le escriben del trabajo fuera de su horario.",
        "Reconoce que ha perdido la capacidad de concentrarse en una lectura larga.",
        "Piensa que los padres deben dar ejemplo a sus hijos.",
        "Afirma que no tiene redes sociales y no las echa de menos.",
        "Utiliza el móvil sobre todo para trabajar.",
        "Lamenta haberse gastado mucho dinero en un teléfono nuevo.",
      ]),
      audioSlot: 4,
      questions: [
        mt(55, 19, "Persona 1", 8),
        mt(56, 20, "Persona 2", 8),
        mt(57, 21, "Persona 3", 8),
        mt(58, 22, "Persona 4", 8),
        mt(59, 23, "Persona 5", 8),
        mt(60, 24, "Persona 6", 8),
      ],
    },
    {
      title: "Tarea 5",
      intro: "Escucha la conferencia sobre las dietas de moda. Elige la opción correcta (a, b o c).",
      audioSlot: 5,
      questions: [
        mc(61, 25, "Según el conferenciante, las dietas de moda tienen éxito porque…", ["las recomiendan los médicos.", "son más baratas que otras.", "prometen soluciones sencillas a problemas complejos."]),
        mc(62, 26, "Sobre eliminar un grupo de alimentos, dice que…", ["siempre mejora la salud.", "normalmente no aporta beneficios si no hay una intolerancia diagnosticada.", "está prohibido por ley."]),
        mc(63, 27, "Las redes sociales han influido en las dietas porque…", ["han difundido información rigurosa.", "han reducido el interés por ellas.", "han hecho que la gente imite dietas sin asesoramiento."]),
        mc(64, 28, "Los vídeos que se difunden en redes ocultan…", ["los casos en que la dieta no funciona.", "los precios de los productos.", "los riesgos de dormir poco."]),
        mc(65, 29, "Ante la idea de probar dietas nuevas, el conferenciante…", ["las rechaza todas.", "las admite si se hacen con prudencia y supervisión.", "las recomienda a todo el mundo."]),
        mc(66, 30, "Con el ejercicio final, el conferenciante quiere que el público…", ["compre menos productos.", "se pregunte quién gana dinero con una dieta.", "consulte más a personas famosas."]),
      ],
    },
  ],
};

// الأجزاء الفعلية للاختبار: قراءة ← استماع ← قواعد ومفردات (مهام الاستماع من غير صوت بتتخفي لوحدها).
export const PLACEMENT_PARTS_B2 = LISTENING_ENABLED_B2
  ? [BASE_PARTS_B2[0], PLACEMENT_LISTENING_B2, BASE_PARTS_B2[1]]
  : BASE_PARTS_B2;
