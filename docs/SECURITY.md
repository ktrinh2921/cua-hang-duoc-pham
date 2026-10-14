# 🔒 SECURITY.md — Giải thích hệ thống bảo mật SecurePharma

> Tài liệu này **không chứa code**, chỉ giải thích **các cơ chế bảo mật** đang chạy trong dự án, **nó được đặt ở đâu**, **hoạt động như thế nào**, và **vì sao cần nó**.
> Mục tiêu: người mới đọc vào hiểu ngay "bảo mật của hệ thống nằm ở những lớp nào, mỗi lớp chặn cái gì".

---

## 📑 Mục lục

1. [Tổng quan các lớp bảo mật](#1-tổng-quan-các-lớp-bảo-mật)
2. [RBAC — Phân quyền theo vai trò](#2-rbac--phân-quyền-theo-vai-trò)
3. [JWT — Phiên đăng nhập không trạng thái](#3-jwt--phiên-đăng-nhập-không-trạng-thái)
4. [Bcrypt — Mã hóa mật khẩu](#4-bcrypt--mã-hóa-mật-khẩu)
5. [AES — Mã hóa dữ liệu nhạy cảm (SĐT khách hàng)](#5-aes--mã-hóa-dữ-liệu-nhạy-cảm-sđt-khách-hàng)
6. [XSS — Chống chèn mã độc vào input](#6-xss--chống-chèn-mã-độc-vào-input)
7. [SQL Injection — Chống chèn SQL](#7-sql-injection--chống-chèn-sql)
8. [Helmet — Tăng cứng HTTP header](#8-helmet--tăng-cứng-http-header)
9. [CORS — Giới hạn domain frontend được gọi API](#9-cors--giới-hạn-domain-frontend-được-gọi-api)
10. [Rate Limit — Chống brute-force & DDoS](#10-rate-limit--chống-brute-force--ddos)
11. [Audit Log — Truy vết thao tác](#11-audit-log--truy-vết-thao-tác)
12. [Bản đồ tổng: request đi qua những lớp bảo mật nào](#12-bản-đồ-tổng-request-đi-qua-những-lớp-bảo-mật-nào)
13. [Tóm tắt & checklist](#13-tóm-tắt--checklist)

---

## 1. Tổng quan các lớp bảo mật

Hệ thống phòng thủ theo mô hình **nhiều lớp (defense-in-depth)** — không chỉ dựa vào một cơ chế, mà mỗi request từ client phải **đi qua hàng loạt cổng kiểm soát** trước khi chạm vào database.

| Lớp | Mục đích | File trung tâm |
|---|---|---|
| **Helmet** | Khóa HTTP header mặc định | gắn trong `app.js` |
| **CORS** | Chỉ cho phép domain FE được phép gọi API | gắn trong `app.js` |
| **Rate Limit** | Giới hạn số request/IP/15 phút | `middleware/rateLimit.js` |
| **XSS Sanitize** | Escape ký tự HTML nguy hiểm trong body | `middleware/xss.js` |
| **JWT Auth** | Xác thực "bạn là ai" qua token | `middleware/auth.js` |
| **RBAC** | Xác thực "bạn được làm gì" theo vai trò | `middleware/rbac.js` |
| **Bcrypt** | Hash mật khẩu (không bao giờ lưu plaintext) | `modules/auth/auth.service.js` |
| **AES-256-CBC** | Mã hóa dữ liệu nhạy cảm (SĐT khách hàng) | `modules/khachHang/khachHang.service.js` |
| **Parameterized query** | Chống SQL Injection | `config/db.js` + mọi service |
| **Audit Log** | Ghi lại thao tác nhạy cảm vào DB | `middleware/audit.js` |

> 🎯 **Ý nghĩa:** Mỗi lớp giải quyết một họ lỗ hổng khác nhau. Nếu một lớp bị lọt (do cấu hình sai, do thư viện lỗi thời…), các lớp còn lại vẫn chặn được.

---

## 2. RBAC — Phân quyền theo vai trò

### 📂 Nó nằm ở đâu?

- **Code trung tâm:** `backend/src/middleware/rbac.js`
- **Được mount vào route:** trong từng file `*.routes.js` của mỗi module (`thuoc.routes.js`, `banHang.routes.js`, `nhanVien.routes.js`…)
- **Dữ liệu role:** cột `VaiTro` trong bảng `TaiKhoan` (giá trị: `Admin`, `NV_BanHang`, `NV_Kho`)
- **Bảng vai trò hiển thị bằng tiếng Việt:** `Quản lý` / `Nhân viên bán hàng` / `Thủ kho`

### 🧠 Nó hoạt động như thế nào?

RBAC (Role-Based Access Control) là mô hình **gắn quyền theo vai trò**, không gắn trực tiếp vào từng user.

Quy trình:

1. **Đăng nhập thành công** → server đọc `VaiTro` của user từ DB, **nhúng vào JWT payload** (claim `role`).
2. **Mỗi lần gọi API**, request kèm token → middleware `authenticate` giải mã token → gắn `req.user.role` lên request.
3. **Middleware RBAC** (`requireRole('Admin', 'NV_BanHang')`) chạy **ngay sau authenticate** trên từng endpoint cụ thể — nó so sánh `req.user.role` với danh sách role được phép.
4. Nếu **không khớp** → trả về HTTP 403 với thông báo "Bạn không có quyền thực hiện chức năng này". Nếu khớp → đi tiếp vào controller.

### 🔍 Ví dụ gắn vào route (chỉ minh hoạ, không phải code thật)

| Endpoint | Role được phép |
|---|---|
| `POST /api/ban-hang` (tạo hóa đơn) | `Admin` hoặc `NV_BanHang` |
| `PATCH /api/kho/lo/:maLo/ton-kho` (điều chỉnh tồn kho) | `Admin` hoặc `NV_Kho` |
| `GET /api/kho/ton-kho` (xem tồn kho) | Cả 3 role |
| Mọi endpoint `/api/nhan-vien/*` | Chỉ `Admin` |

### 💡 Vì sao cần?

- **Tránh nhân viên bán hàng sửa giá, sửa tồn kho, xoá nhân viên khác.**
- **Tránh thủ kho bán thuốc / tạo hóa đơn** — tách biệt nghiệp vụ.
- **Admin có toàn quyền**, nhưng mọi thao tác đều được ghi log ở lớp Audit.

### 🧩 Biến thể nâng cao trong dự án

- `requireOwnerOrAdmin`: NV thường chỉ được sửa/xoá **dữ liệu của chính mình** (ví dụ hóa đơn NV đó lập); Admin thì sửa được hết. Hàm nhận vào một callback `getOwnerId(req)` để biết record này thuộc ai.

---

## 3. JWT — Phiên đăng nhập không trạng thái

### 📂 Nó nằm ở đâu?

- **Tạo + xác thực token:** `backend/src/modules/auth/auth.service.js` (hàm `generateAccessToken`, `generateRefreshToken`, `refreshToken`)
- **Middleware bắt buộc đăng nhập:** `backend/src/middleware/auth.js` (hàm `authenticate`)
- **Cấu hình secret:** biến môi trường `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` trong `backend/.env`

### 🧠 Nó hoạt động như thế nào?

**JWT (JSON Web Token)** là một chuỗi ký tự chứa thông tin user, được server **ký bằng một secret** và gửi cho client. Mỗi request sau đó kèm token này trong header `Authorization: Bearer <token>`. Server **không cần lưu session** — chỉ cần kiểm tra chữ ký là biết token có hợp lệ không.

Trong dự án dùng **2 loại token** (2 secret riêng, không dùng chung):

| Token | Mục đích | Thời hạn mặc định | Secret |
|---|---|---|---|
| **Access token** | Gửi kèm mỗi API call | 15 phút | `JWT_SECRET` |
| **Refresh token** | Chỉ dùng để xin access token mới | 7 ngày | `JWT_REFRESH_SECRET` |

Token **có claim `type='access'` hoặc `type='refresh'`** để tránh dùng nhầm — refresh token không thể dùng làm access token và ngược lại.

### 🔄 Cơ chế Rotation (xoay vòng) + Revoke (thu hồi)

Mỗi lần refresh:

1. Client gửi refresh token → server giải mã bằng `JWT_REFRESH_SECRET`.
2. Server mở **transaction với isolation level cao nhất**, khoá dòng user trong DB (`UPDLOCK, HOLDLOCK`).
3. So sánh **claim `version`** trong token với cột `TokenVersion` trong DB.
4. **Nếu khớp** → cấp cặp access + refresh mới, đồng thời **tăng `TokenVersion` lên 1** trong DB → token cũ hết hiệu lực ngay lập tức.
5. **Nếu lệch** → từ chối (token đã bị thu hồi hoặc đã dùng rồi).

### 💡 Vì sao cần rotation?

- Nếu refresh token bị lộ, kẻ tấn công dùng nó → token cũ bị đốt → khi nạn nhân dùng refresh token hợp lệ thì sẽ thấy **bất thường** ngay từ lần refresh tiếp theo.
- Khi user **đổi mật khẩu**, server tăng `TokenVersion` → mọi refresh token cũ tự động vô hiệu → buộc đăng nhập lại trên mọi thiết bị.

### 🔒 Cấu hình secret

Theo rule `naming-conventions.mdc`, secret phải có format `SecurePharma-{env}-{version}-{nonce}` ≥ 32 ký tự, **không bao giờ commit vào repo**, file `.env` đã `.gitignore`. Comment cảnh báo `change-me-in-production` bắt buộc có trong `.env.example`.

---

## 4. Bcrypt — Mã hóa mật khẩu

### 📂 Nó nằm ở đâu?

- **Code hash & verify:** `backend/src/modules/auth/auth.service.js`
  - `bcrypt.hash(password, SALT_ROUNDS)` khi đăng ký / đổi mật khẩu
  - `bcrypt.compare(password, user.MatKhauHash)` khi đăng nhập
- **Cột lưu trong DB:** `TaiKhoan.MatKhauHash` (kiểu `NVARCHAR(MAX)` hoặc `VARBINARY` tuỳ phiên bản)
- **`SALT_ROUNDS = 10`**: định nghĩa ngay đầu file `auth.service.js`

### 🧠 Nó hoạt động như thế nào?

**Bcrypt** là thuật toán hash **một chiều** (không thể giải mã ngược):

1. Khi user đăng ký hoặc đổi mật khẩu → server sinh **salt ngẫu nhiên**, trộn với mật khẩu → hash 60 ký tự bắt đầu bằng `$2b$10$…` lưu vào DB.
2. Khi đăng nhập → server hash lại mật khẩu user nhập với **cùng salt đã lưu** → so sánh 2 chuỗi hash.
3. **Mật khẩu plaintext không bao giờ được lưu**, không bao giờ xuất hiện trong log, không bao giờ trả về API.

### 💡 Vì sao cần?

- Nếu DB bị lộ → kẻ tấn công **không thể biết mật khẩu thật** từ cột `MatKhauHash`.
- **Salt ngẫu nhiên** đảm bảo 2 user cùng mật khẩu → 2 hash khác nhau → chống tấn công rainbow table.
- **SALT_ROUNDS = 10** = ~100ms/hash → đủ chậm để chống brute-force ngay cả khi attacker có hash.

### ⚠️ Lưu ý quan trọng

Middleware XSS trong dự án **đặc biệt KHÔNG escape** các field `password`, `matKhau`, `matKhauCu`, `matKhauMoi`, `currentPassword`, `newPassword`, `confirmPassword`. Vì nếu escape, các ký tự đặc biệt như `&`, `<`, `>` sẽ bị đổi thành `&amp;` → `bcrypt.compare` sẽ **luôn fail**. Đây là ngoại lệ có chủ đích trong `middleware/xss.js` (danh sách `SKIP_FIELDS`).

---

## 5. AES — Mã hóa dữ liệu nhạy cảm (SĐT khách hàng)

### 📂 Nó nằm ở đâu?

- **Code mã hoá/giải mã:** `backend/src/modules/khachHang/khachHang.service.js` (hàm `encryptAES`, `decryptAES`)
- **Cột DB:** `KhachHang.SDT` lưu dạng **chuỗi hex** (đã mã hoá), không lưu plaintext
- **Patch schema:** `backend/database/99_schema_patches.sql` (ALTER cột SDT sang `VARCHAR(64)`)
- **Script backfill:** `backend/src/scripts/patch_sdt_aes.js` (mã hoá dữ liệu cũ một lần)
- **Cấu hình key/IV:** `AES_KEY` và `AES_IV` trong `backend/.env`

### 🧠 Nó hoạt động như thế nào?

**AES-256-CBC** là thuật toán mã hoá **đối xứng hai chiều** (mã hoá được, giải mã được lại) — phù hợp với dữ liệu **cần truy vấn lại** (như SĐT khách hàng khi nhân viên cần gọi).

1. **Mã hoá (khi tạo/sửa KH):** plaintext SĐT → `crypto.createCipheriv('aes-256-cbc', KEY, IV)` → chuỗi hex lưu DB.
2. **Giải mã (khi trả về FE):** hex trong DB → `crypto.createDecipheriv('aes-256-cbc', KEY, IV)` → SĐT gốc trả về client.
3. **Key 32 bytes** + **IV 16 bytes** được load từ `.env` lúc server khởi động. Mất key/IV = mất dữ liệu (không giải mã được).

### ⚖️ So sánh AES vs Bcrypt

| | Bcrypt | AES |
|---|---|---|
| Chiều | 1 chiều (hash) | 2 chiều (mã hoá/giải mã) |
| Dùng cho | Mật khẩu (không cần đọc lại) | Dữ liệu cần truy vấn lại (SĐT, email, SĐT khách hàng) |
| Thuật toán | Blowfish-based hash | AES-256-CBC |
| Salt/IV | Salt ngẫu nhiên tự sinh | IV cố định trong `.env` (có thể rotate) |

### 💡 Vì sao không dùng Bcrypt cho SĐT?

Bcrypt là **hash một chiều** — không giải mã lại được. Trong khi nhân viên bán hàng **cần đọc SĐT khách** để gọi chăm sóc → phải dùng thuật toán 2 chiều (AES).

### ⚠️ Lưu ý

- Hiện `AES_KEY` và `AES_IV` trong `.env` mặc định dev-only. Rule `naming-conventions.mdc` yêu cầu khi deploy production phải đổi + comment cảnh báo.
- Dữ liệu cũ từ trước khi patch (SĐT plaintext) được xử lý 1 lần qua script `patch_sdt_aes.js` — KHÔNG chạy lại nhiều lần vì sẽ mã hoá lần 2 lên chuỗi hex.

---

## 6. XSS — Chống chèn mã độc vào input

### 📂 Nó nằm ở đâu?

- **Middleware:** `backend/src/middleware/xss.js`
- **Mount vào app:** `app.use(xssSanitize)` ngay sau body-parser trong `backend/src/app.js`
- **Tác dụng:** áp dụng cho **mọi request** đi qua `app.use(...)` — tức là toàn bộ `/api/*`

### 🧠 Nó hoạt động như thế nào?

**XSS (Cross-Site Scripting)** là lỗ hổng khi kẻ tấn công nhúng mã JavaScript / HTML vào input form, sau đó khi frontend hiển thị lại, trình duyệt nạn nhân chạy mã độc đó.

Trong dự án có **2 lớp chống XSS**:

**Lớp 1 — Backend (defense-in-depth):** middleware `xssSanitize`

- Đệ quy sâu vào `req.body` (object lồng object), `req.query`, `req.params`.
- Với mỗi giá trị **kiểu chuỗi**, chạy qua thư viện `xss` để **escape các ký tự HTML nguy hiểm**:
  - `<` → `&lt;`
  - `>` → `&gt;`
  - `&` → `&amp;`
  - `"` → `&quot;`
  - `'` → `&#x27;`
  - `/` → `&#x2F;`
- Bỏ qua: kiểu số, boolean, null, Buffer, Date.
- **Bỏ qua các field nhạy cảm** (danh sách `SKIP_FIELDS`) để không phá hash: `password`, `matKhau`, `token`, `secret`, `apiKey`…

**Lớp 2 — Frontend (chính):** React mặc định

- Khi render `{tenThuoc}`, React tự động escape chuỗi trước khi đưa vào DOM.
- Nguy hiểm chỉ xảy ra khi dev chủ động dùng `dangerouslySetInnerHTML` — dự án **không dùng** ở các vị trí hiển thị dữ liệu user.

### 💡 Vì sao cần cả 2 lớp?

- React chống XSS **khi hiển thị**.
- Backend sanitize chống XSS **ngay từ đầu vào** — tránh dữ liệu bẩn lưu xuống DB (ví dụ khi log, khi trả về qua API khác, khi xuất Excel/PDF).

### ⚠️ Lưu ý

Middleware **CHỈ escape chuỗi**. Các field SQL kiểu số (ID, số lượng, tiền) được validate kiểu dữ liệu riêng trong controller/service — nếu nhập `"abc"` vào `soLuong` thì sẽ bị middleware validate chặn lại, không tới DB.

---

## 7. SQL Injection — Chống chèn SQL

### 📂 Nó nằm ở đâu?

- **Kết nối DB:** `backend/src/config/db.js`
- **Áp dụng ở:** **tất cả các service** trong `backend/src/modules/*/` — đây là quy tắc bắt buộc, không có file riêng.

### 🧠 Nó hoạt động như thế nào?

**SQL Injection** là lỗ hổng khi kẻ tấn công nhúng câu SQL vào input form, ví dụ nhập username = `' OR 1=1 --` để bypass đăng nhập.

Cách chống trong dự án: **Parameterized Query** (gọi chính xác qua `mssql` package):

- Thay vì ghép chuỗi SQL + input user, **tách phần SQL và phần data**:
  - SQL chứa placeholder `@username`, `@password`.
  - Data được truyền qua object `{ username: "...", password: "..." }`.
- Database driver tự escape / kiểm tra kiểu dữ liệu trước khi đưa vào SQL execution — input user **không bao giờ** trở thành một phần của câu lệnh SQL.

### 💡 Vì sao an toàn?

- Dù attacker có nhập `'; DROP TABLE Thuoc; --` thì chuỗi đó được truyền như **một giá trị** của parameter, không phải code SQL.
- SQL Server nhận được: `WHERE TenDangNhap = N'''; DROP TABLE Thuoc; --'` (tìm user có tên chính xác chuỗi đó) — không có gì chạy.

### ⚠️ Quy tắc bất di bất dịch

- ❌ **KHÔNG BAO GIỜ** dùng template string ghép SQL: `db.query("... WHERE x = '" + input + "'")`
- ✅ **LUÔN LUÔN** dùng parameterized: `db.query("... WHERE x = @x", { x: input })`
- Quy tắc này áp dụng cho mọi service, mọi controller.

---

## 8. Helmet — Tăng cứng HTTP header

### 📂 Nó nằm ở đâu?

- **Mount trong app:** `app.use(helmet())` ngay đầu `backend/src/app.js`

### 🧠 Nó hoạt động như thế nào?

**Helmet** là middleware gắn thêm các **HTTP response header** an toàn, giúp trình duyệt biết:

- Chặn clickjacking (`X-Frame-Options`)
- Chặn MIME-type sniffing (`X-Content-Type-Options`)
- Bật XSS filter của trình duyệt (`X-XSS-Protection`)
- Strict-Transport-Security bắt buộc HTTPS (ở production)
- Và nhiều header khác

### 💡 Vì sao cần?

Các header này **mặc định Express không gửi**, trình duyệt cũng không tự đoán. Không có helmet → trình duyệt dễ bị lợi dụng render trang trong `<iframe>` của trang khác (clickjacking) hoặc tự đoán MIME sai và chạy file như script.

---

## 9. CORS — Giới hạn domain frontend được gọi API

### 📂 Nó nằm ở đâu?

- **Mount trong app:** `app.use(cors({...}))` trong `backend/src/app.js`

### 🧠 Nó hoạt động như thế nào?

**CORS (Cross-Origin Resource Sharing)** kiểm soát **trình duyệt có cho phép trang web domain A gọi API domain B hay không**.

Trong dự án:

- **Dev:** cho phép `http://localhost:5173` (Vite) và `http://localhost:3000`.
- **Production:** chỉ cho phép domain thật lấy từ biến môi trường `FRONTEND_URL`.
- Bật `credentials: true` để cho phép gửi cookie/Authorization header cross-origin.

### 💡 Vì sao cần?

- Nếu KHÔNG cấu hình CORS, một trang web độc hại (`evil.com`) có thể gọi thẳng API của bạn từ trình duyệt nạn nhân — lỗ hổng CSRF + data exfiltration.
- CORS whitelist giúp chỉ frontend hợp pháp mới gọi được API.

---

## 10. Rate Limit — Chống brute-force & DDoS

### 📂 Nó nằm ở đâu?

- **Code:** `backend/src/middleware/rateLimit.js` (hàm `authLimiter`, `writeLimiter`)
- **Mount:** trong `backend/src/app.js` cho route `/api/auth/*`, và trong từng `*.routes.js` cho endpoint ghi (`POST`/`PUT`/`PATCH`/`DELETE`)

### 🧠 Nó hoạt động như thế nào?

**Rate Limit** giới hạn **số request được phép từ 1 IP trong 1 khoảng thời gian**. Quá → trả HTTP 429.

Dự án có **2 tier**:

| Tên | Áp dụng | Giới hạn | Mục đích |
|---|---|---|---|
| `authLimiter` | `/api/auth/login`, `/api/auth/refresh` | **5 lần / 15 phút / IP** (chỉ tính request FAIL) | Chống brute-force đoán mật khẩu |
| `writeLimiter` | Mọi `POST/PUT/PATCH/DELETE` | **30 lần / 15 phút / IP** | Chống spam ghi dữ liệu, giảm thiệt hại DDoS |

### 💡 Vì sao cần?

- **Brute-force login:** nếu không giới hạn, attacker thử hàng triệu mật khẩu/giây từ 1 IP.
- **DDoS cơ bản:** giới hạn request chặn được các cuộc tấn công quy mô nhỏ.
- **Kết hợp với `LockUntil` trong DB:** nếu user nhập sai 5 lần, tài khoản cũng bị khoá 15 phút — chống brute-force phân tán nhiều IP.

### ⚠️ Lưu ý

`express-rate-limit` mặc định lưu counter **in-memory** (RAM). Khi deploy nhiều instance cần chuyển sang Redis store — hiện tại dự án chấp nhận điều này cho môi trường dev/single-server demo.

---

## 11. Audit Log — Truy vết thao tác

### 📂 Nó nằm ở đâu?

- **Code:** `backend/src/middleware/audit.js`
- **Mount:** trong các `*.routes.js` cho thao tác ghi quan trọng (tạo/sửa/xoá nhân viên, sửa tồn kho, tạo phiếu chi…)
- **Bảng DB:** `AuditLog` (cột: `TenDangNhap`, `Action`, `TableName`, `RecordID`, `OldValue`, `NewValue`, `IPAddress`, `UserAgent`, `CreatedAt`)

### 🧠 Nó hoạt động như thế nào?

**Audit Log** ghi lại **ai làm gì, lúc nào, ở đâu, dữ liệu cũ/mới là gì** vào DB.

Quy trình:

1. Middleware `audit('CREATE_NV')` gắn vào route — nó **override hàm `res.json`** của Express.
2. Khi controller gọi `res.json({ success: true, ... })`, middleware **chặn lại**, ghi 1 dòng vào bảng `AuditLog` chứa:
   - Ai: lấy từ `req.user.username` (đã gắn bởi middleware auth)
   - Làm gì: action name truyền vào (`CREATE_NV`, `UPDATE_NV`, `DELETE_NV`…)
   - Ở đâu: IP + User-Agent từ request
   - Dữ liệu: `OldValue` (JSON trước khi sửa), `NewValue` (JSON sau khi sửa)
3. Chỉ ghi khi response trả về `success: true` — không ghi log các thao tác lỗi để tránh nhiễu.

### 💡 Vì sao cần?

- **Truy vết sự cố:** "ai đã xoá phiếu chi này?" → mở bảng `AuditLog` lọc theo `TableName='PhieuChi'`, `Action='DELETE'`.
- **Phát hiện hành vi bất thường:** một user liên tục login fail, hay truy cập ngoài giờ làm.
- **Phục vụ kiểm toán nội bộ** (đặc biệt với ngành dược phẩm — yêu cầu truy vết nguồn gốc thuốc).

---

## 12. Bản đồ tổng: request đi qua những lớp bảo mật nào

> Một request `POST /api/ban-hang` (tạo hóa đơn) đi qua các lớp theo thứ tự:

```
Client (React)
   │
   │ Authorization: Bearer <JWT>
   ▼
┌─────────────────────────────────────────┐
│ 1. Helmet                          ✅   │  Gắn HTTP header an toàn
│ 2. CORS                            ✅   │  Check domain frontend hợp lệ
│ 3. Body parser + xssSanitize      ✅   │  Parse JSON + escape HTML
│ 4. Rate Limit (writeLimiter)      ✅   │  Chống spam ghi
│ 5. authenticate (auth.js)         ✅   │  Verify JWT, gắn req.user
│ 6. requireRole('Admin','NV_BanHang') ✅│  Check role được phép
│ 7. audit                          ✅   │  Chuẩn bị log thao tác
│ 8. Controller (banHang.controller)    │  Validate nghiệp vụ (số lượng, giá...)
│ 9. Service (banHang.service)          │  Parameterized query SQL
│10. SQL Server                        │  Lưu HĐ + trừ tồn kho (transaction)
│11. Response → Audit Log ghi         ✅   │  Ghi vào AuditLog
└─────────────────────────────────────────┘
   │
   ▼
Client nhận JSON
```

**Tổng cộng 6 lớp bảo mật chạy trước khi đụng controller**, mỗi lớp chặn một loại tấn công khác nhau.

---

## 13. Tóm tắt & checklist

### 🎯 Các cơ chế đã triển khai

- ✅ **RBAC** — 3 role: Admin / NV_BanHang / NV_Kho — gắn theo route
- ✅ **JWT + Refresh token rotation** — 2 secret riêng, TokenVersion để revoke
- ✅ **Bcrypt** — hash mật khẩu, SALT_ROUNDS=10
- ✅ **AES-256-CBC** — mã hoá SĐT khách hàng
- ✅ **XSS sanitize** — escape HTML sâu trong body/query/params
- ✅ **SQL Injection** — parameterized query 100% service
- ✅ **Helmet** — HTTP header an toàn
- ✅ **CORS** — whitelist domain FE
- ✅ **Rate Limit** — chống brute-force login + chống spam ghi
- ✅ **Audit Log** — truy vết thao tác vào DB

### 🧪 Khi đọc code để xác minh

- Mở `backend/src/app.js` → thấy `app.use(helmet())`, `app.use(cors(...))`, `app.use(xssSanitize)`.
- Mở `backend/src/modules/<module>/<module>.routes.js` → thấy chuỗi `authenticate` → `requireRole(...)` → `ctrl.method`.
- Mở `backend/src/middleware/auth.js` → thấy `jwt.verify(token, process.env.JWT_SECRET)`.
- Mở `backend/src/modules/auth/auth.service.js` → thấy `bcrypt.compare`/`bcrypt.hash`, `generateAccessToken`, `refreshToken` rotation.
- Mở `backend/src/modules/khachHang/khachHang.service.js` → thấy `encryptAES`/`decryptAES`.
- Mở bất kỳ service nào → tìm `db.query(sql, { param: ... })` — đảm bảo **không** có template string ghép SQL.

### 📚 Tài liệu liên quan

- [`FEATURES.md`](./FEATURES.md) — phân tích chức năng & yêu cầu bảo mật từ đề bài
- [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) — Phase 4 Security là giai đoạn triển khai các cơ chế trên
- [`API.md`](./API.md) — endpoint nào yêu cầu role nào
- [`INSTALL.md`](./INSTALL.md) — cấu hình `.env` (JWT_SECRET, AES_KEY, AES_IV) đúng chuẩn