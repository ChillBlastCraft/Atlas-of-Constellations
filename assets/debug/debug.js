// check if localhost
const isLocalhost = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.protocol === 'file:'

if (isLocalhost) {
    const MAX_DEBUG_LOG_ENTRIES = 120
    const CONSOLE_DEFAULT_OFFSET = 16
    const debugLogEntries = []
    const originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        clear: console.clear.bind(console)
    }

    let debugLogEl = null
    let debugErrorStatusEl = null
    let debugConsoleBoxEl = null
    let debugConsoleDragCornerEl = null
    let consoleBoxVisible = false
    let isConsoleDragging = false
    let consoleDragOffsetX = 0
    let consoleDragOffsetY = 0
    let consoleDragListenersBound = false
    let consoleBoxAttachedToBody = false

    function stringifyValue(value) {
        if (value instanceof Error) {
            return value.stack || value.message
        }

        if (typeof value === 'string') {
            return value
        }

        try {
            return JSON.stringify(value)
        } catch {
            return String(value)
        }
    }

    function appendDebugLog(level, args) {
        const line = args.map(stringifyValue).join(' ')
        debugLogEntries.push({
            level,
            line,
            time: new Date().toLocaleTimeString()
        })

        if (debugLogEntries.length > MAX_DEBUG_LOG_ENTRIES) {
            debugLogEntries.shift()
        }

        renderDebugLog()

        if (level === 'error') {
            showErrorStatus('ERROR: check console log for more info')
        }
    }

    function showErrorStatus(message) {
        if (!debugErrorStatusEl) {
            return
        }

        debugErrorStatusEl.textContent = message
        debugErrorStatusEl.classList.add('active')
    }

    function clearErrorStatus() {
        if (!debugErrorStatusEl) {
            return
        }

        debugErrorStatusEl.textContent = ''
        debugErrorStatusEl.classList.remove('active')
    }

    function renderDebugLog() {
        if (!debugLogEl) {
            return
        }

        debugLogEl.innerHTML = ''
        debugLogEntries.forEach(entry => {
            const lineEl = document.createElement('p')
            lineEl.className = `debug-log-entry ${entry.level}`
            lineEl.textContent = `[${entry.time}] ${entry.level.toUpperCase()}: ${entry.line}`
            debugLogEl.appendChild(lineEl)
        })

        debugLogEl.scrollTop = debugLogEl.scrollHeight
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value))
    }

    function setConsoleBoxPosition(left, top) {
        if (!debugConsoleBoxEl) {
            return
        }

        const maxLeft = Math.max(CONSOLE_DEFAULT_OFFSET, window.innerWidth - debugConsoleBoxEl.offsetWidth - CONSOLE_DEFAULT_OFFSET)
        const maxTop = Math.max(CONSOLE_DEFAULT_OFFSET, window.innerHeight - debugConsoleBoxEl.offsetHeight - CONSOLE_DEFAULT_OFFSET)
        const safeLeft = clamp(left, CONSOLE_DEFAULT_OFFSET, maxLeft)
        const safeTop = clamp(top, CONSOLE_DEFAULT_OFFSET, maxTop)

        debugConsoleBoxEl.style.left = safeLeft + 'px'
        debugConsoleBoxEl.style.top = safeTop + 'px'
    }

    function setConsoleDefaultPosition() {
        if (!debugConsoleBoxEl) {
            return
        }

        const width = debugConsoleBoxEl.offsetWidth || 430
        const defaultLeft = window.innerWidth - width - CONSOLE_DEFAULT_OFFSET
        const defaultTop = CONSOLE_DEFAULT_OFFSET
        setConsoleBoxPosition(defaultLeft, defaultTop)
    }

    function toggleConsoleBox() {
        if (!debugConsoleBoxEl) {
            return
        }

        consoleBoxVisible = !consoleBoxVisible
        debugConsoleBoxEl.classList.toggle('active', consoleBoxVisible)
        if (consoleBoxVisible) {
            setConsoleDefaultPosition()
        }

        console.log('Console box:', consoleBoxVisible ? 'ON' : 'OFF')
    }

    function onConsoleDragStart(event) {
        if (event.button !== 0) {
            return
        }

        if (!debugConsoleBoxEl) {
            return
        }

        event.preventDefault()
        isConsoleDragging = true
        const rect = debugConsoleBoxEl.getBoundingClientRect()
        consoleDragOffsetX = event.clientX - rect.left
        consoleDragOffsetY = event.clientY - rect.top
    }

    function onConsoleDragMove(event) {
        if (!isConsoleDragging || !debugConsoleBoxEl) {
            return
        }

        const nextLeft = event.clientX - consoleDragOffsetX
        const nextTop = event.clientY - consoleDragOffsetY
        setConsoleBoxPosition(nextLeft, nextTop)
    }

    function onConsoleDragEnd() {
        isConsoleDragging = false
    }

    function clearDebugLog() {
        debugLogEntries.length = 0
        renderDebugLog()
        clearErrorStatus()
        originalConsole.clear()
    }

    async function copyDebugLog() {
        const text = debugLogEntries
            .map(entry => `[${entry.time}] ${entry.level.toUpperCase()}: ${entry.line}`)
            .join('\n')

        if (!text) {
            console.log('Copy console: nothing to copy')
            return
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text)
            } else {
                const textarea = document.createElement('textarea')
                textarea.value = text
                textarea.setAttribute('readonly', 'true')
                textarea.style.position = 'fixed'
                textarea.style.opacity = '0'
                document.body.appendChild(textarea)
                textarea.select()
                document.execCommand('copy')
                document.body.removeChild(textarea)
            }

            console.log('Copy console: copied to clipboard')
        } catch (error) {
            console.error('Copy console failed:', error)
        }
    }

    console.log = (...args) => {
        originalConsole.log(...args)
        appendDebugLog('log', args)
    }

    console.info = (...args) => {
        originalConsole.info(...args)
        appendDebugLog('info', args)
    }

    console.warn = (...args) => {
        originalConsole.warn(...args)
        appendDebugLog('warn', args)
    }

    console.error = (...args) => {
        originalConsole.error(...args)
        appendDebugLog('error', args)
    }

    console.clear = () => {
        originalConsole.clear()
        clearDebugLog()
    }

    window.addEventListener('error', event => {
        console.error(event.error || event.message)
    })

    window.addEventListener('unhandledrejection', event => {
        console.error(event.reason)
    })

    console.log('Debug system loaded on localhost')

    let menuVisible = false
    let debugMenuLoaded = false

    const debugCSSLink = document.createElement('link')
    debugCSSLink.rel = 'stylesheet'
    debugCSSLink.href = 'assets/debug/debug.css'
    document.head.appendChild(debugCSSLink)

    // debug crossair (horizontal)
    const crosshairHorizontal = document.createElement('div')
    crosshairHorizontal.className = 'crosshair-horizontal debug'
    document.body.appendChild(crosshairHorizontal)

    // debug crossair (vertical)
    const crosshairVertical = document.createElement('div')
    crosshairVertical.className = 'crosshair-vertical debug'
    document.body.appendChild(crosshairVertical)

    // create menu container
    const menuContainer = document.createElement('div')
    menuContainer.className = 'debug-menu-container'
    document.body.appendChild(menuContainer)

    // load and display the debug menu
    async function loadDebugMenu() {
        try {
            const response = await fetch('assets/debug/debug.html')
            const html = await response.text()
            menuContainer.innerHTML = html

            const toggleCrosshairsBtn = menuContainer.querySelector('#toggle-crosshairs')
            const toggleConstellationLinesTestBtn = menuContainer.querySelector('#toggle-constellation-lines-test')
            const toggleConsoleBoxBtn = menuContainer.querySelector('#toggle-console-box')
            const resetConsoleBoxPositionBtn = menuContainer.querySelector('#reset-console-box-position')
            const clearDebugLogBtn = menuContainer.querySelector('#clear-debug-log')
            const copyDebugLogBtn = menuContainer.querySelector('#copy-debug-log')
            debugLogEl = menuContainer.querySelector('#debug-log')
            debugErrorStatusEl = menuContainer.querySelector('#debug-error-status')
            debugConsoleBoxEl = menuContainer.querySelector('#debug-console-box')
            debugConsoleDragCornerEl = menuContainer.querySelector('#debug-console-drag-corner')

            if (toggleCrosshairsBtn) {
                toggleCrosshairsBtn.addEventListener('click', toggleCrosshairs)
            }

            if (toggleConstellationLinesTestBtn) {
                toggleConstellationLinesTestBtn.addEventListener('click', toggleConstellationLineTestMode)
            }

            if (toggleConsoleBoxBtn) {
                toggleConsoleBoxBtn.addEventListener('click', toggleConsoleBox)
            }

            if (resetConsoleBoxPositionBtn) {
                resetConsoleBoxPositionBtn.addEventListener('click', setConsoleDefaultPosition)
            }

            if (clearDebugLogBtn) {
                clearDebugLogBtn.addEventListener('click', clearDebugLog)
            }

            if (copyDebugLogBtn) {
                copyDebugLogBtn.addEventListener('click', copyDebugLog)
            }

            if (debugConsoleDragCornerEl) {
                debugConsoleDragCornerEl.addEventListener('mousedown', onConsoleDragStart)
            }

            if (!consoleDragListenersBound) {
                document.addEventListener('mousemove', onConsoleDragMove)
                document.addEventListener('mouseup', onConsoleDragEnd)
                consoleDragListenersBound = true
            }

            if (debugConsoleBoxEl && !consoleBoxAttachedToBody) {
                document.body.appendChild(debugConsoleBoxEl)
                consoleBoxAttachedToBody = true
            }

            debugConsoleBoxEl.classList.toggle('active', consoleBoxVisible)
            if (consoleBoxVisible) {
                setConsoleDefaultPosition()
            }

            renderDebugLog()
        } catch (error) {
            console.error('Failed to load debug menu:', error)
        }
    }

    function showDebugMenu() {
        if (!menuVisible) {
            if (!debugMenuLoaded) {
                loadDebugMenu()
                debugMenuLoaded = true
            }
            menuContainer.style.display = 'flex'
            menuVisible = true
        }
    }

    function hideDebugMenu() {
        menuContainer.style.display = 'none'
        menuVisible = false
    }

    function toggleCrosshairs() {
        const currentDisplay = document.querySelector('.debug').style.display
        
        let newDisplay
        if (currentDisplay === 'block') {
            newDisplay = 'none'
        } else {
            newDisplay = 'block'
        }
        
        document.querySelectorAll('.debug').forEach(el => {
            el.style.display = newDisplay
        })
        
        let status
        if (newDisplay === 'block') {
            status = 'ON'
        } else {
            status = 'OFF'
        }
        console.log('Crosshairs:', status)
    }

    function toggleConstellationLineTestMode() {
        const enabled = document.body.classList.toggle('debug-constellation-lines-test')
        console.log('Constellation line test mode:', enabled ? 'ON' : 'OFF')
    }

    // toggle debug menu with 'D'
    let toggleKeybind = 'd'
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === toggleKeybind) {
            if (menuVisible) {
                console.log('Debug menu closed')
                hideDebugMenu()
            } else {
                console.log('Debug menu opened')
                showDebugMenu()
            }
        }
    })
}