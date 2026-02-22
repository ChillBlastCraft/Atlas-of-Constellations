(function () {
    const {
        NODE_SPACING_MULTIPLIER,
        CLOSE_NODE_SPACING_MULTIPLIER,
        LOW_NODE_OPACITY,
        FULL_NODE_OPACITY,
        NODE_DEFAULT_SCALE,
        NODE_ACTIVE_SCALE,
        MIN_NODE_SCALE
    } = NodeSystem.constants

    const {
        resetAllNodesCloseAndDim,
        updateNodesForConstellation,
        getDotByConstellationId
    } = NodeSystem

    function onHover(dot) {
        dot.classList.add("hovered")
    }

    function onClick(constellation, dot) {
        console.clear()
        console.log("Clicked on constellation:", constellation.name)

        const allDots = document.querySelectorAll('.constellation')
        allDots.forEach(d => {
            d.style.left = d.constellation.position.x + "%"
            d.style.top = d.constellation.position.y + "%"
            d.style.transform = 'translate(-50%, -50%)'
            d.classList.remove('faded')
        })

        // reset all nodes to close and dim before expanding the clicked constellation
        resetAllNodesCloseAndDim(constellations)

        // calculate distance and direction from clicked constellation to center
        const cx = 50
        const cy = 50
        const x = constellation.position.x
        const y = constellation.position.y

        // set camera focus to clicked constellation position
        if (window.AstralBackground && typeof window.AstralBackground.setCameraFocus === 'function') {
            window.AstralBackground.setCameraFocus(x, y)
        }

        // calculate  distance from original position to center
        const dx = cx - x
        const dy = cy - y
        const dist = Math.sqrt(dx * dx + dy * dy)

        // move clicked constellation to center
        dot.style.left = cx + "%"
        dot.style.top = cy + "%"
        dot.style.transform = 'translate(-50%, -50%) scale(2)'

        // update nodes for clicked constellation
        updateNodesForConstellation(
            constellation,
            cx,
            cy,
            NODE_SPACING_MULTIPLIER,
            FULL_NODE_OPACITY,
            NODE_ACTIVE_SCALE
        )

        // move other constellations away from center and fade them based on distance
        allDots.forEach(otherDot => {
            if (otherDot === dot) {
                return
            }

            // calculate distance and direction from clicked constellation to other constellation
            const otherConst = otherDot.constellation
            const ox = otherConst.position.x
            const oy = otherConst.position.y
            const vx = ox - x
            const vy = oy - y
            const vlen = Math.sqrt(vx * vx + vy * vy)

            // move other constellation away from center based on distance
            if (vlen > 0) {
                const nx = vx / vlen
                const ny = vy / vlen
                const newX = ox + nx * dist
                const newY = oy + ny * dist
                otherDot.style.left = Math.max(0, Math.min(100, newX)) + "%"
                otherDot.style.top = Math.max(0, Math.min(100, newY)) + "%"
            }

            // fade and scale other constellation based on distance 
            const scale = Math.max(0.1, Math.exp(-vlen / 60))
            otherDot.style.transform = `translate(-50%, -50%) scale(${scale})`
            otherDot.classList.add('faded')

            // nodeScale = base_scale * distance_scale (but not smaller than MIN_NODE_SCALE)
            const nodeScale = Math.max(MIN_NODE_SCALE, NODE_ACTIVE_SCALE * scale)
            updateNodesForConstellation(
                otherConst,
                parseFloat(otherDot.style.left),
                parseFloat(otherDot.style.top),
                CLOSE_NODE_SPACING_MULTIPLIER,
                LOW_NODE_OPACITY,
                nodeScale
            )

            console.log(`Constellation ${otherConst.name}: distance ${vlen.toFixed(2)}, scale ${scale.toFixed(2)}`)
        })

        // show back button
        const backButton = document.getElementById('back-button')
        backButton.classList.add('active')
    }

    // reset universe to original state (after back button click)
    function resetUniverse() {
        const allDots = document.querySelectorAll('.constellation')
        allDots.forEach(d => {
            d.style.left = d.constellation.position.x + "%"
            d.style.top = d.constellation.position.y + "%"
            d.style.transform = 'translate(-50%, -50%)'
            d.classList.remove('faded')
        })

        constellations.forEach(constellation => {
            const dot = getDotByConstellationId(constellation.id)

            let centerX = constellation.position.x
            let centerY = constellation.position.y

            if (dot) {
                centerX = parseFloat(dot.style.left)
                centerY = parseFloat(dot.style.top)
            }

            updateNodesForConstellation(
                constellation,
                centerX,
                centerY,
                CLOSE_NODE_SPACING_MULTIPLIER,
                LOW_NODE_OPACITY,
                NODE_DEFAULT_SCALE
            )
        })

        const backButton = document.getElementById('back-button')
        backButton.classList.remove('active')

        // reset camera focus to center
        if (window.AstralBackground && typeof window.AstralBackground.resetCameraFocus === 'function') {
            window.AstralBackground.resetCameraFocus()
        }
    }

    // functions into global scope for universe.js to call
    window.ConstellationSystem = {
        onHover,
        onClick,
        resetUniverse
    }
})()
