document.addEventListener("DOMContentLoaded", () => {
    renderUniverse()

    const backButton = document.getElementById('back-button')
    backButton.addEventListener('click', resetUniverse)
})
