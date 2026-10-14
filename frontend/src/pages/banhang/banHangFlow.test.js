import test from 'node:test';
import assert from 'node:assert/strict';

import { invoiceListNavigationState } from './banHangFlow.js';

test('completed checkout opens its invoice inside the existing invoice-list route', () => {
  assert.deepEqual(invoiceListNavigationState(12), {
    pathname: '/hoa-don',
    state: { viewId: 12 },
  });
});

