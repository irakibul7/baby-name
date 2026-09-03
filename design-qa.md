# Nomi mobile Safari design QA

## Evidence

- Source visual truth: `/Users/swoptechnologies/Downloads/F2486AF5-58A6-4DC3-8453-AE5066812B43.png`
- Fixed short-viewport capture: `qa/mobile-safari-short-fixed.png`
- Side-by-side comparison: `qa/mobile-safari-before-after.png`
- Standard mobile capture: `qa/mobile-390x844.jpg`
- Source pixels: 1125 × 2436 at approximately 3× device density. The app-owned region was cropped from y=110 to y=1710 and normalized to 360 × 512 for the comparison.
- Short implementation pixels: 360 × 610 at deviceScaleFactor 1.
- Standard implementation pixels: 390 × 844 at deviceScaleFactor 1.
- State: authenticated family member, Our Lists, Girl list selected, Inaya swipe card.

## Full-view comparison evidence

The original screenshot shows the persistent tab bar covering the lower portion of the swipe card while the Pass and Favorite actions are below the visible area. It also shows the Invite Family label wrapping inside a narrow square control. In the revised short-viewport capture, the complete swipe card and both 44px decision controls end 28px above the tab bar, and the invite action is a clean icon-only 44 × 44 control with its existing accessible name preserved.

## Focused region evidence

The swipe-card/tab-bar region needed focused review because it contained the reported failure. At the short Safari-sized breakpoint, the swipe card ends at 479px, Favorite ends at 531px, and the tab bar starts at 559px. At the standard 390 × 844 viewport, Favorite ends at 698px and the tab bar starts at 793px. The Name Lab save action ends at 714px while its tab bar starts at 793px.

## Findings and comparison history

- P1, fixed: the tab bar visually covered the swipe card and hid the primary decision actions on short Safari viewports. Added a compact short-viewport layout for the card, copy, and action area. Post-fix evidence shows a 28px clear gap between Favorite and the tab bar.
- P2, fixed: Invite Family wrapped onto two lines inside a 44px-wide button. The short-viewport control now shows only the user-plus icon while retaining `aria-label="Invite Family"`.
- P2 regression check, passed: the compact rules are limited to mobile viewports no taller than 700px. The 390 × 844 layout keeps the full Invite Family label and the more spacious swipe card.

## Required fidelity surfaces

- Fonts and typography: Fredoka and Nunito, weights, hierarchy, and Arabic/Persian script rendering remain unchanged. Short-view text sizes are reduced only inside the swipe card to prevent clipping.
- Spacing and layout rhythm: the reported overlap and wrapping are removed; standard-height spacing remains unchanged.
- Colors and visual tokens: existing ink, teal, yellow, paper, borders, and elevation tokens are unchanged.
- Image quality and asset fidelity: the existing paper-collage background and icon-library assets remain intact; no replacement assets were introduced.
- Copy and content: all app copy is preserved. Only the visible short-viewport Invite text is hidden; its accessible name remains available.

## Interaction and runtime checks

- Switched Boy/Girl swipe tabs.
- Switched between Our Lists, Name Lab, and Family Polls.
- Verified the Name Lab save control and Family Polls create control clear the persistent tab bar.
- Verified no horizontal overflow and no visible Vite runtime error overlay.

## Follow-up polish

- No remaining P0, P1, or P2 findings for the reported glitch.

final result: passed
