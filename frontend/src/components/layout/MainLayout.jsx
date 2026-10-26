import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Clock,
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Calendar,
  Users,
  Menu,
  X,
  LogOut,
  Bell,
  Settings,
  UserCheck,
  Edit2,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import ProfileModal from './ProfileModal';

const navItems = [
  {
    path: '/dashboard',
    label: 'แดชบอร์ด',
    icon: LayoutDashboard,
    roles: ['employee', 'manager', 'admin'],
  },
  {
    path: '/attendance',
    label: 'ลงเวลา',
    icon: Clock,
    roles: ['employee', 'manager', 'admin'],
  },
  {
    path: '/schedule',
    label: 'ตารางการทำงาน',
    icon: Calendar,
    roles: ['employee', 'manager', 'admin'],
  },
  {
    path: '/leave',
    label: 'ลาหยุด',
    icon: CalendarDays,
    roles: ['employee', 'manager', 'admin'],
  },
  {
    path: '/overtime',
    label: 'ล่วงเวลา',
    icon: ClipboardList,
    roles: ['employee', 'manager', 'admin'],
  },
  {
    path: '/admin/users',
    label: 'จัดการผู้ใช้',
    icon: Users,
    roles: ['admin'], // ไม่แก้ ยังเป็น admin เท่านั้น
  },
  {
    path: '/admin/reports',
    label: 'รายงาน',
    icon: Settings,
    roles: ['manager', 'admin'],
  },
];

function MainLayout({ children }) {
  // Mobile: sidebar is a drawer (closed by default)
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Desktop (lg+): sidebar can be collapsed to icons only
  const [isCollapsed, setIsCollapsed] = useState(false);
  // Profile edit modal
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = (e) => {
    e?.stopPropagation?.();
    logout();
    toast.success('ออกจากระบบสำเร็จ');
    navigate('/login');
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  const userRole = user?.role || 'employee';
  const filteredNav = navItems.filter((item) => {
    return item.roles.includes(userRole);
  });

  // Class helpers
  const sidebarPositionClass = isMobileOpen
    ? 'translate-x-0'
    : '-translate-x-full';
  const sidebarWidthClass = isCollapsed ? 'lg:w-16' : 'lg:w-64';
  const hideWhenCollapsedClass = isCollapsed ? 'lg:hidden' : '';
  const centerWhenCollapsedClass = isCollapsed ? 'lg:justify-center' : '';
  const collapsedLogoutDisplayClass = isCollapsed ? 'lg:flex' : '';

  const sidebarClass = `fixed inset-y-0 left-0 z-40 w-64 ${sidebarPositionClass} lg:static lg:translate-x-0 ${sidebarWidthClass} bg-indigo-900 text-white flex flex-col transition-all duration-300 ease-in-out`;

  const now = new Date();
  const longDate = now.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const shortDate = now.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const userInitials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Backdrop (mobile only) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClass}>
        {/* Logo */}
        <div
          className={`flex items-center gap-3 px-4 py-5 border-b border-indigo-700 ${centerWhenCollapsedClass}`}
        >
          <Clock className="w-8 h-8 text-indigo-300 flex-shrink-0" />
          <div className={`flex-1 ${hideWhenCollapsedClass}`}>
            <h1 className="font-bold text-sm leading-tight">ระบบลงเวลา</h1>
            <p className="text-indigo-400 text-xs">Time Attendance</p>
          </div>
          <button
            onClick={closeMobileSidebar}
            className="lg:hidden text-indigo-300 hover:text-white p-1"
            aria-label="ปิดเมนู"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            const linkColorClass = isActive
              ? 'bg-indigo-600 text-white'
              : 'text-indigo-300 hover:bg-indigo-800 hover:text-white';

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileSidebar}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${centerWhenCollapsedClass} ${linkColorClass}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span
                  className={`text-sm font-medium ${hideWhenCollapsedClass}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User Info / Profile Trigger */}
        <div className="border-t border-indigo-700 p-2.5">
          {/* Full user card (always on mobile, on desktop when not collapsed) */}
          <div
            onClick={() => setIsProfileOpen(true)}
            className={`group cursor-pointer flex items-center gap-3 p-1.5 rounded-xl hover:bg-indigo-800/80 transition ${hideWhenCollapsedClass}`}
            title="คลิกเพื่อแก้ไขโปรไฟล์"
            role="button"
            tabIndex={0}
          >
            <div className="relative shrink-0">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-400 group-hover:ring-white transition"
                />
              ) : (
                <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-indigo-400 group-hover:ring-white transition">
                  {userInitials || <UserCheck className="w-4 h-4" />}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 bg-indigo-600 text-white p-0.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition">
                <Edit2 className="w-2.5 h-2.5" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate group-hover:text-indigo-100 transition">
                  {user?.first_name} {user?.last_name}
                </p>
                <Edit2 className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
              </div>
              <p className="text-xs text-indigo-400 truncate">
                {user?.department || user?.position || 'แก้ไขโปรไฟล์'}
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="text-indigo-400 hover:text-white transition p-1.5 rounded-lg hover:bg-indigo-700/60"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop Collapsed: Avatar Trigger */}
          <div className={`hidden ${collapsedLogoutDisplayClass} flex-col items-center gap-2 py-1`}>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="p-0.5 rounded-full hover:ring-2 hover:ring-indigo-300 transition"
              title="แก้ไขโปรไฟล์"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold">
                  {userInitials}
                </div>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex justify-center text-indigo-400 hover:text-white transition p-1"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Mobile: open drawer */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700 transition"
              aria-label="เปิดเมนู"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Desktop: collapse / expand */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block text-gray-500 hover:text-gray-700 transition"
              aria-label="ย่อ/ขยายเมนู"
            >
              {isCollapsed ? (
                <Menu className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button className="relative text-gray-500 hover:text-gray-700 transition p-1.5 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5" />
            </button>

            <div className="text-xs sm:text-sm text-gray-600 truncate border-l border-gray-200 pl-3">
              <span className="hidden sm:inline">{longDate}</span>
              <span className="sm:hidden">{shortDate}</span>
            </div>

            {/* Profile trigger in Top Bar */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition group"
              title="แก้ไขข้อมูลส่วนตัว"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-indigo-200 group-hover:ring-indigo-400 transition"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                  {userInitials || <UserCheck className="w-3.5 h-3.5" />}
                </div>
              )}
              <span className="hidden md:inline text-xs font-semibold text-gray-700 group-hover:text-indigo-600 transition max-w-[120px] truncate">
                {user?.first_name} {user?.last_name}
              </span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>

      {/* Profile Edit Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}

export default MainLayout;
