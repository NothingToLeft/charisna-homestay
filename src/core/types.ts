export type EntityCollection = 'properties' | 'rooms' | 'tenants' | 'transactions' | 'tasks';

export interface BaseEntity {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number | null;
  version: number;
  deviceId: string;
}

export interface PropertyEntity extends BaseEntity {
  name: string;
  address: string;
  city: string;
  notes: string;
}

export type RoomStatus = 'available' | 'occupied' | 'maintenance';

export interface RoomEntity extends BaseEntity {
  propertyId: string;
  name: string;
  monthlyRent: number;
  status: RoomStatus;
  notes: string;
}

export interface TenantEntity extends BaseEntity {
  fullName: string;
  phone: string;
  email: string;
  roomId: string;
  startDate: string;
  endDate: string;
  emergencyContact: string;
  notes: string;
}

export type TransactionType = 'income' | 'expense';
export type PaymentStatus = 'paid' | 'pending';

export interface TransactionEntity extends BaseEntity {
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  description: string;
  status: PaymentStatus;
  tenantId: string;
  roomId: string;
}

export type TaskStatus = 'open' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskEntity extends BaseEntity {
  title: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  notes: string;
}

export interface SyncQueueItem {
  id: string;
  collection: EntityCollection;
  entityId: string;
  operation: 'upsert';
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface AppMetadata {
  key: string;
  value: string | number | boolean | null;
}

export interface FirebaseRuntimeConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export interface BackupPayload {
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  data: {
    properties: PropertyEntity[];
    rooms: RoomEntity[];
    tenants: TenantEntity[];
    transactions: TransactionEntity[];
    tasks: TaskEntity[];
  };
}

export interface SyncReport {
  pushed: number;
  pulled: number;
  skipped: number;
  errors: string[];
  finishedAt: number;
}

export type AnyEntity = PropertyEntity | RoomEntity | TenantEntity | TransactionEntity | TaskEntity;

export interface DesktopBridge {
  isDesktop: boolean;
  saveTextFile: (suggestedName: string, content: string) => Promise<boolean>;
  openTextFile: () => Promise<{ name: string; content: string } | null>;
}

declare global {
  interface Window {
    managementDesktop?: DesktopBridge;
  }
}
