'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import { useState } from 'react';
import {
  HomeIcon,
  ShoppingBagIcon,
  CubeIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Prodotti', href: '/products', icon: ShoppingBagIcon },
  { name: 'Ordini', href: '/orders', icon: CubeIcon },
  { name: 'Inventario', href: '/inventory', icon: ChartBarIcon },
  { name: 'Account', href: '/accounts', icon: UserGroupIcon },
  { name: 'Impostazioni', href: '/settings', icon: Cog6ToothIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Preserve account ID in navigation links
  const accountId = searchParams.get('account');
  const accountParam = accountId ? `?account=${accountId}` : '';

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 glass border-r border-gray-200/50 dark:border-slate-700/50 z-50 flex flex-col transition-all duration-300">
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-gray-100/50 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300">
            Sellerboard
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={`${item.href}${accountParam}`}
              className={`
                group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200
                ${isActive
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 shadow-sm ring-1 ring-orange-200 dark:ring-orange-800'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              <item.icon
                className={`
                  mr-3 h-5 w-5 transition-colors duration-200
                  ${isActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300'}
                `}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Menu */}
      <div className="p-4 border-t border-gray-100/50 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center ring-2 ring-white dark:ring-slate-700 shadow-sm">
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              Admin
            </p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
