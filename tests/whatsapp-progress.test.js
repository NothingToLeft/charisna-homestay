import {afterEach, describe, expect, it, vi} from 'vitest';
import {createStartupProgress} from '../tools/whatsapp-free/startup-progress.mjs';

afterEach(() => vi.useRealTimers());
describe('WhatsApp startup progress', () => {
  it('reports the last startup stage after two minutes without pretending login failed', () => {
    vi.useFakeTimers();
    const report = vi.fn();
    const progress = createStartupProgress(report);
    progress.update('LOADING', 'Browser terbuka; memuat WhatsApp Web.');
    vi.advanceTimersByTime(120000);
    expect(report.mock.lastCall[0]).toMatchObject({status:'STARTUP_SLOW'});
    expect(report.mock.lastCall[0].error).toContain('Browser terbuka');
    expect(report.mock.lastCall[0].error).toContain('Diagnosa-WhatsApp.cmd');
    progress.update('LOADING', 'Memuat WhatsApp Web: 30%');
    expect(report.mock.lastCall[0].status).toBe('STARTUP_SLOW');
    progress.update('WAITING_QR', 'QR siap.');
    expect(report.mock.lastCall[0]).toMatchObject({status:'WAITING_QR',error:''});
  });
  for (const status of ['WAITING_QR', 'READY', 'FAILED', 'DISCONNECTED']) {
    it('does not replace '+status+' with a stale startup warning', () => {
      vi.useFakeTimers();
      const report = vi.fn();
      const progress = createStartupProgress(report);
      progress.update(status, 'Status', status === 'FAILED' ? 'ENOENT' : '');
      vi.advanceTimersByTime(240000);
      expect(report).toHaveBeenCalledTimes(1);
      expect(report.mock.lastCall[0].status).toBe(status);
    });
  }
  it('bounds authenticated startup and clears errors when ready', () => {
    vi.useFakeTimers();
    const report = vi.fn();
    const progress = createStartupProgress(report);
    progress.update('WAITING_QR', 'Scan QR.');
    progress.update('AUTHENTICATED', 'Menunggu WhatsApp siap.');
    progress.start();
    vi.advanceTimersByTime(120000);
    expect(report.mock.lastCall[0].status).toBe('STARTUP_SLOW');
    progress.update('READY', 'Terhubung.');
    expect(report.mock.lastCall[0]).toEqual({status:'READY',message:'Terhubung.',error:''});
  });
});
