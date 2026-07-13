---
name: Offer-completion has two finalize paths
description: Any side-effect on job completion must hook BOTH paths in the requests store, or snapshots/notifications silently miss cases.
---

# Offer completion fires through two distinct code paths

In the hormang-landing localStorage store, an offer can be finalized as
"completed" through **two** separate functions in `requests-store.ts`:
- `markOfferCompleted` (provider marks done directly)
- `confirmCompletion` (the confirm/finalize branch, customer-confirmed)

**Why:** the flow allows either side to drive completion, so a side-effect wired
into only one path will silently miss roughly half of real completions.

**How to apply:** when adding any on-completion side-effect (history snapshots,
notifications, counters, payouts), hook it into BOTH functions, placed after the
existing `incrementCompletedCount`. Make the side-effect idempotent (e.g. the
service-history store dedupes by `offerId`) so it is safe if both paths run.
