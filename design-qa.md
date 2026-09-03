# Nomi Design QA

## Evidence

- Source visual truth: `/Users/swoptechnologies/Documents/code/nomi-baby-names/reference-option-2.png`
- Browser-rendered implementation: `/Users/swoptechnologies/Documents/code/nomi-baby-names/implementation-desktop-final.jpg`
- Side-by-side comparison: `/Users/swoptechnologies/Documents/code/nomi-baby-names/design-comparison-final.jpg`
- Mobile implementation: `/Users/swoptechnologies/Documents/code/nomi-baby-names/implementation-mobile-final.jpg`
- Mobile responsive comparison: `/Users/swoptechnologies/Documents/code/nomi-baby-names/design-comparison-mobile-final.jpg`
- Viewport and CSS size: 1440 x 1024 px
- Source pixels: 1487 x 1058 px, normalized to 1440 x 1024 for comparison
- Implementation pixels: 1440 x 1024 px at device scale factor 1
- State: initial Our Lists view with Luca and Lena selected
- Mobile target viewport: 390 x 844 CSS px; in-app browser content capture: 375 x 812 px

## Full-view comparison evidence

The implementation preserves the source hierarchy: Nomi brand and three-item navigation, private-gender status, equal boy and girl lanes, central head-to-head decision, and paired primary/supporting actions. The edge-only paper collage asset follows the source art direction while keeping the interactive surface readable.

The selected source is a desktop frame, so the mobile comparison evaluates responsive hierarchy and visual-system continuity rather than claiming pixel equivalence. The mobile derivative keeps the same match-first hierarchy, palette, type, iconography, and paper-collage language while replacing simultaneous long lists with an explicit boy/girl list switcher.

## Focused region evidence

The central match region and both name lanes were readable in the full-size 2880 x 1024 comparison, so a separate crop was not required. Type weights, button labels, selected states, icon treatments, spacing, and row density were checked at original resolution.

## Required fidelity surfaces

- Fonts and typography: Fredoka reproduces the rounded display voice; Nunito provides readable 14-18 px UI copy. Heading scale, weight, wrapping, and button labels align with the source.
- Spacing and layout rhythm: Three-column proportions, equal side lanes, match-card alignment, row gaps, and vertical rhythm match the source after the second pass.
- Colors and visual tokens: Ivory, navy, teal, marigold, and cobalt match the source. Color is shared across the experience rather than using a pink/blue gender split.
- Image quality and asset fidelity: The paper collage is a dedicated generated raster asset with correct texture and edge placement. UI symbols use Phosphor icons rather than CSS drawings or placeholder glyphs.
- Copy and content: Visible source labels and names are preserved. Supporting views use concise, product-specific copy consistent with the selected concept.

## Comparison history

### Pass 1

- [P2] Main workspace was vertically compressed and started too low relative to the privacy banner.
- Fix: Reduced the post-banner gap, increased name-row height and spacing, and increased match-card height.
- Post-fix evidence: `design-comparison-final.jpg` shows the larger interaction region and lane rhythm aligned with the source while staying inside the viewport.

### Final pass

No actionable P0, P1, or P2 differences remain. The generated collage placement differs from the concept artwork by design but preserves the same materials, palette, contrast, and edge-only role.

### Mobile-first pass

- [P2] On narrow phones the original stacked layout made both lists long and allowed fixed navigation to obscure a primary action.
- [P2] Switching a bottom-navigation view while scrolled retained the previous scroll position.
- Fixes: Added a mobile-only shortlist switcher, reduced decision-panel height at short-phone breakpoints, reserved safe-area space for bottom navigation, converted dialogs to bottom sheets, and reset scroll position on view changes.
- Post-fix evidence: `design-comparison-mobile-final.jpg` shows the match and primary CTA above the fold at 390 x 844. A separate 320 x 568 inspection confirmed no horizontal overflow and kept the match CTA fully visible.

## Interaction and responsive verification

- Name Lab navigation, generation, and save-to-list flow passed.
- Add-name dialog and boy/girl destination selection passed.
- Family Poll voting and confirmation state passed.
- Invite Family dialog open/close flow passed.
- 390 x 844 mobile layout was inspected; navigation remains reachable and the core match stays above the fold.
- 320 x 568 compact-phone layout was inspected; document width remained exactly 320 px with no horizontal overflow.
- Mobile boy/girl shortlist switching, add-to-selected-list behavior, tab scroll reset, poll voting, and invite bottom sheet passed.
- Browser console errors checked: none.
- Production build and Sites packaging tests passed.

## Follow-up polish

- [P3] Add Escape-key close and a focus trap to dialogs before production deployment.
- [P3] Connect generation, invites, and voting to persistent backend services when moving beyond the prototype.

final result: passed
