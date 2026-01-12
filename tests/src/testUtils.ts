import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function readFixtureHtml(relativeFixturePath: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const full = path.resolve(here, "..", "fixtures", relativeFixturePath);
  return fs.readFileSync(full, "utf-8");
}

/**
 * Creates a parsed Document in the current jsdom realm, so `instanceof ShadowRoot`
 * and other DOM checks used by `generateXPath()` work reliably.
 */
export function documentFromHtml(html: string): Document {
  const doc = document.implementation.createHTMLDocument("fixture");
  doc.open();
  doc.write(html);
  doc.close();
  return doc;
}

export function evalXPathSingle(doc: Document, xpath: string): Element | null {
  try {
    const result = doc.evaluate(
      xpath,
      doc,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    );
    const node = result.singleNodeValue;
    return node && node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : null;
  } catch {
    // jsdom's XPath implementation has known gaps around namespace functions like local-name().
    // For our generator output, we only need a small fallback subset to validate SVG behavior.
    return fallbackEvalXPathSingle(doc, xpath);
  }
}

/**
 * Resolves the extended selector format returned by `generateXPath()` for Shadow DOM:
 *   `${documentXPath}|${shadowPath}|${shadowPath}...`
 *
 * Each shadowPath is an absolute deterministic path within a shadow root like:
 *   `/div[1]/button[2]/span[1]`
 */
export function resolveGeneratedSelector(
  doc: Document,
  selector: string,
): Element | null {
  const parts = selector.split("|").filter(Boolean);
  if (parts.length === 0) return null;

  const docXpath = parts[0];
  let current: Element | null = evalXPathSingle(doc, docXpath);
  if (!current) return null;

  for (let i = 1; i < parts.length; i++) {
    const shadowPath = parts[i];
    const root = (current as Element).shadowRoot;
    if (!root) return null;
    const next = resolveShadowAbsolutePath(root, shadowPath);
    if (!next) return null;
    current = next;
  }

  return current;
}

function resolveShadowAbsolutePath(
  root: ShadowRoot,
  absolutePath: string,
): Element | null {
  const steps = absolutePath
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  let current: ParentNode = root;

  for (const step of steps) {
    const match = /^([a-zA-Z0-9_-]+)\[(\d+)\]$/.exec(step);
    if (!match) return null;
    const [, tag, indexStr] = match;
    const index = Number(indexStr);
    if (!Number.isFinite(index) || index < 1) return null;

    const children: Element[] =
      current instanceof ShadowRoot
        ? Array.from(current.children)
        : current instanceof Element
          ? Array.from(current.children)
          : [];

    let seen = 0;
    let next: Element | null = null;
    for (const child of children) {
      if (child.localName.toLowerCase() === tag.toLowerCase()) {
        seen++;
        if (seen === index) {
          next = child;
          break;
        }
      }
    }

    if (!next) return null;
    current = next;
  }

  return current instanceof Element ? current : null;
}

function fallbackEvalXPathSingle(doc: Document, xpath: string): Element | null {
  const trimmed = xpath.trim();

  // Common generator output for SVG uniqueness checks.
  const localNameDesc = /^\/\/\*\[local-name\(\)='([^']+)'\]$/.exec(trimmed);
  if (localNameDesc) {
    const tag = localNameDesc[1].toLowerCase();
    return doc.querySelector(tag);
  }

  // Absolute paths (used as fallback by generator) can include steps like:
  //   /html[1]/body[1]/main[1]/*[local-name()='svg'][1]/*[local-name()='g'][1]/*[local-name()='path'][1]
  if (trimmed.startsWith("/")) {
    const steps = trimmed
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);

    let current: ParentNode = doc;

    for (const step of steps) {
      // local-name step
      const localStep = /^\*\[local-name\(\)='([^']+)'\]\[(\d+)\]$/.exec(step);
      if (localStep) {
        const [, tag, indexStr] = localStep;
        const index = Number(indexStr);
        const next = nthChildByLocalName(current, tag, index);
        if (!next) return null;
        current = next;
        continue;
      }

      // regular tag step
      const tagStep = /^([a-zA-Z0-9_-]+)\[(\d+)\]$/.exec(step);
      if (tagStep) {
        const [, tag, indexStr] = tagStep;
        const index = Number(indexStr);
        const next = nthChildByTagName(current, tag, index);
        if (!next) return null;
        current = next;
        continue;
      }

      // Unsupported fallback expression shape.
      return null;
    }

    return current instanceof Element ? current : null;
  }

  return null;
}

function nthChildByLocalName(
  parent: ParentNode,
  localName: string,
  index1: number,
): Element | null {
  const children =
    parent instanceof Document
      ? [parent.documentElement]
      : parent instanceof Element
        ? Array.from(parent.children)
        : parent instanceof ShadowRoot
          ? Array.from(parent.children)
          : [];

  let seen = 0;
  for (const child of children) {
    if (child.localName.toLowerCase() === localName.toLowerCase()) {
      seen++;
      if (seen === index1) return child;
    }
  }
  return null;
}

function nthChildByTagName(
  parent: ParentNode,
  tagName: string,
  index1: number,
): Element | null {
  const children =
    parent instanceof Document
      ? [parent.documentElement]
      : parent instanceof Element
        ? Array.from(parent.children)
        : parent instanceof ShadowRoot
          ? Array.from(parent.children)
          : [];

  let seen = 0;
  for (const child of children) {
    if (child.tagName.toLowerCase() === tagName.toLowerCase()) {
      seen++;
      if (seen === index1) return child;
    }
  }
  return null;
}
