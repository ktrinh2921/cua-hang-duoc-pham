import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./AuditLogPage.jsx', import.meta.url), 'utf8');
const columnsSource = source.slice(
    source.indexOf('const columns = ['),
    source.indexOf('// Daily chart')
);

test('Audit Log columns follow the shared Table row-based rendering contract', () => {
    assert.doesNotMatch(columnsSource, /\bheader\s*:/);
    assert.doesNotMatch(columnsSource, /\baccessor\s*:/);
    assert.match(columnsSource, /key:\s*'action'/);
    assert.match(columnsSource, /label:\s*'Hành động'/);
    assert.match(columnsSource, /ACTION_VARIANT\(row\.action\)/);
    assert.match(source, /<Table[\s\S]*?rowKey="logId"/);
});

test('Audit Log follows the shared Pagination prop contract', () => {
    const paginationSource = source.slice(source.indexOf('<Pagination'), source.indexOf('/>', source.indexOf('<Pagination')));

    assert.match(paginationSource, /page=\{page\}/);
    assert.match(paginationSource, /totalPages=\{totalPages\}/);
    assert.match(paginationSource, /total=\{total\}/);
    assert.match(paginationSource, /onChange=\{setPage\}/);
    assert.match(paginationSource, /loading=\{loading\}/);
    assert.doesNotMatch(paginationSource, /currentPage|onPageChange/);
});

test('Audit Log uses the Select raw-value change contract', () => {
    assert.match(source, /onChange=\{value => handleFilterChange\('action', value\)\}/);
    assert.match(source, /onChange=\{value => handleFilterChange\('tableName', value\)\}/);
});
