import { AlertTriangle, Building2, CheckCircle2, CircleDollarSign, DoorOpen, Users } from 'lucide-react';
import { useMemo } from 'react';
import { formatCurrency, formatDate } from '../core/format';
import type { RoomEntity, TaskEntity, TransactionEntity } from '../core/types';
import { useActiveRecords } from '../hooks/useActiveRecords';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';

export function DashboardPage() {
  const properties = useActiveRecords('properties');
  const rooms = useActiveRecords<RoomEntity>('rooms');
  const tenants = useActiveRecords('tenants');
  const transactions = useActiveRecords<TransactionEntity>('transactions');
  const tasks = useActiveRecords<TaskEntity>('tasks');

  const metrics = useMemo(() => {
    const occupied = rooms.filter((room) => room.status === 'occupied').length;
    const available = rooms.filter((room) => room.status === 'available').length;
    const income = transactions.filter((item) => item.type === 'income' && item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);
    const expense = transactions.filter((item) => item.type === 'expense' && item.status === 'paid').reduce((sum, item) => sum + item.amount, 0);
    const pending = transactions.filter((item) => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0);
    return { occupied, available, income, expense, pending, balance: income - expense };
  }, [rooms, transactions]);

  const occupancy = rooms.length ? Math.round((metrics.occupied / rooms.length) * 100) : 0;
  const upcomingTasks = tasks.filter((task) => task.status !== 'done').sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).slice(0, 5);
  const recentTransactions = transactions.slice(0, 5);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Ringkasan operasional, okupansi, dan arus kas lokal Anda." />
      <div className="metric-grid">
        <article className="metric-card"><span className="metric-card__icon"><Building2 /></span><div><small>Properti</small><strong>{properties.length}</strong><p>Lokasi aktif</p></div></article>
        <article className="metric-card"><span className="metric-card__icon"><DoorOpen /></span><div><small>Kamar terisi</small><strong>{metrics.occupied}/{rooms.length}</strong><p>{metrics.available} tersedia</p></div></article>
        <article className="metric-card"><span className="metric-card__icon"><Users /></span><div><small>Penghuni</small><strong>{tenants.length}</strong><p>Data aktif</p></div></article>
        <article className="metric-card"><span className="metric-card__icon"><CircleDollarSign /></span><div><small>Saldo tercatat</small><strong className="metric-card__currency">{formatCurrency(metrics.balance)}</strong><p>{formatCurrency(metrics.pending)} tertunda</p></div></article>
      </div>

      <div className="dashboard-grid">
        <section className="surface dashboard-panel">
          <div className="panel-header"><div><h2>Okupansi</h2><p>Kondisi kamar saat ini</p></div><strong>{occupancy}%</strong></div>
          <div className="progress"><span style={{ width: `${occupancy}%` }} /></div>
          <div className="occupancy-legend">
            <span><i className="legend-dot legend-dot--success" />Terisi <strong>{metrics.occupied}</strong></span>
            <span><i className="legend-dot" />Tersedia <strong>{metrics.available}</strong></span>
            <span><i className="legend-dot legend-dot--warning" />Perawatan <strong>{rooms.filter((room) => room.status === 'maintenance').length}</strong></span>
          </div>
        </section>

        <section className="surface dashboard-panel">
          <div className="panel-header"><div><h2>Arus kas</h2><p>Total seluruh catatan</p></div></div>
          <div className="cashflow-list">
            <div><span>Pemasukan lunas</span><strong className="text-success">{formatCurrency(metrics.income)}</strong></div>
            <div><span>Pengeluaran lunas</span><strong className="text-danger">{formatCurrency(metrics.expense)}</strong></div>
            <div><span>Selisih</span><strong>{formatCurrency(metrics.balance)}</strong></div>
          </div>
        </section>

        <section className="surface dashboard-panel">
          <div className="panel-header"><div><h2>Tugas terdekat</h2><p>Pekerjaan yang perlu diperhatikan</p></div></div>
          <div className="compact-list">
            {upcomingTasks.length === 0 ? <p className="muted">Tidak ada tugas terbuka.</p> : upcomingTasks.map((task) => (
              <div className="compact-list__item" key={task.id}>
                {task.priority === 'high' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                <div><strong>{task.title}</strong><small>{formatDate(task.dueDate)}</small></div>
                <StatusBadge tone={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'neutral'}>{task.priority}</StatusBadge>
              </div>
            ))}
          </div>
        </section>

        <section className="surface dashboard-panel">
          <div className="panel-header"><div><h2>Transaksi terbaru</h2><p>Aktivitas keuangan terakhir</p></div></div>
          <div className="compact-list">
            {recentTransactions.length === 0 ? <p className="muted">Belum ada transaksi.</p> : recentTransactions.map((item) => (
              <div className="compact-list__item" key={item.id}>
                <span className={`transaction-mark transaction-mark--${item.type}`} />
                <div><strong>{item.description}</strong><small>{formatDate(item.date)} · {item.category}</small></div>
                <strong className={item.type === 'income' ? 'text-success' : 'text-danger'}>{item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
