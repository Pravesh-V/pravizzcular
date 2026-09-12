import AsyncStorage from '@react-native-async-storage/async-storage';

import { StorageError, type StorageDriver } from './types';

const PREFIX = 'pravesh:v1:';
const META_PREFIX = `${PREFIX}meta:`;
const COLLECTION_PREFIX = `${PREFIX}col:`;

/**
 * Default driver on device and on web.
 *
 * Known ceiling: Android's default AsyncStorage backend caps total size at
 * roughly 6 MB. A heavy user logs on the order of 10k rows per year, which
 * stays well inside that, but sustained multi-year use is the trigger to move
 * to a SQLite driver. Nothing above this file changes when that happens.
 */
export class AsyncStorageDriver implements StorageDriver {
  readonly name = 'async-storage';

  async read(collection: string): Promise<unknown[]> {
    try {
      const raw = await AsyncStorage.getItem(COLLECTION_PREFIX + collection);
      if (!raw) return [];

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        // Corrupt or hand-edited value: treat as empty rather than crashing the
        // app on launch. The collection is rewritten on the next save.
        console.warn(`[storage] collection "${collection}" was not an array; ignoring`);
        return [];
      }
      return parsed;
    } catch (cause) {
      throw new StorageError(`Failed to read collection "${collection}"`, cause);
    }
  }

  async write(collection: string, rows: unknown[]): Promise<void> {
    try {
      await AsyncStorage.setItem(COLLECTION_PREFIX + collection, JSON.stringify(rows));
    } catch (cause) {
      throw new StorageError(`Failed to write collection "${collection}"`, cause);
    }
  }

  async readMeta(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(META_PREFIX + key);
    } catch (cause) {
      throw new StorageError(`Failed to read meta "${key}"`, cause);
    }
  }

  async writeMeta(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(META_PREFIX + key, value);
    } catch (cause) {
      throw new StorageError(`Failed to write meta "${key}"`, cause);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const owned = keys.filter((k) => k.startsWith(PREFIX));
      if (owned.length > 0) await AsyncStorage.multiRemove(owned);
    } catch (cause) {
      throw new StorageError('Failed to clear storage', cause);
    }
  }
}
