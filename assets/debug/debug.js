// check if localhost
const isLocalhost = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1' ||
                    window.location.protocol === 'file:'

if (isLocalhost) {
    console.log('Debug system loaded on localhost')

    let menuVisible = false

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

            if (toggleCrosshairsBtn) {
                toggleCrosshairsBtn.addEventListener('click', toggleCrosshairs)
            }
        } catch (error) {
            console.error('Failed to load debug menu:', error)
        }
    }

    function showDebugMenu() {
        if (!menuVisible) {
            loadDebugMenu()
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

    // toggle debug menu with 'D'
    let toggleKeybind = 'd'
    document.addEventListener('keydown', (e) => {
        console.clear()
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