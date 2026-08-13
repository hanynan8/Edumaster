'use client';

import { useState, useEffect } from 'react';
import {
  Save, RefreshCw, Loader, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Globe, Languages, Image,
  BookOpen, Star, BarChart2, Tag, Link, Clock, Award,
  Users, Palette, Filter
} from 'lucide-react';

const API_BASE_URL = '/api/data';

const COURSE_IDS = [
  'spanish-beginner',
  'spanish-intermediate',
  'english-professional',
  'call-center',
  'university-prep',
  'career-spanish',
];

const DEFAULT_CONFIG = {
  hero: { backgroundImage: '' },
  stats: { backgroundImage: '' },
  courses: COURSE_IDS.map(id => ({
    id,
    image: '',
    color: '#3b82f6',
    ctaHref: '/contact',
    duration: '',
    level: '',
    levelColor: '#10b981',
    certLogo: '',
  })),
  i18n: {},
};

export default function CoursesAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    images: false,
    courses: false,
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
      const response = await fetch(`${API_BASE_URL}?collection=courses`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const data = Array.isArray(result) && result.length > 0 ? result[0] : null;
      setConfig(data || { ...DEFAULT_CONFIG, _id: 'temp' });
    } catch (err) {
      showMessage('Error fetching courses data: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const isNew = config._id === 'temp' || !config._id;
      const url = `${API_BASE_URL}?collection=courses${isNew ? '' : `&id=${config._id}`}`;
      const method = isNew ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
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

  const languages = config ? Object.keys(config.i18n || {}) : [];

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
      <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-blue-900">
            <BookOpen size={28} />
            Courses Page Configuration
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
              <div className="p-4 bg-white rounded-lg border-2 border-blue-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hero Background Image</label>
                <input
                  type="url"
                  value={config.hero?.backgroundImage || ''}
                  onChange={e => updateConfig('hero.backgroundImage', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  placeholder="https://..."
                />
                {config.hero?.backgroundImage && (
                  <img src={config.hero.backgroundImage} alt="Hero preview" className="mt-2 w-full h-24 object-cover rounded-lg" />
                )}
              </div>

              {/* Stats Background */}
              <div className="p-4 bg-white rounded-lg border-2 border-blue-100">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Stats Background Image</label>
                <input
                  type="url"
                  value={config.stats?.backgroundImage || ''}
                  onChange={e => updateConfig('stats.backgroundImage', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                  placeholder="https://..."
                />
                {config.stats?.backgroundImage && (
                  <img src={config.stats.backgroundImage} alt="Stats preview" className="mt-2 w-full h-24 object-cover rounded-lg" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Courses Static Data */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('courses')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Tag size={20} /> Courses — Static Data
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {(config.courses || []).length}
              </span>
            </h3>
            {expandedSections.courses ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {expandedSections.courses && (
            <div className="mt-4 space-y-4">
              {(config.courses || []).map((course, idx) => (
                <div key={course.id || idx} className="p-4 bg-white rounded-xl border-2 border-blue-100">
                  <p className="text-sm font-bold text-blue-700 mb-3 uppercase tracking-wide">{course.id}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                    {/* Image */}
                    <div className="col-span-full">
                      <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                        <Image size={12} /> Course Image URL
                      </label>
                      <input
                        type="url"
                        value={course.image || ''}
                        onChange={e => {
                          const newCourses = [...(config.courses || [])];
                          newCourses[idx] = { ...newCourses[idx], image: e.target.value };
                          updateConfig('courses', newCourses);
                        }}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 text-sm"
                        placeholder="https://..."
                      />
                      {course.image && (
                        <img src={course.image} alt={course.id} className="mt-2 w-full h-20 object-cover rounded-lg" />
                      )}
                    </div>

                    {/* CTA Href */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                        <Link size={12} /> CTA Link (href)
                      </label>
                      <input
                        type="text"
                        value={course.ctaHref || ''}
                        onChange={e => {
                          const newCourses = [...(config.courses || [])];
                          newCourses[idx] = { ...newCourses[idx], ctaHref: e.target.value };
                          updateConfig('courses', newCourses);
                        }}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 text-sm"
                        placeholder="/contact"
                      />
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                        <Clock size={12} /> Duration
                      </label>
                      <input
                        type="text"
                        value={course.duration || ''}
                        onChange={e => {
                          const newCourses = [...(config.courses || [])];
                          newCourses[idx] = { ...newCourses[idx], duration: e.target.value };
                          updateConfig('courses', newCourses);
                        }}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 text-sm"
                        placeholder="3 months"
                      />
                    </div>

                    {/* Level */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                        <Star size={12} /> Level
                      </label>
                      <input
                        type="text"
                        value={course.level || ''}
                        onChange={e => {
                          const newCourses = [...(config.courses || [])];
                          newCourses[idx] = { ...newCourses[idx], level: e.target.value };
                          updateConfig('courses', newCourses);
                        }}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 text-sm"
                        placeholder="A1–A2"
                      />
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                        <Palette size={12} /> Card Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={course.color || '#3b82f6'}
                          onChange={e => {
                            const newCourses = [...(config.courses || [])];
                            newCourses[idx] = { ...newCourses[idx], color: e.target.value };
                            updateConfig('courses', newCourses);
                          }}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                        <input
                          type="text"
                          value={course.color || ''}
                          onChange={e => {
                            const newCourses = [...(config.courses || [])];
                            newCourses[idx] = { ...newCourses[idx], color: e.target.value };
                            updateConfig('courses', newCourses);
                          }}
                          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 text-sm"
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>

                    {/* Level Color */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                        <Palette size={12} /> Level Badge Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={course.levelColor || '#10b981'}
                          onChange={e => {
                            const newCourses = [...(config.courses || [])];
                            newCourses[idx] = { ...newCourses[idx], levelColor: e.target.value };
                            updateConfig('courses', newCourses);
                          }}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                        <input
                          type="text"
                          value={course.levelColor || ''}
                          onChange={e => {
                            const newCourses = [...(config.courses || [])];
                            newCourses[idx] = { ...newCourses[idx], levelColor: e.target.value };
                            updateConfig('courses', newCourses);
                          }}
                          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 text-sm"
                          placeholder="#10b981"
                        />
                      </div>
                    </div>

                    {/* Cert Logo */}
                    <div className="col-span-full md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                        <Award size={12} /> Cert Logo URL
                      </label>
                      <input
                        type="url"
                        value={course.certLogo || ''}
                        onChange={e => {
                          const newCourses = [...(config.courses || [])];
                          newCourses[idx] = { ...newCourses[idx], certLogo: e.target.value };
                          updateConfig('courses', newCourses);
                        }}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 text-sm"
                        placeholder="https://..."
                      />
                    </div>

                  </div>
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
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{languages.length} langs</span>
            </h3>
            {expandedSections.translations ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>

          {expandedSections.translations && languages.map(langCode => {
            const t = config.i18n?.[langCode] || {};
            const courseKeys = Object.keys(t.courses || {});

            return (
              <div key={langCode} className="mt-6 p-5 bg-white rounded-xl border-2 border-blue-100">
                <h4 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-800">
                  <Globe size={18} /> {langCode.toUpperCase()}
                </h4>

                <div className="space-y-6">

                  {/* Hero */}
                  <Section title="Hero" icon={<Star size={16} />}>
                    <Field label="Badge" value={t.hero?.badge || ''} onChange={v => updateConfig(`i18n.${langCode}.hero.badge`, v)} />
                    <Field label="Headline" value={t.hero?.headline || ''} onChange={v => updateConfig(`i18n.${langCode}.hero.headline`, v)} />
                    <Field label="Subheadline" value={t.hero?.subheadline || ''} onChange={v => updateConfig(`i18n.${langCode}.hero.subheadline`, v)} textarea />
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

                  {/* Filter Labels */}
                  <Section title="Filter Labels" icon={<Filter size={16} />}>
                    {Object.entries(t.filter || {}).map(([key, val]) => (
                      <Field
                        key={key}
                        label={key === 'all' ? 'All (default)' : key}
                        value={val || ''}
                        onChange={v => updateConfig(`i18n.${langCode}.filter.${key}`, v)}
                      />
                    ))}
                  </Section>

                  {/* Courses Translations */}
                  {courseKeys.map(courseId => {
                    const c = t.courses?.[courseId] || {};
                    return (
                      <div key={courseId} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <h5 className="font-bold text-sm text-blue-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                          <BookOpen size={14} /> {courseId}
                        </h5>
                        <div className="space-y-4">

                          <Section title="Basic Info" icon={<Tag size={14} />}>
                            <Field label="Category" value={c.category || ''} onChange={v => updateConfig(`i18n.${langCode}.courses.${courseId}.category`, v)} />
                            <Field label="Title" value={c.title || ''} onChange={v => updateConfig(`i18n.${langCode}.courses.${courseId}.title`, v)} />
                            <Field label="Description" value={c.desc || ''} onChange={v => updateConfig(`i18n.${langCode}.courses.${courseId}.desc`, v)} textarea />
                            <Field label="CTA Button Text" value={c.cta || ''} onChange={v => updateConfig(`i18n.${langCode}.courses.${courseId}.cta`, v)} />
                          </Section>

                          {/* Who Is This For */}
                          <div className="p-3 bg-white rounded-lg border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Users size={12} /> Who Is This For</p>
                            <div className="space-y-2">
                              {(c.whoIsThisFor || []).map((item, idx) => (
                                <Field
                                  key={idx}
                                  label={`Point ${idx + 1}`}
                                  value={item || ''}
                                  onChange={v => {
                                    const arr = [...(c.whoIsThisFor || [])];
                                    arr[idx] = v;
                                    updateConfig(`i18n.${langCode}.courses.${courseId}.whoIsThisFor`, arr);
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Outcomes */}
                          <div className="p-3 bg-white rounded-lg border border-gray-200">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Star size={12} /> Outcomes</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {(c.outcomes || []).map((item, idx) => (
                                <Field
                                  key={idx}
                                  label={`Outcome ${idx + 1}`}
                                  value={item || ''}
                                  onChange={v => {
                                    const arr = [...(c.outcomes || [])];
                                    arr[idx] = v;
                                    updateConfig(`i18n.${langCode}.courses.${courseId}.outcomes`, arr);
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Certification */}
                          <Section title="Certification" icon={<Award size={14} />}>
                            <Field label="Cert Name" value={c.certification?.name || ''} onChange={v => updateConfig(`i18n.${langCode}.courses.${courseId}.certification.name`, v)} />
                            <Field label="Cert Description" value={c.certification?.desc || ''} onChange={v => updateConfig(`i18n.${langCode}.courses.${courseId}.certification.desc`, v)} textarea />
                          </Section>

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
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 text-sm resize-none"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-400 text-sm"
        />
      )}
    </div>
  );
}