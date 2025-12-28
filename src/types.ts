import { CardFinish } from "scryfall-sdk";

type EnumMap<
  E extends Record<string, any>,
  T = any,
  Optional extends boolean = true,
> = Optional extends true
  ? { -readonly [K in keyof E as K extends string ? K : never]?: T }
  : { -readonly [K in keyof E as K extends string ? K : never]: T };

export type Options = {
  vendors: EnumMap<typeof Vendors, boolean, false>;
  hideWhileLoading: boolean;
  multicolor: boolean;
};

export const enum Vendors {
  tcgPlayer,
  manaPool,
  cardKingdom,
  cardmarket,
  cardhoarder,
}

export type Catalog = Record<
  string,
  EnumMap<
    typeof Vendors,
    EnumMap<
      typeof CardFinish,
      {
        url: URL;
        price?: string;
      }
    >
  >
>;

export const defaultOptions: Options = {
  vendors: {
    tcgPlayer: true,
    manaPool: true,
    cardKingdom: true,
    cardmarket: true,
    cardhoarder: true,
  },
  hideWhileLoading: true,
  multicolor: false,
};

export const existingVendors = new Set<keyof typeof Vendors>([
  "tcgPlayer",
  "cardmarket",
  "cardhoarder",
]);
export const usdVendors = new Set<keyof typeof Vendors>([
  "tcgPlayer",
  "manaPool",
  "cardKingdom",
]);
export const eurVendors = new Set<keyof typeof Vendors>(["cardmarket"]);
export const tixVendors = new Set<keyof typeof Vendors>(["cardhoarder"]);
