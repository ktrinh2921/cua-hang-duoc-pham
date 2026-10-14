/**
 * LoginPage — Đăng nhập SecurePharma (Centered card + animated blob bg)
 *
 * Layout:
 *  - Animated radial blobs ở background (primary + accent + info)
 *  - Brand pill ở top (SecurePharma logo + tagline)
 *  - Glass-morphism card chứa form
 *  - Demo accounts pills ở dưới form
 *  - Footer bản quyền
 *
 * Refactored với design system + animation tokens (Phase UI Polish).
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Pill,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  Lock,
  User,
  Sparkles,
  Stethoscope,
  FlaskConical,
  UserCog,
  ShoppingCart,
  Warehouse,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';

// 3 USP pills nhỏ dưới tagline (mobile-friendly)
const USP = [
  { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: 'RBAC' },
  { icon: <FlaskConical className="w-3.5 h-3.5" />, label: 'AES-256' },
  { icon: <Stethoscope className="w-3.5 h-3.5" />, label: 'Audit log' },
];

// Demo accounts — click icon để tự điền username + password
const DEMO_ACCOUNTS = [
  {
    role: 'Quản lý',
    username: 'admin.huong',
    password: 'Admin@2026',
    icon: UserCog,
    color: 'primary',
  },
  {
    role: 'Bán hàng',
    username: 'banhang.minh',
    password: 'BanHang@2026',
    icon: ShoppingCart,
    color: 'accent',
  },
  {
    role: 'Thủ kho',
    username: 'kho.cuong',
    password: 'Kho@2026',
    icon: Warehouse,
    color: 'info',
  },
];

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      toast.success('Đăng nhập thành công!');
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } else {
      toast.error(result.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <div className="relative isolate h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4 py-8 sm:py-12 overflow-y-auto">
      {/* === Animated background blobs (clipped tới viewport, không chặn scroll) === */}
      <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] bg-primary-300/40 rounded-full blur-3xl animate-blob motion-reduce:animate-none" />
        <div className="absolute top-1/3 -right-32 w-[26rem] h-[26rem] bg-accent-300/40 rounded-full blur-3xl animate-blob-slow motion-reduce:animate-none" />
        <div className="absolute -bottom-32 left-1/4 w-[24rem] h-[24rem] bg-info-300/35 rounded-full blur-3xl animate-blob motion-reduce:animate-none" />
        {/* Subtle grid overlay cho cảm giác "y tế / dược phẩm" */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgb(27 81 163) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* === Brand header === */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-modal bg-gradient-to-br from-primary-500 to-primary-700 shadow-card-hover mb-4 animate-float motion-reduce:animate-none relative">
            <Pill className="w-8 h-8 text-accent-400" aria-hidden="true" />
            {/* Sparkle nhỏ góc trên-phải = "mới/pro" */}
            <Sparkles
              className="absolute -top-1 -right-1 w-4 h-4 text-accent-500 animate-fade-in"
              aria-hidden="true"
            />
          </div>
          <h1 className="text-display text-neutral-900 leading-none">
            SecurePharma
          </h1>
          <p className="mt-3 text-body text-neutral-600 max-w-sm mx-auto">
            Hệ thống quản lý cửa hàng dược phẩm
          </p>

          {/* USP pills */}
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            {USP.map((u) => (
              <span
                key={u.label}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-white/70 backdrop-blur border border-primary-100 text-caption font-medium text-primary-700 shadow-sm"
              >
                {u.icon}
                {u.label}
              </span>
            ))}
          </div>
        </div>

        {/* === Login card (glass-morphism nhẹ) === */}
        <div className="bg-white/85 backdrop-blur-xl rounded-modal shadow-modal border border-white/60 overflow-hidden">
          {/* Accent strip trên cùng = brand signature */}
          <div className="h-1 bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500" />

          <div className="px-6 pt-6 pb-2">
            <h2 className="text-h2 text-neutral-900">Đăng nhập</h2>
            <p className="mt-1 text-caption text-neutral-500">
              Sử dụng tài khoản được cấp để truy cập hệ thống
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <Input
              label="Tên đăng nhập"
              required
              icon={<User className="w-4 h-4" />}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="VD: admin.huong"
              autoComplete="username"
            />

            <Input
              label="Mật khẩu"
              required
              type={showPassword ? 'text' : 'password'}
              icon={<Lock className="w-4 h-4" />}
              iconRight={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-neutral-400 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              icon={<LogIn className="w-4 h-4" />}
              className="w-full shadow-card-hover"
              size="lg"
            >
              Đăng nhập
            </Button>
          </form>

          {/* Demo accounts — click icon để tự điền */}
          <div className="mx-6 mb-6 p-4 bg-gradient-to-br from-info-50 to-primary-50 border border-info-100/80 rounded-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-btn bg-white text-info-600 flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              </div>
              <p className="text-caption font-semibold text-info-700 uppercase tracking-wide">
                Tài khoản demo
              </p>
              <span className="ml-auto text-[10px] text-info-600/70 italic">
                Click để điền nhanh
              </span>
            </div>

            {/* 3 icon buttons cùng 1 hàng — click để autofill */}
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const colorClasses = {
                  primary: {
                    btn: 'bg-primary-50 hover:bg-primary-100 border-primary-200 hover:border-primary-400 text-primary-700',
                    icon: 'bg-primary-500 text-white',
                    label: 'text-primary-800',
                  },
                  accent: {
                    btn: 'bg-accent-50 hover:bg-accent-100 border-accent-200 hover:border-accent-400 text-accent-700',
                    icon: 'bg-accent-500 text-white',
                    label: 'text-accent-800',
                  },
                  info: {
                    btn: 'bg-info-50 hover:bg-info-100 border-info-200 hover:border-info-400 text-info-700',
                    icon: 'bg-info-500 text-white',
                    label: 'text-info-800',
                  },
                }[acc.color];

                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => {
                      setUsername(acc.username);
                      setPassword(acc.password);
                      toast.success(`Đã điền: ${acc.role}`);
                    }}
                    title={`${acc.username} / ${acc.password}`}
                    aria-label={`Điền nhanh tài khoản ${acc.role}: ${acc.username}`}
                    className={`group flex flex-col items-center gap-1.5 p-2.5 rounded-btn border transition-all hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 ${colorClasses.btn}`}
                  >
                    <span
                      className={`w-9 h-9 rounded-full ${colorClasses.icon} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span className={`text-[11px] font-semibold leading-tight ${colorClasses.label}`}>
                      {acc.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
