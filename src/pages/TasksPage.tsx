import { formatDate } from '../core/format';
import type { TaskEntity } from '../core/types';
import { taskSchema } from '../core/validation';
import { EntityManager } from '../components/EntityManager';
import { StatusBadge } from '../components/StatusBadge';
import { useActiveRecords } from '../hooks/useActiveRecords';

const statusLabel = { open: 'Terbuka', in_progress: 'Dikerjakan', done: 'Selesai' } as const;
const priorityLabel = { low: 'Rendah', medium: 'Sedang', high: 'Tinggi' } as const;

export function TasksPage() {
  const tasks = useActiveRecords<TaskEntity>('tasks');
  return (
    <EntityManager
      title="Tugas"
      subtitle="Kelola pekerjaan operasional, perawatan, dan tenggat waktu."
      singularLabel="Tugas"
      collection="tasks"
      records={tasks}
      schema={taskSchema}
      defaultValues={{ title: '', dueDate: '', priority: 'medium', status: 'open', notes: '' }}
      fields={[
        { key: 'title', label: 'Judul tugas', required: true, fullWidth: true },
        { key: 'dueDate', label: 'Tenggat', type: 'date' },
        { key: 'priority', label: 'Prioritas', type: 'select', required: true, options: [{ value: 'low', label: 'Rendah' }, { value: 'medium', label: 'Sedang' }, { value: 'high', label: 'Tinggi' }] },
        { key: 'status', label: 'Status', type: 'select', required: true, options: [{ value: 'open', label: 'Terbuka' }, { value: 'in_progress', label: 'Dikerjakan' }, { value: 'done', label: 'Selesai' }] },
        { key: 'notes', label: 'Catatan', type: 'textarea', fullWidth: true }
      ]}
      columns={[
        { header: 'Tugas', render: (row) => <><strong>{row.title}</strong><small className="table-subtext">{row.notes || 'Tanpa catatan'}</small></> },
        { header: 'Tenggat', render: (row) => formatDate(row.dueDate) },
        { header: 'Prioritas', render: (row) => <StatusBadge tone={row.priority === 'high' ? 'danger' : row.priority === 'medium' ? 'warning' : 'neutral'}>{priorityLabel[row.priority]}</StatusBadge> },
        { header: 'Status', render: (row) => <StatusBadge tone={row.status === 'done' ? 'success' : row.status === 'in_progress' ? 'info' : 'neutral'}>{statusLabel[row.status]}</StatusBadge> }
      ]}
    />
  );
}
