import { syncContent, sameSyncData, mergeSyncData } from './sync-merge.js?v=1';
import { unlockVault } from './vault-ui.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { getFirestore, doc, getDoc, getDocFromServer, setDoc, deleteDoc, collection, getDocs, query, where, onSnapshot, runTransaction } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { staffEmail, staffPassword, resolveRole, setupOwnerManager, renderCleanerPortal } from './roles.js?v=20261123-turnover';
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
panel.className='cloud-panel';
panel.setAttribute('aria-labelledby','cloud-panel-title');
panel.innerHTML = `<header class="cloud-panel__header"><div><h2 id="cloud-panel-title">Cloud & akun</h2><p>Data antarperangkat, tersimpan otomatis.</p></div><button id="cloud-close" type="button" class="cloud-panel__close">Tutup</button></header><div class="cloud-panel__body"><section class="cloud-panel__state" data-state="off" aria-live="polite" aria-atomic="true"><h3 id="cloud-state-title">Menunggu akun owner</h3><p id="cloud-state-note">Masuk dan buka brankas untuk memulai sinkronisasi.</p><p id="cloud-last-sync"></p></section><p id="cloud-message" role="status" class="cloud-panel__message"></p><section class="cloud-panel__account"><div><h3>Akun terhubung</h3><p id="cloud-account">Belum masuk</p></div><button id="cloud-logout" type="button" class="cloud-panel__secondary">Keluar akun</button></section><section id="cloud-integrations"></section><details class="cloud-panel__advanced"><summary>Pemulihan & tindakan lanjutan</summary><p>Tidak diperlukan untuk pemakaian biasa. Perubahan dikirim dan diterima otomatis saat aplikasi aktif.</p><div class="cloud-panel__actions"><button id="cloud-upload" type="button" class="cloud-panel__secondary">Coba sinkronkan ulang</button><button id="cloud-download" type="button" class="cloud-panel__secondary">Pulihkan dari cloud</button></div><p>Salinan terenkripsi disimpan sebelum data cloud diterapkan.</p></details></div><footer class="cloud-panel__footer">Aktif selama aplikasi dan brankas terbuka. Data offline tetap tersimpan di perangkat dan disinkronkan saat tersambung kembali.</footer>`;
document.body.append(panel);
const openButton = document.createElement('button');
openButton.textContent = 'Cloud & Akun';
openButton.style.cssText = 'background:#047857;color:white;padding:10px 16px;border-radius:10px;font-size:13px;font-weight:600';
let cloudPanelOpener=null;
function openCloudPanel(){cloudPanelOpener=document.activeElement;refreshSuperAppStatus();panel.showModal();}
openButton.onclick = openCloudPanel;
document.getElementById('settings-account-actions').append(openButton);
panel.querySelector('#cloud-close').onclick = () => panel.close();
panel.addEventListener('close',()=>{if(cloudPanelOpener?.isConnected)cloudPanelOpener.focus();});
const message = (text) => { panel.querySelector('#cloud-message').textContent = text; status.textContent = `Cloud: ${text}`; };
const superAppSection=document.createElement('section');
superAppSection.hidden=true;
superAppSection.className='cloud-panel__integration';
superAppSection.innerHTML='<h3>CHARISNA SuperApp</h3><p id="superapp-delivery-status">Belum terhubung.</p><details id="superapp-pairing"><summary>Atur koneksi SuperApp</summary><p>Cukup hubungkan sekali. Setelah itu, ringkasan hunian dan keuangan dikirim otomatis.</p><p><a href="https://zen.charisna-superapp.workers.dev/kost" target="_blank" rel="noopener noreferrer">Buka SuperApp untuk membuat kode</a></p><label for="kost-superapp-code">Kode penghubung</label><input id="kost-superapp-code" maxlength="24" autocomplete="off"><button id="kost-superapp-connect" type="button" class="cloud-panel__primary">Hubungkan SuperApp</button><p id="kost-superapp-status" role="status"></p></details>';
panel.querySelector('#cloud-integrations').append(superAppSection);
const superAppCode=superAppSection.querySelector('#kost-superapp-code');
const superAppStatus=superAppSection.querySelector('#kost-superapp-status');
const superAppKey=()=>`charisna-kost:superapp:v1:${user?.uid||''}`;
const savedSuperAppKey=()=>window.charisnaVault ? window.charisnaData.snapshot().privateIntegrations?.superAppKey : null;
function refreshSuperAppStatus(){
  const connected=Boolean(savedSuperAppKey());
  let delivery=null;
  try{delivery=JSON.parse(localStorage.getItem('charisna-superapp-delivery:'+user?.uid) || 'null');}catch{}
  superAppSection.querySelector('#superapp-delivery-status').textContent=!connected?'Belum terhubung. Hubungkan sekali untuk mengaktifkan pengiriman otomatis.':delivery?.status==='SENT'?'Terhubung. Ringkasan terakhir berhasil dikirim.':delivery?.status==='PENDING'?'Terhubung. Ringkasan menunggu pengiriman dan akan dicoba otomatis.':'Koneksi tersimpan. Ringkasan dikirim otomatis saat data berubah.';
}
async function saveSuperAppKey(key) {
  const data=window.charisnaData.snapshot();
  data.privateIntegrations={...data.privateIntegrations,superAppKey:key};
  window.charisnaData.hydrate(data);
  await window.charisnaVault.save(data);
}
const superAppSnapshot=()=>{
  const current=window.getCharisnaKostDataForSuperApp?.();
  if(!window.charisnaVault||!current)throw Error('Buka brankas dahulu.');
  return buildKostSnapshot(current);
};
let lastSuperAppPayload='',lastSuperAppAt=0,superAppTimer=0;
async function recordSuperAppDelivery(state) {
  if (!user) return;
  localStorage.setItem('charisna-superapp-delivery:' + user.uid, JSON.stringify(state));
  refreshSuperAppStatus();
}
async function sendSuperApp(code=''){
  if(!user||verifiedRole!=='OWNER'||auth.currentUser?.uid!==user.uid)throw Error('Masuk sebagai Owner dahulu.');
  const key=code?'':savedSuperAppKey();
  if(!code&&!key)throw Error('Buat kode penghubung di SuperApp dahulu.');
  const snapshot=superAppSnapshot();
  const payload=JSON.stringify(snapshot);
  if(!code&&payload===lastSuperAppPayload&&Date.now()-lastSuperAppAt<15*60*1000)return;
  await recordSuperAppDelivery({status:'PENDING',queuedAt:new Date().toISOString()});
  const response=await fetch('https://zen.charisna-superapp.workers.dev/kost/push',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snapshot,...(code?{pairCode:code}:{syncKey:key})}),cache:'no-store'
  });
  if(!response.ok)throw Error(response.status===403||response.status===409?'Koneksi ditolak. Putuskan koneksi lama di SuperApp, lalu buat kode baru.':'Ringkasan gagal dikirim. Coba lagi nanti.');
  const result=await response.json();
  if(result.syncKey)await saveSuperAppKey(result.syncKey);
  await recordSuperAppDelivery({status:'SENT',sentAt:new Date().toISOString()});
  lastSuperAppPayload=payload;lastSuperAppAt=Date.now();
  return result;
}
function scheduleSuperApp(){
  if(verifiedRole!=='OWNER'||!user||!savedSuperAppKey())return;
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
  try{await sendSuperApp(code);superAppCode.value='';superAppStatus.textContent='Terhubung. Ringkasan berikutnya dikirim otomatis.';refreshSuperAppStatus();superAppSection.querySelector('#superapp-pairing').open=false;}
  catch(error){superAppStatus.textContent=error.message||'Koneksi gagal.';}
  finally{button.disabled=false;}
};
const showLogin = () => {
  gate.hidden = false; loginForm.hidden = false; pendingSignout.hidden = true;
  document.body.classList.remove('cleaner-mode');
  document.body.classList.add('auth-locked');
};
async function handleAccount(account, revision = ++authRevision) {
  window.stopRoomTurnoverListeners?.();
  stopAutoSync();
  user = account; verifiedRole = null;
  window.CHARISNA_CURRENT_USER = account;
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
  window.CHARISNA_ROLE = verifiedRole;
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
    if (!localStorage.getItem(accountKey) && !localStorage.getItem(accountKey + ':vault') && oldData && confirm('Data lama ditemukan. Salin ke akun owner?')) localStorage.setItem(accountKey, oldData);
    sessionStorage.setItem(ACTIVE_UID_KEY, account.uid);
    location.reload(); return;
  }
  await unlockVault(dataKey(), () => signOut(auth));
  if (revision !== authRevision || auth.currentUser?.uid !== account.uid) { location.reload(); return; }
  gate.hidden = true;
  document.body.classList.remove('auth-locked', 'cleaner-mode');
  panel.querySelector('#cloud-account').textContent=account.email;
  message('');
  setupOwnerManager({ db, account, firebaseConfig, onMessage: message });
  const legacySyncKey=localStorage.getItem(superAppKey());
  if(legacySyncKey){
    try { await saveSuperAppKey(legacySyncKey); localStorage.removeItem(superAppKey()); }
    catch { message('Kunci SuperApp belum terenkripsi. Coba lagi setelah ruang penyimpanan tersedia.'); }
  }
  if(resolved.role==='OWNER'){
    scheduleSuperApp();
    startAutoSync();
    window.dispatchEvent(new Event("charisna:owner-ready"));
  }
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

// ==================== AUTO SYNC ENGINE ====================
const SYNC_DEBOUNCE_MS = 1500;
const SYNC_BACKUP_PREFIX = 'CHARISNA_SYNC_RECOVERY_V2_';
const deviceId = (() => {
  let id = localStorage.getItem('CHARISNA_DEVICE_ID');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('CHARISNA_DEVICE_ID', id); }
  return id;
})();
let stopCloudListener = null;
let reconcilingEpoch = null;
let syncEpoch = 0;
const syncState = { syncing:false, uploadTimer:0, paused:false, network:navigator.onLine, initialized:false, base:null, cloudVersion:null, lastLocal:null };
const localMeta = () => window.charisnaData?.snapshot()?.meta || {};
const syncBadge = () => document.getElementById('sync-status-badge');
const setBadge = (kind, text) => {
  const badge = syncBadge();
  const label={ok:'Tersinkron',busy:'Menyimpan…',off:navigator.onLine?'Menunggu akun':'Offline',error:'Perlu perhatian'}[kind] || 'Cloud';
  if(badge){
    badge.className='cloud-indicator';badge.dataset.state=kind;
    if(badge.textContent!==label)badge.textContent=label;
    badge.title=text.replace(/^[☁⟳⚠○]\s*/,'')+'. Buka status Cloud & akun.';
    badge.setAttribute('aria-label',label+'. Buka status Cloud dan akun');
  }
  const state=panel.querySelector('.cloud-panel__state');state.dataset.state=kind;
  panel.querySelector('#cloud-state-title').textContent={ok:'Semua perubahan tersinkron',busy:'Perubahan sedang disinkronkan',off:navigator.onLine?'Menunggu koneksi akun':'Offline · data tetap tersimpan',error:'Sinkronisasi perlu perhatian'}[kind] || label;
  panel.querySelector('#cloud-state-note').textContent={ok:'Perubahan dikirim dan diterima otomatis. Tidak perlu menekan tombol sinkron.',busy:'Perubahan yang sudah disimpan di perangkat akan dikirim otomatis. Anda dapat tetap bekerja.',off:'Saat koneksi kembali, aplikasi akan mencoba sinkronisasi otomatis.',error:'Aplikasi akan mencoba lagi otomatis. Periksa koneksi dan rincian pesan di bawah.'}[kind] || '';
  if(kind==='ok'){
    panel.querySelector('#cloud-last-sync').textContent='Terakhir tersinkron: '+new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(new Date());
    panel.querySelector('#cloud-message').textContent='';
  }
  status.textContent='Cloud: '+label;
};
const currentOwner = (uid, epoch) => user?.uid === uid && auth.currentUser?.uid === uid && verifiedRole === 'OWNER' && window.charisnaVault && syncEpoch === epoch;
const cloudVersion = cloud => cloud ? JSON.stringify([cloud.revision || '', cloud.updatedAt || '', syncContent(cloud.data)]) : null;
const hasUnsyncedChanges = () => Boolean(window.charisnaVault && !sameSyncData(syncContent(window.charisnaData.snapshot()), syncState.lastLocal));
const hasOperationalRecords = data => ['rooms', 'tenants', 'bills', 'expenses', 'complaints', 'inventaris',
  'stok', 'stokMutasi', 'perawatan', 'perbaikan', 'kontrak', 'tagihanBertahap', 'meter', 'handovers',
  'tenantNotes', 'tenantHistory', 'announcements'].some(key => data[key]?.length > 0);
async function rememberSyncBackup(data) {
  const prefix = SYNC_BACKUP_PREFIX + user.uid + ':';
  const envelope = await window.charisnaVault.backup(data);
  const entries = Object.keys(localStorage).filter(key => key.startsWith(prefix)).sort();
  while (entries.length >= 3) localStorage.removeItem(entries.shift());
  localStorage.setItem(prefix + new Date().toISOString() + ':' + crypto.randomUUID(), JSON.stringify(envelope));
}
function stopAutoSync() {
  syncEpoch++;
  stopCloudListener?.(); stopCloudListener = null;
  clearTimeout(syncState.uploadTimer);
  syncState.syncing=false;
  syncState.initialized = false; syncState.base = null; syncState.cloudVersion = null; syncState.lastLocal = null;
}
function queueSync(delay = SYNC_DEBOUNCE_MS, announce = true) {
  if (!user || verifiedRole !== 'OWNER' || !window.charisnaVault || syncState.paused) return;
  clearTimeout(syncState.uploadTimer);
  if (!navigator.onLine) { setBadge('off','○ Offline · perubahan tersimpan di perangkat'); return; }
  if(announce && hasUnsyncedChanges())setBadge('busy','Perubahan tersimpan di perangkat; menunggu sinkronisasi otomatis');
  syncState.uploadTimer = setTimeout(() => { void reconcileAtStartup(); }, delay);
}
async function readCloudFromServer(ref){
  let timer;
  try{
    return await Promise.race([getDocFromServer(ref),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Cloud belum merespons. Data perangkat tetap tersimpan; sinkronisasi akan dicoba lagi.')),20000);})]);
  }finally{clearTimeout(timer);}
}
async function applyCloud(cloud, localStart, uid, epoch) {
  if (!currentOwner(uid, epoch)) return false;
  const current = window.charisnaData.snapshot();
  const remote = syncContent(window.charisnaData.validate(cloud.data));
  const latest = mergeSyncData(syncContent(localStart), syncContent(current), remote).data;
  const dirty = !sameSyncData(latest, remote);
  const validated = window.charisnaData.validate({ ...latest, meta:{...current.meta,
    localUpdatedAt:dirty ? new Date().toISOString() : cloud.updatedAt, cloudUpdatedAt:cloud.updatedAt},
    privateIntegrations:current.privateIntegrations || {} });
  await window.charisnaVault.save(validated);
  if (!currentOwner(uid, epoch)) return false;
  // A save can complete while encryption is pending. Preserve that newer edit too.
  const now = window.charisnaData.snapshot();
  if (!sameSyncData(syncContent(now), syncContent(current))) { queueSync(0); return false; }
  window.charisnaData.hydrate(validated);
  syncState.initialized = true; syncState.base = remote; syncState.cloudVersion = cloudVersion(cloud); syncState.lastLocal = remote;
  if (dirty) queueSync();
  setBadge(dirty ? 'busy' : 'ok', dirty ? '⟳ Menyinkronkan perubahan berikutnya…' : '☁ Sinkron otomatis');
  return true;
}
async function performUpload({interactive = false} = {}) {
  if (syncState.syncing || !window.charisnaVault) { queueSync(); return false; }
  syncState.syncing = true;
  const uid = user?.uid, epoch = syncEpoch;
  try {
    const ref = cloudDoc();
    await window.charisnaVault.flush();
    if (!currentOwner(uid, epoch)) return false;
    const local = window.charisnaData.snapshot();
    if (interactive && !confirm('Sinkronkan perubahan perangkat ini ke cloud?')) return false;
    setBadge('busy','Menyimpan perubahan ke cloud secara otomatis');
    const observed = await readCloudFromServer(ref);
    if (!currentOwner(uid, epoch)) return false;
    const cloud = observed.exists() ? observed.data() : null;
    const remote = cloud ? syncContent(window.charisnaData.validate(cloud.data)) : syncContent(local);
    const changedRemote = cloud && cloudVersion(cloud) !== syncState.cloudVersion;
    let merged = syncContent(local), conflicts = 0;
    if (changedRemote) {
      if (syncState.base) ({data:merged,conflicts} = mergeSyncData(syncState.base, merged, remote));
      await rememberSyncBackup({ ...cloud.data, privateIntegrations:local.privateIntegrations || {} });
      if (!currentOwner(uid, epoch)) return false;
      await rememberSyncBackup(local);
      if (!currentOwner(uid, epoch)) return false;
    }
    const outgoing = {...merged,meta:{...local.meta,localUpdatedAt:new Date().toISOString()}};
    const updatedAt = outgoing.meta.localUpdatedAt;
    const revision = crypto.randomUUID();
    await runTransaction(db, async transaction => {
      const latest = await transaction.get(ref);
      if (cloudVersion(latest.exists() ? latest.data() : null) !== cloudVersion(cloud)) throw Error('SYNC_RETRY');
      if (!currentOwner(uid, epoch)) throw Error('SYNC_ACCOUNT_CHANGED');
      transaction.set(ref,{data:outgoing,updatedAt,revision,device:deviceId});
    });
    const applied = await applyCloud({data:outgoing,updatedAt,revision},local,uid,epoch);
    if (conflicts && applied) message('Perubahan bersamaan digabung. Perubahan lokal dipakai pada kolom yang sama; cadangan terenkripsi tersedia di Pengaturan.');
    return applied;
  } catch (error) {
    if (error.message === 'SYNC_RETRY') queueSync(250);
    else if (currentOwner(uid, epoch)) { setBadge('error','⚠ Sinkron tertunda · akan dicoba ulang'); message('Sinkronisasi tertunda: ' + error.message); }
    return false;
  } finally { if(syncEpoch===epoch)syncState.syncing = false; if (currentOwner(uid, epoch) && hasUnsyncedChanges()) queueSync(3000,false); }
}
async function downloadCloudData({interactive = false} = {}) {
  if (syncState.syncing || !window.charisnaVault) { queueSync(); return false; }
  syncState.syncing = true;
  const uid = user?.uid, epoch = syncEpoch;
  try {
    await window.charisnaVault.flush();
    const local = window.charisnaData.snapshot();
    const snapshot = await readCloudFromServer(cloudDoc());
    if (!snapshot.exists()) return false;
    const cloud = snapshot.data();
    window.charisnaData.validate(cloud.data);
    if (interactive && !confirm('Ambil data cloud terbaru? Salinan perangkat disimpan terenkripsi.')) return false;
    if (!currentOwner(uid, epoch)) return false;
    if (!sameSyncData(syncContent(local),syncContent(cloud.data))) await rememberSyncBackup(local);
    setBadge('busy','Menerima perubahan dari cloud');
    return await applyCloud(cloud,local,uid,epoch);
  } catch (error) {
    if (currentOwner(uid, epoch)) { setBadge('error','⚠ Sinkron tertunda · akan dicoba ulang'); message('Gagal mengambil cloud: ' + error.message); }
    return false;
  } finally { if(syncEpoch===epoch)syncState.syncing = false; }
}
async function reconcileAtStartup() {
  if (!user || verifiedRole !== 'OWNER' || !window.charisnaVault || syncState.paused) return;
  if (syncState.syncing || reconcilingEpoch===syncEpoch) { queueSync(); return; }
  if (!navigator.onLine) { setBadge('off','○ Offline · perubahan tersimpan di perangkat'); return; }
  const uid = user.uid, epoch = syncEpoch;
  reconcilingEpoch=epoch;
  try {
    const needsFeedback=!syncState.initialized || hasUnsyncedChanges();
    if(needsFeedback)setBadge('busy','Memulai sinkronisasi otomatis');
    await window.charisnaVault.flush();
    const snapshot = await readCloudFromServer(cloudDoc());
    if (!currentOwner(uid, epoch)) return;
    if (!snapshot.exists()) { await performUpload(); return; }
    const cloud = snapshot.data();
    const local = window.charisnaData.snapshot();
    const remote = window.charisnaData.validate(cloud.data);
    if (sameSyncData(syncContent(local),syncContent(remote))) {
      syncState.initialized = true; syncState.base = syncContent(remote); syncState.lastLocal = syncContent(local); syncState.cloudVersion = cloudVersion(cloud);
      if(needsFeedback || syncBadge()?.dataset.state!=='ok')setBadge('ok','Sinkron otomatis aktif'); return;
    }
    if (syncState.initialized && syncState.base) {
      if (hasUnsyncedChanges()) await performUpload(); else await downloadCloudData();
    } else {
      const localStamp = Date.parse(local.meta?.localUpdatedAt || '') || 0;
      const remoteStamp = Date.parse(cloud.updatedAt || '') || 0;
      const freshEmptyVault = !local.meta?.cloudUpdatedAt && !hasOperationalRecords(local) && hasOperationalRecords(remote);
      if (!freshEmptyVault && localStamp > remoteStamp) await performUpload(); else await downloadCloudData();
    }
  } catch (error) { if (currentOwner(uid, epoch)) { setBadge('error','Sinkron tertunda; akan dicoba ulang'); message(error.message); queueSync(5000,false); } }
  finally{if(reconcilingEpoch===epoch)reconcilingEpoch=null;}
}
function startAutoSync() {
  stopAutoSync();
  const uid = user?.uid, epoch = syncEpoch;
  stopCloudListener = onSnapshot(cloudDoc(), snapshot => {
    if (currentOwner(uid, epoch) && !snapshot.metadata.hasPendingWrites) queueSync(100);
  }, error => { if (currentOwner(uid, epoch)) { setBadge('error','⚠ Cloud terputus · mencoba ulang'); message(error.message); } });
  queueSync(0);
}
const checkCloudForNewerData = reconcileAtStartup;
const scheduleAutoUpload = () => queueSync();
const flushPendingUpload = () => queueSync(0);
window.addEventListener('charisna:data-saved',scheduleAutoUpload);
window.addEventListener('online',flushPendingUpload);
window.addEventListener('focus',flushPendingUpload);
window.addEventListener('offline',()=>setBadge('off','○ Offline · perubahan tersimpan di perangkat'));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueSync(0);});
setInterval(()=>queueSync(0),30000);
syncBadge()?.addEventListener('click',openCloudPanel);
for(const [id,action] of [['cloud-upload',performUpload],['cloud-download',downloadCloudData]]){
  panel.querySelector('#'+id).onclick=async()=>{
    const buttons=[...panel.querySelectorAll('.cloud-panel__advanced button')];buttons.forEach(button=>button.disabled=true);
    try{await action({interactive:true});}finally{buttons.forEach(button=>button.disabled=false);}
  };
}
async function logoutOwner() {
  try { await window.charisnaVault?.flush(); if (hasUnsyncedChanges()) await reconcileAtStartup(); await signOut(auth); }
  catch { message('Penyimpanan belum selesai. Ekspor cadangan sebelum keluar.'); }
}
panel.querySelector('#cloud-logout').onclick=logoutOwner;
const logoutButton=document.getElementById('owner-logout');logoutButton.onclick=logoutOwner;
document.getElementById('settings-account-actions').append(logoutButton);
const recoveryButton=document.createElement('button');recoveryButton.className='rounded-lg bg-slate-700 px-4 py-3 text-white';recoveryButton.textContent='Cadangan sinkronisasi';
recoveryButton.onclick=()=>{
  const dialog=document.createElement('dialog');dialog.className='rounded-2xl p-5 w-[min(94vw,540px)] space-y-3';
  const close=document.createElement('button');close.textContent='Tutup';close.onclick=()=>dialog.close();dialog.append(close);
  const prefix=SYNC_BACKUP_PREFIX+user.uid+':';
  const keys=Object.keys(localStorage).filter(key=>key.startsWith(prefix)).sort().reverse();
  for(const key of keys){const button=document.createElement('button');button.className='block rounded-lg border p-3';button.textContent='Unduh '+key.slice(prefix.length,prefix.length+24);button.onclick=()=>{
    const url=URL.createObjectURL(new Blob([localStorage.getItem(key)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='charisna-sync-recovery.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };dialog.append(button);}
  if(!keys.length)dialog.append('Belum ada cadangan penggantian data.');
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();
};
document.getElementById('settings-account-actions').append(recoveryButton);

window.charisnaAuditToken = async () => { if (!auth.currentUser || verifiedRole !== 'OWNER') throw Error('Login owner diperlukan.'); return auth.currentUser.getIdToken(true); };

const lockButton = document.createElement('button');
lockButton.textContent = 'Kunci brankas';
lockButton.className = 'rounded-lg bg-slate-700 px-4 py-3 text-white';
lockButton.onclick = async () => {
  try {
    await window.charisnaVault?.flush();
    if (hasUnsyncedChanges()) await reconcileAtStartup();
    location.reload();
  }
  catch { message('Ekspor cadangan perubahan sebelum mengunci.'); }
};
document.getElementById('settings-account-actions').append(lockButton);

async function syncMoneyFeed() {
  if (!user || verifiedRole !== 'OWNER' || !window.charisnaVault) return;
  const data=window.charisnaData.snapshot();
  const token=data.privateIntegrations?.moneyFeedToken;
  if (!token) return;
  const month=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jakarta'}).format(new Date()).slice(0,7);
  const properties=data.properties.map(property=>{
    const rooms=data.rooms.filter(room=>room.propertyId===property.id);
    const assigned=item=>item.propertyId===property.id || (!item.propertyId && rooms.some(room=>room.number===item.roomNumber) && data.rooms.filter(room=>room.number===item.roomNumber).length===1);
    const income=data.bills.filter(bill=>assigned(bill)&&bill.status==='LUNAS'&&bill.paidDate?.startsWith(month)).reduce((sum,bill)=>sum+Number(bill.amount||0),0);
    const expense=data.expenses.filter(item=>item.propertyId===property.id&&item.date?.startsWith(month)).reduce((sum,item)=>sum+Number(item.amount||0),0);
    if (![income,expense].every(value=>Number.isSafeInteger(value)&&value>=0)) throw Error('Nominal ringkasan tidak valid.');
    return {id:property.id,name:property.name,income,expense,net:income-expense,totalRooms:rooms.length,occupiedRooms:rooms.filter(room=>room.status==='TERISI').length};
  });
  const unassignedExpenses=data.expenses.filter(item=>!item.propertyId&&item.date?.startsWith(month)).reduce((sum,item)=>sum+Number(item.amount||0),0);
  await setDoc(doc(db,'moneyFeeds',token),{ownerUid:user.uid,month,properties,unassignedExpenses,updatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+30*86400000)});
}
window.addEventListener('charisna:data-saved',()=>{void syncMoneyFeed().catch(()=>{});});
window.addEventListener('online',()=>{void syncMoneyFeed().catch(()=>{});});
setInterval(()=>{void syncMoneyFeed().catch(()=>{});},60000);
window.charisnaMoneyFeed = {
  async connect() {
    if (!user || verifiedRole !== 'OWNER' || !window.charisnaVault) throw Error('Buka brankas owner.');
    const data=window.charisnaData.snapshot(); data.privateIntegrations ||= {};
    data.privateIntegrations.moneyFeedToken ||= Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
    await window.charisnaVault.save(data); window.charisnaData.hydrate(data);
    await syncMoneyFeed(); return data.privateIntegrations.moneyFeedToken;
  },
  async revoke() {
    const data=window.charisnaData.snapshot(); const token=data.privateIntegrations?.moneyFeedToken;
    if (token) await deleteDoc(doc(db,'moneyFeeds',token));
    if (data.privateIntegrations) delete data.privateIntegrations.moneyFeedToken;
    await window.charisnaVault.save(data); window.charisnaData.hydrate(data);
  }
};
window.charisnaPortal = {
  async catalog(rooms) {
    if (!user || verifiedRole !== 'OWNER' || !window.charisnaVault) throw Error('Masuk owner dan buka brankas.');
    const data = window.charisnaData.snapshot();
    await setDoc(doc(db, 'publicCatalogs', user.uid), {ownerUid:user.uid,
      name:data.settings.kostName,rooms,updatedAt:new Date().toISOString()});
    return 'https://nothingtoleft.github.io/charisna-homestay/catalog.html#' + user.uid;
  },
  async publish(token, snapshot) {
    if (!user || verifiedRole !== 'OWNER' || !window.charisnaVault) throw Error('Masuk owner dan buka brankas.');
    await setDoc(doc(db, 'tenantPortals', token), { ownerUid: user.uid, snapshot,
      expiresAt: new Date(Date.now() + 30 * 86400000) });
  },
  async revoke(token) {
    if (!user || verifiedRole !== 'OWNER') throw Error('Masuk owner.');
    await deleteDoc(doc(db, 'tenantPortals', token));
  },
  async inbox() {
    if (!user || verifiedRole !== 'OWNER') throw Error('Masuk owner.');
    const result = await getDocs(query(collection(db, 'tenantSubmissions'), where('ownerUid', '==', user.uid)));
    return result.docs.map(entry => ({ ...entry.data(), id: entry.id }));
  },
  async remove(id) {
    if (!user || verifiedRole !== 'OWNER') throw Error('Masuk owner.');
    await deleteDoc(doc(db, 'tenantSubmissions', id));
  }
};

window.addEventListener('online', scheduleSuperApp);
setInterval(() => {
  if (!window.charisnaVault || verifiedRole !== 'OWNER') return;
  const delivery = JSON.parse(localStorage.getItem('charisna-superapp-delivery:' + user.uid) || 'null');
  if (delivery?.status === 'PENDING') scheduleSuperApp();
}, 60000);
