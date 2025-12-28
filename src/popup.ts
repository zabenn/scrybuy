import browser from "webextension-polyfill";
import { Options, defaultOptions } from "./types";

const tcgPlayer = document.getElementById("tcgPlayer") as HTMLInputElement;
const manaPool = document.getElementById("manaPool") as HTMLInputElement;
const cardKingdom = document.getElementById("cardKingdom") as HTMLInputElement;
const cardmarket = document.getElementById("cardmarket") as HTMLInputElement;
const cardhoarder = document.getElementById("cardhoarder") as HTMLInputElement;

const hideWhileLoading = document.getElementById(
  "hideWhileLoading"
) as HTMLInputElement;
const multicolor = document.getElementById("multicolor") as HTMLInputElement;

async function main() {
  const options = (await browser.storage.sync.get(defaultOptions)) as Options;

  tcgPlayer.checked = options.vendors.tcgPlayer;
  manaPool.checked = options.vendors.manaPool;
  cardKingdom.checked = options.vendors.cardKingdom;
  cardmarket.checked = options.vendors.cardmarket;
  cardhoarder.checked = options.vendors.cardhoarder;
  hideWhileLoading.checked = options.hideWhileLoading;
  multicolor.checked = options.multicolor;

  tcgPlayer.addEventListener("change", save);
  manaPool.addEventListener("change", save);
  cardKingdom.addEventListener("change", save);
  cardmarket.addEventListener("change", save);
  cardhoarder.addEventListener("change", save);

  hideWhileLoading.addEventListener("change", save);
  multicolor.addEventListener("change", save);
}

async function save() {
  const options: Options = {
    vendors: {
      tcgPlayer: tcgPlayer.checked,
      manaPool: manaPool.checked,
      cardKingdom: cardKingdom.checked,
      cardmarket: cardmarket.checked,
      cardhoarder: cardhoarder.checked,
    },
    hideWhileLoading: hideWhileLoading.checked,
    multicolor: multicolor.checked,
  };

  console.log("Saving options", options);

  await browser.storage.sync.set(options);
}

main();
