/**
 * Resolves selectors produced by `generateXPath()` into an element on the current page.
 *
 * Supported formats:
 * - Plain XPath:
 *     `//div[@id='foo']`
 *
 * - Shadow-compound selector (one or more shadow boundaries):
 *     `${documentXPathToHost}|/div[1]/button[2]|/span[1]`
 *   or `${documentXPathToHost}|.//*[@id='foo']|.//span[normalize-space(.)='Save']`
 *
 * Shadow segments support both:
 * - deterministic tag+index paths (starts with `/`)
 * - relative XPath expressions evaluated with the `shadowRoot` as context (starts with `.` or anything else)
 */
export function resolveElementFromStoredSelector(
  selector: string,
): HTMLElement | null {
  const parts = selector.split("|");
  if (parts.length === 0) return null;

  const baseXPath = parts[0].trim();
  if (!baseXPath) return null;

  const host = evaluateFirstXPath(baseXPath);
  if (!host) return null;

  let current: Element = host;

  for (let i = 1; i < parts.length; i++) {
    const shadowPath = parts[i].trim();
    const root = (current as HTMLElement).shadowRoot;
    if (!root) return null; // closed shadow root or not a host

    const found = shadowPath.startsWith("/")
      ? resolveInShadowRoot(root, shadowPath)
      : evaluateFirstXPathInContext(shadowPath, root);
    if (!found) return null;
    current = found;
  }

  return current instanceof HTMLElement ? current : null;
}

function evaluateFirstXPath(xpath: string): Element | null {
  return evaluateFirstXPathInContext(xpath, document);
}

function evaluateFirstXPathInContext(
  xpath: string,
  context: Node,
): Element | null {
  try {
    const result = document.evaluate(
      xpath,
      context,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    );
    return result.singleNodeValue instanceof Element
      ? result.singleNodeValue
      : null;
  } catch {
    return null;
  }
}

function resolveInShadowRoot(root: ShadowRoot, path: string): Element | null {
  const segments = path.split("/").filter(Boolean);
  let parent: ShadowRoot | Element = root;
  let current: Element | null = null;

  for (const seg of segments) {
    const parsed = parseSegment(seg);
    if (!parsed) return null;

    const { tag, index } = parsed;
    const children: Element[] =
      parent instanceof ShadowRoot
        ? Array.from(parent.children)
        : Array.from(parent.children);

    const matches =
      tag === "*"
        ? children
        : children.filter((c) => c.localName.toLowerCase() === tag);

    current = matches[index - 1] ?? null;
    if (!current) return null;
    parent = current;
  }

  return current;
}

function parseSegment(seg: string): { tag: string; index: number } | null {
  // Example: "div[2]" or "my-component[1]" or "svg[1]"
  const m = /^([a-zA-Z0-9_-]+|\*)\[(\d+)\]$/.exec(seg);
  if (!m) return null;
  const tag = m[1].toLowerCase();
  const index = Number(m[2]);
  if (!Number.isFinite(index) || index < 1) return null;
  return { tag, index };
}
