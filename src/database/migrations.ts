import type { CollectionName } from './collections';
import type { BaseEntity } from './schema';

type Row = BaseEntity & Record<string, unknown>;
type Cache = Map<CollectionName, Row[]>;

/**
 * A stored-data transform applied when the on-device schema version is behind
 * the shipped one. Returns the collections it touched so they get re-persisted.
 */
interface Migration {
  to: number;
  describe: string;
  run: (cache: Cache) => CollectionName[];
}

/**
 * Ordered migrations. Version 1 is the initial schema, so there is nothing to
 * transform yet; the list is the mechanism that later changes plug into.
 *
 * Rules for adding one:
 * - never rewrite history destructively; prefer additive fields with defaults
 * - keep each migration total (it must cope with rows written by any prior
 *   version, including partially-migrated ones)
 */
const MIGRATIONS: Migration[] = [];

export function runMigrations(
  cache: Cache,
  fromVersion: number,
  toVersion: number,
): CollectionName[] {
  if (fromVersion >= toVersion) return [];

  const touched = new Set<CollectionName>();

  for (const migration of MIGRATIONS) {
    if (migration.to > fromVersion && migration.to <= toVersion) {
      for (const name of migration.run(cache)) touched.add(name);
    }
  }

  return [...touched];
}
