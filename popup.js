// popup.js
document.addEventListener('DOMContentLoaded', function () {
  const goButton = document.getElementById('goButton');
  const userQueryInput = document.getElementById('userQuery');
  const statusMessage = document.getElementById('statusMessage');
  const resultsContainer = document.getElementById('resultsContainer');

  function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  function createTimestampElement(timestamp) {
    const div = document.createElement('div');
    div.className = 'timestamp-result';
    
    const button = document.createElement('button');
    button.className = 'timestamp-button';
    button.textContent = `Go to ${formatTime(timestamp.seconds)}`;
    button.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: 'NAVIGATE_VIDEO', timestamp: timestamp.seconds },
          function(response) {
            if (response && response.success) {
              statusMessage.textContent = `Navigated to ${formatTime(timestamp.seconds)}`;
              statusMessage.className = '';
            } else {
              statusMessage.textContent = 'Failed to navigate to timestamp';
              statusMessage.className = 'error';
            }
          }
        );
      });
    });
    
    const summary = document.createElement('p');
    summary.className = 'timestamp-summary';
    summary.textContent = timestamp.summary;
    
    div.appendChild(button);
    div.appendChild(summary);
    return div;
  }

  goButton.addEventListener('click', function () {
    const userQuery = userQueryInput.value.trim();
    if (userQuery) {
      // Clear previous results
      resultsContainer.innerHTML = '';
      statusMessage.textContent = 'Searching...';
      statusMessage.className = 'loading';

      // Send the user query to the background script
      chrome.runtime.sendMessage(
        { type: 'USER_QUERY', query: userQuery },
        function (response) {
          if (response && response.success) {
            const timestamps = response.timestamps;
            if (timestamps && timestamps.length > 0) {
              resultsContainer.innerHTML = ''; // Clear loading state
              timestamps.forEach(timestamp => {
                resultsContainer.appendChild(createTimestampElement(timestamp));
              });
              statusMessage.textContent = `Found ${timestamps.length} matching timestamp${timestamps.length === 1 ? '' : 's'}`;
              statusMessage.className = '';
            } else {
              statusMessage.textContent = 'No matching timestamps found';
              statusMessage.className = 'error';
            }
          } else {
            statusMessage.textContent = response?.error || 'An error occurred. Please try again.';
            statusMessage.className = 'error';
          }
        }
      );
    } else {
      statusMessage.textContent = 'Please enter a request.';
      statusMessage.className = 'error';
    }
  });

  // Add enter key support
  userQueryInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      goButton.click();
    }
  });
});