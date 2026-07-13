---
name: Hormang landing honesty constraints
description: What the Hormang marketing/landing page may and may not claim, and how real product screenshots were captured.
---

# Hormang landing: keep marketing honest

The landing page (`artifacts/hormang-landing`) was rebuilt to remove fabricated
marketing. Do NOT re-introduce these — they are false for this product:

- **No usage stats** — there is no verified "5,000+ providers / 50,000+ tasks /
  4.8★" data. Don't cite counts/ratings you can't source.
- **No subscriptions** — real monetization is Tanga tokens (top-up / pay-per-
  unlock), see `/plans`. Never describe monthly plans.
- **9 categories, not "20+"** — canonical list is `src/data/categories.ts`
  (CATEGORY_META).
- **Structured questionnaire, not AI/NLP** — matching is a rule-based survey
  (`/questionnaire`), not natural-language AI search.
- **No invented testimonials.** Keep trust claims verifiable: prefer "reviews
  written after completed services" / "profiles show portfolio and reviews"
  over absolutes like "no fake reviews" or "every profile has…".

**Why:** the user explicitly required the landing to reflect only what the app
actually does; an architect review FAILED the first pass for residual absolute
claims.

## Capturing real in-app screenshots for marketing
Technique that worked: a temporary dev-only route mounted inside the App tree
(so I18n/Auth providers exist) seeds namespaced demo data on mount and renders
the real component as a phone-width product shot; capture with the screenshot
tool, then crop/optimize. Afterward remove the temp route + raw images and keep
only the final optimized assets in `public/showcase/`.
