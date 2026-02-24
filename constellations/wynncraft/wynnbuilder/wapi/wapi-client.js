const BASE = 'https://api.wynncraft.com/v3';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error(`${res.status} ${res.statusText}${text ? ': ' + text : ''}`);
  }
  return res.json();
}

export async function getPlayerStats(username) {
  const url = `${BASE}/player/${encodeURIComponent(username)}/stats`;
  return fetchJson(url);
}

export async function getGuild(guildName) {
  const url = `${BASE}/guilds/${encodeURIComponent(guildName)}`;
  return fetchJson(url);
}

export default {
  getPlayerStats,
  getGuild
};
