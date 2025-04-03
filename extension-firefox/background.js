// Firefox Extension Background Script
browser.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'GET_FREQUENT_SITES') {
    try {
      // Get history items from the last 30 days (Aligned with Chrome)
      const historyItems = await browser.history.search({
        text: '',
        startTime: Date.now() - (30 * 24 * 60 * 60 * 1000), // Last 30 days
        maxResults: 1000 // Aligned with Chrome
      });

      // Removed detailed history fetching using getVisits to align with Chrome's simpler approach
      // const detailedHistory = await Promise.all(
      //   historyItems.map(async item => {
      //     const visits = await browser.history.getVisits({ url: item.url });
      //     return {
      //       ...item,
      //       totalVisits: visits.length
      //     };
      //   })
      // );

      // Get bookmarks
      const bookmarkTree = await browser.bookmarks.getTree();
      const bookmarks = flattenBookmarks(bookmarkTree);

      // Process and return sites
      // Process using historyItems directly (Aligned with Chrome)
      const sites = processSites(historyItems, bookmarks);
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
    // Simplified filtering (Aligned with Chrome - check if 'browser://' is needed for Firefox?)
    if (item.url &&
        item.title &&
        !item.url.startsWith('chrome://') && // Match Chrome's filter
        !item.url.startsWith('about:') && // Keep Firefox specific if needed
        !item.url.startsWith('moz-extension://')) { // Keep Firefox specific if needed
      siteMap.set(item.url, {
        title: item.title,
        url: item.url,
        visitCount: item.visitCount || 0, // Use visitCount directly (Aligned with Chrome)
        lastVisit: item.lastVisitTime || Date.now(),
        isBookmark: false,
        selected: false
      });
    }
  });

  // Process bookmarks
  bookmarks.forEach(bookmark => {
    // Simplified filtering for bookmarks (Aligned with Chrome)
    if (bookmark.url &&
        !bookmark.url.startsWith('chrome://') && // Match Chrome's filter
        !bookmark.url.startsWith('about:') && // Keep Firefox specific if needed
        !bookmark.url.startsWith('moz-extension://')) { // Keep Firefox specific if needed
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
    .sort((a, b) => { // Aligned sorting with Chrome
      // Prioritize bookmarked items
      if (a.isBookmark !== b.isBookmark) {
        return a.isBookmark ? -1 : 1;
      }
      // Then sort by visit count
      return b.visitCount - a.visitCount;
    })
    .slice(0, 50); // Return top 50 (Aligned with Chrome)
}
