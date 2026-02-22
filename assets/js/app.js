document.addEventListener("DOMContentLoaded", () => {
    AstralBackground.init('astral-background')
    renderUniverse()

    const backButton = document.getElementById('back-button')
    backButton.addEventListener('click', resetUniverse)
})
