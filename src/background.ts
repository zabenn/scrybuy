import browser from "webextension-polyfill";

browser.runtime.onMessage.addListener((message: any) => {
  if (message.action === "fetchUrl") {
    return fetch(message.url, {
      headers: {
        "User-Agent": "ScryBuy/1.1.0",
      },
    }).then((response) => {
      if (response.ok) {
        return response.text();
      }
      return null;
    });
  }
});

export async function fetchDom(url: string): Promise<Document | null> {
  const text: string | null = await browser.runtime.sendMessage({
    action: "fetchUrl",
    url: url,
  });
  if (text) {
    const domParser = new DOMParser();
    return domParser.parseFromString(text, "text/html");
  }
  return null;
}
