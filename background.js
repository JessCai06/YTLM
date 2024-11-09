// background.js
const RANDOM_STRING = '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';

// Function to ensure content script is injected
async function ensureContentScriptInjected(tabId) {
  try {
    // First, check if we can communicate with an existing content script
    await chrome.tabs.sendMessage(tabId, { type: 'PING' }).catch(() => {
      // If communication fails, script isn't there, so inject it
      return chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['contentScript.js']
      });
    });
    return true;
  } catch (error) {
    console.error('Error injecting content script:', error);
    return false;
  }
}

// Function to get video transcript
async function getVideoTranscript() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
      if (!tabs[0]) {
        reject(new Error('No active tab found'));
        return;
      }

      // Ensure content script is injected before requesting transcript
      const isInjected = await ensureContentScriptInjected(tabs[0].id);
      if (!isInjected) {
        reject(new Error('Failed to inject content script'));
        return;
      }

      console.log('Sending GET_TRANSCRIPT message to tab:', tabs[0].id);
      
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: 'GET_TRANSCRIPT' },
        function (response) {
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError.message);
            return;
          }
          
          console.log('Received transcript response:', response);
          
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

// Message listener

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log('Background script received message:', message);
  
  if (message.type === 'USER_QUERY') {
    const userQuery = message.query;
    processUserQuery(userQuery)
      .then((timestamps) => {
        console.log('Processing complete, timestamps:', timestamps);
        if (timestamps && timestamps.length > 0) {
          sendResponse({ success: true, timestamps: timestamps });
        } else {
          sendResponse({ success: false, error: 'No matching timestamps found' });
        }
      })
      .catch((error) => {
        console.error('Error processing query:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open
  }
});

// Process user query function
// background.js
// ... (previous code remains the same until processUserQuery function)

async function processUserQuery(query) {
  console.log('Processing query:', query);
  
  try {
    console.log('Attempting to get transcript...');
    const transcript = await getVideoTranscript();
    console.log('Transcript received:', transcript ? 'Yes' : 'No');

    if (!transcript) {
      throw new Error('Failed to retrieve transcript');
    }

    const apiKey = RANDOM_STRING;
    if (apiKey === 'YOUR_API_KEY_HERE') {
      throw new Error('Please replace the API key with your actual OpenAI API key');
    }

    console.log('Sending request to OpenAI...');
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const prompt = `Analyze this YouTube transcript and find the timestamps that match the user's query. Return the results in this exact JSON format:
    {
      "timestamps": [
        {
          "seconds": number,
          "summary": "Brief summary of what is discussed at this timestamp"
        }
      ]
    }

Transcript:
${transcript}

User Query: "${query}"

Instructions:
1. Find all relevant timestamps that match the query
2. For each timestamp, provide a brief summary (max 50 words)
3. Return 1-3 most relevant timestamps
4. Ensure the response is valid JSON
5. If the query is a direct timestamp (e.g., "15 minutes"), convert it and include what is discussed at that time`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',  // Using the most recent model for better understanding
        messages: [
          {
            role: 'system',
            content: 'You are a timestamp finder that returns results in JSON format. Always ensure the response is valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }  // Ensure JSON response
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('OpenAI response received:', data);

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI');
    }

    const resultText = data.choices[0].message.content.trim();
    console.log('Raw result:', resultText);

    const parsedResults = JSON.parse(resultText);
    console.log('Parsed results:', parsedResults);

    return parsedResults.timestamps;

  } catch (error) {
    console.error('Error in processUserQuery:', error);
    throw error;
  }
}