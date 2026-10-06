/**
 * The card path's exit. Orders paid by card are placed in the SHOP — the
 * product is on Shopify later, and the card, the receipt and the fulfilment
 * are its job, not this app's. v1 has no shop to hand off to, so this resolves
 * with a stand-in URL and the cart draws its own confirmation. Never call
 * fetch here in v1; the e2e "checkout sends nothing" asserts it.
 */
export async function goToShopCheckout({ items, subtotalUsd }) {
  if (!items?.length) throw new Error('Nothing to check out');
  return { ok: true, url: 'https://shop.axelerate.example/checkout', subtotalUsd };
}
