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

    // track hover sources for each constellation, allow multiple sources to hover without prematurely removing hover state
    const hoverSourceCountByConstellationId = new Map()
    const hoveredNodeByConstellationId = new Map()

    // set hover state for constellation dot and related nodes/lines
    function setDotHoverState(constellationId, enabled) {
        const dot = getDotByConstellationId(constellationId)
        if (!dot) {
            return
        }

        if (enabled) {
            dot.classList.add('hovered')
        } else {
            dot.classList.remove('hovered')
        }

        if (isConstellationFocused(constellationId)) {
            setConstellationHighlight(constellationId, false)
            return
        }

        setConstellationHighlight(constellationId, enabled)
    }

    function isConstellationFocused(constellationId) {
        const dot = getDotByConstellationId(constellationId)
        if (!dot) {
            return false
        }

        const left = parseFloat(dot.style.left)
        const top = parseFloat(dot.style.top)
        if (!Number.isFinite(left) || !Number.isFinite(top)) {
            return false
        }

        return Math.abs(left - 50) < 0.15 && Math.abs(top - 50) < 0.15 && !dot.classList.contains('faded')
    }

    function setConstellationHighlight(constellationId, enabled) {
        let method
        if (enabled) {
            method = 'add'
        } else {
            method = 'remove'
        }

        const nodes = document.querySelectorAll(`.constellation-node[data-constellation-id="${constellationId}"]`)
        const lines = document.querySelectorAll(`.constellation-line[data-constellation-id="${constellationId}"]`)

        nodes.forEach(node => {
            node.classList[method]('hover-bright')
        })

        lines.forEach(line => {
            line.classList[method]('hover-bright')
        })
    }

    // clear all hover states and highlights
    function beginHover(constellationId) {
        if (!constellationId) {
            return
        }

        const currentCount = hoverSourceCountByConstellationId.get(constellationId) || 0
        const nextCount = currentCount + 1
        hoverSourceCountByConstellationId.set(constellationId, nextCount)

        if (nextCount === 1) {
            setDotHoverState(constellationId, true)
        }
    }

    // remove source of hover
    function endHover(constellationId) {
        if (!constellationId) {
            return
        }

        const currentCount = hoverSourceCountByConstellationId.get(constellationId) || 0
        if (currentCount <= 1) {
            hoverSourceCountByConstellationId.delete(constellationId)
            setDotHoverState(constellationId, false)
            return
        }

        hoverSourceCountByConstellationId.set(constellationId, currentCount - 1)
    }

    function getConstellationById(constellationId) {
        if (!Array.isArray(constellations)) {
            return null
        }

        const targetId = String(constellationId)
        return constellations.find(constellation => String(constellation.id) === targetId) || null
    }

    function getConstellationLinks(constellation) {
        if (!constellation || !Array.isArray(constellation.links)) {
            return []
        }

        return constellation.links
    }

    function buildAdjacencyList(constellation) {
        const adjacency = new Map()
        const nodeCount = Array.isArray(constellation.nodes) ? constellation.nodes.length : 0

        for (let index = 0; index < nodeCount; index += 1) {
            adjacency.set(index, [])
        }

        getConstellationLinks(constellation).forEach(link => {
            const fromIndex = Number(link[0])
            const toIndex = Number(link[1])

            if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) {
                return
            }

            if (!adjacency.has(fromIndex) || !adjacency.has(toIndex)) {
                return
            }

            adjacency.get(fromIndex).push(toIndex)
            adjacency.get(toIndex).push(fromIndex)
        })

        return adjacency
    }

    function getNodeGraphDistances(constellation, startIndex) {
        const adjacency = buildAdjacencyList(constellation)
        const distances = new Map()

        adjacency.forEach((_, index) => {
            distances.set(index, Number.POSITIVE_INFINITY)
        })

        if (!adjacency.has(startIndex)) {
            return distances
        }

        const queue = [startIndex]
        distances.set(startIndex, 0)

        while (queue.length > 0) {
            const currentIndex = queue.shift()
            const currentDistance = distances.get(currentIndex)
            const neighbors = adjacency.get(currentIndex)

            neighbors.forEach(neighborIndex => {
                if (distances.get(neighborIndex) !== Number.POSITIVE_INFINITY) {
                    return
                }

                distances.set(neighborIndex, currentDistance + 1)
                queue.push(neighborIndex)
            })
        }

        return distances
    }

    function getDistanceBrightness(distance) {
        if (!Number.isFinite(distance)) {
            return 0
        }

        return Math.max(0.2, 1 - distance * 0.22)
    }

    function clearNodeHoverHighlight(constellationId) {
        const nodes = document.querySelectorAll(`.constellation-node[data-constellation-id="${constellationId}"]`)
        const lines = document.querySelectorAll(`.constellation-line[data-constellation-id="${constellationId}"]`)

        nodes.forEach(node => {
            node.classList.remove('hover-node-bright')
        })

        lines.forEach(line => {
            line.classList.remove('hover-line-bright')
        })

        hoveredNodeByConstellationId.delete(constellationId)
    }

    function applyNodeHoverHighlight(constellationId, nodeIndex) {
        const constellation = getConstellationById(constellationId)
        if (!constellation) {
            return
        }

        clearNodeHoverHighlight(constellationId)

        const targetNode = document.querySelector(`.constellation-node[data-constellation-id="${constellationId}"][data-node-index="${nodeIndex}"]`)
        if (targetNode) {
            targetNode.classList.add('hover-node-bright')
        }

        const lines = document.querySelectorAll(`.constellation-line[data-constellation-id="${constellationId}"]`)

        lines.forEach(line => {
            const fromIndex = Number(line.dataset.fromIndex)
            const toIndex = Number(line.dataset.toIndex)
            const connectedToHoveredNode = fromIndex === nodeIndex || toIndex === nodeIndex
            if (!connectedToHoveredNode) {
                return
            }

            let startAlpha = 1
            let middleAlpha = 0.95
            let endAlpha = 0.2
            if (toIndex === nodeIndex) {
                startAlpha = 0.2
                middleAlpha = 0.95
                endAlpha = 1
            }

            line.classList.add('hover-line-bright')
            line.style.setProperty('--focused-line-start-alpha', startAlpha.toFixed(3))
            line.style.setProperty('--focused-line-middle-alpha', middleAlpha.toFixed(3))
            line.style.setProperty('--focused-line-end-alpha', endAlpha.toFixed(3))
        })

        hoveredNodeByConstellationId.set(constellationId, nodeIndex)
    }

    function clearAllNodeHoverHighlights() {
        Array.from(hoveredNodeByConstellationId.keys()).forEach(constellationId => {
            clearNodeHoverHighlight(constellationId)
        })
    }

    // clear all highlights and hover states
    function clearAllHighlights() {
        hoverSourceCountByConstellationId.clear()
        clearAllNodeHoverHighlights()

        document.querySelectorAll('.constellation.hovered').forEach(dot => {
            dot.classList.remove('hovered')
        })

        document.querySelectorAll('.constellation-node.hover-bright, .constellation-line.hover-bright').forEach(element => {
            element.classList.remove('hover-bright')
        })
    }

    function onHover(dot) {
        beginHover(dot.dataset.id)
    }

    function onLeave(dot) {
        endHover(dot.dataset.id)
    }

    function onRelatedHoverEnter(constellationId) {
        beginHover(constellationId)
    }

    function onRelatedHoverLeave(constellationId) {
        endHover(constellationId)
    }

    function onNodeHoverEnter(constellationId, nodeIndex) {
        if (!Number.isInteger(nodeIndex)) {
            return
        }

        if (!isConstellationFocused(constellationId)) {
            return
        }

        applyNodeHoverHighlight(constellationId, nodeIndex)
    }

    function onNodeHoverLeave(constellationId, nodeIndex) {
        if (!isConstellationFocused(constellationId)) {
            clearNodeHoverHighlight(constellationId)
            return
        }

        const currentlyHoveredNodeIndex = hoveredNodeByConstellationId.get(constellationId)
        if (Number.isInteger(nodeIndex) && currentlyHoveredNodeIndex !== nodeIndex) {
            return
        }

        clearNodeHoverHighlight(constellationId)
    }

    function getFocusedSpacingMultiplier(constellation, centerX, centerY) {
        const viewportPaddingPercent = 8
        const minX = viewportPaddingPercent
        const maxX = 100 - viewportPaddingPercent
        const minY = viewportPaddingPercent
        const maxY = 100 - viewportPaddingPercent

        if (!Array.isArray(constellation.nodes) || constellation.nodes.length === 0) {
            return NODE_SPACING_MULTIPLIER
        }

        let maxAllowedSpacing = Number.POSITIVE_INFINITY

        constellation.nodes.forEach(node => {
            const offsetX = node.x - constellation.position.x
            const offsetY = node.y - constellation.position.y

            if (offsetX > 0) {
                maxAllowedSpacing = Math.min(maxAllowedSpacing, (maxX - centerX) / offsetX)
            } else if (offsetX < 0) {
                maxAllowedSpacing = Math.min(maxAllowedSpacing, (minX - centerX) / offsetX)
            }

            if (offsetY > 0) {
                maxAllowedSpacing = Math.min(maxAllowedSpacing, (maxY - centerY) / offsetY)
            } else if (offsetY < 0) {
                maxAllowedSpacing = Math.min(maxAllowedSpacing, (minY - centerY) / offsetY)
            }
        })

        if (!Number.isFinite(maxAllowedSpacing) || maxAllowedSpacing <= 0) {
            return NODE_SPACING_MULTIPLIER
        }

        return Math.min(NODE_SPACING_MULTIPLIER, maxAllowedSpacing)
    }

    function onClick(constellation, dot) {
        // Batch DOM updates for performance
        window.requestAnimationFrame(() => {
            console.clear()
            console.log("Clicked on constellation:", constellation.name)
            clearAllHighlights()

            // Cache all dots
            const allDots = Array.from(document.querySelectorAll('.constellation'))
            // Prepare new positions and transforms
            const cx = 50
            const cy = 50
            const x = constellation.position.x
            const y = constellation.position.y
            const dx = cx - x
            const dy = cy - y
            const dist = Math.sqrt(dx * dx + dy * dy)

            // Precompute new positions for all dots
            const dotUpdates = allDots.map(otherDot => {
                if (otherDot === dot) {
                    return {
                        dot: otherDot,
                        left: cx + "%",
                        top: cy + "%",
                        transform: 'translate(-50%, -50%) scale(2)',
                        faded: false,
                        nodeScale: NODE_ACTIVE_SCALE,
                        spacing: getFocusedSpacingMultiplier(constellation, cx, cy),
                        updateNodes: true,
                        constellation: constellation
                    }
                }
                const otherConst = otherDot.constellation
                const ox = otherConst.position.x
                const oy = otherConst.position.y
                const vx = ox - x
                const vy = oy - y
                const vlen = Math.sqrt(vx * vx + vy * vy)
                let left = ox + "%"
                let top = oy + "%"
                if (vlen > 0) {
                    const nx = vx / vlen
                    const ny = vy / vlen
                    const newX = ox + nx * dist
                    const newY = oy + ny * dist
                    left = Math.max(0, Math.min(100, newX)) + "%"
                    top = Math.max(0, Math.min(100, newY)) + "%"
                }
                const scale = Math.max(0.1, Math.exp(-vlen / 60))
                const nodeScale = Math.max(MIN_NODE_SCALE, NODE_ACTIVE_SCALE * scale)
                return {
                    dot: otherDot,
                    left,
                    top,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    faded: true,
                    nodeScale,
                    spacing: CLOSE_NODE_SPACING_MULTIPLIER,
                    updateNodes: true,
                    constellation: otherConst
                }
            })

            // Apply all dot updates in a batch
            dotUpdates.forEach(update => {
                update.dot.style.left = update.left
                update.dot.style.top = update.top
                update.dot.style.transform = update.transform
                if (update.faded) {
                    update.dot.classList.add('faded')
                } else {
                    update.dot.classList.remove('faded')
                }
            })

            // Reset all nodes to close and dim before expanding the clicked constellation
            resetAllNodesCloseAndDim(constellations)

            // Update nodes for all constellations in a batch
            dotUpdates.forEach(update => {
                updateNodesForConstellation(
                    update.constellation,
                    parseFloat(update.left),
                    parseFloat(update.top),
                    update.spacing,
                    update.faded ? LOW_NODE_OPACITY : FULL_NODE_OPACITY,
                    update.nodeScale
                )
            })

            // set camera focus to clicked constellation position
            if (window.AstralBackground && typeof window.AstralBackground.setCameraFocus === 'function') {
                window.AstralBackground.setCameraFocus(x, y)
            }

            // show back button
            const backButton = document.getElementById('back-button')
            backButton.classList.add('active')
        })
    }

    // reset universe to original state (after back button click)
    function resetUniverse() {
        clearAllHighlights()

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
        onLeave,
        onRelatedHoverEnter,
        onRelatedHoverLeave,
        onNodeHoverEnter,
        onNodeHoverLeave,
        onClick,
        resetUniverse
    }
})()
