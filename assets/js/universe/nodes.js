(function () {
    const NODE_SPACING_MULTIPLIER = 10
    const CLOSE_NODE_SPACING_MULTIPLIER = 3
    const LOW_NODE_OPACITY = '0.1'
    const FULL_NODE_OPACITY = '1'
    const NODE_DEFAULT_SCALE = 0.7
    const NODE_ACTIVE_SCALE = 1.15
    const MIN_NODE_SCALE = 0.2
    const nodeLayoutByConstellationId = new Map()
    const pendingSyncConstellationIds = new Set()
    let constellationObserver = null
    let syncAnimationFrameId = null
    let hasResizeListener = false

    function calculateNodePosition(constellation, nodeData, centerX, centerY, spacingMultiplier) {
        const offsetX = nodeData.x - constellation.position.x
        const offsetY = nodeData.y - constellation.position.y

        return {
            x: centerX + offsetX * spacingMultiplier,
            y: centerY + offsetY * spacingMultiplier
        }
    }

    function getNodePositionFromStyle(nodeDiv) {
        return {
            x: parseFloat(nodeDiv.style.left),
            y: parseFloat(nodeDiv.style.top)
        }
    }

    function percentPositionToPixels(percentPosition, universeWidth, universeHeight) {
        return {
            x: (percentPosition.x / 100) * universeWidth,
            y: (percentPosition.y / 100) * universeHeight
        }
    }

    function getConstellationLinks(constellation) {
        if (Array.isArray(constellation.links)) {
            return constellation.links
        }

        return []
    }

    function getLayoutState(constellationId) {
        if (nodeLayoutByConstellationId.has(constellationId)) {
            return nodeLayoutByConstellationId.get(constellationId)
        }

        return {
            spacingMultiplier: CLOSE_NODE_SPACING_MULTIPLIER,
            opacity: LOW_NODE_OPACITY,
            nodeScale: NODE_DEFAULT_SCALE
        }
    }

    function syncConstellationToDotPosition(constellationId) {
        const dot = getDotByConstellationId(constellationId)
        if (!dot || !dot.constellation) {
            return
        }

        const constellation = dot.constellation
        const left = parseFloat(dot.style.left)
        const top = parseFloat(dot.style.top)
        let centerX
        if (Number.isFinite(left)) {
            centerX = left
        } else {
            centerX = constellation.position.x
        }

        let centerY
        if (Number.isFinite(top)) {
            centerY = top
        } else {
            centerY = constellation.position.y
        }
        const layoutState = getLayoutState(constellationId)

        updateNodesForConstellation(
            constellation,
            centerX,
            centerY,
            layoutState.spacingMultiplier,
            layoutState.opacity,
            layoutState.nodeScale
        )
    }

    function flushPendingSync() {
        syncAnimationFrameId = null
        pendingSyncConstellationIds.forEach(constellationId => {
            syncConstellationToDotPosition(constellationId)
        })
        pendingSyncConstellationIds.clear()
    }

    function queueConstellationSync(constellationId) {
        if (!constellationId) {
            return
        }

        pendingSyncConstellationIds.add(constellationId)
        if (syncAnimationFrameId !== null) {
            return
        }

        syncAnimationFrameId = requestAnimationFrame(flushPendingSync)
    }

    function queueAllConstellationSync() {
        nodeLayoutByConstellationId.forEach((_, constellationId) => {
            queueConstellationSync(constellationId)
        })
    }

    function ensureConstellationObserver(universe) {
        if (constellationObserver) {
            if (!hasResizeListener) {
                window.addEventListener('resize', queueAllConstellationSync)
                hasResizeListener = true
            }

            return
        }

        constellationObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                const target = mutation.target
                if (!target.classList || !target.classList.contains('constellation')) {
                    return
                }

                queueConstellationSync(target.dataset.id)
            })
        })

        constellationObserver.observe(universe, {
            attributes: true,
            subtree: true,
            attributeFilter: ['style']
        })

        if (!hasResizeListener) {
            window.addEventListener('resize', queueAllConstellationSync)
            hasResizeListener = true
        }
    }

    function positionLine(lineDiv, fromPosPx, toPosPx) {
        const dx = toPosPx.x - fromPosPx.x
        const dy = toPosPx.y - fromPosPx.y
        const length = Math.sqrt(dx * dx + dy * dy)
        const angle = Math.atan2(dy, dx)
        const midX = (fromPosPx.x + toPosPx.x) / 2
        const midY = (fromPosPx.y + toPosPx.y) / 2

        lineDiv.style.width = length + 'px'
        lineDiv.style.left = midX + 'px'
        lineDiv.style.top = midY + 'px'
        lineDiv.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`
    }

    function updateLinesForConstellation(constellation, centerX, centerY, spacingMultiplier, opacity) {
        const universe = document.getElementById('universe')
        if (!universe) {
            return
        }

        const universeWidth = universe.clientWidth
        const universeHeight = universe.clientHeight
        const lines = document.querySelectorAll(`.constellation-line[data-constellation-id="${constellation.id}"]`)
        lines.forEach(lineDiv => {
            const fromIndex = Number(lineDiv.dataset.fromIndex)
            const toIndex = Number(lineDiv.dataset.toIndex)
            const fromNode = constellation.nodes[fromIndex]
            const toNode = constellation.nodes[toIndex]

            if (!fromNode || !toNode) {
                return
            }

            const fromPos = calculateNodePosition(constellation, fromNode, centerX, centerY, spacingMultiplier)
            const toPos = calculateNodePosition(constellation, toNode, centerX, centerY, spacingMultiplier)
            const fromPosPx = percentPositionToPixels(fromPos, universeWidth, universeHeight)
            const toPosPx = percentPositionToPixels(toPos, universeWidth, universeHeight)
            positionLine(lineDiv, fromPosPx, toPosPx)
            lineDiv.style.opacity = opacity
        })
    }

    // position single node around a constellation center using spacing + scale
    function positionNode(nodeDiv, constellation, centerX, centerY, spacingMultiplier, nodeScale = NODE_DEFAULT_SCALE) {
        const pos = calculateNodePosition(constellation, nodeDiv.nodeData, centerX, centerY, spacingMultiplier)
        nodeDiv.style.left = pos.x + "%"
        nodeDiv.style.top = pos.y + "%"
        nodeDiv.style.transform = `translate(-50%, -50%) scale(${nodeScale})`
    }

    // update all nodes that belong to constellation
    function updateNodesForConstellation(constellation, centerX, centerY, spacingMultiplier, opacity, nodeScale = NODE_DEFAULT_SCALE) {
        nodeLayoutByConstellationId.set(constellation.id, {
            spacingMultiplier,
            opacity,
            nodeScale
        })

        const nodes = document.querySelectorAll(`.constellation-node[data-constellation-id="${constellation.id}"]`)
        nodes.forEach(nodeDiv => {
            positionNode(nodeDiv, constellation, centerX, centerY, spacingMultiplier, nodeScale)
            nodeDiv.style.opacity = opacity
        })

        updateLinesForConstellation(constellation, centerX, centerY, spacingMultiplier, opacity)
    }

    // render all node elements for a single constellation
    function renderNodesForConstellation(universe, constellation) {
        ensureConstellationObserver(universe)

        // skip constellation if it has no nodes
        if (!Array.isArray(constellation.nodes) || constellation.nodes.length === 0) {
            return
        }

        nodeLayoutByConstellationId.set(constellation.id, {
            spacingMultiplier: CLOSE_NODE_SPACING_MULTIPLIER,
            opacity: LOW_NODE_OPACITY,
            nodeScale: NODE_DEFAULT_SCALE
        })

        const renderedNodes = []

        constellation.nodes.forEach((node, idx) => {
            const nodeDiv = document.createElement("div")
            nodeDiv.className = "constellation-node"
            nodeDiv.dataset.constellationId = constellation.id
            nodeDiv.constellation = constellation
            nodeDiv.nodeData = node
            nodeDiv.title = `Node ${idx + 1} of ${constellation.name}`
            nodeDiv.addEventListener("click", () => {
                window.location.href = node.url
            })

            // initial node state: close to constellation and dimmed
            positionNode(nodeDiv, constellation, constellation.position.x, constellation.position.y, CLOSE_NODE_SPACING_MULTIPLIER)
            nodeDiv.style.opacity = LOW_NODE_OPACITY
            universe.appendChild(nodeDiv)
            renderedNodes.push(nodeDiv)
        })

        const links = getConstellationLinks(constellation)
        links.forEach((link, index) => {
            const fromIndex = Number(link[0])
            const toIndex = Number(link[1])
            const fromNodeDiv = renderedNodes[fromIndex]
            const toNodeDiv = renderedNodes[toIndex]

            if (!fromNodeDiv || !toNodeDiv) {
                return
            }

            const lineDiv = document.createElement('div')
            lineDiv.className = 'constellation-line'
            lineDiv.dataset.constellationId = constellation.id
            lineDiv.dataset.fromIndex = String(fromIndex)
            lineDiv.dataset.toIndex = String(toIndex)
            lineDiv.style.opacity = LOW_NODE_OPACITY

            const fromPos = getNodePositionFromStyle(fromNodeDiv)
            const toPos = getNodePositionFromStyle(toNodeDiv)
            const universeWidth = universe.clientWidth
            const universeHeight = universe.clientHeight
            const fromPosPx = percentPositionToPixels(fromPos, universeWidth, universeHeight)
            const toPosPx = percentPositionToPixels(toPos, universeWidth, universeHeight)
            positionLine(lineDiv, fromPosPx, toPosPx)
            universe.appendChild(lineDiv)
        })
    }

    // get constellation dot element by id
    function getDotByConstellationId(constellationId) {
        return document.querySelector(`.constellation[data-id="${constellationId}"]`)
    }

    // reset all nodes to default close + dim appearance
    function resetAllNodesCloseAndDim(constellations) {
        constellations.forEach(constellation => {
            const centerX = constellation.position.x
            const centerY = constellation.position.y

            updateNodesForConstellation(
                constellation,
                centerX,
                centerY,
                CLOSE_NODE_SPACING_MULTIPLIER,
                LOW_NODE_OPACITY,
                NODE_DEFAULT_SCALE
            )
        })
    }

    // functions/constants into global scope for universe + constellation systems
    window.NodeSystem = {
        constants: {
            NODE_SPACING_MULTIPLIER,
            CLOSE_NODE_SPACING_MULTIPLIER,
            LOW_NODE_OPACITY,
            FULL_NODE_OPACITY,
            NODE_DEFAULT_SCALE,
            NODE_ACTIVE_SCALE,
            MIN_NODE_SCALE
        },
        renderNodesForConstellation,
        updateNodesForConstellation,
        getDotByConstellationId,
        resetAllNodesCloseAndDim
    }
})()
