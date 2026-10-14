/**
 * Sidebar — Collapsible 3-state (full / collapsed / mobile-hidden)
 *
 * States:
 *  - `expanded` (256px): full menu, label + icon
 *  - `collapsed` (72px):  chỉ icon, hover để popover mở rộng
 *  - mobile: ẩn hoàn toàn, mở bằng button toggle trong Header
 *
 * - 3 nhóm menu: Nghiệp vụ · Đối tác · Quản trị
 * - Active state highlight cả group khi vào sub-route
 * - Tooltip khi collapsed (show label on hover)
 */
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Disclosure } from '@headlessui/react';
import { ChevronDown, Pill, X, LogOut } from 'lucide-react';
import { MENU_ITEMS } from '../../utils/constants';
import { ROLE_LABELS } from '../../utils/constants';
import { ICON_MAP } from './icons';
import { cn } from '../../utils/cn';

// === Gom menu thành 3 nhóm theo nghiệp vụ ===
    // MENU_GROUPS — gộp items theo nhóm nghiệp vụ
// NOTE: Phiếu thu không còn mục sidebar riêng, đã gộp vào Tài chính
const MENU_GROUPS = [
  {
    key: 'operations',
    label: 'Nghiệp vụ',
    items: ['dashboard', 'banhang', 'thuoc', 'danh-muc', 'kho'],
  },
  {
    key: 'partners',
    label: 'Đối tác',
    items: ['khachhang', 'nhacungcap', 'nhanvien'],
  },
  {
    key: 'admin',
    label: 'Quản trị',
    // Audit log + System config (Phase 3I — Admin-only observability)
    items: ['taichinh', 'thongke', 'audit-log', 'system-config', 'change-password', 'api-docs'],
  },
];

function NavItem({ item, isActive, onNavigate, isCollapsed, collapsedHover }) {
  const Icon = ICON_MAP[item.icon] || Pill;
  const showLabel = !isCollapsed || collapsedHover;

  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      title={isCollapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-btn text-body relative',
        'transition-colors duration-150',
        isCollapsed && 'justify-center px-0',
        isActive
          ? 'bg-primary-50 text-neutral-900 font-semibold'
          : 'text-neutral-900 hover:bg-neutral-100',
        collapsedHover && isCollapsed && 'bg-primary-50 text-neutral-900'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className={cn(
          'w-4 h-4 flex-shrink-0',
          isActive ? 'text-primary-600' : 'text-neutral-500',
          collapsedHover && isCollapsed && 'text-primary-600'
        )}
        aria-hidden="true"
      />
      {showLabel && <span className="truncate">{item.label}</span>}

      {/* Active indicator bên trái */}
      {isActive && !isCollapsed && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-600 rounded-r-full"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

function MenuGroup({ group, items, currentPath, onNavigate, isCollapsed, collapsedHover }) {
  // Khi collapsed, không dùng Disclosure — hiển thị flat list dạng icon
  if (isCollapsed && !collapsedHover) {
    return (
      <div className="mb-2">
        <div className="w-8 h-px bg-neutral-200 mx-auto my-2" aria-hidden="true" />
        <div className="space-y-0.5">
          {items.map((item) => {
            const matches = item.activeMatch || [item.path];
            const isActive = matches.some(
              (p) => currentPath === p || currentPath.startsWith(p + '/')
            );
            return (
              <NavItem
                key={item.key}
                item={item}
                isActive={isActive}
                onNavigate={onNavigate}
                isCollapsed
                collapsedHover={false}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Expanded: luôn mở tất cả groups (user yêu cầu)
  return (
    <Disclosure defaultOpen={true}>
      {({ open }) => (
        <div className="mb-1">
          <Disclosure.Button
            className={cn(
              'w-full flex items-center justify-between px-2 py-1.5',
              'text-caption font-semibold text-neutral-900 uppercase tracking-wide',
              'hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded'
            )}
          >
            <span>{group.label}</span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 transition-transform duration-200',
                open && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </Disclosure.Button>
          <Disclosure.Panel className="mt-1 space-y-0.5">
            {items.map((item) => {
              const matches = item.activeMatch || [item.path];
              const isActive = matches.some(
                (p) => currentPath === p || currentPath.startsWith(p + '/')
              );
              return (
                <NavItem
                  key={item.key}
                  item={item}
                  isActive={isActive}
                  onNavigate={onNavigate}
                  isCollapsed={false}
                  collapsedHover={false}
                />
              );
            })}
          </Disclosure.Panel>
        </div>
      )}
    </Disclosure>
  );
}

function Sidebar({
  isCollapsed,
  isMobileOpen,
  userRole,
  user,
  onCloseMobile,
  onNavigate,
  onLogout,
}) {
  const location = useLocation();
  const [hoverExpanded, setHoverExpanded] = useState(false);

  const visibleMenu = MENU_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );
  const groupedMenu = MENU_GROUPS.map((group) => ({
    ...group,
    items: visibleMenu.filter((item) => group.items.includes(item.key)),
  })).filter((g) => g.items.length > 0);

  const displayLabel = !isCollapsed || hoverExpanded;
  const effectiveCollapsed = isCollapsed && !hoverExpanded;

  return (
    <>
      {/* ===== Mobile: Backdrop + slide-in ===== */}
      <div
        className={cn(
          'fixed inset-0 bg-neutral-900/40 z-30 lg:hidden transition-opacity duration-200',
          isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onCloseMobile}
        aria-hidden="true"
      />

      <aside
        onMouseEnter={() => isCollapsed && setHoverExpanded(true)}
        onMouseLeave={() => isCollapsed && setHoverExpanded(false)}
        className={cn(
          // Base
          'flex flex-col bg-white border-r border-neutral-200 shadow-card',
          // Mobile: slide in/out
          'fixed inset-y-0 left-0 z-40',
          'transition-transform duration-300 ease-in-out',
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full',
          // Desktop: fixed width, NO shrink
          'lg:static lg:translate-x-0 lg:flex-shrink-0',
          !isCollapsed
            ? 'lg:w-64'                          // Expanded: 256px
            : 'lg:w-[72px]'                      // Collapsed: 72px
        )}
        aria-label="Menu điều hướng"
      >
        {/* ===== Logo ===== */}
        <div
          className={cn(
            'flex items-center border-b border-neutral-200',
            displayLabel ? 'justify-between p-4' : 'justify-center p-3'
          )}
        >
          {displayLabel ? (
            // Expanded: icon + text + brand name
            <Link
              to="/dashboard"
              onClick={onNavigate}
              className="flex items-center gap-2.5 min-w-0"
              aria-label="SecurePharma — Về trang chủ"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-card bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-sm">
                <Pill className="w-5 h-5 text-accent-400" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-body font-bold text-neutral-900 truncate">
                  SecurePharma
                </h1>
                <p className="text-caption text-neutral-500 truncate">
                  Quản lý dược phẩm
                </p>
              </div>
            </Link>
          ) : (
            // Collapsed: icon-only, centered
            <Link
              to="/dashboard"
              onClick={onNavigate}
              className="flex items-center justify-center w-10 h-10 rounded-btn hover:bg-neutral-100 transition-colors"
              aria-label="SecurePharma — Về trang chủ"
            >
              <div className="flex-shrink-0 w-9 h-9 rounded-card bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center shadow-sm">
                <Pill className="w-5 h-5 text-accent-400" aria-hidden="true" />
              </div>
            </Link>
          )}

          {isMobileOpen && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-btn text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 lg:hidden"
              aria-label="Đóng menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ===== Menu ===== */}
        <nav
          className={cn(
            'flex-1 overflow-y-auto py-4',
            displayLabel ? 'px-3' : 'px-2'
          )}
          aria-label="Main"
        >
          {groupedMenu.map((group) => (
            <MenuGroup
              key={group.key}
              group={group}
              items={group.items}
              currentPath={location.pathname}
              onNavigate={onNavigate}
              isCollapsed={effectiveCollapsed}
              collapsedHover={hoverExpanded}
            />
          ))}
        </nav>

        {/* ===== Footer: Logout (khi collapsed hiện icon-only) ===== */}
        <div
          className={cn(
            'border-t border-neutral-200 py-3',
            displayLabel ? 'px-4' : 'px-2'
          )}
        >
          {displayLabel ? (
            <div>
              <button
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-btn text-body text-danger-600 hover:bg-danger-50 transition-colors"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Đăng xuất</span>
              </button>
              <div className="mt-3 text-caption text-neutral-500">
                <p>Phiên bản 1.0.0</p>
                <p className="mt-0.5">© 2026 SecurePharma</p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              title="Đăng xuất"
              className="w-full flex justify-center items-center py-2 rounded-btn text-danger-600 hover:bg-danger-50 transition-colors"
              aria-label="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

// Helper lấy 2 chữ cái đầu
function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');
}

export default Sidebar;
