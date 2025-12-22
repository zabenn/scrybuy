import { Card, CardIdentifier, Cards, setAgent } from "scryfall-sdk";
import {
  ExistingStores,
  Catalog,
  Options,
  UsdStores,
  EurStores,
  TixStores,
} from "./types";
import { Entries } from "type-fest";

function createCardKingdomSvg(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("height", "14");
  svg.setAttribute("width", "14");
  svg.setAttribute("viewBox", "0 0 3.7041667 3.1750001");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("aria-hidden", "true");

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", "translate(0 -293.82)");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "#004285");
  path.setAttribute(
    "d",
    "m0 293.82v1.1592h0.52042v2.0158h2.6633v-2.0158h0.52042v-1.1592h-0.57636v1.0908h-0.49196v-1.084h-0.54839v1.084h-0.47074v-1.084h-0.54839v1.084h-0.49196v-1.0908z"
  );

  g.appendChild(path);
  svg.appendChild(g);
  return svg;
}

export async function getScryfallCards(
  document: Document
): Promise<Record<string, Card>> {
  setAgent("ScryBuy", "1.1.0");

  const printsElement = document.querySelector(".prints")!;
  const tableElement = Array.from(
    printsElement.querySelectorAll("table.prints-table")
  ).find((table) => table.textContent.includes("Prints"))!;
  const bodyElement = tableElement.querySelector("tbody")!;

  const urls = new Set<string>();
  for (const rowElement of bodyElement.children) {
    if (rowElement.textContent?.includes("View all prints")) {
      continue;
    }
    const scryfallLinkElement = rowElement.children[0]
      .children[0] as HTMLAnchorElement;
    urls.add(scryfallLinkElement.href);
  }

  const cards = await Cards.collection(
    ...Array.from(urls).map((scryfallLink) => {
      return CardIdentifier.bySet(
        scryfallLink.split("/")[4],
        decodeURIComponent(scryfallLink.split("/")[5])
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
    urlToCards[url] = card;
  }
  return urlToCards;
}

export function addScryfallStoreButtons(
  options: Options,
  catalog: Catalog,
  document: Document
): void {
  const storesElement = document.getElementById("stores")!.children[1];

  for (const [store, enabled] of Object.entries(options.stores) as Entries<
    typeof options.stores
  >) {
    const listElement = document.createElement("li");

    if (ExistingStores.has(store)) {
      let index: number;
      if (store === "tcgPlayer") {
        index = storesElement.children.length - 3;
      } else if (store === "cardMarket") {
        index = storesElement.children.length - 2;
      } else {
        index = storesElement.children.length - 1;
      }
      if (!enabled) {
        storesElement.removeChild(storesElement.children[index]);
      }
    } else if (enabled) {
      const entry = catalog[document.URL.split("?")[0]]?.[store];
      for (const [finish, value] of Object.entries(entry!) as Entries<
        typeof entry
      >) {
        if (
          finish === "nonfoil" &&
          !value?.price &&
          (entry!.foil || entry!.etched || entry!.glossy)
        ) {
          continue;
        }

        const linkElement = document.createElement("a");
        linkElement.className = "button-n card-kingdom";
        linkElement.href = value!.url;

        linkElement.appendChild(createCardKingdomSvg());

        const labelElement = document.createElement("i");
        if (finish === "nonfoil") {
          labelElement.textContent = "Buy on ";
        } else {
          labelElement.textContent = `Buy ${finish} on `;
        }
        if (store === "cardKingdom") {
          labelElement.textContent += "Card Kingdom";
        } else if (store === "manaPool") {
          labelElement.textContent += "Mana Pool";
        }
        linkElement.appendChild(labelElement);

        if (value?.price) {
          const spanElement = document.createElement("span");
          spanElement.className = "price card-kingdom";
          if (finish === "nonfoil") {
            spanElement.textContent = value.price;
          } else {
            spanElement.textContent = `✶\u00A0${value.price}`;
          }
          linkElement.appendChild(spanElement);
        }

        listElement.appendChild(linkElement);
      }

      let beforeIndex: number;
      if (UsdStores.has(store)) {
        beforeIndex = storesElement.children.length - 2;
      } else if (UsdStores.has(store)) {
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

export function addScryfallPrintButtons(
  options: Options,
  catalog: Catalog,
  document: Document
): void {
  const printsElement = document.querySelector(".prints")!;
  const tableElement = Array.from(
    printsElement.querySelectorAll("table.prints-table")
  ).find((table) => table.innerHTML.includes("Prints"))!;
  const headElement = tableElement.querySelector("thead")!.children[0];
  const bodyElement = tableElement.querySelector("tbody")!;

  const singleUsdColumn =
    (Object.entries(options.stores) as Entries<typeof options.stores>).filter(
      ([store, enabled]) => UsdStores.has(store) && enabled
    ).length === 1;
  const singleEurColumn =
    (Object.entries(options.stores) as Entries<typeof options.stores>).filter(
      ([store, enabled]) => EurStores.has(store) && enabled
    ).length === 1;
  const singleTixColumn =
    (Object.entries(options.stores) as Entries<typeof options.stores>).filter(
      ([store, enabled]) => TixStores.has(store) && enabled
    ).length === 1;

  for (const [store, enabled] of Object.entries(options.stores) as Entries<
    typeof options.stores
  >) {
    let columnElement: HTMLTableCellElement;
    if (ExistingStores.has(store)) {
      let index: number;
      if (store === "tcgPlayer") {
        index = headElement.children.length - 3;
      } else if (store === "cardMarket") {
        index = headElement.children.length - 2;
      } else {
        index = headElement.children.length - 1;
      }
      columnElement = headElement.children[index] as HTMLTableCellElement;
      if (!enabled) {
        headElement.removeChild(columnElement);
        for (const rowElement of bodyElement.children) {
          if (rowElement.textContent.includes("View all prints")) {
            continue;
          }
          rowElement.removeChild(rowElement.children[index]);
        }
      } else if (store === "tcgPlayer" && !singleUsdColumn) {
        columnElement.innerHTML = "<span>TCG</span>";
      } else if (store === "cardMarket" && !singleEurColumn) {
        columnElement.innerHTML = "<span>CMK</span>";
      } else if (store === "cardHoarder" && !singleTixColumn) {
        columnElement.innerHTML = "<span>CHD</span>";
      }
    } else if (enabled) {
      columnElement = document.createElement("th");
      if (UsdStores.has(store) && singleUsdColumn) {
        columnElement.innerHTML = `<span>USD</span>`;
      } else if (store === "manaPool") {
        columnElement.innerHTML = `<span>MPL</span>`;
      } else if (store === "cardKingdom") {
        columnElement.innerHTML = `<span>CKD</span>`;
      }

      let beforeIndex: number;
      if (UsdStores.has(store)) {
        beforeIndex = headElement.children.length - 2;
      } else if (UsdStores.has(store)) {
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
            Object.values(options.stores).filter((enabled) => enabled).length +
            1;
          continue;
        }

        const cellElement = document.createElement("td");

        const entry =
          catalog[
            (rowElement.children[0].children[0] as HTMLAnchorElement).href
          ]?.[store];
        if (entry) {
          for (const [finish, value] of Object.entries(entry!) as Entries<
            typeof entry
          >) {
            if (value?.url && value?.price) {
              const linkElement = document.createElement("a");
              linkElement.className = "card-kingdom";
              linkElement.href = value.url;
              if (
                finish === "nonfoil" ||
                !UsdStores.has(store) ||
                !singleUsdColumn
              ) {
                linkElement.textContent = value.price;
              } else {
                linkElement.textContent = `✶\u00A0${value.price}`;
              }
              cellElement.appendChild(linkElement);
              break;
            }
          }
        }

        rowElement.insertBefore(cellElement, rowElement.children[beforeIndex]);
      }
    }
  }
}
