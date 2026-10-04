# Proteus 30-Day Adaptive Evolution

## Goal
Expand the existing dashboard into a clear 30-day adaptive workspace while preserving the current rules-based plan engine and dark ice-blue visual language.

## Product behavior
- Keep Dashboard / My 30-Day Plan, Nutrition & Pathway, AI Coach, and Account & Subscription views; add dedicated Fitness & Movement and Meal Scanner views.
- Treat the 30-day checkpoint as due on day 30 or when the latest month has no corresponding check-in. Route due users to the check-in before other app views.
- Collect current weight, medication changes, side effects, energy, adherence, difficulty, appetite/hunger, waist, goals/context, and notes; pass the complete check-in to the existing adaptive engine to build the next 30-day phase.
- Show the evolution decision and next-phase rationale in the check-in flow and the dashboard.
- Display the medical/wellness disclaimer in the app and Privacy Policy.

## Implementation
- `src/lib/engine.ts` owns check-in fields and deterministic next-month adaptation.
- `src/lib/store.ts` owns local persisted plan state and checkpoint-due calculation.
- `src/routes/app.tsx` owns protected shell, expanded navigation, and checkpoint routing.
- New `app.fitness.tsx` and `app.meal-scanner.tsx` provide focused dashboard views.
- Existing `app.plan.tsx`, `app.protein.tsx`, `app.support.tsx`, and `app.settings.tsx` are enhanced in place.
- Route generation remains TanStack file-based; no manual route-tree edits.

## Design
- Dark clinical-tech aesthetic: near-black navy surfaces, cyan/ice-blue borders and glow, white primary text.
- Use fixed desktop sidebar plus horizontal overflow-safe compact navigation on smaller screens.
- Keep panels task-focused, with readable contrast and no decorative dead space.
- Use explicit wellness disclaimers wherever medication, surgery, nutrition, or AI guidance is presented.
