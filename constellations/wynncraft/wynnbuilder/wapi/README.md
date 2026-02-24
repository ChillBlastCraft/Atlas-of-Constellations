# Wynncraft — Items API quick checks

This repository includes a small `getItems.js` probe script. Below are minimal terminal commands to quickly verify whether the Wynncraft items API is reachable and returning data.

Endpoint to try:

- https://api.wynncraft.com/v3/item/database?fullResult

curl (Linux/macOS/WSL or Windows with curl available):

```sh
curl -sS https://api.wynncraft.com/v3/item/database?fullResult | head -n 20
# check HTTP status only
curl -sS -o /dev/null -w "%{http_code}\n" https://api.wynncraft.com/v3/item/database?fullResult
```

wget:

```sh
wget -qO- https://api.wynncraft.com/v3/item/database?fullResult | head -n 20
```

PowerShell (Windows):

```powershell
Invoke-RestMethod 'https://api.wynncraft.com/v3/item/database?fullResult' | ConvertTo-Json -Depth 2 | Select-Object -First 1
$r = Invoke-WebRequest 'https://api.wynncraft.com/v3/item/database?fullResult' -UseBasicParsing; $r.StatusCode
```

Node one-liner (Node 18+ for built-in `fetch`):

```sh
node -e "(async()=>{const r=await fetch('https://api.wynncraft.com/v3/item/database?fullResult');console.log(r.status);const j=await r.json();console.log(Array.isArray(j)?j.length:Object.keys(j||{}).length);})();"
```

Quick notes

- A `200` HTTP status and JSON output (array or object with `items`/`data`) means the endpoint is working.
- If you see non-200 status codes or empty responses, try adding a client timeout (e.g. `curl --max-time 10`) or retry later — the API may be down or rate-limited.

If you want, I can also run one of these checks from this environment and paste the result here.
