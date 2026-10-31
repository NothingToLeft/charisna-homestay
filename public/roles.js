import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where, writeBatch } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import { getAuth, inMemoryPersistence, setPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, updatePassword, signOut } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';

export const OWNER_EMAIL = 'charisna.homestay@gmail.com';
export function staffEmail(username) {
  const name = username.trim().toLowerCase();
  return /^[a-z0-9_]{3,24}$/.test(name) ? `staff-${name}@charisna-kost-manager.firebaseapp.com` : null;
}
export function staffPassword(username, pin) { return `charisna-staff:${username.trim().toLowerCase()}:${pin}`; }
export async function resolveRole(db, account) {
  if (account.email?.toLowerCase() === OWNER_EMAIL) return { role: 'OWNER', ownerUid: account.uid };
  const profile = await getDoc(doc(db, 'staff', account.uid));
  if (profile.exists() && profile.data().role === 'CLEANER' && profile.data().active === true) {
    return { role: 'CLEANER', ownerUid: profile.data().ownerUid, name: profile.data().name || profile.data().username || 'Petugas' };
  }
  return { role: 'PENDING' };
}

function element(tag, text, className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}
function action(text, callback, className = 'bg-emerald-600 text-white') {
  const button = element('button', text, `rounded-lg px-3 py-2 text-sm font-semibold ${className}`);
  button.type = 'button'; button.onclick = callback; return button;
}
function formatDate(value) { return value || 'Tanpa tenggat'; }
function jakartaDate() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
async function compressedJpeg(file) {
  if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024) throw Error('Pilih foto maksimal 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(Error('Format foto tidak didukung perangkat.')); image.src = url; });
    const canvas = document.createElement('canvas');
    for (const edge of [1280, 1024, 800, 640]) {
      const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      if (data.length <= 340000) return data;
    }
    throw Error('Foto masih terlalu besar. Coba foto yang lebih sederhana.');
  } finally { URL.revokeObjectURL(url); }
}

export function setupOwnerManager({ db, account, firebaseConfig, onMessage }) {
  let dialog = document.getElementById('cleaning-manager');
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.id = 'cleaning-manager';
  dialog.className = 'w-[min(96vw,900px)] max-h-[90vh] overflow-auto rounded-2xl border-0 p-5 shadow-2xl';
  dialog.innerHTML = `<div class="flex items-center justify-between mb-4"><h2 class="text-xl font-bold">Petugas Kebersihan</h2><button id="clean-close" class="rounded-lg bg-slate-100 px-3 py-2">Tutup</button></div><p class="text-sm text-slate-600 mb-4">Pemilik membuat username dan PIN petugas. Bagikan secara pribadi. Tugas hanya terlihat oleh petugas yang ditunjuk.</p><p id="clean-manager-status" role="status" class="text-sm mb-3"></p><h3 class="font-bold mb-2">Tambah petugas</h3><form id="clean-staff-form" class="grid gap-2 sm:grid-cols-3 mb-5"><input id="clean-name" required maxlength="80" placeholder="Nama petugas" class="border rounded-lg p-2"><input id="clean-username" required minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]+" placeholder="Username" class="border rounded-lg p-2"><input id="clean-pin" required type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" autocomplete="new-password" placeholder="PIN 4 digit" class="border rounded-lg p-2"><button class="rounded-lg bg-emerald-600 text-white px-3 py-2 sm:col-span-3">Buat akun petugas</button></form><h3 class="font-bold mb-2">Petugas</h3><div id="clean-staff" class="space-y-2 mb-5"></div><h3 class="font-bold mb-2">Buat tugas harian</h3><form id="clean-task-form" class="grid gap-2 sm:grid-cols-2 mb-5"><select id="clean-assignee" required class="border rounded-lg p-2"></select><input id="clean-title" required maxlength="120" placeholder="Tugas, contoh: Bersihkan kamar" class="border rounded-lg p-2"><input id="clean-property" required maxlength="80" placeholder="Properti / cabang" class="border rounded-lg p-2"><input id="clean-room" maxlength="40" placeholder="Unit / area" class="border rounded-lg p-2"><input id="clean-due" type="date" required class="border rounded-lg p-2"><select id="clean-priority" class="border rounded-lg p-2"><option>Normal</option><option>Mendesak</option></select><textarea id="clean-instructions" maxlength="1000" placeholder="Instruksi tambahan" class="border rounded-lg p-2 sm:col-span-2"></textarea><textarea id="clean-checklist" maxlength="1200" placeholder="Checklist, satu langkah per baris (maks. 20)" class="border rounded-lg p-2 sm:col-span-2"></textarea><label class="text-sm flex items-center gap-2 sm:col-span-2"><input id="clean-repeat" type="checkbox"> Ulangi setiap hari selama 7 hari</label><button class="rounded-lg bg-emerald-600 text-white px-3 py-2 sm:col-span-2">Simpan tugas</button></form><h3 class="font-bold mb-2">Daftar tugas</h3><div id="clean-owner-tasks" class="space-y-2"></div>`;
  document.body.append(dialog);
  const launch = action('Petugas Kebersihan', () => { dialog.showModal(); void refresh(); });
  launch.style.cssText = 'font-size:13px';
  document.getElementById('open-cleaning-manager')?.addEventListener('click', () => { dialog.showModal(); void refresh(); });
  document.getElementById('settings-account-actions').append(launch);
  dialog.querySelector('#clean-close').onclick = () => dialog.close();
  const status = (text) => { dialog.querySelector('#clean-manager-status').textContent = text; onMessage(text); };
  const staffList = dialog.querySelector('#clean-staff');
  const taskList = dialog.querySelector('#clean-owner-tasks');
  const assignee = dialog.querySelector('#clean-assignee');
  dialog.querySelector('#clean-due').value = jakartaDate();
  const secondaryAuth = getAuth(initializeApp(firebaseConfig, 'charisna-staff-provisioning'));
  dialog.querySelector('#clean-staff-form').onsubmit = async (event) => {
    event.preventDefault();
    const name = dialog.querySelector('#clean-name').value.trim();
    const username = dialog.querySelector('#clean-username').value.trim().toLowerCase();
    const pin = dialog.querySelector('#clean-pin').value;
    const email = staffEmail(username);
    if (!email || !/^\d{4}$/.test(pin) || !name) return status('Isi nama, username 3–24 karakter, dan PIN 4 digit.');
    const button = event.target.querySelector('button'); button.disabled = true;
    try {
      await setPersistence(secondaryAuth, inMemoryPersistence);
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email, staffPassword(username, pin));
      const batch = writeBatch(db);
      batch.set(doc(db, 'staff', credential.user.uid), { ownerUid: account.uid, role: 'CLEANER', username, name, active: true, createdAt: new Date().toISOString() });
      batch.set(doc(db, 'users', account.uid, 'staffPins', credential.user.uid), { pin, username, updatedAt: new Date().toISOString() });
      await batch.commit();
      event.target.reset(); status(`Akun ${username} dibuat. Berikan PIN ke petugas secara pribadi.`); await refresh();
    } catch (error) { status(`Gagal membuat petugas: ${error.message}. Jika username sudah dipakai, pilih username lain.`); }
    finally { dialog.querySelector('#clean-pin').value = ''; await signOut(secondaryAuth).catch(() => {}); button.disabled = false; }
  };
  async function refresh() {
    try {
      status('Memuat petugas dan tugas...');
      const [staff, tasks, photos] = await Promise.all([
        getDocs(collection(db, 'staff')),
        getDocs(collection(db, 'users', account.uid, 'cleaningTasks')),
        getDocs(query(collection(db, 'cleaningPhotos'), where('ownerUid', '==', account.uid)))
      ]);
      staffList.replaceChildren(); taskList.replaceChildren(); assignee.replaceChildren();
      const staffMap = new Map();
      for (const profile of staff.docs) {
        const item = profile.data();
        if (item.ownerUid !== account.uid) continue;
        staffMap.set(profile.id, item.name || item.username || item.email || profile.id);
        const row = element('div', `${item.name || item.email || profile.id} (${item.username || 'akun lama'}) — ${item.active ? 'Aktif' : 'Nonaktif'}`, 'border rounded-lg p-3 text-sm flex flex-wrap items-center justify-between gap-2');
        row.append(action(item.active ? 'Nonaktifkan' : 'Aktifkan', async () => {
          try { await updateDoc(profile.ref, { active: !item.active }); await refresh(); }
          catch (error) { status(`Gagal mengubah akun: ${error.message}`); }
        }, 'bg-slate-100 text-slate-800'));
        if (item.username) {
          row.append(action('Lihat PIN', async () => {
            try {
              const saved = await getDoc(doc(db, 'users', account.uid, 'staffPins', profile.id));
              if (!saved.exists()) return status('PIN belum tersimpan untuk akun ini.');
              alert(`PIN ${item.username}: ${saved.data().pin}\nJangan bagikan kepada orang lain.`);
            } catch (error) { status(`Gagal membaca PIN: ${error.message}`); }
          }, 'bg-slate-100 text-slate-800'));
          row.append(action('Ubah nama', async () => {
            const name = prompt('Nama petugas', item.name || '');
            if (!name?.trim()) return;
            try { await updateDoc(profile.ref, { name: name.trim().slice(0, 80) }); await refresh(); }
            catch (error) { status(`Gagal mengubah nama: ${error.message}`); }
          }, 'bg-slate-100 text-slate-800'));
          const pinForm = element('form', '', 'flex flex-wrap gap-2 w-full');
          const oldPin = element('input', '', 'border rounded-lg p-2 w-28');
          oldPin.type = 'password'; oldPin.inputMode = 'numeric'; oldPin.pattern = '[0-9]{4}'; oldPin.maxLength = 4; oldPin.required = true; oldPin.placeholder = 'PIN lama';
          const newPin = oldPin.cloneNode(); newPin.placeholder = 'PIN baru';
          const save = element('button', 'Ganti PIN', 'rounded-lg px-3 py-2 text-sm font-semibold bg-slate-100');
          pinForm.append(oldPin, newPin, save);
          pinForm.onsubmit = async (event) => {
            event.preventDefault();
            if (!/^\d{4}$/.test(oldPin.value) || !/^\d{4}$/.test(newPin.value)) return status('PIN harus 4 digit.');
            save.disabled = true;
            let authChanged = false;
            try {
              await setPersistence(secondaryAuth, inMemoryPersistence);
              const credential = await signInWithEmailAndPassword(secondaryAuth, staffEmail(item.username), staffPassword(item.username, oldPin.value));
              await updatePassword(credential.user, staffPassword(item.username, newPin.value));
              authChanged = true;
              await setDoc(doc(db, 'users', account.uid, 'staffPins', profile.id), { pin: newPin.value, username: item.username, updatedAt: new Date().toISOString() });
              status(`PIN ${item.username} berhasil diganti.`);
            } catch (error) {
              status(authChanged
                ? `PIN login sudah berubah, tetapi PIN cadangan gagal tersimpan: ${error.message}. Ulangi dengan PIN baru sebagai PIN lama.`
                : `Gagal mengganti PIN: ${error.message}`);
            }
            finally { oldPin.value = ''; newPin.value = ''; await signOut(secondaryAuth).catch(() => {}); save.disabled = false; }
          };
          row.append(pinForm);
        }
        staffList.append(row);
        if (item.active) { const option = element('option', item.name || item.username || item.email || profile.id); option.value = profile.id; assignee.append(option); }
      }
      if (!staffMap.size) staffList.append(element('p', 'Belum ada petugas.', 'text-sm text-slate-500'));
      for (const task of tasks.docs) {
        const item = task.data();
        const row = element('div', `${item.title} • ${item.property} / ${item.room || 'Area umum'} • ${formatDate(item.dueDate)} • ${item.status} • ${staffMap.get(item.assigneeUid) || 'Petugas tidak aktif'}`, 'border rounded-lg p-3 text-sm flex flex-wrap items-center justify-between gap-2');
        const taskPhotos = photos.docs.filter((photo) => photo.data().taskId === task.id);
        if (taskPhotos.length) {
          const gallery = element('div', '', 'w-full flex flex-wrap gap-2');
          gallery.append(element('span', `${taskPhotos.length} foto:`, 'text-xs text-slate-500'));
          for (const photo of taskPhotos) {
            const item = photo.data();
            if (item.status === 'SAVED' && item.driveUrl?.startsWith('https://drive.google.com/')) {
              const link = element('a', `${item.kind} • Buka Drive`, 'text-xs text-emerald-700 underline');
              link.href = item.driveUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; gallery.append(link);
            } else gallery.append(element('span', `${item.kind} • ${item.status === 'PENDING' ? 'Menunggu Drive' : item.status}`, 'text-xs text-amber-700'));
          }
          row.append(gallery);
        }
        row.append(action('Hapus', async () => {
          if (!confirm(`Hapus tugas "${item.title}"?`)) return;
          try { await deleteDoc(task.ref); await refresh(); } catch (error) { status(`Gagal menghapus: ${error.message}`); }
        }, 'bg-rose-100 text-rose-700')); taskList.append(row);
      }
      if (!tasks.size) taskList.append(element('p', 'Belum ada tugas.', 'text-sm text-slate-500'));
      status('Siap.');
    } catch (error) { status(`Gagal memuat: ${error.message}`); }
  }
  dialog.querySelector('#clean-task-form').onsubmit = async (event) => {
    event.preventDefault();
    if (!assignee.value) return status('Buat petugas dulu.');
    const value = (id) => dialog.querySelector(id).value.trim();
    const checklist = value('#clean-checklist').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (checklist.length > 20 || checklist.some((line) => line.length > 100) || new Set(checklist).size !== checklist.length) return status('Checklist maksimal 20 langkah unik, masing-masing 100 karakter.');
    try {
      const count = dialog.querySelector('#clean-repeat').checked ? 7 : 1;
      const batch = writeBatch(db);
      for (let day = 0; day < count; day++) {
        const due = new Date(`${value('#clean-due')}T00:00:00Z`);
        due.setUTCDate(due.getUTCDate() + day);
        const task = doc(collection(db, 'users', account.uid, 'cleaningTasks'));
        batch.set(task, {
          assigneeUid: assignee.value, title: value('#clean-title'), property: value('#clean-property'),
          room: value('#clean-room'), dueDate: due.toISOString().slice(0, 10), priority: value('#clean-priority'),
          instructions: value('#clean-instructions'), checklist, checkedItems: [], status: 'TODO', note: '', completedAt: null,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        });
      }
      await batch.commit();
      event.target.reset(); dialog.querySelector('#clean-due').value = jakartaDate(); await refresh(); status(`${count} tugas tersimpan.`);
    } catch (error) { status(`Gagal menyimpan tugas: ${error.message}`); }
  };
}

export function renderCleanerPortal({ db, account, ownerUid, name, onLogout }) {
  let root = document.getElementById('cleaner-root');
  if (!root) {
    root = document.createElement('main'); root.id = 'cleaner-root';
    root.className = 'min-h-screen bg-slate-50 p-4 sm:p-8 text-slate-800';
    document.body.append(root);
  }
  root.replaceChildren();
  const shell = element('div', '', 'max-w-3xl mx-auto');
  const header = element('div', '', 'bg-emerald-900 text-white p-5 rounded-2xl flex flex-wrap justify-between items-center gap-3');
  const titleWrap = element('div', '', '');
  titleWrap.append(element('p', 'CHARISNA KOST', 'text-xs uppercase tracking-widest text-emerald-200'), element('h1', 'Tugas Kebersihan', 'text-2xl font-bold'), element('p', name || 'Petugas', 'text-xs text-emerald-100 mt-1'));
  header.append(titleWrap, action('Keluar akun', onLogout, 'bg-white text-emerald-900'));
  const help = element('p', 'Kerjakan daftar harian, centang langkah, catat hasil, lalu tandai selesai. Halaman ini tidak menampilkan data penghuni atau keuangan.', 'text-sm text-slate-600 my-4');
  const toolbar = element('div', '', 'flex flex-wrap items-center gap-2 mb-4');
  const status = element('p', 'Memuat tugas...', 'text-sm text-slate-600');
  const list = element('div', '', 'space-y-3');
  toolbar.append(action('Muat ulang', () => void refresh()), status);
  shell.append(header, help, toolbar, list); root.append(shell);
  async function refresh() {
    status.textContent = 'Memuat tugas...'; list.replaceChildren();
    try {
      const [snapshot, photoSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'users', ownerUid, 'cleaningTasks'), where('assigneeUid', '==', account.uid))),
        getDocs(query(collection(db, 'cleaningPhotos'), where('uploadedBy', '==', account.uid)))
      ]);
      const tasks = snapshot.docs.sort((a, b) => (a.data().dueDate || '').localeCompare(b.data().dueDate || ''));
      status.textContent = `${tasks.length} tugas untuk Anda`;
      if (!tasks.length) list.append(element('p', 'Belum ada tugas. Hubungi owner jika Anda menunggu penugasan.', 'bg-white border rounded-xl p-5 text-sm'));
      const today = jakartaDate();
      const groups = [
        ['Hari ini', tasks.filter((task) => task.data().dueDate === today && task.data().status !== 'DONE')],
        ['Terlambat', tasks.filter((task) => task.data().dueDate < today && task.data().status !== 'DONE')],
        ['Mendatang', tasks.filter((task) => task.data().dueDate > today && task.data().status !== 'DONE')],
        ['Selesai', tasks.filter((task) => task.data().status === 'DONE')]
      ];
      for (const [heading, entries] of groups) {
        if (!entries.length) continue;
        list.append(element('h2', `${heading} (${entries.length})`, 'text-lg font-bold mt-5 mb-2'));
        for (const task of entries) {
        const item = task.data();
        const card = element('article', '', 'bg-white border border-slate-200 rounded-2xl p-5 shadow-sm');
        const priority = item.priority === 'Mendesak' ? ' • Mendesak' : '';
        card.append(element('h2', item.title || 'Tugas kebersihan', 'font-bold text-lg'),
          element('p', `${item.property || 'Properti'} / ${item.room || 'Area umum'}`, 'text-sm text-slate-600 mt-1'),
          element('p', `Tenggat: ${formatDate(item.dueDate)}${priority} • ${item.status || 'TODO'}`, 'text-xs text-emerald-800 font-semibold mt-2'),
          element('p', item.instructions || 'Tidak ada instruksi tambahan.', 'text-sm mt-3 whitespace-pre-wrap'));
        const checklist = Array.isArray(item.checklist) ? item.checklist : [];
        const checked = Array.isArray(item.checkedItems) ? item.checkedItems : [];
        if (checklist.length) {
          const checklistBox = element('div', '', 'space-y-2 mt-4');
          checklistBox.append(element('h3', `Checklist ${checked.length}/${checklist.length}`, 'text-sm font-bold'));
          for (const step of checklist) {
            const label = element('label', '', 'flex items-start gap-2 text-sm');
            const checkbox = element('input'); checkbox.type = 'checkbox'; checkbox.checked = checked.includes(step); checkbox.disabled = item.status === 'DONE';
            checkbox.onchange = async () => {
              const next = checkbox.checked ? [...new Set([...checked, step])] : checked.filter((entry) => entry !== step);
              try { await updateDoc(task.ref, { checkedItems: next, updatedAt: new Date().toISOString() }); await refresh(); }
              catch (error) { status.textContent = `Gagal menyimpan checklist: ${error.message}`; checkbox.checked = !checkbox.checked; }
            };
            label.append(checkbox, element('span', step)); checklistBox.append(label);
          }
          card.append(checklistBox);
        }
        const taskPhotos = photoSnapshot.docs.filter((photo) => photo.data().taskId === task.id);
        card.append(element('p', `${taskPhotos.length} foto bukti • ${taskPhotos.filter((photo) => photo.data().status === 'PENDING').length} menunggu arsip Drive`, 'text-xs text-slate-500 mt-3'));
        const upload = element('div', '', 'flex flex-wrap items-center gap-2 mt-3');
        const kind = element('select', '', 'border rounded-lg p-2 text-sm');
        for (const [value, label] of [['BEFORE', 'Sebelum'], ['AFTER', 'Sesudah'], ['OTHER', 'Lainnya']]) {
          const option = element('option', label); option.value = value; kind.append(option);
        }
        const file = element('input', '', 'text-sm max-w-full');
        file.type = 'file'; file.accept = 'image/*'; file.setAttribute('aria-label', 'Pilih foto bukti');
        const send = action('Unggah foto', async () => {
          if (!file.files?.[0]) return status.textContent = 'Pilih foto dahulu.';
          send.disabled = true; status.textContent = 'Mengompresi dan mengunggah foto...';
          try {
            const data = await compressedJpeg(file.files[0]);
            await addDoc(collection(db, 'cleaningPhotos'), {
              ownerUid, taskId: task.id, uploadedBy: account.uid, status: 'PENDING',
              mimeType: 'image/jpeg', kind: kind.value, data, createdAt: new Date().toISOString()
            });
            await refresh();
          } catch (error) { status.textContent = `Gagal unggah foto: ${error.message}`; }
          finally { send.disabled = false; }
        });
        upload.append(kind, file, send); card.append(upload);
        const note = element('textarea', '', 'w-full border rounded-lg p-2 mt-3 text-sm');
        note.placeholder = 'Catatan pekerjaan atau kendala'; note.maxLength = 1000; note.value = item.note || '';
        const buttons = element('div', '', 'flex flex-wrap gap-2 mt-3');
        async function changeStatus(nextStatus) {
          try {
            if (nextStatus === 'DONE' && checklist.length && checked.length !== checklist.length) throw Error('Centang seluruh checklist sebelum selesai.');
            const now = new Date().toISOString();
            await updateDoc(task.ref, { status: nextStatus, note: note.value.trim(), completedAt: nextStatus === 'DONE' ? now : null, updatedAt: now });
            await refresh();
          } catch (error) { status.textContent = `Gagal menyimpan: ${error.message}`; }
        }
        if (item.status !== 'DONE') {
          buttons.append(action('Mulai', () => void changeStatus('IN_PROGRESS'), 'bg-blue-600 text-white'));
          buttons.append(action('Selesai', () => void changeStatus('DONE')));
        } else {
          buttons.append(action('Perbarui catatan', () => void changeStatus('DONE'), 'bg-slate-100 text-slate-800'));
        }
        card.append(note, buttons); list.append(card);
        }
      }
    } catch (error) { status.textContent = `Gagal memuat tugas: ${error.message}`; }
  }
  void refresh();
}

