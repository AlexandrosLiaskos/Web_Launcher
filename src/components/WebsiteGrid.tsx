import { useState } from 'react'
import { Website, useWebsiteStore } from '../store/websiteStore'
import { GlobeAltIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid'
import { TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline'

interface WebsiteGridProps {
  websites: Website[]
  onSelect: (website: Website) => void
  mode?: 'normal' | 'edit' | 'delete'
}

export function WebsiteGrid({ websites, onSelect, mode = 'normal' }: WebsiteGridProps) {
  const { addVisit } = useWebsiteStore()

  const handleSelect = (website: Website) => {
    addVisit(website.id)
    window.open(website.url, '_blank')
  }

  if (websites.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        No matching websites found
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {websites.map((website) => (
        <div
          key={website.id}
          onClick={() => {
            if (mode === 'normal') {
              handleSelect(website)
            } else {
              onSelect(website)
            }
          }}
          className={`bg-gray-800 rounded-lg p-4 transition-all duration-200 cursor-pointer
            ${mode === 'edit' ? 'hover:ring-2 hover:ring-yellow-500 hover:scale-[1.02]' : 
              mode === 'delete' ? 'hover:ring-2 hover:ring-red-500 hover:scale-[1.02]' : 
              'hover:bg-gray-700'}`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-white mb-2">{website.title}</h3>
              <p className="text-gray-400 text-sm truncate">{website.url}</p>
            </div>
            
            {mode === 'normal' && (
              <a
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded ml-2"
                title="Open in new tab"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Mode indicator */}
          {mode !== 'normal' && (
            <div className={`mt-2 text-sm font-medium
              ${mode === 'edit' ? 'text-yellow-500' : 'text-red-500'}`}>
              Click to {mode}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
