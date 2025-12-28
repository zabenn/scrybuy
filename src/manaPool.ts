import { Card } from "scryfall-sdk";
import { fetchDom } from "./background";
import { Catalog } from "./types";
import { Entries } from "type-fest/source/entries";

const base = "https://manapool.com";

function getName(card: Card): string {
  return encodeURIComponent(card!.name.toLowerCase().replace(/[\s/]+/g, "-"));
}

export function addManaPoolEntries(
  catalog: Catalog,
  urlToCards: Record<string, Card>
): void {
  for (const [scryfallUrl, card] of Object.entries(urlToCards) as Entries<
    typeof urlToCards
  >) {
    catalog[scryfallUrl] ??= {};
    catalog[scryfallUrl].manaPool = {};
    for (const finish of card.finishes) {
      let cardUrl = null;
      if (finish === "nonfoil") {
        cardUrl = new URL(`card/${getName(card)}?ref=scrybuy&finish=NF`, base);
      } else if (finish === "foil") {
        cardUrl = new URL(`card/${getName(card)}?ref=scrybuy&finish=FO`, base);
      } else if (finish === "etched") {
        cardUrl = new URL(`card/${getName(card)}?ref=scrybuy&finish=EF`, base);
      }
      if (cardUrl) {
        catalog[scryfallUrl].manaPool[finish] = { url: cardUrl };
      }
    }
  }
}

export async function fetchManaPoolEntries(
  catalog: Catalog,
  urlToCards: Record<string, Card>
): Promise<void> {
  const cardUrl = new URL(
    `card/${getName(Object.values(urlToCards)[0])}?ref=scrybuy&${Object.values(
      urlToCards
    )
      .map((card) => `set=${card.set.toUpperCase()}`)
      .join("&")}`,
    base
  );
  console.log("Fetching Mana Pool URL: ", cardUrl.href);
  const document = await fetchDom(cardUrl);
  if (!document) {
    return;
  }
  document.querySelectorAll('[role="link"]').forEach((linkElement) => {
    const printUrl = new URL(
      `${(linkElement as HTMLAnchorElement).getAttribute("href")!}?ref=scrybuy`,
      base
    );
    let price =
      linkElement.querySelector(".text-green-700")?.textContent ?? null;
    if (price) {
      price = `$${Number(price.replace(/\$/g, "")).toFixed(2)}`;
    }
    for (const [scryfallUrl, card] of Object.entries(urlToCards) as Entries<
      typeof urlToCards
    >) {
      const languages = new Set<string>();
      if (card.lang !== "en") {
        for (const languageElement of linkElement.querySelector(
          ".flex.flex-wrap"
        )?.children ?? []) {
          const language =
            languageElement.querySelector("span")?.textContent.toLowerCase() ??
            "";
          if (language.length > 0) {
            languages.add(language);
          }
        }
      }
      if (
        printUrl.pathname.split("/").slice(2, 4).toString() ===
          new URL(scryfallUrl).pathname.split("/").slice(2, 4).toString() &&
        (card.lang === "en" || languages.has(card.lang))
      ) {
        const entry = {
          url: printUrl,
          price: price ?? undefined,
        };
        for (const printElement of linkElement.querySelector(".flex.flex-wrap")
          ?.children ?? []) {
          if (printElement.textContent === "Non-Foil") {
            catalog[scryfallUrl].manaPool!.nonfoil = entry;
          } else if (printElement.textContent === "Etched Foil") {
            catalog[scryfallUrl].manaPool!.etched = entry;
          } else if (printElement.textContent.includes("Foil")) {
            catalog[scryfallUrl].manaPool!.foil = entry;
          }
        }
        break;
      }
    }
  });
}
