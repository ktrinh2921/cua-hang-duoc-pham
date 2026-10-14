/**
 * MainLayout — Sidebar (collapsible) + Header + Content + Breadcrumb
 *
 * - Desktop: sidebar 3-state (full / collapsed / hidden) — animated width
 * - Mobile: sidebar slide-in/out via button trong Header
 * - Collapsed sidebar hover-expand (mouse enter → reveal labels)
 * - LocalStorage lưu trạng thái collapse
 * - Skip-link cho a11y
 */
import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import Breadcrumb from '../ui/Breadcrumb';

const STORAGE_KEY = 'securepharma:sidebar:collapsed';

function readSavedCollapse() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Collapsed (desktop) — lưu vào localStorage
  const [isCollapsed, setIsCollapsed] = useState(readSavedCollapse);
  // Mobile drawer
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, isCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [isCollapsed]);

  // Tự đóng drawer mobile khi resize lên desktop
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) setIsMobileOpen(false);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((v) => !v);
  }, []);

  const toggleMobile = useCallback(() => {
    setIsMobileOpen((v) => !v);
  }, []);

  const closeMobile = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const handleNavigate = useCallback(() => {
    if (window.innerWidth < 1024) setIsMobileOpen(false);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50">
      {/* ===== Skip Link (a11y) ===== */}
      <a
        href="#main-content"
        className="
          sr-only focus:not-sr-only
          focus:fixed focus:top-3 focus:left-3 focus:z-[100]
          focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white
          focus:rounded-btn focus:shadow-modal
          focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-300
        "
      >
        Bỏ qua đến nội dung chính
      </a>

      {/* ===== Sidebar ===== */}
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        userRole={user?.role}
        user={user}
        onCloseMobile={closeMobile}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      {/* ===== Main ===== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          user={user}
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          onToggleSidebar={toggleCollapse}
          onToggleMobile={toggleMobile}
          onLogout={handleLogout}
        />

        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Breadcrumb */}
            <Breadcrumb />

            {/* Page content */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
