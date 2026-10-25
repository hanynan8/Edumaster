// ═══════════════════════════════════════════════
//  app/lib/spanishPlacementTestB1.js
//  بيانات اختبار تحديد المستوى (إسباني) — Prueba de nivel de español B1
//  المصدر: ملف "Prueba de nivel de español B1: cuadernillo del candidato" (docx).
//
//  نفس هيكل A1/A2 بالظبط (PLACEMENT_PARTS → tasks → questions):
//    - question: { n: رقم السؤال العام، ln: رقم السؤال داخل الجزء (زي ترقيم الملف)، q، ctx، o }
//    - task.bank: سؤال "ربط": الخيارات حروف (A, B, C…) والنصوص في task.bank.
//    - task.passage: نص مشترك لأسئلة المهمة.
//
//  الترقيم العام (n):
//    قراءة 1–30  ·  استماع 31–60  ·  قواعد ومفردات 61–110   (110 سؤال، كل سؤال بدرجة)
//  الدرجة بتتحسب كنسبة مئوية من الأسئلة الظاهرة فعلًا (من 100) — زي A1/A2.
//
//  ⚠️ الاستماع (31–60) لسه مش متفعّل في الاختبار:
//    ملف الاختبار كراسة المرشح بس — مفيهوش مفتاح إجابات الاستماع ولا نصوص التسجيلات (guiones).
//    الأسئلة جاهزة تحت في PLACEMENT_LISTENING_B1، بس مش داخلة في PLACEMENT_PARTS_B1 لحد ما
//    نضيف مفتاحها في spanishPlacementTestKeyB1.js (LISTENING) ونرفع الصوتيات.
//    (التصحيح بيعتبر أي سؤال من غير مفتاح غلط، فمينفعش يظهر قبل المفتاح.)
//    التفعيل: شوف التعليق في آخر الملف.
//  ✍️🗣️ التعبير الكتابي (Parte 4) والشفهي (Parte 5) مش بيتصححوا آليًا، فمش جزء من الاختبار هنا
//    (زي A1/A2).
//  - 🔒 مفتاح الإجابات مش هنا (الملف ده بيتحمّل في المتصفح) — هو في spanishPlacementTestKeyB1.js
// ═══════════════════════════════════════════════

export const PLACEMENT_TEST_TITLE_B1 = "Prueba de nivel de español B1";

const L = "ABCDEFGHIJK";
// خيارات الربط: أول k حرف (A..)
const letters = (k) => L.slice(0, k).split("");
// سؤال اختيار من متعدد
const mc = (n, ln, q, o, ctx) => (ctx ? { n, ln, q, ctx, o } : { n, ln, q, o });
// سؤال ربط: الخيارات حروف
const mt = (n, ln, q, k) => ({ n, ln, q, o: letters(k) });
// بنك الربط من نصوص بالترتيب A, B, C…
const bankOf = (texts) => texts.map((t, i) => ({ l: L[i], t }));

const BASE_PARTS_B1 = [
  // ───────────────────────── PARTE 1. COMPRENSIÓN DE LECTURA (n 1–30) ─────────────────────────
  {
    id: "read",
    title: "Comprensión de lectura",
    minutes: 70,
    tasks: [
      {
        title: "Tarea 1",
        intro:
          "Lee las declaraciones de seis personas (1–6) y los textos (A–H). Relaciona cada persona con el texto que le interesa. Hay dos textos que no necesitas. Escribe la letra.",
        bank: bankOf([
          "«Curso de cocina para principiantes. Aprende a preparar platos fáciles y sanos en solo cuatro semanas. Clases los martes y jueves de 19:00 a 21:00. Plazas limitadas: reserva ya llamando al 957 123 456.»",
          "«Se necesita camarero/a para restaurante en el centro. Jornada de 6 horas, fines de semana incluidos. Se valora la experiencia y un nivel básico de inglés. Enviar currículum antes del 30 de noviembre.»",
          "«Cine de verano en el parque. Todos los viernes de julio y agosto, a las 22:00. Entrada libre hasta completar el aforo. Trae una manta o una silla. En caso de lluvia, la sesión se cancela.»",
          "«Aviso a los vecinos: el próximo lunes se cortará el agua en todo el edificio, de 9:00 a 14:00, por obras en la tubería. Disculpen las molestias. La comunidad.»",
          "«Alquilo habitación en piso compartido con dos estudiantes. Luminosa y con balcón. 280 € al mes, gastos incluidos. Cerca de la universidad y del metro. No se admiten mascotas. Contacto: 622 000 111.»",
          "«Gimnasio Aqua: promoción de otoño. Si te apuntas este mes, matrícula gratis y una semana de prueba sin compromiso. Piscina, sala de musculación y clases de yoga. De lunes a sábado.»",
          "«Vendo bicicleta de montaña, casi nueva. La compré hace seis meses y la he usado muy poco. Incluye casco y candado. Precio: 220 €, negociable. Tengo la factura.»",
          "«Concierto solidario de la banda “Los Vecinos”. Sábado 12, a las 20:30, en el centro cultural. Entrada: 5 €. Todo el dinero se destinará a la biblioteca del barrio.»",
        ]),
        questions: [
          mt(1, 1, "Marta: «Quiero aprender a cocinar, pero no sé casi nada. Prefiero ir por la tarde.»", 8),
          mt(2, 2, "Daniel: «Busco trabajo los fines de semana y tengo experiencia en hostelería.»", 8),
          mt(3, 3, "Laura: «Soy estudiante y necesito un sitio barato para vivir cerca de la universidad.»", 8),
          mt(4, 4, "Los Pérez: «Nos gusta el cine y queremos ver una película al aire libre con los niños.»", 8),
          mt(5, 5, "Andrés: «Quiero hacer deporte, pero antes de pagar me gustaría probar el gimnasio unos días.»", 8),
          mt(6, 6, "Elena: «Quiero ayudar a mi barrio y, además, me encanta la música en directo.»", 8),
        ],
      },
      {
        title: "Tarea 2",
        intro: "Lee el texto y responde a las preguntas. Elige la opción correcta (a, b o c).",
        passage:
          "Las ciudades españolas se llenan de bicicletas\n\n" +
          "Hace diez años, ir en bicicleta por el centro de una ciudad española era algo poco común. Hoy el paisaje ha cambiado: en Sevilla, Valencia o Vitoria, miles de personas pedalean cada día para ir al trabajo, al colegio o a comprar el pan.\n\n" +
          "Los expertos explican que el cambio se debe, sobre todo, a tres razones. La primera es la construcción de carriles bici seguros que unen los barrios con el centro. La segunda es el precio de la gasolina y del aparcamiento, que cada año es más caro. La tercera es una mayor preocupación por el medio ambiente y por la salud: una persona que pedalea media hora al día reduce el riesgo de muchas enfermedades.\n\n" +
          "Sin embargo, no todo son ventajas. Muchos ciclistas se quejan de que los carriles bici se interrumpen de repente o de que algunos conductores no respetan su espacio. Por eso, varios ayuntamientos han puesto en marcha campañas para enseñar a convivir a coches, bicicletas y peatones. En algunas ciudades, además, se multa a quienes aparcan en el carril bici.\n\n" +
          "Otro aspecto que ha ayudado mucho es el sistema de bicicletas públicas. Con una pequeña cuota anual, cualquier persona puede coger una bicicleta en una estación, usarla durante media hora y dejarla en otra. «Yo no tengo sitio en casa para guardar una bicicleta, y este servicio me resuelve el problema», cuenta Irene, una estudiante de 22 años que lo usa todos los días para ir a la facultad.\n\n" +
          "Algunos comerciantes también han notado el cambio. Al principio temían que, sin coches en la puerta, venderían menos. Pero los estudios muestran lo contrario: los clientes que llegan en bicicleta o a pie compran con más frecuencia, aunque gasten menos en cada visita. «Pasan más tiempo en la calle y se paran a mirar los escaparates», explica Javier, dueño de una librería del centro.\n\n" +
          "El próximo reto, según los especialistas, es conseguir que las bicicletas también lleguen a los pueblos pequeños y a las zonas rurales, donde las distancias son mayores y los caminos no siempre son seguros. Mientras tanto, en las ciudades, la bicicleta parece haber llegado para quedarse.",
        questions: [
          mc(7, 7, "Según el texto, hace diez años...", [
            "mucha gente usaba la bicicleta en el centro.",
            "no había bicicletas en España.",
            "usar la bicicleta en el centro era poco habitual.",
          ]),
          mc(8, 8, "Una de las razones del cambio es...", [
            "la construcción de carriles bici seguros.",
            "la bajada del precio de la gasolina.",
            "la prohibición de los coches.",
          ]),
          mc(9, 9, "Irene usa las bicicletas públicas porque...", [
            "son gratis.",
            "no sabe aparcar el coche.",
            "no tiene sitio en casa para guardar una bicicleta.",
          ]),
          mc(10, 10, "Muchos ciclistas se quejan de que...", [
            "los carriles bici son demasiado largos.",
            "algunos conductores no respetan su espacio.",
            "las multas son muy caras.",
          ]),
          mc(11, 11, "Los comerciantes han descubierto que los clientes que llegan en bicicleta...", [
            "compran con más frecuencia.",
            "gastan más en cada visita.",
            "compran menos veces.",
          ]),
          mc(12, 12, "Según los especialistas, el próximo reto es...", [
            "construir más estaciones de bicicletas en el centro.",
            "llevar la bicicleta a los pueblos y a las zonas rurales.",
            "eliminar los coches de las ciudades.",
          ]),
        ],
      },
      {
        title: "Tarea 3",
        intro:
          "Lee los tres textos (A, B y C) y relaciona cada enunciado (13–18) con la persona que corresponde. Escribe la letra. Puedes usar cada letra más de una vez.",
        bank: bankOf([
          "Sara, estudiante Erasmus en Granada. «Llegué a Granada en septiembre sin conocer a nadie. Los primeros días me sentí un poco sola, pero pronto empecé a ir a un grupo de intercambio de idiomas en un bar cerca de la universidad. Allí conocí a gente de todo el mundo. Ahora comparto piso con una chica italiana y un chico alemán, y los fines de semana hacemos excursiones por la sierra. Lo único que no me gusta es que cenan muy tarde: ¡yo todavía no me acostumbro!»",
          "Pablo, voluntario en Perú. «El año pasado pasé tres meses en un pueblo de los Andes dando clases de informática a niños. Al principio tenía problemas con la altura y me dolía la cabeza, pero la gente del pueblo me cuidó muchísimo. Aprendí a hablar un poco de quechua y a cocinar papas de mil maneras. Cuando me fui, todos lloraban. Espero volver algún día, aunque mi familia dice que estoy loco por querer subir otra vez a 3.500 metros.»",
          "Aisha, ingeniera en Madrid. «Trabajo en una empresa española desde hace dos años. Lo más difícil fue entender el humor y los chistes de mis compañeros, que hablan muy rápido. Para mejorar, veo series en español con subtítulos y leo el periódico en el metro. Mi jefe dice que he mejorado mucho. Lo que más me gusta es la hora del café de la mañana, cuando hablamos de todo menos de trabajo.»",
        ]),
        questions: [
          mt(13, 13, "Esta persona vive con compañeros de otros países.", 3),
          mt(14, 14, "Esta persona estuvo tres meses ayudando en un pueblo.", 3),
          mt(15, 15, "Esta persona trabaja en una empresa desde hace dos años.", 3),
          mt(16, 16, "Esta persona tuvo problemas de salud al llegar.", 3),
          mt(17, 17, "Esta persona practica el idioma viendo series y leyendo.", 3),
          mt(18, 18, "A esta persona le resulta raro el horario de las comidas.", 3),
        ],
      },
      {
        title: "Tarea 4",
        intro:
          "Lee el texto. Faltan seis frases (19–24). Elige para cada hueco la frase correcta (A–H). Hay dos frases que no necesitas. Escribe la letra.",
        passage:
          "Cómo preparar bien un examen\n\n" +
          "Estudiar mucho no siempre significa estudiar bien. Para aprovechar el tiempo, lo mejor es seguir unos consejos sencillos.\n\n" +
          "Primero, organiza tu semana. Antes de empezar, haz un calendario con las fechas de los exámenes y reparte el trabajo en pequeñas tareas. (19) Así no tendrás que estudiarlo todo la noche anterior.\n\n" +
          "Busca un lugar tranquilo. La biblioteca o tu habitación pueden ser buenos sitios, siempre que (20). Muchos estudiantes dejan el móvil fuera de la habitación durante una hora y descubren que trabajan mucho más rápido.\n\n" +
          "No olvides descansar. Cada cincuenta minutos, para diez minutos y camina un poco. (21) Dormir entre siete y ocho horas también es muy importante, porque durante el sueño el cerebro guarda lo que has aprendido.\n\n" +
          "Estudia en grupo de vez en cuando. Explicar un tema a un compañero es una forma excelente de comprobar si lo has entendido. (22), pero no conviene hacerlo todos los días.\n\n" +
          "Por último, cuida tu alimentación. Desayuna bien antes del examen y bebe agua. (23) Y, sobre todo, mantén la calma: si has estudiado con orden, (24).",
        bank: bankOf([
          "Es un método muy útil si encuentras compañeros con tu mismo ritmo",
          "tendrás más confianza el día del examen",
          "Un cerebro cansado no aprende bien.",
          "no haya distracciones cerca",
          "Por ejemplo, dedica una hora diaria a cada asignatura.",
          "Evita tomar demasiado café o bebidas energéticas, porque pueden ponerte nervioso.",
          "Es mejor estudiar de noche porque hay más silencio.",
          "Y no compres un libro nuevo para cada asignatura.",
        ]),
        questions: [
          mt(19, 19, "Hueco (19)", 8),
          mt(20, 20, "Hueco (20)", 8),
          mt(21, 21, "Hueco (21)", 8),
          mt(22, 22, "Hueco (22)", 8),
          mt(23, 23, "Hueco (23)", 8),
          mt(24, 24, "Hueco (24)", 8),
        ],
      },
      {
        title: "Tarea 5",
        intro: "Lee la carta y elige la opción correcta para cada hueco (a, b o c).",
        passage:
          "Estimados señores:\n\n" +
          "Les escribo para (25) una queja sobre el servicio que recibí el pasado 12 de octubre. Compré un teléfono móvil en su tienda online y me prometieron que (26) en tres días. Sin embargo, el paquete llegó con una semana de retraso y la pantalla (27) rota.\n\n" +
          "Llamé varias veces al servicio de atención al cliente, pero nadie (28) contestó. Si hubiera sabido que iban a tardar tanto, (29) comprado el teléfono en otra tienda.\n\n" +
          "Por todo ello, les pido que me devuelvan el dinero lo antes posible. (30) de antemano su atención, les saludo atentamente.",
        questions: [
          mc(25, 25, "Hueco (25)", ["hacer", "tener", "presentar"]),
          mc(26, 26, "Hueco (26)", ["llegue", "llegaría", "llegó"]),
          mc(27, 27, "Hueco (27)", ["era", "fue", "estaba"]),
          mc(28, 28, "Hueco (28)", ["le", "se", "me"]),
          mc(29, 29, "Hueco (29)", ["hubiera", "habría", "había"]),
          mc(30, 30, "Hueco (30)", ["Agradecen", "Agradeciéndoles", "Agradecieron"]),
        ],
      },
    ],
  },

  // ───────────────────────── PARTE 3. GRAMÁTICA Y VOCABULARIO (n 61–110) ─────────────────────────
  // (ترقيم n بيبدأ من 61 عشان يفضل مكان الاستماع 31–60 محجوز — شوف تعليق الملف.)
  {
    id: "gram",
    title: "Gramática y vocabulario",
    minutes: 40,
    tasks: [
      {
        title: "Tarea 1. Gramática I",
        intro: "Elige la opción que completa correctamente cada frase (a, b o c).",
        questions: [
          mc(61, 1, "Ayer ___ a casa de mis abuelos.", ["he ido", "iba", "fui"]),
          mc(62, 2, "Cuando era pequeño, ___ en un pueblo.", ["viví", "he vivido", "vivía"]),
          mc(63, 3, "Todavía no ___ el correo de hoy.", ["leí", "he leído", "leía"]),
          mc(64, 4, "Mañana ___ a visitarte.", ["iré", "fui", "iba"]),
          mc(65, 5, "¿___ ayudarme con la maleta, por favor?", ["Pudiste", "Podrías", "Podías"]),
          mc(66, 6, "Si tengo tiempo, ___ al cine esta tarde.", ["iría", "fui", "iré"]),
          mc(67, 7, "___ la ventana, por favor, que hace frío.", ["Cierra", "Cierras", "Cerrar"]),
          mc(68, 8, "No ___ tan deprisa, que hay mucho tráfico.", ["conduces", "conduce", "conduzcas"]),
          mc(69, 9, "Mi hermana es más alta ___ yo.", ["como", "de", "que"]),
          mc(70, 10, "¿Has visto a Pedro? No ___ he visto en toda la semana.", ["lo", "le", "la"]),
          mc(71, 11, "A mis padres ___ regalé un viaje por su aniversario.", ["les", "los", "se"]),
          mc(72, 12, "Hace dos años que ___ en esta ciudad.", ["vivía", "vivo", "vivir"]),
          mc(73, 13, "Mis amigos ___ del cine cuando empezó a llover.", ["salieron", "salían", "han salido"]),
        ],
      },
      {
        title: "Tarea 2. Gramática II",
        intro: "Elige la opción que completa correctamente cada frase (a, b o c).",
        questions: [
          mc(74, 14, "Es importante que ___ más agua.", ["bebes", "bebas", "bebiendo"]),
          mc(75, 15, "Cuando ___ a casa, te llamo.", ["llegue", "llego", "llegaré"]),
          mc(76, 16, "Espero que ___ buen tiempo el fin de semana.", ["hace", "hará", "haga"]),
          mc(77, 17, "Me dijo que ___ al día siguiente.", ["vuelve", "volvería", "volverá"]),
          mc(78, 18, "El libro ___ escrito por un autor argentino.", ["ha", "estaba", "fue"]),
          mc(79, 19, "La chica ___ vive al lado es mi prima.", ["que", "quien", "cual"]),
          mc(80, 20, "Llevo tres años ___ español.", ["estudio", "estudiar", "estudiando"]),
          mc(81, 21, "Cuando llegué, el tren ya ___.", ["salió", "sale", "había salido"]),
          mc(82, 22, "Si ___ más tiempo, viajaría más.", ["tuviera", "tengo", "tenía"]),
          mc(83, 23, "___ llovía, salimos a pasear.", ["Porque", "Aunque", "Sino"]),
          mc(84, 24, "Se ___ que mañana habrá huelga.", ["dijo", "dice", "dicen"]),
          mc(85, 25, "Ese es el hotel ___ nos alojamos el año pasado.", ["que", "donde", "cuando"]),
        ],
      },
      {
        title: "Tarea 3. Vocabulario I",
        intro: "Elige la opción que completa correctamente cada frase (a, b o c).",
        questions: [
          mc(86, 26, "Para ir al médico, pido una ___.", ["cuenta", "cita", "cola"]),
          mc(87, 27, "Mi hermano trabaja en un banco: es ___.", ["cliente", "paciente", "empleado"]),
          mc(88, 28, "Me duele la garganta y tengo ___. Voy a tomar un jarabe.", ["tos", "tren", "tienda"]),
          mc(89, 29, "Para viajar en avión necesitas el ___ y el billete.", ["pasillo", "pasaporte", "paraguas"]),
          mc(90, 30, "Mi ordenador no ___ porque no tiene batería.", ["cuesta", "vive", "funciona"]),
          mc(91, 31, "Vamos a ___ una habitación en el hotel para el fin de semana.", ["reservar", "olvidar", "vender"]),
          mc(92, 32, "En verano me gusta ir a la ___ y tomar el sol.", ["cocina", "playa", "oficina"]),
          mc(93, 33, "Mi madre cocina muy bien: prepara unos platos ___.", ["nuevos", "deliciosos", "delgados"]),
          mc(94, 34, "El profesor nos puso muchos ___ para hacer en casa.", ["regalos", "vacaciones", "deberes"]),
          mc(95, 35, "Para pagar con tarjeta tienes que escribir tu ___ secreto.", ["código", "cumpleaños", "bolso"]),
          mc(96, 36, "No puedo ir, estoy muy ___: tengo mucho trabajo.", ["cerca", "ocupado", "barato"]),
          mc(97, 37, "Vivo en un ___ de diez plantas en el centro.", ["paisaje", "camino", "edificio"]),
        ],
      },
      {
        title: "Tarea 4. Vocabulario II",
        intro: "Elige la opción que completa correctamente cada frase (a, b o c).",
        questions: [
          mc(98, 38, "Para conseguir un empleo, tienes que enviar tu ___ y una carta.", ["presupuesto", "horario", "currículum"]),
          mc(99, 39, "Reciclar el vidrio y el papel ayuda a proteger el medio ___.", ["ambiente", "tiempo", "lugar"]),
          mc(100, 40, "Si tienes fiebre, es mejor que te quedes en ___.", ["fiesta", "cama", "viaje"]),
          mc(101, 41, "Ese actor es muy famoso: ha ___ en más de veinte películas.", ["ocupado", "participado", "perdido"]),
          mc(102, 42, "Me han ___ el sueldo este mes: ahora cobro más.", ["bajado", "quitado", "subido"]),
          mc(103, 43, "No estoy de acuerdo contigo, pero ___ tu opinión.", ["respeto", "rompo", "pierdo"]),
          mc(104, 44, "El profesor ___ los ejercicios para saber si lo habíamos entendido.", ["cerró", "corrigió", "pegó"]),
          mc(105, 45, "Los precios han ___ mucho este año por la inflación.", ["aumentado", "disminuido", "desaparecido"]),
          mc(106, 46, "Voy a ___ este paquete a la oficina de correos.", ["enviar", "esperar", "acabar"]),
          mc(107, 47, "Es una persona muy ___: siempre ayuda a los demás sin pedir nada.", ["perezosa", "tacaña", "generosa"]),
          mc(108, 48, "El concierto fue un ___: no cabía ni una persona más en la sala.", ["error", "permiso", "éxito"]),
          mc(109, 49, "Está ___ de que le suban los impuestos.", ["contento", "harto", "agradecido"]),
          mc(110, 50, "Estoy pensando en ___ un máster el año que viene.", ["hacer", "dejar", "tirar"]),
        ],
      },
    ],
  },
];

// ───────────────────────── PARTE 2. COMPRENSIÓN AUDITIVA (n 31–60) — جاهزة بس مش متفعّلة ─────────────────────────
// 🎧 الاستماع (B1): المنشور على الموقع Tarea 1 بس (6 أسئلة: 31–36) — صوت واحد (خانة 1).
//   Tarea 2–5 (الأسئلة 37–60) مش هتتنزل: محفوظة تحت في PLACEMENT_LISTENING_B1_ALL للرجوع بس.
//   الخطوات للتفعيل للطلاب:
//   1) ارفع صوت Tarea 1 من لوحة الأدمن (Placement tests → B1 → Audio 1).
//   2) املا LISTENING في spanishPlacementTestKeyB1.js بـ 6 حروف (الأسئلة 31–36).
//   3) غيّر LISTENING_ENABLED_B1 تحت لـ true.
//   لحد ما LISTENING_ENABLED_B1 تبقى true، الاستماع مش بيظهر للطلاب حتى لو الصوت اترفع
//   (عشان أي سؤال من غير مفتاح بيتحسب غلط).
export const LISTENING_ENABLED_B1 = false;
export const PLACEMENT_LISTENING_B1_ALL = {
  id: "listen",
  title: "Comprensión auditiva",
  minutes: 40,
  tasks: [
    {
      title: "Tarea 1",
      intro: "Escucha seis mensajes breves. Elige la opción correcta (a, b o c).",
      audioSlot: 1,
      questions: [
        mc(31, 1, "¿Qué se anuncia?", ["Un curso de cocina.", "Un restaurante nuevo.", "Un servicio de comida a domicilio."]),
        mc(32, 2, "¿Por qué Jorge no va a la cena?", ["Tiene que recoger a su hermana.", "Está enfermo.", "Trabaja el sábado."]),
        mc(33, 3, "¿Qué cambia en el aviso?", ["La hora del tren.", "El destino del tren.", "El andén de salida."]),
        mc(34, 4, "¿Qué debe hacer una persona que quiere reservar una habitación?", ["Dejar sus datos.", "Llamar después de las seis.", "Escribir un correo."]),
        mc(35, 5, "¿Qué tiempo hará mañana en el sur?", ["Lluvia débil.", "Nubes y frío.", "Sol y calor."]),
        mc(36, 6, "¿Qué se informa en el aviso?", ["La tienda cambia de planta.", "La tienda cierra y hay descuentos.", "Hay nuevas ofertas con devolución."]),
      ],
    },
    {
      title: "Tarea 2",
      intro: "Escucha a Lucas, que cuenta su experiencia en Buenos Aires. Elige la opción correcta (a, b o c).",
      audioSlot: 2,
      questions: [
        mc(37, 7, "Lucas fue a Argentina para...", ["estudiar un máster.", "vivir con su familia.", "trabajar en un periódico con una beca."]),
        mc(38, 8, "Cuando llegó, Lucas...", ["pasó mucho frío.", "tuvo problemas con algunas palabras.", "encontró la ciudad muy tranquila."]),
        mc(39, 9, "Lo que más le sorprendió de las costumbres fue que...", ["la gente cenara muy tarde.", "la gente comiera muy poco.", "la gente se levantara muy pronto."]),
        mc(40, 10, "Lucas se mudó de piso porque...", ["el alquiler era caro.", "no se llevaba bien con sus compañeros.", "el primer piso estaba lejos del trabajo."]),
        mc(41, 11, "En el periódico, lo que más aprendió fue...", ["a escribir sobre deporte.", "a hacer entrevistas en la calle.", "a usar un programa nuevo."]),
        mc(42, 12, "Sobre el futuro, Lucas...", ["prefiere vivir en España.", "quiere cambiar de profesión.", "quiere volver a trabajar en Buenos Aires."]),
      ],
    },
    {
      title: "Tarea 3",
      intro: "Escucha seis noticias de un informativo de radio. Elige la opción correcta (a, b o c).",
      audioSlot: 3,
      questions: [
        mc(43, 13, "¿Qué se ha inaugurado?", ["Un mercado.", "Un parque infantil.", "Un huerto urbano."]),
        mc(44, 14, "¿Qué pasó anoche?", ["España se clasificó para las semifinales.", "España perdió contra Francia.", "Se canceló el partido."]),
        mc(45, 15, "¿Qué podrán hacer los visitantes del museo el domingo?", ["Comprar entradas más baratas.", "Entrar gratis.", "Visitarlo solo con reserva."]),
        mc(46, 16, "¿Qué opinan los usuarios de la subida de los abonos?", ["Están de acuerdo.", "No han opinado.", "Critican la medida."]),
        mc(47, 17, "¿Qué dice el estudio sobre los jóvenes?", ["Duermen más que antes.", "Duermen menos de lo recomendado.", "Duermen mal por el ruido."]),
        mc(48, 18, "¿Qué recomiendan los especialistas para ver las estrellas?", ["Mirar al cielo desde la ciudad.", "Salir al campo.", "Observarlas por la tarde."]),
      ],
    },
    {
      title: "Tarea 4",
      intro:
        "Escucharás a seis personas que hablan de su primer día de trabajo. Relaciona cada persona (19–24) con el enunciado correspondiente (A–H). Hay dos enunciados que no necesitas. Escribe la letra.",
      audioSlot: 4,
      bank: bankOf([
        "Se sintió muy nervioso al empezar.",
        "Sus compañeros le ayudaron mucho.",
        "Llegó tarde por un problema de transporte.",
        "El trabajo no era lo que esperaba.",
        "Se equivocó de edificio.",
        "Tuvo que hacer una presentación.",
        "Perdió su teléfono.",
        "Terminó antes de lo previsto.",
      ]),
      questions: [
        mt(49, 19, "Persona 1", 8),
        mt(50, 20, "Persona 2", 8),
        mt(51, 21, "Persona 3", 8),
        mt(52, 22, "Persona 4", 8),
        mt(53, 23, "Persona 5", 8),
        mt(54, 24, "Persona 6", 8),
      ],
    },
    {
      title: "Tarea 5",
      intro: "Escucha la conversación entre Ana y Tomás. Elige la opción correcta (a, b o c).",
      audioSlot: 5,
      questions: [
        mc(55, 25, "¿Qué oferta de trabajo comentan?", ["Una en una agencia de viajes.", "Una en una empresa de energía solar.", "Una en una panadería."]),
        mc(56, 26, "¿Por qué duda Tomás?", ["No tiene experiencia.", "El sueldo es bajo.", "Tendría que mudarse y dejar su piso y a sus amigos."]),
        mc(57, 27, "¿Qué opina Tomás de su trabajo actual?", ["Le gusta mucho.", "No le gusta su jefe.", "Está cansado del horario."]),
        mc(58, 28, "¿Qué ventaja menciona Ana?", ["Vivir cerca de su familia.", "Tener horarios flexibles.", "Ganar más dinero."]),
        mc(59, 29, "¿Quién es Lucía?", ["Una compañera de trabajo de Tomás.", "Una prima de Ana que vive en Valencia.", "La dueña de una panadería."]),
        mc(60, 30, "¿Qué decide Tomás?", ["Rechazar la oferta.", "Esperar un mes.", "Enviar su currículum esa noche."]),
      ],
    },
  ],
};

// الاستماع المنشور فعلًا = Tarea 1 بس.
export const PLACEMENT_LISTENING_B1 = {
  ...PLACEMENT_LISTENING_B1_ALL,
  tasks: PLACEMENT_LISTENING_B1_ALL.tasks.slice(0, 1),
};

// الأجزاء الفعلية للاختبار: الاستماع بيدخل بين القراءة والقواعد لما يتفعّل (مهمته بتتخفي لوحدها لو مفيش صوت).
export const PLACEMENT_PARTS_B1 = LISTENING_ENABLED_B1
  ? [BASE_PARTS_B1[0], PLACEMENT_LISTENING_B1, BASE_PARTS_B1[1]]
  : BASE_PARTS_B1;
