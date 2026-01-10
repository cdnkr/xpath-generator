export interface HistoryItem {
  selector: string;
  pageUrl: string;
  iconUrl: string;
  timestamp: number;
  innerText: string;
}

export const storage = {
  async saveHistoryItem(item: Omit<HistoryItem, 'timestamp'>): Promise<void> {
    try {
      const newItem: HistoryItem = {
        ...item,
        timestamp: Date.now(),
      };

      const items = await this.getHistoryItems();
      // Add to beginning and limit to last 50 items
      const updatedItems = [newItem, ...items].slice(0, 50);
      
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ history: updatedItems });
      }
    } catch (error) {
      console.error('Failed to save history item:', error);
    }
  },

  async getHistoryItems(): Promise<HistoryItem[]> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['history']);
        return result.history || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get history items:', error);
      return [];
    }
  },

  async removeHistoryItem(timestamp: number): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        const items = await this.getHistoryItems();
        const updatedItems = items.filter(item => item.timestamp !== timestamp);
        await chrome.storage.local.set({ history: updatedItems });
      }
    } catch (error) {
      console.error('Failed to remove history item:', error);
    }
  },

  async clearHistory(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove('history');
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  }
};
