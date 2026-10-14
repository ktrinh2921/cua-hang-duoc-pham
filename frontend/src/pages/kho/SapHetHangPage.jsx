/**
 * SapHetHangPage - Cảnh báo thuốc sắp hết hàng (0 < tồn ≤ nguong)
 *
 * - Filter ngưỡng (mặc định 10)
 * - Table: Mã, Tên, Danh mục, Tồn, Ngưỡng, HSD sớm nhất
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PackageX } from 'lucide-react';
import khoService from '../../services/khoService';
import PageHeader from '../../components/ui/PageHeader';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import EmptyState from '../../components/ui/EmptyState';
import LoadingState from '../../components/ui/LoadingState';
import ExpiryBadge from '../../components/ui/ExpiryBadge';
import StockBadge from '../../components/ui/StockBadge';

const NGUONG_OPTIONS = [
  { value: 5, label: '≤ 5' },
  { value: 10, label: '≤ 10' },
  { value: 20, label: '≤ 20' },
  { value: 50, label: '≤ 50' },
  { value: 100, label: '≤ 100' },
];

function SapHetHangPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nguong, setNguong] = useState(10);
  const [meta, setMeta] = useState({ nguong: 10, total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await khoService.getSapHetHang(nguong);
        setItems(res.data?.items || []);
        setMeta({ nguong: res.data?.nguong || nguong, total: res.data?.total || 0 });
      } catch {
        toast.error('Không thể tải cảnh báo');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [nguong]);

  const columns = [
    {
      key: 'code',
      label: 'Mã',
      width: '70px',
      render: (it) => <span className="font-mono text-neutral-500">#{it.MaThuoc}</span>,
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
      label: 'Tồn kho',
      width: '130px',
      align: 'center',
      render: (it) => <StockBadge stock={it.SoLuongTonKho} />,
    },
    {
      key: 'min',
      label: 'Ngưỡng',
      width: '90px',
      align: 'center',
      render: () => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-warning-50 text-warning-700 text-caption font-medium">
          ≤ {meta.nguong}
        </span>
      ),
    },
    {
      key: 'expiry',
      label: 'HSD sớm nhất',
      width: '160px',
      align: 'center',
      render: (it) => <ExpiryBadge expiryDate={it.HanSDSomNhat} />,
    },
  ];

  if (loading) return <LoadingState label="Đang tải cảnh báo..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<PackageX />}
        title="Sắp hết hàng"
        subtitle={`Có ${meta.total} thuốc còn từ 1 đến ${meta.nguong} đơn vị`}
        actions={
          <Select
            value={nguong}
            onChange={(v) => setNguong(Number(v))}
            options={NGUONG_OPTIONS}
            className="w-32"
          />
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<PackageX />}
          title="Không có cảnh báo"
          description={`Không có thuốc nào còn từ 1 đến ${meta.nguong} đơn vị`}
        />
      ) : (
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey="MaThuoc"
          emptyTitle="Không có thuốc sắp hết"
        />
      )}
    </div>
  );
}

export default SapHetHangPage;
