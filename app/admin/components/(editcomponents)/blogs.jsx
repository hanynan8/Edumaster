'use client';

import { useState, useEffect } from 'react';
import {
  Save, RefreshCw, Loader, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Globe, Languages, Image,
  BookOpen, Star, Mail, Tag, Clock, User, Plus,
  Trash2, Edit3, Eye, FileText, List, Layers,
  Hash, AlignLeft, MessageSquare, Lightbulb, ChevronRight
} from 'lucide-react';

const API_BASE_URL = '/api/data';

const POST_IDS = [
  'spain-student-visa-tips',
  'best-universities-spain',
  'study-vs-work-visa',
  'language-learning-strategies',
  'career-advice-abroad',
  'living-in-madrid-guide',
];

const SECTION_TYPES = ['intro', 'tip', 'image', 'callout', 'closing'];

const DEFAULT_CONFIG = {
  hero: { backgroundImage: '' },
  categories: [
    { id: 'all' }, { id: 'visa' }, { id: 'universities' },
    { id: 'language' }, { id: 'career' }, { id: 'life' },
  ],
  posts: POST_IDS.map(id => ({
    id, slug: id, category: '', image: '', color: '#3b82f6',
    readTime: 5, date: '', featured: false,
  })),
  newsletter: { backgroundImage: '' },
  i18n: {},
};

export default function BlogAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    images: false, posts: false, translations: false,
  });
  // Which post card is open inside posts section
  const [openPost, setOpenPost] = useState(null);
  // Which lang + postId is open in translations
  const [openTranslation, setOpenTranslation] = useState({ lang: null, postId: null });

  useEffect(() => { fetchConfig(); }, []);

  const showMessage = (message, type = 'success') => {
    setSuccess(type === 'success' ? message : '');
    setError(type === 'error' ? message : '');
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?collection=blogs`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const data = Array.isArray(result) && result.length > 0 ? result[0] : null;
      setConfig(data || { ...DEFAULT_CONFIG, _id: 'temp' });
    } catch (err) {
      showMessage('Error fetching blog data: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const isNew = config._id === 'temp' || !config._id;
      const url = `${API_BASE_URL}?collection=blogs${isNew ? '' : `&id=${config._id}`}`;
      const method = isNew ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      showMessage('✓ Blog configuration saved successfully');
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

  // ─── Section helpers ────────────────────────────────────────────────────────
  const getSections = (langCode, postId) =>
    config?.i18n?.[langCode]?.posts?.[postId]?.sections || [];

  const updateSections = (langCode, postId, sections) => {
    updateConfig(`i18n.${langCode}.posts.${postId}.sections`, sections);
  };

  const addSection = (langCode, postId, type) => {
    const current = getSections(langCode, postId);
    let newSection = { type };
    if (type === 'tip') newSection = { type: 'tip', number: String(current.filter(s => s.type === 'tip').length + 1).padStart(2, '0'), heading: '', text: '' };
    if (type === 'intro') newSection = { type: 'intro', text: '' };
    if (type === 'closing') newSection = { type: 'closing', text: '' };
    if (type === 'image') newSection = { type: 'image', src: '', caption: '' };
    if (type === 'callout') newSection = { type: 'callout', heading: '', text: '' };
    updateSections(langCode, postId, [...current, newSection]);
  };

  const removeSection = (langCode, postId, idx) => {
    const current = getSections(langCode, postId);
    updateSections(langCode, postId, current.filter((_, i) => i !== idx));
  };

  const updateSection = (langCode, postId, idx, field, value) => {
    const current = getSections(langCode, postId);
    const updated = current.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    updateSections(langCode, postId, updated);
  };

  if (!config) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        {loading ? <Loader className="animate-spin mx-auto" size={48} /> : <p>No data</p>}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-orange-100">

      {/* ── Header ── */}
      <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-orange-50 to-rose-50">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-orange-900">
            <BookOpen size={28} /> Blog Page Configuration
          </h2>
          <div className="flex gap-3">
            <button onClick={fetchConfig} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-lg hover:bg-orange-700" disabled={loading}>
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={saveConfig} className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2.5 rounded-lg" disabled={loading}>
              {loading ? <Loader className="animate-spin" size={18} /> : <Save size={18} />} Save All
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
            SECTION 1 — Images & Media
        ══════════════════════════════════════════════════ */}
        <CollapsibleCard
          title="Images & Media"
          icon={<Image size={20} />}
          badge={null}
          open={expandedSections.images}
          onToggle={() => toggleSection('images')}
          color="orange"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ImageField
              label="Hero Background Image"
              value={config.hero?.backgroundImage || ''}
              onChange={v => updateConfig('hero.backgroundImage', v)}
            />
            <ImageField
              label="Newsletter Background Image"
              value={config.newsletter?.backgroundImage || ''}
              onChange={v => updateConfig('newsletter.backgroundImage', v)}
            />
          </div>
        </CollapsibleCard>

        {/* ══════════════════════════════════════════════════
            SECTION 2 — Posts Static Data
        ══════════════════════════════════════════════════ */}
        <CollapsibleCard
          title="Posts — Static Data"
          icon={<FileText size={20} />}
          badge={(config.posts || []).length}
          open={expandedSections.posts}
          onToggle={() => toggleSection('posts')}
          color="orange"
        >
          {/* Quick legend */}
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 flex items-start gap-2">
            <Lightbulb size={14} className="mt-0.5 shrink-0" />
            <span>هنا بتحدد البيانات الثابتة لكل مقال: الصورة، الكاتيجوري، اللون، وقت القراءة، التاريخ، وهل هو Featured. النصوص والمحتوى في قسم Translations تحت.</span>
          </div>

          <div className="space-y-3">
            {(config.posts || []).map((post, idx) => (
              <div key={post.id || idx} className="border-2 border-gray-200 rounded-xl overflow-hidden">
                {/* Post header row */}
                <div
                  className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                  onClick={() => setOpenPost(openPost === post.id ? null : post.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: post.color || '#999' }} />
                    <span className="font-bold text-sm text-gray-700">{post.id}</span>
                    {post.featured && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">⭐ Featured</span>}
                    {post.category && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{post.category}</span>}
                  </div>
                  {openPost === post.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                {openPost === post.id && (
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Image */}
                    <div className="col-span-full">
                      <ImageField
                        label="Post Image"
                        value={post.image || ''}
                        onChange={v => {
                          const newPosts = [...(config.posts || [])];
                          newPosts[idx] = { ...newPosts[idx], image: v };
                          updateConfig('posts', newPosts);
                        }}
                      />
                    </div>

                    {/* Slug */}
                    <Field label="Slug (URL)" value={post.slug || ''} onChange={v => {
                      const np = [...(config.posts || [])]; np[idx] = { ...np[idx], slug: v }; updateConfig('posts', np);
                    }} />

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                      <select
                        value={post.category || ''}
                        onChange={e => {
                          const np = [...(config.posts || [])]; np[idx] = { ...np[idx], category: e.target.value }; updateConfig('posts', np);
                        }}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-400 text-sm bg-white"
                      >
                        <option value="">— select —</option>
                        {(config.categories || []).filter(c => c.id !== 'all').map(c => (
                          <option key={c.id} value={c.id}>{c.id}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Publish Date</label>
                      <input type="date" value={post.date || ''}
                        onChange={e => {
                          const np = [...(config.posts || [])]; np[idx] = { ...np[idx], date: e.target.value }; updateConfig('posts', np);
                        }}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-400 text-sm"
                      />
                    </div>

                    {/* Read Time */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Read Time (minutes)</label>
                      <input type="number" min={1} max={60} value={post.readTime || 5}
                        onChange={e => {
                          const np = [...(config.posts || [])]; np[idx] = { ...np[idx], readTime: Number(e.target.value) }; updateConfig('posts', np);
                        }}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-400 text-sm"
                      />
                    </div>

                    {/* Color */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Card Color</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={post.color || '#3b82f6'}
                          onChange={e => {
                            const np = [...(config.posts || [])]; np[idx] = { ...np[idx], color: e.target.value }; updateConfig('posts', np);
                          }}
                          className="w-10 h-10 rounded border cursor-pointer"
                        />
                        <input type="text" value={post.color || ''}
                          onChange={e => {
                            const np = [...(config.posts || [])]; np[idx] = { ...np[idx], color: e.target.value }; updateConfig('posts', np);
                          }}
                          className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-400 text-sm"
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>

                    {/* Featured toggle */}
                    <div className="flex items-center gap-3 pt-6">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={!!post.featured}
                          onChange={e => {
                            const np = [...(config.posts || [])]; np[idx] = { ...np[idx], featured: e.target.checked }; updateConfig('posts', np);
                          }}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
                        <span className="ml-3 text-sm font-semibold text-gray-700">Featured Post</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleCard>

        {/* ══════════════════════════════════════════════════
            SECTION 3 — Translations
        ══════════════════════════════════════════════════ */}
        <CollapsibleCard
          title="Translations"
          icon={<Languages size={20} />}
          badge={`${languages.length} langs`}
          open={expandedSections.translations}
          onToggle={() => toggleSection('translations')}
          color="orange"
        >
          {languages.map(langCode => {
            const t = config.i18n?.[langCode] || {};
            return (
              <div key={langCode} className="mt-6 p-5 bg-white rounded-xl border-2 border-orange-100">
                <h4 className="font-bold text-lg mb-5 flex items-center gap-2 text-orange-800">
                  <Globe size={18} /> {langCode.toUpperCase()}
                </h4>

                <div className="space-y-5">

                  {/* ── Hero ── */}
                  <Section title="Hero" icon={<Star size={15} />}>
                    <Field label="Badge" value={t.hero?.badge || ''} onChange={v => updateConfig(`i18n.${langCode}.hero.badge`, v)} />
                    <Field label="Headline" value={t.hero?.headline || ''} onChange={v => updateConfig(`i18n.${langCode}.hero.headline`, v)} />
                    <Field label="Subheadline" value={t.hero?.subheadline || ''} onChange={v => updateConfig(`i18n.${langCode}.hero.subheadline`, v)} textarea />
                  </Section>

                  {/* ── Labels ── */}
                  <Section title="UI Labels" icon={<Tag size={15} />}>
                    <Field label="Read More" value={t.readMore || ''} onChange={v => updateConfig(`i18n.${langCode}.readMore`, v)} />
                    <Field label="Read Time" value={t.readTime || ''} onChange={v => updateConfig(`i18n.${langCode}.readTime`, v)} />
                    <Field label="Featured" value={t.featured || ''} onChange={v => updateConfig(`i18n.${langCode}.featured`, v)} />
                    <Field label="Table of Contents" value={t.tableOfContents || ''} onChange={v => updateConfig(`i18n.${langCode}.tableOfContents`, v)} />
                    <Field label="Related Posts" value={t.relatedPosts || ''} onChange={v => updateConfig(`i18n.${langCode}.relatedPosts`, v)} />
                    <Field label="Back to Blog" value={t.backToBlog || ''} onChange={v => updateConfig(`i18n.${langCode}.backToBlog`, v)} />
                    <Field label="By (author prefix)" value={t.by || ''} onChange={v => updateConfig(`i18n.${langCode}.by`, v)} />
                    <Field label="Nav Back" value={t.nav?.back || ''} onChange={v => updateConfig(`i18n.${langCode}.nav.back`, v)} />
                  </Section>

                  {/* ── Categories ── */}
                  <Section title="Category Labels" icon={<List size={15} />}>
                    {Object.entries(t.categories || {}).map(([key, val]) => (
                      <Field key={key} label={key} value={val || ''} onChange={v => updateConfig(`i18n.${langCode}.categories.${key}`, v)} />
                    ))}
                  </Section>

                  {/* ── Newsletter ── */}
                  <Section title="Newsletter Section" icon={<Mail size={15} />}>
                    <Field label="Badge" value={t.newsletter?.badge || ''} onChange={v => updateConfig(`i18n.${langCode}.newsletter.badge`, v)} />
                    <Field label="Title" value={t.newsletter?.title || ''} onChange={v => updateConfig(`i18n.${langCode}.newsletter.title`, v)} />
                    <Field label="Subtitle" value={t.newsletter?.subtitle || ''} onChange={v => updateConfig(`i18n.${langCode}.newsletter.subtitle`, v)} textarea />
                    <Field label="Placeholder Text" value={t.newsletter?.placeholder || ''} onChange={v => updateConfig(`i18n.${langCode}.newsletter.placeholder`, v)} />
                    <Field label="CTA Button" value={t.newsletter?.cta || ''} onChange={v => updateConfig(`i18n.${langCode}.newsletter.cta`, v)} />
                  </Section>

                  {/* ── Posts Translations ── */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h5 className="font-semibold text-gray-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <FileText size={15} /> Posts Content
                    </h5>

                    {/* Tip */}
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                      <Lightbulb size={13} className="mt-0.5 shrink-0" />
                      <span>اضغط على اسم أي مقال عشان تشوف وتعدّل فيه — العنوان، المقطع، اسم الكاتب، والأقسام (Sections) اللي جوّاه.</span>
                    </div>

                    <div className="space-y-3">
                      {Object.keys(t.posts || {}).map(postId => {
                        const p = t.posts[postId] || {};
                        const isOpen = openTranslation.lang === langCode && openTranslation.postId === postId;

                        return (
                          <div key={postId} className="border-2 border-white rounded-xl overflow-hidden shadow-sm">
                            {/* Post toggle header */}
                            <div
                              className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${isOpen ? 'bg-orange-500 text-white' : 'bg-white hover:bg-orange-50'}`}
                              onClick={() => setOpenTranslation(isOpen ? { lang: null, postId: null } : { lang: langCode, postId })}
                            >
                              <div className="flex items-center gap-2">
                                <FileText size={14} />
                                <span className="font-semibold text-sm">{p.title || postId}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isOpen ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                  {(p.sections || []).length} sections
                                </span>
                              </div>
                              {isOpen ? <ChevronUp size={15} /> : <ChevronRight size={15} />}
                            </div>

                            {isOpen && (
                              <div className="p-4 space-y-4 bg-orange-50 border-t-2 border-orange-200">

                                {/* Basic info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <Field label="Title" value={p.title || ''} onChange={v => updateConfig(`i18n.${langCode}.posts.${postId}.title`, v)} />
                                  <Field label="Author" value={p.author || ''} onChange={v => updateConfig(`i18n.${langCode}.posts.${postId}.author`, v)} />
                                  <div className="col-span-full">
                                    <Field label="Excerpt (short description)" value={p.excerpt || ''} onChange={v => updateConfig(`i18n.${langCode}.posts.${postId}.excerpt`, v)} textarea />
                                  </div>
                                </div>

                                {/* ─── Sections ─── */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                      <Layers size={14} /> Sections ({(p.sections || []).length})
                                    </p>
                                  </div>

                                  {/* Add section buttons */}
                                  <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white rounded-lg border border-dashed border-orange-300">
                                    <span className="text-xs text-gray-500 w-full mb-1 font-semibold">+ Add Section:</span>
                                    {SECTION_TYPES.map(type => (
                                      <button
                                        key={type}
                                        onClick={() => addSection(langCode, postId, type)}
                                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium transition-colors"
                                      >
                                        <Plus size={11} /> {type}
                                      </button>
                                    ))}
                                  </div>

                                  {/* Section list */}
                                  <div className="space-y-3">
                                    {(p.sections || []).map((section, sIdx) => (
                                      <SectionEditor
                                        key={sIdx}
                                        section={section}
                                        index={sIdx}
                                        total={(p.sections || []).length}
                                        onUpdate={(field, value) => updateSection(langCode, postId, sIdx, field, value)}
                                        onRemove={() => removeSection(langCode, postId, sIdx)}
                                      />
                                    ))}
                                    {(p.sections || []).length === 0 && (
                                      <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                                        No sections yet. Add one above ↑
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </CollapsibleCard>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Editor — renders different UI based on section type
// ─────────────────────────────────────────────────────────────────────────────
function SectionEditor({ section, index, onUpdate, onRemove }) {
  const typeColors = {
    intro:   'bg-blue-100 border-blue-300 text-blue-700',
    tip:     'bg-green-100 border-green-300 text-green-700',
    image:   'bg-purple-100 border-purple-300 text-purple-700',
    callout: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    closing: 'bg-rose-100 border-rose-300 text-rose-700',
  };
  const typeIcons = {
    intro: <AlignLeft size={13} />,
    tip: <Hash size={13} />,
    image: <Image size={13} />,
    callout: <MessageSquare size={13} />,
    closing: <Star size={13} />,
  };
  const colorClass = typeColors[section.type] || 'bg-gray-100 border-gray-300 text-gray-700';

  return (
    <div className={`border-2 rounded-xl overflow-hidden ${colorClass.split(' ').slice(1).join(' ')}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 ${colorClass.split(' ')[0]}`}>
        <div className="flex items-center gap-2">
          <span className={`font-bold text-xs px-2 py-0.5 rounded flex items-center gap-1 ${colorClass}`}>
            {typeIcons[section.type]} {section.type.toUpperCase()}
            {section.type === 'tip' && section.number && ` #${section.number}`}
          </span>
          <span className="text-xs text-gray-400">Section {index + 1}</span>
        </div>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Fields based on type */}
      <div className="p-3 bg-white space-y-3">
        {section.type === 'tip' && (
          <>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Number</label>
                <input type="text" value={section.number || ''} onChange={e => onUpdate('number', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm text-center font-bold"
                  placeholder="01"
                />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Heading</label>
                <input type="text" value={section.heading || ''} onChange={e => onUpdate('heading', e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                  placeholder="Tip heading..."
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Content</label>
              <textarea value={section.text || ''} onChange={e => onUpdate('text', e.target.value)} rows={3}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm resize-none"
                placeholder="Tip body text..."
              />
            </div>
          </>
        )}

        {(section.type === 'intro' || section.type === 'closing') && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              {section.type === 'intro' ? 'Introduction Text' : 'Closing Text'}
            </label>
            <textarea value={section.text || ''} onChange={e => onUpdate('text', e.target.value)} rows={4}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm resize-none"
              placeholder="Write text here..."
            />
          </div>
        )}

        {section.type === 'image' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Image URL</label>
              <input type="url" value={section.src || ''} onChange={e => onUpdate('src', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                placeholder="https://..."
              />
              {section.src && (
                <img src={section.src} alt="preview" className="mt-2 w-full h-28 object-cover rounded-lg" />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Caption</label>
              <input type="text" value={section.caption || ''} onChange={e => onUpdate('caption', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                placeholder="Image caption..."
              />
            </div>
          </>
        )}

        {section.type === 'callout' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Callout Heading</label>
              <input type="text" value={section.heading || ''} onChange={e => onUpdate('heading', e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                placeholder="Pro Tip / Did You Know? ..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Callout Text</label>
              <textarea value={section.text || ''} onChange={e => onUpdate('text', e.target.value)} rows={3}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm resize-none"
                placeholder="Callout content..."
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable components
// ─────────────────────────────────────────────────────────────────────────────

function CollapsibleCard({ title, icon, badge, open, onToggle, color = 'orange', children }) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-200">
      <div className="flex justify-between items-center cursor-pointer" onClick={onToggle}>
        <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
          {icon} {title}
          {badge !== null && badge !== undefined && (
            <span className={`text-sm bg-${color}-100 text-${color}-700 px-2 py-0.5 rounded-full`}>{badge}</span>
          )}
        </h3>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
      {open && <div className="mt-5">{children}</div>}
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
      <h5 className="font-semibold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
        {icon} {title}
      </h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, textarea }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-400 text-sm resize-none"
        />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-orange-400 text-sm"
        />
      )}
    </div>
  );
}

function ImageField({ label, value, onChange }) {
  return (
    <div className="p-4 bg-white rounded-lg border-2 border-orange-100">
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <input type="url" value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 text-sm"
        placeholder="https://..."
      />
      {value && (
        <img src={value} alt="preview" className="mt-2 w-full h-24 object-cover rounded-lg" />
      )}
    </div>
  );
}