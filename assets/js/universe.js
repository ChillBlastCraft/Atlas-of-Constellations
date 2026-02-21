function renderUniverse() {
    const universe = document.getElementById("universe")

    constellations.forEach(constellation => {
        const dot = document.createElement("div")

        dot.classList.add("constellation")
        dot.style.left = constellation.position.x + "%"
        dot.style.top = constellation.position.y + "%"

        universe.appendChild(dot)
    })
}