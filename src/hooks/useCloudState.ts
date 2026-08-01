import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { SyncReport } from '../core/types';
import { subscribeToAuth } from '../services/firebaseService';
import type { SyncState } from '../services/syncService';

interface CloudState {
  user: User | null;
  authLoading: boolean;
  syncState: SyncState;
  lastReport: SyncReport | null;
  message: string;
}

export const useCloudState = (): CloudState => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [lastReport, setLastReport] = useState<SyncReport | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToAuth((nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
    const syncListener = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        state: SyncState;
        report?: SyncReport;
        message?: string;
      };
      setSyncState(detail.state);
      setLastReport(detail.report ?? null);
      setMessage(detail.message ?? '');
    };
    window.addEventListener('management:sync-state', syncListener);
    return () => {
      unsubscribe();
      window.removeEventListener('management:sync-state', syncListener);
    };
  }, []);

  return { user, authLoading, syncState, lastReport, message };
};
