# Priority 6 — Accessibility and responsive test record

Tested September 7, 2026 against the local Jobline prototype.

## Implemented

- Skip-to-content link and labeled primary navigation with current-page state.
- Consistent visible keyboard focus using Fluent-aligned colors.
- Focus containment and focus return for dialogs and drawers.
- Screen-reader status announcements for Dispatch status changes and validation failures.
- Keyboard alternative to drag-and-drop on every Dispatch card.
- Accessible names for drawer close, date, time, and note controls.
- Reduced-motion, forced-colors, and increased-contrast support.
- Desktop-first layouts with contained table/board scrolling and full-screen small-device dialogs.

## Tested flows

- Job Queue → New Job dialog → close and return focus.
- Dispatch Board → move an assigned job by keyboard.
- Dispatch Board → prevent an unassigned job from being scheduled and announce why.
- Job drawer editing controls and customer-history navigation.
- Job Queue, Dispatch, drawer, Customer Detail, and Customers List at 1024 × 768, 768 × 900, and 390 × 844.
- Visible interactive controls checked for accessible names; core pages checked for browser errors.

## Prototype boundary

This is an accessibility-ready interactive concept, not a formal WCAG certification. A production release would still require testing with users, NVDA, JAWS, VoiceOver, browser zoom up to 400%, and automated contrast/semantic tooling against the final application stack.
