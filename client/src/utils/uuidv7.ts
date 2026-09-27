/**
 * Generates an RFC 9562 compliant UUID version 7.
 * Combines 48-bit Unix timestamp (milliseconds) with version 7, variant 10,
 * and cryptographically secure random entropy.
 *
 * Format: 018d45ef-xxxx-7xxx-8xxx-xxxxxxxxxxxx
 */
export function uuidv7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  const now = BigInt(Date.now());

  // 48-bit timestamp (bytes 0 to 5)
  bytes[0] = Number((now >> 40n) & 0xffn);
  bytes[1] = Number((now >> 32n) & 0xffn);
  bytes[2] = Number((now >> 24n) & 0xffn);
  bytes[3] = Number((now >> 16n) & 0xffn);
  bytes[4] = Number((now >> 8n) & 0xffn);
  bytes[5] = Number(now & 0xffn);

  // Version 7 (0111xxxx in byte 6)
  bytes[6] = 0x70 | (bytes[6] & 0x0f);

  // Variant 1 (10xxxxxx in byte 8)
  bytes[8] = 0x80 | (bytes[8] & 0x3f);

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
