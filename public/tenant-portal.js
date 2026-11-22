import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import { getFirestore, doc, getDoc, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
const db = getFirestore(initializeApp({
  apiKey: 'AIzaSyCXu5b6BKVKYczMTIL8Nc-MuLvLQdiQXtI',
  authDomain: 'charisna-kost-manager.firebaseapp.com', projectId: 'charisna-kost-manager',
  appId: '1:307208439143:web:ba437f97b3f3cee0c65bc2'
}));
const token = location.hash.slice(1);
const status = document.getElementById('status');
const content = document.getElementById('content');
function line(text) {
  const node = document.createElement('p'); node.textContent = text; return node;
}
try {
  if (!/^[a-f0-9]{64}$/.test(token)) throw Error('Tautan tidak valid.');
  const entry = await getDoc(doc(db, 'tenantPortals', token));
  if (!entry.exists()) throw Error('Tautan telah dicabut.');
  const data = entry.data(), snapshot = data.snapshot;
  content.append(line(snapshot.name + ' · Unit ' + snapshot.room),
    line('Akhir sewa: ' + (snapshot.endDate || 'Hubungi pengelola')));
  for (const bill of snapshot.bills || []) {
    content.append(line(`${bill.id} · Rp ${Number(bill.amount).toLocaleString('id-ID')} · ${bill.status} ${bill.paidDate}`));
  }
  if (/^data:image\/(png|jpeg);base64,/.test(snapshot.qrisImage || '')) {
    const image = document.createElement('img'); image.src = snapshot.qrisImage;
    image.alt = 'QRIS merchant'; content.append(image, line('Masukkan nominal tagihan. Pengelola memeriksa bukti pembayaran.'));
  }
  const print = document.createElement('button'); print.textContent = 'Cetak ringkasan dan riwayat pembayaran';
  print.onclick = () => window.print(); content.append(print);
  if (snapshot.qrisPayload) for (const bill of snapshot.bills || []) {
    if (bill.status === 'LUNAS') continue;
    const pay=document.createElement('button'); pay.textContent='QRIS '+bill.id+' · Rp '+Number(bill.amount).toLocaleString('id-ID');
    pay.onclick=()=> {
      try {
        let qr=document.getElementById('amount-qris');
        if (!qr) {qr=document.createElement('img');qr.id='amount-qris';qr.alt='QRIS sesuai nominal tagihan';content.append(qr);}
        qr.src=window.CharisnaQRIS.image(snapshot.qrisPayload,Number(bill.amount));
        status.textContent='Periksa nama merchant dan nominal pada aplikasi pembayaran sebelum membayar.';
      } catch(error) {status.textContent=error.message;}
    }; content.append(pay);
  }
  const form = document.createElement('form');
  const kind = document.createElement('select');
  kind.setAttribute('aria-label', 'Jenis kiriman');
  for (const [value, text] of [['PAYMENT','Bukti pembayaran'],['COMPLAINT','Keluhan fasilitas']]) {
    const option = document.createElement('option'); option.value = value; option.textContent = text; kind.append(option);
  }
  const message = document.createElement('textarea'); message.required = true; message.maxLength = 2000;
  message.placeholder = 'Nomor tagihan, tanggal transfer atau rincian keluhan'; message.setAttribute('aria-label', message.placeholder);
  const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/jpeg,image/png,image/webp';
  file.setAttribute('aria-label', 'Foto bukti atau keluhan');
  const send = document.createElement('button'); send.textContent = 'Kirim ke pengelola';
  form.append(kind, message, file, send); content.append(form);
  form.onsubmit = async event => {
    event.preventDefault(); send.disabled = true;
    try {
      let image = '';
      if (!message.value.trim()) throw Error('Isi rincian kiriman.');
      if (kind.value === 'PAYMENT' && !file.files[0]) throw Error('Pilih foto bukti pembayaran.');
      if (file.files[0]) {
        const photo = file.files[0];
        if (!['image/jpeg','image/png','image/webp'].includes(photo.type) || photo.size > 140000) throw Error('Foto maksimum 140 KB, JPEG/PNG/WebP.');
        image = await new Promise((resolve,reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(Error('Foto gagal dibaca.')); reader.readAsDataURL(photo);
        });
      }
      await addDoc(collection(db,'tenantSubmissions'), {token,ownerUid:data.ownerUid,kind:kind.value,
        message:message.value.trim(),image,createdAt:serverTimestamp()});
      status.textContent = 'Kiriman diterima. Pengelola akan memeriksa pembayaran atau keluhan.';
      form.reset();
    } catch (error) { status.textContent = error.message; }
    finally {send.disabled = false;}
  };
  status.textContent = 'Data terakhir yang diterbitkan pengelola.';
} catch (error) { status.textContent = 'Portal tidak dapat dibuka. Minta tautan baru kepada pengelola. ' + error.message; }
