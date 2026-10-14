import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv, buildReportHtml } from './reportExport.js';

const sections = [{ title: 'Dữ liệu', rows: [{ Ten: '=2+2', GiaTri: 1000 }] }];

test('CSV report is Excel-compatible and neutralizes formula injection', () => {
  const csv = buildCsv(sections);
  assert.match(csv, /"Nhóm dữ liệu","Ten","GiaTri"/);
  assert.match(csv, /"'=2\+2"/);
});

test('print report escapes HTML fields', () => {
  const html = buildReportHtml({ title: '<script>x</script>', sections });
  assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>x/);
});
