/**
 * LichSuDieuChinhPage - Lịch sử điều chỉnh tồn kho (Audit trail)
 *
 * Vai trò: Admin + NV_Kho (xem và truy vết trách nhiệm kiểm kê).
 *
 * Tính năng:
 *  - Bảng lịch sử (mới nhất trước) với pagination
 *  - Filter: keyword (tên thuốc / lý do), từ ngày → đến ngày, nhân viên
 *  - Thống kê nhanh: tổng số lần điều chỉnh / tổng tăng / tổng giảm
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import {
  History,
  TrendingUp,
  TrendingDown,
  User as UserIcon,
} from 'lucide-react';
import khoService from '../../services/khoService';
import nhanVienService from '../../services/nhanVienService';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import MiniStat from '../../components/ui/MiniStat';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';

function LichSuDieuChinhPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [maNV, setMaNV] = useState('');
  const [nhanVienOpts, setNhanVienOpts] = useState([]);

  // Load danh sách nhân viên cho filter
  useEffect(() => {
    const fetchNV = async () => {
      try {
        const res = await nhanVienService.getAll({ limit: 100 });
        const opts = (res.data?.items || []).map((nv) => ({
          value: nv.MaNV,
          label: `${nv.TenNV}${nv.VaiTro ? ` — ${nv.VaiTro}` : ''}`,
        }));
        setNhanVienOpts([{ value: '', label: 'Tất cả nhân viên' }, ...opts]);
      } catch {
        // Không chặn UI — filter NV sẽ rỗng nhưng vẫn dùng được các filter khác
      }
    };
    fetchNV();
  }, []);

  // Debounce keyword
  useEffect(() => {
    const t = setTimeout(() => fetchData(1), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // from/to/maNV: trigger ngay
  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, maNV]);

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const res = await khoService.getDieuChinhList({
        keyword,
        maNV,
        from,
        to,
        page,
        limit: DEFAULT_PAGE_SIZE,
      });
      setItems(res.data?.items || []);
      setPagination(
        res.data?.pagination || {
          page: 1,
          limit: DEFAULT_PAGE_SIZE,
          total: 0,
          totalPages: 0,
        }
      );
    } catch {
      toast.error('Không thể tải lịch sử điều chỉnh');
    } finally {
      setLoading(false);
    }
  };

  const total = pagination.total;
  const totalTang = items
    .filter((i) => i.ChenhLech > 0)
    .reduce((s, i) => s + i.ChenhLech, 0);
  const totalGiam = items
    .filter((i) => i.ChenhLech < 0)
    .reduce((s, i) => s + Math.abs(i.ChenhLech), 0);

  const columns = [
    {
      key: 'ngay',
      label: 'Thời điểm',
      width: '160px',
      render: (a) => (
        <span className="text-caption text-neutral-700">
          {dayjs(a.CreatedAt).format('DD/MM/YYYY HH:mm')}
        </span>
      ),
    },
    {
      key: 'thuoc',
      label: 'Thuốc / Lô',
      render: (a) => (
        <div className="flex flex-col">
          <span className="font-medium text-neutral-900">{a.TenThuoc}</span>
          <span className="text-caption text-neutral-500">
            Lô #{a.MaLo} · {a.TenDM || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'thaydoi',
      label: 'Trước → Sau',
      width: '180px',
      render: (a) => (
        <span className="font-mono text-neutral-700">
          {a.SoLuongTruoc} → {a.SoLuongSau}
        </span>
      ),
    },
    {
      key: 'chenhlech',
      label: 'Chênh lệch',
      width: '130px',
      align: 'center',
      render: (a) => {
        const v = a.ChenhLech;
        if (v === 0) {
          return <Badge variant="neutral">0</Badge>;
        }
        return (
          <Badge variant={v > 0 ? 'success' : 'danger'}>
            {v > 0 ? `+${v}` : v}
          </Badge>
        );
      },
    },
    {
      key: 'lydo',
      label: 'Lý do',
      render: (a) => (
        <span className="text-body text-neutral-700 line-clamp-2" title={a.LyDo}>
          {a.LyDo}
        </span>
      ),
    },
    {
      key: 'nguoi',
      label: 'Người thực hiện',
      width: '180px',
      render: (a) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-body font-medium text-neutral-900 truncate">
              {a.TenNV || `NV #${a.MaNV}`}
            </p>
            <p className="text-caption text-neutral-500 font-mono">#{a.MaNV}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'nguon',
      label: 'Nguồn lô',
      width: '200px',
      render: (a) => (
        <div className="text-caption text-neutral-600">
          <p>Phiếu nhập #{a.MaPN}</p>
          <p className="text-neutral-400">
            {a.NgayNhap ? dayjs(a.NgayNhap).format('DD/MM/YYYY') : '—'}
            {a.TenNCC ? ` · ${a.TenNCC}` : ''}
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<History />}
        title="Lịch sử điều chỉnh tồn kho"
        subtitle="Audit trail cho hoạt động kiểm kê — truy vết trách nhiệm & lý do điều chỉnh"
      />

      {/* Mini stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MiniStat
          label="Tổng lần điều chỉnh"
          value={total.toLocaleString('vi-VN')}
          icon={<History className="w-4 h-4" />}
        />
        <MiniStat
          label="Tổng tăng (trang hiện tại)"
          value={`+${totalTang.toLocaleString('vi-VN')}`}
          icon={<TrendingUp className="w-4 h-4" />}
          color="success"
        />
        <MiniStat
          label="Tổng giảm (trang hiện tại)"
          value={`-${totalGiam.toLocaleString('vi-VN')}`}
          icon={<TrendingDown className="w-4 h-4" />}
          color="danger"
        />
      </div>

      {/* Filters */}
      <Card title="Bộ lọc">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            label="Từ khóa"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tên thuốc hoặc lý do..."
          />
          <Input
            label="Từ ngày"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <Input
            label="Đến ngày"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          <Select
            label="Nhân viên"
            value={maNV}
            onChange={(e) => setMaNV(e.target.value)}
            options={nhanVienOpts}
            placeholder=""
            disabled={nhanVienOpts.length <= 1}
          />
        </div>
      </Card>

      <Table
        columns={columns}
        data={items}
        loading={loading}
        rowKey="MaDieuChinh"
        emptyTitle="Chưa có lịch sử điều chỉnh"
        emptyDescription="Chưa có thao tác kiểm kê nào được ghi nhận"
        emptyIcon={<History />}
      />

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        onChange={fetchData}
        loading={loading}
      />
    </div>
  );
}

export default LichSuDieuChinhPage;