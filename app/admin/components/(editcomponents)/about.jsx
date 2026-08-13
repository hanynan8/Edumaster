'use client';

import { useState, useEffect } from 'react';
import {
  Save, RefreshCw, Loader, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Globe, Languages, Image,
  BookOpen, Star, BarChart2, Target, Eye, Lightbulb, Users
} from 'lucide-react';

const API_BASE_URL = '/api/data';

const DEFAULT_CONFIG = {
  hero: { backgroundImage: '' },
  whoWeAre: { image: '', badge: { value: '' } },
  why: { image: '' },
  stats: {
    backgroundImage: '',
    items: [{ value: '' }, { value: '' }, { value: '' }, { value: '' }]
  },
  i18n: {}
};

export default function AboutAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    images: false,
    stats: false,
    translations: false
  });

  useEffect(() => { fetchConfig(); }, []);

  const showMessage = (message, type = 'success') => {
    setSuccess(type === 'success' ? message : '');
    setError(type === 'error' ? message : '');
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?collection=about`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const data = Array.isArray(result) && result.length > 0 ? result[0] : null;
      setConfig(data || { ...DEFAULT_CONFIG, _id: 'temp' });
    } catch (err) {
      showMessage('Error fetching about data: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const isNew = config._id === 'temp' || !config._id;
      const url = `${API_BASE_URL}?collection=about${isNew ? '' : `&id=${config._id}`}`;
      const method = isNew ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      showMessage('✓ Configuration saved successfully');
      fetchConfig();
    } catch (err) {
      showMessage('Error saving: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = newConfig;
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || current[keys[i]] === null) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Get all language codes from i18n keys
  const languages = config ? Object.keys(config.i18n || {}) : [];

  if (!config) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        {loading ? <Loader className="animate-spin mx-auto" size={48} /> : <p>No data</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-purple-100">
      {/* Header */}
      <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-purple-900">
            <BookOpen size={28} />
            About Page Configuration
          </h2>
          <div className="flex gap-3">
            <button
              onClick={fetchConfig}
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg hover:bg-purple-700"
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

        {/* Images & Media */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('images')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Image size={20} /> Images & Media
            </h3>
            {expandedSections.images ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {expandedSections.images && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hero Background */}
              <div className="p-4 bg-white rounded-lg border-2 border-purple-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hero Background Image</label>
                <input
                  type="url"
                  value={config.hero?.backgroundImage || ''}
                  onChange={e => updateConfig('hero.backgroundImage', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  placeholder="https://..."
                />
                {config.hero?.backgroundImage && (
                  <img src={config.hero.backgroundImage} alt="Hero preview" className="mt-2 w-full h-24 object-cover rounded-lg" />
                )}
              </div>

              {/* Who We Are Image */}
              <div className="p-4 bg-white rounded-lg border-2 border-purple-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Who We Are – Image</label>
                <input
                  type="url"
                  value={config.whoWeAre?.image || ''}
                  onChange={e => updateConfig('whoWeAre.image', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  placeholder="https://..."
                />
                {config.whoWeAre?.image && (
                  <img src={config.whoWeAre.image} alt="Who we are preview" className="mt-2 w-full h-24 object-cover rounded-lg" />
                )}
              </div>

              {/* Why Image */}
              <div className="p-4 bg-white rounded-lg border-2 border-purple-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Why Section – Image</label>
                <input
                  type="url"
                  value={config.why?.image || ''}
                  onChange={e => updateConfig('why.image', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  placeholder="https://..."
                />
                {config.why?.image && (
                  <img src={config.why.image} alt="Why preview" className="mt-2 w-full h-24 object-cover rounded-lg" />
                )}
              </div>

              {/* Stats Background */}
              <div className="p-4 bg-white rounded-lg border-2 border-purple-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stats Background Image</label>
                <input
                  type="url"
                  value={config.stats?.backgroundImage || ''}
                  onChange={e => updateConfig('stats.backgroundImage', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  placeholder="https://..."
                />
                {config.stats?.backgroundImage && (
                  <img src={config.stats.backgroundImage} alt="Stats preview" className="mt-2 w-full h-24 object-cover rounded-lg" />
                )}
              </div>

              {/* Who We Are Badge Value */}
              <div className="p-4 bg-white rounded-lg border-2 border-purple-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Who We Are – Badge Value <span className="text-gray-400 font-normal">(e.g. 5+)</span>
                </label>
                <input
                  type="text"
                  value={config.whoWeAre?.badge?.value || ''}
                  onChange={e => updateConfig('whoWeAre.badge.value', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  placeholder="5+"
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats Values */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('stats')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <BarChart2 size={20} /> Stats Values
              <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {(config.stats?.items || []).length}
              </span>
            </h3>
            {expandedSections.stats ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.stats && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {(config.stats?.items || []).map((item, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border-2 border-blue-100">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Item {idx + 1} Value</label>
                  <input
                    type="text"
                    value={item.value || ''}
                    onChange={e => {
                      const newItems = [...(config.stats?.items || [])];
                      newItems[idx] = { ...newItems[idx], value: e.target.value };
                      updateConfig('stats.items', newItems);
                    }}
                    className="w-full px-3 py-2 border rounded text-center font-bold text-lg"
                    placeholder="10+"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Translations */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('translations')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Languages size={20} /> Translations
              <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{languages.length} langs</span>
            </h3>
            {expandedSections.translations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {expandedSections.translations && languages.map(langCode => {
            const t = config.i18n?.[langCode] || {};
            return (
              <div key={langCode} className="mt-6 p-5 bg-white rounded-xl border-2 border-purple-100">
                <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-800">
                  <Globe size={18} /> {langCode.toUpperCase()}
                </h4>

                <div className="space-y-6">

                  {/* Hero */}
                  <Section title="Hero" icon={<Star size={16} />}>
                    <Field label="Badge" value={t.hero?.badge || ''} onChange={v => updateConfig(`i18n.${langCode}.hero.badge`, v)} />
                    <Field label="Headline" value={t.hero?.headline || ''} onChange={v => updateConfig(`i18n.${langCode}.hero.headline`, v)} />
                    <Field label="Subheadline" value={t.hero?.subheadline || ''} onChange={v => updateConfig(`i18n.${langCode}.hero.subheadline`, v)} textarea />
                  </Section>

                  {/* Who We Are */}
                  <Section title="Who We Are" icon={<Users size={16} />}>
                    <Field label="Label" value={t.whoWeAre?.label || ''} onChange={v => updateConfig(`i18n.${langCode}.whoWeAre.label`, v)} />
                    <Field label="Title" value={t.whoWeAre?.title || ''} onChange={v => updateConfig(`i18n.${langCode}.whoWeAre.title`, v)} />
                    <Field label="Badge Label" value={t.whoWeAre?.badgeLabel || ''} onChange={v => updateConfig(`i18n.${langCode}.whoWeAre.badgeLabel`, v)} />
                    {(t.whoWeAre?.paragraphs || []).map((para, idx) => (
                      <Field
                        key={idx}
                        label={`Paragraph ${idx + 1}`}
                        value={para}
                        onChange={v => {
                          const newParas = [...(t.whoWeAre?.paragraphs || [])];
                          newParas[idx] = v;
                          updateConfig(`i18n.${langCode}.whoWeAre.paragraphs`, newParas);
                        }}
                        textarea
                      />
                    ))}
                  </Section>

                  {/* Mission & Vision */}
                  <Section title="Mission & Vision" icon={<Target size={16} />}>
                    <Field label="Section Label" value={t.mvLabel || ''} onChange={v => updateConfig(`i18n.${langCode}.mvLabel`, v)} />
                    <Field label="Section Title" value={t.mvTitle || ''} onChange={v => updateConfig(`i18n.${langCode}.mvTitle`, v)} />
                    <Field label="Mission Title" value={t.mission?.title || ''} onChange={v => updateConfig(`i18n.${langCode}.mission.title`, v)} />
                    <Field label="Mission Body" value={t.mission?.body || ''} onChange={v => updateConfig(`i18n.${langCode}.mission.body`, v)} textarea />
                    <Field label="Vision Title" value={t.vision?.title || ''} onChange={v => updateConfig(`i18n.${langCode}.vision.title`, v)} />
                    <Field label="Vision Body" value={t.vision?.body || ''} onChange={v => updateConfig(`i18n.${langCode}.vision.body`, v)} textarea />
                  </Section>

                  {/* Why */}
                  <Section title="Why Choose Us" icon={<Lightbulb size={16} />}>
                    <Field label="Label" value={t.why?.label || ''} onChange={v => updateConfig(`i18n.${langCode}.why.label`, v)} />
                    <Field label="Title" value={t.why?.title || ''} onChange={v => updateConfig(`i18n.${langCode}.why.title`, v)} />
                    <Field label="Image Caption" value={t.why?.imageCaption || ''} onChange={v => updateConfig(`i18n.${langCode}.why.imageCaption`, v)} />
                    {(t.why?.points || []).map((point, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                        <p className="text-xs font-bold text-gray-500 uppercase">Point {idx + 1}</p>
                        <Field
                          label="Title"
                          value={point.title || ''}
                          onChange={v => {
                            const newPoints = [...(t.why?.points || [])];
                            newPoints[idx] = { ...newPoints[idx], title: v };
                            updateConfig(`i18n.${langCode}.why.points`, newPoints);
                          }}
                        />
                        <Field
                          label="Description"
                          value={point.desc || ''}
                          onChange={v => {
                            const newPoints = [...(t.why?.points || [])];
                            newPoints[idx] = { ...newPoints[idx], desc: v };
                            updateConfig(`i18n.${langCode}.why.points`, newPoints);
                          }}
                          textarea
                        />
                      </div>
                    ))}
                  </Section>

                  {/* Stats */}
                  <Section title="Stats Section" icon={<BarChart2 size={16} />}>
                    <Field label="Label" value={t.stats?.label || ''} onChange={v => updateConfig(`i18n.${langCode}.stats.label`, v)} />
                    <Field label="Title" value={t.stats?.title || ''} onChange={v => updateConfig(`i18n.${langCode}.stats.title`, v)} />
                    <div className="col-span-2">
                      <p className="text-sm font-semibold text-gray-600 mb-2">Item Labels</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(t.stats?.items || []).map((label, idx) => (
                          <Field
                            key={idx}
                            label={`Item ${idx + 1}`}
                            value={label || ''}
                            onChange={v => {
                              const newItems = [...(t.stats?.items || [])];
                              newItems[idx] = v;
                              updateConfig(`i18n.${langCode}.stats.items`, newItems);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </Section>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Reusable sub-components
function Section({ title, icon, children }) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
      <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
        {icon} {title}
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, textarea }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400 text-sm resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400 text-sm"
        />
      )}
    </div>
  );
}