'use client';

import { useState, useEffect } from 'react';
import {
  Save, RefreshCw, Loader, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Globe, Languages,
  Phone, Mail, Star, Tag, MessageSquare,
  Settings, Plus, Trash2, Lightbulb
} from 'lucide-react';

const API_BASE_URL = '/api/data';

const DEFAULT_CONFIG = {
  contact: {
    email: '',
    whatsappNumber: '',
    whatsappDisplay: '',
    formEndpoint: '/api/contact',
  },
  i18n: {},
};

export default function ContactAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    contact: false,
    translations: false,
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
      const response = await fetch(`${API_BASE_URL}?collection=contact`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const data = Array.isArray(result) && result.length > 0 ? result[0] : null;
      setConfig(data || { ...DEFAULT_CONFIG, _id: 'temp' });
    } catch (err) {
      showMessage('Error fetching contact data: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const isNew = config._id === 'temp' || !config._id;
      const url = `${API_BASE_URL}?collection=contact${isNew ? '' : `&id=${config._id}`}`;
      const method = isNew ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      showMessage('✓ Contact configuration saved successfully');
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

  // Service options helpers
  const getServiceOptions = (langCode) =>
    config?.i18n?.[langCode]?.form?.serviceOptions || [];

  const updateServiceOption = (langCode, idx, field, value) => {
    const opts = [...getServiceOptions(langCode)];
    opts[idx] = { ...opts[idx], [field]: value };
    updateConfig(`i18n.${langCode}.form.serviceOptions`, opts);
  };

  const addServiceOption = (langCode) => {
    const opts = [...getServiceOptions(langCode), { value: '', label: '' }];
    updateConfig(`i18n.${langCode}.form.serviceOptions`, opts);
  };

  const removeServiceOption = (langCode, idx) => {
    const opts = getServiceOptions(langCode).filter((_, i) => i !== idx);
    updateConfig(`i18n.${langCode}.form.serviceOptions`, opts);
  };

  const languages = config ? Object.keys(config.i18n || {}) : [];

  if (!config) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        {loading ? <Loader className="animate-spin mx-auto" size={48} /> : <p>No data</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-teal-100">

      {/* ── Header ── */}
      <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-teal-900">
            <MessageSquare size={28} /> Contact Page Configuration
          </h2>
          <div className="flex gap-3">
            <button
              onClick={fetchConfig}
              className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg hover:bg-teal-700"
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

      {/* ── Messages ── */}
      {(success || error) && (
        <div className={`mx-6 mt-4 px-6 py-4 rounded-xl flex items-center gap-3 ${success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {success ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          <span className="font-medium">{success || error}</span>
        </div>
      )}

      <div className="p-6 space-y-6">

        {/* ══════════════════════════════════════════════════
            SECTION 1 — Contact Details (global)
        ══════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('contact')}
          >
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Settings size={20} /> Global Contact Settings
            </h3>
            {expandedSections.contact ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {expandedSections.contact && (
            <div className="mt-5">
              <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-700 flex items-start gap-2">
                <Lightbulb size={14} className="mt-0.5 shrink-0" />
                <span>
                  البيانات دي مشتركة في كل اللغات — الإيميل ورقم الواتساب بيظهروا في كل صفحة Contact بغض النظر عن اللغة.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Email */}
                <div className="p-4 bg-white rounded-lg border-2 border-teal-100">
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Mail size={15} /> Email Address
                  </label>
                  <input
                    type="email"
                    value={config.contact?.email || ''}
                    onChange={e => updateConfig('contact.email', e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-teal-500 text-sm"
                    placeholder="info@example.com"
                  />
                </div>

                {/* WhatsApp Number (raw) */}
                <div className="p-4 bg-white rounded-lg border-2 border-teal-100">
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Phone size={15} /> WhatsApp Number <span className="text-gray-400 font-normal text-xs">(digits only, no +)</span>
                  </label>
                  <input
                    type="text"
                    value={config.contact?.whatsappNumber || ''}
                    onChange={e => updateConfig('contact.whatsappNumber', e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-teal-500 text-sm"
                    placeholder="34600000000"
                  />
                </div>

                {/* WhatsApp Display */}
                <div className="p-4 bg-white rounded-lg border-2 border-teal-100">
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Phone size={15} /> WhatsApp Display Text <span className="text-gray-400 font-normal text-xs">(shown to user)</span>
                  </label>
                  <input
                    type="text"
                    value={config.contact?.whatsappDisplay || ''}
                    onChange={e => updateConfig('contact.whatsappDisplay', e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-teal-500 text-sm"
                    placeholder="+34 600 000 000"
                  />
                </div>

                {/* Form Endpoint */}
                <div className="p-4 bg-white rounded-lg border-2 border-teal-100">
                  <label className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Settings size={15} /> Form Endpoint <span className="text-gray-400 font-normal text-xs">(API route)</span>
                  </label>
                  <input
                    type="text"
                    value={config.contact?.formEndpoint || ''}
                    onChange={e => updateConfig('contact.formEndpoint', e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-teal-500 text-sm"
                    placeholder="/api/contact"
                  />
                </div>

              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════
            SECTION 2 — Translations
        ══════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div
            className="flex justify-between items-center cursor-pointer"
            onClick={() => toggleSection('translations')}
          >
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Languages size={20} /> Translations
              <span className="text-sm bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                {languages.length} langs
              </span>
            </h3>
            {expandedSections.translations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {expandedSections.translations && languages.map(langCode => {
            const t = config.i18n?.[langCode] || {};

            return (
              <div key={langCode} className="mt-6 p-5 bg-white rounded-xl border-2 border-teal-100">
                <h4 className="font-bold text-lg mb-5 flex items-center gap-2 text-teal-800">
                  <Globe size={18} /> {langCode.toUpperCase()}
                </h4>

                <div className="space-y-5">

                  {/* ── Hero ── */}
                  <Section title="Hero" icon={<Star size={15} />}>
                    <Field
                      label="Badge"
                      value={t.hero?.badge || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.hero.badge`, v)}
                    />
                    <Field
                      label="Headline"
                      value={t.hero?.headline || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.hero.headline`, v)}
                    />
                    <Field
                      label="Subheadline"
                      value={t.hero?.subheadline || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.hero.subheadline`, v)}
                      textarea
                      colSpan
                    />
                  </Section>

                  {/* ── Info Block ── */}
                  <Section title="Info Block (left side)" icon={<Mail size={15} />}>
                    <Field
                      label="Label (small badge)"
                      value={t.info?.label || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.info.label`, v)}
                    />
                    <Field
                      label="Title"
                      value={t.info?.title || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.info.title`, v)}
                    />
                    <Field
                      label="Email Label"
                      value={t.info?.emailLabel || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.info.emailLabel`, v)}
                    />
                    <Field
                      label="WhatsApp Label"
                      value={t.info?.whatsappLabel || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.info.whatsappLabel`, v)}
                    />
                    <Field
                      label="Note / Working Hours"
                      value={t.info?.note || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.info.note`, v)}
                      textarea
                      colSpan
                    />
                  </Section>

                  {/* ── Form ── */}
                  <Section title="Form Texts" icon={<MessageSquare size={15} />}>
                    <Field
                      label="Form Label (badge)"
                      value={t.form?.label || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.form.label`, v)}
                    />
                    <Field
                      label="Form Title"
                      value={t.form?.title || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.form.title`, v)}
                    />
                    <Field
                      label="Submit Button"
                      value={t.form?.submit || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.form.submit`, v)}
                    />
                    <Field
                      label="Sending… (loading text)"
                      value={t.form?.sending || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.form.sending`, v)}
                    />
                    <Field
                      label="Success Title"
                      value={t.form?.successTitle || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.form.successTitle`, v)}
                    />
                    <Field
                      label="Success Message"
                      value={t.form?.successMsg || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.form.successMsg`, v)}
                      textarea
                    />
                    <Field
                      label="Error Message"
                      value={t.form?.errorMsg || ''}
                      onChange={v => updateConfig(`i18n.${langCode}.form.errorMsg`, v)}
                      textarea
                    />
                  </Section>

                  {/* ── Form Field Labels ── */}
                  <Section title="Form Field Labels" icon={<Tag size={15} />}>
                    {[
                      ['name',               'Full Name field'],
                      ['email',              'Email field'],
                      ['phone',              'Phone field'],
                      ['service',            'Service dropdown label'],
                      ['servicePlaceholder', 'Service placeholder'],
                      ['message',            'Message field'],
                      ['messagePlaceholder', 'Message placeholder'],
                    ].map(([key, label]) => (
                      <Field
                        key={key}
                        label={label}
                        value={t.form?.fields?.[key] || ''}
                        onChange={v => updateConfig(`i18n.${langCode}.form.fields.${key}`, v)}
                      />
                    ))}
                  </Section>

                  {/* ── Service Options ── */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                        <Tag size={15} /> Service Options
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                          {getServiceOptions(langCode).length} options
                        </span>
                      </h5>
                      <button
                        onClick={() => addServiceOption(langCode)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-700 font-medium"
                      >
                        <Plus size={12} /> Add Option
                      </button>
                    </div>

                    <div className="mb-3 p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-700 flex items-start gap-2">
                      <Lightbulb size={13} className="mt-0.5 shrink-0" />
                      <span>
                        <strong>Value</strong> هو الكود الداخلي (بالإنجليزي دايماً، مثل <code>study-spain</code>). <strong>Label</strong> هو اللي بيتعرض للزائر باللغة المناسبة.
                      </span>
                    </div>

                    <div className="space-y-2">
                      {getServiceOptions(langCode).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{idx + 1}</span>
                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Value (internal key)</label>
                              <input
                                type="text"
                                value={opt.value || ''}
                                onChange={e => updateServiceOption(langCode, idx, 'value', e.target.value)}
                                className="w-full px-3 py-1.5 border-2 border-gray-200 rounded-lg text-sm focus:border-teal-400 font-mono"
                                placeholder="study-spain"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Label (displayed text)</label>
                              <input
                                type="text"
                                value={opt.label || ''}
                                onChange={e => updateServiceOption(langCode, idx, 'label', e.target.value)}
                                className="w-full px-3 py-1.5 border-2 border-gray-200 rounded-lg text-sm focus:border-teal-400"
                                placeholder="Study in Spain"
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => removeServiceOption(langCode, idx)}
                            className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 shrink-0"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}

                      {getServiceOptions(langCode).length === 0 && (
                        <div className="text-center py-5 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                          No service options yet. Click "Add Option" above ↑
                        </div>
                      )}
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

// ─────────────────────────────────────────────────────────────────────────────
// Reusable sub-components
// ─────────────────────────────────────────────────────────────────────────────

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

function Field({ label, value, onChange, textarea, colSpan }) {
  return (
    <div className={colSpan ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-400 text-sm resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-400 text-sm"
        />
      )}
    </div>
  );
}