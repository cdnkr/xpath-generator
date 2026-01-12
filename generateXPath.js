/**
 * XPath Generator for Chrome Extension Templating
 *
 * Strategy priority:
 * 1. Stable ID
 * 2. Unique tag name (single h1, main, etc.)
 * 3. Stable attributes (data-testid, name, etc.)
 * 4. Label anchoring
 * 5. Interactive text (buttons/links/divs)
 * 6. Ancestor anchoring
 * 7. Sibling anchoring
 * 8. Class combinations
 * 9. Absolute path fallback
 */

// Constants
const STABLE_ATTRIBUTES = [
    "data-testid",
    "data-cy",
    "data-qa",
    "id",
    "name",
    "role",
    "placeholder",
  ];
  
  // Tags stable enough to use as unique tag selectors (semantic/structural elements)
  const UNIQUE_TAG_WHITELIST = new Set([
    "body",
    "main",
    "header",
    "footer",
    "nav",
    "aside", // Document structure
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6", // Headings
    "form",
    "search", // Forms
    "video",
    "audio",
    "canvas",
    "iframe", // Media
    "table",
    "thead",
    "tbody",
    "tfoot", // Tables
  ]);
  
  const MAX_ANCESTOR_DEPTH = 50;
  const MAX_STABLE_TEXT_LENGTH = 40;
  const MIN_STABLE_TEXT_LENGTH = 2;
  const MAX_LABEL_LENGTH = 30;
  
  // Main function
  export function generateXPath(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
      throw new Error("Invalid input: Input must be a DOM Element.");
    }
  
    // Handle Shadow DOM with compound selector: `docXPath|shadowPath|shadowPath...`
    const shadowPaths = [];
    let current = element;
  
    while (true) {
      const root = current.getRootNode();
      if (!(root instanceof ShadowRoot)) break;
      shadowPaths.unshift(getShadowAbsolutePath(root, current));
      current = root.host;
    }
  
    const base = generateXPathInDocument(current);
    return shadowPaths.length === 0 ? base : `${base}|${shadowPaths.join("|")}`;
  }
  
  function generateXPathInDocument(element) {
    const doc = element.ownerDocument;
    const candidates = collectAllCandidates(element);
  
    // Dedupe and validate uniqueness
    const validCandidates = dedupeAndValidate(candidates, doc);
  
    console.log("deduped", validCandidates);
  
    if (validCandidates.length === 0) {
      return getAbsolutePath(element);
    }
  
    // Sort: higher score first, then fewer steps, then shorter string
    validCandidates.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      const stepDiff = countXPathSteps(a.xpath) - countXPathSteps(b.xpath);
      if (stepDiff !== 0) return stepDiff;
      return a.xpath.length - b.xpath.length;
    });
  
    return validCandidates[0].xpath;
  }

  function collectAllCandidates(element) {
    const doc = element.ownerDocument;
    const candidates = [];
  
    // Tag name uniqueness
    const tagSelector = getUniqueTagNameSelector(element);
    if (tagSelector) {
      candidates.push({ xpath: tagSelector, score: 90 });
    }
  
    // Stable ID
    if (isStableId(element.id) && isUniqueId(element.id, doc)) {
      candidates.push({ xpath: `//*[@id='${element.id}']`, score: 100 });
    }
  
    // Direct selectors (attributes, labels, text)
    candidates.push(
      ...getDirectSelectors(element).map((xpath) => ({ xpath, score: 80 })),
    );
  
    // Ancestor-based paths
    candidates.push(
      ...getAncestorPaths(element).map((xpath) => ({ xpath, score: 70 })),
    );
  
    // Sibling-based paths
    candidates.push(
      ...getSiblingPaths(element).map((xpath) => ({ xpath, score: 60 })),
    );
  
    // Class-based selectors
    candidates.push(
      ...getClassSelectors(element).map((xpath) => ({ xpath, score: 40 })),
    );
  
    // Absolute fallback
    const abs = getAbsolutePath(element);
    if (isUnique(abs, doc)) {
      candidates.push({ xpath: abs, score: 0 });
    }
  
    return candidates;
  }
  
  function dedupeAndValidate(
    candidates,
    doc,
  ) {
    const result = [];
    const seen = new Set();
  
    for (const c of candidates) {
      if (!c.xpath || seen.has(c.xpath)) continue;
      if (!isUnique(c.xpath, doc)) continue;
      seen.add(c.xpath);
      result.push(c);
    }
  
    return result;
  }
  
  // Strategy: Direct Selectors
  function getDirectSelectors(element) {
    const doc = element.ownerDocument;
    const nodeTest = getNodeTest(element);
    const selectors = [];
  
    // Stable attribute
    const stableAttr = getUniqueStableAttribute(element);
    if (stableAttr) {
      selectors.push(`//${nodeTest}[@${stableAttr.name}='${stableAttr.value}']`);
    }
  
    // Label anchoring
    const labelPath = getLabelAnchoredPath(element);
    if (labelPath) {
      selectors.push(labelPath);
    }
  
    // Text anchoring
    if (hasStableText(element)) {
      const text = element.textContent?.trim() || "";
      const xpath = `//${nodeTest}[normalize-space(.)='${escapeXPathString(text)}']`;
      if (isUnique(xpath, doc)) {
        selectors.push(xpath);
      }
    }
  
    return selectors;
  }
  
  function getUniqueTagNameSelector(element) {
    const tag = element.tagName.toLowerCase();
    if (!UNIQUE_TAG_WHITELIST.has(tag)) return null;
  
    const xpath = `//${getNodeTest(element)}`;
    return isUnique(xpath, element.ownerDocument) ? xpath : null;
  }
  
  function getLabelAnchoredPath(element) {
    const prev = element.previousElementSibling;
    if (!prev || !hasStableText(prev)) return null;
  
    const text = prev.textContent?.trim() || "";
    if (text.length > MAX_LABEL_LENGTH || text.length < MIN_STABLE_TEXT_LENGTH)
      return null;
  
    const labelXpath = `//${prev.tagName.toLowerCase()}[normalize-space(text())='${escapeXPathString(text)}']`;
    if (!isUnique(labelXpath, element.ownerDocument)) return null;
  
    return `${labelXpath}/following-sibling::${getNodeTest(element)}[1]`;
  }
  
  // Strategy: Class-Based Selectors
  function getClassSelectors(element) {
    const doc = element.ownerDocument;
    const nodeTest = getNodeTest(element);
    const validClasses = Array.from(element.classList).filter(isStableClass);
    const selectors = [];
  
    if (validClasses.length === 0) return selectors;
  
    // All classes combined
    const allClassesXpath = `//${nodeTest}[${buildClassPredicate(validClasses)}]`;
    if (isUnique(allClassesXpath, doc)) {
      selectors.push(allClassesXpath);
    }
  
    // Single classes
    for (const cls of validClasses) {
      const xpath = `//${nodeTest}[${buildClassPredicate([cls])}]`;
      if (isUnique(xpath, doc)) {
        selectors.push(xpath);
      }
    }
  
    return selectors;
  }
  
  function buildClassPredicate(classes) {
    return classes.map((c) => `contains(@class, '${c}')`).join(" and ");
  }
  
  // Strategy: Ancestor-Based Paths
  function getAncestorPaths(element) {
    const selectors = [];
    const pathSegments = [];
    let current = element;
    let depth = 0;
  
    while (current?.parentElement && depth < MAX_ANCESTOR_DEPTH) {
      depth++;
      const parent = current.parentElement;
  
      pathSegments.unshift(
        `${getNodeTest(current)}[${getElementIndex(current)}]`,
      );
      const relativePath = pathSegments.join("/");
  
      // Try all anchor strategies on parent
      selectors.push(
        ...getAnchorXPaths(parent).map((anchor) => `${anchor}/${relativePath}`),
      );
  
      if (parent.tagName === "BODY") break;
      current = parent;
    }
  
    return selectors;
  }
  
  function getAnchorXPaths(element) {
    const doc = element.ownerDocument;
    const nodeTest = getNodeTest(element);
    const anchors = [];
  
    // Unique tag name
    const tagXpath = `//${nodeTest}`;
    if (isUnique(tagXpath, doc)) {
      anchors.push(tagXpath);
    }
  
    // Stable ID
    if (isStableId(element.id) && isUniqueId(element.id, doc)) {
      anchors.push(`//*[@id='${element.id}']`);
    }
  
    // Stable attribute
    const attr = getUniqueStableAttribute(element);
    if (attr) {
      anchors.push(`//${nodeTest}[@${attr.name}='${attr.value}']`);
    }
  
    // Text anchor
    if (hasStableText(element)) {
      const text = element.textContent?.trim() || "";
      const xpath = `//${nodeTest}[normalize-space(.)='${escapeXPathString(text)}']`;
      if (isUnique(xpath, doc)) {
        anchors.push(xpath);
      }
    }
  
    // Stable classes
    const validClasses = Array.from(element.classList).filter(isStableClass);
    if (validClasses.length > 0) {
      const xpath = `//${nodeTest}[${buildClassPredicate(validClasses)}]`;
      if (isUnique(xpath, doc)) {
        anchors.push(xpath);
      }
    }
  
    return anchors;
  }
  
  // Strategy: Sibling-Based Paths
  function getSiblingPaths(element) {
    const doc = element.ownerDocument;
    const nodeTest = getNodeTest(element);
    const tagLower = element.tagName.toLowerCase();
    const parent = element.parentElement;
    if (!parent) return [];
  
    const selectors = [];
    const siblings = Array.from(parent.children);
    const elementIndex = siblings.indexOf(element);
    if (elementIndex < 0) return [];
  
    // Preceding siblings
    for (let i = elementIndex - 1; i >= 0; i--) {
      const anchor = getSiblingAnchor(siblings[i], doc);
      if (!anchor) continue;
      const count = countSameTagBetween(siblings, i, elementIndex, tagLower);
      selectors.push(`${anchor}/following-sibling::${nodeTest}[${count}]`);
    }
  
    // Following siblings
    for (let i = elementIndex + 1; i < siblings.length; i++) {
      const anchor = getSiblingAnchor(siblings[i], doc);
      if (!anchor) continue;
      const count = countSameTagBetween(siblings, elementIndex, i, tagLower);
      selectors.push(`${anchor}/preceding-sibling::${nodeTest}[${count}]`);
    }
  
    return selectors;
  }
  
  function getSiblingAnchor(sibling, doc) {
    const nodeTest = getNodeTest(sibling);
  
    // Unique tag
    const tagXpath = `//${nodeTest}`;
    if (isUnique(tagXpath, doc)) return tagXpath;
  
    // Stable ID
    if (isStableId(sibling.id) && isUniqueId(sibling.id, doc)) {
      return `//*[@id='${sibling.id}']`;
    }
  
    // Stable attribute
    const attr = getUniqueStableAttribute(sibling);
    if (attr) {
      return `//${nodeTest}[@${attr.name}='${attr.value}']`;
    }
  
    // Text anchor
    if (hasStableText(sibling)) {
      const text = sibling.textContent?.trim() || "";
      const xpath = `//${nodeTest}[normalize-space(.)='${escapeXPathString(text)}']`;
      if (isUnique(xpath, doc)) return xpath;
    }
  
    return null;
  }
  
  function countSameTagBetween(
    siblings,
    start,
    end,
    tag,
  ) {
    let count = 0;
    const [from, to] = [Math.min(start, end), Math.max(start, end)];
    for (let i = from + 1; i <= to; i++) {
      if (siblings[i].tagName.toLowerCase() === tag) count++;
    }
    return count;
  }
  
  // Shadow DOM Support
  function getShadowAbsolutePath(
    shadowRoot,
    element,
  ) {
    const segments = [];
    let current = element;
  
    while (current) {
      const parent = current.parentNode;
      if (!parent) break;
  
      const tag = current.localName.toLowerCase();
      const index = getShadowSiblingIndex(current, parent);
      segments.unshift(`${tag}[${index}]`);
  
      if (parent === shadowRoot) break;
      if (!(parent instanceof Element)) break;
      current = parent;
    }
  
    return "/" + segments.join("/");
  }
  
  function getShadowSiblingIndex(element, parent) {
    const tag = element.localName.toLowerCase();
    const children =
      parent instanceof ShadowRoot || parent instanceof Element
        ? Array.from(parent.children)
        : [];
  
    let index = 0;
    for (const child of children) {
      if (child.localName.toLowerCase() === tag) index++;
      if (child === element) return index;
    }
    return 1;
  }
  
  // Stability Validators
  function isStableId(id) {
    if (!id) return false;
    if (/^([a-fA-F0-9-]{10,})$/.test(id)) return false; // UUIDs/hex
    // Common "generated" IDs with underscore-delimited tokens, e.g. `u_0_9_QM`, `_r_8_`
    // Matches any substring like `_<token>_<token>_` where token is [A-Za-z0-9]+
    if (/_[a-zA-Z0-9]+_[a-zA-Z0-9]+_/.test(id)) return false;
    if (/\d{5,}$/.test(id)) return false; // Large trailing numbers
    if (/^(ember|react-|vue-)\d*/.test(id)) return false; // Framework IDs
    if (/_\d{1,4}$/.test(id)) return false; // Dynamic suffixes
    return true;
  }
  
  function isStableClass(className) {
    if (className.includes(":") || className.includes("[")) return false; // Utility classes
    if (/^(css|sc)-[a-zA-Z0-9]+$/.test(className)) return false; // CSS-in-JS
    if (/^[a-zA-Z0-9]{10,}$/.test(className)) return false; // Minified
    if (/\d/.test(className)) return false; // Disqualifies multiple hashing strategies used for classes
    return true;
  }
  
  function hasStableText(element) {
    const text = element.textContent?.trim();
    if (!text) return false;
    if (
      text.length > MAX_STABLE_TEXT_LENGTH ||
      text.length < MIN_STABLE_TEXT_LENGTH
    )
      return false;
    if (
      /^([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+ [A-Z][a-z]+ [A-Z][a-z]+)$/.test(text)
    )
      return false; // First name, last name
    if (/^[a-z]+$/.test(text)) return false; // Username (ish)
    if (!/^[a-zA-Z ]+$/.test(text)) return false; // only allow letters and spaces, disqualifies most dynamic content
    return true;
  }
  
  function getUniqueStableAttribute(
    element,
  ) {
    for (const attr of STABLE_ATTRIBUTES) {
      const val = element.getAttribute(attr);
      if (!val || !isStableId(val)) continue;
  
      const xpath = `//${getNodeTest(element)}[@${attr}='${val}']`;
      if (isUnique(xpath, element.ownerDocument)) {
        return { name: attr, value: val };
      }
    }
    return null;
  }
  
  // Uniqueness Checks
  function isUnique(xpath, doc) {
    try {
      const result = doc.evaluate(
        xpath,
        doc,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null,
      );
      return result.snapshotLength === 1;
    } catch {
      return false;
    }
  }
  
  function isUniqueId(id, doc) {
    return doc.querySelectorAll(`[id='${CSS.escape(id)}']`).length === 1;
  }
  
  // DOM Utilities
  function getElementIndex(element) {
    let index = 1;
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === element.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    return index;
  }
  
  function getAbsolutePath(element) {
    const segments = [];
    let current = element;
  
    while (current?.nodeType === Node.ELEMENT_NODE) {
      segments.unshift(`${getNodeTest(current)}[${getElementIndex(current)}]`);
      current = current.parentElement;
    }
  
    return "/" + segments.join("/");
  }
  
  function getNodeTest(element) {
    const tag = element.tagName.toLowerCase();
    const isSvg =
      element.namespaceURI === "http://www.w3.org/2000/svg" ||
      element instanceof SVGElement;
    return isSvg ? `*[local-name()='${tag}']` : tag;
  }
  
  // XPath Utilities
  function countXPathSteps(xpath) {
    return xpath.split("/").filter(Boolean).length;
  }
  
  function escapeXPathString(str) {
    if (!str.includes("'")) return str;
    const parts = str.split("'").map((part) => `'${part}'`);
    return `concat(${parts.join(`, "'", `)})`;
  }
  