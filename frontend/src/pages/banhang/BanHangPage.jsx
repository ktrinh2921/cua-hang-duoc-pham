/**
 * BanHangPage — Trang Bán thuốc (POS)
 *
 * Hỗ trợ query param: ?add=<MaThuoc>
 *  → auto thêm thuốc vào giỏ khi navigate từ /thuoc
 *
 * Layout chuẩn:
 * ┌──────────────────────────────┬─────────────────┐
 * │  Tìm kiếm thuốc             │   Khách hàng    │ ← sticky
 * │  ──────────────────────────  │   ─────────     │
 * │  Product Grid (search +     │   Tổng tiền     │
 * │  quick picks)               │   Giảm giá      │
 * │                              │   Tiền đưa      │
 * │                              │   Tiền thừa     │
 * │                              │   [THANH TOÁN]  │
 * └──────────────────────────────┴─────────────────┘
 *
 * Nghiệp vụ:
 *  - FIFO: backend tự chọn lô cũ nhất khi bán
 *  - Hiển thị tồn kho + lô/HSD từng item
 *  - Giới hạn số lượng ≤ tồn kho
 *  - Giảm giá đơn hàng
 *  - Toast feedback khi thêm
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShoppingCart, Search, Trash2, Save, Minus, Plus, User,
  Package, Tag, Clock, X, RotateCcw, Zap, CheckCircle, Barcode,
} from 'lucide-react';
import thuocService from '../../services/thuocService';
import khachHangService from '../../services/khachHangService';
import khoService from '../../services/khoService';
import banHangService from '../../services/banHangService';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import SuggestedSubstitute from '../../components/common/SuggestedSubstitute';
import { formatCurrency } from '../../utils/format';
import { invoiceListNavigationState } from './banHangFlow';
import CheckoutSuccessModal from './CheckoutSuccessModal';

// ================================================================
// HELPERS
// ================================================================
function uid() {
  return `ct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function PillIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20.5 3.5 13.5a4.95 4.95 0 1 1 7-7l7 7a4.95 4.95 0 1 1-7 7Z"/>
      <path d="m8.5 8.5 7 7"/>
    </svg>
  );
}

/** Highlight từ khóa trong text (case-insensitive, escape regex). */
function Highlight({ text = '', term = '' }) {
  if (!text || !term || !term.trim()) return <>{text}</>;
  const safe = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${safe})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === term.trim().toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-neutral-900 rounded px-0.5">{p}</mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

// ================================================================
// SUB-COMPONENTS
// ================================================================

/** Product card trong grid */
function ProductCard({ thuoc, tonKho, onAdd }) {
  const outOfStock = tonKho <= 0;
  const low = tonKho > 0 && tonKho <= 10;

  return (
    <button
      type="button"
      onClick={() => !outOfStock && onAdd(thuoc, tonKho)}
      disabled={outOfStock}
      className={`
        relative flex flex-col p-3 rounded-card border text-left transition-all
        ${outOfStock
          ? 'border-neutral-200 bg-neutral-50 opacity-60 cursor-not-allowed'
          : 'border-neutral-200 hover:border-primary-300 hover:shadow-card hover:bg-primary-50/30 cursor-pointer'
        }
      `}
    >
      {/* Badge tồn kho */}
      <div className="absolute top-2 right-2">
        {outOfStock ? (
          <span className="px-1.5 py-0.5 text-caption bg-neutral-200 text-neutral-500 rounded whitespace-nowrap">
            Hết hàng
          </span>
        ) : low ? (
          <span className="px-1.5 py-0.5 text-caption bg-warning-100 text-warning-700 rounded whitespace-nowrap">
            Còn {tonKho}
          </span>
        ) : (
          <span className="px-1.5 py-0.5 text-caption bg-success-100 text-success-700 rounded whitespace-nowrap">
            {tonKho}
          </span>
        )}
      </div>

      <div className="w-10 h-10 rounded-card bg-primary-50 text-primary-600 flex items-center justify-center mb-2">
        <PillIcon />
      </div>

      <p className="text-body font-semibold text-neutral-900 line-clamp-2 leading-tight mb-1 pr-12">
        {thuoc.TenThuoc}
      </p>
      <p className="text-caption text-neutral-500 mb-2 truncate">
        {thuoc.TenDM || thuoc.MaDM}
      </p>

      <p className="mt-auto text-body font-bold font-mono text-primary-700">
        {formatCurrency(thuoc.GiaBanThamKhao)}
      </p>
    </button>
  );
}

/** Row trong giỏ hàng */
function CartRow({ item, onQty, onRemove }) {
  const hanMin = item.loFIFO?.length
    ? Math.min(...item.loFIFO.map(l => l.SoNgayConLai))
    : null;

  return (
    <div className="flex items-start gap-3 py-3 px-2 rounded-btn hover:bg-neutral-50 transition-colors group">
      <div className="flex-shrink-0 w-9 h-9 rounded-btn bg-primary-50 text-primary-600 flex items-center justify-center mt-0.5">
        <Package className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-neutral-900 truncate leading-tight">
          {item.TenThuoc}
        </p>
        {item.loFIFO?.length > 0 && (
          <div className="flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 text-neutral-400 flex-shrink-0" />
            <span className="text-caption text-neutral-500 truncate">
              Lô #{item.loFIFO[0].MaLo}
              {item.loFIFO.length > 1 ? ` (+${item.loFIFO.length - 1})` : ''}
              {' · '}
              <span className={
                hanMin <= 7 ? 'text-danger-600 font-medium' :
                hanMin <= 30 ? 'text-warning-600 font-medium' : 'text-neutral-600'
              }>
                HSD: {new Date(item.loFIFO[0].HanSD).toLocaleDateString('vi-VN')}
              </span>
            </span>
          </div>
        )}
        <p className="text-caption text-neutral-500 mt-0.5">
          {formatCurrency(item.giaBan)} × {item.soLuong}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <p className="text-body font-bold font-mono text-neutral-900">
          {formatCurrency(item.thanhTien)}
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onQty(item.uid, -1)}
            disabled={item.soLuong <= 1}
            className="w-7 h-7 rounded-btn flex items-center justify-center text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Giảm"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="w-8 text-center text-body font-semibold tabular-nums">
            {item.soLuong}
          </span>
          <button
            type="button"
            onClick={() => onQty(item.uid, 1)}
            disabled={item.soLuong >= item.tonKho}
            className="w-7 h-7 rounded-btn flex items-center justify-center text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Tăng"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(item.uid)}
        className="flex-shrink-0 w-7 h-7 rounded-btn flex items-center justify-center text-neutral-300 hover:text-danger-500 hover:bg-danger-50 opacity-0 group-hover:opacity-100 transition-all"
        aria-label="Xóa"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ================================================================
// MAIN PAGE
// ================================================================
function BanHangPage() {
  const navigate = useNavigate();
  const searchRef = useRef(null);

  // ── Tồn kho map ─────────────────────────────────────────────
  const [tonKhoMap, setTonKhoMap] = useState({});

  // ── Quick picks (top thuốc) ──────────────────────────────────
  const [quickResults, setQuickResults] = useState([]);
  const [loadingQuick, setLoadingQuick] = useState(true);

  // ── URL param: ?add=<MaThuoc> (từ nút "Bán ngay" ở /thuoc) ───
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const addParam = params.get('add');
    if (!addParam) return;

    // Clear param khỏi URL
    params.delete('add');
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);

    // Fetch thuốc từ param và auto-add vào giỏ
    const autoAdd = async (maThuoc) => {
      try {
        const res = await thuocService.getById(Number(maThuoc));
        const thuoc = res.data;
        if (!thuoc) return;
        const stockResponse = await khoService.getLoByThuoc(Number(maThuoc));
        const tk = Number(stockResponse.data?.tonKho) || 0;
        if (tk <= 0) {
          toast.error(`${thuoc.TenThuoc} hiện đã hết hàng`);
          // Hiện banner gợi ý thuốc thay thế (đúng nghiệp vụ)
          await showSubstitutesFor(thuoc);
          return;
        }
        await addToCart(thuoc, tk);
      } catch {
        toast.error('Không thể thêm thuốc vào giỏ');
      }
    };

    autoAdd(addParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Search thuốc ─────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Khách hàng ──────────────────────────────────────────────
  const [khSearch, setKhSearch] = useState('');
  const [khResults, setKhResults] = useState([]);
  const [showKhDropdown, setShowKhDropdown] = useState(false);
  const [selectedKH, setSelectedKH] = useState(null);

  // ── Giỏ hàng ────────────────────────────────────────────────
  const [cart, setCart] = useState([]);

  // ── Thanh toán ──────────────────────────────────────────────
  const [tienDua, setTienDua] = useState('');
  const [giamGia, setGiamGia] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Modal thanh toán thành công ──────────────────────────────
  // Lưu HĐ vừa tạo để hiển thị Success Modal tại chỗ thay vì navigate đi.
  // User chủ động bấm "Bán tiếp" (đóng modal) hoặc "Xem chi tiết" (navigate).
  const [lastInvoice, setLastInvoice] = useState(null);
  // Snapshot tên KH để hiển thị trong modal sau khi selectedKH đã bị clear.
  const [lastCustomerName, setLastCustomerName] = useState('');

  // ── Tab view (mobile/responsive) ───────────────────────────
  const [view, setView] = useState('search');

  // ── Gợi ý thuốc thay thế (khi thuốc nguồn hết hàng) ───────
  // Nghiệp vụ: NV tìm thuốc hết → hiện danh sách thuốc cùng hoạt chất còn hàng.
  const [outOfStockThuoc, setOutOfStockThuoc] = useState(null);
  const [substitutes, setSubstitutes] = useState([]);
  const [substituteLoading, setSubstituteLoading] = useState(false);

  // ================================================================
  // COMPUTED
  // ================================================================
  const tongCong = useMemo(
    () => cart.reduce((s, it) => s + it.soLuong * it.giaBan, 0),
    [cart]
  );
  const thanhTien = useMemo(
    () => Math.max(0, tongCong - (Number(giamGia) || 0)),
    [tongCong, giamGia]
  );
  const tienDuaNum = Number(tienDua) || 0;
  const tienTraLai = Math.max(0, tienDuaNum - thanhTien);
  const isDu = tienDuaNum >= thanhTien;

  // ================================================================
  // LOAD QUICK PICKS
  // ================================================================
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingQuick(true);
      try {
        // Lấy 50 thuốc gần nhất, FE sẽ filter còn hàng để hiển thị Quick Picks.
        // Backend sort MaThuoc DESC nên lô mới nhất lên đầu — nhưng thuốc mới tạo
        // thường chưa nhập lô → tồn = 0. Phải lấy nhiều hơn để có thuốc còn hàng.
        const res = await thuocService.getAll({ limit: 50 });
        if (!cancelled) {
          const items = res.data?.items || [];
          setQuickResults(items);
          const map = {};
          items.forEach(t => { map[t.MaThuoc] = t.SoLuongTonKho || 0; });
          setTonKhoMap(map);
        }
      } catch {
        toast.error('Không thể tải danh sách thuốc gợi ý');
      }
      finally { if (!cancelled) setLoadingQuick(false); }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ================================================================
  // DEBOUNCED SEARCH
  // ================================================================
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await thuocService.getAll({ keyword: search, limit: 30 });
        const items = res.data?.items || [];
        setResults(items);
        setShowDropdown(true);
        setTonKhoMap(prev => {
          const next = { ...prev };
          items.forEach(t => { next[t.MaThuoc] = t.SoLuongTonKho || 0; });
          return next;
        });
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ================================================================
  // DEBOUNCED KHÁCH HÀNG SEARCH
  // ================================================================
  useEffect(() => {
    if (!khSearch.trim()) { setKhResults([]); setShowKhDropdown(false); return; }
    const t = setTimeout(async () => {
      try {
        const res = await khachHangService.getAll({ keyword: khSearch, limit: 5 });
        setKhResults(res.data?.items || []);
        setShowKhDropdown(true);
      } catch { setKhResults([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [khSearch]);

  // ================================================================
  // THÊM THUỐC VÀO GIỎ
  // ================================================================
  const addToCart = useCallback(async (thuoc, tonKho) => {
    if (!tonKho || tonKho <= 0) {
      // Thuốc hết hàng → fetch gợi ý thay thế (đề bài 18/9 - đúng nghiệp vụ)
      await showSubstitutesFor(thuoc);
      toast.error(`"${thuoc.TenThuoc}" đã hết hàng`);
      return;
    }

    const existing = cart.find(it => it.MaThuoc === thuoc.MaThuoc);
    if (existing) {
      if (existing.soLuong >= tonKho) {
        toast.error(`Chỉ còn ${tonKho} trong kho`);
        return;
      }
      setCart(prev => prev.map(it =>
        it.MaThuoc === thuoc.MaThuoc
          ? { ...it, soLuong: it.soLuong + 1, thanhTien: (it.soLuong + 1) * it.giaBan }
          : it
      ));
      toast.success(`+1 "${thuoc.TenThuoc}"`);
    } else {
      let loFIFO = [];
      try {
        const res = await khoService.getLoByThuoc(thuoc.MaThuoc);
        loFIFO = (res.data?.items || []).slice(0, 3);
      } catch { /* fallback */ }

      const newItem = {
        uid: uid(),
        MaThuoc: thuoc.MaThuoc,
        TenThuoc: thuoc.TenThuoc,
        soLuong: 1,
        giaBan: Number(thuoc.GiaBanThamKhao) || 0,
        thanhTien: Number(thuoc.GiaBanThamKhao) || 0,
        loFIFO,
        tonKho,
      };
      setCart(prev => [...prev, newItem]);
      toast.success(`Đã thêm "${thuoc.TenThuoc}"`, { icon: '💊', duration: 1500 });
    }

    setSearch('');
    setShowDropdown(false);
    setView('cart');
    setTimeout(() => searchRef.current?.focus(), 100);
  }, [cart]);

  // ================================================================
  // CẬP NHẬT SỐ LƯỢNG
  // ================================================================
  const updateQty = useCallback((uid, delta) => {
    setCart(prev => prev.map(it => {
      if (it.uid !== uid) return it;
      const newQty = Math.max(1, Math.min(it.soLuong + delta, it.tonKho));
      if (newQty === it.soLuong) return it;
      return { ...it, soLuong: newQty, thanhTien: newQty * it.giaBan };
    }));
  }, []);

  // ================================================================
  // XÓA ITEM
  // ================================================================
  const removeItem = useCallback((uid) => {
    setCart(prev => prev.filter(it => it.uid !== uid));
  }, []);

  // ================================================================
  // RESET
  // ================================================================
  const resetCart = useCallback(() => {
    if (cart.length === 0) return;
    setCart([]);
    setTienDua('');
    setGiamGia('');
    setSelectedKH(null);
    setKhSearch('');
    toast('Đã xóa giỏ', { icon: '🔄', duration: 1200 });
  }, [cart.length]);

  // ================================================================
  // GỢI Ý THUỐC THAY THẾ (khi thuốc nguồn hết hàng)
  // Nghiệp vụ: NV tìm thuốc A mà hết → đề xuất thuốc B cùng hoạt chất còn hàng.
  // ================================================================
  const showSubstitutesFor = useCallback(async (thuoc) => {
    if (!thuoc?.MaThuoc) return;
    setOutOfStockThuoc(thuoc);
    setSubstitutes([]);
    setSubstituteLoading(true);
    try {
      const res = await thuocService.getSimilar(thuoc.MaThuoc, { limit: 6, inStockOnly: true });
      setSubstitutes(res.data || []);
    } catch {
      setSubstitutes([]);
    } finally {
      setSubstituteLoading(false);
    }
  }, []);

  const dismissSubstitutes = useCallback(() => {
    setOutOfStockThuoc(null);
    setSubstitutes([]);
  }, []);

  const handlePickSubstitute = useCallback(async (sub) => {
    const tonKho = Number(sub.SoLuongTonKho) || 0;
    if (tonKho <= 0) {
      toast.error('Thuốc thay thế đã hết hàng');
      return;
    }
    dismissSubstitutes();

    let loFIFO = [];
    try {
      const res = await khoService.getLoByThuoc(sub.MaThuoc);
      loFIFO = (res.data?.items || []).slice(0, 3);
    } catch { /* fallback */ }

    setCart(prev => {
      const existing = prev.find(it => it.MaThuoc === sub.MaThuoc);
      if (existing) {
        if (existing.soLuong >= tonKho) {
          toast.error(`Chỉ còn ${tonKho} trong kho`);
          return prev;
        }
        return prev.map(it =>
          it.MaThuoc === sub.MaThuoc
            ? { ...it, soLuong: it.soLuong + 1, thanhTien: (it.soLuong + 1) * it.giaBan }
            : it
        );
      }
      const newItem = {
        uid: uid(),
        MaThuoc: sub.MaThuoc,
        TenThuoc: sub.TenThuoc,
        soLuong: 1,
        giaBan: Number(sub.GiaBanThamKhao) || 0,
        thanhTien: Number(sub.GiaBanThamKhao) || 0,
        loFIFO,
        tonKho,
      };
      return [...prev, newItem];
    });
    toast.success(`Đã thêm thuốc thay thế "${sub.TenThuoc}"`, { icon: '💊', duration: 1500 });
    setView('cart');
  }, [dismissSubstitutes]);

  // ================================================================
  // XEM CHI TIẾT HÓA ĐƠN VỪA TẠO
  // ================================================================
  const handleViewInvoiceDetail = useCallback(() => {
    if (!lastInvoice) return;
    const destination = invoiceListNavigationState(lastInvoice.MaHD);
    setLastInvoice(null);
    navigate(destination.pathname, { state: destination.state });
  }, [lastInvoice, navigate]);

  // ================================================================
  // SUBMIT
  // ================================================================
  const handleSubmit = async () => {
    if (cart.length === 0) { toast.error('Giỏ hàng trống'); return; }
    const giamGiaNum = Number(giamGia) || 0;
    if (giamGiaNum < 0 || giamGiaNum > tongCong) {
      toast.error('Giảm giá phải từ 0 đến tổng cộng');
      return;
    }
    if (!isDu) { toast.error('Số tiền khách đưa chưa đủ'); return; }

    setSubmitting(true);
    try {
      const res = await banHangService.banHang({
        maKH: selectedKH?.MaKH || null,
        tienKhachDua: tienDuaNum,
        giamGia: giamGiaNum,
        items: cart.map(it => ({ maThuoc: it.MaThuoc, soLuong: it.soLuong })),
      });
      // Reset giỏ + form NGAY, rồi hiện Success Modal.
      // Trước đây code cũ navigate('/hoa-don') ngay → user bị giật sang trang khác.
      // Giờ giữ user lại POS, modal có nút "Xem chi tiết" để chủ động đi.
      const usedKH = selectedKH;
      setCart([]);
      setTienDua('');
      setGiamGia('');
      setSelectedKH(null);
      setKhSearch('');
      setLastCustomerName(usedKH?.TenKH || '');
      setLastInvoice(res.data);
      toast.success(`Đã thanh toán — HĐ #${res.data.MaHD}`, { icon: '✅' });
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Tạo hóa đơn thất bại';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        icon={<ShoppingCart />}
        title="Bán thuốc"
        subtitle="Tìm thuốc, thêm vào giỏ và thanh toán (FIFO — lô cũ xuất trước)"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ═══════════════════════════════════════════════════════ */}
        {/* LEFT — TÌM KIẾM + PRODUCT GRID / CART ITEMS            */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="lg:col-span-2 space-y-3">
          {/* Banner gợi ý thay thế (khi user chọn thuốc hết hàng) */}
          {outOfStockThuoc && (
            <SuggestedSubstitute
              thuocNguon={outOfStockThuoc}
              substitutes={substitutes}
              loading={substituteLoading}
              onPick={handlePickSubstitute}
              onDismiss={dismissSubstitutes}
            />
          )}

          {/* Search bar */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none z-10" aria-hidden="true" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Tìm thuốc theo tên, hoạt chất…"
                className="w-full h-11 pl-10 pr-12 text-body border border-neutral-300 rounded-card focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-shadow"
                aria-label="Tìm thuốc"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => { setSearch(''); setShowDropdown(false); searchRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-neutral-200 hover:bg-neutral-300 text-neutral-500 flex items-center justify-center transition-colors"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Dropdown kết quả */}
            {showDropdown && (searching || results.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-card shadow-modal z-20 max-h-[28rem] overflow-y-auto">
                {searching ? (
                  <div className="px-4 py-6 text-center text-neutral-400 text-body">Đang tìm...</div>
                ) : (
                  results.map(t => {
                    const tk = tonKhoMap[t.MaThuoc] ?? t.SoLuongTonKho ?? 0;
                    const low = tk > 0 && tk <= 10;
                    const isExact = t.TenThuoc.toLowerCase() === search.trim().toLowerCase();
                    const isPrefix = !isExact && t.TenThuoc.toLowerCase().startsWith(search.trim().toLowerCase());
                    return (
                      <button
                        key={t.MaThuoc}
                        type="button"
                        onMouseDown={() => addToCart(t, tk)}
                        disabled={tk <= 0}
                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 text-left border-b border-neutral-100 last:border-0 transition-colors ${tk <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="min-w-0 flex-1 mr-3">
                          <p className="text-body font-semibold text-neutral-900 truncate">
                            <Highlight text={t.TenThuoc} term={search} />
                            {isExact && (
                              <span className="ml-1.5 px-1.5 py-0.5 text-caption bg-primary-100 text-primary-700 rounded">
                                chính xác
                              </span>
                            )}
                            {!isExact && isPrefix && (
                              <span className="ml-1.5 px-1.5 py-0.5 text-caption bg-info-100 text-info-700 rounded">
                                bắt đầu
                              </span>
                            )}
                          </p>
                          <p className="text-caption text-neutral-500 truncate">
                            {t.HoatChat ? <Highlight text={t.HoatChat} term={search} /> : (t.TenDM || t.MaDM)}
                            {' · '}
                            {t.TenDM || t.MaDM} · #{t.MaThuoc}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-body font-bold font-mono text-primary-700">
                            {formatCurrency(t.GiaBanThamKhao)}
                          </p>
                          <p className={`text-caption font-medium ${low ? 'text-warning-600' : tk > 0 ? 'text-success-600' : 'text-neutral-400'}`}>
                            {tk > 0 ? `Tồn: ${tk}` : 'Hết hàng'}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-card">
            <button
              type="button"
              onClick={() => setView('search')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-btn text-body font-medium transition-colors ${
                view === 'search' ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Search className="w-4 h-4" />
              Tìm thuốc
            </button>
            <button
              type="button"
              onClick={() => setView('cart')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-btn text-body font-medium transition-colors ${
                view === 'cart' ? 'bg-white text-primary-700 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              Giỏ hàng
              {cart.length > 0 && (
                <span className="px-1.5 py-0.5 text-caption bg-accent-100 text-accent-700 rounded-full">
                  {cart.length}
                </span>
              )}
            </button>
          </div>

          {/* SEARCH VIEW */}
          {view === 'search' && (
            <>
              {!search && (
                <div className="flex items-center gap-2 pt-1">
                  <Zap className="w-4 h-4 text-accent-600" />
                  <p className="text-body font-semibold text-neutral-700">Thường dùng</p>
                </div>
              )}

              {loadingQuick ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-card bg-neutral-100 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(search ? results : quickResults).filter(t => {
                    const tk = tonKhoMap[t.MaThuoc] ?? t.SoLuongTonKho ?? 0;
                    // Quick Picks CHỈ hiển thị thuốc còn tồn (tránh toàn "Hết hàng")
                    return search ? true : tk > 0;
                  }).slice(0, 12).map(t => (
                    <ProductCard
                      key={t.MaThuoc}
                      thuoc={t}
                      tonKho={tonKhoMap[t.MaThuoc] ?? t.SoLuongTonKho ?? 0}
                      onAdd={addToCart}
                    />
                  ))}
                </div>
              )}

              {/* Empty state khi Quick Picks không có thuốc nào còn hàng */}
              {!search && quickResults.filter(t => (tonKhoMap[t.MaThuoc] ?? t.SoLuongTonKho ?? 0) > 0).length === 0 && !loadingQuick && (
                <div className="text-center py-8">
                  <Package className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
                  <p className="text-body text-neutral-500">Chưa có thuốc nào có sẵn trong kho</p>
                  <p className="text-caption text-neutral-400 mt-1">Thử tìm kiếm ở ô trên</p>
                </div>
              )}

              {search && results.length === 0 && !searching && (
                <div className="text-center py-8">
                  <Package className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
                  <p className="text-body text-neutral-500">Không tìm thấy thuốc nào</p>
                  <p className="text-caption text-neutral-400 mt-1">Thử từ khóa khác</p>
                </div>
              )}
            </>
          )}

          {/* CART VIEW */}
          {view === 'cart' && (
            <Card title={`Giỏ hàng (${cart.length})`} padding={false}>
              {cart.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart className="w-12 h-12 mx-auto text-neutral-200 mb-3" />
                  <p className="text-body text-neutral-500">Giỏ hàng trống</p>
                  <p className="text-caption text-neutral-400 mt-1">Tìm và thêm thuốc bên cạnh</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setView('search')}
                    className="mt-3"
                    icon={<Search className="w-4 h-4" />}
                  >
                    Tìm thuốc ngay
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {cart.map(it => (
                    <CartRow
                      key={it.uid}
                      item={it}
                      onQty={updateQty}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* RIGHT — KHÁCH HÀNG + THANH TOÁN (sticky)                */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="space-y-3">
          <div className="lg:sticky lg:top-4 space-y-3">
            {/* Khách hàng */}
            <Card title="Khách hàng" padding="compact">
              {selectedKH ? (
                <div className="flex items-center justify-between p-2.5 bg-success-50 border border-success-100 rounded-card">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
                    <span className="text-body font-medium text-success-800 truncate">
                      {selectedKH.TenKH}
                    </span>
                    <span className="text-caption text-success-600 flex-shrink-0">
                      #{selectedKH.MaKH}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedKH(null); setKhSearch(''); }}
                    className="flex-shrink-0 text-caption text-success-600 hover:text-success-800 hover:underline"
                  >
                    Đổi
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    <input
                      type="text"
                      value={khSearch}
                      onChange={e => setKhSearch(e.target.value)}
                      onFocus={() => { if (khResults.length > 0) setShowKhDropdown(true); }}
                      onBlur={() => setTimeout(() => setShowKhDropdown(false), 200)}
                      placeholder="Tìm hoặc bỏ trống (khách lẻ)"
                      className="w-full h-9 pl-9 pr-3 text-body border border-neutral-200 rounded-btn focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-sm"
                    />
                  </div>
                  {showKhDropdown && khResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-card shadow-modal z-20">
                      {khResults.map(kh => (
                        <button
                          key={kh.MaKH}
                          type="button"
                          onMouseDown={() => {
                            setSelectedKH(kh);
                            setKhResults([]);
                            setShowKhDropdown(false);
                            setKhSearch('');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-neutral-50 text-left border-b border-neutral-100 last:border-0"
                        >
                          <User className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-body font-medium text-neutral-900 truncate">{kh.TenKH}</p>
                            <p className="text-caption text-neutral-500">{kh.SDT || '—'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Tổng tiền */}
            <Card padding="compact">
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-body text-neutral-600">Tổng cộng</span>
                  <span className="text-body font-semibold font-mono text-neutral-700">
                    {formatCurrency(tongCong)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                  <input
                    type="number"
                    min="0"
                    max={tongCong}
                    value={giamGia}
                    onChange={e => setGiamGia(e.target.value)}
                    placeholder="Giảm giá (₫)"
                    className="flex-1 h-8 px-2.5 text-body border border-neutral-200 rounded-btn focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 text-sm font-mono"
                  />
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-200">
                  <span className="text-body font-semibold text-neutral-900">Thành tiền</span>
                  <span className="text-h3 font-bold font-mono text-primary-700">
                    {formatCurrency(thanhTien)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Tiền khách đưa */}
            <Card title="Tiền khách đưa" padding="compact">
              <div className="space-y-2.5">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={tienDua}
                    onChange={e => setTienDua(e.target.value)}
                    placeholder="0"
                    className="w-full h-11 px-3 text-right text-body font-mono text-h3 font-bold border border-neutral-300 rounded-card focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-neutral-400 pointer-events-none">
                    ₫
                  </span>
                </div>

                {tienDuaNum > 0 && (
                  <div className={`flex justify-between items-center p-3 rounded-card ${
                    isDu
                      ? 'bg-success-50 border border-success-200'
                      : 'bg-danger-50 border border-danger-200'
                  }`}>
                    <span className={`text-body font-medium ${isDu ? 'text-success-700' : 'text-danger-700'}`}>
                      {isDu ? 'Tiền thừa' : 'Thiếu'}
                    </span>
                    <span className={`text-h3 font-bold font-mono ${isDu ? 'text-success-800' : 'text-danger-800'}`}>
                      {formatCurrency(tienTraLai)}
                    </span>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  icon={<Save className="w-5 h-5" />}
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={cart.length === 0 || !isDu}
                  className="w-full"
                >
                  {cart.length === 0 ? 'Chưa có sản phẩm' : isDu ? 'Hoàn thành' : 'Tiền chưa đủ'}
                </Button>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={resetCart}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-caption text-neutral-400 hover:text-danger-500 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Xóa giỏ hàng
                  </button>
                )}
              </div>
            </Card>

            </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SUCCESS MODAL — hiển thị ngay sau khi thanh toán        */}
      {/* ═══════════════════════════════════════════════════════ */}
      <CheckoutSuccessModal
        open={!!lastInvoice}
        invoice={lastInvoice}
        customerName={lastCustomerName}
        onClose={() => setLastInvoice(null)}
        onViewDetail={handleViewInvoiceDetail}
      />
    </div>
  );
}

export default BanHangPage;
