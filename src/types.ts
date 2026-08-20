import browser from "webextension-polyfill";
import type { components } from "./scrybuy-api-openapi";

export type PriceEntry = components["schemas"]["PriceEntry"];
export type VendorEntry = components["schemas"]["VendorEntry"];
export type FinishEntry = components["schemas"]["FinishEntry"];

export type Vendor =
  | keyof PriceEntry
  | "tcgPlayer"
  | "cardmarket"
  | "cardhoarder";

export const addedVendors = new Set<Vendor>(["manaPool", "cardKingdom"]);
export const existingVendors = new Set<Vendor>([
  "tcgPlayer",
  "cardmarket",
  "cardhoarder",
]);
export const usdVendors = new Set<Vendor>([
  "tcgPlayer",
  "manaPool",
  "cardKingdom",
  "cardsphere",
]);
export const eurVendors = new Set<Vendor>(["cardmarket"]);
export const tixVendors = new Set<Vendor>(["cardhoarder"]);

export type Options = {
  vendors: Record<Vendor, boolean>;
  multicolor: boolean;
};

export async function getOptions(): Promise<Options> {
  const storedOptions = (await browser.storage.sync.get()) as Partial<Options>;
  return {
    vendors: {
      tcgPlayer: true,
      manaPool: true,
      cardKingdom: true,
      cardsphere: false,
      cardmarket: true,
      cardhoarder: true,
      ...(storedOptions.vendors ?? {}),
    },
    multicolor: storedOptions.multicolor ?? false,
  };
}
