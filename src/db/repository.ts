import type { Table } from 'dexie';
import { db } from './database';
import { createId, getDeviceId } from '../core/id';
import type {
  AnyEntity,
  BaseEntity,
  EntityCollection,
  PropertyEntity,
  RoomEntity,
  TaskEntity,
  TenantEntity,
  TransactionEntity
} from '../core/types';

const tableMap = {
  properties: db.properties,
  rooms: db.rooms,
  tenants: db.tenants,
  transactions: db.transactions,
  tasks: db.tasks
} satisfies Record<EntityCollection, Table<any, string>>;

export const getTable = <T extends AnyEntity>(collection: EntityCollection): Table<T, string> =>
  tableMap[collection] as Table<T, string>;

const queueSync = async (collection: EntityCollection, entityId: string): Promise<void> => {
  await db.syncQueue.put({
    id: `${collection}:${entityId}`,
    collection,
    entityId,
    operation: 'upsert',
    createdAt: Date.now(),
    attempts: 0
  });
};

export const saveEntity = async <T extends AnyEntity>(
  collection: EntityCollection,
  input: Omit<T, keyof BaseEntity> & Partial<BaseEntity>
): Promise<T> => {
  const now = Date.now();
  const table = getTable<T>(collection);
  const existing = input.id ? await table.get(input.id) : undefined;
  const entity = {
    ...existing,
    ...input,
    id: input.id || createId(),
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
    deletedAt: null,
    version: (existing?.version ?? input.version ?? 0) + 1,
    deviceId: getDeviceId()
  } as T;

  await db.transaction('rw', table, db.syncQueue, async () => {
    await table.put(entity);
    await queueSync(collection, entity.id);
  });
  window.dispatchEvent(new CustomEvent('management:data-changed'));
  return entity;
};

export const softDeleteEntity = async (collection: EntityCollection, id: string): Promise<void> => {
  const table = getTable(collection);
  const entity = await table.get(id);
  if (!entity) return;
  const now = Date.now();
  await db.transaction('rw', table, db.syncQueue, async () => {
    await table.put({
      ...entity,
      updatedAt: now,
      deletedAt: now,
      version: entity.version + 1,
      deviceId: getDeviceId()
    });
    await queueSync(collection, id);
  });
  window.dispatchEvent(new CustomEvent('management:data-changed'));
};

export const restoreEntity = async (collection: EntityCollection, id: string): Promise<void> => {
  const table = getTable(collection);
  const entity = await table.get(id);
  if (!entity) return;
  await saveEntity(collection, { ...entity, deletedAt: null } as any);
};

export const seedDemoData = async (): Promise<void> => {
  if ((await db.properties.count()) > 0) return;
  const property = await saveEntity<PropertyEntity>('properties', {
    name: 'Properti Utama',
    address: 'Jl. Contoh No. 10',
    city: 'Jakarta',
    notes: 'Data contoh dapat diedit atau dihapus.'
  });
  const room = await saveEntity<RoomEntity>('rooms', {
    propertyId: property.id,
    name: 'Kamar A-01',
    monthlyRent: 1_250_000,
    status: 'occupied',
    notes: ''
  });
  const tenant = await saveEntity<TenantEntity>('tenants', {
    fullName: 'Penghuni Contoh',
    phone: '081234567890',
    email: '',
    roomId: room.id,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    emergencyContact: '',
    notes: ''
  });
  await saveEntity<TransactionEntity>('transactions', {
    type: 'income',
    category: 'Sewa bulanan',
    amount: 1_250_000,
    date: new Date().toISOString().slice(0, 10),
    description: 'Pembayaran sewa contoh',
    status: 'paid',
    tenantId: tenant.id,
    roomId: room.id
  });
  await saveEntity<TaskEntity>('tasks', {
    title: 'Periksa fasilitas kamar',
    dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
    priority: 'medium',
    status: 'open',
    notes: 'Data contoh.'
  });
  await db.syncQueue.clear();
};
