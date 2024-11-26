// Firefox Extension Background Script
browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'GET_FREQUENT_SITES') {
    try {
      // Get history items from the last 365 days, increased maxResults
      const historyItems = await browser.history.search({
        text: '',
        startTime: Date.now() - (365 * 24 * 60 * 60 * 1000), // Last year
        maxResults: 5000 // Increased from 1000 to 5000
      });

      // Get detailed history with visit counts
      const detailedHistory = await Promise.all(
        historyItems.map(async item => {
          const visits = await browser.history.getVisits({ url: item.url });
          return {
            ...item,
            totalVisits: visits.length
          };
        })
      );

      // Get bookmarks
      const bookmarkTree = await browser.bookmarks.getTree();
      const bookmarks = flattenBookmarks(bookmarkTree);

      // Process and return sites
      const sites = processSites(detailedHistory, bookmarks);
      return { success: true, sites };
    } catch (error) {
      console.error('Error fetching sites:', error);
      return { success: false, error: error.message };
    }
  }
});

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
    if (item.url && 
        item.title && 
        !item.url.startsWith('moz-extension://') &&
        !item.url.startsWith('about:') &&
        !item.url.startsWith('chrome://') &&
        !item.url.includes('localhost')) {
      siteMap.set(item.url, {
        title: item.title,
        url: item.url,
        visitCount: item.totalVisits || item.visitCount || 0,
        lastVisit: item.lastVisitTime || Date.now(),
        isBookmark: false,
        selected: false
      });
    }
  });

  // Process bookmarks
  bookmarks.forEach(bookmark => {
    if (bookmark.url &&
        !bookmark.url.startsWith('moz-extension://') &&
        !bookmark.url.startsWith('about:') &&
        !bookmark.url.startsWith('chrome://') &&
        !bookmark.url.includes('localhost')) {
      const existing = siteMap.get(bookmark.url);
      if (existing) {
        existing.isBookmark = true;
      } else {
        siteMap.set(bookmark.url, {
          title: bookmark.title,
          url: bookmark.url,
          visitCount: 0,
          lastVisit: bookmark.dateAdded,
          isBookmark: true,
          selected: false
        });
      }
    }
  });

  // Convert map to array and sort by visit count and bookmark status
  return Array.from(siteMap.values())
    .sort((a, b) => {
      // First sort by visit count
      const visitDiff = b.visitCount - a.visitCount;
      if (visitDiff !== 0) return visitDiff;
      
      // If visit counts are equal, prioritize bookmarks
      if (a.isBookmark !== b.isBookmark) {
        return a.isBookmark ? -1 : 1;
      }
      
      // If both are bookmarks or both aren't, sort by last visit
      return b.lastVisit - a.lastVisit;
    })
    .slice(0, 100); // Return top 100 instead of 50
}
