import { CardIdentifier, Cards, setAgent } from "scryfall-sdk";
import { Entries } from "type-fest";
import { fetchPrices } from "./background";
import {
  addedVendors,
  eurVendors,
  existingVendors,
  getOptions,
  Options,
  Price,
  tixVendors,
  usdVendors,
  Vendor,
  VendorEntry,
} from "./types";

document.documentElement.classList.add("loading");

const manaPoolPath =
  "M5.42 13.51 L1.14 11.31 V5.76 L5.42 7.89 V13.51 Z M6.63 7.55 L5.42 7.89 V13.51 L12.48 11.60 V6.03 L11.13 6.39 V9.46 L8.29 10.26 V11.36 L6.63 11.78 V7.55 Z M5.42 7.89 L1.14 5.76 V2.15 L5.42 4.33 V7.89 Z M12.48 2.39 L7.86 0.27 L1.14 2.15 L5.42 4.33 L12.48 2.39 Z M11.13 6.39 L12.48 6.03 V2.39 L5.42 4.33 V7.89 L6.63 7.55 V5.33 L8.93 6.14 L11.13 4.12 V6.39 Z";
const cardKingdomPath =
  "M0 0 V4.38 H1.97 V11.99 H12.03 V4.38 H14 V0 H11.82 V4.12 H9.96 V0.03 H7.89 V4.12 H6.11 V0 H4.04 V4.12 H2.18 V0 Z";

async function getUrlToPrice(): Promise<Record<string, Price>> {
  const tableElement = Array.from(
    document.querySelector(".prints")!.querySelectorAll("table.prints-table")
  ).find((table) => table.textContent.includes("Prints"))!;
  const bodyElement = tableElement.querySelector("tbody")!;

  const urls: string[] = [];
  for (const rowElement of bodyElement.children) {
    if (rowElement.textContent?.includes("View all prints")) {
      continue;
    }
    urls.push((rowElement.children[0].children[0] as HTMLAnchorElement).href);
  }

  const cards = await Cards.collection(
    ...urls.map((url) => {
      const [set, collectorNumber] = url
        .split("/")
        .slice(4, 6)
        .map(decodeURIComponent);
      return CardIdentifier.bySet(set, collectorNumber);
    })
  ).waitForAll();

  const prices = await fetchPrices(cards.map((card) => card.id));
  if (!prices) {
    return {};
  }

  const urlToPrice: Record<string, Price> = {};
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const price = prices[i];
    price.manaPool ??= {};
    price.cardKingdom ??= {};
    for (const finish of card.finishes) {
      if (finish === "glossy") {
        continue;
      }
      for (const vendor of addedVendors) {
        let url: URL;
        if (vendor === "manaPool") {
          url = new URL(
            price.manaPool[finish]?.url ??
              `card/${document.URL.split("?")[0].split("/").slice(-1)}`,
            "https://manapool.com"
          );
          if (!price.manaPool[finish]?.url) {
            if (finish === "nonfoil") {
              url.searchParams.append("finish", "NF");
            } else if (finish === "foil") {
              url.searchParams.append("finish", "FO");
            } else {
              url.searchParams.append("finish", "EF");
            }
          }
          url.searchParams.append("ref", "scrybuy");
        } else if (vendor === "cardKingdom") {
          url = new URL(
            price.cardKingdom[finish]?.url ?? `catalog/search`,
            "https://www.cardkingdom.com"
          );
          if (!price.cardKingdom[finish]?.url) {
            url.searchParams.append("filter[search]", "mtg_advanced");
            if (finish === "nonfoil") {
              url.searchParams.append("filter[tab]", "mtg_card");
            } else {
              url.searchParams.append("filter[tab]", "mtg_foil");
            }
            url.searchParams.append(
              "filter[name]",
              document.querySelector(".card-text-card-name")!.textContent.trim()
            );
          }
          url.searchParams.append("partner", "ScryBuy");
          url.searchParams.append("utm_medium", "affiliate");
          url.searchParams.append("utm_source", "ScryBuy");
          url.searchParams.append("utm_campaign", "ScryBuy");
        }
        price[vendor as keyof Price]![finish] = {
          url: url!.toString(),
          price: price[vendor as keyof Price]![finish]?.price ?? "",
        };
      }
    }
    urlToPrice[urls[i]] = price;
  }
  return urlToPrice;
  0;
}

function getExistingVendorIndex(
  vendor: Vendor,
  element: Element
): number | null {
  if (vendor === "tcgPlayer") return element.children.length - 3;
  if (vendor === "cardmarket") return element.children.length - 2;
  if (vendor === "cardhoarder") return element.children.length - 1;
  return null;
}

function getInsertBeforeIndex(vendor: Vendor, element: Element): number {
  if (usdVendors.has(vendor)) return element.children.length - 2;
  if (eurVendors.has(vendor)) return element.children.length - 1;
  return element.children.length;
}

export function addStoreButtons(
  urlToPrice: Record<string, Price>,
  options: Options
): void {
  const toolboxElement = document.querySelector(".toolbox-column")!.children[1];
  const storesElement = document.querySelector("#stores")?.children[1];

  if (!storesElement) {
    return;
  }

  if (!options.multicolor) {
    for (const linkElement of storesElement.querySelectorAll("a.button-n")) {
      linkElement.classList.remove("tcgplayer");
      linkElement.classList.remove("cardhoarder");
      for (const spanElement of linkElement.querySelectorAll("span")) {
        spanElement.classList.add("currency-eur");
        spanElement.classList.remove("currency-usd");
        spanElement.classList.remove("currency-tix");
      }
    }
  }

  if (!options.multicolor || !options.vendors.tcgPlayer) {
    for (const linkElement of toolboxElement.querySelectorAll("a.button-n")) {
      linkElement.classList.remove("tcgplayer");
      linkElement.classList.remove("cardhoarder");
    }
  }

  for (const [vendor, enabled] of Object.entries(options.vendors) as Entries<
    Record<Vendor, boolean>
  >) {
    const listElement = document.createElement("li");
    if (existingVendors.has(vendor)) {
      const index = getExistingVendorIndex(vendor, storesElement)!;
      if (!enabled) {
        storesElement.removeChild(storesElement.children[index]);
      }
    } else if (enabled) {
      const vendorEntry =
        urlToPrice[document.URL.split("?")[0]]?.[vendor as keyof Price];
      for (const [finish, value] of Object.entries(
        vendorEntry ?? []
      ) as Entries<VendorEntry>) {
        if (!value) {
          continue;
        }

        const linkElement = document.createElement("a");
        linkElement.classList.add("button-n");
        linkElement.href = value.url;
        if (options.multicolor) {
          if (vendor === "manaPool") {
            linkElement.classList.add("mana-pool");
          } else if (vendor === "cardKingdom") {
            linkElement.classList.add("card-kingdom");
          }
        }

        const svgElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        svgElement.setAttribute("viewBox", "0 0 14 14");
        svgElement.setAttribute("focusable", "false");
        svgElement.setAttribute("aria-hidden", "true");

        const gElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );
        const pathElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );

        if (vendor === "manaPool") {
          pathElement.setAttribute("d", manaPoolPath);
        } else if (vendor === "cardKingdom") {
          pathElement.setAttribute("d", cardKingdomPath);
        }
        gElement.appendChild(pathElement);

        svgElement.appendChild(gElement);
        linkElement.appendChild(svgElement);

        const labelElement = document.createElement("i");
        if (finish === "nonfoil") {
          labelElement.textContent = "Buy on ";
        } else {
          labelElement.textContent = `Buy ${finish} on `;
        }
        if (vendor === "cardKingdom") {
          labelElement.textContent += "Card Kingdom";
        } else if (vendor === "manaPool") {
          labelElement.textContent += "Mana Pool";
        }
        linkElement.appendChild(labelElement);

        if (value?.price) {
          const spanElement = document.createElement("span");
          spanElement.classList.add("price");
          if (!options.multicolor) {
            spanElement.classList.add("currency-eur");
          } else if (vendor === "manaPool") {
            spanElement.classList.add("mana-pool");
          } else if (vendor === "cardKingdom") {
            spanElement.classList.add("card-kingdom");
          }
          if (finish === "nonfoil") {
            spanElement.textContent = value.price;
          } else {
            spanElement.textContent = `✶\u00A0${value.price}`;
          }
          linkElement.appendChild(spanElement);
        }

        listElement.appendChild(linkElement);
      }

      const beforeIndex = getInsertBeforeIndex(vendor, storesElement);
      storesElement.insertBefore(
        listElement,
        storesElement.children[beforeIndex]
      );
    }
  }
}

export function addPrintButtons(
  urlToPrice: Record<string, Price>,
  options: Options
): void {
  const tableElement = Array.from(
    document.querySelector(".prints")!.querySelectorAll("table.prints-table")
  ).find((table) => table.innerHTML.includes("Prints"))!;
  const headElement = tableElement.querySelector("thead")!.children[0];
  const bodyElement = tableElement.querySelector("tbody")!;

  if (!options.multicolor) {
    for (const linkElement of tableElement.querySelectorAll("a")) {
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

  const singleUsdColumn =
    (Object.entries(options.vendors) as Entries<typeof options.vendors>).filter(
      ([vendor, enabled]) => usdVendors.has(vendor) && enabled
    ).length === 1;
  const singleEurColumn =
    (Object.entries(options.vendors) as Entries<typeof options.vendors>).filter(
      ([vendor, enabled]) => eurVendors.has(vendor) && enabled
    ).length === 1;
  const singleTixColumn =
    (Object.entries(options.vendors) as Entries<typeof options.vendors>).filter(
      ([vendor, enabled]) => tixVendors.has(vendor) && enabled
    ).length === 1;

  for (const [vendor, enabled] of Object.entries(options.vendors) as Entries<
    Record<Vendor, boolean>
  >) {
    let columnElement: HTMLTableCellElement;
    if (existingVendors.has(vendor)) {
      const index = getExistingVendorIndex(vendor, headElement)!;
      columnElement = headElement.children[index] as HTMLTableCellElement;
      const spanElement = columnElement.querySelector("span")!;
      if (!enabled) {
        headElement.removeChild(columnElement);
        for (const rowElement of bodyElement.children) {
          if (rowElement.textContent.includes("View all prints")) {
            continue;
          }
          rowElement.removeChild(rowElement.children[index]);
        }
      } else {
        if (vendor === "tcgPlayer" && !singleUsdColumn) {
          spanElement.textContent = "TCG";
        } else if (vendor === "cardmarket" && !singleEurColumn) {
          spanElement.textContent = "CMK";
        } else if (vendor === "cardhoarder" && !singleTixColumn) {
          spanElement.textContent = "CHD";
        }
      }
    } else if (enabled) {
      columnElement = document.createElement("th");
      const spanElement = document.createElement("span");
      if (usdVendors.has(vendor) && singleUsdColumn) {
        spanElement.textContent = `USD`;
      } else if (vendor === "manaPool") {
        spanElement.textContent = `MPL`;
      } else if (vendor === "cardKingdom") {
        spanElement.textContent = `CKD`;
      }
      columnElement.appendChild(spanElement);

      const beforeIndex = getInsertBeforeIndex(vendor, headElement);

      headElement.insertBefore(
        columnElement,
        headElement.children[beforeIndex]
      );

      for (const rowElement of bodyElement.children) {
        if (rowElement.textContent.includes("View all prints")) {
          (rowElement.children[0] as HTMLTableCellElement).colSpan =
            Object.values(options.vendors).filter((enabled) => enabled).length +
            1;
          continue;
        }

        const cellElement = document.createElement("td");

        const linkElement = document.createElement("a");
        if (!options.multicolor) {
          linkElement.classList.add("currency-eur");
        } else if (vendor === "manaPool") {
          linkElement.className = "mana-pool";
        } else if (vendor === "cardKingdom") {
          linkElement.className = "card-kingdom";
        }

        const vendorEntry =
          urlToPrice[
            (rowElement.children[0].children[0] as HTMLAnchorElement).href
          ]?.[vendor as keyof Price];
        const titleArray = [];
        for (const [finish, value] of Object.entries(
          vendorEntry ?? []
        ) as Entries<VendorEntry>) {
          if (value?.price) {
            titleArray.push(
              `${finish.charAt(0).toUpperCase() + finish.slice(1)}: ${value.price}`
            );
            if (!linkElement.textContent) {
              linkElement.href = value.url;
              if (
                finish !== "nonfoil" &&
                ((usdVendors.has(vendor) && singleUsdColumn) ||
                  (eurVendors.has(vendor) && singleEurColumn) ||
                  (tixVendors.has(vendor) && singleTixColumn))
              ) {
                linkElement.textContent = `✶\u00A0${value.price}`;
              } else {
                linkElement.textContent = value.price;
              }
            }
          }
        }
        linkElement.title = titleArray.join(", ");

        cellElement.appendChild(linkElement);

        rowElement.insertBefore(cellElement, rowElement.children[beforeIndex]);
      }
    }
  }
}

async function main() {
  try {
    setAgent("ScryBuy", "2.1.0");
    const startOptions = performance.now();
    const options = await getOptions();
    console.log(
      `getOptions took ${(performance.now() - startOptions).toFixed(2)} ms`
    );

    const startPrices = performance.now();
    const urlToPrice = await getUrlToPrice();
    console.log(
      `getUrlToPrice took ${(performance.now() - startPrices).toFixed(2)} ms`
    );

    const startStoreButtons = performance.now();
    addStoreButtons(urlToPrice, options);
    console.log(
      `addStoreButtons took ${(performance.now() - startStoreButtons).toFixed(2)} ms`
    );

    const startPrintButtons = performance.now();
    addPrintButtons(urlToPrice, options);
    console.log(
      `addPrintButtons took ${(performance.now() - startPrintButtons).toFixed(2)} ms`
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
