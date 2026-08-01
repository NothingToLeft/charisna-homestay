export const APP_VERSION = '1.0.3';
export const DATABASE_NAME = 'management-offline-db';
export const FIREBASE_CONFIG_KEY = 'management.firebase.config';
export const DEVICE_ID_KEY = 'management.device.id';
export const AUTO_SYNC_KEY = 'management.auto.sync';
export const LAST_SYNC_PREFIX = 'lastSync:';
export const SYNC_INTERVAL_MS = 30_000;

export const COLLECTIONS = ['properties', 'rooms', 'tenants', 'transactions', 'tasks'] as const;
