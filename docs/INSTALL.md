# 🚀 HƯỚNG DẪN CÀI ĐẶT SECUREPHARMA

> Hướng dẫn cài đặt **từ đầu** để chạy SecurePharma trên máy local.
> Cập nhật lần cuối: **17/09/2026** — đồng bộ với stack thực tế (Express + mssql + Swagger + scripts `db:*`).

> ⚠️ **PORT MẶC ĐỊNH CỦA BACKEND LÀ `8080`** (xem `backend/.env.example` → `PORT=8080`).
> Swagger UI: **`http://localhost:8080/api/docs`** — nếu mở `localhost:5000` sẽ trắng trang vì BE không chạy ở 5000.
> Đổi port khác: sửa `PORT=` trong `backend/.env` rồi restart server.

---

## 📑 Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Bước 1 — Chuẩn bị Database](#2-bước-1--chuẩn-bị-database)
3. [Bước 2 — Cấu hình Backend `.env`](#3-bước-2--cấu-hình-backend-env)
4. [Bước 3 — Cài đặt Backend](#4-bước-3--cài-đặt-backend)
5. [Bước 4 — Cài đặt Frontend](#5-bước-4--cài-đặt-frontend)
6. [Bước 5 — Chạy Backend](#6-bước-5--chạy-backend)
7. [Bước 6 — Chạy Frontend](#7-bước-6--chạy-frontend)
8. [Bước 7 — Verify end-to-end](#8-bước-7--verify-end-to-end)
9. [Tài khoản demo](#9-tài-khoản-demo)
10. [Troubleshooting](#10-troubleshooting)
11. [Production checklist](#11-production-checklist)

---

## 1. Yêu cầu hệ thống

| Phần mềm | Version tối thiểu | Ghi chú |
|---|---|---|
| **Node.js** | 18+ (khuyến nghị 20 LTS) | [nodejs.org](https://nodejs.org/) |
| **npm** | 9+ | Đi kèm Node.js |
| **SQL Server** | 2019+ (Express OK) | [Download](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) |
| **SQL Server Management Studio (SSMS)** | Mới nhất | Để chạy script SQL |
| **Git** | Mới nhất | Clone repo |

> ⚠️ Project dùng **CommonJS** (`require`) cho backend và **ES Module** cho frontend. Không cần cấu hình thêm.

---

## 2. Bước 1 — Chuẩn bị Database

### 2.1. Mở SSMS và kết nối SQL Server

- Mặc định: `localhost` hoặc `.\SQLEXPRESS` với Windows Authentication.
- Nếu dùng `sa`: chuẩn bị sẵn mật khẩu để điền vào `.env` ở Bước 2.

### 2.2. Chạy script tạo bảng

Mở file **`backend/database/01_create_tables.sql`** trong SSMS → nhấn **F5** (Execute).

Script sẽ tạo database `SecurePharmaDB` và **13 bảng** (idempotent — chạy lại không lỗi):

```
DanhMuc, NhaCungCap, KhachHang, NhanVien, TaiKhoan, Thuoc,
PhieuNhap, LoThuoc_ChiTietNhap, HoaDon, ChiTietHoaDon,
PhieuThu, PhieuChi, AuditLog
```

### 2.3. Khởi tạo dữ liệu mẫu (seed)

Khuyến nghị dùng script Node có sẵn (an toàn hơn chạy SQL thủ công, có thể chạy lại nhiều lần):

```bash
cd backend
npm install                  # cài dependencies trước
node src/scripts/check_db.js # test kết nối DB trước
npm run db:setup             # chạy 01 + 02 + 03 + 04 (tables → seed → accounts → extra)
```

Các lệnh `db:*` có sẵn (xem `backend/package.json`):

| Lệnh | Mục đích |
|---|---|
| `npm run db:status` | Xem trạng thái DB hiện tại |
| `npm run db:tables` | Chỉ chạy script tạo bảng |
| `npm run db:seed` | Chỉ seed dữ liệu mẫu (danh mục, thuốc, khách hàng…) |
| `npm run db:accounts` | Tạo 3 tài khoản demo + 3 nhân viên |
| `npm run db:setup` | Chạy đầy đủ tables + seed + accounts + extra |
| `npm run db:reset` | ⚠️ **Xóa toàn bộ DB và tạo lại từ đầu** |
| `npm run db:generate` | Đọc schema DB đang chạy, xuất file `database/02_generated_tables.sql` (backup schema hoặc share cấu trúc; file cũ nằm trong `database/archive/`) |

> ⚠️ `db:reset` là **destructive** — chỉ dùng trên môi trường dev, sẽ xóa hết dữ liệu.
> 💡 `db:generate` chỉ xuất **schema (tables/FK/index/CHECK)** — KHÔNG xuất dữ liệu. Bạn tự lo phần INSERT bằng `db:seed` hoặc viết script riêng.

#### 🤖 Auto-discover patches

Bước **extra patches** (99_schema_patches, 18_system_config, 03_inventory, …) được `migrate.js` **tự động quét** từ folder `database/`. Quy tắc đặt tên để tự động được pick:

- File phải có dạng `NN_description.sql` (NN là số thứ tự 2 chữ số, vd: `03_inventory.sql`, `99_schema_patches.sql`)
- KHÔNG bắt đầu bằng `01_` hoặc `02_` (đó là 2 file đặc biệt đã được xử lý riêng)
- KHÔNG đặt trong `database/archive/` (đã được ignore)
- Thứ tự chạy = sort alphabetically = theo số NN

**Lợi ích:** Thêm patch mới chỉ cần tạo file `NN_xxx.sql` đúng quy tắc → chạy `npm run db:setup` hoặc `npm run db:patches` là tự pick. KHÔNG cần sửa `migrate.js`.

### 2.4. Verify database

Trong SSMS:

```sql
USE SecurePharmaDB;
SELECT COUNT(*) AS SoBang FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE';
-- Kết quả: 13

SELECT COUNT(*) AS SoThuoc FROM Thuoc;
-- Kết quả: ~20 (seed data)

SELECT TenDangNhap, VaiTro FROM TaiKhoan;
-- Kết quả: 3 tài khoản (admin.huong, banhang.minh, kho.cuong)
```

---

## 3. Bước 2 — Cấu hình Backend `.env`

### 3.1. Tạo file `.env`

Project **chưa commit** file `.env` (đúng chuẩn bảo mật). Tạo file mới tại `backend/.env` bằng cách copy mẫu dưới đây:

```env
# ============================================================
# SERVER
# ============================================================
PORT=8080
NODE_ENV=development

# ============================================================
# DATABASE — SỬA CHO ĐÚNG MÁY CỦA BẠN
# ============================================================
DB_SERVER=localhost              # Hoặc .\SQLEXPRESS nếu dùng bản Express
DB_NAME=SecurePharmaDB
DB_USER=sa                        # SQL auth — đổi theo máy bạn
DB_PASSWORD=YourStrongPassword    # ⚠️ SỬA MẬT KHẨU
DB_ENCRYPT=true
DB_PORT=1433

# ============================================================
# AUTH MODE — chọn 1 trong 2
# ============================================================
# true  = Windows Authentication (Integrated Security)
# false = SQL Server Authentication (cần DB_USER + DB_PASSWORD)
DB_TRUSTED_CONNECTION=false

# Chỉ dùng khi DB_TRUSTED_CONNECTION=false
DB_USER=sa
DB_PASSWORD=YOUR_SQL_PASSWORD

# ============================================================
# JWT — ⚠️ DEV ONLY. PHẢI ĐỔI KHI LÊN PRODUCTION
# Format: SecurePharma-{env}-v{ver}-{nonce>=16 hex chars}
# Tạo nonce mới: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
# ============================================================
JWT_SECRET=YOUR_ACCESS_TOKEN_SECRET
JWT_REFRESH_SECRET=YOUR_REFRESH_TOKEN_SECRET_DIFFERENT_FROM_ACCESS
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ============================================================
# AES-256-CBC — Mã hóa SĐT, mã số thuế
# ⚠️ DEV ONLY — KHÔNG dùng key này ở production
# Key phải ĐỦ 32 bytes, IV phải ĐỦ 16 bytes (chuỗi bất kỳ, pad/truncate tự động)
# Nếu đổi key sau khi đã có data -> phải re-seed DB (npm run db:seed)
# ============================================================
AES_KEY=YOUR_AES_KEY_32_BYTES_HERE_PLACEHOLDER
AES_IV=YOUR_AES_IV_16BYT
```

### 3.2. Lưu ý quan trọng

- **2 chế độ auth SQL Server** (chọn bằng `DB_TRUSTED_CONNECTION`):
  - `true` → **Windows Authentication**, không cần `DB_USER` / `DB_PASSWORD` (khuyến nghị khi dev local).
  - `false` → **SQL Server Authentication**, bắt buộc có `DB_USER` + `DB_PASSWORD`.
- **SQL Server Express:** đổi `DB_SERVER` thành `.\SQLEXPRESS`.
- **Port khác 1433:** đổi `DB_PORT`.
- **`JWT_SECRET` & `JWT_REFRESH_SECRET`:** **KHÔNG BAO GIỜ** commit lên git. 2 secret phải **khác nhau** (đã enforce trong code). Chạy lệnh trong comment ở trên để tạo nonce.
- **`AES_KEY` / `AES_IV`:** cũng chỉ dùng dev. Key phải **đủ 32 byte** (chuỗi text bất kỳ, hệ thống tự pad), IV **đủ 16 byte**. Nếu đổi sau khi đã seed → phải chạy lại `npm run db:seed` để mã hóa lại bằng key mới.

---

## 4. Bước 3 — Cài đặt Backend

Mở terminal (PowerShell/CMD) **tại thư mục gốc dự án**:

```bash
cd backend
npm install
```

Backend dùng các thư viện chính (xem `backend/package.json`):

| Thư viện | Vai trò |
|---|---|
| `express` | Web framework |
| `mssql` | SQL Server driver (parameterized query — chống SQLi) |
| `jsonwebtoken` | JWT (auth) |
| `bcrypt` | Hash mật khẩu |
| `helmet` | Hardening HTTP headers |
| `cors` | CORS middleware |
| `xss` | Sanitize input (chống XSS) |
| `express-rate-limit` | Chống brute-force / DDoS |
| `express-validator` | Validate request payload |
| `swagger-jsdoc` + `swagger-ui-express` | Auto-generate OpenAPI docs tại `/api/docs` |
| `winston` | Logger |
| `dotenv` | Load biến môi trường |

> 🛠️ Nếu gặp lỗi `gyp ERR! find Python` khi cài `bcrypt`: cài [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools) hoặc dùng Node 20 LTS (đã có prebuilt binary).

---

## 5. Bước 4 — Cài đặt Frontend

Mở terminal **MỚI** (giữ terminal backend đang chạy nếu đã start):

```bash
cd frontend
npm install
```

Frontend dùng các thư viện chính (xem `frontend/package.json`):

| Thư viện | Vai trò |
|---|---|
| `react` 18 + `react-dom` | UI framework |
| `vite` | Build tool / dev server |
| `react-router-dom` | Routing |
| `axios` | HTTP client |
| `react-hook-form` | Form state |
| `@headlessui/react` | Accessible UI primitives (Modal, Menu) |
| `tailwindcss` | CSS framework |
| `lucide-react` | Icons |
| `recharts` | Biểu đồ thống kê |
| `react-hot-toast` | Toast notification |
| `dayjs` | Format ngày giờ |
| `clsx` | Conditional className |

---

## 6. Bước 5 — Chạy Backend

Trong terminal của backend:

```bash
npm run dev          # nodemon — auto-reload khi sửa code
# hoặc
npm start            # chạy 1 lần, không reload
```

**Output mong đợi:**

```
╔══════════════════════════════════════════════════════════════╗
║           SecurePharma Backend Server                        ║
╠══════════════════════════════════════════════════════════════╣
║  🌐 Server running on: http://localhost:8080                 ║
║  📊 Health check:      http://localhost:8080/api/health      ║
║  📘 API docs (Swagger): http://localhost:8080/api/docs       ║
║  🔧 Environment:       development                           ║
╚══════════════════════════════════════════════════════════════╝
```

> 📘 Swagger UI tại **`http://localhost:8080/api/docs`** — dùng để test API trực tiếp trong trình duyệt.

---

## 7. Bước 6 — Chạy Frontend

Trong terminal của frontend:

```bash
npm run dev
```

**Output mong đợi:**

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 8. Bước 7 — Verify end-to-end

### 8.1. Mở trình duyệt

Truy cập: **http://localhost:5173**

### 8.2. Test API trực tiếp bằng curl

```bash
# Health check
curl http://localhost:8080/api/health

# Login lấy token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"tenDangNhap\":\"admin.huong\",\"matKhau\":\"Admin@2026\"}"

# Gọi API có auth (thay <TOKEN> bằng accessToken vừa nhận)
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

### 8.3. Test bằng Swagger UI

Mở **http://localhost:8080/api/docs** → chọn endpoint `POST /api/auth/login` → nhấn **Try it out** → nhập payload → **Execute**.

Sau khi đăng nhập thành công, bấm nút **Authorize** 🔒 ở góc trên Swagger, dán `accessToken` để test các endpoint cần auth.

### 8.4. Test trên giao diện

Đăng nhập với 1 trong 3 tài khoản demo ở mục 9 dưới đây. Nếu thấy trang dashboard → **cài đặt thành công**.

---

## 9. Tài khoản demo

> 🎓 Username đặt theo pattern `role.tên`, password có ký tự đặc biệt + số + chữ hoa — dễ nhớ, trông chuyên nghiệp khi demo cho giảng viên.

| Username | Password | Vai trò | Quyền |
|---|---|---|---|
| `admin.huong` | `Admin@2026` | Admin (Quản lý) | Toàn quyền — quản lý nhân viên, thống kê, cấu hình |
| `banhang.minh` | `BanHang@2026` | NV_BanHang (Bán hàng) | Bán thuốc, xem hóa đơn, tìm khách hàng |
| `kho.cuong` | `Kho@2026` | NV_Kho (Thủ kho) | Nhập kho, điều chỉnh tồn kho, xem phiếu nhập |

> Thêm nhân viên khác (`banhang.anh`, `kho.thao`...) nếu cần test nhiều role cùng lúc — xem chi tiết cách tạo trong [`SECURITY.md`](./SECURITY.md) (RBAC section).

---

## 10. Troubleshooting

### ❌ `Cannot find module 'mssql'`
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### ❌ Mở `localhost:5000/api/docs` thấy trang trắng / "site can't be reached"
- **Backend không chạy ở port 5000** — port mặc định là **`8080`**. Truy cập đúng URL: **`http://localhost:8080/api/docs`**.
- Kiểm tra port thực tế:
  - Đọc log khi `npm run dev` → dòng `🌐 Server running on: http://localhost:XXXX`.
  - Hoặc mở `backend/.env` xem `PORT=` là bao nhiêu.
- Mở `http://localhost:8080/api` (root) — response JSON có chứa `endpoints.docs` cho biết URL đúng.### ❌ `ECONNREFUSED 127.0.0.1:1433`
- SQL Server chưa bật → mở **SQL Server Configuration Manager** → bật service.
- Sai instance name: thử `DB_SERVER=.\SQLEXPRESS`.
- Sai port: kiểm tra port bằng `netstat -an | findstr 1433` (PowerShell).

### ❌ `Login failed for user 'sa'`
- Sai password trong `.env`.
- User `sa` bị disable: SSMS → Security → Logins → `sa` → Properties → Status → enable.
- SQL Server chỉ cho Windows Auth: SSMS → server Properties → Security → chọn **SQL Server and Windows Authentication mode** → restart service.

### ❌ `CORS policy blocked`
- Backend chưa chạy → khởi động lại (xem Bước 5).
- FE đang chạy port khác 5173 → kiểm tra URL, hoặc cấu hình `origin` trong `backend/src/app.js`.

### ❌ Tailwind không apply / class mất tác dụng
```bash
cd frontend
rm -rf node_modules/.vite
npm run dev
```

### ❌ `JWT malformed` / token bị từ chối
- Đăng nhập lại để lấy token mới.
- `JWT_SECRET` trong `.env` vừa bị đổi → mọi token cũ vô hiệu → login lại.

### ❌ SĐT hiển thị `undefined` hoặc chuỗi lạ
- `AES_KEY` / `AES_IV` đã bị đổi sau khi seed → phải chạy lại `npm run db:seed` để mã hóa lại bằng key hiện tại.

### ❌ Frontend gọi API mà nhận 404
- Kiểm tra prefix `/api` trong URL — backend mount tất cả route dưới `/api/*`.
- Xem [`API.md`](./API.md) để biết endpoint đầy đủ.

---

## 11. Production checklist

Trước khi deploy, **đảm bảo** đã làm các việc sau (KHÔNG được quên):

- [ ] **Đổi `JWT_SECRET` và `JWT_REFRESH_SECRET`** — dùng `crypto.randomBytes(64).toString('hex')`, KHÔNG dùng giá trị mặc định.
- [ ] **Đổi `AES_KEY` / `AES_IV`** — re-seed DB sau khi đổi key.
- [ ] **Đặt `NODE_ENV=production`** — tắt error stack trace trả về client.
- [ ] **Tắt `DB_ENCRYPT=false`** (hoặc cấu hình TLS cho SQL Server).
- [ ] **Dùng HTTPS** cho cả frontend và backend.
- [ ] **CORS whitelist** domain production, không dùng `*`.
- [ ] **Rate limit chặt hơn** cho endpoint `/api/auth/login` (vd: 5 attempts / 15 phút / IP).
- [ ] **Backup DB** định kỳ, đặc biệt bảng `AuditLog`.
- [ ] **Không commit `.env`** — đã được `.gitignore` sẵn, nhưng kiểm tra lại trước khi push.

---

## 📞 Hỗ trợ thêm

- 🐛 **Lỗi cụ thể?** Xem console backend (terminal) + DevTools (F12) trên browser.
- 📘 **API reference:** [`docs/API.md`](./API.md) — danh sách ~70 endpoints, 13 module.
- 🔒 **Cơ chế bảo mật:** [`docs/SECURITY.md`](./SECURITY.md) — RBAC, JWT, bcrypt, AES, XSS.
- 📋 **Kế hoạch triển khai:** [`docs/IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).