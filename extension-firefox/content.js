// Content script to handle communication between webpage and extension
window.addEventListener('message', function(event) {
  // Only accept messages from the same window
  if (event.source !== window) return;
  
  if (event.data && event.data.target === 'WEB_LAUNCHER_EXTENSION') {
    // Forward the message to the background script
    browser.runtime.sendMessage(event.data).then(response => {
      // Send the response back to the webpage
      window.postMessage({
        source: 'WEB_LAUNCHER_EXTENSION',
        ...response
      }, '*');
    }).catch(error => {
      window.postMessage({
        source: 'WEB_LAUNCHER_EXTENSION',
        success: false,
        error: error.message
      }, '*');
    });
  }
});
