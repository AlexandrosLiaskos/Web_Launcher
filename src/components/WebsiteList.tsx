import { useState, useEffect } from 'react'
import { Website, useWebsiteStore } from '../store/websiteStore'
import { GlobeAltIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid'
import { WebsiteForm } from './WebsiteForm'
import { WebsiteStats } from './WebsiteStats'

interface WebsiteListProps {
  websites: Website[]
  searchQuery: string
  onSelect: (url: string) => void
}

export function WebsiteList({ websites, searchQuery, onSelect }: WebsiteListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null)
  const [selectedWebsite, setSelectedWebsite] = useState<Website | null>(null)
  const { addWebsite, editWebsite, removeWebsite, categories, getWebsiteStats } = useWebsiteStore()

  const filteredWebsites = websites
    .filter(website => 
      website.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      website.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      website.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.frecency - a.frecency)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredWebsites.length - 1 ? prev + 1 : prev
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
      } else if (e.key === 'Enter' && filteredWebsites[selectedIndex]) {
        onSelect(filteredWebsites[selectedIndex].url)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredWebsites, selectedIndex, onSelect])

  useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  const handleAddWebsite = (website: Omit<Website, 'id' | 'frecency' | 'lastVisited' | 'totalVisits' | 'createdAt'>) => {
    addWebsite(website)
    setShowAddForm(false)
  }

  const handleEditWebsite = (website: Omit<Website, 'id' | 'frecency' | 'lastVisited' | 'totalVisits' | 'createdAt'>) => {
    if (editingWebsite) {
      editWebsite(editingWebsite.id, website)
      setEditingWebsite(null)
    }
  }

  const handleRemoveWebsite = (websiteId: string) => {
    if (window.confirm('Are you sure you want to remove this website?')) {
      removeWebsite(websiteId)
    }
  }

  if (filteredWebsites.length === 0 && !showAddForm) {
    return (
      <div className="p-4 text-center bg-gray-800">
        <p className="text-gray-400 mb-4">
          {searchQuery ? 'No matching websites found' : 'No websites added yet'}
        </p>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Website
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="relative bg-gray-800">
        <div className="flex items-center justify-between p-2 border-b border-gray-700">
          <div className="text-sm text-gray-400">
            {filteredWebsites.length} websites found
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {filteredWebsites.map((website, index) => (
            <div
              key={website.id}
              className={`flex items-center p-3 cursor-pointer transition-colors ${
                index === selectedIndex ? 'bg-gray-700' : 'hover:bg-gray-700/50'
              }`}
              onClick={() => setSelectedWebsite(website)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mr-3">
                <GlobeAltIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-white truncate">
                  {website.title}
                </div>
                <div className="text-sm text-gray-400 truncate">
                  {website.url}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingWebsite(website)
                  }}
                  className="p-1 hover:bg-gray-600 rounded-full transition-colors"
                >
                  <PencilIcon className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveWebsite(website.id)
                  }}
                  className="p-1 hover:bg-gray-600 rounded-full transition-colors"
                >
                  <TrashIcon className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddForm && (
        <WebsiteForm
          onSubmit={handleAddWebsite}
          onClose={() => setShowAddForm(false)}
          categories={categories}
        />
      )}

      {editingWebsite && (
        <WebsiteForm
          onSubmit={handleEditWebsite}
          onClose={() => setEditingWebsite(null)}
          initialData={editingWebsite}
          categories={categories}
        />
      )}

      {selectedWebsite && (
        <div className="border-t border-gray-700">
          <WebsiteStats
            website={selectedWebsite}
            stats={getWebsiteStats(selectedWebsite.id)!}
          />
        </div>
      )}
    </>
  )
}
