import test from 'node:test';
import assert from 'node:assert/strict';

import { loadAllPaginatedItems } from './paginatedOptions.js';

test('option loader follows every API page instead of silently stopping at 100 items', async () => {
  const pages = {
    1: { data: { items: [1, 2], pagination: { totalPages: 3 } } },
    2: { data: { items: [3, 4], pagination: { totalPages: 3 } } },
    3: { data: { items: [5], pagination: { totalPages: 3 } } },
  };

  const items = await loadAllPaginatedItems(async (page) => pages[page], 2);
  assert.deepEqual(items, [1, 2, 3, 4, 5]);
});

