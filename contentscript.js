// contentScript.js

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === 'NAVIGATE_VIDEO') {
      const timestamp = message.timestamp;
  
      // Access the YouTube player and navigate to the specified timestamp
      const player = document.querySelector('video');
  
      if (player) {
        player.currentTime = timestamp;
        player.play();
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false });
      }
    } else if (message.type === 'GET_TRANSCRIPT') {
      // Retrieve the transcript from the YouTube page
      const transcript = extractTranscriptFromPage();
      if (transcript) {
        sendResponse({ transcript: transcript });
      } else {
        sendResponse({ transcript: null });
      }
    }
  });
  
  function extractTranscriptFromPage() {
    // Extract the transcript from the YouTube transcript section
    let transcriptText = '';
    const transcriptElements = document.querySelectorAll(
      'ytd-transcript-segment-renderer'
    );
  
    transcriptElements.forEach((element) => {
      const timeElement = element.querySelector('.segment-timestamp');
      const textElement = element.querySelector('.segment-text');
  
      if (timeElement && textElement) {
        const time = timeElement.textContent.trim();
        const text = textElement.textContent.trim();
        transcriptText += `[${time}] ${text}\n`;
      }
    });
  
    return transcriptText || null;
  }