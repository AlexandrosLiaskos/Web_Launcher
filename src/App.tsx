import { useState, useEffect, useRef } from 'react'
import { useWebsiteStore } from './store/websiteStore'
import { WebsiteGrid } from './components/WebsiteGrid'
import { MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, ArrowDownTrayIcon, XMarkIcon, CheckIcon, ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/solid'

type CommandType = 'search' | 'add' | 'edit' | 'delete' | 'import'

interface Command {
  type: CommandType
  icon: typeof MagnifyingGlassIcon
  text: string
  shortcut?: string
  keywords: string[]
}

interface Website {
  id: string
  title: string
  url: string
  description?: string
  tags?: string[]
  category?: string
  favicon?: string
  preview?: string
  frecency: number
  visits: number
  lastVisited: number
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

function App() {
  const { websites, addWebsite, updateWebsite, removeWebsite } = useWebsiteStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)
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
      // Don't handle shortcuts if we're typing in an input field other than search
      if (e.target instanceof HTMLInputElement && e.target !== inputRef.current) {
        return
      }

      // Command palette navigation
      if (searchQuery.startsWith('>') && filteredCommands.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedCommandIndex((prev) => 
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          )
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedCommandIndex((prev) => prev > 0 ? prev - 1 : prev)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          selectCommand(filteredCommands[selectedCommandIndex])
        }
        return
      }

      // Toggle command palette with Cmd/Ctrl + K or :
      if (
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') ||
        (e.key === ':' && e.target !== inputRef.current)
      ) {
        e.preventDefault()
        setIsSearchActive(true)
        setSearchQuery('>')
        setSelectedCommand('search')
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus()
            inputRef.current.setSelectionRange(1, 1)
          }
        }, 0)
      }
      // Toggle search with / or Shift+Enter
      else if (
        (e.key === '/' && e.target !== inputRef.current) ||
        (e.key === 'Enter' && e.shiftKey && e.target !== inputRef.current)
      ) {
        e.preventDefault()
        setIsSearchActive(true)
        setSelectedCommand('search')
        setSearchQuery('')
        setTimeout(() => inputRef.current?.focus(), 0)
      }
      // Clear search with Escape
      else if (e.key === 'Escape') {
        e.preventDefault()
        if (showModal) {
          setShowModal(false)
          setEditingWebsite(DEFAULT_WEBSITE)
        } else if (showImportModal) {
          setShowImportModal(false)
          setBrowserSites([])
        } else {
          setSearchQuery('')
          setIsSearchActive(false)
          setSelectedCommand('search')
          inputRef.current?.blur()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSearchActive, searchQuery, filteredCommands, selectedCommandIndex, showModal, showImportModal])

  // Reset command index when filtered commands change
  useEffect(() => {
    setSelectedCommandIndex(0)
  }, [searchQuery])

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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingWebsite.title || !editingWebsite.url) return

    if (editingWebsite.id) {
      updateWebsite(editingWebsite as Website)
    } else {
      addWebsite({
        ...editingWebsite,
        id: crypto.randomUUID(),
        frecency: 0,
        visits: 0,
        lastVisited: Date.now(),
      } as Website)
    }

    setShowModal(false)
    setEditingWebsite(DEFAULT_WEBSITE)
    setSelectedCommand('search')
  }

  // Fuzzy search implementation
  const fzfSearch = (query: string) => {
    if (!query || query.startsWith('>')) return websites

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

        // Final score is the sum of all term scores plus frecency bonus
        const matchScore = scores.reduce((a, b) => a + b, 0) + (website.frecency / 100)

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
    
    // Create a map of existing URLs for duplicate checking
    const existingUrls = new Set(websites.map(site => site.url))
    
    selectedSites.forEach(site => {
      // Skip if URL already exists
      if (existingUrls.has(site.url)) return
      
      addWebsite({
        title: site.title,
        url: site.url,
        frecency: site.visitCount,
        visits: site.visitCount,
        lastVisited: site.lastVisit,
        tags: [],
      })
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

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Fixed Search Bar */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-gray-800 text-white px-4 py-3 pl-12 rounded-lg shadow-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg transition-all duration-200 ${
                  isSearchActive ? 'opacity-100' : 'opacity-50'
                }`}
                placeholder={
                  selectedCommand === 'search' 
                    ? "Type to search (Shift+Enter, /), commands (⌘K, :)..." 
                    : selectedCommand === 'add'
                    ? "Enter website details..."
                    : selectedCommand === 'edit'
                    ? "Click a website to edit..."
                    : selectedCommand === 'delete'
                    ? "Click a website to delete..."
                    : "Select a website..."
                }
              />
              <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              
              {/* Mode Indicator */}
              {selectedCommand !== 'search' && (
                <div className={`absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium
                  ${selectedCommand === 'edit' ? 'bg-yellow-500/20 text-yellow-500' :
                    selectedCommand === 'delete' ? 'bg-red-500/20 text-red-500' :
                    selectedCommand === 'add' ? 'bg-green-500/20 text-green-500' :
                    'bg-blue-500/20 text-blue-500'}`}>
                  {selectedCommand.charAt(0).toUpperCase() + selectedCommand.slice(1)} Mode
                </div>
              )}
              
              {/* Command Palette */}
              {searchQuery.startsWith('>') && filteredCommands.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg border border-gray-700 shadow-lg overflow-hidden">
                  {filteredCommands.map((command, index) => (
                    <button
                      key={command.type}
                      onClick={() => selectCommand(command)}
                      onMouseEnter={() => setSelectedCommandIndex(index)}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors ${
                        index === selectedCommandIndex ? 'bg-gray-700' : ''
                      }`}
                    >
                      <command.icon className="w-5 h-5 text-gray-400" />
                      <span className="flex-1 text-left text-white">{command.text}</span>
                      {command.shortcut && (
                        <span className="text-sm text-gray-500">{command.shortcut}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <WebsiteGrid 
          websites={fzfSearch(searchQuery)} 
          onSelect={handleWebsiteSelect}
          mode={selectedCommand === 'search' ? 'normal' : selectedCommand}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-20">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[80vh] flex flex-col">
            <h2 className="text-lg font-medium text-white mb-4">
              Import from Browser
            </h2>
            <p className="text-gray-400 max-w-md mb-4">
              This feature requires the Web Launcher browser extension. Please follow these steps:
            </p>
            {importError ? (
              <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-4 mb-4">
                <p className="text-red-400">{importError}</p>
                <div className="mt-4">
                  <h4 className="text-white font-medium mb-2">Installation Instructions:</h4>
                  <p className="text-gray-400 mb-2">For Firefox:</p>
                  <ol className="list-decimal list-inside text-gray-400 mb-4 ml-4">
                    <li>Go to about:debugging</li>
                    <li>Click "This Firefox"</li>
                    <li>Click "Load Temporary Add-on"</li>
                    <li>Select the manifest.json file in the extension-firefox folder</li>
                  </ol>
                  <p className="text-gray-400 mb-2">For Chrome/Edge:</p>
                  <ol className="list-decimal list-inside text-gray-400 ml-4">
                    <li>Go to chrome://extensions/</li>
                    <li>Enable "Developer mode"</li>
                    <li>Click "Load unpacked"</li>
                    <li>Select the extension folder</li>
                  </ol>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 max-w-md">
                Select the sites you want to import from your browser history and bookmarks.
              </p>
            )}
            {importLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            ) : browserSites.length > 0 ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-gray-300">
                    Select the websites you want to import:
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBrowserSites(sites => 
                        sites.map(site => ({ ...site, selected: true }))
                      )}
                      className="px-3 py-1 text-sm text-gray-300 hover:text-white"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setBrowserSites(sites => 
                        sites.map(site => ({ ...site, selected: false }))
                      )}
                      className="px-3 py-1 text-sm text-gray-300 hover:text-white"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="grid gap-2">
                    {browserSites.map((site) => (
                      <div
                        key={site.url}
                        className={`p-3 rounded-lg border ${
                          site.selected 
                            ? 'bg-gray-700 border-blue-500' 
                            : 'bg-gray-800 border-gray-700'
                        } cursor-pointer`}
                        onClick={() => setBrowserSites(sites =>
                          sites.map(s =>
                            s.url === site.url 
                              ? { ...s, selected: !s.selected }
                              : s
                          )
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="pt-0.5">
                            <div className={`w-5 h-5 rounded border ${
                              site.selected
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-500'
                            } flex items-center justify-center`}>
                              {site.selected && (
                                <CheckIcon className="w-4 h-4 text-white" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium truncate">
                              {site.title}
                            </h3>
                            <p className="text-sm text-gray-400 truncate">
                              {site.url}
                            </p>
                            <div className="flex gap-4 mt-1 text-sm text-gray-500">
                              <span>{site.visitCount} visits</span>
                              <span>Last: {new Date(site.lastVisit).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportSelected}
                    disabled={!browserSites.some(site => site.selected)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import Selected
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <ExclamationTriangleIcon className="w-16 h-16 text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Couldn't access browser history
                </h3>
                <p className="text-gray-400 max-w-md">
                  This feature requires browser permissions to access your history.
                  Please make sure you're using a supported browser and have granted the necessary permissions.
                </p>
                {importError && (
                  <p className="text-red-500 mt-4">{importError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-20">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-xl font-semibold text-white mb-4">
                {editingWebsite.id ? 'Edit Website' : 'Add New Website'}
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={editingWebsite.title}
                  onChange={(e) => setEditingWebsite(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={editingWebsite.description}
                  onChange={(e) => setEditingWebsite(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="development, tools, productivity"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <input
                  type="text"
                  value={editingWebsite.category}
                  onChange={(e) => setEditingWebsite(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Category"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingWebsite(DEFAULT_WEBSITE)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {editingWebsite.id ? 'Save Changes' : 'Add Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
