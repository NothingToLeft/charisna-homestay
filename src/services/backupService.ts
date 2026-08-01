import { APP_VERSION } from '../core/constants';
import type { BackupPayload, EntityCollection } from '../core/types';
import { db } from '../db/database';

const downloadBrowserFile = (filename: string, content: string, mime = 'application/json'): void => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const saveText = async (filename: string, content: string, mime?: string): Promise<void> => {
  if (window.managementDesktop?.isDesktop) {
    await window.managementDesktop.saveTextFile(filename, content);
    return;
  }
  downloadBrowserFile(filename, content, mime);
};

export const createBackup = async (): Promise<BackupPayload> => ({
  schemaVersion: 1,
  appVersion: APP_VERSION,
  exportedAt: new Date().toISOString(),
  data: {
    properties: await db.properties.toArray(),
    rooms: await db.rooms.toArray(),
    tenants: await db.tenants.toArray(),
    transactions: await db.transactions.toArray(),
    tasks: await db.tasks.toArray()
  }
});

export const exportBackup = async (): Promise<void> => {
  const backup = await createBackup();
  const date = new Date().toISOString().slice(0, 10);
  await saveText(`management-backup-${date}.json`, JSON.stringify(backup, null, 2));
};

export const readBackupFile = async (): Promise<string | null> => {
  if (window.managementDesktop?.isDesktop) {
    const result = await window.managementDesktop.openTextFile();
    return result?.content ?? null;
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      resolve(file ? await file.text() : null);
    };
    input.click();
  });
};

const assertBackup = (value: unknown): BackupPayload => {
  if (!value || typeof value !== 'object') throw new Error('File backup tidak valid.');
  const backup = value as Partial<BackupPayload>;
  if (backup.schemaVersion !== 1 || !backup.data) throw new Error('Versi backup belum didukung.');
  const keys: EntityCollection[] = ['properties', 'rooms', 'tenants', 'transactions', 'tasks'];
  for (const key of keys) {
    if (!Array.isArray(backup.data[key])) throw new Error(`Data ${key} tidak valid.`);
  }
  return backup as BackupPayload;
};

export const importBackup = async (content: string, replaceExisting = false): Promise<void> => {
  const backup = assertBackup(JSON.parse(content));
  await db.transaction(
    'rw',
    db.properties,
    db.rooms,
    db.tenants,
    db.transactions,
    db.tasks,
    db.syncQueue,
    db.metadata,
    async () => {
      if (replaceExisting) {
        await Promise.all([
          db.properties.clear(),
          db.rooms.clear(),
          db.tenants.clear(),
          db.transactions.clear(),
          db.tasks.clear(),
          db.syncQueue.clear(),
          db.metadata.clear()
        ]);
      }
      await db.properties.bulkPut(backup.data.properties);
      await db.rooms.bulkPut(backup.data.rooms);
      await db.tenants.bulkPut(backup.data.tenants);
      await db.transactions.bulkPut(backup.data.transactions);
      await db.tasks.bulkPut(backup.data.tasks);
      const now = Date.now();
      for (const collectionName of ['properties', 'rooms', 'tenants', 'transactions', 'tasks'] as EntityCollection[]) {
        const rows = backup.data[collectionName];
        await db.syncQueue.bulkPut(
          rows.map((row) => ({
            id: `${collectionName}:${row.id}`,
            collection: collectionName,
            entityId: row.id,
            operation: 'upsert' as const,
            createdAt: now,
            attempts: 0
          }))
        );
      }
    }
  );
  window.dispatchEvent(new CustomEvent('management:data-changed'));
};

const csvEscape = (value: unknown): string => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const exportAllCsv = async (): Promise<void> => {
  const sections: string[] = [];
  const collections: Array<[string, Record<string, unknown>[]]> = [
    ['properties', (await db.properties.filter((row) => !row.deletedAt).toArray()).map((row) => row as unknown as Record<string, unknown>)],
    ['rooms', (await db.rooms.filter((row) => !row.deletedAt).toArray()).map((row) => row as unknown as Record<string, unknown>)],
    ['tenants', (await db.tenants.filter((row) => !row.deletedAt).toArray()).map((row) => row as unknown as Record<string, unknown>)],
    ['transactions', (await db.transactions.filter((row) => !row.deletedAt).toArray()).map((row) => row as unknown as Record<string, unknown>)],
    ['tasks', (await db.tasks.filter((row) => !row.deletedAt).toArray()).map((row) => row as unknown as Record<string, unknown>)]
  ];
  for (const [name, rows] of collections) {
    sections.push(`# ${name}`);
    if (rows.length === 0) {
      sections.push('');
      continue;
    }
    const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    sections.push(headers.map(csvEscape).join(','));
    for (const row of rows) sections.push(headers.map((header) => csvEscape(row[header])).join(','));
    sections.push('');
  }
  const date = new Date().toISOString().slice(0, 10);
  await saveText(`management-export-${date}.csv`, `\uFEFF${sections.join('\n')}`, 'text/csv');
};

export const clearAllLocalData = async (): Promise<void> => {
  await db.transaction(
    'rw',
    db.properties,
    db.rooms,
    db.tenants,
    db.transactions,
    db.tasks,
    db.syncQueue,
    db.metadata,
    async () => {
      await Promise.all([
        db.properties.clear(),
        db.rooms.clear(),
        db.tenants.clear(),
        db.transactions.clear(),
        db.tasks.clear(),
        db.syncQueue.clear(),
        db.metadata.clear()
      ]);
    }
  );
  window.dispatchEvent(new CustomEvent('management:data-changed'));
};
