// ...existing code...

const streetInput = document.getElementById('street-filter');
const streetSuggestions = document.getElementById('street-suggestions');
const selectedStreets = document.getElementById('selected-streets');
const selectedStreetsInput = document.getElementById('selected-streets-input');

let streetOptions = []; // Fill this with your street suggestions
let selectedStreetList = [];

streetInput.addEventListener('input', function() {
  const value = streetInput.value.toLowerCase();
  // Filter suggestions
  const filtered = streetOptions.filter(street =>
    street.toLowerCase().includes(value) && !selectedStreetList.includes(street)
  );
  // Render suggestions
  streetSuggestions.innerHTML = filtered.map(street =>
    `<div class="suggestion-item" data-value="${street}">${street}</div>`
  ).join('');
  streetSuggestions.style.display = filtered.length ? 'block' : 'none';
});

// Click on suggestion to add
streetSuggestions.addEventListener('click', function(e) {
  if (e.target.classList.contains('suggestion-item')) {
    const street = e.target.getAttribute('data-value');
    if (!selectedStreetList.includes(street)) {
      selectedStreetList.push(street);
      renderSelectedStreets();
      streetInput.value = '';
      streetSuggestions.innerHTML = '';
      streetSuggestions.style.display = 'none';
    }
  }
});

function renderSelectedStreets() {
  selectedStreets.innerHTML = selectedStreetList.map(street =>
    `<span class="selected-chip">${street}<span class="remove-chip" data-value="${street}">&times;</span></span>`
  ).join('');
  selectedStreetsInput.value = selectedStreetList.join(',');
}

// Remove chip
selectedStreets.addEventListener('click', function(e) {
  if (e.target.classList.contains('remove-chip')) {
    const street = e.target.getAttribute('data-value');
    selectedStreetList = selectedStreetList.filter(s => s !== street);
    renderSelectedStreets();
  }
});

// ...existing code...