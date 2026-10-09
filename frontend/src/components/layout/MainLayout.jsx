import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Clock,
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Users,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Bell,
  Settings,
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard, roles: ['employee', 'manager', 'admin'] },
  { path: '/attendance', label: 'ลงเวลา', icon: Clock, roles: ['employee', 'manager', 'admin'] },
  { path: '/leave', label: 'ลาหยุด', icon: CalendarDays, roles: ['employee', 'manager', 'admin'] },
  { path: '/overtime', label: 'ล่วงเวลา', icon: ClipboardList, roles: ['employee', 'manager', 'admin'] },
  { path: '/admin/users', label: 'จัดการผู้ใช้', icon: Users, roles: ['admin'] },
  { path: '/admin/reports', label: 'รายงาน', icon: Settings, roles: ['manager', 'admin'] },
];

function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout, isAdmin } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('ออกจากระบบสำเร็จ');
    navigate('/login');
  };

  const filteredNav = navItems.filter((item) =>
    item.roles.includes(user?.role || 'employee')
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-indigo-900 text-white flex flex-col transition-all duration-300 ease-in-out`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-indigo-700">
          <Clock className="w-8 h-8 text-indigo-300 flex-shrink-0" />
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-sm leading-tight">ระบบลงเวลา</h1>
              <p className="text-indigo-400 text-xs">Time Attendance</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-indigo-300 hover:bg-indigo-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="border-t border-indigo-700 p-3">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-indigo-400 truncate">{user?.department}</p>
              </div>
              <button onClick={handleLogout} className="text-indigo-400 hover:text-white transition p-1">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogout} className="w-full flex justify-center text-indigo-400 hover:text-white transition p-1">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            <button className="relative text-gray-500 hover:text-gray-700 transition">
              <Bell className="w-5 h-5" />
            </button>
            <div className="text-sm text-gray-600">
              {new Date().toLocaleDateString('th-TH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
