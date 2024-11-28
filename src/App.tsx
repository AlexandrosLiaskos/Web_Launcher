import { useState, useEffect, useRef } from 'react'
import { useWebsiteStore, type Website } from './store/websiteStore'
import { WebsiteGrid } from './components/WebsiteGrid'
import { MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, ArrowDownTrayIcon, XMarkIcon, CheckIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/solid'
import { generatePreview } from './utils/preview'
import { AuroraBackground } from './components/ui/AuroraBackground';
import { UserAuth } from './components/UserAuth';
import { auth } from './config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import React from 'react'

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
} as const;

function App() {
  const { websites, loadWebsites, addWebsite, editWebsite: updateWebsite, removeWebsite } = useWebsiteStore()
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

  // Filter websites based on search query
  const filteredWebsites = searchQuery.trim() === '' 
    ? websites 
    : websites.filter(website => 
        website.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        website.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        website.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        website.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        website.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )

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
    };

    // Use capture phase to handle shortcuts before other handlers
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isSearchActive, isCommandMode, filteredCommands, selectedCommandIndex, showModal, showImportModal]);

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
      // Don't trigger shortcuts if we're typing in an input
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        // But allow Escape to work even in input fields
        if (e.key === 'Escape') {
          if (showModal) {
            e.preventDefault();
            handleCloseModal();
          } else if (selectedCommand === 'edit') {
            e.preventDefault();
            setSelectedCommand('search');
            resetStates();
          }
        }
        return;
      }

      // Handle global shortcuts
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showModal) {
          handleCloseModal();
        } else if (selectedCommand === 'edit') {
          setSelectedCommand('search');
          resetStates();
        } else {
          resetStates();
        }
      } else if (e.key === '/' && !isCommandMode && selectedCommand !== 'edit') {
        e.preventDefault();
        activateSearch();
      } else if (e.shiftKey && e.key === ':' && selectedCommand !== 'edit') {
        e.preventDefault();
        activateCommandMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandMode, showModal, showImportModal, selectedCommand]);

  return (
    <AuroraBackground>
      <div className="min-h-screen">
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
                onChange={handleSearchInputChange}
                onKeyDown={handleSearchInputKeyDown}
                placeholder={isCommandMode ? 'Type a command...' : 'Press / to search, Shift+: for commands'}
                className="w-full bg-gray-800 text-white px-4 py-3 pl-12 rounded-lg shadow-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg"
              />
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 text-gray-400">
                <kbd className="px-2 py-1 text-xs bg-gray-700 rounded">
                  {isCommandMode ? 'Shift + :' : '/'}
                </kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          <WebsiteGrid 
            websites={filteredWebsites}
            onSelect={handleWebsiteSelect}
            mode={selectedCommand === 'search' ? 'normal' : selectedCommand}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </main>

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
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                  handleCloseModal();
                }} className="space-y-4">
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
                    <label className="block text-sm font-medium text-gray-300 mb-1">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={editingWebsite.tags?.join(', ') || ''}
                      onChange={(e) => setEditingWebsite(prev => ({ 
                        ...prev, 
                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }))}
                      className="w-full bg-gray-800/90 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="development, tools, productivity"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                    <input
                      type="text"
                      value={editingWebsite.category}
                      onChange={(e) => setEditingWebsite(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-gray-800/90 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Category"
                    />
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
