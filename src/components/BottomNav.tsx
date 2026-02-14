import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Activity, Utensils, Dumbbell, Settings } from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '首頁' },
  { to: '/inbody', icon: Activity, label: 'InBody' },
  { to: '/diet', icon: Utensils, label: '飲食' },
  { to: '/training', icon: Dumbbell, label: '訓練' },
  { to: '/settings', icon: Settings, label: '設定' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-700/50 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-xs">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
