import React, { useEffect, useState } from "react";
import { storage, HistoryItem } from "../utils/storage";
import { overlay } from "../utils/overlay";
import { resolveElementFromStoredSelector } from "../utils/selectorResolver";

interface HistoryPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  menuPosition: { x: number; y: number } | null;
  menuSize: { width: number; height: number } | null;
  onPositionChange: (direction: "top" | "bottom") => void;
}

interface EnrichedHistoryItem extends HistoryItem {
  isValid: boolean;
  element: HTMLElement | null;
}

const HistoryPopover: React.FC<HistoryPopoverProps> = ({ 
  isOpen, 
  onClose,
  menuPosition,
  menuSize,
  onPositionChange
}) => {
  const [items, setItems] = useState<EnrichedHistoryItem[]>([]);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const popoverRef = React.useRef<HTMLDivElement>(null);
  
  // Calculate position when menu moves or opens
  useEffect(() => {
    if (!isOpen || !menuPosition || !menuSize) return;

    const POPOVER_SIZE = 384; // w-96 = 24rem = 384px (also max-h-96)
    const GAP = 24; // 6em = 24px gap for connector

    // Calculate available space
    const space = {
      top: menuPosition.y,
      bottom: window.innerHeight - (menuPosition.y + menuSize.height)
    };

    // Find direction with most space
    let direction: "top" | "bottom" = "top";
    
    // Prefer bottom if there's enough space (at least 200px?), otherwise default to top if more space there
    // Or just pick the one with MORE space
    if (space.bottom > space.top) {
      direction = "bottom";
    } else {
      direction = "top";
    }

    // Set position styles based on direction
    const style: React.CSSProperties = {
      position: 'fixed',
      zIndex: 2147483647,
    };

    switch (direction) {
      case "top":
        style.bottom = window.innerHeight - menuPosition.y + GAP;
        style.left = menuPosition.x + (menuSize.width / 2) - (POPOVER_SIZE / 2);
        break;
      case "bottom":
        style.top = menuPosition.y + menuSize.height + GAP;
        style.left = menuPosition.x + (menuSize.width / 2) - (POPOVER_SIZE / 2);
        break;
    }

    // Adjust horizontal alignment to prevent overflow
    const leftVal = style.left as number;
    if (leftVal < 24) style.left = 24;
    if (leftVal + POPOVER_SIZE > window.innerWidth - 24) {
      style.left = window.innerWidth - POPOVER_SIZE - 24;
    }

    setPopoverStyle(style);
    onPositionChange(direction);

  }, [isOpen, menuPosition, menuSize]);

  const [activeItem, setActiveItem] = useState<EnrichedHistoryItem | null>(
    null,
  );
  const [copiedTimestamp, setCopiedTimestamp] = useState<number | null>(null);
  const [copiedSelectorTimestamp, setCopiedSelectorTimestamp] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      const historyItems = await storage.getHistoryItems();

      // Check which items are valid on the current page
      const enriched = historyItems.map((item) => {
        let element: HTMLElement | null = null;
        try {
          element = resolveElementFromStoredSelector(item.selector);
        } catch (e) {
          // Invalid selector or other error
        }

        return {
          ...item,
          isValid: item.pageUrl.includes(window.location.host) && !!element,
          element,
        };
      });

      setItems(enriched);
    } catch (error) {
      console.error("Failed to load history:", error);
      setItems([]);
    }
  };

  const handleCopySelector = async (
    e: React.MouseEvent,
    item: EnrichedHistoryItem,
  ) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.selector);
      setCopiedSelectorTimestamp(item.timestamp);
      setTimeout(() => setCopiedSelectorTimestamp(null), 2000);
    } catch (error) {
      console.error("Failed to copy selector:", error);
    }
  };

  const handleCopyText = async (
    e: React.MouseEvent,
    item: EnrichedHistoryItem,
  ) => {
    e.stopPropagation();
    try {
      if (item.innerText) {
        await navigator.clipboard.writeText(item.innerText);
      } else if (item.element) {
        // Fallback if innerText wasn't saved but element exists
        await navigator.clipboard.writeText(item.element.innerText);
      }
      setCopiedTimestamp(item.timestamp);
      setTimeout(() => setCopiedTimestamp(null), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  const handleRemove = async (
    e: React.MouseEvent,
    item: EnrichedHistoryItem,
  ) => {
    e.stopPropagation();
    await storage.removeHistoryItem(item.timestamp);
    await loadHistory(); // Refresh list
  };

  const handleHighlight = (e: React.MouseEvent, item: EnrichedHistoryItem) => {
    e.stopPropagation();
    if (!item.isValid || !item.element) return;

    // Highlight with gold border
    overlay.highlightHistory(item.element, item.selector);

    // Set active item for copy/remove buttons
    setActiveItem(item);

    // Scroll to element
    item.element.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={popoverRef}
      style={popoverStyle}
      className="rounded-2xl bg-neutral-300/80 p-1 shadow-lg shadow-gray-800/5 ring-1 ring-gray-800/[.075] backdrop-blur-xl"
    >
      <div className="pointer-events-auto flex max-h-96 w-96 max-w-96 flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/90 shadow-lg shadow-gray-800/5 ring-1 ring-gray-800/[.075] backdrop-blur-xl">
        <div className="flex items-center justify-between bg-black/5 p-3">
          <h3 className="font-medium text-neutral-700">
            Selectors for&nbsp;
            <em>
              {window.location.href
                .replace("https://", "")
                .replace("http://", "")
                .slice(0, 25)}
              ...
            </em>
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 transition-colors duration-200 hover:bg-black/5 hover:text-neutral-600"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-2">
          {items.filter((item) => item.isValid).length === 0 ? (
            <div className="py-8 text-center text-neutral-500">
              No saved selectors yet
            </div>
          ) : (
            items
              .filter((item) => item.isValid)
              .map((item, index) => (
                <div
                  key={`${item.timestamp}-${index}`}
                  className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 transition-colors ${
                    activeItem?.timestamp === item.timestamp
                      ? "bg-black/5"
                      : "hover:bg-black/5"
                  }`}
                  onClick={(e) => handleHighlight(e, item)}
                >
                  {item.iconUrl && (
                    <img
                      src={item.iconUrl}
                      alt=""
                      className="h-4 w-4 flex-shrink-0 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs font-medium text-neutral-900">
                      {item.selector}
                    </div>
                    <div className="truncate text-[10px] text-neutral-500">
                      {item.pageUrl}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {/* Copy Selector Button */}
                    <button
                      onClick={(e) => handleCopySelector(e, item)}
                      className={`rounded-lg p-1.5 transition-all duration-200 hover:bg-black/5 ${
                        copiedSelectorTimestamp === item.timestamp
                          ? "text-green-600"
                          : "text-neutral-500 hover:text-neutral-900"
                      }`}
                      title={
                        copiedSelectorTimestamp === item.timestamp
                          ? "Copied!"
                          : "Copy Selector"
                      }
                    >
                      {copiedSelectorTimestamp === item.timestamp ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6 7 17l-5-5" />
                          <path d="m22 10-7.5 7.5L13 16" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            width="14"
                            height="14"
                            x="8"
                            y="8"
                            rx="2"
                            ry="2"
                          />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                      )}
                    </button>

                    {/* Copy Text Button */}
                    <button
                      onClick={(e) => handleCopyText(e, item)}
                      className={`rounded-lg p-1.5 transition-all duration-200 hover:bg-black/5 ${
                        copiedTimestamp === item.timestamp
                          ? "text-green-600"
                          : "text-neutral-500 hover:text-neutral-900"
                      }`}
                      title={
                        copiedTimestamp === item.timestamp
                          ? "Copied!"
                          : "Copy Text"
                      }
                    >
                      {copiedTimestamp === item.timestamp ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6 7 17l-5-5" />
                          <path d="m22 10-7.5 7.5L13 16" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 4v16" />
                          <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
                          <path d="M9 20h6" />
                        </svg>
                      )}
                    </button>

                    {/* Remove Button */}
                    <button
                      onClick={(e) => handleRemove(e, item)}
                      className="rounded-lg p-1.5 text-neutral-400 hover:bg-black/5 hover:text-neutral-900"
                      title="Remove"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPopover;
