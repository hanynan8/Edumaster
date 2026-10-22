// ═══════════════════════════════════════════════
//  app/lib/placementAudioScripts.js
//  🔒 نصوص التسجيلات (Guiones) لاختبار A2 — للأدمن بس، عشان تسجّلها بنفسك.
//  ممنوع استيراد الملف ده من أي كومبوننت "use client" — النصوص فيها إجابات أسئلة الاستماع.
//  بيتقرا من app/api/admin/placement-tests/audio/route.js وبيرجع للأدمن بس.
//
//  { [testId]: { [slot]: "النص" } } — A2: 12 خانة، كل تسجيل (Audio 1…5، Mensaje 1…5، Carmen، Rosa y Miguel) له نصه
//  المصدر: "Anexo 1. Guiones de la comprensión auditiva" في ملف اختبار A2.
//  (ملف A1 مفيهوش نصوص هنا — الأدمن مش هيشوف خانة Script لاختبار A1.)
// ═══════════════════════════════════════════════

const A2_SCRIPTS = {
  // Tarea 1 — تسجيل منفصل رقم 1 (سؤال الاستماع 1)
  1: `Audio 1. Cambiar una cita médica
Mujer: Buenos días. Llamo porque tengo una consulta con la doctora Martín mañana a las diez, pero me han cambiado el horario de trabajo. ¿Sería posible venir por la tarde?
Recepcionista: Déjeme comprobarlo. Sí, tenemos una hora libre a las cuatro y media.
Mujer: Perfecto, entonces me viene mucho mejor. Muchas gracias.`,

  // Tarea 1 — تسجيل منفصل رقم 2 (سؤال الاستماع 2)
  2: `Audio 2. El autobús
Hombre: Disculpe, ¿el autobús para Sevilla sale a las ocho?
Empleada: Antes salía a esa hora, pero desde esta semana el horario ha cambiado.
Hombre: ¿Y a qué hora sale ahora?
Empleada: A las ocho y cuarto. Le recomiendo llegar diez minutos antes porque suele haber bastante gente.
Hombre: De acuerdo, gracias por avisarme.`,

  // Tarea 1 — تسجيل منفصل رقم 3 (سؤال الاستماع 3)
  3: `Audio 3. Una oferta en una tienda
Dependienta: Esta chaqueta cuesta treinta euros, pero hoy tenemos un descuento del veinte por ciento.
Cliente: ¿Y cuánto tendría que pagar entonces?
Dependienta: Veinticuatro euros. Además, si compra dos prendas, puede participar en nuestra promoción de otoño.
Cliente: Gracias. De momento me llevaré solo la chaqueta.`,

  // Tarea 1 — تسجيل منفصل رقم 4 (سؤال الاستماع 4)
  4: `Audio 4. Una reunión
Mujer: ¿Seguimos con la reunión del miércoles por la tarde?
Hombre: No, al final tenemos que cambiarla. El profesor no puede venir ese día y el jueves la sala está ocupada.
Mujer: Entonces, ¿la hacemos el viernes?
Hombre: Sí, el viernes a las cinco. Ya he enviado un mensaje al resto del grupo.
Mujer: Perfecto, lo apunto.`,

  // Tarea 1 — تسجيل منفصل رقم 5 (سؤال الاستماع 5)
  5: `Audio 5. Un problema en casa
Hombre: Hola, Laura. ¿Estás en casa? Tengo un problema.
Mujer: ¿Qué ha pasado?
Hombre: He vuelto del trabajo y no encuentro las llaves. He mirado en la mochila y en los bolsillos, pero no están.
Mujer: ¿Has llamado a la oficina de objetos perdidos?
Hombre: Todavía no. Voy a llamar ahora, porque quizá se me cayeron en el autobús.
Mujer: Vale. Si no aparecen, puedes venir a casa y esperar aquí.`,

  // Tarea 2 — Mensaje 1 (سؤال الاستماع 6) تسجيل منفصل
  6: `Mensaje 1
Hola, buenas tardes. Llamo para preguntar por las clases de español. Soy brasileño y llevo tres meses estudiando por mi cuenta, pero ahora quiero practicar conversación en un grupo pequeño. ¿Podrían decirme qué horarios tienen por la tarde y cuánto cuesta el curso? Mi número es 612 345 789. Muchas gracias.`,

  // Tarea 2 — Mensaje 2 (سؤال الاستماع 7) تسجيل منفصل
  7: `Mensaje 2
Atención, viajeros. El tren con destino a Córdoba, previsto para las 18:10, saldrá finalmente a las 18:50 debido a una incidencia técnica. Sentimos las molestias. Los pasajeros que necesiten más información pueden dirigirse al mostrador de atención al cliente situado junto a la entrada principal.`,

  // Tarea 2 — Mensaje 3 (سؤال الاستماع 8) تسجيل منفصل
  8: `Mensaje 3
Hola, Marta. ¿Qué te parece si el sábado hacemos una ruta por la sierra? He encontrado un camino bastante fácil, de unas tres horas, con unas vistas preciosas. Podemos llevar bocadillos y comer allí. Si te apetece venir, avísame antes del viernes para organizar el transporte.`,

  // Tarea 2 — Mensaje 4 (سؤال الاستماع 9) تسجيل منفصل
  9: `Mensaje 4
Buenas noches. Quería reservar una mesa para dos personas para este sábado, sobre las nueve y media. Preferimos sentarnos en la terraza si hace buen tiempo. ¿Podrían confirmarme si tienen sitio? Mi nombre es Andrés López y mi teléfono es el 600 234 567. Gracias.`,

  // Tarea 2 — Mensaje 5 (سؤال الاستماع 10) تسجيل منفصل
  10: `Mensaje 5
Hola, soy Elena. Te llamo por los zapatos que compré ayer en vuestra tienda. Cuando llegué a casa, vi que me quedan pequeños y no encuentro la caja original. Tengo el recibo y los zapatos están sin usar. ¿Podría cambiarlos por un número más grande esta tarde?`,

  // Tarea 3 — Carmen (monólogo) — تسجيل واحد
  11: `Audio: Carmen habla de su nueva vida

Hola, me llamo Carmen y hace seis meses me mudé de un pueblo pequeño a una ciudad más grande. La verdad es que al principio estaba un poco nerviosa, porque no conocía a nadie, pero quería encontrar un trabajo con mejores oportunidades. En mi pueblo había pocas ofertas y llevaba varios meses buscando sin éxito.

Ahora comparto un piso con dos chicas que trabajan en una tienda y en una oficina. Nos llevamos bastante bien y normalmente organizamos las tareas de casa entre las tres. Mi habitación no es muy grande, pero estoy contenta porque el piso está a diez minutos andando de mi trabajo. Para mí era importante vivir cerca, ya que no quería perder mucho tiempo en el transporte.

Trabajo en una empresa de servicios y estoy aprendiendo muchas cosas nuevas. Cuando tengo que ir a la oficina, suelo tomar el autobús y después camino unos cinco minutos. En total, tardo alrededor de veinte minutos en llegar, así que no puedo quejarme. Antes, en mi pueblo, tenía que usar el coche para casi todo.

Desde que llegué, también he conocido a gente de diferentes países. Algunas compañeras me han invitado a salir y, de vez en cuando, cenamos juntas. Además, he empezado a cocinar platos españoles. Antes preparaba siempre las mismas comidas, pero ahora sé hacer tortilla de patatas, gazpacho y algunas recetas que me han enseñado mis compañeras de piso.

Los sábados por la mañana voy a una academia de idiomas. Quiero mejorar mi inglés porque en mi trabajo hay clientes extranjeros. Después de las clases, a veces voy a tomar un café con otros estudiantes. Aunque echo de menos a mi familia, estoy contenta con mi decisión. Creo que esta experiencia me está ayudando a ser más independiente.`,

  // Tarea 4 — Rosa y Miguel (diálogo) — تسجيل واحد
  12: `Audio: Rosa y Miguel preparan una escapada

Rosa: Miguel, ¿has pensado cuándo podemos salir para nuestro viaje a Granada?
Miguel: Sí. He mirado los horarios y creo que lo mejor es salir el viernes por la tarde. Así no tenemos que pedir permiso en el trabajo y aprovechamos todo el fin de semana.
Rosa: Me parece bien. ¿Vamos en coche o en tren?
Miguel: Yo prefiero el tren. He comparado los precios y, si compramos los billetes hoy, nos sale bastante más barato que ir en coche. Además, no tendremos que buscar aparcamiento.
Rosa: De acuerdo. ¿Y dónde dormimos? He visto un hotel que parece muy bonito, pero cuesta bastante.
Miguel: Podemos buscar una pensión en el centro. Hay varias que tienen buenas opiniones y están cerca de los lugares que queremos visitar. ¿Te parece si reservamos por Internet esta noche?
Rosa: Sí, así podemos comparar los precios con tranquilidad. Me gustaría visitar el museo de la ciudad y pasear por el casco antiguo. También quiero probar algún plato típico.
Miguel: Perfecto. Entonces llevamos calzado cómodo, porque seguramente caminaremos bastante. ¿Qué más necesitamos?
Rosa: Yo llevaré una mochila pequeña con una botella de agua, una chaqueta y algo para comer durante el viaje. No hace falta llevar demasiadas cosas para dos noches.
Miguel: Tienes razón. ¿Quedamos en la estación a las ocho y media? Nuestro tren sale a las nueve menos cuarto.
Rosa: Sí, mejor llegar con tiempo. Y para volver, he visto un tren el domingo a las cuatro de la tarde.
Miguel: Genial. Así podemos comer tranquilamente antes de regresar.
Rosa: Entonces, esta noche compramos los billetes y reservamos el alojamiento.
Miguel: ¡Hecho! Seguro que lo pasamos muy bien.`,
};

const SCRIPTS = { a2: A2_SCRIPTS };

// نص التسجيل لخانة معيّنة (أو null لو مفيش)
export function getAudioScript(testId, slot) {
  return SCRIPTS[testId]?.[slot] || null;
}
