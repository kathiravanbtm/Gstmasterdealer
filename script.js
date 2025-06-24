// Utility: Sanitize numeric string to preserve account number formatting
function sanitizeAccountNumber(input) {
  if (!input) return '';
  const num = typeof input === 'number' ? input.toLocaleString('fullwide', { useGrouping: false }) : input;
  return String(num).trim();
}

// Example function to process a row of data
function processBankData(row) {
  return {
    bankName: row['BANK NAME'] || '-',
    bankAddress: row['Bank Address'] || '-',
    accountNumber: sanitizeAccountNumber(row['ACCOUNT NUMBER']),
    accountName: row['Account Name'] || '-',
    accountantPhone: row['Accountant Phone'] || '-',
    accountantEmail: row['Accountant Email'] || '-'
  };
}

// Optional: format data for export
function formatExportData(data) {
  return data.map(row => {
    const bank = processBankData(row);
    return {
      ...row,
      "Bank Name": bank.bankName,
      "Bank Branch": bank.branch,
      "Bank Address": bank.bankAddress,
      "Bank E-mail": bank.email,
      "Account Number": bank.accountNumber,
      "Account Name": bank.accountName,
      "Accountant Phone": bank.accountantPhone,
      "Accountant Email": bank.accountantEmail
    };
  });
}

// Main Application Code
let originalData = [];
let parsedData = [];
let filteredData = [];
let currentView = 'card';

// DOM Elements
const streetFilter = document.getElementById('street-filter');
const roadFilter = document.getElementById('road-filter');
const jurisdictionFilter = document.getElementById('jurisdiction-filter');
const villageFilter = document.getElementById('village-filter');

const fileUpload = document.getElementById('file-upload');
const fileButton = document.getElementById('file-button');
const uploadArea = document.getElementById('upload-area');
const loadingIndicator = document.getElementById('loading-indicator');
const filterSection = document.getElementById('filter-section');
const dataSection = document.getElementById('data-section');
const cardContainer = document.getElementById('card-container');
const excelContainer = document.getElementById('excel-container');
const excelBody = document.getElementById('excel-body');
const recordCount = document.getElementById('record-count');
const toggleViewButton = document.getElementById('toggle-view');
const downloadExcelButton = document.getElementById('download-excel');
const applyFilterButton = document.getElementById('apply-filter');
const clearFilterButton = document.getElementById('clear-filter');
const pincodeFilter = document.getElementById('pincode-filter');
const locationFilter = document.getElementById('location-filter');
const gstinFilter = document.getElementById('gstin-filter');

// Navigation Elements
const mainExtractor = document.getElementById('main-extractor');
const districtFilter = document.getElementById('district-filter');
const GSTINProfile = document.getElementById('GSTIN Profile');
const navLinks = document.querySelectorAll('nav a');

// District Filter Elements
const districtRadios = document.getElementsByName('district');
const selectedDistrictSpan = document.getElementById('selected-district');
const districtResultContainer = document.getElementById('district-data-list');
const submitDistrictBtn = document.getElementById('submit-district');

// Event Listeners
fileButton.addEventListener('click', () => fileUpload.click());
fileUpload.addEventListener('change', handleFileUpload);
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragenter', handleDragEnter);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleDrop);
toggleViewButton.addEventListener('click', toggleView);
downloadExcelButton.addEventListener('click', handleDownload);
applyFilterButton.addEventListener('click', applyFilters);
clearFilterButton.addEventListener('click', clearFilters);

// Navigation Event Listeners
navLinks.forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const target = this.getAttribute('href').substring(1);
    
    // Hide all views
    mainExtractor.classList.add('hidden');
    districtFilter.classList.add('hidden');
    GSTINProfile.classList.add('hidden');
    
    // Show selected view
    if (target === 'district-filter') {
      districtFilter.classList.remove('hidden');
      renderDistrictData('Tiruvannamalai');
    } else if (target === 'GSTIN Profile') {
      GSTINProfile.classList.remove('hidden');
    } else {
      mainExtractor.classList.remove('hidden');
    }
    
    // Update active nav link
    navLinks.forEach(navLink => navLink.classList.remove('active'));
    this.classList.add('active');
  });
});

// District Filter Event Listeners
districtRadios.forEach(radio => {
  radio.addEventListener('change', function() {
    selectedDistrictSpan.textContent = this.value;
  });
});

submitDistrictBtn.addEventListener('click', function() {
  let selectedDistrict = 'Tiruvannamalai';
  for (const radio of districtRadios) {
    if (radio.checked) {
      selectedDistrict = radio.value;
      break;
    }
  }
  renderDistrictData(selectedDistrict);
});

// Drag and Drop Handlers
function handleDragOver(e) { e.preventDefault(); uploadArea.classList.add('drag-over'); }
function handleDragEnter(e) { e.preventDefault(); uploadArea.classList.add('drag-over'); }
function handleDragLeave(e) { e.preventDefault(); uploadArea.classList.remove('drag-over'); }

function handleDrop(e) {
  e.preventDefault();
  uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (validateExcelFile(file)) {
    fileUpload.files = e.dataTransfer.files;
    processExcelFile(file);
  }
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (validateExcelFile(file)) {
    processExcelFile(file);
  } else {
    showToast('Please upload a valid Excel file (.xlsx or .xls)', 'error');
  }
}

function validateExcelFile(file) {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  return validTypes.includes(file.type);
}

async function processExcelFile(file) {
  try {
    loadingIndicator.classList.remove('hidden');
    const data = await readExcelFile(file);
    
    if (data.length > 0 && !data[0]['Address of Principal Place of Business'] && data[0]['Street']) {
      showToast('Note: Importing previously exported data. Some original fields may not be available.', 'warning');
    }
    
    originalData = data;
    parsedData = processData(data);
    filteredData = [...parsedData];
    renderData();
    filterSection.classList.remove('hidden');
    dataSection.classList.remove('hidden');
    showToast(`Successfully processed ${parsedData.length} records`, 'success');
    
    localStorage.setItem('parsedGSTData', JSON.stringify(parsedData));
  } catch (error) {
    console.error('Error:', error);
    showToast('Failed to process the Excel file', 'error');
  } finally {
    loadingIndicator.classList.add('hidden');
  }
}

function readExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(sheet));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = err => reject(err);
    reader.readAsBinaryString(file);
  });
}

function extractPincodeFromAddress(address) {
  const match = address.match(/\b6\d{5}\b/);
  return match ? match[0] : '-';
}

function getVisitedStatus(gstin) {
  if (!gstin) return false;
  const stored = localStorage.getItem(`visited_${gstin}`);
  return stored === 'true';
}

function processData(data) {
  return data.map(row => {
    // Check if we already have parsed address components
    if (row['Street'] && row['Road'] && row['Nagar'] && row['Village']) {
      return {
        tradeName: row['Trade Name/ Legal Name'] || row['Trade Name'] || '-',
        gstin: row['GSTIN'] || '-',
        email: row['Email Id'] || '-',
        mobile: row['Mobile No.'] || '-',
        assignedTo: row['Assigned To'] || '-',
        effectiveDate: row['Effective Date of Registration'] || row['Effective Date'] || '-',
        typeOfTaxpayer: row['Type of Taxpayer'] || '-',
        constitution: row['Constitution of Business'] || row['Constitution'] || '-',
        isMigrated: row['IS_MIGRATED'] || row['IS Migrated'] || '-',
        lowestJurisdiction: row['Lowest Jurisdiction'] || '-',
        hsnCode: row['HSN Code'] || '-',
        doorNo: row['Door No'] || '-',
        street: row['Street'] || '-',
        road: row['Road'] || '-',
        nagar: row['Nagar'] || '-',
        village: row['Village'] || '-',
        taluk: row['Taluk'] || '-',
        district: row['District'] || '-',
        pincode: row['Pincode'] || extractPincodeFromAddress(row['Address of Principal Place of Business'] || '-'),
        circle: row['Circle'] || '-',
        rawAddress: row['Address of Principal Place of Business'] || (
          [row['Door No'], row['Street'], row['Road'], row['Nagar'], row['Village'], 
           row['Taluk'], row['District'], row['Pincode']]
            .filter(part => part && part !== '-').join(', ')
        ),
        bankName: row['BANK NAME'] || '-',
        accountNumber: row['ACCOUNT NUMBER'] || '-',
        visited: row['Visited'] === 'Visited'
      };
    }
    
    // Original parsing logic for raw data
    const address = row['Address of Principal Place of Business'] || '-';
    const pincode = extractPincodeFromAddress(address);
    const gstin = row['GSTIN'] || '-';
    
    // Extract address components
    const addressParts = address.split(',');
    const doorNo = addressParts[0]?.trim() || '-';
    let street = '-';
    let road = '-';
    let nagar = '-';
    let village = '-';
    let taluk = '-';
    let district = '-';
    let circle = '-';
    
    // Simple parsing logic - you may need to adjust based on your address format
    addressParts.forEach(part => {
      const trimmed = part.trim().toLowerCase();
      if (trimmed.includes('street')) street = part.trim();
      else if (trimmed.includes('road')) road = part.trim();
      else if (trimmed.includes('nagar')) nagar = part.trim();
      else if (trimmed.includes('village')) village = part.trim();
      else if (trimmed.includes('taluk')) taluk = part.trim();
      else if (trimmed.includes('district')) district = part.trim();
      else if (trimmed.includes('circle')) circle = part.trim();
    });

    return {
      tradeName: row['Trade Name/ Legal Name'] || '-',
      gstin: gstin,
      email: row['Email Id'] || '-',
      mobile: row['Mobile No.'] || '-',
      assignedTo: row['Assigned To'] || '-',
      effectiveDate: row['Effective Date of Registration'] || '-',
      typeOfTaxpayer: row['Type of Taxpayer'] || '-',
      constitution: row['Constitution of Business'] || '-',
      isMigrated: row['IS_MIGRATED'] || '-',
      lowestJurisdiction: row['Lowest Jurisdiction'] || '-',
      hsnCode: row['HSN Code'] || '-',
      doorNo: doorNo,
      street: street,
      road: road,
      nagar: nagar,
      village: village,
      taluk: taluk,
      district: district,
      pincode: pincode,
      circle: circle,
      rawAddress: address,
      bankName: row['BANK NAME'] || '-',
      accountNumber: row['ACCOUNT NUMBER'] || '-',
      visited: getVisitedStatus(gstin)
    };
  });
}

function renderCardView() {
  cardContainer.innerHTML = '';
  filteredData.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'business-card';
    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">${item.tradeName}</div>
        <div class="visited-container">
          <span class="visited-label">Visited</span>
          <input type="checkbox" class="checkbox" data-index="${index}" ${item.visited ? 'checked' : ''}>
        </div>
      </div>
      <div class="card-content">
        <div class="data-grid">
          <div class="field-label">GSTIN</div><div>${item.gstin}</div>
          <div class="field-label">Email Id</div><div>${item.email}</div>
          <div class="field-label">Mobile No.</div><div>${item.mobile}</div>
          <div class="field-label">Assigned To</div><div>${item.assignedTo}</div>
          <div class="field-label">Effective Date</div><div>${item.effectiveDate}</div>
          <div class="field-label">Type of Taxpayer</div><div>${item.typeOfTaxpayer}</div>
          <div class="field-label">Constitution</div><div>${item.constitution}</div>
          <div class="field-label">IS Migrated</div><div>${item.isMigrated}</div>
          <div class="field-label">Lowest Jurisdiction</div><div>${item.lowestJurisdiction}</div>
          <div class="field-label">HSN Code</div><div>${item.hsnCode}</div>
          <div class="field-label">Door No</div><div>${item.doorNo}</div>
          <div class="field-label">Street</div><div>${item.street}</div>
          <div class="field-label">Road</div><div>${item.road}</div>
          <div class="field-label">Nagar</div><div>${item.nagar}</div>
          <div class="field-label">Village</div><div>${item.village}</div>
          <div class="field-label">Taluk</div><div>${item.taluk}</div>
          <div class="field-label">District</div><div>${item.district}</div>
          <div class="field-label">Pincode</div><div>${item.pincode}</div>
          <div class="field-label">Circle</div><div>${item.circle}</div>
        </div>
        <div class="raw-address">
          <div class="raw-address-label">Raw Address</div>
          <p class="raw-address-value">${item.rawAddress}</p>
        </div>
      </div>`;
    card.querySelector('.checkbox').addEventListener('change', e => toggleVisited(index, e.target.checked));
    if (item.visited) card.classList.add('visited-row');
    cardContainer.appendChild(card);
  });
}

function renderExcelView() {
  excelBody.innerHTML = '';
  filteredData.forEach((item, index) => {
    const row = document.createElement('tr');
    if (item.visited) row.classList.add('visited-row');
    row.innerHTML = `
      <td><input type="checkbox" class="checkbox" data-index="${index}" ${item.visited ? 'checked' : ''}></td>
      <td>${item.gstin}</td>
      <td>${item.tradeName}</td>
      <td>${item.email}</td>
      <td>${item.mobile}</td>
      <td>${item.assignedTo}</td>
      <td>${item.effectiveDate}</td>
      <td>${item.typeOfTaxpayer}</td>
      <td>${item.constitution}</td>
      <td>${item.isMigrated}</td>
      <td>${item.lowestJurisdiction}</td>
      <td>${item.hsnCode}</td>
      <td>${item.doorNo}</td>
      <td>${item.street}</td>
      <td>${item.road}</td>
      <td>${item.nagar}</td>
      <td>${item.village}</td>
      <td>${item.taluk}</td>
      <td>${item.district}</td>
      <td>${item.pincode}</td>
      <td>${item.circle}</td>`;
    row.querySelector('.checkbox').addEventListener('change', e => toggleVisited(index, e.target.checked));
    excelBody.appendChild(row);
  });
}

function renderData() {
  recordCount.textContent = filteredData.length;
  if (currentView === 'card') {
    renderCardView();
    cardContainer.classList.remove('hidden');
    excelContainer.classList.add('hidden');
    toggleViewButton.textContent = 'Switch to Excel View';
  } else {
    renderExcelView();
    cardContainer.classList.add('hidden');
    excelContainer.classList.remove('hidden');
    toggleViewButton.textContent = 'Switch to Card View';
  }
}

function toggleView() {
  currentView = currentView === 'card' ? 'excel' : 'card';
  renderData();
}

function toggleVisited(index, visited) {
  filteredData[index].visited = visited;

  const gstin = filteredData[index].gstin;
  if (gstin && gstin !== '-') {
    localStorage.setItem(`visited_${gstin}`, visited);
  }

  const originalIndex = parsedData.findIndex(item => item.gstin === gstin);
  if (originalIndex !== -1) {
    parsedData[originalIndex].visited = visited;
  }

  renderData();
}

function applyFilters(e) {
  e.preventDefault();

  const pincode = pincodeFilter.value.trim();
  const street = streetFilter.value.trim().toLowerCase();
  const road = roadFilter.value.trim().toLowerCase();
  const jurisdiction = jurisdictionFilter.value.trim().toLowerCase();
  const village = villageFilter.value.trim().toLowerCase();

  filteredData = parsedData.filter(item => {
    const matchPincode = !pincode || item.pincode.includes(pincode);
    const matchStreet = !street || item.street.toLowerCase().includes(street);
    const matchRoad = !road || item.road.toLowerCase().includes(road);
    const matchJurisdiction = !jurisdiction || item.lowestJurisdiction.toLowerCase().includes(jurisdiction);
    const matchVillage = !village || item.village.toLowerCase().includes(village);
    return matchPincode && matchStreet && matchRoad && matchJurisdiction && matchVillage;
  });

  renderData();
  showToast(`Showing ${filteredData.length} of ${parsedData.length} records`, 'success');
}

function clearFilters() {
  pincodeFilter.value = '';
  streetFilter.value = '';
  roadFilter.value = '';
  jurisdictionFilter.value = '';
  villageFilter.value = '';

  filteredData = [...parsedData];
  renderData();
  showToast('Filters cleared', 'success');
}

function handleDownload() {
  try {
    const exportData = filteredData.map(item => ({
      "GSTIN": item.gstin,
      "Trade Name/ Legal Name": item.tradeName,
      "Email Id": item.email,
      "Mobile No.": item.mobile,
      "Assigned To": item.assignedTo,
      "Effective Date of Registration": item.effectiveDate,
      "Type of Taxpayer": item.typeOfTaxpayer,
      "Constitution of Business": item.constitution,
      "IS_MIGRATED": item.isMigrated,
      "Lowest Jurisdiction": item.lowestJurisdiction,
      "HSN Code": item.hsnCode,
      "Address of Principal Place of Business": item.rawAddress,
      "No. of Additional Place of Business": "-",
      "Circle": item.circle,
      "Survey Number": "-",
      "Door No": item.doorNo,
      "Booth Number": "-",
      "Floor": "-",
      "Street": item.street,
      "Road": item.road,
      "Nagar": item.nagar,
      "Village": item.village,
      "Taluk": item.taluk,
      "District": item.district,
      "Pincode": item.pincode,
      "Landmark": "-",
      "BANK NAME": item.bankName,
      "ACCOUNT NUMBER": item.accountNumber,
      "Visited": item.visited ? "Visited" : "Not Visited"
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Structured Data");
    XLSX.writeFile(wb, "gst_data_export.xlsx");
    showToast(`Exported ${exportData.length} records to Excel`, 'success');
  } catch (error) {
    console.error('Export error:', error);
    showToast('Failed to download Excel file', 'error');
  }
}

function renderDistrictData(district) {
  if (!parsedData.length) {
    districtResultContainer.innerHTML =
      '<p>No data loaded. Please upload Excel data first in Main Extractor.</p>';
    return;
  }

  let filtered = [];

  if (district === 'All') {
    filtered = parsedData;
  } else if (district === 'Tiruvannamalai') {
    filtered = parsedData.filter((item) =>
      item.rawAddress && item.rawAddress.toLowerCase().includes('tiruvannamalai')
    );
  } else if (district === 'Others') {
    filtered = parsedData.filter(
      (item) =>
        !(item.rawAddress && item.rawAddress.toLowerCase().includes('tiruvannamalai'))
    );
  }

  if (!filtered.length) {
    districtResultContainer.innerHTML = `<p>No records found for "${district}" district.</p>`;
    return;
  }

  let html =
    '<table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse: collapse;">' +
    '<thead><tr><th>GSTIN</th><th>Trade Name</th><th>Raw Address</th></tr></thead><tbody>';
  filtered.forEach((item) => {
    html += `<tr>
      <td>${item.GSTIN || item.gstin || '-'}</td>
      <td>${item.tradeName || '-'}</td>
      <td>${item.rawAddress || '-'}</td>
    </tr>`;
  });
  html += '</tbody></table>';

  districtResultContainer.innerHTML = html;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Initialize district data from localStorage if available
document.addEventListener('DOMContentLoaded', function() {
  const dataString = localStorage.getItem('parsedGSTData');
  if (dataString) {
    try {
      parsedData = JSON.parse(dataString);
    } catch (e) {
      console.error('Failed to parse stored data:', e);
    }
  }
});

function submitSearch() {
  const input = document.getElementById("searchInput").value.trim().toLowerCase();
  const resultContainer = document.getElementById("search-results");

  if (!input) {
    showToast("Please enter a GSTIN", "error");
    return;
  }

  if (!parsedData.length) {
    resultContainer.innerHTML = "<p>No data loaded. Please upload Excel data in Main Extractor first.</p>";
    return;
  }

  const match = parsedData.find(item => item.gstin?.toLowerCase() === input);

  if (!match) {
    resultContainer.innerHTML = `<p>No record found for GSTIN: <strong>${input}</strong></p>`;
    return;
  }

  resultContainer.innerHTML = `
    <div class="card">
      <h3>${match.tradeName || '-'}</h3>
      <div class="data-grid">
        <div><strong>GSTIN:</strong> ${match.gstin || '-'}</div>
        <div><strong>Email Id:</strong> ${match.email || '-'}</div>
        <div><strong>Mobile No:</strong> ${match.mobile || '-'}</div>
        <div><strong>Assigned To:</strong> ${match.assignedTo || '-'}</div>
        <div><strong>Effective Date:</strong> ${match.effectiveDate || '-'}</div>
        <div><strong>Type of Taxpayer:</strong> ${match.typeOfTaxpayer || '-'}</div>
        <div><strong>Constitution:</strong> ${match.constitution || '-'}</div>
        <div><strong>IS Migrated:</strong> ${match.isMigrated || '-'}</div>
        <div><strong>Lowest Jurisdiction:</strong> ${match.lowestJurisdiction || '-'}</div>
        <div><strong>HSN Code:</strong> ${match.hsnCode || '-'}</div>
        <div><strong>Door No:</strong> ${match.doorNo || '-'}</div>
        <div><strong>Street:</strong> ${match.street || '-'}</div>
        <div><strong>Road:</strong> ${match.road || '-'}</div>
        <div><strong>Nagar:</strong> ${match.nagar || '-'}</div>
        <div><strong>Village:</strong> ${match.village || '-'}</div>
        <div><strong>Taluk:</strong> ${match.taluk || '-'}</div>
        <div><strong>District:</strong> ${match.district || '-'}</div>
        <div><strong>Pincode:</strong> ${match.pincode || '-'}</div>
        <div><strong>Circle:</strong> ${match.circle || '-'}</div>
        <div><strong>Raw Address:</strong><br /> ${match.rawAddress || '-'}</div>
      </div>
    </div>
  `;
}

// Autocomplete functionality
const streetInput = document.getElementById("street-filter");
const streetSuggestionBox = document.getElementById("street-suggestions");

streetInput.addEventListener("input", () => {
  const query = streetInput.value.toLowerCase();
  if (!query || !parsedData.length) {
    streetSuggestionBox.innerHTML = "";
    return;
  }

  const uniqueStreets = [...new Set(parsedData.map(d => d.street).filter(s => s && s.toLowerCase().startsWith(query)))];

  if (!uniqueStreets.length) {
    streetSuggestionBox.innerHTML = "";
    return;
  }

  streetSuggestionBox.innerHTML = uniqueStreets
    .slice(0, 10)
    .map(street => `<div class="suggestion-item">${street}</div>`)
    .join("");

  // document.querySelectorAll(".suggestion-item").forEach(item => {
  //   item.addEventListener("click", () => {
  //     streetInput.value = item.textContent;
  //     streetSuggestionBox.innerHTML = "";
  //   });
  // });
});

// VILLAGE AUTOCOMPLETE
const villageInput = document.getElementById("village-filter");
const villageSuggestionBox = document.getElementById("village-suggestions");

villageInput.addEventListener("input", () => {
  const query = villageInput.value.toLowerCase();
  if (!query || !parsedData.length) {
    villageSuggestionBox.innerHTML = "";
    return;
  }

  const villageAndNagar = parsedData.map(d => [d.village, d.nagar]).flat();
  const uniqueSuggestions = [...new Set(villageAndNagar.filter(name => name && name.toLowerCase().startsWith(query)))];

  if (!uniqueSuggestions.length) {
    villageSuggestionBox.innerHTML = "";
    return;
  }

  villageSuggestionBox.innerHTML = uniqueSuggestions
    .slice(0, 10)
    .map(item => `<div class="suggestion-item">${item}</div>`)
    .join("");

  document.querySelectorAll("#village-suggestions .suggestion-item").forEach(item => {
    item.addEventListener("click", () => {
      villageInput.value = item.textContent;
      villageSuggestionBox.innerHTML = "";
    });
  });
});

// ROAD AUTOCOMPLETE
const roadInput = document.getElementById("road-filter");
const roadSuggestionBox = document.getElementById("road-suggestions");

roadInput.addEventListener("input", () => {
  const query = roadInput.value.toLowerCase();
  if (!query || !parsedData.length) {
    roadSuggestionBox.innerHTML = "";
    return;
  }

  const uniqueRoads = [...new Set(parsedData.map(d => d.road).filter(r => r && r.toLowerCase().startsWith(query)))];

  if (!uniqueRoads.length) {
    roadSuggestionBox.innerHTML = "";
    return;
  }

  roadSuggestionBox.innerHTML = uniqueRoads
    .slice(0, 10)
    .map(road => `<div class="suggestion-item">${road}</div>`)
    .join("");

  document.querySelectorAll("#road-suggestions .suggestion-item").forEach(item => {
    item.addEventListener("click", () => {
      roadInput.value = item.textContent;
      roadSuggestionBox.innerHTML = "";
    });
  });
});


// ...existing code...

// --- MULTI-SELECT STREET FILTER ---
const selectedStreetsContainer = document.getElementById("selected-streets");
const selectedStreetsInput = document.getElementById("selected-streets-input");
let selectedStreets = [];

// Update chips and hidden input
function renderSelectedStreets() {
  selectedStreetsContainer.innerHTML = selectedStreets
    .map(
      street =>
        `<span class="selected-chip">${street}<span class="remove-chip" data-value="${street}">&times;</span></span>`
    )
    .join("");
  selectedStreetsInput.value = selectedStreets.join(",");
}

// Add street from suggestion
streetSuggestionBox.addEventListener("mousedown", (e) => {
  if (e.target.classList.contains("suggestion-item")) {
    const street = e.target.textContent;
    if (!selectedStreets.includes(street)) {
      selectedStreets.push(street);
      renderSelectedStreets();
    }
    streetInput.focus();
    streetInput.dispatchEvent(new Event('input'));
    // Do NOT close the suggestion box or clear the input here!
  }
});


// Remove chip
selectedStreetsContainer.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-chip")) {
    const street = e.target.getAttribute("data-value");
    selectedStreets = selectedStreets.filter(s => s !== street);
    renderSelectedStreets();
  }
});

// Modify street autocomplete to not overwrite chips
streetInput.addEventListener("input", () => {
  const query = streetInput.value.toLowerCase();
  if (!query || !parsedData.length) {
    streetSuggestionBox.innerHTML = "";
    return;
  }
  const uniqueStreets = [...new Set(parsedData.map(d => d.street).filter(s =>
    s && s.toLowerCase().startsWith(query) && !selectedStreets.includes(s)
  ))];
  if (!uniqueStreets.length) {
    streetSuggestionBox.innerHTML = "";
    return;
  }
  streetSuggestionBox.innerHTML = uniqueStreets
    .slice(0, 10)
    .map(street => `<div class="suggestion-item">${street}</div>`)
    .join("");
});

// Clear chips on filter clear
function clearFilters() {
  pincodeFilter.value = '';
  streetInput.value = '';
  selectedStreets = [];
  renderSelectedStreets();
  roadFilter.value = '';
  jurisdictionFilter.value = '';
  villageFilter.value = '';
  filteredData = [...parsedData];
  renderData();
  showToast('Filters cleared', 'success');
}

// Update filter logic to use selectedStreets
function applyFilters(e) {
  e.preventDefault();
  const pincode = pincodeFilter.value.trim();
  const road = roadFilter.value.trim().toLowerCase();
  const jurisdiction = jurisdictionFilter.value.trim().toLowerCase();
  const village = villageFilter.value.trim().toLowerCase();

  filteredData = parsedData.filter(item => {
    const matchPincode = !pincode || item.pincode.includes(pincode);
    const matchStreet =
      !selectedStreets.length ||
      selectedStreets.some(street => item.street && item.street.toLowerCase() === street.toLowerCase());
    const matchRoad = !road || item.road.toLowerCase().includes(road);
    const matchJurisdiction = !jurisdiction || item.lowestJurisdiction.toLowerCase().includes(jurisdiction);
    const matchVillage = !village || item.village.toLowerCase().includes(village);
    return matchPincode && matchStreet && matchRoad && matchJurisdiction && matchVillage;
  });

  renderData();
  showToast(`Showing ${filteredData.length} of ${parsedData.length} records`, 'success');
}



document.addEventListener("click", (e) => {
  if (!villageSuggestionBox.contains(e.target) && e.target !== villageInput) {
    villageSuggestionBox.innerHTML = "";
  }
  if (!roadSuggestionBox.contains(e.target) && e.target !== roadInput) {
    roadSuggestionBox.innerHTML = "";
  }
  if (!streetSuggestionBox.contains(e.target) && e.target !== streetInput) {
    streetSuggestionBox.innerHTML = "";
  }
});