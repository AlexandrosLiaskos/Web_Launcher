import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddWebsite: () => void;
}

export function CanvasContextMenu({ x, y, onClose, onAddWebsite }: CanvasContextMenuProps) {
  // Adjust position to keep menu in viewport
  const adjustedPosition = React.useMemo(() => {
    const menuWidth = 160;  // Approximate width of menu
    const menuHeight = 40;  // Approximate height of menu
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    return {
      x: Math.min(x, viewportWidth - menuWidth),
      y: Math.min(y, viewportHeight - menuHeight)
    };
  }, [x, y]);

  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 min-w-[160px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      <div className="py-1">
        <button
          onClick={() => {
            onAddWebsite();
            onClose();
          }}
          className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 hover:text-white flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Add Website
        </button>
      </div>
    </div>
  );
}
