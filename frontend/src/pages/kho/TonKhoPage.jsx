/**
 * TonKhoPage - Xem tồn kho theo thuốc
 *
 * - Table với pagination + search
 * - Col: Mã, Tên thuốc, Danh mục, Tồn kho (StockBadge), Sắp hết hạn (ExpiryBadge), HSD sớm nhất, Số lô, Giá nhập BQ
 * - Click row → mở LotDetailModal (drill-down lô + điều chỉnh kiểm kê)
 *
 * Read-only table; ghi chỉ qua modal.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Warehouse, ExternalLink } from 'lucide-react';
import khoService from '../../services/khoService';
import PageHeader from '../../components/ui/PageHeader';
import SearchBar from '../../components/ui/SearchBar';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import StockBadge from '../../components/ui/StockBadge';
import ExpiryBadge from '../../components/ui/ExpiryBadge';
import LotDetailModal from '../../components/ui/LotDetailModal';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';
import { formatCurrency } from '../../utils/format';

function TonKhoPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Modal drill-down
  const [detailThuoc, setDetailThuoc] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await khoService.getTonKho({ keyword: search, page, limit: DEFAULT_PAGE_SIZE });
      setItems(res.data?.items || []);
      setPagination(
        res.data?.pagination || { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 }
      );
    } catch {
      toast.error('Không thể tải tồn kho');
    } finally {
      setLoading(false);
    }
  };

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
      render: (it) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDetailThuoc(it);
          }}
          className="font-medium text-primary-700 hover:text-primary-800 hover:underline inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
        >
          {it.TenThuoc}
          <ExternalLink className="w-3 h-3 opacity-60" />
        </button>
      ),
    },
    {
      key: 'category',
      label: 'Danh mục',
      render: (it) => <span className="text-neutral-700">{it.TenDM || '—'}</span>,
    },
    {
      key: 'stock',
      label: 'Tồn kho',
      width: '110px',
      align: 'center',
      render: (it) => <StockBadge stock={it.SoLuongTonKho} />,
    },
    {
      key: 'expiry',
      label: 'Cảnh báo',
      width: '140px',
      align: 'center',
      render: (it) =>
        it.SoLuongSapHetHan > 0 ? (
          <ExpiryBadge expiryDate={it.HanSDSomNhat} />
        ) : (
          <span className="text-caption text-neutral-400">—</span>
        ),
    },
    {
      key: 'lots',
      label: 'Số lô',
      width: '80px',
      align: 'center',
      render: (it) => <span className="text-body text-neutral-700">{it.SoLo}</span>,
    },
    {
      key: 'price',
      label: 'Giá nhập BQ',
      width: '130px',
      align: 'right',
      render: (it) => (
        <span className="text-neutral-700 font-mono text-body">
          {formatCurrency(Number(it.GiaNhapBinhQuan) || 0)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Warehouse />}
        title="Tồn kho"
        subtitle={`Tổng ${pagination.total} mặt hàng đang theo dõi · Click tên thuốc để xem chi tiết lô & kiểm kê`}
      />

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Tìm theo tên thuốc hoặc mã thuốc..."
      />

      <Table
        columns={columns}
        data={items}
        loading={loading}
        rowKey="MaThuoc"
        emptyTitle="Chưa có dữ liệu tồn kho"
        emptyDescription="Tạo phiếu nhập để bắt đầu"
        emptyIcon={<Warehouse />}
        onRowClick={(it) => setDetailThuoc(it)}
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onChange={fetchData}
        loading={loading}
      />

      <LotDetailModal
        open={!!detailThuoc}
        onClose={() => setDetailThuoc(null)}
        thuoc={detailThuoc}
        onAdjusted={() => fetchData(pagination.page)}
      />
    </div>
  );
}

export default TonKhoPage;