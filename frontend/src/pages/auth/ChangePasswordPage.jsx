/**
 * ChangePasswordPage - Đổi mật khẩu cho user hiện tại
 *
 * Refactored với design system mới.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Check, ArrowLeft, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

function ChangePasswordPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (form.newPassword === form.currentPassword) {
      toast.error('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.changePassword(
        form.currentPassword,
        form.newPassword,
        form.confirmPassword
      );
      if (response.success) {
        toast.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');
        setTimeout(() => navigate('/login', { replace: true }), 1500);
      } else {
        toast.error(response.error?.message || 'Đổi mật khẩu thất bại');
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  // Password strength
  const passwordStrength = (() => {
    const pwd = form.newPassword;
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score, label: 'Yếu', color: 'bg-danger-500' };
    if (score === 2) return { score, label: 'Trung bình', color: 'bg-warning-500' };
    if (score === 3) return { score, label: 'Khá', color: 'bg-info-500' };
    return { score, label: 'Mạnh', color: 'bg-success-500' };
  })();

  return (
    <div className="max-w-2xl mx-auto">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center text-body text-neutral-600 hover:text-primary-600 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Quay lại
      </button>

      <Card padding={false}>
        <div className="flex items-center gap-4 px-6 py-5 border-b border-neutral-200">
          <div className="w-12 h-12 rounded-card bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-h2 text-neutral-900">Đổi mật khẩu</h1>
            <p className="text-caption text-neutral-500 mt-0.5">
              Cập nhật mật khẩu để bảo vệ tài khoản của bạn
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Input
            label="Mật khẩu hiện tại"
            required
            type={showPasswords ? 'text' : 'password'}
            icon={<Lock className="w-4 h-4" />}
            value={form.currentPassword}
            onChange={handleChange('currentPassword')}
            autoComplete="current-password"
          />

          <div>
            <Input
              label="Mật khẩu mới"
              required
              type={showPasswords ? 'text' : 'password'}
              icon={<Lock className="w-4 h-4" />}
              iconRight={
                <button
                  type="button"
                  onClick={() => setShowPasswords(!showPasswords)}
                  className="text-neutral-400 hover:text-neutral-700 focus:outline-none"
                  aria-label={showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              value={form.newPassword}
              onChange={handleChange('newPassword')}
              hint="Tối thiểu 6 ký tự"
              autoComplete="new-password"
            />

            {form.newPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all`}
                      style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-caption text-neutral-600 min-w-[70px]">
                    {passwordStrength.label}
                  </span>
                </div>
                <p className="mt-1 text-caption text-neutral-500">
                  Mẹo: dùng chữ hoa, số và ký tự đặc biệt (VD: Admin@2026)
                </p>
              </div>
            )}
          </div>

          <Input
            label="Xác nhận mật khẩu mới"
            required
            type={showPasswords ? 'text' : 'password'}
            icon={<Lock className="w-4 h-4" />}
            iconRight={
              form.confirmPassword && form.newPassword === form.confirmPassword ? (
                <Check className="w-4 h-4 text-success-500" aria-hidden="true" />
              ) : undefined
            }
            value={form.confirmPassword}
            onChange={handleChange('confirmPassword')}
            autoComplete="new-password"
          />

          <div className="flex gap-3 pt-2 justify-end">
            <Button variant="secondary" onClick={() => navigate(-1)} disabled={loading}>
              Hủy
            </Button>
            <Button variant="primary" type="submit" loading={loading}>
              Đổi mật khẩu
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default ChangePasswordPage;
