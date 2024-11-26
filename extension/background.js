// Chrome Extension Service Worker
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.type === 'GET_FREQUENT_SITES') {
      // Use Promise.all to handle both history and bookmarks concurrently
      Promise.all([
        // Get history items
        chrome.history.search({
          text: '',
          startTime: Date.now() - (30 * 24 * 60 * 60 * 1000),
          maxResults: 1000
        }),
        // Get bookmarks
        chrome.bookmarks.getTree()
      ])
        .then(([historyItems, bookmarkTree]) => {
          const bookmarks = flattenBookmarks(bookmarkTree);
          const sites = processSites(historyItems, bookmarks);
          sendResponse({ success: true, sites });
        })
        .catch(error => {
          console.error('Error fetching sites:', error);
          sendResponse({ success: false, error: error.message });
        });

      // Return true to indicate we'll call sendResponse asynchronously
      return true;
    }
  }
);

// Flatten bookmark tree into array
function flattenBookmarks(bookmarkItems) {
  const bookmarks = [];
  
  function traverse(items) {
    for (const item of items) {
      if (item.url) {
        bookmarks.push({
          title: item.title,
          url: item.url,
          dateAdded: item.dateAdded,
          isBookmark: true
        });
      }
      if (item.children) {
        traverse(item.children);
      }
    }
  }
  
  traverse(bookmarkItems);
  return bookmarks;
}

// Process and combine history and bookmarks
function processSites(historyItems, bookmarks) {
  // Create a map of URLs to combine history and bookmarks
  const siteMap = new Map();

  // Process history items
  historyItems.forEach(item => {
    if (item.url && item.title && !item.url.startsWith('chrome://')) {
      siteMap.set(item.url, {
        title: item.title,
        url: item.url,
        visitCount: item.visitCount || 0,
        lastVisit: item.lastVisitTime || Date.now(),
        isBookmark: false,
        selected: false
      });
    }
  });

  // Process bookmarks
  bookmarks.forEach(bookmark => {
    const existing = siteMap.get(bookmark.url);
    if (existing) {
      existing.isBookmark = true;
    } else if (!bookmark.url.startsWith('chrome://')) {
      siteMap.set(bookmark.url, {
        title: bookmark.title,
        url: bookmark.url,
        visitCount: 0,
        lastVisit: bookmark.dateAdded,
        isBookmark: true,
        selected: false
      });
    }
  });

  // Convert map to array and sort by visit count and bookmark status
  return Array.from(siteMap.values())
    .sort((a, b) => {
      // Prioritize bookmarked items
      if (a.isBookmark !== b.isBookmark) {
        return a.isBookmark ? -1 : 1;
      }
      // Then sort by visit count
      return b.visitCount - a.visitCount;
    })
    .slice(0, 50); // Return top 50
}
