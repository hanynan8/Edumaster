'use client';

// محرّر الصفحات القانونية (Privacy Policy / Terms & Conditions / Refund Policy).
// نفس المحرّر بيخدم التلات صفحات — كل صفحة collection مستقلة في /api/data،
// وشكل الداتا: { i18n: { ar: {...}, en: {...}, es: {...} } }.
// أول مرة (قبل أي حفظ) بيتحمّل المحتوى الافتراضي الحالي للصفحة عشان يتعدّل.

import { useState, useEffect, createContext, useContext } from 'react';
import {
  Save, RefreshCw, Loader, AlertCircle, CheckCircle,
  ChevronDown, ChevronUp, Plus, Trash2, ArrowUp, ArrowDown,
  RotateCcw, Shield, Scale,
} from 'lucide-react';
import PRIVACY_DEFAULTS from '@/app/lib/legalDefaults/privacy';
import TERMS_DEFAULTS from '@/app/lib/legalDefaults/terms';
import REFUND_DEFAULTS from '@/app/lib/legalDefaults/refund';

const API_BASE_URL = '/api/data';
const LANGS = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

const clone = (o) => JSON.parse(JSON.stringify(o));

const emptyLang = () => ({
  pageTitle: '',
  lastUpdated: '',
  companyInfo: { title: '', fields: [] },
  sections: [],
});

// بيكمّل أي لغة ناقصة من الافتراضي، وبيضمن شكل سليم لكل لغة
function normalize(doc, defaults) {
  const base = doc ? clone(doc) : { _id: 'temp', i18n: {} };
  if (!base._id) base._id = 'temp';
  base.i18n = base.i18n || {};
  for (const { code } of LANGS) {
    const cur = base.i18n[code];
    if (!cur || !Array.isArray(cur.sections)) {
      base.i18n[code] = clone(defaults[code] || emptyLang());
    }
    base.i18n[code].companyInfo = base.i18n[code].companyInfo || { title: '', fields: [] };
    base.i18n[code].companyInfo.fields = base.i18n[code].companyInfo.fields || [];
  }
  return base;
}

// بيشيل العناصر الفاضية قبل الحفظ ويمسح الحقول الاختيارية الفاضية
function cleanForSave(config) {
  const out = clone(config);
  for (const { code } of LANGS) {
    const t = out.i18n[code];
    if (!t) continue;
    t.companyInfo.fields = (t.companyInfo.fields || []).filter(
      (f) => (f.label || '').trim() || (f.value || '').trim()
    );
    t.sections = (t.sections || []).map((sec, i) => {
      const s = { ...sec, id: sec.id || `section-${i + 1}` };
      if (Array.isArray(s.items)) s.items = s.items.map((x) => x.trim()).filter(Boolean);
      if (!s.items || s.items.length === 0) delete s.items;
      for (const k of ['intro', 'text', 'contact']) if (!(s[k] || '').trim()) delete s[k];
      if (Array.isArray(s.subsections)) {
        s.subsections = s.subsections
          .map((sub) => {
            const n = { ...sub };
            if (Array.isArray(n.items)) n.items = n.items.map((x) => x.trim()).filter(Boolean);
            if (!n.items || n.items.length === 0) delete n.items;
            for (const k of ['text', 'contact']) if (!(n[k] || '').trim()) delete n[k];
            return n;
          })
          .filter((sub) => (sub.title || '').trim() || sub.text || sub.items || sub.contact);
        if (s.subsections.length === 0) delete s.subsections;
      } else {
        delete s.subsections;
      }
      return s;
    });
  }
  return out;
}

const DirContext = createContext('ltr');
const inputCls = 'w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 text-sm bg-white';

// ⚠️ لازم يفضلوا برّه LegalPageAdmin — لو اتعرّفوا جوّاه بيتعاد إنشاؤهم مع كل
// ضغطة مفتاح فالحقل يفقد الفوكس.
function Field({ label, value, onChange, textarea, rows = 3, hint }) {
  const dir = useContext(DirContext);
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label} {hint && <span className="text-gray-400 font-normal">({hint})</span>}
      </label>
      {textarea ? (
        <textarea dir={dir} rows={rows} value={value || ''} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      ) : (
        <input dir={dir} type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} className={inputCls} />
      )}
    </div>
  );
}

// قوائم النقاط: textarea، كل سطر = نقطة
function ItemsField({ label, items, onChange }) {
  return (
    <Field
      label={label}
      hint="one item per line"
      textarea
      rows={Math.min(10, Math.max(3, (items || []).length + 1))}
      value={(items || []).join('\n')}
      onChange={(v) => onChange(v.split('\n'))}
    />
  );
}

function LegalPageAdmin({ collection, defaults, title, urlPath, icon: Icon }) {
  const [config, setConfig] = useState(null);
  const [lang, setLang] = useState('ar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [open, setOpen] = useState({}); // sectionIndex -> bool

  useEffect(() => { fetchConfig(); /* eslint-disable-next-line */ }, [collection]);

  const showMessage = (message, type = 'success') => {
    setSuccess(type === 'success' ? message : '');
    setError(type === 'error' ? message : '');
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}?collection=${collection}`);
      // 404 = الكولكشن لسه متعملتش (مفيش حفظ قبل كده) → نبدأ من المحتوى الافتراضي.
      // أول "Save All" بيعمل الكولكشن.
      if (res.status === 404) {
        setConfig(normalize(null, defaults));
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      const doc = Array.isArray(result) && result.length > 0 ? result[0] : null;
      setConfig(normalize(doc, defaults));
    } catch (err) {
      showMessage('Error fetching data: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setLoading(true);
    try {
      const isNew = config._id === 'temp' || !config._id;
      const url = `${API_BASE_URL}?collection=${collection}${isNew ? '' : `&id=${config._id}`}`;
      const payload = cleanForSave(config);
      if (isNew) delete payload._id;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showMessage(`✓ ${title} saved successfully`);
      await fetchConfig();
    } catch (err) {
      showMessage('Error saving: ' + err.message, 'error');
    }
    setLoading(false);
  };

  // ── helpers لتعديل لغة واحدة ──
  const patchLang = (fn) => {
    setConfig((prev) => {
      const next = clone(prev);
      fn(next.i18n[lang]);
      return next;
    });
  };

  const resetLangToDefault = () => {
    if (!defaults[lang]) return;
    if (!window.confirm(`Reset the ${lang.toUpperCase()} content to the original default text? Unsaved and saved edits for this language will be replaced after you press Save.`)) return;
    patchLang((t) => { Object.assign(t, clone(defaults[lang])); });
    setOpen({});
  };

  const t = config?.i18n?.[lang];

  if (!config || !t) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
        {loading ? (
          <Loader className="animate-spin mx-auto" size={48} />
        ) : (
          <div className="space-y-4">
            <p className="text-gray-600">{error || 'Could not load this page.'}</p>
            <button onClick={fetchConfig} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700">
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  const moveSection = (idx, dir) => {
    patchLang((tt) => {
      const j = idx + dir;
      if (j < 0 || j >= tt.sections.length) return;
      [tt.sections[idx], tt.sections[j]] = [tt.sections[j], tt.sections[idx]];
    });
    setOpen((o) => ({ ...o, [idx]: o[idx + dir], [idx + dir]: o[idx] }));
  };

  const addSection = () => {
    patchLang((tt) => {
      tt.sections.push({ id: `section-${Date.now()}`, title: '', text: '' });
    });
    setOpen((o) => ({ ...o, [t.sections.length]: true }));
  };

  const removeSection = (idx) => {
    if (!window.confirm('Delete this section?')) return;
    patchLang((tt) => { tt.sections.splice(idx, 1); });
    setOpen({});
  };

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <DirContext.Provider value={dir}>
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-teal-100">
      {/* Header */}
      <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-teal-50 to-cyan-50">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-3 text-teal-900">
              <Icon size={28} /> {title}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Public page: <span dir="ltr" className="font-mono">{urlPath}</span> — every section, list item and translation below is editable.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchConfig}
              className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2.5 rounded-lg hover:bg-teal-700"
              disabled={loading}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={saveConfig}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2.5 rounded-lg"
              disabled={loading}
            >
              {loading ? <Loader className="animate-spin" size={18} /> : <Save size={18} />} Save All
            </button>
          </div>
        </div>
      </div>

      {(success || error) && (
        <div className={`mx-6 mt-4 px-6 py-4 rounded-xl flex items-center gap-3 ${success ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {success ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
          <span className="font-medium">{success || error}</span>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Language tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen({}); }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition ${
                lang === l.code ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
              }`}
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={resetLangToDefault}
            className="ms-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg border border-gray-200"
            title="Replace this language's content with the original default text"
          >
            <RotateCcw size={14} /> Reset {lang.toUpperCase()} to default
          </button>
        </div>

        {/* Header fields */}
        <div className="p-5 rounded-xl border-2 border-gray-200 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Page Title" value={t.pageTitle} onChange={(v) => patchLang((tt) => { tt.pageTitle = v; })} />
          <Field label="Last Updated line" value={t.lastUpdated} onChange={(v) => patchLang((tt) => { tt.lastUpdated = v; })} />
        </div>

        {/* Company info */}
        <div className="p-5 rounded-xl border-2 border-gray-200 bg-gray-50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Platform Info block</h3>
            <button
              type="button"
              onClick={() => patchLang((tt) => { tt.companyInfo.fields.push({ label: '', value: '' }); })}
              className="flex items-center gap-1.5 text-sm bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700"
            >
              <Plus size={14} /> Add Field
            </button>
          </div>
          <Field label="Block Title" value={t.companyInfo.title} onChange={(v) => patchLang((tt) => { tt.companyInfo.title = v; })} />
          {t.companyInfo.fields.map((f, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="w-1/3">
                <Field label="Label" value={f.label} onChange={(v) => patchLang((tt) => { tt.companyInfo.fields[i].label = v; })} />
              </div>
              <div className="flex-1">
                <Field label="Value" value={f.value} onChange={(v) => patchLang((tt) => { tt.companyInfo.fields[i].value = v; })} />
              </div>
              <button
                type="button"
                onClick={() => patchLang((tt) => { tt.companyInfo.fields.splice(i, 1); })}
                className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-lg"
                title="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              Sections <span className="text-sm bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">{t.sections.length}</span>
            </h3>
            <button
              type="button"
              onClick={addSection}
              className="flex items-center gap-1.5 text-sm bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700"
            >
              <Plus size={14} /> Add Section
            </button>
          </div>

          {t.sections.map((sec, idx) => (
            <div key={sec.id || idx} className="rounded-xl border-2 border-teal-100 bg-white">
              <div className="flex items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [idx]: !o[idx] }))}
                  className="flex-1 flex items-center gap-2 text-start font-semibold text-gray-800 min-w-0"
                >
                  {open[idx] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  <span dir={dir} className="truncate">{sec.title || '(untitled section)'}</span>
                </button>
                <button type="button" onClick={() => moveSection(idx, -1)} disabled={idx === 0} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30" title="Move up"><ArrowUp size={16} /></button>
                <button type="button" onClick={() => moveSection(idx, 1)} disabled={idx === t.sections.length - 1} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30" title="Move down"><ArrowDown size={16} /></button>
                <button type="button" onClick={() => removeSection(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete section"><Trash2 size={16} /></button>
              </div>

              {open[idx] && (
                <div className="p-4 border-t border-gray-100 space-y-4">
                  <Field label="Section Title" value={sec.title} onChange={(v) => patchLang((tt) => { tt.sections[idx].title = v; })} />
                  <Field label="Intro" hint="optional, shown above the list" textarea value={sec.intro} onChange={(v) => patchLang((tt) => { tt.sections[idx].intro = v; })} />
                  <Field label="Text" hint="optional paragraph" textarea rows={5} value={sec.text} onChange={(v) => patchLang((tt) => { tt.sections[idx].text = v; })} />
                  <ItemsField label="Bullet list" items={sec.items} onChange={(arr) => patchLang((tt) => { tt.sections[idx].items = arr; })} />
                  <Field label="Highlighted line" hint="optional, shown in gold (e.g. email or key note)" value={sec.contact} onChange={(v) => patchLang((tt) => { tt.sections[idx].contact = v; })} />

                  {/* Subsections */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Subsections ({(sec.subsections || []).length})</span>
                      <button
                        type="button"
                        onClick={() => patchLang((tt) => {
                          const s = tt.sections[idx];
                          s.subsections = [...(s.subsections || []), { title: '', items: [] }];
                        })}
                        className="flex items-center gap-1 text-xs bg-teal-600 text-white px-2.5 py-1 rounded-lg hover:bg-teal-700"
                      >
                        <Plus size={12} /> Add Subsection
                      </button>
                    </div>
                    {(sec.subsections || []).map((sub, j) => (
                      <div key={j} className="rounded-lg bg-white border border-gray-200 p-3 space-y-3">
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <Field label="Subsection Title" value={sub.title} onChange={(v) => patchLang((tt) => { tt.sections[idx].subsections[j].title = v; })} />
                          </div>
                          <button
                            type="button"
                            onClick={() => patchLang((tt) => { tt.sections[idx].subsections.splice(j, 1); })}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="Remove subsection"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <Field label="Text" hint="optional" textarea value={sub.text} onChange={(v) => patchLang((tt) => { tt.sections[idx].subsections[j].text = v; })} />
                        <ItemsField label="Bullet list" items={sub.items} onChange={(arr) => patchLang((tt) => { tt.sections[idx].subsections[j].items = arr; })} />
                        <Field label="Highlighted line" hint="optional" value={sub.contact} onChange={(v) => patchLang((tt) => { tt.sections[idx].subsections[j].contact = v; })} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
    </DirContext.Provider>
  );
}

export function PrivacyAdmin() {
  return <LegalPageAdmin collection="privacy_policy" defaults={PRIVACY_DEFAULTS} title="Privacy Policy" urlPath="/privacy" icon={Shield} />;
}

export function TermsAdmin() {
  return <LegalPageAdmin collection="terms_conditions" defaults={TERMS_DEFAULTS} title="Terms & Conditions" urlPath="/terms" icon={Scale} />;
}

export function RefundAdmin() {
  return <LegalPageAdmin collection="refund_policy" defaults={REFUND_DEFAULTS} title="Refund & Cancellation Policy" urlPath="/refund" icon={RotateCcw} />;
}

export default PrivacyAdmin;
