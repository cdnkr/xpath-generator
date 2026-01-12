import { generateXPath } from "../../generateXPath";
import {
  documentFromHtml,
  readFixtureHtml,
  resolveGeneratedSelector,
} from "./testUtils";

// Defensive polyfill for environments where jsdom doesn't expose CSS.escape.
if (!(globalThis as any).CSS) (globalThis as any).CSS = {};
if (typeof (globalThis as any).CSS.escape !== "function") {
  (globalThis as any).CSS.escape = (value: string) => value;
}

function expectResolvesOn(doc: Document, selector: string, expected: Element) {
  const resolved = resolveGeneratedSelector(doc, selector);
  expect(resolved).not.toBeNull();
  expect(resolved).toBe(expected);
}

function expectSameXPathAcrossPages(
  docA: Document,
  docB: Document,
  elA: Element,
  elB: Element,
) {
  const xpathA = generateXPath(elA);
  const xpathB = generateXPath(elB);

  expect(xpathA).toBeTruthy();
  expect(xpathB).toBeTruthy();
  expect(xpathA).toBe(xpathB);

  // Still validate each XPath is correct on its own page.
  expectResolvesOn(docA, xpathA, elA);
  expectResolvesOn(docB, xpathB, elB);

  return xpathA;
}

describe("generateXPath (core) – cross-page stability fixtures", () => {
  it("1) IDs on main elements: title + price from page A resolve on A and B", () => {
    const docA = documentFromHtml(readFixtureHtml("case1-a.html"));
    const docB = documentFromHtml(readFixtureHtml("case1-b.html"));

    const titleA = docA.getElementById("product-title") as Element;
    const priceA = docA.getElementById("product-price") as Element;
    const titleB = docB.getElementById("product-title") as Element;
    const priceB = docB.getElementById("product-price") as Element;

    expectSameXPathAcrossPages(docA, docB, titleA, titleB);
    expectSameXPathAcrossPages(docA, docB, priceA, priceB);
  });

  it("2) Tailwind-heavy classes: title + price from page A resolve on A and B", () => {
    const docA = documentFromHtml(readFixtureHtml("case2-a.html"));
    const docB = documentFromHtml(readFixtureHtml("case2-b.html"));

    // Second H1 is the product title (first is sr-only site title).
    const titleA = docA.querySelectorAll("h1")[1] as Element;
    const titleB = docB.querySelectorAll("h1")[1] as Element;

    const priceA = docA.querySelector("span.tabular-nums") as Element;
    const priceB = docB.querySelector("span.tabular-nums") as Element;

    expectSameXPathAcrossPages(docA, docB, titleA, titleB);
    expectSameXPathAcrossPages(docA, docB, priceA, priceB);
  });

  it("3) Mostly structural markup (no classes/ids): deeply nested title + price resolve on A and B", () => {
    const docA = documentFromHtml(readFixtureHtml("case3-a.html"));
    const docB = documentFromHtml(readFixtureHtml("case3-b.html"));

    // There are 2x h2: header 'Storefront' then product title.
    const titleA = docA.querySelectorAll("h2")[1] as Element;
    const titleB = docB.querySelectorAll("h2")[1] as Element;

    const priceA = docA.querySelector("main span") as Element;
    const priceB = docB.querySelector("main span") as Element;

    expectSameXPathAcrossPages(docA, docB, titleA, titleB);
    expectSameXPathAcrossPages(docA, docB, priceA, priceB);
  });

  it("4) Normal semantic classes (no ids): title + price from page A resolve on A and B", () => {
    const docA = documentFromHtml(readFixtureHtml("case4-a.html"));
    const docB = documentFromHtml(readFixtureHtml("case4-b.html"));

    const titleA = docA.querySelector(".productTitle") as Element;
    const titleB = docB.querySelector(".productTitle") as Element;
    const priceA = docA.querySelector(".productPrice") as Element;
    const priceB = docB.querySelector(".productPrice") as Element;

    expectSameXPathAcrossPages(docA, docB, titleA, titleB);
    expectSameXPathAcrossPages(docA, docB, priceA, priceB);
  });

  it("5) Label anchoring: price value resolves via preceding label on A and B", () => {
    const docA = documentFromHtml(readFixtureHtml("case5-a.html"));
    const docB = documentFromHtml(readFixtureHtml("case5-b.html"));

    const titleA = docA.querySelector(".titleText") as Element;
    const titleB = docB.querySelector(".titleText") as Element;

    const priceLabelA = Array.from(docA.querySelectorAll("span.label")).find(
      (el) => el.textContent?.trim() === "Price:",
    ) as Element;
    const priceLabelB = Array.from(docB.querySelectorAll("span.label")).find(
      (el) => el.textContent?.trim() === "Price:",
    ) as Element;
    const priceA = priceLabelA.nextElementSibling as Element;
    const priceB = priceLabelB.nextElementSibling as Element;

    expectSameXPathAcrossPages(docA, docB, titleA, titleB);
    expectSameXPathAcrossPages(docA, docB, priceA, priceB);
  });

  it("6.1) Unstable IDs (UUID/long-hex): data-testid wins and resolves across reloads", () => {
    const docA = documentFromHtml(readFixtureHtml("case6-hex-a.html"));
    const docB = documentFromHtml(readFixtureHtml("case6-hex-b.html"));

    const titleA = docA.querySelector(
      "[data-testid='product-title']",
    ) as Element;
    const titleB = docB.querySelector(
      "[data-testid='product-title']",
    ) as Element;
    const priceA = docA.querySelector(
      "[data-testid='product-price']",
    ) as Element;
    const priceB = docB.querySelector(
      "[data-testid='product-price']",
    ) as Element;

    // Demonstrate the "reload" changed IDs.
    expect((titleA as HTMLElement).id).not.toBe((titleB as HTMLElement).id);
    expect((priceA as HTMLElement).id).not.toBe((priceB as HTMLElement).id);

    const titleXPath = expectSameXPathAcrossPages(docA, docB, titleA, titleB);
    const priceXPath = expectSameXPathAcrossPages(docA, docB, priceA, priceB);

    expect(titleXPath).toContain("@data-testid='product-title'");
    expect(priceXPath).toContain("@data-testid='product-price'");
  });

  it("6.2) Unstable IDs (trailing 5+ digits): data-testid wins and resolves across reloads", () => {
    const docA = documentFromHtml(readFixtureHtml("case6-trailing5-a.html"));
    const docB = documentFromHtml(readFixtureHtml("case6-trailing5-b.html"));

    const titleA = docA.querySelector(
      "[data-testid='product-title']",
    ) as Element;
    const titleB = docB.querySelector(
      "[data-testid='product-title']",
    ) as Element;
    const priceA = docA.querySelector(
      "[data-testid='product-price']",
    ) as Element;
    const priceB = docB.querySelector(
      "[data-testid='product-price']",
    ) as Element;

    expect((titleA as HTMLElement).id).not.toBe((titleB as HTMLElement).id);
    expect((priceA as HTMLElement).id).not.toBe((priceB as HTMLElement).id);

    const titleXPath = expectSameXPathAcrossPages(docA, docB, titleA, titleB);
    const priceXPath = expectSameXPathAcrossPages(docA, docB, priceA, priceB);

    expect(titleXPath).toContain("@data-testid='product-title'");
    expect(priceXPath).toContain("@data-testid='product-price'");
  });

  it("6.3) Unstable IDs (framework patterns ember/react/vue): data-testid wins and resolves across reloads", () => {
    const docA = documentFromHtml(readFixtureHtml("case6-framework-a.html"));
    const docB = documentFromHtml(readFixtureHtml("case6-framework-b.html"));

    const titleA = docA.querySelector(
      "[data-testid='product-title']",
    ) as Element;
    const titleB = docB.querySelector(
      "[data-testid='product-title']",
    ) as Element;
    const priceA = docA.querySelector(
      "[data-testid='product-price']",
    ) as Element;
    const priceB = docB.querySelector(
      "[data-testid='product-price']",
    ) as Element;

    expect((titleA as HTMLElement).id).not.toBe((titleB as HTMLElement).id);
    expect((priceA as HTMLElement).id).not.toBe((priceB as HTMLElement).id);

    const titleXPath = expectSameXPathAcrossPages(docA, docB, titleA, titleB);
    const priceXPath = expectSameXPathAcrossPages(docA, docB, priceA, priceB);

    expect(titleXPath).toContain("@data-testid='product-title'");
    expect(priceXPath).toContain("@data-testid='product-price'");
  });

  it("6.4) Unstable IDs (_N 1-4 digits suffix): data-testid wins and resolves across reloads", () => {
    const docA = documentFromHtml(readFixtureHtml("case6-suffix-a.html"));
    const docB = documentFromHtml(readFixtureHtml("case6-suffix-b.html"));

    const titleA = docA.querySelector(
      "[data-testid='product-title']",
    ) as Element;
    const titleB = docB.querySelector(
      "[data-testid='product-title']",
    ) as Element;
    const priceA = docA.querySelector(
      "[data-testid='product-price']",
    ) as Element;
    const priceB = docB.querySelector(
      "[data-testid='product-price']",
    ) as Element;

    expect((titleA as HTMLElement).id).not.toBe((titleB as HTMLElement).id);
    expect((priceA as HTMLElement).id).not.toBe((priceB as HTMLElement).id);

    const titleXPath = expectSameXPathAcrossPages(docA, docB, titleA, titleB);
    const priceXPath = expectSameXPathAcrossPages(docA, docB, priceA, priceB);

    expect(titleXPath).toContain("@data-testid='product-title'");
    expect(priceXPath).toContain("@data-testid='product-price'");
  });

  it("6.5) Unstable IDs (underscore-delimited tokens like u_0_9_QM): data-testid wins over @id", () => {
    const doc = documentFromHtml(`
      <!doctype html>
      <html>
        <body>
          <div>
            <span id="u_0_9_QM" data-testid="product-title">Acme Widget</span>
          </div>
        </body>
      </html>
    `);

    const el = doc.querySelector("[data-testid='product-title']") as Element;
    expect(el).not.toBeNull();
    expect((el as HTMLElement).id).toBe("u_0_9_QM");

    const xpath = generateXPath(el);
    expect(xpath).toContain("@data-testid='product-title'");
    expect(xpath).not.toContain("@id='u_0_9_QM'");
    expectResolvesOn(doc, xpath, el);
  });
});

describe("generateXPath (core) – Shadow DOM + SVG fixtures", () => {
  it("7) Nested element within a custom element Shadow DOM returns compound selector that resolves", () => {
    const doc = documentFromHtml(
      readFixtureHtml("case7-custom-component.html"),
    );
    const host = doc.querySelector("my-product") as HTMLElement;
    expect(host).not.toBeNull();

    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
      <section>
        <div>
          <span class="title">Acme Widget</span>
        </div>
      </section>
    `;

    const target = root.querySelector("span.title") as Element;
    expect(target).not.toBeNull();

    const selector = generateXPath(target);
    // Should include at least one shadow segment (either deterministic `/tag[index]...` or scoped XPath like `.//...`)
    expect(selector).toMatch(/\|[/.]/);

    const resolved = resolveGeneratedSelector(doc, selector);
    expect(resolved).toBe(target);
  });

  it("8) SVG root element uses namespace-safe node test and resolves", () => {
    const doc = documentFromHtml(readFixtureHtml("case8-svg.html"));
    const svg = doc.querySelector("svg") as Element;
    expect(svg).not.toBeNull();

    const xpath = generateXPath(svg);
    expect(xpath).toContain("local-name()");

    const resolved = resolveGeneratedSelector(doc, xpath);
    expect(resolved).toBe(svg);
  });

  it("9) Element nested within an SVG (g/path) uses namespace-safe node test and resolves", () => {
    const doc = documentFromHtml(readFixtureHtml("case9-svg-nested.html"));
    const path = doc.querySelector("path") as Element;
    expect(path).not.toBeNull();

    const xpath = generateXPath(path);
    expect(xpath).toContain("local-name()");

    const resolved = resolveGeneratedSelector(doc, xpath);
    expect(resolved).toBe(path);
  });
});
