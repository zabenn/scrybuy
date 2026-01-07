import { Card, CardIdentifier, Cards, setAgent } from "scryfall-sdk";
import {
  existingVendors,
  Catalog,
  Options,
  usdVendors,
  eurVendors,
  tixVendors,
} from "./types";
import { Entries } from "type-fest";

const manaPoolPath =
  "M5.42 13.51 L1.14 11.31 V5.76 L5.42 7.89 V13.51 Z M6.63 7.55 L5.42 7.89 V13.51 L12.48 11.60 V6.03 L11.13 6.39 V9.46 L8.29 10.26 V11.36 L6.63 11.78 V7.55 Z M5.42 7.89 L1.14 5.76 V2.15 L5.42 4.33 V7.89 Z M12.48 2.39 L7.86 0.27 L1.14 2.15 L5.42 4.33 L12.48 2.39 Z M11.13 6.39 L12.48 6.03 V2.39 L5.42 4.33 V7.89 L6.63 7.55 V5.33 L8.93 6.14 L11.13 4.12 V6.39 Z";
const cardKingdomPath =
  "M0 0 V4.38 H1.97 V11.99 H12.03 V4.38 H14 V0 H11.82 V4.12 H9.96 V0.03 H7.89 V4.12 H6.11 V0 H4.04 V4.12 H2.18 V0 Z";

function camelToKebabCase(str: string): string {
  return str
    .split(/\.?(?=[A-Z])/)
    .join("-")
    .toLowerCase();
}

export async function getScryfallCards(
  document: Document
): Promise<Record<string, Card>> {
  setAgent("ScryBuy", "2.0.1");

  const tableElement = Array.from(
    document.querySelector(".prints")!.querySelectorAll("table.prints-table")
  ).find((table) => table.textContent.includes("Prints"))!;
  const bodyElement = tableElement.querySelector("tbody")!;

  const urls = new Set<URL>();
  for (const rowElement of bodyElement.children) {
    if (rowElement.textContent?.includes("View all prints")) {
      continue;
    }
    const scryfallLinkElement = rowElement.children[0]
      .children[0] as HTMLAnchorElement;
    urls.add(new URL(scryfallLinkElement.href));
  }

  const cards = await Cards.collection(
    ...Array.from(urls).map((scryfallLink) => {
      return CardIdentifier.bySet(
        scryfallLink.pathname.split("/")[2],
        decodeURIComponent(scryfallLink.pathname.split("/")[3])
      );
    })
  ).waitForAll();

  const urlToCards: Record<string, Card> = {};
  for (let i = 0; i < cards.length; i++) {
    const url = Array.from(urls)[i];
    const card = cards[i];
    if (!card.games.includes("paper")) {
      console.log(
        "Card is not available in paper: ",
        card.set,
        card.collector_number
      );
    }
    urlToCards[url.href] = card;
  }
  return urlToCards;
}

export function addScryfallStoreButtons(
  options: Options,
  catalog: Catalog,
  document: Document
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
    typeof options.vendors
  >) {
    const listElement = document.createElement("li");
    listElement.id = camelToKebabCase(vendor);

    if (existingVendors.has(vendor)) {
      let index: number;
      if (vendor === "tcgPlayer") {
        index = storesElement.children.length - 3;
      } else if (vendor === "cardmarket") {
        index = storesElement.children.length - 2;
      } else {
        index = storesElement.children.length - 1;
      }
      if (!enabled) {
        storesElement.removeChild(storesElement.children[index]);
      }
    } else if (enabled) {
      const entry = catalog[document.URL.split("?")[0]]?.[vendor];
      for (const [finish, value] of Object.entries(entry!) as Entries<
        typeof entry
      >) {
        const linkElement = document.createElement("a");
        linkElement.href = value!.url.href;
        linkElement.id = finish;
        linkElement.classList.add("button-n");
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

        listElement.appendChild(linkElement);
      }

      let beforeIndex: number;
      if (usdVendors.has(vendor)) {
        beforeIndex = storesElement.children.length - 2;
      } else if (usdVendors.has(vendor)) {
        beforeIndex = storesElement.children.length - 1;
      } else {
        beforeIndex = storesElement.children.length;
      }
      storesElement.insertBefore(
        listElement,
        storesElement.children[beforeIndex]
      );
    }
  }
}

export function addScryfallStorePrices(
  options: Options,
  catalog: Catalog,
  document: Document
): void {
  const storesElement = document.querySelector("#stores")!.children[1];

  for (const [vendor, enabled] of Object.entries(options.vendors) as Entries<
    typeof options.vendors
  >) {
    if (enabled) {
      const entry = catalog[document.URL.split("?")[0]]?.[vendor];
      for (const [finish, value] of Object.entries(entry ?? []) as Entries<
        typeof entry
      >) {
        const linkElement = storesElement.querySelector(
          `li#${camelToKebabCase(vendor)} a#${finish}`
        );
        if (linkElement && value?.price) {
          (linkElement as HTMLAnchorElement).href = value!.url.href;
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
      }
    }
  }
}

export function addScryfallPrintButtons(
  options: Options,
  document: Document
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
    typeof options.vendors
  >) {
    let columnElement: HTMLTableCellElement;
    if (existingVendors.has(vendor)) {
      let index: number;
      if (vendor === "tcgPlayer") {
        index = headElement.children.length - 3;
      } else if (vendor === "cardmarket") {
        index = headElement.children.length - 2;
      } else {
        index = headElement.children.length - 1;
      }
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

      let beforeIndex: number;
      if (usdVendors.has(vendor)) {
        beforeIndex = headElement.children.length - 2;
      } else if (usdVendors.has(vendor)) {
        beforeIndex = headElement.children.length - 1;
      } else {
        beforeIndex = headElement.children.length;
      }
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
        linkElement.id = camelToKebabCase(vendor);
        if (!options.multicolor) {
          linkElement.classList.add("currency-eur");
        } else if (vendor === "manaPool") {
          linkElement.className = "mana-pool";
        } else if (vendor === "cardKingdom") {
          linkElement.className = "card-kingdom";
        }

        cellElement.appendChild(linkElement);

        rowElement.insertBefore(cellElement, rowElement.children[beforeIndex]);
      }
    }
  }
}

export function addScryfallPrintPrices(
  options: Options,
  catalog: Catalog,
  document: Document
): void {
  const tableElement = Array.from(
    document.querySelector(".prints")!.querySelectorAll("table.prints-table")
  ).find((table) => table.innerHTML.includes("Prints"))!;
  const bodyElement = tableElement.querySelector("tbody")!;

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

  for (const rowElement of bodyElement.children) {
    for (const [vendor, enabled] of Object.entries(options.vendors) as Entries<
      typeof options.vendors
    >) {
      if (rowElement.innerHTML?.includes("View all prints")) {
        continue;
      }
      if (!existingVendors.has(vendor) && enabled) {
        {
          const linkElement = rowElement.querySelector(
            `a#${camelToKebabCase(vendor)}`
          )! as HTMLAnchorElement;
          const entry =
            catalog[
              (rowElement.children[0].children[0] as HTMLAnchorElement).href
            ]?.[vendor];
          const titleArray = [];
          for (const [finish, value] of Object.entries(entry ?? []) as Entries<
            typeof entry
          >) {
            if (value?.price) {
              if (finish !== "etched") {
                titleArray.push(
                  `${finish.charAt(0).toUpperCase() + finish.slice(1)}: ${value.price}`
                );
              } else if (!entry?.nonfoil && !entry?.foil) {
                titleArray.push(`Price: ${value.price}`);
              }
              if (!linkElement.textContent) {
                linkElement.href = value.url.href;
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
        }
      }
    }
  }
}
