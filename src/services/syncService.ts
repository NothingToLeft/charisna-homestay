import {
  collection as firestoreCollection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { AUTO_SYNC_KEY, COLLECTIONS, LAST_SYNC_PREFIX, SYNC_INTERVAL_MS } from '../core/constants';
import type { AnyEntity, EntityCollection, SyncReport } from '../core/types';
import { db } from '../db/database';
import { getTable } from '../db/repository';
import { getCurrentCloudUser, getFirebaseContext } from './firebaseService';

export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

let activeSync: Promise<SyncReport> | null = null;
let autoSyncTimer: number | null = null;
let onlineHandler: (() => void) | null = null;

const emitSyncState = (state: SyncState, report?: SyncReport, message?: string): void => {
  window.dispatchEvent(new CustomEvent('management:sync-state', { detail: { state, report, message } }));
};

const pushQueue = async (userId: string, report: SyncReport): Promise<void> => {
  const context = await getFirebaseContext();
  if (!context) throw new Error('Firebase belum dikonfigurasi.');
  const queue = await db.syncQueue.orderBy('createdAt').toArray();
  for (const item of queue) {
    try {
      const entity = await getTable(item.collection).get(item.entityId);
      if (!entity) {
        await db.syncQueue.delete(item.id);
        report.skipped += 1;
        continue;
      }
      await setDoc(doc(context.firestore, 'users', userId, item.collection, item.entityId), entity);
      await db.syncQueue.delete(item.id);
      report.pushed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.syncQueue.update(item.id, { attempts: item.attempts + 1, lastError: message });
      report.errors.push(`${item.collection}/${item.entityId}: ${message}`);
    }
  }
};

const mergeRemoteEntity = async (
  collectionName: EntityCollection,
  remote: AnyEntity,
  report: SyncReport
): Promise<void> => {
  const table = getTable(collectionName);
  const local = await table.get(remote.id);
  const queued = await db.syncQueue.get(`${collectionName}:${remote.id}`);

  if (!local || remote.updatedAt > local.updatedAt) {
    await table.put(remote);
    if (queued) await db.syncQueue.delete(queued.id);
    report.pulled += 1;
    return;
  }
  if (local.updatedAt > remote.updatedAt && !queued) {
    await db.syncQueue.put({
      id: `${collectionName}:${local.id}`,
      collection: collectionName,
      entityId: local.id,
      operation: 'upsert',
      createdAt: Date.now(),
      attempts: 0
    });
  }
  report.skipped += 1;
};

const pullCollection = async (
  userId: string,
  collectionName: EntityCollection,
  report: SyncReport
): Promise<void> => {
  const context = await getFirebaseContext();
  if (!context) throw new Error('Firebase belum dikonfigurasi.');
  const metadataKey = `${LAST_SYNC_PREFIX}${collectionName}`;
  const metadata = await db.metadata.get(metadataKey);
  const lastSyncAt = Number(metadata?.value ?? 0);
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
  let maxUpdatedAt = lastSyncAt;

  while (true) {
    const baseCollection = firestoreCollection(context.firestore, 'users', userId, collectionName);
    const constraints = [where('updatedAt', '>', lastSyncAt), orderBy('updatedAt', 'asc'), limit(250)];
    const pageQuery = cursor ? query(baseCollection, ...constraints, startAfter(cursor)) : query(baseCollection, ...constraints);
    const snapshot = await getDocs(pageQuery);
    for (const documentSnapshot of snapshot.docs) {
      const remote = documentSnapshot.data() as AnyEntity;
      if (!remote.id) continue;
      maxUpdatedAt = Math.max(maxUpdatedAt, Number(remote.updatedAt || 0));
      await mergeRemoteEntity(collectionName, remote, report);
    }
    if (snapshot.docs.length < 250) break;
    cursor = snapshot.docs.at(-1) ?? null;
  }
  await db.metadata.put({ key: metadataKey, value: maxUpdatedAt });
};

export const synchronizeNow = async (): Promise<SyncReport> => {
  if (activeSync) return activeSync;
  activeSync = (async () => {
    const report: SyncReport = { pushed: 0, pulled: 0, skipped: 0, errors: [], finishedAt: 0 };
    emitSyncState('syncing');
    try {
      if (!navigator.onLine) throw new Error('Perangkat sedang offline. Data lokal tetap aman.');
      const context = await getFirebaseContext();
      const user = context?.auth.currentUser;
      if (!context || !user) throw new Error('Masuk ke akun cloud untuk melakukan sinkronisasi.');
      await pushQueue(user.uid, report);
      for (const collectionName of COLLECTIONS) {
        await pullCollection(user.uid, collectionName, report);
      }
      // A pull can discover that a newer local record still needs to be pushed.
      await pushQueue(user.uid, report);
      report.finishedAt = Date.now();
      await db.metadata.put({ key: 'lastSuccessfulSync', value: report.finishedAt });
      window.dispatchEvent(new CustomEvent('management:data-changed'));
      emitSyncState(report.errors.length ? 'error' : 'success', report, report.errors[0]);
      return report;
    } catch (error) {
      report.finishedAt = Date.now();
      const message = error instanceof Error ? error.message : String(error);
      report.errors.push(message);
      emitSyncState('error', report, message);
      return report;
    } finally {
      activeSync = null;
    }
  })();
  return activeSync;
};

export const isAutoSyncEnabled = (): boolean => localStorage.getItem(AUTO_SYNC_KEY) !== 'false';

export const setAutoSyncEnabled = (enabled: boolean): void => {
  localStorage.setItem(AUTO_SYNC_KEY, String(enabled));
  if (enabled) startAutoSync();
  else stopAutoSync();
};

export const startAutoSync = (): void => {
  stopAutoSync();
  if (!isAutoSyncEnabled()) return;
  const run = () => {
    if (!navigator.onLine) return;
    void getCurrentCloudUser().then((user) => {
      if (user) void synchronizeNow();
    });
  };
  onlineHandler = run;
  window.addEventListener('online', onlineHandler);
  autoSyncTimer = window.setInterval(run, SYNC_INTERVAL_MS);
  window.setTimeout(run, 1500);
};

export const stopAutoSync = (): void => {
  if (onlineHandler) {
    window.removeEventListener('online', onlineHandler);
    onlineHandler = null;
  }
  if (autoSyncTimer !== null) {
    window.clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }
};
