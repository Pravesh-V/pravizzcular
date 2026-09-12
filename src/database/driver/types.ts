/**
 * Persistence boundary.
 *
 * Everything above this interface (repositories, calculations, UI) is storage
 * agnostic. Swapping AsyncStorage for SQLite or a synced backend means writing
 * one new driver and changing one line of wiring — no domain code changes.
 *
 * The interface is intentionally collection-grained rather than row-grained:
 * the working set for a single user is small enough to hold in memory, and
 * whole-collection writes keep atomicity trivial.
 */
export interface StorageDriver {
  /** Identifies the driver in diagnostics, e.g. 'memory', 'async-storage'. */
  readonly name: string;

  /** Returns [] for an absent collection rather than throwing. */
  read(collection: string): Promise<unknown[]>;

  /** Replaces the collection wholesale. */
  write(collection: string, rows: unknown[]): Promise<void>;

  /** Reads a small non-collection value, e.g. the schema version. */
  readMeta(key: string): Promise<string | null>;

  writeMeta(key: string, value: string): Promise<void>;

  /** Removes every collection and meta key this driver owns. */
  clear(): Promise<void>;
}

export class StorageError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}
