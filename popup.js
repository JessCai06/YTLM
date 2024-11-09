// popup.js

document.addEventListener('DOMContentLoaded', function () {
    const goButton = document.getElementById('goButton');
    const userQueryInput = document.getElementById('userQuery');
    const statusMessage = document.getElementById('statusMessage');
  
    goButton.addEventListener('click', function () {
      const userQuery = userQueryInput.value.trim();
  
      if (userQuery) {
        // Send the user query to the background script
        chrome.runtime.sendMessage(
          { type: 'USER_QUERY', query: userQuery },
          function (response) {
            if (response && response.success) {
              // Update status message
              statusMessage.textContent = 'Processing your request...';
            } else {
              // Handle errors
              statusMessage.textContent = 'An error occurred. Please try again.';
            }
          }
        );
      } else {
        // Alert the user to enter a query
        statusMessage.textContent = 'Please enter a request.';
      }
    });
  });