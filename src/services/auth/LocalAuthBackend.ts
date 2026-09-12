import type { Database } from '@/database/Database';
import { nowIso } from '@/database/ids';
import type { User } from '@/database/schema';

import type { AuthBackend } from './types';

/**
 * Device-local, credential-free account.
 *
 * Lets someone open the app and start logging immediately — no sign-up wall.
 * The resulting user row is shaped exactly like a server-backed one, so
 * attaching a real account later is a migration of ownership, not of schema.
 */
export class LocalAuthBackend implements AuthBackend {
  readonly name = 'local';
  readonly supportsAccounts = false;

  constructor(private db: Database) {}

  async getCurrentUser(): Promise<User | null> {
    const users = this.db.all('users');
    if (users.length === 0) return null;

    // Most recently seen wins; there is normally exactly one local user.
    const sorted = [...users].sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
    return sorted[0] ?? null;
  }

  async signInAnonymously(): Promise<User> {
    const existing = await this.getCurrentUser();
    if (existing) {
      return this.db.update('users', existing.id, { lastSeenAt: nowIso() }) ?? existing;
    }

    return this.db.insert('users', {
      email: null,
      isAnonymous: true,
      lastSeenAt: nowIso(),
    });
  }

  async signOut(): Promise<void> {
    // A local account has no remote session to end. Data is deliberately kept:
    // clearing it is an explicit "delete my data" action, never a side effect.
  }
}
