// background.js

// Hardcoded OpenAI API Key (Replace 'YOUR_API_KEY_HERE' with your actual API key)
const OPENAI_API_KEY = 'sk-W9sY767AU57Mrp-4Aua8BA';

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === 'USER_QUERY') {
    const userQuery = message.query;

    processUserQuery(userQuery)
      .then((timestamp) => {
        // Send a message to the content script to navigate the video
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { type: 'NAVIGATE_VIDEO', timestamp: timestamp },
            function (response) {
              if (response && response.success) {
                sendResponse({ success: true });
              } else {
                sendResponse({ success: false });
              }
            }
          );
        });
      })
      .catch((error) => {
        console.error('Error processing query:', error);
        sendResponse({ success: false });
      });

    return true; // Keeps the messaging channel open for sendResponse
  }
});

async function processUserQuery(query) {
  const apiKey = OPENAI_API_KEY;

  const apiUrl = 'https://api.openai.com/v1/completions';

  // Retrieve the transcript from the current YouTube video
  const transcript = await getVideoTranscript();

  const prompt = `Based on the following transcript, identify the timestamp (in seconds) that corresponds to the user's query.\n\nTranscript:\n${transcript}\n\nUser Query: "${query}"\n\nTimestamp (in seconds):`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-davinci-003',
      prompt: prompt,
      max_tokens: 5,
      n: 1,
      stop: null,
      temperature: 0,
    }),
  });

  const data = await response.json();

  // Extract the timestamp from the response
  const timestamp = parseFloat(data.choices[0].text.trim());

  return timestamp;
}

// Function to retrieve the transcript from the YouTube video
function getVideoTranscript() {
  return new Promise((resolve, reject) => {
    // Send a message to the content script to get the transcript
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: 'GET_TRANSCRIPT' },
        function (response) {
          if (response && response.transcript) {
            resolve(response.transcript);
          } else {
            reject('Failed to retrieve transcript.');
          }
        }
      );
    });
  });
}