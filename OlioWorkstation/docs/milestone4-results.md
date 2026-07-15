# Milestone 4 Quick Pastes results

Status: **Workstation implementation and focused browser tests complete. Local Supabase
execution is an environmental case because this machine has no Supabase CLI, Docker,
PostgreSQL client, or isolated local database. No remote migration was applied.**

Run date: 2026-07-15 (America/Indianapolis)

## Implemented scope

- Dedicated private `quick_pastes` table, constraints, indexes, timestamps, and trigger
- Four authenticated owner-only RLS policies and no anon grant
- Atomic complete-collection reorder function running with caller privileges
- Utilities navigation entry and responsive Workstation-themed management UI
- Create, edit, delete confirmation, duplicate, reorder, favorite, category filtering,
  search, retryable failure, validation, empty, loading, and success states
- Keyboard-operable native controls, dialog Escape/focus containment, initial form focus,
  accessible labels, status semantics, and explicit visible-focus styles
- Separate model, repository, hook, component, integration, privacy, and pgTAP ownership
  tests

Pastebin remains unchanged and uses `pastes` plus its existing share URLs, scopes, expiry,
and view counts. Olio Launcher runtime files were not changed or exercised. No pairing,
synchronization, caching, Send to Phone, Network Analyzer, packaging, or later milestone
code was introduced.

## Automated results

| Check | Result |
| --- | --- |
| Complete Workstation automated suite | Pass: 5 files, 27 tests |
| Model tests | Pass: 9 tests |
| Supabase repository/data-access tests | Pass: 5 tests |
| Hook integration tests | Pass: 2 tests |
| Component/accessibility/failure tests | Pass: 7 tests |
| Privacy and Pastebin-separation tests | Pass: 4 tests |
| Milestone 4 test TypeScript check | Pass |
| Milestone 4 focused ESLint | Pass, no warnings |
| Production Vite build | Pass: 1,589 modules; existing bundle-size and Browserslist warnings remain |
| Diff whitespace check | Pass; only existing line-ending notices |
| Local pgTAP database suite | Not run: required local database tooling is unavailable |
| Repository-wide ESLint | Existing baseline failure: 95 errors and 13 warnings in unrelated legacy files; no Milestone 4 lint findings |
| Application TypeScript check | Existing baseline failure: 88 unrelated errors; zero reference Milestone 4 files |
| Vite config TypeScript check | Existing baseline failure: one `@vitejs/plugin-react` declaration-resolution error |

The passing suite covers validation, deterministic ordering, create, edit, delete,
duplicate, reorder, favorite, search, category filtering, empty/loading/error recovery,
edit-draft recovery, refresh stability, keyboard activation, visible-focus classes,
data-access owner filters, Pastebin separation, and forbidden content sinks. Vitest was
upgraded to 3.2.6 after a dependency audit identified a fixed advisory in the initially
selected version. A production-only audit still reports the pre-existing `ws` 8.18.3
advisory; the resolved version is unchanged from the repository baseline.

The local pgTAP suite at `supabase/tests/quick_pastes_rls.test.sql` covers two authenticated
identities and anon. It tests cross-user read, update, delete, favorite, duplicate, reorder,
ownership spoofing, ownership changes, valid owner ordering, and Pastebin schema separation.
It contains 44 assertions and is committed but was not executed here because the required
local database runtime is unavailable. It must be run before applying the migration to
any shared environment.

## Nontechnical manual checklist

> [!WARNING]
> Use only harmless sample text such as `Hello from Olio`. Do not use passwords, access
> tokens, private messages, financial information, personal records, or other sensitive
> content while testing.

1. Sign in to Olio Workstation, open **Utilities**, and choose **Quick Pastes**.
2. Confirm the empty message appears, then choose **New Quick Paste**.
3. Try to save blank fields and confirm title and content guidance appears.
4. Create `Greeting` with harmless content `Hello from Olio` and category `General`.
5. Create a second harmless item. Edit its title and content, save, and confirm it stays in
   the same position.
6. Duplicate `Greeting` and confirm a `copy` appears at the end without changing the
   original.
7. Use the star control to favorite and unfavorite an item.
8. With search and category set to their defaults, use the up/down controls to reorder the
   items. Refresh the browser and confirm the order remains.
9. Search for a harmless word from one item. Clear search, filter by `General`, then clear
   filters and confirm the complete list returns.
10. Navigate the page with Tab and Shift+Tab. Activate **New Quick Paste** with Enter,
    confirm focus moves to Title, and press Escape to close the dialog. Confirm each focused
    action has a clearly visible cyan outline.
11. Choose Delete, cancel once, then delete the duplicate and confirm the warning appears
    before permanent deletion. Refresh and confirm the item stays deleted.
12. Sign out and confirm the private utility is no longer available. Sign back in and
    confirm the first account's harmless items return.
13. Sign in with a different test account. Confirm it cannot see, search, edit, duplicate,
    reorder, favorite, or delete the first account's items. Create a harmless item in the
    second account, switch back, and confirm each account sees only its own data.
14. Open **Pastebin** and confirm it still offers its existing share URL, visibility,
    expiry, and view-count behavior, while Quick Pastes offers none of those options.

## Environmental cases not exercised

- Local migration application and live two-user RLS execution: Supabase CLI, Docker, and
  PostgreSQL are unavailable on this machine. The repository also had no pre-existing
  `supabase/config.toml`; local setup begins with `supabase init` as documented.
- Real two-account browser validation against an authorized migrated Supabase project was
  not attempted because no production/shared migration was authorized.
- Network-offline behavior is intentionally not implemented or tested; offline caching is
  a later design decision outside Milestone 4.
