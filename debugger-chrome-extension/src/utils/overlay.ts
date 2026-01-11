import { generateXPath } from '../../../generateXPath';
import { storage } from './storage';
import { getFaviconUrl } from './favicon';

const OVERLAY_ID = 'selector-extension-overlay';

export class Overlay {
  private overlayElement: HTMLElement | null = null;
  private labelElement: HTMLElement | null = null;
  private activeElement: Element | null = null;
  private overlayBounds: DOMRect | null = null;
  private handleDocumentClickBound: (e: MouseEvent) => void;

  constructor() {
    this.handleDocumentClickBound = this.handleDocumentClick.bind(this);
    this.createOverlayElements();
  }

  private createOverlayElements() {
    if (document.getElementById(OVERLAY_ID)) return;

    // Container for overlay elements
    const container = document.createElement('div');
    container.id = OVERLAY_ID;
    container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      pointer-events: none;
      z-index: 2147483646;
    `;

    // Border element
    this.overlayElement = document.createElement('div');
    this.overlayElement.style.cssText = `
      position: absolute;
      border: 2px solid #007AFF;
      border-radius: 6px;
      display: none;
      transition: all 0.1s ease-out;
      box-sizing: border-box;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 2147483646;
    `;

    // Label element
    this.labelElement = document.createElement('div');
    this.labelElement.style.cssText = `
      position: absolute;
      background-color: #007AFF;
      color: white;
      padding: 4px 8px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
      pointer-events: auto;
      display: none;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      z-index: 10;
      transform: translateY(-100%);
      margin-top: -4px;
    `;

    container.appendChild(this.overlayElement);
    container.appendChild(this.labelElement);
    document.body.appendChild(container);
    
    // Add document-level click listener to detect clicks on overlay
    document.addEventListener('click', this.handleDocumentClickBound, { capture: true });
  }

  private handleDocumentClick(e: MouseEvent) {
    // Only handle if overlay is visible and we have bounds
    if (!this.overlayBounds || !this.activeElement) return;
    
    // Don't handle clicks on extension controls
    // Check if the click originated from within the extension's shadow DOM
    const shadowHost = document.getElementById('selector-extension-root');
    if (shadowHost) {
      // Use composedPath to check if the click is from within the shadow DOM
      // When clicking inside shadow DOM, the shadow host will be in the path
      const path = e.composedPath();
      if (path.includes(shadowHost)) {
        return;
      }
    }
    
    // Check if click is within overlay bounds
    const clickX = e.clientX;
    const clickY = e.clientY;
    
    const withinBounds = 
      clickX >= this.overlayBounds.left &&
      clickX <= this.overlayBounds.right &&
      clickY >= this.overlayBounds.top &&
      clickY <= this.overlayBounds.bottom;
    
    if (withinBounds) {
      e.stopPropagation();
      this.handleSave();
    }
  }

  private async handleSave() {
    if (this.activeElement) {
        try {
            const startRect = this.labelElement?.getBoundingClientRect();
            const selector = generateXPath(this.activeElement as HTMLElement);
            const pageUrl = window.location.href;
            const iconUrl = getFaviconUrl();
            const innerText = (this.activeElement as HTMLElement).innerText || '';

            await storage.saveHistoryItem({
                selector,
                pageUrl,
                iconUrl,
                innerText
            });
            console.log('Saved selector:', selector);

            // Trigger animation
            if (startRect) {
                this.animateToHistory(startRect);
            } else {
                window.dispatchEvent(new CustomEvent('selector-item-added'));
            }
        } catch (error) {
            console.error('Failed to save selector:', error);
        }
    }
  }

  public async highlight(element: Element | null, _e?: MouseEvent) {
    this.activeElement = element;
    
    if (!element) {
      this.hide();
      return;
    }

    if (!this.overlayElement || !this.labelElement) {
      this.createOverlayElements();
    }

    const rect = element.getBoundingClientRect();
    const selector = await generateXPath(element as HTMLElement);
    
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const absoluteTop = rect.top + scrollTop;
    const absoluteLeft = rect.left + scrollLeft;

    // Store overlay bounds for click detection
    this.overlayBounds = rect;

    // Reset styles to default blue
    if (this.overlayElement) {
        this.overlayElement.style.border = '2px solid #007AFF';
        this.overlayElement.style.display = 'block';
        this.overlayElement.style.top = `${absoluteTop}px`;
        this.overlayElement.style.left = `${absoluteLeft}px`;
        this.overlayElement.style.width = `${rect.width}px`;
        this.overlayElement.style.height = `${rect.height}px`;
    }
    
    if (this.labelElement) {
        this.labelElement.style.backgroundColor = '#007AFF';
        this.labelElement.style.color = 'white';
        this.labelElement.style.display = 'block';
        this.labelElement.textContent = selector;
        
        let labelTop = absoluteTop;
        // If close to top edge, show below
        if (rect.top < 30) {
            this.labelElement.style.transform = 'translateY(0)';
            this.labelElement.style.marginTop = '4px';
            labelTop = absoluteTop + rect.height;
        } else {
             this.labelElement.style.transform = 'translateY(-100%)';
             this.labelElement.style.marginTop = '-4px';
        }
        this.labelElement.style.top = `${labelTop}px`;
        this.labelElement.style.left = `${absoluteLeft}px`;
    }
  }

  public hide() {
    if (this.overlayElement) this.overlayElement.style.display = 'none';
    if (this.labelElement) this.labelElement.style.display = 'none';
    this.activeElement = null;
    this.overlayBounds = null;
  }

  public highlightHistory(element: HTMLElement, selector: string) {
    this.highlight(element);

    if (this.overlayElement) {
        this.overlayElement.style.border = '2px solid #FFD700';
    }

    if (this.labelElement) {
        this.labelElement.textContent = selector;
        this.labelElement.style.backgroundColor = '#FFD700';
        this.labelElement.style.color = 'black';
    }
  }

  private animateToHistory(startRect: DOMRect) {
    const shadowHost = document.getElementById('selector-extension-root');
    const shadowRoot = shadowHost?.shadowRoot;
    const historyBtn = shadowRoot?.getElementById('selector-history-button');

    // If button not found or hidden, dispatch event immediately
    if (!historyBtn) {
        window.dispatchEvent(new CustomEvent('selector-item-added'));
        return;
    }

    const targetRect = historyBtn.getBoundingClientRect();
    if (targetRect.width < 5) {
         window.dispatchEvent(new CustomEvent('selector-item-added'));
         return;
    }

    const size = 24;
    const startX = startRect.left;
    const startY = startRect.top;
    const endX = targetRect.left + targetRect.width / 2 - size / 2;
    const endY = targetRect.top + targetRect.height / 2 - size / 2;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483647;
    `;
    
    // X Mover (Linear)
    const xMover = document.createElement('div');
    xMover.style.cssText = `
        position: absolute;
        left: ${startX}px;
        top: 0;
        width: ${size}px;
        height: ${size}px;
        transition: transform 600ms linear;
        will-change: transform;
    `;

    // Y Mover (Ease In - Gravity effect)
    const yMover = document.createElement('div');
    yMover.style.cssText = `
        position: absolute;
        left: 0;
        top: ${startY}px;
        width: ${size}px;
        height: ${size}px;
        background-color: #007AFF;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,122,255,0.3);
        transition: transform 600ms cubic-bezier(0.55, 0.055, 0.675, 0.19);
        will-change: transform;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Add SVG icon
    yMover.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m18 16 4-4-4-4"/>
            <path d="m6 8-4 4 4 4"/>
            <path d="m14.5 4-5 16"/>
        </svg>
    `;

    xMover.appendChild(yMover);
    wrapper.appendChild(xMover);
    document.body.appendChild(wrapper);

    // Force layout
    xMover.getBoundingClientRect();

    requestAnimationFrame(() => {
        xMover.style.transform = `translateX(${endX - startX}px)`;
        yMover.style.transform = `translateY(${endY - startY}px)`;
    });

    setTimeout(() => {
        wrapper.remove();
        window.dispatchEvent(new CustomEvent('selector-item-added'));
    }, 600);
  }

  public cleanup() {
    // Remove document-level listener
    document.removeEventListener('click', this.handleDocumentClickBound, { capture: true });
    
    const container = document.getElementById(OVERLAY_ID);
    if (container) {
      container.remove();
    }
    this.overlayElement = null;
    this.labelElement = null;
    this.activeElement = null;
    this.overlayBounds = null;
  }
}

export const overlay = new Overlay();
