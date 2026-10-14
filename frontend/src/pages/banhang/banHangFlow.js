export function invoiceListNavigationState(maHD) {
  return {
    pathname: '/hoa-don',
    state: { viewId: Number(maHD) },
  };
}

