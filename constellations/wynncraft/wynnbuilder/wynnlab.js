(function () {
	const mainContent = document.getElementById('main-content')
	const builderContent = document.getElementById('builder-content')
	const calcContent = document.getElementById('calc-content')
	const atlasContent = document.getElementById('atlas-content')
	const crafterContent = document.getElementById('crafter-content')

	const navButtons = [
		{ id: 'btn-builder', content: builderContent },
		{ id: 'btn-calc', content: calcContent },
		{ id: 'btn-atlas', content: atlasContent },
		{ id: 'btn-crafter', content: crafterContent }
	]

	navButtons.forEach(btn => {
		document.getElementById(btn.id).addEventListener('click', function () {
			navButtons.forEach(b => {
				document.getElementById(b.id).classList.remove('active')
				b.content.classList.add('hidden')
			})
			this.classList.add('active')
			btn.content.classList.remove('hidden')
		})
	})

	const statGroupDropdown = document.querySelector('.atlas-stat-group-dropdown')
	const statFiltersList = document.querySelector('.atlas-stat-filters-list')

	function createStatGroup(value) {
		const groupDiv = document.createElement('div')
		groupDiv.className = 'atlas-stat-group'

		const title = document.createElement('span')
		title.className = 'atlas-stat-group-title'
		title.textContent = value
		groupDiv.appendChild(title)

		const dropdown = document.createElement('select')
		dropdown.className = 'atlas-dropdown'
		['placeholder 1', 'placeholder 2', 'placeholder 3'].forEach(opt => {
			const option = document.createElement('option')
			option.value = opt
			option.textContent = opt
			dropdown.appendChild(option)
		})
		groupDiv.appendChild(dropdown)

		const removeBtn = document.createElement('button')
		removeBtn.className = 'atlas-stat-group-remove'
		removeBtn.textContent = 'Remove'
		removeBtn.title = 'Remove filter'
		removeBtn.addEventListener('click', function () {
			groupDiv.remove()
		})
		groupDiv.appendChild(removeBtn)

		statFiltersList.appendChild(groupDiv)
	}

	if (statGroupDropdown && statFiltersList) {
		statGroupDropdown.addEventListener('change', function () {
			const value = this.value
			if (!value) return
			createStatGroup(value)
			this.selectedIndex = 0
		})
	}
})()


