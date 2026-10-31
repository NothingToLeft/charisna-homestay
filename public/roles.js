import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, where } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

export const OWNER_EMAIL = 'charisna.homestay@gmail.com';
export async function resolveRole(db, account) {
  if (account.email?.toLowerCase() === OWNER_EMAIL) return { role: 'OWNER', ownerUid: account.uid };
  const profile = await getDoc(doc(db, 'staff', account.uid));
  if (profile.exists() && profile.data().role === 'CLEANER' && profile.data().active === true) {
    return { role: 'CLEANER', ownerUid: profile.data().ownerUid };
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

export function setupOwnerManager({ db, account, onMessage }) {
  let dialog = document.getElementById('cleaning-manager');
  if (dialog) return;
  dialog = document.createElement('dialog');
  dialog.id = 'cleaning-manager';
  dialog.className = 'w-[min(96vw,900px)] max-h-[90vh] overflow-auto rounded-2xl border-0 p-5 shadow-2xl';
  dialog.innerHTML = `<div class="flex items-center justify-between mb-4"><h2 class="text-xl font-bold">Petugas Kebersihan</h2><button id="clean-close" class="rounded-lg bg-slate-100 px-3 py-2">Tutup</button></div><p class="text-sm text-slate-600 mb-4">Petugas mendaftar sendiri, lalu owner menyetujui. Tugas hanya terlihat oleh petugas yang ditunjuk.</p><p id="clean-manager-status" role="status" class="text-sm mb-3"></p><h3 class="font-bold mb-2">Permintaan akun</h3><div id="clean-requests" class="space-y-2 mb-5"></div><h3 class="font-bold mb-2">Petugas aktif</h3><div id="clean-staff" class="space-y-2 mb-5"></div><h3 class="font-bold mb-2">Buat tugas</h3><form id="clean-task-form" class="grid gap-2 sm:grid-cols-2 mb-5"><select id="clean-assignee" required class="border rounded-lg p-2"></select><input id="clean-title" required maxlength="120" placeholder="Tugas, contoh: Bersihkan kamar" class="border rounded-lg p-2"><input id="clean-property" required maxlength="80" placeholder="Properti / cabang" class="border rounded-lg p-2"><input id="clean-room" maxlength="40" placeholder="Unit / area" class="border rounded-lg p-2"><input id="clean-due" type="date" required class="border rounded-lg p-2"><select id="clean-priority" class="border rounded-lg p-2"><option>Normal</option><option>Mendesak</option></select><textarea id="clean-instructions" maxlength="1000" placeholder="Instruksi dan checklist" class="border rounded-lg p-2 sm:col-span-2"></textarea><button class="rounded-lg bg-emerald-600 text-white px-3 py-2 sm:col-span-2">Simpan tugas</button></form><h3 class="font-bold mb-2">Daftar tugas</h3><div id="clean-owner-tasks" class="space-y-2"></div>`;
  document.body.append(dialog);
  const launch = action('Petugas Kebersihan', () => { dialog.showModal(); void refresh(); });
  launch.style.cssText = 'position:fixed;right:12px;bottom:104px;z-index:9999';
  document.getElementById('open-cleaning-manager')?.addEventListener('click', () => { dialog.showModal(); void refresh(); });
  document.body.append(launch);
  dialog.querySelector('#clean-close').onclick = () => dialog.close();
  const status = (text) => { dialog.querySelector('#clean-manager-status').textContent = text; onMessage(text); };
  const requestList = dialog.querySelector('#clean-requests');
  const staffList = dialog.querySelector('#clean-staff');
  const taskList = dialog.querySelector('#clean-owner-tasks');
  const assignee = dialog.querySelector('#clean-assignee');
  async function refresh() {
    try {
      status('Memuat petugas dan tugas...');
      const [requests, staff, tasks] = await Promise.all([
        getDocs(collection(db, 'staffRequests')),
        getDocs(collection(db, 'staff')),
        getDocs(collection(db, 'users', account.uid, 'cleaningTasks'))
      ]);
      requestList.replaceChildren(); staffList.replaceChildren(); taskList.replaceChildren(); assignee.replaceChildren();
      for (const request of requests.docs) {
        const item = request.data();
        const row = element('div', `${item.email || request.id} meminta akses petugas`, 'border rounded-lg p-3 text-sm flex flex-wrap items-center justify-between gap-2');
        row.append(action('Setujui', async () => {
          try {
            await setDoc(doc(db, 'staff', request.id), { ownerUid: account.uid, role: 'CLEANER', email: item.email, active: true, approvedAt: new Date().toISOString() });
            await deleteDoc(request.ref); status('Akun petugas disetujui.'); await refresh();
          } catch (error) { status(`Gagal menyetujui: ${error.message}`); }
        })); requestList.append(row);
      }
      if (!requests.size) requestList.append(element('p', 'Belum ada permintaan.', 'text-sm text-slate-500'));
      const staffMap = new Map();
      for (const profile of staff.docs) {
        const item = profile.data();
        if (item.ownerUid !== account.uid) continue;
        staffMap.set(profile.id, item.email || profile.id);
        const row = element('div', `${item.email || profile.id} — ${item.active ? 'Aktif' : 'Nonaktif'}`, 'border rounded-lg p-3 text-sm flex flex-wrap items-center justify-between gap-2');
        row.append(action(item.active ? 'Nonaktifkan' : 'Aktifkan', async () => {
          try { await updateDoc(profile.ref, { active: !item.active }); await refresh(); }
          catch (error) { status(`Gagal mengubah akun: ${error.message}`); }
        }, 'bg-slate-100 text-slate-800'));
        staffList.append(row);
        if (item.active) { const option = element('option', item.email || profile.id); option.value = profile.id; assignee.append(option); }
      }
      if (!staffMap.size) staffList.append(element('p', 'Belum ada petugas disetujui.', 'text-sm text-slate-500'));
      for (const task of tasks.docs) {
        const item = task.data();
        const row = element('div', `${item.title} • ${item.property} / ${item.room || 'Area umum'} • ${formatDate(item.dueDate)} • ${item.status} • ${staffMap.get(item.assigneeUid) || 'Petugas tidak aktif'}`, 'border rounded-lg p-3 text-sm flex flex-wrap items-center justify-between gap-2');
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
    if (!assignee.value) return status('Setujui petugas dulu.');
    const value = (id) => dialog.querySelector(id).value.trim();
    try {
      await addDoc(collection(db, 'users', account.uid, 'cleaningTasks'), {
        assigneeUid: assignee.value, title: value('#clean-title'), property: value('#clean-property'),
        room: value('#clean-room'), dueDate: value('#clean-due'), priority: value('#clean-priority'),
        instructions: value('#clean-instructions'), status: 'TODO', note: '', completedAt: null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
      event.target.reset(); await refresh(); status('Tugas tersimpan.');
    } catch (error) { status(`Gagal menyimpan tugas: ${error.message}`); }
  };
}

export function renderCleanerPortal({ db, account, ownerUid, onLogout }) {
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
  titleWrap.append(element('p', 'CHARISNA KOST', 'text-xs uppercase tracking-widest text-emerald-200'), element('h1', 'Tugas Kebersihan', 'text-2xl font-bold'), element('p', account.email || 'Petugas', 'text-xs text-emerald-100 mt-1'));
  header.append(titleWrap, action('Keluar akun', onLogout, 'bg-white text-emerald-900'));
  const help = element('p', 'Lihat tugas yang ditugaskan, mulai pekerjaan, lalu tandai selesai dan isi catatan. Halaman ini tidak menampilkan data penghuni atau keuangan.', 'text-sm text-slate-600 my-4');
  const toolbar = element('div', '', 'flex flex-wrap items-center gap-2 mb-4');
  const status = element('p', 'Memuat tugas...', 'text-sm text-slate-600');
  const list = element('div', '', 'space-y-3');
  toolbar.append(action('Muat ulang', () => void refresh()), status);
  shell.append(header, help, toolbar, list); root.append(shell);
  async function refresh() {
    status.textContent = 'Memuat tugas...'; list.replaceChildren();
    try {
      const snapshot = await getDocs(query(collection(db, 'users', ownerUid, 'cleaningTasks'), where('assigneeUid', '==', account.uid)));
      const tasks = snapshot.docs.sort((a, b) => (a.data().dueDate || '').localeCompare(b.data().dueDate || ''));
      status.textContent = `${tasks.length} tugas untuk Anda`;
      if (!tasks.length) list.append(element('p', 'Belum ada tugas. Hubungi owner jika Anda menunggu penugasan.', 'bg-white border rounded-xl p-5 text-sm'));
      for (const task of tasks) {
        const item = task.data();
        const card = element('article', '', 'bg-white border border-slate-200 rounded-2xl p-5 shadow-sm');
        const priority = item.priority === 'Mendesak' ? ' • Mendesak' : '';
        card.append(element('h2', item.title || 'Tugas kebersihan', 'font-bold text-lg'),
          element('p', `${item.property || 'Properti'} / ${item.room || 'Area umum'}`, 'text-sm text-slate-600 mt-1'),
          element('p', `Tenggat: ${formatDate(item.dueDate)}${priority} • ${item.status || 'TODO'}`, 'text-xs text-emerald-800 font-semibold mt-2'),
          element('p', item.instructions || 'Tidak ada instruksi tambahan.', 'text-sm mt-3 whitespace-pre-wrap'));
        const note = element('textarea', '', 'w-full border rounded-lg p-2 mt-3 text-sm');
        note.placeholder = 'Catatan pekerjaan atau kendala'; note.maxLength = 1000; note.value = item.note || '';
        const buttons = element('div', '', 'flex flex-wrap gap-2 mt-3');
        async function changeStatus(nextStatus) {
          try {
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
    } catch (error) { status.textContent = `Gagal memuat tugas: ${error.message}`; }
  }
  void refresh();
}
