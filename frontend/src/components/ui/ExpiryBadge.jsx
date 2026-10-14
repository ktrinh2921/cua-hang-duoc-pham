/**
 * ExpiryBadge — Badge hạn dùng thuốc (đặc thù ngành dược)
 *
 * Tự tính trạng thái dựa vào số ngày còn lại:
 *   > 30 ngày   → success  "Còn HSD"
 *   1–30 ngày   → warning  "Còn X ngày"
 *   ≤ 0 ngày    → danger   "Đã hết hạn"
 *   null/undef  → neutral  "—"
 *
 * @example
 *   <ExpiryExpiry expiryDate={lo.NgayHetHan} />
 */
import { Calendar, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import dayjs from 'dayjs';
import Badge from './Badge';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getExpiryInfo(date) {
  if (!date) {
    return { variant: 'neutral', label: '—', icon: <Calendar className="w-3 h-3" /> };
  }
  const today = dayjs().startOf('day');
  const expiry = dayjs(date).startOf('day');
  const diffDays = expiry.diff(today, 'day');

  if (diffDays < 0) {
    return {
      variant: 'danger',
      label: `Hết hạn ${Math.abs(diffDays)} ngày`,
      icon: <XCircle className="w-3 h-3" />,
    };
  }
  if (diffDays === 0) {
    return {
      variant: 'danger',
      label: 'Hết hạn hôm nay',
      icon: <AlertTriangle className="w-3 h-3" />,
    };
  }
  if (diffDays <= 30) {
    return {
      variant: 'warning',
      label: `Còn ${diffDays} ngày`,
      icon: <AlertTriangle className="w-3 h-3" />,
    };
  }
  return {
    variant: 'success',
    label: dayjs(date).format('DD/MM/YYYY'),
    icon: <CheckCircle2 className="w-3 h-3" />,
  };
}

export default function ExpiryBadge({ expiryDate, showIcon = true }) {
  const info = getExpiryInfo(expiryDate);

  return (
    <Badge variant={info.variant} size="sm" icon={showIcon ? info.icon : undefined}>
      {info.label}
    </Badge>
  );
}
