# 🏥 SecurePharma

> **Đề tài:** Xây dựng website quản lý cửa hàng dược phẩm có tích hợp giải pháp an toàn
> **Ngành:** An toàn thông tin
> **Loại dự án:** Đồ án / Project sinh viên

---

## 📋 Mô tả

SecurePharma là hệ thống quản lý toàn diện cho cửa hàng dược phẩm, tích hợp 4 cơ chế bảo mật:
- 🔐 **Phân quyền RBAC** (Role-Based Access Control)
- 🔒 **Mã hóa dữ liệu** (bcrypt + AES)
- 🛡️ **Phòng chống SQL Injection** (Parameterized query)
- 🚫 **Phòng chống XSS** (Input sanitization)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite + Tailwind CSS + React Router |
| **Backend** | Node.js + Express + JWT |
| **Database** | Microsoft SQL Server 2019 |
| **Security** | bcrypt, JWT, helmet, xss, CORS |

---

## 📁 Cấu trúc dự án

```
SecurePharma/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── config/db.js        # Kết nối SQL Server
│   │   ├── middleware/         # auth, rbac, errorHandler, audit
│   │   ├── modules/            # auth, thuoc, khachhang, ...
│   │   ├── utils/              # response, logger
│   │   ├── app.js              # Express app
│   │   └── server.js           # Entry point
│   ├── database/               # Script SQL
│   └── package.json
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/         # layout, ui, common
│   │   ├── pages/              # auth, dashboard, thuoc, ...
│   │   ├── services/           # api, authService, ...
│   │   ├── contexts/           # AuthContext
│   │   ├── router/             # Routes config
│   │   ├── utils/              # format, constants
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── docs/                       # Tài liệu dự án
│   ├── FEATURES.md              # Phân tích chức năng (đề bài)
│   ├── IMPLEMENTATION_PLAN.md   # Kế hoạch triển khai chi tiết
│   ├── INSTALL.md               # Hướng dẫn cài đặt
│   └── archive/                 # Checklist/checklist phase đã hoàn thành
└── README.md                    # File này
```

---

## 🔑 Tài khoản demo

| Username | Password | Vai trò | Quyền |
|---|---|---|---|
| `admin.huong` | `Admin@2026` | Admin (Quản lý) | Toàn quyền |
| `banhang.minh` | `BanHang@2026` | NV_BanHang | Bán thuốc, xem hóa đơn |
| `kho.cuong` | `Kho@2026` | NV_Kho | Nhập / xuất kho, điều chỉnh tồn |

> Pattern `role.tên` và password có ký tự đặc biệt + số + chữ hoa — xem chi tiết tại [`docs/INSTALL.md`](./docs/INSTALL.md#9-tài-khoản-demo).

---

## 📊 Trạng thái triển khai

| Phase | Nội dung | Trạng thái |
|:-:|---|:-:|
| **Phase 1** | Project Foundation (BE + FE + DB) | ✅ HOÀN THÀNH |
| **Phase 2** | Authentication & RBAC (JWT + bcrypt) | ✅ HOÀN THÀNH |
| **Phase 3** | Core Business Features (Thuốc, Kho, Bán hàng, Hóa đơn) | ✅ HOÀN THÀNH |
| **Phase 4** | Security (XSS, rate-limit, audit log, AES) | ✅ HOÀN THÀNH |
| **Phase 5** | UI polish + integration testing | 🔄 ĐANG CHẠY |
| **Phase 6** | Hoàn thiện đồ án + tài liệu | ⏳ |

Xem kế hoạch chi tiết tại [`IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md).

---

## 🚀 Quick Start

Xem hướng dẫn chi tiết tại [`INSTALL.md`](./docs/INSTALL.md)

```bash
# 1. Setup database (chạy file SQL trong SQL Server Management Studio)
#    - backend/database/01_create_tables.sql
#    - backend/database/02_seed_data.sql

# 2. Cài đặt dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Cấu hình .env trong backend (sửa DB_PASSWORD)

# 4. Chạy backend
cd backend && npm run dev
# → http://localhost:8080

# 5. Chạy frontend (terminal mới)
cd frontend && npm run dev
# → http://localhost:5173
```

Mở `http://localhost:5173` → Click "Test API Connection" để verify.

---

## 📚 Tài liệu

| File | Mô tả |
|---|---|
| [`LEARNING_GUIDE.md`](./docs/LEARNING_GUIDE.md) | 📚 Hướng dẫn học & phân tích dự án — kiến trúc, bảo mật, cách đọc code |
| [`FEATURES.md`](./docs/FEATURES.md) | Phân tích chức năng từ đề bài |
| [`IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) | Kế hoạch triển khai 6 Phase |
| [`INSTALL.md`](./docs/INSTALL.md) | Hướng dẫn cài đặt chi tiết |
| [`PHASE1_CHECKLIST.md`](./docs/archive/PHASE1_CHECKLIST.md) | Checklist hoàn thành Phase 1 |
| [`UI_DESIGN_SYSTEM.md`](./docs/UI_DESIGN_SYSTEM.md) | Design system, palette, component contract cho toàn FE |
| [`UI_REVIEW.md`](./docs/UI_REVIEW.md) | Audit 6 trụ cột UI/UX của 11 page hiện có (15/09/2026) |
| [`UI_REDESIGN_PLAN.md`](./docs/UI_REDESIGN_PLAN.md) | Kế hoạch cải thiện FE 6 phase (ưu tiên → polish) |
| [`CRUD_MODAL_AUDIT.md`](./docs/CRUD_MODAL_AUDIT.md) | 🔍 Audit + test plan + đề xuất cải thiện modal CRUD (16/09/2026) |
| [`UI_NOTIFICATIONS.md`](./docs/UI_NOTIFICATIONS.md) | 🔔 Hệ thống toast + ConfirmDialog — quy tắc & pattern dùng cho toàn FE |
| [`API.md`](./docs/API.md) | 🔌 Tham chiếu Backend API đầy đủ (~70 endpoints, 13 module) |
| [`SECURITY.md`](./docs/SECURITY.md) | 🔒 Giải thích các cơ chế bảo mật (RBAC, JWT, bcrypt, AES, XSS, rate-limit, audit) |
| [`giai-dap-18-9.md`](./docs/giai-dap-18-9.md) | 📋 Giải đáp thắc mắc ngày 18/9 — phân loại KH/NCC, thiết bị khác đăng nhập, tài liệu API, quyền Admin |

---

## 🔒 Tính năng bảo mật (Phase 4)

| Cơ chế | Mô tả |
|---|---|
| **SQLi** | Dùng parameterized query của `mssql` package |
| **XSS** | Middleware escape input + React tự escape |
| **RBAC** | Middleware phân quyền theo role |
| **Mã hóa** | bcrypt cho mật khẩu, AES cho dữ liệu nhạy cảm |

---

## 📝 License

© 2026 SecurePharma Team - Đồ án môn học An toàn thông tin
