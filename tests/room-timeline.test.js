import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

const script = readFileSync(new URL('../public/feature-modules.js', import.meta.url), 'utf8');
const start = script.indexOf('    function renderRoomTimeline(');
const end = script.indexOf('\n    function ', start + 1);
const source = script.slice(start, end);
const rooms = [{ id: 'a', number: '03', propertyId: 'P1' }, { id: 'b', number: '03', propertyId: 'P2' }];

function render(scoped) {
  const container = { dataset: {} };
  const data = { rooms, complaints: [{ roomId: 'a', roomNumber: '03', propertyId: 'P1', date: '2026-11-01' }] };
  runInNewContext(source + '\nrenderRoomTimeline("2026-11");', {
    document: { getElementById: () => container },
    window: { charisnaData: { snapshot: () => data }, getScopedRooms: () => scoped },
    escapeHtml: String
  });
  return container.innerHTML;
}

it('shows the empty state for a property without units', () => {
  expect(render([])).toContain('Belum ada unit di properti yang dipilih.');
  expect(render([])).not.toContain('Unit 03');
});

it('does not apply another property’s complaint to a room with the same number', () => {
  expect(render([rooms[0]])).toContain('Dalam Perbaikan');
  expect(render([rooms[1]])).toContain('Unit 03: Kosong');
  expect(render([rooms[1]])).not.toContain('Dalam Perbaikan');
});
