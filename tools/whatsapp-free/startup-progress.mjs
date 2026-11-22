export function createStartupProgress(onUpdate, timeoutMs = 120000) {
  let timer;
  let slowError = '';
  let message = 'Menjalankan browser pendamping.';
  const stop = () => { clearTimeout(timer); timer = undefined; };
  const update = (status, nextMessage, error = '') => {
    message = nextMessage;
    if (['WAITING_QR', 'READY', 'FAILED', 'DISCONNECTED'].includes(status)) stop();
    if (['WAITING_QR', 'READY', 'AUTHENTICATED'].includes(status)) slowError = '';
    if (slowError && ['STARTING', 'LOADING'].includes(status)) {
      onUpdate({status:'STARTUP_SLOW', message, error:slowError});
      return;
    }
    onUpdate({status, message, error});
  };
  const start = () => {
    stop();
    slowError = '';
    timer = setTimeout(() => {
      slowError = 'Persiapan lebih dari 2 menit. Tahap terakhir: ' + message +
        ' Tutup pendamping dengan Ctrl+C, lalu jalankan Diagnosa-WhatsApp.cmd. Periksa halaman WhatsApp pada jendela browser yang muncul.';
      update('STARTUP_SLOW', message, slowError);
    }, timeoutMs);
    timer.unref?.();
  };
  start();
  return {update, start, stop};
}
