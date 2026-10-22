function renderUniverse() {
    const universe = document.getElementById("universe")

    constellations.forEach(constellation => {
        const dot = document.createElement("div")
        dot.classList.add("constellation")
        dot.textContent = constellation.name
        dot.style.left = constellation.position.x + "%"
        dot.style.top = constellation.position.y + "%"
        dot.dataset.id = constellation.id
        dot.constellation = constellation

        dot.addEventListener("mouseenter", () => onConstellationHover(dot))
        dot.addEventListener("mouseleave", () => onConstellationLeave(dot))
        dot.addEventListener("click", () => onConstellationClick(constellation, dot))

        universe.appendChild(dot)
        NodeSystem.renderNodesForConstellation(universe, constellation)
    })
}

// on hover
function onConstellationHover(dot) {
    ConstellationSystem.onHover(dot)
}

function onConstellationLeave(dot) {
    ConstellationSystem.onLeave(dot)
}

// on click
function onConstellationClick(constellation, dot) {
    ConstellationSystem.onClick(constellation, dot)
}

// reset to original state
function resetUniverse() {
    ConstellationSystem.resetUniverse()
}