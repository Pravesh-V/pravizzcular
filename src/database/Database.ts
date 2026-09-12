import {
  COLLECTION_NAMES,
  SCHEMA_VERSION,
  type CollectionMap,
  type CollectionName,
} from './collections';
import type { StorageDriver } from './driver/types';
import { newId, nowIso } from './ids';
import { runMigrations } from './migrations';
import type { BaseEntity, ID } from './schema';

type Row = BaseEntity & Record<string, unknown>;

/**
 * In-memory working set over a {@link StorageDriver}.
 *
 * Reads are synchronous against the cache, which is what lets the UI render
 * without awaiting storage on every frame. Writes update the cache immediately
 * (so the interface never blocks on a log) and persist on a short debounce.
 *
 * Offline is the default path, not a fallback: nothing here touches the network.
 */
export class Database {
  private cache = new Map<CollectionName, Row[]>();
  private dirty = new Set<CollectionName>();
  private listeners = new Set<() => void>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushInFlight: Promise<void> | null = null;
  private ready = false;

  /** Debounce window for persisting dirty collections. */
  private static readonly FLUSH_DELAY_MS = 120;

  constructor(private driver: StorageDriver) {}

  get isReady(): boolean {
    return this.ready;
  }

  get driverName(): string {
    return this.driver.name;
  }

  async init(): Promise<void> {
    if (this.ready) return;

    for (const name of COLLECTION_NAMES) {
      const rows = (await this.driver.read(name)) as Row[];
      this.cache.set(name, rows);
    }

    const storedVersion = Number((await this.driver.readMeta('schema_version')) ?? '0');
    if (storedVersion !== SCHEMA_VERSION) {
      const changed = runMigrations(this.cache, storedVersion, SCHEMA_VERSION);
      for (const name of changed) this.dirty.add(name);
      await this.driver.writeMeta('schema_version', String(SCHEMA_VERSION));
    }

    this.ready = true;
    if (this.dirty.size > 0) await this.flush();
  }

  // --- Reads (synchronous, against the cache) -----------------------------

  /** Live rows only — soft-deleted entities are filtered out. */
  all<K extends CollectionName>(name: K): CollectionMap[K][] {
    const rows = (this.cache.get(name) ?? []) as unknown as CollectionMap[K][];
    return rows.filter((r) => (r as BaseEntity).deletedAt === null);
  }

  /** Includes soft-deleted rows. For sync, audit and export paths only. */
  allIncludingDeleted<K extends CollectionName>(name: K): CollectionMap[K][] {
    return (this.cache.get(name) ?? []) as unknown as CollectionMap[K][];
  }

  find<K extends CollectionName>(name: K, id: ID): CollectionMap[K] | undefined {
    return this.all(name).find((r) => (r as BaseEntity).id === id);
  }

  where<K extends CollectionName>(
    name: K,
    predicate: (row: CollectionMap[K]) => boolean,
  ): CollectionMap[K][] {
    return this.all(name).filter(predicate);
  }

  // --- Writes -------------------------------------------------------------

  /**
   * Inserts a row, filling in id/createdAt/updatedAt/deletedAt. Callers supply
   * only the domain fields.
   */
  /**
   * Writing before {@link init} completes is always a bug: init replaces the
   * cache with what was loaded from storage, so earlier writes vanish without
   * a trace. Fail loudly rather than lose data silently.
   */
  private assertReady(operation: string): void {
    if (!this.ready) {
      throw new Error(
        `Database.${operation} called before init() completed. Wait for the ready status.`,
      );
    }
  }

  insert<K extends CollectionName>(
    name: K,
    data: Omit<CollectionMap[K], keyof BaseEntity> & Partial<BaseEntity>,
  ): CollectionMap[K] {
    this.assertReady('insert');
    const ts = nowIso();
    const row = {
      id: newId(),
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
      ...data,
    } as unknown as Row;

    const rows = this.cache.get(name) ?? [];
    rows.push(row);
    this.cache.set(name, rows);
    this.markDirty(name);

    return row as unknown as CollectionMap[K];
  }

  insertMany<K extends CollectionName>(
    name: K,
    items: (Omit<CollectionMap[K], keyof BaseEntity> & Partial<BaseEntity>)[],
  ): CollectionMap[K][] {
    return items.map((item) => this.insert(name, item));
  }

  update<K extends CollectionName>(
    name: K,
    id: ID,
    patch: Partial<Omit<CollectionMap[K], keyof BaseEntity>>,
  ): CollectionMap[K] | undefined {
    this.assertReady('update');
    const rows = this.cache.get(name) ?? [];
    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) return undefined;

    const existing = rows[index] as Row;
    const next = { ...existing, ...patch, updatedAt: nowIso() } as Row;
    rows[index] = next;
    this.markDirty(name);

    return next as unknown as CollectionMap[K];
  }

  /** Soft delete. The row stays for history and export. */
  softDelete(name: CollectionName, id: ID): boolean {
    const rows = this.cache.get(name) ?? [];
    const index = rows.findIndex((r) => r.id === id);
    if (index === -1) return false;

    const existing = rows[index] as Row;
    rows[index] = { ...existing, deletedAt: nowIso(), updatedAt: nowIso() };
    this.markDirty(name);
    return true;
  }

  /** Irreversible. Used by "delete my data" and demo-data reset. */
  hardDelete(name: CollectionName, predicate: (row: BaseEntity) => boolean): number {
    const rows = this.cache.get(name) ?? [];
    const kept = rows.filter((r) => !predicate(r));
    const removed = rows.length - kept.length;
    if (removed > 0) {
      this.cache.set(name, kept);
      this.markDirty(name);
    }
    return removed;
  }

  async clearAll(): Promise<void> {
    for (const name of COLLECTION_NAMES) this.cache.set(name, []);
    await this.driver.clear();
    await this.driver.writeMeta('schema_version', String(SCHEMA_VERSION));
    this.dirty.clear();
    this.emit();
  }

  // --- Persistence --------------------------------------------------------

  private markDirty(name: CollectionName): void {
    this.dirty.add(name);
    this.emit();
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, Database.FLUSH_DELAY_MS);
  }

  /** Persists every dirty collection. Safe to await before backgrounding. */
  async flush(): Promise<void> {
    if (this.flushInFlight) {
      await this.flushInFlight;
      if (this.dirty.size === 0) return;
    }

    const run = (async () => {
      while (this.dirty.size > 0) {
        const pending = [...this.dirty];
        this.dirty.clear();

        for (const name of pending) {
          try {
            await this.driver.write(name, this.cache.get(name) ?? []);
          } catch (error) {
            // Re-queue so the data is not lost; surfaced to the user by the
            // caller that awaited flush, not by crashing a logging interaction.
            this.dirty.add(name);
            console.error('[storage] flush failed for', name, error);
            throw error;
          }
        }
      }
    })();

    this.flushInFlight = run;
    try {
      await run;
    } finally {
      this.flushInFlight = null;
    }
  }

  // --- Reactivity ---------------------------------------------------------

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
