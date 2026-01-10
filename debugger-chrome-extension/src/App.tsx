import { useState, useEffect } from "react";
import Menu from "./components/Menu";
import HistoryPopover from "./components/HistoryPopover";
import { hoverDetector } from "./utils/hoverDetector";
import { overlay } from "./utils/overlay";

function App() {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Handle selection mode changes
  useEffect(() => {
    if (isSelectionMode) {
      hoverDetector.start((element, e) => {
        overlay.highlight(element, e);
      });
    } else {
      hoverDetector.stop();
      // When stopping selection mode, hide the hover overlay
      // We check !isHistoryOpen to avoid hiding if we just switched to history
      // (though history logic handles its own hiding)
      overlay.hide();
    }

    return () => {
      hoverDetector.stop();
    };
  }, [isSelectionMode]);

  // Handle history open/close
  useEffect(() => {
    if (isHistoryOpen) {
      // If history opens, stop selection mode
      setIsSelectionMode(false);
    } else {
      // If history closes, clear any history highlight
      overlay.hide();
    }
  }, [isHistoryOpen]);

  const handleSelectorClick = () => {
    setIsSelectionMode(!isSelectionMode);
    setIsHistoryOpen(false);
  };

  const handleHistoryClick = () => {
    setIsHistoryOpen(!isHistoryOpen);
    // Note: setIsSelectionMode(false) is handled by the useEffect for isHistoryOpen
  };

  return (
    <div className="xpath-generator-app">
      <HistoryPopover 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
      />
      <Menu 
        onSelectorClick={handleSelectorClick}
        onHistoryClick={handleHistoryClick}
        isSelectionActive={isSelectionMode}
        isHistoryOpen={isHistoryOpen}
      />
    </div>
  );
}

export default App;
