import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { OWNER_EMAIL, resolveRole, setupOwnerManager, renderCleanerPortal } from './roles.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCXu5b6BKVKYczMTIL8Nc-MuLvLQdiQXtI',
  authDomain: 'charisna-kost-manager.firebaseapp.com',
  projectId: 'charisna-kost-manager',
  storageBucket: 'charisna-kost-manager.firebasestorage.app',
  messagingSenderId: '307208439143',
  appId: '1:307208439143:web:ba437f97b3f3cee0c65bc2'
};
const DATA_PREFIX = 'CHARISNA_HOMESTAY_ENTERPRISE_V6'; // Kept for migration from the prior local version.
const ACTIVE_UID_KEY = 'CHARISNA_ACTIVE_UID';
const gate = document.getElementById('auth-gate');
const error = document.getElementById('auth-error');
const loginForm = document.getElementById('auth-form');
const loginButton = document.getElementById('auth-submit');
const roleSelect = document.getElementById('auth-role');
const registerButton = document.getElementById('auth-register');
const pendingSignout = document.getElementById('auth-signout-pending');
const refreshRole = document.getElementById('auth-refresh-role');
const auth = getAuth(initializeApp(firebaseConfig));
const db = getFirestore(auth.app);
let user = null;
let verifiedRole = null;
let authRevision = 0;
const dataKey = () => `${DATA_PREFIX}:${user.uid}`;
const showError = (message) => { error.textContent = message; };
window.CHARISNA_AUTH_READY = true;

const status = document.createElement('div');
status.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:9999;background:#064e3b;color:white;padding:10px;border-radius:10px;max-width:330px;font:13px sans-serif';
status.textContent = 'Cloud: menunggu login';
document.body.append(status);
const panel = document.createElement('dialog');
panel.style.cssText = 'border:0;border-radius:12px;padding:20px;max-width:420px;width:90%;box-shadow:0 10px 40px #0005;font:14px sans-serif';
panel.innerHTML = `<h2 style="font-weight:bold;font-size:18px">Cloud CHARISNA KOST</h2><p>Data owner disimpan di perangkat ini. Pilih unggah atau unduh untuk memindahkan snapshot.</p><p id="cloud-message" role="status" style="min-height:20px"></p><div style="display:flex;flex-wrap:wrap;gap:6px"><button id="cloud-upload">Unggah lokal</button><button id="cloud-download">Unduh cloud</button><button id="cloud-logout">Keluar akun</button><button id="cloud-close">Tutup</button></div>`;
document.body.append(panel);
for (const button of panel.querySelectorAll('button')) button.style.cssText = 'padding:8px;background:#059669;color:white;border-radius:6px';
const openButton = document.createElement('button');
openButton.textContent = 'Cloud & Akun';
openButton.style.cssText = 'position:fixed;bottom:54px;right:12px;z-index:9999;background:#047857;color:white;padding:10px 16px;border-radius:10px';
openButton.onclick = () => panel.showModal();
document.body.append(openButton);
panel.querySelector('#cloud-close').onclick = () => panel.close();
const message = (text) => { panel.querySelector('#cloud-message').textContent = text; status.textContent = `Cloud: ${text}`; };
const showLogin = () => {
  gate.hidden = false; loginForm.hidden = false; pendingSignout.hidden = true; refreshRole.hidden = true;
  document.body.classList.remove('cleaner-mode');
  document.body.classList.add('auth-locked');
};
async function ensureStaffRequest(account) {
  const ref = doc(db, 'staffRequests', account.uid);
  if (!(await getDoc(ref)).exists()) {
    try { await setDoc(ref, { email: account.email, ownerEmail: OWNER_EMAIL, createdAt: new Date().toISOString() }); }
    catch (requestError) { if (!(await getDoc(ref)).exists()) throw requestError; }
  }
}
async function handleAccount(account, revision = ++authRevision) {
  user = account; verifiedRole = null;
  const activeUid = sessionStorage.getItem(ACTIVE_UID_KEY);
  if (!account) {
    if (activeUid) { sessionStorage.removeItem(ACTIVE_UID_KEY); location.reload(); return; }
    showLogin(); showError(''); return;
  }
  let resolved;
  try { resolved = await resolveRole(db, account); }
  catch (roleError) {
    showLogin(); showError(`Gagal memeriksa peran: ${roleError.message}`); return;
  }
  if (revision !== authRevision || auth.currentUser?.uid !== account.uid) return;
  verifiedRole = resolved.role;
  if (resolved.role === 'PENDING') {
    sessionStorage.removeItem(ACTIVE_UID_KEY);
    document.body.classList.remove('cleaner-mode');
    document.body.classList.add('auth-locked');
    gate.hidden = false; loginForm.hidden = true; pendingSignout.hidden = false; refreshRole.hidden = false;
    try { await ensureStaffRequest(account); showError('Akun petugas menunggu persetujuan owner. Muat ulang setelah disetujui.'); }
    catch (requestError) { showError(`Permintaan akses gagal: ${requestError.message}`); }
    return;
  }
  if (resolved.role === 'CLEANER') {
    sessionStorage.removeItem(ACTIVE_UID_KEY);
    gate.hidden = true;
    document.body.classList.remove('auth-locked');
    document.body.classList.add('cleaner-mode');
    renderCleanerPortal({ db, account, ownerUid: resolved.ownerUid, onLogout: () => signOut(auth) });
    return;
  }
  if (activeUid !== account.uid) {
    const accountKey = `${DATA_PREFIX}:${account.uid}`;
    const oldData = localStorage.getItem(DATA_PREFIX);
    if (!localStorage.getItem(accountKey) && oldData && confirm('Data lama ditemukan. Salin ke akun owner?')) localStorage.setItem(accountKey, oldData);
    sessionStorage.setItem(ACTIVE_UID_KEY, account.uid);
    location.reload(); return;
  }
  gate.hidden = true;
  document.body.classList.remove('auth-locked', 'cleaner-mode');
  message(`Masuk: ${account.email}`);
  setupOwnerManager({ db, account, onMessage: message });
}
onAuthStateChanged(auth, (account) => { const revision = ++authRevision; void handleAccount(account, revision); }, (authError) => showError(`Login tidak tersedia: ${authError.message}`));
roleSelect.onchange = () => { registerButton.hidden = roleSelect.value !== 'CLEANER'; };
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  if (roleSelect.value === 'OWNER' && email !== OWNER_EMAIL) return showError('Akun pemilik tidak cocok. Pilih Petugas kebersihan bila Anda petugas.');
  if (roleSelect.value === 'CLEANER' && email === OWNER_EMAIL) return showError('Akun owner harus masuk sebagai Pemilik.');
  loginButton.disabled = true; showError('Memeriksa akun...');
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, document.getElementById('auth-password').value);
    document.getElementById('auth-password').value = '';
  } catch (loginError) {
    showError(loginError.code === 'auth/invalid-credential' ? 'Email atau password salah.' : `Gagal masuk: ${loginError.message}`);
  } finally { loginButton.disabled = false; }
});
registerButton.onclick = async () => {
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value;
  if (roleSelect.value !== 'CLEANER' || !email || email === OWNER_EMAIL || password.length < 8) return showError('Pilih Petugas kebersihan, isi email lain, dan password minimal 8 karakter.');
  registerButton.disabled = true; showError('Mendaftarkan akun...');
  try {
    await setPersistence(auth, browserLocalPersistence);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await ensureStaffRequest(credential.user);
    document.getElementById('auth-password').value = '';
    showError('Permintaan petugas dikirim. Tunggu persetujuan owner.');
  } catch (registerError) { showError(`Pendaftaran gagal: ${registerError.message}`); }
  finally { registerButton.disabled = false; }
};
pendingSignout.onclick = () => signOut(auth);
refreshRole.onclick = () => { if (auth.currentUser) void handleAccount(auth.currentUser); };
document.getElementById('auth-reset').onclick = async () => {
  const email = document.getElementById('auth-email').value.trim();
  if (!email) return showError('Isi email dulu untuk reset password.');
  try { await sendPasswordResetEmail(auth, email); showError('Jika akun terdaftar, email reset akan dikirim.'); }
  catch (resetError) { showError(`Reset gagal: ${resetError.message}`); }
};
const cloudDoc = () => {
  if (!user || verifiedRole !== 'OWNER') throw Error('Hanya owner boleh menggunakan data Cloud utama.');
  return doc(db, 'users', user.uid, 'charisna', 'current');
};
panel.querySelector('#cloud-upload').onclick = async () => {
  try {
    cloudDoc();
    const local = localStorage.getItem(dataKey());
    if (!local) throw Error('Belum ada data lokal untuk diunggah.');
    if (!confirm('Timpa data cloud dengan data lokal akun ini? Buat backup JSON dulu.')) return;
    await setDoc(cloudDoc(), { data: JSON.parse(local), updatedAt: new Date().toISOString() });
    message('Data lokal berhasil diunggah.');
  } catch (cloudError) { message(cloudError.message); }
};
panel.querySelector('#cloud-download').onclick = async () => {
  try {
    const snapshot = await getDoc(cloudDoc());
    if (!snapshot.exists()) throw Error('Belum ada data cloud.');
    const data = snapshot.data().data;
    if (!data?.rooms || !data?.tenants || !data?.bills) throw Error('Format data cloud tidak valid.');
    if (!confirm('Timpa data lokal akun ini dengan data cloud? Buat backup JSON dulu.')) return;
    localStorage.setItem(dataKey(), JSON.stringify(data)); location.reload();
  } catch (cloudError) { message(cloudError.message); }
};
panel.querySelector('#cloud-logout').onclick = () => signOut(auth);
