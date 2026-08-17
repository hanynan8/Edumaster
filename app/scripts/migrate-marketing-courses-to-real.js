// app/scripts/migrate-marketing-courses-to-real.js
//
// بيحوّل الـ 7 كورسات "التسويقية" القديمة (اللي كانت متخزنة كمستند config
// واحد في كولكشن "courses" المتشال دلوقتي — نفس البيانات اللي كانت متبنية
// جوه app/scripts/seed-courses.js) لـ 7 كورسات حقيقية فعلية في
// "courses_landing" (نفس الموديل بالظبط اللي أي كورس مدرس بيتعمل بيه —
// شوف app/lib/models/Course.js)، بمحتوى ar/en/es كامل من غير ما نفقد أي
// نص كان موجود في النسخة التسويقية.
//
// - بيدوّر على Category موجودة (بالـ slug) لكل تصنيف، ولو مش موجودة بيعملها
//   (بلغات ar/en/es).
// - كل كورس بيتحط باسم "مدرس" واحد — افتراضيًا أول Admin موجود في قاعدة
//   البيانات (لأن الكورسات دي أصلاً كانت محتوى إداري مش لمدرس معيّن)، أو
//   تقدر تحدد مدرس بعينه بـ TEACHER_ID.
// - كل كورس بيتحط status="published" على طول (زي ما كانت الكورسات
//   التسويقية ظاهرة للكل من غير أي خطوة نشر إضافية).
// - آمن يتشغّل أكتر من مرة: بيتحقق بالـ slug الأول، ولو الكورس موجود
//   بالفعل (من تشغيلة سابقة) بيتخطاه (skip) بدل ما يعمل نسخة مكررة.
//
// طريقة التشغيل (PowerShell، من جذر المشروع):
//   $env:MONGO_URI="mongodb+srv://..."
//   node app/scripts/migrate-marketing-courses-to-real.js
//
// لو عايز تحدد مدرس بعينه بدل ما السكريبت يختار أول أدمن تلقائيًا:
//   $env:MONGO_URI="mongodb+srv://..."
//   $env:TEACHER_ID="<user-id-هنا>"
//   node app/scripts/migrate-marketing-courses-to-real.js

const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI;
const TEACHER_ID_OVERRIDE = process.env.TEACHER_ID || null;

// ── نفس بالظبط بيانات الكورسات التسويقية القديمة (من app/scripts/seed-courses.js) ──
const MARKETING = {
  courses: [
    { id: "spanish-beginner", image: "https://images.unsplash.com/photo-1543269664-56d93c1b41a6?w=900&q=80", duration: "3 months", level: "A1–A2" },
    { id: "spanish-intermediate", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=80", duration: "4 months", level: "B1–B2" },
    { id: "english-professional", image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=900&q=80", duration: "3 months", level: "B1–C1" },
    { id: "call-center", image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=900&q=80", duration: "6 weeks", level: "All Levels" },
    { id: "university-prep", image: "https://images.unsplash.com/photo-1622016579436-14c1844c99ec?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", duration: "5 months", level: "Intermediate+" },
    { id: "career-spanish", image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80", duration: "8 weeks", level: "B2+" },
    { id: "arabic-non-native", image: "https://plus.unsplash.com/premium_photo-1677966719936-3de1c1d94421?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", duration: "4 months", level: "A1–B1" },
  ],
  i18n: JSON.parse(String.raw`{"en":{"courses":{"spanish-beginner":{"category":"Language","title":"Spanish for Beginners","desc":"Start your Spanish journey from zero. This course builds strong foundations in speaking, reading, and writing — designed especially for Arabic and English speakers.","whoIsThisFor":["Students planning to study in Spain","Professionals targeting Spanish-speaking markets","Complete beginners with no prior Spanish"],"outcomes":["Hold everyday conversations confidently","Read and write basic Spanish texts","Understand Spanish media and directions","Pass the A2 DELE official exam"],"certification":{"name":"DELE A2 — Instituto Cervantes","desc":"Internationally recognized by universities and employers in Spain and Latin America."}},"spanish-intermediate":{"category":"Language","title":"Spanish Intermediate & Advanced","desc":"Take your Spanish to a professional level. Master complex grammar, formal writing, and real-world vocabulary needed for academic and work settings.","whoIsThisFor":["Students who completed A2 or equivalent","Professionals who need B2 for visa or work","Anyone preparing for university in Spain"],"outcomes":["Communicate fluently in professional contexts","Write academic and formal texts","Pass the B2 DELE official exam","Handle university interviews in Spanish"],"certification":{"name":"DELE B2 — Instituto Cervantes","desc":"Required for many Spanish university admissions and student visa applications."}},"english-professional":{"category":"Language","title":"Professional English","desc":"Master the English skills needed for international study, work in Europe, or IELTS certification. Focus on academic writing, presentations, and business communication.","whoIsThisFor":["Students applying to English-taught programs","Professionals in or entering European job market","Anyone targeting IELTS 6.0–7.5"],"outcomes":["Write professional emails and academic essays","Deliver presentations with confidence","Score 6.0+ on IELTS or equivalent","Excel in job interviews conducted in English"],"certification":{"name":"IELTS Preparation Certificate","desc":"Accepted by 11,000+ universities and employers globally."}},"call-center":{"category":"Career","title":"Call Center & Customer Service","desc":"A fast-track program covering everything you need to land and excel in a call center or customer experience role in Egypt.","whoIsThisFor":["Job seekers targeting BPO or call center roles","Recent graduates entering the workforce","Professionals upgrading customer service skills"],"outcomes":["Handle inbound and outbound calls professionally","Master CRM tools and ticketing systems","Manage difficult customers and escalations","Build a winning CV and LinkedIn profile"],"certification":{"name":"Edumaster Call Center Certificate","desc":"Recognized by partner employers in Egypt. Includes a job placement referral."}},"university-prep":{"category":"Academic","title":"University Preparation Program","desc":"A comprehensive program that prepares you for the academic, linguistic, and administrative demands of studying at a European university.","whoIsThisFor":["Students accepted or applying to Spanish universities","Those who need to strengthen academic skills","International students new to the European system"],"outcomes":["Navigate university application portals","Write strong motivation letters and CVs","Understand Spanish academic culture","Pass entry-level language requirements"],"certification":{"name":"Edumaster University Readiness Certificate","desc":"Demonstrates readiness to academic institutions and visa authorities."}},"career-spanish":{"category":"Career + Language","title":"Spanish for the Workplace","desc":"A targeted course for professionals who already speak some Spanish and need to use it daily in a business or corporate environment.","whoIsThisFor":["Employees working in Spanish-speaking environments","Managers leading multilingual teams","Professionals targeting promotions or relocations"],"outcomes":["Lead meetings and negotiations in Spanish","Write business reports and proposals","Handle HR and legal Spanish terminology","Build professional relationships in Spanish"],"certification":{"name":"Business Spanish Proficiency Certificate","desc":"Aligned with CEFR B2+ standards for professional Spanish use."}},"arabic-non-native":{"category":"Language","title":"Arabic for Non-Arabic Speakers","desc":"Learn Modern Standard Arabic and practical spoken dialect from the ground up. Designed for foreigners and expatriates living or working in the Arab world.","whoIsThisFor":["Expats living or working in Arabic-speaking countries","Professionals dealing with Arabic-speaking clients","Complete beginners with no prior Arabic knowledge"],"outcomes":["Hold basic everyday conversations in Arabic","Read and write Arabic script confidently","Understand common local dialect expressions","Navigate daily life situations independently"],"certification":{"name":"Arabic Language Proficiency Certificate","desc":"Recognized by language institutes and employers in the MENA region."}}}},"ar":{"courses":{"spanish-beginner":{"category":"لغات","title":"الإسبانية للمبتدئين","desc":"ابدأ رحلتك مع الإسبانية من الصفر. تبني هذه الدورة أسساً قوية في المحادثة والقراءة والكتابة — مصممة خصيصاً للناطقين بالعربية والإنجليزية.","whoIsThisFor":["الطلاب الذين يخططون للدراسة في إسبانيا","المحترفون الذين يستهدفون الأسواق الناطقة بالإسبانية","المبتدئون تماماً بدون خلفية إسبانية"],"outcomes":["إجراء محادثات يومية بثقة","قراءة وكتابة نصوص إسبانية أساسية","فهم وسائل الإعلام الإسبانية والتوجيهات","اجتياز امتحان DELE A2 الرسمي"],"certification":{"name":"DELE A2 — معهد ثيربانتس","desc":"معترف به دولياً من قِبل الجامعات وأصحاب العمل في إسبانيا وأمريكا اللاتينية."}},"spanish-intermediate":{"category":"لغات","title":"الإسبانية المتوسط والمتقدم","desc":"ارتقِ بمستواك في الإسبانية إلى مستوى احترافي. أتقن قواعد اللغة المعقدة والكتابة الرسمية والمفردات اللازمة للأوساط الأكاديمية والمهنية.","whoIsThisFor":["الطلاب الذين أكملوا مستوى A2 أو ما يعادله","المحترفون الذين يحتاجون B2 للتأشيرة أو العمل","أي شخص يستعد للدراسة الجامعية في إسبانيا"],"outcomes":["التواصل بطلاقة في السياقات المهنية","كتابة نصوص أكاديمية ورسمية","اجتياز امتحان DELE B2 الرسمي","التعامل مع مقابلات الجامعات باللغة الإسبانية"],"certification":{"name":"DELE B2 — معهد ثيربانتس","desc":"مطلوب للقبول في كثير من الجامعات الإسبانية وطلبات تأشيرة الطالب."}},"english-professional":{"category":"لغات","title":"الإنجليزية المهنية","desc":"أتقن مهارات الإنجليزية اللازمة للدراسة الدولية أو العمل في أوروبا أو الحصول على شهادة IELTS. تركيز على الكتابة الأكاديمية والعروض التقديمية والتواصل التجاري.","whoIsThisFor":["الطلاب المتقدمون للبرامج المدرَّسة بالإنجليزية","المحترفون في سوق العمل الأوروبي أو الراغبون في دخوله","أي شخص يستهدف IELTS بدرجة 6.0–7.5"],"outcomes":["كتابة رسائل إلكترونية مهنية ومقالات أكاديمية","تقديم عروض بثقة","الحصول على 6.0+ في IELTS أو ما يعادله","التفوق في مقابلات العمل باللغة الإنجليزية"],"certification":{"name":"شهادة تحضير IELTS","desc":"مقبولة من أكثر من 11,000 جامعة وصاحب عمل حول العالم."}},"call-center":{"category":"مهني","title":"مراكز الاتصال وخدمة العملاء","desc":"برنامج مكثف يغطي كل ما تحتاجه للحصول على وظيفة والتميز في دور مركز الاتصال أو تجربة العملاء.","whoIsThisFor":["الباحثون عن عمل الذين يستهدفون وظائف BPO أو مراكز الاتصال","الخريجون الجدد الداخلون إلى سوق العمل","المحترفون الذين يرقّون مهارات خدمة العملاء"],"outcomes":["التعامل مع المكالمات الواردة والصادرة باحترافية","إتقان أدوات CRM وأنظمة التذاكر","إدارة العملاء الصعبين وحالات التصعيد","بناء سيرة ذاتية وملف LinkedIn رابح"],"certification":{"name":"شهادة Edumaster لمراكز الاتصال","desc":"معترف بها من قِبل أصحاب العمل الشركاء. تشمل إحالة للتوظيف."}},"university-prep":{"category":"أكاديمي","title":"برنامج التحضير الجامعي","desc":"برنامج شامل يُعدّك للمتطلبات الأكاديمية واللغوية والإدارية للدراسة في جامعة أوروبية.","whoIsThisFor":["الطلاب المقبولون أو المتقدمون للجامعات الإسبانية","من يحتاجون لتعزيز مهاراتهم الأكاديمية","الطلاب الدوليون الجدد على النظام الأوروبي"],"outcomes":["التنقل في بوابات التقديم الجامعي","كتابة خطابات تحفيز وسير ذاتية قوية","فهم الثقافة الأكاديمية الإسبانية","اجتياز متطلبات اللغة للقبول"],"certification":{"name":"شهادة Edumaster للاستعداد الجامعي","desc":"تُثبت الاستعداد للمؤسسات الأكاديمية وسلطات التأشيرة."}},"career-spanish":{"category":"مهني + لغات","title":"الإسبانية لبيئة العمل","desc":"دورة متخصصة للمحترفين الذين يتحدثون الإسبانية بشكل أساسي ويحتاجون إلى استخدامها يومياً في بيئة تجارية أو مؤسسية.","whoIsThisFor":["الموظفون الذين يعملون في بيئات ناطقة بالإسبانية","المدراء الذين يقودون فرقاً متعددة اللغات","المحترفون الذين يستهدفون الترقيات أو الانتقالات"],"outcomes":["قيادة الاجتماعات والمفاوضات بالإسبانية","كتابة تقارير ومقترحات أعمال","التعامل مع المصطلحات الإسبانية في الموارد البشرية والقانونية","بناء علاقات مهنية بالإسبانية"],"certification":{"name":"شهادة الكفاءة في الإسبانية التجارية","desc":"متوافقة مع معايير CEFR B2+ للاستخدام المهني للغة الإسبانية."}},"arabic-non-native":{"category":"لغات","title":"العربية لغير الناطقين بها","desc":"تعلّم العربية الفصحى الحديثة واللهجة المحكية العملية من الصفر. مصمم للأجانب والمقيمين في العالم العربي.","whoIsThisFor":["الأجانب المقيمون أو العاملون في الدول الناطقة بالعربية","المحترفون الذين يتعاملون مع عملاء ناطقين بالعربية","المبتدئون تماماً بدون معرفة سابقة بالعربية"],"outcomes":["إجراء محادثات يومية أساسية بالعربية","قراءة وكتابة الحروف العربية بثقة","فهم تعبيرات اللهجة المحلية الشائعة","التعامل مع مواقف الحياة اليومية باستقلالية"],"certification":{"name":"شهادة الكفاءة في اللغة العربية","desc":"معترف بها من قِبل معاهد اللغة وأصحاب العمل في منطقة الشرق الأوسط وشمال أفريقيا."}}}},"es":{"courses":{"spanish-beginner":{"category":"Idiomas","title":"Español para Principiantes","desc":"Empieza tu aventura con el español desde cero. Este curso construye bases sólidas en conversación, lectura y escritura — diseñado especialmente para hablantes de árabe e inglés.","whoIsThisFor":["Estudiantes que planean estudiar en España","Profesionales que apuntan a mercados hispanohablantes","Principiantes absolutos sin conocimiento previo"],"outcomes":["Mantener conversaciones cotidianas con confianza","Leer y escribir textos básicos en español","Comprender medios de comunicación y direcciones en español","Superar el examen oficial DELE A2"],"certification":{"name":"DELE A2 — Instituto Cervantes","desc":"Reconocido internacionalmente por universidades y empleadores en España y Latinoamérica."}},"spanish-intermediate":{"category":"Idiomas","title":"Español Intermedio y Avanzado","desc":"Lleva tu español a un nivel profesional. Domina gramática compleja, escritura formal y vocabulario del mundo real para entornos académicos y laborales.","whoIsThisFor":["Estudiantes que completaron A2 o equivalente","Profesionales que necesitan B2 para visa o trabajo","Quienes se preparan para universidades en España"],"outcomes":["Comunicarse con fluidez en contextos profesionales","Redactar textos académicos y formales","Superar el examen oficial DELE B2","Afrontar entrevistas universitarias en español"],"certification":{"name":"DELE B2 — Instituto Cervantes","desc":"Requerido para la admisión en muchas universidades españolas y solicitudes de visado de estudiante."}},"english-professional":{"category":"Idiomas","title":"Inglés Profesional","desc":"Domina las habilidades en inglés necesarias para estudios internacionales, trabajo en Europa o certificación IELTS. Foco en redacción académica, presentaciones y comunicación empresarial.","whoIsThisFor":["Estudiantes que solicitan programas impartidos en inglés","Profesionales en o ingresando al mercado laboral europeo","Quienes apuntan a IELTS 6.0–7.5"],"outcomes":["Redactar emails profesionales y ensayos académicos","Realizar presentaciones con confianza","Obtener 6.0+ en IELTS o equivalente","Destacar en entrevistas de trabajo en inglés"],"certification":{"name":"Certificado de Preparación IELTS","desc":"Aceptado por más de 11,000 universidades y empleadores en todo el mundo."}},"call-center":{"category":"Carrera","title":"Call Center y Servicio al Cliente","desc":"Un programa intensivo que cubre todo lo que necesitas para conseguir y destacar en un puesto de call center o experiencia del cliente.","whoIsThisFor":["Buscadores de empleo en BPO o call center","Recién graduados que se incorporan al mercado laboral","Profesionales que mejoran sus habilidades de servicio al cliente"],"outcomes":["Gestionar llamadas entrantes y salientes profesionalmente","Dominar herramientas CRM y sistemas de tickets","Gestionar clientes difíciles y escalaciones","Construir un CV y perfil de LinkedIn ganador"],"certification":{"name":"Certificado de Call Center Edumaster","desc":"Reconocido por empleadores asociados. Incluye referencia para colocación laboral."}},"university-prep":{"category":"Académico","title":"Programa de Preparación Universitaria","desc":"Un programa integral que te prepara para las exigencias académicas, lingüísticas y administrativas de estudiar en una universidad europea.","whoIsThisFor":["Estudiantes admitidos o solicitando plaza en universidades españolas","Quienes necesitan reforzar habilidades académicas","Estudiantes internacionales nuevos en el sistema europeo"],"outcomes":["Navegar portales de solicitud universitaria","Redactar cartas de motivación y CVs sólidos","Comprender la cultura académica española","Superar requisitos lingüísticos de entrada"],"certification":{"name":"Certificado de Preparación Universitaria Edumaster","desc":"Demuestra preparación ante instituciones académicas y autoridades de visado."}},"career-spanish":{"category":"Carrera + Idiomas","title":"Español para el Entorno Laboral","desc":"Un curso dirigido a profesionales que ya hablan algo de español y necesitan usarlo diariamente en un entorno empresarial o corporativo.","whoIsThisFor":["Empleados en entornos hispanohablantes","Directivos que lideran equipos multilingües","Profesionales que buscan ascensos o traslados"],"outcomes":["Dirigir reuniones y negociaciones en español","Redactar informes y propuestas de negocios","Manejar terminología española en RRHH y legal","Construir relaciones profesionales en español"],"certification":{"name":"Certificado de Competencia en Español de Negocios","desc":"Alineado con los estándares MCER B2+ para el uso profesional del español."}},"arabic-non-native":{"category":"Idiomas","title":"Árabe para No Nativos","desc":"Aprende árabe estándar moderno y dialecto hablado práctico desde cero. Diseñado para extranjeros y expatriados que viven o trabajan en el mundo árabe.","whoIsThisFor":["Expatriados que viven o trabajan en países de habla árabe","Profesionales que tratan con clientes de habla árabe","Principiantes absolutos sin conocimiento previo de árabe"],"outcomes":["Mantener conversaciones cotidianas básicas en árabe","Leer y escribir la escritura árabe con confianza","Comprender expresiones comunes del dialecto local","Desenvolverse en situaciones de la vida diaria de forma independiente"],"certification":{"name":"Certificado de Competencia en Lengua Árabe","desc":"Reconocido por institutos de idiomas y empleadores en la región MENA."}}}}}`),
};

// تصنيف تسويقي (بالإنجليزي) → slug ثابت للتصنيف الحقيقي + اسم بكل لغة
const CATEGORY_MAP = {
  Language: { slug: "language", name: { en: "Language", ar: "لغات", es: "Idiomas" } },
  Career: { slug: "career", name: { en: "Career", ar: "مهني", es: "Carrera" } },
  Academic: { slug: "academic", name: { en: "Academic", ar: "أكاديمي", es: "Académico" } },
  "Career + Language": { slug: "career-language", name: { en: "Career + Language", ar: "مهني + لغات", es: "Carrera + Idiomas" } },
};

// مستوى تسويقي (نص حر زي "B1–C1") → أقرب قيمة من enum الموديل الحقيقي
// (beginner/intermediate/advanced) — الموديل الحقيقي مش بيقبل نص حر زي ده.
const LEVEL_MAP = {
  "spanish-beginner": "beginner",
  "spanish-intermediate": "intermediate",
  "english-professional": "intermediate",
  "call-center": "beginner",
  "university-prep": "intermediate",
  "career-spanish": "advanced",
  "arabic-non-native": "beginner",
};

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function uniqueSlug(coll, base) {
  let slug = base || "course";
  let i = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await coll.findOne({ slug })) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

async function resolveTeacherId(db) {
  if (TEACHER_ID_OVERRIDE) {
    if (!ObjectId.isValid(TEACHER_ID_OVERRIDE)) {
      throw new Error(`TEACHER_ID اللي انت حاططه مش ObjectId صحيح: ${TEACHER_ID_OVERRIDE}`);
    }
    const user = await db.collection("auth").findOne({ _id: new ObjectId(TEACHER_ID_OVERRIDE) });
    if (!user) throw new Error(`مفيش مستخدم بالـ id ده: ${TEACHER_ID_OVERRIDE}`);
    console.log(`👤 هيتحط الكورسات باسم: ${user.name || user.email} (${user.role})`);
    return user._id;
  }

  const admin = await db.collection("auth").findOne({ role: "admin" });
  if (admin) {
    console.log(`👤 هيتحط الكورسات باسم أول أدمن لقيته: ${admin.name || admin.email}`);
    return admin._id;
  }

  const teacher = await db.collection("auth").findOne({ role: "teacher" });
  if (teacher) {
    console.log(`👤 مفيش أدمن، هيتحط الكورسات باسم أول مدرس لقيته: ${teacher.name || teacher.email}`);
    return teacher._id;
  }

  throw new Error(
    "❌ مفيش أي مستخدم بـ role admin أو teacher في كولكشن auth. حدد يدويًا بـ:\n" +
      '   $env:TEACHER_ID="<user-id>"; node app/scripts/migrate-marketing-courses-to-real.js'
  );
}

async function resolveCategoryId(db, categoriesColl, marketingCategoryName) {
  const mapped = CATEGORY_MAP[marketingCategoryName];
  if (!mapped) throw new Error(`تصنيف تسويقي مش متعرّف عليه: ${marketingCategoryName}`);

  const existing = await categoriesColl.findOne({ slug: mapped.slug });
  if (existing) return existing._id;

  const now = new Date();
  const doc = {
    name: mapped.name.en,
    slug: mapped.slug,
    description: "",
    icon: null,
    i18n: {
      en: { name: mapped.name.en, description: "" },
      ar: { name: mapped.name.ar, description: "" },
      es: { name: mapped.name.es, description: "" },
    },
    order: 0,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  const result = await categoriesColl.insertOne(doc);
  console.log(`🆕 اتعمل تصنيف جديد: ${mapped.name.ar} (${mapped.slug})`);
  return result.insertedId;
}

async function main() {
  if (!MONGO_URI) {
    console.error("❌ حط MONGO_URI الأول.");
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();

  const coursesColl = db.collection("courses_landing");
  const categoriesColl = db.collection("categories");

  const teacherId = await resolveTeacherId(db);

  let created = 0;
  let skipped = 0;

  for (const marketingCourse of MARKETING.courses) {
    const en = MARKETING.i18n.en.courses[marketingCourse.id];
    const ar = MARKETING.i18n.ar.courses[marketingCourse.id];
    const es = MARKETING.i18n.es.courses[marketingCourse.id];

    const baseSlug = slugify(en.title);
    const existingBySameMarketingTitle = await coursesColl.findOne({ "i18n.en.title": en.title });
    if (existingBySameMarketingTitle) {
      console.log(`⏭️  "${en.title}" موجود بالفعل (اتعمل قبل كده) — اتخطّى.`);
      skipped += 1;
      continue;
    }

    const slug = await uniqueSlug(coursesColl, baseSlug);
    const categoryId = await resolveCategoryId(db, categoriesColl, en.category);
    const now = new Date();

    const doc = {
      title: ar.title,
      slug,
      shortDescription: ar.desc.slice(0, 300),
      description: ar.desc,
      thumbnail: marketingCourse.image,
      i18n: {
        en: {
          title: en.title,
          shortDescription: en.desc.slice(0, 300),
          description: en.desc,
          requirements: en.whoIsThisFor,
          outcomes: en.outcomes,
          certification: en.certification,
        },
        ar: {
          title: ar.title,
          shortDescription: ar.desc.slice(0, 300),
          description: ar.desc,
          requirements: ar.whoIsThisFor,
          outcomes: ar.outcomes,
          certification: ar.certification,
        },
        es: {
          title: es.title,
          shortDescription: es.desc.slice(0, 300),
          description: es.desc,
          requirements: es.whoIsThisFor,
          outcomes: es.outcomes,
          certification: es.certification,
        },
      },
      durationLabel: marketingCourse.duration,
      category: categoryId,
      teacher: teacherId,
      level: LEVEL_MAP[marketingCourse.id] || "beginner",
      language: "ar",
      price: 0,
      currency: "EGP",
      isFree: true, // مفيش سعر حقيقي متسجل في النسخة التسويقية القديمة — عدّله من لوحة المدرس لو محتاج تحط سعر
      requirements: ar.whoIsThisFor,
      outcomes: ar.outcomes,
      tags: [],
      status: "published", // كانت ظاهرة للكل كتسويقي، فبتفضل ظاهرة كحقيقي على طول
      studentsCount: 0,
      ratingAverage: 0,
      ratingCount: 0,
      totalDurationSeconds: 0,
      totalLessonsCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await coursesColl.insertOne(doc);
    console.log(`✅ اتعمل كورس حقيقي: "${ar.title}" (slug: ${slug})`);
    created += 1;
  }

  console.log(`\n🎉 خلصنا. اتعمل ${created} كورس جديد، اتخطّى ${skipped} (موجودين من قبل).`);
  console.log("ℹ️  السعر متحط 0/مجاني افتراضيًا لأن مفيش سعر حقيقي في النسخة التسويقية — عدّل كل كورس من لوحة المدرس لو محتاج سعر فعلي.");

  await client.close();
}

main().catch((err) => {
  console.error("❌ حصل خطأ:", err.message || err);
  process.exit(1);
});