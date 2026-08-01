import { useEffect, useState } from 'react';
import { db } from '../db/database';

export const useLastSync = (): number | null => {
  const [lastSync, setLastSync] = useState<number | null>(null);
  useEffect(() => {
    const load = () => void db.metadata.get('lastSuccessfulSync').then((row) => setLastSync(Number(row?.value || 0) || null));
    load();
    window.addEventListener('management:sync-state', load);
    return () => window.removeEventListener('management:sync-state', load);
  }, []);
  return lastSync;
};
