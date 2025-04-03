import { useState, useEffect, useRef, useCallback, useMemo } from 'react' // Added useCallback
import { useWebsiteStore, type Website, type AddWebsitePayload } from './store/websiteStore' // Import AddWebsitePayload
import { WebsiteGrid } from './components/WebsiteGrid'
import { MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, ArrowDownTrayIcon, XMarkIcon, CheckIcon, ExclamationTriangleIcon, TrashIcon, FolderIcon } from '@heroicons/react/24/solid'
import { generatePreview } from './utils/preview'
import { AuroraBackground } from './components/ui/AuroraBackground';
import { UserAuth } from './components/UserAuth';
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ensureHttps } from './utils/url'; // Added ensureHttps import
// import React, { useMemo } from 'react' // Remove redundant import
import { GroupSection } from './components/GroupSection';
import { CanvasContextMenu } from './components/CanvasContextMenu';

type CommandType = 'search' | 'add' | 'edit' | 'delete' | 'import'

interface Command {
  type: CommandType
  icon: typeof MagnifyingGlassIcon
  text: string
  shortcut?: string
  keywords: string[]
}

interface BrowserSite {
  title: string
  url: string
  visitCount: number
  lastVisit: number
  selected?: boolean
}

const COMMANDS: Command[] = [
  { 
    type: 'import', 
    icon: ArrowDownTrayIcon, 
    text: 'Import from browser', 
    shortcut: '> import',
    keywords: ['import', 'browser', 'chrome', 'firefox', 'history', 'bookmarks']
  },
  { 
    type: 'add', 
    icon: PlusIcon, 
    text: 'Add new website manually', 
    shortcut: '> add',
    keywords: ['add', 'new', 'create', 'website', 'manual']
  },
  { 
    type: 'edit', 
    icon: PencilSquareIcon, 
    text: 'Edit website', 
    shortcut: '> edit',
    keywords: ['edit', 'modify', 'change', 'update']
  },
  {
    type: 'delete',
    icon: TrashIcon,
    text: 'Delete website',
    shortcut: '> delete',
    keywords: ['delete', 'remove', 'trash']
  }
]

const DEFAULT_WEBSITE: Partial<Website> = {
  title: '',
  url: '',
  description: '',
  tags: [],
  // category: '', // Removed unused category field
}

// Keyboard shortcut constants
const SHORTCUTS = {
  SEARCH_KEY: '/',
  COMMAND_KEY: ':',
  ESCAPE: 'Escape',
  ENTER: 'Enter',
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  TAG_SEARCH_KEY: '@',
} as const;

function App() {
  const gridRef = useRef<HTMLDivElement>(null) // Add grid ref
  const { websites, groups, loadWebsitesAndGroups, addWebsite, editWebsite: updateWebsite, removeWebsite, addVisit, getTags, addGroup, getWebsitesByTag, currentUser } = useWebsiteStore() // Re-added addVisit
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [isCommandMode, setIsCommandMode] = useState(false)
  const [selectedCommand, setSelectedCommand] = useState<CommandType>('search')
  // const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null) // Removed unused state
  const [showModal, setShowModal] = useState(false)
  const [editingWebsite, setEditingWebsite] = useState<Partial<Website>>(DEFAULT_WEBSITE)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const [browserSites, setBrowserSites] = useState<BrowserSite[]>([])
  const [showImportModal, setShowImportModal] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  // const [searchMode, setSearchMode] = useState<'normal' | 'group'>('normal') // Removed unused state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showTagsModal, setShowTagsModal] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedWebsiteIndex, setSelectedWebsiteIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset states
  const resetStates = useCallback((maintainEditMode = false) => { // Wrap in useCallback
    setSearchQuery('');
    setIsSearchActive(false);
    setIsCommandMode(false);
    setSelectedCommandIndex(0);
    setShowModal(false);
    setShowImportModal(false);
    if (!maintainEditMode) {
      setSelectedCommand('search');
    }
    // Blur safely
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []); // Add dependencies if needed, seems okay without for now

  // Activate search mode
  const activateSearch = useCallback(() => { // Wrap in useCallback
    setIsSearchActive(true);
    setIsCommandMode(false);
    // setSearchMode('normal'); // Removed: searchMode state removed
    setSelectedTag(null);   // Ensure tag reset
    setSearchQuery('');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []); // Add dependencies if needed

  // Activate command mode
  const activateCommandMode = useCallback(() => { // Wrap in useCallback
    setIsCommandMode(true);
    setIsSearchActive(true);
    setSearchQuery('>');
    setSelectedCommandIndex(0);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      // Move cursor after '>'
      inputRef.current?.setSelectionRange(1, 1);
    });
  }, []); // Add dependencies if needed

  // Initialize websites when component mounts
  useEffect(() => {
    // Load data only when currentUser is available (currentUser is the user ID string or null)
    if (currentUser) {
      loadWebsitesAndGroups(currentUser); // Pass the userId
    }
    // Intentionally not resetting websites/groups on logout here,
    // as setCurrentUser in the store handles that.
  }, [currentUser, loadWebsitesAndGroups]); // Depend on currentUser

  // Filter websites based on search query and selected tag
  const handleWebsiteSelect = (website: Website) => {
     // Always add visit when selected/opened
     // Always add visit when selected/opened
     addVisit(website.id); // Re-enabled addVisit call

     if (selectedCommand === 'edit') {
       setEditingWebsite(website)
       setShowModal(true)
     } else if (selectedCommand === 'delete') {
       // Maybe add a confirmation modal later instead of window.confirm
       if (window.confirm(`Are you sure you want to delete "${website.title}"?`)) {
         removeWebsite(website.id)
       }
       // Stay in delete mode until Escape or another command is chosen
     } else {
       // Default action: open in new tab
       window.open(ensureHttps(website.url), '_blank') // Ensure URL has https
       // Optionally reset search/command mode after opening
       // resetStates();
     }
     // Don't reset command mode automatically here for edit/delete
     // Let Escape or explicit command change handle it
     // setSelectedCommand('search')
   }

  const handleImportCommand = useCallback(async () => { // Wrap in useCallback if deps are stable
    setImportLoading(true)
    setShowImportModal(true)
    setImportError(null)

    try {
      // Extension IDs
      const chromeExtensionId = import.meta.env.VITE_CHROME_EXTENSION_ID || ''; // Use environment variable or fallback
      const firefoxExtensionId = 'web-launcher@example.com'

      // Detect browser type
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox')
      const extensionId = isFirefox ? firefoxExtensionId : chromeExtensionId

      if (isFirefox) {
        // Firefox - use window.postMessage
        window.postMessage({ type: 'GET_FREQUENT_SITES', target: 'WEB_LAUNCHER_EXTENSION' }, '*')

        // Set up one-time message listener for the response
        const messagePromise = new Promise((resolve, reject) => {
          const handleMessage = (event: any) => { // Ensure type any
            if (event.data && event.data.source === 'WEB_LAUNCHER_EXTENSION') {
              window.removeEventListener('message', handleMessage)
              if (event.data.success) {
                resolve(event.data)
              } else {
                reject(new Error(event.data.error || 'Failed to get browser sites'))
              }
            }
          }
          window.addEventListener('message', handleMessage)

          // Timeout after 5 seconds
          setTimeout(() => {
            window.removeEventListener('message', handleMessage)
            reject(new Error('Extension communication timed out. Please make sure the extension is installed.'))
          }, 5000)
        })

        const response: any = await messagePromise // Ensure cast to any
        if (response.sites) {
          setBrowserSites(response.sites)
        }
      } else {
        // Chrome
        try {
          chrome.runtime.sendMessage(
            extensionId,
            { type: 'GET_FREQUENT_SITES' },
            (response: any) => { // Cast to any
              if (chrome.runtime.lastError) {
                throw new Error('Please install the Web Launcher extension for Chrome')
              }
              if (response.success) {
                setBrowserSites(response.sites)
              } else {
                throw new Error(response.error || 'Failed to get browser sites')
              }
            }
          )
        } catch (error) {
          console.error('Chrome extension error:', error)
          throw new Error('Please install the Web Launcher extension for Chrome')
        }
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportError((error as Error).message) // Ensure cast to Error
    } finally {
      setImportLoading(false)
    }
  }, []) // Empty dependency array assuming no external state needed inside, adjust if necessary

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingWebsite(DEFAULT_WEBSITE); // Use DEFAULT_WEBSITE instead of null
    // Maintain edit mode by passing true to resetStates
    resetStates(selectedCommand === 'edit');
  };


  const filteredWebsites = useMemo(() => {
    let filtered = websites;

    // Filter by selected tag if any
    if (selectedTag) {
      filtered = filtered.filter(website => website.tags.includes(selectedTag));
    } 
    // Apply search filter
    else if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      // Check if search query starts with "@"
      if (query.startsWith('@')) {
        const tagQuery = query.slice(1).trim();
        filtered = filtered.filter(website =>
          website.tags.some(tag => tag.toLowerCase().includes(tagQuery))
        );
        // If exact match found, set the selected tag
        const exactMatch = [...new Set(websites.flatMap(w => w.tags))]
          .find(tag => tag.toLowerCase() === tagQuery);
        if (exactMatch && !selectedTag) {
          setSelectedTag(exactMatch);
        }
      } else {
        filtered = filtered.filter(website =>
          website.title.toLowerCase().includes(query) ||
          website.url.toLowerCase().includes(query) ||
          website.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
    }

    return filtered;
  }, [websites, searchQuery, selectedTag]);

  // Reset selected website index when filtered websites change
  useEffect(() => {
    // Always select the first website if there are any
    setSelectedWebsiteIndex(filteredWebsites.length > 0 ? 0 : -1);
  }, [filteredWebsites]);

  // Filter commands based on search (Old version removed, useCallback version below is kept)

  // Filter commands based on search (wrapped in useCallback)
  const getFilteredCommands = useCallback(() => { // Wrap in useCallback
    if (!isCommandMode || !searchQuery.startsWith('>')) return [];
    const query = searchQuery.slice(1).trim().toLowerCase();
    return COMMANDS.filter(cmd =>
      cmd.keywords.some(keyword => keyword.includes(query)) ||
      cmd.text.toLowerCase().includes(query) ||
      (cmd.shortcut && cmd.shortcut.slice(1).toLowerCase().includes(query))
    );
  }, [searchQuery, isCommandMode]);

  const filteredCommands = useMemo(() => getFilteredCommands(), [getFilteredCommands]); // useMemo for filteredCommands


  // Handle command selection
  const selectCommand = useCallback((command: Command) => { // Wrap in useCallback
    setSelectedCommand(command.type);
    setSearchQuery('');
    setIsCommandMode(false); // Exit command mode after selection
    setIsSearchActive(false); // Deactivate search bar visually

    if (command.type === 'add') {
      setEditingWebsite(DEFAULT_WEBSITE);
      setShowModal(true);
    } else if (command.type === 'edit') {
      // 'edit' command is now active, user needs to click a website
      // Optionally, prompt user or highlight grid
    } else if (command.type === 'delete') {
       // 'delete' command is now active
    } else if (command.type === 'import') {
      // Edit and delete modes will be handled by WebsiteGrid selection
      handleImportCommand(); // Assuming handleImportCommand is stable or wrapped in useCallback
    }
    // Blur input after command selection
     if (document.activeElement instanceof HTMLElement) {
       document.activeElement.blur();
     }
  }, [handleImportCommand]); // Add dependencies

  // Centralized Keyboard Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement ||
                             activeElement instanceof HTMLTextAreaElement ||
                             (activeElement instanceof HTMLElement && activeElement.isContentEditable);

      // --- Global Escape ---
      if (e.key === SHORTCUTS.ESCAPE) {
        e.preventDefault();
        e.stopPropagation();
        if (showModal || showImportModal) {
           handleCloseModal(); // Or specific close logic for import modal
           setShowImportModal(false); // Ensure import modal closes
        } else if (contextMenu) {
            setContextMenu(null);
        } else if (isCommandMode || isSearchActive || selectedTag) {
          resetStates();
        } else if (selectedCommand === 'edit' || selectedCommand === 'delete') {
          setSelectedCommand('search'); // Exit edit/delete mode
        } else {
          resetStates(); // General reset
        }
        return; // Escape handled, stop processing
      }

      // --- Modal/Context Menu Active: Stop further processing ---
      if (showModal || showImportModal || contextMenu) return;

      // --- Input Focused ---
      if (isInputFocused) {
        // Inside Input: Handle navigation/submission within command palette or website selection
        if (isCommandMode && filteredCommands.length > 0) {
          switch (e.key) {
            case SHORTCUTS.UP:
              e.preventDefault();
              setSelectedCommandIndex(prev =>
                prev > 0 ? prev - 1 : filteredCommands.length - 1
              );
              break;
            case SHORTCUTS.DOWN:
              e.preventDefault();
              setSelectedCommandIndex(prev =>
                prev < filteredCommands.length - 1 ? prev + 1 : 0
              );
              break;
            case SHORTCUTS.ENTER:
              if (!e.shiftKey) { // Allow Shift+Enter for other purposes if needed
                 e.preventDefault();
                 const selectedCmd = filteredCommands[selectedCommandIndex];
                 if (selectedCmd) {
                   selectCommand(selectedCmd);
                 }
              }
              break;
            // Escape is handled globally above
          }
        } else if (isSearchActive && !isCommandMode && filteredWebsites.length > 0) {
             // Potentially handle arrow keys for website selection WHILE typing?
             // Maybe just Enter?
             if (e.key === SHORTCUTS.ENTER && selectedWebsiteIndex >= 0) {
                 e.preventDefault();
                 const website = filteredWebsites[selectedWebsiteIndex];
                 if (website) {
                     handleWebsiteSelect(website); // Use existing select handler
                 }
             }
        }
        return; // Input handled, stop further global shortcuts
      }

      // --- Global Shortcuts (Input NOT Focused) ---
      if (e.key === SHORTCUTS.SEARCH_KEY && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        activateSearch();
      } else if (e.key === SHORTCUTS.COMMAND_KEY && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        activateCommandMode();
      } else if (e.key === SHORTCUTS.TAG_SEARCH_KEY && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
         e.preventDefault();
         // Activate search, set query to '@', focus input
         setIsSearchActive(true);
         setIsCommandMode(false);
         setSearchQuery('@');
         requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(1, 1); // Cursor after @
         });
      } else if (e.key === SHORTCUTS.UP && !isCommandMode && filteredWebsites.length > 0) {
         e.preventDefault();
         setSelectedWebsiteIndex(prev => (prev <= 0 ? filteredWebsites.length - 1 : prev - 1));
      } else if (e.key === SHORTCUTS.DOWN && !isCommandMode && filteredWebsites.length > 0) {
         e.preventDefault();
         setSelectedWebsiteIndex(prev => (prev >= filteredWebsites.length - 1 ? 0 : prev + 1));
      } else if (e.key === SHORTCUTS.ENTER && !isCommandMode && selectedWebsiteIndex >= 0 && filteredWebsites.length > 0) {
         e.preventDefault();
         const website = filteredWebsites[selectedWebsiteIndex];
         if (website) {
            handleWebsiteSelect(website); // Use existing select handler
         }
      }
      // Add other global shortcuts here if needed (like Shift+G)
      else if (e.shiftKey && e.key.toLowerCase() === 'g' && !isCommandMode) {
         e.preventDefault();
         // setSearchMode(prev => prev === 'normal' ? 'group' : 'normal'); // Removed: searchMode state removed
      }

    };

    // Use capture phase to potentially catch keys before other elements
    // but be mindful of potential conflicts. Standard bubbling might be safer.
    // Let's try standard bubbling first.
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);

  }, [
    isSearchActive, isCommandMode, filteredCommands, selectedCommandIndex,
    showModal, showImportModal, contextMenu, filteredWebsites, selectedWebsiteIndex,
    selectedTag, selectedCommand,
    resetStates, activateSearch, activateCommandMode, selectCommand, handleCloseModal, handleWebsiteSelect // Include methods used inside
  ]);

  // Keep selected command in view
  useEffect(() => {
    if (isCommandMode && filteredCommands.length > 0) {
      const commandElement = document.querySelector(`[data-command-index="${selectedCommandIndex}"]`);
      if (commandElement) {
        commandElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedCommandIndex, isCommandMode, filteredCommands]);

  useEffect(() => {
     if (!isCommandMode && selectedWebsiteIndex >= 0 && filteredWebsites.length > 0) {
        // Ensure gridRef exists and has children
        const gridElement = gridRef.current; // Assuming you have a ref on the WebsiteGrid container
        if (gridElement && gridElement.children.length > selectedWebsiteIndex) {
           const websiteElement = gridElement.children[selectedWebsiteIndex] as HTMLElement;
           websiteElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
     }
  }, [selectedWebsiteIndex, filteredWebsites, isCommandMode]); // Add gridRef to dependencies if needed

  // Handle search input changes (Replaced with new logic below)
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // Enter/Exit command mode based on '>'
    if (value.startsWith('>')) {
      if (!isCommandMode) {
         setIsCommandMode(true);
         setSelectedCommandIndex(0); // Reset command selection
      }
    } else {
       if (isCommandMode) {
           setIsCommandMode(false);
       }
       // Clear selected tag if user clears search or removes '@'
       if (selectedTag && (!value.trim() || !value.startsWith('@'))) {
           setSelectedTag(null);
       } else if (value.startsWith('@')) {
           // Logic to potentially auto-select tag is in filteredWebsites useMemo
       }
    }
  };

  // Handle input-specific keyboard events (REMOVED - Merged into main handler)

  // Original handleWebsiteSelect moved up

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Ensure title and url exist and are strings
    if (!editingWebsite.title?.trim() || !editingWebsite.url?.trim()) return

    try {
      // Generate preview for the website (assuming URL is valid now)
      const preview = await generatePreview(editingWebsite.url);

      // Prepare payload base, ensuring required fields are strings
      const basePayload = {
        ...editingWebsite,
        title: editingWebsite.title.trim(),
        url: editingWebsite.url.trim(),
        preview: preview || editingWebsite.preview, // Keep old preview if generation fails
        tags: editingWebsite.tags?.map(tag => tag.trim()).filter(Boolean) || [],
      };

      // Create specific payloads for add or update
      const payloadForStore: Partial<Website> = { ...basePayload };

      // Remove fields managed by the store or not allowed in updates/adds
      delete payloadForStore.id;
      delete payloadForStore.userId;
      delete payloadForStore.visits;
      delete payloadForStore.createdAt;
      delete payloadForStore.lastVisit;
      delete payloadForStore.deleted;
      delete payloadForStore.deletedAt;

      if (editingWebsite.id) {
        // Editing existing website: Pass allowed fields to updateWebsite
        updateWebsite(editingWebsite.id, payloadForStore);
      } else {
        // Adding new website: Pass payload matching AddWebsitePayload
        addWebsite(payloadForStore as AddWebsitePayload);
      }

      setShowModal(false)
      setEditingWebsite(DEFAULT_WEBSITE) // Reset with default
      setSelectedCommand('search')
    } catch (error) {
      console.error('Error saving website:', error);
      // Optionally add user feedback here (e.g., toast notification)
    }
  }

  // Fuzzy search implementation (REMOVED)

  // Original handleImportCommand moved up

  const handleImportSelected = () => {
    const selectedSites = browserSites.filter(site => site.selected)
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      setImportError('You must be logged in to import websites');
      return;
    }
    
    // Create a map of existing URLs for duplicate checking
    const existingUrls = new Set(websites.map(site => site.url))
    
    selectedSites.forEach(site => {
      // Skip if URL already exists
      if (existingUrls.has(site.url)) return
      
      // Call addWebsite with AddWebsitePayload
      // The store now handles setting userId, createdAt, visits etc.
      addWebsite({
        title: site.title,
        url: site.url,
        description: '', // Default or potentially add description if available
        tags: [], // Default or potentially add tags if available
        // category: '', // Removed category
        preview: undefined, // Default or potentially add preview if available
        favicon: undefined, // Default or potentially add favicon if available
      });
    })

    setShowImportModal(false)
    setBrowserSites([])
    setSelectedCommand('search')
  }

  // Handle website deletion
  const handleDelete = (websiteId: string) => {
    if (window.confirm('Are you sure you want to delete this website?')) {
      removeWebsite(websiteId)
    }
  }

  // Handle website edit
  const handleEdit = (website: Website) => {
    setEditingWebsite(website)
    setShowModal(true)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        // const uid = user.uid; // Removed unused uid variable
        // ...
      } else {
        // User is signed out
        // ...
      }
    });

    return unsubscribe;
  }, []);

  // Handle modal close
  // Original handleCloseModal moved up

  // Handle keyboard shortcuts (REMOVED - Merged into main handler)

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    // Only show context menu if clicking on the main container or empty space
    const target = e.target as HTMLElement;
    if (target.closest('.website-card') || target.closest('.folder-item') || target.closest('.group-section')) {
      return;
    }
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Handle folder click
  const handleFolderClick = (tag: string) => {
    // If clicking the same tag, clear the filter
    if (selectedTag === tag) {
      setSelectedTag(null);
      setSearchQuery('');
    } else {
      setSelectedTag(tag);
      // Set search query to show the tag search with @
      setSearchQuery(`@${tag}`);
    }
  };

  // Removed unused handleSearchChange function

  // Handle keyboard navigation for filtered websites (REMOVED - Merged into main handler)

  return (
    <AuroraBackground>
      <div
        className="min-h-screen outline-none" // Add outline-none to prevent focus ring on main div
        onContextMenu={handleContextMenu}
        // removed onKeyDown prop
        tabIndex={-1} // Keep tabIndex if you need the div itself to be focusable for some reason
      >
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 shadow-lg">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-semibold">Web Launcher</h1>
              <UserAuth />
            </div>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange} // Use the updated handler
                // Remove onKeyDown here, handled globally
                placeholder={isCommandMode ? 'Type a command...' : 'Press / to search, @ for tags, Shift+: for commands'}
                className="w-full bg-gray-800 text-white px-4 py-3 pl-12 rounded-lg shadow-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg"
              />
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          <div className="flex gap-6">
            {/* Left Sidebar */}
            <div className="w-64 flex-shrink-0 group-section">
              <GroupSection 
                // onSelect prop removed as it's unused in GroupSection
                onAddWebsite={() => {
                  setEditingWebsite(DEFAULT_WEBSITE);
                  setShowModal(true);
                }}
                onFolderClick={handleFolderClick}
              />
            </div>

            {/* Main Grid - Add ref here */}
            <div className="flex-1" ref={gridRef}> {/* Add ref={gridRef} */}
              {selectedCommand === 'search' || selectedCommand === 'edit' || selectedCommand === 'delete' ? (
                <>
                  {selectedTag && (
                    <div className="mb-4 flex items-center gap-2">
                      <div className="px-3 py-1.5 bg-gray-800 rounded-lg flex items-center gap-2">
                        <FolderIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-200">{selectedTag}</span>
                        <button
                          onClick={() => {
                            setSelectedTag(null);
                            setSearchQuery('');
                          }}
                          className="ml-2 text-gray-400 hover:text-gray-300"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  <WebsiteGrid 
                    websites={filteredWebsites}
                    onSelect={handleWebsiteSelect}
                    mode={selectedCommand}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    selectedIndex={selectedWebsiteIndex}
                  />
                </>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  No results found
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Context Menu */}
        {contextMenu && (
          <CanvasContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onAddWebsite={() => {
              setEditingWebsite(DEFAULT_WEBSITE);
              setShowModal(true);
            }}
            onConvertTagToFolder={() => setShowTagsModal(true)}
          />
        )}

        {/* Tags Modal */}
        {showTagsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-xl max-w-md w-full border border-gray-700">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Convert Tag to Folder</h3>
                <div className="space-y-2">
                  {getTags().filter(tag =>
                     // Show tags that don't already exist as a group name
                     !groups.some(group => group.name === tag)
                  ).map(tag => ( // NEW LOGIC: Filters based on existing group names
                    <button
                      key={tag}
                      onClick={() => {
                        addGroup(tag);
                        setShowTagsModal(false);
                      }}
                      className="w-full text-left px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-between group"
                    >
                      <span className="text-gray-200 group-hover:text-white">{tag}</span>
                      <span className="text-sm text-gray-400">
                        {/* Show how many items HAVE this tag */}
                        {getWebsitesByTag(tag).length} items
                      </span>
                    </button>
                  ))}
                 </div>
                 {/* Optional: Add message if all tags are already groups */}
                 {getTags().length > 0 && getTags().every(tag => groups.some(g => g.name === tag)) && (
                    <p className="text-gray-400 text-center py-4">All tags have been converted to groups.</p>
                 )}
                 {getTags().length === 0 && (
                  <p className="text-gray-400 text-center py-4">No tags available to convert</p>
                )}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowTagsModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Command Palette */}
        {isCommandMode && filteredCommands.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-xl w-full overflow-hidden">
              {/* Search Input */}
              <div className="p-4 border-b border-gray-700">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  // Removed handleSearchInputKeyDown prop
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type a command..."
                />
              </div>

              {/* Commands List */}
              <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {filteredCommands.map((command, index) => (
                  <button
                    key={command.type}
                    data-command-index={index}
                    onClick={() => selectCommand(command)}
                    onMouseEnter={() => setSelectedCommandIndex(index)}
                    className={`w-full px-4 py-3 flex items-center space-x-3 hover:bg-gray-700 transition-colors ${
                      index === selectedCommandIndex ? 'bg-gray-700' : ''
                    }`}
                    role="option"
                    aria-selected={index === selectedCommandIndex}
                  >
                    <command.icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{command.text}</span>
                    {command.shortcut && (
                      <kbd className="px-2 py-1 text-xs bg-gray-900 rounded text-gray-400 flex-shrink-0 ml-2">
                        {command.shortcut}
                      </kbd>
                    )}
                  </button>
                ))}
              </div>

              {/* Quick Help */}
              <div className="px-4 py-2 bg-gray-900/50 border-t border-gray-700">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">↑↓</kbd>
                      <span>Navigate</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">Enter</kbd>
                      <span>Select</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-xs">Esc</kbd>
                      <span>Cancel</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {editingWebsite ? 'Edit Website' : 'Add Website'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                    <input
                      type="text"
                      value={editingWebsite.title}
                      onChange={(e) => setEditingWebsite(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-gray-800/90 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Website Title"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
                    <input
                      type="url"
                      value={editingWebsite.url}
                      onChange={(e) => setEditingWebsite(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full bg-gray-800/90 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="https://example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                    <textarea
                      value={editingWebsite.description}
                      onChange={(e) => setEditingWebsite(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full bg-gray-800/90 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Website description..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Tags</label>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {editingWebsite?.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-700 text-gray-300 rounded-full text-sm flex items-center"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = editingWebsite.tags?.filter(t => t !== tag) || []; // Ensured optional chaining
                                setEditingWebsite({ ...editingWebsite, tags: newTags });
                              }}
                              className="ml-1 text-gray-400 hover:text-gray-200"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder="Type tag name and press Enter ↵"
                          className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            // Prevent global Enter shortcut from triggering when adding tags
                            if (e.key === 'Enter') {
                              e.stopPropagation(); // Stop Enter bubbling up to global handler
                              e.preventDefault();
                              const input = e.currentTarget;
                              const tag = input.value.trim();
                              if (tag && !editingWebsite?.tags?.includes(tag)) {
                                setEditingWebsite(prev => ({ // Ensure prev is not null
                                    ...prev,
                                    tags: [...(prev?.tags || []), tag],
                                }));
                                input.value = '';
                              }
                            } else if (e.key === 'Escape') {
                                // Allow Escape to close modal (handled globally)
                            }
                          }}
                        />
                      </div>
                      {/* Existing Tags Suggestions */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {getTags()
                          .filter(tag => !editingWebsite?.tags?.includes(tag))
                          .map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                setEditingWebsite({
                                  ...editingWebsite,
                                  tags: [...(editingWebsite?.tags || []), tag],
                                });
                              }}
                              className="px-2 py-1 bg-gray-700 text-gray-400 rounded-full text-sm hover:bg-gray-600 hover:text-gray-200"
                            >
                              + {tag}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {editingWebsite ? 'Save Changes' : 'Add Website'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="p-6 flex-shrink-0 border-b border-gray-700">
                <h2 className="text-xl font-semibold text-white">Import from Browser</h2>
              </div>
              
              <div className="p-6 overflow-y-auto flex-grow">
                {importError && (
                  <div className="mb-4 p-4 bg-red-900/50 text-red-200 rounded-lg flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    <span>{importError}</span>
                  </div>
                )}
                
                {browserSites.length > 0 ? (
                  <div className="space-y-4">
                    {browserSites.map((site, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          site.selected
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-gray-700 hover:border-gray-600'
                        } cursor-pointer transition-colors`}
                        onClick={() => setBrowserSites(sites =>
                          sites.map((s, i) =>
                            i === index ? { ...s, selected: !s.selected } : s
                          )
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border ${
                            site.selected ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
                          } flex items-center justify-center`}>
                            {site.selected && <CheckIcon className="w-4 h-4 text-white" />}
                          </div>
                          <div className="flex-grow min-w-0">
                            <h3 className="font-medium text-white truncate">{site.title || site.url}</h3>
                            <p className="text-sm text-gray-400 truncate">{site.url}</p>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <div>Visits: {site.visitCount}</div>
                            <div>Last: {new Date(site.lastVisit).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    {importLoading ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        <span>Loading browser data...</span>
                      </div>
                    ) : (
                      'No browser data available'
                    )}
                  </div>
                )}
              </div>
              
              <div className="p-6 flex-shrink-0 border-t border-gray-700 flex justify-between">
                <button
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  onClick={() => {
                    setShowImportModal(false);
                    setBrowserSites([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleImportSelected}
                  disabled={!browserSites.some(site => site.selected)}
                >
                  Import Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuroraBackground>
  )
}

export default App
