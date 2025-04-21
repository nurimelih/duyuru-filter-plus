// Hides posts with given users on the page
function hidePosts() {
  chrome.storage.sync.get(['hiddenUsers'], function(result) {
    if (!result || !result.hiddenUsers) {
      return;
    }
    var posts = window.document.getElementsByClassName("entry0");
    for (var post of posts) {
      for (var i = 0; i < post.childNodes.length; i++) {
        if (post.childNodes[i].className == "bottomright duclsact") {
          usernameDiv = post.childNodes[i];
          username = usernameDiv.childNodes[0].childNodes[0].text;
          post.style.display = "block";
          
          // Case-insensitive username matching
          const lowerUsername = username.toLowerCase();
          const isHidden = result.hiddenUsers.some(hiddenUser => 
            hiddenUser.toLowerCase() === lowerUsername
          );
          
          if (isHidden) {
            post.style.display = "none";
          }
          break;
        }        
      }
    }
  });
}

// Add a new item in the store
function addHiddenUser() {
  chrome.storage.sync.get(['hiddenUsers'], function(result) {
    var userToHide = document.getElementById("hiddenUsersInput").value;
    if (!result || !result.hiddenUsers) {
      result.hiddenUsers = []
    }  
    if (!result.hiddenUsers.includes(userToHide)) {
      result.hiddenUsers.push(userToHide);
      chrome.storage.sync.set({"hiddenUsers": result.hiddenUsers}, function() {});
      createList();
    }
    document.getElementById("hiddenUsersInput").value = "";
  });
}

function checkEnter(e) {
  if (e.key !== 'Enter') {
    return;
  }
  addHiddenUser();
}


function hideUserAnswer(username) {
  // Get all answer divs
  const allAnswerDivs = document.querySelectorAll('div.answer');
  
  // Go through each answer div to find the one with the matching username
  for (const answerDiv of allAnswerDivs) {
    // Find the first li inside the ul.duans.poster in this answer div
    const firstLi = answerDiv.querySelector('ul.duans.poster > li');
    if (!firstLi) continue;
    
    // Check if the text contains the username (case insensitive)
    const text = firstLi.textContent.trim();
    const lowerText = text.toLowerCase();
    const lowerUsername = username.toLowerCase();
    
    // Check if username appears in the text (case insensitive)
    if (lowerText.includes(lowerUsername)) {
      // Found the matching element - hide it
      answerDiv.style.display = 'none';
      return answerDiv; // Return the matching answer div (now hidden)
    }
  }
  
  // If no match found
  return null;
}

function removeHiddenUser(username) {
  chrome.storage.sync.get(['hiddenUsers'], function(result) {
    const lowerUsername = username.toLowerCase();
    const hiddenUsers = result.hiddenUsers.filter(user => 
      user.toLowerCase() !== lowerUsername
    );
    chrome.storage.sync.set({"hiddenUsers": hiddenUsers}, function() {});
    createList();
  });
}

function hideAllUserAnswers() {
  chrome.storage.sync.get(['hiddenUsers'], function(result) {
    if (!result || !result.hiddenUsers) {
      return;
    }
    for (const user of result.hiddenUsers) {
      hideUserAnswer(user);
    }
  });
}

hidePosts();
hideAllUserAnswers();

chrome.storage.onChanged.addListener(function(changes, namespace) {
  hidePosts();
  hideAllUserAnswers();
});