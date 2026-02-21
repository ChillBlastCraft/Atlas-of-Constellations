function renderUniverse() {
    const universe = document.getElementById("universe")

    constellations.forEach(constellation => {
        const dot = document.createElement("div")

        dot.classList.add("constellation")
        dot.style.left = constellation.position.x + "%"
        dot.style.top = constellation.position.y + "%"
        dot.dataset.id = constellation.id

        dot.addEventListener("mouseover", () => onConstellationHover(dot))
        dot.addEventListener("click", () => onConstellationClick(constellation, dot))

        universe.appendChild(dot)
    })
}

function onConstellationHover(dot) { 
    dot.classList.add("hovered")
}

function onConstellationClick(constellation, dot) {
    console.log("Clicked on constellation:", constellation.name)

    // move dot to the center
    const originalX = dot.style.left
    const originalY = dot.style.top
    dot.style.left = "50%"
    dot.style.top = "50%"

    // resets position after 3 seconds
    setTimeout(() => {
        dot.style.left = originalX
        dot.style.top = originalY
    }, 3000)
}