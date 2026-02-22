class WapiClient {
    constructor(baseUrls = [
        'https://api.wynncraft.com/v3',
        'http://127.0.0.1:8765/v3',
        'http://localhost:8765/v3'
    ]) {
        this.baseUrls = Array.isArray(baseUrls) ? baseUrls : [baseUrls]
        this.debug = true
    }

    async request(path, options = {}) {
        const errors = []

        for (const baseUrl of this.baseUrls) {
            try {
                const result = await this.requestWithBase(baseUrl, path, options)
                return result
            } catch (error) {
                errors.push({
                    baseUrl,
                    name: error?.name,
                    message: error?.message,
                    context: error?.context || null
                })

                if (this.debug) {
                    console.warn('[WAPI] endpoint failed, trying next fallback if available', {
                        baseUrl,
                        error: error?.message
                    })
                }

                if (error?.name === 'WapiHttpError') {
                    throw error
                }
            }
        }

        const fallbackError = new Error('WAPI request failed on all configured endpoints.')
        fallbackError.name = 'WapiAllEndpointsFailedError'
        fallbackError.details = errors
        throw fallbackError
    }

    async requestWithBase(baseUrl, path, options = {}) {
        const { method = 'GET', query, body } = options
        const url = new URL(`${baseUrl}${path}`)

        if (query && typeof query === 'object') {
            Object.entries(query).forEach(([key, value]) => {
                if (value === undefined || value === null || value === false) {
                    return
                }

                if (value === true) {
                    url.searchParams.append(key, '')
                    return
                }

                url.searchParams.set(key, String(value))
            })
        }

        const requestInfo = {
            method,
            url: url.toString(),
            baseUrl,
            query,
            body: body || null,
            pageProtocol: window.location.protocol,
            pageOrigin: window.location.origin
        }

        if (this.debug) {
            console.info('[WAPI] request', requestInfo)
        }

        const fetchOptions = {
            method,
            headers: {},
            body: undefined
        }

        if (body) {
            fetchOptions.headers['Content-Type'] = 'application/json'
            fetchOptions.body = JSON.stringify(body)
        }

        let response
        try {
            response = await fetch(url.toString(), fetchOptions)
        } catch (error) {
            const protocolHint = window.location.protocol === 'file:'
                ? 'Likely cause: opened from file://; run via local server (http://localhost).'
                : 'Likely cause: network/CORS/adblock/privacy extension/VPN/proxy issue.'

            const debugError = new Error(`Network error while calling ${url.pathname}. ${protocolHint}`)
            debugError.name = 'WapiNetworkError'
            debugError.cause = error
            debugError.context = requestInfo
            throw debugError
        }

        if (!response.ok) {
            const message = await response.text()
            const httpError = new Error(`WAPI request failed (${response.status}) on ${url.pathname}: ${message || response.statusText}`)
            httpError.name = 'WapiHttpError'
            httpError.context = {
                ...requestInfo,
                status: response.status,
                statusText: response.statusText
            }
            throw httpError
        }

        const data = await response.json()

        if (this.debug) {
            console.info('[WAPI] response', {
                url: url.toString(),
                status: response.status,
                statusText: response.statusText,
                ratelimitRemaining: response.headers.get('RateLimit-Remaining'),
                cacheControl: response.headers.get('Cache-Control')
            })
        }

        return data
    }

    getItemMetadata() {
        return this.request('/item/metadata')
    }

    getItemDatabasePage(page = 1) {
        return this.request('/item/database', { query: { page } })
    }

    getItemDatabaseFullResult() {
        return this.request('/item/database', { query: { fullResult: true } })
    }

    searchItems(filters = {}) {
        return this.request('/item/search', {
            method: 'POST',
            body: filters
        })
    }

    quickSearchItems(query) {
        return this.request(`/item/search/${encodeURIComponent(query)}`)
    }
}

window.WapiClient = WapiClient