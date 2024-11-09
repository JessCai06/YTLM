// contentScript.js
console.log('YouTube AI Navigator content script loaded');

async function openTranscriptPanel() {
  // First, try to find the "Show transcript" button
  const buttons = Array.from(document.querySelectorAll('button'));
  const showTranscriptButton = buttons.find(button => 
    button.textContent.toLowerCase().includes('show transcript')
  );

  if (showTranscriptButton) {
    showTranscriptButton.click();
    // Wait for transcript to load
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  // If button not found, check if transcript panel is already open
  const transcriptPanel = document.querySelector('ytd-transcript-renderer');
  if (transcriptPanel) {
    return Promise.resolve();
  }

  return Promise.reject('Transcript button not found');
}

function extractTranscriptFromPage() {
  console.log('Starting transcript extraction');

  // New approach to find transcript segments
  const transcriptSegments = Array.from(document.querySelectorAll('ytd-transcript-segment-renderer'));
  
  if (transcriptSegments.length > 0) {
    console.log('Found transcript segments:', transcriptSegments.length);
    return transcriptSegments.map(segment => {
      const timestamp = segment.querySelector('[class*="timestamp"]')?.textContent?.trim();
      const text = segment.querySelector('[class*="text"]')?.textContent?.trim();
      
      if (timestamp && text) {
        // Convert timestamp to seconds
        const timeParts = timestamp.split(':').map(Number);
        let seconds = 0;
        if (timeParts.length === 3) { // HH:MM:SS
          seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
        } else if (timeParts.length === 2) { // MM:SS
          seconds = timeParts[0] * 60 + timeParts[1];
        }
        return `[${seconds}] ${text}`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');
  }

  // Try alternative selectors if the first approach failed
  const alternativeSelectors = [
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]',
    '#transcript-scrollbox',
    '.ytd-transcript-renderer'
  ];

  for (const selector of alternativeSelectors) {
    const container = document.querySelector(selector);
    if (container) {
      const segments = Array.from(container.querySelectorAll('[class*="segment"]'));
      if (segments.length > 0) {
        console.log('Found segments using selector:', selector);
        const transcript = segments.map(segment => {
          const timestamp = segment.querySelector('[class*="timestamp"]')?.textContent?.trim();
          const text = segment.querySelector('[class*="text"]')?.textContent?.trim();
          
          if (timestamp && text) {
            const timeParts = timestamp.split(':').map(Number);
            let seconds = 0;
            if (timeParts.length === 3) {
              seconds = timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2];
            } else if (timeParts.length === 2) {
              seconds = timeParts[0] * 60 + timeParts[1];
            }
            return `[${seconds}] ${text}`;
          }
          return null;
        })
        .filter(Boolean)
        .join('\n');

        if (transcript) {
          return transcript;
        }
      }
    }
  }

  console.log('No transcript found with any selector');
  return null;
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('Content script received message:', message);

  if (message.type === 'PING') {
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_TRANSCRIPT') {
    console.log('Attempting to extract transcript');
    
    // First try to open the transcript panel
    openTranscriptPanel()
      .then(() => {
        // Give the panel a moment to fully load
        setTimeout(() => {
          const transcript = extractTranscriptFromPage();
          if (transcript) {
            console.log('Transcript extracted successfully');
            sendResponse({ transcript: transcript });
          } else {
            console.error('Failed to extract transcript');
            sendResponse({ transcript: null, error: 'Transcript not found. Make sure the video has closed captions available.' });
          }
        }, 1000);
      })
      .catch(error => {
        console.error('Failed to open transcript panel:', error);
        sendResponse({ transcript: null, error: 'Could not open transcript panel. Make sure the video has closed captions available.' });
      });
    
    return true; // Keep the message channel open for async response
  }

  if (message.type === 'NAVIGATE_VIDEO') {
    console.log('Attempting to navigate video to:', message.timestamp);
    const timestamp = message.timestamp;
    const player = document.querySelector('video');
    if (player) {
      player.currentTime = timestamp;
      player.play();
      console.log('Video navigation successful');
      sendResponse({ success: true });
    } else {
      console.error('Video player not found');
      sendResponse({ success: false, error: 'Video player not found' });
    }
    return true;
  }
});