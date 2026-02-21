function renderUniverse() {
    const universe = document.getElementById("universe")

    constellations.forEach(constellation => {
        const dot = document.createElement("div")

        dot.classList.add("constellation")
        dot.style.left = constellation.position.x + "%"
        dot.style.top = constellation.position.y + "%"
        dot.dataset.id = constellation.id
        dot.constellation = constellation

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

    // 50%, 50% (center of universe)
    const cx = 50, cy = 50
    // x = current constellation position
    const x = constellation.position.x, y = constellation.position.y

    // dx = center - current_location
    const dx = cx - x, dy = cy - y
    // dist = calculate distance from current constellation to center
    const dist = Math.sqrt(dx * dx + dy * dy)

    // move clicked constellation to center
    dot.style.left = cx + "%"
    dot.style.top = cy + "%"
    // increase size of current constellation
    dot.style.transform = 'scale(2)'

    // for all non-clicked constellations, move away
    const allDots = document.querySelectorAll('.constellation')
    allDots.forEach(otherDot => {
        if (otherDot === dot) { return }        
        const otherConst = otherDot.constellation

        // ox = other_constellation_position
        const ox = otherConst.position.x, oy = otherConst.position.y
        // vx = center - other_constellation_position
        const vx = ox - x, vy = oy - y
        // vlen = length of vector from clicked constellation to other constellation
        const vlen = Math.sqrt(vx * vx + vy * vy)
        if (vlen > 0) {
            // nx = vector normalized
            const nx = vx / vlen, ny = vy / vlen
            // new position
            const newX = ox + nx * dist
            const newY = oy + ny * dist
            // move other constellation away from center, but keep within bounds
            otherDot.style.left = Math.max(0, Math.min(100, newX)) + "%"
            otherDot.style.top = Math.max(0, Math.min(100, newY)) + "%"
        }
        // decrease size of other constellations
        otherDot.style.transform = 'scale(0.5)'
    })

    // resets after 3 seconds
    setTimeout(() => {
        allDots.forEach(d => {
            // move all constellations back to original position
            d.style.left = d.constellation.position.x + "%"
            d.style.top = d.constellation.position.y + "%"
            d.style.transform = '' // reset size
        })
    }, 3000)
}