/**
 * PhieuNhapCreatePage - Form tạo phiếu nhập + nhiều lô thuốc
 *
 * Layout:
 *  1. Chọn nhà cung cấp (Select)
 *  2. Bảng các lô thuốc (thêm/xóa/sửa trong form)
 *     - Mỗi dòng: thuốc (Select), SL nhập, NSX, HSD, Giá nhập, nút xóa
 *  3. Nút "Thêm lô"
 *  4. Footer: Tổng SL + Tổng tiền + Submit / Cancel
 *
 * Sau khi submit thành công → navigate về /kho (list phiếu nhập)
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { Truck, Plus, Trash2, ArrowLeft, Save, Package } from 'lucide-react';
import phieuNhapService from '../../services/phieuNhapService';
import thuocService from '../../services/thuocService';
import nhaCungCapService from '../../services/nhaCungCapService';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import LoadingState from '../../components/ui/LoadingState';
import { formatCurrency } from '../../utils/format';
import { loadAllPaginatedItems } from './paginatedOptions';

function createLot(maThuoc = '', giaNhap = '') {
  return {
    _id: `lo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    maThuoc,
    soLuongNhap: '',
    ngaySX: dayjs().format('YYYY-MM-DD'),
    hanSD: dayjs().add(1, 'year').format('YYYY-MM-DD'),
    giaNhap,
  };
}

function PhieuNhapCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetMedicineId = Number(searchParams.get('maThuoc')) || null;
  const returnPath = presetMedicineId ? `/thuoc/${presetMedicineId}` : '/kho';

  // Data
  const [nccList, setNccList] = useState([]);
  const [thuocList, setThuocList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form
  const [maNCC, setMaNCC] = useState('');
  const [chiTiet, setChiTiet] = useState([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load NCC + Thuốc (lấy tất cả để dropdown)
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        // Lay tat ca NCC + Thuoc (chia nhieu page de lay full)
        const [suppliers, medicines] = await Promise.all([
          loadAllPaginatedItems(
            (page, limit) => nhaCungCapService.getAll({ page, limit }),
            100
          ),
          loadAllPaginatedItems(
            (page, limit) => thuocService.getAll({ page, limit }),
            100
          ),
        ]);
        setNccList(suppliers);
        setThuocList(medicines);

        if (presetMedicineId) {
          const preset = medicines.find((item) => Number(item.MaThuoc) === presetMedicineId);
          if (preset) {
            setChiTiet((current) =>
              current.length > 0
                ? current
                : [
                    createLot(
                      String(preset.MaThuoc),
                      preset.GiaBanThamKhao ? Math.round(preset.GiaBanThamKhao * 0.7) : ''
                    ),
                  ]
            );
          }
        }
      } catch {
        toast.error('Không thể tải nhà cung cấp / thuốc');
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  // Thêm dòng lô mới
  const handleAddLo = () => {
    setChiTiet((prev) => [...prev, createLot()]);
  };

  // Cap nhat 1 dong lo
  const handleChangeLo = (loId, field, value) => {
    setChiTiet((prev) =>
      prev.map((ct) => (ct._id === loId ? { ...ct, [field]: value } : ct))
    );
  };

  // Xóa 1 dòng lô
  const handleRemoveLo = (loId) => {
    setChiTiet((prev) => prev.filter((ct) => ct._id !== loId));
  };

  // Auto-fill gia nhap tu GiaBanThamKhao
  const handleSelectThuoc = (loId, maThuoc) => {
    const t = thuocList.find((x) => Number(x.MaThuoc) === Number(maThuoc));
    setChiTiet((prev) =>
      prev.map((ct) =>
        ct._id === loId
          ? {
              ...ct,
              maThuoc,
              giaNhap: t?.GiaBanThamKhao ? Math.round(t.GiaBanThamKhao * 0.7) : ct.giaNhap,
            }
          : ct
      )
    );
  };

  // Tính tổng
  const tong = useMemo(() => {
    const tongSL = chiTiet.reduce((s, ct) => s + (Number(ct.soLuongNhap) || 0), 0);
    const tongTien = chiTiet.reduce(
      (s, ct) => s + (Number(ct.soLuongNhap) || 0) * (Number(ct.giaNhap) || 0),
      0
    );
    return { tongSL, tongTien };
  }, [chiTiet]);

  // Validate
  const validate = () => {
    if (!maNCC) return 'Vui lòng chọn nhà cung cấp';
    if (chiTiet.length === 0) return 'Phiếu nhập phải có ít nhất 1 lô thuốc';

    for (let i = 0; i < chiTiet.length; i++) {
      const ct = chiTiet[i];
      const num = i + 1;
      if (!ct.maThuoc) return `Lô #${num}: chưa chọn thuốc`;
      const sl = Number(ct.soLuongNhap);
      if (!ct.soLuongNhap || isNaN(sl) || sl <= 0)
        return `Lô #${num}: số lượng nhập phải > 0`;
      if (!ct.ngaySX) return `Lô #${num}: thiếu ngày sản xuất`;
      if (!ct.hanSD) return `Lô #${num}: thiếu hạn sử dụng`;
      if (new Date(ct.hanSD) <= new Date(ct.ngaySX))
        return `Lô #${num}: hạn sử dụng phải sau ngày sản xuất`;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(ct.hanSD) <= today)
        return `Lô #${num}: hạn sử dụng phải sau ngày hiện tại`;
      const gia = Number(ct.giaNhap);
      if (isNaN(gia) || gia < 0) return `Lô #${num}: giá nhập phải ≥ 0`;
    }
    return null;
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        maNCC: Number(maNCC),
        chiTiet: chiTiet.map((ct) => ({
          maThuoc: Number(ct.maThuoc),
          soLuongNhap: Number(ct.soLuongNhap),
          ngaySX: ct.ngaySX,
          hanSD: ct.hanSD,
          giaNhap: Number(ct.giaNhap),
        })),
      };
      const res = await phieuNhapService.create(payload);
      toast.success(res.message || 'Tạo phiếu nhập thành công');
      navigate(returnPath);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Tạo phiếu nhập thất bại';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Options cho Select
  const nccOptions = useMemo(
    () =>
      nccList.map((n) => ({
        value: n.MaNCC,
        label: `#${n.MaNCC} - ${n.TenNCC}`,
      })),
    [nccList]
  );

  const thuocOptions = useMemo(
    () =>
      thuocList.map((t) => ({
        value: t.MaThuoc,
        label: `#${t.MaThuoc} - ${t.TenThuoc}`,
      })),
    [thuocList]
  );

  const presetMedicine = useMemo(
    () => thuocList.find((item) => Number(item.MaThuoc) === presetMedicineId),
    [thuocList, presetMedicineId]
  );

  if (loadingData) {
    return <LoadingState label="Đang tải danh mục thuốc và nhà cung cấp..." />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        icon={<Truck />}
        title={presetMedicine ? `Nhập thêm ${presetMedicine.TenThuoc}` : 'Tạo phiếu nhập'}
        subtitle={
          presetMedicine
            ? `Tạo lô nhập mới cho thuốc #${presetMedicine.MaThuoc}`
            : 'Tạo phiếu nhập và các lô thuốc trong một giao dịch'
        }
        actions={
          <Button variant="secondary" icon={<ArrowLeft />} onClick={() => navigate(returnPath)}>
            Quay lại
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card NCC */}
        <Card title="Thông tin phiếu nhập">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Nhà cung cấp"
              required
              value={maNCC}
              onChange={setMaNCC}
              options={nccOptions}
              placeholder="-- Chọn nhà cung cấp --"
            />
            <Input
              label="Ngày nhập"
              type="datetime-local"
              value={dayjs().format('YYYY-MM-DDTHH:mm')}
              disabled
              hint="Tự động lấy ngày hiện tại"
            />
          </div>
        </Card>

        {/* Card chi tiet lo */}
        <Card
          title="Chi tiết các lô thuốc"
          subtitle={`${chiTiet.length} lô`}
          actions={
            <Button type="button" variant="primary" icon={<Plus />} onClick={handleAddLo}>
              Thêm lô
            </Button>
          }
        >
          {chiTiet.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <Package className="w-10 h-10 mx-auto text-neutral-300 mb-2" />
              <p className="text-body">Chưa có lô thuốc nào</p>
              <p className="text-caption">Bấm "Thêm lô" để bắt đầu</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-2 px-2 text-caption font-semibold text-neutral-600 uppercase">
                <div className="col-span-3">Thuốc</div>
                <div className="col-span-1 text-right">SL nhập</div>
                <div className="col-span-2">Ngày SX</div>
                <div className="col-span-2">Hạn SD</div>
                <div className="col-span-2 text-right">Giá nhập</div>
                <div className="col-span-2 text-right">Thành tiền</div>
                <div className="col-span-0"></div>
              </div>

              {chiTiet.map((ct, idx) => {
                const thanhTien = (Number(ct.soLuongNhap) || 0) * (Number(ct.giaNhap) || 0);
                return (
                  <div
                    key={ct._id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start p-3 border border-neutral-200 rounded-card bg-neutral-50"
                  >
                    <div className="md:col-span-3">
                      <label className="block md:hidden text-caption text-neutral-600 mb-1">
                        #{idx + 1} - Thuốc
                      </label>
                      <Select
                        value={ct.maThuoc}
                        onChange={(v) => handleSelectThuoc(ct._id, v)}
                        options={thuocOptions}
                        placeholder="-- Chọn thuốc --"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block md:hidden text-caption text-neutral-600 mb-1">
                        SL nhập
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={ct.soLuongNhap}
                        onChange={(e) =>
                          handleChangeLo(ct._id, 'soLuongNhap', e.target.value)
                        }
                        placeholder="0"
                        inputClassName="text-right"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block md:hidden text-caption text-neutral-600 mb-1">
                        Ngày SX
                      </label>
                      <Input
                        type="date"
                        value={ct.ngaySX}
                        onChange={(e) => handleChangeLo(ct._id, 'ngaySX', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block md:hidden text-caption text-neutral-600 mb-1">
                        Hạn SD
                      </label>
                      <Input
                        type="date"
                        value={ct.hanSD}
                        onChange={(e) => handleChangeLo(ct._id, 'hanSD', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block md:hidden text-caption text-neutral-600 mb-1">
                        Giá nhập (₫)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="1000"
                        value={ct.giaNhap}
                        onChange={(e) => handleChangeLo(ct._id, 'giaNhap', e.target.value)}
                        placeholder="0"
                        inputClassName="text-right"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block md:hidden text-caption text-neutral-600 mb-1">
                        Thành tiền
                      </label>
                      <div className="h-10 px-3 flex items-center justify-end text-body font-medium text-neutral-900 font-mono bg-white border border-neutral-200 rounded-btn">
                        {formatCurrency(thanhTien)}
                      </div>
                    </div>
                    <div className="md:col-span-0 flex md:items-start md:pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 />}
                        onClick={() => handleRemoveLo(ct._id)}
                        aria-label="Xóa lô"
                        className="text-danger-600 hover:bg-danger-50"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Form error */}
        {formError && (
          <div className="p-3 bg-danger-50 border border-danger-100 rounded-btn text-caption text-danger-700">
            {formError}
          </div>
        )}

        {/* Footer */}
        <Card>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-body text-neutral-700">
              <span className="text-caption text-neutral-500 mr-2">Tổng:</span>
              <span className="font-semibold text-neutral-900">{tong.tongSL}</span>
              <span className="ml-1">sản phẩm</span>
              <span className="mx-3 text-neutral-300">·</span>
              <span className="font-mono font-bold text-h3 text-primary-700">
                {formatCurrency(tong.tongTien)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => navigate(returnPath)}
                disabled={submitting}
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                type="submit"
                icon={<Save />}
                loading={submitting}
                disabled={chiTiet.length === 0}
              >
                Tạo phiếu nhập
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

export default PhieuNhapCreatePage;
