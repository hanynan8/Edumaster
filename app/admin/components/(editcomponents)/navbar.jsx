'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Save, RefreshCw, Navigation,
  ChevronDown, ChevronUp, Loader, AlertCircle, CheckCircle,
  Image, Link2, Globe, Languages, FileText
} from 'lucide-react';

const API_BASE_URL = '/api/data';

const DEFAULT_CONFIG = {
  ctaHref: '/consultation',
  logoHref: '',
  links: [],
  languages: [],
  i18n: {}
};

export default function NavbarAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    links: false,
    languages: false,
    translations: false
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const showMessage = (message, type = 'success') => {
    if (type === 'success') setSuccess(message);
    else setError(message);
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 4000);
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}?collection=navbar`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const result = await res.json();
      let data = Array.isArray(result) && result.length > 0 ? result[0] : null;

      if (!data) {
        data = {
          ...DEFAULT_CONFIG,
          _id: 'temp',
          links: [
            { id: 'about', href: '/about' },
            { id: 'services', href: '/services' },
            { id: 'courses', href: '/courses' }
          ],
          languages: [
            { code: 'en', label: 'English', flag: '🇬🇧' },
            { code: 'ar', label: 'العربية', flag: '🇸🇦' }
          ],
          i18n: {
            en: { brand: 'Edumaster', cta: 'Get Started', links: {} },
            ar: { brand: 'إيدوماستر', cta: 'ابدأ الآن', links: {} }
          }
        };

        // تهيئة ترجمات الروابط الافتراضية
        data.links.forEach(link => {
          data.i18n.en.links[link.id] = link.id.charAt(0).toUpperCase() + link.id.slice(1);
          data.i18n.ar.links[link.id] = '';
        });
      }

      setConfig(data);
    } catch (err) {
      showMessage('خطأ في تحميل بيانات الـ Navbar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);

    const isNew = !config._id || config._id === 'temp';
    const url = `${API_BASE_URL}?collection=navbar${isNew ? '' : `&id=${config._id}`}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      showMessage('✅ تم حفظ الإعدادات بنجاح');
      fetchConfig(); // للحصول على الـ _id الحقيقي
    } catch (err) {
      showMessage('❌ خطأ في الحفظ: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // تحديث آمن للـ config
  const updateConfig = (path, value) => {
    setConfig(prev => {
      if (!prev) return prev;
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

  // ====================== Links ======================
  const addLink = () => {
    const newId = `link_${Date.now()}`;
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const newLink = { id: newId, href: '/' };
      updated.links = [...(updated.links || []), newLink];

      // إضافة ترجمة فارغة لكل لغة
      if (updated.languages) {
        updated.languages.forEach(lang => {
          if (!updated.i18n[lang.code]) updated.i18n[lang.code] = { brand: '', cta: '', links: {} };
          updated.i18n[lang.code].links[newId] = '';
        });
      }
      return updated;
    });
  };

  const updateLink = (index, field, value) => {
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.links[index][field] = value;
      return updated;
    });
  };

  const removeLink = (index) => {
    const linkId = config.links[index].id;
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.links = updated.links.filter((_, i) => i !== index);

      // حذف الترجمة من كل اللغات
      if (updated.languages) {
        updated.languages.forEach(lang => {
          if (updated.i18n[lang.code]?.links) {
            delete updated.i18n[lang.code].links[linkId];
          }
        });
      }
      return updated;
    });
  };

  // ====================== Languages ======================
  const addLanguage = () => {
    const newCode = `lang_${Date.now()}`;
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const newLang = { code: newCode, label: 'New Language', flag: '🌐' };
      updated.languages = [...(updated.languages || []), newLang];
      updated.i18n[newCode] = { brand: '', cta: '', links: {} };

      // تهيئة ترجمات الروابط
      updated.links.forEach(link => {
        updated.i18n[newCode].links[link.id] = '';
      });
      return updated;
    });
  };

  const updateLanguage = (index, field, value) => {
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const oldCode = updated.languages[index].code;
      updated.languages[index][field] = value;

      if (field === 'code' && oldCode !== value) {
        updated.i18n[value] = updated.i18n[oldCode] || { brand: '', cta: '', links: {} };
        delete updated.i18n[oldCode];
      }
      return updated;
    });
  };

  const removeLanguage = (index) => {
    const langCode = config.languages[index].code;
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.languages = updated.languages.filter((_, i) => i !== index);
      delete updated.i18n[langCode];
      return updated;
    });
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
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-blue-900">
            <Navigation size={28} />
            Navbar Configuration
          </h2>
          <div className="flex gap-3">
            <button
              onClick={fetchConfig}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={saveConfig}
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2.5 rounded-xl font-medium"
            >
              {loading ? <Loader className="animate-spin" size={18} /> : <Save size={18} />}
              Save All
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {(success || error) && (
        <div className={`mx-6 mt-4 px-6 py-4 rounded-2xl flex items-center gap-3 text-white ${success ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {success ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          <span className="font-medium">{success || error}</span>
        </div>
      )}

      <div className="p-6 space-y-8">
        {/* ==================== Basic Settings ==================== */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200">
          <h3 className="text-xl font-bold mb-5 flex items-center gap-2">
            <FileText size={22} /> Basic Settings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Logo URL</label>
              <input
                type="url"
                value={config.logoHref || ''}
                onChange={e => updateConfig('logoHref', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none"
                placeholder="https://..."
              />
              {config.logoHref && (
                <img src={config.logoHref} alt="logo preview" className="mt-3 h-12 object-contain border rounded-lg" />
              )}
            </div>
          </div>
        </div>

        {/* ==================== Translations ==================== */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('translations')}>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Languages size={22} /> Translations
            </h3>
            {expandedSections.translations ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          </div>

          {expandedSections.translations && config.languages?.map(lang => {
            const t = config.i18n?.[lang.code] || { brand: '', cta: '', links: {} };
            return (
              <div key={lang.code} className="mt-6 p-5 bg-white rounded-2xl border border-purple-100">
                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                  {lang.flag} {lang.label} <span className="text-sm text-gray-500">({lang.code})</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Brand Name</label>
                    <input
                      value={t.brand || ''}
                      onChange={e => updateConfig(`i18n.${lang.code}.brand`, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">CTA Button Text</label>
                    <input
                      value={t.cta || ''}
                      onChange={e => updateConfig(`i18n.${lang.code}.cta`, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-3">Link Labels</label>
                  <div className="space-y-3">
                    {config.links?.map(link => (
                      <div key={link.id} className="flex items-center gap-3">
                        <span className="w-32 text-gray-600 text-sm font-medium">{link.id}:</span>
                        <input
                          value={t.links?.[link.id] || ''}
                          onChange={e => updateConfig(`i18n.${lang.code}.links.${link.id}`, e.target.value)}
                          placeholder={`ترجمة ${link.id}`}
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl"
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