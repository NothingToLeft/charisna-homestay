import Dexie, { type EntityTable } from 'dexie';
import { DATABASE_NAME } from '../core/constants';
import type {
  AppMetadata,
  PropertyEntity,
  RoomEntity,
  SyncQueueItem,
  TaskEntity,
  TenantEntity,
  TransactionEntity
} from '../core/types';

export class ManagementDatabase extends Dexie {
  properties!: EntityTable<PropertyEntity, 'id'>;
  rooms!: EntityTable<RoomEntity, 'id'>;
  tenants!: EntityTable<TenantEntity, 'id'>;
  transactions!: EntityTable<TransactionEntity, 'id'>;
  tasks!: EntityTable<TaskEntity, 'id'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;
  metadata!: EntityTable<AppMetadata, 'key'>;

  constructor() {
    super(DATABASE_NAME);
    this.version(1).stores({
      properties: 'id, name, city, updatedAt, deletedAt',
      rooms: 'id, propertyId, name, status, updatedAt, deletedAt',
      tenants: 'id, roomId, fullName, phone, updatedAt, deletedAt',
      transactions: 'id, type, date, status, tenantId, roomId, updatedAt, deletedAt',
      tasks: 'id, dueDate, priority, status, updatedAt, deletedAt',
      syncQueue: 'id, collection, entityId, createdAt, attempts',
      metadata: 'key'
    });
  }
}

export const db = new ManagementDatabase();
