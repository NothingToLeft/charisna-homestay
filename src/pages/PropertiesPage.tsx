import type { PropertyEntity, RoomEntity } from '../core/types';
import { propertySchema } from '../core/validation';
import { useActiveRecords } from '../hooks/useActiveRecords';
import { EntityManager } from '../components/EntityManager';

export function PropertiesPage() {
  const properties = useActiveRecords<PropertyEntity>('properties');
  const rooms = useActiveRecords<RoomEntity>('rooms');
  return (
    <EntityManager
      title="Properti"
      subtitle="Kelola lokasi, alamat, dan catatan setiap properti."
      singularLabel="Properti"
      collection="properties"
      records={properties}
      schema={propertySchema}
      defaultValues={{ name: '', address: '', city: '', notes: '' }}
      fields={[
        { key: 'name', label: 'Nama properti', required: true },
        { key: 'city', label: 'Kota', required: true },
        { key: 'address', label: 'Alamat lengkap', required: true, fullWidth: true },
        { key: 'notes', label: 'Catatan', type: 'textarea', fullWidth: true }
      ]}
      columns={[
        { header: 'Nama', render: (row) => <strong>{row.name}</strong> },
        { header: 'Alamat', render: (row) => <><span>{row.address}</span><small className="table-subtext">{row.city}</small></> },
        { header: 'Jumlah kamar', render: (row) => rooms.filter((room) => room.propertyId === row.id).length }
      ]}
      getSearchText={(row) => `${row.name} ${row.address} ${row.city}`}
      beforeDelete={(row) => rooms.some((room) => room.propertyId === row.id) ? 'Properti masih memiliki kamar aktif. Pindahkan atau hapus kamar terlebih dahulu.' : null}
    />
  );
}
