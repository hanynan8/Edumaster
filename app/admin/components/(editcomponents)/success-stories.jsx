'use client';

import { useState, useEffect } from 'react';
import {
  Save, RefreshCw, Loader, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Globe, Languages, Image,
  Star, BarChart2, Users, Video, Award, ThumbsUp, Flag,
  MapPin, Calendar, BookOpen, MessageCircle, Heart
} from 'lucide-react';

const API_BASE_URL = '/api/data';

const DEFAULT_CONFIG = {
  hero: { backgroundImage: '' },
  stats: {
    items: [{ value: '' }, { value: '' }, { value: '' }, { value: '' }]
  },
  testimonials: [],
  journeys: [],
  videos: [],
  i18n: {}
};

export default function SuccessStoriesAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    images: false,
    stats: false,
    testimonialsMeta: false,
    journeysMeta: false,
    videosMeta: false,
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
      const response = await fetch(`${API_BASE_URL}?collection=successStories`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const data = Array.isArray(result) && result.length > 0 ? result[0] : null;
      if (data) {
        setConfig(data);
      } else {
        // Initialize with default structure based on provided data
        setConfig({
          ...DEFAULT_CONFIG,
          _id: 'temp',
          testimonials: [
            { id: 't1', avatar: '', country: '', university: '', type: '' },
            { id: 't2', avatar: '', country: '', university: '', type: '' },
            { id: 't3', avatar: '', country: '', university: '', type: '' },
            { id: 't4', avatar: '', country: '', university: '', type: '' },
            { id: 't5', avatar: '', country: '', university: '', type: '' },
            { id: 't6', avatar: '', country: '', university: '', type: '' }
          ],
          journeys: [
            { id: 'j1', avatar: '', country: '', flag: '', color: '' },
            { id: 'j2', avatar: '', country: '', flag: '', color: '' },
            { id: 'j3', avatar: '', country: '', flag: '', color: '' }
          ],
          videos: [
            { id: 'v1', thumbnail: '', country: '', color: '' },
            { id: 'v2', thumbnail: '', country: '', color: '' },
            { id: 'v3', thumbnail: '', country: '', color: '' }
          ],
          i18n: {
            en: {
              hero: { badge: '', headline: '', subheadline: '' },
              stats: { items: ['', '', '', ''] },
              sections: { testimonials: '', journeys: '', approvals: '', videos: '' },
              testimonials: {},
              journeys: {},
              approvals: { title: '', desc: '', visaLabel: '', uniLabel: '', items: [] },
              videos: { title: '', desc: '', v1: { name: '', program: '', duration: '' }, v2: { name: '', program: '', duration: '' }, v3: { name: '', program: '', duration: '' } },
              cta: { title: '', desc: '', button: '' }
            },
            ar: {
              hero: { badge: '', headline: '', subheadline: '' },
              stats: { items: ['', '', '', ''] },
              sections: { testimonials: '', journeys: '', approvals: '', videos: '' },
              testimonials: {},
              journeys: {},
              approvals: { title: '', desc: '', visaLabel: '', uniLabel: '', items: [] },
              videos: { title: '', desc: '', v1: { name: '', program: '', duration: '' }, v2: { name: '', program: '', duration: '' }, v3: { name: '', program: '', duration: '' } },
              cta: { title: '', desc: '', button: '' }
            },
            es: {
              hero: { badge: '', headline: '', subheadline: '' },
              stats: { items: ['', '', '', ''] },
              sections: { testimonials: '', journeys: '', approvals: '', videos: '' },
              testimonials: {},
              journeys: {},
              approvals: { title: '', desc: '', visaLabel: '', uniLabel: '', items: [] },
              videos: { title: '', desc: '', v1: { name: '', program: '', duration: '' }, v2: { name: '', program: '', duration: '' }, v3: { name: '', program: '', duration: '' } },
              cta: { title: '', desc: '', button: '' }
            }
          }
        });
      }
    } catch (err) {
      showMessage('Error fetching success stories: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const isNew = config._id === 'temp' || !config._id;
      const url = `${API_BASE_URL}?collection=successStories${isNew ? '' : `&id=${config._id}`}`;
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
            <Heart size={28} />
            Success Stories Configuration
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

        {/* ========== IMAGES & MEDIA ========== */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('images')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Image size={20} /> Images & Media
            </h3>
            {expandedSections.images ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.images && (
            <div className="mt-4 space-y-6">
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

              {/* Testimonials Avatars */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><Users size={16} /> Testimonials – Avatars</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {config.testimonials?.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-white rounded-lg border border-gray-200">
                      <label className="block text-xs font-semibold text-gray-500">{item.id.toUpperCase()} – Avatar URL</label>
                      <input
                        type="url"
                        value={item.avatar || ''}
                        onChange={e => {
                          const newItems = [...(config.testimonials || [])];
                          newItems[idx] = { ...newItems[idx], avatar: e.target.value };
                          updateConfig('testimonials', newItems);
                        }}
                        className="w-full px-3 py-1 text-sm border rounded mt-1"
                      />
                      {item.avatar && <img src={item.avatar} className="w-10 h-10 rounded-full mt-2 object-cover" alt="avatar" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Journeys Avatars */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><Flag size={16} /> Journeys – Avatars</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {config.journeys?.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-white rounded-lg border border-gray-200">
                      <label className="block text-xs font-semibold text-gray-500">{item.id.toUpperCase()} – Avatar URL</label>
                      <input
                        type="url"
                        value={item.avatar || ''}
                        onChange={e => {
                          const newItems = [...(config.journeys || [])];
                          newItems[idx] = { ...newItems[idx], avatar: e.target.value };
                          updateConfig('journeys', newItems);
                        }}
                        className="w-full px-3 py-1 text-sm border rounded mt-1"
                      />
                      {item.avatar && <img src={item.avatar} className="w-10 h-10 rounded-full mt-2 object-cover" alt="avatar" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Videos Thumbnails */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2"><Video size={16} /> Videos – Thumbnails</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {config.videos?.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-white rounded-lg border border-gray-200">
                      <label className="block text-xs font-semibold text-gray-500">{item.id.toUpperCase()} – Thumbnail URL</label>
                      <input
                        type="url"
                        value={item.thumbnail || ''}
                        onChange={e => {
                          const newItems = [...(config.videos || [])];
                          newItems[idx] = { ...newItems[idx], thumbnail: e.target.value };
                          updateConfig('videos', newItems);
                        }}
                        className="w-full px-3 py-1 text-sm border rounded mt-1"
                      />
                      {item.thumbnail && <img src={item.thumbnail} className="mt-2 w-full h-20 object-cover rounded" alt="thumbnail" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========== STATS VALUES ========== */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('stats')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <BarChart2 size={20} /> Stats Values (numbers)
            </h3>
            {expandedSections.stats ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.stats && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {(config.stats?.items || []).map((item, idx) => (
                <div key={idx} className="p-3 bg-white rounded-lg border-2 border-blue-100">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Stat {idx + 1} Value</label>
                  <input
                    type="text"
                    value={item.value || ''}
                    onChange={e => {
                      const newItems = [...(config.stats?.items || [])];
                      newItems[idx] = { ...newItems[idx], value: e.target.value };
                      updateConfig('stats.items', newItems);
                    }}
                    className="w-full px-3 py-2 border rounded text-center font-bold text-lg"
                    placeholder="500+"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========== TESTIMONIALS METADATA ========== */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('testimonialsMeta')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <MessageCircle size={20} /> Testimonials – Metadata (country, university, type)
            </h3>
            {expandedSections.testimonialsMeta ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.testimonialsMeta && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.testimonials?.map((item, idx) => (
                <div key={item.id} className="p-4 bg-white rounded-lg border border-purple-100">
                  <div className="font-bold text-purple-700 mb-2">{item.id.toUpperCase()}</div>
                  <Field label="Country (emoji or text)" value={item.country || ''} onChange={v => {
                    const newItems = [...config.testimonials];
                    newItems[idx] = { ...newItems[idx], country: v };
                    updateConfig('testimonials', newItems);
                  }} />
                  <Field label="University / Program" value={item.university || ''} onChange={v => {
                    const newItems = [...config.testimonials];
                    newItems[idx] = { ...newItems[idx], university: v };
                    updateConfig('testimonials', newItems);
                  }} />
                  <Field label="Type (university/visa/career)" value={item.type || ''} onChange={v => {
                    const newItems = [...config.testimonials];
                    newItems[idx] = { ...newItems[idx], type: v };
                    updateConfig('testimonials', newItems);
                  }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========== JOURNEYS METADATA ========== */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('journeysMeta')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <MapPin size={20} /> Journeys – Metadata (country, flag, color)
            </h3>
            {expandedSections.journeysMeta ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.journeysMeta && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {config.journeys?.map((item, idx) => (
                <div key={item.id} className="p-4 bg-white rounded-lg border border-purple-100">
                  <div className="font-bold text-purple-700 mb-2">{item.id.toUpperCase()}</div>
                  <Field label="Country (text/emoji)" value={item.country || ''} onChange={v => {
                    const newItems = [...config.journeys];
                    newItems[idx] = { ...newItems[idx], country: v };
                    updateConfig('journeys', newItems);
                  }} />
                  <Field label="Flag emoji" value={item.flag || ''} onChange={v => {
                    const newItems = [...config.journeys];
                    newItems[idx] = { ...newItems[idx], flag: v };
                    updateConfig('journeys', newItems);
                  }} />
                  <Field label="Color (hex)" value={item.color || ''} onChange={v => {
                    const newItems = [...config.journeys];
                    newItems[idx] = { ...newItems[idx], color: v };
                    updateConfig('journeys', newItems);
                  }} />
                  <div className="mt-2 w-full h-6 rounded" style={{ backgroundColor: item.color }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========== VIDEOS METADATA ========== */}
        {/* <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleSection('videosMeta')}>
            <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Video size={20} /> Videos – Metadata (country, color)
            </h3>
            {expandedSections.videosMeta ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
          {expandedSections.videosMeta && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {config.videos?.map((item, idx) => (
                <div key={item.id} className="p-4 bg-white rounded-lg border border-purple-100">
                  <div className="font-bold text-purple-700 mb-2">{item.id.toUpperCase()}</div>
                  <Field label="Country (emoji)" value={item.country || ''} onChange={v => {
                    const newItems = [...config.videos];
                    newItems[idx] = { ...newItems[idx], country: v };
                    updateConfig('videos', newItems);
                  }} />
                  <Field label="Color (hex)" value={item.color || ''} onChange={v => {
                    const newItems = [...config.videos];
                    newItems[idx] = { ...newItems[idx], color: v };
                    updateConfig('videos', newItems);
                  }} />
                  <div className="mt-2 w-full h-6 rounded" style={{ backgroundColor: item.color }} />
                </div>
              ))}
            </div>
          )}
        </div> */}

        {/* ========== TRANSLATIONS ========== */}
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

                  {/* Stats Labels */}
                  <Section title="Stats Labels" icon={<BarChart2 size={16} />}>
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      {(t.stats?.items || []).map((label, idx) => (
                        <Field key={idx} label={`Stat ${idx + 1} Label`} value={label} onChange={v => {
                          const newItems = [...(t.stats?.items || [])];
                          newItems[idx] = v;
                          updateConfig(`i18n.${langCode}.stats.items`, newItems);
                        }} />
                      ))}
                    </div>
                  </Section>

                  {/* Section Titles */}
                  <Section title="Section Headings" icon={<BookOpen size={16} />}>
                    <Field label="Testimonials Title" value={t.sections?.testimonials || ''} onChange={v => updateConfig(`i18n.${langCode}.sections.testimonials`, v)} />
                    <Field label="Journeys Title" value={t.sections?.journeys || ''} onChange={v => updateConfig(`i18n.${langCode}.sections.journeys`, v)} />
                    <Field label="Approvals Title" value={t.sections?.approvals || ''} onChange={v => updateConfig(`i18n.${langCode}.sections.approvals`, v)} />
                    <Field label="Videos Title" value={t.sections?.videos || ''} onChange={v => updateConfig(`i18n.${langCode}.sections.videos`, v)} />
                  </Section>

                  {/* Testimonials Content */}
                  <Section title="Testimonials Text" icon={<MessageCircle size={16} />}>
                    {config.testimonials?.map((item, idx) => {
                      const testimonialData = t.testimonials?.[item.id] || {};
                      return (
                        <div key={item.id} className="col-span-2 p-3 bg-gray-50 rounded-lg border">
                          <p className="font-semibold text-purple-700 mb-2">{item.id.toUpperCase()}</p>
                          <Field label="Name" value={testimonialData.name || ''} onChange={v => updateConfig(`i18n.${langCode}.testimonials.${item.id}.name`, v)} />
                          <Field label="Program" value={testimonialData.program || ''} onChange={v => updateConfig(`i18n.${langCode}.testimonials.${item.id}.program`, v)} />
                          <Field label="Quote" value={testimonialData.quote || ''} onChange={v => updateConfig(`i18n.${langCode}.testimonials.${item.id}.quote`, v)} textarea />
                          <Field label="Tag" value={testimonialData.tag || ''} onChange={v => updateConfig(`i18n.${langCode}.testimonials.${item.id}.tag`, v)} />
                        </div>
                      );
                    })}
                  </Section>

                  {/* Journeys Content */}
                  <Section title="Journeys Text" icon={<Flag size={16} />}>
                    {config.journeys?.map((item, idx) => {
                      const journeyData = t.journeys?.[item.id] || {};
                      return (
                        <div key={item.id} className="col-span-2 p-3 bg-gray-50 rounded-lg border">
                          <p className="font-semibold text-purple-700 mb-2">{item.id.toUpperCase()}</p>
                          <Field label="Name" value={journeyData.name || ''} onChange={v => updateConfig(`i18n.${langCode}.journeys.${item.id}.name`, v)} />
                          <Field label="Before" value={journeyData.before || ''} onChange={v => updateConfig(`i18n.${langCode}.journeys.${item.id}.before`, v)} textarea />
                          <Field label="After" value={journeyData.after || ''} onChange={v => updateConfig(`i18n.${langCode}.journeys.${item.id}.after`, v)} textarea />
                          <Field label="Duration" value={journeyData.duration || ''} onChange={v => updateConfig(`i18n.${langCode}.journeys.${item.id}.duration`, v)} />
                          <Field label="Program" value={journeyData.program || ''} onChange={v => updateConfig(`i18n.${langCode}.journeys.${item.id}.program`, v)} />
                        </div>
                      );
                    })}
                  </Section>

                  {/* Approvals Section */}
                  <Section title="Approvals Section" icon={<Award size={16} />}>
                    <Field label="Title" value={t.approvals?.title || ''} onChange={v => updateConfig(`i18n.${langCode}.approvals.title`, v)} />
                    <Field label="Description" value={t.approvals?.desc || ''} onChange={v => updateConfig(`i18n.${langCode}.approvals.desc`, v)} textarea />
                    <Field label="Visa Label" value={t.approvals?.visaLabel || ''} onChange={v => updateConfig(`i18n.${langCode}.approvals.visaLabel`, v)} />
                    <Field label="University Label" value={t.approvals?.uniLabel || ''} onChange={v => updateConfig(`i18n.${langCode}.approvals.uniLabel`, v)} />
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Approval Items</label>
                      {(t.approvals?.items || []).map((item, idx) => (
                        <div key={idx} className="p-3 mb-2 bg-white rounded border">
                          <Field label="Type (visa/uni)" value={item.type || ''} onChange={v => {
                            const newItems = [...(t.approvals?.items || [])];
                            newItems[idx] = { ...newItems[idx], type: v };
                            updateConfig(`i18n.${langCode}.approvals.items`, newItems);
                          }} />
                          <Field label="Name" value={item.name || ''} onChange={v => {
                            const newItems = [...(t.approvals?.items || [])];
                            newItems[idx] = { ...newItems[idx], name: v };
                            updateConfig(`i18n.${langCode}.approvals.items`, newItems);
                          }} />
                          <Field label="Country" value={item.country || ''} onChange={v => {
                            const newItems = [...(t.approvals?.items || [])];
                            newItems[idx] = { ...newItems[idx], country: v };
                            updateConfig(`i18n.${langCode}.approvals.items`, newItems);
                          }} />
                          <Field label="Detail" value={item.detail || ''} onChange={v => {
                            const newItems = [...(t.approvals?.items || [])];
                            newItems[idx] = { ...newItems[idx], detail: v };
                            updateConfig(`i18n.${langCode}.approvals.items`, newItems);
                          }} />
                        </div>
                      ))}
                    </div>
                  </Section>

                  {/* Videos Content */}
                  <Section title="Videos Text" icon={<Video size={16} />}>
                    <Field label="Section Title" value={t.videos?.title || ''} onChange={v => updateConfig(`i18n.${langCode}.videos.title`, v)} />
                    <Field label="Section Description" value={t.videos?.desc || ''} onChange={v => updateConfig(`i18n.${langCode}.videos.desc`, v)} textarea />
                    {config.videos?.map((item, idx) => {
                      const videoData = t.videos?.[item.id] || {};
                      return (
                        <div key={item.id} className="col-span-2 p-3 bg-gray-50 rounded-lg border">
                          <p className="font-semibold text-purple-700 mb-2">{item.id.toUpperCase()}</p>
                          <Field label="Name" value={videoData.name || ''} onChange={v => updateConfig(`i18n.${langCode}.videos.${item.id}.name`, v)} />
                          <Field label="Program" value={videoData.program || ''} onChange={v => updateConfig(`i18n.${langCode}.videos.${item.id}.program`, v)} />
                          <Field label="Duration" value={videoData.duration || ''} onChange={v => updateConfig(`i18n.${langCode}.videos.${item.id}.duration`, v)} />
                        </div>
                      );
                    })}
                  </Section>

                  {/* CTA */}
                  <Section title="Call to Action" icon={<ThumbsUp size={16} />}>
                    <Field label="Title" value={t.cta?.title || ''} onChange={v => updateConfig(`i18n.${langCode}.cta.title`, v)} />
                    <Field label="Description" value={t.cta?.desc || ''} onChange={v => updateConfig(`i18n.${langCode}.cta.desc`, v)} textarea />
                    <Field label="Button Text" value={t.cta?.button || ''} onChange={v => updateConfig(`i18n.${langCode}.cta.button`, v)} />
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

// Reusable components
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