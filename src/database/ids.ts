/**
 * Client-generated identifiers.
 *
 * IDs are minted on the device so an offline write is immediately complete and
 * never needs renumbering when it eventually syncs. UUID v4 keeps collisions
 * negligible across devices.
 */

function randomHex(bytes: number): string {
  const globalCrypto = globalThis.crypto as Crypto | undefined;

  if (globalCrypto?.getRandomValues) {
    const array = new Uint8Array(bytes);
    globalCrypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Math.random fallback for environments without WebCrypto. Acceptable here
  // because IDs are opaque identifiers, never secrets or security tokens.
  let out = '';
  for (let i = 0; i < bytes; i += 1) {
    out += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  }
  return out;
}

export function newId(): string {
  const globalCrypto = globalThis.crypto as Crypto | undefined;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID();

  const hex = randomHex(16).split('');
  // Set version (4) and variant (10xx) bits per RFC 4122.
  hex[12] = '4';
  const variant = parseInt(hex[16] ?? '0', 16);
  hex[16] = ((variant & 0x3) | 0x8).toString(16);

  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
