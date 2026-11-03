import { describe, it, expect } from 'vitest';
import { VaultStore } from '../public/vault-store.js';
import { encryptSnapshot, decryptSnapshot } from '../public/vault-crypto.js';

const password = 'TEST-ONLY-not-a-real-secret';
const sample = { rooms: [], tenants: [{ name: 'Synthetic Tenant' }], bills: [] };
class Storage {
  values = new Map();
  fail = false;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.fail) throw Error('QuotaExceeded'); this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}
describe('encrypted local storage', () => {
  it('migrates plaintext only after a successful encrypted write and unlocks after restart', async () => {
    const storage = new Storage(); storage.setItem('owner', JSON.stringify(sample));
    const vault = new VaultStore(storage, 'owner');
    expect(await vault.unlock(password, {})).toEqual(sample);
    expect(storage.getItem('owner')).toBeNull();
    expect(storage.getItem(vault.key)).not.toContain('Synthetic Tenant');
    expect(await new VaultStore(storage, 'owner').unlock(password, {})).toEqual(sample);
  });
  it('preserves original plaintext if encryption cannot be persisted', async () => {
    const storage = new Storage(); storage.setItem('owner', JSON.stringify(sample)); storage.fail = true;
    await expect(new VaultStore(storage, 'owner').unlock(password, {})).rejects.toThrow('QuotaExceeded');
    expect(JSON.parse(storage.getItem('owner'))).toEqual(sample);
  });
  it('rejects wrong passwords and tampered ciphertext without modifying storage', async () => {
    const encrypted = await encryptSnapshot(sample, password);
    await expect(decryptSnapshot(encrypted, 'wrong-password-value')).rejects.toThrow();
    encrypted.data = (encrypted.data[0] === 'A' ? 'B' : 'A') + encrypted.data.slice(1);
    await expect(decryptSnapshot(encrypted, password)).rejects.toThrow();
  });
  it('serializes rapid saves, isolates accounts, and recovers from a failed write', async () => {
    const storage = new Storage(); const vault = new VaultStore(storage, 'owner');
    await vault.unlock(password, sample);
    await Promise.all([vault.save({ n: 1 }), vault.save({ n: 2 }), vault.save({ n: 3 })]);
    expect(await new VaultStore(storage, 'owner').unlock(password, {})).toEqual({ n: 3 });
    expect(new VaultStore(storage, 'other').exists()).toBe(false);
    storage.fail = true; await expect(vault.save({ n: 4 })).rejects.toThrow();
    expect(vault.failed).toBe(true);
    // Backup remains available even when storage is full.
    expect(await decryptSnapshot(await vault.backup({ n: 4 }), password)).toEqual({ n: 4 });
    storage.fail = false; await vault.save({ n: 5 });
    expect(vault.failed).toBe(false); expect(vault.pending).toBe(0);
  });
});
