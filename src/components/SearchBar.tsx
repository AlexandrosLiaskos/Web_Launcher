import { useState, useEffect, useRef } from 'react'
import { useWebsiteStore } from '../store/websiteStore'
import { WebsiteGrid } from './WebsiteGrid'
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid'

interface SearchBarProps {
  isVisible: boolean
  onVisibilityChange: (visible: boolean) => void
}

export function SearchBar({ isVisible, onVisibilityChange }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { websites } = useWebsiteStore()

  useEffect(() => {
    if (isVisible) {
      setSearchQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isVisible])

  // Handle Ctrl+Shift+Space to clear search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'Space' && isVisible) {
        e.preventDefault()
        setSearchQuery('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isVisible])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onVisibilityChange(false)
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isVisible, onVisibilityChange])

  // Fuzzy search implementation
  const fzfSearch = (query: string) => {
    if (!query) return []

    const terms = query.toLowerCase().split(' ')
    return websites.filter(website => {
      const searchableText = [
        website.title,
        website.url,
        website.description,
        ...(website.tags || []),
        website.category
      ].join(' ').toLowerCase()

      return terms.every(term =>
        searchableText.split('').some((char, i) => {
          if (char !== term[0]) return false
          let matched = true
          let websiteIndex = i
          for (let termIndex = 0; termIndex < term.length; termIndex++) {
            if (websiteIndex >= searchableText.length || 
                searchableText[websiteIndex] !== term[termIndex]) {
              matched = false
              break
            }
            websiteIndex++
          }
          return matched
        })
      )
    }).sort((a, b) => b.frecency - a.frecency)
  }

  const filteredWebsites = fzfSearch(searchQuery)

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]">
      <div ref={containerRef} className="w-full max-w-3xl mx-4">
        {/* Search Input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800/90 text-white px-4 py-3 pl-12 rounded-lg shadow-lg border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg"
            placeholder="Search websites... (Ctrl+Space)"
          />
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          {searchQuery && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
              Press Ctrl+Shift+Space to clear
            </div>
          )}
        </div>

        {/* Results Grid */}
        {searchQuery && (
          <div className="mt-4 bg-gray-800/90 rounded-lg shadow-lg border border-gray-700 max-h-[60vh] overflow-y-auto">
            <WebsiteGrid 
              websites={filteredWebsites}
              onClose={() => onVisibilityChange(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
