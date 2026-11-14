/** Verify magic bytes as well as the client-supplied MIME type. */
export function isPaymentProof(bytes: Uint8Array, type: string): boolean {
  const starts = (signature: number[]) => signature.every((byte, i) => bytes[i] === byte);
  if (type === 'application/pdf') return starts([0x25, 0x50, 0x44, 0x46, 0x2d]);
  if (type === 'image/jpeg') return starts([0xff, 0xd8, 0xff]);
  if (type === 'image/png') return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (type === 'image/webp') return starts([0x52, 0x49, 0x46, 0x46]) && [0x57, 0x45, 0x42, 0x50].every((b, i) => bytes[i + 8] === b);
  return false;
}
