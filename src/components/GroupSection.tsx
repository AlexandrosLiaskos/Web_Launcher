import React, { useState } from 'react';
import { useWebsiteStore } from '../store/websiteStore';
import { FolderIcon, PlusIcon } from '@heroicons/react/24/outline';
import { CanvasContextMenu } from './CanvasContextMenu';

interface GroupSectionProps {
  onSelect: (website: Website) => void;
  onAddWebsite: () => void;
  onFolderClick: (tag: string) => void;
}

export function GroupSection({ onSelect, onAddWebsite, onFolderClick }: GroupSectionProps) {
  const { websites } = useWebsiteStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Get unique groups (folders)
  const groups = [...new Set(websites.flatMap(w => w.tags))];

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="space-y-2" onContextMenu={handleContextMenu}>
      <div className="text-sm font-medium text-gray-400 mb-2">Groups</div>
      <div className="space-y-1">
        {groups.map(group => {
          const websitesInGroup = websites.filter(w => w.tags.includes(group));
          return (
            <div
              key={group}
              onClick={() => onFolderClick(group)}
              className="group px-2 py-1.5 rounded-lg hover:bg-gray-800/50 cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FolderIcon className="w-4 h-4 text-gray-400 group-hover:text-gray-300" />
                <span className="text-sm text-gray-300 group-hover:text-gray-200">{group}</span>
              </div>
              <span className="text-xs text-gray-500 group-hover:text-gray-400">
                {websitesInGroup.length}
              </span>
            </div>
          );
        })}
      </div>

      {/* Add Website Button */}
      <button 
        onClick={onAddWebsite}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="mt-4 h-16 w-full rounded-xl bg-gray-800/30 flex items-center justify-center hover:bg-blue-500/10 transition-all duration-300 group"
      >
        <div className="flex items-center gap-3">
          <PlusIcon className={`w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-all duration-300 ${isHovered ? 'scale-125 rotate-90' : ''}`} strokeWidth={2.5} />
          <span className="text-sm font-medium text-gray-300 group-hover:text-blue-400 transition-colors">Add Website</span>
        </div>
      </button>

      {/* Add Website Context Menu */}
      {contextMenu && (
        <CanvasContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAddWebsite={onAddWebsite}
        />
      )}
    </div>
  );
}
