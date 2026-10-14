/**
 * PhieuThuSubPage - Danh sách phiếu thu dùng trong /tai-chinh/phieu-thu
 *
 * Layout đã được share từ TaiChinhPage (header + 5 stat cards + range filter).
 * File này chỉ render phần nội dung riêng: search + filter + table + modal.
 */
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { Plus, X, Check, ReceiptText, Eye, Clock, Hash, User, FileText, Tag, ExternalLink, CheckCircle2 } from 'lucide-react';
import phieuThuService from '../../services/phieuThuService';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SearchBar from '../../components/ui/SearchBar';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { formatCurrency } from '../../utils/format';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';

const emptyForm = { soTien: '', noiDung: '' };
const QUICK_AMOUNTS = [100_000, 500_000, 1_000_000, 5_000_000];

function PhieuThuSubPage() {
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ keyword: '', from: '', to: '', loaiPhieu: '' });
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [viewItem, setViewItem] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const today = dayjs().format('YYYY-MM-DD');

    // Click row → fetch full detail (kèm MaHD, TenNV, TrangThaiHoaDon) rồi mở modal
    const openDetail = async (item) => {
        setViewItem(item); // mở modal ngay với data list (loading skeleton)
        setDetailLoading(true);
        try {
            const response = await phieuThuService.getById(item.MaPhieuThu);
            if (response?.success) setViewItem(response.data);
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Không thể tải chi tiết phiếu thu');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        if (detailLoading) return;
        setViewItem(null);
    };

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const response = await phieuThuService.getAll({ ...filters, page, limit: DEFAULT_PAGE_SIZE });
            setItems(response.data?.items || []);
            setPagination(response.data?.pagination || { page: 1, total: 0, totalPages: 0 });
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Không thể tải danh sách phiếu thu');
        } finally {
            setLoading(false);
        }
    };

    // Load lần đầu + mỗi khi filter đổi
    useEffect(() => {
        const timer = setTimeout(() => fetchData(1), 350);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const soTien = Number(form.soTien);
        if (!Number.isFinite(soTien) || soTien <= 0 || !form.noiDung.trim()) return;
        setSubmitting(true);
        try {
            await phieuThuService.create({ soTien, noiDung: form.noiDung.trim() });
            toast.success('Đã ghi nhận phiếu thu');
            setShowCreate(false);
            setForm(emptyForm);
            fetchData(1);
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Không thể tạo phiếu thu');
        } finally {
            setSubmitting(false);
        }
    };

    const closeCreate = () => {
        if (submitting) return;
        setShowCreate(false);
        setForm(emptyForm);
    };

    const columns = [
        { key: 'MaPhieuThu', label: 'Mã', width: '90px',
          render: (item) => <span className="font-mono font-semibold">#{item.MaPhieuThu}</span> },
        { key: 'NgayLap', label: 'Ngày lập', width: '150px',
          render: (item) => dayjs(item.NgayLap).format('DD/MM/YYYY HH:mm') },
        { key: 'NoiDung', label: 'Nội dung',
          render: (item) => <span className="line-clamp-1" title={item.NoiDung}>{item.NoiDung}</span> },
        { key: 'LoaiPhieu', label: 'Loại', width: '120px', align: 'center',
          render: (item) => (
              <Badge variant={item.LoaiPhieu === 'BanHang' ? 'primary' : 'success'} size="sm">
                  {item.LoaiPhieu === 'BanHang' ? 'Bán hàng' : 'Thu khác'}
              </Badge>
          ) },
        { key: 'SoTien', label: 'Số tiền', width: '150px', align: 'right',
          render: (item) => (
              <span className={item.TrangThai === 'CoHieuLuc'
                  ? 'font-mono font-semibold text-success-700'
                  : 'font-mono text-neutral-400 line-through'}>
                  +{formatCurrency(Number(item.SoTien) || 0)}
              </span>
          ) },
        { key: 'status', label: 'Trạng thái', width: '125px', align: 'center',
          render: (item) => (
              <Badge variant={item.TrangThai === 'CoHieuLuc' ? 'success' : 'neutral'} size="sm">
                  {item.TrangThai === 'CoHieuLuc' ? 'Có hiệu lực' : 'HĐ đã hủy'}
              </Badge>
          ) },
    ];

    const soTienNum = Number(form.soTien);
    const soTienValid = Number.isFinite(soTienNum) && soTienNum > 0;
    const noiDungTrim = form.noiDung.trim();
    const canSubmit = soTienValid && noiDungTrim.length > 0 && !submitting;

    return (
        <div className="space-y-4">
            {/* Toolbar: search + filter + nút tạo */}
            <Card padding="sm">
                <div className="flex flex-col gap-3">
                    <SearchBar
                        value={filters.keyword}
                        onChange={(keyword) => setFilters((current) => ({ ...current, keyword }))}
                        placeholder="Tìm theo mã phiếu, hóa đơn, nội dung, người lập..."
                    >
                        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto">
                            <input aria-label="Từ ngày" type="date"
                                value={filters.from} max={filters.to || today}
                                onChange={(e) => setFilters((c) => ({ ...c, from: e.target.value }))}
                                className="h-10 rounded-btn border border-neutral-300 px-3 text-body focus:border-primary-500 focus:outline-none" />
                            <input aria-label="Đến ngày" type="date"
                                value={filters.to} min={filters.from || undefined} max={today}
                                onChange={(e) => setFilters((c) => ({ ...c, to: e.target.value }))}
                                className="h-10 rounded-btn border border-neutral-300 px-3 text-body focus:border-primary-500 focus:outline-none" />
                            <Select aria-label="Loại phiếu thu"
                                value={filters.loaiPhieu}
                                onChange={(e) => setFilters((c) => ({ ...c, loaiPhieu: e.target.value }))}
                                placeholder="Tất cả loại"
                                options={[{ value: 'BanHang', label: 'Bán hàng' }, { value: 'Khac', label: 'Thu khác' }]} />
                        </div>
                    </SearchBar>
                    <div className="flex justify-end">
                        <Button icon={<Plus />} onClick={() => { setForm(emptyForm); setShowCreate(true); }}>
                            Tạo phiếu thu
                        </Button>
                    </div>
                </div>
            </Card>

            <Table
                columns={columns}
                data={items}
                loading={loading}
                rowKey="MaPhieuThu"
                emptyTitle="Chưa có phiếu thu"
                emptyDescription="Phiếu bán hàng sẽ được tạo tự động khi thanh toán"
                emptyIcon={<ReceiptText />}
                onRowClick={openDetail}
            />

            <Pagination
                page={pagination.page || 1}
                totalPages={pagination.totalPages || 0}
                total={pagination.total || 0}
                onChange={fetchData}
                loading={loading}
            />

            {/* Modal: Tạo phiếu thu */}
            <Modal open={showCreate} onClose={closeCreate} title="Tạo phiếu thu khác"
                description="Phiếu thu ngoài bán hàng — ghi nhận các khoản thu khác vào quỹ."
                icon={<ReceiptText className="w-5 h-5" />} badge="Thu khác" tone="success" size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={closeCreate} disabled={submitting} icon={<X className="w-4 h-4" />}>Hủy</Button>
                        <Button type="submit" form="phieu-thu-create-form" loading={submitting}
                            disabled={!canSubmit} icon={<Check className="w-4 h-4" />} variant="success">
                            Ghi nhận phiếu thu
                        </Button>
                    </>
                }>
                <form id="phieu-thu-create-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-caption font-medium text-neutral-700 mb-1">Nội dung <span className="text-danger-600">*</span></label>
                        <textarea value={form.noiDung}
                            onChange={(e) => setForm((c) => ({ ...c, noiDung: e.target.value }))}
                            rows={3} maxLength={500} placeholder="VD: Thu hồi ứng trước cho nhà cung cấp A"
                            className="w-full rounded-btn border border-neutral-300 px-3 py-2 text-body focus:border-primary-500 focus:outline-none resize-none" />
                    </div>
                    <div>
                        <label className="block text-caption font-medium text-neutral-700 mb-1">Số tiền (VND) <span className="text-danger-600">*</span></label>
                        <input type="number" min="1" step="1" value={form.soTien}
                            onChange={(e) => setForm((c) => ({ ...c, soTien: e.target.value }))}
                            placeholder="Nhập số tiền..."
                            className="w-full h-10 rounded-btn border border-neutral-300 px-3 text-body font-mono focus:border-primary-500 focus:outline-none" />
                            title="Cho phép nhập đơn vị lẻ (VD: 19.001đ)"
                        <div className="flex flex-wrap gap-2 mt-2">
                            {QUICK_AMOUNTS.map((v) => (
                                <button key={v} type="button"
                                    onClick={() => setForm((c) => ({ ...c, soTien: v }))}
                                    className="px-2.5 py-1 text-caption rounded-btn border border-neutral-300 hover:bg-neutral-50">
                                    {formatCurrency(v)}
                                </button>
                            ))}
                        </div>
                        {soTienValid && (
                            <p className="mt-1 text-caption text-success-700 font-mono">= {formatCurrency(soTienNum)}</p>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Modal: Xem chi tiết phiếu thu */}
            <Modal open={!!viewItem} onClose={closeDetail}
                title={viewItem ? `Phiếu thu #${viewItem.MaPhieuThu}` : 'Chi tiết phiếu thu'}
                description="Thông tin đầy đủ của phiếu thu trong hệ thống"
                icon={<Eye className="w-5 h-5" />}
                badge={viewItem ? (viewItem.LoaiPhieu === 'BanHang' ? 'Bán hàng' : 'Thu khác') : null}
                tone="success"
                size="2xl">
                {viewItem && (
                    <div className="space-y-5">
                        {/* Hero: số tiền + trạng thái */}
                        <div className="rounded-card bg-gradient-to-br from-primary-50 to-success-50 ring-1 ring-primary-100 p-5">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <p className="text-caption font-medium text-neutral-500 uppercase tracking-wide">Số tiền thu</p>
                                    <p className="mt-1 font-mono font-bold text-success-700 text-h1 leading-none">
                                        +{formatCurrency(Number(viewItem.SoTien) || 0)}
                                    </p>
                                    <p className="mt-2 text-caption text-neutral-600">
                                        {dayjs(viewItem.NgayLap).format('dddd, DD/MM/YYYY [lúc] HH:mm:ss')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    {viewItem.TrangThai === 'CoHieuLuc' ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-success-100 text-success-800 ring-1 ring-success-200 text-caption font-medium">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Có hiệu lực
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200 text-caption font-medium">
                                            HĐ đã hủy · Không hiệu lực
                                        </span>
                                    )}
                                    <p className="mt-2 text-caption text-neutral-500">
                                        Mã phiếu: <span className="font-mono font-semibold text-neutral-700">#{viewItem.MaPhieuThu}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Chia 2 cột: Thông tin + Liên kết */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <section className="rounded-card border border-neutral-200 bg-white p-4">
                                <h3 className="text-caption font-semibold text-neutral-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-neutral-500" />
                                    Thông tin phiếu
                                </h3>
                                <dl className="space-y-2.5 text-body">
                                    <DetailRow icon={<Clock className="w-4 h-4" />} label="Ngày lập"
                                        value={dayjs(viewItem.NgayLap).format('DD/MM/YYYY HH:mm')} />
                                    <DetailRow icon={<Tag className="w-4 h-4" />} label="Loại phiếu"
                                        value={viewItem.LoaiPhieu === 'BanHang'
                                            ? <Badge variant="primary" size="sm">Bán hàng</Badge>
                                            : <Badge variant="success" size="sm">Thu khác</Badge>} />
                                    <DetailRow icon={<User className="w-4 h-4" />} label="Người lập"
                                        value={
                                            <div className="flex items-center gap-2">
                                                <span>{viewItem.TenNV || `Chưa rõ`}</span>
                                                {viewItem.MaNV && (
                                                    <span className="font-mono text-caption text-neutral-500">#{viewItem.MaNV}</span>
                                                )}
                                            </div>
                                        } />
                                    {viewItem.CreatedAt && viewItem.CreatedAt !== viewItem.NgayLap && (
                                        <DetailRow icon={<Hash className="w-4 h-4" />} label="Tạo lúc (DB)"
                                            value={dayjs(viewItem.CreatedAt).format('DD/MM/YYYY HH:mm:ss')} />
                                    )}
                                </dl>
                            </section>

                            <section className="rounded-card border border-neutral-200 bg-white p-4">
                                <h3 className="text-caption font-semibold text-neutral-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <ExternalLink className="w-4 h-4 text-neutral-500" />
                                    Liên kết hóa đơn
                                </h3>
                                {viewItem.MaHD ? (
                                    <dl className="space-y-2.5 text-body">
                                        <DetailRow icon={<Hash className="w-4 h-4" />} label="Mã hóa đơn"
                                            value={<span className="font-mono font-semibold text-primary-700">#{viewItem.MaHD}</span>} />
                                        <DetailRow icon={<Tag className="w-4 h-4" />} label="Trạng thái hóa đơn"
                                            value={viewItem.TrangThaiHoaDon === 'DaHuy'
                                                ? <Badge variant="neutral" size="sm">Đã hủy</Badge>
                                                : <Badge variant="success" size="sm">Có hiệu lực</Badge>} />
                                        <p className="text-caption text-neutral-500 italic pt-2 border-t border-neutral-100">
                                            Phiếu thu này được sinh tự động từ hóa đơn bán hàng. Nếu hóa đơn bị hủy, phiếu thu chuyển sang trạng thái không hiệu lực.
                                        </p>
                                    </dl>
                                ) : (
                                    <div className="flex items-start gap-2 text-body text-neutral-600">
                                        <FileText className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                                        <p>Phiếu thu ngoài bán hàng — ghi nhận thủ công vào quỹ. Không liên kết với hóa đơn nào.</p>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Nội dung (full width) */}
                        <section className="rounded-card border border-neutral-200 bg-white p-4">
                            <h3 className="text-caption font-semibold text-neutral-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <ReceiptText className="w-4 h-4 text-neutral-500" />
                                Nội dung phiếu thu
                            </h3>
                            <p className="text-body text-neutral-900 whitespace-pre-wrap break-words leading-relaxed">
                                {viewItem.NoiDung || <span className="italic text-neutral-400">(Không có nội dung)</span>}
                            </p>
                        </section>

                        {detailLoading && (
                            <p className="text-caption text-neutral-500 italic text-center">Đang tải thông tin chi tiết...</p>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}

function DetailRow({ icon, label, value }) {
    return (
        <div className="flex items-start gap-3">
            <span className="mt-0.5 text-neutral-400 flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0 flex items-start gap-3 border-b border-neutral-100 pb-2.5 last:border-b-0 last:pb-0">
                <span className="text-caption text-neutral-500 w-28 flex-shrink-0 pt-0.5">{label}</span>
                <span className="flex-1 text-neutral-900 break-words">{value}</span>
            </div>
        </div>
    );
}

export default PhieuThuSubPage;
