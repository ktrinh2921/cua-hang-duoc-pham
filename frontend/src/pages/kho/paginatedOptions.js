export async function loadAllPaginatedItems(fetchPage, limit = 100) {
  const first = await fetchPage(1, limit);
  const items = [...(first.data?.items || [])];
  const totalPages = Number(first.data?.pagination?.totalPages) || 1;

  if (totalPages <= 1) return items;

  const remaining = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2, limit))
  );
  remaining.forEach((response) => items.push(...(response.data?.items || [])));
  return items;
}

