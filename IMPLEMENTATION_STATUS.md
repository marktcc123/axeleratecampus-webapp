# Implementation status

This describes the code in the repo, not the target product. The two-browser acceptance test does **not** pass against Supabase until the migration is applied and two real auth users exist. Until then, live mode is implemented in code and unproven against a database.

## IMPLEMENTED

- V1 cluster lifecycle in `src/lib/marketplace.js` and `src/lib/demand-quality.js`: collecting, qualified, sourcing, offers_live, converting, closed, expired, rejected.
- Qualification from active participants, ready-to-buy, and estimated value. Merchant matches are not required.
- Rule-based `interpretDemand` and clustering that stores keywords on organic clusters.
- Offer match from product attributes. Merchant `matched` claims are not used. Labels are Best Match, Best Value, Fastest. At most three offers.
- Self-report stays `self_reported` and does not set V3. `verifyPurchase` writes a purchase and can set V3.
- Fee calculation from verified GMV or CPA. Null when unconfigured.
- Category filter for a merchant who has an organization.
- Demo/live split. Demo loads seed data. Live does not.
- Legacy earn/shop/missions/wallet hidden unless `VITE_LEGACY_MODE=1`.
- Marketplace admin routes: `/app/me/admin/demand|merchants|offers|attribution`.
- SQL migration and RLS sketch: `supabase/migrations/20261006000000_marketplace_v1.sql`.
- Live read/write adapter: `src/marketplace/remote.js`.

## PARTIALLY IMPLEMENTED

- Supabase auth. Live signup can call `signUp` / Google OAuth. Demo mode still uses the local session. Legacy `/verify` still exists behind the legacy flag, including `.edu` flows.
- Shared demand. The rules are real. Cross-browser persistence works only after the migration is applied and `VITE_APP_MODE=live`. It has not been executed against the project’s Supabase here.
- Admin authority in live mode depends on a `user_roles` row. The password gate is still the local console lock.
- Notifications are in-app records on a few transitions, not the full list in the brief.
- Demand compression counts are on the admin demand panel for signals this browser has written.

## MOCKED

- Demo participants, demo attributions, and demo GMV, only when `VITE_APP_MODE` is not `live`. They are marked `demo: true`.
- Demo Google/Apple buttons, only in demo mode. They create local `.demo` identities.

## NOT IMPLEMENTED

- Shopify order webhook. Manual order-id verification is the V1 path.
- Server-side enforcement that the running app has already migrated. A live boot without the tables shows the adapter error and does not fall back to seed data.
- Email notifications, Scout payouts, V4 deposits, subscriptions, in-app checkout, returns.
- A second browser session was not run against a real database in this change.
