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


// Stat filter logic
const statGroupDropdown = document.querySelector('.atlas-stat-group-dropdown');
const statFiltersList = document.querySelector('.atlas-stat-filters-list');

if (statGroupDropdown && statFiltersList) {
	statGroupDropdown.addEventListener('change', function() {
		const value = this.value;
		if (!value) return;

		// Create stat group div
		const groupDiv = document.createElement('div');
		groupDiv.className = 'atlas-stat-group';

		// Title
		const title = document.createElement('span');
		title.className = 'atlas-stat-group-title';
		title.textContent = value;
		groupDiv.appendChild(title);

		// Dropdown
		const dropdown = document.createElement('select');
		dropdown.className = 'atlas-dropdown';
		['placeholder 1', 'placeholder 2', 'placeholder 3'].forEach(opt => {
			const option = document.createElement('option');
			option.value = opt;
			option.textContent = opt;
			dropdown.appendChild(option);
		});
		groupDiv.appendChild(dropdown);

		// Remove button
		const removeBtn = document.createElement('button');
		removeBtn.className = 'atlas-stat-group-remove';
		removeBtn.textContent = 'Remove';
		removeBtn.title = 'Remove filter';
		removeBtn.addEventListener('click', function() {
			groupDiv.remove();
		});
		groupDiv.appendChild(removeBtn);

		statFiltersList.appendChild(groupDiv);

		// Reset dropdown to default
		this.selectedIndex = 0;
	});
}

