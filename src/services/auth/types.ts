import type { User } from '@/database/schema';

/**
 * Authentication boundary.
 *
 * Phase 1 ships {@link LocalAuthBackend} only: the app is fully usable without
 * an account, which the product brief requires. A Supabase-backed
 * implementation slots in behind this same interface without touching the
 * session layer or any screen.
 *
 * No implementation of this interface may hold a service-role key or any other
 * privileged credential — those live only in server-side code.
 */
export interface AuthBackend {
  readonly name: string;

  /** Whether this backend can create real, credentialed accounts. */
  readonly supportsAccounts: boolean;

  /** Returns the signed-in user, or null if there is no session. */
  getCurrentUser(): Promise<User | null>;

  /** Creates or restores a device-local account with no credentials. */
  signInAnonymously(): Promise<User>;

  signOut(): Promise<void>;
}

export class AuthError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
