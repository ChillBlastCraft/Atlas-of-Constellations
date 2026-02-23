const constellations = [
    {
        id: "wynncraft",
        name: "Wynncraft",
        position: { x: 24.2, y: 29.8 },
        nodes: [
            { x: 20, y: 27, url: "#" },
            { x: 23, y: 24, url: "#" },
            { x: 27, y: 28, url: "constellations/wynncraft/wynnbuilder/WynnLab.html", label: "WynnLab", title: "WynnLab" },
            { x: 25, y: 33, url: "#" },
            { x: 19, y: 34, url: "#" },
            { x: 30, y: 32, url: "#" }
        ],
        links: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]]
    },
    {
        id: "path-of-exile",
        name: "Path of Exile",
        position: { x: 68, y: 28 },
        nodes: [
            { x: 66.2, y: 31.0, url: "#" },
            { x: 69.2, y: 32.5, url: "#" },
            { x: 72.8, y: 31.4, url: "#" },
            { x: 74.1, y: 27.8, url: "#" },
            { x: 70.8, y: 26.1, url: "#" }
        ],
        links: [[0, 1], [1, 2], [2, 3], [1, 4]]
    },
    {
        id: "prismatic-lattice",
        name: "Prismatic Lattice",
        position: { x: 48, y: 74 },
        nodes: [
            { x: 45.5, y: 70.8, url: "#" },
            { x: 49.1, y: 68.4, url: "#" },
            { x: 53.2, y: 72.1, url: "#" },
            { x: 51.0, y: 76.4, url: "#" }
        ],
        links: [[0, 1], [1, 2], [2, 3]]
    }
]