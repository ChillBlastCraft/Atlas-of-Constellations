(function () {
    let canvas
    let ctx
    let width = 0
    let height = 0
    let animationFrameId = null
    let stars = []
    let nebulaSeeds = []
    let twinkleTime = 0

    const STAR_COUNT = 500
    const NEBULA_SEED_COUNT = 10
    const STAR_MIN_SIZE = 0.25
    const STAR_MAX_SIZE = 1.75

    function randomInRange(min, max) {
        return min + Math.random() * (max - min)
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value))
    }

    function createStars() {
        stars = Array.from({ length: STAR_COUNT }, () => ({
            x: Math.random(),
            y: Math.random(),
            size: randomInRange(STAR_MIN_SIZE, STAR_MAX_SIZE),
            twinkleSpeed: randomInRange(0.4, 1.4),
            twinkleOffset: randomInRange(0, Math.PI * 2),
            drift: randomInRange(-0.03, 0.03)
        }))
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
        width = window.innerWidth
        height = window.innerHeight

        canvas.width = Math.floor(width * dpr)
        canvas.height = Math.floor(height * dpr)
        canvas.style.width = width + 'px'
        canvas.style.height = height + 'px'

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function drawSpaceBase() {
        const gradient = ctx.createRadialGradient(
            width * 0.5,
            height * 0.45,
            width * 0.08,
            width * 0.5,
            height * 0.5,
            width * 0.9
        )
        gradient.addColorStop(0, '#121a39')
        gradient.addColorStop(0.45, '#0b122b')
        gradient.addColorStop(1, '#060910')

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, height)
    }

    function drawNebulaLayer(timeSeconds) {
        nebulaSeeds.forEach(seed => {
            const pulse = (Math.sin(timeSeconds * seed.pulseSpeed + seed.pulseOffset) + 1) * 0.5
            const radius = seed.radius * (0.9 + pulse * 0.2)
            const alpha = clamp(seed.alpha * (0.8 + pulse * 0.6), 0, 0.2)

            const gradient = ctx.createRadialGradient(
                seed.x * width,
                seed.y * height,
                0,
                seed.x * width,
                seed.y * height,
                radius
            )

            gradient.addColorStop(0, `hsla(${seed.hue}, 85%, 66%, ${alpha})`)
            gradient.addColorStop(0.55, `hsla(${seed.hue + 15}, 92%, 55%, ${alpha * 0.65})`)
            gradient.addColorStop(1, `hsla(${seed.hue + 30}, 95%, 45%, 0)`)

            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(seed.x * width, seed.y * height, radius, 0, Math.PI * 2)
            ctx.fill()
        })
    }

    function drawStars(timeSeconds) {
        stars.forEach(star => {
            const x = (star.x * width + Math.sin(timeSeconds * 0.05 + star.twinkleOffset) * star.drift * width) % width
            const y = star.y * height
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
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopAnimation()
                return
            }

            startAnimation()
        })
    }

    window.AstralBackground = {
        init
    }
})()
