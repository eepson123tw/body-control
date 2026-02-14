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
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-nav backdrop-blur border-t border-border-default pb-[env(safe-area-inset-bottom)] z-40">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-3 rounded-lg transition-colors ${
                isActive
                  ? 'text-blue-400'
                  : 'text-text-muted hover:text-text-primary'
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
