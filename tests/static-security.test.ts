import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('function escapePropertyText(value)');
const end = html.indexOf('function getPropertyFloors(propertyId)', start);
if (start < 0 || end < 0) throw new Error('Security helpers not found in active page.');
const helpers = new Function(`${html.slice(start, end)}; return { escapePropertyText, safeCallArg, safePhotoSrc };`)() as {
  escapePropertyText: (value: unknown) => string;
  safeCallArg: (value: unknown) => string;
  safePhotoSrc: (value: unknown) => string;
};

describe('active page output encoding', () => {
  it('encodes markup and quotes before inserting user text into HTML', () => {
    expect(helpers.escapePropertyText('<img src="x" onerror=alert(1)>')).toBe('&lt;img src=&quot;x&quot; onerror=alert(1)&gt;');
  });

  it('keeps imported IDs inside one JavaScript argument', () => {
    const payload = 'id");alert(1);//';
    const encoded = helpers.safeCallArg(payload);
    expect(encoded).not.toContain('"');
    expect(JSON.parse(encoded.replaceAll('&quot;', '"'))).toBe(payload);
  });

  it('rejects script and SVG URLs from imported photo data', () => {
    expect(helpers.safePhotoSrc('javascript:alert(1)')).toBe('');
    expect(helpers.safePhotoSrc('data:image/svg+xml,<svg onload=alert(1)>')).toBe('');
    expect(helpers.safePhotoSrc('data:image/jpeg;base64,/9j/')).toBe('data:image/jpeg;base64,/9j/');
  });
});
