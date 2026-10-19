// ═══════════════════════════════════════════════
//  app/lib/spanishPlacementTest.js
//  بيانات اختبار تحديد المستوى (إسباني) — Prueba de nivel de español A1 (100 نقطة)
//  المصدر: ملف "Test your level A1" — 3 أجزاء: قراءة (25) + استماع (25) + قواعد ومفردات (50).
//
//  الهيكل: PLACEMENT_PARTS → tasks → questions
//    - question: { n: رقم السؤال العام (1–100)، ln: رقم السؤال داخل الجزء، q: النص،
//                  ctx: نص يخص السؤال (اختياري)، o: الخيارات }
//    - task.bank: لو موجود → سؤال "ربط": الخيارات حروف (A, B, C…) والنصوص في task.bank.
//    - task.passage: نص مشترك لأسئلة المهمة (إعلان المدرسة مثلًا).
//  - كل سؤال بدرجة واحدة. مفيش خيار "No sé" ولا خصم على الخطأ (زي الاختبار الأصلي).
//  - 🔒 مفتاح الإجابات الصحيحة مش هنا (الملف ده بيتحمّل في المتصفح) — هو في
//    app/lib/spanishPlacementTestKey.js والتصحيح بيتم على السيرفر بس.
//  - 🎧 مهام الاستماع ليها audioSlot (1–4). الصوت بيترفع من لوحة الأدمن (تبويب نتائج
//    الاختبار) وبيتخزن على Bunny Storage، ورابطه بيتقري من GET /api/placement-tests/audio.
//    أي مهمة مالهاش صوت مرفوع بتتخفي من الاختبار والدرجة بتتحسب كنسبة مئوية من الأسئلة الظاهرة.
// ═══════════════════════════════════════════════

export const PLACEMENT_TEST_TITLE = "Prueba de nivel de español A1";
export const PLACEMENT_TEST_POINTS = 100;

// 💲 رسوم استلام نتيجة الاختبار — بالدولار الأمريكي (حاليًا 5$). بتتحوّل تلقائيًا
// لعملة لغة الموقع (ar→EGP, en→USD, es→EUR) عن طريق convertPrice في app/lib/currency.js.
// (بتُستخدم فقط لو PLACEMENT_TEST_IS_FREE = false)
export const PLACEMENT_TEST_FEE_USD = 5;

// 🆓 true = مجاني والنتيجة بتظهر لحظيًا أول ما الطالب يخلّص (من غير دفع)،
// false = مدفوع والنتيجة مش بتظهر غير بعد نجاح الدفع. (بتتقرأ في الواجهة والسيرفر.)
export const PLACEMENT_TEST_IS_FREE = true;

export const PLACEMENT_PARTS = [
  {
    "id": "read",
    "title": "Comprensión de lectura",
    "minutes": 45,
    "tasks": [
      {
        "title": "Tarea 1",
        "intro": "Lee los mensajes y carteles. Elige la opción correcta (a, b o c).",
        "questions": [
          {
            "n": 1,
            "ln": 1,
            "q": "Pablo da su...",
            "ctx": "Mensaje: «Hola, Marta. Soy Pablo. Mi número de teléfono es el 654 321 098. Un abrazo.»",
            "o": [
              "dirección.",
              "teléfono.",
              "correo electrónico."
            ]
          },
          {
            "n": 2,
            "ln": 2,
            "q": "La camiseta cuesta...",
            "ctx": "Etiqueta de una tienda: «Camiseta azul. Talla M. 12 €»",
            "o": [
              "12 euros.",
              "2 euros.",
              "20 euros."
            ]
          },
          {
            "n": 3,
            "ln": 3,
            "q": "Hoy Luis...",
            "ctx": "Nota en la nevera: «Ana, hoy tengo clase de español. Llego a casa a las 8. Besos, Luis.»",
            "o": [
              "trabaja en casa.",
              "compra comida.",
              "tiene clase."
            ]
          },
          {
            "n": 4,
            "ln": 4,
            "q": "El domingo en la biblioteca...",
            "ctx": "Cartel de una biblioteca: «Biblioteca municipal. De lunes a viernes: 9:00–20:00. Sábados: 10:00–14:00. Domingos: cerrado.»",
            "o": [
              "puedes ir por la mañana.",
              "puedes ir por la tarde.",
              "no puedes entrar."
            ]
          },
          {
            "n": 5,
            "ln": 5,
            "q": "Eva no va al gimnasio mañana porque...",
            "ctx": "Mensaje: «Hola, Carlos. Mañana no voy al gimnasio porque tengo médico. ¿Vamos el jueves? Un beso, Eva.»",
            "o": [
              "tiene una cita con el médico.",
              "tiene que trabajar.",
              "no le gusta."
            ]
          }
        ]
      },
      {
        "title": "Tarea 2",
        "intro": "Lee los textos (A–I). Relaciona cada enunciado (6–11) con el texto que corresponde. Hay tres textos que no necesitas. Escribe la letra.",
        "bank": [
          {
            "l": "A",
            "t": "«¡Felicidades, Marta! Tu fiesta de cumpleaños es el sábado a las 6 de la tarde en casa de Pablo. Lleva algo de comida.»"
          },
          {
            "l": "B",
            "t": "«Se vende perro de 2 años. Se llama Rex. Es cariñoso y juega con los niños. Teléfono: 622 111 333.»"
          },
          {
            "l": "C",
            "t": "«Prohibido hacer fotos en el museo. Los bolsos y las mochilas se dejan en la entrada. Gracias.»"
          },
          {
            "l": "D",
            "t": "«Para ir a la universidad: línea 3, dirección Norte. Bajas en la parada \"Universidad\". Son diez minutos.»"
          },
          {
            "l": "E",
            "t": "«Menú del día: sopa o ensalada; pollo con patatas o pescado; fruta o helado. Precio: 11 €.»"
          },
          {
            "l": "F",
            "t": "«Piscina municipal. Abierta de junio a septiembre, todos los días, de 10:00 a 20:00. Entrada: 3 €. Menores de 5 años: gratis.»"
          },
          {
            "l": "G",
            "t": "«Lucía Fernández, enfermera. Hospital Reina Sofía. Teléfono: 957 000 111. Correo: lucia@hospital.es»"
          },
          {
            "l": "H",
            "t": "«Alquilo habitación en piso compartido. Tiene cama, armario y escritorio. 250 € al mes. Cerca del metro. Llamar por las tardes.»"
          },
          {
            "l": "I",
            "t": "«Rebajas: camisetas desde 5 €. Tallas S, M y L. También hay pantalones por 15 €. Hasta el domingo.»"
          }
        ],
        "questions": [
          {
            "n": 6,
            "ln": 6,
            "q": "Alguien da su profesión y su teléfono.",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I"
            ]
          },
          {
            "n": 7,
            "ln": 7,
            "q": "Es una invitación a una fiesta de cumpleaños.",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I"
            ]
          },
          {
            "n": 8,
            "ln": 8,
            "q": "Aquí puedes elegir entre sopa o ensalada de primero.",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I"
            ]
          },
          {
            "n": 9,
            "ln": 9,
            "q": "Esta persona vende un animal.",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I"
            ]
          },
          {
            "n": 10,
            "ln": 10,
            "q": "Es un anuncio de ropa con precios rebajados.",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I"
            ]
          },
          {
            "n": 11,
            "ln": 11,
            "q": "Un texto explica cómo llegar a un lugar en transporte público.",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I"
            ]
          }
        ]
      },
      {
        "title": "Tarea 3",
        "intro": "Lee las declaraciones de seis personas (12–17) y los anuncios (A–I). Relaciona cada persona con el anuncio que le interesa. Hay tres anuncios que no necesitas. Escribe la letra.",
        "bank": [
          {
            "l": "A",
            "t": "«Academia Armonía: clases de guitarra y piano para adultos y niños. De lunes a viernes por la tarde. Primera clase gratis. Teléfono 957 222 333.»"
          },
          {
            "l": "B",
            "t": "«Bar Pepe: bocadillos y platos combinados a buen precio. Abierto de 8:00 a 17:00. Menú rápido: 7 €. Calle Mayor, 12.»"
          },
          {
            "l": "C",
            "t": "«Se alquila piso de 90 m². Tres habitaciones, dos baños y terraza grande. Cerca del colegio y del parque. 750 € al mes.»"
          },
          {
            "l": "D",
            "t": "«Excursión a la playa de Málaga. Sábados, salida a las 8:00 de la estación de autobuses. Regreso a las 20:00. Precio: 12 €.»"
          },
          {
            "l": "E",
            "t": "«Farmacia Sol: abierta de lunes a sábado, de 9:00 a 21:00. Medicinas, cremas y productos para el cuidado de la salud.»"
          },
          {
            "l": "F",
            "t": "«Tienda Moda Bonita: bolsos desde 15 €, bufandas desde 8 €. Ideas para regalar. Abierto de 10:00 a 20:30.»"
          },
          {
            "l": "G",
            "t": "«Gimnasio Fuerte: clases de yoga y natación. Matrícula gratis este mes. De lunes a sábado, de 7:00 a 22:00.»"
          },
          {
            "l": "H",
            "t": "«Librería Quijote: libros de cocina, novelas y diccionarios. Descuento del 20 % para estudiantes.»"
          },
          {
            "l": "I",
            "t": "«Cine Rex: sesiones a las 18:00 y a las 21:00. Entrada normal: 7 €. Los miércoles, 4 €.»"
          }
        ],
        "questions": [
          {
            "n": 12,
            "ln": 12,
            "q": "Rosa: «Me gusta mucho la música y quiero aprender a tocar un instrumento.»",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I"
            ]
          },
          {
            "n": 13,
            "ln": 13,
            "q": "Juan: «Trabajo todo el día. Busco un sitio para comer rápido y barato cerca de mi oficina.»",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I"
            ]
          },
          {
            "n": 14,
            "ln": 14,
            "q": "Una familia: «Somos cuatro y buscamos un piso con tres habitaciones y terraza, cerca del colegio de los niños.»",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I"
            ]
          },
          {
            "n": 15,
            "ln": 15,
            "q": "Sofía: «El sábado quiero ir a la playa con mis amigos. Necesitamos un autobús que salga por la mañana.»",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I"
            ]
          },
          {
            "n": 16,
            "ln": 16,
            "q": "Pedro: «Tengo dolor de cabeza y de garganta desde ayer. Necesito comprar medicinas por la tarde.»",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I"
            ]
          },
          {
            "n": 17,
            "ln": 17,
            "q": "Marta: «Mañana es el cumpleaños de mi abuela. Busco un regalo bonito y no muy caro: un bolso o una bufanda.»",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I"
            ]
          }
        ]
      },
      {
        "title": "Tarea 4",
        "intro": "Lee el anuncio de una escuela de idiomas y responde. Elige la opción correcta (a, b o c).",
        "passage": "Escuela «Hola, España» – Cursos de español\nCurso A: lunes y miércoles, de 18:00 a 20:00. Precio: 90 € al mes.\nCurso B: martes y jueves, de 10:00 a 12:00. Precio: 100 € al mes.\nCurso C: sábados, de 10:00 a 14:00. Precio: 70 € al mes.\nMatrícula: 20 €.\nTeléfono: 957 123 456.\nCerrado en agosto.",
        "questions": [
          {
            "n": 18,
            "ln": 18,
            "q": "El curso A es...",
            "o": [
              "lunes y miércoles.",
              "martes y jueves.",
              "sábados."
            ]
          },
          {
            "n": 19,
            "ln": 19,
            "q": "El curso más barato es...",
            "o": [
              "el A.",
              "el B.",
              "el C."
            ]
          },
          {
            "n": 20,
            "ln": 20,
            "q": "¿Qué curso es por la mañana, entre semana?",
            "o": [
              "El A.",
              "El B.",
              "El C."
            ]
          },
          {
            "n": 21,
            "ln": 21,
            "q": "El curso del sábado dura...",
            "o": [
              "dos horas.",
              "cuatro horas.",
              "seis horas."
            ]
          },
          {
            "n": 22,
            "ln": 22,
            "q": "La matrícula cuesta...",
            "o": [
              "20 euros.",
              "70 euros.",
              "90 euros."
            ]
          },
          {
            "n": 23,
            "ln": 23,
            "q": "La escuela está cerrada en...",
            "o": [
              "julio.",
              "diciembre.",
              "agosto."
            ]
          },
          {
            "n": 24,
            "ln": 24,
            "q": "Marta trabaja de lunes a viernes, de 9:00 a 17:00. ¿Qué cursos puede hacer?",
            "o": [
              "El A y el C.",
              "Solo el B.",
              "El B y el C."
            ]
          },
          {
            "n": 25,
            "ln": 25,
            "q": "Para pedir información, llamas al...",
            "o": [
              "957 321 654.",
              "957 123 456.",
              "975 123 456."
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "listen",
    "title": "Comprensión auditiva",
    "minutes": 25,
    "tasks": [
      {
        "title": "Tarea 1",
        "intro": "Escucha cinco mensajes cortos. Elige la opción correcta (a, b o c).",
        "audioSlot": 1, // 🎧 الصوت بيترفع من لوحة الأدمن (Placement Tests → Listening audio) — خانة 1
        "questions": [
          {
            "n": 26,
            "ln": 1,
            "q": "¿Cómo se escribe el nombre del hombre?",
            "o": [
              "Ahmed.",
              "Ahmad.",
              "Hamed."
            ]
          },
          {
            "n": 27,
            "ln": 2,
            "q": "¿Qué hora es?",
            "o": [
              "Las 8:15.",
              "Las 9:15.",
              "Las 9:45."
            ]
          },
          {
            "n": 28,
            "ln": 3,
            "q": "¿Cuánto paga la persona?",
            "o": [
              "3,15 €.",
              "5,30 €.",
              "3,50 €."
            ]
          },
          {
            "n": 29,
            "ln": 4,
            "q": "¿Cuándo es el cumpleaños?",
            "o": [
              "El 2 de octubre.",
              "El 12 de octubre.",
              "El 20 de octubre."
            ]
          },
          {
            "n": 30,
            "ln": 5,
            "q": "¿Qué tiempo hace hoy?",
            "o": [
              "Hace sol.",
              "Hace calor.",
              "Hace frío y llueve."
            ]
          }
        ]
      },
      {
        "title": "Tarea 2",
        "intro": "Vas a escuchar cinco mensajes muy breves. Relaciona cada mensaje (6–10) con una de las opciones (A–H). Hay tres opciones que no necesitas. Escribe la letra.",
        "bank": [
          {
            "l": "A",
            "t": "Unos pantalones azules que cuestan 10 €"
          },
          {
            "l": "B",
            "t": "Un libro abierto en una clase"
          },
          {
            "l": "C",
            "t": "Un grupo de turistas con un guía"
          },
          {
            "l": "D",
            "t": "Un café con leche y un zumo de naranja"
          },
          {
            "l": "E",
            "t": "Una fecha del calendario sin clase: el 15 de octubre"
          },
          {
            "l": "F",
            "t": "Una maleta"
          },
          {
            "l": "G",
            "t": "Un reloj que marca las tres"
          },
          {
            "l": "H",
            "t": "Un perro"
          }
        ],
        "audioSlot": 2, // 🎧 الصوت بيترفع من لوحة الأدمن (Placement Tests → Listening audio) — خانة 2
        "questions": [
          {
            "n": 31,
            "ln": 6,
            "q": "Mensaje 1",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H"
            ]
          },
          {
            "n": 32,
            "ln": 7,
            "q": "Mensaje 2",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H"
            ]
          },
          {
            "n": 33,
            "ln": 8,
            "q": "Mensaje 3",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H"
            ]
          },
          {
            "n": 34,
            "ln": 9,
            "q": "Mensaje 4",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H"
            ]
          },
          {
            "n": 35,
            "ln": 10,
            "q": "Mensaje 5",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H"
            ]
          }
        ]
      },
      {
        "title": "Tarea 3",
        "intro": "Vas a escuchar ocho frases de una misma persona, Carmen, que habla de su casa y de su día. Completa los principios de frase (11–18) con las continuaciones (A–K). Hay tres continuaciones que no necesitas. Escribe la letra. Continuaciones Principios de frase",
        "bank": [
          {
            "l": "A",
            "t": "en autobús"
          },
          {
            "l": "B",
            "t": "profesora de inglés"
          },
          {
            "l": "C",
            "t": "al gimnasio"
          },
          {
            "l": "D",
            "t": "tres baños"
          },
          {
            "l": "E",
            "t": "al lado de un parque grande"
          },
          {
            "l": "F",
            "t": "en coche"
          },
          {
            "l": "G",
            "t": "la música"
          },
          {
            "l": "H",
            "t": "dos habitaciones y un baño"
          },
          {
            "l": "I",
            "t": "a la playa"
          },
          {
            "l": "J",
            "t": "se levanta a las siete"
          },
          {
            "l": "K",
            "t": "en un restaurante cerca de la oficina"
          }
        ],
        "audioSlot": 3, // 🎧 الصوت بيترفع من لوحة الأدمن (Placement Tests → Listening audio) — خانة 3
        "questions": [
          {
            "n": 36,
            "ln": 11,
            "q": "La casa de Carmen está...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K"
            ]
          },
          {
            "n": 37,
            "ln": 12,
            "q": "El piso tiene...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K"
            ]
          },
          {
            "n": 38,
            "ln": 13,
            "q": "Los días de trabajo, Carmen...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K"
            ]
          },
          {
            "n": 39,
            "ln": 14,
            "q": "Carmen va a la oficina...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K"
            ]
          },
          {
            "n": 40,
            "ln": 15,
            "q": "A mediodía, Carmen come...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K"
            ]
          },
          {
            "n": 41,
            "ln": 16,
            "q": "Después del trabajo, Carmen va...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K"
            ]
          },
          {
            "n": 42,
            "ln": 17,
            "q": "La hermana de Carmen es...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K"
            ]
          },
          {
            "n": 43,
            "ln": 18,
            "q": "A Carmen le gusta...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H",
              "I",
              "J",
              "K"
            ]
          }
        ]
      },
      {
        "title": "Tarea 4",
        "intro": "Vas a escuchar una conversación entre Rosa y Miguel. Completa los enunciados (19–25) con las opciones (A–H). Hay una opción que no necesitas. Escribe la letra. Opciones Enunciados",
        "bank": [
          {
            "l": "A",
            "t": "Laura"
          },
          {
            "l": "B",
            "t": "guitarra"
          },
          {
            "l": "C",
            "t": "al mercado"
          },
          {
            "l": "D",
            "t": "las diez de la mañana"
          },
          {
            "l": "E",
            "t": "bocadillos y agua"
          },
          {
            "l": "F",
            "t": "sus amigos"
          },
          {
            "l": "G",
            "t": "cocina para su familia"
          },
          {
            "l": "H",
            "t": "fruta"
          }
        ],
        "audioSlot": 4, // 🎧 الصوت بيترفع من لوحة الأدمن (Placement Tests → Listening audio) — خانة 4
        "questions": [
          {
            "n": 44,
            "ln": 19,
            "q": "El sábado por la mañana, Miguel va...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H"
            ]
          },
          {
            "n": 45,
            "ln": 20,
            "q": "Rosa va a la playa con...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H"
            ]
          },
          {
            "n": 46,
            "ln": 21,
            "q": "Miguel tiene clase de...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H"
            ]
          },
          {
            "n": 47,
            "ln": 22,
            "q": "Salen de casa a las...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H"
            ]
          },
          {
            "n": 48,
            "ln": 23,
            "q": "Van en el coche de...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H"
            ]
          },
          {
            "n": 49,
            "ln": 24,
            "q": "Miguel lleva...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H"
            ]
          },
          {
            "n": 50,
            "ln": 25,
            "q": "El domingo, Rosa...",
            "o": [
              "A",
              "B",
              "C",
              "D",
              "E",
              "F",
              "G",
              "H"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "gram",
    "title": "Gramática y vocabulario",
    "minutes": 30,
    "tasks": [
      {
        "title": "Tarea 1. Gramática I",
        "intro": "",
        "questions": [
          {
            "n": 51,
            "ln": 1,
            "q": "Yo ___ de Italia.",
            "o": [
              "estoy",
              "tengo",
              "soy"
            ]
          },
          {
            "n": 52,
            "ln": 2,
            "q": "¿Cuántos años ___ tú?",
            "o": [
              "tienes",
              "eres",
              "estás"
            ]
          },
          {
            "n": 53,
            "ln": 3,
            "q": "Mira, ___ chicas son mis amigas.",
            "o": [
              "los",
              "las",
              "la"
            ]
          },
          {
            "n": 54,
            "ln": 4,
            "q": "Tengo ___ amigo español.",
            "o": [
              "un",
              "una",
              "el"
            ]
          },
          {
            "n": 55,
            "ln": 5,
            "q": "Mi madre ___ en un banco.",
            "o": [
              "trabajan",
              "trabajo",
              "trabaja"
            ]
          },
          {
            "n": 56,
            "ln": 6,
            "q": "Nosotros ___ español en la universidad.",
            "o": [
              "estudio",
              "estudiamos",
              "estudian"
            ]
          },
          {
            "n": 57,
            "ln": 7,
            "q": "Esta es ___ casa.",
            "o": [
              "nuestro",
              "nuestros",
              "nuestra"
            ]
          },
          {
            "n": 58,
            "ln": 8,
            "q": "A mí ___ gusta el café.",
            "o": [
              "me",
              "yo",
              "mi"
            ]
          },
          {
            "n": 59,
            "ln": 9,
            "q": "A Juan y a Pedro ___ gustan los deportes.",
            "o": [
              "le",
              "los",
              "les"
            ]
          },
          {
            "n": 60,
            "ln": 10,
            "q": "¿___ es tu número de teléfono?",
            "o": [
              "Cuál",
              "Qué",
              "Quién"
            ]
          },
          {
            "n": 61,
            "ln": 11,
            "q": "En mi clase ___ veinte estudiantes.",
            "o": [
              "están",
              "hay",
              "son"
            ]
          },
          {
            "n": 62,
            "ln": 12,
            "q": "¿Cuánto cuestan ___ pantalones?",
            "o": [
              "estas",
              "esto",
              "estos"
            ]
          },
          {
            "n": 63,
            "ln": 13,
            "q": "Mi hermano es alto y mis hermanas son ___.",
            "o": [
              "bajos",
              "bajas",
              "baja"
            ]
          }
        ]
      },
      {
        "title": "Tarea 2. Gramática II",
        "intro": "",
        "questions": [
          {
            "n": 64,
            "ln": 14,
            "q": "Yo ___ a las siete de la mañana.",
            "o": [
              "me levanto",
              "levanto",
              "se levanta"
            ]
          },
          {
            "n": 65,
            "ln": 15,
            "q": "Mi padre ___ la comida los domingos.",
            "o": [
              "hacemos",
              "hace",
              "hago"
            ]
          },
          {
            "n": 66,
            "ln": 16,
            "q": "¿A qué hora ___ tú de casa?",
            "o": [
              "sale",
              "salgo",
              "sales"
            ]
          },
          {
            "n": 67,
            "ln": 17,
            "q": "Este fin de semana ___ a visitar a mis abuelos.",
            "o": [
              "voy",
              "vas",
              "va"
            ]
          },
          {
            "n": 68,
            "ln": 18,
            "q": "No puedo ir contigo: ___ trabajar.",
            "o": [
              "tengo",
              "tengo de",
              "tengo que"
            ]
          },
          {
            "n": 69,
            "ln": 19,
            "q": "¿Dónde ___ el banco?",
            "o": [
              "es",
              "está",
              "hay"
            ]
          },
          {
            "n": 70,
            "ln": 20,
            "q": "Mi casa ___ al lado del parque.",
            "o": [
              "hay",
              "es",
              "está"
            ]
          },
          {
            "n": 71,
            "ln": 21,
            "q": "Esta semana he ___ mucho.",
            "o": [
              "trabajo",
              "trabajado",
              "trabajando"
            ]
          },
          {
            "n": 72,
            "ln": 22,
            "q": "¿Compras el pan? –- Sí, ___ compro ahora.",
            "o": [
              "lo",
              "la",
              "le"
            ]
          },
          {
            "n": 73,
            "ln": 23,
            "q": "Ahora Marta ___ la televisión.",
            "o": [
              "mira",
              "miró",
              "está mirando"
            ]
          },
          {
            "n": 74,
            "ln": 24,
            "q": "Voy a la oficina ___ metro.",
            "o": [
              "a",
              "en",
              "con"
            ]
          },
          {
            "n": 75,
            "ln": 25,
            "q": "¿Por qué estudias español? –- ___ quiero vivir en España.",
            "o": [
              "Porque",
              "Por qué",
              "Porqué"
            ]
          }
        ]
      },
      {
        "title": "Tarea 3. Vocabulario I",
        "intro": "",
        "questions": [
          {
            "n": 76,
            "ln": 26,
            "q": "–- Hola, ¿qué tal? –- ___, gracias.",
            "o": [
              "Mucho gusto",
              "Bien",
              "Adiós"
            ]
          },
          {
            "n": 77,
            "ln": 27,
            "q": "–- Te presento a mi amiga Ana. –- ___.",
            "o": [
              "Encantado",
              "Hasta luego",
              "De nada"
            ]
          },
          {
            "n": 78,
            "ln": 28,
            "q": "El número 45 es ___.",
            "o": [
              "cuatro y cinco",
              "cincuenta y cuatro",
              "cuarenta y cinco"
            ]
          },
          {
            "n": 79,
            "ln": 29,
            "q": "El cielo es de color ___.",
            "o": [
              "azul",
              "verde",
              "rojo"
            ]
          },
          {
            "n": 80,
            "ln": 30,
            "q": "El padre de mi madre es mi ___.",
            "o": [
              "tío",
              "hermano",
              "abuelo"
            ]
          },
          {
            "n": 81,
            "ln": 31,
            "q": "Trabaja en un hospital y cuida a los enfermos: es ___.",
            "o": [
              "camarero",
              "médico",
              "profesor"
            ]
          },
          {
            "n": 82,
            "ln": 32,
            "q": "Marco es de Italia: es ___.",
            "o": [
              "inglés",
              "Italia",
              "italiano"
            ]
          },
          {
            "n": 83,
            "ln": 33,
            "q": "Después del martes viene el ___.",
            "o": [
              "miércoles",
              "lunes",
              "jueves"
            ]
          },
          {
            "n": 84,
            "ln": 34,
            "q": "En clase escribo con un ___.",
            "o": [
              "libro",
              "bolígrafo",
              "armario"
            ]
          },
          {
            "n": 85,
            "ln": 35,
            "q": "En invierno hace frío y llevo un ___.",
            "o": [
              "bañador",
              "sandalia",
              "abrigo"
            ]
          },
          {
            "n": 86,
            "ln": 36,
            "q": "Para desayunar tomo café con ___.",
            "o": [
              "carne",
              "leche",
              "arroz"
            ]
          },
          {
            "n": 87,
            "ln": 37,
            "q": "Mi abuelo tiene 80 años: es una persona ___.",
            "o": [
              "mayor",
              "joven",
              "baja"
            ]
          }
        ]
      },
      {
        "title": "Tarea 4. Vocabulario II",
        "intro": "",
        "questions": [
          {
            "n": 88,
            "ln": 38,
            "q": "Cocino en la ___.",
            "o": [
              "habitación",
              "terraza",
              "cocina"
            ]
          },
          {
            "n": 89,
            "ln": 39,
            "q": "Duermo en mi ___.",
            "o": [
              "baño",
              "dormitorio",
              "salón"
            ]
          },
          {
            "n": 90,
            "ln": 40,
            "q": "Las 7:30 son las siete y ___.",
            "o": [
              "media",
              "cuarto",
              "menos cuarto"
            ]
          },
          {
            "n": 91,
            "ln": 41,
            "q": "En verano hace mucho ___.",
            "o": [
              "frío",
              "calor",
              "viento"
            ]
          },
          {
            "n": 92,
            "ln": 42,
            "q": "Después del invierno viene la ___.",
            "o": [
              "otoño",
              "verano",
              "primavera"
            ]
          },
          {
            "n": 93,
            "ln": 43,
            "q": "Para viajar a otro país en dos horas voy en ___.",
            "o": [
              "metro",
              "avión",
              "bicicleta"
            ]
          },
          {
            "n": 94,
            "ln": 44,
            "q": "Compro medicinas en la ___.",
            "o": [
              "farmacia",
              "panadería",
              "biblioteca"
            ]
          },
          {
            "n": 95,
            "ln": 45,
            "q": "Por la mañana me ___ los dientes.",
            "o": [
              "pongo",
              "hago",
              "lavo"
            ]
          },
          {
            "n": 96,
            "ln": 46,
            "q": "Para llegar al banco, sigue todo ___ y gira a la izquierda.",
            "o": [
              "arriba",
              "derecho",
              "fuera"
            ]
          },
          {
            "n": 97,
            "ln": 47,
            "q": "–- Camarero, ¿me trae la ___, por favor? Quiero pagar.",
            "o": [
              "cuenta",
              "cama",
              "ventana"
            ]
          },
          {
            "n": 98,
            "ln": 48,
            "q": "Me duele la ___: tomo una pastilla.",
            "o": [
              "camisa",
              "calle",
              "cabeza"
            ]
          },
          {
            "n": 99,
            "ln": 49,
            "q": "Los sábados juego al ___ con mis amigos.",
            "o": [
              "fútbol",
              "cine",
              "libro"
            ]
          },
          {
            "n": 100,
            "ln": 50,
            "q": "¿Cuánto ___ estos zapatos?",
            "o": [
              "están",
              "cuestan",
              "son"
            ]
          }
        ]
      }
    ]
  }
];

// ─── Helpers ───
// audio = { [slot]: url } — خريطة روابط الصوت المرفوعة (من /api/placement-tests/audio أو الداتابيز).
// مهام الاستماع من غير صوت مرفوع بتتخفي، ومهام القراءة/القواعد بتظهر دايمًا.
export function getVisibleTasks(part, audio = {}) {
  return part.tasks
    .filter((t) => (t.audioSlot === undefined ? true : Boolean(audio?.[t.audioSlot])))
    .map((t) => (t.audioSlot === undefined ? t : { ...t, audioSrc: audio[t.audioSlot] }));
}

// الأجزاء اللي فيها مهام ظاهرة فعلًا + المهام الظاهرة بس (ومعاها audioSrc لو في صوت)
export function getVisibleParts(audio = {}) {
  return PLACEMENT_PARTS.map((p) => ({ ...p, tasks: getVisibleTasks(p, audio) })).filter((p) => p.tasks.length);
}
