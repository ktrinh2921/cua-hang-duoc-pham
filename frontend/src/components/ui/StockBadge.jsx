/**
 * StockBadge — Badge tồn kho theo ngưỡng (đặc thù dược)
 *   0        → danger  "Hết hàng"
 *   1–10     → warning "X" (sắp hết)
 *   > 10     → success "X"
 */
import { Package } from 'lucide-react';
import Badge from './Badge';

export default function StockBadge({ stock }) {
  const n = Number(stock) || 0;
  if (n === 0) {
    return (
      <Badge variant="danger" size="sm" icon={<Package className="w-3 h-3" />}>
        Hết hàng
      </Badge>
    );
  }
  if (n <= 10) {
    return (
      <Badge variant="warning" size="sm" icon={<Package className="w-3 h-3" />}>
        {n}
      </Badge>
    );
  }
  return (
    <Badge variant="success" size="sm" icon={<Package className="w-3 h-3" />}>
      {n}
    </Badge>
  );
}
