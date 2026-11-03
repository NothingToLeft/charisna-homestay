import { VaultStore } from './vault-store.js';

export async function unlockVault(accountKey, onLogout) {
  const store = new VaultStore(localStorage, accountKey);
  const dialog = document.createElement('dialog');
  dialog.className = 'vault-dialog';
  const creating = !store.exists();
  dialog.innerHTML = `<form><h2>${creating ? 'Amankan data perangkat' : 'Buka brankas CHARISNA KOST'}</h2>
    <p>${creating ? 'Buat kata sandi khusus minimal 12 karakter. Simpan di pengelola sandi. Jika lupa, data lokal tidak bisa dibuka tanpa cadangan.' : 'Masukkan kata sandi brankas perangkat ini. Kata sandi ini berbeda dari login Google/Firebase.'}</p>
    <label>Kata sandi brankas<input name="password" type="password" minlength="12" required autocomplete="${creating ? 'new-password' : 'current-password'}"></label>
    ${creating ? '<label>Ulangi kata sandi<input name="confirmation" type="password" minlength="12" required autocomplete="new-password"></label>' : ''}
    <p role="status"></p><button type="submit">${creating ? 'Enkripsi dan lanjutkan' : 'Buka'}</button>
    <button type="button" data-logout>Keluar akun</button></form>`;
  dialog.addEventListener('cancel', event => event.preventDefault());
  document.body.append(dialog);
  dialog.showModal();
  dialog.querySelector('[data-logout]').onclick = onLogout;
  return new Promise(resolve => {
    dialog.querySelector('form').onsubmit = async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const status = form.querySelector('[role=status]');
      const password = form.elements.password.value;
      if (creating && password !== form.elements.confirmation.value) { status.textContent = 'Kata sandi tidak sama.'; return; }
      form.querySelector('button[type=submit]').disabled = true;
      try {
        const data = await store.unlock(password, window.charisnaData.snapshot(), window.charisnaData.validate);
        window.charisnaVault = store;
        window.charisnaData.hydrate(data);
        form.reset(); dialog.close(); dialog.remove(); resolve(store);
      } catch (error) { status.textContent = error.message; }
      finally { if (form.isConnected) form.querySelector('button[type=submit]').disabled = false; }
    };
  });
}

window.addEventListener('beforeunload', event => {
  const store = window.charisnaVault;
  if (store?.pending || store?.failed) { event.preventDefault(); event.returnValue = ''; }
});
