import browser from "webextension-polyfill";
import { Options, defaultOptions } from "./types";

const tcgPlayerElement = document.getElementById(
  "tcg-player"
) as HTMLInputElement;
const manaPoolElement = document.getElementById(
  "mana-pool"
) as HTMLInputElement;
const cardKingdomElement = document.getElementById(
  "card-kingdom"
) as HTMLInputElement;
const cardmarketElement = document.getElementById(
  "cardmarket"
) as HTMLInputElement;
const cardhoarderElement = document.getElementById(
  "cardhoarder"
) as HTMLInputElement;

const hideWhileLoadingElement = document.getElementById(
  "hide-while-loading"
) as HTMLInputElement;
const multicolorElement = document.getElementById(
  "multicolor"
) as HTMLInputElement;

async function onToggleChanged(element: HTMLInputElement) {
  const options: Options = {
    vendors: {
      tcgPlayer: tcgPlayerElement.checked,
      manaPool: manaPoolElement.checked,
      cardKingdom: cardKingdomElement.checked,
      cardmarket: cardmarketElement.checked,
      cardhoarder: cardhoarderElement.checked,
    },
    hideWhileLoading: hideWhileLoadingElement.checked,
    multicolor: multicolorElement.checked,
  };

  await browser.storage.sync.set(options);

  element.ariaPressed = element.checked.toString();
}

function setupToggleButton(element: HTMLInputElement, checked: boolean) {
  element.checked = checked;
  element.ariaPressed = checked.toString();
  element.addEventListener("change", () => onToggleChanged(element));
}

async function main() {
  document.body.classList.toggle(
    "dark",
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  const options = (await browser.storage.sync.get(defaultOptions)) as Options;

  setupToggleButton(tcgPlayerElement, options.vendors.tcgPlayer);
  setupToggleButton(manaPoolElement, options.vendors.manaPool);
  setupToggleButton(cardKingdomElement, options.vendors.cardKingdom);
  setupToggleButton(cardmarketElement, options.vendors.cardmarket);
  setupToggleButton(cardhoarderElement, options.vendors.cardhoarder);
  setupToggleButton(hideWhileLoadingElement, options.hideWhileLoading);
  setupToggleButton(multicolorElement, options.multicolor);
}

main();
