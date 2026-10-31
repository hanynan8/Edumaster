// ═══════════════════════════════════════════════
//  app/lib/placementAudioScripts.js
//  🔒 نصوص التسجيلات (Guiones) لاختبارات A2 و B1 و B2 — للأدمن بس، عشان تسجّلها بنفسك.
//  ممنوع استيراد الملف ده من أي كومبوننت "use client" — النصوص فيها إجابات أسئلة الاستماع.
//  بيتقرا من app/api/admin/placement-tests/audio/route.js وبيرجع للأدمن بس.
//
//  { [testId]: { [slot]: "النص" } } — A2: 12 خانة، كل تسجيل (Audio 1…5، Mensaje 1…5، Carmen، Rosa y Miguel) له نصه
//  المصدر: "Anexo 1. Guiones de la comprensión auditiva" في ملف اختبار A2.
//  (ملف A1 مفيهوش نصوص هنا — الأدمن مش هيشوف خانة Script لاختبار A1. B1 وB2: 5 خانات، النصوص مكتوبة لتطابق أسئلة الملف.)
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

// ───────────────────────── B1 ─────────────────────────
// ⚠️ ملف B1 (cuadernillo del candidato) مفيهوش guiones ولا clave للاستماع، فالنصوص دي اتكتبت بحيث
// تطابق أسئلة الملف وخياراتها بالظبط، ومفتاح الاستماع في spanishPlacementTestKeyB1.js مبني عليها.
// لو عندك guiones رسمية بدّلها هنا وراجع المفتاح. كل تسجيل بيتشغّل مرتين (حسب تعليمات الملف). 5 تسجيلات: كل واحد على Tarea كاملة بصوت منفصل (Tarea 4 = خانة 4 · Tarea 5 = خانة 5).
const B1_SCRIPTS = {
  // Tarea 1 كاملة (أسئلة 31–36) — 6 رسائل ورا بعض
  1: `Audio 1. Seis mensajes breves
(Cada mensaje se reproduce dos veces, con una pausa para leer las preguntas.)

Mensaje 1
Locutora: ¿Cansado de cocinar después del trabajo? Con «Sabor en Casa» ya no tienes que preocuparte. Elige tu menú en nuestra aplicación y te lo llevamos caliente a tu casa en menos de cuarenta minutos. Pide hoy y el envío es gratis.

Mensaje 2
Hola, Marta, soy Jorge. Te llamo por lo de la cena del sábado. Lo siento mucho, pero no voy a poder ir. Mi hermana llega ese día en el tren de las nueve y tengo que ir a recogerla a la estación. Me habría encantado verte. Cuando quieras, hacemos otra cena. Un abrazo.

Mensaje 3
Atención, viajeros del tren con destino a Zaragoza, que saldrá a las 17:20. Por obras en la estación, el tren no saldrá del andén 3, como estaba previsto, sino del andén 6. La hora de salida y el destino no cambian. Disculpen las molestias.

Mensaje 4
Gracias por llamar al Hotel Mirador. En este momento no podemos atenderle. Si desea reservar una habitación, le rogamos que vuelva a llamar después de las seis de la tarde, cuando el servicio de reservas estará abierto. También puede consultar nuestra página web. Gracias.

Mensaje 5
Y ahora el tiempo para mañana. En el norte habrá nubes y bastante frío, y en el centro el cielo estará despejado. En el sur, el día empezará con lluvia débil, que irá cesando por la tarde, y las temperaturas serán suaves. Recuerden llevar paraguas si salen de casa por la mañana.

Mensaje 6
Estimados clientes: después de veinte años en el centro de la ciudad, nuestra tienda cierra definitivamente a finales de mes. Hasta ese día, todos los productos tienen descuentos de hasta el cincuenta por ciento. No se admiten devoluciones de artículos rebajados. Gracias por su confianza durante todos estos años.`,

  // Tarea 2 كاملة (أسئلة 37–42)
  2: `Lucas habla de su experiencia en Buenos Aires

Hola, me llamo Lucas y quiero contaros mi experiencia en Buenos Aires. Hace dos años gané una beca para trabajar seis meses en un periódico argentino. Siempre había querido ser periodista, así que no lo dudé y me fui, aunque todo mi trabajo anterior había sido en España.

Cuando llegué, me pareció una ciudad enorme y muy ruidosa. Aunque allí también se habla español, al principio tuve problemas con algunas palabras. Por ejemplo, la gente decía «che» y «laburo», y al comienzo me costaba entender a mis compañeros. El frío no fue un problema, porque llegué en primavera.

Lo que más me sorprendió de las costumbres fue el horario: allí la gente cena muy tarde, a veces a las once de la noche. Yo, que en España ya ceno tarde, no me lo podía creer. Comer poco no, la verdad es que se come muy bien, y tampoco me parecía que se levantaran más temprano que en mi país.

Los primeros meses viví en un piso compartido con dos chicos muy simpáticos, y nos llevábamos genial. Pero me mudé porque el piso estaba muy lejos del periódico y tardaba más de una hora en llegar cada mañana. Con el nuevo piso gano mucho tiempo. El alquiler era parecido en los dos.

En el periódico aprendí muchísimo. Escribí sobre varios temas, pero lo que más me gustó y más aprendí fue a hacer entrevistas en la calle: hablar con desconocidos y conseguir que te cuenten su historia. El programa de edición no era nuevo para mí, y de deporte escribí muy poco.

Ahora estoy otra vez en España, pero echo mucho de menos Buenos Aires. Mi sueño es volver a trabajar allí cuando pueda. No quiero cambiar de profesión: me encanta el periodismo.`,

  // Tarea 3 كاملة (أسئلة 43–48) — 6 أخبار ورا بعض
  3: `Audio 3. Seis noticias de un informativo de radio

Noticia 1
El barrio de San Roque estrena desde hoy un huerto urbano en un antiguo solar abandonado. Los vecinos podrán cultivar verduras y flores en pequeñas parcelas y organizar talleres para los niños del colegio cercano. El ayuntamiento ha asegurado que el próximo año abrirá otro huerto en el barrio vecino.

Noticia 2
Gran noche de baloncesto: anoche, la selección española venció a Francia por ochenta y cuatro a setenta y nueve y se ha clasificado para las semifinales del campeonato. El partido, muy igualado hasta el último cuarto, se jugó con el pabellón lleno. La semifinal será el viernes por la tarde.

Noticia 3
El Museo de Bellas Artes abrirá sus puertas gratis este domingo con motivo del Día Internacional de los Museos. No será necesario reservar: bastará con llegar y hacer cola. El museo estará abierto de diez de la mañana a ocho de la tarde y habrá visitas guiadas cada hora.

Noticia 4
El transporte público subirá un diez por ciento el precio de los abonos mensuales a partir del próximo mes. La medida ha provocado numerosas quejas: las asociaciones de usuarios han criticado la subida y piden al ayuntamiento que la retire, porque, según dicen, el servicio no ha mejorado. El ayuntamiento defiende que es necesaria.

Noticia 5
Un estudio de la Universidad de Salamanca revela que los jóvenes de entre quince y veinticinco años duermen, de media, seis horas y media al día, es decir, menos de las ocho horas que recomiendan los médicos. Los investigadores señalan que el uso del móvil por la noche es una de las causas principales.

Noticia 6
Esta semana se podrá ver una lluvia de estrellas, una de las más espectaculares del año. Los especialistas recomiendan salir al campo, lejos de las luces de la ciudad, y mirar hacia el cielo después de medianoche, cuando la oscuridad es total. Aconsejan llevar ropa de abrigo y esperar unos veinte minutos hasta que los ojos se acostumbren.`,

  // Tarea 4 كاملة (أسئلة 49–54) — 6 أشخاص
  4: `Audio 4. Primer día de trabajo (seis personas)

Persona 1
Mi primer día de trabajo fue bastante decepcionante. En la entrevista me habían hablado de proyectos creativos, pero esa mañana me pusieron a archivar documentos y a contestar llamadas. La oficina estaba muy bien organizada, pero el trabajo no se parecía en nada a lo que yo había imaginado.

Persona 2
No dormí nada la noche anterior. Me levanté dos horas antes, me cambié de camisa tres veces y, cuando llegué a la oficina, me temblaban las manos. Estaba tan nervioso que se me olvidó hasta el nombre de mi jefa cuando me saludó. Por suerte, después me fui tranquilizando poco a poco.

Persona 3
Salí de casa con mucho tiempo y llegué puntual a la dirección que tenía apuntada. Entré, saludé a la recepcionista y le dije mi nombre, pero no me encontraba en ninguna lista. Entonces me di cuenta: había entrado en el edificio de al lado, que tiene el mismo número en otra calle. Me equivoqué de edificio y tuve que salir corriendo.

Persona 4
Mi primer día de trabajo empezó fatal. Ese lunes había huelga de autobuses y el metro iba lleno, así que pasé casi una hora esperando. Llegué cuarenta minutos tarde y tuve que pedir disculpas a todo el mundo. Menos mal que mi jefe lo entendió, porque la huelga era noticia en toda la ciudad.

Persona 5
Pensaba que el primer día me enseñarían la oficina y poco más, pero nada más llegar mi jefe me dijo que a las doce tenía que presentarme delante de todo el equipo y explicar mi experiencia anterior. Preparé unas diapositivas en un cuarto de hora y, aunque salió bien, no me lo esperaba para nada.

Persona 6
Yo estaba un poco perdida, porque no conocía ni el programa ni los procesos de la empresa. Pero desde el primer momento mis compañeros me ayudaron muchísimo: me enseñaron dónde estaba todo, me explicaron cómo funcionaban las cosas e incluso me invitaron a comer. Me sentí como en casa.`,

  // Tarea 5 كاملة (أسئلة 55–60) — حوار Ana y Tomás
  5: `Audio 5. Ana y Tomás comentan una oferta de trabajo

Ana: Tomás, ¿has visto la oferta que te mandé ayer?
Tomás: Sí, la he leído un par de veces. Es de una empresa de energía solar, ¿verdad?
Ana: Exactamente. Buscan a alguien con tu perfil para el departamento de ventas. No es una agencia de viajes ni nada parecido, es una empresa seria y está creciendo mucho.
Tomás: Ya lo sé, y el sueldo no está mal. Pero tengo mis dudas.
Ana: ¿Por qué? ¿Es por la experiencia? A mí me parece que cumples todos los requisitos.
Tomás: No, no es eso. El problema es que la empresa está en Valencia. Tendría que mudarme, dejar mi piso y a todos mis amigos de aquí. Eso es lo que más me cuesta.
Ana: Te entiendo. Pero piensa en lo que ahora tienes: ¿estás contento en tu trabajo?
Tomás: Mi jefe es muy majo y el trabajo en sí no está mal, pero lo que ya no aguanto es el horario: salgo muy tarde casi todos los días y los fines de semana también tengo turnos. Estoy agotado de ese horario.
Ana: Pues fíjate, en esa empresa tendrías horarios flexibles y podrías trabajar desde casa dos días por semana. Esa es la gran ventaja. Y el sueldo es parecido.
Tomás: Eso suena muy bien. ¿Y tú cómo sabes tanto?
Ana: Porque mi prima Lucía vive en Valencia y trabajó allí hace dos años. Me dijo que el ambiente es estupendo, y además puede ayudarte a encontrar piso.
Tomás: ¿Lucía, la que tiene una panadería?
Ana: No, esa es otra Lucía, mi vecina. Mi prima es ingeniera. Si quieres, te doy su teléfono.
Tomás: Vale, gracias. Creo que voy a enviar mi currículum esta misma noche. Si no lo intento, me voy a arrepentir.
Ana: ¡Qué bien! Ya verás como todo sale bien.`,
};

// ───────────────────────── B2 ─────────────────────────
// ⚠️ ملف B2 (cuadernillo del candidato) فيه مفتاح الاستماع (Solutions 3.2) لكن مفيهوش guiones، فالنصوص دي اتكتبت
// بحيث تطابق أسئلة الملف وخياراتها ومفتاحه بالظبط. لو عندك guiones رسمية بدّلها هنا وراجع المفتاح.
// كل تسجيل بيتشغّل مرتين (حسب تعليمات الملف). 5 تسجيلات: كل واحد على Tarea كاملة بصوت منفصل (Tarea 4 = خانة 4 · Tarea 5 = خانة 5).
const B2_SCRIPTS = {
  // Tarea 1 كاملة (أسئلة 37–42) — 6 محادثات قصيرة ورا بعض
  1: `Audio 1. Seis conversaciones breves
(Cada conversación se reproduce dos veces, con una pausa para leer las preguntas.)

Conversación 1
Mujer: Álvaro, ¿qué te pasa? Tienes mala cara.
Álvaro: Es el informe de ventas. Se me ha estropeado el portátil y tengo que entregarlo mañana a primera hora. La plantilla ya la tengo, pero no tengo dónde rellenarla.
Mujer: Pues mira, yo hoy no voy a usar el mío. Te lo dejo y me lo devuelves mañana.
Álvaro: ¿De verdad? Muchísimas gracias.
Mujer: De nada. Eso sí, el informe lo tendrás que terminar tú, que yo ya tengo bastante trabajo.

Conversación 2
Hombre: Buenos días. Llamo por el piso de la calle Alcalá. Me gustaría verlo lo antes posible, ¿podría ser esta tarde?
Agente: Esta tarde no puede ser, porque la propietaria está fuera. Y mañana por la mañana ya tengo otra visita a esa hora. Si le parece bien, podemos quedar el sábado a las diez.
Hombre: El sábado a las diez me viene bien. Lo apunto.
Agente: Perfecto, nos vemos allí.

Conversación 3
Hombre: Me han ofrecido un viaje a Croacia en agosto, con vuelo y hotel incluidos, a un precio muy bueno. ¿Te animas?
Mujer: Suena genial, pero no puedo decirte que sí ahora mismo. Tengo que mirar cuándo me dan las vacaciones en el trabajo y hablarlo con mi hermana, que quería ir conmigo a otro sitio.
Hombre: Vale, pero la oferta se acaba el viernes.
Mujer: No te preocupes. Dame un par de días y te contesto, ¿de acuerdo?

Conversación 4
Locutora: Compra con tranquilidad en Moda Verde. Dispones de catorce días para devolver tu pedido, y los gastos de envío de la devolución corren a cargo del cliente, salvo que el producto llegue defectuoso. Ahora bien, ten en cuenta que no se admiten devoluciones de ropa interior, de pendientes ni de artículos rebajados en más de un cincuenta por ciento. Revisa bien tu pedido antes de comprar.

Conversación 5
Mujer: ¿Qué tal te ha quedado la reforma de la cocina?
Hombre: Muy bien, la verdad. La empresa fue muy seria y cumplió el presupuesto hasta el último euro. Lo único que lamento es haberla hecho en pleno agosto: con el calor, con los niños en casa todo el día y con el polvo por todas partes, fue una pesadilla. Si la hubiera hecho en septiembre, me habría ahorrado muchos problemas.
Mujer: Ya, el momento es muy importante.

Conversación 6
Mujer: ¿Has leído que quieren prohibir la entrada de los coches antiguos al centro?
Hombre: Sí. A mí no me parece mala idea para reducir la contaminación, aunque no sé si hacerlo de golpe.
Mujer: Yo tampoco digo que sea inútil. Pero ¿cómo va a ir la gente al trabajo? En mi barrio el autobús pasa cada media hora y tarda una hora en llegar al centro.
Hombre: Tienes razón. Antes de prohibir nada, tendrían que mejorar el transporte público, con más líneas y más frecuencia.
Mujer: Eso es: primero las alternativas y después las prohibiciones.`,

  // Tarea 2 كاملة (أسئلة 43–48) — Elena y Mario: el servicio cívico obligatorio
  2: `Audio 2. Elena y Mario hablan del servicio cívico obligatorio

Locutor: Elena y Mario conversan sobre la propuesta de crear un servicio cívico obligatorio de seis meses para todos los jóvenes.

Elena: Mario, ¿has leído lo del servicio cívico obligatorio que propone el Gobierno para los jóvenes de dieciocho años? A mí me parece una buena idea.
Mario: Pues a mí me parece una contradicción en sí misma. La solidaridad es, por definición, voluntaria: si te obligan a ser solidario, deja de serlo.
Elena: Entiendo lo que dices, pero yo no lo veo así. Muchos jóvenes viven en su burbuja y no conocen la realidad de una residencia de mayores, de un comedor social o de un pueblo aislado. Si todos pasaran por ahí unos meses, descubrirían situaciones que hoy desconocen por completo.
Mario: Puede ser, pero para eso ya existen programas de voluntariado. Lo que habría que hacer es dedicar más dinero a esos programas, que siempre andan escasos de fondos, en lugar de inventar uno nuevo.
Elena: Ya, pero esos programas solo llegan a los que ya están concienciados. Y, hablando de dinero, yo creo que quienes participen deberían recibir una pequeña paga, aunque sea simbólica.
Mario: En eso sí te doy la razón: nadie puede trabajar seis meses gratis. Una compensación económica sería lo mínimo.
Elena: Exacto.
Mario: Mi miedo es otro: que las instituciones utilicen a esos jóvenes para cubrir puestos que deberían ocupar profesionales con contrato. Sustituir empleos reales sería injusto.
Elena: Es un riesgo, claro, pero se puede evitar con controles. No creo que sea motivo suficiente para renunciar a la idea entera.
Mario: Bueno, en lo que sí estamos de acuerdo es en que no podemos quedarnos de brazos cruzados: cada vez hay más soledad entre los mayores y más desconexión entre los jóvenes.
Elena: Tienes razón. Hay que hacer algo.`,

  // Tarea 3 كاملة (أسئلة 49–54) — entrevista a Clara Montero
  3: `Audio 3. Entrevista a Clara Montero, bióloga especializada en abejas

Periodista: Hoy hablamos con Clara Montero, bióloga especializada en abejas. Clara, bienvenida.
Clara: Gracias por invitarme.
Periodista: Usted empezó trabajando en un laboratorio. ¿Cómo acabó con colmenas en los tejados de la ciudad?
Clara: Fue casi una casualidad. Yo estudiaba el comportamiento de las abejas en el laboratorio y un compañero me propuso colocar un par de colmenas en la azotea de la facultad para ver cómo se comportaban en un entorno urbano. Lo planteamos como un experimento, sin esperar demasiado. Nadie nos lo había encargado, y yo seguí trabajando en el laboratorio durante años.
Periodista: Y los resultados la sorprendieron.
Clara: Mucho. Las abejas urbanas sobrevivían mejor que las del campo. En el campo, la agricultura intensiva usa muchos pesticidas y los cultivos son casi siempre los mismos, así que las abejas tienen muy poca variedad de alimento. En la ciudad, en cambio, hay menos pesticidas y, entre parques, jardines y balcones, hay flores diferentes casi todo el año. No es una cuestión de temperatura: en verano, el calor de la ciudad es incluso un problema.
Periodista: Entonces, ¿todo son ventajas?
Clara: No, y hay un problema que me preocupa: la competencia por el néctar. Las abejas de las colmenas compiten con las abejas silvestres, que son cientos de especies, y el alimento disponible en la ciudad es limitado. No es un problema de falta de apicultores, de hecho cada año hay más aficionados, ni tampoco de ruido: a las abejas el ruido de la ciudad no les afecta.
Periodista: ¿Qué puede hacer una persona que quiera ayudar a las abejas?
Clara: Lo más útil no es instalar colmenas, sino plantar flores autóctonas en el balcón o en el jardín y no usar insecticidas. Eso ayuda a todas las especies, no solo a las abejas de miel.
Periodista: Mucha gente se asusta al saber que hay colmenas en su edificio.
Clara: Al principio, sí. Pero cuando los vecinos comprenden que las abejas de miel son poco agresivas, porque solo pican si se sienten amenazadas, cambian de opinión. No es por la miel, que apenas da para un tarro, ni porque los niños se lo pidan: es por entender cómo son realmente.
Periodista: Entonces, ¿son las colmenas urbanas la mejor solución para salvar a las abejas?
Clara: No, y esto es importante. Son una herramienta útil, pero si se llena la ciudad de colmenas sin control, el alimento no alcanza para todas y perjudicamos a las abejas silvestres. Hay que poner límites.`,

  // Tarea 4 كاملة (أسئلة 55–60) — 6 personas hablan de su relación con el móvil
  4: `Audio 4. El móvil (seis personas)

Persona 1
Lo que peor llevo es que mi jefe me escribe por WhatsApp a las diez de la noche y hasta en domingo, como si yo no tuviera derecho a desconectar. Mi horario termina a las cinco, pero el móvil sigue sonando. Yo, para mí, lo uso para poco más que para mirar el tiempo.

Persona 2
Antes me leía una novela cada semana. Ahora no soy capaz de seguir más de diez páginas seguidas sin coger el móvil para mirar algo. Me da vergüenza reconocerlo, pero he perdido la capacidad de concentrarme en una lectura larga.

Persona 3
Hace un mes tomé una decisión: a partir de las diez de la noche, el móvil se queda cargando en la cocina y no lo toco hasta la mañana. Duermo mucho mejor y me levanto con otra energía.

Persona 4
Siempre me preguntan cómo puedo vivir sin Instagram ni nada parecido. Pues muy bien: nunca he tenido redes sociales y no las echo de menos. Tengo el móvil para llamadas y poco más.

Persona 5
Vivo en Alemania desde hace seis años y mi familia está en Sevilla. Gracias al móvil hablo con mis padres y con mis hermanos por videollamada casi todos los días. Para mí es una bendición: sin él me sentiría muy lejos de los míos.

Persona 6
Mi hija de doce años me dijo el otro día: «Papá, deja el móvil». Y tenía razón: si yo me paso toda la cena mirando la pantalla, ¿cómo le voy a exigir que ella no lo haga? Los padres tenemos que dar ejemplo, porque los niños hacen lo que ven, no lo que les decimos.`,

  // Tarea 5 كاملة (أسئلة 61–66) — conferencia sobre las dietas de moda
  5: `Audio 5. Conferencia: las dietas de moda

Buenas tardes y gracias por venir. Hoy quiero hablarles de un fenómeno que todos conocemos: las dietas de moda.

Para empezar, una pregunta: ¿por qué tienen tanto éxito? No es porque las recomienden los médicos; de hecho, muchas veces los especialistas las desaconsejan. Tampoco es porque sean más baratas: algunas incluyen productos bastante caros. Tienen éxito, sobre todo, porque prometen soluciones sencillas a problemas complejos. Perder peso o mejorar la salud depende de muchos factores, pero una dieta milagrosa nos dice que basta con eliminar un alimento o beber un batido.

Hablemos precisamente de eliminar alimentos, una de las ideas más repetidas: «quita el gluten», «quita los lácteos». Pues bien: salvo que exista una intolerancia o una alergia diagnosticada, eliminar un grupo de alimentos normalmente no aporta ningún beneficio y puede provocar carencias. No es cierto que siempre mejore la salud.

Las redes sociales han cambiado el panorama. Hoy cualquiera puede ver a un famoso, o a un desconocido, contar qué come y cómo ha cambiado su vida, y miles de personas imitan esas dietas sin pedir asesoramiento a ningún profesional. Lo que circula no es información rigurosa, sino experiencias personales.

Además, los vídeos que se difunden en las redes ocultan una parte importante de la historia: los casos en que la dieta no funciona. Nadie sube un vídeo para decir «lo probé durante un mes y no sirvió de nada» o «recuperé todo el peso en tres meses». Solo vemos los éxitos. Los precios de los productos, en cambio, no se esconden: suelen estar a la vista.

¿Quiere decir esto que debemos rechazar cualquier dieta nueva? No. Probar algo diferente puede ser razonable, siempre que se haga con prudencia y bajo la supervisión de un profesional. Lo que no recomiendo es probarlas todas, ni mucho menos recomendárselas a todo el mundo, porque cada cuerpo es distinto.

Para terminar, les propongo un ejercicio. La próxima vez que vean una dieta milagrosa, antes de preguntarse si funciona, pregúntense algo más: ¿quién gana dinero con ella? Muchas gracias.`,
};

const SCRIPTS = { a2: A2_SCRIPTS, b1: B1_SCRIPTS, b2: B2_SCRIPTS };

// نص التسجيل لخانة معيّنة (أو null لو مفيش)
// testOrId: "a2" أو تعريف اختبار مخصص (النصوص جواه: def.scripts — اللي الأدمن حطها في شيت Audio)
export function getAudioScript(testOrId, slot) {
  if (testOrId && typeof testOrId === "object") return testOrId.scripts?.[slot] || null;
  return SCRIPTS[testOrId]?.[slot] || null;
}
