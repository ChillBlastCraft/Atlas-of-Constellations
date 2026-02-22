(function () {
    let canvas
    let ctx
    let width = 0
    let height = 0
    let animationFrameId = null
    let stars = []
    let nebulaSeeds = []
    let twinkleTime = 0
    let cameraOffsetX = 0
    let cameraOffsetY = 0
    let targetOffsetX = 0
    let targetOffsetY = 0
    let cameraTweenStartX = 0
    let cameraTweenStartY = 0
    let cameraTweenStartTime = 0
    let cameraTweenActive = false
    let astralDepth = 1

    const BASE_STAR_COUNT = 500
    const NEBULA_SEED_COUNT = 10
    const STAR_MIN_SIZE = 0.25
    const STAR_MAX_SIZE = 1.75
    const BASE_CANVAS_OVERSCAN = 1.25
    const ASTRAL_DEPTH_MIN = 1
    const ASTRAL_DEPTH_MAX = 1.9
    const ASTRAL_DEPTH_STEP = 0.08
    const CAMERA_OFFSET_FACTOR = 0.16
    const MAX_CAMERA_OFFSET = 110
    const CAMERA_MOVE_DURATION_MS = 1000
    const EASE_P1X = 0.25
    const EASE_P1Y = 0.1
    const EASE_P2X = 0.25
    const EASE_P2Y = 1

    function randomInRange(min, max) {
        return min + Math.random() * (max - min)
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value))
    }

    function createStar() {
        return {
            x: Math.random(),
            y: Math.random(),
            size: randomInRange(STAR_MIN_SIZE, STAR_MAX_SIZE),
            twinkleSpeed: randomInRange(0.4, 1.4),
            twinkleOffset: randomInRange(0, Math.PI * 2),
            drift: randomInRange(-0.03, 0.03)
        }
    }

    function getTargetStarCount() {
        return Math.round(BASE_STAR_COUNT * astralDepth)
    }

    function getCanvasOverscan() {
        return BASE_CANVAS_OVERSCAN * astralDepth
    }

    function syncStarCount() {
        const targetCount = getTargetStarCount()

        if (stars.length < targetCount) {
            const addCount = targetCount - stars.length
            for (let index = 0; index < addCount; index += 1) {
                stars.push(createStar())
            }
            return
        }

        if (stars.length > targetCount) {
            stars.length = targetCount
        }
    }

    function cubicBezierEase(time) {
        const sampleCurveX = t => {
            const inv = 1 - t
            return 3 * inv * inv * t * EASE_P1X + 3 * inv * t * t * EASE_P2X + t * t * t
        }

        const sampleCurveY = t => {
            const inv = 1 - t
            return 3 * inv * inv * t * EASE_P1Y + 3 * inv * t * t * EASE_P2Y + t * t * t
        }

        const sampleCurveDerivativeX = t => {
            const inv = 1 - t
            return 3 * inv * inv * EASE_P1X + 6 * inv * t * (EASE_P2X - EASE_P1X) + 3 * t * t * (1 - EASE_P2X)
        }

        let t = clamp(time, 0, 1)
        for (let index = 0; index < 6; index += 1) {
            const x = sampleCurveX(t) - time
            const dx = sampleCurveDerivativeX(t)
            if (Math.abs(dx) < 1e-6) {
                break
            }

            t -= x / dx
            t = clamp(t, 0, 1)
        }

        return sampleCurveY(t)
    }

    function updateCameraTween(timestamp) {
        if (!cameraTweenActive) {
            return
        }

        const elapsed = timestamp - cameraTweenStartTime
        const progress = clamp(elapsed / CAMERA_MOVE_DURATION_MS, 0, 1)
        const eased = cubicBezierEase(progress)

        cameraOffsetX = cameraTweenStartX + (targetOffsetX - cameraTweenStartX) * eased
        cameraOffsetY = cameraTweenStartY + (targetOffsetY - cameraTweenStartY) * eased

        if (progress >= 1) {
            cameraOffsetX = targetOffsetX
            cameraOffsetY = targetOffsetY
            cameraTweenActive = false
        }
    }

    function createStars() {
        stars = Array.from({ length: getTargetStarCount() }, () => createStar())
    }

    function createNebulaSeeds() {
        nebulaSeeds = Array.from({ length: NEBULA_SEED_COUNT }, () => ({
            x: Math.random(),
            y: Math.random(),
            radius: randomInRange(160, 360),
            hue: randomInRange(215, 290),
            alpha: randomInRange(0.04, 0.12),
            pulseSpeed: randomInRange(0.1, 0.4),
            pulseOffset: randomInRange(0, Math.PI * 2)
        }))
    }

    function resizeCanvas() {
        if (!canvas) {
            return
        }

        const dpr = window.devicePixelRatio || 1
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight
        const overscan = getCanvasOverscan()
        width = Math.floor(viewportWidth * overscan)
        height = Math.floor(viewportHeight * overscan)

        const offsetX = Math.floor((width - viewportWidth) * 0.5)
        const offsetY = Math.floor((height - viewportHeight) * 0.5)

        canvas.width = Math.floor(width * dpr)
        canvas.height = Math.floor(height * dpr)
        canvas.style.width = width + 'px'
        canvas.style.height = height + 'px'
        canvas.style.left = (-offsetX) + 'px'
        canvas.style.top = (-offsetY) + 'px'

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function adjustAstralDepth(delta) {
        const nextDepth = clamp(astralDepth + delta, ASTRAL_DEPTH_MIN, ASTRAL_DEPTH_MAX)
        if (nextDepth === astralDepth) {
            return
        }

        astralDepth = nextDepth
        syncStarCount()
        resizeCanvas()
    }

    function onWheelControl(event) {
        if (!event.ctrlKey) {
            return
        }

        const direction = event.deltaY < 0 ? 1 : -1
        adjustAstralDepth(direction * ASTRAL_DEPTH_STEP)
    }

    function onKeyboardControl(event) {
        if (!event.ctrlKey) {
            return
        }

        const plusPressed = event.key === '+' || event.key === '=' || event.code === 'NumpadAdd'
        const minusPressed = event.key === '-' || event.key === '_' || event.code === 'NumpadSubtract'

        if (plusPressed) {
            adjustAstralDepth(ASTRAL_DEPTH_STEP)
            return
        }

        if (minusPressed) {
            adjustAstralDepth(-ASTRAL_DEPTH_STEP)
        }
    }

    function drawSpaceBase() {
        const offsetX = cameraOffsetX * CAMERA_OFFSET_FACTOR
        const offsetY = cameraOffsetY * CAMERA_OFFSET_FACTOR
        const gradient = ctx.createRadialGradient(
            width * 0.5 + offsetX,
            height * 0.45 + offsetY,
            width * 0.08,
            width * 0.5 + offsetX,
            height * 0.5 + offsetY,
            width * 0.9
        )
        gradient.addColorStop(0, '#121a39')
        gradient.addColorStop(0.45, '#0b122b')
        gradient.addColorStop(1, '#060910')

        ctx.fillStyle = gradient
        ctx.fillRect(-64, -64, width + 128, height + 128)
    }

    function drawNebulaLayer(timeSeconds) {
        const offsetX = cameraOffsetX
        const offsetY = cameraOffsetY
        nebulaSeeds.forEach(seed => {
            const pulse = (Math.sin(timeSeconds * seed.pulseSpeed + seed.pulseOffset) + 1) * 0.5
            const radius = seed.radius * (0.9 + pulse * 0.2)
            const alpha = clamp(seed.alpha * (0.8 + pulse * 0.6), 0, 0.2)

            const gradient = ctx.createRadialGradient(
                seed.x * width + offsetX,
                seed.y * height + offsetY,
                0,
                seed.x * width + offsetX,
                seed.y * height + offsetY,
                radius
            )

            gradient.addColorStop(0, `hsla(${seed.hue}, 85%, 66%, ${alpha})`)
            gradient.addColorStop(0.55, `hsla(${seed.hue + 15}, 92%, 55%, ${alpha * 0.65})`)
            gradient.addColorStop(1, `hsla(${seed.hue + 30}, 95%, 45%, 0)`)

            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(seed.x * width + offsetX, seed.y * height + offsetY, radius, 0, Math.PI * 2)
            ctx.fill()
        })
    }

    function drawStars(timeSeconds) {
        const offsetX = cameraOffsetX * 2.1
        const offsetY = cameraOffsetY * 2.1
        stars.forEach(star => {
            const x = (star.x * width + Math.sin(timeSeconds * 0.05 + star.twinkleOffset) * star.drift * width + offsetX + width) % width
            const y = clamp(star.y * height + offsetY, -48, height + 48)
            const twinkle = (Math.sin(timeSeconds * star.twinkleSpeed + star.twinkleOffset) + 1) * 0.5
            const alpha = 0.2 + twinkle * 0.8
            const radius = star.size * (0.85 + twinkle * 0.5)

            const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 6)
            glow.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.85})`)
            glow.addColorStop(0.4, `rgba(194, 215, 255, ${alpha * 0.22})`)
            glow.addColorStop(1, 'rgba(194, 215, 255, 0)')

            ctx.fillStyle = glow
            ctx.beginPath()
            ctx.arc(x, y, radius * 6, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
            ctx.beginPath()
            ctx.arc(x, y, radius, 0, Math.PI * 2)
            ctx.fill()
        })
    }

    function renderFrame(timestamp) {
        twinkleTime = timestamp * 0.001
        updateCameraTween(timestamp)

        ctx.clearRect(0, 0, width, height)
        drawSpaceBase()
        drawNebulaLayer(twinkleTime)
        drawStars(twinkleTime)

        animationFrameId = requestAnimationFrame(renderFrame)
    }

    function startAnimation() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId)
        }

        animationFrameId = requestAnimationFrame(renderFrame)
    }

    function stopAnimation() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId)
            animationFrameId = null
        }
    }

    function init(canvasId) {
        canvas = document.getElementById(canvasId)
        if (!canvas) {
            return
        }

        ctx = canvas.getContext('2d')
        if (!ctx) {
            return
        }

        createStars()
        createNebulaSeeds()
        resizeCanvas()
        startAnimation()

        window.addEventListener('resize', resizeCanvas)
        window.addEventListener('wheel', onWheelControl, { passive: true })
        window.addEventListener('keydown', onKeyboardControl)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopAnimation()
                return
            }

            startAnimation()
        })
    }

    function setCameraFocus(percentX, percentY) {
        const normalizedX = clamp((50 - percentX) / 50, -1, 1)
        const normalizedY = clamp((50 - percentY) / 50, -1, 1)

        targetOffsetX = normalizedX * MAX_CAMERA_OFFSET
        targetOffsetY = normalizedY * MAX_CAMERA_OFFSET
        cameraTweenStartX = cameraOffsetX
        cameraTweenStartY = cameraOffsetY
        cameraTweenStartTime = performance.now()
        cameraTweenActive = true
    }

    function resetCameraFocus() {
        targetOffsetX = 0
        targetOffsetY = 0
        cameraTweenStartX = cameraOffsetX
        cameraTweenStartY = cameraOffsetY
        cameraTweenStartTime = performance.now()
        cameraTweenActive = true
    }

    // functions into global scope for app.js to call
    window.AstralBackground = {
        init,
        setCameraFocus,
        resetCameraFocus
    }
})()
