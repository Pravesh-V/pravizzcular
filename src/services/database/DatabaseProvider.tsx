import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { Database } from '@/database/Database';
import { AsyncStorageDriver } from '@/database/driver/AsyncStorageDriver';
import { MemoryDriver } from '@/database/driver/MemoryDriver';
import type { StorageDriver } from '@/database/driver/types';

type Status = 'loading' | 'ready' | 'error';

interface DatabaseContextValue {
  db: Database;
  status: Status;
  error: Error | null;
  retry: () => void;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

interface DatabaseProviderProps {
  children: ReactNode;
  /** Injected by tests; production uses AsyncStorage. */
  driver?: StorageDriver;
  /**
   * Runs once after a successful init — used to seed a brand-new install.
   * Must be stable (wrap in useCallback), since a new identity re-runs init.
   */
  onReady?: (db: Database) => Promise<void> | void;
}

export function DatabaseProvider({ children, driver, onReady }: DatabaseProviderProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const db = useMemo(() => new Database(driver ?? createDefaultDriver()), [driver]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await db.init();
        await onReady?.(db);
        if (!cancelled) setStatus('ready');
      } catch (cause) {
        if (cancelled) return;
        // Technical detail stays in the log; the UI shows a human message.
        console.error('[database] initialisation failed', cause);
        setError(cause instanceof Error ? cause : new Error(String(cause)));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [db, attempt, onReady]);

  const retry = useCallback(() => {
    setStatus('loading');
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<DatabaseContextValue>(
    () => ({ db, status, error, retry }),
    [db, status, error, retry],
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

function createDefaultDriver(): StorageDriver {
  try {
    return new AsyncStorageDriver();
  } catch (cause) {
    // Never let storage construction take the app down; degrade to in-memory
    // so the session still works, unsaved.
    console.error('[database] falling back to in-memory storage', cause);
    return new MemoryDriver();
  }
}

export function useDatabaseContext(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext);
  if (!ctx) throw new Error('useDatabase must be used inside <DatabaseProvider>');
  return ctx;
}

export function useDatabase(): Database {
  return useDatabaseContext().db;
}

/**
 * Re-runs `selector` whenever stored data changes.
 *
 * The selector is evaluated on every render rather than memoised. For this
 * app's working set (thousands of rows at most) that costs nothing measurable,
 * and it removes the stale-closure bugs that a dependency array invites.
 */
export function useLiveQuery<T>(selector: (db: Database) => T): T {
  const { db } = useDatabaseContext();
  const [, bump] = useState(0);

  useEffect(() => db.subscribe(() => bump((v) => v + 1)), [db]);

  return selector(db);
}
