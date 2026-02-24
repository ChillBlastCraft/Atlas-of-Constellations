import fs from 'fs/promises';

const CANDIDATES = [
  // Official item module endpoints (docs indicate /v3/item)
  'https://api.wynncraft.com/v3/item/database?fullResult',
  'https://api.wynncraft.com/v3/item/database',
  'https://api.wynncraft.com/v3/item',

  // Legacy guesses (kept for compatibility)
  'https://api.wynncraft.com/v3/items',
  'https://api.wynncraft.com/v2/items',
  'https://api.wynncraft.com/v3/itemdb/items',
  'https://api.wynncraft.com/v3/itemdb',
  'https://api.wynncraft.com/items',
  'https://api.wynncraft.com/item',
];

function timeoutFetch(url, ms = 10000) {
  const ac = new AbortController();
  const id = setTimeout(() => ac.abort(), ms);
  return fetch(url, { signal: ac.signal }).finally(() => clearTimeout(id));
}

async function tryFetch(url) {
  try {
    const res = await timeoutFetch(url, 10000);
    const text = await res.text();
    // try parse JSON, otherwise return status + text
    try {
      const json = JSON.parse(text);
      return { ok: res.ok, status: res.status, json };
    } catch {
      return { ok: res.ok, status: res.status, text };
    }
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

async function findItems() {
  for (const url of CANDIDATES) {
    console.log('Trying', url);
    const r = await tryFetch(url);
    if (r.error) {
      console.warn(url, 'error:', r.error);
      continue;
    }
    if (r.status && r.status >= 400) {
      console.warn(url, 'status', r.status);
      continue;
    }
    // If JSON and array or object
    if (r.json) {
      const payload = r.json;
      // common shapes: array of items, { items: [...] }, {data: [...]}
      const items = Array.isArray(payload) ? payload : (payload.items || payload.data || payload);
      if (items && (Array.isArray(items) ? items.length > 0 : Object.keys(items).length > 0)) {
        return { url, items };
      }
      console.warn(url, 'returned JSON but no items found');
      continue;
    }
    console.warn(url, 'returned non-JSON response');
  }
  throw new Error('No working items endpoint found from candidates');
}

async function run() {
  try {
    const { url, items } = await findItems();
    const out = new URL('./items.json', import.meta.url);
    await fs.writeFile(out, JSON.stringify(items, null, 2), 'utf8');
    console.log('Saved', out.pathname, '— items count:', Array.isArray(items) ? items.length : Object.keys(items).length, 'from', url);
  } catch (err) {
    console.error('Error fetching items:', err.message || err);
    process.exit(1);
  }
}

await run();
