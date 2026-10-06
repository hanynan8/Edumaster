// PATH: app/admin/components/(editcomponents)/success-videos.jsx
'use client';

// تاب الأدمن "Success Videos": تحكم في فيديوهات قصص النجاح بس.
// إضافة فيديو واحدة هنا بتظهر في:
//   - صفحة /success-stories (كل الفيديوهات)
//   - الهوم (أول 4 فيديوهات)
// بتتخزّن في حقل storyVideos جوه document الـ successStories. الحفظ بيبعت
// الحقل ده بس (PUT جزئي)، فمفيش أي تأثير على باقي محتوى الصفحة.

import { useState, useEffect } from 'react';
import { Save, RefreshCw, Loader, AlertCircle, CheckCircle, Plus, Trash2, ArrowUp, ArrowDown, Video } from 'lucide-react';
import MediaUploader from '@/app/teacher/components/MediaUploader';

const API = '/api/data?collection=successStories';
const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const MAX_VIDEOS = 24;

// بياخد videoId من: ID لوحده، أو رابط embed/play/directplay من Bunny
function extractVideoId(input) {
  const m = String(input || '').match(UUID_RE);
  return m ? m[1].toLowerCase() : null;
}

export default function SuccessVideosAdmin() {
  const [docId, setDocId] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newInput, setNewInput] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [uploaderKey, setUploaderKey] = useState(0);

  useEffect(() => { fetchVideos(); }, []);

  const flash = (msg, type = 'success') => {
    setSuccess(type === 'success' ? msg : '');
    setError(type === 'error' ? msg : '');
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      const doc = Array.isArray(result) ? result[0] : result;
      if (!doc?._id) {
        setDocId(null);
        flash('Create the Success Stories page content first (Success Stories tab), then come back here.', 'error');
      } else {
        setDocId(doc._id);
        setVideos(Array.isArray(doc.storyVideos) ? doc.storyVideos : []);
        setDirty(false);
      }
    } catch (err) {
      flash('Error loading videos: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const save = async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}&id=${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyVideos: videos }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDirty(false);
      flash('✓ Videos saved — they now show on the Home page (first 4) and the Success Stories page');
    } catch (err) {
      flash('Error saving: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const mutate = (next) => { setVideos(next); setDirty(true); };

  const addVideo = (videoId, title = '') => {
    if (videos.length >= MAX_VIDEOS) return flash(`Maximum ${MAX_VIDEOS} videos`, 'error');
    if (videos.some((v) => v.videoId === videoId)) return flash('This video is already in the list', 'error');
    mutate([...videos, { id: `v${Date.now()}`, videoId, title: title.trim(), thumbnail: '' }]);
    setNewInput('');
    setNewTitle('');
    setUploaderKey((k) => k + 1);
  };

  const handleAddByLink = () => {
    const id = extractVideoId(newInput);
    if (!id) return flash('Paste a valid Bunny video ID or embed link', 'error');
    addVideo(id, newTitle);
  };

  // بعد الرفع المباشر: الرد فيه رابط التشغيل → بنطلّع منه الـ videoId
  const handleUploaded = ({ url }) => {
    const id = extractVideoId(url);
    if (!id) return flash('Upload finished but the video ID could not be read', 'error');
    addVideo(id, newTitle);
  };

  const update = (idx, patch) => mutate(videos.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  const remove = (idx) => {
    if (!window.confirm('Remove this video from Home and Success Stories?')) return;
    mutate(videos.filter((_, i) => i !== idx));
  };
  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= videos.length) return;
    const next = [...videos];
    [next[idx], next[j]] = [next[j], next[idx]];
    mutate(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Video size={22} className="text-[#003A91]" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Success Videos</h2>
            <p className="text-sm text-gray-500">
              One list controls both pages: the first 4 appear on Home, all of them on Success Stories.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={fetchVideos} disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Reload
          </button>
          <button type="button" onClick={save} disabled={loading || !docId || !dirty}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#003A91] text-white text-sm font-bold hover:opacity-90 disabled:opacity-40">
            {loading ? <Loader size={15} className="animate-spin" /> : <Save size={15} />} Save
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl"><AlertCircle size={16} /> {error}</div>}
      {success && <div className="flex items-center gap-2 bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl"><CheckCircle size={16} /> {success}</div>}
      {dirty && <div className="bg-amber-50 text-amber-700 text-sm px-4 py-2.5 rounded-xl">You have unsaved changes — press Save.</div>}

      {/* ── Add video ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <p className="text-sm font-bold text-gray-800 flex items-center gap-2"><Plus size={16} /> Add a video</p>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Title (optional — shown under the video)</label>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={200}
            className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#003A91]" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Option 1 — Upload a video file</label>
            <MediaUploader key={uploaderKey} kind="video" onUploaded={handleUploaded} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Option 2 — Bunny video ID or embed link</label>
            <div className="flex gap-2">
              <input value={newInput} onChange={(e) => setNewInput(e.target.value)} dir="ltr"
                placeholder="f2743013-e4ea-4a68-951a-e89337e46d53"
                className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#003A91]" />
              <button type="button" onClick={handleAddByLink}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:opacity-90">Add</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── List ── */}
      {videos.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">
          No videos yet. {docId ? 'Until you add one, the site keeps showing the original default video.' : ''}
        </p>
      ) : (
        <div className="space-y-3">
          {videos.map((v, i) => (
            <div key={v.id || i} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-3 md:w-56 shrink-0">
                <span className="w-8 h-8 rounded-full bg-[#003A91]/10 text-[#003A91] text-sm font-black flex items-center justify-center">{i + 1}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${i < 4 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {i < 4 ? 'Home + Page' : 'Page only'}
                </span>
              </div>
              <div className="flex-1 min-w-0 grid sm:grid-cols-2 gap-3">
                <input value={v.title || ''} onChange={(e) => update(i, { title: e.target.value })} placeholder="Title (optional)" maxLength={200}
                  className="rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:border-[#003A91]" />
                <input value={v.videoId || ''} readOnly dir="ltr"
                  className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2 text-xs text-gray-500 font-mono" />
                <input value={v.thumbnail || ''} onChange={(e) => update(i, { thumbnail: e.target.value.trim() })} dir="ltr"
                  placeholder="Thumbnail image URL (optional, https)"
                  className="sm:col-span-2 rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:border-[#003A91]" />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"
                  className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30"><ArrowUp size={15} /></button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === videos.length - 1} aria-label="Move down"
                  className="w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30"><ArrowDown size={15} /></button>
                <button type="button" onClick={() => remove(i)} aria-label="Remove"
                  className="w-9 h-9 rounded-lg border border-red-100 flex items-center justify-center text-red-500 hover:bg-red-50"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}