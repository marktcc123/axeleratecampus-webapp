# Axelerate — Product Specification (text conversion)

> Owner-supplied source: `~/Downloads/Axelerate-Product-Specification.docx` (36,553 bytes, 2026-08-25).
> Converted with macOS `textutil`; tables are flattened to one cell per line and the ASCII loop diagram in §1 lost its layout. The `.docx` is authoritative where this text is ambiguous.
> Reproduced verbatim — including a stray email address in §3.5 that the owner has been asked to remove from the source.

---

Axelerate — Product Specification
1. What we’re building
The problem
Brands want to reach college students, and the usual channel — paid social ads — is expensive and distrusted by exactly this audience. They struggle to find loyal co-creators who can authentically connect with youth audiences. With limited marketing budgets, breaking through in this market is exceptionally difficult.
Students, meanwhile, want flexible paid work that fits between classes — and something harder to get: proof of professional experience. A student who has done real marketing work, it lives scattered across their social accounts, and no résumé line captures it credibly.
The product
Internal: Axelerate is a campus creator’s work profile, and the marketplace attached to it.
External: Axelerate is a gamified campus commerce and activation network connecting brands and students through product discovery, paid missions, and real-world brand experiences.
The Slogan
Shape what’s next.
Brands post paid, well-defined pieces of work — we call them missions: make a short video, staff a pop-up, attend a launch event, close a wholesale deal. Students at partner campuses apply, do the work, and get paid in real dollars. Every completed mission also builds a public, verifiable work profile — the student’s professional record on the platform — and earns XP that levels them up to better missions, perks, and status.
There is also a shop: partner brands’ products at student-exclusive prices, with cashback credit. It’s where earnings get spent, and it keeps students on the platform between missions.
The loop
   apply to mission ──▶ do the work ──▶ approved          ▲                                  │          │                     ┌────────────┴────────────┐          │                     ▼                         ▼    better missions      cash lands (USD)          XP lands → level up    unlock at the        withdrawable                     │    next level                 │                          ▼          │                    ▼                   unlocks: access,          └──── post about ─ spend in shop ◀────── perks, status                 the product   (student price
                          + credit back)
2. Systems and Rules
2.0 The nine rules
Every rule below is cited by number throughout this document. When a design or engineering decision conflicts with one of these, the rule wins.
#
Rule
Defined in
R1
Cash is the unit. Credit is never displayed as a bare number.
§2.1.1
R2
XP comes only from completed paid work. Never from attention, referrals, or invitation.
§2.1.2
R3
One object: the Mission. Content, Field, Event and Sales are formats of it, not separate systems.
§2.2.1
R4
Nothing is rank-locked at checkout. The shop has exactly one gate: verification.
§2.2.2
R5
Public claims are derived from verified data, never self-typed.
§2.2.3, §5.1
R6
Levels are permanent. Gates apply at promotion, never at demotion.
§3.2
R7
Levels buy access, status and perks. Pay alone never raises a tier, and a level never multiplies pay.
§2.1.3
R8
Everything locked shows its distance, in the unit the student controls.
§3.3
R9
Mission tiers and event tiers read the student’s level. One tier scale, T1–T5.
§2.2.3
2.1 The currency system
The three currencies at a glance:
Currency
Earned by
Spendable on
Leaves the platform?
Cash (USD)
Completing missions
Anything — withdrawable to a bank
Yes — Stripe Connect
Credit
Cashback on shop purchases
Shop items only
No — store credit
XP
Completing missions (only)
Nothing — it unlocks, never buys
No — progression only
2.1.1 — Cash is the unit.
How it works: every mission card, wallet row, and payout notice leads with a dollar figure. Credit is never displayed as a bare number — the UI always renders it with its dollar equivalence, in one string: 2,400 credit · $24 in shop.
2.1.2 — XP comes only from completed paid work. Never from attention.
How it works: XP is written by exactly one code path — a brand approving a completed mission (plus quest completions, which are themselves compositions of completed missions). There is no XP for opening the app, browsing, following a brand, connecting a social account, or filling in a profile field. Every award is an append-only xp_event row recording the base amount and each multiplier, so any XP total can be audited back to the real work that produced it. And because the formula can’t be gamed, we publish it in full, on-screen, at /app/me/level.
Notes: XP and the work history become the same data — “Level 4” means “has completed real missions, on time, for real brands,” which a brand can price and a recruiter can read. Second, the system can only be farmed with paid work.
2.1.3 — Levels buy access, status, and perks. Never a pay multiplier.
How it works: Every unlock in the ladder is one of four kinds:
	•	Capacity (run more missions at once)
	•	Friction removal (skip application review)
	•	Access (higher-paying missions, earlier drops)
	•	Status (frames, badges, the right to pitch a brand).
	•	What levels never do is multiply pay.
2.1.4 —** A level is a trust decision, not a score.**
What a level means: Trust × Skill × Track Record.
A higher level does not mean “joined earlier” or “ground harder,” and it never means “paid more for the same work”. It means the platform has growing confidence in this person’s professional reliability, and so they are allowed to take on more important, scarcer, more career-like work.
How it works: XP alone paces progress between levels — that’s the felt, week-to-week game. But promotion into each band (Insider, Trusted, Partner — the identities brands actually hire against) requires clearing a full eligibility check across four dimensions:
Promotion requirements = XP + mission count + quality + reliability
Dimension
Measured by
Why a brand cares
Volume
XP + missions completed
Enough work to judge them on
Breadth
Distinct mission formats worked
Skill, not a one-trick history
Reliability
On-time rate
Will the campaign ship on schedule
Standing
No serious violations
Disclosure compliance, no fraud, no misconduct
The level gates:
Promotion
XP
Missions
Quality
On-time
Standing
→ L2 Contributor
300
3
—
—
No serious violations
→ L3 Insider
1,200
5+
4.5★+ avg
≥90%
No serious violations
→ L4 Trusted
3,000
10+ · 3+ brands
strong ratings · 1+ portfolio piece
≥92%
No serious violations
→ L5 Partner
6,000
25+
sustained L4 record
≥95%
Clean · qualification + invitation
Every gate is shown to the student as a checklist with live progress. A student at the XP threshold with an 85% on-time rate sees exactly which box is unchecked and what clears it (thresholds are configuration data).
Two constraints that keep this fair: gates apply only at promotion, never at demotion.
2.2 The Marketplace
2.2.1 — One object: the Mission.
Anything a brand pays a student to do is a mission in one board, page, application pipeline, payout path:
	•	Content — make and post a video or photo set, tagged and disclosed
	•	Field — staff a table, run sampling, execute an on-campus activation
	•	Event — attend a brand event; RSVP-gated, capacity-limited
	•	Sales — close deals with local businesses, commission per deal
2.2.2 — Nothing is rank-locked at checkout.
How it works: the shop has exactly one gate — verification (proving you’re a student — a one-time flow, legally required before we can pay anyone anyway). Any verified student can buy anything in the base catalog at the student price, from day one. Levels add perks on top: LV.3 (Insider) adds a 5% shop discount and opens limited drops 24 hours early. Scarcity exists only where it’s genuinely real — drops with capped quantities.
2.2.3 — Missions have tiers, mirroring the ladder.
Students aren’t the only thing with levels — every mission carries a tier, and the two ladders are two sides of the same trust system: the student ladder says how much the platform trusts this person; the mission tier says how much trust this piece of work requires.
Mission tier
Open to
The work itself
T1 
Any verified student
Product tests, event RSVPs, simple posts — low risk, low autonomy
T2
LV.2 (Contributor)
Standard content and field work — a track record is forming
T3
LV.3 (Insider)
Multi-deliverable content, activations with real logistics
T4
LV.4 (Trusted)
High value, high autonomy — campaign leads, retail pilots, focus groups
T5
LV.5 (Partner)
Recurring brand relationships, campus lead roles, co-creation
How it works on a card: the tier is part of the mission’s identity, printed on every card —
Dermabell Campus Launch $280 TRUSTED MISSION · LV.4 4 hours · UCLA · Brand Activation · Leadership +850 XP
— and when a lower-level student sees the same card:
🔒 Trusted · LV.4 620 XP away — about 3 missions
The dollar figure stays visible, the tier explains why it’s gated, and the distance says what to do tonight.
The five dimensions of mission value — and the tier rubric. A student judges whether a mission is good on five dimensions. The platform scores the same five when assigning its tier — one table, read by both sides:
Dimension
The student’s question
What the ladder looks like
Money
How much do I earn?
$10 product feedback → $40 UGC video → $80 campus activation → $250 full campaign → $500–1,500/mo campus lead
Career
Can I put this on a résumé?
“Hand out samples for 2h · $40” vs. “Assist Dermabell UCLA Campus Launch — manage sampling, student feedback, campaign reporting · $100” — the second is worth far more than the $60 gap
Access
Would I ever get near this otherwise?
Pre-launch product testing → brand HQ visit → closed-door founder meeting → brand trip
Autonomy
Who decides how it’s done?
LV.1: film a TikTok to a given script → LV.3: here’s the product and the brief, you propose the concept → LV.5: here’s a $1,000 activation budget, design the plan and lead a team of five
Status
Was I chosen?
“Open to all UCLA students” → “Trusted creators · LV.4” → “Invite only” — the badge itself is prestige
Three consequences of this model:
• Money can never be the only progression logic — a board where the ladder is just “bigger numbers” is TaskRabbit with extra steps. Pay alone never raises a tier (R7); Career, Access, Autonomy and Status are what make a higher tier feel like a promotion rather than a raise.
• Career value is printed on the mission. The mission detail page shows the skills the work certifies — Skills: Event Marketing · Consumer Research · Brand Activation — so a student reads “$100 and a provable line of experience,” not just a price. On completion those skills flow into /u/[handle] as verified, brand-backed skill tags (R5): the mission writes the résumé line, the profile publishes it.
• Access is the cheapest perk we have. A founder dinner, a pre-launch panel, an HQ visit — enormous value to a student, near-zero marginal cost to the platform or brand. When designing level perks, spend Access before spending money.
Tier assignment must have one logic, not a per-deal negotiation — the five scores are stored on the mission (rubric_scores) at creation. Full scoring tooling is a later phase; the rubric applies manually from day one, because retrofitting consistency onto a board that already shipped inconsistent tiers is far harder than starting with it.
Events across the tiers — the funnel written into the calendar. Events are a mission format (R3), so they carry the same T1–T5 tiers as everything else — there is one tier scale in the product, not one per format — but events are where the tier ladder does its most visible gamification work, because each tier of event serves a different strategic job:
Event tier
Open to
Examples
Strategic job
T1
Any verified student
Pop-ups, sampling, product launches, workshops
Acquisition — the front door; bring a friend
T2
LV.2 (Contributor)
Early product launches, creator workshops, brand masterclasses, founder AMAs, networking nights
Retention — the reason to keep completing missions
T3
LV.3 (Insider)
Closed events, premium sampling sessions, brand Q&As, creator meetups
Retention → status — the first room you had to earn
T4
LV.4 (Trusted)
Closed brand dinners, executive focus groups, creator strategy sessions, HQ visits, career networking
Status + career — the room itself is the reward
T5
LV.5 (Partner)
Industry conferences, brand trips, national creator summits, internship interview days, partner retreats
Aspiration — the top of the ladder, visible from the bottom
Two rules make this funnel actually run:
	•	Aspiration only works if locked events are shown.
	•	High-tier events are rewards, not XP farms. A closed dinner or a brand trip is not paid work, so per R2 it awards no XP — it awards attendance on the track record, event badges, and the room itself. An event awards XP only when it is genuinely a paid working mission (staffing the pop-up, running the workshop). This keeps R2 airtight: you can’t level up by being invited to things.
3. The progression system
This is the layer that makes the platform feel like a game while measuring only real work. Designers: the six moments in §3.6 are yours. Engineers: every number here is data, not code — see the xp_event table in the appendix.
3.1 XP economy
Action
XP
Complete a Content mission
+150
Complete a Field mission
+250
Complete an Event mission
+100
Complete a Sales mission
+200 (+50 per closed deal)
Submitted on time
×1.2
Weekly streak
×1.1 – ×1.5
First mission with a new brand
+75
Repeat hire by the same brand
+100
Brand rates you 5★
+50
Quest chain completed
+200 – 500
Two multipliers is the cap — on-time and streak. A third would make totals unpredictable, and progression that can’t be predicted stops feeling earned.
The worked example we show students, so they can do the maths themselves:
Content mission · on time · 3-week streak · new brand 150 × 1.2 × 1.25 + 75  =  300 XP
Never awards XP: opening the app · browsing · following a brand · connecting a social · profile completion · referrals. (Referrals pay $10 cash when the invited friend completes their first mission — a referral is a favor to us, so we pay for it honestly instead of dressing it up as progression.)
3.2 The ladder — five levels
One ladder, five levels. Each level is simultaneously the student’s rank, their public identity on /u/handle, the mission tier they can take (R9), and the event tier they can enter — four systems reading one number. Each level has an identity, a gate, and a job the platform needs it to do.
LV
Name
Missions
Gate (all required)
L1
Explorer
“I just joined Axelerate”
Verified student (.edu + work eligibility + payout + reach — all four, §4.3)
L2
Contributor
“I’m not someone who signed up and vanished”
300 XP · 3 completed missions
L3
Insider
Where most active students want to live
1,200 XP · 5+ missions · ≥90% on-time · 4.5★+ avg rating · no violations
L4
Trusted
No longer a gig worker — a junior marketing professional
3,000 XP · 10+ missions · 3+ brands · ≥92% on-time · strong ratings · 1+ portfolio-quality submission
L5
Partner
Part of the Axelerate Talent Network, not just a user
6,000 XP · 25+ missions · ≥95% on-time · L4 record sustained · clean standing · qualification + invitation
What each level opens:
LV
Missions
Perks
L1 Explorer
Micro missions: product tests ($10), surveys ($8), event guest (free product + $10), simple UGC — 3 photos ($15)
Student-exclusive shop · drops · free samples · open events
L2 Contributor
Professional basics: 30s TikTok ($30–50), 7-day structured product review ($25), 2h sampling ambassador ($40–60), event staff ($50–80)
Public profile goes live · early drop window · creator events · limited products · brand badges · application priority
L3 Insider
Ownership begins: original-concept content — student owns the concept, not the brand’s script ($75–120), brand research — interview 10 students, deliver an insight report ($80–150), activation lead assistant ($100–150)
$100+ missions · 24h drop early access · closed events · premium samples · skip review on selected missions · pitch your own mission idea · +5% shop discount
L4 Trusted
Campaign ownership: run a campus launch — recruit 5 creators, coordinate content, submit recap ($250–500), brand strategy — 10-slide recommendation presented to the brand team ($200), creator lead — manage 5 junior creators ($150–300), brand representative ($150+)
$150–500 missions · invite-only launches · executive/founder networking · internship pipeline · brand advisory panels · verified references · priority selection · creator dinners · exclusive products
L5 Partner
The Talent Network: campus lead — own a brand’s campus relationship, $500–1,500/mo retainer · brand consultant — monthly Gen-Z advisory ($100/session) · national campaign lead — coordinate leads across campuses ($1,000–3,000/project)
Direct brand introductions · internships · paid retainers · national campaigns · conferences · recommendation letters · Campus Lead title · partner-only community · annual Creator Summit — at this level, status itself is the perk, not discounts
Levels are permanent. They are never lost, revoked, or decayed — a credential you can be stripped of by a bad month is a credential nobody trusts. Quality and reliability gate promotion, never trigger demotion; on-time rate is otherwise a displayed stat and a multiplier.
3.3 The near-miss rule
Everything locked shows exactly how far away it is, in the unit the student controls.
✗  "Locked for your rank"                    — a wall; no action available ✓  "LV.4 · 220 XP away — about one mission"  — a distance; the action is obvious
Locked mission cards stay on the board, keep their dollar figure, and state the gap. A student who can see the $180 mission they can’t take yet — and that it’s one mission away — has a reason to do the next one tonight. Locked-and-hidden creates mystery; locked-and-priced creates motivation. This rule applies to every gated thing in the product: missions, drops, perks.
3.4 Streaks — the weekly run
The commitment: submit at least one mission per week.
Consecutive weeks
XP multiplier
1
×1.0
2
×1.1
3
×1.25
4+
×1.5 (cap)
	•	Breaking a streak never removes earned XP, cash, levels, or unlocks. Only the multiplier resets.
	•	One free streak repair per month, applied automatically — life happens.
	•	Academic pause: a student can freeze their streak up to 3 weeks, twice a year, no questions asked. Our users have finals; finals are not a churn event to profit from.
	•	The streak multiplies XP only — never cash. A student is never paid less for missing a week. (Docking pay for schedule gaps is a wage-theft argument, and it would be a fair one.)
3.5 Quest chains 
Levels are the ladder; quests are the reason to climb this week. A quest is a short, named arc of steps with a reward at the end. marktcc321@gmail.com
Chain
Steps
Reward
First Run (auto-assigned at signup)
verify → apply → submit → get paid
+200 XP · 500 credit · $5 in shop · Rookie badge
Triple Threat
one Content + one Field + one Event
+300 XP · format badge · counts toward Breadth
House Favorite
3 missions for one brand
+400 XP · repeat-hire priority with that brand · brand badge
Perfect Week
2 missions, both on time, in one week
+250 XP · instant jump to ×1.5 streak
Campus Captain
3 friends verified + each completes one mission
Captain frame · $30 cash · no XP (R2 — a referral is not your work)
Only two chains are active at a time — more, and none feels urgent. First Run is assigned automatically; when a slot frees, the student picks the next from three offered.
3.6 The six moments
Gamification succeeds or fails in about six seconds of animation. These are the six moments to design and build with the most care:
	•	The XP ring. A ring around the avatar in the app header, filling toward the next level. Always on screen, always the same position. Tapping it opens the ladder.
	•	The XP count-up. When a brand approves a submission: the number counts up rather than jumping, and the multipliers stack one visible line at a time — 150 → ×1.2 on time → ×1.25 streak → +75 new brand → +300. Seeing why it’s 300 is what makes the next submission arrive on time. A number that just jumps teaches nothing.
	•	The level-up takeover. Full screen, ~2.5 seconds, three staged beats: the numeral lands → the band name resolves → the unlock card flips over. The unlock is the payload; the number is the drum roll.
	•	The unlock reveal. One card flip at a time, never a list. Four flips read as a haul; four list rows read as a receipt.
	•	The streak flame. Weeks as pips, the multiplier live. One gentle nudge on day 5 — never a ticking clock.
	•	Progress everywhere. Every locked mission, drop, and perk carries its XP distance; every quest its step count. No screen in the app may answer “how close am I?” with silence.
4. The map
4.1 Public site 
Route
Purpose
/
Student landing — one promise, one CTA, live missions as proof
/for-brands
The single brand-facing page → book a call. Thin by design
/join
Sign up → verify. The funnel’s throat; the First Run quest is assigned here
/u/[handle]
Public creator profile — the shareable object
/m/[slug]
Public mission page with an apply CTA
/b/[slug]
Brand page: story, open missions, products
/shop · /shop/[slug]
Catalog and product pages, human-readable slugs
/schools/[slug]
Per-campus landing — “paid brand gigs at UCLA”
/verify/[receipt-id]
Third-party verification of a work receipt
/legal/terms · /legal/privacy · /legal/payouts
Payout terms get their own page
/sitemap.xml · /robots.txt
Index control
4.2 The app (auth-gated, three tabs: Earn · Shop · Me)
/app/earn                 ← default screen. Board + XP ring + streak + quests /app/earn/[slug]          Mission detail /app/earn/mine            My missions (pipeline view) /app/earn/quests          Quest chains /app/shop                 Catalog /app/shop/[slug]          Product /app/shop/drops           Limited drops (LV.3 sees them 24h early) /app/cart · /app/checkout /app/me                   Profile hub — level, track record, public-page preview /app/me/level             The ladder + the full XP formula /app/me/wallet            Earnings, payouts, credit /app/me/orders /app/me/content           Submitted work library /app/me/referrals /app/me/settings          Account, shipping, payout method /app/verify               Verification flow (4 steps, §4.3)
There is no Home tab. The app opens on Earn — the thing that makes students money — with the cash balance persistent in the header. A home tab is what a product grows when it isn’t sure what it’s for; this one is sure.
4.3 Verification is four steps
	•	School (.edu magic link — identity and eligibility)
	•	Work eligibility (see below — the law requires it before anyone is compensated)
	•	Payout (Stripe Connect — we cannot legally pay without it)
	•	Reach (TikTok/Instagram via OAuth, because typed handles can’t be verified).
	•	Everything else — interests, brand follows, wishlists — is optional enrichment we ask for after the first paid mission, when the student has a reason to care.
5. School pride — campus theming
The platform is campus-first, and the interface should feel like it. A verified UCLA student shouldn’t see a generic app — they should see their campus’s app.
5.1 What themes change
Every student’s verified school (from /join — the .edu check) carries a theme: the school’s primary color adapted for the dark canvas, the school name, and campus visual elements. When active:
• Accent color — the school color takes over the decorative accent slots: the app header wordmark, nav highlights, section label color, card hover states. A UCLA student’s app runs sky blue; a USC student’s runs cardinal.
• Campus identity on the home surface — the Earn screen header shows the school mark and name (“AXELERATE × UCLA”), and campus-scoped modules (missions near you, campus events) carry the school element. More campus elements can layer in over time — patterns, mascot moments on level-ups, campus-specific badge art — the surface area for school pride is deliberately extensible.
• School identity in reviews — a product review is signed with the reviewer’s verified school: “Mark @UCLA — I love this brand because…”. This does double duty: school pride for the writer, and stronger social proof for the reader, because “@UCLA” is verified data (R5 discipline — derived from the .edu check, never self-typed).
5.2 Eligibility
School colors and names are usable; official crests, logos and mascots are licensed trademarks. Stage one ships school color + school name text (“@UCLA”). Official crest artwork on the home header requires a licensing agreement per school — pursue for flagship campuses, don’t block the feature on it.
Appendix A — the xp_event table
Every XP award is one append-only row. Nothing mutates; corrections are compensating rows. This is what makes §2.1.2 auditable and what lets /app/me/level publish the formula in full.
Column
Type
Notes
id
uuid

user_id
uuid

mission_id
uuid, nullable
Null only for quest-chain completions
quest_id
uuid, nullable

source
enum
mission_approved · quest_completed · correction
base_amount
int
Before multipliers
multipliers
jsonb
Ordered list of {name, factor} — max two (R2 cap)
bonuses
jsonb
Ordered list of {name, amount} — new brand, repeat hire, 5★
final_amount
int
Stored, not computed at read time
awarded_at
timestamptz

The count-up animation in §3.6 renders multipliers and bonuses in stored order, one line at a time. The order in the row is the order on screen.
Thresholds — level gates, tier minimums, streak factors — are configuration data, not columns here, and not constants in code.
