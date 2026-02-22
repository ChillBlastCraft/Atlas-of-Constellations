(function () {
    const NODE_SPACING_MULTIPLIER = 10
    const CLOSE_NODE_SPACING_MULTIPLIER = 3
    const LOW_NODE_OPACITY = '0.1'
    const FULL_NODE_OPACITY = '1'
    const NODE_DEFAULT_SCALE = 0.7
    const NODE_ACTIVE_SCALE = 1.15
    const MIN_NODE_SCALE = 0.2

    // position single node around a constellation center using spacing + scale
    function positionNode(nodeDiv, constellation, centerX, centerY, spacingMultiplier, nodeScale = NODE_DEFAULT_SCALE) {
        // calculate node offset from its constellation anchor
        const offsetX = nodeDiv.nodeData.x - constellation.position.x
        const offsetY = nodeDiv.nodeData.y - constellation.position.y

        // place node around provided center
        nodeDiv.style.left = (centerX + offsetX * spacingMultiplier) + "%"
        nodeDiv.style.top = (centerY + offsetY * spacingMultiplier) + "%"
        nodeDiv.style.transform = `translate(-50%, -50%) scale(${nodeScale})`
    }

    // update all nodes that belong to constellation
    function updateNodesForConstellation(constellation, centerX, centerY, spacingMultiplier, opacity, nodeScale = NODE_DEFAULT_SCALE) {
        const nodes = document.querySelectorAll(`.constellation-node[data-constellation-id="${constellation.id}"]`)
        nodes.forEach(nodeDiv => {
            positionNode(nodeDiv, constellation, centerX, centerY, spacingMultiplier, nodeScale)
            nodeDiv.style.opacity = opacity
        })
    }

    // render all node elements for a single constellation
    function renderNodesForConstellation(universe, constellation) {
        // skip constellation if it has no nodes
        if (!Array.isArray(constellation.nodes) || constellation.nodes.length === 0) {
            return
        }

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
