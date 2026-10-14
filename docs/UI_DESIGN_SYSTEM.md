# 🎨 SecurePharma — UI/UX Design System

> **Phiên bản:** 1.1.0 (Pharmacity-inspired palette)
> **Cập nhật:** 15/09/2026
> **Phạm vi:** Toàn bộ React frontend (`frontend/src/`)
> **Stack:** React 18 + Vite + TailwindCSS 3.4 + Headless UI 1.7 + lucide-react + dayjs

---

## 📋 Mục lục

1. [Triết lý thiết kế](#1-triết-lý-thiết-kế)
2. [Cài đặt & Cấu hình](#2-cài-đặt--cấu-hình)
3. [Bảng màu](#3-bảng-màu)
4. [Typography](#4-typography)
5. [Spacing & Shape](#5-spacing--shape)
6. [Shadow & Animation](#6-shadow--animation)
7. [Component Design System](#7-component-design-system)
8. [Pattern nghiệp vụ dược phẩm](#8-pattern-nghiệp-vụ-dược-phẩm)
9. [Accessibility Checklist](#9-accessibility-checklist)
10. [Anti-patterns](#10-anti-patterns)
11. [Hướng dẫn refactor page](#11-hướng-dẫn-refactor-page)

---

## 1. Triết lý thiết kế

### 1.1. Ngành dược cần gì?

| Yếu tố | Lý do |
|---|---|
| **Tin cậy** | Bệnh nhân tin tưởng dược sĩ → giao diện phải "an toàn" |
| **Sạch sẽ** | Ngành y tế — gam màu sáng, trắng, không lòe loẹt |
| **Chuyên nghiệp** | Không dùng đỏ-cam-vàng làm màu thương hiệu; chỉ dùng cho trạng thái nghiệp vụ |
| **Dễ đọc** | Dược sĩ lớn tuổi — font ≥ 14px, contrast cao |
| **Nhất quán** | Cùng 1 style xuyên suốt để giảng viên thấy "đồ án chỉn chu" |

### 1.2. Bản sắc "Pharmacy Blue + Health Green"

- **Primary xanh dương `#1B51A3`** — tạo cảm giác tin cậy, chuyên nghiệp và phù hợp hệ thống nhà thuốc.
- **Primary đậm `#144083`** — dùng cho header, sidebar và CTA chính.
- **Accent xanh lá `#6DBD45`** — gợi sức khỏe, thuốc và hồi phục; chỉ dùng để nhấn, không cạnh tranh với primary.
- **Nền trắng/xám rất nhạt** — giữ giao diện sạch, thoáng và dễ đọc khi thao tác lâu.
- **Cam/đỏ** — chỉ dùng cho cảnh báo, lỗi, tồn kho thấp hoặc hóa đơn hủy.

> Palette được tham khảo từ CSS và logo công khai của [Pharmacity](https://www.pharmacity.vn/) tại thời điểm 15/09/2026. Đây là nguồn cảm hứng giao diện, không phải tuyên bố sử dụng brand guideline chính thức của Pharmacity.

### 1.3. Nguyên tắc UX

1. **Tối đa 3 màu chính** trên 1 màn hình (primary + semantic + neutral)
2. **Icon + text** cho mọi action quan trọng (không icon-only trừ khi đã quen thuộc)
3. **Confirm trước khi xóa** — không bao giờ dùng `window.confirm`
4. **Loading state rõ ràng** — spinner + label, không để trống
5. **Empty state có hướng dẫn** — không để trang trắng trơn

---

## 2. Cài đặt & Cấu hình

### 2.1. Thư viện đã cài

```bash
npm install @headlessui/react@^1.7.19 clsx@^2.1.1
```

| Package | Vai trò | Bundle impact |
|---|---|---|
| `@headlessui/react` | Accessible primitives (Dialog, Listbox, Menu...) | ~15 KB gz |
| `clsx` | Gộp class có điều kiện | ~200 B gz |
| `lucide-react` | Icon (đã có sẵn) | tree-shake |
| `react-hot-toast` | Toast (đã có sẵn) | — |

### 2.2. File config

| File | Vai trò |
|---|---|
| `docs/UI_DESIGN_SYSTEM.md` | Định nghĩa palette và quy tắc sử dụng |
| `tailwind.config.js` | Mirror color token để dùng qua class Tailwind |
| `src/index.css` | Mirror semantic CSS variables, base layer, scrollbar |
| `src/utils/cn.js` | Helper `cn()` — gộp class có điều kiện |

---

## 3. Bảng màu

### 3.1. Primary — Pharmacy Blue

> **Brand color** — dùng cho header/sidebar, CTA, link, focus ring và menu active.

| Token | Hex | Dùng cho |
|---|---|---|
| `primary-50` | `#E9EDFE` | Background tint, selected row |
| `primary-100` | `#CFD9FC` | Badge nhẹ, hover zone |
| `primary-200` | `#9CB4F9` | Border/focus nhẹ |
| `primary-300` | `#6190F6` | Icon hoặc chart phụ |
| `primary-400` | `#286FDA` | Link/indicator nổi bật |
| **`primary-500`** | **`#1B51A3`** | **BRAND — logo, link, chart chính** |
| **`primary-600`** | **`#144083`** | **Header/sidebar, nút chính** |
| `primary-700` | `#0D3167` | Hover primary-600 |
| `primary-800` | `#07224C` | Active/pressed |
| `primary-900` | `#031532` | Text đậm trên nền nhạt |
| `primary-950` | `#020D25` | Chỉ dùng khi cần tương phản rất cao |

### 3.2. Accent — Health Green

> Màu phụ dùng cho logo, highlight sức khỏe và action tích cực. Không dùng xanh lá thay cho primary ở mọi nút.

| Token | Hex | Dùng cho |
|---|---|---|
| `accent-50` | `#F0F8EC` | Nền highlight xanh nhạt |
| `accent-100` | `#E1F2D9` | Badge/selected state nhẹ |
| `accent-200` | `#C4E4B4` | Border accent |
| `accent-300` | `#A6D78E` | Chart phụ |
| `accent-400` | `#89CA68` | Icon/illustration |
| **`accent-500`** | **`#6DBD45`** | **ACCENT — logo, điểm nhấn sức khỏe** |
| `accent-600` | `#569735` | Hover accent |
| `accent-700` | `#407128` | Text trên nền accent nhạt |
| `accent-800` | `#2B4B1B` | Active/pressed |
| `accent-900` | `#15260D` | Tương phản cao |

### 3.3. Semantic (cho nghiệp vụ)

| Nhóm | Light `50` | Base `500` | Dark `600/700` | Dùng cho |
|---|---|---|---|---|
| `success` | `#D9FFEE` | `#01C091` | `#019670` / `#007154` | Thành công, thuốc còn hạn, NV đang làm |
| `warning` | `#FEF1EE` | `#F26522` | `#C04F19` / `#913910` | Sắp hết hạn, tồn kho thấp, đang chờ |
| `danger` | `#FEEDED` | `#F22222` | `#C41919` / `#931010` | Lỗi, hết hàng, hóa đơn hủy |
| `info` | `#ECF0FF` | `#0070E0` | `#005AB6` / `#00438B` | Thông tin phụ, link phụ |

### 3.4. Neutral

| Token | Hex | Dùng cho |
|---|---|---|
| `neutral-0` | `#FFFFFF` | Card background |
| `neutral-50` | `#F7F7F7` | Page background |
| `neutral-100` | `#F6F6F6` | Table header, subtle bg |
| `neutral-200` | `#EBEBEB` | Border mặc định |
| `neutral-300` | `#DEDEDE` | Border hover |
| `neutral-400` | `#C4C4C4` | Disabled control, icon phụ |
| `neutral-500` | `#9E9E9E` | Placeholder |
| `neutral-600` | `#787878` | Caption, metadata |
| `neutral-700` | `#5C5C5C` | Body text phụ |
| `neutral-800` | `#525252` | Body text chính |
| `neutral-900` | `#2B2B2B` | Heading |

### 3.5. Tỷ lệ sử dụng màu

- **70% neutral:** nền trang, card, table, form.
- **20% primary blue:** header/sidebar, CTA, menu active, link.
- **10% accent + semantic:** logo, badge, cảnh báo và trạng thái.
- Trên một màn hình chỉ nên có một CTA primary nổi bật trong cùng một vùng thao tác.

### 3.6. Token triển khai

```css
:root {
  --color-primary:        #1B51A3;
  --color-primary-hover:  #144083;
  --color-primary-active: #0D3167;
  --color-primary-light:  #E9EDFE;

  --color-accent:         #6DBD45;
  --color-accent-hover:   #569735;
  --color-accent-light:   #F0F8EC;

  --color-success:        #019670;
  --color-warning:        #C04F19;
  --color-danger:         #C41919;
  --color-info:           #005AB6;

  --color-bg-page:        #F7F7F7;
  --color-bg-card:        #FFFFFF;
  --color-border:         #DEDEDE;

  --color-text-heading:   #2B2B2B;
  --color-text-body:      #525252;
  --color-text-muted:     #787878;

  --focus-ring: 0 0 0 3px rgb(27 81 163 / 25%);
}
```

> `UI_DESIGN_SYSTEM.md` là định nghĩa thiết kế. Khi áp dụng runtime, phải mirror chính xác các giá trị trên vào `frontend/tailwind.config.js` và `frontend/src/index.css`; không tạo thêm palette song song.

### 3.7. Bảng semantic nghiệp vụ dược

| Tình huống | Variant | Class mẫu |
|---|---|---|
| Thuốc còn hạn > 30 ngày | `success` | `bg-success-50 text-success-700` |
| Thuốc sắp hết hạn ≤ 30 ngày | `warning` | `bg-warning-50 text-warning-700` |
| Thuốc hết hạn | `danger` | `bg-danger-50 text-danger-700` |
| Tồn kho dồi dào > 50 | `success` | `bg-success-50 text-success-700` |
| Tồn kho thấp 1–10 | `warning` | `bg-warning-50 text-warning-700` |
| Hết hàng | `danger` | `bg-danger-50 text-danger-700` |
| Thuốc kê đơn (RX) | `info` | `bg-info-50 text-info-700` |
| Thuốc OTC | `neutral` | `bg-neutral-100 text-neutral-700` |
| NV đang làm | `success` | `bg-success-50 text-success-700` |
| NV nghỉ việc | `neutral` | `bg-neutral-100 text-neutral-600` |
| Hóa đơn đã thanh toán | `success` | — |
| Hóa đơn bị hủy | `danger` | — |

> 💡 **Mẹo dùng:** Không bao giờ hardcode `bg-green-500`, `bg-blue-500`. Luôn dùng semantic variant qua `<Badge variant="success"/>`.

---

## 4. Typography

### 4.1. Font chính

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

Inter — font số 1 cho SaaS y tế (đẹp, miễn phí, dễ đọc).

### 4.2. Scale thống nhất

| Token | Size | Weight | Dùng cho |
|---|---|---|---|
| `display` | 48px / 1.2 | 700 | Brand title (Login hero) |
| `h1` | 30px / 1.25 | 700 | Tiêu đề page (`PageHeader`) |
| `h2` | 24px / 1.3 | 600 | Tiêu đề modal, card heading |
| `h3` | 18px / 1.4 | 600 | Sub-heading |
| `body` | 14px / 1.5 | 400 | Body mặc định |
| `caption` | 12px / 1.4 | 400 | Helper, label phụ, table header |

### 4.3. Quy tắc

- Heading **luôn** dùng token (`text-h1`, `text-h2`...), không hardcode `text-2xl font-bold`
- Body mặc định = `text-body`
- Label form = `text-body font-medium`
- Helper text = `text-caption`
- Mã SKU, ID = `font-mono text-body text-neutral-500`

---

## 5. Spacing & Shape

### 5.1. Spacing

| Token | Value | Dùng cho |
|---|---|---|
| Card padding | `p-6` (24px) | Card, modal body |
| Card compact | `p-4` (16px) | Search bar, filter |
| Section gap | `space-y-6` (24px) | Giữa các block trong 1 page |
| Table cell | `px-4 py-3` (16/12px) | Ô bảng |
| Button height | `h-10` (40px) | Nút thường |
| Button sm | `h-9` (36px) | Icon button, table action |
| Input height | `h-10` (40px) | Input, Select |

### 5.2. Border radius

| Token | Value | Dùng cho |
|---|---|---|
| `rounded-btn` | 8px | Button, Input, Badge vuông |
| `rounded-card` | 12px | Card, Table wrapper |
| `rounded-modal` | 16px | Dialog/Modal |
| `rounded-pill` | 9999px | Badge tròn, dot |

### 5.3. Layout

| Token | Value | Dùng cho |
|---|---|---|
| `var(--sidebar-width)` / `w-64` | 256px | Sidebar mở |
| `w-0` (off-canvas translate) | 0px | Sidebar đóng trên mobile |
| `h-16` | 64px | Header height |

---

## 6. Shadow & Animation

### 6.1. Shadow

| Token | Dùng cho |
|---|---|
| `shadow-card` | Card mặc định (rất nhẹ) |
| `shadow-card-hover` | Card hover (nhô lên) |
| `shadow-modal` | Dialog |
| `shadow-focus` | Focus ring (a11y) |

### 6.2. Animation

| Token | Duration | Dùng cho |
|---|---|---|
| `animate-fade-in` | 200ms | Toast, fade |
| `animate-slide-up` | 250ms cubic-bezier | Modal entrance |
| `animate-spin-slow` | 1.2s linear | Loading (thay vì 1s gắt) |

---

## 7. Component Design System

> Tất cả ở `frontend/src/components/ui/`. Mỗi component:
> - 1 default export
> - Props rõ ràng, có JSDoc
> - Hỗ trợ `className` để override khi cần
> - Accessible mặc định (focus ring, aria-label, ESC, click outside)

### 7.1. Danh sách component

| Component | File | Mô tả | Khi nào dùng |
|---|---|---|---|
| `Button` | `Button.jsx` | Nút bấm 5 variants × 3 sizes | Mọi action |
| `Input` | `Input.jsx` | Ô nhập text/number/date, có label + error + icon | Form |
| `Select` | `Select.jsx` | Dropdown native, style chuẩn | Enum ngắn (< 10 options) |
| `Textarea` | `Textarea.jsx` | Ô nhập nhiều dòng | Mô tả, ghi chú |
| `RadioGroup` | `RadioGroup.jsx` | Nhóm radio | Giới tính, trạng thái (2-5 options) |
| `Badge` | `Badge.jsx` | Nhãn trạng thái semantic | Trạng thái, phân loại |
| `Card` | `Card.jsx` | Khung nội dung có title + actions | Mọi khối nội dung |
| `Modal` | `Modal.jsx` | Dialog dùng Headless UI (ESC, focus trap, click outside) | Form CRUD, confirm |
| `ConfirmDialog` | `ConfirmDialog.jsx` | Xác nhận xóa/thao tác nguy hiểm | Mọi action xóa |
| `Table` | `Table.jsx` | Bảng dữ liệu + loading/empty built-in | Mọi danh sách |
| `Pagination` | `Pagination.jsx` | Phân trang chuẩn | Mọi danh sách có > 1 trang |
| `EmptyState` | `EmptyState.jsx` | Khi danh sách rỗng | Mọi danh sách |
| `LoadingState` | `LoadingState.jsx` | Spinner + label | Mọi fetch |
| `PageHeader` | `PageHeader.jsx` | Tiêu đề trang | Đầu mỗi page |
| `SearchBar` | `SearchBar.jsx` | Ô tìm kiếm + slot filter | Đầu mỗi danh sách |
| `StatCard` | `StatCard.jsx` | Thẻ thống kê + trend | Dashboard |
| `ExpiryBadge` | `ExpiryBadge.jsx` | Badge hạn dùng (tự tính) | Bảng lô thuốc, chi tiết thuốc |

### 7.2. Props signature nhanh

```jsx
<Button
  variant="primary|secondary|danger|ghost|outline"   // default: primary
  size="sm|md|lg"                                     // default: md
  icon={<Plus />}         // icon bên trái
  iconRight={<Chevron />} // icon bên phải
  loading={false}         // tự động disable + show spinner
  disabled={false}
  onClick={() => {}}
>Label</Button>

<Input
  label="Tên thuốc"
  required
  icon={<Pill />}
  error={errors.name}
  hint="Tối đa 400 ký tự"
  {...register('name')}
/>

<Modal
  open={isOpen}
  onClose={() => setIsOpen(false)}
  title="Thêm thuốc"
  size="md|sm|lg|xl|2xl"
>...</Modal>

<Badge variant="success|warning|danger|info|primary|neutral" dot>...</Badge>

<Table
  columns={[
    { key: 'id',    label: 'Mã',  align: 'left',  render: r => `#${r.MaThuoc}` },
    { key: 'name',  label: 'Tên', align: 'left' },
    { key: 'price', label: 'Giá', align: 'right', render: r => formatCurrency(r.GiaBan) },
  ]}
  data={items}
  loading={loading}
  onRowClick={r => navigate(`/thuoc/${r.MaThuoc}`)}
  emptyTitle="Chưa có thuốc nào"
  emptyIcon={<Package />}
/>
```

---

## 8. Pattern nghiệp vụ dược phẩm

### 8.1. ExpiryBadge (đặc thù ngành dược)

> Tự động tính trạng thái hạn dùng:
> - `> 30 ngày` → **success** "Còn HSD"
> - `1–30 ngày` → **warning** "Còn X ngày"
> - `0 ngày` → **danger** "Hết hạn hôm nay"
> - `< 0 ngày` → **danger** "Hết hạn N ngày"
> - `null` → **neutral** "—"

```jsx
import ExpiryBadge from '@/components/ui/ExpiryBadge';

<ExpiryBadge expiryDate={loThuoc.NgayHetHan} />
```

### 8.2. Quy ước icon cho từng nghiệp vụ

| Module | Icon lucide-react |
|---|---|
| Dashboard | `LayoutDashboard` |
| Thuốc | `Pill` |
| Danh mục thuốc | `FolderTree` |
| Kho / Lô thuốc | `Warehouse` |
| Bán hàng | `ShoppingCart` |
| Hóa đơn | `Receipt` |
| Khách hàng | `Users` |
| Nhà cung cấp | `Truck` |
| Nhân viên | `UserCog` |
| Tài chính | `Wallet` |
| Thống kê | `BarChart3` |
| Cảnh báo hạn dùng | `AlertTriangle` |
| Thuốc kê đơn | `FileText` |
| Hết hàng | `PackageX` |

### 8.3. Quy ước số lượng tồn kho

| Số lượng | Trạng thái | Màu | Hành động |
|---|---|---|---|
| `0` | Hết hàng | `danger` | Disable nút "Bán", highlight UI |
| `1–10` | Sắp hết | `warning` | Cảnh báo nhẹ |
| `> 10` | Bình thường | `success` | — |

---

## 9. Accessibility Checklist

Mỗi component đã được thiết kế để pass các tiêu chí sau:

- [x] **Focus visible** — tất cả interactive có `focus-visible:ring-2`
- [x] **Keyboard navigation** — Tab/Shift+Tab, ESC đóng modal, Arrow cho radio
- [x] **ARIA labels** — icon button có `aria-label`, modal có `role="dialog"`, loading có `aria-live`
- [x] **Color contrast** — `neutral-700` trên white ≈ 6.69:1 (AA); `neutral-800` trên white ≈ 7.81:1 (AAA)
- [x] **Click outside / ESC** — Modal Headless UI tự xử lý
- [x] **Body scroll lock** — Modal tự lo
- [x] **Form labels** — Input luôn có `<label htmlFor>`
- [x] **Error messages** — Có `aria-invalid` + `aria-describedby` trỏ tới text lỗi
- [x] **Disabled state** — `aria-disabled` + `cursor-not-allowed` visual

---

## 10. Anti-patterns

### 10.1. ❌ KHÔNG dùng `window.confirm`

```jsx
// ❌ SAI
if (window.confirm('Xóa?')) { handleDelete(); }

// ✅ ĐÚNG
<ConfirmDialog
  open={confirmId !== null}
  onClose={() => setConfirmId(null)}
  onConfirm={() => handleDelete(confirmId)}
  title="Xóa thuốc"
  message="Bạn có chắc chắn muốn xóa?"
/>
```

### 10.2. ❌ KHÔNG hardcode class Tailwind utility lặp lại

```jsx
// ❌ SAI
<button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
  Thêm
</button>

// ✅ ĐÚNG
<Button variant="primary" icon={<Plus />}>Thêm</Button>
```

### 10.3. ❌ KHÔNG dùng dynamic class với Tailwind JIT

```jsx
// ❌ SAI — Tailwind không generate class từ string động
const color = status === 'ok' ? 'green' : 'red';
<div className={`bg-${color}-100 text-${color}-700`} />

// ✅ ĐÚNG — map trước rồi dùng class cố định
const COLOR_MAP = {
  ok: 'bg-success-50 text-success-700',
  err: 'bg-danger-50 text-danger-700',
};
<div className={COLOR_MAP[status]} />

// ✅ ĐÚNG HƠN — dùng component
<Badge variant={status === 'ok' ? 'success' : 'danger'}>...</Badge>
```

### 10.4. ❌ KHÔNG tự viết `<div onClick={...}>` thay button

```jsx
// ❌ SAI — không keyboard accessible
<div onClick={() => navigate('/thuoc')}>Mở</div>

// ✅ ĐÚNG
<button onClick={() => navigate('/thuoc')}>Mở</button>
// hoặc dùng <Link to="/thuoc">
```

### 10.5. ❌ KHÔNG đặt hàm inline nặng trong JSX

```jsx
// ❌ SAI
{items.map(it => (
  <div>{formatCurrency(it.GiaBan * it.SLTonKho - it.ChietKhau)}</div>
))}

// ✅ ĐÚNG — memoize hoặc tách ra
const tongTien = useMemo(() =>
  items.reduce((s, it) => s + it.GiaBan * it.SLTonKho - it.ChietKhau, 0),
  [items]
);
```

---

## 11. Hướng dẫn refactor page

### 11.1. Checklist khi sửa 1 page CRUD

1. [ ] Import component dùng chung: `PageHeader`, `SearchBar`, `Table`, `Modal`, `ConfirmDialog`, `Button`, `Input`, `Select`, `Pagination`, `EmptyState`, `LoadingState`, `Badge`
2. [ ] Thay `window.confirm` → `<ConfirmDialog>`
3. [ ] Thay modal inline → `<Modal>`
4. [ ] Thay table `<table>` raw → `<Table>`
5. [ ] Thay pagination `<div>` raw → `<Pagination>`
6. [ ] Thay `<div className="py-12 text-center">` (empty) → `<EmptyState>`
7. [ ] Thay `<Loader2 ... animate-spin />` đơn lẻ → `<LoadingState>`
8. [ ] Thay badge `bg-green-100 text-green-700` → `<Badge variant="success">`
9. [ ] Thay input `<input className="w-full px-3 py-2 border...">` → `<Input>`
10. [ ] Thay header `<div className="flex justify-between"><h1>...</h1><button>+</button></div>` → `<PageHeader actions={...}>`
11. [ ] Xoá các import icon không dùng (eslint warning)
12. [ ] Test: ESC đóng modal, Tab navigation, focus ring hiển thị

### 11.2. Ví dụ: trước & sau

**Trước** (`ThuocListPage` — 388 dòng):

```jsx
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-gray-800 flex items-center">
        <Pill className="w-6 h-6 mr-2 text-primary-600" />
        Quản lý thuốc
      </h1>
      <p className="text-sm text-gray-500 mt-1">Tổng cộng {pagination.total} thuốc</p>
    </div>
    <button onClick={openCreate} className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
      <Plus className="w-4 h-4 mr-1" /> Thêm thuốc
    </button>
  </div>
  {/* ... 380 dòng nữa ... */}
</div>
```

**Sau** (refactor):

```jsx
<div className="space-y-6">
  <PageHeader
    icon={<Pill />}
    title="Quản lý thuốc"
    subtitle={`Tổng cộng ${pagination.total} thuốc`}
    actions={
      <RoleGuard roles={['Admin']}>
        <Button variant="primary" icon={<Plus />} onClick={openCreate}>Thêm thuốc</Button>
      </RoleGuard>
    }
  />
  <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Tìm theo tên thuốc...">
    <Select
      value={filters.maDM}
      onChange={(v) => setFilters(f => ({ ...f, maDM: v }))}
      options={danhMucList.map(dm => ({ value: dm.MaDM, label: `${dm.MaDM} - ${dm.TenDM}` }))}
      placeholder="-- Tất cả danh mục --"
    />
  </SearchBar>
  <Table
    columns={[
      { key: 'id',    label: 'Mã',      render: r => <span className="font-mono text-neutral-500">#{r.MaThuoc}</span> },
      { key: 'name',  label: 'Tên',     render: r => <span className="font-medium text-neutral-900">{r.TenThuoc}</span> },
      { key: 'price', label: 'Giá',     align: 'right', render: r => formatCurrency(r.GiaBanThamKhao) },
      { key: 'stock', label: 'Tồn',     align: 'center', render: r => <StockBadge stock={r.SoLuongTonKho} /> },
      { key: 'act',   label: '',        align: 'right', render: r => <RowActions row={r} /> },
    ]}
    data={items}
    loading={loading}
    emptyTitle="Chưa có thuốc"
    emptyIcon={<Pill />}
  />
  <Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} onChange={fetchData} loading={loading} />
  <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Sửa thuốc' : 'Thêm thuốc'} size="lg">
    {/* form */}
  </Modal>
  <ConfirmDialog open={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={confirmDelete} loading={deleting} />
</div>
```

**Kết quả:** ~150 dòng thay vì 388, dễ đọc, dễ maintain, accessibility chuẩn.

---

## 📞 Liên hệ / Đóng góp

- File issue/đề xuất thêm component: comment trong file `tailwind.config.js` hoặc tạo PR
- Mọi component mới phải:
  1. Có JSDoc đầy đủ
  1. Có ít nhất 1 variant/size
  1. Pass keyboard navigation
  1. Được test trên light + dark mode (sau khi có dark mode)

> 🎓 *"Đồ án tốt không phải đồ án nhiều tính năng — mà là đồ án mà mỗi tính năng đều chỉn chu."*
