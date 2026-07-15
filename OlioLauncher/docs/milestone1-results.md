# Milestone 1 foundation results

Status: **Implementation complete; ready for user review. No Milestone 2 feature work has
begun.**

Run date: 2026-07-13 (America/Indianapolis)

## Implemented scope

- AutoHotkey v2.0.26 entry point with Per-Monitor V2 awareness before GUI creation
- Per-user named mutex and deduplicated registered-message activation
- Existing-process show/hide toggle from a second launch
- Suppressing, configurable Focus Key registration with visible error/fallback status
- Native frameless right-edge panel on the foreground window's monitor
- Show, hide, Escape, focus restoration, optional close-on-focus-loss, and tray exit
- Keyboard navigation across enabled placeholder sections
- Programmatically disabled Send to Phone and Network Analyzer controls
- Flat JSON validation, documented defaults, invalid-source preservation, and atomic save
- Optional HKCU launch-at-sign-in registration using `--background`
- Disabled-by-default, metadata-only redacted logging with size rotation

## Verification

| Check | Result |
| --- | --- |
| Entry-point AutoHotkey syntax | Pass on AutoHotkey 2.0.26 |
| Focused foundation test suite | Pass; 41 assertions |
| JSON strings, Booleans, numbers, trailing-data rejection | Pass |
| Invalid field and malformed-document recovery | Pass |
| Same-directory atomic settings replacement | Pass |
| Valid and invalid Focus Key registration reporting | Pass |
| Temporary per-user startup registration/read/remove round trip | Pass |
| Hidden state before first `Show` | Pass |
| Send to Phone and Network Analyzer disabled state | Pass |
| Hidden primary plus second-launch show | Pass |
| Third-launch hide | Pass |
| Surviving launcher processes after repeated launch | Exactly one |
| Test/launcher processes after cleanup | Zero |
| Hidden-resident idle sample | 0.0000% CPU over 5 seconds; 16,076,800-byte working set; 3,735,552 private bytes |
| Modern grid shell visual QA | Pass; two-column dark native tiles, distinct cyan/violet/green/amber/slate accent rails, selected/focus outlines, and subdued disabled tiles |
| Tile accessibility | Pass; all six tools remain native buttons with accessible names and disabled state |
| Tile keyboard and mouse input | Pass; Up/Down focus, Enter activation through `BM_CLICK`, and mouse activation verified in the rendered app |
| Compact Workstation theme | Pass; `#020617` base, slate cards/borders, rounded controls, 286-pixel normal panel height, minimal labels, and a themed utility pill using Lucide `settings-2` geometry |
| Opening position | Pass; right-edge x-position retained and y-position centered within the active monitor work area |
| Initial and reopen focus | Pass; Clipboard receives focus, including after the launcher was closed from Settings |
| Focus preservation on close | Pass; the saved pre-launch window is restored only while the launcher still owns focus, so a newly focused window remains current |

The activation test originally exposed duplicate delivery to AutoHotkey's hidden window
and visible GUI. Activation is now deduplicated by secondary-process ID; direct Win32
visibility checks passed (`show = true`, subsequent `hide = false`).

The initial grid implementation still showed classic white button faces because
AutoHotkey normalized the `Button` style. The final implementation creates native
`Button` controls with `BS_OWNERDRAW` at creation time and handles `WM_DRAWITEM` and
`WM_COMMAND` directly. This keeps native focus, accessibility, and disabled behavior
while allowing the modern card treatment.

## Deferred by design

- Clipboard History data and UI — Milestone 2
- Product screenshot selection UI and capture action — Milestone 3
- Quick Pastes data, authentication, networking, or UI — later approved milestones
- Send to Phone — planning only
- Network Analyzer — last milestone; no network behavior exists
- Compilation and standalone executable packaging — Milestone 8
- Advanced multi-monitor topology coverage remains in the regression matrix and is
  non-blocking for this milestone per product-owner direction.
