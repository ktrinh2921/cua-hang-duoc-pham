import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

test('shared UI components tolerate partial pagination data and Lucide icon types', async () => {
    const vite = await createServer({
        server: { middlewareMode: true, hmr: false },
        appType: 'custom',
    });

    try {
        const [
            { default: Pagination },
            { default: StatCard },
            { default: PageHeader },
            { default: AuditLogPage },
            { default: SystemConfigPage },
            { ScrollText },
        ] = await Promise.all([
            vite.ssrLoadModule('/src/components/ui/Pagination.jsx'),
            vite.ssrLoadModule('/src/components/ui/StatCard.jsx'),
            vite.ssrLoadModule('/src/components/ui/PageHeader.jsx'),
            vite.ssrLoadModule('/src/pages/admin/AuditLogPage.jsx'),
            vite.ssrLoadModule('/src/pages/admin/SystemConfigPage.jsx'),
            import('lucide-react'),
        ]);

        const paginationHtml = renderToString(React.createElement(Pagination, {
            totalPages: 2,
        }));
        const statCardHtml = renderToString(React.createElement(StatCard, {
            icon: ScrollText,
            label: 'Tổng bản ghi',
            value: 1,
        }));
        const headerFromComponent = renderToString(React.createElement(PageHeader, {
            icon: ScrollText,
            title: 'Nhật ký hệ thống',
        }));
        const headerFromElement = renderToString(React.createElement(PageHeader, {
            icon: React.createElement(ScrollText),
            title: 'Nhật ký hệ thống',
        }));
        const auditPageHtml = renderToString(React.createElement(AuditLogPage));
        const configPageHtml = renderToString(React.createElement(SystemConfigPage));

        assert.match(paginationHtml.replaceAll('<!-- -->', ''), /0 kết quả/);
        assert.match(statCardHtml, /<svg/);
        assert.match(headerFromComponent, /<svg/);
        assert.match(headerFromElement, /<svg/);
        assert.match(auditPageHtml, /Tổng quan 7 ngày gần nhất/);
        assert.match(auditPageHtml, /Bộ lọc nhật ký/);
        assert.match(auditPageHtml, /Dòng sự kiện/);
        assert.match(configPageHtml, /Cấu hình hệ thống/);
        assert.match(configPageHtml, /Thông tin bảo mật được tách riêng/);
    } finally {
        await vite.close();
    }
});
