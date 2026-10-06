// Reprice a cart from product rows. The browser's totals are ignored.

function choicesOf(product) {
  const variants = product?.specifications?.shopify_variants;
  if (!Array.isArray(variants)) return [];
  return variants.filter((v) => v && v.title && v.title !== 'Default Title');
}

export function quoteCart(products, lines, { creditBalance = 0, creditsToUse = 0 } = {}) {
  if (!Array.isArray(lines) || lines.length === 0) return { ok: false, error: 'Nothing to check out.' };
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const priced = [];
  let totalUsd = 0;
  let cashbackPts = 0;

  for (const line of lines) {
    const product = byId.get(line?.id);
    if (!product) return { ok: false, error: 'Product not found.' };
    const qty = Math.floor(Number(line.quantity));
    if (!Number.isFinite(qty) || qty < 1) return { ok: false, error: 'Invalid quantity.' };
    const choices = choicesOf(product);
    let unit = 0;
    let variantId = '';
    if (choices.length >= 2) {
      const match = choices.find((v) => v.title === line.size);
      if (!match) return { ok: false, error: 'Pick an option for every item.' };
      const stock = Number(match.inventory_quantity);
      if (Number.isFinite(stock) && stock < qty) return { ok: false, error: 'Out of stock.' };
      unit = Number(match.price);
      variantId = match.id ? String(match.id) : '';
    } else {
      const stock = Number(product.stock_count) || 0;
      if (stock < qty) return { ok: false, error: 'Out of stock.' };
      unit = Number(product.discount_price ?? product.original_price ?? 0);
    }
    if (!(unit > 0)) return { ok: false, error: 'Product has no cash price.' };
    const lineUsd = unit * qty;
    totalUsd += lineUsd;
    const rawPct = Number(product.credit_cashback_percent);
    const pct = Number.isFinite(rawPct) ? Math.min(100, Math.max(0, Math.round(rawPct))) : 10;
    cashbackPts += Math.round((lineUsd * pct) / 100 * 100);
    priced.push({
      id: product.id,
      quantity: qty,
      size: line.size || '',
      shopifyVariantId: variantId,
      unitUsd: Math.round(unit * 100) / 100,
    });
  }

  const balance = Math.max(0, Math.floor(Number(creditBalance) || 0));
  const asked = Math.max(0, Math.floor(Number(creditsToUse) || 0));
  const maxCredits = Math.min(balance, Math.floor(totalUsd * 100));
  const actualCreditsUsed = Math.min(asked, maxCredits);
  const amountToPayUsd = Math.max(0, Math.round((totalUsd - actualCreditsUsed / 100) * 100) / 100);
  return {
    ok: true,
    lines: priced,
    totalUsd: Math.round(totalUsd * 100) / 100,
    amountToPayUsd,
    actualCreditsUsed,
    cashbackPts,
  };
}
