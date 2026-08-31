import browser from "webextension-polyfill";
import type { paths } from "./scrybuy-api-openapi";
import createClient from "openapi-fetch";
import { PriceEntry } from "./types";

const client = createClient<paths>({
  baseUrl: "https://scrybuy-api.onrender.com/",
  headers: { "User-Agent": "ScryBuy/2.3.1" },
});

const MAX_FETCH_ATTEMPTS = 3;

async function fetchPricesWithRetry(
  urls: string[],
): Promise<{ [key: string]: PriceEntry } | undefined> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_FETCH_ATTEMPTS; attempt++) {
    try {
      const { data, error, response } = await client.GET("/prices", {
        params: {
          query: { url: urls },
        },
      });
      if (!error && response.ok) {
        return data;
      }
      lastError = error ?? response.statusText;
    } catch (err) {
      lastError = err;
    }
    console.warn(
      `fetchPrices attempt ${attempt}/${MAX_FETCH_ATTEMPTS} failed`,
      lastError,
    );
  }
  console.error("fetchPrices failed after retries", lastError);
  return undefined;
}

browser.runtime.onMessage.addListener((message: any) => {
  if (message.action === "fetchPrices") {
    return fetchPricesWithRetry(message.urls);
  }
});

export async function fetchPrices(
  urls: string[],
): Promise<{ [key: string]: PriceEntry }> {
  const data: { [key: string]: PriceEntry } | undefined =
    await browser.runtime.sendMessage({
      action: "fetchPrices",
      urls: urls,
    });
  if (data) {
    return data;
  }
  return {};
}
