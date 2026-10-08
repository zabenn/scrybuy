import { Entries } from "type-fest";
import { fetchPrices } from "./background";
import cardKingdomSvg from "./card-kingdom.svg";
import cardsphereSvg from "./cardsphere.svg";
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
    buildSearchUrl: (query) =>
      addedVendorConfig.manaPool!.buildAffiliateUrl(
        `https://manapool.com/cards?q=${query}`,
      ),
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
      addedVendorConfig.cardKingdom!.buildAffiliateUrl(
        `https://www.cardkingdom.com/catalog/search?search=header&filter[name]=${query}`,
      ),
  },
  cardsphere: {
    displayName: "Cardsphere",
    abbrev: "CSP",
    className: "cardsphere",
    svg: cardsphereSvg,
    buildAffiliateUrl: (url) => url,
    buildSearchUrl: (query) =>
      addedVendorConfig.cardsphere!.buildAffiliateUrl(
        `https://www.cardsphere.com/search?q=${query}`,
      ),
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

function normalizeCurrencyClasses(tableElement: HTMLTableElement): void {
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

function getRowCardUrl(rowElement: HTMLTableRowElement): string {
  return rowElement.cells[0].querySelector<HTMLAnchorElement>(":scope > a")!
    .href;
}

async function getUrlToPriceEntry(
  printsBodyElements: HTMLTableSectionElement[] | null,
  checklistBodyElement: HTMLTableSectionElement | null,
): Promise<Record<string, PriceEntry>> {
  const urls: string[] = [];
  for (const printsBodyElement of printsBodyElements ?? []) {
    for (const rowElement of printsBodyElement.rows) {
      if (rowElement.textContent?.includes("View all prints")) {
        continue;
      }
      urls.push(getRowCardUrl(rowElement));
    }
  }
  for (const rowElement of checklistBodyElement?.rows ?? []) {
    urls.push(getRowCardUrl(rowElement));
  }
  return await fetchPrices(urls);
}

function getExistingStoreListItem(
  vendor: Vendor,
  storesElement: HTMLUListElement,
): HTMLLIElement | null {
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
  storesElement: HTMLUListElement,
): HTMLLIElement | null {
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

function findLabelElement(cell: HTMLTableCellElement): HTMLElement | null {
  return (
    cell.querySelector<HTMLElement>(":scope > span") ??
    cell.querySelector<HTMLElement>(":scope abbr")
  );
}

function findColumnIndexByLabel(
  printsHeadElement: HTMLTableRowElement,
  label: string,
): number | null {
  const index = Array.from(printsHeadElement.cells).findIndex(
    (cell) => findLabelElement(cell)?.textContent === label,
  );
  return index === -1 ? null : index;
}

function getExistingVendorColumnIndex(
  vendor: Vendor,
  printsHeadElement: HTMLTableRowElement,
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
  printsHeadElement: HTMLTableRowElement,
): number {
  if (usdVendors.has(vendor)) {
    return (
      findColumnIndexByLabel(printsHeadElement, "EUR") ??
      findColumnIndexByLabel(printsHeadElement, "TIX") ??
      printsHeadElement.cells.length
    );
  }
  if (eurVendors.has(vendor)) {
    return (
      findColumnIndexByLabel(printsHeadElement, "TIX") ??
      printsHeadElement.cells.length
    );
  }
  return printsHeadElement.cells.length;
}

function getAffiliateUrl(vendor: Vendor, url: string): string {
  return addedVendorConfig[vendor]?.buildAffiliateUrl(url) ?? url;
}

function changeToolboxButtons(
  toolboxElement: HTMLUListElement | null,
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
  storesElement: HTMLUListElement | null,
  printsBodyElement: HTMLTableSectionElement | null,
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
  rowElement: HTMLTableRowElement,
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
    urlToPriceEntry[getRowCardUrl(rowElement)]?.[vendor as keyof PriceEntry];
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
  printsTableElements: HTMLTableElement[] | null,
  printsHeadElements: HTMLTableRowElement[] | null,
  printsBodyElements: HTMLTableSectionElement[] | null,
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
        columnElement = printsHeadElement.cells[index];
        const spanElement = findLabelElement(columnElement)!;
        if (!enabled) {
          printsHeadElement.deleteCell(index);
          for (const rowElement of printsBodyElement.rows) {
            if (rowElement.textContent.includes("View all prints")) {
              continue;
            }
            rowElement.deleteCell(index);
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
          printsHeadElement.cells[beforeIndex],
        );

        for (const rowElement of printsBodyElement.rows) {
          if (rowElement.textContent.includes("View all prints")) {
            rowElement.cells[0].colSpan =
              Object.values(options.vendors).filter((enabled) => enabled)
                .length + 1;
            continue;
          }

          rowElement
            .insertCell(beforeIndex)
            .appendChild(
              buildPriceLinkElement(
                vendor,
                rowElement,
                urlToPriceEntry,
                options,
                flags,
              ),
            );
        }
      }
    }
  }
}

function addChecklistButtons(
  checklistTableElement: HTMLTableElement | null,
  checklistHeadElement: HTMLTableRowElement | null,
  checklistBodyElement: HTMLTableSectionElement | null,
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

  const sortUsdHref = Array.from(checklistHeadElement.cells)
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
      columnElement = checklistHeadElement.cells[index];
      const anchorElement = findLabelElement(columnElement)!;
      if (!enabled) {
        checklistHeadElement.deleteCell(index);
        for (const rowElement of checklistBodyElement.rows) {
          rowElement.deleteCell(index);
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
        checklistHeadElement.cells[beforeIndex],
      );

      for (const rowElement of checklistBodyElement.rows) {
        const cellElement = rowElement.insertCell(beforeIndex);
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

    let printsTableElements: HTMLTableElement[] | null = Array.from(
      document.querySelectorAll<HTMLTableElement>(".prints table.prints-table"),
    ).filter((table) => table.innerHTML.includes("Prints"));
    if (printsTableElements?.length === 0) {
      printsTableElements = null;
    }
    const printsHeadElements: HTMLTableRowElement[] | null =
      printsTableElements?.map(
        (printsTableElement) => printsTableElement.tHead!.rows[0],
      ) ?? null;
    const printsBodyElements: HTMLTableSectionElement[] | null =
      printsTableElements?.map(
        (printsTableElement) => printsTableElement.tBodies[0],
      ) ?? null;

    const checklistTableElement =
      document.querySelector<HTMLTableElement>("table.checklist") ?? null;
    const checklistHeadElement = checklistTableElement?.tHead?.rows[0] ?? null;
    const checklistBodyElement = checklistTableElement?.tBodies[0] ?? null;

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
