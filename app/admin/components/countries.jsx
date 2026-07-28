'use client';

import { useState, useEffect } from 'react';
import {
  Save, RefreshCw, Loader, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Globe, Languages, Image,
  BookOpen, Star, BarChart2, Target, Eye, Lightbulb, Users,
  Plus, Trash2
} from 'lucide-react';

const API_BASE_URL = '/api/data';

// Metadata (label + icon) for every possible section across ALL countries.
// Which of these actually render for the selected country is driven by that
// country's own `sections` object in the data, not by a hardcoded list here.
const SECTION_META = {
  educationSystem:       { label: 'Education System',       icon: BookOpen },
  admissionRequirements: { label: 'Admission Requirements', icon: Target },
  costOfLiving:          { label: 'Cost of Living',         icon: Lightbulb },
  partTimeWork:          { label: 'Part-Time Work',         icon: Users },
  visaProcess:           { label: 'Visa Process',           icon: Eye },
  lifeInSpain:           { label: 'Life in Spain',          icon: Star },
  lifeInRomania:         { label: 'Life in Romania',        icon: Star },
  universities:          { label: 'Universities',           icon: BookOpen },
};

// Preferred display order; any section not listed here still renders,
// appended in whatever order it appears in the data.
const SECTION_ORDER = [
  'educationSystem', 'admissionRequirements', 'costOfLiving',
  'partTimeWork', 'visaProcess', 'lifeInSpain', 'lifeInRomania', 'universities',
];

function getSectionKeys(country) {
  if (!country) return [];
  const available = Object.keys(country.sections || {});
  const ordered = SECTION_ORDER.filter(k => available.includes(k));
  const extra = available.filter(k => !SECTION_ORDER.includes(k));
  return [...ordered, ...extra];
}

const DEFAULT_CONFIG = {
  hero: { backgroundImage: '' },
  stats: {
    backgroundImage: '',
    items: [{ value: '' }, { value: '' }, { value: '' }, { value: '' }]
  },
  countries: [
    {
      id: 'spain',
      image: '',
      flag: '',
      color: '',
      ctaHref: '',
      sections: {
        educationSystem: { image: '' },
        admissionRequirements: { image: '' },
        costOfLiving: { image: '' },
        partTimeWork: { image: '' },
        visaProcess: { image: '' },
        lifeInSpain: { image: '' }
      }
    },
    {
      id: 'romania',
      image: '',
      flag: '',
      color: '',
      ctaHref: '',
      sections: {
        educationSystem: { image: '' },
        admissionRequirements: { image: '' },
        costOfLiving: { image: '' },
        partTimeWork: { image: '' },
        visaProcess: { image: '' },
        lifeInRomania: { image: '' },
        universities: { image: '' }
      }
    }
  ],
  i18n: {}
};

export default function CountriesAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    images: false,
    stats: false,
    translations: false
  });
  // Which country's fields are currently shown in the Images & Translations editors.
  const [selectedCountryId, setSelectedCountryId] = useState('spain');

  useEffect(() => { fetchConfig(); }, []);

  const showMessage = (message, type = 'success') => {
    setSuccess(type === 'success' ? message : '');
    setError(type === 'error' ? message : '');
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?collection=countries`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const data = Array.isArray(result) && result.length > 0 ? result[0] : null;
      setConfig(data || { ...DEFAULT_CONFIG, _id: 'temp' });
    } catch (err) {
      showMessage('Error fetching countries data: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const isNew = config._id === 'temp' || !config._id;
      const url = `${API_BASE_URL}?collection=countries${isNew ? '' : `&id=${config._id}`}`;
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
  const countries = config?.countries || [];
  const countryIdx = countries.findIndex(c => c.id === selectedCountryId);
  const selectedCountry = countryIdx >= 0 ? countries[countryIdx] : null;
  const sectionKeys = getSectionKeys(selectedCountry);

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
            <Globe size={28} />
            Countries Page Configuration
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

        {/* Country selector — drives which country's fields show in Images & Translations below */}
        <div className="flex items-center gap-2">
          {countries.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCountryId(c.id)}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                selectedCountryId === c.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-purple-700 border-2 border-purple-200 hover:bg-purple-50'
              }`}
            >
              {c.id.charAt(0).toUpperCase() + c.id.slice(1)}
            </button>
          ))}
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
              <span className="text-sm bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                 {selectedCountryId}
              </span>
            </h3>
            {expandedSections.images ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {expandedSections.images && selectedCountry && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hero Background (global, shared across all countries) */}
              <div className="p-4 bg-white rounded-lg border-2 border-purple-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hero Background Image (global)</label>
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

              {/* Stats Background (global) */}
              <div className="p-4 bg-white rounded-lg border-2 border-purple-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stats Background Image (global)</label>
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

              {/* Country Main Image */}
              <div className="p-4 bg-white rounded-lg border-2 border-purple-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Country Main Image ({selectedCountryId})</label>
                <input
                  type="url"
                  value={selectedCountry.image || ''}
                  onChange={e => updateConfig(`countries.${countryIdx}.image`, e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  placeholder="https://..."
                />
                {selectedCountry.image && (
                  <img src={selectedCountry.image} alt="Country preview" className="mt-2 w-full h-24 object-cover rounded-lg" />
                )}
              </div>


              {/* Country Color */}
              <div className="p-4 bg-white rounded-lg border-2 border-purple-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Country Brand Color</label>
                <input
                  type="text"
                  value={selectedCountry.color || ''}
                  onChange={e => updateConfig(`countries.${countryIdx}.color`, e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  placeholder="#10b981"
                />
                {selectedCountry.color && (
                  <div
                    className="mt-3 w-12 h-12 rounded-xl border-2 border-gray-300 shadow-inner"
                    style={{ backgroundColor: selectedCountry.color }}
                  />
                )}
              </div>

              {/* CTA Href */}
              <div className="p-4 bg-white rounded-lg border-2 border-purple-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">CTA Link</label>
                <input
                  type="text"
                  value={selectedCountry.ctaHref || ''}
                  onChange={e => updateConfig(`countries.${countryIdx}.ctaHref`, e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                  placeholder="/contact"
                />
              </div>

              {/* One image field per section this country actually has */}
              {sectionKeys.map(key => {
                const meta = SECTION_META[key] || { label: key, icon: Image };
                const Icon = meta.icon;
                const imagePath = `countries.${countryIdx}.sections.${key}.image`;
                const imageValue = selectedCountry.sections?.[key]?.image || '';
                return (
                  <div key={key} className="p-4 bg-white rounded-lg border-2 border-purple-100">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Icon size={14} /> {meta.label} – Image
                    </label>
                    <input
                      type="url"
                      value={imageValue}
                      onChange={e => updateConfig(imagePath, e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500"
                      placeholder="https://..."
                    />
                    {imageValue && (
                      <img src={imageValue} alt={`${meta.label} preview`} className="mt-2 w-full h-24 object-cover rounded-lg" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats Values (global) */}
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
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
               {selectedCountryId}
              </span>
            </h3>
            {expandedSections.translations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {expandedSections.translations && languages.map(langCode => {
            const t = config.i18n?.[langCode] || {};
            const countryT = t.countries?.[selectedCountryId] || {};
            return (
              <div key={langCode} className="mt-6 p-5 bg-white rounded-xl border-2 border-purple-100">
                <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-purple-800">
                  <Globe size={18} /> {langCode.toUpperCase()}
                </h4>

                <div className="space-y-6">

                  {/* Hero (global, not per-country) */}
                  <Section title="Hero" icon={<Star size={16} />}>
                    <Field label="Badge" value={t.hero?.badge || ''} onChange={v => updateConfig(`i18n.${langCode}.hero.badge`, v)} />
                    <Field label="Headline" value={t.hero?.headline || ''} onChange={v => updateConfig(`i18n.${langCode}.hero.headline`, v)} />
                    <Field label="Subheadline" value={t.hero?.subheadline || ''} onChange={v => updateConfig(`i18n.${langCode}.hero.subheadline`, v)} textarea />
                  </Section>

                  {/* Country Info */}
                  <Section title={`${selectedCountryId.charAt(0).toUpperCase() + selectedCountryId.slice(1)} Info`} icon={<Globe size={16} />}>
                    <Field label="Name" value={countryT.name || ''} onChange={v => updateConfig(`i18n.${langCode}.countries.${selectedCountryId}.name`, v)} />
                    <Field label="Tagline" value={countryT.tagline || ''} onChange={v => updateConfig(`i18n.${langCode}.countries.${selectedCountryId}.tagline`, v)} />
                    <Field label="Description" value={countryT.desc || ''} onChange={v => updateConfig(`i18n.${langCode}.countries.${selectedCountryId}.desc`, v)} textarea />
                    <Field label="CTA Text" value={countryT.cta || ''} onChange={v => updateConfig(`i18n.${langCode}.countries.${selectedCountryId}.cta`, v)} />
                  </Section>

                  {/* One editable section per key this country actually has */}
                  {sectionKeys.map(key => {
                    const meta = SECTION_META[key] || { label: key, icon: BookOpen };
                    const Icon = meta.icon;
                    const sectionT = countryT[key] || {};
                    const basePath = `i18n.${langCode}.countries.${selectedCountryId}.${key}`;

                    if (key === 'universities') {
                      return (
                        <Section key={key} title={meta.label} icon={<Icon size={16} />}>
                          <Field label="Label" value={sectionT.label || ''} onChange={v => updateConfig(`${basePath}.label`, v)} />
                          <Field label="Title" value={sectionT.title || ''} onChange={v => updateConfig(`${basePath}.title`, v)} />
                          <Field label="Description" value={sectionT.desc || ''} onChange={v => updateConfig(`${basePath}.desc`, v)} textarea />
                          <div className="col-span-2">
                            <ListField
                              label="Public Universities — Section Label"
                              labelValue={sectionT.publicUniversitiesLabel || ''}
                              onLabelChange={v => updateConfig(`${basePath}.publicUniversitiesLabel`, v)}
                              items={sectionT.publicUniversities || []}
                              onItemsChange={items => updateConfig(`${basePath}.publicUniversities`, items)}
                              itemPlaceholder="University name"
                            />
                          </div>
                          <div className="col-span-2">
                            <ListField
                              label="Private Universities — Section Label"
                              labelValue={sectionT.privateUniversitiesLabel || ''}
                              onLabelChange={v => updateConfig(`${basePath}.privateUniversitiesLabel`, v)}
                              items={sectionT.privateUniversities || []}
                              onItemsChange={items => updateConfig(`${basePath}.privateUniversities`, items)}
                              itemPlaceholder="University name"
                            />
                          </div>
                        </Section>
                      );
                    }

                    return (
                      <Section key={key} title={meta.label} icon={<Icon size={16} />}>
                        <Field label="Label" value={sectionT.label || ''} onChange={v => updateConfig(`${basePath}.label`, v)} />
                        <Field label="Title" value={sectionT.title || ''} onChange={v => updateConfig(`${basePath}.title`, v)} />
                        <Field label="Description" value={sectionT.desc || ''} onChange={v => updateConfig(`${basePath}.desc`, v)} textarea />
                        <div className="col-span-2">
                          <PointsField
                            label="Points"
                            items={sectionT.points || []}
                            onItemsChange={items => updateConfig(`${basePath}.points`, items)}
                          />
                        </div>
                      </Section>
                    );
                  })}

                  {/* Stats (global) */}
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

                  {/* Navigation (global — shared labels used by both countries) */}
                  <Section title="Navigation Menu" icon={<ChevronDown size={16} />}>
                    <Field label="Education System" value={t.nav?.educationSystem || ''} onChange={v => updateConfig(`i18n.${langCode}.nav.educationSystem`, v)} />
                    <Field label="Admission Requirements" value={t.nav?.admissionRequirements || ''} onChange={v => updateConfig(`i18n.${langCode}.nav.admissionRequirements`, v)} />
                    <Field label="Cost of Living" value={t.nav?.costOfLiving || ''} onChange={v => updateConfig(`i18n.${langCode}.nav.costOfLiving`, v)} />
                    <Field label="Part-Time Work" value={t.nav?.partTimeWork || ''} onChange={v => updateConfig(`i18n.${langCode}.nav.partTimeWork`, v)} />
                    <Field label="Visa Process" value={t.nav?.visaProcess || ''} onChange={v => updateConfig(`i18n.${langCode}.nav.visaProcess`, v)} />
                    <Field label="Life in Spain" value={t.nav?.lifeInSpain || ''} onChange={v => updateConfig(`i18n.${langCode}.nav.lifeInSpain`, v)} />
                    <Field label="Life in Romania" value={t.nav?.lifeInRomania || ''} onChange={v => updateConfig(`i18n.${langCode}.nav.lifeInRomania`, v)} />
                    <Field label="Universities" value={t.nav?.universities || ''} onChange={v => updateConfig(`i18n.${langCode}.nav.universities`, v)} />
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

// Editable list of bullet points, with add/remove — used for the regular
// `points` arrays (education system, admission requirements, etc).
function PointsField({ label, items, onItemsChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-600">{label}</p>
        <button
          type="button"
          onClick={() => onItemsChange([...(items || []), ''])}
          className="flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-lg hover:bg-purple-200"
        >
          <Plus size={12} /> Add Point
        </button>
      </div>
      <div className="space-y-2">
        {(items || []).map((point, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <textarea
              value={point || ''}
              onChange={e => {
                const newItems = [...items];
                newItems[idx] = e.target.value;
                onItemsChange(newItems);
              }}
              rows={2}
              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400 text-sm resize-none"
            />
            <button
              type="button"
              onClick={() => onItemsChange(items.filter((_, i) => i !== idx))}
              className="mt-1 p-2 text-red-500 hover:bg-red-50 rounded-lg"
              title="Remove point"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {(!items || items.length === 0) && (
          <p className="text-xs text-gray-400 italic">No points yet — click "Add Point" to start.</p>
        )}
      </div>
    </div>
  );
}

// Editable named list (used for Public/Private Universities): a section
// label plus a list of plain-text entries, with add/remove.
function ListField({ label, labelValue, onLabelChange, items, onItemsChange, itemPlaceholder }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
      <Field label={label} value={labelValue} onChange={onLabelChange} />
      <div className="flex items-center justify-between mt-3 mb-2">
        <p className="text-xs font-semibold text-gray-500">Entries</p>
        <button
          type="button"
          onClick={() => onItemsChange([...(items || []), ''])}
          className="flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-lg hover:bg-purple-200"
        >
          <Plus size={12} /> Add Entry
        </button>
      </div>
      <div className="space-y-2">
        {(items || []).map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={entry || ''}
              onChange={e => {
                const newItems = [...items];
                newItems[idx] = e.target.value;
                onItemsChange(newItems);
              }}
              placeholder={itemPlaceholder}
              className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-purple-400 text-sm"
            />
            <button
              type="button"
              onClick={() => onItemsChange(items.filter((_, i) => i !== idx))}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              title="Remove entry"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {(!items || items.length === 0) && (
          <p className="text-xs text-gray-400 italic">No entries yet — click "Add Entry" to start.</p>
        )}
      </div>
    </div>
  );
}