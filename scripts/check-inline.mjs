import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const lower = html.toLowerCase();
const inlineScripts = [];
let cursor = 0;
while (true) {
  const open = lower.indexOf('<script', cursor);
  if (open < 0) break;
  const bodyStart = lower.indexOf('>', open);
  const close = lower.indexOf('</script', bodyStart + 1);
  const closeEnd = lower.indexOf('>', close + 1);
  if (bodyStart < 0 || close < 0 || closeEnd < 0) throw new Error('Unclosed script tag.');
  const source = html.slice(bodyStart + 1, close);
  if (source.trim()) inlineScripts.push(source);
  cursor = closeEnd + 1;
}

if (!inlineScripts.length) throw new Error('Inline app script not found.');
inlineScripts.forEach((source, index) => new Script(source, { filename: `index.html:inline-${index + 1}` }));
console.log(`${inlineScripts.length} inline scripts parsed`);
