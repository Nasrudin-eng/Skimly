// Skimly Chrome Extension - Side Panel Script

const WEB_APP_URL = 'https://mvp-maker-2.preview.emergentagent.com';

// DOM Elements
const screens = {
  loading: document.getElementById('loading'),
  loginRequired: document.getElementById('login-required'),
  noAnalysis: document.getElementById('no-analysis'),
  analysisResult: document.getElementById('analysis-result'),
  saved: document.getElementById('saved')
};

let currentAnalysis = null;
let currentText = null;
let currentSource = null;

// Show specific screen
function showScreen(screenId) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[screenId].classList.add('active');
}

// Initialize
async function init() {
  const { skimlyToken, analysisResult, originalText, sourceUrl, sourceTitle, pendingAnalysis } = 
    await chrome.storage.local.get([
      'skimlyToken', 
      'analysisResult', 
      'originalText', 
      'sourceUrl', 
      'sourceTitle',
      'pendingAnalysis'
    ]);

  // Check if logged in
  if (!skimlyToken) {
    showScreen('loginRequired');
    
    // Check for pending analysis
    if (pendingAnalysis) {
      document.querySelector('#login-required p').textContent = 
        'Sign in to analyze and save this text.';
    }
    return;
  }

  // Check for analysis result
  if (analysisResult) {
    displayAnalysis(analysisResult, originalText, sourceUrl, sourceTitle);
  } else {
    showScreen('noAnalysis');
  }
}

// Display analysis result
function displayAnalysis(result, text, url, title) {
  currentAnalysis = result;
  currentText = text;
  currentSource = { url, title };

  // Source info
  document.getElementById('source-title').textContent = title || 'Unknown source';
  
  // Original text
  document.getElementById('original-text-content').textContent = 
    text?.length > 300 ? text.substring(0, 300) + '...' : text;

  // Analysis sections
  const analysis = result.analysis;
  
  populateList('key-points', analysis.key_points);
  populateList('implications', analysis.implications);
  populateList('actions', analysis.actions);
  populateList('questions', analysis.questions);
  populateList('relevance', analysis.personal_relevance);

  showScreen('analysisResult');
}

// Populate list element
function populateList(elementId, items) {
  const ul = document.getElementById(elementId);
  ul.innerHTML = '';
  
  if (!items || items.length === 0) {
    document.getElementById(`${elementId}-section`).style.display = 'none';
    return;
  }
  
  document.getElementById(`${elementId}-section`).style.display = 'block';
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
}

// Event Listeners
document.getElementById('sidepanel-login').addEventListener('click', () => {
  chrome.tabs.create({ url: `${WEB_APP_URL}/auth` });
});

document.getElementById('save-btn').addEventListener('click', async () => {
  if (!currentAnalysis || !currentText) return;

  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Saving...';

  const response = await chrome.runtime.sendMessage({
    action: 'saveKnowledge',
    data: {
      original_text: currentText,
      source_url: currentSource?.url,
      source_title: currentSource?.title,
      analysis: currentAnalysis.analysis,
      tags: []
    }
  });

  if (response.success) {
    // Clear stored analysis
    await chrome.storage.local.remove(['analysisResult', 'originalText', 'sourceUrl', 'sourceTitle']);
    showScreen('saved');
  } else {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      Save to Knowledge Base
    `;
    alert('Failed to save. Please try again.');
  }
});

document.getElementById('analyze-more').addEventListener('click', () => {
  currentAnalysis = null;
  currentText = null;
  currentSource = null;
  showScreen('noAnalysis');
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.analysisResult?.newValue) {
    chrome.storage.local.get(['originalText', 'sourceUrl', 'sourceTitle'], (data) => {
      displayAnalysis(
        changes.analysisResult.newValue,
        data.originalText,
        data.sourceUrl,
        data.sourceTitle
      );
    });
  }
  if (changes.skimlyToken) {
    if (changes.skimlyToken.newValue) {
      // User logged in, check for pending analysis
      chrome.storage.local.get(['pendingAnalysis'], async (data) => {
        if (data.pendingAnalysis) {
          // Re-analyze pending text
          showScreen('loading');
          // The background script will handle this
        } else {
          showScreen('noAnalysis');
        }
      });
    } else {
      // User logged out
      showScreen('loginRequired');
    }
  }
});

// Start
init();
