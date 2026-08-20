import { Entries } from "type-fest";
import { fetchPrices } from "./background";
import cardKingdomSvg from "./card-kingdom.svg";
import manaPoolSvg from "./mana-pool.svg";
import {
  eurVendors,
  existingVendors,
  getOptions,
  Options,
  PriceEntry,
  tixVendors,
  usdVendors,
  Vendor,
  VendorEntry,
} from "./types";

document.documentElement.classList.add("loading");

const svgParser = new DOMParser();

type AddedVendorConfig = {
  displayName: string;
  abbrev: string;
  className: string;
  svg: string;
  buildAffiliateUrl: (url: string) => string;
  buildSearchUrl: (query: string) => string;
};

const addedVendorConfig: Partial<Record<Vendor, AddedVendorConfig>> = {
  manaPool: {
    displayName: "Mana Pool",
    abbrev: "MPL",
    className: "mana-pool",
    svg: manaPoolSvg,
    buildAffiliateUrl: (url) => {
      const affiliateUrl = new URL(url, "https://manapool.com");
      affiliateUrl.searchParams.append("ref", "scrybuy");
      return affiliateUrl.toString();
    },
    buildSearchUrl: (query) => `https://manapool.com/cards?q=${query}`,
  },
  cardKingdom: {
    displayName: "Card Kingdom",
    abbrev: "CKD",
    className: "card-kingdom",
    svg: cardKingdomSvg,
    buildAffiliateUrl: (url) => {
      const affiliateUrl = new URL(url, "https://www.cardkingdom.com");
      affiliateUrl.searchParams.append("partner", "ScryBuy");
      affiliateUrl.searchParams.append("utm_medium", "affiliate");
      affiliateUrl.searchParams.append("utm_source", "ScryBuy");
      affiliateUrl.searchParams.append("utm_campaign", "ScryBuy");
      return affiliateUrl.toString();
    },
    buildSearchUrl: (query) =>
      `https://www.cardkingdom.com/catalog/search?search=header&filter[name]=${query}`,
  },
};

const existingVendorAbbrev: Partial<Record<Vendor, string>> = {
  tcgPlayer: "TCG",
  cardmarket: "CMK",
  cardhoarder: "CHD",
};

type SingleColumnFlags = {
  singleUsdColumn: boolean;
  singleEurColumn: boolean;
  singleTixColumn: boolean;
};

function computeSingleColumnFlags(options: Options): SingleColumnFlags {
  const enabledVendors = (
    Object.entries(options.vendors) as Entries<Record<Vendor, boolean>>
  )
    .filter(([, enabled]) => enabled)
    .map(([vendor]) => vendor);
  return {
    singleUsdColumn:
      enabledVendors.filter((vendor) => usdVendors.has(vendor)).length === 1,
    singleEurColumn:
      enabledVendors.filter((vendor) => eurVendors.has(vendor)).length === 1,
    singleTixColumn:
      enabledVendors.filter((vendor) => tixVendors.has(vendor)).length === 1,
  };
}

function isSingleColumnVendor(
  vendor: Vendor,
  flags: SingleColumnFlags,
): boolean {
  return (
    (usdVendors.has(vendor) && flags.singleUsdColumn) ||
    (eurVendors.has(vendor) && flags.singleEurColumn) ||
    (tixVendors.has(vendor) && flags.singleTixColumn)
  );
}

function getCurrencyAbbrev(vendor: Vendor): string {
  if (usdVendors.has(vendor)) return "USD";
  if (eurVendors.has(vendor)) return "EUR";
  return "TIX";
}

function normalizeCurrencyClasses(tableElement: Element): void {
  for (const linkElement of tableElement.querySelectorAll<HTMLAnchorElement>(
    "a",
  )) {
    if (
      linkElement.classList.contains("currency-usd") ||
      linkElement.classList.contains("currency-tix")
    ) {
      linkElement.classList.add("currency-eur");
      linkElement.classList.remove("currency-usd");
      linkElement.classList.remove("currency-tix");
    }
  }
}

async function getUrlToPriceEntry(
  printsBodyElements: Element[] | null,
  checklistBodyElement: Element | null,
): Promise<Record<string, PriceEntry>> {
  const urls: string[] = [];
  for (const printsBodyElement of printsBodyElements ?? []) {
    for (const rowElement of printsBodyElement.querySelectorAll<HTMLTableRowElement>(
      ":scope > tr",
    )) {
      if (rowElement.textContent?.includes("View all prints")) {
        continue;
      }
      urls.push(
        rowElement.querySelector<HTMLAnchorElement>(
          ":scope > td:first-child > a",
        )!.href,
      );
    }
  }
  for (const rowElement of checklistBodyElement?.querySelectorAll<HTMLTableRowElement>(
    ":scope > tr",
  ) || []) {
    urls.push(
      rowElement.querySelector<HTMLAnchorElement>(
        ":scope > td:first-child > a",
      )!.href,
    );
  }
  return await fetchPrices(urls);
}

function getExistingStoreListItem(
  vendor: Vendor,
  storesElement: Element,
): Element | null {
  if (vendor === "tcgPlayer")
    return storesElement.querySelector<HTMLLIElement>(
      ":scope > li:has(> a.tcgplayer)",
    );
  if (vendor === "cardmarket")
    return storesElement.querySelector<HTMLLIElement>(
      ":scope > li:has(> a > span.currency-eur)",
    );
  if (vendor === "cardhoarder")
    return storesElement.querySelector<HTMLLIElement>(
      ":scope > li:has(> a.cardhoarder)",
    );
  return null;
}

function getStoreInsertBeforeItem(
  vendor: Vendor,
  storesElement: Element,
): Element | null {
  if (usdVendors.has(vendor)) {
    return (
      getExistingStoreListItem("cardmarket", storesElement) ??
      getExistingStoreListItem("cardhoarder", storesElement)
    );
  }
  if (eurVendors.has(vendor)) {
    return getExistingStoreListItem("cardhoarder", storesElement);
  }
  return null;
}

function findLabelElement(cell: Element): HTMLElement | null {
  return (
    cell.querySelector<HTMLElement>(":scope > span") ??
    cell.querySelector<HTMLElement>(":scope abbr")
  );
}

function findColumnIndexByLabel(
  printsHeadElement: Element,
  label: string,
): number | null {
  const index = Array.from(printsHeadElement.children).findIndex(
    (cell) => findLabelElement(cell)?.textContent === label,
  );
  return index === -1 ? null : index;
}

function getExistingVendorColumnIndex(
  vendor: Vendor,
  printsHeadElement: Element,
): number | null {
  if (vendor === "tcgPlayer")
    return findColumnIndexByLabel(printsHeadElement, "USD");
  if (vendor === "cardmarket")
    return findColumnIndexByLabel(printsHeadElement, "EUR");
  if (vendor === "cardhoarder")
    return findColumnIndexByLabel(printsHeadElement, "TIX");
  return null;
}

function getInsertBeforeColumnIndex(
  vendor: Vendor,
  printsHeadElement: Element,
): number {
  if (usdVendors.has(vendor)) {
    return (
      findColumnIndexByLabel(printsHeadElement, "EUR") ??
      findColumnIndexByLabel(printsHeadElement, "TIX") ??
      printsHeadElement.children.length
    );
  }
  if (eurVendors.has(vendor)) {
    return (
      findColumnIndexByLabel(printsHeadElement, "TIX") ??
      printsHeadElement.children.length
    );
  }
  return printsHeadElement.children.length;
}

function getAffiliateUrl(vendor: Vendor, url: string): string {
  return addedVendorConfig[vendor]?.buildAffiliateUrl(url) ?? url;
}

function changeToolboxButtons(
  toolboxElement: Element | null,
  options: Options,
): void {
  if (!toolboxElement) {
    return;
  }

  if (!options.multicolor || !options.vendors.tcgPlayer) {
    for (const linkElement of toolboxElement.querySelectorAll<HTMLAnchorElement>(
      "a.button-n",
    )) {
      linkElement.classList.remove("tcgplayer");
      linkElement.classList.remove("cardhoarder");
    }
  }
}

function addStoreButtons(
  storesElement: Element | null,
  printsBodyElement: Element | null,
  urlToPriceEntry: Record<string, PriceEntry>,
  options: Options,
): void {
  if (!storesElement) {
    return;
  }
  if (!options.multicolor) {
    for (const linkElement of storesElement.querySelectorAll<HTMLAnchorElement>(
      "a.button-n",
    )) {
      linkElement.classList.remove("tcgplayer");
      linkElement.classList.remove("cardhoarder");
      for (const spanElement of linkElement.querySelectorAll<HTMLSpanElement>(
        "span",
      )) {
        spanElement.classList.add("currency-eur");
        spanElement.classList.remove("currency-usd");
        spanElement.classList.remove("currency-tix");
      }
    }
  }

  let cachedSearchQuery: string | undefined;
  function getSearchQuery(): string {
    if (cachedSearchQuery === undefined) {
      cachedSearchQuery = document
        .querySelector<HTMLImageElement>(".card-image-front > img")!
        .title.split(/\s*(?:\/\/|\()\s*/)[0]
        .replaceAll(" ", "+");
    }
    return cachedSearchQuery;
  }

  for (const [vendor, enabled] of Object.entries(options.vendors) as Entries<
    Record<Vendor, boolean>
  >) {
    if (existingVendors.has(vendor)) {
      if (!enabled) {
        const itemElement = getExistingStoreListItem(vendor, storesElement)!;
        storesElement.removeChild(itemElement);
      }
      continue;
    }
    if (!enabled) {
      continue;
    }
    const cfg = addedVendorConfig[vendor];
    if (!cfg) {
      continue;
    }

    let vendorEntry =
      urlToPriceEntry[
        printsBodyElement?.querySelector<HTMLAnchorElement>(
          ":scope > tr.current > td:first-child > a",
        )?.href ?? document.URL.split("?")[0]
      ]?.[vendor as keyof PriceEntry];
    if (!vendorEntry) {
      vendorEntry = {
        nonfoil: { url: cfg.buildSearchUrl(getSearchQuery()), price: "" },
      };
    }

    const listElement = document.createElement("li");
    for (const [finish, value] of Object.entries(
      vendorEntry ?? [],
    ) as Entries<VendorEntry>) {
      if (!value) {
        continue;
      }

      const linkElement = document.createElement("a");
      linkElement.classList.add("button-n");
      linkElement.href = getAffiliateUrl(vendor, value.url);
      if (options.multicolor) {
        linkElement.classList.add(cfg.className);
      }
      linkElement.appendChild(
        svgParser.parseFromString(cfg.svg, "image/svg+xml").documentElement,
      );

      const labelElement = document.createElement("i");
      labelElement.textContent =
        (finish === "nonfoil" ? "Buy on " : `Buy ${finish} on `) +
        cfg.displayName;
      linkElement.appendChild(labelElement);

      if (value?.price) {
        const spanElement = document.createElement("span");
        spanElement.classList.add("price");
        spanElement.classList.add(
          !options.multicolor ? "currency-eur" : cfg.className,
        );
        spanElement.textContent =
          finish === "nonfoil" ? value.price : `✶ ${value.price}`;
        linkElement.appendChild(spanElement);
      }

      listElement.appendChild(linkElement);
    }

    const beforeElement = getStoreInsertBeforeItem(vendor, storesElement);
    storesElement.insertBefore(listElement, beforeElement);
  }
}

function buildPriceLinkElement(
  vendor: Vendor,
  rowElement: Element,
  urlToPriceEntry: Record<string, PriceEntry>,
  options: Options,
  flags: SingleColumnFlags,
): HTMLAnchorElement {
  const linkElement = document.createElement("a");
  if (!options.multicolor) {
    linkElement.classList.add("currency-eur");
  } else {
    const className = addedVendorConfig[vendor]?.className;
    if (className) {
      linkElement.className = className;
    }
  }

  const vendorEntry =
    urlToPriceEntry[
      rowElement.querySelector<HTMLAnchorElement>(
        ":scope > td:first-child > a",
      )!.href
    ]?.[vendor as keyof PriceEntry];
  const titleParts: string[] = [];
  for (const [finish, value] of Object.entries(
    vendorEntry ?? [],
  ) as Entries<VendorEntry>) {
    if (!value?.price) {
      continue;
    }
    titleParts.push(
      `${finish.charAt(0).toUpperCase() + finish.slice(1)}: ${value.price}`,
    );
    if (!linkElement.textContent) {
      linkElement.href = getAffiliateUrl(vendor, value.url);
      linkElement.textContent =
        finish !== "nonfoil" && isSingleColumnVendor(vendor, flags)
          ? `✶ ${value.price}`
          : value.price;
    }
  }
  linkElement.title = titleParts.join(", ");
  return linkElement;
}

function addPrintButtons(
  printsTableElements: Element[] | null,
  printsHeadElements: Element[] | null,
  printsBodyElements: Element[] | null,
  urlToPriceEntry: Record<string, PriceEntry>,
  options: Options,
): void {
  const flags = computeSingleColumnFlags(options);

  for (const [index, printsTableElement] of (
    printsTableElements ?? []
  ).entries()) {
    const printsHeadElement = printsHeadElements?.[index] ?? null;
    const printsBodyElement = printsBodyElements?.[index] ?? null;
    if (!printsTableElement || !printsHeadElement || !printsBodyElement) {
      continue;
    }

    if (!options.multicolor) {
      normalizeCurrencyClasses(printsTableElement);
    }

    for (const [vendor, enabled] of Object.entries(options.vendors) as Entries<
      Record<Vendor, boolean>
    >) {
      let columnElement: HTMLTableCellElement;
      if (existingVendors.has(vendor)) {
        const index = getExistingVendorColumnIndex(vendor, printsHeadElement)!;
        columnElement = printsHeadElement.children[
          index
        ] as HTMLTableCellElement;
        const spanElement = findLabelElement(columnElement)!;
        if (!enabled) {
          printsHeadElement.removeChild(columnElement);
          for (const rowElement of printsBodyElement.querySelectorAll<HTMLTableRowElement>(
            ":scope > tr",
          )) {
            if (rowElement.textContent.includes("View all prints")) {
              continue;
            }
            rowElement.removeChild(rowElement.children[index]);
          }
        } else if (!isSingleColumnVendor(vendor, flags)) {
          spanElement.textContent = existingVendorAbbrev[vendor]!;
        }
      } else if (enabled && addedVendorConfig[vendor]) {
        const cfg = addedVendorConfig[vendor]!;
        columnElement = document.createElement("th");
        const spanElement = document.createElement("span");
        spanElement.textContent = isSingleColumnVendor(vendor, flags)
          ? getCurrencyAbbrev(vendor)
          : cfg.abbrev;
        columnElement.appendChild(spanElement);

        const beforeIndex = getInsertBeforeColumnIndex(
          vendor,
          printsHeadElement,
        );

        printsHeadElement.insertBefore(
          columnElement,
          printsHeadElement.children[beforeIndex],
        );

        for (const rowElement of printsBodyElement.querySelectorAll<HTMLTableRowElement>(
          ":scope > tr",
        )) {
          if (rowElement.textContent.includes("View all prints")) {
            rowElement.querySelector<HTMLTableCellElement>(
              ":scope > td:first-child",
            )!.colSpan =
              Object.values(options.vendors).filter((enabled) => enabled)
                .length + 1;
            continue;
          }

          const cellElement = document.createElement("td");
          cellElement.appendChild(
            buildPriceLinkElement(
              vendor,
              rowElement,
              urlToPriceEntry,
              options,
              flags,
            ),
          );
          rowElement.insertBefore(
            cellElement,
            rowElement.children[beforeIndex],
          );
        }
      }
    }
  }
}

function addChecklistButtons(
  checklistTableElement: Element | null,
  checklistHeadElement: Element | null,
  checklistBodyElement: Element | null,
  urlToPriceEntry: Record<string, PriceEntry>,
  options: Options,
): void {
  if (
    !checklistTableElement ||
    !checklistHeadElement ||
    !checklistBodyElement
  ) {
    return;
  }

  if (!options.multicolor) {
    normalizeCurrencyClasses(checklistTableElement);
  }

  const flags = computeSingleColumnFlags(options);

  const sortUsdHref = Array.from(checklistHeadElement.children)
    .find((cell) => findLabelElement(cell)?.textContent === "USD")
    ?.querySelector<HTMLAnchorElement>(":scope > a")!.href!;
  const usdArrowElement = document.URL.includes("order=usd")
    ? document.querySelector<HTMLSpanElement>("span.arrow")
    : null;

  for (const [vendor, enabled] of Object.entries(options.vendors) as Entries<
    Record<Vendor, boolean>
  >) {
    let columnElement: HTMLTableCellElement;
    if (existingVendors.has(vendor)) {
      const index = getExistingVendorColumnIndex(vendor, checklistHeadElement)!;
      columnElement = checklistHeadElement.children[
        index
      ] as HTMLTableCellElement;
      const anchorElement = findLabelElement(columnElement)!;
      if (!enabled) {
        checklistHeadElement.removeChild(columnElement);
        for (const rowElement of checklistBodyElement.querySelectorAll<HTMLTableRowElement>(
          ":scope > tr",
        )) {
          rowElement.removeChild(rowElement.children[index]);
        }
      } else if (!isSingleColumnVendor(vendor, flags)) {
        anchorElement.textContent = existingVendorAbbrev[vendor]!;
      }
    } else if (enabled && addedVendorConfig[vendor]) {
      const cfg = addedVendorConfig[vendor]!;
      columnElement = document.createElement("th");
      columnElement.classList.add("em5");
      columnElement.classList.add("right");
      const anchorElement = document.createElement("a");
      const abbreviationElement = document.createElement("abbr");
      if (usdVendors.has(vendor)) {
        anchorElement.href = sortUsdHref;
        if (usdArrowElement) {
          anchorElement.appendChild(usdArrowElement.cloneNode(true));
        }
        abbreviationElement.title = "Price in U.S. Dollars";
        abbreviationElement.textContent = flags.singleUsdColumn
          ? "USD"
          : cfg.abbrev;
      }
      anchorElement.appendChild(abbreviationElement);
      columnElement.appendChild(anchorElement);

      const beforeIndex = getInsertBeforeColumnIndex(
        vendor,
        checklistHeadElement,
      );

      checklistHeadElement.insertBefore(
        columnElement,
        checklistHeadElement.children[beforeIndex],
      );

      for (const rowElement of checklistBodyElement.querySelectorAll<HTMLTableRowElement>(
        ":scope > tr",
      )) {
        const cellElement = document.createElement("td");
        cellElement.classList.add("right");
        cellElement.appendChild(
          buildPriceLinkElement(
            vendor,
            rowElement,
            urlToPriceEntry,
            options,
            flags,
          ),
        );
        rowElement.insertBefore(cellElement, rowElement.children[beforeIndex]);
      }
    }
  }
}

async function timed<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
  const start = performance.now();
  const result = await fn();
  console.log(`${label} took ${(performance.now() - start).toFixed(2)} ms`);
  return result;
}

async function main() {
  try {
    const toolboxElement =
      document
        .querySelector<HTMLDivElement>(".toolbox-column")
        ?.querySelector<HTMLUListElement>(":scope > ul.toolbox-links") ?? null;
    const storesElement =
      document
        .querySelector<HTMLDivElement>("#stores")
        ?.querySelector<HTMLUListElement>(":scope > ul.toolbox-links") ?? null;

    let printsTableElements: Element[] | null = Array.from(
      document.querySelectorAll<HTMLTableElement>(".prints table.prints-table"),
    ).filter((table) => table.innerHTML.includes("Prints"));
    if (printsTableElements?.length === 0) {
      printsTableElements = null;
    }
    const printsHeadElements: Element[] | null =
      printsTableElements?.map((printsTableElement) =>
        printsTableElement.querySelector<HTMLTableRowElement>(
          ":scope > thead > tr",
        )!,
      ) ?? null;
    const printsBodyElements: Element[] | null =
      printsTableElements?.map((printsTableElement) =>
        printsTableElement.querySelector<HTMLTableSectionElement>(
          ":scope > tbody",
        )!,
      ) ?? null;

    const checklistTableElement =
      document.querySelector<HTMLTableElement>("table.checklist") ?? null;
    const checklistHeadElement =
      checklistTableElement?.querySelector<HTMLTableRowElement>(
        ":scope > thead > tr",
      ) ?? null;
    const checklistBodyElement =
      checklistTableElement?.querySelector<HTMLTableSectionElement>(
        ":scope > tbody",
      ) ?? null;

    const options = await timed("getOptions", () => getOptions());

    const urlToPriceEntry = await timed("getUrlToPriceEntry", async () => {
      const entry = await getUrlToPriceEntry(
        printsBodyElements,
        checklistBodyElement,
      );
      console.log(entry);
      return entry;
    });

    await timed("changeToolboxButtons", () =>
      changeToolboxButtons(toolboxElement, options),
    );

    await timed("addStoreButtons", () =>
      addStoreButtons(
        storesElement,
        printsBodyElements?.[0] ?? null,
        urlToPriceEntry,
        options,
      ),
    );

    await timed("addPrintButtons", () =>
      addPrintButtons(
        printsTableElements,
        printsHeadElements,
        printsBodyElements,
        urlToPriceEntry,
        options,
      ),
    );

    await timed("addChecklistButtons", () =>
      addChecklistButtons(
        checklistTableElement,
        checklistHeadElement,
        checklistBodyElement,
        urlToPriceEntry,
        options,
      ),
    );
  } finally {
    document.documentElement.classList.remove("loading");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
