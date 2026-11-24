import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = html.slice(html.indexOf('        const MAX_MASSAL_UNITS'), html.indexOf('        function initMassal()'));

function fixture() {
  const fields = Object.fromEntries(Object.entries({
    massalPrefix: 'A-', massalStart: '01', massalEnd: '03', massalPaste: ' A-01\r\n\r\nA-03 \nB-07',
    massalProperty: 'P1', massalFloor: 'Lantai 1', massalRentalMode: 'BOTH',
    massalType: 'Reguler AC', massalCapacity: '1', massalRate: '1.500.000',
    massalNightlyRate: '200.000', massalFacilities: '', massalKwh: '125', massalStatus: 'PERBAIKAN', searchRoomInput: 'hidden'
  }).map(([key, value]) => [key, { value, focus: vi.fn() }]));
  for (const key of ['massalModal', 'massalSaveBtn']) fields[key] = { focus: vi.fn() };
  let id = 0;
  const context = {
    document: { getElementById: key => fields[key] }, crypto: { randomUUID: () => String(++id) },
    appData: { properties: [{ id: 'P1', name: 'Kost 1' }], rooms: [], auditLogs: [] },
    getPropertyFloors: () => ['Lantai 1'], getPropertyName: () => 'Kost 1',
    window: {}, saveData: vi.fn(async () => true), filterRooms: vi.fn(), switchTab: vi.fn(),
    renderAll: vi.fn(), showToast: vi.fn(), currentPropertyFilter: 'ALL', pluginEnabled: () => true,
    readRoomRatePlan: () => ({ weekend: 250000, holidays: [], checkIn: '14:00', checkOut: '12:00' })
  };
  const state = runInNewContext(source + '; massalState', context);
  context.renderMassalPreview = vi.fn();
  context.closeMassalModal = vi.fn();
  return { fields, context, state };
}

it('retains leading zeroes and parses CRLF and LF from pasted columns', () => {
  const { fields, context } = fixture();
  expect([...context.generateUnitsFromRange()]).toEqual(['A-01', 'A-02', 'A-03']);
  expect([...context.parsePastedList()]).toEqual(['A-01', 'A-03', 'B-07']);
  fields.massalEnd.value = '201';
  expect(() => context.generateUnitsFromRange()).toThrow('200 unit');
});

it('rejects cross-property duplicates, batch duplicates and invalid rates', () => {
  const { fields, context, state } = fixture();
  context.appData.rooms.push({ number: 'A-01', propertyId: 'P2' });
  state.units = ['a-01', 'A-03', 'a-03'].map(number => ({ number }));
  fields.massalNightlyRate.value = '200.00';
  const { errors } = context.validateMassalBatch();
  expect(errors).toEqual([expect.stringContaining('tarif per malam')]);
  expect(state.units.map(unit => unit.error)).toEqual(['Nomor sudah dipakai.', 'Nomor ganda dalam batch.', 'Nomor ganda dalam batch.']);
});

it('keeps the preview on failure, then saves the whole batch once on retry', async () => {
  const { fields, context, state } = fixture();
  state.units = ['A-01', 'A-02'].map(number => ({ number }));
  context.saveData.mockResolvedValueOnce(false);
  await context.saveMassalBatch();
  expect(context.appData.rooms).toEqual([]);
  expect(state.units).toHaveLength(2);
  expect(context.closeMassalModal).not.toHaveBeenCalled();
  await Promise.all([context.saveMassalBatch(), context.saveMassalBatch()]);
  expect(context.saveData).toHaveBeenCalledTimes(2);
  expect(context.appData.rooms.map(room => [room.number, room.price, room.nightlyPrice])).toEqual([
    ['A-01', 1500000, 200000], ['A-02', 1500000, 200000]
  ]);
  expect(new Set(context.appData.rooms.map(room => room.id)).size).toBe(2);
  expect(context.appData.rooms[0]).toMatchObject({ kwh: 125, status: 'PERBAIKAN', ratePlan: { weekend: 250000 } });
  expect(context.currentPropertyFilter).toBe('P1');
  expect(fields.searchRoomInput.value).toBe('');
});
