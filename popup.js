// Popup script for Forum Filter

// Debug mode - set to true to enable console logs
const DEBUG = false;

// Debug logging function
function debugLog(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

// DOM elements
const authorInput = document.getElementById('authorInputField');
const addButton = document.getElementById('addButton');
const authorListContainer = document.getElementById('authorListContainer');

// Filtering modes
const FILTER_MODES = ['T', 'S', 'C']; // Toggle order: T -> S -> C -> T...

// Current filter counts
let currentFilterCounts = {
  questions: {},
  answers: {}
};

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the UI
  loadBlockedAuthors();
  
  // Set up event listeners
  authorInput.addEventListener('keypress', handleKeyPress);
  addButton.addEventListener('click', addBlockedAuthor);
  
  // Listen for filter count updates
  chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'local' && changes.filterCounts) {
      debugLog('Received updated filter counts:', changes.filterCounts.newValue);
      currentFilterCounts = changes.filterCounts.newValue;
      updateFilterCountsDisplay();
    }
  });
  
  // Get current filter counts
  chrome.storage.local.get(['filterCounts'], function(data) {
    if (data && data.filterCounts) {
      debugLog('Loaded initial filter counts:', data.filterCounts);
      currentFilterCounts = data.filterCounts;
      updateFilterCountsDisplay();
    }
  });
});

// Notify content script in active tabs to refresh filters
function notifyContentScriptsToRefresh() {
  // Add a timestamp to ensure storage change is detected
  const timestamp = Date.now();
  debugLog('Sending refresh notification with timestamp:', timestamp);
  chrome.storage.local.set({ 'filterRefreshTimestamp': timestamp });
}

// Update filter count display for all authors
function updateFilterCountsDisplay() {
  const toggleButtons = document.querySelectorAll('.toggle-btn');
  debugLog(`Updating count display for ${toggleButtons.length} buttons`);
  
  toggleButtons.forEach(button => {
    const authorName = button.dataset.authorName;
    if (!authorName) return;
    
    // Extract mode letter (S, C, or T) from the button's class
    const modeClass = Array.from(button.classList).find(cls => cls.startsWith('active-'));
    if (modeClass) {
      const mode = modeClass.substring(7); // Get letter after "active-"
      updateSingleCountDisplay(button, authorName, mode);
    }
  });
}

// Update filter count display for a single author
function updateSingleCountDisplay(buttonElement, authorName, mode) {
  const questionCount = currentFilterCounts.questions[authorName] || 0;
  const answerCount = currentFilterCounts.answers[authorName] || 0;
  
  let displayText = mode;
  
  // Add counts based on mode
  if (mode === 'S' && questionCount > 0) {
    displayText = `S (${questionCount})`;
  } else if (mode === 'C' && answerCount > 0) {
    displayText = `C (${answerCount})`;
  } else if (mode === 'T' && (questionCount > 0 || answerCount > 0)) {
    displayText = `T (${questionCount},${answerCount})`;
  }
  
  debugLog(`Setting button text for ${authorName} (${mode}): ${displayText}`);
  buttonElement.textContent = displayText;
}

// Handle enter key press in the input field
function handleKeyPress(event) {
  if (event.key === 'Enter') {
    addBlockedAuthor();
  }
}

// Add a new author to the block list
function addBlockedAuthor() {
  const authorName = authorInput.value.trim();
  
  if (!authorName) return;
  
  chrome.storage.sync.get(['blockedAuthors'], function(data) {
    if (!data.blockedAuthors) {
      data.blockedAuthors = [];
    }
    
    // Check if author already exists (case insensitive)
    const lowerAuthorName = authorName.toLowerCase();
    const exists = data.blockedAuthors.some(author => 
      typeof author === 'object' ? 
      author.name.toLowerCase() === lowerAuthorName :
      author.toLowerCase() === lowerAuthorName
    );
    
    if (!exists) {
      // Add as object with name and mode
      debugLog(`Adding new blocked author: ${authorName}`);
      data.blockedAuthors.push({
        name: authorName,
        mode: 'T'  // Default to filtering both (T)
      });
      
      chrome.storage.sync.set({ 'blockedAuthors': data.blockedAuthors }, function() {
        loadBlockedAuthors();
        notifyContentScriptsToRefresh();
      });
    } else {
      debugLog(`Author ${authorName} already exists in the blocked list`);
    }
    
    authorInput.value = '';
  });
}

// Remove author from block list
function removeBlockedAuthor(authorName) {
  chrome.storage.sync.get(['blockedAuthors'], function(data) {
    if (!data.blockedAuthors) return;
    
    const lowerAuthorName = authorName.toLowerCase();
    debugLog(`Removing blocked author: ${authorName}`);
    
    const filteredAuthors = data.blockedAuthors.filter(author => {
      if (typeof author === 'object') {
        return author.name.toLowerCase() !== lowerAuthorName;
      } else {
        return author.toLowerCase() !== lowerAuthorName;
      }
    });
    
    chrome.storage.sync.set({ 'blockedAuthors': filteredAuthors }, function() {
      loadBlockedAuthors();
      notifyContentScriptsToRefresh();
    });
  });
}

// Toggle filtering mode for an author
function toggleFilterMode(authorName) {
  chrome.storage.sync.get(['blockedAuthors'], function(data) {
    if (!data.blockedAuthors) return;
    
    const updatedAuthors = data.blockedAuthors.map(author => {
      // Handle legacy string format
      if (typeof author === 'string') {
        // If it's the author we want to toggle
        if (author.toLowerCase() === authorName.toLowerCase()) {
          debugLog(`Converting author ${author} to object with mode S`);
          return {
            name: author,
            mode: 'S'  // First toggle from T (default) to S
          };
        }
        // Otherwise convert to object with T mode
        return {
          name: author,
          mode: 'T'
        };
      } else {
        // If it's the author we want to toggle
        if (author.name.toLowerCase() === authorName.toLowerCase()) {
          // Get current mode index
          const currentIndex = FILTER_MODES.indexOf(author.mode);
          // Move to next mode (circular)
          const nextIndex = (currentIndex + 1) % FILTER_MODES.length;
          const nextMode = FILTER_MODES[nextIndex];
          
          debugLog(`Toggling author ${author.name} from ${author.mode} to ${nextMode}`);
          
          return {
            name: author.name,
            mode: nextMode
          };
        }
        return author;
      }
    });
    
    chrome.storage.sync.set({ 'blockedAuthors': updatedAuthors }, function() {
      loadBlockedAuthors();
      notifyContentScriptsToRefresh();
    });
  });
}

// Load and display all blocked authors
function loadBlockedAuthors() {
  chrome.storage.sync.get(['blockedAuthors'], function(data) {
    authorListContainer.innerHTML = '';
    
    if (!data.blockedAuthors || data.blockedAuthors.length === 0) {
      debugLog('No blocked authors found');
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'author-item';
      emptyMessage.textContent = 'Engellenen yazar yok';
      authorListContainer.appendChild(emptyMessage);
      return;
    }
    
    debugLog(`Found ${data.blockedAuthors.length} blocked authors`);
    
    // Migrate legacy data if needed
    const migratedAuthors = data.blockedAuthors.map(author => {
      if (typeof author === 'string') {
        debugLog(`Migrating legacy author format: ${author}`);
        return {
          name: author,
          mode: 'T'  // Default to both
        };
      }
      return author;
    });
    
    // If we migrated, save back
    if (JSON.stringify(migratedAuthors) !== JSON.stringify(data.blockedAuthors)) {
      debugLog('Saving migrated author data');
      chrome.storage.sync.set({ 'blockedAuthors': migratedAuthors });
      data.blockedAuthors = migratedAuthors;
    }
    
    // Create list items for each blocked author
    data.blockedAuthors.forEach(author => {
      const authorItem = document.createElement('div');
      authorItem.className = 'author-item';
      
      const authorName = document.createElement('span');
      authorName.textContent = typeof author === 'object' ? author.name : author;
      
      const controlsContainer = document.createElement('div');
      controlsContainer.className = 'author-controls';
      
      // Mode toggle button
      const toggleButton = document.createElement('span');
      toggleButton.className = 'toggle-btn';
      const currentMode = typeof author === 'object' ? author.mode : 'T';
      toggleButton.textContent = currentMode;
      toggleButton.classList.add(`active-${currentMode}`);
      
      // Store author name in the button for count updates
      const authorNameStr = typeof author === 'object' ? author.name : author;
      toggleButton.dataset.authorName = authorNameStr;
      
      // Update button text with counts
      updateSingleCountDisplay(toggleButton, authorNameStr, currentMode);
      
      toggleButton.addEventListener('click', function() {
        toggleFilterMode(typeof author === 'object' ? author.name : author);
      });
      
      // Remove button
      const removeButton = document.createElement('span');
      removeButton.className = 'remove-btn';
      removeButton.textContent = 'X';
      removeButton.addEventListener('click', function() {
        removeBlockedAuthor(typeof author === 'object' ? author.name : author);
      });
      
      controlsContainer.appendChild(toggleButton);
      controlsContainer.appendChild(removeButton);
      
      authorItem.appendChild(authorName);
      authorItem.appendChild(controlsContainer);
      authorListContainer.appendChild(authorItem);
    });
  });
} 