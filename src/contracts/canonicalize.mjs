export function canonicalize(x) {
  if (x === null || typeof x === 'boolean' || typeof x === 'string') return JSON.stringify(x);
  if (typeof x === 'number') { if (!Number.isSafeInteger(x)) throw Error('UNSAFE_NUMBER'); return JSON.stringify(x); }
  if (Array.isArray(x)) return '[' + x.map(canonicalize).join(',') + ']';
  if (x && typeof x === 'object') return '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + canonicalize(x[k])).join(',') + '}';
  throw Error('NON_CANONICAL_VALUE');
}
export function digestPayload(suite) {
  const copy=JSON.parse(JSON.stringify(suite));
  delete copy.manifest.contentSha256;
  return canonicalize(copy);
}
export async function digest(suite) {
  const bytes=new TextEncoder().encode(digestPayload(suite));
  const result=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(result),n=>n.toString(16).padStart(2,'0')).join('');
}
