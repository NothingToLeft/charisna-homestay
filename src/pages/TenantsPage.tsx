import { formatDate } from '../core/format';
import type { RoomEntity, TenantEntity } from '../core/types';
import { tenantSchema } from '../core/validation';
import { EntityManager } from '../components/EntityManager';
import { useActiveRecords } from '../hooks/useActiveRecords';
import { deleteTenantWithRoomConsistency, saveTenantWithRoomConsistency } from '../services/tenantService';

export function TenantsPage() {
  const tenants = useActiveRecords<TenantEntity>('tenants');
  const rooms = useActiveRecords<RoomEntity>('rooms');
  const roomName = (id: string) => rooms.find((item) => item.id === id)?.name ?? '-';
  return (
    <EntityManager
      title="Penghuni"
      subtitle="Simpan kontak, penempatan kamar, dan periode sewa penghuni."
      singularLabel="Penghuni"
      collection="tenants"
      records={tenants}
      schema={tenantSchema}
      defaultValues={{ fullName: '', phone: '', email: '', roomId: '', startDate: '', endDate: '', emergencyContact: '', notes: '' }}
      fields={[
        { key: 'fullName', label: 'Nama lengkap', required: true },
        { key: 'phone', label: 'Nomor telepon', type: 'tel' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'roomId', label: 'Kamar', type: 'select', options: rooms.map((item) => ({ value: item.id, label: item.name })) },
        { key: 'startDate', label: 'Mulai sewa', type: 'date' },
        { key: 'endDate', label: 'Akhir sewa', type: 'date' },
        { key: 'emergencyContact', label: 'Kontak darurat', fullWidth: true },
        { key: 'notes', label: 'Catatan', type: 'textarea', fullWidth: true }
      ]}
      columns={[
        { header: 'Penghuni', render: (row) => <><strong>{row.fullName}</strong><small className="table-subtext">{row.phone || row.email || 'Kontak belum diisi'}</small></> },
        { header: 'Kamar', render: (row) => roomName(row.roomId) },
        { header: 'Periode', render: (row) => `${formatDate(row.startDate)} – ${formatDate(row.endDate)}` }
      ]}
      getSearchText={(row) => `${row.fullName} ${row.phone} ${row.email} ${roomName(row.roomId)}`}
      onSave={saveTenantWithRoomConsistency}
      onDelete={deleteTenantWithRoomConsistency}
    />
  );
}
