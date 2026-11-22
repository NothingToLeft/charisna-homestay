const missing = Symbol('missing');
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonical = value => Array.isArray(value) ? value.map(canonical) : plain(value)
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const sameSyncData = (left, right) => left === right || JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
export function syncContent(data) {
  const content = structuredClone(data);
  delete content.privateIntegrations;
  delete content.meta;
  return content;
}
export function mergeSyncData(base, local, remote) {
  let conflicts = 0;
  function merge(before, ours, theirs) {
    if (sameSyncData(ours, before)) return theirs;
    if (sameSyncData(theirs, before) || sameSyncData(ours, theirs)) return ours;
    if (plain(ours) && plain(theirs) && (plain(before) || before === missing)) {
      const result = {};
      for (const key of new Set([...Object.keys(before === missing ? {} : before), ...Object.keys(ours), ...Object.keys(theirs)])) {
        const value = merge(before !== missing && Object.hasOwn(before, key) ? before[key] : missing,
          Object.hasOwn(ours, key) ? ours[key] : missing, Object.hasOwn(theirs, key) ? theirs[key] : missing);
        if (value !== missing) Object.defineProperty(result, key, {value, enumerable:true, writable:true, configurable:true});
      }
      return result;
    }
    const identifiable = values => Array.isArray(values) && values.every(item => plain(item) && ['string','number'].includes(typeof item.id))
      && new Set(values.map(item => typeof item.id + ':' + item.id)).size === values.length;
    if (identifiable(before) && identifiable(ours) && identifiable(theirs)) {
      const index = values => new Map(values.map(item => [typeof item.id + ':' + item.id, item]));
      const old = index(before), mine = index(ours), other = index(theirs), result = [];
      for (const key of new Set([...mine.keys(), ...other.keys(), ...old.keys()])) {
        const value = merge(old.has(key) ? old.get(key) : missing, mine.has(key) ? mine.get(key) : missing, other.has(key) ? other.get(key) : missing);
        if (value !== missing) result.push(value);
      }
      return result;
    }
    conflicts++;
    return ours;
  }
  return { data: structuredClone(merge(base, local, remote)), conflicts };
}
