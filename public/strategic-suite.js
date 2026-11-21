(() => {
  const make = (tag, text = '') => {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  };
  function dialog(title) {
    const node = make('dialog');
    node.className = 'rounded-2xl p-5 w-[min(94vw,680px)] max-h-[85vh] overflow-auto space-y-3';
    const close = make('button', 'Tutup');
    close.onclick = () => node.close();
    node.append(make('h2', title), close);
    node.addEventListener('close', () => node.remove(), { once: true });
    document.body.append(node);
    node.showModal();
    return node;
  }
  function button(text, action) {
    const node = make('button', text);
    node.className = 'rounded-xl border px-4 py-2';
    node.onclick = async () => {
      node.disabled = true;
      try { await action(); } catch (error) { showToast(error.message, 'danger'); }
      finally { node.disabled = false; }
    };
    return node;
  }
  function field(parent, text, type = 'text') {
    const label = make('label', text);
    label.className = 'block';
    const input = make(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type;
    input.className = 'block w-full rounded-lg border p-2';
    label.append(input);
    parent.append(label);
    return input;
  }
  function chooseTenant(parent) {
    const select = make('select');
    select.className = 'block w-full rounded-lg border p-2';
    for (const tenant of appData.tenants) {
      const option = make('option', tenant.name + ' · ' + tenant.roomNumber);
      option.value = tenant.id;
      select.append(option);
    }
    parent.append(select);
    return select;
  }
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = make('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function handover() {
    const modal = dialog('Berita Acara Masuk Kamar');
    const tenantSelect = chooseTenant(modal);
    const condition = field(modal, 'Kondisi AC, kasur, dinding dan kamar mandi', 'textarea');
    condition.maxLength = 2000;
    const photos = field(modal, 'Foto kondisi awal (maksimum 4)', 'file');
    photos.accept = 'image/jpeg,image/png,image/webp'; photos.multiple = true;
    const canvas = make('canvas');
    canvas.width = 480; canvas.height = 160;
    canvas.style.cssText = 'width:100%;height:160px;touch-action:none;border:1px solid #94a3b8';
    canvas.setAttribute('aria-label', 'Area paraf penghuni');
    const context = canvas.getContext('2d');
    let drawing = false, signed = false;
    const point = event => {
      const box = canvas.getBoundingClientRect();
      return [(event.clientX - box.left) * canvas.width / box.width, (event.clientY - box.top) * canvas.height / box.height];
    };
    canvas.onpointerdown = event => {
      drawing = true; canvas.setPointerCapture(event.pointerId);
      context.beginPath(); context.moveTo(...point(event));
    };
    canvas.onpointermove = event => {
      if (!drawing) return;
      signed = true; context.lineTo(...point(event)); context.stroke();
    };
    canvas.onpointerup = canvas.onpointercancel = () => { drawing = false; };
    modal.append(make('p', 'Paraf penghuni pada kotak berikut.'), canvas,
      button('Hapus paraf', () => { context.clearRect(0, 0, 480, 160); signed = false; }));
    modal.append(button('Simpan berita acara', async () => {
      const tenant = appData.tenants.find(item => item.id === tenantSelect.value);
      if (!tenant || !condition.value.trim() || !signed) throw Error('Pilih penghuni, isi kondisi dan paraf.');
      if (photos.files.length > 4) throw Error('Maksimum empat foto.');
      const images = [];
      for (const file of photos.files) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5e6) throw Error('Foto maksimum 5 MB, gunakan JPEG/PNG/WebP.');
        images.push(await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(Error('Foto gagal dibaca.'));
          reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(Error('Foto tidak valid.'));
            image.onload = () => {
              const target = document.createElement('canvas');
              const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
              target.width = Math.max(1, Math.round(image.width * scale));
              target.height = Math.max(1, Math.round(image.height * scale));
              target.getContext('2d').drawImage(image, 0, 0, target.width, target.height);
              resolve(target.toDataURL('image/jpeg', 0.65));
            };
            image.src = reader.result;
          };
          reader.readAsDataURL(file);
        }));
      }
      appData.handovers ||= [];
      appData.handovers.push({ id: crypto.randomUUID(), tenantId: tenant.id, roomNumber: tenant.roomNumber,
        condition: condition.value.trim(), photos: images, signature: canvas.toDataURL(), createdAt: new Date().toISOString() });
      if (await saveData()) { modal.close(); showToast('Berita acara tersimpan.'); }
    }));
    for (const entry of appData.handovers || []) {
      modal.append(button('Lihat berita acara · ' + entry.roomNumber + ' · ' + entry.createdAt.slice(0, 10), () => {
        const view = dialog('Berita Acara');
        view.append(make('p', entry.condition));
        for (const src of [...entry.photos, entry.signature]) {
          if (!/^data:image\/(jpeg|png);base64,/.test(src)) continue;
          const image = make('img'); image.src = src; image.alt = 'Dokumentasi serah terima'; view.append(image);
        }
      }));
    }
  }
  function records() {
    const modal = dialog('Catatan Internal Penghuni');
    const select = chooseTenant(modal);
    const subject = field(modal, 'Nama penghuni lama (opsional)');
    const note = field(modal, 'Kejadian faktual, tanggal dan tindak lanjut', 'textarea');
    note.maxLength = 2000;
    modal.append(button('Simpan catatan', async () => {
      const tenant = appData.tenants.find(item => item.id === select.value);
      const name = subject.value.trim() || tenant?.name;
      if (!name || !note.value.trim()) throw Error('Isi nama dan catatan.');
      appData.tenantNotes ||= [];
      appData.tenantNotes.push({ id: crypto.randomUUID(), name, tenantId: subject.value.trim() ? null : tenant?.id,
        note: note.value.trim(), createdAt: new Date().toISOString() });
      if (await saveData()) { modal.close(); records(); }
    }));
    const search = field(modal, 'Cari nama', 'search');
    const list = make('div'); modal.append(list);
    const render = () => {
      list.replaceChildren();
      for (const entry of appData.tenantNotes || []) {
        if (!entry.name.toLowerCase().includes(search.value.toLowerCase())) continue;
        const row = make('article');
        row.append(make('h3', entry.name), make('p', entry.createdAt), make('p', entry.note),
          button('Hapus catatan', async () => {
            if (!confirm('Hapus catatan ini?')) return;
            appData.tenantNotes = appData.tenantNotes.filter(item => item.id !== entry.id);
            if (await saveData()) render();
          }));
        list.append(row);
      }
    };
    search.oninput = render; render();
  }
  function catalog() {
    const modal = dialog('Katalog Kamar Kosong');
    const selected = [];
    for (const room of getScopedRooms().filter(item => item.status === 'KOSONG')) {
      const label = make('label');
      const checkbox = make('input'); checkbox.type = 'checkbox';
      label.append(checkbox, make('span', ' Unit ' + room.number + ' · ' + formatRupiah(room.price)));
      modal.append(label, make('br'));
      selected.push({ room, checkbox });
    }
    modal.append(make('p', 'Pilih kamar yang boleh dipublikasikan. File katalog dapat diunggah ke hosting atau dibagikan.'));
    modal.append(button('Terbitkan pilihan / perbarui tautan', async () => {
      const rooms = selected.filter(item => item.checkbox.checked).map(({room}) => ({
        number:room.number,type:room.type || '',facilities:room.facilities || '',price:Number(room.price) || 0
      }));
      const url = await window.charisnaPortal.catalog(rooms);
      const link = field(modal, 'Tautan katalog publik'); link.value = url; link.readOnly = true;
    }));
    modal.append(button('Unduh katalog HTML', () => {
      const page = document.implementation.createHTMLDocument(appData.settings.kostName);
      const viewport = page.createElement('meta'); viewport.name = 'viewport'; viewport.content = 'width=device-width, initial-scale=1';
      page.head.append(viewport);
      const heading = page.createElement('h1'); heading.textContent = appData.settings.kostName; page.body.append(heading);
      for (const {room, checkbox} of selected) {
        if (!checkbox.checked) continue;
        const article = page.createElement('article');
        article.style.cssText = 'padding:20px;margin:16px;border:1px solid #ccc;border-radius:12px';
        for (const text of ['Unit ' + room.number, room.type || '', room.facilities || '', formatRupiah(room.price) + '/bulan']) {
          const line = page.createElement('p'); line.textContent = text; article.append(line);
        }
        page.body.append(article);
      }
      download('katalog-charisna.html', '<!doctype html>' + page.documentElement.outerHTML, 'text/html;charset=utf-8');
    }));
  }

  function qrisSettings() {
    const modal = dialog('QRIS Merchant');
    modal.append(make('p', 'Unggah QRIS resmi merchant. Penghuni memasukkan nominal sesuai tagihan dan owner memverifikasi pembayaran.'));
    const file = field(modal, 'Gambar QRIS PNG/JPEG (maksimum 500 KB)', 'file');
    file.accept = 'image/png,image/jpeg';
    modal.append(button('Simpan QRIS', async () => {
      const photo = file.files[0];
      if (!photo || !['image/png','image/jpeg'].includes(photo.type) || photo.size > 500000) throw Error('Gunakan PNG/JPEG maksimum 500 KB.');
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(Error('Gambar gagal dibaca.'));
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(photo);
      });
      await new Promise((resolve, reject) => {
        const preview = new Image(); preview.onload = resolve;
        preview.onerror = () => reject(Error('Gambar QRIS tidak valid.')); preview.src = image;
      });
      appData.settings.qrisImage = image;
      if (await saveData()) { modal.close(); showToast('QRIS tersimpan.'); }
    }));
    if (/^data:image\/(png|jpeg);base64,/.test(appData.settings.qrisImage || '')) {
      const image = make('img'); image.src = appData.settings.qrisImage;
      image.alt = 'QRIS merchant'; image.style.maxWidth = '320px'; modal.append(image);
      modal.append(button('Hapus QRIS', async () => {
        if (!confirm('Hapus QRIS tersimpan?')) return;
        delete appData.settings.qrisImage;
        if (await saveData()) modal.close();
      }));
    }
  }

  function portal() {
    const modal = dialog('Portal Penghuni');
    const select = chooseTenant(modal);
    modal.append(make('p', 'Tautan privat berlaku 30 hari. Pemegang tautan dapat melihat ringkasan penghuni. Bagikan hanya kepada penghuni terkait.'));
    modal.append(button('Buat / perbarui tautan', async () => {
      const tenant = appData.tenants.find(item => item.id === select.value);
      if (!tenant) throw Error('Pilih penghuni.');
      if (appData.rooms.filter(room => room.number === tenant.roomNumber).length !== 1) throw Error('Nomor unit ambigu.');
      appData.privateIntegrations ||= {};
      appData.privateIntegrations.portalTokens ||= {};
      let token = appData.privateIntegrations.portalTokens[tenant.id];
      if (!token) {
        token = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
        appData.privateIntegrations.portalTokens[tenant.id] = token;
        if (!await saveData()) throw Error('Tautan belum disimpan.');
      }
      const bills = appData.bills.filter(bill => bill.roomNumber === tenant.roomNumber && (bill.tenantId === tenant.id || bill.tenantName === tenant.name));
      await window.charisnaPortal.publish(token, {
        name: tenant.name, room: tenant.roomNumber, endDate: tenant.endDate || '',
        bills: bills.map(bill => ({ id: bill.id, amount: bill.amount, status: bill.status, paidDate: bill.paidDate || '' }))
      });
      const link = field(modal, 'Salin tautan privat');
      link.value = 'https://nothingtoleft.github.io/charisna-homestay/tenant.html#' + token;
      link.readOnly = true; link.select();
    }));
    modal.append(button('Cabut tautan terpilih', async () => {
      const token = appData.privateIntegrations?.portalTokens?.[select.value];
      if (!token) throw Error('Belum ada tautan.');
      await window.charisnaPortal.revoke(token);
      delete appData.privateIntegrations.portalTokens[select.value];
      if (await saveData()) showToast('Tautan dicabut.');
    }));
    modal.append(button('Lihat bukti bayar dan keluhan', async () => {
      const entries = await window.charisnaPortal.inbox();
      const inbox = dialog('Kiriman Penghuni');
      for (const entry of entries) {
        const row = make('article');
        const tenantId = Object.entries(appData.privateIntegrations?.portalTokens || {}).find(([, token]) => token === entry.token)?.[0];
        const tenant = appData.tenants.find(item => item.id === tenantId);
        row.append(make('h3', entry.kind === 'PAYMENT' ? 'Bukti bayar menunggu pemeriksaan' : 'Keluhan'),
          make('p', tenant?.name || 'Tautan lama / penghuni keluar'), make('p', entry.message));
        if (/^data:image\/(jpeg|png|webp);base64,/.test(entry.image)) {
          const image = make('img'); image.src = entry.image; image.alt = 'Lampiran penghuni'; row.append(image);
        }
        if (entry.kind === 'COMPLAINT' && tenant) row.append(button('Jadikan tiket perbaikan', async () => {
          if (appData.complaints.some(item => item.submissionId === entry.id)) throw Error('Tiket sudah dibuat.');
          appData.complaints.unshift({id:'C-' + crypto.randomUUID(), submissionId:entry.id, roomNumber:tenant.roomNumber,
            title:'Laporan penghuni', desc:entry.message, status:'REPORTED',priority:'Normal',date:new Date().toISOString().slice(0,10)});
          if (await saveData()) showToast('Tiket tersimpan.');
        }));
        row.append(button('Hapus kiriman', async () => {
          if (!confirm('Hapus kiriman ini?')) return;
          await window.charisnaPortal.remove(entry.id); row.remove();
        }));
        inbox.append(row);
      }
      if (!entries.length) inbox.append(make('p', 'Belum ada kiriman.'));
    }));
  }
  const actions = document.getElementById('strategicActions');
  if (actions) actions.append(button('Serah terima kamar', handover), button('Catatan penghuni', records), button('Katalog kamar kosong', catalog), button('QRIS merchant', qrisSettings), button('Portal penghuni', portal));
})();
