/**
 * PhieuChiSubPage - Danh sách phiếu chi dùng trong /tai-chinh/phieu-chi
 *
 * Layout đã được share từ TaiChinhPage (header + 5 stat cards + range filter).
 * File này chỉ render phần nội dung riêng: search + filter + table + modal.
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { Plus, X, Check, Receipt, Eye, Clock, Hash, User, FileText, Tag, Wallet, TrendingDown, CheckCircle2 } from 'lucide-react';
import phieuChiService from '../../services/phieuChiService';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SearchBar from '../../components/ui/SearchBar';
import Table from '../../components/ui/Table';
import Pagination from '../../components/ui/Pagination';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { formatCurrency } from '../../utils/format';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';

function PhieuChiSubPage() {
    const location = useLocation();
    const [items, setItems] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ soTien: '', noiDung: '' });
    const [submitting, setSubmitting] = useState(false);
    const [viewItem, setViewItem] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // Click row → fetch full detail (kèm TenNV) rồi mở modal
    const openDetail = async (item) => {
        setViewItem(item);
        setDetailLoading(true);
        try {
            const response = await phieuChiService.getById(item.MaPhieuChi);
            if (response?.success) setViewItem(response.data);
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Không thể tải chi tiết phiếu chi');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        if (detailLoading) return;
        setViewItem(null);
    };

    // Nếu được navigate từ header "Tạo phiếu chi" → tự mở modal
    useEffect(() => {
        if (location.state?.openCreate) {
            setCreateForm({ soTien: '', noiDung: '' });
            setShowCreate(true);
            // Clear state để F5 không mở lại
            window.history.replaceState({}, '');
        }
    }, [location.state]);

    const fetchData = async (page = 1) => {
        setLoading(true);
        try {
            const res = await phieuChiService.getAll({
                keyword: search, page, limit: DEFAULT_PAGE_SIZE,
                from: fromDate || undefined, to: toDate || undefined,
            });
            setItems(res.data?.items || []);
            setPagination(res.data?.pagination || { page: 1, limit: DEFAULT_PAGE_SIZE, total: 0, totalPages: 0 });
        } catch {
            toast.error('Không thể tải danh sách phiếu chi');
        } finally {
            setLoading(false);
        }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { const t = setTimeout(() => fetchData(1), 350); return () => clearTimeout(t); }, [search, fromDate, toDate]);

    const openCreate = () => { setCreateForm({ soTien: '', noiDung: '' }); setShowCreate(true); };
    const closeCreate = () => { if (!submitting) { setShowCreate(false); setCreateForm({ soTien: '', noiDung: '' }); } };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const soTien = Number(createForm.soTien);
        const noiDung = createForm.noiDung.trim();
        if (!Number.isFinite(soTien) || soTien <= 0 || !noiDung) return;
        setSubmitting(true);
        try {
            await phieuChiService.create({ soTien, noiDung });
            toast.success('Đã tạo phiếu chi');
            setShowCreate(false);
            setCreateForm({ soTien: '', noiDung: '' });
            fetchData(1);
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Không thể tạo phiếu chi');
        } finally { setSubmitting(false); }
    };

    const columns = [
        { key: 'MaPhieuChi', label: 'Mã', width: '90px',
          render: (item) => <span className="font-mono font-semibold">#{item.MaPhieuChi}</span> },
        { key: 'NgayLap', label: 'Ngày lập', width: '150px',
          render: (item) => dayjs(item.NgayLap).format('DD/MM/YYYY HH:mm') },
        { key: 'NoiDung', label: 'Nội dung',
          render: (item) => <span className="line-clamp-1" title={item.NoiDung}>{item.NoiDung}</span> },
        { key: 'TenNV', label: 'Người lập', width: '160px',
          render: (item) => item.TenNV || `NV #${item.MaNV}` },
        { key: 'SoTien', label: 'Số tiền', width: '150px', align: 'right',
          render: (item) => <span className="font-mono font-semibold text-danger-700">−{formatCurrency(Number(item.SoTien) || 0)}</span> },
    ];

    const soTienNum = Number(createForm.soTien);
    const soTienValid = Number.isFinite(soTienNum) && soTienNum > 0;
    const canSubmit = soTienValid && createForm.noiDung.trim() && !submitting;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <Card padding="sm">
                <div className="flex flex-col gap-3">
                    <SearchBar
                        value={search}
                        onChange={setSearch}
                        placeholder="Tìm theo mã phiếu, nội dung, người lập..."
                    >
                        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto">
                            <input aria-label="Từ ngày" type="date"
                                value={fromDate} max={toDate || undefined}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="h-10 rounded-btn border border-neutral-300 px-3 text-body focus:border-primary-500 focus:outline-none" />
                            <input aria-label="Đến ngày" type="date"
                                value={toDate} min={fromDate || undefined}
                                onChange={(e) => setToDate(e.target.value)}
                                className="h-10 rounded-btn border border-neutral-300 px-3 text-body focus:border-primary-500 focus:outline-none" />
                        </div>
                    </SearchBar>
                    <div className="flex justify-end">
                        <Button icon={<Plus />} onClick={openCreate}>Tạo phiếu chi</Button>
                    </div>
                </div>
            </Card>

            <Table
                columns={columns}
                data={items}
                loading={loading}
                rowKey="MaPhieuChi"
                emptyTitle="Chưa có phiếu chi"
                emptyDescription="Tạo phiếu chi mới để ghi nhận khoản chi"
                emptyIcon={<Receipt />}
                onRowClick={openDetail}
            />

            <Pagination
                page={pagination.page || 1}
                totalPages={pagination.totalPages || 0}
                total={pagination.total || 0}
                onChange={fetchData}
                loading={loading}
            />

            {/* Modal tạo */}
            <Modal open={showCreate} onClose={closeCreate} title="Tạo phiếu chi"
                description="Ghi nhận một khoản chi ra khỏi quỹ"
                icon={<Receipt className="w-5 h-5" />} tone="danger" size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={closeCreate} disabled={submitting} icon={<X className="w-4 h-4" />}>Hủy</Button>
                        <Button type="submit" form="phieu-chi-create-form" loading={submitting}
                            disabled={!canSubmit} icon={<Check className="w-4 h-4" />} variant="primary">
                            Ghi nhận phiếu chi
                        </Button>
                    </>
                }>
                <form id="phieu-chi-create-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-caption font-medium text-neutral-700 mb-1">Nội dung <span className="text-danger-600">*</span></label>
                        <textarea value={createForm.noiDung}
                            onChange={(e) => setCreateForm((c) => ({ ...c, noiDung: e.target.value }))}
                            rows={3} maxLength={500} placeholder="VD: Tiền điện tháng 9/2026"
                            className="w-full rounded-btn border border-neutral-300 px-3 py-2 text-body focus:border-primary-500 focus:outline-none resize-none" />
                    </div>
                    <div>
                        <label className="block text-caption font-medium text-neutral-700 mb-1">Số tiền (VND) <span className="text-danger-600">*</span></label>
                        <input type="number" min="1" step="1" value={createForm.soTien}
                            onChange={(e) => setCreateForm((c) => ({ ...c, soTien: e.target.value }))}
                            placeholder="Nhập số tiền..."
                            className="w-full h-10 rounded-btn border border-neutral-300 px-3 text-body font-mono focus:border-primary-500 focus:outline-none" />
                            title="Cho phép nhập đơn vị lẻ (VD: 19.001đ)"
                        {soTienValid && (
                            <p className="mt-1 text-caption text-danger-700 font-mono">= {formatCurrency(soTienNum)}</p>
                        )}
                    </div>
                </form>
            </Modal>

            {/* Modal: Xem chi tiết phiếu chi */}
            <Modal open={!!viewItem} onClose={closeDetail}
                title={viewItem ? `Phiếu chi #${viewItem.MaPhieuChi}` : 'Chi tiết phiếu chi'}
                description="Thông tin đầy đủ của phiếu chi trong hệ thống"
                icon={<Eye className="w-5 h-5" />}
                badge="Chi quỹ"
                tone="danger"
                size="2xl">
                {viewItem && (
                    <div className="space-y-5">
                        {/* Hero: số tiền */}
                        <div className="rounded-card bg-gradient-to-br from-danger-50 to-primary-50 ring-1 ring-danger-100 p-5">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <p className="text-caption font-medium text-neutral-500 uppercase tracking-wide">Số tiền chi</p>
                                    <p className="mt-1 font-mono font-bold text-danger-700 text-h1 leading-none">
                                        −{formatCurrency(Number(viewItem.SoTien) || 0)}
                                    </p>
                                    <p className="mt-2 text-caption text-neutral-600">
                                        {dayjs(viewItem.NgayLap).format('dddd, DD/MM/YYYY [lúc] HH:mm:ss')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-danger-100 text-danger-800 ring-1 ring-danger-200 text-caption font-medium">
                                        <TrendingDown className="w-4 h-4" />
                                        Đã chi
                                    </span>
                                    <p className="mt-2 text-caption text-neutral-500">
                                        Mã phiếu: <span className="font-mono font-semibold text-neutral-700">#{viewItem.MaPhieuChi}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Chia 2 cột */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <section className="rounded-card border border-neutral-200 bg-white p-4">
                                <h3 className="text-caption font-semibold text-neutral-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-neutral-500" />
                                    Thông tin phiếu
                                </h3>
                                <dl className="space-y-2.5 text-body">
                                    <DetailRow icon={<Clock className="w-4 h-4" />} label="Ngày lập"
                                        value={dayjs(viewItem.NgayLap).format('DD/MM/YYYY HH:mm')} />
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
                                    <DetailRow icon={<Tag className="w-4 h-4" />} label="Trạng thái"
                                        value={<Badge variant="danger" size="sm">Đã ghi nhận chi</Badge>} />
                                </dl>
                            </section>

                            <section className="rounded-card border border-neutral-200 bg-white p-4">
                                <h3 className="text-caption font-semibold text-neutral-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                    <Wallet className="w-4 h-4 text-neutral-500" />
                                    Tác động quỹ
                                </h3>
                                <dl className="space-y-2.5 text-body">
                                    <DetailRow icon={<TrendingDown className="w-4 h-4" />} label="Loại giao dịch"
                                        value={<Badge variant="danger" size="sm">Chi ra</Badge>} />
                                    <DetailRow icon={<Hash className="w-4 h-4" />} label="Mã tham chiếu"
                                        value={<span className="font-mono font-semibold text-neutral-700">PC#{viewItem.MaPhieuChi}</span>} />
                                    <p className="text-caption text-neutral-500 italic pt-2 border-t border-neutral-100">
                                        Phiếu chi làm giảm số dư quỹ hiện tại. Số dư = Tổng thu (CoHieuLuc) − Tổng chi.
                                    </p>
                                </dl>
                            </section>
                        </div>

                        {/* Nội dung */}
                        <section className="rounded-card border border-neutral-200 bg-white p-4">
                            <h3 className="text-caption font-semibold text-neutral-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <Receipt className="w-4 h-4 text-neutral-500" />
                                Nội dung phiếu chi
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

export default PhieuChiSubPage;
