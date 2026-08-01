import { Edit3, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ZodType } from 'zod';
import type { AnyEntity, BaseEntity, EntityCollection } from '../core/types';
import { saveEntity, softDeleteEntity } from '../db/repository';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Modal } from './Modal';
import { PageHeader } from './PageHeader';

export interface SelectOption {
  value: string;
  label: string;
}

export interface FormField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'email' | 'tel' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: SelectOption[];
  min?: number;
  step?: number;
  fullWidth?: boolean;
}

export interface TableColumn<T> {
  header: string;
  render: (record: T) => React.ReactNode;
  mobileLabel?: string;
}

interface EntityManagerProps<T extends AnyEntity> {
  title: string;
  subtitle: string;
  singularLabel: string;
  collection: EntityCollection;
  records: T[];
  fields: FormField[];
  columns: TableColumn<T>[];
  schema: ZodType<any>;
  defaultValues: Record<string, unknown>;
  getSearchText?: (record: T) => string;
  beforeDelete?: (record: T) => Promise<string | null> | string | null;
  onSave?: (data: Record<string, unknown>, editing: T | null) => Promise<void>;
  onDelete?: (record: T) => Promise<void>;
}

const toFormValues = <T extends AnyEntity>(record: T, fields: FormField[]): Record<string, unknown> =>
  Object.fromEntries(fields.map((field) => [field.key, (record as unknown as Record<string, unknown>)[field.key] ?? '']));

export function EntityManager<T extends AnyEntity>({
  title,
  subtitle,
  singularLabel,
  collection,
  records,
  fields,
  columns,
  schema,
  defaultValues,
  getSearchText,
  beforeDelete,
  onSave,
  onDelete
}: EntityManagerProps<T>) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('id-ID');
    if (!keyword) return records;
    return records.filter((record) => (getSearchText?.(record) ?? JSON.stringify(record)).toLocaleLowerCase('id-ID').includes(keyword));
  }, [getSearchText, records, search]);

  const openCreate = () => {
    setEditing(null);
    setValues(defaultValues);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (record: T) => {
    setEditing(record);
    setValues(toFormValues(record, fields));
    setErrors({});
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = schema.safeParse(values);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      const metadata: Partial<BaseEntity> = editing
        ? {
            id: editing.id,
            createdAt: editing.createdAt,
            version: editing.version,
            deviceId: editing.deviceId
          }
        : {};
      if (onSave) {
        await onSave(result.data, editing);
      } else {
        await saveEntity<T>(collection, { ...result.data, ...metadata } as Omit<T, keyof BaseEntity> & Partial<BaseEntity>);
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: T) => {
    const blockedReason = await beforeDelete?.(record);
    if (blockedReason) {
      window.alert(blockedReason);
      return;
    }
    if (!window.confirm(`Hapus ${singularLabel.toLowerCase()} ini? Data akan disembunyikan dan disinkronkan sebagai penghapusan.`)) return;
    if (onDelete) await onDelete(record);
    else await softDeleteEntity(collection, record.id);
  };

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<Button icon={<Plus size={18} />} onClick={openCreate}>Tambah {singularLabel}</Button>}
      />

      <section className="surface table-surface">
        <div className="table-toolbar">
          <label className="search-field">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Cari ${title.toLowerCase()}...`} />
          </label>
          <span className="record-count">{filtered.length} data</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="responsive-table-wrap">
            <table className="data-table">
              <thead>
                <tr>{columns.map((column) => <th key={column.header}>{column.header}</th>)}<th className="actions-column">Aksi</th></tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr key={record.id}>
                    {columns.map((column) => <td key={column.header} data-label={column.mobileLabel ?? column.header}>{column.render(record)}</td>)}
                    <td className="row-actions" data-label="Aksi">
                      <button className="icon-button" onClick={() => openEdit(record)} aria-label={`Edit ${singularLabel}`}><Edit3 size={18} /></button>
                      <button className="icon-button icon-button--danger" onClick={() => void remove(record)} aria-label={`Hapus ${singularLabel}`}><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal title={editing ? `Edit ${singularLabel}` : `Tambah ${singularLabel}`} open={open} onClose={() => setOpen(false)}>
        <form onSubmit={submit} className="form-grid">
          {fields.map((field) => {
            const value = values[field.key] ?? '';
            const common = {
              id: field.key,
              name: field.key,
              value: String(value),
              required: field.required,
              placeholder: field.placeholder,
              onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                setValues((current) => ({ ...current, [field.key]: field.type === 'number' ? event.target.value : event.target.value }))
            };
            return (
              <label key={field.key} className={`form-field ${field.fullWidth || field.type === 'textarea' ? 'form-field--full' : ''}`}>
                <span>{field.label}{field.required ? ' *' : ''}</span>
                {field.type === 'textarea' ? (
                  <textarea {...common} rows={4} />
                ) : field.type === 'select' ? (
                  <select {...common}>
                    <option value="">Pilih...</option>
                    {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : (
                  <input {...common} type={field.type ?? 'text'} min={field.min} step={field.step} />
                )}
                {errors[field.key] && <small className="form-error">{errors[field.key]}</small>}
              </label>
            );
          })}
          {errors.form && <p className="form-error form-field--full">{errors.form}</p>}
          <div className="form-actions form-field--full">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
