// Derives a deterministic UUID v4 from a string seed.
// Same seed always produces the same UUID. Uses FNV-1a to fill 16 bytes,
// then sets version (4) and variant (RFC 4122) bits.

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash;
}

export function deterministicUuid(seed: string): string {
  // Generate 4 x 32-bit hashes by salting the seed
  const h0 = fnv1a(seed + '\x00');
  const h1 = fnv1a(seed + '\x01');
  const h2 = fnv1a(seed + '\x02');
  const h3 = fnv1a(seed + '\x03');

  const bytes = new Uint8Array(16);
  bytes[0] = (h0 >>> 24) & 0xff;
  bytes[1] = (h0 >>> 16) & 0xff;
  bytes[2] = (h0 >>> 8) & 0xff;
  bytes[3] = h0 & 0xff;
  bytes[4] = (h1 >>> 24) & 0xff;
  bytes[5] = (h1 >>> 16) & 0xff;
  bytes[6] = (h1 >>> 8) & 0xff;
  bytes[7] = h1 & 0xff;
  bytes[8] = (h2 >>> 24) & 0xff;
  bytes[9] = (h2 >>> 16) & 0xff;
  bytes[10] = (h2 >>> 8) & 0xff;
  bytes[11] = h2 & 0xff;
  bytes[12] = (h3 >>> 24) & 0xff;
  bytes[13] = (h3 >>> 16) & 0xff;
  bytes[14] = (h3 >>> 8) & 0xff;
  bytes[15] = h3 & 0xff;

  // Set version 4: byte 6 high nibble = 0100
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant RFC 4122: byte 8 high bits = 10xx
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
