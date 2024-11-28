import { useState, useEffect, useRef } from 'react'
import { useWebsiteStore, type Website } from './store/websiteStore'
import { WebsiteGrid } from './components/WebsiteGrid'
import { MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, ArrowDownTrayIcon, XMarkIcon, CheckIcon, ExclamationTriangleIcon, TrashIcon, FolderIcon } from '@heroicons/react/24/solid'
import { generatePreview } from './utils/preview'
import { AuroraBackground } from './components/ui/AuroraBackground';
import { UserAuth } from './components/UserAuth';
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import React, { useMemo } from 'react'
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
  category: '',
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
  const { websites, loadWebsites, addWebsite, editWebsite: updateWebsite, removeWebsite, getTags, addGroup } = useWebsiteStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)
  const [isCommandMode, setIsCommandMode] = useState(false)
  const [selectedCommand, setSelectedCommand] = useState<CommandType>('search')
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingWebsite, setEditingWebsite] = useState<Partial<Website>>(DEFAULT_WEBSITE)
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0)
  const [browserSites, setBrowserSites] = useState<BrowserSite[]>([])
  const [showImportModal, setShowImportModal] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState<'normal' | 'group'>('normal')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showTagsModal, setShowTagsModal] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedWebsiteIndex, setSelectedWebsiteIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset states
  const resetStates = (maintainEditMode = false) => {
    setSearchQuery('');
    setIsSearchActive(false);
    setIsCommandMode(false);
    setSelectedCommandIndex(0);
    setShowModal(false);
    setShowImportModal(false);
    if (!maintainEditMode) {
      setSelectedCommand('search');
    }
    document.activeElement instanceof HTMLElement && document.activeElement.blur();
  };

  // Activate search mode
  const activateSearch = () => {
    setIsSearchActive(true);
    setIsCommandMode(false);
    setSearchQuery('');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  // Activate command mode
  const activateCommandMode = () => {
    setIsCommandMode(true);
    setIsSearchActive(true);
    setSearchQuery('>');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(1, 1);
    });
  };

  // Initialize websites when component mounts
  useEffect(() => {
    loadWebsites()
  }, [])

  // Filter websites based on search query and selected tag
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

  // Filter commands based on search
  const getFilteredCommands = () => {
    if (!searchQuery.startsWith('>')) return []
    const query = searchQuery.slice(1).trim().toLowerCase()
    return COMMANDS.filter(cmd => 
      cmd.keywords.some(keyword => keyword.includes(query)) ||
      cmd.text.toLowerCase().includes(query) ||
      (cmd.shortcut && cmd.shortcut.slice(1).toLowerCase().includes(query))
    )
  }

  const filteredCommands = getFilteredCommands()

  // Handle command selection
  const selectCommand = (command: Command) => {
    setSelectedCommand(command.type)
    setSearchQuery('')
    if (command.type === 'add') {
      setEditingWebsite(DEFAULT_WEBSITE)
      setShowModal(true)
    } else if (command.type === 'edit' || command.type === 'delete') {
      // Edit and delete modes will be handled by WebsiteGrid selection
    } else if (command.type === 'import') {
      handleImportCommand()
    }
  }

  // Handle keyboard shortcuts and navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if we're in a modal
      if (showModal || showImportModal) return;

      // Don't trigger shortcuts if we're typing in an input
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        // But allow Escape to work even in input fields
        if (e.key === 'Escape') {
          if (selectedCommand === 'edit') {
            e.preventDefault();
            setSelectedCommand('search');
          }
          resetStates();
        }
        return;
      }

      // Handle global shortcuts
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedCommand === 'edit') {
          setSelectedCommand('search');
        }
        resetStates();
      } else if (e.key === '/' && !isCommandMode) {
        e.preventDefault();
        activateSearch();
      } else if (e.shiftKey && e.key === ':') {
        e.preventDefault();
        activateCommandMode();
      } else if (e.shiftKey && e.key.toLowerCase() === 'g' && !isCommandMode) {
        e.preventDefault();
        setSearchMode(prev => prev === 'normal' ? 'group' : 'normal');
      }

      // Handle forward slash for search
      if (e.key === SHORTCUTS.SEARCH_KEY && 
          !e.ctrlKey && 
          !e.metaKey && 
          !e.altKey && 
          !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        activateSearch();
        return;
      }

      // Handle Shift + : for command mode
      if (e.key === SHORTCUTS.COMMAND_KEY && 
          !e.ctrlKey && 
          !e.metaKey && 
          !e.altKey && 
          e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        activateCommandMode();
        return;
      }

      // Handle @ for tag search
      if (e.key === SHORTCUTS.TAG_SEARCH_KEY && 
          !e.ctrlKey && 
          !e.metaKey && 
          !e.altKey && 
          !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (!searchQuery.startsWith('@')) {
          setSearchQuery('@');
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }
        return;
      }

      // Handle arrow navigation in command mode
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
            if (!e.shiftKey) {
              e.preventDefault();
              const selectedCommand = filteredCommands[selectedCommandIndex];
              if (selectedCommand) {
                selectCommand(selectedCommand);
              }
            }
            break;
        }
      }

      // Handle keyboard navigation for filtered websites
      if (e.key === SHORTCUTS.ESCAPE) {
        e.preventDefault();
        e.stopPropagation();
        resetStates();
      } else if (!isCommandMode && filteredWebsites.length > 0) {
        if (e.altKey) {
          e.preventDefault();
          setSelectedWebsiteIndex(prev => 
            prev >= filteredWebsites.length - 1 ? 0 : prev + 1
          );
        } else if (e.key === SHORTCUTS.ENTER && selectedWebsiteIndex >= 0) {
          e.preventDefault();
          const selectedWebsite = filteredWebsites[selectedWebsiteIndex];
          if (selectedWebsite) {
            window.open(selectedWebsite.url, '_blank');
          }
        }
      }
    };

    // Use capture phase to handle shortcuts before other handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isSearchActive, isCommandMode, filteredCommands, selectedCommandIndex, showModal, showImportModal, filteredWebsites, selectedWebsiteIndex]);

  // Keep selected command in view
  useEffect(() => {
    if (isCommandMode && filteredCommands.length > 0) {
      const commandElement = document.querySelector(`[data-command-index="${selectedCommandIndex}"]`);
      if (commandElement) {
        commandElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedCommandIndex, isCommandMode, filteredCommands.length]);

  // Handle search input changes
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // If the user manually types '/', ignore it
    if (value === SHORTCUTS.SEARCH_KEY) {
      return;
    }
    
    setSearchQuery(value);
    
    // Enter command mode if '>' is typed
    if (value.startsWith('>')) {
      setIsCommandMode(true);
      setSelectedCommandIndex(0);
    } else {
      setIsCommandMode(false);
    }
  };

  // Handle input-specific keyboard events
  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === SHORTCUTS.ESCAPE) {
      e.preventDefault();
      e.stopPropagation();
      resetStates();
    } else if (e.shiftKey && e.key === SHORTCUTS.COMMAND_KEY) {
      e.preventDefault();
      e.stopPropagation();
      activateCommandMode();
    } else if (isCommandMode && filteredCommands.length > 0) {
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
          e.preventDefault();
          const selectedCommand = filteredCommands[selectedCommandIndex];
          if (selectedCommand) {
            selectCommand(selectedCommand);
          }
          break;
      }
    }
  };

  // Handle website selection
  const handleWebsiteSelect = (website: Website) => {
    if (selectedCommand === 'edit') {
      setEditingWebsite(website)
      setShowModal(true)
    } else if (selectedCommand === 'delete') {
      if (window.confirm('Are you sure you want to delete this website?')) {
        removeWebsite(website.id)
      }
    } else {
      window.open(website.url, '_blank')
    }
    // Reset command mode after action
    setSelectedCommand('search')
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingWebsite.title || !editingWebsite.url) return

    try {
      // Generate preview for the website
      const preview = await generatePreview(editingWebsite.url);

      if (editingWebsite.id) {
        // Editing existing website
        const updatedWebsite = {
          ...editingWebsite,
          preview: preview || editingWebsite.preview, // Keep old preview if generation fails
          url: editingWebsite.url.trim(),
          title: editingWebsite.title.trim(),
          tags: editingWebsite.tags?.map(tag => tag.trim()).filter(Boolean) || [],
        };
        updateWebsite(editingWebsite.id, updatedWebsite);
      } else {
        // Adding new website
        const newWebsite = {
          ...editingWebsite,
          preview,
          userId: auth.currentUser?.uid || '',
          tags: editingWebsite.tags || [],
        };
        addWebsite(newWebsite);
      }

      setShowModal(false)
      setEditingWebsite(DEFAULT_WEBSITE)
      setSelectedCommand('search')
    } catch (error) {
      console.error('Error saving website:', error);
    }
  }

  // Fuzzy search implementation
  const fzfSearch = (query: string) => {
    if (!query || query.startsWith('>')) {
      // When no search query, sort by total visits
      return [...websites].sort((a, b) => b.totalVisits - a.totalVisits)
    }

    const terms = query.toLowerCase().split(' ').filter(Boolean)
    
    return websites
      .map(website => {
        const searchableText = [
          website.title,
          website.url,
          website.description,
          ...(website.tags || []),
          website.category
        ].join(' ').toLowerCase()

        // Calculate match score for each term
        const scores = terms.map(term => {
          let score = 0
          let lastIndex = -1
          
          for (let i = 0; i < term.length; i++) {
            const char = term[i]
            const index = searchableText.indexOf(char, lastIndex + 1)
            
            if (index === -1) return 0
            
            // Bonus points for:
            score += 1 // Base score for match
            if (index === lastIndex + 1) score += 2 // Consecutive characters
            if (index === 0 || /\W/.test(searchableText[index - 1])) score += 3 // Start of word
            
            lastIndex = index
          }
          
          return score
        })

        // Website only matches if all terms have a score
        if (scores.some(score => score === 0)) return null

        // Final score is the sum of all term scores plus visit count bonus
        const matchScore = scores.reduce((a, b) => a + b, 0) + (website.totalVisits * 0.1)

        return { website, matchScore }
      })
      .filter(Boolean)
      .sort((a, b) => b!.matchScore - a!.matchScore)
      .map(result => result!.website)
  }

  const handleImportCommand = async () => {
    setImportLoading(true)
    setShowImportModal(true)
    setImportError(null)
    
    try {
      // Extension IDs
      const chromeExtensionId = 'YOUR_CHROME_EXTENSION_ID'
      const firefoxExtensionId = 'web-launcher@example.com'
      
      // Detect browser type
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox')
      const extensionId = isFirefox ? firefoxExtensionId : chromeExtensionId
      
      if (isFirefox) {
        // Firefox - use window.postMessage
        window.postMessage({ type: 'GET_FREQUENT_SITES', target: 'WEB_LAUNCHER_EXTENSION' }, '*')
        
        // Set up one-time message listener for the response
        const messagePromise = new Promise((resolve, reject) => {
          const handleMessage = (event) => {
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
        
        const response = await messagePromise
        if (response.sites) {
          setBrowserSites(response.sites)
        }
      } else {
        // Chrome
        try {
          chrome.runtime.sendMessage(
            extensionId,
            { type: 'GET_FREQUENT_SITES' },
            response => {
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
      setImportError(error.message)
    } finally {
      setImportLoading(false)
    }
  }

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
      
      addWebsite({
        title: site.title,
        url: site.url,
        description: '',
        tags: [],
        category: '',
        preview: undefined,
        userId: currentUser.uid,
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
        const uid = user.uid;
        // ...
      } else {
        // User is signed out
        // ...
      }
    });

    return unsubscribe;
  }, []);

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingWebsite(null);
    // Maintain edit mode by passing true to resetStates
    resetStates(selectedCommand === 'edit');
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if we're in an input or contentEditable
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      if (e.shiftKey && e.key === ':' && !isCommandMode) {
        e.preventDefault();
        setIsCommandMode(true);
        setSelectedCommand('search');
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else if (e.key === '/' && !isCommandMode) {
        e.preventDefault();
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else if (e.key === '@' && !isCommandMode) {
        e.preventDefault();
        setSearchQuery('@');
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandMode]);

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

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Clear selected tag if search is cleared or doesn't match current tag
    if (!value.trim() || (selectedTag && !value.toLowerCase().includes(selectedTag.toLowerCase()))) {
      setSelectedTag(null);
    }
  };

  // Handle keyboard navigation for filtered websites
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === SHORTCUTS.ESCAPE) {
      e.preventDefault();
      e.stopPropagation();
      resetStates();
    } else if (!isCommandMode && filteredWebsites.length > 0) {
      if (e.altKey) {
        e.preventDefault();
        setSelectedWebsiteIndex(prev => 
          prev >= filteredWebsites.length - 1 ? 0 : prev + 1
        );
      } else if (e.key === SHORTCUTS.ENTER && selectedWebsiteIndex >= 0) {
        e.preventDefault();
        const selectedWebsite = filteredWebsites[selectedWebsiteIndex];
        if (selectedWebsite) {
          window.open(selectedWebsite.url, '_blank');
        }
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredWebsites, selectedWebsiteIndex]);

  return (
    <AuroraBackground>
      <div 
        className="min-h-screen"
        onContextMenu={handleContextMenu}
        onKeyDown={(e) => {
          if (e.shiftKey && e.key === ':') {
            e.preventDefault();
            setIsCommandMode(true);
            setSelectedCommand('search');
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }
          // Handle @ for tag search
          else if (e.key === '@') {
            e.preventDefault();
            if (!searchQuery.startsWith('@')) {
              setSearchQuery('@');
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }
          }
        }}
        tabIndex={-1}
      >
        {/* Top Bar with Search and User Info */}
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
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    resetStates();
                  } else if (e.shiftKey && e.key === ':') {
                    e.preventDefault();
                    e.stopPropagation();
                    activateCommandMode();
                  } else if (isCommandMode && filteredCommands.length > 0) {
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
                        e.preventDefault();
                        const selectedCommand = filteredCommands[selectedCommandIndex];
                        if (selectedCommand) {
                          selectCommand(selectedCommand);
                        }
                        break;
                    }
                  }
                }}
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
                onSelect={handleWebsiteSelect} 
                onAddWebsite={() => {
                  setEditingWebsite(DEFAULT_WEBSITE);
                  setShowModal(true);
                }}
                onFolderClick={handleFolderClick}
              />
            </div>

            {/* Main Grid */}
            <div className="flex-1">
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
                <h3 className="text-lg font-semibold text-white mb-4">Add Folder</h3>
                <div className="space-y-2">
                  {getTags().filter(tag => 
                    !websites.some(website => 
                      website.tags.includes(tag)
                    )
                  ).map(tag => (
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
                        {websites.filter(w => w.tags.includes(tag)).length} items
                      </span>
                    </button>
                  ))}
                </div>
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
                  onKeyDown={handleSearchInputKeyDown}
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
                                const newTags = editingWebsite.tags.filter(t => t !== tag);
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
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const input = e.currentTarget;
                              const tag = input.value.trim();
                              if (tag && !editingWebsite?.tags?.includes(tag)) {
                                setEditingWebsite({
                                  ...editingWebsite,
                                  tags: [...(editingWebsite?.tags || []), tag],
                                });
                                input.value = '';
                              }
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
