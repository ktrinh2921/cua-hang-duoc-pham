/**
 * Header — Top bar với menu user dropdown (Headless UI Menu)
 *
 * - Toggle button thống nhất: mobile mở drawer, desktop toggle collapse
 * - Menu user với avatar + tên + role + actions
 * - Responsive: ẩn text khi màn nhỏ
 */
import { Fragment } from 'react';
import { Menu } from '@headlessui/react';
import {
  LogOut,
  User,
  KeyRound,
  Menu as MenuIcon,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROLE_LABELS } from '../../utils/constants';
import { cn } from '../../utils/cn';

function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

function Header({
  user,
  isCollapsed,
  isMobileOpen,
  onToggleSidebar,
  onToggleMobile,
  onLogout,
}) {
  const displayName = user?.employee?.tenNV || user?.username || 'User';
  const roleLabel = ROLE_LABELS[user?.role] || user?.role || 'Khách';
  const initials = getInitials(displayName);

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur-sm border-b border-neutral-200 px-4 flex items-center justify-between gap-4 shadow-sm">
      {/* Left: Toggle (mobile + desktop) */}
      <div className="flex items-center gap-2">
        {/* Mobile: mở drawer slide-in */}
        <button
          type="button"
          onClick={onToggleMobile}
          className={cn(
            'lg:hidden p-2 rounded-btn text-neutral-600',
            'hover:bg-neutral-100 hover:text-neutral-900',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
          )}
          aria-label={isMobileOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={isMobileOpen}
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        {/* Desktop: toggle collapse sidebar */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            'hidden lg:flex items-center gap-1.5 px-2 py-1.5 rounded-btn text-caption font-medium text-neutral-600',
            'hover:bg-neutral-100 hover:text-neutral-900',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            'transition-colors duration-150'
          )}
          aria-label={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          aria-pressed={isCollapsed}
          title={isCollapsed ? 'Mở rộng (Ctrl+B)' : 'Thu gọn (Ctrl+B)'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>

        {/* Brand (mobile only) */}
        <Link
          to="/dashboard"
          className="lg:hidden flex items-center gap-2 min-w-0"
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-btn bg-primary-600 flex items-center justify-center">
            <span className="text-caption font-bold text-accent-400">SP</span>
          </div>
          <span className="text-body font-bold text-neutral-900 truncate">
            SecurePharma
          </span>
        </Link>
      </div>

      {/* Right: User menu */}
      <Menu as="div" className="relative">
        <Menu.Button
          className={cn(
            'flex items-center gap-2 sm:gap-3 px-2 py-1.5 rounded-btn',
            'hover:bg-neutral-100',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
            'transition-colors duration-150'
          )}
        >
          <div className="text-right hidden sm:block">
            <p className="text-body font-semibold text-neutral-900 leading-tight">
              {displayName}
            </p>
            <p className="text-caption text-neutral-500 leading-tight">
              {roleLabel}
            </p>
          </div>
          <div
            className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 text-white flex items-center justify-center text-caption font-semibold flex-shrink-0 shadow-sm"
            aria-hidden="true"
          >
            {initials || <User className="w-4 h-4" />}
          </div>
          <ChevronDown
            className="w-4 h-4 text-neutral-500 hidden sm:block"
            aria-hidden="true"
          />
        </Menu.Button>

        <Menu.Items
          className={cn(
            'absolute right-0 z-50 mt-2 w-64 origin-top-right',
            'rounded-card bg-white shadow-modal border border-neutral-200',
            'py-1 focus:outline-none animate-slide-up'
          )}
        >
          {/* User card */}
          <div className="px-4 py-3 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-primary-700 text-white flex items-center justify-center text-body font-semibold flex-shrink-0"
                aria-hidden="true"
              >
                {initials || <User className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-body font-semibold text-neutral-900 truncate">
                  {displayName}
                </p>
                <p className="text-caption text-neutral-500 truncate">
                  {user?.username} · {roleLabel}
                </p>
              </div>
            </div>
          </div>

          <div className="py-1">
            <Menu.Item as={Fragment}>
              {({ focus }) => (
                <Link
                  to="/change-password"
                  className={cn(
                    'flex items-center gap-2.5 px-4 py-2 text-body',
                    focus
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-700'
                  )}
                >
                  <KeyRound className="w-4 h-4" aria-hidden="true" />
                  Đổi mật khẩu
                </Link>
              )}
            </Menu.Item>
          </div>

          <div className="border-t border-neutral-100 py-1">
            <Menu.Item as={Fragment}>
              {({ focus }) => (
                <button
                  type="button"
                  onClick={onLogout}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-4 py-2 text-body',
                    focus ? 'bg-danger-50 text-danger-700' : 'text-danger-600'
                  )}
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Đăng xuất
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Menu>
    </header>
  );
}

export default Header;
