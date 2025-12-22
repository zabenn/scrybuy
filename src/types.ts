import { CardFinish } from "scryfall-sdk";

type EnumMap<
  E extends Record<string, any>,
  T = any,
  Optional extends boolean = true,
> = Optional extends true
  ? { -readonly [K in keyof E as K extends string ? K : never]?: T }
  : { -readonly [K in keyof E as K extends string ? K : never]: T };

export const enum Stores {
  tcgPlayer,
  manaPool,
  cardKingdom,
  cardMarket,
  cardHoarder,
}

export type Catalog = Record<
  string,
  EnumMap<
    typeof Stores,
    EnumMap<
      typeof CardFinish,
      {
        url: string;
        price?: string;
      }
    >
  >
>;

export type Options = {
  stores: EnumMap<typeof Stores, boolean, false>;
};

export const ExistingStores = new Set<keyof typeof Stores>([
  "tcgPlayer",
  "cardMarket",
  "cardHoarder",
] as const);
export const UsdStores = new Set<keyof typeof Stores>([
  "tcgPlayer",
  "manaPool",
  "cardKingdom",
] as const);
export const EurStores = new Set<keyof typeof Stores>(["cardMarket"] as const);
export const TixStores = new Set<keyof typeof Stores>(["cardHoarder"] as const);
