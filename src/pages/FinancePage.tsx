import { formatCurrency, formatDate, todayIso } from '../core/format';
import type { RoomEntity, TenantEntity, TransactionEntity } from '../core/types';
import { transactionSchema } from '../core/validation';
import { EntityManager } from '../components/EntityManager';
import { StatusBadge } from '../components/StatusBadge';
import { useActiveRecords } from '../hooks/useActiveRecords';

export function FinancePage() {
  const transactions = useActiveRecords<TransactionEntity>('transactions');
  const rooms = useActiveRecords<RoomEntity>('rooms');
  const tenants = useActiveRecords<TenantEntity>('tenants');
  const tenantName = (id: string) => tenants.find((item) => item.id === id)?.fullName ?? '';
  return (
    <EntityManager
      title="Keuangan"
      subtitle="Catat pemasukan, pengeluaran, tagihan tertunda, dan pembayaran."
      singularLabel="Transaksi"
      collection="transactions"
      records={transactions}
      schema={transactionSchema}
      defaultValues={{ type: 'income', category: 'Sewa bulanan', amount: 0, date: todayIso(), description: '', status: 'paid', tenantId: '', roomId: '' }}
      fields={[
        { key: 'type', label: 'Jenis', type: 'select', required: true, options: [{ value: 'income', label: 'Pemasukan' }, { value: 'expense', label: 'Pengeluaran' }] },
        { key: 'status', label: 'Status', type: 'select', required: true, options: [{ value: 'paid', label: 'Lunas' }, { value: 'pending', label: 'Tertunda' }] },
        { key: 'category', label: 'Kategori', required: true },
        { key: 'amount', label: 'Nominal', type: 'number', min: 1, step: 1000, required: true },
        { key: 'date', label: 'Tanggal', type: 'date', required: true },
        { key: 'tenantId', label: 'Penghuni terkait', type: 'select', options: tenants.map((item) => ({ value: item.id, label: item.fullName })) },
        { key: 'roomId', label: 'Kamar terkait', type: 'select', options: rooms.map((item) => ({ value: item.id, label: item.name })) },
        { key: 'description', label: 'Keterangan', type: 'textarea', required: true, fullWidth: true }
      ]}
      columns={[
        { header: 'Keterangan', render: (row) => <><strong>{row.description}</strong><small className="table-subtext">{row.category}{tenantName(row.tenantId) ? ` · ${tenantName(row.tenantId)}` : ''}</small></> },
        { header: 'Tanggal', render: (row) => formatDate(row.date) },
        { header: 'Nominal', render: (row) => <strong className={row.type === 'income' ? 'text-success' : 'text-danger'}>{row.type === 'income' ? '+' : '-'}{formatCurrency(row.amount)}</strong> },
        { header: 'Status', render: (row) => <StatusBadge tone={row.status === 'paid' ? 'success' : 'warning'}>{row.status === 'paid' ? 'Lunas' : 'Tertunda'}</StatusBadge> }
      ]}
      getSearchText={(row) => `${row.description} ${row.category} ${row.type} ${row.status} ${tenantName(row.tenantId)}`}
    />
  );
}
