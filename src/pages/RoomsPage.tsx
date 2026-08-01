import { formatCurrency } from '../core/format';
import type { PropertyEntity, RoomEntity, TenantEntity } from '../core/types';
import { roomSchema } from '../core/validation';
import { EntityManager } from '../components/EntityManager';
import { StatusBadge } from '../components/StatusBadge';
import { useActiveRecords } from '../hooks/useActiveRecords';

const statusLabel = { available: 'Tersedia', occupied: 'Terisi', maintenance: 'Perawatan' } as const;

export function RoomsPage() {
  const rooms = useActiveRecords<RoomEntity>('rooms');
  const properties = useActiveRecords<PropertyEntity>('properties');
  const tenants = useActiveRecords<TenantEntity>('tenants');
  const propertyName = (id: string) => properties.find((item) => item.id === id)?.name ?? 'Properti tidak ditemukan';
  return (
    <EntityManager
      title="Kamar"
      subtitle="Pantau harga sewa, lokasi, dan status ketersediaan kamar."
      singularLabel="Kamar"
      collection="rooms"
      records={rooms}
      schema={roomSchema}
      defaultValues={{ propertyId: properties[0]?.id ?? '', name: '', monthlyRent: 0, status: 'available', notes: '' }}
      fields={[
        { key: 'propertyId', label: 'Properti', type: 'select', required: true, options: properties.map((item) => ({ value: item.id, label: item.name })) },
        { key: 'name', label: 'Nama/nomor kamar', required: true },
        { key: 'monthlyRent', label: 'Harga sewa bulanan', type: 'number', min: 0, step: 1000, required: true },
        { key: 'status', label: 'Status', type: 'select', required: true, options: [
          { value: 'available', label: 'Tersedia' }, { value: 'occupied', label: 'Terisi' }, { value: 'maintenance', label: 'Perawatan' }
        ] },
        { key: 'notes', label: 'Catatan', type: 'textarea', fullWidth: true }
      ]}
      columns={[
        { header: 'Kamar', render: (row) => <><strong>{row.name}</strong><small className="table-subtext">{propertyName(row.propertyId)}</small></> },
        { header: 'Sewa', render: (row) => formatCurrency(row.monthlyRent) },
        { header: 'Status', render: (row) => <StatusBadge tone={row.status === 'occupied' ? 'success' : row.status === 'maintenance' ? 'warning' : 'neutral'}>{statusLabel[row.status]}</StatusBadge> }
      ]}
      getSearchText={(row) => `${row.name} ${propertyName(row.propertyId)} ${row.status}`}
      beforeDelete={(row) => tenants.some((tenant) => tenant.roomId === row.id) ? 'Kamar masih digunakan oleh penghuni aktif. Pindahkan penghuni terlebih dahulu.' : null}
    />
  );
}
