import type { StorageDriver } from './types';

/** Non-persistent driver. Used by tests and as a safe fallback. */
export class MemoryDriver implements StorageDriver {
  readonly name = 'memory';

  private collections = new Map<string, unknown[]>();
  private meta = new Map<string, string>();

  async read(collection: string): Promise<unknown[]> {
    // Return a copy so callers cannot mutate stored state by reference.
    return [...(this.collections.get(collection) ?? [])];
  }

  async write(collection: string, rows: unknown[]): Promise<void> {
    this.collections.set(collection, [...rows]);
  }

  async readMeta(key: string): Promise<string | null> {
    return this.meta.get(key) ?? null;
  }

  async writeMeta(key: string, value: string): Promise<void> {
    this.meta.set(key, value);
  }

  async clear(): Promise<void> {
    this.collections.clear();
    this.meta.clear();
  }
}
