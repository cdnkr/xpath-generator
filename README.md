# XPath Generator (template-focused)

Generate **short, readable, and unique** XPath selectors for a given DOM element, optimized for **reuse across similar pages** (template-style extraction) rather than “find this exact node once”.

This was engineered with the same mental model as “selector insertion” features in templating tools (e.g. Text Blaze–style workflows): you click an element, store a selector, and later reuse it across many pages to extract the “same kind of thing” (product title, price, profile headline, etc.).

## Goals

- **Uniqueness on the current page**: the selector must resolve to exactly one element.
- **Short and human-ish**: prefer selectors a person might write, not a full absolute path.
- **Robust to page variants**: when possible, the same selector should work on:
  - different product pages (e.g. “title element” across multiple products)
  - different profile pages (LinkedIn candidates, Instagram influencers, etc.)
- **Reasonable runtime**: generate candidates quickly (quality prioritized over micro-optimizations, with a hard time budget in mind).
- **Modern DOM support**: handle **Shadow DOM** and **SVG**.

## Why this is hard

### Text content is powerful… and also dangerous

XPath can select elements by their text content. That’s useful, but in template scenarios it’s often exactly what you *should not* anchor to:

- **User-generated content**: usernames, real names, product titles, handles
- **Dynamic content**: prices, timestamps, counts, “recommended for you”
- **Copy changes / A/B tests**: small text edits break selectors
- **Localization**: text differs across locales

So this generator treats text as **high risk** and only uses it under strict “stable text” rules. This helps keep selectors reusable across pages that differ in content (e.g. two Amazon product pages) rather than baking in the specific product’s title.

### IDs and classes are frequently unstable

Modern sites often emit identifiers that are stable only within a session (or even only a render):

- UUIDs / long hex strings
- large trailing number suffixes
- framework patterns (`react-*`, `ember*`, `vue-*`)
- CSS-in-JS / CSS modules / minified or hashed classnames
- utility-class soups (Tailwind)

The generator applies broad disqualifiers for common hashing / framework patterns, but there is **no perfect regex** for “stable identifier”:

- It will sometimes **reject legitimate** IDs/classes.
- It will sometimes **fail to reject** some dynamic identifiers (e.g. short mixed-case hashes seen on some properties like Instagram/Google).

An obvious future improvement is a “probably human readable” classifier for IDs/classes (entropy/word-shape heuristics, dictionary signals, pronounceability, etc.). Those approaches reduce risk but still won’t be perfect.

## Approach (high level)

The algorithm is “**generate many candidates → validate uniqueness → rank**”:

1. **Collect candidate selectors** using multiple strategies (IDs, attributes, label anchoring, structure, etc.).
2. **Validate uniqueness** by evaluating each XPath and keeping only those that match exactly one element.
3. **Score and sort** remaining candidates to prefer:
   - higher-confidence strategies
   - fewer steps (shorter paths)
   - shorter strings

This structure lets the generator try aggressive ideas while only emitting selectors that are correct *on the current page*.

## Strategy priority (what it prefers)

In rough order:

1. **Stable IDs** (only when they pass stability checks and are unique in the document).
2. **Unique semantic tags** when they’re genuinely unique (e.g. a single `main`, `h1`, etc.).
3. **Stable attributes** (e.g. `data-testid`, `data-cy`, `name`, `role`, etc.) when unique.
4. **Label anchoring** for “label/value” layouts (common in forms and details panels).
5. **Text anchoring** only under strict “stable text” heuristics.
6. **Ancestor anchoring**: anchor to a nearby stable ancestor and then use a short relative path.
7. **Sibling anchoring**: anchor to a stable sibling and reference positionally.
8. **Class-based selectors** as a lower-confidence option (heavily filtered).
9. **Absolute XPath** as last resort (least robust to layout changes).

## Shadow DOM + SVG support

- **Shadow DOM**: XPath can’t cross shadow boundaries. The generator returns a compound selector:
  - `${documentXPath}|${shadowPath}|${shadowPath}...`
  - Each `shadowPath` is a deterministic absolute path within a shadow root (e.g. `/div[1]/button[2]/span[1]`).
- **SVG**: Uses a namespace-safe node test via `local-name()` so SVG elements can be targeted reliably.

## Strengths

- **Template-friendly**: biased against user-generated/dynamic content so selectors can generalize across similar pages.
- **Multi-strategy + scoring**: tends to find short, readable selectors when stable hooks exist.
- **Defenses against common instability patterns**: avoids many UUID/hex/trailing-digits/framework IDs and common dynamic class patterns.
- **Label anchoring**: strong for extracting structured “field/value” UI.
- **Shadow DOM + SVG**: handles cases that break many naïve XPath generators.
- **Uniqueness validation**: avoids emitting ambiguous selectors.

## Limitations / known tradeoffs

- **Text heuristics are intentionally conservative**:
  - can reject text that’s actually stable/useful
  - will still miss some user-generated/dynamic patterns
- **Identifier stability is not fully solvable**:
  - some dynamic IDs/classes will slip through
  - some stable IDs/classes will be rejected
- **Not internationalized (yet)**:
  - current stable-text filtering is biased to ASCII letters/spaces, so it will not use Chinese/Arabic/etc. text anchors today
- **Robustness is best-effort**:
  - “unique today” is not a guarantee against major redesigns, responsive re-ordering, or personalization-driven DOM changes

## Tests

The test suite is designed around **cross-page stability**: the same selector should resolve to the corresponding element across two similar pages (fixtures), including scenarios where IDs change between reloads and where only structural anchors exist.

To run:

```bash
cd xpath-generator/tests
npm test
```

See `tests/src/generateXPath.test.ts` for the fixture coverage and assertions.

## Live testing (Chrome debugger extension)

This repo also includes a Chrome extension debugger that overlays and displays the generated XPath live as you hover elements on any page. It’s useful for fast, real-world validation while iterating on heuristics.

![Screenshot](debugger-chrome-extension/screenshots/selector.png)

See `debugger-chrome-extension/README.md` for install instructions (build + load unpacked in Chrome developer mode).

## Usage

`generateXPath(element)` returns:

- a single XPath string for regular DOM elements, or
- a compound selector with `|` segments for Shadow DOM targets.
