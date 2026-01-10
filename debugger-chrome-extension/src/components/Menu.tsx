import React from 'react';

interface MenuProps {
  onSelectorClick: () => void;
  onHistoryClick: () => void;
  isSelectionActive: boolean;
  isHistoryOpen: boolean;
}

const Menu: React.FC<MenuProps> = ({
  onSelectorClick,
  onHistoryClick,
  isSelectionActive,
  isHistoryOpen
}) => {
  const [isPulsing, setIsPulsing] = React.useState(false);

  React.useEffect(() => {
    const handleItemAdded = () => {
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 400);
    };
    window.addEventListener('selector-item-added', handleItemAdded);
    return () => window.removeEventListener('selector-item-added', handleItemAdded);
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSelectionActive) {
          onSelectorClick();
        } else if (isHistoryOpen) {
          onHistoryClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionActive, isHistoryOpen, onSelectorClick, onHistoryClick]);

  return (
    <div style={{ zIndex: 2147483647 }} className="fixed bottom-6 left-6 rounded-2xl p-1 shadow-lg bg-neutral-300/80 shadow-gray-800/5 ring-1 ring-gray-800/[.075] backdrop-blur-xl">
      {isHistoryOpen && (
        <div className='absolute w-full h-6 -top-6 flex items-center justify-center'>
          <div className='w-1 h-6 bg-neutral-300/80 shadow-gray-800/5 ring-1 ring-gray-800/[.075] backdrop-blur-xl' />
        </div>
      )}
      <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/90 border border-white/50 shadow-lg shadow-gray-800/5 ring-1 ring-gray-800/[.075] backdrop-blur-xl pointer-events-auto">
        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Selector Mode Button */}
          <button
            onClick={onSelectorClick}
            className={`
              size-[40px] rounded-xl 
              flex items-center justify-center 
              transition-all duration-200
              focus:outline-none
              ${isSelectionActive
                ? 'bg-black/10 text-black'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5'
              }
            `}
            title="Selector Mode"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            className={`
              size-[40px] rounded-xl 
              flex items-center justify-center 
              transition-all duration-200
              focus:outline-none
              ${isPulsing
                ? 'bg-black/5 text-black scale-110'
                : isHistoryOpen
                  ? 'bg-black/10 text-black'
                  : 'text-neutral-500 hover:text-neutral-900 hover:bg-black/5'
              }
            `}
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
      </div>
    </div>
  );
};

export default Menu;
