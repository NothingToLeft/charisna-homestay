import { Inbox } from 'lucide-react';

export function EmptyState({ title = 'Belum ada data', description = 'Tambahkan data pertama untuk mulai menggunakan modul ini.' }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Inbox size={28} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
