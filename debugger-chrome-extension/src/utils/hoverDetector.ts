type HoverCallback = (element: Element | null, e?: MouseEvent) => void;

export class HoverDetector {
  private active: boolean = false;
  private callback: HoverCallback | null = null;
  private lastElement: Element | null = null;
  private handlePointerMoveBound: (e: PointerEvent) => void;
  private handleScrollBound: () => void;
  private handleClickBound: (e: MouseEvent) => void;

  constructor() {
    this.handlePointerMoveBound = this.handlePointerMove.bind(this);
    this.handleScrollBound = this.handleScroll.bind(this);
    this.handleClickBound = this.handleClick.bind(this);
  }

  private isFromExtensionUI(e: MouseEvent): boolean {
    const path = e.composedPath?.() ?? [];

    for (const node of path) {
      if (!(node instanceof Element)) continue;
      if (node.id === 'selector-extension-root') return true;
      if (node.id === 'selector-extension-overlay') return true;
    }

    return false;
  }

  /**
   * Resolve the "real" hovered element, including inside Shadow DOM.
   * - For open shadow roots, the first Element in composedPath() is usually the deep node.
   * - For closed shadow roots, browsers intentionally retarget; composedPath won't expose internals.
   */
  private resolveTargetElement(e: MouseEvent): Element | null {
    const path = e.composedPath?.() ?? [];

    for (const node of path) {
      if (!(node instanceof Element)) continue;

      // Skip our own UI (both light DOM overlay + shadow-hosted controls)
      if (node.id === 'selector-extension-root' || node.id === 'selector-extension-overlay') {
        return null;
      }

      // Prefer the deepest element under the pointer.
      return node;
    }

    const fallback = e.target;
    return fallback instanceof Element ? fallback : null;
  }

  public start(callback: HoverCallback) {
    if (this.active) return;
    this.active = true;
    this.callback = callback;
    // NOTE: We prefer pointermove over mouseover.
    // In practice, mouseover may only fire once when entering a shadow root, and then not
    // for subsequent internal shadow DOM transitions at the document level.
    document.addEventListener('pointermove', this.handlePointerMoveBound, { capture: true, passive: true });
    document.addEventListener('scroll', this.handleScrollBound, { capture: true, passive: true });
    document.addEventListener('click', this.handleClickBound, { capture: true });
  }

  public stop() {
    if (!this.active) return;
    this.active = false;
    this.callback = null;
    this.lastElement = null;
    document.removeEventListener('pointermove', this.handlePointerMoveBound, { capture: true });
    document.removeEventListener('scroll', this.handleScrollBound, { capture: true });
    document.removeEventListener('click', this.handleClickBound, { capture: true });
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.active) return;

    // Ignore the extension's own UI (works for both light DOM and our shadow DOM)
    if (this.isFromExtensionUI(e)) return;

    const target = this.resolveTargetElement(e);
    if (!target) return;

    if (target !== this.lastElement) {
      this.lastElement = target;
      if (this.callback) {
        this.callback(target, e);
      }
    }
  }

  private handleScroll() {
    // Re-emit the last element on scroll to update position
    if (this.active && this.lastElement && this.callback) {
        this.callback(this.lastElement);
    }
  }

  private handleClick(e: MouseEvent) {
    if (!this.active) return;

    // Ignore the extension's own UI
    if (this.isFromExtensionUI(e)) return;

    const target = this.resolveTargetElement(e);
    if (!target) return;

    e.preventDefault();
    e.stopPropagation();
    
    // We no longer save to history on click. The click is just blocked to prevent navigation.
  }
}

export const hoverDetector = new HoverDetector();
