'use client';

import { useState } from 'react';
import {
  Database, Settings, Home, Navigation, Info,
  Globe, Star, FileText, Phone, Map, Users, MessageSquare,
  Loader, Inbox, Tags, Layers, DollarSign, BarChart3, ChevronDown, ArrowLeft,
} from 'lucide-react';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ProfileSettingsCard from '../components/ProfileSettingsCard';

import NavbarAdmin from './components/(editcomponents)/navbar';
import FooterAdmin from './components/(editcomponents)/footer';
import HomeAdmin from './components/(editcomponents)/home';
import AboutAdmin from './components/(editcomponents)/about';
import ServicesAdmin from './components/(editcomponents)/services';
import CountriesAdmin from './components/(editcomponents)/countries';
import SuccessStoriesAdmin from './components/(editcomponents)/success-stories';
import BlogAdmin from './components/(editcomponents)/blogs';
import ContactAdmin from './components/(editcomponents)/contact';
import UsersAdmin from './components/usersPanel';
import FormSubmissionsAdmin from './components/formsPanel';
import Gategories from './components/(editcomponents)/categories';
import MembershipPlansAdmin from './components/membershipPlansPanel';
import RevenueAdmin from './components/revenuePanel';
import OverviewAdmin from './components/overviewPanel';

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

// 🆕 قسّمنا الـ Sections (بدل ما كانت قائمة واحدة مفروشة) إلى مجموعات
// قابلة للطي (dropdown) — كل مجموعة في نفس مكانها بالظبط زي ما كانت
// عناصرها الأصلية بالترتيب، بس دلوقتي متجمّعة تحت عنوان واحد يتفتح/يتقفل.
// عنصر بمفرده (زي Overview) بيفضل يظهر كزرار عادي من غير طي.
const SIDEBAR_GROUPS = [
  {
    id: 'overview',
    type: 'single',
    name: 'Overview',
    icon: BarChart3,
    component: OverviewAdmin,
  },
  {
    id: 'pages',
    type: 'group',
    name: 'Pages',
    icon: FileText,
    items: [
      { id: 'home',    name: 'Home',    icon: Home,       component: HomeAdmin },
      { id: 'navbar',  name: 'Navbar',  icon: Navigation, component: NavbarAdmin },
      { id: 'footer',  name: 'Footer',  icon: Info,       component: FooterAdmin },
      { id: 'about',   name: 'About',   icon: Users,      component: AboutAdmin },
      { id: 'services',name: 'Services',icon: Star,       component: ServicesAdmin },
      { id: 'countries',       name: 'Countries',        icon: Globe,         component: CountriesAdmin },
      { id: 'success_stories', name: 'Success Stories',  icon: MessageSquare, component: SuccessStoriesAdmin },
      { id: 'blog',            name: 'Blog',              icon: FileText,      component: BlogAdmin },
      { id: 'contact',         name: 'Contact',           icon: Phone,         component: ContactAdmin },
    ],
  },
  {
    id: 'categories',
    type: 'single',
    name: 'Categories',
    icon: Tags,
    component: Gategories,
  },
  {
    id: 'business',
    type: 'group',
    name: 'Business',
    icon: DollarSign,
    items: [
      { id: 'membership_plans', name: 'Membership Plans', icon: Layers,     component: MembershipPlansAdmin },
      { id: 'revenue',          name: 'Revenue',          icon: DollarSign, component: RevenueAdmin },
    ],
  },
  {
    id: 'management',
    type: 'group',
    name: 'Management',
    icon: Users,
    items: [
      { id: 'users',            name: 'Users',            icon: Users, component: UsersAdmin },
      { id: 'form_submissions', name: 'Form Submissions', icon: Inbox, component: FormSubmissionsAdmin },
    ],
  },
];

// كل الـ tabs في قائمة مفروشة واحدة (بنفس ترتيبها الأصلي) — مستخدمة بس
// عشان نلاقي بيها الكومبوننت النشط، من غير ما نغيّر منطق activeTab نفسه.
const FLAT_TABS = SIDEBAR_GROUPS.flatMap(g => (g.type === 'single' ? [g] : g.items));

// المجموعة اللي فيها تاب معين (لو موجود) — بنستخدمها لفتح المجموعة
// الصح تلقائيًا لو الـ activeTab اللي جوّاها.
function findGroupIdForTab(tabId) {
  const group = SIDEBAR_GROUPS.find(g => g.type === 'group' && g.items.some(i => i.id === tabId));
  return group?.id || null;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);
  // 🆕 حالة فتح/قفل كل مجموعة — كلهم مقفولين افتراضيًا، وبيتفتحوا بس لما
  // المستخدم يدوس على عنوان المجموعة، أو يدوس على تاب جواها (يفتحها تلقائيًا).
  const [openGroups, setOpenGroups] = useState({});

  function toggleGroup(groupId) {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  }

  function selectTab(tabId) {
    setActiveTab(tabId);
    const groupId = findGroupIdForTab(tabId);
    if (groupId) setOpenGroups(prev => ({ ...prev, [groupId]: true }));
  }

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
  const ActiveComponent = FLAT_TABS.find(t => t.id === activeTab)?.component || HomeAdmin;

  // تحميل كل بيانات الموقع كـ JSON من /api/data
  const handleExportAllData = async () => {
    setExporting(true);

    // ⚠️ 'auth' متشالة من هنا عن قصد — كولكشن المستخدمين بقى محمي ومش بيتصدّر
    // مع باقي بيانات الموقع. راجع تبويب Users لو محتاج بيانات المستخدمين.
    const collections = [
      'home', 'navbar', 'footer', 'about', 'services',
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
            <div className="flex flex-col gap-1.5">
              {/* 🆕 رجوع سريع للموقع الأساسي — سهم بسيط فوق العنوان مباشرة */}
              <Link
                href="/"
                title="الرجوع للموقع"
                className="text-white/70 hover:text-white transition-colors w-fit"
              >
                <ArrowLeft size={32} strokeWidth={1.25} />
              </Link>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Database size={30} className="animate-pulse" />
                Edumaster Admin Panel
              </h1>
            </div>
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
            <ProfileSettingsCard locale="en" isRTL={false} />

            <div className="bg-white rounded-2xl shadow-xl p-5 sticky top-4 border border-gray-200">
              <h2 className="text-lg font-bold mb-5 pb-3 border-b flex items-center gap-2 text-gray-700">
                <Settings size={20} className="text-blue-500" />
                Sections
              </h2>
              <div className="space-y-2">
                {SIDEBAR_GROUPS.map(group => {
                  // ── عنصر مفرد (زي Overview): نفس الزرار القديم بالظبط ──
                  if (group.type === 'single') {
                    const Icon = group.icon;
                    const isActive = activeTab === group.id;
                    return (
                      <button
                        key={group.id}
                        onClick={() => selectTab(group.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left font-medium ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md scale-[1.02]'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{group.name}</span>
                      </button>
                    );
                  }

                  // ── مجموعة (Pages / Content / Business / Management): قائمة منسدلة ──
                  const GroupIcon = group.icon;
                  const isOpen = !!openGroups[group.id];
                  const hasActiveChild = group.items.some(i => i.id === activeTab);

                  return (
                    <div key={group.id}>
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all text-left font-medium ${
                          hasActiveChild
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <GroupIcon size={18} />
                          <span>{group.name}</span>
                        </span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {isOpen && (
                        <div className="mt-1 ms-3 ps-3 border-l-2 border-gray-100 space-y-1">
                          {group.items.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => selectTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left text-sm font-medium ${
                                  isActive
                                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                              >
                                <Icon size={16} />
                                <span>{tab.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
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