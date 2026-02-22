import { wapi } from "./wapi.js";

const playerForm = document.getElementById("player-form");
const playerInput = document.getElementById("player-name");
const endpointInput = document.getElementById("endpoint-path");
const resultOutput = document.getElementById("result");
const statusText = document.getElementById("status");
const apiHealthCheckButton = document.getElementById("api-health-check");

function setStatus(text, type = "idle") {
    statusText.textContent = text;
    statusText.dataset.type = type;
}

function showJson(data) {
    resultOutput.textContent = JSON.stringify(data, null, 2);
}

playerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const playerName = playerInput.value.trim();
    const endpointPath = endpointInput.value.trim();

    if (!playerName) {
        setStatus("Enter a player name first.", "error");
        return;
    }

    try {
        setStatus("Loading WAPI response...", "loading");

        let data;
        if (endpointPath) {
            const resolvedPath = endpointPath
                .replaceAll("{player}", playerName)
                .replaceAll(":player", playerName);

            data = await wapi.request(resolvedPath);
        } else {
            data = await wapi.getPlayerStats(playerName);
        }

        showJson(data);
        setStatus("Success.", "success");
    } catch (error) {
        setStatus(error.message || "Request failed.", "error");
        showJson({ error: error.message || "Unknown error" });
    }
});

apiHealthCheckButton?.addEventListener("click", async () => {
    const originalLabel = apiHealthCheckButton.textContent;

    apiHealthCheckButton.disabled = true;
    apiHealthCheckButton.textContent = "Checking...";

    const result = await wapi.checkConnection();

    if (result.reachable) {
        if (result.corsBlocked) {
            console.warn("WAPI check: REACHABLE but blocked by browser CORS");
            setStatus("WAPI reachable, but browser CORS blocks direct requests.", "error");
        } else
        if (result.ok) {
            if (result.reachabilityOnly) {
                console.log("WAPI check: WORKING (direct reachability confirmed, proxy unavailable)");
                setStatus("WAPI reachable (proxy unavailable right now).", "success");
            } else if (result.usingPublicProxy) {
                console.log(`WAPI check: WORKING via public proxy (${result.status} ${result.statusText})`);
                setStatus("WAPI working via public proxy.", "success");
            } else if (result.usingLocalProxy) {
                console.log(`WAPI check: WORKING via local proxy (${result.status} ${result.statusText})`);
                setStatus(`WAPI working via local proxy (${result.status}).`, "success");
            } else {
                console.log(`WAPI check: WORKING (${result.status} ${result.statusText})`);
                setStatus(`WAPI working (${result.status}).`, "success");
            }
        } else {
            console.warn(`WAPI check: REACHABLE but non-OK response (${result.status} ${result.statusText})`);
            setStatus(`WAPI reachable but returned ${result.status}.`, "error");
        }
    } else {
        console.error(`WAPI check: NOT WORKING (${result.error})`);
        setStatus(`WAPI not working: ${result.error}.`, "error");
    }

    apiHealthCheckButton.disabled = false;
    apiHealthCheckButton.textContent = originalLabel;
});

const runtime = wapi.getRuntimeInfo();
if (runtime.usingPublicProxy) {
    console.log("WAPI mode: public proxy (default local mode)");
    setStatus("Ready. Public proxy mode enabled.");
} else if (runtime.usingLocalProxy) {
    console.log(`WAPI mode: local proxy (${runtime.baseUrl})`);
    setStatus("Ready. Local proxy mode enabled.");
} else {
    console.warn("WAPI mode: direct browser fetch (may be blocked by CORS)");
    setStatus("Ready. Direct mode may be CORS-limited.");
}
