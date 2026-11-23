(() => {
  const make = (tag, text = '') => {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  };
  function dialog(title) {
    const opener = document.activeElement;
    const node = make('dialog');
    node.className = 'suite-dialog';
    const header = make('header');header.className='suite-dialog__header';
    const heading = make('h2',title);heading.id='suite-title-'+crypto.randomUUID();
    node.setAttribute('aria-labelledby',heading.id);
    const close = make('button', 'Tutup');
    close.type='button';close.className='suite-dialog__close';
    close.onclick = () => node.close();
    header.append(heading,close);node.append(header);
    node.addEventListener('close', () => {node.remove();if(opener?.isConnected)opener.focus();}, { once: true });
    document.body.append(node);
    node.showModal();
    return node;
  }
  function button(text, action) {
    const node = make('button', text);
    node.type='button';
    node.className = 'suite-button';
    if (/^(Simpan|Buat|Terbitkan|Hubungkan)/.test(text))node.classList.add('suite-button--primary');
    if (/^(Hapus|Putuskan)/.test(text))node.classList.add('suite-button--danger');
    node.onclick = async () => {
      node.disabled = true;
      try { await action(); } catch (error) { showToast(error.message, 'danger'); }
      finally { node.disabled = false; }
    };
    return node;
  }
  function field(parent, text, type = 'text') {
    const label = make('label', text);
    label.className = 'suite-field';
    const input = make(type === 'textarea' ? 'textarea' : 'input');
    if (type !== 'textarea') input.type = type;
    input.className = 'block w-full rounded-lg border p-2';
    label.append(input);
    parent.append(label);
    return input;
  }
  function selectableTenants() {
    const scopedRooms = getScopedRooms();
    return (appData.tenants || []).filter(tenant => {
      if (tenant.roomId) return scopedRooms.some(room => room.id === tenant.roomId);
      const matches = appData.rooms.filter(room => room.number === tenant.roomNumber &&
        (!tenant.propertyId || (room.propertyId || 'PROP-1') === tenant.propertyId));
      return matches.length === 1 && scopedRooms.includes(matches[0]);
    });
  }
  function chooseTenant(parent) {
    const select = make('select');
    select.setAttribute('aria-label','Pilih penghuni');
    select.className = 'block w-full rounded-lg border p-2 text-sm';
    const tenants = selectableTenants();
    if (tenants.length === 0) {
      const option = make('option', 'Belum ada penghuni di properti ini');
      option.value = '';
      select.append(option);
      select.disabled = true;
    } else {
      const defaultOpt = make('option', 'Pilih penghuni di properti ini');
      defaultOpt.value = '';
      select.append(defaultOpt);
      for (const tenant of tenants) {
        const option = make('option', tenant.name + ' · ' + (tenant.roomNumber || '-'));
        option.value = tenant.id;
        select.append(option);
      }
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
    if (selectableTenants().length === 0) {
      showToast('Belum ada penghuni aktif untuk serah terima kamar.', 'warning');
      return;
    }
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
      const tenant = selectableTenants().find(item => item.id === tenantSelect.value);
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
    const subject = field(modal, 'Nama penghuni lama (isi jika tidak memilih penghuni)');
    const note = field(modal, 'Kejadian faktual, tanggal dan tindak lanjut', 'textarea');
    note.maxLength = 2000;
    modal.append(button('Simpan catatan', async () => {
      const tenant = selectableTenants().find(item => item.id === select.value);
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
      const filtered = (appData.tenantNotes || []).filter(entry => entry.name.toLowerCase().includes(search.value.toLowerCase()));
      if (filtered.length === 0) {
        const emptyMsg = make('p', 'Belum ada catatan internal tersimpan.');
        emptyMsg.className = 'text-xs text-slate-400 py-3 text-center italic';
        list.append(emptyMsg);
        return;
      }
      for (const entry of filtered) {
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
    for (const room of getScopedRooms().filter(item => item.status === 'KOSONG' && !item.turnover)) {
      const label = make('label');
      const checkbox = make('input'); checkbox.type = 'checkbox';
      label.append(checkbox, make('span', ' Unit ' + room.number + ' · ' + CharisnaRental.rateLabel(room)));
      const photo = field(modal, 'Foto pemasaran unit ' + room.number + ' (opsional, JPEG/PNG maksimum 140 KB)', 'file');
      photo.accept = 'image/png,image/jpeg';
      photo.onchange = async () => {
        const file = photo.files[0];
        if (!file) return;
        if (!['image/png','image/jpeg'].includes(file.type) || file.size > 140000) {
          showToast('Foto pemasaran maksimum 140 KB, JPEG/PNG.', 'warning'); photo.value = ''; return;
        }
        room.marketingImage = await new Promise((resolve,reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result);
          reader.onerror = reject; reader.readAsDataURL(file);
        });
        await saveData();
      };
      modal.append(label, make('br'));
      selected.push({ room, checkbox });
    }
    modal.append(make('p', 'Pilih kamar yang boleh dipublikasikan. File katalog dapat diunggah ke hosting atau dibagikan.'));
    modal.append(button('Terbitkan pilihan / perbarui tautan', async () => {
      const rooms = selected.filter(item => item.checkbox.checked).map(({room}) => ({
        number:room.number,type:room.type || '',facilities:room.facilities || '',price:Number(room.price) || 0,rentalMode:CharisnaRental.mode(room),nightlyPrice:Number(room.nightlyPrice) || 0,image:room.marketingImage || ''
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
        for (const text of ['Unit ' + room.number, room.type || '', room.facilities || '', CharisnaRental.rateLabel(room)]) {
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
      const bitmap = new Image();
      await new Promise((resolve,reject) => { bitmap.onload=resolve; bitmap.onerror=reject; bitmap.src=image; });
      const canvas = document.createElement('canvas');
      const scale = Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
      canvas.width=Math.round(bitmap.width*scale); canvas.height=Math.round(bitmap.height*scale);
      const ctx=canvas.getContext('2d'); ctx.fillStyle='white'; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
      const decoded=window.jsQR(pixels.data,canvas.width,canvas.height);
      if (!decoded) throw Error('Barcode belum terbaca. Unggah gambar QRIS yang jelas.');
      const parsed=window.CharisnaQRIS.parse(decoded.data);
      window.CharisnaQRIS.amountPayload(decoded.data,1);
      if (!confirm('Simpan QRIS merchant '+parsed.values['59']+'? Pastikan nama sesuai usaha Anda.')) return;
      appData.settings.qrisPayload=decoded.data;
      appData.settings.qrisImage = image;
      if (await saveData()) { modal.close(); showToast('QRIS tersimpan.'); }
    }));
    if (/^data:image\/(png|jpeg);base64,/.test(appData.settings.qrisImage || '')) {
      const image = make('img'); image.src = appData.settings.qrisImage;
      image.alt = 'QRIS merchant'; image.style.maxWidth = '320px'; modal.append(image);
      modal.append(button('Hapus QRIS', async () => {
        if (!confirm('Hapus QRIS tersimpan?')) return;
        delete appData.settings.qrisImage; delete appData.settings.qrisPayload;
        if (await saveData()) modal.close();
      }));
    }
  }

  function portal() {
    if (selectableTenants().length === 0) {
      showToast('Belum ada penghuni aktif untuk membuat portal.', 'warning');
      return;
    }
    const modal = dialog('Portal Penghuni');
    const select = chooseTenant(modal);
    modal.append(make('p', 'Tautan privat berlaku 30 hari. Pemegang tautan dapat melihat ringkasan penghuni. Bagikan hanya kepada penghuni terkait.'));
    modal.append(button('Buat / perbarui tautan', async () => {
      const tenant = selectableTenants().find(item => item.id === select.value);
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
        qrisImage: appData.settings.qrisImage || '', qrisPayload: appData.settings.qrisPayload || '',
        bills: bills.slice(-60).map(bill => ({ id: bill.id, amount: bill.amount, status: bill.status, paidDate: bill.paidDate || '' }))
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

  function insights() {
    const modal = dialog('Ringkasan Bulanan');
    modal.append(button('Hubungkan Charisna Money Management', async () => {
      if (!confirm('Terbitkan ringkasan keuangan melalui kode privat untuk Charisna Money Management?')) return;
      const token=await window.charisnaMoneyFeed.connect();
      const input=field(modal,'Kode privat Money Management (berlaku 30 hari sejak sinkron terakhir)'); input.type='password';input.value=token;
      modal.append(make('p','Masukkan kode ini di Pengaturan Money Management → Ringkasan CHARISNA KOST.'));
    }),button('Putuskan Money Management',async()=>{await window.charisnaMoneyFeed.revoke();showToast('Koneksi dicabut.');}));
    const month = field(modal, 'Bulan', 'month');
    month.value = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Jakarta'}).format(new Date()).slice(0,7);
    modal.append(make('p', 'SuperApp memakai koneksi di Cloud & Akun. Ekspor berikut berisi ringkasan untuk MoniFlow.'));
    modal.append(button('Unduh ringkasan keuangan JSON', () => {
      if (!/^\d{4}-\d{2}$/.test(month.value)) throw Error('Pilih bulan.');
      const properties = appData.properties.map(property => {
        const rooms = appData.rooms.filter(room => room.propertyId === property.id);
        const numbers = new Set(rooms.map(room => room.number));
        const unique = number => appData.rooms.filter(room => room.number === number).length === 1;
        const bills = appData.bills.filter(bill => bill.propertyId === property.id || (!bill.propertyId && numbers.has(bill.roomNumber) && unique(bill.roomNumber)));
        const revenue = bills.filter(bill => bill.status === 'LUNAS' && bill.paidDate?.startsWith(month.value)).reduce((sum,bill) => sum + Number(bill.amount || 0),0);
        const expenses = appData.expenses.filter(expense => expense.propertyId === property.id && expense.date?.startsWith(month.value)).reduce((sum,expense) => sum + Number(expense.amount || 0),0);
        return {propertyId:property.id,name:property.name,revenue,expenses,net:revenue-expenses,
          totalRooms:rooms.length,occupiedRooms:rooms.filter(room => room.status === 'TERISI').length};
      });
      const unassignedExpenses = appData.expenses.filter(expense => !expense.propertyId && expense.date?.startsWith(month.value)).reduce((sum,expense) => sum + Number(expense.amount || 0),0);
      download('charisna-insights-' + month.value + '.json', JSON.stringify({schema:1,month:month.value,properties,unassignedExpenses},null,2),'application/json');
    }));
  }

  const waEndpoint='http://127.0.0.1:8772';
  function whatsappSettings() {
    const opener=document.activeElement;
    const modal=dialog('Koneksi WhatsApp');
    modal.className='wa-settings';
    modal.setAttribute('aria-labelledby','wa-settings-title');
    modal.setAttribute('aria-describedby','wa-settings-description');
    const header=make('header');header.className='wa-settings__header';
    const heading=make('div');
    const title=make('h2','Koneksi WhatsApp');title.id='wa-settings-title';
    const description=make('p','Hubungkan WhatsApp untuk mengirim pengumuman ke penghuni.');
    description.id='wa-settings-description';
    heading.append(title,description);
    const close=make('button','Tutup');close.type='button';close.className='wa-settings__close';
    close.onclick=()=>modal.close();header.append(heading,close);
    modal.replaceChildren(header);
    modal.addEventListener('close',()=>opener?.isConnected && opener.focus(),{once:true});
    const body=make('div');body.className='wa-settings__body';modal.append(body);
    const status=make('section');status.className='wa-settings__status';status.dataset.state='idle';
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
    const statusTitle=make('h3','Belum terhubung');
    const statusText=make('p','Jalankan pendamping di perangkat ini, lalu masukkan kode penghubung.');
    status.append(statusTitle,statusText);body.append(status);
    const setStatus=(state,title,text)=>{status.dataset.state=state;statusTitle.textContent=title;statusText.textContent=text;};
    const form=make('form');form.className='wa-settings__form';body.append(form);
    const label=make('label','Kode penghubung');label.htmlFor='wa-connection-code';
    const inputRow=make('div');inputRow.className='wa-settings__input';
    const token=make('input');token.type='password';token.id='wa-connection-code';token.autocomplete='off';
    token.spellcheck=false;token.maxLength=64;token.setAttribute('aria-describedby','wa-code-help wa-code-error');
    const hasSavedToken=()=>Boolean(appData.privateIntegrations?.whatsappToken);
    token.placeholder=hasSavedToken()?'Kode sudah tersimpan':'Tempel kode dari halaman pendamping';
    const reveal=make('button','Lihat');reveal.type='button';reveal.setAttribute('aria-label','Tampilkan kode penghubung');
    reveal.disabled=true;
    reveal.setAttribute('aria-pressed','false');
    reveal.onclick=()=>{const visible=token.type==='password';token.type=visible?'text':'password';reveal.textContent=visible?'Sembunyikan':'Lihat';reveal.setAttribute('aria-pressed',String(visible));reveal.setAttribute('aria-label',visible?'Sembunyikan kode penghubung':'Tampilkan kode penghubung');};
    inputRow.append(token,reveal);
    const help=make('p','Salin kode dari halaman pendamping. Kode ini bukan PIN atau kata sandi WhatsApp.');help.id='wa-code-help';help.className='wa-settings__hint';
    const error=make('p');error.id='wa-code-error';error.className='wa-settings__error';error.setAttribute('role','alert');error.hidden=true;
    token.oninput=()=>{token.removeAttribute('aria-invalid');error.hidden=true;reveal.disabled=!token.value;};
    const actions=make('div');actions.className='wa-settings__actions';
    const save=make('button','Simpan & cek koneksi');save.type='submit';save.className='wa-settings__primary';
    const open=make('a','Buka pendamping');open.href=waEndpoint;open.target='_blank';open.rel='noopener noreferrer';open.className='wa-settings__secondary';
    actions.append(save,open);form.append(label,inputRow,help,error,actions);
    let checking=false;
    async function checkConnection(persist) {
      if(checking)return;
      const value=token.value.trim() || appData.privateIntegrations?.whatsappToken || '';
      if(!/^[a-f0-9]{64}$/.test(value)){
        token.setAttribute('aria-invalid','true');error.textContent='Tempel kode penghubung lengkap dari halaman pendamping.';error.hidden=false;token.focus();return;
      }
      checking=true;save.disabled=true;save.textContent='Memeriksa koneksi…';
      error.hidden=true;token.removeAttribute('aria-invalid');
      setStatus('checking','Memeriksa koneksi','Menghubungi pendamping WhatsApp di perangkat ini.');
      try {
        const response=await fetch(waEndpoint+'/health',{headers:{Authorization:'Bearer '+value},signal:AbortSignal.timeout(10000)});
        if(!response.ok)throw Error(response.status===401?'Kode penghubung ditolak. Salin ulang kode dari halaman pendamping.':'Pendamping belum dapat dihubungi. Buka pendamping dan periksa statusnya.');
        const health=await response.json();if(health.error)throw Error(health.error);
        if(persist && token.value.trim()){
          appData.privateIntegrations ||= {};
          const previous=appData.privateIntegrations.whatsappToken;
          appData.privateIntegrations.whatsappToken=value;
          let saved=false;
          try {saved=await saveData();} finally {
            if(!saved){if(previous===undefined)delete appData.privateIntegrations.whatsappToken;else appData.privateIntegrations.whatsappToken=previous;}
          }
          if(!saved)throw Error('Kode belum tersimpan. Coba simpan kembali.');
          token.value='';token.type='password';reveal.disabled=true;reveal.textContent='Lihat';reveal.setAttribute('aria-pressed','false');reveal.setAttribute('aria-label','Tampilkan kode penghubung');token.placeholder='Kode sudah tersimpan';
        }
        setStatus(health.ready?'connected':'pending',health.ready?'WhatsApp terhubung':'Menunggu WhatsApp siap',health.ready?'Siap mengirim. Buat pesan melalui Pengumuman dan periksa penerima sebelum mengirim.':'Buka pendamping untuk melihat progres atau scan QR jika diminta.');
      } catch(failure){
        const message=['TypeError','TimeoutError','AbortError'].includes(failure.name)?'Pendamping tidak terjangkau. Jalankan pendamping di laptop / PC ini, lalu coba lagi. Jika browser meminta akses jaringan lokal, izinkan untuk aplikasi ini.':failure.message;
        setStatus('error','Koneksi belum berhasil',message);
      } finally {checking=false;save.disabled=false;save.textContent='Simpan & cek koneksi';}
    }
    form.onsubmit=event=>{event.preventDefault();void checkConnection(true);};
    const queue=make('section');queue.className='wa-settings__queue';
    const queueTitle=make('h3','Pengiriman terakhir');
    const queueText=make('p','Periksa progres sebelum mengirim ulang pesan.');queueText.setAttribute('role','status');
    const checkQueue=button('Cek pengiriman',async()=>{
      const integration=appData.privateIntegrations;
      if(!integration?.whatsappJob){queueText.textContent='Belum ada pengiriman dari aplikasi ini.';return;}
      checkQueue.textContent='Memeriksa…';queueText.textContent='Memeriksa progres pengiriman…';
      try {
        const response=await fetch(waEndpoint+'/jobs/'+integration.whatsappJob,{headers:{Authorization:'Bearer '+integration.whatsappToken},signal:AbortSignal.timeout(10000)});
        if(!response.ok)throw Error('Pendamping tidak tersedia. Periksa koneksi di atas.');
        const state=await response.json();
        const labels={DONE:'Selesai',SENDING:'Sedang dikirim',UNCERTAIN:'Perlu diperiksa',UNKNOWN:'Tidak ditemukan'};
        queueText.textContent=(labels[state.status] || 'Perlu diperiksa')+' · '+(state.sent||0)+' dari '+(state.total||0)+' pesan.'+(state.status==='UNCERTAIN'?' Periksa WhatsApp sebelum mengirim ulang agar pesan tidak ganda.':'');
      } catch {queueText.textContent='Progres belum dapat diperiksa. Pastikan pendamping masih berjalan di perangkat ini.';}
      finally {checkQueue.textContent='Cek pengiriman';}
    });
    checkQueue.type='button';checkQueue.className='wa-settings__secondary';queue.append(queueTitle,queueText,checkQueue);body.append(queue);
    const setup=make('details');setup.className='wa-settings__setup';setup.append(make('summary','Menyiapkan laptop / PC baru'));
    const steps=make('ol');
    for(const text of ['Unduh pendamping, ekstrak ZIP, lalu jalankan Jalankan-WhatsApp.cmd.','Buka pendamping pada perangkat yang sama. Tautkan WhatsApp melalui QR jika diminta.','Salin kode penghubung ke kolom di atas, lalu simpan.'])steps.append(make('li',text));
    const download=make('a','Unduh pendamping Windows');download.href='https://github.com/NothingToLeft/charisna-homestay/releases/download/v1.0.6/CHARISNA-WhatsApp-PC-v1.0.6-fix2.zip';download.target='_blank';download.rel='noopener noreferrer';
    setup.append(steps,download);body.append(setup);
    const footer=make('p','Pendamping, laptop / PC, dan internet harus tetap aktif. Hindari mode sleep saat mengirim.');footer.className='wa-settings__footer';modal.append(footer);
    queueMicrotask(()=>{if(modal.open)close.focus();});
    if(hasSavedToken())void checkConnection(false);
  }
  window.sendFreeWhatsApp=async()=>{
    const token=appData.privateIntegrations?.whatsappToken;
    if(!token){whatsappSettings();return;}
    const message=document.getElementById('broadcastMessage').value.trim();
    if(!message||message.length>2000){showToast('Isi pesan maksimum 2.000 karakter.','warning');return;}
    const rooms=new Set(getScopedRooms().map(room=>room.number));
    const recipients=appData.tenants.filter(tenant=>rooms.has(tenant.roomNumber)&&appData.rooms.filter(room=>room.number===tenant.roomNumber).length===1);
    const phones=[...new Set(recipients.map(tenant=>cleanWaNumber(tenant.phone)).filter(phone=>/^62[0-9]{8,13}$/.test(phone)))];
    if(!phones.length||phones.length>50){showToast('Pilih 1–50 penerima valid dalam cakupan properti.','warning');return;}
    if(!confirm('Kirim otomatis melalui WhatsApp PC ke '+phones.length+' nomor?\n\n'+message))return;
    const id=crypto.randomUUID();appData.privateIntegrations.whatsappJob=id;
    if(!await saveData())return;
    try{
      const response=await fetch(waEndpoint+'/send',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({id,phones,message}),signal:AbortSignal.timeout(15000)});
      const result=await response.json();if(!response.ok)throw Error(result.error||'Pendamping menolak antrean.');
      showToast('Antrean dimulai. Cek progres melalui Pengaturan → WhatsApp gratis.');
    }catch(error){showToast(error.message+' Periksa antrean terakhir sebelum mencoba lagi.','danger');}
  };
  const actions = document.getElementById('strategicActions');
  if (actions) {
    const groups=[
      ['Penghuni',[
        ['Serah terima kamar','Kondisi awal, foto, dan paraf digital.',handover],
        ['Catatan penghuni','Riwayat dan tindak lanjut internal.',records],
        ['Portal penghuni','Tautan sewa, tagihan, dan bukti bayar.',portal]
      ]],
      ['Pemasaran & komunikasi',[
        ['Katalog kamar kosong','Pilih kamar untuk dibagikan ke calon penyewa.',catalog],
        ['WhatsApp gratis','Koneksi pendamping dan progres pengiriman.',whatsappSettings]
      ]],
      ['Pembayaran & laporan',[
        ['QRIS merchant','Atur QRIS untuk pembayaran penghuni.',qrisSettings],
        ['Ringkasan bulanan','Laporan dan koneksi aplikasi keuangan.',insights]
      ]]
    ];
    for(const [title,items] of groups){
      const group=make('section');group.className='service-group';group.append(make('h3',title));
      for(const [name,description,action] of items){
        const entry=button('',action);entry.className='service-action';
        entry.append(make('strong',name),make('span',description));
        group.append(entry);
      }
      actions.append(group);
    }
  }
})();
