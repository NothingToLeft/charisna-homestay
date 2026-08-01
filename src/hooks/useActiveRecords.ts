import { useLiveQuery } from 'dexie-react-hooks';
import type { AnyEntity, EntityCollection } from '../core/types';
import { getTable } from '../db/repository';

export const useActiveRecords = <T extends AnyEntity>(collection: EntityCollection): T[] =>
  useLiveQuery(async () => {
    const rows = await getTable<T>(collection).toArray();
    return rows.filter((row) => !row.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [collection], []) ?? [];
