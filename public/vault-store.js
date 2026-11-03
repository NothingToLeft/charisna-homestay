import { encryptSnapshot, decryptSnapshot } from './vault-crypto.js';

// Each account has a separate encrypted snapshot. Never persist the password.
export class VaultStore {
  constructor(storage, accountKey) {
    this.storage = storage;
    this.legacyKey = accountKey;
    this.key = `${accountKey}:vault`;
    this.password = null;
    this.queue = Promise.resolve();
    this.pending = 0;
    this.failed = false;
    this.revision = null;
  }
  exists() { return this.storage.getItem(this.key) !== null; }
  async unlock(password, initial, validate = value => value) {
    const raw = this.storage.getItem(this.key);
    if (raw !== null) {
      const data = validate(await decryptSnapshot(JSON.parse(raw), password));
      this.password = password;
      this.revision = raw;
      return data;
    }
    const legacy = this.storage.getItem(this.legacyKey);
    const data = validate(legacy !== null ? JSON.parse(legacy) : initial);
    const encrypted = await encryptSnapshot(data, password);
    await decryptSnapshot(encrypted, password);
    if (this.storage.getItem(this.key) !== null || this.storage.getItem(this.legacyKey) !== legacy) throw Error('Data berubah di tab lain. Muat ulang sebelum melanjutkan.');
    this.revision = JSON.stringify(encrypted);
    this.storage.setItem(this.key, this.revision);
    // Remove plaintext only after the durable encrypted write succeeds.
    this.storage.removeItem(this.legacyKey);
    const oldGlobalKey = 'CHARISNA_HOMESTAY_ENTERPRISE_V6';
    if (legacy !== null && this.storage.getItem(oldGlobalKey) === legacy) this.storage.removeItem(oldGlobalKey);
    this.password = password;
    return data;
  }
  save(data) {
    if (!this.password) return Promise.reject(Error('Buka brankas terlebih dahulu.'));
    const snapshot = JSON.parse(JSON.stringify(data));
    this.pending++;
    const work = this.queue.catch(() => {}).then(async () => {
      const encrypted = await encryptSnapshot(snapshot, this.password);
      if (this.storage.getItem(this.key) !== this.revision) throw Error('Data berubah di tab lain. Ekspor cadangan perubahan ini, lalu muat ulang.');
      const raw = JSON.stringify(encrypted);
      this.storage.setItem(this.key, raw);
      this.revision = raw;
      this.failed = false;
    }).catch(error => { this.failed = true; throw error; }).finally(() => { this.pending--; });
    this.queue = work;
    return work;
  }
  async flush() { await this.queue; }
  async backup(data) { return encryptSnapshot(data, this.password); }
  async readBackup(data, password) { return decryptSnapshot(data, password || this.password); }
}
