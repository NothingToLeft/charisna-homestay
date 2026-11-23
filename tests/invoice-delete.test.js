import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const source = html.slice(html.indexOf('        function visibleInvoices()'), html.indexOf('        function renderBills()'));

function fixture(saved = true) {
  const bills = [
    { id: 'INV-101', roomNumber: '101', period: 'Oktober 2026', amount: 1870000, status: 'LUNAS', propertyId: 'A' },
    { id: 'a2', status: 'LUNAS', propertyId: 'A' },
    { id: 'a3', status: 'BELUM_LUNAS', propertyId: 'A' },
    { id: 'b1', status: 'LUNAS', propertyId: 'B' }
  ];
  const fields = new Map();
  const context = {
    appData: { bills, auditLogs: [] },
    currentPropertyFilter: 'A', currentBillFilter: 'LUNAS', selectedBillIds: new Set(), deletingInvoices: false,
    auditScopeData: (data, propertyId) => ({ bills: data.bills.filter(bill => bill.propertyId === propertyId) }),
    document: { getElementById(id) {
      if (!fields.has(id)) fields.set(id, {});
      return fields.get(id);
    } },
    confirm: vi.fn(() => true), saveData: vi.fn(async () => saved),
    showToast: vi.fn(), renderBills: vi.fn(), window: {}
  };
  runInNewContext(source, context);
  return { context, bills, fields };
}

it('identifies old examples by invoice fingerprint without matching a real tenant link', () => {
  const { context, bills } = fixture();
  expect(context.isLegacyExampleInvoice(bills[0])).toBe(true);
  expect(context.isLegacyExampleInvoice({ ...bills[0], tenantId: 'real' })).toBe(false);
  expect(context.isLegacyExampleInvoice({ ...bills[0], amount: 1 })).toBe(false);
});

it('only deletes invoices visible under the current property and status filters', async () => {
  const { context } = fixture();
  context.selectVisibleInvoices(true);
  expect([...context.selectedBillIds]).toEqual(['INV-101', 'a2']);
  await context.deleteInvoices([...context.selectedBillIds, 'a3', 'b1']);
  expect(context.appData.bills.map(bill => bill.id)).toEqual(['a3', 'b1']);
  expect(context.confirm).toHaveBeenCalledWith(expect.stringContaining('2 tagihan lunas'));
  expect(context.selectedBillIds.size).toBe(0);
});

it('deletes one row and preserves every invoice if the user cancels or saving fails', async () => {
  const { context, bills } = fixture(false);
  context.confirm.mockReturnValueOnce(false);
  await context.deleteInvoices(['a2']);
  expect(context.saveData).not.toHaveBeenCalled();
  await context.deleteInvoices(['a2']);
  expect(context.appData.bills).toBe(bills);
  expect(context.showToast).not.toHaveBeenCalled();
  context.saveData.mockResolvedValueOnce(true);
  await context.deleteInvoices(['a2']);
  expect(context.appData.bills.map(bill => bill.id)).toEqual(['INV-101', 'a3', 'b1']);
});
