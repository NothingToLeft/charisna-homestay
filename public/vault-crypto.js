// Portable encrypted snapshot format. Passwords and keys are never persisted.
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const iterations = 600000;
function encode(bytes) {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}
function decode(text) {
  if (typeof text !== 'string' || text.length > 40000000) throw Error('Format brankas tidak valid.');
  return Uint8Array.from(atob(text), char => char.charCodeAt(0));
}
async function derive(password, salt) {
  if (typeof password !== 'string' || password.length < 12) throw Error('Gunakan kata sandi minimal 12 karakter.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptSnapshot(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv,
    additionalData: encoder.encode('CHARISNA_VAULT_V1') }, key, encoder.encode(JSON.stringify(data)));
  return { format: 'CHARISNA_VAULT', version: 1, iterations, salt: encode(salt), iv: encode(iv), data: encode(new Uint8Array(ciphertext)) };
}
export async function decryptSnapshot(envelope, password) {
  if (envelope?.format !== 'CHARISNA_VAULT' || envelope.version !== 1 || envelope.iterations !== iterations) throw Error('Versi brankas tidak didukung.');
  const salt = decode(envelope.salt);
  const iv = decode(envelope.iv);
  if (salt.length !== 16 || iv.length !== 12) throw Error('Format brankas tidak valid.');
  const key = await derive(password, salt);
  try {
    const cleartext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv,
      additionalData: encoder.encode('CHARISNA_VAULT_V1') }, key, decode(envelope.data));
    return JSON.parse(decoder.decode(cleartext));
  } catch { throw Error('Kata sandi salah atau brankas rusak. Data tidak diubah.'); }
}
