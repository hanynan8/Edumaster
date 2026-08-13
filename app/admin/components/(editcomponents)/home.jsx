'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Save, RefreshCw, ChevronDown, ChevronUp, Loader, AlertCircle, CheckCircle,
  Image, Link2, Globe, Languages, Home, Zap, Award, PackageOpen, BarChart3, Flag
} from 'lucide-react';

const API_BASE_URL = '/api/data';

// Full default structure matching exactly what you sent + languages array for consistency with NavbarAdmin
const DEFAULT_CONFIG = {
  site: {
    brand: "Edumaster",
    logo: "https://placehold.co/160x48/0a0f1e/f59e0b?text=Edumaster",
    favicon: "/favicon.ico",
    baseUrl: "https://edumaster.com"
  },
  nav: {
    links: [
      { id: "services", href: "/services" },
      { id: "about", href: "/about" },
      { id: "contact", href: "/contact" }
    ]
  },
  hero: {
    backgroundImage: "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=1600&q=80",
    overlayOpacity: 0.6,
    badgeIcon: "🇪🇸",
    ctaConsultationHref: "/consultation",
    ctaApplyHref: "/apply"
  },
  why: {
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80",
    pointIcons: ["🎯", "🌐", "✅", "🗺️", "🤝"]
  },
  services: {
    ctaHref: "/services",
    items: [
      {
        id: "study-spain",
        icon: "🎓",
        image: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=600&q=80",
        href: "/services/study-spain",
        color: "#f59e0b"
      },
      {
        id: "admissions",
        icon: "🏛️",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&q=80",
        href: "/services/admissions",
        color: "#a855f7"
      },
      {
        id: "visa",
        icon: "📋",
        image: "https://images.unsplash.com/photo-1614726365723-5e9e0d7e4cd1?w=600&q=80",
        href: "/services/visa",
        color: "#ef4444"
      },
      {
        id: "language",
        icon: "🗣️",
        image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80",
        href: "/services/language",
        color: "#10b981"
      },
      {
        id: "career",
        icon: "📞",
        image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=600&q=80",
        href: "/services/career",
        color: "#3b82f6"
      }
    ]
  },
  stats: {
    backgroundImage: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1600&q=80",
    items: [
      { value: "10+", icon: "🌍" },
      { value: "100+", icon: "🎓" },
      { value: "#1", icon: "🇪🇸" },
      { value: "1-on-1", icon: "🕒" }
    ]
  },
  i18n: {
    en: {
      nav: { brand: "Edumaster", links: { services: "Services", about: "About", contact: "Contact" }, cta: "Get Started" },
      hero: {
        badge: "Your Gateway to Europe",
        headline: "LEARN BEYOND BORDERS",
        subheadline: "University admissions, visas, language courses, call center training, and career preparation — all in one place.",
        ctaConsultation: "Free Consultation",
        ctaApply: "Apply Now"
      },
      why: {
        title: "Why Edumaster?",
        points: [
          "Expert guidance for Spain & Europe",
          "Arabic, English & Spanish support",
          "High visa success rate",
          "Step-by-step process",
          "Trusted by students & professionals"
        ]
      },
      services: {
        title: "Our Core Services",
        cta: "View All Services",
        items: {
          "study-spain": { title: "Study in Spain", desc: "Find the right program and city for your goals." },
          admissions: { title: "University Admissions", desc: "Full guidance from selection to acceptance." },
          visa: { title: "Visa & Documentation", desc: "End-to-end support for a smooth visa process." },
          language: { title: "Spanish & English Courses", desc: "Online and in-person language training." },
          career: { title: "Call Center & Career Training", desc: "Professional skills for the European job market." }
        }
      },
      stats: {
        title: "Our Numbers Speak",
        items: ["Countries Represented", "Successful Admissions", "Spain Specialists", "Personal Support"]
      }
    },
    ar: {
      nav: { brand: "إيدوماستر", links: { services: "الخدمات", about: "من نحن", contact: "تواصل معنا" }, cta: "ابدأ الآن" },
      hero: {
        badge: "بوابتك إلى أوروبا",
        headline: "تعلّم بلا حدود",
        subheadline: "القبولات الجامعية، التأشيرات، دورات اللغات، تدريب مراكز الاتصال، والتحضير الوظيفي — كل شيء في مكان واحد.",
        ctaConsultation: "استشارة مجانية",
        ctaApply: "قدّم الآن"
      },
      why: {
        title: "لماذا إيدوماستر؟",
        points: [
          "إرشاد متخصص لإسبانيا وأوروبا",
          "دعم باللغات العربية والإنجليزية والإسبانية",
          "نسبة نجاح عالية في التأشيرات",
          "عملية خطوة بخطوة",
          "موثوق به من الطلاب والمهنيين"
        ]
      },
      services: {
        title: "خدماتنا الأساسية",
        cta: "عرض جميع الخدمات",
        items: {
          "study-spain": { title: "الدراسة في إسبانيا", desc: "ابحث عن البرنامج والمدينة المناسبة لأهدافك." },
          admissions: { title: "القبول الجامعي", desc: "إرشاد كامل من الاختيار حتى القبول." },
          visa: { title: "التأشيرة والوثائق", desc: "دعم شامل لإجراءات تأشيرة سلسة." },
          language: { title: "دورات الإسبانية والإنجليزية", desc: "تدريب لغوي عبر الإنترنت وبشكل حضوري." },
          career: { title: "تدريب مراكز الاتصال والمهن", desc: "مهارات مهنية لسوق العمل الأوروبي." }
        }
      },
      stats: {
        title: "أرقامنا تتحدث",
        items: ["دولة ممثّلة", "قبول ناجح", "متخصصون في إسبانيا", "دعم شخصي"]
      }
    },
    es: {
      nav: { brand: "Edumaster", links: { services: "Servicios", about: "Nosotros", contact: "Contacto" }, cta: "Empezar" },
      hero: {
        badge: "Tu Puerta a Europa",
        headline: "Aprende más allá de las fronteras",
        subheadline: "Admisiones universitarias, visados, cursos de idiomas, formación en call center y preparación profesional — todo en un solo lugar.",
        ctaConsultation: "Consulta Gratuita",
        ctaApply: "Solicitar Ahora"
      },
      why: {
        title: "¿Por qué Edumaster?",
        points: [
          "Orientación experta para España y Europa",
          "Atención en árabe, inglés y español",
          "Alta tasa de éxito en visados",
          "Proceso paso a paso",
          "De confianza para estudiantes y profesionales"
        ]
      },
      services: {
        title: "Nuestros Servicios Principales",
        cta: "Ver Todos los Servicios",
        items: {
          "study-spain": { title: "Estudiar en España", desc: "Encuentra el programa y la ciudad ideales para tus metas." },
          admissions: { title: "Admisiones Universitarias", desc: "Asesoría completa desde la selección hasta la aceptación." },
          visa: { title: "Visado y Documentación", desc: "Apoyo integral para un proceso de visado sin complicaciones." },
          language: { title: "Cursos de Español e Inglés", desc: "Formación lingüística online y presencial." },
          career: { title: "Call Center y Formación Profesional", desc: "Habilidades profesionales para el mercado laboral europeo." }
        }
      },
      stats: {
        title: "Nuestros Números Hablan",
        items: ["Países Representados", "Admisiones Exitosas", "Especialistas en España", "Apoyo Personal"]
      }
    }
  },
  languages: [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'es', label: 'Español', flag: '🇪🇸' }
  ]
};

export default function HomeAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    site: false,
    nav: false,
    hero: false,
    why: false,
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
      const response = await fetch(`${API_BASE_URL}?collection=home`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const data = Array.isArray(result) && result.length > 0 ? result[0] : null;

      if (data) {
        // Ensure languages exist (for backward compatibility if old document)
        if (!data.languages) {
          data.languages = DEFAULT_CONFIG.languages;
        }
        setConfig(data);
      } else {
        setConfig({ ...DEFAULT_CONFIG, _id: 'temp' });
      }
    } catch (err) {
      showMessage('Error fetching home data: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const isNew = config._id === 'temp' || !config._id;
      const url = `${API_BASE_URL}?collection=home${isNew ? '' : `&id=${config._id}`}`;
      const method = isNew ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      showMessage('✓ تم حفظ الإعدادات بنجاح');
      fetchConfig(); // refresh to get real _id
    } catch (err) {
      showMessage('خطأ في الحفظ: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = JSON.parse(JSON.stringify(prev));
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

  // ── Navigation Links ─────────────────────────────────────
  const addNavLink = () => {
    const newId = `link_${Date.now()}`;
    const newLink = { id: newId, href: '/' };
    updateConfig('nav.links', [...(config?.nav?.links || []), newLink]);
    config?.languages?.forEach(lang => {
      updateConfig(`i18n.${lang.code}.nav.links.${newId}`, '');
    });
  };

  const updateNavLink = (index, field, value) => {
    const newLinks = [...(config?.nav?.links || [])];
    newLinks[index] = { ...newLinks[index], [field]: value };
    updateConfig('nav.links', newLinks);
  };


  // ── Services Items ───────────────────────────────────────
  const addServiceItem = () => {
    const newId = `service_${Date.now()}`;
    const newItem = {
      id: newId,
      icon: '🔹',
      image: 'https://placehold.co/600x400/3b82f6/white?text=New',
      href: '/services/new',
      color: '#3b82f6'
    };
    updateConfig('services.items', [...(config?.services?.items || []), newItem]);
    config?.languages?.forEach(lang => {
      updateConfig(`i18n.${lang.code}.services.items.${newId}`, { title: '', desc: '' });
    });
  };

  const updateServiceItem = (index, field, value) => {
    const newItems = [...(config?.services?.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    updateConfig('services.items', newItems);
  };
const removeServiceItem = (index) => {
  if (!confirm('هل أنت متأكد من حذف هذه الخدمة؟')) return;
  const itemId = config.services.items[index].id;
  const newItems = config.services.items.filter((_, i) => i !== index);
  updateConfig('services.items', newItems);
  config?.languages?.forEach(lang => {
    const newTrans = { ...(config.i18n[lang.code]?.services?.items || {}) };
    delete newTrans[itemId];
    updateConfig(`i18n.${lang.code}.services.items`, newTrans);
  });
};

const removeStatItem = (index) => {
  if (!confirm('هل أنت متأكد من حذف هذا الإحصاء؟')) return;
  const newItems = config.stats.items.filter((_, i) => i !== index);
  updateConfig('stats.items', newItems);
  config?.languages?.forEach(lang => {
    const current = [...(config.i18n[lang.code]?.stats?.items || [])];
    current.splice(index, 1);
    updateConfig(`i18n.${lang.code}.stats.items`, current);
  });
};

  const updatePointIcon = (index, value) => {
    const newIcons = [...(config?.why?.pointIcons || [])];
    newIcons[index] = value;
    updateConfig('why.pointIcons', newIcons);
  };


  // ── Stats Items ──────────────────────────────────────────
  const addStatItem = () => {
    const newItem = { value: 'New', icon: '📊' };
    const newItems = [...(config?.stats?.items || []), newItem];
    updateConfig('stats.items', newItems);
    config?.languages?.forEach(lang => {
      const current = [...(config.i18n[lang.code]?.stats?.items || [])];
      current.push('');
      updateConfig(`i18n.${lang.code}.stats.items`, current);
    });
  };

  const updateStatItem = (index, field, value) => {
    const newItems = [...(config?.stats?.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    updateConfig('stats.items', newItems);
  };


  // ── Languages Management (exact same as NavbarAdmin) ─────
  const addLanguage = () => {
    const newCode = `lang_${Date.now()}`;
    const newLang = { code: newCode, label: 'New Language', flag: '🌐' };
    updateConfig('languages', [...(config?.languages || []), newLang]);

    const template = {
      nav: { brand: '', links: {}, cta: '' },
      hero: { badge: '', headline: '', subheadline: '', ctaConsultation: '', ctaApply: '' },
      why: { title: '', points: config?.why?.pointIcons ? Array(config.why.pointIcons.length).fill('') : [] },
      services: { title: '', cta: '', items: {} },
      stats: { title: '', items: config?.stats?.items ? Array(config.stats.items.length).fill('') : [] }
    };

    if (config?.nav?.links) {
      config.nav.links.forEach(link => {
        template.nav.links[link.id] = '';
      });
    }
    if (config?.services?.items) {
      config.services.items.forEach(item => {
        template.services.items[item.id] = { title: '', desc: '' };
      });
    }

    updateConfig(`i18n.${newCode}`, template);
  };

  const updateLanguage = (index, field, value) => {
    const newLangs = [...(config?.languages || [])];
    const oldCode = newLangs[index].code;
    newLangs[index] = { ...newLangs[index], [field]: value };
    if (field === 'code' && oldCode !== value) {
      const i18nData = config.i18n[oldCode] || {};
      updateConfig(`i18n.${value}`, i18nData);
      const newI18n = { ...config.i18n };
      delete newI18n[oldCode];
      updateConfig('i18n', newI18n);
    }
    updateConfig('languages', newLangs);
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
            <Home size={28} />
            Home Page Configuration
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


        {/* 3. Hero Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('hero')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Zap size={20} /> Hero Section
            </h3>
            {expandedSections.hero ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.hero && (
  <div className="mt-4 space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-semibold mb-2">Background Image</label>
        <div className="flex flex-col gap-3">
          <input
            type="url"
            value={config.hero?.backgroundImage || ''}
            onChange={e => updateConfig('hero.backgroundImage', e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
          />
          {config.hero?.backgroundImage && (
            <img
              src={config.hero.backgroundImage}
              alt="Preview"
              className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
            />
          )}
        </div>
      </div>
    </div>

    {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6"> */}
      {/* <div>
        <label className="block text-sm font-semibold mb-2">Badge Icon</label>
        <input
          type="text"
          value={config.hero?.badgeIcon || ''}
          onChange={e => updateConfig('hero.badgeIcon', e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-2">CTA Consultation Link</label>
        <input
          type="text"
          value={config.hero?.ctaConsultationHref || ''}
          onChange={e => updateConfig('hero.ctaConsultationHref', e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold mb-2">CTA Apply Link</label>
        <input
          type="text"
          value={config.hero?.ctaApplyHref || ''}
          onChange={e => updateConfig('hero.ctaApplyHref', e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
        />
      </div> */}
    {/* </div> */}
  </div>
)}
        </div>

        {/* 4. Why Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
  <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('why')}>
    <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
      <Award size={20} /> Why Edumaster
    </h3>
    {expandedSections.why ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
  </div>
  {expandedSections.why && (
    <div className="mt-4 space-y-6">
      
      {/* Image */}
      <div>
        <label className="block text-sm font-semibold mb-2">Image URL</label>
        <div className="flex flex-col gap-3">
          <input
            type="url"
            value={config.why?.image || ''}
            onChange={e => updateConfig('why.image', e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
          />
          {config.why?.image && (
            <img
              src={config.why.image}
              alt="Preview"
              className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
            />
          )}
        </div>
      </div>
    </div>
  )}
</div>

        {/* 5. Services Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('services')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <PackageOpen size={20} /> Services
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{config.services?.items?.length || 0}</span>
            </h3>
            {expandedSections.services ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
{expandedSections.services && (
  <div className="mt-4 space-y-6">

    {/* <div>
      <label className="block text-sm font-semibold mb-2">CTA Link</label>
      <input
        type="text"
        value={config.services?.ctaHref || ''}
        onChange={e => updateConfig('services.ctaHref', e.target.value)}
        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
      />
    </div> */}

    {/* Service Items */}
    <div className="space-y-4">
      {config.services?.items?.map((item, idx) => (
        <div key={item.id} className="p-4 bg-white border-2 border-purple-100 rounded-xl space-y-3">
          
          {/* Row 1: ID, Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">ID</label>
              <input
                value={item.id}
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-400 cursor-not-allowed"
                placeholder="ID"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={item.color}
                  onChange={e => updateServiceItem(idx, 'color', e.target.value)}
                  className="h-10 w-10 border-0 p-1 rounded-lg cursor-pointer"
                />
                <span className="text-sm text-gray-500">{item.color}</span>
              </div>
            </div>
          </div>

          {/* Row 2: Image URL + Preview */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Image URL</label>
            <div className="flex flex-col gap-2">
              <input
                value={item.image}
                onChange={e => updateServiceItem(idx, 'image', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="https://..."
              />
              {item.image && (
                <img
                  src={item.image}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                />
              )}
            </div>
          </div>

          <button onClick={() => removeServiceItem(idx)} className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm">
            <Trash2 size={16} /> Remove Service
          </button>
        </div>
      ))}
      <button onClick={addServiceItem} className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
        <Plus size={18} /> Add Service Item
      </button>
    </div>
  </div>
)}
        </div>
{/* 6. Stats Section */}
<div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
  <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('stats')}>
    <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
      <BarChart3 size={20} /> Stats
    </h3>
    {expandedSections.stats ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
  </div>
  {expandedSections.stats && (
    <div className="mt-4 space-y-4">

      {/* Background Image */}
      <div>
        <label className="block text-sm font-semibold mb-2">Background Image</label>
        <div className="flex flex-col gap-2">
          <input
            type="url"
            value={config.stats?.backgroundImage || ''}
            onChange={e => updateConfig('stats.backgroundImage', e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
          />
          {config.stats?.backgroundImage && (
            <img
              src={config.stats.backgroundImage}
              alt="Preview"
              className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
            />
          )}
        </div>
      </div>

      {/* Stats Items */}
      <div>
        <label className="block text-sm font-semibold mb-3">Stats Items</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {config.stats?.items?.map((stat, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-3 bg-white border rounded-xl">
              <input
                value={stat.value}
                onChange={e => updateStatItem(idx, 'value', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-center font-bold"
                placeholder="Value"
              />
              <button onClick={() => removeStatItem(idx)} className="text-red-500 hover:text-red-700 flex items-center justify-center gap-1 text-sm">
                <Trash2 size={16} /> Remove
              </button>
            </div>
          ))}
        </div>
        <button onClick={addStatItem} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mt-3">
          <Plus size={18} /> Add Stat Item
        </button>
      </div>

    </div>
  )}
</div>
        {/* 8. Translations */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('translations')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Languages size={20} /> Translations
            </h3>
            {expandedSections.translations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.translations && config.languages?.map(lang => {
            const t = config.i18n?.[lang.code] || {};
            return (
              <div key={lang.code} className="mt-8 p-5 bg-white rounded-2xl border-2 border-purple-100">
                <h4 className="font-bold text-xl mb-5 flex items-center gap-3 border-b pb-3">
                  {lang.flag} {lang.label} <span className="text-sm text-gray-500">({lang.code})</span>
                </h4>

                {/* Nav */}
                <div className="mb-8">
                  <h5 className="font-semibold mb-3 text-blue-700">Navigation</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1">Brand</label>
                      <input value={t.nav?.brand || ''} onChange={e => updateConfig(`i18n.${lang.code}.nav.brand`, e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">CTA</label>
                      <input value={t.nav?.cta || ''} onChange={e => updateConfig(`i18n.${lang.code}.nav.cta`, e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs font-medium mb-2">Link Labels</label>
                    {config.nav?.links?.map(link => (
                      <div key={link.id} className="flex items-center gap-3 mb-2">
                        <span className="w-28 text-gray-500 text-sm font-medium">{link.id}</span>
                        <input
                          value={t.nav?.links?.[link.id] || ''}
                          onChange={e => updateConfig(`i18n.${lang.code}.nav.links.${link.id}`, e.target.value)}
                          className="flex-1 px-4 py-2 border rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hero */}
                <div className="mb-8">
                  <h5 className="font-semibold mb-3 text-blue-700">Hero</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium mb-1">Badge</label>
                      <input value={t.hero?.badge || ''} onChange={e => updateConfig(`i18n.${lang.code}.hero.badge`, e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Headline</label>
                      <input value={t.hero?.headline || ''} onChange={e => updateConfig(`i18n.${lang.code}.hero.headline`, e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium mb-1">Subheadline</label>
                      <textarea value={t.hero?.subheadline || ''} onChange={e => updateConfig(`i18n.${lang.code}.hero.subheadline`, e.target.value)} className="w-full px-4 py-2 border rounded-lg h-24" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">CTA Consultation</label>
                      <input value={t.hero?.ctaConsultation || ''} onChange={e => updateConfig(`i18n.${lang.code}.hero.ctaConsultation`, e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">CTA Apply</label>
                      <input value={t.hero?.ctaApply || ''} onChange={e => updateConfig(`i18n.${lang.code}.hero.ctaApply`, e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                </div>

                {/* Why */}
                <div className="mb-8">
                  <h5 className="font-semibold mb-3 text-blue-700">Why Us</h5>
                  <div>
                    <label className="block text-xs font-medium mb-1">Title</label>
                    <input value={t.why?.title || ''} onChange={e => updateConfig(`i18n.${lang.code}.why.title`, e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs font-medium mb-2">Points</label>
                    {config.why?.pointIcons?.map((icon, i) => (
                      <div key={i} className="flex gap-3 mb-3 items-center">
                        <span className="text-2xl w-8">{icon}</span>
                        <input
                          value={t.why?.points?.[i] || ''}
                          onChange={e => updateConfig(`i18n.${lang.code}.why.points.${i}`, e.target.value)}
                          className="flex-1 px-4 py-2 border rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Services */}
                <div className="mb-8">
                  <h5 className="font-semibold mb-3 text-blue-700">Services</h5>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-medium mb-1">Title</label>
                      <input value={t.services?.title || ''} onChange={e => updateConfig(`i18n.${lang.code}.services.title`, e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">CTA</label>
                      <input value={t.services?.cta || ''} onChange={e => updateConfig(`i18n.${lang.code}.services.cta`, e.target.value)} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div className="space-y-6">
                    {config.services?.items?.map(item => (
                      <div key={item.id} className="border border-dashed border-purple-200 p-4 rounded-xl">
                        <div className="text-xs font-medium text-purple-600 mb-2">{item.id}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1">Title</label>
                            <input
                              value={t.services?.items?.[item.id]?.title || ''}
                              onChange={e => updateConfig(`i18n.${lang.code}.services.items.${item.id}.title`, e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Description</label>
                            <input
                              value={t.services?.items?.[item.id]?.desc || ''}
                              onChange={e => updateConfig(`i18n.${lang.code}.services.items.${item.id}.desc`, e.target.value)}
                              className="w-full px-4 py-2 border rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div>
                  <h5 className="font-semibold mb-3 text-blue-700">Stats</h5>
                  <div>
                    <label className="block text-xs font-medium mb-1">Title</label>
                    <input value={t.stats?.title || ''} onChange={e => updateConfig(`i18n.${lang.code}.stats.title`, e.target.value)} className="w-full px-4 py-2 border rounded-lg mb-4" />
                  </div>
                  <div className="space-y-3">
                    {config.stats?.items?.map((stat, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xl w-8">{stat.icon}</span>
                        <span className="font-medium w-20 text-gray-500">{stat.value}</span>
                        <input
                          value={t.stats?.items?.[i] || ''}
                          onChange={e => updateConfig(`i18n.${lang.code}.stats.items.${i}`, e.target.value)}
                          className="flex-1 px-4 py-2 border rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}