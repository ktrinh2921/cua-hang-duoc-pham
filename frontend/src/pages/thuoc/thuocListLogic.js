export function buildStockChipCounts(counts) {
  if (!counts) return null;

  const inStock = Math.max(0, Number(counts?.inStock) || 0);
  const low = Math.max(0, Number(counts?.low) || 0);
  const out = Math.max(0, Number(counts?.out) || 0);

  return {
    all: inStock + low + out,
    inStock,
    low,
    out,
  };
}
