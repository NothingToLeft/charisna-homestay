import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

const CONFIG_KEY = 'CHARISNA_FIREBASE_CONFIG';
const DATA_KEY = 'CHARISNA_HOMESTAY_ENTERPRISE_V6';
let auth;
let db;
let user;
const status = document.createElement('div');
status.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:9999;background:#064e3b;color:white;padding:10px;border-radius:10px;max-width:330px;font:13px sans-serif;box-shadow:0 2px 10px #0003';
status.textContent = 'Cloud: belum dikonfigurasi';
document.body.append(status);
const panel = document.createElement('dialog');
panel.style.cssText = 'border:0;border-radius:12px;padding:20px;max-width:420px;width:90%;box-shadow:0 10px 40px #0005;font:14px sans-serif';
panel.innerHTML = `<h2 style="font-weight:bold;font-size:18px">Cloud Charisna</h2><p>Masukkan konfigurasi Web App Firebase project charisna-kost-manager. Data tetap lokal sampai Anda memilih unggah atau unduh.</p><textarea id="cloud-config" aria-label="Firebase Web config JSON" placeholder='{"apiKey":"...","authDomain":"...","projectId":"...","appId":"..."}' style="width:100%;height:100px;border:1px solid #aaa;margin-top:10px"></textarea><input id="cloud-email" type="email" placeholder="Email" autocomplete="username" style="width:100%;border:1px solid #aaa;margin-top:8px;padding:8px"><input id="cloud-password" type="password" placeholder="Password" autocomplete="current-password" style="width:100%;border:1px solid #aaa;margin-top:8px;padding:8px"><p id="cloud-message" role="status" style="min-height:20px"></p><div style="display:flex;flex-wrap:wrap;gap:6px"><button id="cloud-connect">Simpan config & login</button><button id="cloud-upload">Unggah lokal</button><button id="cloud-download">Unduh cloud</button><button id="cloud-logout">Keluar</button><button id="cloud-close">Tutup</button></div>`;
document.body.append(panel);
for (const button of panel.querySelectorAll('button')) button.style.cssText = 'padding:8px;background:#059669;color:white;border-radius:6px';
const button = document.createElement('button');
button.textContent = 'Cloud';
button.style.cssText = 'position:fixed;bottom:54px;right:12px;z-index:9999;background:#047857;color:white;padding:10px 16px;border-radius:10px';
button.onclick = () => panel.showModal();
document.body.append(button);
panel.querySelector('#cloud-close').onclick = () => panel.close();
panel.querySelector('#cloud-config').value = localStorage.getItem(CONFIG_KEY) || '';
const message = (text) => { panel.querySelector('#cloud-message').textContent = text; status.textContent = `Cloud: ${text}`; };
function connect(config) {
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) throw Error('Konfigurasi Firebase belum lengkap.');
  if (config.projectId !== 'charisna-kost-manager') throw Error('Project ID harus charisna-kost-manager.');
  const app = getApps()[0] || initializeApp(config);
  auth = getAuth(app); db = getFirestore(app);
  onAuthStateChanged(auth, (account) => { user = account; message(account ? `Masuk: ${account.email}` : 'Belum login'); });
}
try { const saved = localStorage.getItem(CONFIG_KEY); if (saved) connect(JSON.parse(saved)); } catch (error) { message(error.message); }
panel.querySelector('#cloud-connect').onclick = async () => {
  try {
    const raw = panel.querySelector('#cloud-config').value;
    const config = JSON.parse(raw); connect(config);
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, panel.querySelector('#cloud-email').value, panel.querySelector('#cloud-password').value);
    localStorage.setItem(CONFIG_KEY, raw);
    panel.querySelector('#cloud-password').value = '';
  } catch (error) { message(error.message); }
};
const cloudDoc = () => { if (!user || !db) throw Error('Login dulu.'); return doc(db, 'users', user.uid, 'charisna', 'current'); };
panel.querySelector('#cloud-upload').onclick = async () => {
  try {
    const local = localStorage.getItem(DATA_KEY);
    if (!local) throw Error('Belum ada data lokal untuk diunggah.');
    if (!confirm('Timpa data cloud dengan data lokal browser ini? Buat backup JSON dulu.')) return;
    await setDoc(cloudDoc(), { data: JSON.parse(local), updatedAt: new Date().toISOString() });
    message('Data lokal berhasil diunggah.');
  } catch (error) { message(error.message); }
};
panel.querySelector('#cloud-download').onclick = async () => {
  try {
    const snapshot = await getDoc(cloudDoc());
    if (!snapshot.exists()) throw Error('Belum ada data cloud.');
    const data = snapshot.data().data;
    if (!data?.rooms || !data?.tenants || !data?.bills) throw Error('Format data cloud tidak valid.');
    if (!confirm('Timpa data lokal dengan data cloud? Buat backup JSON dulu.')) return;
    localStorage.setItem(DATA_KEY, JSON.stringify(data));
    location.reload();
  } catch (error) { message(error.message); }
};
panel.querySelector('#cloud-logout').onclick = async () => { if (auth) await signOut(auth); };
