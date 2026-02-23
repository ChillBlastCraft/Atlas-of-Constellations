import { wapi } from "../wapi/wapi.js";

const sectionLinks = Array.from(document.querySelectorAll(".section-link"));
const sectionPanels = Array.from(document.querySelectorAll(".section-panel"));
const apiHealthCheckButton = document.getElementById("api-health-check");
const defaultSection = "wynnbuilder";
const availableSections = new Set(["wynnbuilder", "wynncrafting", "wynnatlas"]);

function getSectionFromHash() {
    const hashValue = window.location.hash.replace(/^#/, "").trim().toLowerCase();
    return availableSections.has(hashValue) ? hashValue : defaultSection;
}

function showSection(sectionName) {
    sectionPanels.forEach((panel) => {
        panel.hidden = panel.dataset.section !== sectionName;
    });
    sectionLinks.forEach((link) => {
        const isActive = link.dataset.sectionTarget === sectionName;
        link.classList.toggle("active", isActive);
        link.setAttribute("aria-current", isActive ? "page" : "false");
    });
}

function applySectionFromHash() {
    const section = getSectionFromHash();
    showSection(section);
    if (window.location.hash !== `#${section}`) {
        window.history.replaceState(null, "", `#${section}`);
    }
}

window.addEventListener("hashchange", applySectionFromHash);
sectionLinks.forEach(link => {
    link.addEventListener("click", (e) => {
        const target = link.dataset.sectionTarget;
        if (target) {
            showSection(target);
            window.location.hash = `#${target}`;
        }
    });
});

// Delegate API-related UI behavior to the API module (no API logic here)
if (apiHealthCheckButton) {
    wapi.attachHealthCheckButton(apiHealthCheckButton);
}

applySectionFromHash();
