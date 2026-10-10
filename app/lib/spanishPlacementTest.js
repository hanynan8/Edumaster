// ═══════════════════════════════════════════════
//  app/lib/spanishPlacementTest.js
//  بيانات اختبار تحديد المستوى (إسباني) — Prueba de nivel (90 نقطة)
//  المصدر: فورم "Fdo. Don Muja Yousry".
//
//  كل سؤال: { n: رقم السؤال في الفورم الأصلي, q: النص, o: الخيارات, p: الدرجة (اختياري، الافتراضي 1) }
//  - خيار "No sé" بيتضاف تلقائيًا في الواجهة (مش محتاج يتكتب هنا).
//  - 🔒 مفتاح الإجابات الصحيحة مش هنا (الملف ده بيتحمّل في المتصفح) — هو في
//    app/lib/spanishPlacementTestKey.js والتصحيح بيتم على السيرفر بس.
//  - الأقسام اللي فيها audio لازم تتحط لها audioSrc (رابط الملف الصوتي/الفيديو)،
//    ولو audioSrc فاضي القسم ده بيتخفي من الاختبار لحد ما يتحط الرابط.
// ═══════════════════════════════════════════════

export const PLACEMENT_TEST_TITLE = "Prueba de nivel";
export const PLACEMENT_TEST_POINTS = 90;

// 💲 رسوم استلام نتيجة الاختبار — بالدولار الأمريكي (حاليًا 5$). بتتحوّل تلقائيًا
// لعملة لغة الموقع (ar→EGP, en→USD, es→EUR) عن طريق convertPrice في app/lib/currency.js
// (نفس منطق رسوم الاستشارة). غيّر الرقم هنا بس لتغيير السعر في الواجهة والسيرفر.
export const PLACEMENT_TEST_FEE_USD = 5;

// 🆓 نوع الاختبار: true = مجاني والنتيجة بتظهر لحظيًا أول ما الطالب يخلّص (من غير دفع)،
// false = مدفوع والنتيجة مش بتظهر غير بعد نجاح الدفع. الاختبار الإسباني الحالي مجاني.
// (بتتقرأ في الواجهة والسيرفر — غيّرها هنا بس.)
export const PLACEMENT_TEST_IS_FREE = true;

export const PLACEMENT_STAGES = [
  {
    id: "A1",
    blocks: [
      {
        questions: [
          { n: 3, q: "Mi padre.............. Bigote..", o: ["llevan", "llevo", "lleva"] },
          { n: 4, q: "Voy al trabajo.... coche.", o: ["en", "a", "de"] },
          { n: 5, q: ".....................es mi mamá.", o: ["este", "esto", "esta"] },
          { n: 6, q: "Voy al trabajo.... coche.", o: ["en", "de", "a"] },
          { n: 7, q: "Yo........(Levantarse) cada día temprano", o: ["me levanta", "te levantas", "me levanto", "me levantó"] },
          { n: 8, q: "¡Hola!, ¿qué tal?", o: ["hola, hasta luego", "hola, soy Mauro", "¡Hola! Estoy bien ¿y tú?"] },
          { n: 9, q: "italiano.... alemán.... belga — El femenino de estas palabras es:", o: ["italiana....alemana..... belgo", "italiana.... alemana..... belga", "italiana..... alemán.... belga"] },
          { n: 10, q: ".Mi amigo y yo.................. aprender español", o: ["quiero", "queremos", "queréis"] },
          { n: 11, q: "los nombres terminados en ´´e´´ son normalmente", o: ["masculino", "femenino", "masculino o femenino"] },
          { n: 12, q: "El clima en la isla .......... caluroso.", o: ["es", "está", "tiene"] },
          { n: 13, q: "Egipto....... un país afrecano.", o: ["es", "está", "tiene"] },
          { n: 14, q: "¿Qué coche usamos : el coche nuevo o el coche viejo? el coche nuevo=.......... el coche viejo =............", o: ["el nuevo, el viejo", "la vieja , el nuevo", "la nueva, la vieja"] },
          { n: 15, q: "Hoy es lunes y mañana ___ martes.", o: ["está", "es", "hay"] },
          { n: 16, q: "Los perros son ___.", o: ["pequeño", "pequeñas", "pequeños"] },
          { n: 18, q: "Él..........(querer) comer manzana.", o: ["quiera", "quiere", "quiero"] },
          { n: 19, q: "Yo......... (conocer) a tu hermano.", o: ["conozo", "conozco", "conoces"] },
          { n: 20, q: "Normalmente ........al trabajo en autobús.", o: ["ir", "estoy iendo", "voy", "fui", "he ido"] },
          { n: 21, q: "Yo tengo un coche. ___ coche es rojo.", o: ["Mi", "Mío", "Su"] },
        ],
      },
      {
        audioSrc: "", // TODO: رابط الصوت/الفيديو (الفصول)
        title: "Ve al video y responde a las preguntas",
        questions: [
          { n: 22, q: "Según el audio, cada estación del año...", o: ["dura más de tres meses.", "dura tres meses.", "dura casi tres meses."] },
          { n: 23, q: "Según la audición, en primavera, las temperaturas...", o: ["son más altas que el resto del año.", "son muy bajas.", "empiezan a subir."] },
          { n: 24, q: "Según el audio, en verano...", o: ["nieva.", "hace calor.", "llueve mucho."] },
          { n: 25, q: "Según la audición, los árboles pierden sus hojas...", o: ["en primavera.", "en verano.", "en otoño."] },
          { n: 26, q: "Según el audio, el invierno es...", o: ["la estación más fría del año.", "la época más lluviosa del año.", "la estación más calurosa del año."] },
        ],
      },
    ],
  },
  {
    id: "A2",
    blocks: [
      {
        questions: [
          { n: 28, q: ".....................español el año pasado.", o: ["estudié", "he estudiado", "estudio"] },
          { n: 29, q: ".........................al cine esta semana.", o: ["fui", "estaré", "he ido"], p: 5 },
          { n: 30, q: ".........................tres meses en el mar sin pisar la tierra, fue una experiencia increíble.", o: ["estamos", "estuvimos", "estaremos"] },
          { n: 31, q: ".En 1977.......... un viaje a África de tres meses.", o: ["hago", "hice", "hecho"] },
          { n: 32, q: ".Yo creo que ........ si comemos en restaurante hoy", o: ["va bien", "van bien", "venir bien"] },
          { n: 33, q: ".................................es no preocparse de entender todo.", o: ["el mejor es", "la mejor es", "Lo mejor es"] },
          { n: 34, q: "¿Por qué .......... nervioso estos días?", o: ["eres", "estás", "ser", "te pones"] },
          { n: 35, q: "¿Qué tal la fiesta de Cumpleaños? Yo................ fenominal, pero Marta se aburrió.", o: ["me lo pasé", "es buena", "me cayeron"] },
          { n: 36, q: "¡Qué bueno....... este queso! Ahora lo estoy comiendo.", o: ["está", "es", "esta", "eres"] },
          { n: 37, q: "Los quesos extremeños....... muy buenos.", o: ["están", "son", "estar", "ser"] },
          { n: 38, q: "Luego añades los huevos. ........... bates bien y....... echas .en la sartén.", o: ["los  /  los", "las  /  las", "los  /  lo", "la  /  los"] },
          { n: 39, q: "¿Dónde están los plátanos? _ .........He guardado en el frigorífico.", o: ["lo", "la", "los", "las"] },
          { n: 40, q: "¿Hola, mamá, ¿Cómo puedo preparar una ensalada? _ Bueno, hijo, primero: los tomates.............. luego, .............. en trozos pequeños.", o: ["los tomates cortan / pelan", "los tomates se cortan / se pelan", "los tomates están cortando / están pelando"] },
          { n: 41, q: ".Esta mañana he........... la puerta", o: ["abrido", "abierto", "abrir"] },
          { n: 42, q: "¿Qué estás ......................  ahora?", o: ["hace", "haciendo", "hecho", "harás"] },
          { n: 43, q: "Me prestas 5 euros.", o: ["pensamos devolverla", "no pensamos devolverla"] },
          { n: 44, q: "Ahora mi madre está........... un cordero asado.", o: ["hecho", "haciendo", "hacer", "hace"] },
          { n: 45, q: "Hace........... que vivo con mi novia.", o: ["1999", "4 años", "viernes"] },
          { n: 46, q: "Yo estudio español......... 1999.", o: ["desde", "hace", "nada"] },
        ],
      },
      {
        audioSrc: "", // TODO: رابط الصوت (الشقة)
        title: "Ve al audio y responde a las preguntas",
        questions: [
          { n: 47, q: "Según la audición, el apartamento de Marta y Alejandro...", o: ["es mediano.", "es enorme.", "no es grande."] },
          { n: 48, q: "Según el audio, este apartamento...", o: ["está en la cuarta planta.", "está en la primera planta.", "está en la segunda planta."] },
          { n: 49, q: "En el audio se dice que en el apartamento...", o: ["hay una cocina grande.", "hay un dormitorio.", "hay dos baños"] },
          { n: 50, q: "Según el audio, Marta y Alejandro viven en este apartamento...", o: ["desde el año 1999.", "desde el año 2019.", "desde el año 2009."] },
          { n: 51, q: "En el audio se dice que Marta y Alejandro...", o: ["van en coche al trabajo.", "trabajan en casa.", "pueden ir andando al trabajo."] },
        ],
      },
    ],
  },
  {
    id: "B1",
    blocks: [
      {
        questions: [
          { n: 53, q: "Tengo un amigo que.......... español bien.", o: ["habla", "hable", "hablar"] },
          { n: 54, q: "Busco a una persona que......... español.", o: ["habla", "hable", "hablar"] },
          { n: 55, q: "Es evidente que Juan............ a casa hoy.", o: ["viene", "venga", "viniera", "venir"] },
          { n: 56, q: "No supongo que Juan........ a casa hoy.", o: ["viene", "venga", "viniera", "venir"] },
          { n: 57, q: "He visto a un niño que vuela por el cielo hoy. — ..................................................", o: ["creo que", "creo", "no creo", "no me lo creo"] },
          { n: 58, q: "Ojalá............ un trabajo que me guste.", o: ["encuentro", "encuentre", "cncuentra", "encontraría"] },
          { n: 59, q: "El jefe te dice que lo.......... ahora mismo.", o: ["llamas", "llames"] },
          { n: 60, q: "El jefe dice que tú lo............. cada día por la mañana, y está harto de ti.", o: ["llamas", "llames"] },
          { n: 61, q: "¿Qué expresión significa “estar muy contento”?", o: ["Estar por los suelos", "Estar en el quinto pino", "Estar como unas castañuelas", "Estar hasta el cuello"] },
          { n: 62, q: "¿Cuál de estas frases expresa mejor una acción pasada con juicio actual?", o: ["Me molesta que rompiera el vaso.", "Me molesta que rompió el vaso.", "Me molesta que haya roto el vaso.", "Me molesta que rompe el vaso."] },
          { n: 63, q: "Lola: «Estoy haciendo un máster». Ayer me encontré con Lola y me dijo que............... un máster.", o: ["está haciendo", "estaba haciendo", "había estado haciendo"] },
          { n: 64, q: "Cuando llegué a casa, Raúl.................... a la escuela, y no lo vi.", o: ["se fue", "se había ido", "ha ido"] },
        ],
      },
      {
        audioSrc: "", // TODO: رابط الصوت (التجارة الصغيرة)
        title: "Ve al video y responde a las preguntas",
        questions: [
          { n: 65, q: "Una de las características del pequeño comercio, según el audio, es que...", o: ["los precios suelen ser más reducidos que en los grandes comercios.", "el trato al cliente es más cercano que en otros establecimientos.", "ofrece una mayor variedad de productos."] },
          { n: 66, q: "Según el audio, el pequeño comercio...", o: ["no suele vender productos artesanales.", "es una fuente de empleo.", "está desapareciendo progresivamente."] },
          { n: 67, q: "Según la audición, hace años que el pequeño comercio...", o: ["afronta algunas dificultades.", "no recibe los apoyos necesarios para garantizar su permanencia.", "apenas tiene presencia en ciertos barrios."] },
          { n: 68, q: "Según el audio, los cambios en los hábitos de los consumidores...", o: ["apenas se notan en el pequeño comercio.", "hacen que estos negocios sean cada vez más apreciados.", "afectan a este tipo de negocios."] },
          { n: 69, q: "Las redes sociales, según la audición, son...", o: ["usadas por el pequeño comercio con el fin de llegar a más clientes.", "imprescindibles para que los pequeños negocios se den a conocer.", "poco útiles para los pequeños negocios."] },
        ],
      },
    ],
  },
  {
    id: "C1",
    blocks: [
      {
        questions: [
          { n: 71, q: "Sería mejor que ................... las cosas como Dios manda.", o: ["hicieras", "hagas", "haces", "harías"] },
          { n: 72, q: "Hay muchísima comida =  .........", o: ["Es una de comida", "Es muy comida", "Que comida más deliciosa"] },
          { n: 73, q: "Mi abuelo nació y vivió en Jordania, no estoy seguro pero,.................. con Emilia en 1998 y, ......................... su primera hija 1999.", o: ["se casaría  /  habría casado", "se casó  /  ha nacido", "se casaría  /  nacería"] },
          { n: 74, q: "En un restaurante, el camarero diría a unas personas: ............................... .", o: ["¿Habían reservado una mesa, señores?", "¿Están reservado una mesa, señores?", "¿Reservarán una mesa, señores?"] },
          { n: 75, q: "No es lógico que........... de la universidad a las 10 de la mañana.", o: ["salgan", "salen", "salie"] },
          { n: 76, q: "Quería que................ las tareas.", o: ["hagas", "haces", "hicieras", "hubieras hecho"] },
          { n: 77, q: "Si hubiera hecho el deber, nunca .................... con el profesor.", o: ["he discutido", "había discutido", "habría discutido"] },
          { n: 78, q: "¿Cuál de las siguientes frases es correcta?", o: ["Cada uno vino con su sendos libros.", "Vinieron con sendos libro", "Los niños trajeron sendos regalos", "Vinieron con sendas cada cosa."] },
          { n: 79, q: "Tenía más tiempo de niño, creo que........................ más habilidades.", o: ["habré desarrollado", "había desarrollado", "habría desarrollado", "he desarrollado"] },
          { n: 80, q: "La semana que viene, estoy seguro de que......................... a España.", o: ["viajé", "habré viajado", "estoy viajando"] },
          { n: 81, q: "¿Cuál de estas expresiones es más adecuada en un contexto académico formal?", o: ["En plan que no me mola nada.", "O sea, que está todo mal.", "Es decir, los datos son contradictorios.", "Tío, esto no tiene sentido."] },
          { n: 82, q: "¿Cuál es el sinónimo más preciso de la palabra “inconmensurable”?", o: ["Pequeño", "Incalculable", "Preciso", "Temporal"] },
          { n: 83, q: "¿Cuál es el uso más adecuado del verbo \"adolecer\" en este contexto?", o: ["A pesar de su éxito, su discurso adolece de cierta falta de profundidad.", "Su discurso se beneficia de una gran profundidad.", "Su discurso está lleno de profundidad.", "Su discurso carece de profundidad.", "Su discurso es profundo pero difícil de entender."] },
          { n: 84, q: "¿Cuál es el matiz correcto del verbo “reparar” en esta frase? — «No reparó en el detalle del contrato.»", o: ["Lo corrigió.", "Lo notó enseguida.", "No se dio cuenta.", "Lo firmó sin leerlo."] },
          { n: 85, q: "¿Qué opción usa correctamente una construcción con “por más que”?", o: ["Por más que estudia, no aprobará.", "Por más que estudia, y no aprueba.", "Por más estudia que, no aprueba.", "Por más de estudiar, no aprueba."] },
          { n: 86, q: "¿Cuál es el sinónimo más próximo a “prolijo”?", o: ["Caótico", "Breve", "Minucioso", "Ligero"] },
        ],
      },
      {
        audioSrc: "", // TODO: رابط الصوت (التأمل/الإجهاد)
        title: "Ve el video y responde a las preguntas",
        questions: [
          { n: 87, q: "Según la audición, la meditación..", o: ["nos hace sentir más descansados.", "nos ayuda a concentrarnos.", "debe realizarse varias veces al día para que sea efectiva."] },
          { n: 88, q: "En el audio se dice que hacer ejercicio físico..", o: ["es beneficioso a todas las edades.", "reduce la tensión corporal.", "no es adecuado para todo el mundo."] },
          { n: 89, q: "Según el audio, una forma de reducir el estrés es...", o: ["ser más irresponsable.", "no sobrecargarse de responsabilidades.", "reducir el número de responsabilidades al mínimo posible"] },
          { n: 90, q: "En la audición se dice que nos agotaremos menos si...", o: ["trabajamos mano a mano con las personas de nuestro entorno.", "otras personas hacen algunas tareas por nosotros.", "alguien nos ayuda en las tareas más arduas."] },
          { n: 91, q: "Según el audio, los objetivos que nos proponemos...", o: ["no deben ser demasiados.", "deben ser realistas.", "a menudo son inalcanzables."] },
        ],
      },
    ],
  },
];

// ─── Helper: كل الأقسام اللي هتظهر فعليًا (اللي فيها audio من غير رابط بتتخفي) ───
export function getVisibleBlocks(stage) {
  return stage.blocks.filter((b) => (b.title ? Boolean(b.audioSrc) : true));
}