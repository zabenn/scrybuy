import { Card } from "scryfall-sdk";
import { fetchDom } from "./background";
import { Catalog } from "./types";
import { Entries } from "type-fest/source/entries";
import browser from "webextension-polyfill";

function getName(card: Card): string {
  return encodeURIComponent(card!.name.toLowerCase().replace(/[\s/]+/g, "-"));
}

export async function addManaPoolEntries(
  catalog: Catalog,
  urlToCards: Record<string, Card>
): Promise<void> {
  for (const [scryfallUrl, card] of Object.entries(urlToCards) as Entries<
    typeof urlToCards
  >) {
    catalog[scryfallUrl] ??= {};
    catalog[scryfallUrl].manaPool = {
      nonfoil: {
        url: `https://www.manapool.com/card/${getName(card)}?ref=scrybuy`,
      },
    };
  }

  const cardUrl = `https://manapool.com/card/${getName(Object.values(urlToCards)[0])}?ref=scrybuy&${Object.values(
    urlToCards
  )
    .map((card) => `set=${card.set.toUpperCase()}`)
    .join("&")}`;
  console.log("Fetching Mana Pool URL: ", cardUrl);
  const document = await fetchDom(cardUrl);
  if (!document) {
    return;
  }
  document.querySelectorAll('[role="link"]').forEach((linkElement) => {
    const printUrl = (linkElement as HTMLAnchorElement).href;
    const price =
      linkElement.querySelector(".text-green-700")?.textContent ?? null;
    for (const [scryfallUrl, card] of Object.entries(urlToCards) as Entries<
      typeof urlToCards
    >) {
      if (
        printUrl.split("/").slice(2).join("/") ===
        scryfallUrl.split("/").slice(2).join("/")
      ) {
        const entry = {
          url: printUrl,
          price: price ?? undefined,
        };
        for (const printElement of linkElement.querySelector(".flex.flex-wrap")
          ?.children ?? []) {
          if (printElement.textContent === "Non-Foil") {
            catalog[scryfallUrl].manaPool!.nonfoil = entry;
          } else if (printElement.textContent === "Foil") {
            catalog[scryfallUrl].manaPool!.foil = entry;
          } else if (printElement.textContent === "Etched Foil") {
            catalog[scryfallUrl].manaPool!.etched = entry;
          }
        }
        break;
      }
    }
  });
}
