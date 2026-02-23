const mainContent = document.getElementById('main-content')
const builderContent = document.getElementById('builder-content')
const atlasContent = document.getElementById('atlas-content')
const crafterContent = document.getElementById('crafter-content')
const buttons = [
	{ id: 'btn-builder', content: builderContent },
	{ id: 'btn-atlas', content: atlasContent },
	{ id: 'btn-crafter', content: crafterContent }
]
buttons.forEach(btn => {
	document.getElementById(btn.id).addEventListener('click', function() {
		buttons.forEach(b => {
			document.getElementById(b.id).classList.remove('active')
			b.content.classList.add('hidden')
		})
		this.classList.add('active')
		btn.content.classList.remove('hidden')
	})
})

// atlas type/stat filter logic removed for reset

