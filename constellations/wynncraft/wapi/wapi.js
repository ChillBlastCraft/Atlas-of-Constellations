const DIRECT_BASE_URL = "https://api.wynncraft.com/v3";
const LOCAL_PROXY_BASE_URL = "http://127.0.0.1:8787/v3";
const PUBLIC_PROXY_RAW_BASE_URL = "https://api.allorigins.win/raw?url=";
const PUBLIC_PROXY_GET_BASE_URL = "https://api.allorigins.win/get?url=";
const HEALTHCHECK_PATH = "/player/Salted/stats";
const REACHABILITY_PATH = "/guild/list/territory";

function isLocalRuntime() {
    return window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1" ||
        window.location.protocol === "file:";
}

export class WynncraftApi {
    constructor(baseUrl = DIRECT_BASE_URL) {
        this.baseUrl = baseUrl.replace(/\/$/, "");

        const params = new URLSearchParams(window.location.search);
        this.localRuntime = isLocalRuntime();
        this.enableLocalProxy = params.get("localProxy") === "1";
        this.usingLocalProxy = this.enableLocalProxy;
        this.usingPublicProxy = this.localRuntime && !this.enableLocalProxy;

        if (this.enableLocalProxy) {
            this.baseUrl = LOCAL_PROXY_BASE_URL;
        }
    }

    async request(path, params = {}) {
        const cleanedPath = path.startsWith("/") ? path : `/${path}`;

        if (this.usingPublicProxy) {
            const proxyResponse = await this.requestViaPublicProxy(cleanedPath, params);
            if (proxyResponse.ok) {
                return proxyResponse.body;
            }

            throw new Error("Public proxy timed out or failed. Try again in a moment.");
        }

        const url = new URL(`${this.baseUrl}${cleanedPath}`);
        this.applyQueryParams(url, params);

        let response;

        try {
            response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });
        } catch (error) {
            if (this.usingLocalProxy) {
                throw new Error("Local WAPI proxy is not running. Start wapi-proxy.py or remove ?localProxy=1 from URL.");
            }

            const probe = await this.probeReachability();
            if (probe.reachable) {
                throw new Error("WAPI is reachable, but this browser request is blocked by CORS.");
            }

            throw new Error(error?.message || "Network error while contacting WAPI.");
        }

        const text = await response.text();
        let body;

        try {
            body = text ? JSON.parse(text) : {};
        } catch {
            body = { raw: text };
        }

        if (!response.ok) {
            const message = body?.message || body?.error || `Request failed (${response.status})`;
            throw new Error(message);
        }

        return body;
    }

    async requestViaPublicProxy(path, params = {}) {
        const directUrl = this.buildDirectUrl(path, params).toString();

        const attempts = [
            async () => {
                const proxyUrl = `${PUBLIC_PROXY_GET_BASE_URL}${encodeURIComponent(directUrl)}`;
                const response = await this.fetchWithTimeout(proxyUrl, 10000);
                const text = await response.text();
                const wrapped = text ? JSON.parse(text) : {};

                if (!response.ok || typeof wrapped.contents !== "string") {
                    return { ok: false, body: wrapped };
                }

                const body = wrapped.contents ? JSON.parse(wrapped.contents) : {};
                return { ok: true, body };
            },
            async () => {
                const proxyUrl = `${PUBLIC_PROXY_RAW_BASE_URL}${encodeURIComponent(directUrl)}`;
                const response = await this.fetchWithTimeout(proxyUrl, 10000);
                const text = await response.text();
                const body = text ? JSON.parse(text) : {};

                if (!response.ok) {
                    return { ok: false, body };
                }

                return { ok: true, body };
            }
        ];

        for (let round = 0; round < 2; round += 1) {
            for (const attempt of attempts) {
                try {
                    const result = await attempt();
                    if (result.ok) {
                        return result;
                    }
                } catch {
                    continue;
                }
            }

            await this.sleep(250);
        }

        return { ok: false };
    }

    buildDirectUrl(path, params = {}) {
        const cleanedPath = path.startsWith("/") ? path : `/${path}`;
        const url = new URL(`${DIRECT_BASE_URL}${cleanedPath}`);
        this.applyQueryParams(url, params);

        return url;
    }

    applyQueryParams(url, params = {}) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
                url.searchParams.set(key, String(value));
            }
        });
    }

    async fetchWithTimeout(url, timeoutMs) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            return await fetch(url, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeout);
        }
    }

    async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    getPlayerStats(playerName) {
        if (!playerName || !playerName.trim()) {
            throw new Error("Player name is required.");
        }

        return this.request(`/player/${encodeURIComponent(playerName.trim())}/stats`);
    }

    async checkConnection() {
        if (this.usingPublicProxy) {
            const proxyHealth = await this.requestViaPublicProxy(HEALTHCHECK_PATH);
            if (proxyHealth.ok) {
                return {
                    reachable: true,
                    ok: true,
                    usingLocalProxy: false,
                    usingPublicProxy: true,
                    status: 200,
                    statusText: "OK"
                };
            }

            const directReachable = await this.probeDirectReachability();
            if (directReachable.reachable) {
                return {
                    reachable: true,
                    ok: true,
                    usingLocalProxy: false,
                    usingPublicProxy: false,
                    reachabilityOnly: true,
                    status: 200,
                    statusText: "Reachable"
                };
            }

            return {
                reachable: false,
                ok: false,
                usingLocalProxy: false,
                usingPublicProxy: true,
                error: "Public proxy timed out or failed. Try API Check again."
            };
        }

        try {
            const response = await fetch(this.baseUrl, {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                }
            });

            return {
                reachable: true,
                ok: response.ok,
                usingLocalProxy: this.usingLocalProxy,
                status: response.status,
                statusText: response.statusText
            };
        } catch (error) {
            if (this.usingLocalProxy) {
                return {
                    reachable: false,
                    ok: false,
                    usingLocalProxy: true,
                    usingPublicProxy: false,
                    error: "Local WAPI proxy is not running. Start wapi-proxy.py or remove ?localProxy=1 from URL."
                };
            }

            const probe = await this.probeReachability();
            if (probe.reachable) {
                return {
                    reachable: true,
                    ok: false,
                    usingLocalProxy: false,
                    usingPublicProxy: false,
                    corsBlocked: true,
                    message: "WAPI reachable, but browser CORS blocks direct fetch."
                };
            }

            return {
                reachable: false,
                ok: false,
                usingLocalProxy: false,
                usingPublicProxy: false,
                error: error?.message || "Network error"
            };
        }
    }

    getRuntimeInfo() {
        return {
            baseUrl: this.baseUrl,
            usingLocalProxy: this.usingLocalProxy,
            usingPublicProxy: this.usingPublicProxy
        };
    }

    async probeReachability() {
        try {
            await fetch(`${this.baseUrl}/`, {
                method: "GET",
                mode: "no-cors"
            });

            return { reachable: true };
        } catch {
            return { reachable: false };
        }
    }

    async probeDirectReachability() {
        try {
            await fetch(`${DIRECT_BASE_URL}${REACHABILITY_PATH}`, {
                method: "GET",
                mode: "no-cors"
            });

            return { reachable: true };
        } catch {
            return { reachable: false };
        }
    }
}

export const wapi = new WynncraftApi();
