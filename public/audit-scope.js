// Unassigned or ambiguous records belong only in the combined report.
function auditScopeData(data, propertyId) {
  if (propertyId === 'ALL') return data;
  const rooms = data.rooms || [];
  const belongs = (item, ref = item.roomNumber) => {
    if (item.propertyId) return item.propertyId === propertyId;
    const matches = rooms.filter(room => room.number === ref);
    return matches.length === 1 && (matches[0].propertyId || 'PROP-1') === propertyId;
  };
  const scoped = { ...data };
  scoped.rooms = rooms.filter(room => (room.propertyId || 'PROP-1') === propertyId);
  for (const key of ['inventaris', 'stok', 'expenses', 'perbaikan', 'kontrak', 'tenants', 'bills', 'complaints']) {
    scoped[key] = (data[key] || []).filter(item => belongs(item));
  }
  scoped.meter = (data.meter || []).filter(item => belongs(item, item.ref));
  const stockIds = new Set(scoped.stok.map(item => item.id));
  scoped.stokMutasi = (data.stokMutasi || []).filter(item => stockIds.has(item.itemId));
  scoped.tagihanBertahap = (data.tagihanBertahap || []).filter(item => {
    if (item.propertyId || item.roomNumber) return belongs(item);
    const tenants = (data.tenants || []).filter(tenant => tenant.name === item.tenantName && (!item.phone || tenant.phone === item.phone));
    return tenants.length === 1 && belongs(tenants[0]);
  });
  return scoped;
}
