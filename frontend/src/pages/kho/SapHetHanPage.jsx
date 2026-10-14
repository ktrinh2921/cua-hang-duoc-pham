/**
 * SapHetHanPage - Cảnh báo lô thuốc sắp hết hạn (trong N ngày tới)
 *
 * - Filter days (30/60/90/180)
 * - Table: MaLo, Tên thuốc, Danh mục, Tồn, HSD, Số ngày còn, Giá nhập
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { Clock } from 'lucide-react';
import khoService from '../../services/khoService';
import PageHeader from '../../components/ui/PageHeader';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import ExpiryBadge from '../../components/ui/ExpiryBadge';
import { formatCurrency } from '../../utils/format';

const DAYS_OPTIONS = [
  { value: 30, label: 'Trong 30 ngày' },
  { value: 60, label: 'Trong 60 ngày' },
  { value: 90, label: 'Trong 90 ngày' },
  { value: 180, label: 'Trong 180 ngày' },
];

function SapHetHanPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [meta, setMeta] = useState({ days: 30, total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await khoService.getSapHetHan(days);
        setItems(res.data?.items || []);
        setMeta({ days: res.data?.days || days, total: res.data?.total || 0 });
      } catch {
        toast.error('Không thể tải cảnh báo');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [days]);

  const columns = [
    {
      key: 'malo',
      label: 'Mã lô',
      width: '80px',
      render: (it) => <span className="font-mono text-neutral-500">#{it.MaLo}</span>,
    },
    {
      key: 'name',
      label: 'Tên thuốc',
      render: (it) => <span className="font-medium text-neutral-900">{it.TenThuoc}</span>,
    },
    {
      key: 'category',
      label: 'Danh mục',
      render: (it) => <span className="text-neutral-700">{it.TenDM || '—'}</span>,
    },
    {
      key: 'stock',
      label: 'Tồn',
      width: '80px',
      align: 'center',
      render: (it) => <span className="text-body text-neutral-700">{it.SoLuongTonKho}</span>,
    },
    {
      key: 'expiry',
      label: 'Hạn sử dụng',
      width: '180px',
      render: (it) => (
        <div className="flex flex-col gap-1">
          <span className="text-body text-neutral-700">
            {it.HanSD ? dayjs(it.HanSD).format('DD/MM/YYYY') : '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'daysLeft',
      label: 'Còn lại',
      width: '160px',
      align: 'center',
      render: (it) => <ExpiryBadge expiryDate={it.HanSD} />,
    },
    {
      key: 'price',
      label: 'Giá nhập',
      width: '110px',
      align: 'right',
      render: (it) => (
        <span className="text-neutral-700 font-mono text-body">
          {formatCurrency(Number(it.GiaNhap) || 0)}
        </span>
      ),
    },
  ];

  if (loading) return <LoadingState label="Đang tải cảnh báo..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Clock />}
        title="Sắp hết hạn"
        subtitle={`Có ${meta.total} lô thuốc sắp hết hạn trong ${meta.days} ngày tới`}
        actions={
          <Select
            value={days}
            onChange={(v) => setDays(Number(v))}
            options={DAYS_OPTIONS}
            className="w-44"
          />
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Clock />}
          title="Không có cảnh báo"
          description={`Không có lô thuốc nào sắp hết hạn trong ${meta.days} ngày tới`}
        />
      ) : (
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey="MaLo"
          emptyTitle="Không có lô sắp hết hạn"
        />
      )}
    </div>
  );
}

export default SapHetHanPage;
