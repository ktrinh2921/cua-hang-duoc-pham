/**
 * Table — Bảng dữ liệu chuẩn hoá
 *
 * @example
 *   <Table
 *     columns={[
 *       { key: 'id', label: 'Mã', render: (r) => `#${r.MaThuoc}` },
 *       { key: 'name', label: 'Tên', render: (r) => r.TenThuoc },
 *     ]}
 *     data={items}
 *     onRowClick={(r) => navigate(`/thuoc/${r.MaThuoc}`)}
 *   />
 */
import { cn } from '../../utils/cn';
import LoadingState from './LoadingState';
import EmptyState from './EmptyState';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'Chưa có dữ liệu',
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRowClick,
  rowKey = 'id',
  striped = false,
  className,
}) {
  const renderBody = () => {
    if (loading) return <LoadingState />;
    if (!data || data.length === 0) {
      return (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 text-caption font-semibold text-neutral-600 uppercase tracking-wide',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    (!col.align || col.align === 'left') && 'text-left',
                    col.className
                  )}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn('divide-y divide-neutral-200', striped && 'bg-white')}>
            {data.map((row, idx) => (
              <tr
                key={row[rowKey]}
                className={cn(
                  'transition-colors duration-150',
                  onRowClick && 'cursor-pointer hover:bg-primary-50/40',
                  striped && idx % 2 === 1 && 'bg-primary-50/70'
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-body text-neutral-700',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.cellClassName
                    )}
                  >
                    {col.render ? col.render(row, idx) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'bg-white rounded-card shadow-card border border-neutral-200/60 overflow-hidden',
        className
      )}
    >
      {renderBody()}
    </div>
  );
}
