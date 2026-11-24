import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const saveRoomSource = html.slice(html.indexOf('        async function saveRoom('),
  html.indexOf('        // ==================== 3. TENANTS'));
const filterRoomsSource = html.slice(html.indexOf('        function filterRooms('),
  html.indexOf('        function renderRooms('));

function fixture({ saved = true, rooms = [] } = {}) {
  const fields = Object.fromEntries(Object.entries({
    roomFormId: '', roomFormProperty: 'P2', roomFormNumber: 'B-101',
    roomFormFloor: 'Lantai 1', roomFormType: 'Standar', roomFormCapacity: '1',
    roomFormPrice: '1500000', roomQuarterlyPrice: '4250000', roomFormNightlyPrice: '', roomFormRentalMode: 'MONTHLY',
    roomFormKwh: '0', roomFormFacilities: '', roomFormStatus: 'KOSONG', searchRoomInput: 'A-101'
  }).map(([id, value]) => [id, { value }]));
  const filter = { id: 'filter-room-ALL', setAttribute: vi.fn(), classList: { toggle: vi.fn() } };
  const submit = { disabled: false };
  const context = {
    appData: { rooms, tenants: [], auditLogs: [], properties: [{ id: 'P1' }, { id: 'P2' }] },
    currentPropertyFilter: 'P1', currentRoomFilter: 'TERISI',
    document: { getElementById: id => fields[id], querySelectorAll: () => [filter] },
    crypto: { randomUUID: () => 'fixture' },
    getNumericValue: field => Number(field.value), getPropertyFloors: () => ['Lantai 1'],
    pluginEnabled: () => false, saveData: vi.fn(async () => saved), structuredClone,
    confirm: vi.fn(() => true),
    closeModal: vi.fn(), renderPropertySelectors: vi.fn(), renderDashboard: vi.fn(),
    switchTab: vi.fn(), renderRooms: vi.fn(), showToast: vi.fn(), getPropertyName: id => id,
    window: { CharisnaFeatureModules: { recordAuditLog: () => context.appData.auditLogs.push({ id: 'log' }) } }
  };
  const identity = html.slice(html.indexOf('        function resolveRoom('), html.indexOf('        function getScopedRoomNumbers('));
  runInNewContext(saveRoomSource + filterRoomsSource + identity, context);
  const event = { preventDefault: vi.fn(), currentTarget: { querySelector: () => submit } };
  return { context, fields, filter, submit, event };
}

describe('unit creation and visibility', () => {
  it('saves once, opens the unit list and clears filters hiding a new unit', async () => {
    const { context, fields, filter, event } = fixture();
    await Promise.all([context.saveRoom(event), context.saveRoom(event)]);
    expect(context.saveData).toHaveBeenCalledTimes(1);
    expect(context.appData.rooms[0]).toMatchObject({ number: 'B-101', propertyId: 'P2', quarterlyPrice: 4250000 });
    expect(context.currentPropertyFilter).toBe('P2');
    expect(context.currentRoomFilter).toBe('ALL');
    expect(fields.searchRoomInput.value).toBe('');
    expect(filter.setAttribute).toHaveBeenCalledWith('aria-pressed', 'true');
    expect(context.switchTab).toHaveBeenCalledWith('kamar');
    expect(context.closeModal).toHaveBeenCalledWith('roomModal');
  });

  it('keeps the form open and reverts the tentative room and log when save fails', async () => {
    const { context, event, submit } = fixture({ saved: false });
    await context.saveRoom(event);
    expect(context.appData.rooms).toEqual([]);
    expect(context.appData.auditLogs).toEqual([]);
    expect(context.closeModal).not.toHaveBeenCalled();
    expect(submit.disabled).toBe(false);
  });

  it('rejects a duplicate number within one property', async () => {
    const { context, event } = fixture({ rooms: [{ id: 'old', number: 'b-101', propertyId: 'P2' }] });
    await context.saveRoom(event);
    expect(context.saveData).not.toHaveBeenCalled();
    expect(context.showToast).toHaveBeenCalledWith(expect.stringContaining('properti ini'), 'warning');
  });

  it('allows the same number in another property and resolves leases by room ID', async () => {
    const { context, event } = fixture({ rooms: [{ id: 'old', number: 'B-101', propertyId: 'P1' }] });
    const tenant = { id: 't1', roomNumber: 'B-101' };
    context.appData.tenants.push(tenant);
    context.linkLegacyRoomRecords(context.appData);
    await context.saveRoom(event);
    expect(context.appData.rooms).toHaveLength(2);
    expect(context.resolveRoom(tenant).id).toBe('old');
    expect(context.tenantsInRoom(context.appData.rooms[1])).toHaveLength(0);
  });

  it('blocks removal of an occupied room and keeps its tenant', async () => {
    const { context } = fixture({ rooms: [{ id: 'old', number: 'B-101', propertyId: 'P2' }] });
    context.appData.tenants.push({ id: 't1', roomNumber: 'B-101' });
    await context.deleteRoom('old');
    expect(context.appData.rooms).toHaveLength(1);
    expect(context.appData.tenants).toHaveLength(1);
    expect(context.confirm).not.toHaveBeenCalled();
    expect(context.saveData).not.toHaveBeenCalled();
  });
});
