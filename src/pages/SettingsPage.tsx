import { Cloud, DatabaseBackup, Download, KeyRound, LogIn, LogOut, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FirebaseRuntimeConfig } from '../core/types';
import { Button } from '../components/Button';
import { PageHeader } from '../components/PageHeader';
import { useCloudState } from '../hooks/useCloudState';
import { useLastSync } from '../hooks/useLastSync';
import {
  changeCloudPassword,
  getSavedFirebaseConfig,
  isFirebaseConfigComplete,
  loginWithEmail,
  logoutCloud,
  registerWithEmail,
  removeFirebaseConfig,
  requestPasswordReset,
  saveFirebaseConfig
} from '../services/firebaseService';
import { clearAllLocalData, exportAllCsv, exportBackup, importBackup, readBackupFile } from '../services/backupService';
import { isAutoSyncEnabled, setAutoSyncEnabled, synchronizeNow } from '../services/syncService';
import { formatDate } from '../core/format';

const emptyConfig: FirebaseRuntimeConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
  storageBucket: '',
  messagingSenderId: ''
};

export function SettingsPage() {
  const cloud = useCloudState();
  const lastSync = useLastSync();
  const [config, setConfig] = useState<FirebaseRuntimeConfig>(() => getSavedFirebaseConfig() ?? emptyConfig);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [autoSync, setAutoSync] = useState(isAutoSyncEnabled());
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (cloud.user?.email) setEmail(cloud.user.email);
  }, [cloud.user]);

  const execute = async (name: string, action: () => Promise<void>, success: string) => {
    setBusy(name);
    setNotice(null);
    try {
      await action();
      setNotice({ tone: 'success', text: success });
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy('');
    }
  };

  const updateConfig = (key: keyof FirebaseRuntimeConfig, value: string) => setConfig((current) => ({ ...current, [key]: value }));

  return (
    <>
      <PageHeader title="Pengaturan" subtitle="Cloud, keamanan akun, sinkronisasi, backup, dan pemulihan data." />
      {notice && <div className={`notice notice--${notice.tone}`}>{notice.text}</div>}

      <div className="settings-grid">
        <section className="surface settings-card settings-card--wide">
          <div className="settings-card__header"><span><Cloud /></span><div><h2>Konfigurasi Firebase Spark</h2><p>Disimpan hanya di perangkat ini dan tidak dimasukkan ke source code.</p></div></div>
          <div className="form-grid">
            <label className="form-field"><span>API Key *</span><input value={config.apiKey} onChange={(event) => updateConfig('apiKey', event.target.value)} placeholder="AIza..." /></label>
            <label className="form-field"><span>Project ID *</span><input value={config.projectId} onChange={(event) => updateConfig('projectId', event.target.value)} placeholder="nama-project" /></label>
            <label className="form-field"><span>Auth Domain *</span><input value={config.authDomain} onChange={(event) => updateConfig('authDomain', event.target.value)} placeholder="nama-project.firebaseapp.com" /></label>
            <label className="form-field"><span>App ID *</span><input value={config.appId} onChange={(event) => updateConfig('appId', event.target.value)} placeholder="1:...:web:..." /></label>
            <label className="form-field"><span>Storage Bucket</span><input value={config.storageBucket ?? ''} onChange={(event) => updateConfig('storageBucket', event.target.value)} /></label>
            <label className="form-field"><span>Messaging Sender ID</span><input value={config.messagingSenderId ?? ''} onChange={(event) => updateConfig('messagingSenderId', event.target.value)} /></label>
          </div>
          <div className="settings-actions">
            <Button icon={<Save size={18} />} disabled={!isFirebaseConfigComplete(config) || busy === 'save-config'} onClick={() => void execute('save-config', () => saveFirebaseConfig(config), 'Konfigurasi tersimpan. Muat ulang halaman bila status cloud belum berubah.')}>{busy === 'save-config' ? 'Menyimpan...' : 'Simpan konfigurasi'}</Button>
            <Button variant="danger" onClick={() => void execute('remove-config', async () => { await logoutCloud(); await removeFirebaseConfig(); setConfig(emptyConfig); }, 'Konfigurasi cloud dihapus dari perangkat ini.')}>Hapus konfigurasi</Button>
          </div>
        </section>

        <section className="surface settings-card">
          <div className="settings-card__header"><span><LogIn /></span><div><h2>Akun cloud</h2><p>{cloud.user ? `Terhubung sebagai ${cloud.user.email}` : 'Masuk atau buat akun dengan Email/Password.'}</p></div></div>
          {!cloud.user ? (
            <div className="stack-form">
              <label className="form-field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
              <label className="form-field"><span>Password</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} /></label>
              <div className="settings-actions">
                <Button disabled={busy === 'login'} onClick={() => void execute('login', async () => { await loginWithEmail(email, password); setPassword(''); }, 'Berhasil masuk ke cloud.')}>Masuk</Button>
                <Button variant="secondary" disabled={busy === 'register'} onClick={() => void execute('register', async () => { await registerWithEmail(email, password); setPassword(''); }, 'Akun dibuat dan perangkat terhubung.')}>Buat akun</Button>
              </div>
              <button className="text-button" onClick={() => void execute('reset-password', () => requestPasswordReset(email), 'Email pengaturan ulang password telah dikirim.')}>Lupa password? Kirim email reset</button>
            </div>
          ) : (
            <div className="stack-form">
              <div className="account-box"><strong>{cloud.user.email}</strong><small>UID: {cloud.user.uid}</small></div>
              <Button variant="secondary" icon={<LogOut size={18} />} onClick={() => void execute('logout', logoutCloud, 'Akun cloud telah keluar. Data lokal tetap tersedia.')}>Keluar akun cloud</Button>
            </div>
          )}
        </section>

        <section className="surface settings-card">
          <div className="settings-card__header"><span><KeyRound /></span><div><h2>Ganti password</h2><p>Password baru otomatis berlaku setelah berhasil disimpan oleh Firebase Authentication.</p></div></div>
          <div className="stack-form">
            <label className="form-field"><span>Password saat ini</span><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
            <label className="form-field"><span>Password baru</span><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} /></label>
            <Button disabled={!cloud.user || newPassword.length < 6 || busy === 'change-password'} onClick={() => void execute('change-password', async () => { await changeCloudPassword(currentPassword, newPassword); setCurrentPassword(''); setNewPassword(''); }, 'Password cloud berhasil diubah.')}>Simpan password baru</Button>
          </div>
        </section>

        <section className="surface settings-card">
          <div className="settings-card__header"><span><RefreshCw /></span><div><h2>Sinkronisasi</h2><p>Perubahan selalu disimpan lokal lebih dahulu lalu dikirim ketika online.</p></div></div>
          <label className="toggle-row"><div><strong>Sinkronisasi otomatis</strong><small>Periksa perubahan setiap 30 detik saat online.</small></div><input type="checkbox" checked={autoSync} onChange={(event) => { setAutoSync(event.target.checked); setAutoSyncEnabled(event.target.checked); }} /></label>
          <div className="sync-summary"><span>Status</span><strong>{cloud.syncState === 'syncing' ? 'Menyinkronkan' : cloud.user ? 'Siap' : 'Belum masuk'}</strong></div>
          <div className="sync-summary"><span>Sinkron terakhir</span><strong>{lastSync ? formatDate(lastSync) : 'Belum pernah'}</strong></div>
          <Button icon={<RefreshCw size={18} />} disabled={!cloud.user || cloud.syncState === 'syncing'} onClick={() => void execute('sync', async () => { const report = await synchronizeNow(); if (report.errors.length) throw new Error(report.errors[0]); }, 'Sinkronisasi selesai.')}>Sinkronkan sekarang</Button>
        </section>

        <section className="surface settings-card settings-card--wide">
          <div className="settings-card__header"><span><DatabaseBackup /></span><div><h2>Backup dan export</h2><p>Backup JSON berisi seluruh data dan dapat diimpor kembali. CSV cocok untuk spreadsheet.</p></div></div>
          <div className="backup-actions">
            <Button icon={<Download size={18} />} onClick={() => void execute('backup', exportBackup, 'Backup JSON berhasil dibuat.')}>Backup JSON</Button>
            <Button variant="secondary" icon={<Download size={18} />} onClick={() => void execute('csv', exportAllCsv, 'Export CSV berhasil dibuat.')}>Export CSV</Button>
            <Button variant="secondary" icon={<Upload size={18} />} onClick={() => void execute('import', async () => {
              const content = await readBackupFile();
              if (!content) return;
              const replace = window.confirm('Pilih OK untuk mengganti seluruh data lokal. Pilih Batal untuk menggabungkan backup dengan data saat ini.');
              await importBackup(content, replace);
            }, 'Backup berhasil diimpor.')}>Import backup</Button>
          </div>
        </section>

        <section className="surface settings-card settings-card--danger settings-card--wide">
          <div className="settings-card__header"><span><Trash2 /></span><div><h2>Hapus data lokal</h2><p>Tindakan ini tidak otomatis menghapus data yang sudah ada di cloud.</p></div></div>
          <Button variant="danger" onClick={() => {
            if (!window.confirm('Semua data lokal akan dihapus permanen. Buat backup terlebih dahulu. Lanjutkan?')) return;
            void execute('clear', clearAllLocalData, 'Semua data lokal telah dihapus.');
          }}>Hapus seluruh data lokal</Button>
        </section>
      </div>
    </>
  );
}
