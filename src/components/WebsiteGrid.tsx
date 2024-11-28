import { FC, useState, useEffect, useRef } from 'react'
import { Website, useWebsiteStore } from '../store/websiteStore'
import { GlobeAltIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/solid'
import { TrashIcon, PencilSquareIcon, ClipboardIcon } from '@heroicons/react/24/outline'
import { ensureHttps, isValidUrl } from '../utils/url'
import { getFaviconUrl } from '../utils/preview'
import React from 'react'

interface WebsiteGridProps {
  websites: Website[]
  onSelect: (website: Website) => void
  mode: 'normal' | 'edit' | 'delete' | 'search' | 'add' | 'import'
  onEdit: (website: Website) => void
  onDelete: (websiteId: string) => void
  selectedIndex?: number
}

interface ContextMenuProps {
  x: number;
  y: number;
  website: Website;
  onEdit: (website: Website) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, website, onEdit, onDelete, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const menuItems = [
    {
      label: 'Open in New Tab',
      icon: ArrowTopRightOnSquareIcon,
      onClick: () => {
        window.open(website.url, '_blank');
        onClose();
      }
    },
    {
      label: 'Copy URL',
      icon: ClipboardIcon,
      onClick: () => {
        navigator.clipboard.writeText(website.url);
        onClose();
      }
    },
    {
      label: 'Edit',
      icon: PencilSquareIcon,
      onClick: () => {
        onEdit(website);
        onClose();
      }
    },
    {
      label: 'Delete',
      icon: TrashIcon,
      onClick: () => {
        onDelete(website.id);
        onClose();
      },
      className: 'text-red-400 hover:text-red-300'
    }
  ];

  // Adjust position to keep menu in viewport
  const adjustedPosition = {
    x: Math.min(x, window.innerWidth - 200),
    y: Math.min(y, window.innerHeight - menuItems.length * 40)
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 text-sm"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      {menuItems.map((item, index) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={`w-full px-4 py-2 flex items-center space-x-2 hover:bg-gray-700 transition-colors ${
            item.className || 'text-gray-200 hover:text-white'
          }`}
        >
          <item.icon className="w-4 h-4" />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export const WebsiteGrid: FC<WebsiteGridProps> = ({ 
  websites, 
  onSelect, 
  mode, 
  onEdit, 
  onDelete,
  selectedIndex: propSelectedIndex = -1 
}) => {
  const { addVisit } = useWebsiteStore()
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; website: Website } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const isEditMode = mode === 'edit';

  // Close context menu when mode changes
  useEffect(() => {
    setContextMenu(null);
  }, [mode]);

  const handleContextMenu = (e: React.MouseEvent, website: Website) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      website
    });
  };

  const handleSelect = (website: Website) => {
    addVisit(website.id)
    onSelect(website)
  }

  // Scroll selected item into view
  useEffect(() => {
    if (propSelectedIndex >= 0 && gridRef.current) {
      const selectedElement = gridRef.current.children[propSelectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [propSelectedIndex]);

  return (
    <>
      <div 
        ref={gridRef}
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        {websites.map((website, index) => (
          <div
            key={website.id}
            onClick={() => handleSelect(website)}
            onContextMenu={(e) => handleContextMenu(e, website)}
            className={`
              relative group bg-gray-800 rounded-lg overflow-hidden cursor-pointer
              transition-all duration-200 hover:scale-[1.02] hover:shadow-xl
              ${propSelectedIndex === index ? 'ring-2 ring-blue-500 shadow-lg' : ''}
            `}
          >
            <div className="relative">
              {website.preview ? (
                <div className="aspect-video bg-gray-900 relative overflow-hidden">
                  <img
                    src={website.preview}
                    alt={website.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-900 flex items-center justify-center">
                  {website.favicon ? (
                    <img src={website.favicon} alt="" className="w-12 h-12" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                      <span className="text-2xl font-medium text-gray-400">
                        {website.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {isEditMode && (
                <div className="absolute top-2 right-2 flex space-x-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(website);
                    }}
                    className="p-2 bg-yellow-500 rounded-full hover:bg-yellow-600 transition-colors shadow-lg"
                    title="Edit website"
                  >
                    <PencilSquareIcon className="h-4 w-4 text-black" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(website.id);
                    }}
                    className="p-2 bg-red-500 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                    title="Delete website"
                  >
                    <TrashIcon className="h-4 w-4 text-white" />
                  </button>
                </div>
              )}
              {isEditMode && (
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-1 text-xs bg-yellow-500 text-black rounded-md font-medium shadow-lg">
                    EDIT MODE
                  </span>
                </div>
              )}
            </div>
            <div className={`p-4 ${isEditMode ? 'bg-gray-800/90' : ''}`}>
              <h3 className="font-medium text-white mb-1 truncate" title={website.title}>
                {website.title}
              </h3>
              <p className="text-sm text-gray-400 truncate" title={website.url}>
                {website.url}
              </p>
              {website.description && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{website.description}</p>
              )}
              {website.tags && website.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {website.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {isEditMode && (
              <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
            )}
          </div>
        ))}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          website={contextMenu.website}
          onEdit={onEdit}
          onDelete={onDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};
