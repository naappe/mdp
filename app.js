// ============================================
// CONFIG VALUES (from config.js via window)
// ============================================
console.log('✅ app.js loaded');

function normalizeSex(value) {
    if (!value) return '';
    const upper = value.toUpperCase();
    if (upper === 'M' || upper === 'MALE') return 'Male';
    if (upper === 'F' || upper === 'FEMALE') return 'Female';
    if (upper === 'O' || upper === 'OTHER') return 'Other';
    return value;
}

// ============================================
// INIT SUPABASE
// ============================================
if (typeof supabase === 'undefined') {
    document.getElementById('voterList').innerHTML =
        '<div class="error-box">❌ Supabase library failed to load.</div>';
    throw new Error('Supabase library failed to load');
}

var SUPABASE_URL = window.SUPABASE_CONFIG ? window.SUPABASE_CONFIG.url : 'https://espezmdpkoixnfchomqb.supabase.co';
var SUPABASE_PUBLISHABLE_KEY = window.SUPABASE_CONFIG ? window.SUPABASE_CONFIG.publishableKey : 'sb_publishable_xP8z74zcMuCkj6xlu1bJ3w_Kudqbcu1';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ============================================
// STATE
// ============================================
let allVoters = [];
let filteredVoters = [];
let currentPage = 1;
const pageSize = 25;
let galleryPage = 1;
const galleryPageSize = 30;
let topHousesCollapsed = false;
let isLoading = false;
let ageChartInstance = null;
let isLoggedIn = false;

// ============================================
// SESSION MANAGEMENT
// ============================================
function saveSession(username) {
    localStorage.setItem('voterSession', JSON.stringify({
        username: username,
        timestamp: Date.now()
    }));
}

function clearSession() {
    localStorage.removeItem('voterSession');
}

function checkSession() {
    const sessionData = localStorage.getItem('voterSession');
    if (sessionData) {
        try {
            const session = JSON.parse(sessionData);
            const sessionAge = Date.now() - session.timestamp;
            const maxAge = 24 * 60 * 60 * 1000;
            if (sessionAge < maxAge) {
                return session.username;
            } else {
                clearSession();
                return null;
            }
        } catch (e) {
            clearSession();
            return null;
        }
    }
    return null;
}

// ============================================
// DOM ELEMENTS
// ============================================
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const mainApp = document.getElementById('mainApp');
const rememberMe = document.getElementById('rememberMe');

const voterList = document.getElementById('voterList');
const searchInput = document.getElementById('searchInput');
const sexFilter = document.getElementById('sexFilter');
const partyFilter = document.getElementById('partyFilter');
const houseFilter = document.getElementById('houseFilter');
const ageRangeFilter = document.getElementById('ageRangeFilter');
const resetBtn = document.getElementById('resetBtn');
const filterChips = document.getElementById('filterChips');

const totalVoters = document.getElementById('totalVoters');
const maleCount = document.getElementById('maleCount');
const femaleCount = document.getElementById('femaleCount');
const partyCount = document.getElementById('partyCount');
const avgAge = document.getElementById('avgAge');
const houseCount = document.getElementById('houseCount');
const navCount = document.getElementById('navCount');
const voterCountDisplay = document.getElementById('voterCountDisplay');

const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

const topHouses = document.getElementById('topHouses');
const topHousesCount = document.getElementById('topHousesCount');
const topHousesToggle = document.getElementById('topHousesToggle');

const voterPopup = document.getElementById('voterPopup');
const voterPopupContent = document.getElementById('voterPopupContent');
const voterPopupClose = document.getElementById('voterPopupClose');

const gallerySection = document.getElementById('gallerySection');
const photoGrid = document.getElementById('photoGrid');
const galleryCount = document.getElementById('galleryCount');
const galleryPrev = document.getElementById('galleryPrev');
const galleryNext = document.getElementById('galleryNext');
const galleryPageInfo = document.getElementById('galleryPageInfo');
const listViewBtn = document.getElementById('listViewBtn');
const galleryViewBtn = document.getElementById('galleryViewBtn');

const editPopup = document.getElementById('editPopup');
const editPopupClose = document.getElementById('editPopupClose');
const editForm = document.getElementById('editForm');
const editId = document.getElementById('editId');
const editName = document.getElementById('editName');
const editNationalId = document.getElementById('editNationalId');
const editHouse = document.getElementById('editHouse');
const editLivesIn = document.getElementById('editLivesIn');
const editPhone = document.getElementById('editPhone');
const editSex = document.getElementById('editSex');
const editAge = document.getElementById('editAge');
const editParty = document.getElementById('editParty');
const logoutBtn = document.getElementById('logoutBtn');

// ============================================
// LOGIN / LOGOUT / SESSION
// ============================================
function handleLogin(e) {
    e.preventDefault();
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    if (username === window.ADMIN_USERNAME && password === window.ADMIN_PASSWORD) {
        isLoggedIn = true;
        if (rememberMe && rememberMe.checked) {
            saveSession(username);
        }
        loginOverlay.style.display = 'none';
        mainApp.style.display = 'block';
        loginError.style.display = 'none';
        fetchVoters();
    } else {
        loginError.style.display = 'block';
        loginError.textContent = '❌ Invalid username or password';
        loginPassword.value = '';
        loginPassword.focus();
    }
}

function handleLogout() {
    isLoggedIn = false;
    clearSession();
    mainApp.style.display = 'none';
    loginOverlay.style.display = 'flex';
    loginUsername.value = 'admin';
    loginPassword.value = 'admin123';
    loginError.style.display = 'none';
    if (rememberMe) rememberMe.checked = false;
}

function checkLogin() {
    const savedUsername = checkSession();
    if (savedUsername) {
        isLoggedIn = true;
        loginOverlay.style.display = 'none';
        mainApp.style.display = 'block';
        loginUsername.value = savedUsername;
        fetchVoters();
        return true;
    }
    loginOverlay.style.display = 'flex';
    mainApp.style.display = 'none';
    isLoggedIn = false;
    return false;
}

// ============================================
// HAMBURGER MENU
// ============================================
document.getElementById('hamburger').addEventListener('click', function() {
    document.getElementById('navLinks').classList.toggle('open');
});

// ============================================
// TOP HOUSES COLLAPSIBLE
// ============================================
topHousesToggle.addEventListener('click', function() {
    topHousesCollapsed = !topHousesCollapsed;
    const grid = document.querySelector('.top-houses-grid');
    const icon = document.querySelector('.toggle-icon');
    if (grid) grid.classList.toggle('collapsed');
    if (icon) icon.classList.toggle('collapsed');
});

// ============================================
// POPUP CONTROLS
// ============================================
function closePopup() {
    voterPopup.style.display = 'none';
    document.body.style.overflow = 'auto';
}

voterPopupClose.addEventListener('click', closePopup);
voterPopup.addEventListener('click', function(e) {
    if (e.target === this) closePopup();
});
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closePopup();
});

// ============================================
// EDIT POPUP CONTROLS
// ============================================
editPopupClose.addEventListener('click', function() {
    editPopup.style.display = 'none';
});
editPopup.addEventListener('click', function(e) {
    if (e.target === this) {
        editPopup.style.display = 'none';
    }
});

// ============================================
// LOGIN/LOGOUT EVENTS
// ============================================
loginForm.addEventListener('submit', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

// ============================================
// FETCH ALL VOTERS
// ============================================
async function fetchVoters() {
    if (isLoading) return;
    isLoading = true;
    voterList.innerHTML = '<div class="loading-state">Loading voters...</div>';

    try {
        const { count, error: countError } = await supabaseClient
            .from('full_import')
            .select('*', { count: 'exact', head: true });
        if (countError) throw countError;

        let allData = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            const { data, error } = await supabaseClient
                .from('full_import')
                .select('*')
                .range(from, to)
                .order('image_number', { ascending: true });
            if (error) throw error;
            if (data && data.length > 0) {
                allData = allData.concat(data);
                page++;
            }
            if (!data || data.length < pageSize) {
                hasMore = false;
            }
        }

        allVoters = allData || [];
        filteredVoters = [...allVoters];

        populateFilters(allVoters);
        renderTopHouses(allVoters);
        updateStats(allVoters);
        renderAgeAnalytics(allVoters);
        renderList(filteredVoters);

        if (gallerySection.style.display !== 'none') {
            galleryPage = 1;
            renderGallery(filteredVoters);
        }

    } catch (error) {
        console.error('Error:', error);
        voterList.innerHTML =
            `<div class="error-box">❌ Failed to load voters.<br /><small>${error.message}</small></div>`;
    } finally {
        isLoading = false;
    }
}

// ============================================
// AGE ANALYTICS
// ============================================
function renderAgeAnalytics(voters) {
    const ageGroups = {
        '18-24': 0,
        '25-34': 0,
        '35-44': 0,
        '45-54': 0,
        '55-64': 0,
        '65+': 0
    };

    voters.forEach(v => {
        const age = parseInt(v.age);
        if (isNaN(age) || age < 18) return;
        if (age >= 18 && age <= 24) ageGroups['18-24']++;
        else if (age >= 25 && age <= 34) ageGroups['25-34']++;
        else if (age >= 35 && age <= 44) ageGroups['35-44']++;
        else if (age >= 45 && age <= 54) ageGroups['45-54']++;
        else if (age >= 55 && age <= 64) ageGroups['55-64']++;
        else if (age >= 65) ageGroups['65+']++;
    });

    const total = voters.length;
    const withAge = Object.values(ageGroups).reduce((a, b) => a + b, 0);
    const withoutAge = total - withAge;

    const ctx = document.getElementById('ageChart').getContext('2d');
    if (ageChartInstance) ageChartInstance.destroy();

    const labels = Object.keys(ageGroups);
    const data = Object.values(ageGroups);
    const colors = ['#4a90d9', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'];

    ageChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Voters by Age',
                data: data,
                backgroundColor: colors.map(c => c + '80'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
                            return `${context.parsed.y} voters (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    const ageRangeStats = document.getElementById('ageRangeStats');
    let statsHtml = `
        <div class="age-stats-grid">
            <div class="age-stat-item">
                <span class="age-stat-number">${total}</span>
                <span class="age-stat-label">Total Voters</span>
            </div>
            <div class="age-stat-item">
                <span class="age-stat-number">${withAge}</span>
                <span class="age-stat-label">With Age</span>
            </div>
            <div class="age-stat-item">
                <span class="age-stat-number">${withoutAge}</span>
                <span class="age-stat-label">No Age</span>
            </div>
            <div class="age-stat-item">
                <span class="age-stat-number">${Object.keys(ageGroups).filter(k => ageGroups[k] > 0).length}</span>
                <span class="age-stat-label">Age Groups</span>
            </div>
        </div>
    `;

    let breakdownHtml = '<div class="age-breakdown">';
    Object.entries(ageGroups).forEach(([group, count]) => {
        const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
        breakdownHtml += `
            <div class="age-breakdown-item">
                <span class="age-group-label">${group}</span>
                <div class="age-bar-wrapper">
                    <div class="age-bar" style="width: ${percentage}%; background: ${colors[Object.keys(ageGroups).indexOf(group)]};"></div>
                </div>
                <span class="age-group-count">${count} (${percentage}%)</span>
            </div>
        `;
    });
    breakdownHtml += '</div>';

    ageRangeStats.innerHTML = statsHtml + breakdownHtml;
}

// ============================================
// POPULATE FILTERS
// ============================================
function populateFilters(voters) {
    const parties = [...new Set(voters.map(v => v.party).filter(Boolean))].sort();
    partyFilter.innerHTML = '<option value="">All Parties</option>';
    parties.forEach(p => {
        const option = document.createElement('option');
        option.value = p;
        option.textContent = p;
        partyFilter.appendChild(option);
    });

    const houses = [...new Set(voters.map(v => v.house).filter(Boolean))].sort();
    houseFilter.innerHTML = '<option value="">All Houses</option>';
    houses.forEach(h => {
        const option = document.createElement('option');
        option.value = h;
        option.textContent = h;
        houseFilter.appendChild(option);
    });

    renderFilterChips(voters);
}

// ============================================
// RENDER FILTER CHIPS
// ============================================
function renderFilterChips(voters) {
    const chips = [];

    const males = voters.filter(v => normalizeSex(v.sex) === 'Male').length;
    const females = voters.filter(v => normalizeSex(v.sex) === 'Female').length;
    if (males > 0) chips.push({ label: `👨 Male (${males})`, value: 'sex:Male', type: 'sex' });
    if (females > 0) chips.push({ label: `👩 Female (${females})`, value: 'sex:Female', type: 'sex' });

    const partyCounts = {};
    voters.forEach(v => {
        const p = v.party || 'No Party';
        partyCounts[p] = (partyCounts[p] || 0) + 1;
    });
    const topParties = Object.entries(partyCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    topParties.forEach(([party, count]) => {
        if (party !== 'No Party') {
            chips.push({ label: `${party} (${count})`, value: `party:${party}`, type: 'party' });
        }
    });

    filterChips.innerHTML = chips.map(chip => `
        <span class="filter-chip" data-value="${chip.value}" data-type="${chip.type}">
            ${chip.label}
        </span>
    `).join('');

    document.querySelectorAll('.filter-chip').forEach(el => {
        el.addEventListener('click', function() {
            const [type, value] = this.dataset.value.split(':');
            applyFilterChip(type, value);
        });
    });
}

// ============================================
// APPLY FILTER CHIP
// ============================================
function applyFilterChip(type, value) {
    if (type === 'sex') sexFilter.value = value;
    else if (type === 'party') partyFilter.value = value;
    else if (type === 'age') {
        ageRangeFilter.value = value;
    }
    filterVoters();
    document.querySelectorAll('.filter-chip').forEach(el => {
        el.classList.toggle('active', el.dataset.value === `${type}:${value}`);
    });
}

// ============================================
// UPDATE STATS
// ============================================
function updateStats(voters) {
    const total = voters.length;
    const males = voters.filter(v => normalizeSex(v.sex) === 'Male').length;
    const females = voters.filter(v => normalizeSex(v.sex) === 'Female').length;
    const parties = [...new Set(voters.map(v => v.party).filter(Boolean))];
    const houses = [...new Set(voters.map(v => v.house).filter(Boolean))];
    const ages = voters.map(v => parseInt(v.age)).filter(a => a > 0 && a < 120);
    const avg = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;

    totalVoters.textContent = total;
    maleCount.textContent = males;
    femaleCount.textContent = females;
    partyCount.textContent = parties.length;
    avgAge.textContent = avg;
    houseCount.textContent = houses.length;
    navCount.textContent = total;
}

// ============================================
// RENDER TOP HOUSES
// ============================================
function renderTopHouses(voters) {
    const houseCounts = {};
    voters.forEach(v => {
        if (v.house) {
            houseCounts[v.house] = (houseCounts[v.house] || 0) + 1;
        }
    });

    const top = Object.entries(houseCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    topHousesCount.textContent = `(${top.length})`;

    if (top.length === 0) {
        topHouses.innerHTML = '<div class="no-results">No houses found</div>';
        return;
    }

    let html = '';
    top.forEach(([house, count], index) => {
        const medals = ['🥇', '🥈', '🥉'];
        const medal = index < 3 ? medals[index] : `#${index + 1}`;
        html += `
            <div class="top-house" data-house="${house}">
                <span class="house-name">${medal} ${house}</span>
                <span class="house-count">${count}</span>
            </div>
        `;
    });

    topHouses.innerHTML = html;

    document.querySelectorAll('.top-house').forEach(el => {
        el.addEventListener('click', function() {
            houseFilter.value = this.dataset.house;
            filterVoters();
        });
    });
}

// ============================================
// SHOW VOTER POPUP
// ============================================
function showVoterPopup(voter) {
    if (!voter) return;
    document.body.style.overflow = 'hidden';

    const photoUrl = voter.photo_url || '';
    const sexDisplay = normalizeSex(voter.sex);
    const partyClass = (voter.party || '').toLowerCase();
    const address = [voter.house, voter.lives_in].filter(Boolean).join(', ') || 'N/A';

    voterPopupContent.innerHTML = `
        <div class="popup-photo">
            ${photoUrl ? 
                `<img src="${photoUrl}" alt="${voter.name}" 
                      onerror="this.style.display='none'; this.parentElement.querySelector('.placeholder').style.display='flex';" />` :
                ''
            }
            <div class="placeholder" style="${photoUrl ? 'display:none;' : 'display:flex;'} align-items:center; justify-content:center; width:100%; height:100%;">
                📷
            </div>
        </div>
        <div class="popup-name">${voter.name || 'Unknown'}</div>
        <div class="popup-id">🆔 ${voter.national_id || 'N/A'}</div>
        <div class="popup-details">
            <span class="label">Age</span><span class="value">${voter.age || 'N/A'}</span>
            <span class="label">Sex</span><span class="value">${sexDisplay}</span>
            <span class="label">Address</span><span class="value">${address}</span>
            <span class="label">Mobile</span><span class="value">${voter.phone || 'N/A'}</span>
            <span class="label">Party</span><span class="value">${voter.party || 'N/A'}</span>
        </div>
        ${voter.party ? `<div class="popup-party ${partyClass}">${voter.party}</div>` : ''}
        <button class="popup-edit-btn" onclick="openEditPopup(${voter.id})">
            <i class="fas fa-edit"></i> Edit Voter
        </button>
    `;

    voterPopup.style.display = 'flex';
}

// ============================================
// OPEN EDIT POPUP
// ============================================
window.openEditPopup = function(id) {
    const voter = allVoters.find(v => v.id === id);
    if (!voter) return;

    editId.value = voter.id;
    editName.value = voter.name || '';
    editNationalId.value = voter.national_id || '';
    editHouse.value = voter.house || '';
    editLivesIn.value = voter.lives_in || '';
    editPhone.value = voter.phone || '';
    editSex.value = voter.sex || '';
    editAge.value = voter.age || '';
    editParty.value = voter.party || '';

    editPopup.style.display = 'flex';
    voterPopup.style.display = 'none';
};

// ============================================
// SAVE EDIT
// ============================================
editForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = parseInt(editId.value);
    const updatedData = {
        name: editName.value,
        national_id: editNationalId.value,
        house: editHouse.value,
        lives_in: editLivesIn.value,
        phone: editPhone.value,
        sex: editSex.value,
        age: parseInt(editAge.value) || null,
        party: editParty.value
    };

    try {
        const { error } = await supabaseClient
            .from('full_import')
            .update(updatedData)
            .eq('id', id);

        if (error) throw error;

        const index = allVoters.findIndex(v => v.id === id);
        if (index !== -1) {
            allVoters[index] = { ...allVoters[index], ...updatedData };
        }

        filteredVoters = [...allVoters];
        renderList(filteredVoters);
        renderAgeAnalytics(filteredVoters);
        updateStats(filteredVoters);
        renderTopHouses(filteredVoters);

        if (gallerySection.style.display !== 'none') {
            renderGallery(filteredVoters);
        }

        editPopup.style.display = 'none';
        alert('✅ Voter updated successfully!');

    } catch (error) {
        console.error('Error updating voter:', error);
        alert('❌ Failed to update voter: ' + error.message);
    }
});

// ============================================
// RENDER LIST
// ============================================
function renderList(voters) {
    const totalPages = Math.max(1, Math.ceil(voters.length / pageSize));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, voters.length);
    const pageVoters = voters.slice(start, end);

    voterCountDisplay.textContent = `(${voters.length} total)`;

    if (pageVoters.length === 0) {
        voterList.innerHTML = '<div class="no-results">🔍 No voters found</div>';
        updatePagination(0, totalPages);
        return;
    }

    let html = '';
    pageVoters.forEach(v => {
        const photoUrl = v.photo_url || '';
        const partyClass = (v.party || '').toLowerCase();
        const sexIcon = normalizeSex(v.sex) === 'Male' ? '♂️' : normalizeSex(v.sex) === 'Female' ? '♀️' : '';

        html += `
            <div class="voter-item" data-id="${v.id}">
                <div class="photo">
                    ${photoUrl ? 
                        `<img src="${photoUrl}" alt="${v.name}" loading="lazy" 
                              onerror="this.style.display='none'; this.parentElement.innerHTML='📷';" />` :
                        '<span class="no-photo">📷</span>'
                    }
                </div>
                <div class="info">
                    <span class="name">${v.name || 'Unknown'}</span>
                    <span class="detail"><i class="fas fa-calendar-alt"></i> ${v.age || 'N/A'}</span>
                    <span class="detail"><i class="fas fa-home"></i> ${v.house || 'N/A'}</span>
                    ${sexIcon ? `<span class="detail">${sexIcon}</span>` : ''}
                </div>
                ${v.party ? `<span class="party-badge ${partyClass}">${v.party}</span>` : ''}
                <button class="edit-btn-small" onclick="event.stopPropagation(); openEditPopup(${v.id});">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        `;
    });

    voterList.innerHTML = html;
    updatePagination(voters.length, totalPages);

    document.querySelectorAll('.voter-item').forEach(el => {
        el.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const voter = allVoters.find(v => v.id === id);
            if (voter) showVoterPopup(voter);
        });
    });
}

// ============================================
// UPDATE PAGINATION
// ============================================
function updatePagination(total, totalPages) {
    prevPage.disabled = currentPage <= 1;
    nextPage.disabled = currentPage >= totalPages;
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

// ============================================
// RENDER PHOTO GALLERY
// ============================================
function renderGallery(voters) {
    const totalPages = Math.max(1, Math.ceil(voters.length / galleryPageSize));
    if (galleryPage > totalPages) galleryPage = totalPages;

    const start = (galleryPage - 1) * galleryPageSize;
    const end = Math.min(start + galleryPageSize, voters.length);
    const pageVoters = voters.slice(start, end);

    galleryCount.textContent = `(${voters.length} photos)`;

    if (pageVoters.length === 0) {
        photoGrid.innerHTML = '<div class="no-results">No photos found</div>';
        updateGalleryPagination(0, totalPages);
        return;
    }

    let html = '';
    pageVoters.forEach(v => {
        const photoUrl = v.photo_url || '';
        const name = v.name || 'Unknown';

        html += `
            <div class="photo-grid-item" data-id="${v.id}">
                <div class="photo-wrapper">
                    ${photoUrl ? 
                        `<img src="${photoUrl}" alt="${name}" loading="lazy" 
                              onerror="this.style.display='none'; this.parentElement.querySelector('.photo-placeholder').style.display='flex';" />` :
                        ''
                    }
                    <div class="photo-placeholder" style="${photoUrl ? 'display:none;' : 'display:flex;'} align-items:center; justify-content:center; width:100%; height:100%;">
                        📷
                    </div>
                </div>
                <div class="photo-name">${name}</div>
            </div>
        `;
    });

    photoGrid.innerHTML = html;
    updateGalleryPagination(voters.length, totalPages);

    document.querySelectorAll('.photo-grid-item').forEach(el => {
        el.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const voter = allVoters.find(v => v.id === id);
            if (voter) showVoterPopup(voter);
        });
    });
}

// ============================================
// UPDATE GALLERY PAGINATION
// ============================================
function updateGalleryPagination(total, totalPages) {
    galleryPrev.disabled = galleryPage <= 1;
    galleryNext.disabled = galleryPage >= totalPages;
    galleryPageInfo.textContent = `Page ${galleryPage} of ${totalPages}`;
}

// ============================================
// SWITCH VIEWS
// ============================================
function showListView() {
    document.getElementById('listSection').style.display = 'block';
    gallerySection.style.display = 'none';
    listViewBtn.classList.add('active');
    galleryViewBtn.classList.remove('active');
}

function showGalleryView() {
    document.getElementById('listSection').style.display = 'none';
    gallerySection.style.display = 'block';
    galleryViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
    galleryPage = 1;
    renderGallery(filteredVoters);
}

// ============================================
// FILTER VOTERS - WITH AGE RANGE DROPDOWN
// ============================================
function filterVoters() {
    const search = searchInput.value.toLowerCase().trim();
    const sex = sexFilter.value;
    const party = partyFilter.value;
    const house = houseFilter.value;
    const ageRange = ageRangeFilter.value;

    filteredVoters = allVoters.filter(v => {
        let matchSearch = true;
        if (search) {
            matchSearch =
                (v.name && v.name.toLowerCase().includes(search)) ||
                (v.national_id && v.national_id.toLowerCase().includes(search)) ||
                (v.house && v.house.toLowerCase().includes(search)) ||
                (v.lives_in && v.lives_in.toLowerCase().includes(search));
        }

        let matchSex = true;
        if (sex) matchSex = normalizeSex(v.sex) === sex;

        let matchParty = true;
        if (party) matchParty = (v.party || '') === party;

        let matchHouse = true;
        if (house) matchHouse = (v.house || '') === house;

        let matchAge = true;
        if (ageRange) {
            const voterAge = parseInt(v.age);
            if (!isNaN(voterAge) && voterAge > 0) {
                const [min, max] = ageRange.split('-').map(Number);
                if (max) {
                    matchAge = voterAge >= min && voterAge <= max;
                } else {
                    matchAge = voterAge >= min;
                }
            } else {
                matchAge = false;
            }
        }

        return matchSearch && matchSex && matchParty && matchHouse && matchAge;
    });

    currentPage = 1;
    renderList(filteredVoters);
    updateStats(filteredVoters);
    renderTopHouses(filteredVoters);
    renderAgeAnalytics(filteredVoters);

    if (gallerySection.style.display !== 'none') {
        galleryPage = 1;
        renderGallery(filteredVoters);
    }

    document.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));
}

// ============================================
// RESET FILTERS
// ============================================
function resetFilters() {
    searchInput.value = '';
    sexFilter.value = '';
    partyFilter.value = '';
    houseFilter.value = '';
    ageRangeFilter.value = '';

    document.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'));

    filteredVoters = [...allVoters];
    currentPage = 1;
    renderList(filteredVoters);
    updateStats(filteredVoters);
    renderTopHouses(filteredVoters);
    renderAgeAnalytics(filteredVoters);

    if (gallerySection.style.display !== 'none') {
        galleryPage = 1;
        renderGallery(filteredVoters);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
searchInput.addEventListener('input', filterVoters);
sexFilter.addEventListener('change', filterVoters);
partyFilter.addEventListener('change', filterVoters);
houseFilter.addEventListener('change', filterVoters);
ageRangeFilter.addEventListener('change', filterVoters);

resetBtn.addEventListener('click', resetFilters);

prevPage.addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; renderList(filteredVoters); }
});

nextPage.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredVoters.length / pageSize);
    if (currentPage < totalPages) { currentPage++; renderList(filteredVoters); }
});

// Gallery Events
listViewBtn.addEventListener('click', showListView);
galleryViewBtn.addEventListener('click', showGalleryView);

galleryPrev.addEventListener('click', () => {
    if (galleryPage > 1) { galleryPage--; renderGallery(filteredVoters); }
});

galleryNext.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredVoters.length / galleryPageSize);
    if (galleryPage < totalPages) { galleryPage++; renderGallery(filteredVoters); }
});

// ============================================
// INIT
// ============================================
console.log('🔐 Voter Management System loaded');
console.log('👤 Login with: admin / admin123');
checkLogin();