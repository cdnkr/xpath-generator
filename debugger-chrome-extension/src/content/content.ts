// Content script that injects React app into shadow DOM
import { renderApp } from '../main';
import styles from '../index.css?inline';

// Create a unique ID for our shadow DOM container
const SHADOW_HOST_ID = 'selector-extension-root';

function createShadowDOM() {
  // Check if already injected
  if (document.getElementById(SHADOW_HOST_ID)) {
    return;
  }

  // Create host element
  const host = document.createElement('div');
  host.id = SHADOW_HOST_ID;
  host.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
  `;

  // Create shadow root
  const shadowRoot = host.attachShadow({ mode: 'open' });

  // Inject styles into shadow DOM
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  shadowRoot.appendChild(styleElement);

  // Create container for React app
  const container = document.createElement('div');
  container.id = 'react-root';
  container.style.cssText = `
    pointer-events: none;
    width: 100%;
    height: 100%;
  `;

  shadowRoot.appendChild(container);
  document.body.appendChild(host);

  // Render React app
  renderApp(container);
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createShadowDOM);
} else {
  createShadowDOM();
}

// Also handle navigation in SPAs
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // Small delay to ensure DOM is ready after navigation
    setTimeout(createShadowDOM, 100);
  }
}).observe(document, { subtree: true, childList: true });
