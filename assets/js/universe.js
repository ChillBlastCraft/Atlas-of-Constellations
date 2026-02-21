function renderUniverse() {
    const universe = document.getElementById("universe")

    constellations.forEach(constellation => {
        const dot = document.createElement("div")

        dot.classList.add("constellation")
        dot.style.left = constellation.position.x + "%"
        dot.style.top = constellation.position.y + "%"
        dot.dataset.id = constellation.id

        dot.addEventListener("mouseover", () => onConstellationHover(dot))
        dot.addEventListener("click", () => onConstellationClick(constellation))

        universe.appendChild(dot)
    })
}

function onConstellationHover(dot) { 
    dot.classList.add("hovered")
}

function onConstellationClick(constellation) {
    console.log("Clicked on constellation:", constellation.name)
}