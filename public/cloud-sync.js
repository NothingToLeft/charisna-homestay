import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { staffEmail, staffPassword, resolveRole, setupOwnerManager, renderCleanerPortal } from './roles.js';
import { buildKostSnapshot } from './superapp-summary.js?v=superapp-demo-20261107';

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
const pendingSignout = document.getElementById('auth-signout-pending');
const auth = getAuth(initializeApp(firebaseConfig));
const db = getFirestore(auth.app);
let user = null;
let verifiedRole = null;
let authRevision = 0;
const dataKey = () => `${DATA_PREFIX}:${user.uid}`;
const showError = (message) => { error.textContent = message; };
window.CHARISNA_AUTH_READY = true;

const status = document.getElementById('account-sync-status');

status.textContent = 'Cloud: menunggu login';

const panel = document.createElement('dialog');
panel.style.cssText = 'border:0;border-radius:12px;padding:20px;max-width:420px;width:90%;box-shadow:0 10px 40px #0005;font:14px sans-serif';
panel.innerHTML = `<h2 style="font-weight:bold;font-size:18px">Cloud CHARISNA KOST</h2><p>Data owner disimpan di perangkat ini. Pilih unggah atau unduh untuk memindahkan snapshot.</p><p id="cloud-message" role="status" style="min-height:20px"></p><div style="display:flex;flex-wrap:wrap;gap:6px"><button id="cloud-upload">Unggah lokal</button><button id="cloud-download">Unduh cloud</button><button id="cloud-logout">Keluar akun</button><button id="cloud-close">Tutup</button></div>`;
document.body.append(panel);
for (const button of panel.querySelectorAll('button')) button.style.cssText = 'padding:8px;background:#059669;color:white;border-radius:6px';
const openButton = document.createElement('button');
openButton.textContent = 'Cloud & Akun';
openButton.style.cssText = 'background:#047857;color:white;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:600';
openButton.onclick = () => panel.showModal();
document.getElementById('settings-account-actions').append(openButton);
panel.querySelector('#cloud-close').onclick = () => panel.close();
const message = (text) => { panel.querySelector('#cloud-message').textContent = text; status.textContent = `Cloud: ${text}`; };
const superAppSection=document.createElement('section');
superAppSection.hidden=true;
superAppSection.innerHTML='<hr style="margin:18px 0"><h3 style="font-weight:bold;font-size:16px">CHARISNA SuperApp</h3><p>Ringkasan lokal per properti: kamar terisi, pembayaran bulan ini, dan tagihan belum lunas. Data bawaan boleh dikirim dan akan ditandai sebagai contoh.</p><p><a href="https://zen.charisna-superapp.workers.dev/kost" target="_blank" rel="noopener noreferrer">Buka SuperApp dan buat kode penghubung</a></p><label for="kost-superapp-code">Kode penghubung</label><input id="kost-superapp-code" maxlength="24" autocomplete="off" style="display:block;width:100%;padding:8px;border:1px solid #bbb;border-radius:6px"><button id="kost-superapp-connect" type="button">Hubungkan dan kirim ringkasan</button><p id="kost-superapp-status" role="status"></p>';
panel.append(superAppSection);
superAppSection.querySelector('button').style.cssText='padding:8px;background:#059669;color:white;border-radius:6px;margin-top:8px';
const superAppCode=superAppSection.querySelector('#kost-superapp-code');
const superAppStatus=superAppSection.querySelector('#kost-superapp-status');
const superAppKey=()=>`charisna-kost:superapp:v1:${user?.uid||''}`;
const superAppSnapshot=()=>{
  const current=window.getCharisnaKostDataForSuperApp?.();
  const raw=localStorage.getItem(dataKey());
  if(!current&&!raw)throw Error('Data lokal belum tersedia.');
  return buildKostSnapshot(current||JSON.parse(raw));
};
let lastSuperAppPayload='',lastSuperAppAt=0,superAppTimer=0;
async function sendSuperApp(code=''){
  if(!user||verifiedRole!=='OWNER'||auth.currentUser?.uid!==user.uid)throw Error('Masuk sebagai Owner dahulu.');
  const key=code?'':localStorage.getItem(superAppKey());
  if(!code&&!key)throw Error('Buat kode penghubung di SuperApp dahulu.');
  const snapshot=superAppSnapshot();
  const payload=JSON.stringify(snapshot);
  if(!code&&payload===lastSuperAppPayload&&Date.now()-lastSuperAppAt<15*60*1000)return;
  const response=await fetch('https://zen.charisna-superapp.workers.dev/kost/push',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snapshot,...(code?{pairCode:code}:{syncKey:key})}),cache:'no-store'
  });
  if(!response.ok)throw Error(response.status===403||response.status===409?'Koneksi ditolak. Putuskan koneksi lama di SuperApp, lalu buat kode baru.':'Ringkasan gagal dikirim. Coba lagi nanti.');
  const result=await response.json();
  if(result.syncKey)localStorage.setItem(superAppKey(),result.syncKey);
  lastSuperAppPayload=payload;lastSuperAppAt=Date.now();
  return result;
}
function scheduleSuperApp(){
  if(verifiedRole!=='OWNER'||!user||!localStorage.getItem(superAppKey()))return;
  clearTimeout(superAppTimer);
  superAppTimer=setTimeout(()=>{void sendSuperApp().catch(()=>{});},2000);
}
window.addEventListener('charisna:data-saved',scheduleSuperApp);
setInterval(scheduleSuperApp,15*60*1000);
superAppSection.querySelector('#kost-superapp-connect').onclick=async()=>{
  const button=superAppSection.querySelector('#kost-superapp-connect');
  const code=superAppCode.value.trim().toUpperCase();
  if(!/^[A-Z2-9]{24}$/.test(code)){superAppStatus.textContent='Kode harus 24 karakter.';return;}
  button.disabled=true;superAppStatus.textContent='Mengirim ringkasan…';
  try{await sendSuperApp(code);superAppCode.value='';superAppStatus.textContent='Terhubung. Ringkasan setiap properti terkirim, termasuk label data contoh bila masih ada.';}
  catch(error){superAppStatus.textContent=error.message||'Koneksi gagal.';}
  finally{button.disabled=false;}
};
const showLogin = () => {
  gate.hidden = false; loginForm.hidden = false; pendingSignout.hidden = true;
  document.body.classList.remove('cleaner-mode');
  document.body.classList.add('auth-locked');
};
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
  superAppSection.hidden=resolved.role!=='OWNER';
  if (resolved.role === 'PENDING') {
    sessionStorage.removeItem(ACTIVE_UID_KEY);
    document.body.classList.remove('cleaner-mode');
    document.body.classList.add('auth-locked');
    gate.hidden = false; loginForm.hidden = true; pendingSignout.hidden = false;
    showError('Akun tidak aktif atau belum disiapkan owner.');
    return;
  }
  if (resolved.role === 'CLEANER') {
    sessionStorage.removeItem(ACTIVE_UID_KEY);
    gate.hidden = true;
    document.body.classList.remove('auth-locked');
    document.body.classList.add('cleaner-mode');
    renderCleanerPortal({ db, account, ownerUid: resolved.ownerUid, name: resolved.name, onLogout: () => signOut(auth) });
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
  setupOwnerManager({ db, account, firebaseConfig, onMessage: message });
  if(resolved.role==='OWNER')scheduleSuperApp();
}
onAuthStateChanged(auth, (account) => { const revision = ++authRevision; void handleAccount(account, revision); }, (authError) => showError(`Login tidak tersedia: ${authError.message}`));
roleSelect.onchange = () => {
  const staff = roleSelect.value === 'CLEANER';
  document.getElementById('auth-email-row').hidden = staff;
  document.getElementById('auth-username-row').hidden = !staff;
  document.getElementById('auth-email').required = !staff;
  document.getElementById('auth-username').required = staff;
  document.getElementById('auth-secret-label').textContent = staff ? 'PIN 4 digit' : 'Password';
  document.getElementById('auth-password').inputMode = staff ? 'numeric' : 'text';
  document.getElementById('auth-password').maxLength = staff ? 4 : 256;
  document.getElementById('auth-reset').hidden = staff;
  document.getElementById('auth-help').textContent = staff ? 'Masukkan username dan PIN dari pemilik.' : 'Masuk dengan akun pemilik.';
  document.getElementById('auth-password').value = '';
  showError('');
};
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const staff = roleSelect.value === 'CLEANER';
  const username = document.getElementById('auth-username').value.trim().toLowerCase();
  const pin = document.getElementById('auth-password').value;
  const email = staff ? staffEmail(username) : document.getElementById('auth-email').value.trim().toLowerCase();
  if (staff && (!email || !/^\d{4}$/.test(pin))) return showError('Isi username dan PIN 4 digit.');
  if (!staff && !email) return showError('Isi email pemilik.');
  loginButton.disabled = true; showError('Memeriksa akun...');
  try {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, staff ? staffPassword(username, pin) : pin);
    document.getElementById('auth-password').value = '';
  } catch (loginError) {
    showError(loginError.code === 'auth/invalid-credential' ? 'Username/PIN atau email/password salah.' : `Gagal masuk: ${loginError.message}`);
  } finally { loginButton.disabled = false; }
});
pendingSignout.onclick = () => signOut(auth);
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
const logoutButton = document.getElementById('owner-logout');
logoutButton.onclick = () => signOut(auth);
document.getElementById('settings-account-actions').append(logoutButton);


window.charisnaAuditToken = async () => { if (!auth.currentUser || verifiedRole !== 'OWNER') throw Error('Login owner diperlukan.'); return auth.currentUser.getIdToken(true); };
