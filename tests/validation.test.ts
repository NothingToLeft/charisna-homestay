import { describe, expect, it } from 'vitest';
import { propertySchema, roomSchema, transactionSchema } from '../src/core/validation';

 describe('domain validation', () => {
  it('accepts a valid property', () => {
    const result = propertySchema.safeParse({ name: 'Kos Melati', address: 'Jl. Melati 1', city: 'Bandung', notes: '' });
    expect(result.success).toBe(true);
  });

  it('rejects a negative room rent', () => {
    const result = roomSchema.safeParse({ propertyId: 'p1', name: 'A1', monthlyRent: -1, status: 'available', notes: '' });
    expect(result.success).toBe(false);
  });

  it('coerces transaction amount from form input', () => {
    const result = transactionSchema.safeParse({
      type: 'income',
      category: 'Sewa',
      amount: '1250000',
      date: '2026-08-01',
      description: 'Sewa Agustus',
      status: 'paid',
      tenantId: '',
      roomId: ''
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe(1_250_000);
  });
});
