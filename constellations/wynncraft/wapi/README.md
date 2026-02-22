# WAPI Integration

This folder contains a small client for Wynncraft API (WAPI) and a page-level script used by `wynnbuilder+.html`.

## Files

- `wapi.js` - reusable API helper with:
  - `wapi.request(path, params?)`
  - `wapi.getPlayerStats(playerName)`
  - auto local proxy mode on localhost/file (`http://127.0.0.1:8787/v3`)
- `wapi-page.js` - binds the HTML form to the API helper.
- `wapi.css` - minimal styles for the API tester page.
- `wapi-proxy.py` - lightweight local proxy to bypass browser CORS in development.

## Default endpoint behavior

If endpoint input is empty, the page requests:

`/player/{playerName}/stats`

You can also manually provide paths (examples):

- `/player/{player}/stats`
- `/player/:player/stats`

Both `{player}` and `:player` placeholders are replaced with the entered player name.

## Run with local proxy (recommended)

Local proxy is now optional and only used if you add `?localProxy=1` to the page URL.

From this folder, run:

`python wapi-proxy.py`

Then open `wynnbuilder+.html` through your local server as usual.

If using local proxy mode, append `?localProxy=1`.

Expected behavior:

- Console logs `WAPI mode: local proxy (...)` on load.
- `API Check` logs `WORKING via local proxy (...)` when healthy.

## If Python/Node is not installed

`wapi.js` uses public proxy mode by default on localhost/file.

Expected behavior:

- `API Check` logs `WORKING via public proxy (...)`.
- This keeps development working without local runtime installs.
