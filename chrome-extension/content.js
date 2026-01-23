// Skimly Chrome Extension - Content Script

let floatingButton = null;
let loadingOverlay = null;

// Create floating button
function createFloatingButton() {
  if (floatingButton) return;
  
  floatingButton = document.createElement('div');
  floatingButton.id = 'skimly-floating-btn';
  floatingButton.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
      <path d="M12 6v6l4 2"/>
    </svg>
    <span>Skimly</span>
  `;
  floatingButton.style.display = 'none';
  document.body.appendChild(floatingButton);

  floatingButton.addEventListener('click', () => {
    const selection = window.getSelection().toString().trim();
    if (selection) {
      chrome.runtime.sendMessage({ 
        action: 'analyze', 
        text: selection,
        url: window.location.href,
        title: document.title
      });
    }
    hideFloatingButton();
  });
}

// Show floating button near selection
function showFloatingButton(x, y) {
  if (!floatingButton) createFloatingButton();
  
  const btnWidth = 100;
  const btnHeight = 36;
  const padding = 10;
  
  let left = x;
  let top = y + padding;
  
  // Keep button in viewport
  if (left + btnWidth > window.innerWidth) {
    left = window.innerWidth - btnWidth - padding;
  }
  if (top + btnHeight > window.innerHeight) {
    top = y - btnHeight - padding;
  }
  
  floatingButton.style.left = `${left}px`;
  floatingButton.style.top = `${top}px`;
  floatingButton.style.display = 'flex';
}

// Hide floating button
function hideFloatingButton() {
  if (floatingButton) {
    floatingButton.style.display = 'none';
  }
}

// Handle text selection
document.addEventListener('mouseup', (e) => {
  setTimeout(() => {
    const selection = window.getSelection().toString().trim();
    
    if (selection && selection.length > 20) {
      showFloatingButton(e.pageX, e.pageY);
    } else {
      hideFloatingButton();
    }
  }, 10);
});

// Hide button on click elsewhere
document.addEventListener('mousedown', (e) => {
  if (floatingButton && !floatingButton.contains(e.target)) {
    hideFloatingButton();
  }
});

// Create loading overlay
function createLoadingOverlay() {
  if (loadingOverlay) return;
  
  loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'skimly-loading';
  loadingOverlay.innerHTML = `
    <div class="skimly-loading-content">
      <div class="skimly-spinner"></div>
      <p>Analyzing with Skimly...</p>
    </div>
  `;
  loadingOverlay.style.display = 'none';
  document.body.appendChild(loadingOverlay);
}

// Show/hide loading
function showLoading() {
  if (!loadingOverlay) createLoadingOverlay();
  loadingOverlay.style.display = 'flex';
}

function hideLoading() {
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
}

// Show toast message
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `skimly-toast skimly-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('skimly-toast-show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('skimly-toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getSelection':
      sendResponse({ selectedText: window.getSelection().toString().trim() });
      break;
    case 'showLoading':
      showLoading();
      break;
    case 'hideLoading':
      hideLoading();
      break;
    case 'showError':
      hideLoading();
      showToast(request.message, 'error');
      break;
    case 'showSuccess':
      showToast(request.message, 'success');
      break;
  }
});

// Initialize
createFloatingButton();
createLoadingOverlay();
