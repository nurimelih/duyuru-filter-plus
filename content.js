// Duyuru Filter Plus
// inspired by duyuru plus plus extension

// Debug mode - set to true to enable console logs
const DEBUG = false;

// Debug logging function
function debugLog(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}

// Global counters for filtered items
let filterCounts = {
  questions: {}, // Format: {authorName: count}
  answers: {}    // Format: {authorName: count}
};

// Filters entries from blocked authors
function filterEntries() {
  chrome.storage.sync.get(['blockedAuthors'], function(data) {
    if (!data || !data.blockedAuthors || data.blockedAuthors.length === 0) {
      return;
    }
    
    // Reset question counters
    data.blockedAuthors.forEach(author => {
      const authorName = typeof author === 'object' ? author.name : author;
      filterCounts.questions[authorName] = 0;
    });
    
    const entryElements = document.getElementsByClassName("entry0");
    
    Array.from(entryElements).forEach(entry => {
      let authorElement = null;
      
      // Find the author information div
      for (let i = 0; i < entry.childNodes.length; i++) {
        if (entry.childNodes[i].className === "bottomright duclsact") {
          authorElement = entry.childNodes[i];
          break;
        }
      }
      
      if (authorElement) {
        const authorName = authorElement.childNodes[0].childNodes[0].text;
        entry.style.display = "block"; // Reset display state
        
        // Case-insensitive author matching - exact match only, not partial
        const lowerAuthorName = authorName.toLowerCase();
        
        // Check if author is in the blocked list (exact match only)
        const blockedAuthor = data.blockedAuthors.find(author => {
          if (typeof author === 'object') {
            return author.name.toLowerCase() === lowerAuthorName;
          } else {
            return author.toLowerCase() === lowerAuthorName;
          }
        });
        
        if (blockedAuthor) {
          // Check filtering mode
          const filterMode = typeof blockedAuthor === 'object' ? blockedAuthor.mode : 'T';
          const blockedName = typeof blockedAuthor === 'object' ? blockedAuthor.name : blockedAuthor;
          
          // If mode is 'S' (Questions) or 'T' (Both), hide the entry
          if (filterMode === 'S' || filterMode === 'T') {
            entry.style.display = "none";
            // Increment counter
            filterCounts.questions[blockedName] = (filterCounts.questions[blockedName] || 0) + 1;
          }
        }
      }
    });
    
    // Send updated counts to popup
    sendCountsToPopup();
  });
}

// Filter replies from blocked authors
function filterReplies() {
  chrome.storage.sync.get(['blockedAuthors'], function(data) {
    if (!data || !data.blockedAuthors || data.blockedAuthors.length === 0) {
      return;
    }
    
    // Reset answer counters
    data.blockedAuthors.forEach(author => {
      const authorName = typeof author === 'object' ? author.name : author;
      filterCounts.answers[authorName] = 0;
    });
    
    const replyElements = document.querySelectorAll('div.answer');
    debugLog(`Found ${replyElements.length} reply elements`);
    
    replyElements.forEach(reply => {
      // Reset display first
      reply.style.display = 'block';
      
      // Find username in the first li element of the ul.duans.poster
      const posterUl = reply.querySelector('ul.duans.poster');
      if (!posterUl) {
        debugLog('No poster UL found in reply');
        return;
      }
      
      const firstLi = posterUl.querySelector('li');
      if (!firstLi) {
        debugLog('No first LI found in poster UL');
        return;
      }
      
      // Get the text content of the first li
      let authorText = firstLi.textContent.trim();
      debugLog(`Raw reply author text: "${authorText}"`);
      
      // The HTML shows that the username is at the beginning of the text
      // before any special characters like spaces or image elements
      let replyAuthor = '';
      
      // Extract just the username at the beginning
      // For example from "exlibris(21.04.25 17:07:41 ~ 17:08:49)" we want "exlibris"
      const match = authorText.match(/^(\S+)/);
      if (match && match[1]) {
        replyAuthor = match[1].trim().toLowerCase();
      }
      
      debugLog(`Extracted reply author: "${replyAuthor}"`);
      
      // Check against blocked authors
      if (replyAuthor) {
        data.blockedAuthors.forEach(author => {
          // Get name and mode
          const authorName = typeof author === 'object' ? author.name : author;
          const filterMode = typeof author === 'object' ? author.mode : 'T';
          
          // Skip if mode is 'S' (only filter questions, not replies)
          if (filterMode === 'S') {
            return;
          }
          
          const lowerAuthor = authorName.toLowerCase();
          
          // Check exact match of username
          if (replyAuthor === lowerAuthor) {
            debugLog(`Hiding reply from ${replyAuthor}, matches blocked author ${lowerAuthor}`);
            reply.style.display = 'none';
            // Increment counter
            filterCounts.answers[authorName] = (filterCounts.answers[authorName] || 0) + 1;
          }
        });
      }
    });
    
    // Send updated counts to popup
    sendCountsToPopup();
  });
}

// Send filter counts to popup via storage
function sendCountsToPopup() {
  chrome.storage.local.set({ 'filterCounts': filterCounts });
}

// Add a new author to the block list
function blockAuthor() {
  chrome.storage.sync.get(['blockedAuthors'], function(data) {
    const authorToBlock = document.getElementById("authorInputField").value;
    
    if (!authorToBlock.trim()) return;
    
    if (!data || !data.blockedAuthors) {
      data.blockedAuthors = [];
    }
    
    // Check if author already exists in the list (case insensitive)
    const lowerAuthorToBlock = authorToBlock.toLowerCase();
    const authorExists = data.blockedAuthors.some(author => 
      author.toLowerCase() === lowerAuthorToBlock
    );
    
    if (!authorExists) {
      data.blockedAuthors.push(authorToBlock);
      chrome.storage.sync.set({"blockedAuthors": data.blockedAuthors}, function() {
        updateBlockList();
      });
    }
    
    document.getElementById("authorInputField").value = "";
  });
}

// Handle enter key press in input field
function handleKeyPress(event) {
  if (event.key === 'Enter') {
    blockAuthor();
  }
}

// Remove an author from the block list
function unblockAuthor(author) {
  chrome.storage.sync.get(['blockedAuthors'], function(data) {
    if (!data || !data.blockedAuthors) return;
    
    const lowerAuthor = author.toLowerCase();
    const updatedList = data.blockedAuthors.filter(blockedAuthor => 
      blockedAuthor.toLowerCase() !== lowerAuthor
    );
    
    chrome.storage.sync.set({"blockedAuthors": updatedList}, function() {
      updateBlockList();
    });
  });
}

// Updates the UI list of blocked authors
function updateBlockList() {
  // This function would be implemented in popup.js
  // as it relates to the extension's UI
}

// Initialize filtering
function initializeFilters() {
  debugLog("Applying filters...");
  filterEntries();
  filterReplies();
}

// Run on page load
initializeFilters();

// Listen for changes in storage
chrome.storage.onChanged.addListener(function(changes, namespace) {
  if (namespace === 'sync' && changes.blockedAuthors) {
    // Immediately reapply filters when storage changes
    debugLog("blockedAuthors changed, reapplying filters");
    initializeFilters();
  }
  
  if (namespace === 'local' && changes.filterRefreshTimestamp) {
    // Refresh triggered from popup
    debugLog("Refresh requested, reapplying filters");
    initializeFilters();
  }
}); 