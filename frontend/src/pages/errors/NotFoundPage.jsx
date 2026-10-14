/**
 * NotFoundPage (404) - URL không tồn tại
 *
 * Refactored với design system mới.
 */
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-primary-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full text-center">
        <div className="flex flex-col items-center py-6">
          <div className="w-20 h-20 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center mb-6">
            <FileQuestion className="w-10 h-10" aria-hidden="true" />
          </div>

          <h1 className="text-display text-neutral-900">404</h1>
          <h2 className="text-h2 text-neutral-700 mt-2 mb-4">Không tìm thấy trang</h2>

          <p className="text-body text-neutral-600 mb-8 max-w-md">
            Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển sang địa chỉ khác.
          </p>

          <Button variant="primary" onClick={() => navigate('/dashboard', { replace: true })} icon={<Home className="w-4 h-4" />}>
            Về trang chủ
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default NotFoundPage;
