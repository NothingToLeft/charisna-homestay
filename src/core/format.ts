export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0);

export const formatDate = (value?: string | number | null): string => {
  if (!value) return '-';
  const date = typeof value === 'number' ? new Date(value) : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

export const todayIso = (): string => new Date().toISOString().slice(0, 10);

export const normalizePhone = (value: string): string => value.replace(/[^\d+]/g, '');
