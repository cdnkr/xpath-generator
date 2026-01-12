import React from "react";

interface MenuProps {
  onSelectorClick: () => void;
  onHistoryClick: () => void;
  isSelectionActive: boolean;
  isHistoryOpen: boolean;
  popoverDirection: "top" | "bottom";
  onPositionChange: (position: { x: number; y: number }, size: { width: number; height: number }) => void;
}

const Menu: React.FC<MenuProps> = ({
  onSelectorClick,
  onHistoryClick,
  isSelectionActive,
  isHistoryOpen,
  popoverDirection,
  onPositionChange,
}) => {
  const [isPulsing, setIsPulsing] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 24, y: window.innerHeight - 80 }); // Initial position bottom-left
  const [isDragging, setIsDragging] = React.useState(false);
  const dragOffset = React.useRef({ x: 0, y: 0 });
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      onPositionChange(position, { width: rect.width, height: rect.height });
    }
  }, [position, onPositionChange]);

  React.useEffect(() => {
    // Reset position on window resize to ensure it stays in view? 
    // Or just let it float. For now, let's keep it simple.
    // Initial position set in state initializer might be off if window size changes before mount?
    // Let's ensure it starts at bottom-left correctly on mount
    setPosition({ x: 24, y: window.innerHeight - 80 });
  }, []);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Calculate new position
        let newX = e.clientX - dragOffset.current.x;
        let newY = e.clientY - dragOffset.current.y;

        // Get menu dimensions from ref
        const width = menuRef.current?.offsetWidth || 0;
        const height = menuRef.current?.offsetHeight || 0;

        // Clamp to window bounds
        // Left bound
        newX = Math.max(0, newX);
        // Right bound
        newX = Math.min(window.innerWidth - width, newX);
        // Top bound
        newY = Math.max(0, newY);
        // Bottom bound
        newY = Math.min(window.innerHeight - height, newY);

        setPosition({
          x: newX,
          y: newY,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.userSelect = ''; // Re-enable selection
    };

    if (isDragging) {
      document.body.style.userSelect = 'none'; // Disable selection
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag on left click
    if (e.button !== 0) return;

    // Check if ref is available
    if (!menuRef.current) return;

    setIsDragging(true);
    // Calculate offset from the top-left of the element
    const rect = menuRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  React.useEffect(() => {
    const handleItemAdded = () => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 400);
    };
    window.addEventListener("selector-item-added", handleItemAdded);
    return () =>
      window.removeEventListener("selector-item-added", handleItemAdded);
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isSelectionActive) {
          onSelectorClick();
        } else if (isHistoryOpen) {
          onHistoryClick();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelectionActive, isHistoryOpen, onSelectorClick, onHistoryClick]);

  return (
    <div
      ref={menuRef}
      style={{
        zIndex: 2147483647,
        left: position.x,
        top: position.y,
        position: 'fixed'
      }}
      className="rounded-2xl bg-neutral-300/80 p-1 shadow-lg shadow-gray-800/5 ring-1 ring-gray-800/[.075] backdrop-blur-xl"
    >
      {isHistoryOpen && (
        <div 
          className={`absolute flex items-center justify-center
            ${popoverDirection === 'top' ? '-top-6 w-full h-6 flex-col' : ''}
            ${popoverDirection === 'bottom' ? '-bottom-6 w-full h-6 flex-col' : ''}
          `}
        >
          <div 
            className={`bg-neutral-300/80 shadow-gray-800/5 ring-1 ring-gray-800/[.075] backdrop-blur-xl h-6 w-1`} 
          />
        </div>
      )}
      <div className="pointer-events-auto flex items-center rounded-2xl overflow-hidden">
        
        {/* Actions */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white border border-white/50 shadow-lg shadow-gray-800/5 ring-1 ring-gray-800/[.075] backdrop-blur-xl">
          {/* Selector Mode Button */}
          <button
            onClick={onSelectorClick}
            className={`flex size-[40px] items-center justify-center rounded-xl transition-all duration-200 focus:outline-none ${isSelectionActive
              ? "bg-black/10 text-black"
              : "text-neutral-500 hover:bg-black/5 hover:text-neutral-900"
              } `}
            title="Selector Mode"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z" />
              <path d="M5 3a2 2 0 0 0-2 2" />
              <path d="M19 3a2 2 0 0 1 2 2" />
              <path d="M5 21a2 2 0 0 1-2-2" />
              <path d="M9 3h1" />
              <path d="M9 21h2" />
              <path d="M14 3h1" />
              <path d="M3 9v1" />
              <path d="M21 9v2" />
              <path d="M3 14v1" />
            </svg>
          </button>

          {/* History Button */}
          <button
            onClick={onHistoryClick}
            className={`flex size-[40px] items-center justify-center rounded-xl transition-all duration-200 focus:outline-none ${isPulsing
              ? "scale-110 bg-black/5 text-black"
              : isHistoryOpen
                ? "bg-black/10 text-black"
                : "text-neutral-500 hover:bg-black/5 hover:text-neutral-900"
              } `}
            title="History"
            id="selector-history-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-list-icon lucide-list"
            >
              <path d="M3 5h.01" />
              <path d="M3 12h.01" />
              <path d="M3 19h.01" />
              <path d="M8 5h13" />
              <path d="M8 12h13" />
              <path d="M8 19h13" />
            </svg>
          </button>
        </div>

        {/* Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`flex self-stretch w-[20px] cursor-grab active:cursor-grabbing items-center justify-center rounded-none text-neutral-600 transition-colors duration-200`}
          title="Drag Menu"
        >
          <svg
            width="10"
            height="25"
            viewBox="0 0 10 25"
            stroke="currentColor"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M2 17C2.55228 17 3 16.5523 3 16C3 15.4477 2.55228 15 2 15C1.44772 15 1 15.4477 1 16C1 16.5523 1.44772 17 2 17Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 10C2.55228 10 3 9.55228 3 9C3 8.44772 2.55228 8 2 8C1.44772 8 1 8.44772 1 9C1 9.55228 1.44772 10 2 10Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 24C2.55228 24 3 23.5523 3 23C3 22.4477 2.55228 22 2 22C1.44772 22 1 22.4477 1 23C1 23.5523 1.44772 24 2 24Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 17C8.55228 17 9 16.5523 9 16C9 15.4477 8.55228 15 8 15C7.44772 15 7 15.4477 7 16C7 16.5523 7.44772 17 8 17Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 10C8.55228 10 9 9.55228 9 9C9 8.44772 8.55228 8 8 8C7.44772 8 7 8.44772 7 9C7 9.55228 7.44772 10 8 10Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 24C8.55228 24 9 23.5523 9 23C9 22.4477 8.55228 22 8 22C7.44772 22 7 22.4477 7 23C7 23.5523 7.44772 24 8 24Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 3C2.55228 3 3 2.55228 3 2C3 1.44772 2.55228 1 2 1C1.44772 1 1 1.44772 1 2C1 2.55228 1.44772 3 2 3Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 3C8.55228 3 9 2.55228 9 2C9 1.44772 8.55228 1 8 1C7.44772 1 7 1.44772 7 2C7 2.55228 7.44772 3 8 3Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Menu;
