import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./SystemConfigPage.jsx', import.meta.url), 'utf8');

test('System Config uses accessible labeled editing and the ConfirmDialog contract', () => {
    assert.match(source, /label="Giá trị mới"/);
    assert.match(source, /confirmLabel="Lưu thay đổi"/);
    assert.doesNotMatch(source, /confirmText=/);
});
test('System Config section headings use Lucide icons instead of emoji', () => {
    assert.doesNotMatch(source, /[🏪⚠️📊⚙️]/u);
    assert.match(source, /title: 'Thông tin cửa hàng'/);
    assert.match(source, /title: 'Ngưỡng cảnh báo'/);
    assert.match(source, /title: 'Nghiệp vụ mặc định'/);
});
