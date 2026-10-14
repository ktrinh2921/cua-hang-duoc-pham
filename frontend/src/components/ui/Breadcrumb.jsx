/**
 * Breadcrumb — Hiển thị đường dẫn phân cấp từ root đến trang hiện tại
 *
 * Auto-resolve label từ MENU_ITEMS theo `path`. Fallback về humanized path nếu không match.
 *
 * @example
 *   <Breadcrumb />            // Auto từ location.pathname
 *   <Breadcrumb items={[{label:'Tùy chỉnh', to:'/x'}]} />
 */
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { MENU_ITEMS } from '../../utils/constants';
import { cn } from '../../utils/cn';

function humanize(segment) {
  // Chuyển 'change-password' → 'Change password'
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildCrumbs(pathname, items) {
  if (items && items.length > 0) return items;

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [];

  // Map nhãn tiếng Việt cho các sub-route không thuộc MENU_ITEMS
  // (Breadcrumb không phụ thuộc MENU_ITEMS để tránh phá logic phân quyền)
  const SUB_ROUTE_LABELS = {
    'kho/ton-kho': 'Tồn kho',
    'kho/sap-het-hang': 'Sắp hết hàng',
    'kho/sap-het-han': 'Sắp hết hạn',
    'kho/nhap': 'Nhập thuốc',
    'kho/lich-su-dieu-chinh': 'Lịch sử kiểm kê',
    'kho/phieu-nhap': 'Danh sách phiếu nhập',
  };

  const crumbs = [{ label: 'Trang chủ', to: '/dashboard', icon: Home }];

  let accumulator = '';
  segments.forEach((seg, idx) => {
    accumulator += '/' + seg;

    // 1) Thử resolve theo sub-route map trước (cho cả path dài)
    let label = SUB_ROUTE_LABELS[segments.slice(0, idx + 1).join('/')];
    // 2) Rồi mới đến MENU_ITEMS
    if (!label) {
      const menuMatch = MENU_ITEMS.find((m) => m.path === accumulator);
      label = menuMatch?.label;
    }
    // 3) Fallback: humanize segment
    if (!label) label = humanize(seg);

    const isLast = idx === segments.length - 1;

    crumbs.push({
      label,
      to: isLast ? undefined : accumulator,
      isLast,
    });
  });

  return crumbs;
}

export default function Breadcrumb({ items, className }) {
  const location = useLocation();
  const crumbs = buildCrumbs(location.pathname, items);

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-caption', className)}
    >
      <ol className="flex items-center gap-1.5 flex-wrap">
        {crumbs.map((c, idx) => {
          const isFirst = idx === 0;
          const isLast = c.isLast;

          return (
            <li key={`${c.label}-${idx}`} className="flex items-center gap-1.5">
              {idx > 0 && (
                <ChevronRight
                  className="w-3 h-3 text-neutral-400"
                  aria-hidden="true"
                />
              )}
              {c.icon && isFirst ? (
                <Link
                  to={c.to}
                  className="flex items-center gap-1 text-neutral-500 hover:text-primary-600 transition-colors"
                  aria-label={c.label}
                >
                  <c.icon className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              ) : isLast || !c.to ? (
                <span
                  className="font-medium text-neutral-900 max-w-[180px] truncate"
                  aria-current="page"
                  title={c.label}
                >
                  {c.label}
                </span>
              ) : (
                <Link
                  to={c.to}
                  className="text-neutral-500 hover:text-primary-600 transition-colors max-w-[180px] truncate"
                  title={c.label}
                >
                  {c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
