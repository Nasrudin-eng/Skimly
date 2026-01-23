// Skimly Chrome Extension - Popup Script

const API_BASE = 'https://mvp-maker-2.preview.emergentagent.com/api';
const WEB_APP_URL = 'https://mvp-maker-2.preview.emergentagent.com';

// DOM Elements
const screens = {
  loading: document.getElementById('loading'),
  login: document.getElementById('login-screen'),
  main: document.getElementById('main-screen')
};

// Show specific screen
function showScreen(screenId) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[screenId].classList.add('active');
}

// Initialize
async function init() {
  const { skimlyToken, skimlyUser } = await chrome.storage.local.get(['skimlyToken', 'skimlyUser']);
  
  if (skimlyToken && skimlyUser) {
    await loadMainScreen(skimlyToken, skimlyUser);
  } else {
    showScreen('login');
  }
}

// Load main screen with user data
async function loadMainScreen(token, user) {
  document.getElementById('user-name').textContent = user.name?.split(' ')[0] || 'User';
  
  try {
    const response = await fetch(`${API_BASE}/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const stats = await response.json();
      document.getElementById('stat-total').textContent = stats.total_items || 0;
      document.getElementById('stat-today').textContent = stats.today_count || 0;
      document.getElementById('stat-remaining').textContent = 
        stats.remaining_today !== null ? stats.remaining_today : '∞';
    }
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
  
  showScreen('main');
}

// Event Listeners
document.getElementById('login-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEB_APP_URL}/auth` });
});

document.getElementById('signup-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEB_APP_URL}/auth` });
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await chrome.storage.local.remove(['skimlyToken', 'skimlyUser']);
  showScreen('login');
});

document.getElementById('open-dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEB_APP_URL}/dashboard` });
});

// Listen for login from web app
chrome.storage.onChanged.addListener((changes) => {
  if (changes.skimlyToken && changes.skimlyUser) {
    loadMainScreen(changes.skimlyToken.newValue, changes.skimlyUser.newValue);
  }
});

// Start
init();
