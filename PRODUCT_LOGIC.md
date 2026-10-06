# Product logic

Axelerate V1 matches demand before it matches supply. Axelerate does not hold inventory, take consumer payment, or act as merchant of record.

## Consumer

1. Write a sentence.
2. The app interprets category, product type, budget, and constraints.
3. If a compatible cluster exists, the person may join it or open a separate one.
4. Participation expires with the timeframe they chose. Leaving removes its weight.
5. When brands have live offers, the person sees at most three, with matched and unmatched requirements.
6. Buy opens the brand’s site with an `ax_ref` token.
7. “I bought it” is a self-report. It does not verify the user or the revenue.

## Merchant

1. Create an organization. It starts `pending`.
2. Add products with structured attributes. Pending merchants cannot publish offers.
3. After an admin verifies the business identity, the merchant sees demand in their categories only.
4. An offer points at a product. Axelerate calculates the match. The merchant’s “why it fits” is copy, not a score.
5. An admin approves the offer, then sets it live.
6. Performance splits self-reported purchases from verified GMV. The fee uses only verified GMV.

## Admin

- Move a cluster (sourcing, expire, reject).
- Verify, reject, or suspend an organization.
- Approve, publish, pause, or reject an offer.
- Verify a purchase with a merchant order id and amount.

Qualification does not wait for a merchant. `collecting → qualified → sourcing` happens from active demand, ready-to-buy count, and estimated value. `offers_live` needs a live offer. `converting` needs a verified purchase.

## Commercial model

One model per organization, stored as `commercial`:

- `revenue_share` with `rate`
- `cpa` with `amount`

No subscription, campaign package, or data sale is implemented.

## Privacy

Merchant screens receive aggregates and anonymous participation facts (readiness, budget, verification level). They do not receive name, email, address, or raw private text. Copy says “Business identity verified”, not that Axelerate certifies the product.

## What is still manual

- Applying the SQL migration.
- Granting `user_roles.role = 'admin'` in the database. The in-app admin password is not security.
- Confirming orders. There is no Shopify webhook in this V1.
