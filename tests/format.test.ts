import { describe, expect, it } from 'vitest';
import { formatCurrency, todayIso } from '../src/core/format';

describe('format helpers', () => {
  it('formats Indonesian currency', () => {
    expect(formatCurrency(1250000)).toContain('1.250.000');
  });

  it('returns an ISO date', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
