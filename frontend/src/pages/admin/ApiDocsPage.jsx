/**
 * API Docs Page — iframe trỏ vào Swagger UI của backend
 *
 * Lưu ý quan trọng về iframe + proxy:
 *  - Axios gọi `/api/*` qua Vite proxy (vite.config.js) nên base URL = '/api'.
 *  - NHƯNG iframe không đi qua proxy: browser fetch thẳng URL trong src.
 *  - Vì vậy PHẢI trỏ thẳng về BE origin, không dùng '/api/docs'.
 *  - Ưu tiên VITE_API_DOCS_URL (full URL backend) > VITE_API_URL > fallback http://localhost:8080.
 *
 *  Port mặc định của backend là 8080 (xem backend/.env.example → PORT=8080).
 *  Đổi port khác: tạo frontend/.env với VITE_API_DOCS_URL=http://localhost:<port>
 *    hoặc VITE_API_URL=http://localhost:<port>.
 */
import { useMemo } from 'react';

function resolveDocsUrl() {
  // Ưu tiên 1: VITE_API_DOCS_URL — URL đầy đủ tới swagger (vd: http://localhost:8080/api/docs)
  const explicit = import.meta.env.VITE_API_DOCS_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  // Ưu tiên 2: VITE_API_URL — base URL backend, tự ghép /api/docs
  const base = import.meta.env.VITE_API_URL;
  if (base) return `${base.replace(/\/$/, '')}/api/docs`;

  // Fallback: phải khớp với backend/.env PORT (mặc định 8080)
  return 'http://localhost:8080/api/docs';
}

export default function ApiDocsPage() {
  const docsUrl = useMemo(resolveDocsUrl, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Tài liệu API (Swagger)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách endpoint backend — phát sinh tự động từ JSDoc trong từng file route.
          </p>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            {docsUrl}
          </p>
        </div>
        <a
          href={docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
        >
          Mở trong tab mới ↗
        </a>
      </div>
      <iframe
        title="Swagger UI"
        src={docsUrl}
        className="flex-1 w-full border-0"
        // Sandbox đủ chặt để iframe không escape ra ngoài
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
