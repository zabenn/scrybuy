import {
  addScryfallPrintButtons,
  addScryfallPrintPrices,
  addScryfallStoreButtons,
  addScryfallStorePrices,
  getScryfallCards,
} from "./scryfall";
import { addCardKingdomEntries, fetchCardKingdomEntries } from "./cardKingdom";
import { Catalog, defaultOptions, Options } from "./types";
import { addManaPoolEntries, fetchManaPoolEntries } from "./manaPool";
import browser from "webextension-polyfill";

document.documentElement.classList.add("loading");

async function main() {
  const options = (await browser.storage.sync.get(defaultOptions)) as Options;

  const catalog: Catalog = {};

  const urlToCards = await getScryfallCards(document);
  if (options.vendors.manaPool) {
    addManaPoolEntries(catalog, urlToCards);
  }
  if (options.vendors.cardKingdom) {
    addCardKingdomEntries(catalog, urlToCards);
  }

  addScryfallStoreButtons(options, catalog, document);
  addScryfallPrintButtons(options, document);

  if (
    !options.hideWhileLoading ||
    (options.vendors.cardKingdom &&
      (document.URL.includes("forest") ||
        document.URL.includes("island") ||
        document.URL.includes("mountain") ||
        document.URL.includes("plains") ||
        document.URL.includes("swamp")))
  ) {
    document.documentElement.classList.remove("loading");
  }

  try {
    const adds: Promise<void>[] = [];
    if (options.vendors.manaPool) {
      adds.push(fetchManaPoolEntries(catalog, urlToCards));
    }
    if (options.vendors.cardKingdom) {
      adds.push(fetchCardKingdomEntries(catalog, urlToCards));
    }
    await Promise.all(adds);

    console.log("Catalog:", catalog);

    addScryfallStorePrices(options, catalog, document);
    addScryfallPrintPrices(options, catalog, document);
  } finally {
    if (options.hideWhileLoading) {
      document.documentElement.classList.remove("loading");
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
