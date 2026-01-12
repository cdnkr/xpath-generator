# XPath Generator

Generates **short, readable, and robust** XPath selectors for a given DOM element, optimized for **reuse across similar pages** rather than single-use absolute paths.

The generator prioritizes selectors a human might write while ensuring they uniquely identify the target element on the current page.

---

## Goals

- Resolve to **exactly one element** on the current page
- Prefer **short, human-readable** selectors
- Remain **robust across reloads and similar page variants**
- Balance selector quality with **reasonable generation time**

---

## Approach

> **Generate candidates → Validate uniqueness → Rank and select**

1. Generate candidate selectors using multiple strategies (IDs, attributes, text, structure, etc.)
2. Evaluate each candidate and keep only selectors that resolve to exactly one element
3. Rank remaining candidates to prefer:
   - higher-confidence strategies
   - fewer path steps
   - shorter strings

This allows aggressive exploration while only emitting selectors that are correct on the current page.

---

## Selector strategy (high level)

In descending priority:

1. Stable, unique IDs
2. Unique semantic tags or stable attributes (`data-*`, `role`, `name`)
3. Label- or text-based anchoring under conservative stability heuristics
4. Anchoring to nearby stable ancestors or siblings using short relative paths
5. Absolute XPath as a last resort

---

## Shadow DOM and SVG

- **Shadow DOM**: XPath cannot cross shadow boundaries. The generator emits a compound selector (`|`) representing each traversal into a shadow root, using deterministic absolute paths within each root.
- **SVG**: Uses namespace-safe matching via `local-name()` to reliably target SVG elements.

---

## Strengths

- **Template-friendly**: biased toward selectors that generalize across similar pages
- **Multi-strategy with scoring**: tends to find short, readable selectors when stable hooks exist
- **Defensive heuristics**: filters common dynamic ID/class patterns
- **Label anchoring**: effective for structured “field/value” layouts
- **Shadow DOM + SVG support**
- **Uniqueness validation**: avoids emitting ambiguous selectors

---

## Known tradeoffs

- Identifier stability (IDs/classes) is heuristic-based and best-effort
- Text anchoring is intentionally conservative and may miss some valid cases
- Robustness is not guaranteed across redesigns, or user interaction

---

## Tests

The test suite focuses on **cross-page stability** rather than single-instance correctness. 
Selectors are validated across similar page variants, including cases where IDs change between reloads or only structural anchors exist.

To run tests:

```bash
cd xpath-generator/tests
npm test
```

See `tests/src/generateXPath.test.ts` for fixtures and assertions.

---

## Live debugger

This repository includes a small Chrome extension that visually overlays the generated XPath as you hover elements on any page. 

Helps validate selector behavior against real-world pages.

![Screenshot](debugger-chrome-extension/screenshots/selector.png)

See `debugger-chrome-extension/README.md` for build and install instructions.
