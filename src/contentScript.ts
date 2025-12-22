import {
  addScryfallPrintButtons,
  addScryfallStoreButtons,
  getScryfallCards,
} from "./scryfall";
import { addCardKingdomEntries } from "./cardKingdom";
import { Catalog, Options } from "./types";
import { addManaPoolEntries } from "./manaPool";

const options: Options = {
  stores: {
    tcgPlayer: false,
    manaPool: true,
    cardKingdom: false,
    cardMarket: false,
    cardHoarder: false,
  },
};

if (!options.stores.cardKingdom) {
  const styleElement = document.createElement("style");
  styleElement.id = "page-hide-style";
  styleElement.textContent = `
  html, body {
    visibility: hidden !important;
    background: transparent !important;
  }
`;
  document.documentElement.appendChild(styleElement);
}

async function main() {
  const catalog: Catalog = {};

  try {
    const urlToCards = await getScryfallCards(document);

    const adds: Promise<void>[] = [];
    if (options.stores.manaPool) {
      adds.push(addManaPoolEntries(catalog, urlToCards));
    }
    if (options.stores.cardKingdom) {
      adds.push(addCardKingdomEntries(catalog, urlToCards));
    }
    await Promise.all(adds);

    console.log(catalog);

    addScryfallStoreButtons(options, catalog, document);
    addScryfallPrintButtons(options, catalog, document);
  } finally {
    const styleElement = document.getElementById("page-hide-style");
    if (styleElement) {
      styleElement.remove();
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
