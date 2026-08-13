'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, Save, X, RefreshCw, Navigation,
  ChevronDown, ChevronUp, Loader, AlertCircle, CheckCircle,
  Image, Link2, Globe, Languages, FileText, TrendingUp, Settings, Palette
} from 'lucide-react';

const API_BASE_URL = '/api/data';

// Default structure based on provided data
const DEFAULT_SERVICES_CONFIG = {
  hero: {
    backgroundImage: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600&q=80'
  },
  services: [],
  stats: {
    backgroundImage: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1600&q=80',
    items: [] // each item: { value: "10+" }
  },
  languages: [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'es', label: 'Español', flag: '🇪🇸' }
  ],
  i18n: {}
};

export default function ServicesAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    hero: false,
    services: false,
    stats: false,
    languages: false,
    translations: false
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const showMessage = (message, type = 'success') => {
    setSuccess(type === 'success' ? message : '');
    setError(type === 'error' ? message : '');
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 4000);
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?collection=services`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const data = Array.isArray(result) && result.length > 0 ? result[0] : null;

if (data) {
  setConfig({
    ...DEFAULT_SERVICES_CONFIG,
    ...data,
    languages: data.languages?.length ? data.languages : DEFAULT_SERVICES_CONFIG.languages,
    stats: {
      ...DEFAULT_SERVICES_CONFIG.stats,
      ...(data.stats || {})
    }
  });
} else {
        // Build default config with sample data from user input
        const defaultData = JSON.parse(JSON.stringify(DEFAULT_SERVICES_CONFIG));
        defaultData._id = 'temp';

        // Sample services
        defaultData.services = [
          { id: 'study-spain', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=900&q=80', color: '#C8102E', ctaHref: '/contact' },
          { id: 'admissions', image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=900&q=80', color: '#a855f7', ctaHref: '/contact' },
          { id: 'visa', image: 'https://images.unsplash.com/photo-1614726365723-5e9e0d7e4cd1?w=900&q=80', color: '#ef4444', ctaHref: '/contact' },
          { id: 'language', image: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=900&q=80', color: '#10b981', ctaHref: '/contact' },
          { id: 'career', image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=900&q=80', color: '#3b82f6', ctaHref: '/contact' }
        ];

        // Sample stats items
        defaultData.stats.items = [
          { value: '10+' },
          { value: '100+' },
          { value: '#1' },
          { value: '1-on-1' }
        ];

        // Sample i18n data (simplified, you can embed full data from user)
        defaultData.languages.forEach(lang => {
          defaultData.i18n[lang.code] = {
            hero: { badge: '', headline: '', subheadline: '' },
            services: {},
            stats: { label: '', title: '', items: [] }
          };
          // Initialize stats items labels
          defaultData.stats.items.forEach((_, idx) => {
            defaultData.i18n[lang.code].stats.items[idx] = '';
          });
          // Initialize each service translation
          defaultData.services.forEach(service => {
            defaultData.i18n[lang.code].services[service.id] = {
              category: '',
              title: '',
              desc: '',
              features: ['', '', '', ''],
              cta: ''
            };
          });
        });

        // Fill with provided sample data for en, ar, es (optional but nice)
        if (defaultData.i18n.en) {
          defaultData.i18n.en.hero = {
            badge: 'What We Offer',
            headline: 'Everything You Need,\n in One Place',
            subheadline: 'From university selection to visa approval and career training — we cover the full journey.'
          };
          defaultData.i18n.en.services = {
            'study-spain': {
              category: 'Study Abroad',
              title: 'Study in Spain 🇪🇸',
              desc: 'Spain offers world-class universities, vibrant student life, and affordable tuition. We help you find the right program in the right city.',
              features: ["Bachelor's & Master's programs", 'Private & public universities', 'Language pathways', 'Affordable options'],
              cta: 'Start Your Spain Journey'
            },
            'admissions': {
              category: 'University Support',
              title: 'University Admission Support',
              desc: 'Navigating university applications can be overwhelming. Our team handles every detail — from choosing universities to receiving your offer letter.',
              features: ['University selection', 'Application submission', 'Offer letters', 'Enrollment assistance'],
              cta: 'Get Admission Help'
            },
            'visa': {
              category: 'Legal & Documentation',
              title: 'Visa & Documentation',
              desc: 'Visa rejections often happen due to paperwork errors. We prepare your full file, train you for the embassy interview, and follow up until the decision.',
              features: ['Student visa preparation', 'Embassy interview training', 'Document translation & legalization', 'Follow-up until decision'],
              cta: 'Start Visa Process'
            },
            'language': {
              category: 'Language Training',
              title: 'Language Courses',
              desc: 'Language skills open every door. Whether you are starting from zero or polishing your professional English, we have the right course for you.',
              features: ['Spanish for beginners to advanced', 'English for study & work', 'Academic & professional focus', 'Online & offline options'],
              cta: 'Explore Language Courses'
            },
            'career': {
              category: 'Career & Training',
              title: 'Call Center & Career Training',
              desc: 'The European job market demands specific skills. Our career training programs prepare you for real opportunities — from interviews to leadership roles.',
              features: ['Call center basics & leadership', 'Customer service & experience', 'Interview preparation', 'CV & LinkedIn optimization'],
              cta: 'Boost Your Career'
            }
          };
          defaultData.i18n.en.stats = {
            label: 'Track Record',
            title: 'Our Numbers Speak',
            items: ['Countries Represented', 'Successful Admissions', 'Spain Specialists', 'Personal Support']
          };
        }
        if (defaultData.i18n.ar) {
          defaultData.i18n.ar.hero = {
            badge: 'ما نقدمه',
            headline: 'كل ما تحتاجه,\n في مكان واحد',
            subheadline: 'من اختيار الجامعة إلى الحصول على التأشيرة والتدريب المهني — نغطي الرحلة كاملة.'
          };
          defaultData.i18n.ar.services = {
            'study-spain': {
              category: 'الدراسة في الخارج',
              title: 'الدراسة في إسبانيا 🇪🇸',
              desc: 'تقدم إسبانيا جامعات عالمية المستوى وحياة طلابية نابضة ورسوم دراسية معقولة. نساعدك في إيجاد البرنامج المناسب في المدينة المناسبة.',
              features: ['برامج البكالوريوس والماجستير', 'الجامعات الخاصة والحكومية', 'مسارات لغوية', 'خيارات ميسورة التكلفة'],
              cta: 'ابدأ رحلتك في إسبانيا'
            },
            'admissions': {
              category: 'دعم الجامعات',
              title: 'دعم القبول الجامعي',
              desc: 'التنقل في طلبات الجامعة قد يكون أمراً مرهقاً. فريقنا يتولى كل التفاصيل — من اختيار الجامعات حتى استلام خطاب القبول.',
              features: ['اختيار الجامعة', 'تقديم الطلب', 'خطابات القبول', 'مساعدة التسجيل'],
              cta: 'احصل على مساعدة القبول'
            },
            'visa': {
              category: 'القانوني والوثائق',
              title: 'التأشيرة والوثائق',
              desc: 'رفض التأشيرات يحدث في الغالب بسبب أخطاء في الأوراق. نُعدّ ملفك الكامل وندربك على مقابلة السفارة ونتابع حتى صدور القرار.',
              features: ['إعداد تأشيرة الطالب', 'تدريب مقابلة السفارة', 'ترجمة الوثائق وتوثيقها', 'متابعة حتى القرار'],
              cta: 'ابدأ إجراءات التأشيرة'
            },
            'language': {
              category: 'التدريب اللغوي',
              title: 'الدورات اللغوية',
              desc: 'المهارات اللغوية تفتح كل الأبواب. سواء كنت تبدأ من الصفر أو تُصقل إنجليزيتك المهنية، لدينا الدورة المناسبة لك.',
              features: ['الإسبانية للمبتدئين حتى المتقدمين', 'الإنجليزية للدراسة والعمل', 'تركيز أكاديمي ومهني', 'خيارات أونلاين وحضوري'],
              cta: 'استكشف الدورات اللغوية'
            },
            'career': {
              category: 'المهن والتدريب',
              title: 'تدريب مراكز الاتصال والمهن',
              desc: 'سوق العمل الأوروبي يتطلب مهارات محددة. برامج التدريب المهني لدينا تُعدّك لفرص حقيقية — من المقابلات حتى الأدوار القيادية.',
              features: ['أساسيات مراكز الاتصال والقيادة', 'خدمة العملاء وتجربة العملاء', 'التحضير للمقابلات', 'تحسين السيرة الذاتية وLinkedIn'],
              cta: 'عزز مسيرتك المهنية'
            }
          };
          defaultData.i18n.ar.stats = {
            label: 'سجل الإنجازات',
            title: 'أرقامنا تتحدث',
            items: ['دولة ممثّلة', 'قبول ناجح', 'متخصصون في إسبانيا', 'دعم شخصي']
          };
        }
        if (defaultData.i18n.es) {
          defaultData.i18n.es.hero = {
            badge: 'Lo Que Ofrecemos',
            headline: 'Todo lo que necesitas,\n en un solo lugar',
            subheadline: 'Desde la selección universitaria hasta la aprobación del visado y la formación profesional — cubrimos todo el camino.'
          };
          defaultData.i18n.es.services = {
            'study-spain': {
              category: 'Estudiar en el Extranjero',
              title: 'Estudiar en España 🇪🇸',
              desc: 'España ofrece universidades de clase mundial, vida estudiantil vibrante y matrícula asequible. Te ayudamos a encontrar el programa adecuado en la ciudad adecuada.',
              features: ['Programas de Grado y Máster', 'Universidades privadas y públicas', 'Rutas lingüísticas', 'Opciones asequibles'],
              cta: 'Empieza tu viaje en España'
            },
            'admissions': {
              category: 'Apoyo Universitario',
              title: 'Apoyo en Admisiones Universitarias',
              desc: 'Navegar por las solicitudes universitarias puede ser abrumador. Nuestro equipo se encarga de cada detalle — desde elegir universidades hasta recibir tu carta de admisión.',
              features: ['Selección de universidad', 'Envío de solicitudes', 'Cartas de admisión', 'Asistencia en la matrícula'],
              cta: 'Obtener Ayuda con Admisiones'
            },
            'visa': {
              category: 'Legal y Documentación',
              title: 'Visado y Documentación',
              desc: 'Los rechazos de visado suelen ocurrir por errores en los documentos. Preparamos tu expediente completo, te entrenamos para la entrevista consular y hacemos seguimiento hasta la resolución.',
              features: ['Preparación de visado de estudiante', 'Entrenamiento para entrevista consular', 'Traducción y legalización de documentos', 'Seguimiento hasta la resolución'],
              cta: 'Iniciar Proceso de Visado'
            },
            'language': {
              category: 'Formación Lingüística',
              title: 'Cursos de Idiomas',
              desc: 'Las habilidades lingüísticas abren todas las puertas. Ya sea que empieces desde cero o perfecciones tu inglés profesional, tenemos el curso adecuado para ti.',
              features: ['Español de principiante a avanzado', 'Inglés para estudios y trabajo', 'Enfoque académico y profesional', 'Opciones online y presencial'],
              cta: 'Explorar Cursos de Idiomas'
            },
            'career': {
              category: 'Carrera y Formación',
              title: 'Call Center y Formación Profesional',
              desc: 'El mercado laboral europeo exige habilidades específicas. Nuestros programas de formación te preparan para oportunidades reales — desde entrevistas hasta roles de liderazgo.',
              features: ['Fundamentos y liderazgo en call center', 'Servicio al cliente y experiencia de cliente', 'Preparación para entrevistas', 'Optimización de CV y LinkedIn'],
              cta: 'Impulsa tu Carrera'
            }
          };
          defaultData.i18n.es.stats = {
            label: 'Historial',
            title: 'Nuestros Números Hablan',
            items: ['Países Representados', 'Admisiones Exitosas', 'Especialistas en España', 'Apoyo Personal']
          };
        }

        setConfig(defaultData);
      }
    } catch (err) {
      showMessage('Error fetching services data: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const isNew = config._id === 'temp' || !config._id;
      const url = `${API_BASE_URL}?collection=services${isNew ? '' : `&id=${config._id}`}`;
      const method = isNew ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      showMessage('✓ Configuration saved successfully');
      fetchConfig(); // refresh to get real _id
    } catch (err) {
      showMessage('Error saving: ' + err.message, 'error');
    }
    setLoading(false);
  };

  // Deep update helper
  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = structuredClone(prev);
      const keys = path.split('.');
      let current = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  // --- Services management ---
  const addService = () => {
    const newId = `service_${Date.now()}`;
    const newService = { id: newId, image: '', color: '#000000', ctaHref: '/' };
    updateConfig('services', [...(config?.services || []), newService]);

    // Initialize translations for each language
    config?.languages?.forEach(lang => {
      const currentServices = config.i18n[lang.code]?.services || {};
      updateConfig(`i18n.${lang.code}.services.${newId}`, {
        category: '',
        title: '',
        desc: '',
        features: ['', '', '', ''],
        cta: ''
      });
    });
  };

  const updateService = (index, field, value) => {
    const newServices = [...(config?.services || [])];
    newServices[index] = { ...newServices[index], [field]: value };
    updateConfig('services', newServices);
  };

  const removeService = (index) => {
    const serviceId = config.services[index].id;
    const newServices = config.services.filter((_, i) => i !== index);
    updateConfig('services', newServices);
    // Remove translations for this service
    config?.languages?.forEach(lang => {
      const newLangServices = { ...(config.i18n[lang.code]?.services || {}) };
      delete newLangServices[serviceId];
      updateConfig(`i18n.${lang.code}.services`, newLangServices);
    });
  };

  // --- Stats items management (value field) ---
  const addStatItem = () => {
    const newItems = [...(config?.stats?.items || []), { value: '' }];
    updateConfig('stats.items', newItems);
    // For each language, add an empty label for this new stat
    config?.languages?.forEach(lang => {
      const currentLabels = config.i18n[lang.code]?.stats?.items || [];
      updateConfig(`i18n.${lang.code}.stats.items`, [...currentLabels, '']);
    });
  };

  const updateStatItemValue = (index, value) => {
    const newItems = [...(config?.stats?.items || [])];
    newItems[index] = { ...newItems[index], value };
    updateConfig('stats.items', newItems);
  };

  const removeStatItem = (index) => {
    const newItems = config.stats.items.filter((_, i) => i !== index);
    updateConfig('stats.items', newItems);
    // Remove label from all languages
    config?.languages?.forEach(lang => {
      const newLabels = (config.i18n[lang.code]?.stats?.items || []).filter((_, i) => i !== index);
      updateConfig(`i18n.${lang.code}.stats.items`, newLabels);
    });
  };

  // --- Languages management (same as navbar) ---
  const addLanguage = () => {
    const newCode = `lang_${Date.now()}`;
    const newLang = { code: newCode, label: 'New Language', flag: '🌐' };
    updateConfig('languages', [...(config?.languages || []), newLang]);

    // Initialize i18n structure for this language
    const newI18nLang = {
      hero: { badge: '', headline: '', subheadline: '' },
      services: {},
      stats: { label: '', title: '', items: [] }
    };
    // Stats items labels
    config?.stats?.items?.forEach((_, idx) => {
      newI18nLang.stats.items[idx] = '';
    });
    // Services translations
    config?.services?.forEach(service => {
      newI18nLang.services[service.id] = {
        category: '',
        title: '',
        desc: '',
        features: ['', '', '', ''],
        cta: ''
      };
    });
    updateConfig(`i18n.${newCode}`, newI18nLang);
  };

  const updateLanguage = (index, field, value) => {
    const newLangs = [...(config?.languages || [])];
    const oldCode = newLangs[index].code;
    newLangs[index] = { ...newLangs[index], [field]: value };
    if (field === 'code' && oldCode !== value) {
      const i18nData = config.i18n[oldCode] || {
        hero: { badge: '', headline: '', subheadline: '' },
        services: {},
        stats: { label: '', title: '', items: [] }
      };
      updateConfig(`i18n.${value}`, i18nData);
      const newI18n = { ...config.i18n };
      delete newI18n[oldCode];
      updateConfig('i18n', newI18n);
    }
    updateConfig('languages', newLangs);
  };

  const removeLanguage = (index) => {
    const langCode = config.languages[index].code;
    const newLangs = config.languages.filter((_, i) => i !== index);
    updateConfig('languages', newLangs);
    const newI18n = { ...config.i18n };
    delete newI18n[langCode];
    updateConfig('i18n', newI18n);
  };

  // Helper to update service translation field (e.g., category, title, desc, cta, features array)
  const updateServiceTranslation = (langCode, serviceId, field, value, featureIndex = null) => {
    if (field === 'features' && featureIndex !== null) {
      const currentFeatures = [...(config.i18n[langCode]?.services[serviceId]?.features || [])];
      currentFeatures[featureIndex] = value;
      updateConfig(`i18n.${langCode}.services.${serviceId}.features`, currentFeatures);
    } else {
      updateConfig(`i18n.${langCode}.services.${serviceId}.${field}`, value);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  if (!config) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        {loading ? <Loader className="animate-spin mx-auto" size={48} /> : <p>No data</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100">
      {/* Header */}
      <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-blue-900">
            <Settings size={28} />
            Services Page Configuration
          </h2>
          <div className="flex gap-3">
            <button
              onClick={fetchConfig}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700"
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={saveConfig}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2.5 rounded-lg"
              disabled={loading}
            >
              {loading ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
              Save All
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {(success || error) && (
        <div className={`mx-6 mt-4 px-6 py-4 rounded-xl flex items-center gap-3 ${success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {success ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          <span className="font-medium">{success || error}</span>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('hero')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Image size={20} /> Hero Section Background
            </h3>
            {expandedSections.hero ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.hero && (
            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Background Image URL</label>
              <input
                type="url"
                value={config.hero?.backgroundImage || ''}
                onChange={e => updateConfig('hero.backgroundImage', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                placeholder="https://..."
              />
              {config.hero?.backgroundImage && (
                <div className="mt-2 h-24 w-full bg-cover bg-center rounded-lg" style={{ backgroundImage: `url(${config.hero.backgroundImage})` }}></div>
              )}
            </div>
          )}
        </div>

        {/* Services List Management */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('services')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Link2 size={20} /> Services
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{(config.services || []).length}</span>
            </h3>
            {expandedSections.services ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.services && (
            <div className="mt-4 space-y-4">
              {config.services?.map((service, idx) => (
                <div key={service.id} className="p-4 bg-white rounded-lg border-2 border-blue-100 space-y-3">
                  <div className="flex flex-wrap gap-3 items-start">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-semibold">Service ID (key)</label>
                      <input
                        value={service.id}
                        onChange={e => updateService(idx, 'id', e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-semibold">Image URL</label>
                      <input
                        value={service.image || ''}
                        onChange={e => updateService(idx, 'image', e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs font-semibold">Color</label>
                      <input
                        type="color"
                        value={service.color || '#000000'}
                        onChange={e => updateService(idx, 'color', e.target.value)}
                        className="w-full h-10 border rounded"
                      />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-semibold">CTA Link</label>
                      <input
                        value={service.ctaHref || '/'}
                        onChange={e => updateService(idx, 'ctaHref', e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                      />
                    </div>
                    <button onClick={() => removeService(idx)} className="text-red-500 hover:text-red-700 mt-5 p-2">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {service.image && (
                    <img src={service.image} alt="preview" className="h-16 w-auto object-cover rounded" />
                  )}
                </div>
              ))}
              <button onClick={addService} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mt-2">
                <Plus size={18} /> Add Service
              </button>
            </div>
          )}
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('stats')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <TrendingUp size={20} /> Statistics Section
            </h3>
            {expandedSections.stats ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.stats && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold">Stats Background Image</label>
                <input
                  type="url"
                  value={config.stats?.backgroundImage || ''}
                  onChange={e => updateConfig('stats.backgroundImage', e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Stat Items (Values like "10+", "100+")</label>
                <div className="space-y-2">
                  {config.stats?.items?.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        value={item.value || ''}
                        onChange={e => updateStatItemValue(idx, e.target.value)}
                        placeholder="e.g., 10+"
                        className="flex-1 px-3 py-2 border rounded"
                      />
                      <button onClick={() => removeStatItem(idx)} className="text-red-500 p-2">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={addStatItem} className="flex items-center gap-2 text-blue-600 mt-2">
                  <Plus size={18} /> Add Statistic Item
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Translations */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('translations')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Languages size={20} /> Translations
            </h3>
            {expandedSections.translations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.translations && config.languages?.map(lang => {
            const t = config.i18n?.[lang.code];
            if (!t) return null;
            return (
              <div key={lang.code} className="mt-6 p-4 bg-white rounded-xl border-2 border-purple-100">
                <h4 className="font-bold text-lg mb-3 flex items-center gap-2">{lang.flag} {lang.label} ({lang.code})</h4>

                {/* Hero Translations */}
                <div className="mb-6 p-3 bg-gray-50 rounded">
                  <h5 className="font-semibold mb-2">Hero Section</h5>
                  <div className="grid grid-cols-1 gap-3">
                    <input value={t.hero?.badge || ''} onChange={e => updateConfig(`i18n.${lang.code}.hero.badge`, e.target.value)} placeholder="Badge" className="px-3 py-2 border rounded" />
                    <textarea value={t.hero?.headline || ''} onChange={e => updateConfig(`i18n.${lang.code}.hero.headline`, e.target.value)} placeholder="Headline (use \n for line break)" rows={2} className="px-3 py-2 border rounded" />
                    <textarea value={t.hero?.subheadline || ''} onChange={e => updateConfig(`i18n.${lang.code}.hero.subheadline`, e.target.value)} placeholder="Subheadline" rows={2} className="px-3 py-2 border rounded" />
                  </div>
                </div>

                {/* Stats Translations */}
                <div className="mb-6 p-3 bg-gray-50 rounded">
                  <h5 className="font-semibold mb-2">Statistics Section Texts</h5>
                  <div className="grid grid-cols-1 gap-3">
                    <input value={t.stats?.label || ''} onChange={e => updateConfig(`i18n.${lang.code}.stats.label`, e.target.value)} placeholder="Label (e.g., Track Record)" className="px-3 py-2 border rounded" />
                    <input value={t.stats?.title || ''} onChange={e => updateConfig(`i18n.${lang.code}.stats.title`, e.target.value)} placeholder="Title (e.g., Our Numbers Speak)" className="px-3 py-2 border rounded" />
                    <div>
                      <label className="block text-sm font-medium">Stat Labels (for each value above)</label>
                      {t.stats?.items?.map((label, idx) => (
                        <div key={idx} className="flex gap-2 mt-1">
                          <input value={label || ''} onChange={e => {
                            const newLabels = [...(t.stats?.items || [])];
                            newLabels[idx] = e.target.value;
                            updateConfig(`i18n.${lang.code}.stats.items`, newLabels);
                          }} placeholder={`Label for stat ${idx+1}`} className="flex-1 px-3 py-2 border rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Services Translations */}
                <div className="mb-2">
                  <h5 className="font-semibold mb-2">Services Translations</h5>
                  {config.services?.map(service => {
                    const serviceT = t.services?.[service.id] || { category: '', title: '', desc: '', features: [], cta: '' };
                    return (
                      <div key={service.id} className="border rounded-lg p-3 mb-3 bg-gray-50">
                        <p className="font-mono text-sm text-gray-500 mb-2">{service.id}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input value={serviceT.category || ''} onChange={e => updateServiceTranslation(lang.code, service.id, 'category', e.target.value)} placeholder="Category" className="px-2 py-1 border rounded" />
                          <input value={serviceT.title || ''} onChange={e => updateServiceTranslation(lang.code, service.id, 'title', e.target.value)} placeholder="Title" className="px-2 py-1 border rounded" />
                          <textarea value={serviceT.desc || ''} onChange={e => updateServiceTranslation(lang.code, service.id, 'desc', e.target.value)} placeholder="Description" rows={2} className="col-span-2 px-2 py-1 border rounded" />
                          <input value={serviceT.cta || ''} onChange={e => updateServiceTranslation(lang.code, service.id, 'cta', e.target.value)} placeholder="CTA Button Text" className="px-2 py-1 border rounded" />
                        </div>
                        <div className="mt-2">
                          <label className="text-sm font-medium">Features (array)</label>
                          {(serviceT.features || ['', '', '', '']).map((feat, idx) => (
                            <input key={idx} value={feat} onChange={e => updateServiceTranslation(lang.code, service.id, 'features', e.target.value, idx)} placeholder={`Feature ${idx+1}`} className="w-full mt-1 px-2 py-1 border rounded" />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}