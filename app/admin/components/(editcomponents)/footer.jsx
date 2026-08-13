'use client';

import { useState, useEffect } from 'react';
import {
  Plus, Trash2, Save, RefreshCw, FileText,
  ChevronDown, ChevronUp, Loader, AlertCircle, CheckCircle,
  Link2, Globe, Languages
} from 'lucide-react';

const API_BASE_URL = '/api/data';

export default function FooterAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    contact: false,
    socials: false,
    quickLinks: false,
    legalLinks: false,
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
      const res = await fetch(`${API_BASE_URL}?collection=footer`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const result = await res.json();
      let data = Array.isArray(result) && result.length > 0 ? result[0] : null;

      if (!data) {
        data = {
          _id: 'temp',
          contact: { address: 'Madrid, Spain — Calle Gran Vía 28, 28013', phone: '+34 600 000 000', email: 'info@edumaster.com' },
          socials: [],
          quickLinks: [],
          legalLinks: [],
          languages: [],
          i18n: {}
        };
      }

      // ضمان الهيكل
      if (!data.contact) data.contact = { address: '', phone: '', email: '' };
      if (!data.socials) data.socials = [];
      if (!data.quickLinks) data.quickLinks = [];
      if (!data.legalLinks) data.legalLinks = [];
      if (!data.languages) data.languages = [];
      if (!data.i18n) data.i18n = {};

      setConfig(data);
    } catch (err) {
      showMessage('خطأ في تحميل بيانات الـ Footer: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);

    // ← نفس المنطق اللي شغال في NavbarAdmin
    const isNew = !config._id || config._id === 'temp';
    const url = `${API_BASE_URL}?collection=footer${isNew ? '' : `&id=${config._id}`}`;
    const method = isNew ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      showMessage('✅ تم حفظ الإعدادات بنجاح');
      fetchConfig(); // إعادة تحميل للحصول على _id الحقيقي
    } catch (err) {
      showMessage('❌ خطأ في الحفظ: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

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

  // ====================== Socials ======================
  const addSocial = () => {
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.socials = [...(updated.socials || []), { name: '', href: 'https://' }];
      return updated;
    });
  };

  const updateSocial = (index, field, value) => {
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.socials[index][field] = value;
      return updated;
    });
  };

  const removeSocial = (index) => {
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.socials.splice(index, 1);
      return updated;
    });
  };

  // ====================== Quick Links ======================
  const addQuickLink = () => {
    const newId = `link_${Date.now()}`;
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.quickLinks = [...(updated.quickLinks || []), { id: newId, href: '/' }];

      Object.keys(updated.i18n || {}).forEach(code => {
        if (!updated.i18n[code]) updated.i18n[code] = {};
        if (!updated.i18n[code].quickLinks) updated.i18n[code].quickLinks = {};
        updated.i18n[code].quickLinks[newId] = '';
      });
      return updated;
    });
  };

  const updateQuickLink = (index, field, value) => {
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.quickLinks[index][field] = value;
      return updated;
    });
  };

  const removeQuickLink = (index) => {
    setConfig(prev => {
      if (!prev?.quickLinks?.[index]) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      const linkId = updated.quickLinks[index].id;
      updated.quickLinks.splice(index, 1);

      Object.keys(updated.i18n || {}).forEach(code => {
        if (updated.i18n[code]?.quickLinks) delete updated.i18n[code].quickLinks[linkId];
      });
      return updated;
    });
  };

  // ====================== Legal Links ======================
  const addLegalLink = () => {
    const newId = `legal_${Date.now()}`;
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.legalLinks = [...(updated.legalLinks || []), { id: newId, href: '/' }];

      Object.keys(updated.i18n || {}).forEach(code => {
        if (!updated.i18n[code]) updated.i18n[code] = {};
        if (!updated.i18n[code].legalLinks) updated.i18n[code].legalLinks = {};
        updated.i18n[code].legalLinks[newId] = '';
      });
      return updated;
    });
  };

  const updateLegalLink = (index, field, value) => {
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.legalLinks[index][field] = value;
      return updated;
    });
  };

  const removeLegalLink = (index) => {
    setConfig(prev => {
      if (!prev?.legalLinks?.[index]) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      const linkId = updated.legalLinks[index].id;
      updated.legalLinks.splice(index, 1);

      Object.keys(updated.i18n || {}).forEach(code => {
        if (updated.i18n[code]?.legalLinks) delete updated.i18n[code].legalLinks[linkId];
      });
      return updated;
    });
  };

  // ====================== Languages ======================
  const addLanguage = () => {
    const newCode = `lang_${Date.now()}`;
    setConfig(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated.languages = [...(updated.languages || []), { code: newCode, label: 'New Language', flag: '🌐' }];

      updated.i18n[newCode] = {
        brand: '', about: '', rights: '', quickLinksTitle: '', contactTitle: '',
        newsletterTitle: '', newsletterDesc: '', newsletterPlaceholder: '',
        newsletterSuccess: '', langTitle: '', quickLinks: {}, legalLinks: {}
      };

      updated.quickLinks?.forEach(link => {
        updated.i18n[newCode].quickLinks[link.id] = '';
      });
      updated.legalLinks?.forEach(link => {
        updated.i18n[newCode].legalLinks[link.id] = '';
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
        updated.i18n[value] = updated.i18n[oldCode] || {};
        delete updated.i18n[oldCode];
      }
      return updated;
    });
  };

  const removeLanguage = (index) => {
    setConfig(prev => {
      if (!prev?.languages?.[index]) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      const langCode = updated.languages[index].code;
      updated.languages.splice(index, 1);
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
            <FileText size={28} />
            Footer Configuration
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
        {/* Contact Information */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('contact')}>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FileText size={22} /> Contact Information
            </h3>
            {expandedSections.contact ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          </div>
          {expandedSections.contact && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Address</label>
                <input type="text" value={config.contact?.address || ''} onChange={e => updateConfig('contact.address', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Phone</label>
                <input type="text" value={config.contact?.phone || ''} onChange={e => updateConfig('contact.phone', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input type="email" value={config.contact?.email || ''} onChange={e => updateConfig('contact.email', e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 outline-none" />
              </div>
            </div>
          )}
        </div>

        {/* Social Media */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('socials')}>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Link2 size={22} /> Social Media <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{config.socials?.length || 0}</span>
            </h3>
            {expandedSections.socials ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          </div>
          {expandedSections.socials && (
            <div className="mt-6 space-y-3">
              {config.socials?.map((social, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-blue-100">
                  <input value={social.name} onChange={e => updateSocial(idx, 'name', e.target.value)} className="w-40 px-4 py-3 border border-gray-300 rounded-xl" placeholder="facebook" />
                  <input value={social.href} onChange={e => updateSocial(idx, 'href', e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl" placeholder="https://..." />
                  <button onClick={() => removeSocial(idx)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 size={20} /></button>
                </div>
              ))}
              <button onClick={addSocial} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mt-4 font-medium"><Plus size={20} /> Add New Social</button>
            </div>
          )}
        </div>

        {/* Quick Links */}
        {/* <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('quickLinks')}>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Link2 size={22} /> Quick Links <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{config.quickLinks?.length || 0}</span>
            </h3>
            {expandedSections.quickLinks ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          </div>
          {expandedSections.quickLinks && (
            <div className="mt-6 space-y-3">
              {config.quickLinks?.map((link, idx) => (
                <div key={link.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-blue-100">
                  <input value={link.id} onChange={e => updateQuickLink(idx, 'id', e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl" placeholder="Link ID" />
                  <input value={link.href} onChange={e => updateQuickLink(idx, 'href', e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl" placeholder="/path" />
                  <button onClick={() => removeQuickLink(idx)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 size={20} /></button>
                </div>
              ))}
              <button onClick={addQuickLink} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mt-4 font-medium"><Plus size={20} /> Add New Quick Link</button>
            </div>
          )}
        </div> */}

        {/* Legal Links
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('legalLinks')}>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Link2 size={22} /> Legal Links <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{config.legalLinks?.length || 0}</span>
            </h3>
            {expandedSections.legalLinks ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          </div>
          {expandedSections.legalLinks && (
            <div className="mt-6 space-y-3">
              {config.legalLinks?.map((link, idx) => (
                <div key={link.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-blue-100">
                  <input value={link.id} onChange={e => updateLegalLink(idx, 'id', e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl" placeholder="Link ID" />
                  <input value={link.href} onChange={e => updateLegalLink(idx, 'href', e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl" placeholder="/path" />
                  <button onClick={() => removeLegalLink(idx)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 size={20} /></button>
                </div>
              ))}
              <button onClick={addLegalLink} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mt-4 font-medium"><Plus size={20} /> Add New Legal Link</button>
            </div>
          )}
        </div> */}

        {/* Languages
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('languages')}>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Globe size={22} /> Languages <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{config.languages?.length || 0}</span>
            </h3>
            {expandedSections.languages ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          </div>
          {expandedSections.languages && (
            <div className="mt-6 space-y-3">
              {config.languages?.map((lang, idx) => (
                <div key={lang.code} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-green-100">
                  <input value={lang.flag} onChange={e => updateLanguage(idx, 'flag', e.target.value)} className="w-16 px-4 py-3 border border-gray-300 rounded-xl text-center" placeholder="🇬🇧" />
                  <input value={lang.code} onChange={e => updateLanguage(idx, 'code', e.target.value)} className="w-28 px-4 py-3 border border-gray-300 rounded-xl" placeholder="en" />
                  <input value={lang.label} onChange={e => updateLanguage(idx, 'label', e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl" placeholder="Language Name" />
                  <button onClick={() => removeLanguage(idx)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 size={20} /></button>
                </div>
              ))}
              <button onClick={addLanguage} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mt-4 font-medium"><Plus size={20} /> Add New Language</button>
            </div>
          )}
        </div> */}

        {/* Translations */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('translations')}>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Languages size={22} /> Translations
            </h3>
            {expandedSections.translations ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          </div>

          {expandedSections.translations && config.languages?.map(lang => {
            const t = config.i18n?.[lang.code] || {};
            return (
              <div key={lang.code} className="mt-6 p-5 bg-white rounded-2xl border border-purple-100">
                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                  {lang.flag} {lang.label} <span className="text-sm text-gray-500">({lang.code})</span>
                </h4>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Brand Name</label>
                      <input value={t.brand || ''} onChange={e => updateConfig(`i18n.${lang.code}.brand`, e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Copyright / Rights</label>
                      <input value={t.rights || ''} onChange={e => updateConfig(`i18n.${lang.code}.rights`, e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1">About Text</label>
                    <textarea value={t.about || ''} onChange={e => updateConfig(`i18n.${lang.code}.about`, e.target.value)} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-y" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">Quick Links Title</label>
                      <input value={t.quickLinksTitle || ''} onChange={e => updateConfig(`i18n.${lang.code}.quickLinksTitle`, e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Contact Title</label>
                      <input value={t.contactTitle || ''} onChange={e => updateConfig(`i18n.${lang.code}.contactTitle`, e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Languages Title</label>
                      <input value={t.langTitle || ''} onChange={e => updateConfig(`i18n.${lang.code}.langTitle`, e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                    </div>
                  </div>

                  <div className="bg-purple-50 p-5 rounded-2xl">
                    <h5 className="font-semibold mb-4 text-purple-700">Newsletter Settings</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold mb-1">Newsletter Title</label>
                        <input value={t.newsletterTitle || ''} onChange={e => updateConfig(`i18n.${lang.code}.newsletterTitle`, e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Newsletter Description</label>
                        <textarea value={t.newsletterDesc || ''} onChange={e => updateConfig(`i18n.${lang.code}.newsletterDesc`, e.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-y" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Placeholder</label>
                        <input value={t.newsletterPlaceholder || ''} onChange={e => updateConfig(`i18n.${lang.code}.newsletterPlaceholder`, e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">Success Message</label>
                        <input value={t.newsletterSuccess || ''} onChange={e => updateConfig(`i18n.${lang.code}.newsletterSuccess`, e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3">Quick Links Labels</label>
                    <div className="space-y-3">
                      {config.quickLinks?.map(link => (
                        <div key={link.id} className="flex items-center gap-3">
                          <span className="w-40 text-gray-600 text-sm font-medium">{link.id}:</span>
                          <input value={t.quickLinks?.[link.id] || ''} onChange={e => updateConfig(`i18n.${lang.code}.quickLinks.${link.id}`, e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-3">Legal Links Labels</label>
                    <div className="space-y-3">
                      {config.legalLinks?.map(link => (
                        <div key={link.id} className="flex items-center gap-3">
                          <span className="w-40 text-gray-600 text-sm font-medium">{link.id}:</span>
                          <input value={t.legalLinks?.[link.id] || ''} onChange={e => updateConfig(`i18n.${lang.code}.legalLinks.${link.id}`, e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl" />
                        </div>
                      ))}
                    </div>
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