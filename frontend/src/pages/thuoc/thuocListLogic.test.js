import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStockChipCounts } from './thuocListLogic.js';

test('stock chips show numeric zeroes and derive all from every status', () => {
  assert.deepEqual(
    buildStockChipCounts({ inStock: 0, low: 0, out: 23 }),
    { all: 23, inStock: 0, low: 0, out: 23 }
  );
});

test('missing stock counts stay unavailable instead of masquerading as zero stock', () => {
  assert.equal(buildStockChipCounts(null), null);
});
