import browser from "webextension-polyfill";
import type { paths, components } from "./scrybuy-api-openapi";
import createClient from "openapi-fetch";
import { Price } from "./types";

const client = createClient<paths>({
  baseUrl: "https://scrybuy-api.fly.dev/",
  headers: { "User-Agent": "ScryBuy/2.1.0" },
});

browser.runtime.onMessage.addListener((message: any) => {
  if (message.action === "fetchPrices") {
    return client
      .GET("/prices", {
        params: {
          query: { id: message.ids },
        },
      })
      .then(({ data }) => data);
  }
});

export async function fetchPrices(ids: string[]): Promise<Price[] | null> {
  const data: Price[] | undefined = await browser.runtime.sendMessage({
    action: "fetchPrices",
    ids: ids,
  });
  if (data) {
    return data;
  }
  return null;
}
