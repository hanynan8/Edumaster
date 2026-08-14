'use client';

import { useState } from 'react';
import {
  Database, Settings, Home, Navigation, Info, BookOpen,
  Globe, Star, FileText, Phone, Map, Users, MessageSquare,
  Loader, Inbox,
} from 'lucide-react';

import { useSession } from 'next-auth/react';

import NavbarAdmin from './components/(editcomponents)/navbar';
import FooterAdmin from './components/(editcomponents)/footer';
import HomeAdmin from './components/(editcomponents)/home';
import AboutAdmin from './components/(editcomponents)/about';
import ServicesAdmin from './components/(editcomponents)/services';
import CoursesAdmin from './components/(editcomponents)/courses';
import CountriesAdmin from './components/(editcomponents)/countries';
import SuccessStoriesAdmin from './components/(editcomponents)/success-stories';
import BlogAdmin from './components/(editcomponents)/blogs';
import ContactAdmin from './components/(editcomponents)/contact';
import UsersAdmin from './components/usersPanel';
import FormSubmissionsAdmin from './components/formsPanel';
import Gategories from './components/(editcomponents)/categories';

function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      textAlign: 'center',
      padding: '40px 20px',
    }}>
      <h1 style={{
        fontSize: '140px',
        fontWeight: '900',
        color: '#e5e7eb',
        lineHeight: 1,
        margin: 0,
      }}>404</h1>
      <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#4b5563', marginTop: '12px' }}>
        Page Not Found
      </h2>
      <p style={{ color: '#9ca3af', marginTop: '8px', fontSize: '14px' }}>
        You don't have permission to view this page.
      </p>
    </div>
  );
}

function PlaceholderAdmin({ title }) {
  return (
    <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-100 p-12 text-center">
      <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
        <Settings size={36} className="text-blue-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-700 mb-2">{title}</h2>
      <p className="text-gray-400">This section is under development</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('home');
  const [exporting, setExporting] = useState(false);

  // لسه بيجيب بيانات السيشن من NextAuth
  if (status === 'loading') {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
      }}>
        <Loader className="animate-spin text-blue-500" size={44} />
      </div>
    );
  }

  // 🔒 SECURITY: مصدر واحد بس للتحقق من الأدمن — role. اتشال إيميل الفولباك
  // اللي كان بيتعارض مع الحماية بتاعة الـ API، ومهم توضيح إن ده check واجهة بس
  // (UX gate) مش حماية حقيقية — الحماية الفعلية موجودة سيرفر-سايد في كل
  // /api/data و /api/admin/* لأن أي حد يقدر يعدل الـ client code أو يستنى.
  const isAdmin = session?.user?.role === 'admin';
  if (status === 'unauthenticated' || !isAdmin) {
    return <NotFound />;
  }

  // ✅ مسجّل بحساب role = admin → فتح اللوحة مباشرة
  const tabs = [
    { id: 'home',             name: 'Home',             icon: Home,          component: HomeAdmin },
    { id: 'navbar',           name: 'Navbar',           icon: Navigation,    component: NavbarAdmin },
    { id: 'footer',           name: 'Footer',           icon: Info,          component: FooterAdmin },
    { id: 'about',            name: 'About',            icon: Users,         component: AboutAdmin },
    { id: 'services',         name: 'Services',         icon: Star,          component: ServicesAdmin },
    { id: 'courses',          name: 'Courses',          icon: BookOpen,      component: CoursesAdmin },
    { id: 'countries',        name: 'Countries',        icon: Globe,         component: CountriesAdmin },
    { id: 'success_stories',  name: 'Success Stories',  icon: MessageSquare, component: SuccessStoriesAdmin },
    { id: 'blog',             name: 'Blog',             icon: FileText,      component: BlogAdmin },
    { id: 'contact',          name: 'Contact',          icon: Phone,         component: ContactAdmin },
    { id: 'users',            name: 'Users',            icon: Users,         component: UsersAdmin },
    { id: 'form_submissions', name: 'Form Submissions', icon: Inbox,         component: FormSubmissionsAdmin },
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || HomeAdmin;

  // تحميل كل بيانات الموقع كـ JSON من /api/data
  const handleExportAllData = async () => {
    setExporting(true);

    // ⚠️ 'auth' متشالة من هنا عن قصد — كولكشن المستخدمين بقى محمي ومش بيتصدّر
    // مع باقي بيانات الموقع. راجع تبويب Users لو محتاج بيانات المستخدمين.
    const collections = [
      'home', 'navbar', 'footer', 'about', 'services', 'courses',
      'countries', 'success_stories', 'blog', 'contact', 'form'
    ];

    const result = {};

    await Promise.all(collections.map(async (col) => {
      try {
        const res = await fetch(`/api/data?collection=${col}`);
        const json = await res.json();
        result[col] = json;
      } catch (err) {
        result[col] = { error: 'Failed to fetch' };
      }
    }));

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExporting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="ltr">
      <div className="shadow-lg bg-gradient-to-r from-blue-700 to-purple-700 border-b-4 border-blue-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-5 flex-wrap gap-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Database size={30} className="animate-pulse" />
              Edumaster Admin Panel
            </h1>
            <button
              onClick={handleExportAllData}
              disabled={exporting}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-xl transition-colors border border-white/30"
            >
              {exporting ? <Loader size={18} className="animate-spin" /> : <Database size={18} />}
              {exporting ? 'Exporting...' : 'Export All Site Data (JSON)'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[100rem] mx-auto px-2 sm:px-3 lg:px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-5 sticky top-4 border border-gray-200">
              <h2 className="text-lg font-bold mb-5 pb-3 border-b flex items-center gap-2 text-gray-700">
                <Settings size={20} className="text-blue-500" />
                Sections
              </h2>
              <div className="space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left font-medium ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md scale-[1.02]'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={18} />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
}