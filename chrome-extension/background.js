// Skimly Chrome Extension - Background Service Worker

const API_BASE = 'https://mvp-maker-2.preview.emergentagent.com/api';

// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'skimly-analyze',
    title: 'Analyze with Skimly',
    contexts: ['selection']
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'skimly-analyze' && info.selectionText) {
    analyzeText(info.selectionText, tab);
  }
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
  if (command === 'analyze-selection') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelection' }, (response) => {
        if (response && response.selectedText) {
          analyzeText(response.selectedText, tabs[0]);
        }
      });
    });
  }
});

// Main analysis function
async function analyzeText(text, tab) {
  const token = await getToken();
  
  if (!token) {
    // Open side panel with login prompt
    chrome.sidePanel.open({ tabId: tab.id });
    chrome.storage.local.set({ pendingAnalysis: { text, url: tab.url, title: tab.title } });
    return;
  }

  try {
    // Show loading state
    chrome.tabs.sendMessage(tab.id, { 
      action: 'showLoading' 
    });

    const response = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        text: text,
        source_url: tab.url,
        source_title: tab.title
      })
    });

    if (!response.ok) {
      throw new Error('Analysis failed');
    }

    const result = await response.json();
    
    // Store result and open side panel
    chrome.storage.local.set({ 
      analysisResult: result,
      originalText: text,
      sourceUrl: tab.url,
      sourceTitle: tab.title
    });
    
    chrome.sidePanel.open({ tabId: tab.id });
    
    // Hide loading
    chrome.tabs.sendMessage(tab.id, { action: 'hideLoading' });

  } catch (error) {
    console.error('Analysis error:', error);
    chrome.tabs.sendMessage(tab.id, { 
      action: 'showError', 
      message: 'Analysis failed. Please try again.' 
    });
  }
}

// Get stored auth token
async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['skimlyToken'], (result) => {
      resolve(result.skimlyToken || null);
    });
  });
}

// Listen for messages from popup/sidepanel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setToken') {
    chrome.storage.local.set({ skimlyToken: request.token });
    sendResponse({ success: true });
  } else if (request.action === 'getToken') {
    getToken().then((token) => sendResponse({ token }));
    return true; // Keep channel open for async response
  } else if (request.action === 'logout') {
    chrome.storage.local.remove(['skimlyToken', 'skimlyUser']);
    sendResponse({ success: true });
  } else if (request.action === 'saveKnowledge') {
    saveKnowledge(request.data).then(sendResponse);
    return true;
  }
});

// Save to knowledge base
async function saveKnowledge(data) {
  const token = await getToken();
  if (!token) return { success: false, error: 'Not authenticated' };

  try {
    const response = await fetch(`${API_BASE}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Save failed');
    
    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
